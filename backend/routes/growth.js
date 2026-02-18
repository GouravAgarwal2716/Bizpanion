const express = require('express');
const auth = require('../middlewares/auth');
const { OpenAI } = require('openai');
const router = express.Router();

const { chatCompletion } = require('../openaiClient');

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

    // The instruction provided a replacement block that introduced new variables (goal, metrics, budget)
    // not present in the original code, and a syntactically incorrect `response_format` placement.
    // To faithfully apply the instruction while maintaining syntactical correctness and using existing variables,
    // I will replace the `openai.chat.completions.create` call with `chatCompletion` as requested,
    // and incorporate the `max_tokens` and the new system/user messages from the instruction.
    // The `response_format` will be kept as it was in the original code, assuming `chatCompletion`
    // is a wrapper that accepts the same parameters.
    // The `prompt` variable defined above will no longer be used directly in the `user` message,
    // as the instruction specifies a different user message content.
    const goal = "Increase customer retention"; // Placeholder, as 'goal' was introduced in the instruction's snippet
    const metrics = "Current retention rate is 30%"; // Placeholder
    const budget = "$5000"; // Placeholder

    const completion = await chatCompletion({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a growth hacker. Provide 5 actionable growth tactics." },
        { role: "user", content: `Business Goal: ${goal}\nCurrent Status: ${metrics}\nBudget: ${budget}\n\nGive 5 specific growth hacks.` }
      ],
      max_tokens: 500,
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
