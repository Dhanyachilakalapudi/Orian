const https = require('https');
const { getIntegration } = require('../db/integrations');
const { addTaskLog } = require('../db/sqlite');

function httpsPost(hostname, path, headers, payload) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path, method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(payload) }, timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(payload);
    req.end();
  });
}

function httpsGet(hostname, path, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path, method: 'GET', headers, timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.end();
  });
}

function httpsPut(hostname, path, headers, payload) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path, method: 'PUT', headers: { ...headers, 'Content-Length': Buffer.byteLength(payload) }, timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(payload);
    req.end();
  });
}

function markdownToNotionBlocks(markdown) {
  const blocks = [];
  for (const line of markdown.split('\n')) {
    const h1 = line.match(/^# (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h3 = line.match(/^### (.+)/);
    const bullet = line.match(/^[*-] (.+)/);
    const numbered = line.match(/^\d+\. (.+)/);

    if (h1) { blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ text: { content: h1[1] } }] } }); continue; }
    if (h2) { blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: h2[1] } }] } }); continue; }
    if (h3) { blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [{ text: { content: h3[1] } }] } }); continue; }
    if (bullet) { blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: parseInlineNotion(bullet[1]) } }); continue; }
    if (numbered) { blocks.push({ object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: parseInlineNotion(numbered[1]) } }); continue; }
    if (!line.trim()) { blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [] } }); continue; }
    blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: parseInlineNotion(line) } });
  }
  return blocks;
}

function parseInlineNotion(text) {
  const parts = [];
  const re = /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_/g;
  let last = 0, match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push({ text: { content: text.slice(last, match.index) } });
    if (match[1]) parts.push({ text: { content: match[1] }, annotations: { bold: true, italic: true } });
    else if (match[2]) parts.push({ text: { content: match[2] }, annotations: { bold: true } });
    else parts.push({ text: { content: match[3] || match[4] }, annotations: { italic: true } });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: { content: text.slice(last) } });
  return parts;
}

async function deliverViaNotion(workflowId, report, goal) {
  const integration = await getIntegration(workflowId, 'notion');
  if (!integration) return { skipped: true, reason: 'no notion integration' };
  const allBlocks = markdownToNotionBlocks(report);
  const children = allBlocks.slice(0, 100);
  const payload = JSON.stringify({
    parent: { type: 'workspace', workspace: true },
    properties: { title: [{ text: { content: goal.substring(0, 100) } }] },
    children,
  });
  const res = await httpsPost('api.notion.com', '/v1/pages', { 'Authorization': `Bearer ${integration.accessToken}`, 'Content-Type': 'application/json', 'Notion-Version': '2022-06-28' }, payload);
  const page = JSON.parse(res.data);
  if (allBlocks.length > 100 && page.id) {
    for (let i = 100; i < allBlocks.length; i += 100) {
      const chunk = JSON.stringify({ children: allBlocks.slice(i, i + 100) });
      await httpsPost('api.notion.com', `/v1/blocks/${page.id}/children`, { 'Authorization': `Bearer ${integration.accessToken}`, 'Content-Type': 'application/json', 'Notion-Version': '2022-06-28' }, chunk);
    }
  }
  return { delivered: true, status: res.status };
}

async function deliverViaSlack(workflowId, report, goal) {
  const integration = await getIntegration(workflowId, 'slack');
  if (!integration) return { skipped: true, reason: 'no slack integration' };
  const meta = JSON.parse(integration.metadata || '{}');

  const truncated = report.length > 2900 ? report.substring(0, 2900) + '...' : report;
  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: goal.substring(0, 150), emoji: true } },
    { type: 'divider' },
    ...truncated.split('\n').filter(l => l.trim()).slice(0, 40).map(line => {
      const h1 = line.match(/^# (.+)/);
      const h2 = line.match(/^## (.+)/);
      const h3 = line.match(/^### (.+)/);
      const bullet = line.match(/^[*-] (.+)/);
      if (h1) return { type: 'section', text: { type: 'mrkdwn', text: `*${h1[1]}*` } };
      if (h2) return { type: 'section', text: { type: 'mrkdwn', text: `*${h2[1]}*` } };
      if (h3) return { type: 'section', text: { type: 'mrkdwn', text: `_${h3[1]}_` } };
      if (bullet) return { type: 'section', text: { type: 'mrkdwn', text: `• ${bullet[1]}` } };
      return { type: 'section', text: { type: 'mrkdwn', text: line.replace(/\*\*(.+?)\*\*/g, '*$1*') } };
    }),
    { type: 'divider' },
    { type: 'context', elements: [{ type: 'mrkdwn', text: `delivered by *orian* · ${new Date().toUTCString()}` }] },
  ];

  if (meta.webhookUrl) {
    const url = new URL(meta.webhookUrl);
    const payload = JSON.stringify({ text: goal.substring(0, 150), blocks });
    const res = await httpsPost(url.hostname, url.pathname, { 'Content-Type': 'application/json' }, payload);
    return { delivered: true, method: 'webhook', status: res.status };
  }

  if (integration.accessToken && meta.channelId) {
    const payload = JSON.stringify({ channel: meta.channelId, text: goal.substring(0, 150), blocks });
    const res = await httpsPost('slack.com', '/api/chat.postMessage', { 'Authorization': `Bearer ${integration.accessToken}`, 'Content-Type': 'application/json' }, payload);
    const data = JSON.parse(res.data);
    if (!data.ok) return { skipped: true, reason: `slack api error: ${data.error}` };
    return { delivered: true, method: 'api', channel: data.channel, ts: data.ts };
  }

  return { skipped: true, reason: 'no slack webhook url and no channelId configured' };
}

function markdownToDocRequests(markdown) {
  const lines = markdown.split('\n');
  const groups = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isLast = i === lines.length - 1;
    const suffix = isLast ? '' : '\n';

    const h1 = line.match(/^# (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h3 = line.match(/^### (.+)/);
    const h4 = line.match(/^#### (.+)/);
    const bullet = line.match(/^[*-] (.+)/);
    const numbered = line.match(/^\d+\. (.+)/);

    if (h1 || h2 || h3 || h4) {
      const content = (h1 || h2 || h3 || h4)[1] + '\n';
      const style = h1 ? 'HEADING_1' : h2 ? 'HEADING_2' : h3 ? 'HEADING_3' : 'HEADING_4';
      groups.push({ text: content, style, len: content.length });
      continue;
    }

    if (bullet || numbered) {
      const content = (bullet || numbered)[1] + '\n';
      groups.push({ text: content, bullet: !!bullet, numbered: !!numbered, len: content.length });
      continue;
    }

    if (!line.trim()) {
      groups.push({ text: '\n', len: 1 });
      continue;
    }

    const re = /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_/g;
    let last = 0, match;
    const segs = [];
    const full = line + suffix;
    while ((match = re.exec(full)) !== null) {
      if (match.index > last) segs.push({ t: full.slice(last, match.index) });
      if (match[1]) segs.push({ t: match[1], bold: true, italic: true });
      else if (match[2]) segs.push({ t: match[2], bold: true });
      else segs.push({ t: match[3] || match[4], italic: true });
      last = match.index + match[0].length;
    }
    if (last < full.length) segs.push({ t: full.slice(last) });
    groups.push({ segs, len: full.length });
  }

  const requests = [];
  let index = 1;
  const styleRequests = [];

  for (const g of groups) {
    if (g.style) {
      requests.push({ insertText: { location: { index }, text: g.text } });
      styleRequests.push({ updateParagraphStyle: { range: { startIndex: index, endIndex: index + g.len }, paragraphStyle: { namedStyleType: g.style }, fields: 'namedStyleType' } });
      index += g.len;
    } else if (g.bullet || g.numbered) {
      requests.push({ insertText: { location: { index }, text: g.text } });
      styleRequests.push({ createParagraphBullets: { range: { startIndex: index, endIndex: index + g.len }, bulletPreset: g.bullet ? 'BULLET_DISC_CIRCLE_SQUARE' : 'NUMBERED_DECIMAL_ALPHA_ROMAN' } });
      index += g.len;
    } else if (g.segs) {
      for (const seg of g.segs) {
        requests.push({ insertText: { location: { index }, text: seg.t } });
        if (seg.bold || seg.italic) {
          styleRequests.push({ updateTextStyle: { range: { startIndex: index, endIndex: index + seg.t.length }, textStyle: { bold: !!seg.bold, italic: !!seg.italic }, fields: 'bold,italic' } });
        }
        index += seg.t.length;
      }
    } else {
      requests.push({ insertText: { location: { index }, text: g.text } });
      index += g.len;
    }
  }

  requests.reverse();
  return [...requests, ...styleRequests];
}

async function deliverViaGoogleDocs(workflowId, report, goal) {
  const integration = await getIntegration(workflowId, 'google');
  if (!integration) return { skipped: true, reason: 'no google integration' };
  const createPayload = JSON.stringify({ title: goal.substring(0, 100) });
  const createRes = await httpsPost('docs.googleapis.com', '/v1/documents', { 'Authorization': `Bearer ${integration.accessToken}`, 'Content-Type': 'application/json' }, createPayload);
  const doc = JSON.parse(createRes.data);
  if (!doc.documentId) return { skipped: true, reason: 'failed to create doc' };
  const requests = markdownToDocRequests(report);
  const updatePayload = JSON.stringify({ requests });
  await httpsPost('docs.googleapis.com', `/v1/documents/${doc.documentId}:batchUpdate`, { 'Authorization': `Bearer ${integration.accessToken}`, 'Content-Type': 'application/json' }, updatePayload);
  return { delivered: true, documentId: doc.documentId, url: `https://docs.google.com/document/d/${doc.documentId}` };
}

async function deliverViaGitHub(workflowId, report, goal) {
  const integration = await getIntegration(workflowId, 'github');
  if (!integration) return { skipped: true, reason: 'no github integration' };
  const meta = JSON.parse(integration.metadata || '{}');
  const headers = { 'Authorization': `Bearer ${integration.accessToken}`, 'Content-Type': 'application/json', 'User-Agent': 'orian-agent', 'Accept': 'application/vnd.github+json' };
  const results = {};

  const gistPayload = JSON.stringify({ description: goal.substring(0, 100), public: false, files: { 'report.md': { content: report } } });
  const gistRes = await httpsPost('api.github.com', '/gists', headers, gistPayload);
  const gist = JSON.parse(gistRes.data);
  results.gist = { url: gist.html_url };

  if (meta.repo && meta.owner) {
    const issuePayload = JSON.stringify({
      title: goal.substring(0, 100),
      body: report.substring(0, 65000),
      labels: meta.labels ? meta.labels.split(',').map(l => l.trim()) : ['orian-report'],
    });
    const issueRes = await httpsPost('api.github.com', `/repos/${meta.owner}/${meta.repo}/issues`, headers, issuePayload);
    const issue = JSON.parse(issueRes.data);
    results.issue = { url: issue.html_url, number: issue.number };

    if (meta.commitPath) {
      const branch = meta.branch || 'main';
      const filePath = meta.commitPath.replace(/^\//, '');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const finalPath = filePath.includes('{timestamp}') ? filePath.replace('{timestamp}', timestamp) : filePath;
      const fileContent = Buffer.from(report).toString('base64');
      const commitMessage = `orian: ${goal.substring(0, 72)}`;

      const existingRes = await httpsGet('api.github.com', `/repos/${meta.owner}/${meta.repo}/contents/${finalPath}?ref=${branch}`, headers);
      const existing = JSON.parse(existingRes.data);
      const sha = existing.sha || undefined;

      const putPayload = JSON.stringify({
        message: commitMessage,
        content: fileContent,
        branch,
        ...(sha ? { sha } : {}),
      });
      const commitRes = await httpsPut('api.github.com', `/repos/${meta.owner}/${meta.repo}/contents/${finalPath}`, headers, putPayload);
      const committed = JSON.parse(commitRes.data);
      results.commit = {
        url: committed.content?.html_url,
        sha: committed.commit?.sha,
        branch,
        path: finalPath,
      };
    }
  }

  return { delivered: true, ...results };
}

async function deliverViaLinear(workflowId, report, goal) {
  const integration = await getIntegration(workflowId, 'linear');
  if (!integration) return { skipped: true, reason: 'no linear integration' };
  const query = `mutation { issueCreate(input: { title: "${goal.substring(0, 100).replace(/"/g, '')}", description: "${report.substring(0, 1000).replace(/"/g, '').replace(/\n/g, '\\n')}" }) { success issue { id url } } }`;
  const payload = JSON.stringify({ query });
  const res = await httpsPost('api.linear.app', '/graphql', { 'Authorization': integration.accessToken, 'Content-Type': 'application/json' }, payload);
  const data = JSON.parse(res.data);
  return { delivered: true, issueUrl: data?.data?.issueCreate?.issue?.url };
}

async function deliverViaDiscord(workflowId, report, goal) {
  const integration = await getIntegration(workflowId, 'discord');
  const webhookUrl = integration ? JSON.parse(integration.metadata || '{}').webhookUrl : process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return { skipped: true, reason: 'no discord webhook' };
  const url = new URL(webhookUrl);
  const post = (body) => httpsPost(url.hostname, url.pathname + url.search, { 'Content-Type': 'application/json' }, JSON.stringify(body));

  const lines = report.split('\n').filter(l => l.trim());
  const fields = [];
  let section = null, sectionLines = [];
  for (const line of lines) {
    const h2 = line.match(/^## (.+)/); const h3 = line.match(/^### (.+)/);
    if (h2 || h3) {
      if (section && sectionLines.length) fields.push({ name: section, value: sectionLines.join('\n').substring(0, 1024), inline: false });
      section = (h2 || h3)[1]; sectionLines = [];
    } else {
      const b = line.match(/^[*-] (.+)/); const n = line.match(/^\d+\. (.+)/);
      sectionLines.push(b ? `• ${b[1]}` : n ? line : line.replace(/\*\*(.+?)\*\*/g, '**$1**'));
    }
  }
  if (section && sectionLines.length) fields.push({ name: section, value: sectionLines.join('\n').substring(0, 1024), inline: false });

  await post({ username: 'orian', embeds: [{ title: goal.substring(0, 256), color: 0x0a0a0a, fields: fields.slice(0, 25), footer: { text: 'delivered by orian' }, timestamp: new Date().toISOString() }] });

  const chunks = [];
  for (let i = 0; i < report.length; i += 1900) chunks.push(report.slice(i, i + 1900));
  for (const chunk of chunks.slice(0, 5)) {
    await post({ username: 'orian', content: '```\n' + chunk + '\n```' });
  }

  return { delivered: true };
}

async function deliverViaAirtable(workflowId, report, goal) {
  const integration = await getIntegration(workflowId, 'airtable');
  if (!integration) return { skipped: true, reason: 'no airtable integration' };
  const meta = JSON.parse(integration.metadata || '{}');
  const table = encodeURIComponent(meta.table || 'Reports');
  const fields = { Goal: goal.substring(0, 100), Report: report.substring(0, 100000), CreatedAt: new Date().toISOString() };
  if (meta.extraFields) {
    try { Object.assign(fields, JSON.parse(meta.extraFields)); } catch (_) {}
  }
  const payload = JSON.stringify({ records: [{ fields }] });
  const res = await httpsPost('api.airtable.com', `/v0/${meta.baseId}/${table}`, { 'Authorization': `Bearer ${integration.accessToken}`, 'Content-Type': 'application/json' }, payload);
  const data = JSON.parse(res.data);
  return { delivered: true, recordId: data.records?.[0]?.id, status: res.status };
}

async function deliverViaWebhook(workflowId, report, goal) {
  const integration = await getIntegration(workflowId, 'webhook');
  const meta = integration ? JSON.parse(integration.metadata || '{}') : {};
  const webhookUrl = meta.webhookUrl || process.env.DELIVERY_WEBHOOK_URL;
  if (!webhookUrl) return { skipped: true, reason: 'no webhook url' };
  const url = new URL(webhookUrl);
  const customHeaders = meta.headers ? JSON.parse(meta.headers) : {};
  const payload = JSON.stringify({ workflowId, goal, report, timestamp: new Date().toISOString(), source: 'orian-agent' });
  const res = await httpsPost(url.hostname, url.pathname + url.search, { 'Content-Type': 'application/json', ...customHeaders }, payload);
  return { delivered: true, status: res.status };
}

async function runDeliveryAgent(workflowId, report, goal, userId) {
  console.log(`[DELIVERY] Starting delivery for workflow ${workflowId}`);
  const results = {};
  const lookupId = userId || workflowId;
  const deliverers = { notion: deliverViaNotion, slack: deliverViaSlack, google: deliverViaGoogleDocs, github: deliverViaGitHub, discord: deliverViaDiscord, airtable: deliverViaAirtable, webhook: deliverViaWebhook };

  for (const [name, fn] of Object.entries(deliverers)) {
    try {
      results[name] = await fn(lookupId, report, goal);
    } catch (err) {
      console.warn(`[DELIVERY] ${name} failed:`, err.message);
      results[name] = { error: err.message };
    }
  }

  await addTaskLog(workflowId, 'delivery_complete', 'Delivery complete', results);
  console.log('[DELIVERY] Delivery complete');
  return results;
}

module.exports = { runDeliveryAgent };
