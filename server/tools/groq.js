// ============================================
// Groq API Wrapper
// ============================================
// Purpose: Interface with Groq API for LLM calls

const https = require('https');

/**
 * Call Groq API with a prompt
 * @param {string} prompt - The prompt to send
 * @param {Object} options - Configuration options
 * @returns {Promise<string>} - API response
 */
async function callGroq(prompt, options = {}) {
  const {
    model = process.env.GROQ_MODEL || 'mixtral-8x7b-32768',
    maxTokens = 2048,
    temperature = 0.7,
    topP = 1,
    systemPrompt = 'You are a helpful AI assistant.',
  } = options;

  const apiKey = options.apiKey || process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY not set');
  }

  console.log(`[GROQ] Calling model: ${model}`);
  console.log(`[GROQ] Prompt length: ${prompt.length} chars`);

  const payload = {
    model,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: maxTokens,
    temperature,
    top_p: topP,
  };

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(payload)),
      },
      timeout: 60000, // 60 second timeout
    };

    console.log('[GROQ] Making API request...');

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode === 200 || res.statusCode === 201) {
            const response = JSON.parse(data);

            if (response.choices && response.choices[0] && response.choices[0].message) {
              const content = response.choices[0].message.content;
              console.log(`[GROQ] Response received: ${content.length} chars`);
              resolve(content);
            } else {
              reject(new Error('Invalid response format from Groq'));
            }
          } else {
            console.error(`[GROQ ERROR] Status ${res.statusCode}:`, data);
            reject(new Error(`Groq API error: ${res.statusCode} ${data}`));
          }
        } catch (error) {
          console.error('[GROQ ERROR] Parse error:', error.message);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('[GROQ ERROR]', error.message);
      reject(error);
    });

    req.on('timeout', () => {
      req.abort();
      reject(new Error('Groq API request timeout'));
    });

    req.write(JSON.stringify(payload));
    req.end();
  });
}

/**
 * Parse JSON from Groq response
 * Handles cases where JSON is wrapped in markdown code blocks
 * @param {string} response - Raw response from Groq
 * @returns {Object} - Parsed JSON object
 */
function parseJsonResponse(response) {
  try {
    return JSON.parse(response);
  } catch (e) {
    const jsonMatch = response.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[1]); } catch (_) {}
    }
    const objMatch = response.match(/({[\s\S]*})/);
    if (objMatch) {
      try { return JSON.parse(objMatch[1]); } catch (_) {}
    }
    const arrMatch = response.match(/(\[[\s\S]*\])/);
    if (arrMatch) {
      try { return JSON.parse(arrMatch[1]); } catch (_) {}
    }
    throw new Error('No valid JSON found in response');
  }
}

/**
 * Call Groq and expect JSON response
 * @param {string} prompt - The prompt (should request JSON format)
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - Parsed JSON response
 */
async function callGroqJson(prompt, options = {}) {
  const maxRetries = 5;
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log('[GROQ] Calling with JSON response format');
      const response = await callGroq(prompt, {
        ...options,
        systemPrompt: (options.systemPrompt || 'You are a helpful AI assistant.') +
                     '\n\nAlways respond with valid JSON only. No markdown, no extra text.',
      });
      return parseJsonResponse(response);
    } catch (error) {
      lastError = error;
      const is429 = error.message.includes('429');
      if (is429 && i < maxRetries - 1) {
        const match = error.message.match(/(\d+(\.\d+)?)s/);
        const waitMs = match ? Math.ceil(parseFloat(match[1]) * 1000) + 500 : 5000;
        console.warn(`[GROQ] Rate limited. Waiting ${waitMs}ms before retry...`);
        await new Promise(r => setTimeout(r, waitMs));
      } else {
        console.error('[GROQ ERROR] JSON parsing failed:', error.message);
        throw error;
      }
    }
  }

  throw lastError;
}

/**
 * Call Groq with retry logic
 * @param {string} prompt - The prompt
 * @param {Object} options - Configuration options
 * @param {number} retries - Number of retries (default 3)
 * @returns {Promise<string>} - API response
 */
async function callGroqWithRetry(prompt, options = {}, retries = 3) {
  let lastError;

  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[GROQ] Attempt ${i + 1}/${retries}`);
      return await callGroq(prompt, options);
    } catch (error) {
      lastError = error;
      console.warn(`[GROQ] Attempt ${i + 1} failed:`, error.message);

      // Wait before retry (exponential backoff)
      if (i < retries - 1) {
        const delay = Math.min(1000 * Math.pow(2, i), 10000);
        console.log(`[GROQ] Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Failed after all retries');
}

/**
 * Generate a summary from content
 * Useful for various agents
 * @param {string} content - Content to summarize
 * @param {string} purpose - Purpose of summary
 * @returns {Promise<string>} - Summary
 */
async function generateSummary(content, purpose = 'general summary') {
  const prompt = `Please provide a concise ${purpose} of the following content in 2-3 paragraphs:

${content}`;

  return callGroq(prompt, {
    maxTokens: 1024,
    temperature: 0.5,
  });
}

/**
 * Extract key information from content
 * @param {string} content - Content to extract from
 * @param {string} topic - What to extract
 * @returns {Promise<Object>} - Extracted information as JSON
 */
async function extractInformation(content, topic) {
  const prompt = `Extract key information about "${topic}" from the following content and return as JSON with relevant keys:

${content}

Respond with ONLY valid JSON, no markdown or extra text.`;

  return callGroqJson(prompt, {
    maxTokens: 2048,
    temperature: 0.3,
  });
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  callGroq,
  callGroqJson,
  callGroqWithRetry,
  parseJsonResponse,
  generateSummary,
  extractInformation,
};