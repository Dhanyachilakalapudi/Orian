// ============================================
// Socket.io Configuration & Event Handlers
// ============================================
// Purpose: Setup real-time bidirectional communication
// between server and frontend clients

const { taskQueue } = require('../queues/taskQueue');
const { getLogs } = require('../tools/logger');

const activeClients = new Map();
let _io = null;

function getIO() {
  return _io;
}

/**
 * Setup Socket.io event listeners and handlers
 * @param {Object} io - Socket.io instance from server.js
 */
function setupSocket(io) {
  _io = io;
  // Main connection handler
  io.on('connection', (socket) => {
    const clientId = socket.id;
    console.log(`[SOCKET] Client connected: ${clientId}`);

    // Store client metadata
    activeClients.set(clientId, {
      id: clientId,
      connectedAt: new Date(),
      activeGoalId: null,
    });

    // ============================================
    // CONNECTION EVENTS
    // ============================================

    /**
     * When client identifies themselves with a goal ID
     */
    socket.on('subscribe_goal', (goalId) => {
      console.log(`[SOCKET] Client ${clientId} subscribed to goal: ${goalId}`);

      // Join a room named after the goal ID for broadcasting
      socket.join(`goal:${goalId}`);

      // Update client metadata
      const client = activeClients.get(clientId);
      if (client) {
        client.activeGoalId = goalId;
      }

      // Send acknowledgment
      socket.emit('subscribed', {
        goalId,
        clientId,
        timestamp: new Date().toISOString(),
      });
    });

    /**
     * When client unsubscribes from a goal
     */
    socket.on('unsubscribe_goal', (goalId) => {
      console.log(`[SOCKET] Client ${clientId} unsubscribed from goal: ${goalId}`);
      socket.leave(`goal:${goalId}`);

      // Clear active goal
      const client = activeClients.get(clientId);
      if (client) {
        client.activeGoalId = null;
      }
    });

    /**
     * Ping/Pong for connection health check
     */
    socket.on('ping', () => {
      socket.emit('pong', {
        timestamp: new Date().toISOString(),
      });
    });

    /**
     * Request current logs for a goal
     */
    socket.on('request_logs', async (goalId) => {
      try {
        console.log(`[SOCKET] Client ${clientId} requesting logs for goal: ${goalId}`);
        const logs = await getLogs(goalId);

        socket.emit('logs_response', {
          goalId,
          logs,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error(`[SOCKET ERROR] Failed to get logs:`, error.message);
        socket.emit('error', {
          message: 'Failed to fetch logs',
          error: error.message,
        });
      }
    });

    /**
     * Disconnect handler
     */
    socket.on('disconnect', () => {
      console.log(`[SOCKET] Client disconnected: ${clientId}`);
      activeClients.delete(clientId);
    });

    /**
     * Error handler
     */
    socket.on('error', (error) => {
      console.error(`[SOCKET ERROR] Client ${clientId}:`, error);
    });
  });

  console.log('[SOCKET] Socket.io initialized and listening for connections');
}

/**
 * Emit task progress update to all clients watching a goal
 * Called from the queue workers
 * @param {string} goalId - The goal being worked on
 * @param {Object} update - Update object with task details
 */
function emitTaskUpdate(io, goalId, update) {
  if (!io) return;

  console.log(`[SOCKET] Emitting update for goal ${goalId}:`, update.stage);

  // Broadcast to all clients in this goal's room
  io.to(`goal:${goalId}`).emit('task_update', {
    goalId,
    ...update,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit agent activity (used by individual agents)
 * @param {string} goalId - The goal being worked on
 * @param {string} agentName - Name of the agent (e.g., "planner", "web_agent")
 * @param {string} action - Action being performed
 * @param {Object} data - Additional data
 */
function emitAgentActivity(io, goalId, agentName, action, data = {}) {
  if (!io) return;

  console.log(`[SOCKET] Agent ${agentName} - ${action}`);

  io.to(`goal:${goalId}`).emit('agent_activity', {
    goalId,
    agent: agentName,
    action,
    data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit error to all clients watching a goal
 * @param {string} goalId - The goal with error
 * @param {string} errorMessage - Error message
 * @param {Object} details - Additional error details
 */
function emitError(io, goalId, errorMessage, details = {}) {
  if (!io) return;

  console.error(`[SOCKET] Error for goal ${goalId}:`, errorMessage);

  io.to(`goal:${goalId}`).emit('task_error', {
    goalId,
    error: errorMessage,
    details,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit task completion to clients
 * @param {string} goalId - Completed goal
 * @param {Object} result - Final result/report
 */
function emitTaskComplete(io, goalId, result) {
  if (!io) return;

  console.log(`[SOCKET] Task complete for goal ${goalId}`);

  io.to(`goal:${goalId}`).emit('task_complete', {
    goalId,
    result,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get active client count
 */
function getActiveClientCount() {
  return activeClients.size;
}

/**
 * Get all active clients for a specific goal
 * @param {string} goalId - The goal to check
 */
function getClientsForGoal(goalId) {
  const clients = [];
  activeClients.forEach((client) => {
    if (client.activeGoalId === goalId) {
      clients.push(client);
    }
  });
  return clients;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  setupSocket,
  getIO,
  emitTaskUpdate,
  emitAgentActivity,
  emitError,
  emitTaskComplete,
  getActiveClientCount,
  getClientsForGoal,
};