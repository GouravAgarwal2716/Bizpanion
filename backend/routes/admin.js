const express = require('express');
const auth = require('../middlewares/auth');
const { requireRoles } = require('../middlewares/roles');
const { User, Document, Task, Order } = require('../models');

const router = express.Router();

/**
 * GET /admin/summary
 * Admin-only dashboard summary with key counts.
 */
router.get('/summary', auth, requireRoles('admin'), async (_req, res) => {
  try {
    const [users, documents, tasks, orders] = await Promise.all([
      User.count(),
      Document.count(),
      Task.count(),
      Order.count(),
    ]);

    res.json({
      users,
      documents,
      tasks,
      orders,
      generatedAt: new Date(),
    });
  } catch (err) {
    console.error('Admin summary failed:', err);
    res.status(500).json({ error: 'Failed to load admin summary' });
  }
});

/**
 * GET /admin/users
 * Admin-only: list users (basic info).
 */
router.get('/users', auth, requireRoles('admin'), async (_req, res) => {
  try {
    const items = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'businessName', 'industry', 'locale', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 200,
    });
    res.json(items);
  } catch (err) {
    console.error('Admin list users failed:', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

module.exports = router;
