const express = require('express');
const auth = require('../middlewares/auth');
const { chatCompletion } = require('../openaiClient');
const PDFDocument = require('pdfkit');

const router = express.Router();

/**
 * POST /pitch/generate
 * Body: { business: { name, industry, problem, solution, market, traction, ask, kpis, products, ... } }
 * Returns a structured pitch outline (JSON) with standard sections.
 */
router.post('/generate', auth, async (req, res) => {
  try {
    const { business = {} } = req.body || {};
    const name = business.name || 'Your Business';

    const prompt = `
You are a seasoned startup advisor and pitch writer. Create a concise, investor-ready pitch outline for the business described below.

Business:
${JSON.stringify(business, null, 2)}

Return a JSON object with exactly these keys and types:
{
  "title": string,                // a crisp title/tagline
  "subtitle": string,             // one-liner elevator pitch
  "sections": [
    { "heading": "Problem", "bullets": [string, string, string] },
    { "heading": "Solution", "bullets": [string, string, string] },
    { "heading": "Market Opportunity", "bullets": [string, string, string] },
    { "heading": "Business Model", "bullets": [string, string, string] },
    { "heading": "Traction", "bullets": [string, string, string] },
    { "heading": "Go-to-Market", "bullets": [string, string, string] },
    { "heading": "Financials & Projections", "bullets": [string, string, string] },
    { "heading": "Team", "bullets": [string, string, string] },
    { "heading": "Ask", "bullets": [string, string, string] }
  ]
}

Use crisp bullet points (max ~12 words each). Reflect the specific industry and details if provided. Title/tagline should be catchy. Ensure valid JSON.
`;

    const completion = await chatCompletion({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are an expert startup advisor and pitch deck writer." },
        { role: "user", content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.6,
    });

    const raw = completion.choices?.[0]?.message?.content || '{}';
    let pitch;
    try {
      pitch = JSON.parse(raw);
    } catch {
      // fallback minimal structure
      pitch = {
        title: `${name} — ${business.industry || 'Business'}`,
        subtitle: "A concise elevator pitch will go here.",
        sections: [
          { heading: "Problem", bullets: ["State the core pain points.", "Size of problem (TAM/SAM).", "Existing alternatives are lacking."] },
          { heading: "Solution", bullets: ["Your product", "Key differentiators", "Proof points"] },
          { heading: "Market Opportunity", bullets: ["TAM/SAM/SOM", "Trends and timing", "Beachhead segment"] },
          { heading: "Business Model", bullets: ["Revenue model", "Pricing", "Unit economics"] },
          { heading: "Traction", bullets: ["Users/revenue", "Growth rate", "Partnerships"] },
          { heading: "Go-to-Market", bullets: ["Channels", "Acquisition strategy", "Sales motion"] },
          { heading: "Financials & Projections", bullets: ["6–12 month forecast", "CAC/LTV", "Break-even timeline"] },
          { heading: "Team", bullets: ["Founders", "Relevant experience", "Advisors"] },
          { heading: "Ask", bullets: ["Funding ask", "Use of funds", "Milestones"] }
        ]
      };
    }

    res.json({ success: true, pitch });
  } catch (err) {
    console.error('Pitch generation failed:', err);
    res.status(500).json({ error: 'Failed to generate pitch' });
  }
});

/**
 * POST /pitch/pdf
 * Body: { pitch: { title, subtitle, sections: [{ heading, bullets[] }] }, fileName? }
 * Streams back a generated PDF for download.
 */
router.post('/pdf', auth, async (req, res) => {
  try {
    const { pitch, fileName } = req.body || {};
    if (!pitch || !Array.isArray(pitch.sections)) {
      return res.status(400).json({ error: 'Valid pitch JSON required' });
    }

    const fname = (fileName || 'bizpanion-pitch.pdf').replace(/[^\w.\-]+/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    // Title
    doc.fontSize(22).text(pitch.title || 'Pitch Deck', { align: 'center' });
    if (pitch.subtitle) {
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#666').text(pitch.subtitle, { align: 'center' });
    }
    doc.fillColor('#000');
    doc.moveDown(1);

    // Sections
    const sections = pitch.sections || [];
    sections.forEach((sec, idx) => {
      if (idx > 0) doc.addPage();
      doc.fontSize(18).text(sec.heading || `Section ${idx + 1}`, { align: 'left' });
      doc.moveDown(0.6);
      const bullets = Array.isArray(sec.bullets) ? sec.bullets : [];
      doc.fontSize(12);
      bullets.forEach((b) => {
        doc.circle(doc.x + 4, doc.y + 6, 2).fill('#333').fillColor('#000');
        doc.text(`   ${b}`, { continued: false });
        doc.moveDown(0.4);
      });
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (err) {
    console.error('Pitch PDF generation failed:', err);
    res.status(500).json({ error: 'Failed to generate pitch PDF' });
  }
});

module.exports = router;
