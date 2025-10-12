const express = require('express');
const auth = require('../middlewares/auth');
const { Connection, Memory, Order, sequelize } = require('../models');
const { OpenAI } = require('openai');
const PDFDocument = require('pdfkit');
const router = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateAiInsights(kpis, connections, userId) {
  const connectionStatus = connections.map(c => `${c.name}: ${c.connected ? 'Connected' : 'Not Connected'}`).join(', ');
  const prompt = `
  Given the following business KPIs and connection statuses, generate exactly 3 concise, actionable insights for a small business owner.
  Return the response as three lines with a leading label in brackets indicating attention level: [High], [Medium], [Low], followed by the insight text.

  KPIs (Last Month):
  - Revenue: ${kpis.revenueMonth} INR (${kpis.revChangePct}% change)
  - Profit: ${kpis.profitMonth} INR (${kpis.profitChangePct}% change)
  - Average Order Value (AOV): ${kpis.aov} INR
  - New Customers: ${kpis.newCustomers}

  Connection Status: ${connectionStatus}

  Example format:
  [High] Instagram CAC rose 25% last week. Review creatives & targeting.
  [Medium] 'Blue Kurta' sells 3× faster on Amazon than Shopify.
  [Low] 15% of customers are dormant (90+ days). Send a comeback coupon.

  Generate 3 lines in this exact format:
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an AI business analyst providing actionable insights." },
        { role: "user", content: prompt }
      ],
      max_tokens: 300,
      temperature: 0.7,
    });
    const rawInsights = completion.choices[0].message.content || '';
    // Parse into objects with attention and text
    return rawInsights
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .slice(0, 3)
      .map(line => {
        const m = line.match(/^\[(High|Medium|Low)\]\s*(.+)$/i);
        if (m) {
          return { attention: m[1][0].toUpperCase() + m[1].slice(1).toLowerCase(), text: m[2].trim() };
        }
        return { attention: 'Medium', text: line.replace(/^(- |\d+\. )/, '').trim() };
      });
  } catch (error) {
    console.error("Error generating AI insights:", error);
    return [
      { attention: 'High', text: 'Focus on top-spending channels to improve ROAS.' },
      { attention: 'Medium', text: 'Improve product page speed to lift conversion.' },
      { attention: 'Low', text: 'Run a comeback campaign for dormant customers.' }
    ];
  }
}

/**
 * GET /analytics/summary
 * Returns KPI summary, channel breakdown, and insights for the current user.
 * This is heuristic/dummy data derived from connection states (suitable for demo).
 */
router.get('/summary', auth, async (req, res) => { // This is now dynamic
  try {
    const user_id = req.user.id;
    const { Op } = require('sequelize');
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));

    // Calculate KPIs from the Order table
    const summary = await Order.findOne({
      where: {
        user_id,
        createdAt: { [Op.gte]: thirtyDaysAgo },
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'revenueMonth'],
        [sequelize.fn('SUM', sequelize.col('profit')), 'profitMonth'],
        [sequelize.fn('AVG', sequelize.col('amount')), 'aov'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('orderId'))), 'orderCount'],
        [sequelize.fn('SUM', sequelize.cast(sequelize.col('isNewCustomer'), 'INTEGER')), 'newCustomers'],
      ],
      raw: true,
    });

    // Channel breakdown
    const channels = await Order.findAll({
      where: {
        user_id,
        createdAt: { [Op.gte]: thirtyDaysAgo },
      },
      attributes: ['platform', [sequelize.fn('SUM', sequelize.col('amount')), 'value']],
      group: ['platform'],
      raw: true,
    }).then(results => results.map(r => ({ key: r.platform, label: r.platform.charAt(0).toUpperCase() + r.platform.slice(1), value: parseFloat(r.value) })));

    // Insights: keep AI top-3 with explicit attention
    const kpis = {
      revenueMonth: parseFloat(summary.revenueMonth || 0),
      profitMonth: parseFloat(summary.profitMonth || 0),
      aov: parseFloat(summary.aov || 0),
      newCustomers: parseInt(summary.newCustomers || 0, 10),
      revChangePct: 12.5, // Note: Change percentages would require historical data comparison
      profitChangePct: -2.1,
    };

    const conns = await Connection.findAll({ where: { user_id } });
    const insights = await generateAiInsights({
      ...kpis
    }, conns, user_id);

    return res.json({
      ...kpis,
      channels,
      insights,
      generatedAt: new Date(),
    });
  } catch (err) {
    console.error('Analytics summary failed:', err);
    res.status(500).json({ error: 'Failed to generate analytics summary' });
  }
});

/**
 * POST /analytics/insights
 * Save a user-provided insight (stored in Memory table as type 'insight').
 */
router.post('/insights', auth, async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Insight text required' });
    }
    const rec = await Memory.create({
      user_id: req.user.id,
      type: 'insight',
      content: String(text).trim(),
    });
    res.json({ success: true, id: rec.id });
  } catch (err) {
    console.error('Save insight failed:', err);
    res.status(500).json({ error: 'Failed to save insight' });
  }
});

/**
 * GET /analytics/insights
 * Returns list of saved insights for the current user.
 */
router.get('/insights', auth, async (req, res) => {
  try {
    const items = await Memory.findAll({
      where: { user_id: req.user.id, type: 'insight' },
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'content', 'createdAt']
    });
    res.json(items);
  } catch (err) {
    console.error('List insights failed:', err);
    res.status(500).json({ error: 'Failed to list insights' });
  }
});

/**
 * DELETE /analytics/insights/:id
 * Deletes a specific saved insight for the current user.
 */
router.delete('/insights/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const insight = await Memory.findOne({
      where: { id, user_id, type: 'insight' },
    });

    if (!insight) {
      return res.status(404).json({ error: 'Insight not found' });
    }

    await insight.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error('Delete insight failed:', err);
    res.status(500).json({ error: 'Failed to delete insight' });
  }
});

/**
 * GET /analytics/report
 * Generates a PDF report of current KPI summary and insights.
 */
router.get('/report', auth, async (req, res) => {
  try {
    // Reuse summary logic
    const user_id = req.user.id;
    const conns = await Connection.findAll({
      where: { user_id },
      order: [['key', 'ASC']],
    });
    const isConnected = (key) => !!conns.find((c) => c.key === key && c.connected);

    let revenueMonth = 182450;
    let profitMonth = 45300;
    let aov = 2225;
    let newCustomers = 82;
    let revChangePct = 12.5;
    let profitChangePct = -2.1;

    if (isConnected('shopify')) { revenueMonth += 25000; aov += 75; }
    if (isConnected('amazon')) { revenueMonth += 18000; newCustomers += 15; }
    if (isConnected('pos')) { revenueMonth += 12000; aov += 50; }
    if (isConnected('meesho')) { revenueMonth += 8000; newCustomers += 10; }
    if (isConnected('ga4')) { revChangePct += 1.2; }

    const channels = [
      { key: 'shopify', label: 'Shopify', value: isConnected('shopify') ? 125000 : 90000 },
      { key: 'amazon', label: 'Amazon', value: isConnected('amazon') ? 85000 : 60000 },
      { key: 'pos', label: 'Offline POS', value: isConnected('pos') ? 45000 : 20000 },
      { key: 'meesho', label: 'Meesho', value: isConnected('meesho') ? 35000 : 15000 },
    ];

    // AI-generated insights
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    let insights = [];
    try {
      const prompt = `Generate 3 concise business insights given KPIs:
      Revenue: ${revenueMonth} INR (${revChangePct}%)
      Profit: ${profitMonth} INR (${profitChangePct}%)
      AOV: ${aov} INR, New Customers: ${newCustomers}
      Channels: ${channels.map(c => `${c.label}:${c.value}`).join(', ')}
      `;
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an AI business analyst providing actionable insights." },
          { role: "user", content: prompt }
        ],
        max_tokens: 250,
        temperature: 0.7,
      });
      insights = completion.choices[0].message.content
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => s.replace(/^(- |\d+\.\s*)/, ''));
    } catch (e) {
      insights = ["Connect more platforms for richer analytics.", "Improve product page speed.", "Run dormant-customer reactivation."];
    }

    // Generate PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="bizpanion-report.pdf"');

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    // Title
    doc.fontSize(20).text('Bizpanion KPI Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).fillColor('#666').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);
    doc.fillColor('#000');

    // KPIs
    doc.fontSize(14).text('Key Performance Indicators');
    doc.moveDown(0.5);
    doc.fontSize(12);
    doc.text(`- Revenue (Month): INR ${revenueMonth.toLocaleString('en-IN')} (${revChangePct}%)`);
    doc.text(`- Profit (Month): INR ${profitMonth.toLocaleString('en-IN')} (${profitChangePct}%)`);
    doc.text(`- AOV: INR ${aov.toLocaleString('en-IN')}`);
    doc.text(`- New Customers: ${newCustomers}`);
    doc.moveDown();

    // Channels
    doc.fontSize(14).text('Revenue by Channel');
    doc.moveDown(0.5);
    channels.forEach(c => {
      doc.fontSize(12).text(`- ${c.label}: INR ${c.value.toLocaleString('en-IN')}`);
    });
    doc.moveDown();

    // Insights
    doc.fontSize(14).text('AI Insights');
    doc.moveDown(0.5);
    insights.slice(0, 5).forEach((ins, idx) => {
      doc.fontSize(12).text(`${idx + 1}. ${ins}`);
    });

    doc.end();
  } catch (err) {
    console.error('Report generation failed:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * GET /analytics/health
 * Returns a heuristic business health score (0-100) with brief reasons.
 */
router.get('/health', auth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { Op } = require('sequelize');
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));

    // KPIs
    const summary = await Order.findOne({
      where: {
        user_id,
        createdAt: { [Op.gte]: thirtyDaysAgo },
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'revenueMonth'],
        [sequelize.fn('SUM', sequelize.col('profit')), 'profitMonth'],
        [sequelize.fn('AVG', sequelize.col('amount')), 'aov'],
        [sequelize.fn('SUM', sequelize.cast(sequelize.col('isNewCustomer'), 'INTEGER')), 'newCustomers'],
      ],
      raw: true,
    });

    const kpis = {
      revenueMonth: parseFloat(summary?.revenueMonth || 0),
      profitMonth: parseFloat(summary?.profitMonth || 0),
      aov: parseFloat(summary?.aov || 0),
      newCustomers: parseInt(summary?.newCustomers || 0, 10),
    };

    // Channels count from orders
    const channels = await Order.findAll({
      where: {
        user_id,
        createdAt: { [Op.gte]: thirtyDaysAgo },
      },
      attributes: ['platform', [sequelize.fn('SUM', sequelize.col('amount')), 'value']],
      group: ['platform'],
      raw: true,
    });

    const conns = await Connection.findAll({ where: { user_id } });

    // Heuristic scoring
    let score = 50;
    const reasons = [];

    // Revenue and profit contribution
    if (kpis.revenueMonth > 0) {
      const revBoost = Math.min(30, Math.log10(kpis.revenueMonth + 1) * 10); // 0..30
      score += revBoost;
      reasons.push(`Healthy revenue baseline (₹${Math.round(kpis.revenueMonth).toLocaleString('en-IN')}).`);
    } else {
      reasons.push('No recent revenue detected.');
    }
    if (kpis.profitMonth > 0) {
      score += 10;
      reasons.push('Positive monthly profit.');
    } else {
      score -= 5;
      reasons.push('Negative/zero monthly profit.');
    }

    // Channel diversification
    const channelCount = channels.filter(c => !!c.platform).length;
    if (channelCount >= 3) {
      score += 5;
      reasons.push('Diversified sales channels.');
    } else if (channelCount === 0) {
      score -= 5;
      reasons.push('No active sales channels detected.');
    }

    // Connections (integrations) encourage data-driven decisions
    const connectedCount = conns.filter(c => c.connected).length;
    if (connectedCount >= 3) {
      score += 5;
      reasons.push('Multiple integrations connected.');
    } else if (connectedCount === 0) {
      reasons.push('Consider connecting platforms for better insights.');
    }

    // AOV and new customers minor boost
    if (kpis.aov > 0) score += 2;
    if (kpis.newCustomers > 0) score += 3;

    score = Math.max(0, Math.min(100, score));

    res.json({ score, reasons });
  } catch (err) {
    console.error('Health score failed:', err);
    res.status(500).json({ error: 'Failed to compute health score' });
  }
});

/**
 * GET /analytics/summary-text
 * Returns a 1-paragraph GPT-generated business summary. Cached for 24h unless refresh=1.
 * Optional: persona query string to tailor tone (e.g., Retail | SaaS | Services | Other).
 */
router.get('/summary-text', auth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const persona = (req.query.persona || '').toString().trim();
    const refresh = String(req.query.refresh || '0') === '1';

    // Check cached summary in Memory (type: 'dashboard_summary')
    if (!refresh) {
      const cached = await Memory.findOne({
        where: { user_id, type: 'dashboard_summary' },
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'content', 'createdAt'],
      });

      if (cached) {
        const ageMs = Date.now() - new Date(cached.createdAt).getTime();
        const twentyFourHoursMs = 24 * 60 * 60 * 1000;
        if (ageMs < twentyFourHoursMs) {
          return res.json({ summary: cached.content, cached: true, generatedAt: cached.createdAt });
        }
      }
    }

    // Compute basic KPIs from Orders (last 30 days), similar to /summary
    const { Op } = require('sequelize');
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));

    const summary = await Order.findOne({
      where: { user_id, createdAt: { [Op.gte]: thirtyDaysAgo } },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'revenueMonth'],
        [sequelize.fn('SUM', sequelize.col('profit')), 'profitMonth'],
        [sequelize.fn('AVG', sequelize.col('amount')), 'aov'],
        [sequelize.fn('SUM', sequelize.cast(sequelize.col('isNewCustomer'), 'INTEGER')), 'newCustomers'],
      ],
      raw: true,
    });

    const kpis = {
      revenueMonth: parseFloat(summary?.revenueMonth || 0),
      profitMonth: parseFloat(summary?.profitMonth || 0),
      aov: parseFloat(summary?.aov || 0),
      newCustomers: parseInt(summary?.newCustomers || 0, 10),
    };

    // Channel breakdown for context
    const channels = await Order.findAll({
      where: { user_id, createdAt: { [Op.gte]: thirtyDaysAgo } },
      attributes: ['platform', [sequelize.fn('SUM', sequelize.col('amount')), 'value']],
      group: ['platform'],
      raw: true,
    });

    // Build a concise prompt
    const personaLine = persona ? `Business Type: ${persona}.` : '';
    const channelsLine = channels
      .filter(c => !!c.platform)
      .map(c => `${c.platform}:${parseFloat(c.value || 0)}`)
      .join(', ') || 'none';

    const prompt = `
${personaLine}
KPIs for last 30 days:
- Revenue: ${kpis.revenueMonth} INR
- Profit: ${kpis.profitMonth} INR
- AOV: ${kpis.aov} INR
- New Customers: ${kpis.newCustomers}
Channels (revenue): ${channelsLine}

Write ONE short paragraph (1–2 sentences) as a business summary in plain English (no bullet points). Tone: helpful, focused, and specific. Mention top-performing channel if relevant, and one clear recommendation.
    `.trim();

    // Generate with OpenAI
    const { OpenAI } = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    let text = '';
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a concise business analyst. Return 1 short paragraph only.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 160,
        temperature: 0.6,
      });
      text = (completion.choices?.[0]?.message?.content || '').trim();
    } catch (e) {
      console.error('Summary text generation failed:', e.message);
      text = 'Sales and profit performance summary unavailable right now. Try again shortly.';
    }

    // Cache result in Memory (replace old cache)
    try {
      await Memory.create({
        user_id,
        type: 'dashboard_summary',
        content: text,
      });
    } catch (e) {
      console.error('Failed to cache dashboard summary:', e.message);
    }

    res.json({ summary: text, cached: false, generatedAt: new Date() });
  } catch (err) {
    console.error('Summary text endpoint error:', err);
    res.status(500).json({ error: 'Failed to generate dashboard summary' });
  }
});

module.exports = router;
