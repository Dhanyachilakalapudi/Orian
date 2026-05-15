const Groq = require('groq-sdk');

let groq = null;

function getGroqClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is required');
  }

  if (!groq) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  return groq;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractRetryDelayMs(error, fallbackMs) {
  const message = error?.message || '';
  const match = message.match(/try again in\s+(\d+(?:\.\d+)?)s/i) || message.match(/(\d+(?:\.\d+)?)s/);
  return match ? Math.ceil(Number(match[1]) * 1000) + 500 : fallbackMs;
}

async function withBackoff(fn, options = {}) {
  const retries = options.retries ?? 4;
  const baseDelayMs = options.baseDelayMs ?? 1000;
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      const retryable = /429|rate limit|timeout|ECONNRESET|ETIMEDOUT/i.test(error?.message || '');
      if (!retryable || attempt === retries) break;

      const exponentialDelay = Math.min(baseDelayMs * (2 ** attempt), 15000);
      await sleep(extractRetryDelayMs(error, exponentialDelay));
    }
  }

  throw lastError;
}

function parseJson(content) {
  try {
    return JSON.parse(content);
  } catch (_) {
    const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) return JSON.parse(fenced[1]);

    const objectMatch = content.match(/({[\s\S]*})/);
    if (objectMatch) return JSON.parse(objectMatch[1]);

    const arrayMatch = content.match(/(\[[\s\S]*\])/);
    if (arrayMatch) return JSON.parse(arrayMatch[1]);

    throw new Error('LLM response did not contain valid JSON');
  }
}

async function callGroq(messages, options = {}) {
  return withBackoff(async () => {
    const response = await getGroqClient().chat.completions.create({
      model: options.model || process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      messages,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens ?? 1200,
      response_format: options.json ? { type: 'json_object' } : undefined,
    });

    return response.choices?.[0]?.message?.content || '';
  }, options.retry);
}

async function callGroqJson(messages, options = {}) {
  const content = await callGroq(messages, { ...options, json: true });
  return parseJson(content);
}

module.exports = {
  callGroq,
  callGroqJson,
  withBackoff,
};
