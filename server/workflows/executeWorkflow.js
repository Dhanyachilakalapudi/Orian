// ============================================
// AUTOPILOT MAIN WORKFLOW EXECUTOR
// ============================================

const plannerAgent = require("../agents/planner");
const routerAgent = require("../agents/router");
const webAgent = require("../agents/webAgent");
const criticAgent = require("../agents/critic");
const summarizerAgent = require("../agents/summarizer");

// We import the getter function to ensure we have the live IO instance
const { getIO } = require("../sockets/socket");

/**
 * Execute complete autonomous workflow
 */
async function executeWorkflow(taskData) {
  const io = getIO(); // Get the initialized socket instance
  
  try {
    console.log("\n========== WORKFLOW STARTED ==========");
    const { goalId, goal } = taskData;

    // Helper for safe emitting
    const safeEmit = (event, data) => {
      if (io) io.emit(event, data);
      console.log(`[EVENT: ${event}]`, data.message || "");
    };

    // STEP 1 — PLANNER
    safeEmit("agent-update", {
      agent: "Planner",
      status: "running",
      message: "Breaking goal into tasks...",
      goalId
    });
    const plan = await plannerAgent(goal);

    // STEP 2 — ROUTER
    safeEmit("agent-update", {
      agent: "Router",
      status: "running",
      message: "Assigning tasks to agents...",
      goalId
    });
    const routedTasks = await routerAgent(plan);

    // STEP 3 — EXECUTE TASKS
    const taskResults = [];
    for (const task of routedTasks) {
      safeEmit("agent-update", {
        agent: "WebAgent",
        status: "running",
        message: `Executing: ${task.task}`,
        goalId
      });

      const result = await webAgent(task.task);
      const review = await criticAgent(result);

      taskResults.push({
        task: task.task,
        result,
        review,
      });
    }

    // STEP 4 — SUMMARIZER
    safeEmit("agent-update", {
      agent: "Summarizer",
      status: "running",
      message: "Compiling final report...",
      goalId
    });
    const finalReport = await summarizerAgent(taskResults);

    console.log("\n========== WORKFLOW COMPLETED ==========");
    safeEmit("workflow-complete", { goalId, report: finalReport });

    return finalReport;
  } catch (error) {
    console.error("[WORKFLOW ERROR]", error.message);
    if (io) io.emit("workflow-error", { error: error.message });
    throw error;
  }
}

module.exports = executeWorkflow;