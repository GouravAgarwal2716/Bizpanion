const express = require('express');
const auth = require('../middlewares/auth');
const models = require('../models');
const router = express.Router();

function genState() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

// List all connections for this user
router.get('/', auth, async (req, res) => {
  try {
    const conns = await models.Connection.findAll({ 
      where: { user_id: req.user.id },
      order: [['key', 'ASC']]
    });
    res.json(conns);
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

// Connect (or re-connect) to a service
router.post('/:key/connect', auth, async (req, res) => {
  try {
    const { key } = req.params;
    let conn = await models.Connection.findOne({ where: { user_id: req.user.id, key } });
    if (!conn) {
      conn = await models.Connection.create({
        user_id: req.user.id,
        key,
        name: key.charAt(0).toUpperCase() + key.slice(1),
        connected: true,
        lastSync: new Date(),
      });
    } else {
      conn.connected = true;
      conn.lastSync = new Date();
      await conn.save();
    }
    res.json(conn);
  } catch (error) {
    console.error('Error connecting:', error);
    res.status(500).json({ error: 'Failed to connect' });
  }
});

// Disconnect
router.post('/:key/disconnect', auth, async (req, res) => {
  try {
    const { key } = req.params;
    const conn = await models.Connection.findOne({ where: { user_id: req.user.id, key } });
    if (conn) {
      conn.connected = false;
      await conn.save();
    }
    res.json(conn);
  } catch (error) {
    console.error('Error disconnecting:', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

 // Manual sync
router.post('/:key/sync', auth, async (req, res) => {
  try {
    const { key } = req.params;
    const conn = await models.Connection.findOne({ where: { user_id: req.user.id, key } });
    if (!conn || !conn.connected) {
      return res.status(400).json({ error: 'Service not connected' });
    }
    conn.lastSync = new Date();
    await conn.save();
    res.json(conn);
  } catch (error) {
    console.error('Error syncing:', error);
    res.status(500).json({ error: 'Failed to sync' });
  }
});

/**
 * Mock OAuth: start
 * Marks connection as pending and returns a mock auth URL + state
 */
router.post('/:key/oauth/start', auth, async (req, res) => {
  try {
    const { key } = req.params;
    let conn = await models.Connection.findOne({ where: { user_id: req.user.id, key } });
    if (!conn) {
      conn = await models.Connection.create({
        user_id: req.user.id,
        key,
        name: key.charAt(0).toUpperCase() + key.slice(1),
        connected: false
      });
    }
    const state = genState();
    conn.oauthState = state;
    await conn.save();

    const authUrl = `https://mock.oauth/${key}/authorize?client_id=demo&redirect_uri=https://localhost/mock&state=${state}`;
    res.json({ authUrl, state });
  } catch (error) {
    console.error('OAuth start failed:', error);
    res.status(500).json({ error: 'OAuth start failed' });
  }
});

/**
 * Mock OAuth: callback
 * Verifies state, sets token, marks connected and updates lastSync
 */
router.post('/:key/oauth/callback', auth, async (req, res) => {
  try {
    const { key } = req.params;
    const { state } = req.body || {};
    const conn = await models.Connection.findOne({ where: { user_id: req.user.id, key } });
    if (!conn) return res.status(404).json({ error: 'Connection not found' });
    if (!state || state !== conn.oauthState) return res.status(400).json({ error: 'Invalid state' });

    conn.token = `mock-token-${key}-${Date.now()}`;
    conn.connected = true;
    conn.oauthState = 'authorized';
    conn.lastSync = new Date();
    await conn.save();

    res.json(conn);
  } catch (error) {
    console.error('OAuth callback failed:', error);
    res.status(500).json({ error: 'OAuth callback failed' });
  }
});

module.exports = router;
