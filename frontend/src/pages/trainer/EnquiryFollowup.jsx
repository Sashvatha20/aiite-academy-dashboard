import { useEffect, useState } from 'react';
import {
  getEnquiries,
  createEnquiry,
  updateEnquiry,
  deleteEnquiry,
  logFollowup,
  saveDailyCount,
  getDailyCounts,
  convertToStudent,
} from '../../api/enquiries';
import { getBatches } from '../../api/batches';
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
  tag: { fontSize: 9, background: '#E6F1FB', color: '#185FA5', padding: '2px 6px', borderRadius: 4 },
  tabs: { display: 'flex', borderBottom: '1px solid #eee', marginBottom: 14, flexWrap: 'wrap' },
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
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '8px 10px',
    borderBottom: '1px solid #f5f5f5',
    color: '#333',
    verticalAlign: 'top',
  },
  badge: (c) => ({
    fontSize: 10,
    padding: '2px 8px',
    borderRadius: 10,
    background:
      c === 'green'
        ? '#E1F5EE'
        : c === 'red'
          ? '#FCEBEB'
          : c === 'blue'
            ? '#E6F1FB'
            : c === 'yellow'
              ? '#FEF9C3'
              : c === 'gray'
                ? '#f0f0f0'
                : '#f0f0f0',
    color:
      c === 'green'
        ? '#0F6E56'
        : c === 'red'
          ? '#A32D2D'
          : c === 'blue'
            ? '#185FA5'
            : c === 'yellow'
              ? '#854F0B'
              : '#666',
  }),
  actBtn: {
    fontSize: 10,
    padding: '3px 8px',
    borderRadius: 6,
    border: '1px solid #ddd',
    background: '#fff',
    cursor: 'pointer',
    marginRight: 4,
    marginBottom: 4,
  },
  modal: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modalBox: {
    background: '#fff',
    borderRadius: 14,
    padding: 24,
    width: 560,
    maxWidth: '96vw',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
};

const statusColor = {
  new: 'blue',
  followup: 'yellow',
  converted: 'green',
  not_interested: 'red',
  closed: 'gray',
  daily_followup: 'yellow',
};

const ticketStatusColor = {
  open: 'blue',
  pending: 'yellow',
  closed: 'green',
};

const toLocalDateInputValue = (value = new Date()) => {
  const d = new Date(value);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const today = () => toLocalDateInputValue();

const formatDate = (value) => {
  if (!value) return '';
  return toLocalDateInputValue(value);
};

export default function EnquiryFollowup() {
  const [tab, setTab] = useState(0);
  const [enquiries, setEnquiries] = useState([]);
  const [batches, setBatches] = useState([]);
  const [dailyCounts, setDailyCounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFollowup, setShowFollowup] = useState(null);
  const [editEnquiry, setEditEnquiry] = useState(null);
  const [showConvert, setShowConvert] = useState(null);

  const blankEnq = {
    date: today(),
    name: '',
    contact: '',
    email: '',
    course_enquired_for: '',
    course_suggested: '',
    enquiry_mode: 'call',
    source: '',
    referred_by: '',
    list_type: 'daily_followup',
    status: 'new',
    notes: '',
    assigned_trainer_id: '',
  };

  const blankFu = {
    followup_date: today(),
    call_picked: 'yes',
    last_response: '',
    ticket_status: 'open',
    details_pitched: 'yes',
    remarks: '',
    batch_status: '',
    next_followup_date: '',
  };

  const blankCount = {
    date: today(),
    call_enquiries: 0,
    walk_in_enquiries: 0,
    course_suggested_by_us: 0,
    remarks: '',
  };

  const blankConvert = {
    candidate_name: '',
    phone: '',
    email: '',
    whatsapp_number: '',
    batch_id: '',
    total_fee: '',
    payment_mode: 'cash',
    initial_payment: '',
    reference_no: '',
    notes: '',
  };

  const [enqForm, setEnqForm] = useState(blankEnq);
  const [fuForm, setFuForm] = useState(blankFu);
  const [countForm, setCountForm] = useState(blankCount);
  const [convertForm, setConvertForm] = useState(blankConvert);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [eq, dc, bt] = await Promise.all([
        getEnquiries(),
        getDailyCounts(),
        getBatches(),
      ]);
      setEnquiries(eq.data.enquiries || []);
      setDailyCounts(dc.data.counts || []);
      setBatches(bt.data.batches || []);
    } catch {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const setE = (k, v) => setEnqForm((f) => ({ ...f, [k]: v }));
  const setF = (k, v) => setFuForm((f) => ({ ...f, [k]: v }));
  const setC = (k, v) => setCountForm((f) => ({ ...f, [k]: v }));
  const setCV = (k, v) => setConvertForm((f) => ({ ...f, [k]: v }));

  const submitEnquiry = async () => {
    if (!enqForm.name?.trim()) return toast.error('Candidate name is required');

    setLoading(true);
    try {
      const payload = {
        ...enqForm,
        assigned_trainer_id: enqForm.assigned_trainer_id || null,
        email: enqForm.email || null,
        notes: enqForm.notes || null,
        source: enqForm.source || null,
        referred_by: enqForm.referred_by || null,
      };

      if (editEnquiry) {
        await updateEnquiry(editEnquiry.id, payload);
        toast.success('Enquiry updated!');
      } else {
        await createEnquiry(payload);
        toast.success('Enquiry added!');
      }

      setEditEnquiry(null);
      setEnqForm(blankEnq);
      await loadAll();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const submitFollowup = async () => {
    if (!fuForm.last_response?.trim()) return toast.error('Response details required');

    setLoading(true);
    try {
      await logFollowup(showFollowup.id, {
        ...fuForm,
        call_picked: fuForm.call_picked === 'yes',
        details_pitched: fuForm.details_pitched === 'yes',
        batch_status: fuForm.batch_status || null,
        next_followup_date: fuForm.next_followup_date || null,
      });
      toast.success('Followup logged!');
      setShowFollowup(null);
      setFuForm(blankFu);
      await loadAll();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const submitCount = async () => {
    setLoading(true);
    try {
      await saveDailyCount(countForm);
      toast.success('Daily count saved!');
      setCountForm(blankCount);
      await loadAll();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const submitConvert = async () => {
    if (!convertForm.batch_id) return toast.error('Please select a batch');
    if (!convertForm.candidate_name?.trim()) return toast.error('Name is required');

    setLoading(true);
    try {
      await convertToStudent(showConvert.id, convertForm);
      toast.success(`${convertForm.candidate_name} converted to student!`);
      setShowConvert(null);
      setConvertForm(blankConvert);
      await loadAll();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to convert');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this enquiry?')) return;
    try {
      await deleteEnquiry(id);
      toast.success('Deleted');
      await loadAll();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleEdit = (enq) => {
    setEnqForm({
      date: formatDate(enq.date) || today(),
      name: enq.name || '',
      contact: enq.contact || '',
      email: enq.email || '',
      course_enquired_for: enq.course_enquired_for || '',
      course_suggested: enq.course_suggested || '',
      enquiry_mode: enq.enquiry_mode || 'call',
      source: enq.source || '',
      referred_by: enq.referred_by || '',
      list_type: enq.list_type || 'daily_followup',
      status: enq.status || 'new',
      notes: enq.notes || '',
      assigned_trainer_id: enq.assigned_trainer_id || '',
    });
    setEditEnquiry(enq);
    setTab(0);
  };

  const handleConvert = (enq) => {
    setConvertForm({
      ...blankConvert,
      candidate_name: enq.name || '',
      phone: enq.contact || '',
      email: enq.email || '',
    });
    setShowConvert(enq);
  };

  const filtered = enquiries.filter(
    (e) =>
      (filterStatus ? e.status === filterStatus : true) &&
      (search
        ? e.name?.toLowerCase().includes(search.toLowerCase()) || e.contact?.includes(search)
        : true)
  );

  const activeForFollowup = enquiries.filter(
    (e) => e.status !== 'converted' && e.status !== 'closed'
  );

  const balance = (
    parseFloat(convertForm.total_fee || 0) - parseFloat(convertForm.initial_payment || 0)
  ).toFixed(2);

  return (
    <div>
      <div style={S.card}>
        <div style={S.title}>
          Enquiry followup <span style={S.tag}>all enquiry sheets</span>
        </div>

        <div style={S.tabs}>
          {['Add new enquiry', 'Log followup call', 'All enquiries', 'Daily count'].map((t, i) => (
            <div
              key={i}
              style={{ ...S.tab, ...(tab === i ? S.tabA : {}) }}
              onClick={() => setTab(i)}
            >
              {t}
            </div>
          ))}
        </div>

        {tab === 0 && (
          <div>
            {editEnquiry && (
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
                Editing: {editEnquiry.name}
                <button
                  type="button"
                  style={S.actBtn}
                  onClick={() => {
                    setEditEnquiry(null);
                    setEnqForm(blankEnq);
                  }}
                >
                  Cancel
                </button>
              </div>
            )}

            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Date</label>
                <input
                  style={S.input}
                  type="date"
                  value={enqForm.date}
                  onChange={(e) => setE('date', e.target.value)}
                />
              </div>
              <div style={S.field}>
                <label style={S.label}>Email</label>
                <input
                  style={S.input}
                  type="email"
                  value={enqForm.email}
                  onChange={(e) => setE('email', e.target.value)}
                  placeholder="Email"
                />
              </div>
            </div>

            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Candidate name *</label>
                <input
                  style={S.input}
                  value={enqForm.name}
                  onChange={(e) => setE('name', e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div style={S.field}>
                <label style={S.label}>Contact number</label>
                <input
                  style={S.input}
                  value={enqForm.contact}
                  onChange={(e) => setE('contact', e.target.value)}
                  placeholder="Phone"
                />
              </div>
            </div>

            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Course enquired for</label>
                <input
                  style={S.input}
                  value={enqForm.course_enquired_for}
                  onChange={(e) => setE('course_enquired_for', e.target.value)}
                />
              </div>
              <div style={S.field}>
                <label style={S.label}>Course suggested</label>
                <input
                  style={S.input}
                  value={enqForm.course_suggested}
                  onChange={(e) => setE('course_suggested', e.target.value)}
                />
              </div>
            </div>

            <div style={S.row3}>
              <div style={S.field}>
                <label style={S.label}>Mode</label>
                <select
                  style={S.select}
                  value={enqForm.enquiry_mode}
                  onChange={(e) => setE('enquiry_mode', e.target.value)}
                >
                  {['call', 'walk_in', 'online', 'referral'].map((m) => (
                    <option key={m} value={m}>
                      {m.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>List type</label>
                <select
                  style={S.select}
                  value={enqForm.list_type}
                  onChange={(e) => setE('list_type', e.target.value)}
                >
                  {['daily_followup', 'batch_allocated', 'not_interested'].map((m) => (
                    <option key={m} value={m}>
                      {m.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>Status</label>
                <select
                  style={S.select}
                  value={enqForm.status}
                  onChange={(e) => setE('status', e.target.value)}
                >
                  {['new', 'followup', 'converted', 'not_interested', 'closed', 'daily_followup'].map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Source</label>
                <input
                  style={S.input}
                  value={enqForm.source}
                  onChange={(e) => setE('source', e.target.value)}
                  placeholder="Walk-in / Call / Referral / Online"
                />
              </div>
              <div style={S.field}>
                <label style={S.label}>Referred by</label>
                <input
                  style={S.input}
                  value={enqForm.referred_by}
                  onChange={(e) => setE('referred_by', e.target.value)}
                />
              </div>
            </div>

            <div style={S.field}>
              <label style={S.label}>Notes</label>
              <textarea
                style={S.textarea}
                value={enqForm.notes}
                onChange={(e) => setE('notes', e.target.value)}
                placeholder="Any extra notes..."
              />
            </div>

            <div style={S.btnRow}>
              <button type="button" style={S.btnP} onClick={submitEnquiry} disabled={loading}>
                {editEnquiry ? 'Update enquiry' : 'Add enquiry'}
              </button>
              <button
                type="button"
                style={S.btn}
                onClick={() => {
                  setEnqForm(blankEnq);
                  setEditEnquiry(null);
                }}
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {tab === 1 && (
          <div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
              Pick an enquiry to log a call:
            </div>
            {activeForFollowup.map((enq) => (
              <div
                key={enq.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid #eee',
                  marginBottom: 6,
                  background: '#fafafa',
                  gap: 8,
                }}
              >
                <div>
                  <strong style={{ fontSize: 13 }}>{enq.name}</strong>
                  <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>{enq.contact}</span>
                  <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>
                    {enq.course_enquired_for || '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={S.badge(statusColor[enq.status] || 'gray')}>{enq.status}</span>
                  <button
                    type="button"
                    style={{ ...S.actBtn, background: G, color: '#fff', border: 'none', padding: '4px 10px' }}
                    onClick={() => {
                      setShowFollowup(enq);
                      setFuForm(blankFu);
                    }}
                  >
                    Log call
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 2 && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <input
                style={{ ...S.input, maxWidth: 220 }}
                placeholder="Search name / phone"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                style={{ ...S.select, maxWidth: 180 }}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                {['new', 'followup', 'converted', 'not_interested', 'closed', 'daily_followup'].map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Date</th>
                    <th style={S.th}>Name</th>
                    <th style={S.th}>Contact</th>
                    <th style={S.th}>Course</th>
                    <th style={S.th}>Source</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((enq) => (
                    <tr key={enq.id}>
                      <td style={S.td}>{formatDate(enq.date)}</td>
                      <td style={S.td}>
                        <strong>{enq.name}</strong>
                      </td>
                      <td style={S.td}>{enq.contact || '—'}</td>
                      <td style={S.td}>{enq.course_enquired_for || '—'}</td>
                      <td style={S.td}>{enq.source || '—'}</td>
                      <td style={S.td}>
                        <span style={S.badge(statusColor[enq.status] || 'gray')}>{enq.status}</span>
                      </td>
                      <td style={S.td}>
                        <button type="button" style={S.actBtn} onClick={() => handleEdit(enq)}>
                          Edit
                        </button>
                        {!enq.student_id && (
                          <button
                            type="button"
                            style={{ ...S.actBtn, background: G, color: '#fff', border: 'none', marginRight: 4 }}
                            onClick={() => handleConvert(enq)}
                          >
                            Convert
                          </button>
                        )}
                        {enq.student_id && (
                          <span style={{ fontSize: 10, color: G, fontWeight: 600, marginRight: 4 }}>
                            Student
                          </span>
                        )}
                        <button
                          type="button"
                          style={{ ...S.actBtn, color: '#E53E3E' }}
                          onClick={() => handleDelete(enq.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!filtered.length && (
                    <tr>
                      <td style={S.td} colSpan={7}>
                        No enquiries found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 3 && (
          <div>
            <div style={{ background: '#f9f9f9', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={S.row3}>
                <div style={S.field}>
                  <label style={S.label}>Date</label>
                  <input
                    style={S.input}
                    type="date"
                    value={countForm.date}
                    onChange={(e) => setC('date', e.target.value)}
                  />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Call enquiries</label>
                  <input
                    style={S.input}
                    type="number"
                    min="0"
                    value={countForm.call_enquiries}
                    onChange={(e) => setC('call_enquiries', parseInt(e.target.value, 10) || 0)}
                  />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Walk-in enquiries</label>
                  <input
                    style={S.input}
                    type="number"
                    min="0"
                    value={countForm.walk_in_enquiries}
                    onChange={(e) => setC('walk_in_enquiries', parseInt(e.target.value, 10) || 0)}
                  />
                </div>
              </div>

              <div style={S.field}>
                <label style={S.label}>Remarks</label>
                <input
                  style={S.input}
                  value={countForm.remarks}
                  onChange={(e) => setC('remarks', e.target.value)}
                />
              </div>

              <div style={{ fontSize: 12, color: G, fontWeight: 600, marginBottom: 10 }}>
                Total: {(countForm.call_enquiries || 0) + (countForm.walk_in_enquiries || 0)}
              </div>

              <button type="button" style={S.btnP} onClick={submitCount} disabled={loading}>
                Save daily count
              </button>
            </div>

            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Date</th>
                  <th style={S.th}>Calls</th>
                  <th style={S.th}>Walk-ins</th>
                  <th style={S.th}>Total</th>
                  <th style={S.th}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {dailyCounts.map((d, i) => (
                  <tr key={i}>
                    <td style={S.td}>{formatDate(d.date)}</td>
                    <td style={S.td}>{d.call_enquiries}</td>
                    <td style={S.td}>{d.walk_in_enquiries}</td>
                    <td style={S.td}>
                      <strong>{d.total_enquiries}</strong>
                    </td>
                    <td style={S.td}>{d.remarks}</td>
                  </tr>
                ))}
                {!dailyCounts.length && (
                  <tr>
                    <td style={S.td} colSpan={5}>
                      No daily counts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showFollowup && (
        <div style={S.modal} onClick={(e) => e.target === e.currentTarget && setShowFollowup(null)}>
          <div style={S.modalBox}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{showFollowup.name}</div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 16 }}>
              {showFollowup.course_enquired_for} • {showFollowup.contact}
            </div>

            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Followup date</label>
                <input style={S.input} type="date" value={fuForm.followup_date} onChange={(e) => setF('followup_date', e.target.value)} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Call picked?</label>
                <select style={S.select} value={fuForm.call_picked} onChange={(e) => setF('call_picked', e.target.value)}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>

            <div style={S.field}>
              <label style={S.label}>Last response *</label>
              <textarea style={S.textarea} value={fuForm.last_response} onChange={(e) => setF('last_response', e.target.value)} placeholder="What they said..." />
            </div>

            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Ticket status</label>
                <select style={S.select} value={fuForm.ticket_status} onChange={(e) => setF('ticket_status', e.target.value)}>
                  {['open', 'pending', 'closed'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>Details pitched?</label>
                <select style={S.select} value={fuForm.details_pitched} onChange={(e) => setF('details_pitched', e.target.value)}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>

            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Batch status</label>
                <select style={S.select} value={fuForm.batch_status} onChange={(e) => setF('batch_status', e.target.value)}>
                  <option value="">Select</option>
                  {['available', 'full', 'upcoming'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>Next followup date</label>
                <input style={S.input} type="date" value={fuForm.next_followup_date} onChange={(e) => setF('next_followup_date', e.target.value)} />
              </div>
            </div>

            <div style={S.field}>
              <label style={S.label}>Remarks</label>
              <textarea style={S.textarea} value={fuForm.remarks} onChange={(e) => setF('remarks', e.target.value)} placeholder="Additional remarks..." />
            </div>

            <div style={{ marginBottom: 12 }}>
              <span style={S.badge(ticketStatusColor[fuForm.ticket_status] || 'gray')}>{fuForm.ticket_status}</span>
            </div>

            <div style={S.btnRow}>
              <button type="button" style={S.btnP} onClick={submitFollowup} disabled={loading}>
                Log followup
              </button>
              <button type="button" style={S.btn} onClick={() => setShowFollowup(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showConvert && (
        <div style={S.modal} onClick={(e) => e.target === e.currentTarget && setShowConvert(null)}>
          <div style={S.modalBox}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2, color: G }}>Convert to Student</div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 16 }}>
              Enquiry: {showConvert.name} • {showConvert.contact}
            </div>

            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Full name</label>
                <input style={S.input} value={convertForm.candidate_name} onChange={(e) => setCV('candidate_name', e.target.value)} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Phone</label>
                <input style={S.input} value={convertForm.phone} onChange={(e) => setCV('phone', e.target.value)} />
              </div>
            </div>

            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Email</label>
                <input style={S.input} type="email" value={convertForm.email} onChange={(e) => setCV('email', e.target.value)} />
              </div>
              <div style={S.field}>
                <label style={S.label}>WhatsApp number</label>
                <input style={S.input} value={convertForm.whatsapp_number} onChange={(e) => setCV('whatsapp_number', e.target.value)} />
              </div>
            </div>

            <div style={S.field}>
              <label style={S.label}>Assign Batch</label>
              <select style={S.select} value={convertForm.batch_id} onChange={(e) => setCV('batch_id', e.target.value)}>
                <option value="">Select batch</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batch_name}
                  </option>
                ))}
              </select>
            </div>

            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Total course fee</label>
                <input style={S.input} type="number" min="0" value={convertForm.total_fee} onChange={(e) => setCV('total_fee', e.target.value)} placeholder="e.g. 25000" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Payment mode</label>
                <select style={S.select} value={convertForm.payment_mode} onChange={(e) => setCV('payment_mode', e.target.value)}>
                  {['cash', 'upi', 'bank_transfer', 'cheque', 'other'].map((m) => (
                    <option key={m} value={m}>
                      {m.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Initial payment</label>
                <input style={S.input} type="number" min="0" value={convertForm.initial_payment} onChange={(e) => setCV('initial_payment', e.target.value)} placeholder="Amount paid now" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Reference no.</label>
                <input style={S.input} value={convertForm.reference_no} onChange={(e) => setCV('reference_no', e.target.value)} placeholder="UPI ref / cheque no" />
              </div>
            </div>

            <div style={S.field}>
              <label style={S.label}>Notes</label>
              <input style={S.input} value={convertForm.notes} onChange={(e) => setCV('notes', e.target.value)} placeholder="Any notes..." />
            </div>

            {!!convertForm.total_fee && (
              <div style={{ background: '#f0faf5', border: '1px solid #c3e6d8', borderRadius: 8, padding: '10px 14px', marginBottom: 10, fontSize: 12 }}>
                <span style={{ color: G, fontWeight: 600 }}>Fee Summary:</span>{' '}
                Total {convertForm.total_fee || 0} • Paid {convertForm.initial_payment || 0} •{' '}
                <span style={{ color: '#E53E3E' }}>Balance {balance}</span>
              </div>
            )}

            <div style={S.btnRow}>
              <button type="button" style={S.btnP} onClick={submitConvert} disabled={loading}>
                Confirm Create Student
              </button>
              <button type="button" style={S.btn} onClick={() => setShowConvert(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}