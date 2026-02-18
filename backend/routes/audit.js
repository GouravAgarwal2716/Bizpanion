const express = require('express');
const auth = require('../middlewares/auth');
const PDFDocument = require('pdfkit');
const axios = require('axios');
const { OpenAI } = require('openai');
const { Memory } = require('../models');

const router = express.Router();
const { chatCompletion } = require('../openaiClient');

/**
 * GET /audit/report
 * Combines KPI summary, AI dashboard summary, latest insights, and a brand recommendations page
 * into a single multi-page PDF suitable for a consultancy-style SME audit.
 *
 * Query: persona?=Retail|Services|SaaS|Other (optional to tailor language)
 */
router.get('/report', auth, async (req, res) => {
  try {
    const base = `http://localhost:${process.env.PORT || 5000}`;
    const persona = (req.query.persona || '').toString().trim();

    // 1) Fetch KPI summary (numbers + channels)
    let kpis = null;
    try {
      const r = await axios.get(`${base}/analytics/summary`, {
        headers: { Authorization: req.headers.authorization }
      });
      kpis = r.data || null;
    } catch (e) {
      kpis = null;
    }

    // 2) Fetch AI one-paragraph dashboard summary (force refresh for latest)
    let aiSummary = '';
    try {
      const qs = `?refresh=1${persona ? `&persona=${encodeURIComponent(persona)}` : ''}`;
      const r = await axios.get(`${base}/analytics/summary-text${qs}`, {
        headers: { Authorization: req.headers.authorization }
      });
      aiSummary = (r.data && r.data.summary) ? r.data.summary : '';
    } catch {
      aiSummary = '';
    }

    // 3) Latest saved insights from Memory
    let insights = [];
    try {
      const r = await axios.get(`${base}/analytics/insights`, {
        headers: { Authorization: req.headers.authorization }
      });
      insights = Array.isArray(r.data) ? r.data : [];
    } catch {
      insights = [];
    }

    // 4) Brand recommendation narrative (LLM). Keep compact and useful.
    let brandReco = `Brand recommendations are unavailable right now.`;
    try {
      const prompt = `
Write a compact brand recommendation for an Indian SME.
Audience: ${persona || 'Generic SME'} owner.
Return 4-6 bullet points covering:
- Positioning
- Tone/voice
- Visual palette hints (2-3 hex suggestions)
- Logo direction (one-liner)
- Quick wins this month
Keep it crisp and actionable (max ~120 words).`;
      const completion = await chatCompletion({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a senior business auditor. Analyze the following data and provide a risk score (0-100), key risks, and compliance suggestions." },
          { role: "user", content: prompt } // Changed from auditPrompt to prompt to match context
        ],
        max_tokens: 600,
        temperature: 0.6 // Moved temperature inside the chatCompletion call
      });
      brandReco = (completion || '').trim() || brandReco; // Changed from resp.choices to completion
      // persist in Memory for timeline/context
      try {
        await Memory.create({
          user_id: req.user.id,
          type: 'agent_context',
          content: JSON.stringify({ advisor: 'brand', notes: brandReco, at: new Date().toISOString() })
        });
      } catch { }
    } catch { }

    // Prepare PDF stream
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="bizpanion-audit.pdf"');

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    // Cover
    doc.fontSize(22).text('Bizpanion — SME Audit Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#666').text(new Date().toLocaleString(), { align: 'center' });
    if (persona) {
      doc.moveDown(0.2);
      doc.fillColor('#666').text(`Persona: ${persona}`, { align: 'center' });
    }
    doc.fillColor('#000');
    doc.moveDown(2);
    doc.fontSize(14).text('Overview');
    doc.moveDown(0.5);
    doc.fontSize(12).text('This report combines your latest KPIs, AI-generated business summary, recent insights, and brand recommendations into a single view for faster decision-making.');

    // Page: KPIs
    doc.addPage();
    doc.fontSize(18).text('Key Performance Indicators', { align: 'left' });
    doc.moveDown(0.5);
    if (kpis) {
      doc.fontSize(12);
      doc.text(`Revenue (Month): INR ${Math.round(kpis.revenueMonth || 0).toLocaleString('en-IN')} (${kpis.revChangePct ?? 0}%)`);
      doc.text(`Profit (Month): INR ${Math.round(kpis.profitMonth || 0).toLocaleString('en-IN')} (${kpis.profitChangePct ?? 0}%)`);
      doc.text(`AOV: INR ${Math.round(kpis.aov || 0).toLocaleString('en-IN')}`);
      doc.text(`New Customers: ${kpis.newCustomers || 0}`);
      doc.moveDown();
      doc.fontSize(14).text('Revenue by Channel');
      doc.moveDown(0.5);
      (kpis.channels || []).forEach(c => {
        doc.fontSize(12).text(`- ${c.label || c.key}: INR ${Math.round(c.value || 0).toLocaleString('en-IN')}`);
      });
    } else {
      doc.fontSize(12).text('KPIs are unavailable. Seed demo data in Settings to populate analytics.');
    }

    // Page: AI Summary + Insights
    doc.addPage();
    doc.fontSize(18).text('AI Business Summary', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(12).text(aiSummary || 'Summary unavailable.');
    doc.moveDown(1);
    doc.fontSize(16).text('Recent AI Insights');
    doc.moveDown(0.5);
    if (insights.length > 0) {
      doc.fontSize(12);
      insights.slice(0, 8).forEach((ins, idx) => {
        doc.text(`${idx + 1}. ${ins.content}`);
      });
    } else {
      doc.fontSize(12).text('No saved insights yet.');
    }

    // Page: Brand Recommendations
    doc.addPage();
    doc.fontSize(18).text('Brand Recommendations', { align: 'left' });
    doc.moveDown(0.5);
    brandReco.split('\n').forEach(line => {
      doc.fontSize(12).text(line);
    });

    // End
    doc.end();
  } catch (err) {
    console.error('Audit report failed:', err);
    res.status(500).json({ error: 'Failed to generate audit report' });
  }
});

module.exports = router;
