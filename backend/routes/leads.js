const express = require('express');
const auth = require('../middlewares/auth');
const { Lead } = require('../models');
const router = express.Router();

// Create lead
router.post('/', auth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { name, email, phone, source, status, notes, followUpAt } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Lead name is required' });
    }
    const lead = await Lead.create({
      user_id,
      name: name.trim(),
      email: email || null,
      phone: phone || null,
      source: source || null,
      status: ['new', 'contacted', 'qualified', 'won', 'lost'].includes(status) ? status : 'new',
      notes: notes || null,
      followUpAt: followUpAt || null,
    });
    res.json(lead);
  } catch (err) {
    console.error('Create lead failed:', err);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// List leads with optional filters ?status=&q=
router.get('/', auth, async (req, res) => {
  try {
    const { status, q } = req.query;
    const where = { user_id: req.user.id };
    if (status && ['new', 'contacted', 'qualified', 'won', 'lost'].includes(status)) {
      where.status = status;
    }
    if (q && q.trim()) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { name: { [Op.like]: `%${q}%` } },
        { email: { [Op.like]: `%${q}%` } },
        { phone: { [Op.like]: `%${q}%` } },
        { source: { [Op.like]: `%${q}%` } },
      ];
    }
    const leads = await Lead.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });
    res.json(leads);
  } catch (err) {
    console.error('List leads failed:', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Get lead
router.get('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json(lead);
  } catch (err) {
    console.error('Get lead failed:', err);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// Update lead
router.patch('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const allowed = ['name', 'email', 'phone', 'source', 'status', 'notes', 'followUpAt'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'name') lead[key] = String(req.body[key] || '').trim();
        else if (key === 'status') {
          const st = String(req.body[key] || '').trim();
          if (['new', 'contacted', 'qualified', 'won', 'lost'].includes(st)) lead.status = st;
        } else {
          lead[key] = req.body[key];
        }
      }
    }

    await lead.save();
    res.json(lead);
  } catch (err) {
    console.error('Update lead failed:', err);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Delete lead
router.delete('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    await lead.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error('Delete lead failed:', err);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

module.exports = router;
