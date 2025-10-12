const express = require('express');
const auth = require('../middlewares/auth');
const { Product } = require('../models');
const multer = require('multer');
const router = express.Router();

// In-memory file upload for CSV import
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

// Create product
router.post('/', auth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const {
      title,
      price,
      stock,
      description,
      sku,
      category,
      imageUrl,
      active
    } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const product = await Product.create({
      user_id,
      title: title.trim(),
      price: Number.isFinite(Number(price)) ? Number(price) : 0,
      stock: Number.isFinite(Number(stock)) ? Number(stock) : 0,
      description: description || null,
      sku: sku || null,
      category: category || null,
      imageUrl: imageUrl || null,
      active: typeof active === 'boolean' ? active : true
    });

    res.json(product);
  } catch (err) {
    console.error('Create product failed:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// List products (with optional active filter and q search)
router.get('/', auth, async (req, res) => {
  try {
    const { active, q } = req.query;
    const where = { user_id: req.user.id };

    if (active === 'true') where.active = true;
    if (active === 'false') where.active = false;
    if (q && q.trim()) {
      // Basic LIKE filter on title or sku
      where.title = require('sequelize').where(
        require('sequelize').fn('LOWER', require('sequelize').col('title')),
        'LIKE',
        `%${q.trim().toLowerCase()}%`
      );
    }

    const products = await Product.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    res.json(products);
  } catch (err) {
    console.error('List products failed:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOne({
      where: { id: req.params.id, user_id: req.user.id }
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    console.error('Get product failed:', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Update product
router.patch('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOne({
      where: { id: req.params.id, user_id: req.user.id }
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const allowed = ['title', 'price', 'stock', 'description', 'sku', 'category', 'imageUrl', 'active'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'title') product[key] = String(req.body[key] || '').trim();
        else if (key === 'price' || key === 'stock') product[key] = Number(req.body[key]) || 0;
        else if (key === 'active') product[key] = !!req.body[key];
        else product[key] = req.body[key];
      }
    }

    await product.save();
    res.json(product);
  } catch (err) {
    console.error('Update product failed:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOne({
      where: { id: req.params.id, user_id: req.user.id }
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    await product.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error('Delete product failed:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

/**
 * GET /products/low-stock?threshold=10
 * Returns products with stock <= threshold (default 10)
 */
router.get('/low-stock', auth, async (req, res) => {
  try {
    const threshold = Number(req.query.threshold) || 10;
    const { Op } = require('sequelize');
    const products = await Product.findAll({
      where: {
        user_id: req.user.id,
        stock: { [Op.lte]: threshold }
      },
      order: [['stock', 'ASC']]
    });
    res.json(products);
  } catch (err) {
    console.error('Low-stock fetch failed:', err);
    res.status(500).json({ error: 'Failed to fetch low-stock products' });
  }
});

/**
 * POST /products/import-csv
 * Multipart form-data with field 'file' (CSV: title,price,stock,description,sku,category,imageUrl,active)
 * Basic CSV parser (no quoted fields). Returns summary.
 */
router.post('/import-csv', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'CSV file is required (field name: file)' });
    }
    const csv = req.file.buffer.toString('utf8');
    const lines = csv.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) {
      return res.status(400).json({ error: 'CSV appears to be empty' });
    }

    // If header present, detect and skip; allow either with or without header
    const header = lines[0].toLowerCase();
    const startIndex = (header.includes('title') && header.includes('price')) ? 1 : 0;

    let created = 0;
    let errors = 0;
    const results = [];
    for (let i = startIndex; i < lines.length; i++) {
      const raw = lines[i].trim();
      if (!raw) continue;
      const parts = raw.split(','); // basic split; no quoted commas support
      const [title, price, stock, description, sku, category, imageUrl, active] = parts.map(p => (p ?? '').trim());
      if (!title) { errors++; continue; }

      try {
        const product = await Product.create({
          user_id: req.user.id,
          title,
          price: Number(price) || 0,
          stock: Number(stock) || 0,
          description: description || null,
          sku: sku || null,
          category: category || null,
          imageUrl: imageUrl || null,
          active: String(active || '').toLowerCase() === 'false' ? false : true
        });
        created++;
        results.push({ id: product.id, title: product.title });
      } catch (e) {
        errors++;
      }
    }

    res.json({ success: true, created, errors, resultsCount: results.length });
  } catch (err) {
    console.error('Import CSV failed:', err);
    res.status(500).json({ error: 'Failed to import CSV' });
  }
});

module.exports = router;
