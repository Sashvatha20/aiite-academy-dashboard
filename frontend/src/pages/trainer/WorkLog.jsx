import { useEffect, useMemo, useState } from 'react';
import { submitLog, getMyLogs, updateLog, getLogStats } from '../../api/worklog';
import { getBatches } from '../../api/batches';
import { syncWorkLogSheet } from '../../api/sheetsSync';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const BRAND = '#1D9E75';

const styles = {
  page: { display: 'grid', gap: 16 },
  card: {
    background: '#fff',
    borderRadius: 18,
    border: '1px solid #e8edf2',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
  },
  section: { padding: 18 },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: 800,
    color: '#0f172a',
    marginBottom: 4,
  },
  sub: {
    fontSize: 12,
    color: '#64748b',
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    borderRadius: 999,
    background: '#E8F2FF',
    color: '#185FA5',
    fontSize: 11,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  tabs: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 14,
    borderBottom: '1px solid #e8edf2',
    paddingBottom: 2,
  },
  tab: {
    padding: '9px 14px',
    borderRadius: 999,
    border: '1px solid #dbe4ea',
    background: '#fff',
    color: '#475569',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  tabActive: {
    background: BRAND,
    color: '#fff',
    borderColor: BRAND,
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 12,
  },
  field: { display: 'grid', gap: 5 },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: '#475569',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d8e1e8',
    borderRadius: 10,
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    background: '#fff',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d8e1e8',
    borderRadius: 10,
    fontSize: 13,
    outline: 'none',
    resize: 'vertical',
    minHeight: 110,
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    background: '#fff',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d8e1e8',
    borderRadius: 10,
    fontSize: 13,
    outline: 'none',
    background: '#fff',
    boxSizing: 'border-box',
  },
  readonly: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d8e1e8',
    borderRadius: 10,
    fontSize: 13,
    background: '#f8fafc',
    color: '#64748b',
    boxSizing: 'border-box',
  },
  infoBox: {
    background: '#fff8e8',
    border: '1px solid #f5d48c',
    borderRadius: 12,
    padding: '12px 14px',
    fontSize: 12,
    color: '#854f0b',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  summaryStrip: {
    background: '#f0faf6',
    border: '1px solid #d9efe6',
    borderRadius: 14,
    padding: 14,
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 12,
    marginBottom: 14,
  },
  summaryItem: { minWidth: 0 },
  summaryLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.35,
    wordBreak: 'break-word',
  },
  formBox: {
    border: '1px solid #e8edf2',
    background: '#fbfefd',
    borderRadius: 16,
    padding: 16,
    display: 'grid',
    gap: 14,
  },
  btnRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  btnPrimary: {
    padding: '10px 16px',
    borderRadius: 10,
    border: 'none',
    background: BRAND,
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: '10px 16px',
    borderRadius: 10,
    border: '1px solid #d8e1e8',
    background: '#fff',
    color: '#334155',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  waBox: {
    background: '#e8f8f1',
    border: '1px solid #bde8d6',
    borderRadius: 14,
    padding: 14,
    fontSize: 12,
    color: '#0f6e56',
  },
  waTitle: {
    fontWeight: 800,
    marginBottom: 8,
    color: '#0f6e56',
  },
  historyWrap: {
    border: '1px solid #e8edf2',
    borderRadius: 16,
    overflow: 'hidden',
    background: '#fff',
  },
  tableWrap: { overflowX: 'auto' },
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    fontSize: 13,
  },
  th: {
    textAlign: 'left',
    padding: '12px 12px',
    fontSize: 11,
    fontWeight: 700,
    color: '#64748b',
    borderBottom: '1px solid #e8edf2',
    background: '#fafcfd',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '14px 12px',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'middle',
    color: '#0f172a',
  },
  nameMain: {
    fontSize: 13,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 2,
  },
  nameSub: {
    fontSize: 11,
    color: '#64748b',
  },
  empty: {
    textAlign: 'center',
    padding: '42px 20px',
    fontSize: 13,
    color: '#94a3b8',
  },
  miniBtn: {
    padding: '8px 12px',
    borderRadius: 9,
    border: '1px solid #d8e1e8',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 700,
    color: '#334155',
  },
  badge: (bg, color) => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '5px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    background: bg,
    color,
    whiteSpace: 'nowrap',
  }),
  helper: {
    fontSize: 11,
    color: '#64748b',
  },
};

const today = () => new Date().toISOString().split('T')[0];

const normalizeBatch = (b) => ({
  ...b,
  batchname: b.batchname || b.batch_name || '',
  batch_name: b.batch_name || b.batchname || '',
  coursename: b.coursename || b.course_name || '',
  course_name: b.course_name || b.coursename || '',
  courseid: b.courseid || b.course_id || '',
  course_id: b.course_id || b.courseid || '',
  batchstartdate: b.batchstartdate || b.batch_start_date || '',
  batch_start_date: b.batch_start_date || b.batchstartdate || '',
  batchenddate: b.batchenddate || b.batch_end_date || '',
  batch_end_date: b.batch_end_date || b.batchenddate || '',
  weekdayweekend: b.weekdayweekend || b.weekday_weekend || '',
  weekday_weekend: b.weekday_weekend || b.weekdayweekend || '',
  sessiontype: b.sessiontype || b.session_type || '',
  session_type: b.session_type || b.sessiontype || '',
  studentcount: b.studentcount || b.student_count || 0,
  student_count: b.student_count || b.studentcount || 0,
});

const normalizeLog = (log) => ({
  ...log,
  batch_name: log.batch_name || log.batchname || '',
  batchname: log.batchname || log.batch_name || '',
  work_description: log.work_description || log.workdescription || '',
  progressive_working_hours:
    log.progressive_working_hours ?? log.progressiveworkinghours ?? '',
  star_points: log.star_points ?? log.starpoints ?? '0.00',
  log_date: log.log_date || log.logdate || '',
  wa_sent: Boolean(log.wa_sent),
});

export default function WorkLog() {
  const { user } = useAuth();

  const trainerId =
    user?.trainerId ??
    user?.trainer_id ??
    user?.trainer?.id ??
    user?.trainer?.trainer_id ??
    null;

  const [tab, setTab] = useState(0);
  const [batches, setBatches] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncingSheet, setSyncingSheet] = useState(false);
  const [editId, setEditId] = useState(null);
  const [stats, setStats] = useState(null);

  const [form, setForm] = useState({
    log_date: today(),
    batch_id: '',
    work_description: '',
    progressive_working_hours: '',
    star_points: '',
    wa_sent: false,
  });

  const setField = (k, v) => {
    const next = { ...form, [k]: v };

    if (k === 'progressive_working_hours') {
      const hours = parseFloat(v) || 0;
      next.star_points = (hours * 0.5).toFixed(2);
    }

    setForm(next);
  };

  const clearForm = () => {
    setForm({
      log_date: today(),
      batch_id: '',
      work_description: '',
      progressive_working_hours: '',
      star_points: '',
      wa_sent: false,
    });
    setEditId(null);
  };

  const fetchLogs = async () => {
    if (!trainerId) return;

    try {
      const r = await getMyLogs({ trainer_id: trainerId });
      setLogs((r.data.logs || []).map(normalizeLog));
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to load work logs');
    }
  };

  const fetchStats = async () => {
    if (!trainerId) return;

    try {
      const r = await getLogStats({ trainer_id: trainerId });
      setStats(r.data || null);
    } catch {
      setStats(null);
    }
  };

  useEffect(() => {
    getBatches({ status: 'ongoing' })
      .then((r) => {
        const rows = r?.data?.batches || [];
        setBatches(rows.map(normalizeBatch));
      })
      .catch((err) => {
        console.error('Failed to load batches:', err?.response?.data || err);
        toast.error(err?.response?.data?.error || 'Failed to load batches');
      });
  }, []);

  useEffect(() => {
    if (!trainerId) return;
    fetchLogs();
    fetchStats();
  }, [trainerId]);

  const selectedBatch = useMemo(
    () => batches.find((b) => String(b.id) === String(form.batch_id)),
    [batches, form.batch_id]
  );

  const buildWAMessage = () =>
    `Hi bros, today's work status (${form.log_date})\n\n${form.work_description}\n\nWorking hours: ${form.progressive_working_hours || '0'}\nStar points: ${form.star_points || '0.00'}`;

  const openWhatsApp = () => {
    const msg = encodeURIComponent(buildWAMessage());
    window.open(`https://web.whatsapp.com/send?text=${msg}`, '_blank', 'noopener,noreferrer');
    setField('wa_sent', true);
  };

  const handleSyncWorkLogSheet = async () => {
    try {
      setSyncingSheet(true);
      const res = await syncWorkLogSheet();

      if (res?.data?.success) {
        toast.success(res?.data?.message || `Work Log sheet synced (${res?.data?.count || 0} rows)`);
      } else {
        toast.error(res?.data?.error || 'Work Log sheet sync failed');
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to sync work log sheet');
    } finally {
      setSyncingSheet(false);
    }
  };

  const handleSubmit = async () => {
    if (!trainerId) {
      toast.error('Trainer ID not found in session. Please log in again.');
      return;
    }

    if (!form.log_date || !form.work_description.trim()) {
      toast.error('Date and work description are required');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        trainer_id: trainerId,
        batch_id: form.batch_id || null,
        log_date: form.log_date,
        work_description: form.work_description.trim(),
        progressive_working_hours: Number(form.progressive_working_hours || 0),
        star_points: Number(form.star_points || 0),
        whatsapp_sent_to: null,
        wa_sent: !!form.wa_sent,
      };

      if (editId) {
        await updateLog(editId, payload);
        toast.success('Work log updated!');
      } else {
        await submitLog(payload);
        toast.success('Work log submitted!');
      }

      await handleSyncWorkLogSheet();
      clearForm();
      await fetchLogs();
      await fetchStats();
      setTab(1);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (log) => {
    setForm({
      log_date: log.log_date?.split('T')[0] || today(),
      batch_id: log.batch_id || '',
      work_description: log.work_description || '',
      progressive_working_hours: String(log.progressive_working_hours ?? ''),
      star_points:
        log.star_points !== undefined && log.star_points !== null
          ? String(log.star_points)
          : '',
      wa_sent: Boolean(log.wa_sent),
    });
    setEditId(log.id);
    setTab(0);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.section}>
          <div style={styles.header}>
            <div>
              <div style={styles.title}>Daily work log</div>
              <div style={styles.sub}>
                Track daily teaching work, hours, points, and sheet sync in one place.
              </div>
            </div>

            <button
              type="button"
              style={styles.btnPrimary}
              onClick={handleSyncWorkLogSheet}
              disabled={syncingSheet}
            >
              {syncingSheet ? 'Syncing...' : 'Sync Work Log Sheet'}
            </button>
          </div>

          <div style={{ marginBottom: 14 }}>
            <span style={styles.pill}>→ Employee Performance Tracker</span>
          </div>

          {!trainerId && (
            <div style={styles.infoBox}>
              <span>Trainer ID not available in session. Please log in again.</span>
            </div>
          )}

          {stats && (
            <div style={styles.summaryStrip}>
              <div style={styles.summaryItem}>
                <div style={styles.summaryLabel}>Total logs</div>
                <div style={styles.summaryValue}>
                  {stats.total_logs ?? stats.totalLogs ?? logs.length}
                </div>
              </div>

              <div style={styles.summaryItem}>
                <div style={styles.summaryLabel}>This month</div>
                <div style={styles.summaryValue}>
                  {stats.month_logs ?? stats.monthLogs ?? '—'}
                </div>
              </div>

              <div style={styles.summaryItem}>
                <div style={styles.summaryLabel}>Hours</div>
                <div style={styles.summaryValue}>
                  {stats.total_hours ?? stats.totalHours ?? '—'}
                </div>
              </div>

              <div style={styles.summaryItem}>
                <div style={styles.summaryLabel}>Star points</div>
                <div style={styles.summaryValue}>
                  {stats.total_points ?? stats.totalPoints ?? '—'}
                </div>
              </div>
            </div>
          )}

          <div style={styles.tabs}>
            {["Add today's log", 'View history'].map((t, i) => (
              <button
                key={t}
                type="button"
                style={{ ...styles.tab, ...(tab === i ? styles.tabActive : {}) }}
                onClick={() => setTab(i)}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 0 && (
            <div style={styles.formBox}>
              {editId && (
                <div style={styles.infoBox}>
                  <span>✏️ Editing existing log</span>
                  <button type="button" style={styles.miniBtn} onClick={clearForm}>
                    Cancel edit
                  </button>
                </div>
              )}

              <div style={styles.grid2}>
                <div style={styles.field}>
                  <label style={styles.label}>Date</label>
                  <input
                    style={styles.input}
                    type="date"
                    value={form.log_date}
                    onChange={(e) => setField('log_date', e.target.value)}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Batch (optional)</label>
                  <select
                    style={styles.select}
                    value={form.batch_id}
                    onChange={(e) => setField('batch_id', e.target.value)}
                  >
                    <option value="">Select batch</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batch_name || b.batchname}
                        {b.course_name || b.coursename
                          ? ` — ${b.course_name || b.coursename}`
                          : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Work description (what you did today)</label>
                <textarea
                  style={styles.textarea}
                  placeholder={`10:00 AM - 11:00 AM  Java Batch 2 - OOP concepts
11:00 AM - 12:00 PM  Selenium Batch 1 - Waits`}
                  value={form.work_description}
                  onChange={(e) => setField('work_description', e.target.value)}
                />
              </div>

              <div style={styles.grid2}>
                <div style={styles.field}>
                  <label style={styles.label}>Working hours</label>
                  <input
                    style={styles.input}
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="e.g. 6.5"
                    value={form.progressive_working_hours}
                    onChange={(e) => setField('progressive_working_hours', e.target.value)}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Star points (auto-calculated)</label>
                  <input style={styles.readonly} readOnly value={form.star_points || '0.00'} />
                </div>
              </div>

              {selectedBatch && (
                <div style={styles.helper}>
                  Selected batch: {selectedBatch.batch_name || selectedBatch.batchname}
                </div>
              )}

              {form.work_description && (
                <div style={styles.waBox}>
                  <div style={styles.waTitle}>WhatsApp message preview</div>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                    {buildWAMessage()}
                  </div>

                  <button
                    type="button"
                    style={{
                      marginTop: 10,
                      padding: '7px 16px',
                      background: '#25D366',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                    onClick={openWhatsApp}
                  >
                    Open WhatsApp Web
                  </button>
                </div>
              )}

              <div style={styles.btnRow}>
                <button
                  type="button"
                  style={styles.btnPrimary}
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : editId ? 'Update log' : 'Submit log'}
                </button>

                <button type="button" style={styles.btnSecondary} onClick={clearForm}>
                  Clear
                </button>
              </div>
            </div>
          )}

          {tab === 1 && (
            <div style={styles.historyWrap}>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Batch</th>
                      <th style={styles.th}>Description</th>
                      <th style={styles.th}>Hours</th>
                      <th style={styles.th}>Star pts</th>
                      <th style={styles.th}>WA sent</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={styles.empty}>
                          No logs yet. Submit your first work log!
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id}>
                          <td style={styles.td}>{log.log_date?.split('T')[0] || '—'}</td>

                          <td style={styles.td}>{log.batch_name || log.batchname || '—'}</td>

                          <td style={styles.td} title={log.work_description || ''}>
                            <div style={styles.nameMain}>
                              {(log.work_description || '—').slice(0, 42)}
                              {(log.work_description || '').length > 42 ? '...' : ''}
                            </div>
                            <div style={styles.nameSub}>Tap edit to revise the full entry</div>
                          </td>

                          <td style={styles.td}>
                            {log.progressive_working_hours
                              ? `${log.progressive_working_hours}h`
                              : '—'}
                          </td>

                          <td style={styles.td}>{log.star_points ?? '0.00'}</td>

                          <td style={styles.td}>
                            <span
                              style={styles.badge(
                                log.wa_sent ? '#E1F5EE' : '#FCEBEB',
                                log.wa_sent ? '#0F6E56' : '#A32D2D'
                              )}
                            >
                              {log.wa_sent ? 'Sent' : 'Not sent'}
                            </span>
                          </td>

                          <td style={styles.td}>
                            <button
                              type="button"
                              style={styles.miniBtn}
                              onClick={() => handleEdit(log)}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}