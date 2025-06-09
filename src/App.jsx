import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ARRequestorDashboard from './pages/ARRequestorDashboard';
import JobDescriptions from './pages/JobDescriptions';
import ConsultantProfiles from './pages/ConsultantProfiles';
import MatchingResults from './pages/MatchingResults';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<ARRequestorDashboard />} />
                <Route path="/job-descriptions" element={<JobDescriptions />} />
                <Route path="/consultant-profiles" element={<ConsultantProfiles />} />
                <Route path="/matching-results" element={<MatchingResults />} />
              </Route>
            </Route>
          </Routes>
        </AppProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;