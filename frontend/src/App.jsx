import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import useAuthStore from './store/authStore';
import useThemeStore from './store/themeStore';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LeadsPage from './pages/LeadsPage';
import LeadDetailPage from './pages/LeadDetailPage';
import AddLeadPage from './pages/AddLeadPage';
import ImportLeadsPage from './pages/ImportLeadsPage';
import UsersPage from './pages/UsersPage';
import FollowUpTypesPage from './pages/FollowUpTypesPage';
import ReportsPage from './pages/ReportsPage';

import ProfilePage from './pages/ProfilePage';
import RolesPage from './pages/RolesPage';
import OrganizationsPage from './pages/OrganizationsPage';
import PlansPage from './pages/PlansPage';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

export default function App() {
  const { theme } = useThemeStore();

  useEffect(() => {
    const html = document.documentElement;
    // Remove both first, then apply correct one
    html.classList.remove('dark', 'light');
    if (theme === 'dark') {
      html.classList.add('dark');
    }
    // Force background color directly on html too
    html.style.backgroundColor = theme === 'dark' ? '#0f172a' : '#f1f5f9';
    document.body.style.backgroundColor = theme === 'dark' ? '#0f172a' : '#f1f5f9';
  }, [theme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"      element={<DashboardPage />} />
          <Route path="leads"          element={<LeadsPage />} />
          <Route path="leads/add"      element={<AddLeadPage />} />
          <Route path="leads/import"   element={<ImportLeadsPage />} />
          <Route path="leads/:id"      element={<LeadDetailPage />} />
          <Route path="users"          element={<UsersPage />} />
          <Route path="followup-types" element={<FollowUpTypesPage />} />
          <Route path="reports"        element={<ReportsPage />} />
          <Route path="profile"        element={<ProfilePage />} />
          <Route path="roles"          element={<RolesPage />} />
          <Route path="organizations"  element={<OrganizationsPage />} />
          <Route path="plans"          element={<PlansPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
