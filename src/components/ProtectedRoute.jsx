import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = () => {
  const { user, loading, role } = useAuth();
  const location = useLocation();

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  // Role-based route protection
  if (location.pathname.startsWith('/ar-dashboard') && role !== 'ar_requestor') {
    return <Navigate to="/recruiter-dashboard" replace />;
  }
  if (location.pathname.startsWith('/recruiter-dashboard') && role !== 'recruiter') {
    return <Navigate to="/ar-dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;