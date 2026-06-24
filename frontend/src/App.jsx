import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login from './pages/login/Login';
import TrainerLayout from './pages/trainer/TrainerLayout';
import AdminLayout from './pages/admin/AdminLayout';

function FullScreenLoader() {
  return (
    <div style={{ padding: '2rem', minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      Loading...
    </div>
  );
}

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;

  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoader />;

  return (
    <Routes>
      <Route
        path="/"
        element={
          user
            ? <Navigate to={user.role === 'admin' ? '/admin' : '/trainer'} replace />
            : <Login />
        }
      />

      <Route
        path="/trainer/*"
        element={
          <ProtectedRoute role="trainer">
            <TrainerLayout />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/*"
        element={
          <ProtectedRoute role="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}