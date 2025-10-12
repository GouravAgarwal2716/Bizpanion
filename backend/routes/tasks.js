const express = require('express');
const auth = require('../middlewares/auth');
const { Task } = require('../models');
const router = express.Router();

// Create a task
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, source, dueDate, priority, progress } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const src = ['chat', 'growth', 'manual'].includes(source) ? source : 'manual';
    const prio = ['low', 'medium', 'high'].includes(String(priority || '').toLowerCase())
      ? String(priority).toLowerCase()
      : 'medium';

    // Auto-compute due date if not supplied
    let computedDue = dueDate || null;
    if (!computedDue) {
      const d = new Date();
      if (src === 'growth') d.setDate(d.getDate() + 14);
      else if (src === 'chat') d.setDate(d.getDate() + 7);
      computedDue = src === 'manual' ? null : d;
    }

    // Clamp progress
    const prog = Number.isFinite(Number(progress)) ? Math.min(100, Math.max(0, Number(progress))) : 0;

    const task = await Task.create({
      user_id: req.user.id,
      title: title.trim(),
      description: description || null,
      source: src,
      dueDate: computedDue,
      status: 'open',
      priority: prio,
      progress: prog,
    });
    res.json(task);
  } catch (err) {
    console.error('Create task failed:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// List tasks (optionally filter by status)
router.get('/', auth, async (req, res) => {
  try {
    const where = { user_id: req.user.id };
    if (req.query.status && ['open', 'done'].includes(req.query.status)) {
      where.status = req.query.status;
    }
    if (req.query.priority && ['low', 'medium', 'high'].includes(String(req.query.priority).toLowerCase())) {
      where.priority = String(req.query.priority).toLowerCase();
    }
    const tasks = await Task.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });
    res.json(tasks);
  } catch (err) {
    console.error('List tasks failed:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Update a task (title/description/status/source/dueDate)
router.patch('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const { title, description, status, source, dueDate, priority, progress } = req.body;
    if (title !== undefined) task.title = String(title);
    if (description !== undefined) task.description = description;
    if (status && ['open', 'done'].includes(status)) task.status = status;
    if (source && ['chat', 'growth', 'manual'].includes(source)) task.source = source;
    if (dueDate !== undefined) task.dueDate = dueDate || null;
    if (priority && ['low', 'medium', 'high'].includes(String(priority).toLowerCase())) {
      task.priority = String(priority).toLowerCase();
    }
    if (progress !== undefined) {
      const prog = Number.isFinite(Number(progress)) ? Math.min(100, Math.max(0, Number(progress))) : task.progress;
      task.progress = prog;
    }

    await task.save();
    res.json(task);
  } catch (err) {
    console.error('Update task failed:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete a task
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    await task.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error('Delete task failed:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
