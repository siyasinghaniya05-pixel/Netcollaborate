import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NetworkProvider } from './context/NetworkContext';
import RoleRoute from './components/RoleRoute';

// Lazy-load each page so heavy components only load when accessed
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const InstructorDashboard = lazy(() => import('./pages/InstructorDashboard'));
const Workspace = lazy(() => import('./pages/Workspace'));
const Profile = lazy(() => import('./pages/Profile'));
const FskLab = lazy(() => import('./pages/FskLab'));
const LabDetails = lazy(() => import('./pages/LabDetails'));

import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading NetCollaborate...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Redirect /dashboard to the authenticated user's role-specific dashboard
const RoleDashboardRedirect = () => {
  const { role } = useAuth();
  if (role === 'instructor') {
    return <Navigate to="/instructor/dashboard" replace />;
  }
  return <Navigate to="/student/dashboard" replace />;
};

function App() {
  return (
    <AuthProvider>
      <NetworkProvider>
        <BrowserRouter>
          <Suspense
            fallback={
              <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading NetCollaborate...</div>
              </div>
            }
          >
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Automatic Role-Based Dashboard Redirect */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <RoleDashboardRedirect />
                  </ProtectedRoute>
                }
              />

              {/* Dedicated Student Dashboard */}
              <Route
                path="/student/dashboard"
                element={
                  <RoleRoute allowedRoles={['student']}>
                    <StudentDashboard />
                  </RoleRoute>
                }
              />
              <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />

              {/* Dedicated Instructor Dashboard */}
              <Route
                path="/instructor/dashboard"
                element={
                  <RoleRoute allowedRoles={['instructor']}>
                    <InstructorDashboard />
                  </RoleRoute>
                }
              />
              <Route path="/instructor" element={<Navigate to="/instructor/dashboard" replace />} />

              {/* Workspace Simulator (Authenticated Only) */}
              <Route
                path="/workspace/:id"
                element={
                  <ProtectedRoute>
                    <Workspace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/workspace"
                element={
                  <ProtectedRoute>
                    <Workspace />
                  </ProtectedRoute>
                }
              />

              {/* Profile */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* Lab Session Details (Instructor-created) */}
              <Route
                path="/lab/:sessionCode"
                element={
                  <ProtectedRoute>
                    <LabDetails />
                  </ProtectedRoute>
                }
              />
              <Route path="/lab" element={<Navigate to="/dashboard" replace />} />

              {/* FSK Laboratory (Authenticated Only) */}
              <Route
                path="/fsk-lab"
                element={
                  <ProtectedRoute>
                    <FskLab />
                  </ProtectedRoute>
                }
              />

              {/* Protected Shortcut Navigation */}
              <Route
                path="/experiments"
                element={
                  <ProtectedRoute>
                    <RoleDashboardRedirect />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/detective"
                element={
                  <ProtectedRoute>
                    <RoleDashboardRedirect />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/join-lab"
                element={
                  <ProtectedRoute>
                    <RoleDashboardRedirect />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </NetworkProvider>
    </AuthProvider>
  );
}

export default App;
