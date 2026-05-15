const express = require('express');
const https = require('https');
const router = express.Router();
const { saveNotionToken } = require('../db/sqlite');

router.get('/auth/notion', (req, res) => {
  const { goalId } = req.query;
  if (!goalId) return res.status(400).json({ error: 'goalId required' });

  const params = new URLSearchParams({
    client_id: process.env.NOTION_CLIENT_ID,
    response_type: 'code',
    owner: 'user',
    redirect_uri: process.env.NOTION_REDIRECT_URI,
    state: goalId,
  });

  res.redirect(`https://api.notion.com/v1/oauth/authorize?${params}`);
});

router.get('/auth/notion/callback', async (req, res) => {
  const { code, state: goalId, error } = req.query;

  if (error) return res.status(400).json({ error });
  if (!code || !goalId) return res.status(400).json({ error: 'Missing code or state' });

  const credentials = Buffer.from(
    `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
  ).toString('base64');

  const payload = JSON.stringify({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.NOTION_REDIRECT_URI,
  });

  const tokenData = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.notion.com',
      path: '/v1/oauth/token',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Notion-Version': process.env.NOTION_VERSION || '2022-06-28',
      },
    }, (r) => {
      let data = '';
      r.on('data', c => data += c);
      r.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

  if (tokenData.error) return res.status(400).json({ error: tokenData.error });

  await saveNotionToken(goalId, tokenData);

  res.json({ success: true, workspace: tokenData.workspace_name, goalId });
});

module.exports = router;
