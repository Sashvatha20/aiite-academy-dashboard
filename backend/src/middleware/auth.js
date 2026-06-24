const jwt = require('jsonwebtoken');
const pool = require('../db');
require('dotenv').config();

module.exports = async function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.id,
      username: decoded.username || null,
      role: decoded.role || null,
      name: decoded.name || decoded.username || 'You',
      trainerId: decoded.trainerId || null,
    };

    if (req.user.role === 'trainer') {
      const trainerRes = await pool.query(
        `SELECT id, name, user_id
         FROM trainers
         WHERE user_id = $1
         LIMIT 1`,
        [req.user.id]
      );

      req.user.trainerId = trainerRes.rows[0]?.id || req.user.trainerId || null;
      req.user.trainerName = trainerRes.rows[0]?.name || null;
    }

    return next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};