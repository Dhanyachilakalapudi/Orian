const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'orian-secret-change-in-production';

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const queryToken = req.query.token;
  const raw = header?.startsWith('Bearer ') ? header.slice(7) : queryToken;
  if (!raw) return res.status(401).json({ error: 'unauthorized' });
  try {
    req.user = jwt.verify(raw, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'invalid token' });
  }
}

module.exports = { requireAuth };
