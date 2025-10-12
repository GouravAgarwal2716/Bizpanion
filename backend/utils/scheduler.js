const { User, Order, Memory, sequelize } = require('../models');

/**
 * Compute KPI changes and auto-create insights if significant.
 * - Checks last 2 day buckets for revenue/profit
 * - If revenue drop <= -20% or profit drop <= -20%, creates an insight
 * - If spike >= +25%, also creates an insight (positive note)
 */
async function checkUserKpiShift(user_id) {
  const { Op } = require('sequelize');
  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const dayCol = sequelize.fn('DATE', sequelize.col('createdAt'));

  const rows = await Order.findAll({
    where: { user_id, createdAt: { [Op.gte]: since } },
    attributes: [
      [dayCol, 'day'],
      [sequelize.fn('SUM', sequelize.col('amount')), 'revenue'],
      [sequelize.fn('SUM', sequelize.col('profit')), 'profit']
    ],
    group: [dayCol],
    order: [[dayCol, 'ASC']],
    raw: true
  }).catch(() => []);

  if (!rows || rows.length < 2) return null;

  // Use last two buckets
  const last = rows[rows.length - 1];
  const prev = rows[rows.length - 2];

  const revPrev = Number(prev.revenue || 0);
  const revLast = Number(last.revenue || 0);
  const profPrev = Number(prev.profit || 0);
  const profLast = Number(last.profit || 0);

  // Calculate pct deltas
  const revDelta = revPrev ? ((revLast - revPrev) / revPrev) * 100 : 0;
  const profDelta = profPrev ? ((profLast - profPrev) / profPrev) * 100 : 0;

  // Create insights for notable changes
  const insights = [];
  if (revPrev > 0 && revDelta <= -20) {
    insights.push(
      `Revenue dropped ${revDelta.toFixed(1)}% vs previous day (₹${Math.round(revPrev).toLocaleString('en-IN')} → ₹${Math.round(revLast).toLocaleString('en-IN')}). Investigate channel performance and campaigns.`
    );
  } else if (revPrev > 0 && revDelta >= 25) {
    insights.push(
      `Revenue increased ${revDelta.toFixed(1)}% vs previous day (₹${Math.round(revPrev).toLocaleString('en-IN')} → ₹${Math.round(revLast).toLocaleString('en-IN')}). Double down on the winning channels.`
    );
  }

  if (profPrev > 0 && profDelta <= -20) {
    insights.push(
      `Profit dropped ${profDelta.toFixed(1)}% vs previous day (₹${Math.round(profPrev).toLocaleString('en-IN')} → ₹${Math.round(profLast).toLocaleString('en-IN')}). Review discounts, CAC, and operating costs.`
    );
  } else if (profPrev > 0 && profDelta >= 25) {
    insights.push(
      `Profit increased ${profDelta.toFixed(1)}% vs previous day (₹${Math.round(profPrev).toLocaleString('en-IN')} → ₹${Math.round(profLast).toLocaleString('en-IN')}). Maintain the current mix and monitor margins.`
    );
  }

  for (const content of insights) {
    try {
      await Memory.create({ user_id, type: 'insight', content });
    } catch (e) {
      // ignore
    }
  }

  return { user_id, revDelta, profDelta, created: insights.length };
}

async function runOnce() {
  try {
    const users = await User.findAll({ attributes: ['id'] });
    const results = [];
    for (const u of users) {
      const r = await checkUserKpiShift(u.id).catch(() => null);
      if (r) results.push(r);
    }
    return { ok: true, checked: users.length, results };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function startScheduler() {
  // Staggered initial run after 15s, then every 24h
  setTimeout(() => {
    runOnce().then((r) => {
      console.log('[scheduler] Initial KPI check complete:', JSON.stringify(r));
    }).catch((e) => console.error('[scheduler] Initial run failed:', e.message));
  }, 15000);

  const oneDayMs = 24 * 60 * 60 * 1000;
  setInterval(() => {
    runOnce().then((r) => {
      console.log('[scheduler] Daily KPI check complete:', JSON.stringify(r));
    }).catch((e) => console.error('[scheduler] Daily run failed:', e.message));
  }, oneDayMs);
}

module.exports = { startScheduler, runOnce };
