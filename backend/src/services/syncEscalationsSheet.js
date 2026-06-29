const { google } = require('googleapis');
const path = require('path');
const pool = require('../db');

const SHEET_NAME = 'Escalations';

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toISOString().split('T')[0];
  } catch {
    return '';
  }
}

function formatDateTime(value) {
  if (!value) return '';
  try {
    return new Date(value).toISOString().replace('T', ' ').split('.')[0];
  } catch {
    return '';
  }
}

async function getSheetsClient() {
  let credentials;

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

    if (credentials.private_key) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
    const keyPath = path.resolve(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE);
    credentials = require(keyPath);
  } else {
    throw new Error('Google service account credentials are missing');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

async function syncEscalationsSheet() {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SPREADSHEET_ID is missing in environment');
  }

  const sheets = await getSheetsClient();

  const result = await pool.query(`
    SELECT
      e.id AS db_id,
      e.trainer_id,
      t.name AS trainer_name,
      e.description,
      e.reported_by,
      e.escalation_date,
      e.no_of_count,
      e.status,
      e.resolution_note,
      e.created_at,
      e.updated_at
    FROM escalations e
    LEFT JOIN trainers t ON e.trainer_id = t.id
    ORDER BY e.escalation_date DESC, e.created_at DESC
  `);

  const headers = [
    'db_id',
    'trainer_id',
    'trainer_name',
    'description',
    'reported_by',
    'escalation_date',
    'no_of_count',
    'status',
    'resolution_note',
    'created_at',
    'updated_at',
  ];

  const rows = result.rows.map((row) => [
    row.db_id || '',
    row.trainer_id || '',
    row.trainer_name || '',
    row.description || '',
    row.reported_by || '',
    formatDate(row.escalation_date),
    row.no_of_count ?? 1,
    row.status || 'open',
    row.resolution_note || '',
    formatDateTime(row.created_at),
    formatDateTime(row.updated_at),
  ]);

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${SHEET_NAME}!A:K`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [headers, ...rows],
    },
  });

  return {
    success: true,
    message: 'Escalations sheet synced successfully',
    count: rows.length,
    sheet: SHEET_NAME,
  };
}

module.exports = { syncEscalationsSheet };