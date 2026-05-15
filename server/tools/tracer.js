const https = require('https');
const { v4: uuidv4 } = require('uuid');

const API_KEY = process.env.OMIUM_API_KEY;
const PROJECT = process.env.OMIUM_PROJECT || 'orian';
const ENDPOINT = 'api.omium.ai';
const PATH = '/api/v1/traces/ingest';
const FLUSH_INTERVAL = 5000;

const pendingSpans = new Map();

function now() {
  return new Date().toISOString();
}

function flush(traceId) {
  const spans = pendingSpans.get(traceId);
  if (!spans || spans.length === 0) return;
  pendingSpans.delete(traceId);

  if (!API_KEY) return;

  const payload = JSON.stringify({ trace_id: traceId, project: PROJECT, spans });
  const req = https.request({
    hostname: ENDPOINT,
    path: PATH,
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
    timeout: 10000,
  });
  req.on('error', () => {});
  req.write(payload);
  req.end();
}

function startTrace(executionId) {
  const traceId = uuidv4();
  pendingSpans.set(traceId, []);
  const timer = setTimeout(() => flush(traceId), FLUSH_INTERVAL);
  if (timer.unref) timer.unref();
  return traceId;
}

function startSpan(traceId, name, parentSpanId = null, attributes = {}) {
  const spanId = uuidv4();
  const startTime = now();
  return { traceId, spanId, parentSpanId, name, startTime, attributes };
}

function endSpan(span, status = 'ok', extraAttributes = {}) {
  const endTime = now();
  const durationMs = new Date(endTime) - new Date(span.startTime);
  const completed = {
    span_id: span.spanId,
    trace_id: span.traceId,
    parent_span_id: span.parentSpanId,
    name: span.name,
    service_name: 'orian',
    start_time: span.startTime,
    end_time: endTime,
    duration_ms: durationMs,
    status,
    attributes: { ...span.attributes, ...extraAttributes },
    events: [],
  };
  const spans = pendingSpans.get(span.traceId);
  if (spans) spans.push(completed);
  return completed;
}

function endTrace(traceId) {
  flush(traceId);
}

module.exports = { startTrace, startSpan, endSpan, endTrace };
