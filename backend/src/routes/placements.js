const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { syncPlacementsSheet } = require('../services/syncPlacementsSheet');

// POST /api/placements/sync
// Keep this static route before any dynamic routes like /:id
router.post('/sync', auth, async (req, res) => {
  try {
    const result = await syncPlacementsSheet();
    return res.json({
      message: 'Placements synced successfully',
      ...result,
    });
  } catch (err) {
    console.error('POST /placements/sync error:', err);
    return res.status(500).json({
      error: 'Failed to sync placements sheet',
      details: err.message,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    });
  }
});

// GET /api/placements
router.get('/', auth, async (req, res) => {
  try {
    const { status, batch_id, search } = req.query;

    let query = `
      SELECT
        p.*,
        s.candidate_name,
        s.phone,
        b.batch_name,
        c.course_name
      FROM placements p
      JOIN students s ON p.student_id = s.id
      JOIN batches b ON s.batch_id = b.id
      JOIN courses c ON b.course_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let i = 1;

    if (status) {
      query += ` AND p.placed_status = $${i++}`;
      params.push(status);
    }

    if (batch_id) {
      query += ` AND s.batch_id = $${i++}`;
      params.push(batch_id);
    }

    if (search) {
      query += ` AND (
        s.candidate_name ILIKE $${i}
        OR p.company_name ILIKE $${i}
        OR COALESCE(p.role_offered, '') ILIKE $${i}
        OR COALESCE(p.placed_as, '') ILIKE $${i}
      )`;
      params.push(`%${search}%`);
      i++;
    }

    query += ` ORDER BY p.placed_date DESC NULLS LAST, p.id DESC`;

    const result = await pool.query(query, params);
    res.json({ placements: result.rows });
  } catch (err) {
    console.error('GET /placements error:', err);
    res.status(500).json({ error: 'Failed to fetch placements' });
  }
});

// POST /api/placements
router.post('/', auth, async (req, res) => {
  try {
    const {
      student_id,
      company_name,
      role_offered,
      placed_as,
      package_lpa,
      cooperation_mode,
      rounds_cleared,
      placed_status,
      placed_date,
      notes,
    } = req.body;

    if (!student_id) {
      return res.status(400).json({ error: 'Student is required' });
    }

    if (!company_name?.trim()) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    const result = await pool.query(
      `INSERT INTO placements
        (
          student_id,
          company_name,
          role_offered,
          placed_as,
          package_lpa,
          cooperation_mode,
          rounds_cleared,
          placed_status,
          placed_date,
          notes
        )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        student_id,
        company_name.trim(),
        role_offered || null,
        placed_as || null,
        package_lpa != null && package_lpa !== '' ? parseFloat(package_lpa) : null,
        cooperation_mode ?? false,
        rounds_cleared ?? 0,
        placed_status || 'placed',
        placed_date || new Date(),
        notes || null,
      ]
    );

    try {
      await syncPlacementsSheet();
    } catch (syncErr) {
      console.error('Placements auto-sync failed after create:', syncErr);
    }

    res.status(201).json({
      message: 'Placement logged',
      placement: result.rows[0],
    });
  } catch (err) {
    console.error('POST /placements error:', err);
    res.status(500).json({ error: err.message || 'Failed to log placement' });
  }
});

// PUT /api/placements/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      company_name,
      role_offered,
      placed_as,
      package_lpa,
      rounds_cleared,
      placed_status,
      placed_date,
      cooperation_mode,
      notes,
    } = req.body;

    const result = await pool.query(
      `UPDATE placements SET
        company_name     = COALESCE($1, company_name),
        role_offered     = COALESCE($2, role_offered),
        placed_as        = COALESCE($3, placed_as),
        package_lpa      = COALESCE($4, package_lpa),
        rounds_cleared   = COALESCE($5, rounds_cleared),
        placed_status    = COALESCE($6, placed_status),
        placed_date      = COALESCE($7, placed_date),
        cooperation_mode = COALESCE($8, cooperation_mode),
        notes            = COALESCE($9, notes),
        updated_at       = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        company_name || null,
        role_offered || null,
        placed_as || null,
        package_lpa != null && package_lpa !== '' ? parseFloat(package_lpa) : null,
        rounds_cleared ?? null,
        placed_status || null,
        placed_date || null,
        cooperation_mode ?? null,
        notes || null,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Placement not found' });
    }

    try {
      await syncPlacementsSheet();
    } catch (syncErr) {
      console.error('Placements auto-sync failed after update:', syncErr);
    }

    res.json({
      message: 'Placement updated',
      placement: result.rows[0],
    });
  } catch (err) {
    console.error('PUT /placements/:id error:', err);
    res.status(500).json({ error: err.message || 'Failed to update placement' });
  }
});

// DELETE /api/placements/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM placements
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Placement not found' });
    }

    try {
      await syncPlacementsSheet();
    } catch (syncErr) {
      console.error('Placements auto-sync failed after delete:', syncErr);
    }

    res.json({
      message: 'Placement deleted',
      placement: result.rows[0],
    });
  } catch (err) {
    console.error('DELETE /placements/:id error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete placement' });
  }
});

module.exports = router;