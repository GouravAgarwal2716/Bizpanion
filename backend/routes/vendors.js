const express = require('express');
const auth = require('../middlewares/auth');

const router = express.Router();

// In-memory vendor catalog for MVP (replace with DB later)
const VENDORS = [
  {
    id: 'v_marketing_01',
    name: 'GrowthSprint Marketing',
    category: 'marketing',
    rating: 4.7,
    tags: ['Performance Ads', 'Social Media', 'Content'],
    minProject: 20000,
    description: 'Full-stack marketing agency specializing in performance ads, creatives, and social growth.',
    location: 'Bengaluru',
    contact: { email: 'hello@growthsprint.io', phone: '+91-9876543210' }
  },
  {
    id: 'v_logistics_01',
    name: 'ShipSwift Logistics',
    category: 'logistics',
    rating: 4.4,
    tags: ['Courier Aggregator', 'COD', 'Returns'],
    minProject: 5000,
    description: 'Courier aggregation with COD, NDR, and return handling for D2C brands.',
    location: 'Delhi NCR',
    contact: { email: 'support@shipswift.in', phone: '+91-9811122233' }
  },
  {
    id: 'v_webdev_01',
    name: 'PixelFoundry Web',
    category: 'webdev',
    rating: 4.8,
    tags: ['Shopify', 'Custom Dev', 'UI/UX'],
    minProject: 30000,
    description: 'Shopify experts and custom web development with UI/UX capabilities.',
    location: 'Mumbai',
    contact: { email: 'projects@pixelfoundry.dev', phone: '+91-9000000001' }
  },
  {
    id: 'v_marketing_02',
    name: 'AdPilot Labs',
    category: 'marketing',
    rating: 4.5,
    tags: ['Meta Ads', 'Google Ads', 'Analytics'],
    minProject: 15000,
    description: 'Lean performance lab for Meta + Google ads with analytics dashboards.',
    location: 'Remote',
    contact: { email: 'team@adpilotlabs.com', phone: '+91-9900900099' }
  }
];

/**
 * GET /vendors/catalog?category=marketing|logistics|webdev
 */
router.get('/catalog', auth, async (req, res) => {
  try {
    const { category } = req.query || {};
    const list = category ? VENDORS.filter(v => v.category === String(category)) : VENDORS;
    return res.json({ items: list });
  } catch (err) {
    console.error('Vendors catalog failed:', err);
    res.status(500).json({ error: 'Failed to load vendors' });
  }
});

/**
 * GET /vendors/:id
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const v = VENDORS.find(x => x.id === req.params.id);
    if (!v) return res.status(404).json({ error: 'Vendor not found' });
    return res.json(v);
  } catch (err) {
    console.error('Vendor fetch failed:', err);
    res.status(500).json({ error: 'Failed to fetch vendor' });
  }
});

/**
 * POST /vendors/:id/book
 * Body: { name, email, phone?, preferredTime?, notes? }
 */
router.post('/:id/book', auth, async (req, res) => {
  try {
    const v = VENDORS.find(x => x.id === req.params.id);
    if (!v) return res.status(404).json({ error: 'Vendor not found' });

    const { name, email, phone, preferredTime, notes } = req.body || {};
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

    // For MVP: Return mock confirmation; real impl would create DB record + send email/webhook
    return res.json({
      success: true,
      message: `Booking request sent to ${v.name}. They will contact ${name} at ${email}.`,
      booking: {
        id: Date.now(),
        vendorId: v.id,
        name,
        email,
        phone: phone || null,
        preferredTime: preferredTime || null,
        notes: notes || null,
        status: 'requested',
        createdAt: new Date()
      }
    });
  } catch (err) {
    console.error('Vendor booking failed:', err);
    res.status(500).json({ error: 'Failed to create booking request' });
  }
});


module.exports = router;
