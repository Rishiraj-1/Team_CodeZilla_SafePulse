import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './src/context/AuthContext';
import { GlobalLayout } from './src/components/GlobalLayout';
import { ProtectedRoute, RoleGuard } from './src/components/RoleGuard';

// Public Pages
import LandingPage from './src/pages/LandingPage';
import LoginPage from './src/pages/LoginPage';
import AuthCallback from './src/pages/AuthCallback';
import WalkthroughPage from './src/pages/WalkthroughPage';
import CompleteProfile from './src/pages/CompleteProfile';
import { PendingReviewPage } from './src/pages/PendingReviewPage';
import { RejectedPage } from './src/pages/RejectedPage';

// App Pages (Shared/Role-specific)
import { CitizenPage } from './src/pages/CitizenPage';
import { GuardianPage } from './src/pages/GuardianPage';
import GuardianCompleteProfile from './src/pages/GuardianCompleteProfile';
import { AdminPage } from './src/pages/AdminPage';
import { AdminPersonnelPage } from './src/pages/AdminPersonnelPage';
import { AdminAlertsPage } from './src/pages/AdminAlertsPage';
import { ReportPage } from './src/pages/ReportPage';

import { AuthoritySosPage } from './src/pages/AuthoritySosPage';
import { AuthorityRiskZonesPage } from './src/pages/AuthorityRiskZonesPage';
import { AuthorityUsersPage } from './src/pages/AuthorityUsersPage';
import { AuthorityDashboard } from './src/pages/AuthorityDashboard';

// Simple placeholder pages for missing ones to prevent crashing
// (No placeholders needed for Authority anymore)

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes - No Layout */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/walkthrough" element={<WalkthroughPage />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/guardian/complete-profile" element={<GuardianCompleteProfile />} />
          <Route path="/pending" element={<PendingReviewPage />} />
          <Route path="/rejected" element={<RejectedPage />} />

          {/* Authenticated Routes with Global App Layout */}
          <Route path="/app" element={<ProtectedRoute><GlobalLayout /></ProtectedRoute>}>

            {/* Base Redirects */}
            <Route index element={<Navigate to="citizen" replace />} />

            {/* Citizen Routes */}
            <Route path="citizen" element={<RoleGuard allowedRoles={['citizen']}><CitizenPage /></RoleGuard>} />

            {/* Guardian Routes */}
            <Route path="guardian" element={
              <RoleGuard allowedRoles={['citizen', 'guardian']}><GuardianPage /></RoleGuard>
            } />

            {/* Authority Routes (Admin extends Authority) */}
            <Route path="authority" element={
              <RoleGuard allowedRoles={['authority', 'admin']}><AuthorityDashboard /></RoleGuard>
            } />
            <Route path="sos-alerts" element={
              <RoleGuard allowedRoles={['authority', 'admin']}><AuthoritySosPage /></RoleGuard>
            } />
            <Route path="risk-zones" element={
              <RoleGuard allowedRoles={['authority', 'admin']}><AuthorityRiskZonesPage /></RoleGuard>
            } />
            <Route path="users" element={
              <RoleGuard allowedRoles={['authority', 'admin']}><AuthorityUsersPage /></RoleGuard>
            } />

            {/* Admin Exclusive Routes */}
            <Route path="admin" element={
              <RoleGuard allowedRoles={['admin']}><AdminPage /></RoleGuard>
            }>
              <Route path="personnel" element={<AdminPersonnelPage />} />
              <Route path="alerts" element={<AdminAlertsPage />} />
            </Route>

            {/* Shared Route - Reports */}
            <Route path="report" element={
              <RoleGuard allowedRoles={['citizen', 'guardian', 'authority', 'admin']}>
                <ReportPage />
              </RoleGuard>
            } />
          </Route>

          {/* Catch-all — send to login so OAuth hash isn't lost */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;