const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { syncWaterCanSheet } = require('../services/syncWaterCanSheet');

function isUUID(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function getTodayLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizePlainDate(value) {
  if (!value) return getTodayLocalDate();

  if (typeof value === 'string') {
    const v = value.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

    if (v.includes('T')) return v.split('T')[0];

    if (/^\d{2}-\d{2}-\d{4}$/.test(v)) {
      const [dd, mm, yyyy] = v.split('-');
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return getTodayLocalDate();

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// GET /api/watercan
router.get('/', auth, async (req, res) => {
  try {
    const { month, year } = req.query;

    let query = `
      SELECT
        id,
        date::text AS date,
        no_of_ro_water,
        no_of_bisleri_water,
        total_water_cans,
        amount,
        paid_or_balance,
        balance,
        bisleri_price,
        ro_price,
        created_at,
        updated_at
      FROM water_can_details
      WHERE 1=1
    `;

    const params = [];
    let i = 1;

    if (month && year) {
      query += ` AND EXTRACT(MONTH FROM date) = $${i++}
                 AND EXTRACT(YEAR FROM date) = $${i++}`;
      params.push(Number(month), Number(year));
    }

    query += ` ORDER BY date DESC, created_at DESC`;

    const result = await pool.query(query, params);

    const now = new Date();
    const summaryMonth = Number(month) || now.getMonth() + 1;
    const summaryYear = Number(year) || now.getFullYear();

    const summary = await pool.query(
      `
        SELECT
          COALESCE(SUM(total_water_cans), 0) AS total_cans,
          COALESCE(SUM(amount), 0) AS total_amount,
          COALESCE(SUM(CASE WHEN paid_or_balance = 'paid' THEN amount ELSE 0 END), 0) AS paid_amount,
          COALESCE(SUM(balance), 0) AS total_balance
        FROM water_can_details
        WHERE EXTRACT(MONTH FROM date) = $1
          AND EXTRACT(YEAR FROM date) = $2
      `,
      [summaryMonth, summaryYear]
    );

    return res.json({
      entries: result.rows,
      summary: summary.rows[0],
    });
  } catch (err) {
    console.error('GET /watercan error:', err);
    return res.status(500).json({ error: 'Failed to fetch water can data' });
  }
});

// POST /api/watercan
// Same date -> merge into existing row
router.post('/', auth, async (req, res) => {
  try {
    const {
      date,
      no_of_ro_water,
      no_of_bisleri_water,
      paid_or_balance,
      balance,
    } = req.body;

    const finalDate = normalizePlainDate(date);
    const ro = Number(no_of_ro_water) || 0;
    const bis = Number(no_of_bisleri_water) || 0;
    const roPrice = 40;
    const bisPrice = 120;
    const total = ro + bis;
    const amount = (ro * roPrice) + (bis * bisPrice);
    const finalStatus = paid_or_balance || 'paid';
    const finalBalance = Number(balance) || 0;

    const result = await pool.query(
      `
        INSERT INTO water_can_details
          (
            date,
            no_of_ro_water,
            no_of_bisleri_water,
            total_water_cans,
            amount,
            paid_or_balance,
            balance,
            ro_price,
            bisleri_price
          )
        VALUES ($1, $2, $3, $4, $5, $6::payment_status, $7, $8, $9)
        ON CONFLICT (date)
        DO UPDATE SET
          no_of_ro_water = water_can_details.no_of_ro_water + EXCLUDED.no_of_ro_water,
          no_of_bisleri_water = water_can_details.no_of_bisleri_water + EXCLUDED.no_of_bisleri_water,
          total_water_cans = water_can_details.total_water_cans + EXCLUDED.total_water_cans,
          amount = water_can_details.amount + EXCLUDED.amount,
          paid_or_balance = CASE
            WHEN EXCLUDED.paid_or_balance = 'balance'::payment_status
                 OR water_can_details.balance + EXCLUDED.balance > 0
              THEN 'balance'::payment_status
            ELSE 'paid'::payment_status
          END,
          balance = water_can_details.balance + EXCLUDED.balance,
          ro_price = EXCLUDED.ro_price,
          bisleri_price = EXCLUDED.bisleri_price,
          updated_at = NOW()
        RETURNING
          id,
          date::text AS date,
          no_of_ro_water,
          no_of_bisleri_water,
          total_water_cans,
          amount,
          paid_or_balance,
          balance,
          bisleri_price,
          ro_price,
          created_at,
          updated_at
      `,
      [
        finalDate,
        ro,
        bis,
        total,
        amount,
        finalStatus,
        finalBalance,
        roPrice,
        bisPrice,
      ]
    );

    try {
      await syncWaterCanSheet();
    } catch (syncErr) {
      console.error('Water can auto-sync failed after create:', syncErr.message || syncErr);
    }

    return res.status(201).json({
      message: 'Water log saved',
      entry: result.rows[0],
    });
  } catch (err) {
    console.error('POST /watercan error:', err);
    return res.status(500).json({ error: 'Failed to save water log' });
  }
});

// PUT /api/watercan/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      date,
      no_of_ro_water,
      no_of_bisleri_water,
      paid_or_balance,
      balance,
    } = req.body;

    if (!isUUID(id)) {
      return res.status(400).json({ error: 'Invalid water log id' });
    }

    const finalDate = date ? normalizePlainDate(date) : null;
    const ro = Number(no_of_ro_water) || 0;
    const bis = Number(no_of_bisleri_water) || 0;
    const total = ro + bis;
    const roPrice = 40;
    const bisPrice = 120;
    const amount = (ro * roPrice) + (bis * bisPrice);

    const result = await pool.query(
      `
        UPDATE water_can_details
        SET
          date = COALESCE($1, date),
          no_of_ro_water = $2,
          no_of_bisleri_water = $3,
          total_water_cans = $4,
          amount = $5,
          paid_or_balance = COALESCE($6::payment_status, paid_or_balance),
          balance = COALESCE($7, balance),
          ro_price = $8,
          bisleri_price = $9,
          updated_at = NOW()
        WHERE id = $10
        RETURNING
          id,
          date::text AS date,
          no_of_ro_water,
          no_of_bisleri_water,
          total_water_cans,
          amount,
          paid_or_balance,
          balance,
          bisleri_price,
          ro_price,
          created_at,
          updated_at
      `,
      [
        finalDate,
        ro,
        bis,
        total,
        amount,
        paid_or_balance || null,
        balance ?? null,
        roPrice,
        bisPrice,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Water log entry not found' });
    }

    try {
      await syncWaterCanSheet();
    } catch (syncErr) {
      console.error('Water can auto-sync failed after update:', syncErr.message || syncErr);
    }

    return res.json({
      message: 'Water log updated',
      entry: result.rows[0],
    });
  } catch (err) {
    console.error('PUT /watercan/:id error:', err);
    return res.status(500).json({ error: 'Failed to update water log' });
  }
});

// DELETE /api/watercan/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isUUID(id)) {
      return res.status(400).json({ error: 'Invalid water log id' });
    }

    const result = await pool.query(
      `
        DELETE FROM water_can_details
        WHERE id = $1
        RETURNING
          id,
          date::text AS date,
          no_of_ro_water,
          no_of_bisleri_water,
          total_water_cans,
          amount,
          paid_or_balance,
          balance,
          bisleri_price,
          ro_price,
          created_at,
          updated_at
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Water log entry not found' });
    }

    try {
      await syncWaterCanSheet();
    } catch (syncErr) {
      console.error('Water can auto-sync failed after delete:', syncErr.message || syncErr);
    }

    return res.json({
      message: 'Entry deleted',
      entry: result.rows[0],
    });
  } catch (err) {
    console.error('DELETE /watercan/:id error:', err);
    return res.status(500).json({ error: 'Failed to delete entry' });
  }
});

module.exports = router;