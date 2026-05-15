const fs = require('fs');
const path = require('path');
const { requestJson } = require('./http');

const outputsDir = path.join(__dirname, '../../outputs');

function ensureOutputsDir() {
  if (!fs.existsSync(outputsDir)) {
    fs.mkdirSync(outputsDir, { recursive: true });
  }
}

function getToolCapabilities() {
  return {
    notion: {
      enabled: Boolean(process.env.NOTION_TOKEN && (process.env.NOTION_DATABASE_ID || process.env.NOTION_PARENT_PAGE_ID)),
      requires: ['NOTION_TOKEN', 'NOTION_DATABASE_ID or NOTION_PARENT_PAGE_ID'],
    },
    webhook: {
      enabled: Boolean(process.env.DELIVERY_WEBHOOK_URL),
      requires: ['DELIVERY_WEBHOOK_URL'],
    },
    localReceipt: {
      enabled: true,
      outputDir: outputsDir,
    },
  };
}

function markdownToNotionBlocks(markdown) {
  const lines = String(markdown || '').split('\n').slice(0, 80);
  const blocks = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('# ')) {
      blocks.push({
        object: 'block',
        type: 'heading_1',
        heading_1: { rich_text: [{ type: 'text', text: { content: line.slice(2, 2000) } }] },
      });
    } else if (line.startsWith('## ')) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ type: 'text', text: { content: line.slice(3, 2000) } }] },
      });
    } else if (line.startsWith('- ')) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: [{ type: 'text', text: { content: line.slice(2, 2000) } }] },
      });
    } else {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: [{ type: 'text', text: { content: line.slice(0, 2000) } }] },
      });
    }

    if (blocks.length >= 50) break;
  }

  return blocks.length > 0 ? blocks : [{
    object: 'block',
    type: 'paragraph',
    paragraph: { rich_text: [{ type: 'text', text: { content: 'ORIAN completed a workflow.' } }] },
  }];
}

function notionHeaders() {
  return {
    Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
    'Notion-Version': process.env.NOTION_VERSION || '2022-06-28',
  };
}

async function pushToNotion(workflowId, finalOutput) {
  if (!process.env.NOTION_TOKEN) {
    throw new Error('NOTION_TOKEN is required for Notion delivery');
  }

  if (!process.env.NOTION_DATABASE_ID && !process.env.NOTION_PARENT_PAGE_ID) {
    throw new Error('NOTION_DATABASE_ID or NOTION_PARENT_PAGE_ID is required for Notion delivery');
  }

  const title = finalOutput.title || `ORIAN Workflow ${workflowId}`;
  const markdown = finalOutput.markdown || finalOutput.executiveSummary || '';
  const parent = process.env.NOTION_DATABASE_ID
    ? { database_id: process.env.NOTION_DATABASE_ID }
    : { page_id: process.env.NOTION_PARENT_PAGE_ID };
  const properties = process.env.NOTION_DATABASE_ID
    ? {
        Name: { title: [{ text: { content: title.slice(0, 2000) } }] },
        Status: { select: { name: 'Completed' } },
        WorkflowId: { rich_text: [{ text: { content: workflowId } }] },
      }
    : {
        title: [{ text: { content: title.slice(0, 2000) } }],
      };

  const response = await requestJson('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: notionHeaders(),
    body: {
      parent,
      properties,
      children: markdownToNotionBlocks(markdown),
    },
  });

  return {
    tool: 'notion',
    pageId: response.body?.id,
    url: response.body?.url,
  };
}

async function pushToWebhook(workflowId, finalOutput) {
  if (!process.env.DELIVERY_WEBHOOK_URL) {
    throw new Error('DELIVERY_WEBHOOK_URL is required for webhook delivery');
  }

  const response = await requestJson(process.env.DELIVERY_WEBHOOK_URL, {
    method: 'POST',
    body: {
      workflowId,
      status: 'completed',
      title: finalOutput.title,
      summary: finalOutput.executiveSummary || finalOutput.markdown?.slice(0, 1200) || '',
      reportPath: finalOutput.filePath,
      deliveredAt: new Date().toISOString(),
    },
  });

  return {
    tool: 'webhook',
    statusCode: response.statusCode,
    response: response.body,
  };
}

async function writeLocalReceipt(workflowId, finalOutput, deliveryResults) {
  ensureOutputsDir();
  const receiptPath = path.join(outputsDir, `delivery_receipt_${workflowId}.json`);
  await fs.promises.writeFile(receiptPath, JSON.stringify({
    workflowId,
    status: 'completed',
    title: finalOutput.title,
    reportPath: finalOutput.filePath,
    deliveryResults,
    deliveredAt: new Date().toISOString(),
  }, null, 2), 'utf8');

  return {
    tool: 'localReceipt',
    receiptPath,
  };
}

async function deliverToExternalTools(workflowId, finalOutput) {
  const results = [];

  if (process.env.NOTION_TOKEN && (process.env.NOTION_DATABASE_ID || process.env.NOTION_PARENT_PAGE_ID)) {
    results.push(await pushToNotion(workflowId, finalOutput));
  }

  if (process.env.DELIVERY_WEBHOOK_URL) {
    results.push(await pushToWebhook(workflowId, finalOutput));
  }

  results.push(await writeLocalReceipt(workflowId, finalOutput, results));
  return results;
}

module.exports = {
  getToolCapabilities,
  deliverToExternalTools,
  pushToNotion,
  pushToWebhook,
  writeLocalReceipt,
};
