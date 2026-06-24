import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { loginApi } from '../../api/auth';
import toast from 'react-hot-toast';

export default function Login() {
  const [role, setRole] = useState('trainer');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error('Please enter username and password');
      return;
    }

    setLoading(true);
    try {
      const res = await loginApi({ username, password });
      const { token, user } = res.data;

      if (user.role !== role) {
        toast.error(`This account is not a ${role}`);
        setLoading(false);
        return;
      }

      login(user, token);
      toast.success(`Welcome, ${user.name}!`);
      navigate(role === 'admin' ? '/admin' : '/trainer', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>A</div>
        <h1 style={styles.title}>AiiTE Academy</h1>
        <p style={styles.subtitle}>Sign in to continue</p>

        <div style={styles.roleWrap}>
          <button
            type="button"
            onClick={() => setRole('trainer')}
            style={{
              ...styles.roleBtn,
              ...(role === 'trainer' ? styles.roleBtnActive : {})
            }}
          >
            Trainer
          </button>
          <button
            type="button"
            onClick={() => setRole('admin')}
            style={{
              ...styles.roleBtn,
              ...(role === 'admin' ? styles.roleBtnActive : {})
            }}
          >
            Admin
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              style={styles.input}
              type="text"
              name="username"
              autoComplete="username"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: '#f7f8fa',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif'
  },
  card: {
    width: '100%',
    maxWidth: '380px',
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '18px',
    padding: '32px',
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)'
  },
  logo: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: '#01696f',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 700,
    margin: '0 auto 14px'
  },
  title: {
    margin: 0,
    textAlign: 'center',
    fontSize: '24px',
    fontWeight: 700,
    color: '#111827'
  },
  subtitle: {
    margin: '8px 0 24px',
    textAlign: 'center',
    fontSize: '14px',
    color: '#6b7280'
  },
  roleWrap: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    background: '#f3f4f6',
    padding: '4px',
    borderRadius: '12px',
    marginBottom: '20px'
  },
  roleBtn: {
    border: 'none',
    background: 'transparent',
    borderRadius: '10px',
    padding: '10px 12px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#6b7280',
    cursor: 'pointer'
  },
  roleBtnActive: {
    background: '#ffffff',
    color: '#111827',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
  },
  form: {
    display: 'grid',
    gap: '16px'
  },
  field: {
    display: 'grid',
    gap: '6px'
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151'
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '12px',
    fontSize: '14px',
    color: '#111827',
    background: '#ffffff',
    outline: 'none'
  },
  submitBtn: {
    marginTop: '4px',
    width: '100%',
    padding: '12px 14px',
    border: 'none',
    borderRadius: '12px',
    background: '#01696f',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer'
  }
};