import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * RoleRoute enforces role-based access control (RBAC).
 * If unauthenticated -> redirects to /login
 * If role is not permitted -> redirects to the user's role dashboard with 403 status state
 */
export const RoleRoute = ({ allowedRoles = [], children }) => {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-muted)'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '6px' }}>
            NetCollaborate Authentication
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Verifying security credentials & privileges...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    // User is authenticated but does not possess the required role
    const fallbackPath = role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard';
    return (
      <Navigate
        to={fallbackPath}
        state={{
          accessDenied: true,
          message: `Access Denied: You need '${allowedRoles.join(' or ')}' role to access that area.`
        }}
        replace
      />
    );
  }

  return children;
};

export default RoleRoute;
