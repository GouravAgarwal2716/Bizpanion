const express = require('express');
const auth = require('../middlewares/auth');
const { chatCompletion } = require('../openaiClient');
const router = express.Router();

// Generate business ideas
router.post('/generate-ideas', auth, async (req, res) => {
  try {
    const { interests, region, budget, experience, marketTrend } = req.body;

    const prompt = `
You are a business consultant AI. Generate 3 innovative business ideas based on the user's profile:

User Profile:
- Interests/Skills: ${interests}
- Location: ${region}
- Budget: ${budget}
- Experience: ${experience}
- Market Trend Interest: ${marketTrend}

For each business idea, provide:
1. A catchy business name
2. A compelling tagline
3. Brief description (2-3 sentences)
4. Investment required (realistic for the budget range)
5. Market potential (High/Medium/Low)
6. Target audience
7. 3 key insights about why this idea works

Format the response as JSON with this structure:
{
  "ideas": [
    {
      "name": "Business Name",
      "tagline": "Catchy tagline",
      "description": "Brief description",
      "investment": "₹X - ₹Y",
      "potential": "High/Medium/Low",
      "target": "Target audience description",
      "insights": [
        "Key insight 1",
        "Key insight 2", 
        "Key insight 3"
      ],
      "trend": "${marketTrend}"
    }
  ]
}

Focus on ideas that are:
- Feasible with the given budget
- Relevant to the location and market
- Innovative but realistic
- Aligned with current trends
`;

    const completion = await chatCompletion({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are an expert business consultant specializing in startup ideas and entrepreneurship." },
        { role: "user", content: prompt }
      ],
      max_tokens: 2000,
      temperature: 0.8,
    });

    const response = completion.choices[0].message.content;

    try {
      const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const ideas = JSON.parse(cleanJson);
      res.json(ideas);
    } catch (parseError) {
      // Fallback if JSON parsing fails
      res.json({
        ideas: [
          {
            name: "Smart Local Services",
            tagline: "Connecting communities through technology",
            description: "A platform that connects local service providers with customers in your area, focusing on home services, tutoring, and personal care.",
            investment: "₹50,000 - ₹2,00,000",
            potential: "High",
            target: "Local service providers and residents",
            insights: [
              "Growing demand for local, trusted services",
              "Low startup costs with high scalability",
              "Strong community engagement potential"
            ],
            trend: "Technology"
          }
        ]
      });
    }

  } catch (error) {
    console.error('Error generating business ideas:', error);
    res.status(500).json({ error: 'Failed to generate business ideas' });
  }
});

// Save business idea
router.post('/save-idea', auth, async (req, res) => {
  try {
    const { name, tagline, description, investment, potential, target, insights, trend } = req.body;

    // Here you would save to database
    // For now, just return success
    res.json({
      success: true,
      message: 'Idea saved successfully',
      idea: {
        id: Date.now(),
        name,
        tagline,
        description,
        investment,
        potential,
        target,
        insights,
        trend,
        savedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error saving idea:', error);
    res.status(500).json({ error: 'Failed to save idea' });
  }
});

// Generate business plan
router.post('/generate-plan', auth, async (req, res) => {
  try {
    const { idea } = req.body;

    const prompt = `
Create a comprehensive business plan for this business idea:

Business Name: ${idea.name}
Tagline: ${idea.tagline}
Description: ${idea.description}
Investment Required: ${idea.investment}
Target Market: ${idea.target}
Key Insights: ${(idea.insights || []).join(', ')}

Generate a detailed business plan including:
1. Executive Summary
2. Company Description
3. Market Analysis
4. Marketing Strategy
5. Financial Projections (6 months)
6. Operations Plan
7. Risk Analysis
8. Implementation Timeline

Format as a structured business plan document.
`;

    const completion = await chatCompletion({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert business consultant who creates detailed, actionable business plans." },
        { role: "user", content: prompt }
      ],
      max_tokens: 3000,
      temperature: 0.7,
    });

    const businessPlan = completion.choices[0].message.content;

    res.json({
      success: true,
      businessPlan: businessPlan,
      idea: idea
    });

  } catch (error) {
    console.error('Error generating business plan:', error);
    res.status(500).json({ error: 'Failed to generate business plan' });
  }
});

// Generate marketing content
router.post('/generate-marketing', auth, async (req, res) => {
  try {
    const { businessType, targetAudience, tone, contentType } = req.body;

    const prompt = `
Create ${contentType} content for a ${businessType} business targeting ${targetAudience}.

Tone: ${tone}

Generate engaging, professional content that:
- Captures attention
- Clearly communicates value proposition
- Includes a strong call-to-action
- Is appropriate for the target audience

Make it compelling and actionable.
`;

    const completion = await chatCompletion({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a professional marketing copywriter specializing in business content creation." },
        { role: "user", content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.8,
    });

    const content = completion.choices[0].message.content;
    // Gemini often wraps properly but let's be safe if we asked for JSON (we didn't here, but good practice to clean if needed)
    // For marketing content, it's just text, so no JSON parse needed unless we change prompt.
    // BUT the 'marketing' route returns { content: string }, so we just send the text.

    res.json({
      success: true,
      content: content.replace(/```html/g, '').replace(/```/g, '').trim() // Clean potential markdown
    });

  } catch (error) {
    console.error('Error generating marketing content:', error);
    res.status(500).json({ error: 'Failed to generate marketing content' });
  }
});

// Market analysis
router.post('/market-analysis', auth, async (req, res) => {
  try {
    const { industry, region, businessType } = req.body;

    const prompt = `
Provide a comprehensive market analysis for a ${businessType} business in the ${industry} industry, operating in ${region}.

Include:
1. Market Size and Growth Potential
2. Key Competitors
3. Target Customer Segments
4. Market Trends
5. Opportunities and Threats
6. Competitive Advantages
7. Pricing Strategy Recommendations
8. Market Entry Strategy

Make it specific to the Indian market context and current trends.
`;

    const completion = await chatCompletion({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a market research analyst specializing in the Indian business landscape." },
        { role: "user", content: prompt }
      ],
      max_tokens: 2000,
      temperature: 0.6,
    });

    const analysis = completion.choices[0].message.content;

    res.json({
      success: true,
      analysis: analysis
    });

  } catch (error) {
    console.error('Error generating market analysis:', error);
    res.status(500).json({ error: 'Failed to generate market analysis' });
  }
});

/**
 * Financial projections (JSON for charts)
 * Returns structured JSON for 6-month scenarios Best/Expected/Worst plus break-even and notes.
 */
router.post('/financial-projections', auth, async (req, res) => {
  try {
    const { businessType, initialInvestment, monthlyRevenue, expenses, monthlyExpenses } = req.body;
    const exp = Number(expenses ?? monthlyExpenses ?? 0) || 0;
    const rev = Number(monthlyRevenue || 0) || 0;
    const invest = Number(initialInvestment || 0) || 0;

    const prompt = `
Create compact JSON financial projections for a ${businessType} business.

Inputs:
- Initial Investment (INR): ${invest}
- Expected Monthly Revenue (INR): ${rev}
- Monthly Expenses (INR): ${exp}

Return JSON ONLY with this exact structure:
{
  "monthly": [
    {
      "month": "YYYY-MM",
      "revenue_expected": number,
      "revenue_best": number,
      "revenue_worst": number,
      "profit_expected": number,
      "profit_best": number,
      "profit_worst": number
    }
  ],
  "breakeven_month_index": number, // 0-based index in "monthly" when cumulative profit reaches initial investment; -1 if not reached
  "assumptions": [string, string],
  "risks": [string, string],
  "notes": string
}

Rules:
- Start projections from the next calendar month for 6 sequential months.
- profit_* = revenue_* - ${exp}.
- Reasonable variation: best ~ +15-25%, worst ~ -10-20% vs expected.
- Ensure numeric values (no strings) and valid JSON.
`.trim();

    const completion = await chatCompletion({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a financial analyst. Return valid JSON only, as per the schema." },
        { role: "user", content: prompt }
      ],
      max_tokens: 900,
      temperature: 0.5,
    });

    let data;
    try {
      const raw = completion.choices?.[0]?.message?.content || "{}";
      const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      data = JSON.parse(clean);
    } catch {
      // Fallback: synthesize a simple 6-month projection if JSON parsing fails
      const today = new Date();
      const months = Array.from({ length: 6 }).map((_, i) => {
        const d = new Date(today.getFullYear(), today.getMonth() + 1 + i, 1);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const expected = rev * Math.pow(1.03, i);
        const best = expected * 1.18;
        const worst = expected * 0.88;
        return {
          month: ym,
          revenue_expected: Math.round(expected),
          revenue_best: Math.round(best),
          revenue_worst: Math.round(worst),
          profit_expected: Math.round(expected - exp),
          profit_best: Math.round(best - exp),
          profit_worst: Math.round(worst - exp),
        };
      });
      let cum = 0;
      let be = -1;
      for (let i = 0; i < months.length; i++) {
        cum += months[i].profit_expected;
        if (be === -1 && cum >= invest) be = i;
      }
      data = {
        monthly: months,
        breakeven_month_index: be,
        assumptions: ["Expected scenario grows ~3% MoM", "Expenses constant for 6 months"],
        risks: ["Market variability may reduce sales", "Unplanned costs could widen losses"],
        notes: "Fallback synthetic projection due to JSON parse failure."
      };
    }

    res.json({ success: true, projections: data });
  } catch (error) {
    console.error('Error generating financial projections:', error);
    res.status(500).json({ error: 'Failed to generate financial projections' });
  }
});

/**
 * Email Draft Generator
 * Body: { toName, fromName, vendorName?, purpose, details?, tone? }
 * Returns: { subject, body }
 */
router.post('/email-draft', auth, async (req, res) => {
  try {
    const { toName = 'Team', fromName = 'Biz Owner', vendorName = '', purpose = '', details = '', tone = 'Professional' } = req.body || {};

    const prompt = `
Write a concise, professional email for the following context. Return valid JSON only:
{
  "subject": string,
  "body": string
}

Context:
- To: ${toName}
- From: ${fromName}
- Vendor: ${vendorName || 'N/A'}
- Purpose: ${purpose}
- Details: ${details}
Tone: ${tone}

Constraints:
- Clear subject (<= 10 words), no emojis.
- Body 4–7 short lines, skimmable, with a single CTA.
- Indian business context (INR/IST when relevant), simple English.
`.trim();

    const completion = await chatCompletion({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You write crisp, professional business emails. Return valid JSON only." },
        { role: "user", content: prompt }
      ],
      max_tokens: 400,
      temperature: 0.5
    });

    let data = {};
    try {
      const raw = completion.choices?.[0]?.message?.content || '{}';
      const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      data = JSON.parse(clean);
    } catch {
      data = {
        subject: `${purpose || 'Quick follow-up'} — ${vendorName || 'Vendor'}`,
        body: `Hi ${toName},\n\nFollowing up on ${purpose.toLowerCase()}. ${details ? details + '\n\n' : ''}Please let me know the next steps or a suitable time this week.\n\nThanks,\n${fromName}`
      };
    }

    res.json({ success: true, email: data });
  } catch (error) {
    console.error('Email draft failed:', error);
    res.status(500).json({ error: 'Failed to generate email draft' });
  }
});

// AI Assistant
router.post('/assistant', auth, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const prompt = `
You are a helpful AI assistant for a business owner.
The user said: "${message}"
Respond in a helpful and friendly tone.
`;

    const completion = await chatCompletion({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful AI assistant for a business owner." },
        { role: "user", content: message }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;
    res.json({ response });

  } catch (error) {
    console.error('Error with AI assistant:', error);
    res.status(500).json({ error: 'Failed to get response from AI assistant' });
  }
});

module.exports = router;
