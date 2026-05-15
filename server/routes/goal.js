// ============================================
// Goal Routes - Main Goal Submission Endpoint
// ============================================
// Purpose: Handle goal submission and initiation of autonomous workflow

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { addTaskToQueue } = require('../queues/taskQueue');
const { createGoal, getGoal } = require('../db/sqlite');
const { requireAuth } = require('../middleware/auth');

router.post('/', requireAuth, async (req, res) => {
  try {
    const { goal, description } = req.body;
    const userId = req.user.userId;

    if (!goal || goal.trim().length === 0) {
      return res.status(400).json({ error: 'Goal is required' });
    }

    const goalId = uuidv4();
    const createdAt = new Date().toISOString();

    await createGoal({
      id: goalId,
      goal: goal.trim(),
      description: description?.trim() || '',
      status: 'queued',
      createdAt,
      updatedAt: createdAt,
    });

    await addTaskToQueue(goalId, {
      goal: goal.trim(),
      description: description?.trim() || '',
      userId,
    });

    if (req.io) {
      req.io.emit('new_goal_submitted', { goalId, goal: goal.trim(), timestamp: createdAt });
    }

    res.status(201).json({
      goalId,
      goal: goal.trim(),
      description: description?.trim() || '',
      status: 'queued',
      createdAt,
      trackingUrl: `/api/goal/${goalId}`,
    });
  } catch (error) {
    console.error('[GOAL ERROR]', error.message);
    res.status(500).json({ error: 'Failed to submit goal', message: error.message });
  }
});

/**
 * GET /api/goal/:goalId
 * Get details and status of a specific goal
 */
router.post('/:goalId/cancel', requireAuth, async (req, res) => {
  try {
    const { goalId } = req.params;
    const { updateGoalStatus } = require('../db/sqlite');
    const { getTaskQueue } = require('../queues/taskQueue');

    await updateGoalStatus(goalId, 'cancelled');

    try {
      const queue = getTaskQueue();
      const job = await queue.getJob(goalId);
      if (job) await job.remove();
    } catch (_) {}

    if (req.io) req.io.to(`goal:${goalId}`).emit('task_cancelled', { goalId });

    res.json({ goalId, status: 'cancelled' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel goal' });
  }
});

router.get('/:goalId', async (req, res) => {
  try {
    const { goalId } = req.params;

    console.log(`[GOAL] Fetching goal: ${goalId}`);

    // Get goal from database
    const goal = await getGoal(goalId);

    if (!goal) {
      return res.status(404).json({
        error: 'Goal not found',
      });
    }

    res.json({
      ...goal,
      trackingUrl: `/api/goal/${goalId}`,
    });
  } catch (error) {
    console.error('[GOAL ERROR]', error.message);
    res.status(500).json({
      error: 'Failed to fetch goal',
      message: error.message,
    });
  }
});

/**
 * GET /api/goal
 * List all goals (with pagination)
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    console.log(`[GOAL] Fetching goals (limit: ${limit}, offset: ${offset})`);

    // Query all goals from database
    const goals = await require('../db/sqlite').getAllGoals(
      parseInt(limit),
      parseInt(offset)
    );

    res.json({
      goals,
      limit: parseInt(limit),
      offset: parseInt(offset),
      count: goals.length,
    });
  } catch (error) {
    console.error('[GOAL ERROR]', error.message);
    res.status(500).json({
      error: 'Failed to fetch goals',
      message: error.message,
    });
  }
});

// ============================================
// EXPORTS
// ============================================

module.exports = router;