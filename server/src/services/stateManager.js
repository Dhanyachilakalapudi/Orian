const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { randomUUID } = require('crypto');

const dbPath = process.env.WORKFLOW_DB_PATH || path.join(__dirname, '../../../data/orian_workflows.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

async function initializeStateManager() {
  await run(`
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      original_goal TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT '[]',
      agent_logs TEXT NOT NULL DEFAULT '[]',
      final_output TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}

function parseWorkflow(row) {
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    original_goal: row.original_goal,
    plan: JSON.parse(row.plan || '[]'),
    agent_logs: JSON.parse(row.agent_logs || '[]'),
    final_output: row.final_output ? JSON.parse(row.final_output) : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function createWorkflow(goal) {
  await initializeStateManager();

  const id = randomUUID();
  const now = new Date().toISOString();
  const workflow = {
    id,
    status: 'queued',
    original_goal: goal,
    plan: [],
    agent_logs: [],
    final_output: null,
    created_at: now,
    updated_at: now,
  };

  await run(
    `INSERT INTO workflows (id, status, original_goal, plan, agent_logs, final_output, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      workflow.id,
      workflow.status,
      workflow.original_goal,
      JSON.stringify(workflow.plan),
      JSON.stringify(workflow.agent_logs),
      null,
      workflow.created_at,
      workflow.updated_at,
    ]
  );

  return workflow;
}

async function getWorkflow(id) {
  await initializeStateManager();
  const row = await get('SELECT * FROM workflows WHERE id = ?', [id]);
  return parseWorkflow(row);
}

async function updateWorkflowStep(id, updates) {
  await initializeStateManager();

  const allowed = {
    status: 'status',
    original_goal: 'original_goal',
    plan: 'plan',
    agent_logs: 'agent_logs',
    final_output: 'final_output',
  };
  const sets = [];
  const values = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (!allowed[key]) return;
    sets.push(`${allowed[key]} = ?`);
    values.push(['plan', 'agent_logs', 'final_output'].includes(key) ? JSON.stringify(value) : value);
  });

  if (sets.length === 0) return getWorkflow(id);

  sets.push('updated_at = ?');
  values.push(new Date().toISOString(), id);

  await run(`UPDATE workflows SET ${sets.join(', ')} WHERE id = ?`, values);
  return getWorkflow(id);
}

async function appendAgentLog(id, logEntry) {
  const workflow = await getWorkflow(id);
  if (!workflow) throw new Error(`Workflow not found: ${id}`);

  const agent_logs = workflow.agent_logs.concat({
    timestamp: new Date().toISOString(),
    ...logEntry,
  });

  return updateWorkflowStep(id, { agent_logs });
}

async function updateTask(id, taskId, patch) {
  const workflow = await getWorkflow(id);
  if (!workflow) throw new Error(`Workflow not found: ${id}`);

  const plan = workflow.plan.map((task) => (
    task.id === taskId ? { ...task, ...patch, updatedAt: new Date().toISOString() } : task
  ));

  return updateWorkflowStep(id, { plan });
}

module.exports = {
  initializeStateManager,
  createWorkflow,
  updateWorkflowStep,
  appendAgentLog,
  updateTask,
  getWorkflow,
};
