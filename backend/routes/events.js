const express = require('express');

// Simple Server-Sent Events (SSE) stream for demo real-time updates
const router = express.Router();

// Keep a list of connected clients
const clients = new Set();

router.get('/stream', (req, res) => {
  // Light CORS for SSE (redundant to global CORS but ensures browsers accept the stream)
  const ALLOWED_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    // Credentials not required for SSE here, but allow if needed
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  // Immediately send a comment to keep the connection open in some proxies
  res.write(': connected\n\n');

  const client = { res };
  clients.add(client);

  // Heartbeat every 20s (prevents some proxies from closing the connection)
  const heartbeat = setInterval(() => {
    res.write(': ping\n\n');
  }, 20000);

  // Clean up when client disconnects
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(client);
  });
});

// Utility to broadcast an event text to all clients
function broadcast(text) {
  for (const client of clients) {
    try {
      client.res.write(`data: ${JSON.stringify({ message: text, ts: Date.now() })}\n\n`);
    } catch (e) {
      // If write fails, drop client
      clients.delete(client);
    }
  }
}

// Demo generator: every 30 seconds, emit a random event
setInterval(() => {
  const events = [
    'New order received: #ORD-' + Math.floor(1000 + Math.random() * 9000),
    'New customer signed up',
    'Low stock alert on: Blue Kurta',
    'Abandoned cart recovered',
    'High traffic spike detected on product page'
  ];
  const pick = events[Math.floor(Math.random() * events.length)];
  broadcast(pick);
}, 30000);

module.exports = { router, broadcast };
