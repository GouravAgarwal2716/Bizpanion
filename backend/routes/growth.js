const express = require('express');
const auth = require('../middlewares/auth');
const { OpenAI } = require('openai');
const router = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/generate', auth, async (req, res) => {
  try {
    const { business } = req.body;

    const prompt = `
      Generate a personalized growth plan for a business with the following details:
      - Business Name: ${business.name}
      - Industry: ${business.industry || 'General E-commerce'}
      - KPIs: ${JSON.stringify(business.kpis)}
      - Connections: ${JSON.stringify(business.connections)}

      Provide 3-5 actionable steps. Each step should be an object with the following keys:
      - "title": A concise title for the step (string).
      - "why": Explanation of why this step is important (string).
      - "action": Specific action to take (string).
      - "estImpact": Estimated impact (e.g., "High", "Medium", "Low") (string).

      Format the output as a JSON array of these step objects.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a business growth consultant. Your output MUST be a JSON array of objects, as described in the user prompt." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }, // Still use json_object, but the prompt guides it to be an array at the root
    });

    let growthPlan = [];
    try {
      // Attempt to parse directly as an array, or extract if wrapped in an object
      const parsedContent = JSON.parse(completion.choices[0].message.content);
      if (Array.isArray(parsedContent)) {
        growthPlan = parsedContent;
      } else if (typeof parsedContent === 'object' && parsedContent !== null) {
        // If it's an object, try to find an array within it
        const keys = Object.keys(parsedContent);
        for (const key of keys) {
          if (Array.isArray(parsedContent[key])) {
            growthPlan = parsedContent[key];
            break;
          }
        }
      }
    } catch (parseError) {
      console.error("Failed to parse AI growth plan response:", parseError);
      // Fallback to a default plan if AI response is unparseable
      growthPlan = [
        { title: "Review Analytics", why: "Understand current performance.", action: "Check dashboard KPIs.", estImpact: "Medium" },
        { title: "Optimize Website", why: "Improve user experience.", action: "Update site content.", estImpact: "High" }
      ];
    }

    res.json(growthPlan);
  } catch (err) {
    console.error('Growth plan generation failed:', err);
    res.status(500).json({ error: 'Failed to generate growth plan' });
  }
});

module.exports = router;
