const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { searchWeb } = require('../tools/tavily');
const { deliverToExternalTools } = require('../tools/externalTools');

const outputsDir = path.join(__dirname, '../../outputs');

function ensureOutputsDir() {
  if (!fs.existsSync(outputsDir)) {
    fs.mkdirSync(outputsDir, { recursive: true });
  }
}

async function webAgent(task) {
  const query = task.searchQuery || task.instruction;
  const result = await searchWeb(query, { maxResults: 5 });

  return {
    type: 'web',
    query,
    answer: result.answer || '',
    sources: (result.results || []).map((item) => ({
      title: item.title,
      url: item.url,
      content: item.content,
    })),
  };
}

async function fileAgent(workflowId, markdown) {
  ensureOutputsDir();
  const filePath = path.join(outputsDir, `report_${workflowId}.md`);
  await fs.promises.writeFile(filePath, markdown, 'utf8');

  return {
    type: 'file',
    filePath,
    bytes: Buffer.byteLength(markdown),
  };
}

async function codeAgent(task) {
  const code = task.code || task.instruction;
  const sandbox = {
    input: task.input || {},
    result: null,
    Math,
    JSON,
  };

  vm.createContext(sandbox);
  const script = new vm.Script(code);
  script.runInContext(sandbox, { timeout: 1000 });

  return {
    type: 'code',
    result: sandbox.result,
  };
}

async function deliveryAgent(workflowId, finalOutput) {
  const results = await deliverToExternalTools(workflowId, finalOutput);
  return { type: 'delivery', mode: 'external_tools', results };
}

module.exports = {
  webAgent,
  fileAgent,
  codeAgent,
  deliveryAgent,
  outputsDir,
};
