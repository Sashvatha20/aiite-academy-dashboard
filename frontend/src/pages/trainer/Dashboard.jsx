import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/axiosInstance';
import {
  RefreshCw,
  CalendarDays,
  Star,
  Clock3,
  GraduationCap,
  TriangleAlert,
  MapPin,
  Wifi,
  ShieldCheck,
  ShieldX,
  LogIn,
  LogOut,
  CheckCircle2,
  XCircle,
  AlarmClock,
  BarChart3,
  BookOpen,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

const OFFICE_IP_PREFIX = '49.206.';
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

const fmtTime = (t) =>
  t
    ? new Date(t).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const fmtHours = (h) => {
  const n = parseFloat(h || 0);
  return `${n.toFixed(1)}h`;
};

const STATUS_COLOR = {
  present: '#437a22',
  absent: '#a12c7b',
  late: '#da7101',
  half_day: '#006494',
};

const ESC_COLOR = {
  open: '#a13544',
  in_review: '#da7101',
  resolved: '#437a22',
  closed: '#7a7974',
};

const G = '#1D9E75';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const LINE = '#E5E7EB';
const SOFT = '#F8FAFC';
const BG = '#F3F6F8';

export default function TrainerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState({ type: '', text: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [clientIP, setClientIP] = useState(null);

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then((res) => res.json())
      .then((d) => setClientIP(d.ip))
      .catch(() => setClientIP(null));
  }, []);

  const fetchDashboard = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    setError('');

    try {
      const [dashRes, todayRes] = await Promise.all([
        api.get('/trainers/dashboard'),
        api.get('/attendance/today-status'),
      ]);

      setData(dashRes.data?.data || null);
      setTodayAttendance(todayRes.data?.data || null);
    } catch (err) {
      setError('Failed to load dashboard. Please try again.');
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    setActionMsg({ type: '', text: '' });

    try {
      await api.post('/attendance/checkin', { clientIP });
      await fetchDashboard(true);
      setActionMsg({ type: 'ok', text: 'Checked in successfully.' });
    } catch (err) {
      setActionMsg({
        type: 'err',
        text:
          err.response?.data?.message ||
          'Check-in failed. Make sure you are on office WiFi.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    setActionMsg({ type: '', text: '' });

    try {
      await api.post('/attendance/checkout', { clientIP });
      await fetchDashboard(true);
      setActionMsg({ type: 'ok', text: 'Checked out successfully.' });
    } catch (err) {
      setActionMsg({
        type: 'err',
        text: err.response?.data?.message || 'Check-out failed.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const att = data?.attendance || {};
  const wl = data?.worklog || {};
  const esc = data?.esc_counts || {};
  const batches = data?.batches || [];
  const escs = data?.escalations || [];
  const recent = data?.recent_attendance || [];

  const presentDays = parseInt(att.present) || 0;
  const totalDays = parseInt(att.total_days) || 0;
  const absentDays = parseInt(att.absent) || 0;
  const lateDays = parseInt(att.late) || 0;
  const halfDayDays = parseInt(att.half_day) || 0;
  const totalHours = parseFloat(wl.total_hours) || 0;
  const starPoints = parseFloat(wl.total_star_points) || 0;
  const activeBatches = batches.length;
  const openEsc = parseInt(esc.open) || 0;
  const attendRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  const attendanceChartData = [
    { name: 'Present', value: presentDays, color: '#437a22' },
    { name: 'Absent', value: absentDays, color: '#a12c7b' },
    { name: 'Late', value: lateDays, color: '#da7101' },
    { name: 'Half Day', value: halfDayDays, color: '#006494' },
  ].filter((item) => item.value > 0);

  const ipMatchesOffice =
    typeof clientIP === 'string' && clientIP.startsWith(OFFICE_IP_PREFIX);

  const canCheckOut = !!todayAttendance && !todayAttendance.check_out;
  const todayStatusColor = STATUS_COLOR[todayAttendance?.status] || '#7a7974';

  if (loading) {
    return (
      <div style={S.loadingWrap}>
        <div style={S.spinner} />
        <div style={S.loadingText}>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <div style={S.eyebrow}>Trainer overview</div>
          <h1 style={S.title}>My Dashboard</h1>
          <p style={S.subtitle}>
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>

        <button
          style={S.refreshBtn}
          onClick={() => fetchDashboard(true)}
          disabled={refreshing}
        >
          <RefreshCw size={15} style={{ marginRight: 8 }} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div style={S.alertErr}>
          <TriangleAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      {actionMsg.text && (
        <div style={actionMsg.type === 'ok' ? S.alertOk : S.alertErr}>
          {actionMsg.type === 'ok' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          <span>{actionMsg.text}</span>
        </div>
      )}

      <div style={S.heroGrid}>
        <div style={S.heroCard}>
          <div style={S.heroTop}>
            <div>
              <div style={S.heroLabel}>Today’s attendance</div>
              <div style={S.heroTitle}>Office check-in / check-out</div>
            </div>
            <div style={S.heroIconBox}>
              <MapPin size={18} color={G} />
            </div>
          </div>

          <div style={S.ipBox}>
            <div style={S.ipRow}>
              <span style={S.ipLabel}>
                <Wifi size={14} />
                Allowed office IP prefix
              </span>
              <code style={S.code}>{OFFICE_IP_PREFIX}x.x</code>
            </div>

            <div style={S.ipRow}>
              <span style={S.ipLabel}>
                {ipMatchesOffice ? <ShieldCheck size={14} /> : <ShieldX size={14} />}
                Your IP
              </span>
              <code style={S.code}>{clientIP || 'Detecting...'}</code>
            </div>

            {clientIP && (
              <div
                style={{
                  ...S.inlineStatus,
                  color: ipMatchesOffice ? '#166534' : '#991B1B',
                  background: ipMatchesOffice ? '#DCFCE7' : '#FEE2E2',
                  borderColor: ipMatchesOffice ? '#BBF7D0' : '#FECACA',
                }}
              >
                {ipMatchesOffice ? 'Connected to office WiFi' : 'Not on office WiFi'}
              </div>
            )}
          </div>

          {todayAttendance ? (
            <div style={S.attCard}>
              <div style={S.attRow}>
                <div style={S.attLabelWrap}>
                  <LogIn size={15} color={G} />
                  <span>Check-in</span>
                </div>
                <strong style={S.attValue}>{fmtTime(todayAttendance.check_in)}</strong>
              </div>

              <div style={S.attRow}>
                <div style={S.attLabelWrap}>
                  {todayAttendance.check_out ? (
                    <LogOut size={15} color="#a12c7b" />
                  ) : (
                    <AlarmClock size={15} color="#da7101" />
                  )}
                  <span>{todayAttendance.check_out ? 'Check-out' : 'Still in office'}</span>
                </div>
                <strong style={S.attValue}>{fmtTime(todayAttendance.check_out)}</strong>
              </div>

              <div style={{ marginTop: 10 }}>
                <span
                  style={{
                    ...S.badge,
                    background: `${todayStatusColor}15`,
                    color: todayStatusColor,
                    border: `1px solid ${todayStatusColor}33`,
                  }}
                >
                  {todayAttendance.status}
                </span>
              </div>

              {canCheckOut && (
                <button
                  style={{ ...S.primaryBtn, ...S.checkoutBtn, marginTop: 14, width: '100%' }}
                  onClick={handleCheckOut}
                  disabled={actionLoading}
                >
                  <LogOut size={15} style={{ marginRight: 8 }} />
                  {actionLoading ? 'Processing...' : 'Mark Check-Out'}
                </button>
              )}
            </div>
          ) : (
            <div>
              <button
                style={{ ...S.primaryBtn, width: '100%' }}
                onClick={handleCheckIn}
                disabled={actionLoading}
              >
                <LogIn size={15} style={{ marginRight: 8 }} />
                {actionLoading ? 'Processing...' : 'Mark Check-In'}
              </button>

              <p style={{ ...S.helpText, marginTop: 10, textAlign: 'center' }}>
                Attendance not marked yet today
              </p>
            </div>
          )}
        </div>

        <div style={S.summaryCard}>
          <div style={S.heroTop}>
            <div>
              <div style={S.heroLabel}>This month</div>
              <div style={S.heroTitle}>Attendance summary</div>
            </div>
            <div style={S.heroIconBox}>
              <BarChart3 size={18} color={G} />
            </div>
          </div>

          <div style={S.chartSection}>
            <div style={S.chartWrap}>
              {attendanceChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={attendanceChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={82}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {attendanceChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        `${value} day${value > 1 ? 's' : ''}`,
                        name,
                      ]}
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #E5E7EB',
                        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={S.emptyChart}>No attendance data</div>
              )}

              <div style={S.chartCenter}>
                <div style={S.chartCenterLabel}>Rate</div>
                <div
                  style={{
                    ...S.chartCenterValue,
                    color: attendRate >= 75 ? '#166534' : '#991B1B',
                  }}
                >
                  {attendRate}%
                </div>
              </div>
            </div>

            <div style={S.chartLegend}>
              {attendanceChartData.map((item) => (
                <div key={item.name} style={S.legendItem}>
                  <div style={S.legendLeft}>
                    <span
                      style={{
                        ...S.legendDot,
                        background: item.color,
                      }}
                    />
                    <span style={S.legendLabel}>{item.name}</span>
                  </div>
                  <strong style={{ color: item.color }}>
                    {item.value} day{item.value > 1 ? 's' : ''}
                  </strong>
                </div>
              ))}

              <div style={S.metricDivider} />

              <SummaryRow
                icon={<Star size={15} color="#d19900" />}
                label="Star Points"
                value={starPoints.toFixed(1)}
                color="#d19900"
              />
              <SummaryRow
                icon={<Clock3 size={15} color="#006494" />}
                label="Total Hours"
                value={fmtHours(totalHours)}
                color="#006494"
              />
            </div>
          </div>
        </div>
      </div>

      <div style={S.kpiGrid}>
        <KPICard
          label="Days Present"
          value={`${presentDays}/${totalDays}`}
          color="#437a22"
          icon={<CalendarDays size={18} />}
        />
        <KPICard
          label="Star Points"
          value={starPoints.toFixed(1)}
          color="#D19900"
          icon={<Star size={18} />}
        />
        <KPICard
          label="Hours Logged"
          value={fmtHours(totalHours)}
          color="#006494"
          icon={<Clock3 size={18} />}
        />
        <KPICard
          label="Active Batches"
          value={activeBatches}
          color="#01696F"
          icon={<BookOpen size={18} />}
        />
        <KPICard
          label="Open Escalations"
          value={openEsc}
          color={openEsc > 0 ? '#A13544' : '#437A22'}
          icon={<TriangleAlert size={18} />}
        />
      </div>

      {batches.length > 0 && (
        <SectionCard
          title="Active Batches"
          icon={<GraduationCap size={17} color={G} />}
          subtitle="Current ongoing batches and student strength"
        >
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  {['Batch Name', 'Start Date', 'End Date', 'Students', 'Status'].map((h) => (
                    <th key={h} style={S.th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td style={S.td}>
                      <strong style={{ color: TEXT }}>{b.batch_name}</strong>
                    </td>
                    <td style={S.td}>{fmtDate(b.batch_start_date)}</td>
                    <td style={S.td}>{fmtDate(b.batch_end_date)}</td>
                    <td style={S.td}>{b.student_count}</td>
                    <td style={S.td}>
                      <span
                        style={{
                          ...S.badge,
                          background: '#01696f18',
                          color: '#01696f',
                          border: '1px solid #BFE7E4',
                        }}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <div style={S.bottomGrid}>
        {recent.length > 0 && (
          <SectionCard
            title="Recent Attendance"
            icon={<CalendarDays size={17} color={G} />}
            subtitle="Recent check-in and check-out history"
          >
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    {['Date', 'Check In', 'Check Out', 'Status'].map((h) => (
                      <th key={h} style={S.th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r, i) => {
                    const c = STATUS_COLOR[r.status] || '#7a7974';
                    return (
                      <tr key={i}>
                        <td style={S.td}>{fmtDate(r.date)}</td>
                        <td style={S.td}>{fmtTime(r.check_in)}</td>
                        <td style={S.td}>{fmtTime(r.check_out)}</td>
                        <td style={S.td}>
                          <span
                            style={{
                              ...S.badge,
                              background: `${c}15`,
                              color: c,
                              border: `1px solid ${c}33`,
                            }}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {escs.length > 0 && (
          <SectionCard
            title="Recent Escalations"
            icon={<TriangleAlert size={17} color="#A13544" />}
            subtitle="Latest escalation items requiring attention"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {escs.map((e) => {
                const c = ESC_COLOR[e.status] || '#7a7974';
                return (
                  <div key={e.id} style={S.escItem}>
                    <div style={S.escTop}>
                      <div style={S.escText}>{e.description || 'No description'}</div>
                      <span
                        style={{
                          ...S.badge,
                          background: `${c}15`,
                          color: c,
                          border: `1px solid ${c}33`,
                        }}
                      >
                        {e.status}
                      </span>
                    </div>

                    <div style={S.escMeta}>
                      {fmtDate(e.escalation_date)} • Count: {e.no_of_count || 1}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

function KPICard({ label, value, color, icon }) {
  return (
    <div style={{ ...S.kpiCard, border: `1px solid ${color}20` }}>
      <div style={{ ...S.kpiIconWrap, color, background: `${color}12` }}>{icon}</div>
      <div style={{ ...S.kpiValue, color }}>{value}</div>
      <div style={S.kpiLabel}>{label}</div>
    </div>
  );
}

function SummaryRow({ icon, label, value, color }) {
  return (
    <div style={S.summaryRow}>
      <div style={S.summaryLeft}>
        {icon}
        <span>{label}</span>
      </div>
      <strong style={{ color }}>{value}</strong>
    </div>
  );
}

function SectionCard({ title, subtitle, icon, children }) {
  return (
    <div style={S.card}>
      <div style={S.sectionHead}>
        <div>
          <div style={S.sectionTitleRow}>
            <span style={S.sectionIcon}>{icon}</span>
            <h2 style={S.cardTitle}>{title}</h2>
          </div>
          {subtitle ? <p style={S.cardSub}>{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

const S = {
  page: {
    padding: 24,
    maxWidth: 1280,
    margin: '0 auto',
    fontFamily: 'Inter, sans-serif',
    background: BG,
    minHeight: '100%',
  },
  loadingWrap: {
    minHeight: 320,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: MUTED,
    marginTop: 14,
    fontSize: 14,
    fontWeight: 500,
  },
  spinner: {
    width: 42,
    height: 42,
    border: '3px solid #DDE5E8',
    borderTop: `3px solid ${G}`,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 16,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: 700,
    color: G,
    textTransform: 'uppercase',
    letterSpacing: '.08em',
    marginBottom: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: 800,
    color: TEXT,
    margin: 0,
    lineHeight: 1.1,
  },
  subtitle: {
    fontSize: 14,
    color: MUTED,
    marginTop: 6,
  },
  refreshBtn: {
    background: '#fff',
    border: `1px solid ${LINE}`,
    borderRadius: 12,
    padding: '10px 16px',
    fontSize: 13,
    cursor: 'pointer',
    color: TEXT,
    display: 'inline-flex',
    alignItems: 'center',
    fontWeight: 600,
    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
  },
  alertErr: {
    background: '#FEF2F2',
    color: '#B91C1C',
    padding: '12px 16px',
    borderRadius: 14,
    marginBottom: 16,
    fontSize: 14,
    border: '1px solid #FECACA',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  alertOk: {
    background: '#ECFDF5',
    color: '#166534',
    padding: '12px 16px',
    borderRadius: 14,
    marginBottom: 16,
    fontSize: 14,
    border: '1px solid #BBF7D0',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  heroGrid: {
    display: 'grid',
    gridTemplateColumns: '1.1fr 0.9fr',
    gap: 18,
    marginBottom: 18,
  },
  heroCard: {
    background: '#fff',
    borderRadius: 20,
    padding: 22,
    border: `1px solid ${LINE}`,
    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.05)',
  },
  summaryCard: {
    background: '#fff',
    borderRadius: 20,
    padding: 22,
    border: `1px solid ${LINE}`,
    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.05)',
  },
  heroTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  heroLabel: {
    fontSize: 12,
    color: G,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '.06em',
    marginBottom: 5,
  },
  heroTitle: {
    fontSize: 20,
    color: TEXT,
    fontWeight: 700,
    lineHeight: 1.2,
  },
  heroIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: '#ECFDF5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #CBEFDF',
    flexShrink: 0,
  },
  ipBox: {
    background: SOFT,
    border: `1px solid ${LINE}`,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  ipRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  ipLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: '#334155',
    fontWeight: 600,
  },
  code: {
    background: '#fff',
    padding: '4px 8px',
    borderRadius: 8,
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    fontWeight: 700,
    letterSpacing: '.02em',
    color: '#0F172A',
    border: `1px solid ${LINE}`,
    fontSize: 12,
  },
  inlineStatus: {
    marginTop: 4,
    borderRadius: 999,
    padding: '7px 12px',
    fontSize: 12,
    fontWeight: 700,
    border: '1px solid transparent',
    display: 'inline-flex',
    alignItems: 'center',
  },
  primaryBtn: {
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '12px 20px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    background: G,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 22px rgba(29, 158, 117, 0.18)',
  },
  checkoutBtn: {
    background: '#A13544',
    boxShadow: '0 10px 22px rgba(161, 53, 68, 0.18)',
  },
  helpText: {
    fontSize: 12,
    color: MUTED,
  },
  attCard: {
    background: '#FCFDFE',
    borderRadius: 16,
    padding: 16,
    border: `1px solid ${LINE}`,
  },
  attRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #EEF2F7',
    gap: 12,
  },
  attLabelWrap: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    color: '#334155',
    fontWeight: 600,
  },
  attValue: {
    color: TEXT,
    fontSize: 14,
  },
  chartSection: {
    display: 'grid',
    gridTemplateColumns: '0.95fr 1.05fr',
    gap: 12,
    alignItems: 'center',
  },
  chartWrap: {
    position: 'relative',
    height: 220,
    minHeight: 220,
  },
  chartCenter: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  chartCenterLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  chartCenterValue: {
    fontSize: 28,
    fontWeight: 800,
    lineHeight: 1.1,
    marginTop: 2,
  },
  chartLegend: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '8px 0',
    borderBottom: '1px solid #F1F5F9',
  },
  legendLeft: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    flexShrink: 0,
  },
  legendLabel: {
    fontSize: 13,
    color: '#334155',
    fontWeight: 600,
  },
  metricDivider: {
    height: 1,
    background: '#E5E7EB',
    margin: '4px 0 2px',
  },
  emptyChart: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px dashed #CBD5E1',
    borderRadius: 16,
    color: MUTED,
    fontSize: 13,
    background: '#F8FAFC',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 13,
    padding: '10px 0',
    borderBottom: '1px solid #F1F5F9',
    gap: 12,
  },
  summaryLeft: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    color: '#334155',
    fontWeight: 600,
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 14,
    marginBottom: 18,
  },
  kpiCard: {
    background: '#fff',
    borderRadius: 18,
    padding: '18px 18px',
    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.04)',
  },
  kpiIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: 800,
    marginBottom: 4,
    lineHeight: 1.1,
  },
  kpiLabel: {
    fontSize: 11,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 700,
  },
  card: {
    background: '#fff',
    borderRadius: 20,
    padding: 22,
    border: `1px solid ${LINE}`,
    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.05)',
    marginBottom: 18,
  },
  sectionHead: {
    marginBottom: 16,
  },
  sectionTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  sectionIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: TEXT,
    margin: 0,
  },
  cardSub: {
    margin: 0,
    fontSize: 13,
    color: MUTED,
    lineHeight: 1.5,
  },
  tableWrap: {
    overflowX: 'auto',
    border: `1px solid ${LINE}`,
    borderRadius: 16,
  },
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    background: '#fff',
  },
  th: {
    textAlign: 'left',
    fontSize: 11,
    color: MUTED,
    textTransform: 'uppercase',
    padding: '12px 14px',
    borderBottom: `1px solid ${LINE}`,
    background: '#FAFCFD',
    letterSpacing: '.05em',
    fontWeight: 700,
  },
  td: {
    fontSize: 13,
    padding: '13px 14px',
    borderBottom: '1px solid #F1F5F9',
    color: TEXT,
    verticalAlign: 'middle',
  },
  badge: {
    borderRadius: 999,
    padding: '5px 10px',
    fontSize: 11,
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
  },
  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 18,
  },
  escItem: {
    padding: 14,
    border: `1px solid ${LINE}`,
    borderRadius: 16,
    background: '#FCFDFE',
  },
  escTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  escText: {
    fontSize: 13,
    color: TEXT,
    lineHeight: 1.5,
    flex: 1,
  },
  escMeta: {
    fontSize: 12,
    color: MUTED,
    marginTop: 8,
  },
};