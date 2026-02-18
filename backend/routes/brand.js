const express = require('express');
const auth = require('../middlewares/auth');
const { OpenAI } = require('openai');

const router = express.Router();
const { chatCompletion } = require('../openaiClient');

/**
 * POST /brand/generate
 * Body: { name?: string, industry?: string, tone?: string, keywords?: string[] }
 * Returns a JSON brand kit with color palette and font suggestions.
 */
router.post('/generate', auth, async (req, res) => {
  try {
    const { name = 'Your Brand', industry = '', tone = 'modern', keywords = [] } = req.body || {};

    const prompt = `
You are a senior brand designer. Create a compact brand kit for the brand below.
Return VALID JSON only, no extra commentary.

Brand:
- Name: ${name}
- Industry: ${industry}
- Tone/Style: ${tone}
- Keywords: ${(Array.isArray(keywords) ? keywords.join(', ') : '')}

JSON schema:
{
  "palette": {
    "primary": {"hex": string, "role": "Primary"},
    "secondary": {"hex": string, "role": "Secondary"},
    "accent": {"hex": string, "role": "Accent"},
    "neutral": {"hex": string, "role": "Neutral background"},
    "text": {"hex": string, "role": "Text"}
  },
  "fonts": {
    "heading": {"name": string, "fallback": string},
    "body": {"name": string, "fallback": string}
  },
  "notes": string
}

Constraints:
- Use accessible, high-contrast combinations suitable for web and mobile.
- Keep hex codes in 6-digit format (e.g., "#0EA5E9").
- Heading font should be distinct but readable; body font must be highly readable.
- Tailor choices to the industry and tone.
`;

    const completion = await chatCompletion({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are an expert brand designer producing concise, high-quality brand kits.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 800,
      temperature: 0.5
    });

    let data = {};
    try {
      data = JSON.parse(completion.choices?.[0]?.message?.content || '{}');
    } catch {
      data = {
        palette: {
          primary: { hex: '#4F46E5', role: 'Primary' },
          secondary: { hex: '#0EA5E9', role: 'Secondary' },
          accent: { hex: '#F59E0B', role: 'Accent' },
          neutral: { hex: '#F3F4F6', role: 'Neutral background' },
          text: { hex: '#111827', role: 'Text' }
        },
        fonts: {
          heading: { name: 'Poppins', fallback: 'sans-serif' },
          body: { name: 'Inter', fallback: 'sans-serif' }
        },
        notes: 'Fallback brand kit used.'
      };
    }

    res.json({ success: true, brand: { name, industry, tone, ...data } });
  } catch (err) {
    console.error('Brand generate failed:', err);
    res.status(500).json({ error: 'Failed to generate brand kit' });
  }
});

/**
 * POST /brand/logo
 * Body: { name: string, concept?: string, style?: 'minimal'|'luxury'|'playful'|'modern', size?: '512x512'|'1024x1024' }
 * Returns { image_b64 } for a generated logo concept (demo).
 */
router.post('/logo', auth, async (req, res) => {
  try {
    const { name, concept = '', style = 'modern', size = '512x512' } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Brand name is required' });
    }

    const logoPrompt = `
Design a flat, vector-style logo for the brand "${name}".
Style: ${style}. Keep it simple, clean, and professional.
Avoid text-heavy designs; use abstract mark or monogram inspired by "${concept || name}".
White or transparent background. No realistic shadows. High contrast and scalable.
`;

    // OpenAI Images API (gpt-image-1). Return base64 for ease of embedding.
    const result = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: logoPrompt,
      size,
      response_format: 'b64_json'
    });

    const b64 = result?.data?.[0]?.b64_json;
    if (!b64) {
      return res.status(500).json({ error: 'Image generation failed' });
    }

    res.json({ success: true, image_b64: b64, prompt: logoPrompt });
  } catch (err) {
    console.error('Brand logo failed:', err);
    res.status(500).json({ error: 'Failed to generate logo' });
  }
});

module.exports = router;
