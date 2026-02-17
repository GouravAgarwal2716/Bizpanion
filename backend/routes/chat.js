const express = require('express');
const auth = require('../middlewares/auth');
const { Chat, Memory, User } = require('../models');
const { chatCompletion } = require('../openaiClient');
const axios = require('axios');
const router = express.Router();

// RAG service endpoint
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:5001';
const STRICT_RAG_MODE = String(process.env.STRICT_RAG_MODE || 'false').toLowerCase() === 'true';

// POST /chat
router.post('/', auth, async (req, res) => {
  const user_id = req.user.id;
  const { message, business, tone } = req.body; // Pass business context + optional assistant tone/persona
  const userProfile = await User.findByPk(user_id).catch(() => null);
  const userLocale = (userProfile && userProfile.locale) ? userProfile.locale : null;

  try {
    // 1. Get live analytics data for the business
    let analyticsContext = 'Analytics data is not available.';
    try {
      const analyticsRes = await axios.get(`http://localhost:${process.env.PORT || 5000}/analytics/summary`, { headers: { Authorization: req.headers.authorization } });
      const data = analyticsRes.data;
      analyticsContext = `

Live Business Analytics (Last 30 Days):
- Revenue: ${data.revenueMonth.toFixed(2)} INR
- Profit: ${data.profitMonth.toFixed(2)} INR
- AOV: ${data.aov.toFixed(2)} INR
- New Customers: ${data.newCustomers}`;
    } catch (e) {
      console.log('Could not fetch live analytics for chat context.');
    }

    const shortTermChats = await Chat.findAll({
      where: { user_id },
      order: [['createdAt', 'DESC']],
      limit: 8,
    });
    const shortTermMessages = shortTermChats
      .reverse()
      .map(c => JSON.parse(c.messages)).flat();
    // Fetch latest 3 long-term memories (summaries)
    const longTermMemories = await Memory.findAll({
      where: { user_id, type: 'long-term' },
      order: [['createdAt', 'DESC']],
      limit: 3,
    });

    let documentContext = '';
    let citations = [];
    let ragResults = [];
    try {
      const ragResponse = await axios.post(`${RAG_SERVICE_URL}/search`, {
        query: message,
        limit: 3
      });

      if (ragResponse.data && ragResponse.data.results.length > 0) {
        ragResults = ragResponse.data.results;
        documentContext = '\n\nRelevant document content:\n' +
          ragResults.map(doc =>
            `From document ${doc.doc_id}:\n${doc.chunks.map(chunk => chunk.content).join('\n\n')}`
          ).join('\n\n---\n\n');

        // Build compact citations from top chunks per document
        citations = ragResults.flatMap(doc =>
          doc.chunks.slice(0, 1).map(chunk => ({
            doc_id: doc.doc_id,
            chunk_index: chunk.chunk_index
          }))
        );
      }
    } catch (error) {
      console.log('RAG search failed (service may not be running):', error.message);
      // Continue without document context if RAG service is unavailable
    }

    const systemPrompt = `
You are Bizpanion, an AI business assistant. Your goal is to be a proactive, agentic partner for the user.
You can delegate tasks to specialized bots by prefixing your response.

CONTEXT:
- Business Context (Summaries): ${longTermMemories.map(m => m.content).join('\n')}
- Recent Conversation: ${shortTermMessages.map(m => `${m.role}: ${m.content || m.text}`).join('\n')}
- Relevant Documents: ${documentContext || 'No documents found for this query.'}
${analyticsContext}

ASSISTANT STYLE:
- Voice/Personality Tone: ${tone || 'Neutral professional'}
- Keep responses concise, practical, and action-oriented.
- If relevant, propose next-step actions.
- IMPORTANT: Detect the language of the user's message and respond in the EXACT SAME LANGUAGE. (e.g., if Hindi, reply in Hindi).
RESPONSE FORMAT:
You MUST respond with a JSON object. The object must have a "speakable_response" key containing the text to display to the user. If the query is best handled by a specialized bot, prefix the speakable_response with the bot's name (e.g., "[FinanceBot] Your CPC is...").
If you use the Live Business Analytics data, mention it. For example: "Based on your live analytics, your revenue was...".
`;

    // Call OpenAI GPT-4.1/4o
    const completion = await chatCompletion({
      model: "gpt-4o", // use "gpt-4.1" if available/preferred
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const rawResponse = completion.choices[0].message.content;
    let aiResponse, action = null;
    try {
      const parsed = JSON.parse(rawResponse);
      aiResponse = parsed.speakable_response;
      action = parsed.action || null;
    } catch (e) {
      aiResponse = rawResponse; // Fallback to raw text if JSON parsing fails
    }

    // Store the new chat
    await Chat.create({
      user_id,
      messages: JSON.stringify([
        { role: "user", content: message },
        { role: "assistant", content: aiResponse, action: action }
      ])
    });

    // Store this message as short-term in the Memory table (optional, depending on your schema)
    await Memory.create({
      user_id,
      type: "short-term",
      content: message
    });

    // After every 10 chats for this user, summarize last 10 for long-term memory
    const chatHistoryCount = await Chat.count({ where: { user_id } });
    if (chatHistoryCount % 10 === 0 && chatHistoryCount > 0) {
      const lastChats = await Chat.findAll({
        where: { user_id },
        order: [['createdAt', 'DESC']],
        limit: 10,
      });
      const lastMessages = lastChats.reverse().map(c => JSON.parse(c.messages)).flat();
      const summaryPrompt = `
  Summarize the following 10-turn chat for long-term memory for future business context:
  ${lastMessages.map(m => `${m.role}: ${m.content || m.text}`).join('\n')}
  Give top 3 key insights, facts, or actions that Bizpanion should remember for this business.
    `;
      const summaryRes = await chatCompletion({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You will create business context memory." },
          { role: "user", content: summaryPrompt }
        ],
        max_tokens: 250,
        temperature: 0.5,
      });
      const summary = summaryRes.choices[0].message.content;
      await Memory.create({
        user_id,
        type: "long-term",
        content: summary
      });
    }

    res.json({ response: aiResponse, citations, action });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI chat failed' });
  }
});

module.exports = router;
