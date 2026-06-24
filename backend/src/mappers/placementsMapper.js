function formatDateOnly(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
}

function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

function mapPlacementRow(row) {
  return [
    row.db_id ?? '',
    row.student_id ?? '',
    row.candidate_name ?? '',
    row.phone ?? '',
    row.batch_name ?? '',
    row.course_name ?? '',
    row.company_name ?? '',
    row.role_offered ?? '',
    row.placed_as ?? '',
    row.package_lpa ?? '',
    row.cooperation_mode === true ? 'TRUE' : row.cooperation_mode === false ? 'FALSE' : '',
    row.rounds_cleared ?? '',
    row.placed_status ?? '',
    formatDateOnly(row.placed_date),
    row.notes ?? '',
    formatDateTime(row.created_at),
    formatDateTime(row.updated_at),
  ];
}

module.exports = { mapPlacementRow };