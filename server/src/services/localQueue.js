const { appendAgentLog, getWorkflow, updateWorkflowStep } = require('./stateManager');
const { executeWorkflow } = require('../agents/orchestrator');

const queue = [];
let active = false;

function enqueueWorkflow(workflowId) {
  queue.push({ workflowId, enqueuedAt: new Date().toISOString() });
  setImmediate(processQueue);
}

async function processQueue() {
  if (active) return;
  active = true;

  while (queue.length > 0) {
    const item = queue.shift();

    try {
      const workflow = await getWorkflow(item.workflowId);
      if (!workflow || !['queued', 'failed'].includes(workflow.status)) continue;

      await appendAgentLog(item.workflowId, {
        agent: 'queue',
        event: 'dequeued',
        message: 'Workflow dequeued for async execution.',
      });

      await executeWorkflow(item.workflowId);
    } catch (error) {
      await appendAgentLog(item.workflowId, {
        agent: 'queue',
        event: 'error',
        message: error.message,
      }).catch(() => {});
      await updateWorkflowStep(item.workflowId, {
        status: 'failed',
        final_output: { error: error.message },
      }).catch(() => {});
    }
  }

  active = false;
}

function getQueueStats() {
  return {
    queued: queue.length,
    active,
  };
}

module.exports = {
  enqueueWorkflow,
  getQueueStats,
};
