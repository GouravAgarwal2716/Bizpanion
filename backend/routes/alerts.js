const express = require('express');
const auth = require('../middlewares/auth');
const axios = require('axios');
const { Memory } = require('../models');

const router = express.Router();

/**
 * POST /alerts/digest
 * Body: { channel?: 'email'|'whatsapp', to?: string, persona?: string }
 * Builds a daily digest using /analytics/summary-text and recent insights.
 * If no provider configured, returns a preview payload for UI or logs.
 */
router.post('/digest', auth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { channel = 'email', to = '', persona = '' } = req.body || {};

    // 1) Get a 1-paragraph AI summary (force refresh)
    let summaryText = '';
    try {
      const base = `http://localhost:${process.env.PORT || 5000}`;
      const qs = `?refresh=1${persona ? `&persona=${encodeURIComponent(persona)}` : ''}`;
      const r = await axios.get(`${base}/analytics/summary-text${qs}`, {
        headers: { Authorization: req.headers.authorization }
      });
      summaryText = (r.data && r.data.summary) ? r.data.summary : '';
    } catch (e) {
      summaryText = 'Daily summary unavailable right now.';
    }

    // 2) Fetch latest insights (from Memory type=insight)
    const insights = await Memory.findAll({
      where: { user_id, type: 'insight' },
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['content', 'createdAt']
    });

    const insightLines = insights.map((i) => `• ${i.content}`).join('\n');

    // 3) Compose digest text
    const digest = `Bizpanion Daily Digest

${summaryText}

Recent AI Insights:
${insightLines || 'No insights available'}

Tip: Open your Dashboard for KPIs and channel breakdown.
– Bizpanion`;

    // Provider scaffolding: Twilio/SendGrid not wired by default
    const preview = {
      channel,
      to,
      subject: 'Bizpanion Daily Digest',
      text: digest,
      note: 'No provider configured. This is a preview payload. Integrate Twilio/SendGrid to send.'
    };

    // Optional: Placeholders for integration
    // if (process.env.SENDGRID_API_KEY && channel === 'email') { ... }
    // if (process.env.TWILIO_AUTH_TOKEN && channel === 'whatsapp') { ... }

    return res.json({ success: true, preview });
  } catch (err) {
    console.error('Digest build failed:', err);
    res.status(500).json({ error: 'Failed to build/send digest' });
  }
});

module.exports = router;
