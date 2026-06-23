const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

console.log('ATTENDANCE ROUTE FILE LOADED');

const OFFICE_IP_PREFIXES = (
  process.env.OFFICE_WIFI_IP_PREFIX || '49.206.'
)
  .split(',')
  .map((ip) => ip.trim())
  .filter(Boolean);

function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  let ip = forwarded
    ? forwarded.split(',')[0].trim()
    : req.socket.remoteAddress;

  if (typeof ip === 'string') {
    ip = ip.replace(/^::ffff:/, '');
  }

  return ip;
}

function isOfficeWifi(clientIP) {
  if (!clientIP || typeof clientIP !== 'string') return false;
  return OFFICE_IP_PREFIXES.some((prefix) => clientIP.startsWith(prefix));
}

async function getTrainerIdFromToken(req, res) {
  const userId = req.user?.id;
  console.log('ATTENDANCE DEBUG userId:', userId);

  if (!userId) {
    res.status(401).json({
      success: false,
      message: 'User not found in token.',
    });
    return null;
  }

  try {
    const result = await pool.query(
      `SELECT id, user_id, name
       FROM trainers
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );

    console.log('ATTENDANCE DEBUG trainer rows:', result.rows);

    if (result.rows.length === 0) {
      res.status(403).json({
        success: false,
        message: 'Trainer record not found for this user.',
      });
      return null;
    }

    const trainerId = result.rows[0].id;

    const verifyTrainer = await pool.query(
      `SELECT id
       FROM trainers
       WHERE id = $1
       LIMIT 1`,
      [trainerId]
    );

    if (verifyTrainer.rows.length === 0) {
      res.status(403).json({
        success: false,
        message: 'Resolved trainer ID does not exist in trainers table.',
      });
      return null;
    }

    console.log('ATTENDANCE DEBUG resolved trainerId:', trainerId);
    return trainerId;
  } catch (err) {
    console.error('Trainer lookup error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve trainer account.',
    });
    return null;
  }
}

function checkOfficeWifi(req, res, clientIP) {
  const matched = isOfficeWifi(clientIP);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Client IP        :', clientIP);
  console.log('Allowed prefixes :', OFFICE_IP_PREFIXES);
  console.log('Prefix match     :', matched);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (!matched) {
    res.status(403).json({
      success: false,
      message: `Not on office WiFi. Your IP: ${clientIP}. Expected prefix: ${OFFICE_IP_PREFIXES.join(', ')}`,
    });
    return false;
  }

  return true;
}

function getISTDateString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

// ─── TEST ROUTE (no auth) ─────────────────────────────────
// GET /api/attendance/my-ip
router.get('/my-ip', (req, res) => {
  const ip = getClientIP(req);

  res.json({
    detected_ip: ip,
    allowed_prefixes: OFFICE_IP_PREFIXES,
    is_office_wifi: isOfficeWifi(ip),
    raw_forwarded: req.headers['x-forwarded-for'] || 'none',
    raw_socket: req.socket.remoteAddress,
  });
});

// ─── CHECK-IN ─────────────────────────────────────────────
// POST /api/attendance/checkin
router.post('/checkin', authMiddleware, async (req, res) => {
  const trainerId = await getTrainerIdFromToken(req, res);
  if (!trainerId) return;

  const clientIP = req.body.clientIP || getClientIP(req);
  if (!checkOfficeWifi(req, res, clientIP)) return;

  const today = getISTDateString();

  try {
    console.log('ATTENDANCE DEBUG inserting:', {
      trainerId,
      today,
      clientIP,
      userFromToken: req.user,
    });

    const verifyTrainer = await pool.query(
      `SELECT id, user_id, name
       FROM trainers
       WHERE id = $1
       LIMIT 1`,
      [trainerId]
    );

    console.log('ATTENDANCE DEBUG verify trainer before insert:', verifyTrainer.rows);

    if (verifyTrainer.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Trainer not found for trainer_id ${trainerId}`,
      });
    }

    const dbCheck = await pool.query(
      `select current_database(), current_schema()`
    );
    console.log('ATTENDANCE DEBUG db:', dbCheck.rows);

    const existing = await pool.query(
      `SELECT id, trainer_id, date, check_in, check_out, status
       FROM attendance
       WHERE trainer_id = $1 AND date = $2
       LIMIT 1`,
      [trainerId, today]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Already checked in today.',
      });
    }

    const result = await pool.query(
      `INSERT INTO attendance (trainer_id, date, check_in, ip_address, status)
       VALUES ($1, $2, NOW(), $3, 'present')
       RETURNING *`,
      [trainerId, today, clientIP]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Check-in error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── CHECK-OUT ────────────────────────────────────────────
// POST /api/attendance/checkout
router.post('/checkout', authMiddleware, async (req, res) => {
  const trainerId = await getTrainerIdFromToken(req, res);
  if (!trainerId) return;

  const clientIP = req.body.clientIP || getClientIP(req);
  if (!checkOfficeWifi(req, res, clientIP)) return;

  const today = getISTDateString();

  try {
    console.log('ATTENDANCE DEBUG checkout:', {
      trainerId,
      today,
      clientIP,
      userFromToken: req.user,
    });

    const result = await pool.query(
      `UPDATE attendance
       SET check_out = NOW()
       WHERE trainer_id = $1
         AND date = $2
         AND check_out IS NULL
       RETURNING *`,
      [trainerId, today]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active check-in found for today.',
      });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Check-out error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── TODAY STATUS ─────────────────────────────────────────
// GET /api/attendance/today-status
router.get('/today-status', authMiddleware, async (req, res) => {
  const trainerId = await getTrainerIdFromToken(req, res);
  if (!trainerId) return;

  const today = getISTDateString();

  try {
    const result = await pool.query(
      `SELECT *
       FROM attendance
       WHERE trainer_id = $1 AND date = $2
       ORDER BY check_in DESC
       LIMIT 1`,
      [trainerId, today]
    );

    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error('Today status error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── MY RECORDS (THIS MONTH) ──────────────────────────────
// GET /api/attendance/my
router.get('/my', authMiddleware, async (req, res) => {
  const trainerId = await getTrainerIdFromToken(req, res);
  if (!trainerId) return;

  const { month, year } = req.query;

  try {
    const result = await pool.query(
      `SELECT *
       FROM attendance
       WHERE trainer_id = $1
         AND EXTRACT(MONTH FROM date) = COALESCE(
           $2::int,
           EXTRACT(MONTH FROM (NOW() AT TIME ZONE 'Asia/Kolkata'))
         )
         AND EXTRACT(YEAR FROM date) = COALESCE(
           $3::int,
           EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'Asia/Kolkata'))
         )
       ORDER BY date DESC, check_in DESC`,
      [trainerId, month || null, year || null]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('My records error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── ESCALATIONS AGAINST ME ───────────────────────────────
// GET /api/attendance/escalations/against-me
router.get('/escalations/against-me', authMiddleware, async (req, res) => {
  const trainerId = await getTrainerIdFromToken(req, res);
  if (!trainerId) return;

  try {
    const result = await pool.query(
      `SELECT *
       FROM escalations
       WHERE trainer_id = $1
       ORDER BY created_at DESC`,
      [trainerId]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Escalations error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;