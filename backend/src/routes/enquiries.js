const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

const { syncEnquiriesSheet } = require('../services/syncEnquiriesSheet');
const { syncEnquiryFollowupsSheet } = require('../services/syncEnquiryFollowupsSheet');
const { syncEnquiryDailyCountSheet } = require('../services/syncEnquiryDailyCountSheet');

const VALID_MODES = ['call', 'walk_in', 'online', 'referral'];
const VALID_STATUSES = ['new', 'followup', 'converted', 'not_interested', 'closed', 'daily_followup'];
const VALID_LIST_TYPES = ['daily_followup', 'batch_allocated', 'not_interested'];
const VALID_TICKET_STATUSES = ['open', 'closed', 'pending'];
const VALID_BATCH_STATUS = ['available', 'full', 'upcoming'];

const toBool = (v) =>
  v === true || v === 'true' || v === 'yes' || v === 1 || v === '1';

const nullIfEmpty = (v) => {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string' && !v.trim()) return null;
  return v;
};

const toTrimmedOrNull = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s : null;
};

const toNumberOrNull = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const normalizeDate = (v) => {
  if (!v) return new Date();
  if (typeof v === 'string' && v.includes('T')) return v.split('T')[0];
  return v;
};

const normalizePlainDate = (value) => {
  if (!value) return new Date().toISOString().split('T')[0];

  if (typeof value === 'string') {
    const v = value.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

    if (/^\d{2}-\d{2}-\d{4}$/.test(v)) {
      const [dd, mm, yyyy] = v.split('-');
      return `${yyyy}-${mm}-${dd}`;
    }

    if (v.includes('T')) return v.split('T')[0];
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().split('T')[0];
  }

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// GET /api/enquiries
router.get('/', auth, async (req, res) => {
  try {
    const { status, trainer_id, list_type, search, month, year } = req.query;

    let query = `
      SELECT e.*, t.name AS assigned_trainer_name
      FROM enquiries e
      LEFT JOIN trainers t ON e.assigned_trainer_id = t.id
      WHERE 1=1
    `;
    const params = [];
    let i = 1;

    if (status) {
      query += ` AND e.status = $${i++}`;
      params.push(status);
    }

    if (trainer_id) {
      query += ` AND e.assigned_trainer_id = $${i++}`;
      params.push(trainer_id);
    }

    if (list_type) {
      query += ` AND e.list_type = $${i++}`;
      params.push(list_type);
    }

    if (search) {
      query += ` AND (
        e.name ILIKE $${i}
        OR e.contact ILIKE $${i}
        OR COALESCE(e.email, '') ILIKE $${i}
        OR COALESCE(e.course_enquired_for, '') ILIKE $${i}
        OR COALESCE(e.course_suggested, '') ILIKE $${i}
      )`;
      params.push(`%${search}%`);
      i++;
    }

    if (month && year) {
      query += ` AND EXTRACT(MONTH FROM e.date) = $${i++} AND EXTRACT(YEAR FROM e.date) = $${i++}`;
      params.push(month, year);
    }

    query += ` ORDER BY e.created_at DESC, e.id DESC`;

    const result = await pool.query(query, params);
    res.json({ enquiries: result.rows });
  } catch (err) {
    console.error('GET /enquiries error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch enquiries' });
  }
});

// GET /api/enquiries/count/daily
router.get('/count/daily', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM enquiry_daily_count ORDER BY date DESC LIMIT 30`
    );
    res.json({ counts: result.rows });
  } catch (err) {
    console.error('GET /enquiries/count/daily error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch daily counts' });
  }
});

// POST /api/enquiries/count/daily
router.post('/count/daily', auth, async (req, res) => {
  try {
    const {
      countdate,
      totalcount,
      notes,
      date,
      call_enquiries,
      walk_in_enquiries,
      course_suggested_by_us,
      remarks,
    } = req.body;

    const rawDate = countdate || date;
    const finalDate = normalizePlainDate(rawDate);

    const callCount = toNumberOrNull(call_enquiries) ?? 0;
    const walkInCount = toNumberOrNull(walk_in_enquiries) ?? 0;
    const finalRemarks = toTrimmedOrNull(remarks ?? notes);
    const courseSuggestedText = toTrimmedOrNull(course_suggested_by_us);
    const providedTotal = toNumberOrNull(totalcount);
    const insertTotal = providedTotal !== null ? providedTotal : callCount + walkInCount;

    const result = await pool.query(
      `INSERT INTO enquiry_daily_count
        (date, call_enquiries, walk_in_enquiries, total_enquiries, course_suggested_by_us, remarks)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (date) DO UPDATE SET
         call_enquiries = COALESCE(enquiry_daily_count.call_enquiries, 0) + COALESCE(EXCLUDED.call_enquiries, 0),
         walk_in_enquiries = COALESCE(enquiry_daily_count.walk_in_enquiries, 0) + COALESCE(EXCLUDED.walk_in_enquiries, 0),
         total_enquiries =
           (COALESCE(enquiry_daily_count.call_enquiries, 0) + COALESCE(EXCLUDED.call_enquiries, 0)) +
           (COALESCE(enquiry_daily_count.walk_in_enquiries, 0) + COALESCE(EXCLUDED.walk_in_enquiries, 0)),
         course_suggested_by_us = CASE
           WHEN EXCLUDED.course_suggested_by_us IS NOT NULL AND EXCLUDED.course_suggested_by_us <> '' THEN
             CASE
               WHEN enquiry_daily_count.course_suggested_by_us IS NULL OR enquiry_daily_count.course_suggested_by_us = '' THEN EXCLUDED.course_suggested_by_us
               ELSE enquiry_daily_count.course_suggested_by_us || '; ' || EXCLUDED.course_suggested_by_us
             END
           ELSE enquiry_daily_count.course_suggested_by_us
         END,
         remarks = CASE
           WHEN EXCLUDED.remarks IS NOT NULL AND EXCLUDED.remarks <> '' THEN
             CASE
               WHEN enquiry_daily_count.remarks IS NULL OR enquiry_daily_count.remarks = '' THEN EXCLUDED.remarks
               ELSE enquiry_daily_count.remarks || '; ' || EXCLUDED.remarks
             END
           ELSE enquiry_daily_count.remarks
         END,
         updated_at = NOW()
       RETURNING *`,
      [
        finalDate,
        callCount,
        walkInCount,
        insertTotal,
        courseSuggestedText,
        finalRemarks,
      ]
    );

    await syncEnquiryDailyCountSheet();

    res.status(201).json({ message: 'Daily count saved', count: result.rows[0] });
  } catch (err) {
    console.error('POST /enquiries/count/daily error:', err);
    res.status(500).json({ error: err.message || 'Failed to save daily count' });
  }
});

// GET /api/enquiries/:id/followups
router.get('/:id/followups', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM enquiry_followups
       WHERE enquiry_id = $1
       ORDER BY followup_date DESC, id DESC`,
      [req.params.id]
    );

    res.json({ followups: result.rows });
  } catch (err) {
    console.error('GET /enquiries/:id/followups error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch followup history' });
  }
});

// POST /api/enquiries/:id/followup
router.post('/:id/followup', auth, async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      followup_date,
      remarks,
      next_followup_date,
      ticket_status,
      last_response,
      call_picked,
      details_pitched,
      batch_status,
    } = req.body;

    await client.query('BEGIN');

    const enquiryResult = await client.query(
      `SELECT id, status FROM enquiries WHERE id = $1`,
      [req.params.id]
    );

    if (enquiryResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Enquiry not found' });
    }

    const countResult = await client.query(
      `SELECT COUNT(*) FROM enquiry_followups WHERE enquiry_id = $1`,
      [req.params.id]
    );
    const attemptNumber = parseInt(countResult.rows[0].count, 10) + 1;

    const finalTicketStatus = VALID_TICKET_STATUSES.includes(ticket_status)
      ? ticket_status
      : 'open';

    const finalBatchStatus = batch_status && VALID_BATCH_STATUS.includes(batch_status)
      ? batch_status
      : null;

    const result = await client.query(
      `INSERT INTO enquiry_followups
        (
          enquiry_id,
          followup_date,
          call_picked,
          last_response,
          ticket_status,
          details_pitched,
          call_attempt_number,
          remarks,
          batch_status,
          next_followup_date
        )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        req.params.id,
        normalizeDate(followup_date),
        toBool(call_picked),
        toTrimmedOrNull(last_response),
        finalTicketStatus,
        toBool(details_pitched),
        attemptNumber,
        toTrimmedOrNull(remarks),
        finalBatchStatus,
        next_followup_date ? normalizeDate(next_followup_date) : null,
      ]
    );

    let mappedEnquiryStatus = 'followup';

    if (finalTicketStatus === 'closed') {
      mappedEnquiryStatus = 'closed';
    } else if (finalTicketStatus === 'pending') {
      mappedEnquiryStatus = 'followup';
    } else if (finalTicketStatus === 'open') {
      mappedEnquiryStatus = 'followup';
    }

    await client.query(
      `UPDATE enquiries
       SET status = $1, updated_at = NOW()
       WHERE id = $2`,
      [mappedEnquiryStatus, req.params.id]
    );

    await client.query('COMMIT');

    await syncEnquiryFollowupsSheet();
    await syncEnquiriesSheet();

    res.status(201).json({ message: 'Followup logged', followup: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /enquiries/:id/followup error:', err);
    res.status(500).json({ error: err.message || 'Failed to log followup' });
  } finally {
    client.release();
  }
});

// GET /api/enquiries/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, t.name AS assigned_trainer_name
       FROM enquiries e
       LEFT JOIN trainers t ON e.assigned_trainer_id = t.id
       WHERE e.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }

    res.json({ enquiry: result.rows[0] });
  } catch (err) {
    console.error('GET /enquiries/:id error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch enquiry' });
  }
});

// POST /api/enquiries
router.post('/', auth, async (req, res) => {
  try {
    const {
      date,
      name,
      contact,
      email,
      course_enquired_for,
      course_suggested,
      enquiry_mode,
      source,
      referred_by,
      list_type,
      status,
      assigned_trainer_id,
      notes,
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Candidate name is required' });
    }

    const result = await pool.query(
      `INSERT INTO enquiries
        (
          date,
          name,
          contact,
          email,
          course_enquired_for,
          course_suggested,
          enquiry_mode,
          source,
          referred_by,
          list_type,
          status,
          assigned_trainer_id,
          notes
        )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        normalizeDate(date),
        String(name).trim(),
        toTrimmedOrNull(contact),
        toTrimmedOrNull(email),
        toTrimmedOrNull(course_enquired_for),
        toTrimmedOrNull(course_suggested),
        VALID_MODES.includes(enquiry_mode) ? enquiry_mode : 'call',
        toTrimmedOrNull(source),
        toTrimmedOrNull(referred_by),
        VALID_LIST_TYPES.includes(list_type) ? list_type : 'daily_followup',
        VALID_STATUSES.includes(status) ? status : 'new',
        nullIfEmpty(assigned_trainer_id),
        toTrimmedOrNull(notes),
      ]
    );

    await syncEnquiriesSheet();

    res.status(201).json({ message: 'Enquiry saved', enquiry: result.rows[0] });
  } catch (err) {
    console.error('POST /enquiries error:', err);
    res.status(500).json({ error: err.message || 'Failed to save enquiry' });
  }
});

// PUT /api/enquiries/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      date,
      name,
      contact,
      email,
      course_enquired_for,
      course_suggested,
      enquiry_mode,
      source,
      referred_by,
      list_type,
      status,
      assigned_trainer_id,
      notes,
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Candidate name is required' });
    }

    const result = await pool.query(
      `UPDATE enquiries
       SET
         date = $1,
         name = $2,
         contact = $3,
         email = $4,
         course_enquired_for = $5,
         course_suggested = $6,
         enquiry_mode = $7,
         source = $8,
         referred_by = $9,
         list_type = $10,
         status = $11,
         assigned_trainer_id = $12,
         notes = $13,
         updated_at = NOW()
       WHERE id = $14
       RETURNING *`,
      [
        normalizeDate(date),
        String(name).trim(),
        toTrimmedOrNull(contact),
        toTrimmedOrNull(email),
        toTrimmedOrNull(course_enquired_for),
        toTrimmedOrNull(course_suggested),
        VALID_MODES.includes(enquiry_mode) ? enquiry_mode : 'call',
        toTrimmedOrNull(source),
        toTrimmedOrNull(referred_by),
        VALID_LIST_TYPES.includes(list_type) ? list_type : 'daily_followup',
        VALID_STATUSES.includes(status) ? status : 'new',
        nullIfEmpty(assigned_trainer_id),
        toTrimmedOrNull(notes),
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }

    await syncEnquiriesSheet();

    res.json({ message: 'Enquiry updated', enquiry: result.rows[0] });
  } catch (err) {
    console.error('PUT /enquiries/:id error:', err);
    res.status(500).json({ error: err.message || 'Failed to update enquiry' });
  }
});

// DELETE /api/enquiries/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM enquiries WHERE id = $1 RETURNING id, name`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }

    await syncEnquiriesSheet();
    await syncEnquiryFollowupsSheet();

    res.json({ message: 'Enquiry deleted', enquiry: result.rows[0] });
  } catch (err) {
    console.error('DELETE /enquiries/:id error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete enquiry' });
  }
});

// POST /api/enquiries/:id/convert
router.post('/:id/convert', auth, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      candidate_name,
      phone,
      email,
      whatsapp_number,
      batch_id,
      total_fee,
      payment_mode,
      initial_payment,
      reference_no,
      notes,
      joined_date,
      status,
      certificate_no,
      resolution_note,
    } = req.body;

    if (!candidate_name || !String(candidate_name).trim()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Candidate name is required' });
    }

    if (!phone || !String(phone).trim()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Phone is required' });
    }

    if (!batch_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Batch is required' });
    }

    const totalFeeParsed = toNumberOrNull(total_fee);
    const initialPaymentParsed = toNumberOrNull(initial_payment);

    const totalFeeNum = totalFeeParsed !== null ? totalFeeParsed : 0;
    const initialPaymentNum = initialPaymentParsed !== null ? initialPaymentParsed : 0;

    if (totalFeeNum < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Total fee cannot be negative' });
    }

    if (initialPaymentNum < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Initial payment cannot be negative' });
    }

    if (totalFeeNum > 0 && initialPaymentNum > totalFeeNum) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Initial payment cannot be greater than total fee' });
    }

    const enqResult = await client.query(
      `SELECT * FROM enquiries WHERE id = $1`,
      [req.params.id]
    );

    if (enqResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Enquiry not found' });
    }

    if (enqResult.rows[0].student_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Already converted to student' });
    }

    const studentResult = await client.query(
      `INSERT INTO students
        (
          candidate_name,
          phone,
          email,
          whatsapp_number,
          certificate_no,
          batch_id,
          total_fee,
          payment_mode,
          joined_date,
          status,
          notes,
          resolution_note
        )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        String(candidate_name).trim(),
        toTrimmedOrNull(phone),
        toTrimmedOrNull(email),
        toTrimmedOrNull(whatsapp_number),
        toTrimmedOrNull(certificate_no),
        batch_id,
        totalFeeNum,
        toTrimmedOrNull(payment_mode) || 'cash',
        nullIfEmpty(joined_date) || new Date(),
        toTrimmedOrNull(status) || 'active',
        toTrimmedOrNull(notes),
        toTrimmedOrNull(resolution_note),
      ]
    );

    const student = studentResult.rows[0];

    if (initialPaymentNum > 0) {
      await client.query(
        `INSERT INTO fee_payments
          (student_id, amount, payment_mode, reference_no, notes, payment_date)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          student.id,
          initialPaymentNum,
          toTrimmedOrNull(payment_mode) || 'cash',
          toTrimmedOrNull(reference_no),
          toTrimmedOrNull(notes),
          nullIfEmpty(joined_date) || new Date(),
        ]
      );
    }

    await client.query(
      `UPDATE enquiries
       SET student_id = $1, status = 'converted', updated_at = NOW()
       WHERE id = $2`,
      [student.id, req.params.id]
    );

    await client.query('COMMIT');

    await syncEnquiriesSheet();

    res.status(201).json({
      success: true,
      message: 'Enquiry converted to student successfully!',
      student,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /enquiries/:id/convert error:', err);

    if (err.code === '23505') {
      return res.status(400).json({
        error: 'Phone, email, or certificate number already exists',
      });
    }

    if (err.code === '23503') {
      return res.status(400).json({
        error: 'Invalid batch or related record reference',
      });
    }

    res.status(500).json({ error: err.message || 'Failed to convert enquiry' });
  } finally {
    client.release();
  }
});

module.exports = router;