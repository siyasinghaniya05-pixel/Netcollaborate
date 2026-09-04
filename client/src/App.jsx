import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NetworkProvider } from './context/NetworkContext';

// Lazy-load each page so the heavy libraries (React Flow, confetti, etc.)
// are only fetched when the user actually navigates to the relevant screen.
// This dramatically speeds up first load of the landing / auth pages.
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Workspace = lazy(() => import('./pages/Workspace'));
const Profile = lazy(() => import('./pages/Profile'));

import './App.css';

// Protected Route Component (allows logged-in or guest users)
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
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Workspace allows immediate demo access or authorized project access */}
              <Route path="/workspace/:id" element={<Workspace />} />
              <Route path="/workspace" element={<Navigate to="/workspace/demo" replace />} />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </NetworkProvider>
    </AuthProvider>
  );
}

export default App;
