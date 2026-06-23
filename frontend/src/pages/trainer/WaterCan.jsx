import { useState, useEffect } from 'react';
import {
  getWaterEntries,
  createWaterEntry,
  updateWaterEntry,
  deleteWaterEntry
} from '../../api/watercan';
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
    alignItems: 'center'
  },
  tag: { fontSize: 9, background: '#E6F1FB', color: '#185FA5', padding: '2px 6px', borderRadius: 4 },
  tabs: { display: 'flex', borderBottom: '1px solid #eee', marginBottom: 14 },
  tab: { padding: '7px 14px', fontSize: 12, cursor: 'pointer', borderBottom: '2px solid transparent', color: '#888' },
  tabA: { borderBottomColor: G, color: G, fontWeight: 500 },
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
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    padding: '7px 10px',
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 12,
    outline: 'none',
    background: '#fff',
    boxSizing: 'border-box'
  },
  btnRow: { display: 'flex', gap: 8, marginTop: 12 },
  btn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid #ddd',
    background: '#fff',
    fontSize: 12,
    cursor: 'pointer'
  },
  btnP: {
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    background: G,
    color: '#fff',
    fontSize: 12,
    cursor: 'pointer'
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: {
    textAlign: 'left',
    padding: '8px 10px',
    borderBottom: '1px solid #eee',
    fontSize: 11,
    color: '#888',
    fontWeight: 500
  },
  td: { padding: '8px 10px', borderBottom: '1px solid #f5f5f5', color: '#333' },
  actBtn: {
    fontSize: 10,
    padding: '3px 8px',
    borderRadius: 6,
    border: '1px solid #ddd',
    background: '#fff',
    cursor: 'pointer',
    marginRight: 4
  },
  badge: (c) => ({
    fontSize: 10,
    padding: '2px 8px',
    borderRadius: 10,
    background: c === 'green' ? '#E1F5EE' : c === 'red' ? '#FCEBEB' : '#f0f0f0',
    color: c === 'green' ? '#0F6E56' : c === 'red' ? '#A32D2D' : '#666'
  }),
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))',
    gap: 12,
    marginBottom: 16
  },
  kpi: { background: '#f9f9f9', borderRadius: 10, padding: '12px 14px', border: '1px solid #eee' },
  kpiNum: { fontSize: 22, fontWeight: 700, color: '#222', lineHeight: 1 },
  kpiLabel: { fontSize: 10, color: '#888', marginTop: 3 },
  infoBox: {
    background: '#E1F5EE',
    border: '1px solid #9FE1CB',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 11,
    color: '#0F6E56',
    marginBottom: 12
  },
  waBox: {
    background: '#E1F5EE',
    border: '1px solid #9FE1CB',
    borderRadius: 8,
    padding: '12px 14px',
    fontSize: 11,
    color: '#0F6E56',
    marginTop: 10
  },
  waBtn: {
    marginTop: 10,
    padding: '7px 16px',
    background: '#25D366',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 12,
    cursor: 'pointer'
  }
};

const RO_PRICE = 40;
const BIS_PRICE = 120;

const today = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const curMonth = () => new Date().getMonth() + 1;
const curYear = () => new Date().getFullYear();
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const makeBlankForm = () => ({
  date: today(),
  no_of_ro_water: '',
  no_of_bisleri_water: '',
  paid_or_balance: 'paid',
  balance: '',
  wa_sent: false
});

export default function WaterCan() {
  const [tab, setTab] = useState(0);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [month, setMonth] = useState(curMonth());
  const [year, setYear] = useState(curYear());
  const [form, setForm] = useState(makeBlankForm());

  const ro = parseInt(form.no_of_ro_water, 10) || 0;
  const bis = parseInt(form.no_of_bisleri_water, 10) || 0;
  const computedTotal = ro + bis;
  const computedAmount = (ro * RO_PRICE) + (bis * BIS_PRICE);

  useEffect(() => {
    loadEntries();
  }, [month, year]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const r = await getWaterEntries({ month, year });
      setEntries(r.data.entries || []);
      setSummary(r.data.summary || null);
    } catch {
      toast.error('Failed to load water can data');
    } finally {
      setLoading(false);
    }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const clearForm = () => {
    setForm(makeBlankForm());
    setEditId(null);
  };

  const buildWA = () =>
    `💧 Water Can Log (${form.date})\n\nRO water: ${ro} can${ro !== 1 ? 's' : ''} × ₹${RO_PRICE} = ₹${ro * RO_PRICE}\nBisleri: ${bis} can${bis !== 1 ? 's' : ''} × ₹${BIS_PRICE} = ₹${bis * BIS_PRICE}\n\nTotal cans: ${computedTotal}\nTotal amount: ₹${computedAmount}\nPayment: ${form.paid_or_balance === 'paid' ? '✅ Paid' : `⚠️ Balance pending${form.balance ? ' — ₹' + form.balance : ''}`}`;

  const openWA = () => {
    window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(buildWA())}`, '_blank');
    set('wa_sent', true);
    toast.success('WhatsApp opened — select contact manually');
  };

  const handleSubmit = async () => {
    if (!form.date) return toast.error('Date is required');
    if (ro === 0 && bis === 0) return toast.error('Enter at least one water can');

    setLoading(true);
    try {
      const payload = {
        date: form.date,
        no_of_ro_water: ro,
        no_of_bisleri_water: bis,
        paid_or_balance: form.paid_or_balance,
        balance: parseFloat(form.balance) || 0
      };

      if (editId) {
        await updateWaterEntry(editId, payload);
        toast.success('Entry updated!');
      } else {
        await createWaterEntry(payload);
        toast.success('Water log saved!');
      }

      clearForm();
      await loadEntries();
      setTab(1);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (e) => {
    setForm({
      date: e.date || today(),
      no_of_ro_water: e.no_of_ro_water ?? '',
      no_of_bisleri_water: e.no_of_bisleri_water ?? '',
      paid_or_balance: e.paid_or_balance || 'paid',
      balance: e.balance ?? '',
      wa_sent: e.wa_sent || false
    });
    setEditId(e.id);
    setTab(0);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return;

    try {
      await deleteWaterEntry(id);
      toast.success('Deleted');
      await loadEntries();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div>
      <div style={S.card}>
        <div style={S.title}>
          Water can log <span style={S.tag}>→ Water Can Details</span>
        </div>

        <div style={S.infoBox}>
          💧 RO water — ₹{RO_PRICE}/can &nbsp;|&nbsp; 🍶 Bisleri — ₹{BIS_PRICE}/can &nbsp;|&nbsp; Amount auto-calculated
        </div>

        <div style={S.tabs}>
          {['Add entry', 'View history'].map((t, i) => (
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
                  alignItems: 'center'
                }}
              >
                <span>✏️ Editing existing entry</span>
                <button style={S.actBtn} onClick={clearForm}>✕ Cancel</button>
              </div>
            )}

            <div style={S.row3}>
              <div style={S.field}>
                <label style={S.label}>Date</label>
                <input
                  style={S.input}
                  type="date"
                  value={form.date}
                  onChange={(e) => set('date', e.target.value)}
                />
              </div>

              <div style={S.field}>
                <label style={S.label}>RO water (cans) — ₹{RO_PRICE}/can</label>
                <input
                  style={S.input}
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.no_of_ro_water}
                  onChange={(e) => set('no_of_ro_water', e.target.value)}
                />
              </div>

              <div style={S.field}>
                <label style={S.label}>Bisleri (cans) — ₹{BIS_PRICE}/can</label>
                <input
                  style={S.input}
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.no_of_bisleri_water}
                  onChange={(e) => set('no_of_bisleri_water', e.target.value)}
                />
              </div>
            </div>

            {(ro > 0 || bis > 0) && (
              <div
                style={{
                  background: '#f9f9f9',
                  border: '1px solid #eee',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 10,
                  fontSize: 12,
                  display: 'flex',
                  gap: 24,
                  flexWrap: 'wrap'
                }}
              >
                <div><span style={{ color: '#888' }}>Total cans: </span><strong>{computedTotal}</strong></div>
                <div><span style={{ color: '#888' }}>Amount: </span><strong style={{ color: G }}>₹{computedAmount}</strong></div>
                <div><span style={{ color: '#888' }}>RO: </span>{ro} × ₹{RO_PRICE} = ₹{ro * RO_PRICE}</div>
                <div><span style={{ color: '#888' }}>Bisleri: </span>{bis} × ₹{BIS_PRICE} = ₹{bis * BIS_PRICE}</div>
              </div>
            )}

            <div style={S.row2}>
              <div style={S.field}>
                <label style={S.label}>Payment status</label>
                <select
                  style={S.select}
                  value={form.paid_or_balance}
                  onChange={(e) => set('paid_or_balance', e.target.value)}
                >
                  <option value="paid">✅ Paid</option>
                  <option value="balance">⚠️ Balance (pending)</option>
                </select>
              </div>

              {form.paid_or_balance === 'balance' && (
                <div style={S.field}>
                  <label style={S.label}>Balance amount (₹)</label>
                  <input
                    style={S.input}
                    type="number"
                    min="0"
                    placeholder="e.g. 80"
                    value={form.balance}
                    onChange={(e) => set('balance', e.target.value)}
                  />
                </div>
              )}
            </div>

            {(ro > 0 || bis > 0) && (
              <div style={S.waBox}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>📱 WhatsApp message preview:</div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, fontFamily: 'monospace', fontSize: 11 }}>
                  {buildWA()}
                </div>
                <button style={S.waBtn} onClick={openWA}>
                  Open WhatsApp Web → select contact manually
                </button>
                {form.wa_sent && (
                  <span style={{ marginLeft: 10, fontSize: 10, color: '#0F6E56', fontWeight: 500 }}>
                    ✓ Sent
                  </span>
                )}
              </div>
            )}

            <div style={S.btnRow}>
              <button style={S.btnP} onClick={handleSubmit} disabled={loading}>
                {loading ? 'Saving...' : editId ? 'Update entry' : 'Save entry'}
              </button>
              <button style={S.btn} onClick={clearForm}>Clear</button>
            </div>
          </div>
        )}

        {tab === 1 && (
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
              <select
                style={{ ...S.select, maxWidth: 120 }}
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value, 10))}
              >
                {months.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>

              <select
                style={{ ...S.select, maxWidth: 90 }}
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
              >
                {[2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {summary && (
              <div style={S.kpiGrid}>
                {[
                  { num: summary.total_cans || 0, label: 'Total cans' },
                  { num: `₹${summary.total_amount || 0}`, label: 'Total amount' },
                  { num: `₹${summary.paid_amount || 0}`, label: 'Paid' },
                  { num: `₹${summary.total_balance || 0}`, label: 'Balance pending', accent: '#E53E3E' }
                ].map((k, i) => (
                  <div key={i} style={S.kpi}>
                    <div style={{ ...S.kpiNum, color: k.accent || '#222' }}>{k.num}</div>
                    <div style={S.kpiLabel}>{k.label}</div>
                  </div>
                ))}
              </div>
            )}

            {entries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#aaa', fontSize: 12 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>💧</div>
                No entries for this month
              </div>
            ) : (
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Date</th>
                    <th style={S.th}>RO</th>
                    <th style={S.th}>Bisleri</th>
                    <th style={S.th}>Total</th>
                    <th style={S.th}>Amount</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Balance</th>
                    <th style={S.th}>WA</th>
                    <th style={S.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td style={S.td}>{e.date}</td>
                      <td style={S.td}>{e.no_of_ro_water}</td>
                      <td style={S.td}>{e.no_of_bisleri_water}</td>
                      <td style={S.td}><strong>{e.total_water_cans}</strong></td>
                      <td style={S.td}><strong style={{ color: G }}>₹{e.amount}</strong></td>
                      <td style={S.td}>
                        <span style={S.badge(e.paid_or_balance === 'paid' ? 'green' : 'red')}>
                          {e.paid_or_balance === 'paid' ? 'Paid' : 'Balance'}
                        </span>
                      </td>
                      <td style={S.td}>{Number(e.balance) > 0 ? `₹${e.balance}` : '—'}</td>
                      <td style={S.td}>
                        <span style={S.badge(e.wa_sent ? 'green' : '')}>
                          {e.wa_sent ? 'Sent' : '—'}
                        </span>
                      </td>
                      <td style={S.td}>
                        <button style={S.actBtn} onClick={() => handleEdit(e)}>✎ Edit</button>
                        <button style={{ ...S.actBtn, color: '#E53E3E' }} onClick={() => handleDelete(e.id)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}