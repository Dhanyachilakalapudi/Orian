// ============================================
// Logger Utility for Task Logs
// ============================================
// Purpose: Store and retrieve task execution logs

/**
 * Get logs for a goal (stub - will integrate with DB later)
 */
async function getLogs(goalId) {
  return [
    {
      timestamp: new Date().toISOString(),
      message: `Logs for goal ${goalId}`,
    },
  ];
}

/**
 * Log a message
 */
async function log(goalId, message, metadata = {}) {
  console.log(`[LOG] ${goalId}: ${message}`);
}

module.exports = {
  getLogs,
  log,
};