const db = require('../db');
const { replaceSheetData } = require('./sheetSyncHelper');
const { mapPlacementRow } = require('../mappers/placementsMapper');

async function syncPlacementsSheet() {
  const result = await db.query(`
    SELECT
      p.id AS db_id,
      p.student_id,
      s.candidate_name,
      s.phone,
      b.batch_name,
      c.course_name,
      p.company_name,
      p.role_offered,
      p.placed_as,
      p.package_lpa,
      p.cooperation_mode,
      p.rounds_cleared,
      p.placed_status,
      p.placed_date,
      p.notes,
      p.created_at,
      p.updated_at
    FROM placements p
    LEFT JOIN students s ON s.id = p.student_id
    LEFT JOIN batches b ON b.id = s.batch_id
    LEFT JOIN courses c ON c.id = b.course_id
    ORDER BY p.placed_date DESC NULLS LAST, p.id DESC
  `);

  const rows = result.rows || [];
  const values = rows.map(mapPlacementRow);

  await replaceSheetData('Placements', values, 'Q');

  return {
    success: true,
    count: values.length,
    sheet: 'Placements',
  };
}

module.exports = { syncPlacementsSheet };