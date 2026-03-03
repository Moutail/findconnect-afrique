import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';

import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import RegisterOrganizationPage from './pages/auth/RegisterOrganizationPage';

import DashboardPage from './pages/DashboardPage';
import PublicationsPage from './pages/publications/PublicationsPage';
import PublicationDetailPage from './pages/publications/PublicationDetailPage';
import CreatePublicationPage from './pages/publications/CreatePublicationPage';
import MyPublicationsPage from './pages/publications/MyPublicationsPage';

import VerificationPage from './pages/VerificationPage';
import ProfilePage from './pages/ProfilePage';
import ConversationsPage from './pages/chat/ConversationsPage';
import ChatPage from './pages/chat/ChatPage';
import ChatRequestsPage from './pages/chat/ChatRequestsPage';
import NotificationsPage from './pages/NotificationsPage';

import AboutPage from './pages/AboutPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import SupportPage from './pages/SupportPage';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminPublicationsPage from './pages/admin/AdminPublicationsPage';
import AdminVerificationsPage from './pages/admin/AdminVerificationsPage';
import AdminOrganizationsPage from './pages/admin/AdminOrganizationsPage';
import AdminConversationsPage from './pages/admin/AdminConversationsPage';
import AdminSupportPage from './pages/admin/AdminSupportPage';

import LoadingSpinner from './components/ui/LoadingSpinner';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/publications" element={<PublicationsPage />} />
        <Route path="/publications/:id" element={<PublicationDetailPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/support" element={<SupportPage />} />
      </Route>

      {/* Auth routes (guest only) */}
      <Route element={<MainLayout />}>
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/register-organization" element={<GuestRoute><RegisterOrganizationPage /></GuestRoute>} />
      </Route>

      {/* Protected routes */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/publications/create" element={<CreatePublicationPage />} />
        <Route path="/my-publications" element={<MyPublicationsPage />} />
        <Route path="/verification" element={<VerificationPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/conversations" element={<ConversationsPage />} />
        <Route path="/conversations/:id" element={<ChatPage />} />
        <Route path="/chat-requests" element={<ChatRequestsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>

      {/* Admin routes */}
      <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/publications" element={<AdminPublicationsPage />} />
        <Route path="/admin/verifications" element={<AdminVerificationsPage />} />
        <Route path="/admin/organizations" element={<AdminOrganizationsPage />} />
        <Route path="/admin/conversations" element={<AdminConversationsPage />} />
        <Route path="/admin/support" element={<AdminSupportPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
