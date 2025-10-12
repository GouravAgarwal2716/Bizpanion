const express = require('express');
const auth = require('../middlewares/auth');
const { Invoice } = require('../models');
const router = express.Router();

function computeTotals(items, gstPct) {
  const subtotal = items.reduce((sum, it) => {
    const qty = Number(it.qty) || 0;
    const unitPrice = Number(it.unitPrice) || 0;
    return sum + qty * unitPrice;
  }, 0);
  const gstAmount = Math.round((subtotal * (Number(gstPct) || 0)) / 100);
  const total = subtotal + gstAmount;
  return { subtotal, gstAmount, total };
}

// Create invoice
router.post('/', auth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const {
      number,
      customerName,
      customerEmail,
      customerGSTIN,
      items, // array expected
      gstPct = 18.0,
      currency = 'INR',
      status = 'draft',
      issuedAt,
      dueAt,
      notes,
    } = req.body;

    if (!customerName || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'customerName and items are required' });
    }
    const invNumber = number && String(number).trim().length > 0
      ? String(number).trim()
      : `INV-${Date.now()}`;

    const { subtotal, gstAmount, total } = computeTotals(items, gstPct);

    const invoice = await Invoice.create({
      user_id,
      number: invNumber,
      customerName: customerName.trim(),
      customerEmail: customerEmail || null,
      customerGSTIN: customerGSTIN || null,
      items: JSON.stringify(items),
      subtotal,
      gstPct,
      gstAmount,
      total,
      currency,
      status,
      issuedAt: issuedAt || null,
      dueAt: dueAt || null,
      notes: notes || null,
    });

    res.json(invoice);
  } catch (err) {
    console.error('Create invoice failed:', err);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// List invoices
router.get('/', auth, async (req, res) => {
  try {
    const where = { user_id: req.user.id };
    if (req.query.status) {
      where.status = req.query.status;
    }
    const invoices = await Invoice.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });
    res.json(invoices);
  } catch (err) {
    console.error('List invoices failed:', err);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get invoice
router.get('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    console.error('Get invoice failed:', err);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Update invoice (recalculate totals if items or gstPct changed)
router.patch('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const updatable = [
      'number',
      'customerName',
      'customerEmail',
      'customerGSTIN',
      'items',
      'gstPct',
      'currency',
      'status',
      'issuedAt',
      'dueAt',
      'notes',
    ];

    let itemsChanged = false;
    let gstChanged = false;
    for (const key of updatable) {
      if (req.body[key] !== undefined) {
        if (key === 'items') {
          const arr = Array.isArray(req.body.items) ? req.body.items : [];
          invoice.items = JSON.stringify(arr);
          itemsChanged = true;
        } else if (key === 'gstPct') {
          invoice.gstPct = Number(req.body.gstPct) || invoice.gstPct;
          gstChanged = true;
        } else if (key === 'number' || key === 'customerName') {
          invoice[key] = String(req.body[key] || '').trim();
        } else {
          invoice[key] = req.body[key];
        }
      }
    }

    if (itemsChanged || gstChanged) {
      const parsed = (() => {
        try { return JSON.parse(invoice.items || '[]'); } catch { return []; }
      })();
      const totals = computeTotals(parsed, invoice.gstPct);
      invoice.subtotal = totals.subtotal;
      invoice.gstAmount = totals.gstAmount;
      invoice.total = totals.total;
    }

    await invoice.save();
    res.json(invoice);
  } catch (err) {
    console.error('Update invoice failed:', err);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// Delete invoice
router.delete('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    await invoice.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error('Delete invoice failed:', err);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

// Generate invoice PDF (fallback to text if pdfkit missing)
router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    let items = [];
    try { items = JSON.parse(invoice.items || '[]'); } catch { items = []; }

    let PDFDocument;
    try {
      PDFDocument = require('pdfkit');
    } catch {
      PDFDocument = null;
    }

    const filename = `invoice-${invoice.number}.pdf`;

    if (PDFDocument) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      doc.pipe(res);

      doc.fontSize(18).text('Invoice', { align: 'right' });
      doc.moveDown();
      doc.fontSize(12).text(`Invoice No: ${invoice.number}`);
      doc.text(`Customer: ${invoice.customerName}`);
      if (invoice.customerEmail) doc.text(`Email: ${invoice.customerEmail}`);
      if (invoice.customerGSTIN) doc.text(`GSTIN: ${invoice.customerGSTIN}`);
      if (invoice.issuedAt) doc.text(`Issued: ${new Date(invoice.issuedAt).toLocaleString()}`);
      if (invoice.dueAt) doc.text(`Due: ${new Date(invoice.dueAt).toLocaleString()}`);
      doc.moveDown();

      doc.text('Items:');
      items.forEach((it, idx) => {
        doc.text(`${idx + 1}. ${it.name} — qty: ${it.qty}, unit: ₹${it.unitPrice}`);
      });
      doc.moveDown();

      doc.text(`Subtotal: ₹${invoice.subtotal}`);
      doc.text(`GST (${invoice.gstPct}%): ₹${invoice.gstAmount}`);
      doc.fontSize(14).text(`Total: ₹${invoice.total}`, { align: 'right' });
      if (invoice.notes) {
        doc.moveDown();
        doc.fontSize(10).text(`Notes: ${invoice.notes}`);
      }

      doc.end();
    } else {
      // Fallback plain text
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.number}.txt"`);
      const lines = [];
      lines.push('Invoice');
      lines.push(`Invoice No: ${invoice.number}`);
      lines.push(`Customer: ${invoice.customerName}`);
      if (invoice.customerEmail) lines.push(`Email: ${invoice.customerEmail}`);
      if (invoice.customerGSTIN) lines.push(`GSTIN: ${invoice.customerGSTIN}`);
      if (invoice.issuedAt) lines.push(`Issued: ${new Date(invoice.issuedAt).toLocaleString()}`);
      if (invoice.dueAt) lines.push(`Due: ${new Date(invoice.dueAt).toLocaleString()}`);
      lines.push('');
      lines.push('Items:');
      items.forEach((it, idx) => lines.push(`${idx + 1}. ${it.name} — qty: ${it.qty}, unit: ₹${it.unitPrice}`));
      lines.push('');
      lines.push(`Subtotal: ₹${invoice.subtotal}`);
      lines.push(`GST (${invoice.gstPct}%): ₹${invoice.gstAmount}`);
      lines.push(`Total: ₹${invoice.total}`);
      if (invoice.notes) {
        lines.push('');
        lines.push(`Notes: ${invoice.notes}`);
      }
      res.send(lines.join('\n'));
    }
  } catch (err) {
    console.error('Invoice PDF failed:', err);
    res.status(500).json({ error: 'Failed to generate invoice file' });
  }
});

module.exports = router;
