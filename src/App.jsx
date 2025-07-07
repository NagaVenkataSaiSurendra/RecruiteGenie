import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ARRequestorDashboard from './pages/ARRequestorDashboard';
import RecruiterDashboard from './pages/RecruiterDashboard';
import JobDescriptions from './pages/JobDescriptions';
import ConsultantProfiles from './pages/ConsultantProfiles';
import MatchingResults from './pages/MatchingResults';
import ProtectedRoute from './components/ProtectedRoute';
import Chatbot from './components/Chatbot';

// Redirect user based on role
function RoleRedirect() {
  const { role } = useAuth();
  if (role === 'ar_requestor') return <Navigate to="/ar-dashboard" replace />;
  if (role === 'recruiter') return <Navigate to="/recruiter-dashboard" replace />;
  return <Navigate to="/login" replace />;
}

function App() {
  const [showLlmModal, setShowLlmModal] = useState(false);
  const [llmResults, setLlmResults] = useState([]); // This should be updated based on your actual data

  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <AppProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<RoleRedirect />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/ar-dashboard" element={<ARRequestorDashboard />} />
                  <Route path="/recruiter-dashboard" element={<RecruiterDashboard />} />
                  <Route path="/job-descriptions" element={<JobDescriptions />} />
                  <Route path="/consultant-profiles" element={<ConsultantProfiles />} />
                  <Route path="/matching-results" element={<MatchingResults />} />
                </Route>
              </Route>
            </Routes>
            <Chatbot />
          </AppProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
