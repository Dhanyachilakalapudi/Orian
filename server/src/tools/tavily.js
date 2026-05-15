const { tavily } = require('@tavily/core');
const { withBackoff } = require('./llm');

async function searchWeb(query, options = {}) {
  if (!process.env.TAVILY_API_KEY) {
    throw new Error('TAVILY_API_KEY is required');
  }

  const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
  return withBackoff(async () => client.search(query, {
    maxResults: options.maxResults || 5,
    includeAnswer: true,
    includeImages: false,
    searchDepth: options.searchDepth || 'advanced',
  }), { retries: 3, baseDelayMs: 1000 });
}

module.exports = { searchWeb };
