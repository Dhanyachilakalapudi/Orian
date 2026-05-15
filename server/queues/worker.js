// ============================================
// BullMQ Task Worker
// ============================================
// Purpose: Process queued goals and execute autonomous workflows

const { Worker } = require('bullmq');
const Redis = require('ioredis');
const { executeGoal } = require('../tools/executor');
const { getTaskQueue, QUEUE_NAME } = require('./taskQueue');
const { updateGoalStatus, addTaskLog } = require('../db/sqlite');
const http = require('http');

// Socket.io instance (will be passed in)
let io = null;

/**
 * Initialize and start the worker
 * @param {Object} socketIoInstance - Socket.io instance from server
 */
async function startWorker(socketIoInstance) {
  try {
    io = socketIoInstance;

    console.log('[WORKER] Initializing task worker...');

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    // Create Redis connections for worker
    const connection = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      enableOfflineQueue: true,
      tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    });

    // Create worker
    const worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        return await processJob(job, io);
      },
      {
        connection,
        concurrency: 1, // Process one goal at a time
        settings: {
          lockDuration: 30000, // 30 seconds
          lockRenewTime: 15000, // Renew every 15 seconds
        },
      }
    );

    await worker.waitUntilReady();

    // Worker event handlers
    worker.on('active', (job) => {
      console.log(`[WORKER] Active job: ${job.id}`);
    });

    worker.on('completed', (job, result) => {
      console.log(`[WORKER] ✓ Job completed: ${job.id}`);
    });

    worker.on('failed', (job, error) => {
      console.error(`[WORKER] ✗ Job failed: ${job.id}`, error.message);
      if (error.stack) console.error(error.stack);
    });

    worker.on('error', (error) => {
      console.error('[WORKER] Error:', error.message);
    });

    console.log('[WORKER] ✓ Worker started and listening for jobs');

    return worker;
  } catch (error) {
    console.error('[WORKER ERROR]', error.message);
    throw error;
  }
}

/**
 * Process a single job from the queue
 * @param {Object} job - BullMQ job
 * @param {Object} io - Socket.io instance
 * @returns {Promise<Object>} - Job result
 */
async function processJob(job, io) {
  const { goalId, goal, description } = job.data;

  try {
    console.log(`\n[WORKER] Processing job: ${goalId}`);
    console.log(`[WORKER] Goal: "${goal}"`);

    // Update job progress
    await job.updateProgress(5);

    // Execute the goal with the autonomous workflow
    const result = await executeGoal(
      goalId,
      { goal, description },
      io
    );

    // Complete with final progress
    await job.updateProgress(100);

    console.log(`[WORKER] ✓ Job completed successfully`);

    return {
      success: true,
      goalId,
      result,
    };
  } catch (error) {
    console.error(`[WORKER] ✗ Job failed: ${error.message}`);

    try {
      await updateGoalStatus(goalId, 'failed', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      await addTaskLog(goalId, 'worker_error', `Worker failed before completion: ${error.message}`);
    } catch (dbError) {
      console.error(`[WORKER] Failed to persist error for ${goalId}: ${dbError.message}`);
    }

    // Report progress update on error
    if (io) {
      io.to(`goal:${goalId}`).emit('task_error', {
        goalId,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    // Re-throw to let BullMQ mark job as failed
    throw error;
  }
}

/**
 * Get worker statistics
 * @returns {Promise<Object>} - Worker stats
 */
async function getWorkerStats() {
  try {
    const queue = getTaskQueue();

    const [
      waiting,
      active,
      completed,
      failed,
      delayed,
    ] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[WORKER] Failed to get stats:', error.message);
    return null;
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  startWorker,
  processJob,
  getWorkerStats,
};
