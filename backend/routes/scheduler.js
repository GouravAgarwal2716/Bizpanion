const express = require('express');
const auth = require('../middlewares/auth');
const { runOnce } = require('../utils/scheduler');

const router = express.Router();

/**
 * POST /scheduler/run
 * Manually trigger the KPI auto-insight check once across all users.
 * Useful for demos or immediate recalculation after seeding.
 */
router.post('/run', auth, async (req, res) => {
  try {
    const result = await runOnce();
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Scheduler manual run failed:', err);
    res.status(500).json({ error: 'Failed to run scheduler' });
  }
});

module.exports = router;
