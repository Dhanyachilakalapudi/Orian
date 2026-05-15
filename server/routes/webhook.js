// ============================================
// Webhook Routes - External Integration Triggers
// ============================================
// Purpose: Handle webhook requests and external service callbacks

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { addTaskToQueue } = require('../queues/taskQueue');
const { createGoal } = require('../db/sqlite');

/**
 * Verify webhook signature for security
 * @param {Object} req - Express request
 * @param {string} signature - Signature from header
 */
function verifyWebhookSignature(req, signature) {
  const secret = process.env.WEBHOOK_SECRET || 'default-secret';
  const payload = JSON.stringify(req.body);
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return hash === signature;
}

/**
 * POST /api/webhook/trigger
 * Trigger a goal via webhook (with signature verification)
 * 
 * Headers:
 * X-Webhook-Signature: <HMAC-SHA256 signature>
 * 
 * Body:
 * {
 *   "goal": "Research competitors",
 *   "description": "Find top 5 competitors",
 *   "source": "external-system"
 * }
 */
router.post('/trigger', (req, res) => {
  try {
    const signature = req.headers['x-webhook-signature'];

    // Verify signature if configured
    if (process.env.WEBHOOK_SECRET && signature) {
      if (!verifyWebhookSignature(req, signature)) {
        console.warn('[WEBHOOK] Invalid signature from request');
        return res.status(401).json({
          error: 'Invalid webhook signature',
        });
      }
    }

    const { goal, description, source, metadata } = req.body;

    if (!goal) {
      return res.status(400).json({
        error: 'Goal is required',
      });
    }

    console.log(`[WEBHOOK] Trigger received from ${source || 'unknown'}: "${goal}"`);

    // Generate unique goal ID
    const goalId = uuidv4();
    const createdAt = new Date().toISOString();

    // Create goal record
    createGoal({
      id: goalId,
      goal: goal.trim(),
      description: description?.trim() || '',
      source: source || 'webhook',
      metadata: JSON.stringify(metadata || {}),
      status: 'queued',
      createdAt,
      updatedAt: createdAt,
    });

    // Add to queue
    addTaskToQueue(goalId, {
      goal: goal.trim(),
      description: description?.trim() || '',
      source: source || 'webhook',
    });

    console.log(`[WEBHOOK] Goal ${goalId} queued from webhook`);

    res.status(202).json({
      goalId,
      goal: goal.trim(),
      status: 'queued',
      message: 'Goal submitted via webhook',
      trackingUrl: `/api/goal/${goalId}`,
    });
  } catch (error) {
    console.error('[WEBHOOK ERROR]', error.message);
    res.status(500).json({
      error: 'Failed to process webhook',
      message: error.message,
    });
  }
});

/**
 * POST /api/webhook/callback/:goalId
 * Receive callbacks from external services
 */
router.post('/callback/:goalId', (req, res) => {
  try {
    const { goalId } = req.params;
    const { event, data } = req.body;

    console.log(`[WEBHOOK] Callback for goal ${goalId}: event=${event}`);

    // Handle different callback events
    switch (event) {
      case 'search_complete':
        console.log(`[WEBHOOK] Search completed for ${goalId}`);
        break;

      case 'report_ready':
        console.log(`[WEBHOOK] Report ready for ${goalId}`);
        break;

      case 'error':
        console.error(`[WEBHOOK] Error callback for ${goalId}:`, data.message);
        break;

      default:
        console.log(`[WEBHOOK] Unknown event: ${event}`);
    }

    res.json({
      goalId,
      event,
      acknowledged: true,
    });
  } catch (error) {
    console.error('[WEBHOOK ERROR]', error.message);
    res.status(500).json({
      error: 'Failed to process callback',
      message: error.message,
    });
  }
});

/**
 * GET /api/webhook/signature
 * Generate a webhook signature for external services
 * 
 * Query params:
 * - payload: JSON string to sign
 */
router.get('/signature', (req, res) => {
  try {
    const { payload } = req.query;

    if (!payload) {
      return res.status(400).json({
        error: 'Payload required',
      });
    }

    const secret = process.env.WEBHOOK_SECRET || 'default-secret';
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    res.json({
      payload,
      signature,
      algorithm: 'sha256',
    });
  } catch (error) {
    console.error('[WEBHOOK ERROR]', error.message);
    res.status(500).json({
      error: 'Failed to generate signature',
      message: error.message,
    });
  }
});

// ============================================
// EXPORTS
// ============================================

module.exports = router;