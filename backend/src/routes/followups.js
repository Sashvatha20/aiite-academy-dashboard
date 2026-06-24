const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

const nullIfEmpty = (v) => {
  if (v === '' || v === undefined || v === null) return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  return v;
};

const toNullableBoolean = (v) => {
  if (v === true || v === 'true' || v === 1 || v === '1') return true;
  if (v === false || v === 'false' || v === 0 || v === '0') return false;
  return null;
};

const toSafeInt = (v, fallback = 0) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
};

const validFollowupType = ['project', 'playwright', 'general'];
const validCallStatus = ['picked', 'not_picked', 'busy'];
const validPlacedStatus = ['placed', 'offer_pending', 'rejected', 'in_process'];

// GET /api/student-followups
router.get('/', auth, async (req, res) => {
  try {
    const { followup_type, student_id } = req.query;

    let query = `
      SELECT
        f.*,
        s.candidate_name,
        s.phone,
        s.batch_id,
        b.batch_name
      FROM student_followups f
      JOIN students s ON f.student_id = s.id
      LEFT JOIN batches b ON s.batch_id = b.id
      WHERE 1 = 1
    `;
    const params = [];
    let i = 1;

    if (followup_type) {
      query += ` AND f.followup_type = $${i++}`;
      params.push(followup_type);
    }

    if (student_id) {
      query += ` AND f.student_id = $${i++}`;
      params.push(student_id);
    }

    query += ` ORDER BY f.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ followups: result.rows });
  } catch (err) {
    console.error('GET /api/student-followups error:', err);
    res.status(500).json({
      error: 'Failed to fetch followups',
      detail: err.message,
    });
  }
});

// GET /api/student-followups/:studentId/history
router.get('/:studentId/history', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         f.*,
         s.candidate_name
       FROM student_followups f
       JOIN students s ON f.student_id = s.id
       WHERE f.student_id = $1
       ORDER BY f.created_at DESC`,
      [req.params.studentId]
    );

    res.json({ history: result.rows });
  } catch (err) {
    console.error('GET /api/student-followups/:studentId/history error:', err);
    res.status(500).json({
      error: 'Failed to fetch followup history',
      detail: err.message,
    });
  }
});

// POST /api/student-followups
router.post('/', auth, async (req, res) => {
  try {
    const {
      student_id,
      followup_type,
      call_status,
      last_contact_date,
      remarks,
      resume_status,
      no_of_interview_calls,
      no_of_rounds_cleared,
      interested,
      placed_status,
      resolution_note,
      wa_sent,
    } = req.body;

    if (!student_id) {
      return res.status(400).json({ error: 'Student is required' });
    }

    const studentCheck = await pool.query(
      `SELECT id FROM students WHERE id = $1 LIMIT 1`,
      [student_id]
    );

    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Selected student not found' });
    }

    const safeFollowupType = validFollowupType.includes(followup_type)
      ? followup_type
      : 'general';

    const safeCallStatus = validCallStatus.includes(call_status)
      ? call_status
      : null;

    const safePlacedStatus = validPlacedStatus.includes(placed_status)
      ? placed_status
      : null;

    const result = await pool.query(
      `INSERT INTO student_followups
        (
          student_id,
          followup_type,
          call_status,
          last_contact_date,
          remarks,
          resume_status,
          no_of_interview_calls,
          no_of_rounds_cleared,
          interested,
          placed_status,
          resolution_note,
          wa_sent
        )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        student_id,
        safeFollowupType,
        safeCallStatus,
        nullIfEmpty(last_contact_date),
        nullIfEmpty(remarks),
        nullIfEmpty(resume_status),
        toSafeInt(no_of_interview_calls, 0),
        toSafeInt(no_of_rounds_cleared, 0),
        toNullableBoolean(interested),
        safePlacedStatus,
        nullIfEmpty(resolution_note),
        toNullableBoolean(wa_sent) ?? false,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Followup saved',
      followup: result.rows[0],
    });
  } catch (err) {
    console.error('Followup save error:', err);
    res.status(500).json({
      error: 'Failed to save followup',
      detail: err.message,
    });
  }
});

// PUT /api/student-followups/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      call_status,
      last_contact_date,
      remarks,
      resume_status,
      no_of_interview_calls,
      no_of_rounds_cleared,
      interested,
      placed_status,
      resolution_note,
      wa_sent,
    } = req.body;

    const safeCallStatus =
      call_status && validCallStatus.includes(call_status) ? call_status : null;

    const safePlacedStatus =
      placed_status && validPlacedStatus.includes(placed_status)
        ? placed_status
        : null;

    const result = await pool.query(
      `UPDATE student_followups SET
        call_status = COALESCE($1, call_status),
        last_contact_date = COALESCE($2, last_contact_date),
        remarks = COALESCE($3, remarks),
        resume_status = COALESCE($4, resume_status),
        no_of_interview_calls = COALESCE($5, no_of_interview_calls),
        no_of_rounds_cleared = COALESCE($6, no_of_rounds_cleared),
        interested = COALESCE($7, interested),
        placed_status = COALESCE($8, placed_status),
        resolution_note = COALESCE($9, resolution_note),
        wa_sent = COALESCE($10, wa_sent),
        updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [
        safeCallStatus,
        nullIfEmpty(last_contact_date),
        nullIfEmpty(remarks),
        nullIfEmpty(resume_status),
        no_of_interview_calls !== undefined && no_of_interview_calls !== ''
          ? toSafeInt(no_of_interview_calls, 0)
          : null,
        no_of_rounds_cleared !== undefined && no_of_rounds_cleared !== ''
          ? toSafeInt(no_of_rounds_cleared, 0)
          : null,
        interested !== undefined && interested !== ''
          ? toNullableBoolean(interested)
          : null,
        safePlacedStatus,
        nullIfEmpty(resolution_note),
        wa_sent !== undefined && wa_sent !== ''
          ? toNullableBoolean(wa_sent)
          : null,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Followup not found' });
    }

    res.json({
      success: true,
      message: 'Followup updated',
      followup: result.rows[0],
    });
  } catch (err) {
    console.error('Followup update error:', err);
    res.status(500).json({
      error: 'Failed to update followup',
      detail: err.message,
    });
  }
});

module.exports = router;