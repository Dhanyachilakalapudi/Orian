const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db/sqlite');

async function createWorkflow(goal, source = 'api') {
  const db = getDB();
  const id = uuidv4();
  const now = new Date().toISOString();
  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO workflows (id, goal, source, status, plan, agent_logs, final_output, created_at, updated_at)
       VALUES (?, ?, ?, 'pending', '[]', '[]', NULL, ?, ?)`,
      [id, goal, source, now, now],
      (err) => (err ? reject(err) : resolve())
    );
  });
  return id;
}

async function updateWorkflowStep(id, updates) {
  const db = getDB();
  const now = new Date().toISOString();
  const fields = [];
  const values = [];
  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
  if (updates.plan !== undefined) { fields.push('plan = ?'); values.push(JSON.stringify(updates.plan)); }
  if (updates.agent_logs !== undefined) { fields.push('agent_logs = ?'); values.push(JSON.stringify(updates.agent_logs)); }
  if (updates.final_output !== undefined) { fields.push('final_output = ?'); values.push(JSON.stringify(updates.final_output)); }
  fields.push('updated_at = ?');
  values.push(now, id);
  await new Promise((resolve, reject) => {
    db.run(`UPDATE workflows SET ${fields.join(', ')} WHERE id = ?`, values, (err) => (err ? reject(err) : resolve()));
  });
}

async function appendLog(id, log) {
  const workflow = await getWorkflow(id);
  const logs = workflow?.agent_logs || [];
  logs.push({ ...log, timestamp: new Date().toISOString() });
  await updateWorkflowStep(id, { agent_logs: logs });
}

async function getWorkflow(id) {
  const db = getDB();
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM workflows WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve(null);
      resolve({
        ...row,
        plan: JSON.parse(row.plan || '[]'),
        agent_logs: JSON.parse(row.agent_logs || '[]'),
        final_output: row.final_output ? JSON.parse(row.final_output) : null,
      });
    });
  });
}

async function listWorkflows(limit = 20) {
  const db = getDB();
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM workflows ORDER BY created_at DESC LIMIT ?', [limit], (err, rows) => {
      if (err) return reject(err);
      resolve((rows || []).map(r => ({
        ...r,
        plan: JSON.parse(r.plan || '[]'),
        agent_logs: JSON.parse(r.agent_logs || '[]'),
        final_output: r.final_output ? JSON.parse(r.final_output) : null,
      })));
    });
  });
}

module.exports = { createWorkflow, updateWorkflowStep, appendLog, getWorkflow, listWorkflows };
