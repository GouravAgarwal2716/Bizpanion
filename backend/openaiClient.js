
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Sleep utility for retries/delays
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

/*
 * CLIENT FACTORY
 * Determine which provider to use based on available API keys.
 * Priority: OpenAI > Gemini > Mock (Demo Mode)
 */
function createAIClient() {
  const openAIKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (openAIKey) {
    console.log("Using OpenAI Client.");
    return createOpenAIWrapper(openAIKey);
  } else if (geminiKey) {
    console.log("Using Google Gemini Client.");
    return createGeminiWrapper(geminiKey);
  } else {
    console.warn("No API Keys found. Using Smart Demo Mode (Mock).");
    return createMockWrapper();
  }
}

// ------------------------------------------------------------------
// 1. OpenAI Wrapper
// ------------------------------------------------------------------
function createOpenAIWrapper(apiKey) {
  const client = new OpenAI({ apiKey });

  async function withRetries(fn, retries = 3) {
    let attempt = 0;
    while (attempt <= retries) {
      try {
        return await fn();
      } catch (err) {
        const status = err?.status || err?.response?.status;
        if ((status === 429 || status >= 500) && attempt < retries) {
          console.warn(`OpenAI retry ${attempt + 1}/${retries}...`);
          await sleep(1000 * Math.pow(2, attempt));
          attempt++;
          continue;
        }
        throw err;
      }
    }
  }

  return {
    provider: 'openai',
    async chatCompletion({ model, messages, temperature, max_tokens, response_format }) {
      return withRetries(() => client.chat.completions.create({
        model: model || 'gpt-4o',
        messages,
        temperature,
        max_tokens,
        response_format
      }));
    },
    async embeddingsCreate({ model, input }) {
      return withRetries(() => client.embeddings.create({
        model: model || 'text-embedding-3-small',
        input
      }));
    }
  };
}

// ------------------------------------------------------------------
// 2. Google Gemini Wrapper
// ------------------------------------------------------------------
function createGeminiWrapper(apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  // Use 'gemini-flash-latest' which is confirmed working for this key
  const modelWeb = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
  const modelEmbed = genAI.getGenerativeModel({ model: "text-embedding-004" });

  return {
    provider: 'gemini',
    async chatCompletion({ messages, temperature, max_tokens }) {
      // Convert OpenAI-style messages to Gemini history
      // System prompt is usually handled by `systemInstruction` in beta, but here we prepending.
      let systemInstruction = "";
      const history = [];
      let lastUserMsg = "";

      for (const m of messages) {
        if (m.role === 'system') {
          systemInstruction += m.content + "\n";
        } else if (m.role === 'user') {
          lastUserMsg = m.content;
          history.push({ role: 'user', parts: [{ text: m.content }] });
        } else if (m.role === 'assistant') {
          history.push({ role: 'model', parts: [{ text: m.content }] });
        }
      }

      // Hack for "system" prompt in standard API: Prepend to last user message or use properly if supported
      // For simplicity, we just prepend system instructions to the last prompt if history is empty, 
      // or send it as part of the GenerateContentRequest structure if using the beta client.
      // We'll stick to a simple prompt construction for maximum compatibility.

      const fullPrompt = `${systemInstruction}\n\nUser: ${lastUserMsg}`;

      const result = await modelWeb.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: {
          maxOutputTokens: max_tokens,
          temperature: temperature || 0.7,
        },
      });

      const response = result.response;
      const text = response.text();

      // Return structure mimicking OpenAI response
      return {
        choices: [{
          message: {
            content: text,
            role: 'assistant'
          }
        }]
      };
    },

    async embeddingsCreate({ input }) {
      // Input can be string or array of strings. Gemini expects slightly different format.
      // We'll assume single string for simplicity or map array.
      const texts = Array.isArray(input) ? input : [input];

      // For now, handle single embedding to match interface expected by most calls
      // Or map if multiple.
      const result = await modelEmbed.embedContent(texts[0]);
      const embedding = result.embedding;

      return {
        data: [{ embedding: embedding.values }]
      };
    }
  };
}

// ------------------------------------------------------------------
// 3. Mock Wrapper (Smart Demo Mode)
// ------------------------------------------------------------------
function createMockWrapper() {
  return {
    provider: 'mock',
    async chatCompletion({ messages }) {
      // 1. Analyze context to determine what kind of mock response to send
      const allText = messages.map(m => m.content).join('\n').toLowerCase();
      const isMarketing = allText.includes('marketing') || allText.includes('ad copy') || allText.includes('post');
      const isIdeas = allText.includes('business ideas') || allText.includes('startup ideas');
      const isPlan = allText.includes('business plan');
      const isChat = allText.includes('speakable_response') || allText.includes('bizpanion'); // System prompt has these keywords

      let replyContent = "";

      if (isMarketing) {
        // Return plain text for Marketing
        replyContent = "🚀 Elevate your style with Priya's Apparel! \n\nHandcrafted with love, sustainable by choice. Discover our new collection of ethnic wear that blends tradition with modern comfort. \n\nShop now: [Link]\n#EthicalFashion #Handmade #PriyasApparel";
      } else if (isIdeas) {
        // Return JSON for Business Ideas
        replyContent = JSON.stringify({
          ideas: [
            {
              name: "EcoStyle Rentals",
              tagline: "Fashion that doesn't cost the earth",
              description: "A premium clothing rental service focusing on sustainable and ethnic wear for special occasions.",
              investment: "₹2,00,000 - ₹5,00,000",
              potential: "High",
              target: "Young professionals attending weddings and events",
              insights: ["Growing rental market", "Sustainability trend", "High margins"],
              trend: "Sustainable Fashion"
            }
          ]
        });
      } else {
        // Default to Chat JSON format (since Chat is the primary complex user)
        const lastMsg = messages[messages.length - 1].content.toLowerCase();
        let speakable = "I am in Demo Mode. I can simulate answers about Revenue, Profit, or Growth.";
        let action = null;

        if (lastMsg.includes('revenue') || lastMsg.includes('sales')) {
          speakable = "Based on your live analytics, your revenue for the last 30 days is ₹1,82,450. This is a 12.5% increase from last month. Great job!";
        } else if (lastMsg.includes('profit')) {
          speakable = "Your net profit is ₹45,300, which is a healthy margin. However, it dipped slightly (-2.1%) due to increased marketing spend.";
        } else if (lastMsg.includes('growth') || lastMsg.includes('plan')) {
          speakable = "I've analyzed your data. Your best growth opportunity is to optimize your Instagram Ads, as CAC has risen.";
          action = "open_growth_hub";
        } else if (lastMsg.includes('website')) {
          speakable = "I can help you build your website. Go to the Website Builder tab to start generating a landing page.";
          action = "navigate_website_builder";
        } else if (lastMsg.includes('hi') || lastMsg.includes('hello')) {
          speakable = "Hello! I am Bizpanion (Demo Mode). Ask me about your business performance!";
        }

        replyContent = JSON.stringify({
          speakable_response: speakable,
          action: action
        });
      }

      return {
        choices: [{
          message: {
            content: replyContent,
            role: 'assistant'
          }
        }]
      };
    },
    async embeddingsCreate() {
      // Return random 768-dim vector
      return {
        data: [{ embedding: Array(768).fill(0).map(() => Math.random()) }]
      };
    }
  };
}

// Export a singleton instance
const aiClient = createAIClient();

module.exports = {
  chatCompletion: aiClient.chatCompletion,
  embeddingsCreate: aiClient.embeddingsCreate,
  provider: aiClient.provider
};
