import admin from 'firebase-admin';
import { dbOps } from '../db/operations.js';
import { ADMIN_EMAILS } from '../config.js';

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email || '',
      name: decoded.name || decoded.email || 'Anonymous',
      picture: decoded.picture || '',
    };
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const adminMiddleware = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const admins = await dbOps.getAdmins();
  const isAdmin = admins.includes(req.user.uid);
  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export const shouldAutoPromote = (email) => {
  return ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(email);
};
