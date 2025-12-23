import { Navigate, Route, Routes } from 'react-router-dom';

import { useAdminAuth } from './auth';
import Layout from './components/Layout';
import DashboardPage from './pages/Dashboard';
import LoginPage from './pages/Login';
import ReportDetailPage from './pages/ReportDetail';
import ReportsPage from './pages/Reports';
import UsersPage from './pages/Users';
import UserChatPage from './pages/UserChat';

function Protected({ children }: { children: React.ReactNode }) {
  const { loading, user, isModerator } = useAdminAuth();

  if (loading) {
    return <div style={{ padding: 18, color: '#64748b' }}>Chargement…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isModerator) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/:id" element={<ReportDetailPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/:id" element={<UserChatPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
