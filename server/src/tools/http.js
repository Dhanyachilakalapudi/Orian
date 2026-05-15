const http = require('http');
const https = require('https');

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = options.body === undefined ? null : JSON.stringify(options.body);
    const transport = parsed.protocol === 'https:' ? https : http;

    const req = transport.request({
      method: options.method || 'GET',
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: `${parsed.pathname}${parsed.search}`,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}),
        ...(options.headers || {}),
      },
      timeout: options.timeoutMs || 15000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsedBody = data;
        try {
          parsedBody = data ? JSON.parse(data) : null;
        } catch (_) {
          parsedBody = data;
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, body: parsedBody });
        } else {
          const message = typeof parsedBody === 'string' ? parsedBody : JSON.stringify(parsedBody);
          reject(new Error(`HTTP ${res.statusCode}: ${message}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error(`HTTP request timed out: ${url}`)));
    if (body) req.write(body);
    req.end();
  });
}

module.exports = { requestJson };
