const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { syncEscalationsSheet } = require('../services/syncEscalationsSheet');

const ALLOWED_STATUSES = ['open', 'acknowledged', 'resolved'];

function isUUID(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function normalizeResolutionNote(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

router.get('/', auth, async (req, res) => {
  try {
    const { status, trainer_id, month, year } = req.query;

    let query = `
      SELECT e.*, t.name AS trainer_name
      FROM escalations e
      LEFT JOIN trainers t ON e.trainer_id = t.id
      WHERE 1 = 1
    `;
    const params = [];
    let i = 1;

    if (status) {
      query += ` AND e.status = $${i++}`;
      params.push(status);
    }

    if (trainer_id) {
      query += ` AND e.trainer_id = $${i++}`;
      params.push(trainer_id);
    }

    if (month && year) {
      query += ` AND EXTRACT(MONTH FROM e.escalation_date) = $${i++}
                 AND EXTRACT(YEAR FROM e.escalation_date) = $${i++}`;
      params.push(Number(month), Number(year));
    }

    query += ` ORDER BY e.escalation_date DESC, e.created_at DESC`;

    const result = await pool.query(query, params);
    return res.json({ escalations: result.rows });
  } catch (err) {
    console.error('GET /escalations error:', err);
    return res.status(500).json({ error: 'Failed to fetch escalations' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      escalation_date,
      trainer_id,
      description,
      no_of_count,
      status,
      resolution_note,
    } = req.body;

    if (!trainer_id || !isUUID(trainer_id)) {
      return res.status(400).json({ error: 'Valid trainer_id is required' });
    }

    if (!description || !String(description).trim()) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const finalStatus = ALLOWED_STATUSES.includes(status) ? status : 'open';

    const result = await pool.query(
      `
        INSERT INTO escalations
          (escalation_date, trainer_id, reported_by, description, no_of_count, status, resolution_note)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [
        escalation_date || new Date(),
        trainer_id,
        req.user?.name || 'You',
        String(description).trim(),
        Number(no_of_count) || 1,
        finalStatus,
        normalizeResolutionNote(resolution_note),
      ]
    );

    try {
      await syncEscalationsSheet();
    } catch (syncErr) {
      console.error('Escalations auto-sync failed after create:', syncErr.message || syncErr);
    }

    return res.status(201).json({
      message: 'Escalation reported',
      escalation: result.rows[0],
    });
  } catch (err) {
    console.error('POST /escalations error:', err);
    return res.status(500).json({ error: 'Failed to report escalation' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      escalation_date,
      trainer_id,
      description,
      no_of_count,
      status,
      resolution_note,
    } = req.body;

    if (!isUUID(id)) {
      return res.status(400).json({ error: 'Invalid escalation id' });
    }

    if (!trainer_id || !isUUID(trainer_id)) {
      return res.status(400).json({ error: 'Valid trainer_id is required' });
    }

    if (!description || !String(description).trim()) {
      return res.status(400).json({ error: 'Description is required' });
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const result = await pool.query(
      `
        UPDATE escalations
        SET
          escalation_date = $1,
          trainer_id = $2,
          description = $3,
          no_of_count = $4,
          status = $5,
          resolution_note = $6,
          updated_at = NOW()
        WHERE id = $7
        RETURNING *
      `,
      [
        escalation_date || new Date(),
        trainer_id,
        String(description).trim(),
        Number(no_of_count) || 1,
        status,
        normalizeResolutionNote(resolution_note),
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Escalation not found' });
    }

    try {
      await syncEscalationsSheet();
    } catch (syncErr) {
      console.error('Escalations auto-sync failed after update:', syncErr.message || syncErr);
    }

    return res.json({
      message: 'Escalation updated',
      escalation: result.rows[0],
    });
  } catch (err) {
    console.error('PUT /escalations/:id error:', err);
    return res.status(500).json({ error: 'Failed to update escalation' });
  }
});

router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution_note } = req.body;

    if (!isUUID(id)) {
      return res.status(400).json({ error: 'Invalid escalation id' });
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const result = await pool.query(
      `
        UPDATE escalations
        SET
          status = $1,
          resolution_note = $2,
          updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `,
      [status, normalizeResolutionNote(resolution_note), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Escalation not found' });
    }

    try {
      await syncEscalationsSheet();
    } catch (syncErr) {
      console.error('Escalations auto-sync failed after status update:', syncErr.message || syncErr);
    }

    return res.json({
      message: 'Escalation status updated',
      escalation: result.rows[0],
    });
  } catch (err) {
    console.error('PATCH /escalations/:id/status error:', err);
    return res.status(500).json({ error: 'Failed to update escalation status' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isUUID(id)) {
      return res.status(400).json({ error: 'Invalid escalation id' });
    }

    const result = await pool.query(
      `
        DELETE FROM escalations
        WHERE id = $1
        RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Escalation not found' });
    }

    try {
      await syncEscalationsSheet();
    } catch (syncErr) {
      console.error('Escalations auto-sync failed after delete:', syncErr.message || syncErr);
    }

    return res.json({
      message: 'Escalation deleted',
      escalation: result.rows[0],
    });
  } catch (err) {
    console.error('DELETE /escalations/:id error:', err);
    return res.status(500).json({ error: 'Failed to delete escalation' });
  }
});

module.exports = router;