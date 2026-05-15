// ============================================
// Task Routes - Task Status and Management
// ============================================
// Purpose: Handle task queries, status checks, and management

const express = require('express');
const router = express.Router();
const { getJobStatus } = require('../queues/taskQueue');
const { getTaskLogs } = require('../db/sqlite');

/**
 * GET /api/tasks/:goalId/status
 * Get the current status of a task
 */
router.get('/:goalId/status', async (req, res) => {
  try {
    const { goalId } = req.params;

    console.log(`[TASKS] Fetching status for goal: ${goalId}`);

    // Get job status from queue
    const jobStatus = await getJobStatus(goalId);

    if (!jobStatus) {
      return res.status(404).json({
        error: 'Task not found',
      });
    }

    res.json({
      goalId,
      ...jobStatus,
    });
  } catch (error) {
    console.error('[TASKS ERROR]', error.message);
    res.status(500).json({
      error: 'Failed to fetch task status',
      message: error.message,
    });
  }
});

/**
 * GET /api/tasks/:goalId/logs
 * Get logs for a specific task
 */
router.get('/:goalId/logs', async (req, res) => {
  try {
    const { goalId } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    console.log(`[TASKS] Fetching logs for goal: ${goalId}`);

    // Get logs from database
    const logs = await getTaskLogs(goalId, parseInt(limit), parseInt(offset));

    res.json({
      goalId,
      logs,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('[TASKS ERROR]', error.message);
    res.status(500).json({
      error: 'Failed to fetch task logs',
      message: error.message,
    });
  }
});

/**
 * GET /api/tasks
 * List all active tasks
 */
router.get('/', async (req, res) => {
  try {
    const { status = 'active' } = req.query;

    console.log(`[TASKS] Fetching ${status} tasks`);

    // Get all tasks with specific status
    const tasks = await require('../db/sqlite').getTasksByStatus(status);

    res.json({
      status,
      tasks,
      count: tasks.length,
    });
  } catch (error) {
    console.error('[TASKS ERROR]', error.message);
    res.status(500).json({
      error: 'Failed to fetch tasks',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/tasks/:goalId
 * Cancel a task (if it hasn't started yet)
 */
router.delete('/:goalId', async (req, res) => {
  try {
    const { goalId } = req.params;

    console.log(`[TASKS] Cancelling task: ${goalId}`);

    const { taskQueue } = require('../queues/taskQueue');
    const job = await taskQueue.getJob(goalId);

    if (!job) {
      return res.status(404).json({
        error: 'Task not found',
      });
    }

    const state = await job.getState();

    if (state !== 'waiting' && state !== 'delayed') {
      return res.status(400).json({
        error: `Cannot cancel task in ${state} state`,
      });
    }

    await job.remove();

    res.json({
      goalId,
      message: 'Task cancelled successfully',
    });
  } catch (error) {
    console.error('[TASKS ERROR]', error.message);
    res.status(500).json({
      error: 'Failed to cancel task',
      message: error.message,
    });
  }
});

// ============================================
// EXPORTS
// ============================================

module.exports = router;