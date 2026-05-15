// ============================================
// AUTOPILOT WORKFLOW WORKER
// ============================================

const { Worker } = require("bullmq");
const executeWorkflow = require("../workflows/executeWorkflow");
const { getRedisClient } = require("../queues/taskQueue");

function startWorkflowWorker() {
  try {
    const redisConnection = getRedisClient();
    
    if (!redisConnection) {
        console.error("[WORKER] Redis connection not found. Worker cannot start.");
        return null;
    }

    console.log("[WORKER] Starting workflow worker...");

    const worker = new Worker(
      "autopilot-tasks",
      async (job) => {
        console.log(`\n[WORKER] Processing Job: ${job.id}`);
        // This links the Queue to the actual AI Logic
        return await executeWorkflow(job.data);
      },
      {
        connection: redisConnection,
        concurrency: 5, // Process 5 goals at once
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 }
      }
    );

    worker.on("completed", (job) => {
      console.log(`[WORKER] SUCCESS: Job ${job.id} finished.`);
    });

    worker.on("failed", (job, err) => {
      console.error(`[WORKER] FAILED: Job ${job?.id} - ${err.message}`);
    });

    console.log("[WORKER] ✓ Workflow worker ready and listening for jobs");
    return worker;
  } catch (error) {
    console.error("[WORKER FATAL ERROR]", error.message);
  }
}

module.exports = startWorkflowWorker;