const express = require('express');
const axios = require('axios');
const auth = require('../middlewares/auth');

const router = express.Router();

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:5001';

// Proxy: POST /rag/query -> RAG service /search
router.post('/query', auth, async (req, res) => {
  try {
    const { query, limit = 5 } = req.body || {};
    if (!query || !String(query).trim()) {
      return res.status(400).json({ error: 'Query required' });
    }

    const response = await axios.post(`${RAG_SERVICE_URL}/search`, {
      query,
      limit
    });

    res.json(response.data);
  } catch (err) {
    console.error('RAG query failed:', err.message);
    res.status(500).json({ error: 'RAG query failed' });
  }
});

// Health check passthrough
router.get('/health', async (_req, res) => {
  try {
    const response = await axios.get(`${RAG_SERVICE_URL}/health`);
    res.json(response.data);
  } catch (err) {
    res.status(503).json({ error: 'RAG service unavailable' });
  }
});

module.exports = router;
