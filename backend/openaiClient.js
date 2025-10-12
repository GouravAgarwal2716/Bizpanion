
const { OpenAI } = require('openai');
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

function createOpenAIClient(apiKey) {
  const client = new OpenAI({ apiKey });
  async function withRetries(fn, args = {}, retries = 4) {
    let attempt = 0;
    let delay = 500;
    while (attempt <= retries) {
      try {
        return await fn(args);
      } catch (err) {
        const status = err?.status || (err?.response?.status);
        // Retry on 429 or 5xx
        if ((status === 429 || (status >= 500 && status < 600)) && attempt < retries) {
          console.warn(`OpenAI call failed (status=${status}). Retrying in ${delay}ms...`);
          await sleep(delay);
          attempt++;
          delay *= 2;
          continue;
        }
        throw err;
      }
    }
  }

  return {
    client,
    async chatCompletion(payload) {
      return withRetries(() => client.chat.completions.create(payload));
    },
    async embeddingsCreate(payload) {
      return withRetries(() => client.embeddings.create(payload));
    },
    async responsesCreate(payload) {
      return withRetries(() => client.responses.create(payload));
    }
  };
}

const hasKey = !!process.env.OPENAI_API_KEY;

// Avoid crashing app at startup if OPENAI_API_KEY is missing on the host.
// When missing, export stub methods that throw a clear runtime error instead.
const defaultClient = hasKey
  ? createOpenAIClient(process.env.OPENAI_API_KEY)
  : {
      client: null,
      async chatCompletion() {
        throw new Error('OPENAI_API_KEY not configured on the server. Set it in Render → Backend → Environment.');
      },
      async embeddingsCreate() {
        throw new Error('OPENAI_API_KEY not configured on the server. Set it in Render → Backend → Environment.');
      },
      async responsesCreate() {
        throw new Error('OPENAI_API_KEY not configured on the server. Set it in Render → Backend → Environment.');
      }
    };

module.exports = { createOpenAIClient, hasKey, ...defaultClient };
