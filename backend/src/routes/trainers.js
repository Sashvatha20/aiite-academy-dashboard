const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /api/trainers
router.get('/', auth, async (req, res) => {
  try {
    const month = Number(req.query.month) || null;
    const year = Number(req.query.year) || null;

    const useMonthYear = month && year;

    const params = [];
    let monthConditionWorklog = '';
    let monthConditionEscalation = '';

    if (useMonthYear) {
      params.push(month);
      params.push(year);
      monthConditionWorklog = `
        AND EXTRACT(MONTH FROM wl.log_date) = $1
        AND EXTRACT(YEAR FROM wl.log_date) = $2
      `;
      monthConditionEscalation = `
        AND EXTRACT(MONTH FROM e.escalation_date) = $1
        AND EXTRACT(YEAR FROM e.escalation_date) = $2
      `;
    }

    const result = await pool.query(
      `
      SELECT
        t.id,
        t.name,
        t.phone,
        t.user_id,
        u.username,
        u.role,
        u.is_active,
        COALESCE(w.work_logs, 0) AS work_logs,
        COALESCE(w.total_hours, 0) AS total_hours,
        COALESCE(w.star_points, 0) AS star_points,
        COALESCE(es.open_escalations, 0) AS open_escalations
      FROM trainers t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN (
        SELECT
          wl.trainer_id,
          COUNT(*)::int AS work_logs,
          COALESCE(SUM(wl.progressive_working_hours), 0)::numeric AS total_hours,
          COALESCE(SUM(wl.star_points), 0)::numeric AS star_points
        FROM daily_work_log wl
        WHERE 1 = 1
        ${monthConditionWorklog}
        GROUP BY wl.trainer_id
      ) w ON w.trainer_id = t.id
      LEFT JOIN (
        SELECT
          e.trainer_id,
          COUNT(*) FILTER (WHERE e.status = 'open')::int AS open_escalations
        FROM escalations e
        WHERE 1 = 1
        ${monthConditionEscalation}
        GROUP BY e.trainer_id
      ) es ON es.trainer_id = t.id
      ORDER BY t.name
      `,
      params
    );

    res.json({ trainers: result.rows });
  } catch (err) {
    console.error('GET /api/trainers error:', err);
    res.status(500).json({ error: 'Failed to fetch trainers' });
  }
});

// GET /api/trainers/active
router.get('/active', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (LOWER(TRIM(t.name)))
         t.id,
         t.name,
         t.phone,
         u.username
       FROM trainers t
       JOIN users u ON t.user_id = u.id
       WHERE u.is_active = true
         AND t.name IS NOT NULL
         AND TRIM(t.name) <> ''
       ORDER BY LOWER(TRIM(t.name)), t.id ASC`
    );

    res.json({ trainers: result.rows });
  } catch (err) {
    console.error('GET /trainers/active error:', err);
    res.status(500).json({ error: 'Failed to fetch active trainers' });
  }
});

// GET /api/trainers/courses
router.get('/courses', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (LOWER(TRIM(course_name)))
         id,
         course_name,
         fee,
         duration,
         mode
       FROM courses
       WHERE course_name IS NOT NULL
         AND TRIM(course_name) <> ''
       ORDER BY LOWER(TRIM(course_name)), id ASC`
    );

    res.json({ courses: result.rows });
  } catch (err) {
    console.error('GET /api/trainers/courses error:', err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// GET /api/trainers/dashboard
router.get('/dashboard', auth, async (req, res) => {
  const trainerTableId = req.user?.trainer_id;
  const userId = req.user?.id;

  if (!trainerTableId || !userId) {
    return res.status(403).json({
      success: false,
      error: 'Trainer profile not found for this user.',
    });
  }

  try {
    const attendance = await pool.query(
      `SELECT
         COUNT(*) AS total_days,
         COUNT(*) FILTER (WHERE status = 'present') AS present,
         COUNT(*) FILTER (WHERE status = 'absent') AS absent,
         COUNT(*) FILTER (WHERE status = 'late') AS late,
         COUNT(*) FILTER (WHERE status = 'half_day') AS half_day
       FROM attendance
       WHERE trainer_id = $1
         AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM (NOW() AT TIME ZONE 'Asia/Kolkata'))
         AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'Asia/Kolkata'))`,
      [userId]
    );

    const worklog = await pool.query(
      `SELECT
         COUNT(*) AS total_logs,
         COALESCE(SUM(progressive_working_hours), 0) AS total_hours,
         COALESCE(SUM(star_points), 0) AS total_star_points
       FROM daily_work_log
       WHERE trainer_id = $1
         AND EXTRACT(MONTH FROM log_date) = EXTRACT(MONTH FROM (NOW() AT TIME ZONE 'Asia/Kolkata'))
         AND EXTRACT(YEAR FROM log_date) = EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'Asia/Kolkata'))`,
      [trainerTableId]
    );

    const batches = await pool.query(
      `SELECT
         b.id,
         b.batch_name,
         b.status,
         b.batch_start_date,
         b.batch_end_date,
         COUNT(DISTINCT s.id) AS student_count
       FROM batch_trainers bt
       JOIN batches b ON b.id = bt.batch_id
       LEFT JOIN students s ON s.batch_id = b.id
       WHERE bt.trainer_id = $1
         AND b.status = 'ongoing'
       GROUP BY b.id
       ORDER BY b.batch_start_date DESC`,
      [trainerTableId]
    );

    const escalations = await pool.query(
      `SELECT id, description, status, escalation_date, no_of_count
       FROM escalations
       WHERE trainer_id = $1
       ORDER BY escalation_date DESC
       LIMIT 5`,
      [trainerTableId]
    );

    const escCount = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'open') AS open,
         COUNT(*) FILTER (WHERE status = 'resolved') AS resolved
       FROM escalations
       WHERE trainer_id = $1`,
      [trainerTableId]
    );

    const placements = await pool.query(
      `SELECT COUNT(DISTINCT p.id) AS total_placed
       FROM placements p
       JOIN students s ON s.id = p.student_id
       JOIN batch_trainers bt ON bt.batch_id = s.batch_id
       WHERE bt.trainer_id = $1
         AND p.placed_status = 'placed'`,
      [trainerTableId]
    );

    const followups = await pool.query(
      `SELECT COUNT(DISTINCT sf.id) AS pending
       FROM student_followups sf
       JOIN students s ON s.id = sf.student_id
       JOIN batch_trainers bt ON bt.batch_id = s.batch_id
       WHERE bt.trainer_id = $1`,
      [trainerTableId]
    );

    const recentAttendance = await pool.query(
      `SELECT date, check_in, check_out, status
       FROM attendance
       WHERE trainer_id = $1
       ORDER BY date DESC, check_in DESC
       LIMIT 10`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        attendance: attendance.rows[0],
        worklog: worklog.rows[0],
        batches: batches.rows,
        escalations: escalations.rows,
        esc_counts: escCount.rows[0],
        placements: placements.rows[0],
        followups: followups.rows[0],
        recent_attendance: recentAttendance.rows,
      },
    });
  } catch (err) {
    console.error('Trainer dashboard error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/trainers
router.post('/', auth, async (req, res) => {
  const client = await pool.connect();

  try {
    const { name, phone, username, password } = req.body;

    if (!name || !phone || !username || !password) {
      return res.status(400).json({
        error: 'Name, phone, username and password are required',
      });
    }

    const cleanName = String(name).trim();
    const cleanPhone = String(phone).trim();
    const cleanUsername = String(username).toLowerCase().trim();
    const hashedPassword = await bcrypt.hash(password, 10);

    await client.query('BEGIN');

    const existingUser = await client.query(
      `SELECT id FROM users WHERE username = $1 LIMIT 1`,
      [cleanUsername]
    );

    if (existingUser.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Username already exists' });
    }

    const existingPhone = await client.query(
      `SELECT id FROM trainers WHERE phone = $1 LIMIT 1`,
      [cleanPhone]
    );

    if (existingPhone.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Phone number already exists' });
    }

    const userResult = await client.query(
      `INSERT INTO users (username, password_hash, role, is_active)
       VALUES ($1, $2, 'trainer', true)
       RETURNING id, username, role, is_active`,
      [cleanUsername, hashedPassword]
    );

    const userId = userResult.rows[0].id;

    const trainerResult = await client.query(
      `INSERT INTO trainers (name, phone, user_id)
       VALUES ($1, $2, $3)
       RETURNING id, name, phone, user_id`,
      [cleanName, cleanPhone, userId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      trainer: {
        ...trainerResult.rows[0],
        username: userResult.rows[0].username,
        role: userResult.rows[0].role,
        is_active: userResult.rows[0].is_active,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /api/trainers error:', err);

    if (err.code === '23505') {
      return res.status(400).json({
        error: 'Username or phone already exists',
        detail: err.detail,
        constraint: err.constraint,
      });
    }

    return res.status(500).json({
      error: err.message || 'Failed to create trainer',
      detail: err.detail || null,
      constraint: err.constraint || null,
      code: err.code || null,
    });
  } finally {
    client.release();
  }
});

// PUT /api/trainers/:id
router.put('/:id', auth, async (req, res) => {
  const client = await pool.connect();

  try {
    const trainerId = req.params.id;
    const { name, phone, username, password, is_active } = req.body;

    await client.query('BEGIN');

    const trainerCheck = await client.query(
      `SELECT t.id, t.user_id
       FROM trainers t
       WHERE t.id = $1
       LIMIT 1`,
      [trainerId]
    );

    if (!trainerCheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Trainer not found' });
    }

    const userId = trainerCheck.rows[0].user_id;

    if (phone !== undefined && phone !== '') {
      const cleanPhone = String(phone).trim();

      const existingPhone = await client.query(
        `SELECT id FROM trainers WHERE phone = $1 AND id <> $2 LIMIT 1`,
        [cleanPhone, trainerId]
      );

      if (existingPhone.rows.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Phone number already exists' });
      }
    }

    if (username !== undefined && username !== '') {
      const cleanUsername = String(username).toLowerCase().trim();

      const existingUser = await client.query(
        `SELECT id FROM users WHERE username = $1 AND id <> $2 LIMIT 1`,
        [cleanUsername, userId]
      );

      if (existingUser.rows.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Username already exists' });
      }
    }

    if (name !== undefined || phone !== undefined) {
      const trainerFields = [];
      const trainerValues = [];
      let idx = 1;

      if (name !== undefined) {
        trainerFields.push(`name = $${idx++}`);
        trainerValues.push(String(name).trim());
      }

      if (phone !== undefined) {
        trainerFields.push(`phone = $${idx++}`);
        trainerValues.push(String(phone).trim());
      }

      if (trainerFields.length > 0) {
        trainerValues.push(trainerId);

        await client.query(
          `UPDATE trainers SET ${trainerFields.join(', ')} WHERE id = $${idx}`,
          trainerValues
        );
      }
    }

    if (
      username !== undefined ||
      (password !== undefined && password !== '') ||
      is_active !== undefined
    ) {
      const userFields = [];
      const userValues = [];
      let idx = 1;

      if (username !== undefined && username !== '') {
        userFields.push(`username = $${idx++}`);
        userValues.push(String(username).toLowerCase().trim());
      }

      if (password !== undefined && password !== '') {
        const hashedPassword = await bcrypt.hash(password, 10);
        userFields.push(`password_hash = $${idx++}`);
        userValues.push(hashedPassword);
      }

      if (is_active !== undefined) {
        userFields.push(`is_active = $${idx++}`);
        userValues.push(Boolean(Number(is_active)));
      }

      if (userFields.length > 0) {
        userValues.push(userId);

        await client.query(
          `UPDATE users SET ${userFields.join(', ')} WHERE id = $${idx}`,
          userValues
        );
      }
    }

    const updated = await client.query(
      `SELECT t.id, t.name, t.phone, t.user_id,
              u.username, u.role, u.is_active
       FROM trainers t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = $1
       LIMIT 1`,
      [trainerId]
    );

    await client.query('COMMIT');

    res.json({ success: true, trainer: updated.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PUT /api/trainers/:id error:', err);

    if (err.code === '23505') {
      return res.status(400).json({
        error: 'Username or phone already exists',
        detail: err.detail,
        constraint: err.constraint,
      });
    }

    return res.status(500).json({
      error: err.message || 'Failed to update trainer',
      detail: err.detail || null,
      constraint: err.constraint || null,
      code: err.code || null,
    });
  } finally {
    client.release();
  }
});

module.exports = router;