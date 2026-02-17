const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { sequelize } = require('./models');

dotenv.config();

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_ORIGIN,                          // e.g. https://your-app.vercel.app
  process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` // Vercel provides this env in some setups
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser or same-origin requests with no origin header
    if (!origin) return callback(null, true);

    const isAllowed =
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(origin); // allow any Vercel deployment domains

    return callback(isAllowed ? null : new Error('Not allowed by CORS'), isAllowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
// Handle CORS preflight for all routes
app.options(/.*/, cors(corsOptions));
app.use(express.json());

// Serve uploaded files statically (useful for previews/downloads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const connectionsRoutes = require('./routes/connections');
const documentsRoutes = require('./routes/documents');
const tasksRoutes = require('./routes/tasks');
const analyticsRoutes = require('./routes/analytics');
const productsRoutes = require('./routes/products');
const siteRoutes = require('./routes/site');
const growthRoutes = require('./routes/growth');
const ragRoutes = require('./routes/rag');
const eventsRoutes = require('./routes/events');
const memoryRoutes = require('./routes/memory');
const adminRoutes = require('./routes/admin');
const webhooksRoutes = require('./routes/webhooks');
const actionsRoutes = require('./routes/actions');
const pitchRoutes = require('./routes/pitch');
const vendorsRoutes = require('./routes/vendors');
const brandRoutes = require('./routes/brand');
const demoRoutes = require('./routes/demo');
const agentsRoutes = require('./routes/agents');
const alertsRoutes = require('./routes/alerts');
const auditRoutes = require('./routes/audit');
const schedulerRoutes = require('./routes/scheduler');
const aiRoutes = require('./routes/ai');
const { startScheduler } = require('./utils/scheduler');


app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);
app.use('/connections', connectionsRoutes);
app.use('/documents', documentsRoutes);
app.use('/tasks', tasksRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/products', productsRoutes);
app.use('/site', siteRoutes);
app.use('/growth', growthRoutes);
app.use('/rag', ragRoutes);
app.use('/events', eventsRoutes.router);
app.use('/memory', memoryRoutes);
app.use('/admin', adminRoutes);
app.use('/webhooks', webhooksRoutes);
app.use('/actions', actionsRoutes);
app.use('/pitch', pitchRoutes);
app.use('/vendors', vendorsRoutes);
app.use('/brand', brandRoutes);
app.use('/demo', demoRoutes);
app.use('/agents', agentsRoutes);
app.use('/alerts', alertsRoutes);
app.use('/audit', auditRoutes);
app.use('/scheduler', schedulerRoutes);
app.use('/ai', aiRoutes);

startScheduler();

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'backend' });
});

const PORT = process.env.PORT || 5000;

sequelize.sync({ alter: true }).then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Sequelize sync failed:', err);
  process.exit(1);
});
