// ============================================
// SQLite Database Configuration & Functions
// ============================================
// Purpose: Handle all database operations for goals, tasks, and logs

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database file path
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/autopilot.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`[DB] Created data directory: ${dataDir}`);
}

// Database instance
let db = null;

/**
 * Initialize SQLite database and create tables if needed
 */
async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error('[DB ERROR]', err.message);
        reject(err);
        return;
      }

      console.log(`[DB] Connected to SQLite: ${dbPath}`);

      try {
        // Enable foreign keys
        db.run('PRAGMA foreign_keys = ON');

        // Create tables
        await createTables();
        console.log('[DB] All tables created/verified');

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Create all required tables
 */
async function createTables() {
  return new Promise((resolve, reject) => {
    // Goals table
    db.run(`
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        goal TEXT NOT NULL,
        description TEXT,
        source TEXT DEFAULT 'api',
        metadata TEXT,
        status TEXT DEFAULT 'queued',
        result TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `, (err) => {
      if (err) reject(err);
    });

    // Task logs table
    db.run(`
      CREATE TABLE IF NOT EXISTS task_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goalId TEXT NOT NULL,
        stage TEXT,
        message TEXT,
        metadata TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (goalId) REFERENCES goals(id)
      )
    `, (err) => {
      if (err) reject(err);
    });

    // Files table
    db.run(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        goalId TEXT NOT NULL,
        filename TEXT NOT NULL,
        filePath TEXT NOT NULL,
        fileType TEXT,
        size INTEGER,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (goalId) REFERENCES goals(id)
      )
    `, (err) => {
      if (err) reject(err);
      resolve();
    });
  });
}

/**
 * Create a new goal
 */
function createGoal(goalData) {
  return new Promise((resolve, reject) => {
    const { id, goal, description, source, metadata, status, createdAt, updatedAt } = goalData;

    db.run(
      `INSERT INTO goals (id, goal, description, source, metadata, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, goal, description || '', source || 'api', metadata || null, status || 'queued', createdAt, updatedAt],
      (err) => {
        if (err) {
          console.error('[DB ERROR]', err.message);
          reject(err);
        } else {
          console.log(`[DB] Goal created: ${id}`);
          resolve(id);
        }
      }
    );
  });
}

/**
 * Get a goal by ID
 */
function getGoal(goalId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM goals WHERE id = ?',
      [goalId],
      (err, row) => {
        if (err) {
          console.error('[DB ERROR]', err.message);
          reject(err);
        } else {
          resolve(row || null);
        }
      }
    );
  });
}

/**
 * Get all goals with pagination
 */
function getAllGoals(limit = 20, offset = 0) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM goals ORDER BY createdAt DESC LIMIT ? OFFSET ?',
      [limit, offset],
      (err, rows) => {
        if (err) {
          console.error('[DB ERROR]', err.message);
          reject(err);
        } else {
          resolve(rows || []);
        }
      }
    );
  });
}

/**
 * Get tasks by status
 */
function getTasksByStatus(status) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM goals WHERE status = ? ORDER BY createdAt DESC',
      [status],
      (err, rows) => {
        if (err) {
          console.error('[DB ERROR]', err.message);
          reject(err);
        } else {
          resolve(rows || []);
        }
      }
    );
  });
}

/**
 * Update goal status
 */
function updateGoalStatus(goalId, status, result = null) {
  return new Promise((resolve, reject) => {
    const updatedAt = new Date().toISOString();

    db.run(
      'UPDATE goals SET status = ?, result = ?, updatedAt = ? WHERE id = ?',
      [status, result ? JSON.stringify(result) : null, updatedAt, goalId],
      (err) => {
        if (err) {
          console.error('[DB ERROR]', err.message);
          reject(err);
        } else {
          console.log(`[DB] Goal ${goalId} status updated to ${status}`);
          resolve();
        }
      }
    );
  });
}

/**
 * Add a task log entry
 */
function addTaskLog(goalId, stage, message, metadata = {}) {
  return new Promise((resolve, reject) => {
    const timestamp = new Date().toISOString();

    db.run(
      'INSERT INTO task_logs (goalId, stage, message, metadata, timestamp) VALUES (?, ?, ?, ?, ?)',
      [goalId, stage, message, JSON.stringify(metadata), timestamp],
      (err) => {
        if (err) {
          console.error('[DB ERROR]', err.message);
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

/**
 * Get task logs
 */
function getTaskLogs(goalId, limit = 100, offset = 0) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM task_logs WHERE goalId = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?',
      [goalId, limit, offset],
      (err, rows) => {
        if (err) {
          console.error('[DB ERROR]', err.message);
          reject(err);
        } else {
          resolve(rows || []);
        }
      }
    );
  });
}

/**
 * Add a file record
 */
function addFile(goalId, filename, filePath, fileType, size) {
  return new Promise((resolve, reject) => {
    const id = `${goalId}-${filename}`;
    const createdAt = new Date().toISOString();

    db.run(
      'INSERT INTO files (id, goalId, filename, filePath, fileType, size, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, goalId, filename, filePath, fileType, size, createdAt],
      (err) => {
        if (err) {
          console.error('[DB ERROR]', err.message);
          reject(err);
        } else {
          resolve(id);
        }
      }
    );
  });
}

/**
 * Get files for a goal
 */
function getFiles(goalId) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM files WHERE goalId = ? ORDER BY createdAt DESC',
      [goalId],
      (err, rows) => {
        if (err) {
          console.error('[DB ERROR]', err.message);
          reject(err);
        } else {
          resolve(rows || []);
        }
      }
    );
  });
}

/**
 * Close database connection
 */
function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('[DB ERROR]', err.message);
          reject(err);
        } else {
          console.log('[DB] Database connection closed');
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  initializeDatabase,
  createGoal,
  getGoal,
  getAllGoals,
  getTasksByStatus,
  updateGoalStatus,
  addTaskLog,
  getTaskLogs,
  addFile,
  getFiles,
  closeDatabase,
};