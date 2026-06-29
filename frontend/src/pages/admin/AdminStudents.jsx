import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosInstance';
import { syncStudentsSheet } from '../../api/sheetsSync';
import toast from 'react-hot-toast';

const G = '#1D9E75';
const PAGESIZE = 15;

const S = {
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 12,
  },
  th: {
    textAlign: 'left',
    padding: '9px 12px',
    borderBottom: '2px solid #f0f0f0',
    fontSize: 11,
    color: '#888',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid #f5f5f5',
    color: '#333',
    verticalAlign: 'middle',
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    fontSize: 12,
    outline: 'none',
    background: '#fff',
  },
  inputFull: {
    width: '100%',
    padding: '8px 11px',
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 12,
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '8px 11px',
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 12,
    outline: 'none',
    background: '#fff',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px 11px',
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 12,
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
    minHeight: 80,
    fontFamily: 'inherit',
  },
  label: {
    fontSize: 11,
    color: '#666',
    display: 'block',
    marginBottom: 4,
    fontWeight: 500,
  },
  row2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginBottom: 12,
  },
  field: {
    marginBottom: 12,
  },
  btnP: {
    padding: '9px 20px',
    borderRadius: 9,
    border: 'none',
    background: G,
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnS: {
    padding: '9px 16px',
    borderRadius: 9,
    border: '1px solid #ddd',
    background: '#fff',
    fontSize: 12,
    cursor: 'pointer',
  },
  modal: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalBox: {
    background: '#fff',
    borderRadius: 16,
    padding: 28,
    width: 620,
    maxWidth: '95vw',
    maxHeight: '92vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  panel: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  panelBox: {
    background: '#fff',
    width: 520,
    maxWidth: '96vw',
    height: '100vh',
    overflowY: 'auto',
    boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
    padding: 28,
  },
};

const feeColor = (paid, total) => {
  if (!total) return { bg: '#f0f0f0', color: '#888' };
  const pct = paid / total;
  if (pct >= 1) return { bg: '#E1F5EE', color: '#0F6E56' };
  if (pct >= 0.5) return { bg: '#FEF3C7', color: '#92400E' };
  return { bg: '#FCEBEB', color: '#A32D2D' };
};

const BLANK = {
  candidatename: '',
  phone: '',
  email: '',
  courseid: '',
  batchid: '',
  totalfee: '',
  paidamount: '',
  joindate: new Date().toISOString().split('T')[0],
};

const toNum = (v) => parseFloat(v || 0);
const fmtMoney = (n) => Number(n || 0).toLocaleString();
const fmtDate = (v) => {
  if (!v) return '';
  return String(v).split('T')[0];
};

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncingSheet, setSyncingSheet] = useState(false);

  const [search, setSearch] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [page, setPage] = useState(1);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState(null);
  const [payments, setPayments] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  const [payAmt, setPayAmt] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payLoading, setPayLoading] = useState(false);

  const [fuType, setFuType] = useState('general');
  const [fuCallStatus, setFuCallStatus] = useState('');
  const [fuResumeStatus, setFuResumeStatus] = useState('');
  const [fuInterviewCalls, setFuInterviewCalls] = useState('');
  const [fuRoundsCleared, setFuRoundsCleared] = useState('');
  const [fuInterested, setFuInterested] = useState('');
  const [fuPlacedStatus, setFuPlacedStatus] = useState('');
  const [fuNote, setFuNote] = useState('');
  const [fuDate, setFuDate] = useState(new Date().toISOString().split('T')[0]);
  const [fuLoading, setFuLoading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const resetAddForm = () => setForm(BLANK);

  const resetPaymentForm = () => {
    setPayAmt('');
    setPayNote('');
    setPayDate(new Date().toISOString().split('T')[0]);
  };

  const resetFollowupForm = () => {
    setFuType('general');
    setFuCallStatus('');
    setFuResumeStatus('');
    setFuInterviewCalls('');
    setFuRoundsCleared('');
    setFuInterested('');
    setFuPlacedStatus('');
    setFuNote('');
    setFuDate(new Date().toISOString().split('T')[0]);
  };

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/students');
      setStudents(r.data.students || []);
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const refreshDetail = async (studentId) => {
    const [p, f, one] = await Promise.all([
      api.get(`/students/${studentId}/payments`),
      api.get(`/student-followups?studentid=${studentId}`),
      api.get(`/students/${studentId}`),
    ]);
    setPayments(p.data.payments || []);
    setFollowups(f.data.followups || []);
    if (one.data.student) setDetail(one.data.student);
  };

  const handleSyncStudentsSheet = async () => {
    try {
      setSyncingSheet(true);
      const res = await syncStudentsSheet();
      if (res?.data?.success || res?.data?.message) {
        toast.success(
          res?.data?.message ||
            `Students sheet synced successfully (${res?.data?.count || 0} rows)`
        );
      } else {
        toast.error(res?.data?.error || 'Students sheet sync failed');
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to sync students sheet');
    } finally {
      setSyncingSheet(false);
    }
  };

  useEffect(() => {
    load();

    api
      .get('/batches')
      .then((r) => setBatches(r.data.batches || []))
      .catch(() => setBatches([]));

    api
      .get('/trainers/courses')
      .then((r) => setCourses(r.data.courses || []))
      .catch(() => setCourses([]));
  }, []);

  const openDetail = async (s) => {
    setDetail(s);
    setActiveTab('overview');
    setPayments([]);
    setFollowups([]);
    resetPaymentForm();
    resetFollowupForm();

    try {
      await refreshDetail(s.id);
    } catch {
      toast.error('Failed to load student details');
    }
  };

  const handleCreate = async () => {
    if (!form.candidatename.trim()) return toast.error('Name is required');
    if (!form.phone.trim()) return toast.error('Phone is required');

    const totalFee = form.totalfee ? parseFloat(form.totalfee) : 0;
    const initialPayment = form.paidamount ? parseFloat(form.paidamount) : 0;

    if (Number.isNaN(totalFee) || totalFee < 0) {
      return toast.error('Enter valid total fee');
    }

    if (Number.isNaN(initialPayment) || initialPayment < 0) {
      return toast.error('Enter valid initial payment');
    }

    if (totalFee > 0 && initialPayment > totalFee) {
      return toast.error('Initial payment cannot exceed total fee');
    }

    setSaving(true);
    try {
      const payload = {
        candidate_name: form.candidatename.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        whatsapp_number: form.phone.trim() || null,
        batch_id: form.batchid || null,
        total_fee: totalFee,
        payment_mode: 'cash',
        initial_payment: initialPayment,
        reference_no: null,
        joined_date: form.joindate || null,
        status: 'active',
        notes: null,
        certificate_no: null,
        resolution_note: null,
      };

      console.log('student payload', payload);

      await api.post('/students', payload);
      toast.success(`${form.candidatename} enrolled!`);
      setShowAdd(false);
      resetAddForm();
      load();
    } catch (e) {
      console.error('create student error', e?.response?.data || e);
      toast.error(e?.response?.data?.error || 'Failed to add student');
    } finally {
      setSaving(false);
    }
  };

  const handlePayment = async () => {
    if (!detail?.id) return;
    if (!payAmt || parseFloat(payAmt) <= 0) return toast.error('Enter valid amount');

    const amount = parseFloat(payAmt);
    const currentBalance = Math.max(
      toNum(detail.total_fee) - toNum(detail.paid_amount),
      0
    );

    if (toNum(detail.total_fee) > 0 && amount > currentBalance) {
      return toast.error(`Payment exceeds balance of ${fmtMoney(currentBalance)}`);
    }

    setPayLoading(true);
    try {
      await api.post(`/students/${detail.id}/payments`, {
        amount,
        payment_date: payDate,
        notes: payNote.trim() || null,
      });
      toast.success(`${fmtMoney(amount)} payment recorded!`);
      resetPaymentForm();
      await refreshDetail(detail.id);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Payment failed');
    } finally {
      setPayLoading(false);
    }
  };

  const handleFollowup = async () => {
    if (!detail?.id) return;
    if (!fuNote.trim()) return toast.error('Enter follow-up note');

    setFuLoading(true);
    try {
      await api.post('/student-followups', {
        studentid: detail.id,
        followuptype: fuType || 'general',
        callstatus: fuCallStatus || null,
        lastcontactdate: fuDate || null,
        remarks: fuNote.trim(),
        resumestatus: fuResumeStatus || null,
        noofinterviewcalls: fuInterviewCalls ? parseInt(fuInterviewCalls, 10) : 0,
        noofroundscleared: fuRoundsCleared ? parseInt(fuRoundsCleared, 10) : 0,
        interested: fuInterested === '' ? null : fuInterested === 'true',
        placedstatus: fuPlacedStatus || null,
      });
      toast.success('Follow-up added!');
      resetFollowupForm();
      await refreshDetail(detail.id);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to add follow-up');
    } finally {
      setFuLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const q = search.toLowerCase();
      const mQ =
        !search ||
        s.candidate_name?.toLowerCase().includes(q) ||
        s.phone?.includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.batch_name?.toLowerCase().includes(q);

      const mB = !filterBatch || String(s.batch_id) === String(filterBatch);
      return mQ && mB;
    });
  }, [students, search, filterBatch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGESIZE));
  const paginated = filtered.slice((page - 1) * PAGESIZE, page * PAGESIZE);

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const totalFee = students.reduce((sum, x) => sum + toNum(x.total_fee), 0);
  const totalPaid = students.reduce((sum, x) => sum + toNum(x.paid_amount), 0);
  const pendingFee = Math.max(totalFee - totalPaid, 0);

  const paymentsWithBalance = useMemo(() => {
    if (!detail?.total_fee || payments.length === 0) return payments;
    const totalFeeNum = parseFloat(detail.total_fee || 0);
    let cumulativePaid = 0;

    return [...payments]
      .sort((a, b) => {
        const da = new Date(a.payment_date || a.created_at);
        const db = new Date(b.payment_date || b.created_at);
        return da - db;
      })
      .map((p, index) => {
        cumulativePaid += parseFloat(p.amount || 0);
        const remaining = Math.max(0, totalFeeNum - cumulativePaid);
        return {
          ...p,
          cumulative_paid: cumulativePaid,
          remaining_balance: remaining,
          order: index + 1,
        };
      });
  }, [payments, detail]);

  const currentStudentBalance = detail
    ? Math.max(toNum(detail.total_fee) - toNum(detail.paid_amount), 0)
    : 0;

  const filteredBatchOptions = batches.filter(
    (b) => !form.courseid || String(b.course_id) === String(form.courseid)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={S.card}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#111' }}>Students</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
              {filtered.length} of {students.length} students
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleSyncStudentsSheet}
              disabled={syncingSheet}
              style={{
                ...S.btnS,
                borderColor: '#bbf7d0',
                color: syncingSheet ? '#999' : '#166534',
                background: syncingSheet ? '#f9fafb' : '#f0fdf4',
                fontWeight: 600,
                opacity: syncingSheet ? 0.7 : 1,
                cursor: syncingSheet ? 'not-allowed' : 'pointer',
              }}
            >
              {syncingSheet ? 'Syncing...' : 'Sync Students Sheet'}
            </button>

            <button
              type="button"
              onClick={() => {
                resetAddForm();
                setShowAdd(true);
              }}
              style={S.btnP}
            >
              Enroll Student
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Total Students', value: students.length, color: '#111', bg: '#f9f9f9' },
            { label: 'Total Fee', value: `${(totalFee / 1000).toFixed(1)}K`, color: '#185FA5', bg: '#EFF6FF' },
            { label: 'Collected', value: `${(totalPaid / 1000).toFixed(1)}K`, color: G, bg: '#E1F5EE' },
            { label: 'Pending', value: `${(pendingFee / 1000).toFixed(1)}K`, color: '#DC2626', bg: '#FEF2F2' },
          ].map((k, i) => (
            <div key={i} style={{ background: k.bg, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: 10, color: '#888', marginTop: 3 }}>{k.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto', gap: 8, marginBottom: 14 }}>
          <input
            style={{ ...S.input, minWidth: 220 }}
            placeholder="Search name / phone / email / batch..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <select
            style={S.input}
            value={filterBatch}
            onChange={(e) => {
              setFilterBatch(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.batch_name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setSearch('');
              setFilterBatch('');
              setPage(1);
            }}
            style={{ ...S.btnS, color: '#DC2626', borderColor: '#fecaca', fontSize: 11 }}
          >
            Clear
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 50, color: '#aaa', fontSize: 13 }}>Loading...</div>
        ) : paginated.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 50, color: '#bbb', fontSize: 13 }}>
            {students.length === 0 ? 'No students yet — enroll one!' : 'No students match your search'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>#</th>
                  <th style={S.th}>Student</th>
                  <th style={S.th}>Phone</th>
                  <th style={S.th}>Batch</th>
                  <th style={S.th}>Fee</th>
                  <th style={S.th}>Paid</th>
                  <th style={S.th}>Balance</th>
                  <th style={S.th}>Fee Status</th>
                  <th style={S.th}>Joined</th>
                  <th style={S.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((s, i) => {
                  const paid = toNum(s.paid_amount);
                  const total = toNum(s.total_fee);
                  const balance = Math.max(total - paid, 0);
                  const fc = feeColor(paid, total);

                  return (
                    <tr
                      key={s.id}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f0faf5';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#fff';
                      }}
                    >
                      <td style={{ ...S.td, color: '#ccc', fontSize: 11 }}>
                        {(page - 1) * PAGESIZE + i + 1}
                      </td>

                      <td style={S.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: '50%',
                              flexShrink: 0,
                              background: 'linear-gradient(135deg,#1D9E75,#15c78a)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {s.candidate_name?.[0]?.toUpperCase() || '?'}
                          </div>

                          <div>
                            <div
                              style={{
                                fontWeight: 700,
                                color: '#111',
                                cursor: 'pointer',
                                textDecoration: 'underline dotted',
                                textUnderlineOffset: 3,
                              }}
                              onClick={() => openDetail(s)}
                            >
                              {s.candidate_name}
                            </div>
                            <div style={{ fontSize: 10, color: '#aaa' }}>{s.email}</div>
                          </div>
                        </div>
                      </td>

                      <td style={S.td}>{s.phone}</td>

                      <td style={S.td}>
                        {s.batch_name ? (
                          <span style={{ background: '#EFF6FF', color: '#185FA5', fontSize: 10, padding: '2px 8px', borderRadius: 8 }}>
                            {s.batch_name}
                          </span>
                        ) : (
                          <span style={{ color: '#ccc' }}>—</span>
                        )}
                      </td>

                      <td style={S.td}>{fmtMoney(total)}</td>

                      <td style={S.td}>
                        <span style={{ background: fc.bg, color: fc.color, fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 600 }}>
                          {fmtMoney(paid)}
                        </span>
                      </td>

                      <td style={S.td}>
                        {balance > 0 ? (
                          <span style={{ color: '#DC2626', fontWeight: 700 }}>{fmtMoney(balance)}</span>
                        ) : (
                          <span style={{ color: G, fontWeight: 700 }}>Clear</span>
                        )}
                      </td>

                      <td style={S.td}>
                        <span
                          style={{
                            fontSize: 10,
                            padding: '2px 8px',
                            borderRadius: 20,
                            fontWeight: 600,
                            background:
                              s.fee_status === 'paid'
                                ? '#E1F5EE'
                                : s.fee_status === 'partial'
                                ? '#FEF3C7'
                                : '#f0f0f0',
                            color:
                              s.fee_status === 'paid'
                                ? G
                                : s.fee_status === 'partial'
                                ? '#92400E'
                                : '#888',
                          }}
                        >
                          {s.fee_status}
                        </span>
                      </td>

                      <td style={{ ...S.td, whiteSpace: 'nowrap', fontSize: 11, color: '#888' }}>
                        {fmtDate(s.joined_date)}
                      </td>

                      <td style={S.td}>
                        <button
                          type="button"
                          onClick={() => openDetail(s)}
                          style={{ fontSize: 10, padding: '5px 10px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 }}>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ ...S.btnS, padding: '5px 12px', opacity: page === 1 ? 0.4 : 1 }}
            >
              Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setPage(p)}
                style={{
                  ...S.btnS,
                  padding: '5px 10px',
                  minWidth: 32,
                  background: p === page ? G : '#fff',
                  color: p === page ? '#fff' : '#333',
                  border: `1px solid ${p === page ? G : '#ddd'}`,
                  fontWeight: p === page ? 700 : 400,
                }}
              >
                {p}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ ...S.btnS, padding: '5px 12px', opacity: page === totalPages ? 0.4 : 1 }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {showAdd && (
        <div style={S.modal} onClick={(e) => e.target === e.currentTarget && setShowAdd(false)}>
          <div style={S.modalBox}>
            <div style={{ fontSize: 15, fontWeight: 800, color: G, marginBottom: 4 }}>Enroll New Student</div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 20 }}>Add a new student to the system</div>

            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Full Name *</label>
                <input
                  style={S.inputFull}
                  value={form.candidatename}
                  onChange={(e) => set('candidatename', e.target.value)}
                  placeholder="Student name"
                  autoFocus
                />
              </div>
              <div style={S.field}>
                <label style={S.label}>Phone *</label>
                <input
                  style={S.inputFull}
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="10-digit mobile"
                />
              </div>
            </div>

            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Email</label>
                <input
                  style={S.inputFull}
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
              <div style={S.field}>
                <label style={S.label}>Join Date</label>
                <input
                  style={S.inputFull}
                  type="date"
                  value={form.joindate}
                  onChange={(e) => set('joindate', e.target.value)}
                />
              </div>
            </div>

            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Course</label>
                <select
                  style={S.select}
                  value={form.courseid}
                  onChange={(e) => {
                    set('courseid', e.target.value);
                    set('batchid', '');
                  }}
                >
                  <option value="">Select course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_name || c.coursename}
                    </option>
                  ))}
                </select>
              </div>

              <div style={S.field}>
                <label style={S.label}>Batch</label>
                <select
                  style={S.select}
                  value={form.batchid}
                  onChange={(e) => set('batchid', e.target.value)}
                >
                  <option value="">Select batch</option>
                  {filteredBatchOptions.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batch_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Total Fee</label>
                <input
                  style={S.inputFull}
                  type="number"
                  value={form.totalfee}
                  onChange={(e) => set('totalfee', e.target.value)}
                  placeholder="e.g. 25000"
                />
              </div>
              <div style={S.field}>
                <label style={S.label}>Initial Payment</label>
                <input
                  style={S.inputFull}
                  type="number"
                  value={form.paidamount}
                  onChange={(e) => set('paidamount', e.target.value)}
                  placeholder="Amount paid today"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" style={S.btnP} onClick={handleCreate} disabled={saving}>
                {saving ? 'Enrolling...' : 'Enroll Student'}
              </button>
              <button type="button" style={S.btnS} onClick={() => setShowAdd(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div style={S.panel} onClick={(e) => e.target === e.currentTarget && setDetail(null)}>
          <div style={S.panelBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg,#1D9E75,#15c78a)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {detail.candidate_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#111' }}>{detail.candidate_name}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>
                    {detail.phone} • {detail.email || 'No email'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetail(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, color: '#aaa', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#f5f5f5', borderRadius: 10, padding: 4 }}>
              {[
                { key: 'overview', label: 'Overview' },
                { key: 'payments', label: `Payments (${payments.length})` },
                { key: 'followups', label: `Follow-ups (${followups.length})` },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  style={{
                    flex: 1,
                    padding: '7px 4px',
                    borderRadius: 8,
                    border: 'none',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: activeTab === t.key ? '#fff' : 'transparent',
                    color: activeTab === t.key ? '#111' : '#888',
                    boxShadow: activeTab === t.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Batch', value: detail.batch_name },
                    { label: 'Course', value: detail.course_name },
                    { label: 'Joined', value: fmtDate(detail.joined_date) },
                    { label: 'Status', value: detail.status },
                    { label: 'Total Fee', value: fmtMoney(detail.total_fee) },
                    { label: 'Paid', value: fmtMoney(detail.paid_amount) },
                  ].map((r, i) => (
                    <div key={i} style={{ background: '#f9f9f9', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: '#aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>
                        {r.label}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>{r.value || '—'}</div>
                    </div>
                  ))}
                </div>

                {toNum(detail.total_fee) > 0 && (
                  <div style={{ background: '#f9f9f9', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, marginBottom: 6 }}>
                      <span>Fee Progress</span>
                      <span style={{ color: currentStudentBalance === 0 ? G : '#D97706' }}>
                        {Math.min(100, (toNum(detail.paid_amount) / toNum(detail.total_fee)) * 100).toFixed(0)}% paid
                      </span>
                    </div>
                    <div style={{ height: 8, background: '#e5e5e5', borderRadius: 4, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(100, (toNum(detail.paid_amount) / toNum(detail.total_fee)) * 100)}%`,
                          height: '100%',
                          borderRadius: 4,
                          background:
                            currentStudentBalance === 0
                              ? G
                              : toNum(detail.paid_amount) / toNum(detail.total_fee) >= 0.5
                              ? '#D97706'
                              : '#DC2626',
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#aaa', marginTop: 4 }}>
                      <span>Paid {fmtMoney(detail.paid_amount)}</span>
                      <span>Balance {fmtMoney(currentStudentBalance)}</span>
                    </div>
                  </div>
                )}

                <div style={{ background: '#FCFCFC', border: '1px solid #eee', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 11, color: '#666', marginBottom: 4, fontWeight: 700 }}>Recent follow-up</div>
                  <div style={{ fontSize: 12, color: '#333' }}>{followups[0]?.remarks || 'No follow-up yet'}</div>
                  {followups[0] && (
                    <div style={{ marginTop: 4, fontSize: 10, color: '#999' }}>
                      {fmtDate(followups[0].lastcontactdate || followups[0].createdat)}
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'payments' && (
              <>
                <div style={{ background: '#f0faf5', borderRadius: 10, padding: 14, marginBottom: 14, border: '1px solid #1D9E7533' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: G, marginBottom: 10 }}>Record Payment</div>
                  <div style={{ fontSize: 11, color: '#666', marginBottom: 10 }}>
                    Remaining balance:{' '}
                    <span style={{ fontWeight: 700, color: currentStudentBalance === 0 ? G : '#DC2626' }}>
                      {fmtMoney(currentStudentBalance)}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <div>
                      <label style={S.label}>Amount</label>
                      <input
                        style={S.inputFull}
                        type="number"
                        value={payAmt}
                        onChange={(e) => setPayAmt(e.target.value)}
                        placeholder="e.g. 5000"
                      />
                    </div>
                    <div>
                      <label style={S.label}>Date</label>
                      <input
                        style={S.inputFull}
                        type="date"
                        value={payDate}
                        onChange={(e) => setPayDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <label style={S.label}>Notes</label>
                    <input
                      style={S.inputFull}
                      value={payNote}
                      onChange={(e) => setPayNote(e.target.value)}
                      placeholder="Optional note"
                    />
                  </div>

                  <button type="button" style={{ ...S.btnP, fontSize: 11 }} onClick={handlePayment} disabled={payLoading}>
                    {payLoading ? 'Saving...' : 'Add Payment'}
                  </button>
                </div>

                {paymentsWithBalance.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 30, color: '#bbb', fontSize: 12 }}>No payments yet</div>
                ) : (
                  <div style={{ background: '#f9f9f9', borderRadius: 12, padding: 16, border: '1px solid #e5e5e5' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#111', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #e0e0e0' }}>
                      Payment History • Total Fee {fmtMoney(detail.total_fee)}
                    </div>

                    {paymentsWithBalance.map((p, i) => {
                      const balanceColor = p.remaining_balance === 0 ? G : '#DC2626';
                      return (
                        <div
                          key={p.id || i}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '2fr 1fr 1.5fr 1fr 1fr',
                            gap: 12,
                            padding: '12px 0',
                            borderBottom: i < paymentsWithBalance.length - 1 ? '1px solid #f0f0f0' : 'none',
                            alignItems: 'center',
                            fontSize: 11,
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, color: G, fontSize: 12 }}>{fmtMoney(p.amount)}</div>
                            <div style={{ color: '#666', marginTop: 2 }}>{p.notes}</div>
                          </div>
                          <div>{fmtDate(p.payment_date || p.created_at)}</div>
                          <div>Cumulative: {fmtMoney(p.cumulative_paid)}</div>
                          <div style={{ color: balanceColor, fontWeight: 700 }}>{fmtMoney(p.remaining_balance)}</div>
                          <div>#{p.order}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {activeTab === 'followups' && (
              <>
                <div style={{ background: '#FCFCFC', border: '1px solid #eee', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#111', marginBottom: 10 }}>Add Follow-up</div>

                  <div style={S.row2}>
                    <div>
                      <label style={S.label}>Type</label>
                      <select style={S.select} value={fuType} onChange={(e) => setFuType(e.target.value)}>
                        <option value="general">General</option>
                        <option value="call">Call</option>
                        <option value="resume">Resume</option>
                        <option value="interview">Interview</option>
                        <option value="placement">Placement</option>
                      </select>
                    </div>
                    <div>
                      <label style={S.label}>Date</label>
                      <input style={S.inputFull} type="date" value={fuDate} onChange={(e) => setFuDate(e.target.value)} />
                    </div>
                  </div>

                  <div style={S.row2}>
                    <div>
                      <label style={S.label}>Call Status</label>
                      <input style={S.inputFull} value={fuCallStatus} onChange={(e) => setFuCallStatus(e.target.value)} />
                    </div>
                    <div>
                      <label style={S.label}>Resume Status</label>
                      <input style={S.inputFull} value={fuResumeStatus} onChange={(e) => setFuResumeStatus(e.target.value)} />
                    </div>
                  </div>

                  <div style={S.row2}>
                    <div>
                      <label style={S.label}>Interview Calls</label>
                      <input style={S.inputFull} type="number" value={fuInterviewCalls} onChange={(e) => setFuInterviewCalls(e.target.value)} />
                    </div>
                    <div>
                      <label style={S.label}>Rounds Cleared</label>
                      <input style={S.inputFull} type="number" value={fuRoundsCleared} onChange={(e) => setFuRoundsCleared(e.target.value)} />
                    </div>
                  </div>

                  <div style={S.row2}>
                    <div>
                      <label style={S.label}>Interested</label>
                      <select style={S.select} value={fuInterested} onChange={(e) => setFuInterested(e.target.value)}>
                        <option value="">Select</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                    <div>
                      <label style={S.label}>Placed Status</label>
                      <input style={S.inputFull} value={fuPlacedStatus} onChange={(e) => setFuPlacedStatus(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <label style={S.label}>Remarks</label>
                    <textarea style={S.textarea} value={fuNote} onChange={(e) => setFuNote(e.target.value)} />
                  </div>

                  <button type="button" style={{ ...S.btnP, fontSize: 11 }} onClick={handleFollowup} disabled={fuLoading}>
                    {fuLoading ? 'Saving...' : 'Add Follow-up'}
                  </button>
                </div>

                {followups.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 30, color: '#bbb', fontSize: 12 }}>No follow-ups yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {followups.map((f) => (
                      <div key={f.id} style={{ border: '1px solid #eee', borderRadius: 10, padding: 12, background: '#fcfcfc' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>{f.followuptype || 'Follow-up'}</div>
                        <div style={{ fontSize: 10, color: '#888', marginTop: 3 }}>{fmtDate(f.lastcontactdate || f.createdat)}</div>
                        <div style={{ marginTop: 8, fontSize: 11, color: '#444' }}>{f.remarks}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}