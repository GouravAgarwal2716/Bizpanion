const express = require('express');
const auth = require('../middlewares/auth');
const { Memory, Task, Order, sequelize } = require('../models');

const router = express.Router();

/**
 * GET /memory/timeline?days=30
 * Returns a chronological "AI Memory" timeline combining:
 * - Memories (insights, dashboard summaries, agent contexts)
 * - Tasks (created items)
 * - KPI series by day (revenue, profit, new customers) + deltas
 *
 * This powers an AI Memory Graph + Timeline visualization on the frontend.
 */
router.get('/timeline', auth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const days = Math.max(7, Math.min(180, parseInt(req.query.days || '30', 10)));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 1) Pull memories (insights, summaries, agent contexts)
    const memories = await Memory.findAll({
      where: {
        user_id,
        type: ['insight', 'dashboard_summary', 'agent_context'],
      },
      order: [['createdAt', 'ASC']],
      attributes: ['id', 'type', 'content', 'createdAt'],
    });

    // 2) Pull tasks (created within range)
    const tasks = await Task.findAll({
      where: {
        user_id,
        createdAt: { [require('sequelize').Op.gte]: since },
      },
      order: [['createdAt', 'ASC']],
      attributes: ['id', 'title', 'status', 'priority', 'progress', 'createdAt', 'dueDate', 'source'],
    });

    // 3) KPI series by day from Orders within the range
    // Group by DATE(createdAt) to support SQLite/Postgres
    const dayCol = sequelize.fn('DATE', sequelize.col('createdAt'));
    const kpiRows = await Order.findAll({
      where: {
        user_id,
        createdAt: { [require('sequelize').Op.gte]: since },
      },
      attributes: [
        [dayCol, 'day'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'revenue'],
        [sequelize.fn('SUM', sequelize.col('profit')), 'profit'],
        [sequelize.fn('SUM', sequelize.cast(sequelize.col('isNewCustomer'), 'INTEGER')), 'newCustomers'],
      ],
      group: [dayCol],
      order: [[dayCol, 'ASC']],
      raw: true,
    });

    // Build a dense day series over the window, filling missing days with zeros
    const series = [];
    const dayIndex = {};
    for (const row of kpiRows) {
      dayIndex[String(row.day)] = {
        day: String(row.day),
        revenue: parseFloat(row.revenue || 0),
        profit: parseFloat(row.profit || 0),
        newCustomers: parseInt(row.newCustomers || 0, 10),
      };
    }
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      series.push(
        dayIndex[key] || { day: key, revenue: 0, profit: 0, newCustomers: 0 }
      );
    }
    // Compute deltas vs previous day
    for (let i = 0; i < series.length; i++) {
      const prev = i > 0 ? series[i - 1] : null;
      const cur = series[i];
      const revDelta = prev && prev.revenue ? ((cur.revenue - prev.revenue) / prev.revenue) * 100 : 0;
      const profitDelta = prev && prev.profit ? ((cur.profit - prev.profit) / prev.profit) * 100 : 0;
      cur.revDelta = isFinite(revDelta) ? Number(revDelta.toFixed(2)) : 0;
      cur.profitDelta = isFinite(profitDelta) ? Number(profitDelta.toFixed(2)) : 0;
    }

    // 4) Timeline events (memories + tasks) unified and sorted
    // Map memory types to readable titles
    const memTitle = (m) =>
      m.type === 'insight'
        ? 'AI Insight'
        : m.type === 'dashboard_summary'
        ? 'Dashboard Summary'
        : m.type === 'agent_context'
        ? 'Agent Context'
        : 'Memory';

    const events = [
      ...memories.map((m) => ({
        kind: 'memory',
        type: m.type,
        title: memTitle(m),
        content: m.content,
        createdAt: m.createdAt,
      })),
      ...tasks.map((t) => ({
        kind: 'task',
        type: 'task_created',
        title: `Task: ${t.title}`,
        status: t.status,
        priority: t.priority,
        progress: t.progress,
        dueDate: t.dueDate,
        source: t.source,
        createdAt: t.createdAt,
      })),
    ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json({
      range: {
        from: since.toISOString(),
        to: new Date().toISOString(),
        days,
      },
      kpis: series,
      events,
      counts: {
        insights: memories.filter((m) => m.type === 'insight').length,
        summaries: memories.filter((m) => m.type === 'dashboard_summary').length,
        agentContexts: memories.filter((m) => m.type === 'agent_context').length,
        tasks: tasks.length,
      },
    });
  } catch (err) {
    console.error('Memory timeline failed:', err);
    res.status(500).json({ error: 'Failed to build memory timeline' });
  }
});

module.exports = router;
