// ============================================
// Goal Routes - Main Goal Submission Endpoint
// ============================================
// Purpose: Handle goal submission and initiation of autonomous workflow

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { addTaskToQueue } = require('../queues/taskQueue');
const { createGoal, getGoal } = require('../db/sqlite');

/**
 * POST /api/goal
 * Submit a new goal for the autonomous system to execute
 * 
 * Request body:
 * {
 *   "goal": "Research top AI startups in India",
 *   "description": "Find the 10 most promising AI startups and generate a report"
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { goal, description } = req.body;

    // Validate input
    if (!goal || goal.trim().length === 0) {
      return res.status(400).json({
        error: 'Goal is required',
      });
    }

    console.log(`[GOAL] New goal submitted: "${goal}"`);

    // Generate unique goal ID
    const goalId = uuidv4();
    const createdAt = new Date().toISOString();

    // Save goal to database
    await createGoal({
      id: goalId,
      goal: goal.trim(),
      description: description?.trim() || '',
      status: 'queued',
      createdAt,
      updatedAt: createdAt,
    });

    console.log(`[GOAL] Goal ${goalId} saved to database`);

    // Add to BullMQ task queue
    await addTaskToQueue(goalId, {
      goal: goal.trim(),
      description: description?.trim() || '',
    });

    console.log(`[GOAL] Goal ${goalId} added to task queue`);

    // Emit Socket.io event to notify connected clients
    if (req.io) {
      req.io.emit('new_goal_submitted', {
        goalId,
        goal: goal.trim(),
        timestamp: createdAt,
      });
    }

    // Return goal ID and tracking info
    res.status(201).json({
      goalId,
      goal: goal.trim(),
      description: description?.trim() || '',
      status: 'queued',
      createdAt,
      message: 'Goal submitted successfully. Use goalId to track progress via Socket.io',
      trackingUrl: `/api/goal/${goalId}`,
    });
  } catch (error) {
    console.error('[GOAL ERROR]', error.message);
    res.status(500).json({
      error: 'Failed to submit goal',
      message: error.message,
    });
  }
});

/**
 * GET /api/goal/:goalId
 * Get details and status of a specific goal
 */
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