// ============================================
// Planner Agent
// ============================================
// Purpose: Break down high-level goals into actionable subtasks

const { callGroqJson } = require('../tools/groq');
const { PLANNER_SYSTEM_PROMPT, getPlannerPrompt } = require('../tools/prompts');
const { addTaskLog } = require('../db/sqlite');
const { emitAgentActivity } = require('../sockets/socket');

/**
 * Run the planner agent
 * @param {string} goalId - Unique goal ID
 * @param {string} goal - High-level goal description
 * @param {string} description - Optional detailed description
 * @param {Object} io - Socket.io instance for live updates
 * @returns {Promise<Object>} - Plan with subtasks
 */
async function runPlanner(goalId, goal, description = '', io = null) {
  try {
    console.log(`[PLANNER] Starting plan generation for goal: "${goal}"`);
    
    // Emit activity
    emitAgentActivity(io, goalId, 'planner', 'analyzing_goal', {
      goal,
      description,
    });

    // Log to database
    await addTaskLog(goalId, 'planner_start', 'Planner agent started analyzing goal');

    // Generate prompt
    const prompt = getPlannerPrompt(goal, description);

    console.log(`[PLANNER] Calling Groq with prompt (${prompt.length} chars)`);

    // Call Groq to generate plan
    const plan = await callGroqJson(prompt, {
      model: process.env.GROQ_MODEL || 'mixtral-8x7b-32768',
      maxTokens: 2048,
      temperature: 0.7,
      systemPrompt: PLANNER_SYSTEM_PROMPT,
    });

    console.log(`[PLANNER] Plan generated with ${plan.subtasks?.length || 0} subtasks`);

    // Validate plan structure
    if (!plan.subtasks || !Array.isArray(plan.subtasks)) {
      throw new Error('Invalid plan structure from Groq');
    }

    // Log plan details
    console.log('[PLANNER] Plan details:');
    plan.subtasks.forEach((task, index) => {
      console.log(
        `  ${index + 1}. [${task.type}] ${task.task} (${task.priority})`
      );
    });

    // Log to database
    await addTaskLog(
      goalId,
      'planner_complete',
      `Generated plan with ${plan.subtasks.length} subtasks`,
      {
        totalEstimatedTime: plan.total_estimated_time_minutes,
        subtaskCount: plan.subtasks.length,
      }
    );

    // Emit completion
    emitAgentActivity(io, goalId, 'planner', 'plan_generated', {
      subtaskCount: plan.subtasks.length,
      totalEstimatedTime: plan.total_estimated_time_minutes,
    });

    return plan;
  } catch (error) {
    console.error(`[PLANNER ERROR] ${error.message}`);

    // Log error
    await addTaskLog(goalId, 'planner_error', `Planner failed: ${error.message}`);

    // Emit error
    emitAgentActivity(io, goalId, 'planner', 'error', {
      error: error.message,
    });

    throw error;
  }
}

/**
 * Validate plan structure
 * @param {Object} plan - Plan object to validate
 * @returns {boolean} - Is valid
 */
function validatePlan(plan) {
  if (!plan || typeof plan !== 'object') return false;
  if (!Array.isArray(plan.subtasks)) return false;
  if (plan.subtasks.length === 0) return false;

  // Validate each subtask
  return plan.subtasks.every((task) => {
    return (
      task.id !== undefined &&
      task.task &&
      typeof task.task === 'string' &&
      task.type &&
      ['research', 'analysis', 'generation', 'execution'].includes(task.type) &&
      Array.isArray(task.depends_on) &&
      ['high', 'medium', 'low'].includes(task.priority) &&
      typeof task.estimated_time_minutes === 'number'
    );
  });
}

/**
 * Get execution order of subtasks respecting dependencies
 * @param {Object} plan - Plan with subtasks
 * @returns {Array<Array<number>>} - Subtask IDs grouped by execution order
 */
function getExecutionOrder(plan) {
  if (!plan.subtasks) return [];

  const executed = new Set();
  const executionOrder = [];

  while (executed.size < plan.subtasks.length) {
    const batch = [];

    for (const task of plan.subtasks) {
      if (executed.has(task.id)) continue; // Already executed

      // Check if all dependencies are met
      const dependenciesMet = task.depends_on.every((depId) =>
        executed.has(depId)
      );

      if (dependenciesMet) {
        batch.push(task.id);
        executed.add(task.id);
      }
    }

    if (batch.length === 0) {
      throw new Error('Circular dependency detected in plan');
    }

    executionOrder.push(batch);
  }

  return executionOrder;
}

/**
 * Get subtask by ID
 * @param {Object} plan - Plan object
 * @param {number} taskId - Task ID to find
 * @returns {Object|null} - Subtask object or null
 */
function getSubtask(plan, taskId) {
  if (!plan.subtasks) return null;
  return plan.subtasks.find((task) => task.id === taskId) || null;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  runPlanner,
  validatePlan,
  getExecutionOrder,
  getSubtask,
};