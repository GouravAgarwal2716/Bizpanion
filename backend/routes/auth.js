const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const auth = require('../middlewares/auth');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

 // Register
router.post('/register', async (req, res) => {
  const { name, email, password, businessName, industry, locale, role: roleInput } = req.body;
  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Sanitize/whitelist role; prevent clients from self-assigning admin
    const allowedRoles = ['entrepreneur', 'consultant', 'vendor'];
    const role =
      typeof roleInput === 'string' && allowedRoles.includes(String(roleInput).toLowerCase())
        ? String(roleInput).toLowerCase()
        : 'entrepreneur';

    // Create user
    const user = await User.create({
      name,
      email,
      password: hash,
      businessName,
      industry,
      locale,
      role
    });

    // Include role in JWT so role-based middleware can use it
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        industry: user.industry,
        locale: user.locale,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Registration failed:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

 // Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });

    // Include role in JWT
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        industry: user.industry,
        locale: user.locale,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login failed:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

 // Get current user
router.get('/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'name', 'email', 'businessName', 'industry', 'locale', 'role']
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

/**
 * PUT /auth/update
 * Update current user's profile (name, businessName, industry, locale)
 */
router.put('/update', auth, async (req, res) => {
  try {
    const { name, businessName, industry, locale } = req.body || {};
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (typeof name === 'string') user.name = name;
    if (typeof businessName === 'string') user.businessName = businessName;
    if (typeof industry === 'string') user.industry = industry;
    if (typeof locale === 'string') user.locale = locale;

    await user.save();

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        industry: user.industry,
        locale: user.locale
      }
    });
  } catch (err) {
    console.error('User update failed:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

module.exports = router;
