/**
 * server/queues/taskQueue.js
 * Purpose: Manage BullMQ queue and Redis connection for AutoPilot.
 */

const Redis = require('ioredis');
const { Queue } = require('bullmq');

let redisClient = null;
let taskQueue = null;

/**
 * Initialize Redis connection with Upstash-specific optimizations
 */
async function initializeRedis() {
  try {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      throw new Error("REDIS_URL is missing in your .env file!");
    }

    console.log('[REDIS] Connecting to server...');

    // Redis Client Configuration
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
      keepAlive: 30000, // Sends a ping every 30s to keep connection alive
      connectTimeout: 20000,
      tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    });

    // Connection Event Handlers
    redisClient.on('connect', () => {
      console.log('[REDIS] Connection established successfully');
    });

    redisClient.on('error', (err) => {
      // Log errors but avoid crashing if it's just a temporary reset
      if (err.code !== 'ECONNRESET') {
        console.error('[REDIS ERROR]', err.message);
      }
    });

    // Wait for the client to be ready before proceeding
    await new Promise((resolve, reject) => {
      redisClient.once('ready', () => {
        console.log('[REDIS] Client is ready');
        resolve();
      });
      redisClient.once('error', reject);
    });

    // Initialize the BullMQ Queue
    taskQueue = new Queue('autopilot-tasks', {
      connection: redisClient,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true, // Keep Redis clean
        removeOnFail: false,    // Keep failed jobs for debugging
      },
    });

    console.log('[QUEUE] ✓ Task queue initialized');

    return { redisClient, taskQueue };
  } catch (error) {
    console.error('[FATAL REDIS ERROR]', error.message);
    throw error;
  }
}

/**
 * Returns the current Task Queue instance
 */
function getTaskQueue() {
  if (!taskQueue) {
    throw new Error('Task queue not initialized. Call initializeRedis first.');
  }
  return taskQueue;
}

/**
 * Returns the current Redis client
 */
function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis client not initialized.');
  }
  return redisClient;
}

/**
 * Adds a new goal to the queue for processing
 * @param {string} goalId - The unique ID for the goal
 * @param {object} goalData - The data containing goal and description
 */
async function addTaskToQueue(goalId, goalData) {
  try {
    const queue = getTaskQueue();

    const job = await queue.add(
      'execute-workflow', // Job name used by worker
      {
        goalId,
        goal: goalData.goal,
        description: goalData.description || '',
        createdAt: new Date().toISOString(),
      },
      {
        jobId: goalId, // Ensure unique job per goal
      }
    );

    console.log(`[QUEUE] Task added successfully: ${goalId}`);
    return job;
  } catch (error) {
    console.error('[QUEUE ERROR] Failed to add task:', error.message);
    throw error;
  }
}

module.exports = {
  initializeRedis,
  getTaskQueue,
  getRedisClient,
  addTaskToQueue
};