const express = require('express');
const {
  createWorkflow,
  getWorkflow,
  initializeStateManager,
} = require('../services/stateManager');
const { enqueueWorkflow, getQueueStats } = require('../services/localQueue');
const { getToolCapabilities } = require('../tools/externalTools');

const router = express.Router();

router.post('/webhook/trigger', async (req, res) => {
  try {
    const goal = String(req.body?.goal || '').trim();
    if (!goal) {
      return res.status(400).json({ error: 'goal is required' });
    }

    const workflow = await createWorkflow(goal);
    enqueueWorkflow(workflow.id);

    return res.status(202).json({
      workflowId: workflow.id,
      status: workflow.status,
      statusUrl: `/api/status/${workflow.id}`,
    });
  } catch (error) {
    console.error('[ORIAN API] webhook trigger failed:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.get('/status/:id', async (req, res) => {
  try {
    const workflow = await getWorkflow(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'workflow not found' });
    }

    return res.json({
      workflow,
      queue: getQueueStats(),
    });
  } catch (error) {
    console.error('[ORIAN API] status failed:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.get('/tools', (req, res) => {
  res.json({
    tools: getToolCapabilities(),
    note: 'Set NOTION_TOKEN plus NOTION_DATABASE_ID or NOTION_PARENT_PAGE_ID to let ORIAN create Notion pages.',
  });
});

async function initializeApiRoutes() {
  await initializeStateManager();
}

module.exports = {
  router,
  initializeApiRoutes,
};
