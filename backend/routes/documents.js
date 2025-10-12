const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const path = require('path');
const fs = require('fs');
const auth = require('../middlewares/auth');
const models = require('../models');
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Allow PDF, CSV, and text files
    const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown', 'text/csv'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and text files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Upload document
router.post('/upload', auth, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const user_id = req.user.id;
    const { title, description } = req.body;
    
    let content = '';
    let processed = false;

    // Extract text from PDF
    if (req.file.mimetype === 'application/pdf') {
      const dataBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdfParse(dataBuffer);
      content = pdfData.text;
      processed = true;
    }
    // Read text files directly
    else if (req.file.mimetype.startsWith('text/')) {
      content = fs.readFileSync(req.file.path, 'utf8');
      processed = true;
    }

    // Store document in database
    const document = await models.Document.create({
      user_id,
      title: title || req.file.originalname,
      description: description || '',
      filename: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      content: content,
      processed: processed
    });

    // Trigger document processing in RAG service (async)
    if (processed && content) {
      setTimeout(async () => {
        try {
          const axios = require('axios');
          await axios.post(`${process.env.RAG_SERVICE_URL || 'http://localhost:5001'}/process`, {
            doc_id: document.id
          });
          console.log(`Document ${document.id} processed successfully`);
        } catch (error) {
          console.error(`Failed to process document ${document.id}:`, error.message);
        }
      }, 1000);
    }

    // Optional: auto-summarize document into long-term memory (controlled by DOC_AUTOSUMMARY)
    if (String(process.env.DOC_AUTOSUMMARY || 'false').toLowerCase() === 'true' && processed && content) {
      setTimeout(async () => {
        try {
          const prompt = `Summarize this business document in 3-5 crisp bullet points for future recall:\n\n${content.slice(0, 8000)}`;
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: 'You create concise business document summaries.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 300,
            temperature: 0.3,
          });
          const summary = completion.choices[0].message.content;
          await models.Memory.create({
            user_id,
            type: 'long-term',
            content: `doc:${document.id} summary - ${summary}`
          });
          console.log(`Document ${document.id} summarized into long-term memory`);
        } catch (e) {
          console.error(`Autosummary failed for document ${document.id}:`, e.message);
        }
      }, 1200);
    }

    res.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        description: document.description,
        originalName: document.originalName,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        processed: document.processed,
        createdAt: document.createdAt
      }
    });

  } catch (error) {
    console.error('Document upload error:', error);
    
    // Clean up uploaded file if database save failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Get all documents for user
router.get('/', auth, async (req, res) => {
  try {
    const documents = await models.Document.findAll({
      where: { user_id: req.user.id },
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'title', 'description', 'originalName', 'fileSize', 'mimeType', 'processed', 'createdAt']
    });

    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get specific document
router.get('/:id', auth, async (req, res) => {
  try {
    const document = await models.Document.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id 
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Delete document
router.delete('/:id', auth, async (req, res) => {
  try {
    const document = await models.Document.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id 
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete file from filesystem
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    // Delete from database
    await document.destroy();

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

/**
 * POST /documents/:id/reprocess
 * Triggers RAG service to (re)process this document's content.
 */
router.post('/:id/reprocess', auth, async (req, res) => {
  try {
    const doc = await models.Document.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Ensure file still exists; if not, return error
    if (!doc.filePath || !fs.existsSync(doc.filePath)) {
      return res.status(400).json({ error: 'Original file missing on server; re-upload required' });
    }

    // Kick off RAG processing
    const axios = require('axios');
    const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:5001';
    try {
      await axios.post(`${RAG_SERVICE_URL}/process`, { doc_id: doc.id });
    } catch (e) {
      console.error('RAG reprocess call failed:', e.message);
      // Still return ok to avoid blocking UI; client can check /rag/health
    }

    // Mark as processed (extraction already done at upload time)
    if (!doc.processed) {
      doc.processed = true;
      await doc.save();
    }

    return res.json({ success: true, message: 'Reprocessing requested. Check Knowledge Base soon for updated chunks.' });
  } catch (err) {
    console.error('Reprocess failed:', err);
    res.status(500).json({ error: 'Failed to reprocess document' });
  }
});

module.exports = router;
