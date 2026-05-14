import { useState, useEffect, useCallback } from 'react';
import { getStudents } from '../../api/students';
import { getBatches } from '../../api/batches';
import {
  getFollowups,
  createFollowup,
  updateFollowup,
  syncStudentFollowupsSheet,
} from '../../api/studentFollowups';
import toast from 'react-hot-toast';

const G = '#1D9E75';
const S = {
  card: { background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16 },
  title: {
    fontSize: 15,
    fontWeight: 600,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottom: '1px solid #f0f0f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tag: {
    fontSize: 9,
    background: '#E6F1FB',
    color: '#185FA5',
    padding: '2px 6px',
    borderRadius: 4,
  },
  tabs: { display: 'flex', borderBottom: '1px solid #eee', marginBottom: 14 },
  tab: {
    padding: '7px 14px',
    fontSize: 12,
    cursor: 'pointer',
    borderBottomWidth: '2px',
    borderBottomStyle: 'solid',
    borderBottomColor: 'transparent',
    color: '#888',
  },
  tabA: {
    borderBottomWidth: '2px',
    borderBottomStyle: 'solid',
    borderBottomColor: G,
    color: G,
    fontWeight: 500,
  },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 },
  row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 },
  field: { marginBottom: 10 },
  label: { fontSize: 11, color: '#666', display: 'block', marginBottom: 3 },
  input: {
    width: '100%',
    padding: '7px 10px',
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 12,
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '7px 10px',
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 12,
    outline: 'none',
    background: '#fff',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '7px 10px',
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 12,
    outline: 'none',
    resize: 'vertical',
    minHeight: 70,
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  btnRow: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  btn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid #ddd',
    background: '#fff',
    fontSize: 12,
    cursor: 'pointer',
  },
  btnP: {
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    background: G,
    color: '#fff',
    fontSize: 12,
    cursor: 'pointer',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: {
    textAlign: 'left',
    padding: '8px 10px',
    borderBottom: '1px solid #eee',
    fontSize: 11,
    color: '#888',
    fontWeight: 500,
  },
  td: {
    padding: '8px 10px',
    borderBottom: '1px solid #f5f5f5',
    color: '#333',
    verticalAlign: 'top',
  },
  actBtn: {
    fontSize: 10,
    padding: '3px 8px',
    borderRadius: 6,
    border: '1px solid #ddd',
    background: '#fff',
    cursor: 'pointer',
    marginRight: 4,
  },
  badge: (c) => ({
    fontSize: 10,
    padding: '2px 8px',
    borderRadius: 10,
    background:
      c === 'green'
        ? '#E1F5EE'
        : c === 'blue'
        ? '#E6F1FB'
        : c === 'orange'
        ? '#FEF3C7'
        : c === 'red'
        ? '#FCEBEB'
        : c === 'purple'
        ? '#F3E8FF'
        : '#f0f0f0',
    color:
      c === 'green'
        ? '#0F6E56'
        : c === 'blue'
        ? '#185FA5'
        : c === 'orange'
        ? '#92400E'
        : c === 'red'
        ? '#A32D2D'
        : c === 'purple'
        ? '#6D28D9'
        : '#666',
  }),
  toggleRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  toggle: (on) => ({
    width: 36,
    height: 20,
    borderRadius: 10,
    background: on ? G : '#ddd',
    position: 'relative',
    cursor: 'pointer',
    transition: 'background .2s',
    flexShrink: 0,
    border: 'none',
  }),
  thumb: (on) => ({
    position: 'absolute',
    top: 2,
    left: on ? 18 : 2,
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: '#fff',
    transition: 'left .2s',
  }),
  waBox: {
    background: '#E1F5EE',
    border: '1px solid #9FE1CB',
    borderRadius: 8,
    padding: '12px 14px',
    fontSize: 11,
    color: '#0F6E56',
    marginTop: 10,
  },
  waBtn: {
    marginTop: 10,
    padding: '7px 16px',
    background: '#25D366',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 12,
    cursor: 'pointer',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: G,
    color: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 600,
    marginRight: 6,
    flexShrink: 0,
    verticalAlign: 'middle',
  },
};

const todayStr = () => new Date().toISOString().split('T')[0];
const FOLLOWUP_TYPES = ['project', 'playwright', 'general'];
const CALL_STATUSES = ['picked', 'not_picked', 'busy'];
const PLACED_STATUSES = ['in_process', 'offer_pending', 'placed', 'rejected'];

const typeColor = (t) =>
  t === 'project' ? 'blue' : t === 'playwright' ? 'purple' : '';
const callColor = (c) =>
  c === 'picked' ? 'green' : c === 'busy' ? 'orange' : 'red';
const placedColor = (p) =>
  p === 'placed' ? 'green' : p === 'offer_pending' ? 'orange' : p === 'rejected' ? 'red' : '';

const blank = {
  student_id: '',
  followup_type: 'general',
  call_status: 'picked',
  last_contact_date: todayStr(),
  remarks: '',
  resume_status: '',
  no_of_interview_calls: 0,
  no_of_rounds_cleared: 0,
  interested: true,
  placed_status: 'in_process',
  wa_sent: false,
};

export default function AdminFollowups() {
  const [tab, setTab] = useState(1); // admin defaults to View all
  const [batches, setBatches] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [formStudents, setFormStudents] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncingSheet, setSyncingSheet] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filterBatch, setFilterBatch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [formBatch, setFormBatch] = useState('');
  const [form, setForm] = useState({ ...blank, last_contact_date: todayStr() });

  const loadFollowups = useCallback(async () => {
    try {
      const r = await getFollowups();
      const list = Array.isArray(r.data)
        ? r.data
        : r.data.followups || r.data.data || [];
      setFollowups([...list]);
    } catch (e) {
      console.error('loadFollowups error:', e);
      toast.error('Failed to load followups');
    }
  }, []);

  useEffect(() => {
    getBatches().then((r) => setBatches(r.data.batches || []));
    getStudents().then((r) => setAllStudents(r.data.students || []));
    loadFollowups();
  }, [loadFollowups]);

  useEffect(() => {
    if (formBatch) {
      getStudents({ batch_id: formBatch }).then((r) =>
        setFormStudents(r.data.students || [])
      );
    } else {
      setFormStudents(allStudents);
    }
  }, [formBatch, allStudents]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const buildWA = () => {
    const student = allStudents.find(
      (s) => String(s.id) === String(form.student_id)
    );
    return `📞 Student Followup Log (${form.last_contact_date})

Student: ${student?.candidate_name || '—'}
${student?.phone ? 'Phone: ' + student.phone : ''}
Type: ${form.followup_type?.charAt(0).toUpperCase() + form.followup_type?.slice(1)}
Call status: ${form.call_status?.replace(/_/g, ' ')}
Interested: ${form.interested ? '✅ Yes' : '❌ No'}
Resume status: ${form.resume_status || '—'}
Interview calls: ${form.no_of_interview_calls || 0}
Rounds cleared: ${form.no_of_rounds_cleared || 0}
Placement status: ${form.placed_status?.replace(/_/g, ' ')}
${form.remarks ? '\nRemarks:\n' + form.remarks : ''}`.trim();
  };

  const openWA = () => {
    const student = allStudents.find(
      (s) => String(s.id) === String(form.student_id)
    );
    const phone = (student?.whatsapp_number || student?.phone || '').replace(
      /\D/g,
      ''
    );
    const url = phone
      ? `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(
          buildWA()
        )}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(buildWA())}`;
    window.open(url, '_blank');
    set('wa_sent', true);
    toast.success('WhatsApp opened');
  };

  const handleSyncStudentFollowupsSheet = async () => {
    try {
      setSyncingSheet(true);
      const res = await syncStudentFollowupsSheet();
      if (res?.data?.success) {
        toast.success(
          res?.data?.message ||
            `Student Followups sheet synced (${res?.data?.count || 0} rows)`
        );
      } else {
        toast.error(res?.data?.error || 'Student Followups sheet sync failed');
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.error ||
          'Failed to sync Student Followups sheet'
      );
    } finally {
      setSyncingSheet(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.student_id) return toast.error('Please select a student');
    setLoading(true);

    try {
      const payload = {
        ...form,
        no_of_interview_calls:
          parseInt(form.no_of_interview_calls, 10) || 0,
        no_of_rounds_cleared:
          parseInt(form.no_of_rounds_cleared, 10) || 0,
        interested: Boolean(form.interested),
        wa_sent: Boolean(form.wa_sent),
      };

      if (editId) {
        await updateFollowup(editId, payload);
        toast.success('Followup updated!');
      } else {
        await createFollowup(payload);
        toast.success('Followup logged!');
      }

      setForm({ ...blank, last_contact_date: todayStr() });
      setEditId(null);
      setFormBatch('');
      setTab(1);
      setTimeout(() => {
        loadFollowups();
      }, 250);
    } catch (e) {
      console.error('save followup error:', e);
      toast.error(e.response?.data?.error || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (f) => {
    setForm({
      student_id: f.student_id || '',
      followup_type: f.followup_type || 'general',
      call_status: f.call_status || 'picked',
      last_contact_date: f.last_contact_date?.split('T')[0] || todayStr(),
      remarks: f.remarks || '',
      resume_status: f.resume_status || '',
      no_of_interview_calls: f.no_of_interview_calls ?? 0,
      no_of_rounds_cleared: f.no_of_rounds_cleared ?? 0,
      interested: f.interested ?? true,
      placed_status: f.placed_status || 'in_process',
      wa_sent: f.wa_sent || false,
    });
    setEditId(f.id);
    setTab(0);
  };

  const filtered = followups.filter((f) => {
    const matchBatch = filterBatch
      ? String(f.batch_id) === String(filterBatch)
      : true;
    const matchType = filterType ? f.followup_type === filterType : true;
    return matchBatch && matchType;
  });

  return (
    <div>
      <div style={S.card}>
        <div style={S.title}>
          <span>Student Followups (Admin)</span>
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              style={{
                ...S.btnP,
                opacity: syncingSheet ? 0.7 : 1,
                cursor: syncingSheet ? 'not-allowed' : 'pointer',
              }}
              onClick={handleSyncStudentFollowupsSheet}
              disabled={syncingSheet}
            >
              {syncingSheet ? 'Syncing...' : 'Sync Student Followups Sheet'}
            </button>
          </div>
        </div>

        <div style={S.tabs}>
          {['Log followup', 'View all'].map((t, i) => (
            <div
              key={i}
              style={{ ...S.tab, ...(tab === i ? S.tabA : {}) }}
              onClick={() => setTab(i)}
            >
              {t}
              {i === 1 && followups.length > 0 && (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 10,
                    background: '#E1F5EE',
                    color: G,
                    padding: '1px 6px',
                    borderRadius: 8,
                    fontWeight: 600,
                  }}
                >
                  {followups.length}
                </span>
              )}
            </div>
          ))}
        </div>

        {tab === 0 && (
          <div>
            {editId && (
              <div
                style={{
                  background: '#FAEEDA',
                  border: '1px solid #FAC775',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 11,
                  color: '#854F0B',
                  marginBottom: 10,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>✏️ Editing existing followup #{editId}</span>
                <button
                  type="button"
                  style={S.actBtn}
                  onClick={() => {
                    setForm({ ...blank, last_contact_date: todayStr() });
                    setEditId(null);
                  }}
                >
                  ✕ Cancel edit
                </button>
              </div>
            )}

            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>
                  Filter by batch (to find student faster)
                </label>
                <select
                  style={S.select}
                  value={formBatch}
                  onChange={(e) => setFormBatch(e.target.value)}
                >
                  <option value="">All batches</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batch_name} — {b.course_name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>Student *</label>
                <select
                  style={S.select}
                  value={form.student_id}
                  onChange={(e) => set('student_id', e.target.value)}
                >
                  <option value="">Select student</option>
                  {formStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.candidate_name}
                      {s.phone ? ` (${s.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={S.row3}>
              <div style={S.field}>
                <label style={S.label}>Followup type</label>
                <select
                  style={S.select}
                  value={form.followup_type}
                  onChange={(e) => set('followup_type', e.target.value)}
                >
                  {FOLLOWUP_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>Call status</label>
                <select
                  style={S.select}
                  value={form.call_status}
                  onChange={(e) => set('call_status', e.target.value)}
                >
                  {CALL_STATUSES.map((c) => (
                    <option key={c} value={c}>
                      {c.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>Last contact date</label>
                <input
                  style={S.input}
                  type="date"
                  value={form.last_contact_date}
                  onChange={(e) => set('last_contact_date', e.target.value)}
                />
              </div>
            </div>

            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Resume status</label>
                <input
                  style={S.input}
                  value={form.resume_status}
                  onChange={(e) => set('resume_status', e.target.value)}
                  placeholder="e.g. Updated, Not prepared, Sent to HR..."
                />
              </div>
              <div style={S.field}>
                <label style={S.label}>Placement status</label>
                <select
                  style={S.select}
                  value={form.placed_status}
                  onChange={(e) => set('placed_status', e.target.value)}
                >
                  {PLACED_STATUSES.map((p) => (
                    <option key={p} value={p}>
                      {p.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>No. of interview calls</label>
                <input
                  style={S.input}
                  type="number"
                  min="0"
                  value={form.no_of_interview_calls}
                  onChange={(e) =>
                    set('no_of_interview_calls', e.target.value)
                  }
                />
              </div>
              <div style={S.field}>
                <label style={S.label}>No. of rounds cleared</label>
                <input
                  style={S.input}
                  type="number"
                  min="0"
                  value={form.no_of_rounds_cleared}
                  onChange={(e) =>
                    set('no_of_rounds_cleared', e.target.value)
                  }
                />
              </div>
            </div>

            <div style={S.toggleRow}>
              <button
                type="button"
                style={S.toggle(form.interested)}
                onClick={() => set('interested', !form.interested)}
                aria-label="Toggle interest"
              >
                <div style={S.thumb(form.interested)} />
              </button>
              <span
                style={{
                  fontSize: 12,
                  color: form.interested ? G : '#888',
                }}
              >
                {form.interested
                  ? '✅ Student is interested in placement'
                  : 'Not interested / no response'}
              </span>
            </div>

            <div style={S.field}>
              <label style={S.label}>Remarks</label>
              <textarea
                style={S.textarea}
                value={form.remarks}
                onChange={(e) => set('remarks', e.target.value)}
                placeholder="e.g. Student said resume will be ready by Monday..."
              />
            </div>

            {form.student_id && (
              <div style={S.waBox}>
                <div
                  style={{ fontWeight: 600, marginBottom: 6 }}
                >
                  📱 WhatsApp message preview:
                </div>
                <div
                  style={{
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.8,
                    fontFamily: 'monospace',
                    fontSize: 11,
                  }}
                >
                  {buildWA()}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 10,
                    color: '#0F6E56',
                  }}
                >
                  {allStudents.find(
                    (s) => String(s.id) === String(form.student_id)
                  )?.phone
                    ? '📞 Student phone number will be auto-filled'
                    : '💬 No phone saved — select contact manually'}
                </div>
                <button
                  type="button"
                  style={S.waBtn}
                  onClick={openWA}
                >
                  Open WhatsApp Web →
                </button>
                {form.wa_sent && (
                  <span
                    style={{
                      marginLeft: 10,
                      fontSize: 10,
                      color: '#0F6E56',
                      fontWeight: 500,
                    }}
                  >
                    ✓ Sent
                  </span>
                )}
              </div>
            )}

            <div style={S.btnRow}>
              <button
                type="button"
                style={S.btnP}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading
                  ? 'Saving...'
                  : editId
                  ? 'Update followup'
                  : 'Log followup'}
              </button>
              <button
                type="button"
                style={S.btn}
                onClick={() => {
                  setForm({ ...blank, last_contact_date: todayStr() });
                  setEditId(null);
                }}
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {tab === 1 && (
          <div>
            <div
              style={{
                display: 'flex',
                gap: 8,
                marginBottom: 12,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <select
                style={{ ...S.select, maxWidth: 220 }}
                value={filterBatch}
                onChange={(e) => setFilterBatch(e.target.value)}
              >
                <option value="">All batches</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batch_name}
                  </option>
                ))}
              </select>
              <select
                style={{ ...S.select, maxWidth: 160 }}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">All types</option>
                {FOLLOWUP_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                style={{ ...S.btn, fontSize: 11 }}
                onClick={loadFollowups}
              >
                ↻ Refresh
              </button>
              <span style={{ fontSize: 11, color: '#888' }}>
                {filtered.length} record
                {filtered.length !== 1 ? 's' : ''}
              </span>
            </div>

            {filtered.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#aaa',
                  fontSize: 12,
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>📞</div>
                No followup records found
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Student</th>
                      <th style={S.th}>Type</th>
                      <th style={S.th}>Call</th>
                      <th style={S.th}>Date</th>
                      <th style={S.th}>Resume</th>
                      <th style={S.th}>Interviews</th>
                      <th style={S.th}>Status</th>
                      <th style={S.th}>Interested</th>
                      <th style={S.th}>WA</th>
                      <th style={S.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((f) => (
                      <tr key={f.id}>
                        <td style={S.td}>
                          <div
                            style={{ display: 'flex', alignItems: 'center' }}
                          >
                            <div style={S.avatar}>
                              {f.candidate_name?.[0]?.toUpperCase() ||
                                '?'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 500 }}>
                                {f.candidate_name || '—'}
                              </div>
                              <div
                                style={{ fontSize: 10, color: '#888' }}
                              >
                                {f.batch_name || ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={S.td}>
                          <span
                            style={S.badge(typeColor(f.followup_type))}
                          >
                            {f.followup_type}
                          </span>
                        </td>
                        <td style={S.td}>
                          <span
                            style={S.badge(callColor(f.call_status))}
                          >
                            {f.call_status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={S.td}>
                          {f.last_contact_date?.split('T')[0] || '—'}
                        </td>
                        <td style={S.td}>
                          <span
                            style={{ fontSize: 11, color: '#555' }}
                          >
                            {f.resume_status || '—'}
                          </span>
                        </td>
                        <td style={S.td}>
                          <div style={{ fontSize: 11 }}>
                            {f.no_of_interview_calls || 0} calls
                          </div>
                          <div
                            style={{ fontSize: 10, color: '#888' }}
                          >
                            {f.no_of_rounds_cleared || 0} cleared
                          </div>
                        </td>
                        <td style={S.td}>
                          <span
                            style={S.badge(
                              placedColor(f.placed_status)
                            )}
                          >
                            {f.placed_status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={S.td}>
                          <span
                            style={S.badge(
                              f.interested ? 'green' : 'red'
                            )}
                          >
                            {f.interested ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td style={S.td}>
                          <span
                            style={S.badge(f.wa_sent ? 'green' : '')}
                          >
                            {f.wa_sent ? 'Sent' : '—'}
                          </span>
                        </td>
                        <td style={S.td}>
                          <button
                            type="button"
                            style={S.actBtn}
                            onClick={() => handleEdit(f)}
                          >
                            ✎ Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}