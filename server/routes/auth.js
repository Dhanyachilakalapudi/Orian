const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { createUser, getUserByEmail } = require('../db/sqlite');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'orian-secret-change-in-production';

router.post('/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const existing = await getUserByEmail(email);
  if (existing) return res.status(409).json({ error: 'email already registered' });

  const hashed = await bcrypt.hash(password, 10);
  const id = uuidv4();
  await createUser({ id, email, password: hashed, name, createdAt: new Date().toISOString() });

  const token = jwt.sign({ userId: id, email }, JWT_SECRET, { expiresIn: '30d' });
  res.status(201).json({ token, user: { id, email, name } });
});

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const user = await getUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'invalid credentials' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'invalid credentials' });

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

module.exports = router;
