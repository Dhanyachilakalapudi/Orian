const sqlite3 = require('sqlite3').verbose();
const path = require('path');

function getDb() {
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/autopilot.db');
  return new sqlite3.Database(dbPath);
}

function saveIntegration(goalId, provider, data) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    const createdAt = new Date().toISOString();
    db.run(
      `INSERT OR REPLACE INTO integrations (goalId, provider, accessToken, refreshToken, metadata, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [goalId, provider, data.accessToken, data.refreshToken || null, JSON.stringify(data.metadata || {}), createdAt],
      (err) => { db.close(); if (err) reject(err); else resolve(); }
    );
  });
}

function getIntegration(goalId, provider) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.get(
      'SELECT * FROM integrations WHERE goalId = ? AND provider = ? ORDER BY createdAt DESC LIMIT 1',
      [goalId, provider],
      (err, row) => { db.close(); if (err) reject(err); else resolve(row || null); }
    );
  });
}

function listIntegrations(goalId) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.all(
      'SELECT provider, metadata, createdAt FROM integrations WHERE goalId = ?',
      [goalId],
      (err, rows) => { db.close(); if (err) reject(err); else resolve(rows || []); }
    );
  });
}

function deleteIntegration(goalId, provider) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.run(
      'DELETE FROM integrations WHERE goalId = ? AND provider = ?',
      [goalId, provider],
      (err) => { db.close(); if (err) reject(err); else resolve(); }
    );
  });
}

module.exports = { saveIntegration, getIntegration, listIntegrations, deleteIntegration };
