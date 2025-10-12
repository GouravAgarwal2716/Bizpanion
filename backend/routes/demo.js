const express = require('express');
const auth = require('../middlewares/auth');

const router = express.Router();

/**
 * POST /demo/seed
 * Body (optional):
 *  - reset: boolean = true (clear existing demo data for this user)
 *  - days: number = 45 (how many days back to generate orders)
 *  - density: 'low' | 'medium' | 'high' = 'medium' (volume of orders)
 *
 * Seeds realistic demo data for the current user: connections, orders (per channel),
 * tasks, and a few insights in memory. Useful for showcasing analytics, health score,
 * tasks progress, and chat insights.
 */
router.post('/seed', auth, async (req, res) => {
  const { models } = require('../models');
  const { sequelize, Order, Connection, Task, Memory } = require('../models');
  const { reset = true, days = 45, density = 'medium' } = req.body || {};

  // Normalize args
  const daysBack = Math.max(7, Math.min(120, Number(days) || 45));
  const densityFactor = density === 'high' ? 1.6 : density === 'low' ? 0.7 : 1.0;

  const t = await sequelize.transaction();
  try {
    const user_id = req.user.id;

    // Optionally clear user's existing demo data
    if (reset) {
      await Order.destroy({ where: { user_id }, transaction: t });
      await Connection.destroy({ where: { user_id }, transaction: t });
      await Task.destroy({ where: { user_id }, transaction: t });
      // Keep long-term memories & docs; clear only 'insight' to avoid wiping user KB
      await Memory.destroy({ where: { user_id, type: 'insight' }, transaction: t });
    }

    // Seed connections
    const connections = [
      { key: 'shopify', name: 'Shopify', connected: true },
      { key: 'amazon', name: 'Amazon Seller', connected: true },
      { key: 'pos', name: 'Offline POS', connected: true },
      { key: 'meesho', name: 'Meesho', connected: true },
      { key: 'ga4', name: 'Google Analytics 4', connected: false },
      { key: 'instagram', name: 'Instagram Ads', connected: false },
    ].map((c) => ({ ...c, user_id }));
    await Connection.bulkCreate(connections, { transaction: t });

    // Seed orders across channels (last N days)
    const channels = ['shopify', 'amazon', 'pos', 'meesho'];
    const now = new Date();

    const basePerDay = {
      shopify: 5,
      amazon: 4,
      pos: 3,
      meesho: 2,
    };
    const orders = [];
    let globalOrderCounter = 10000;

    function randIn(min, max) {
      return Math.round(min + Math.random() * (max - min));
    }

    for (let i = 0; i < daysBack; i++) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const isWeekend = day.getDay() === 0 || day.getDay() === 6;

      for (const platform of channels) {
        // Daily count varies by platform, weekends slightly lower
        const target = Math.max(
          0,
          Math.round(
            (basePerDay[platform] || 2) *
              (isWeekend ? 0.7 : 1.0) *
              (1 + 0.2 * Math.sin(i / 6)) * // wave
              densityFactor
          )
        );

        for (let n = 0; n < target; n++) {
          const orderId = `${platform.toUpperCase()}-${globalOrderCounter++}`;
          // Platform-specific order amounts
          const base =
            platform === 'shopify'
              ? randIn(1200, 4500)
              : platform === 'amazon'
              ? randIn(900, 3800)
              : platform === 'pos'
              ? randIn(700, 3500)
              : randIn(500, 2500); // meesho
          const profit = Math.round(base * (0.22 + Math.random() * 0.12)); // 22%-34%

          const createdAt = new Date(day.getTime() - randIn(0, 10) * 60 * 60 * 1000); // scatter in the day
          const isNewCustomer = Math.random() < 0.28; // ~28% new customer share

          orders.push({
            user_id,
            orderId,
            platform,
            amount: base,
            profit,
            isNewCustomer,
            createdAt,
            updatedAt: createdAt,
          });
        }
      }
    }

    if (orders.length > 0) {
      await Order.bulkCreate(orders, { transaction: t });
    }

    // Seed tasks: open and done with priorities and progress
    const tasks = [
      {
        title: 'Optimize product images (WebP)',
        description: 'Compress hero and PDP images to improve page speed and conversion.',
        source: 'growth',
        status: 'open',
        priority: 'high',
        progress: 30,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Run dormant-customer comeback email',
        description: 'Send 10% off to customers who haven’t purchased in 90+ days.',
        source: 'chat',
        status: 'open',
        priority: 'medium',
        progress: 10,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Create Instagram reels for top SKUs',
        description: 'Use short-form video for Blue Kurta and Festive Silk Saree.',
        source: 'manual',
        status: 'done',
        priority: 'low',
        progress: 100,
        dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    ].map((t) => ({ ...t, user_id }));
    await Task.bulkCreate(tasks, { transaction: t });

    // Seed insights in Memory
    const insights = [
      'Shopify conversion up 9% after PDP tweaks; continue image compression.',
      "Amazon AOV 12% lower than Shopify; bundle accessories to lift AOV.",
      "15% of customers are dormant (>90d). Target with comeback coupon.",
    ].map((content) => ({
      user_id,
      type: 'insight',
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    await Memory.bulkCreate(insights, { transaction: t });

    await t.commit();

    return res.json({
      success: true,
      message: 'Demo data seeded successfully.',
      inserted: {
        connections: connections.length,
        orders: orders.length,
        tasks: tasks.length,
        insights: insights.length,
      },
      params: { days: daysBack, density: density },
    });
  } catch (err) {
    await t.rollback();
    console.error('Demo seed failed:', err);
    res.status(500).json({ error: 'Failed to seed demo data' });
  }
});

/**
 * POST /demo/clear
 * Clears seeded demo data for this user (orders, connections, tasks, insight memories).
 */
router.post('/clear', auth, async (req, res) => {
  const { sequelize, Order, Connection, Task, Memory } = require('../models');
  const t = await sequelize.transaction();
  try {
    const user_id = req.user.id;
    await Order.destroy({ where: { user_id }, transaction: t });
    await Connection.destroy({ where: { user_id }, transaction: t });
    await Task.destroy({ where: { user_id }, transaction: t });
    await Memory.destroy({ where: { user_id, type: 'insight' }, transaction: t });

    await t.commit();
    res.json({ success: true, message: 'Demo data cleared.' });
  } catch (err) {
    await t.rollback();
    console.error('Demo clear failed:', err);
    res.status(500).json({ error: 'Failed to clear demo data' });
  }
});

module.exports = router;
