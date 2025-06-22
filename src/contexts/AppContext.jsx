import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const AppContext = createContext();

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [matchingJobs, setMatchingJobs] = useState([]);
  const [consultantProfiles, setConsultantProfiles] = useState([]);
  const [matchingResults, setMatchingResults] = useState([]);
  const [agentStatus, setAgentStatus] = useState({
    comparison: { status: 'idle', progress: 0 },
    ranking: { status: 'idle', progress: 0 },
    communication: { status: 'idle', progress: 0 },
  });
  const { user } = useAuth();

  const fetchMatchingJobs = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/jobs/');
      setMatchingJobs(response.data);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    }
  };

  const fetchConsultantProfiles = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/consultants/');
      setConsultantProfiles(response.data);
    } catch (error) {
      console.error('Failed to fetch consultant profiles:', error);
    }
  };

  const fetchMatchingResults = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/matching/results/');
      setMatchingResults(response.data);
    } catch (error) {
      console.error('Failed to fetch matching results:', error);
    }
  };

  const startMatching = async (jobId) => {
    try {
      const response = await axios.post(`http://localhost:8000/api/matching/start`, { job_id: jobId });
      return response.data;
    } catch (error) {
      console.error('Failed to start matching:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMatchingJobs();
      fetchConsultantProfiles();
      fetchMatchingResults();
    }
  }, [user]);

  const value = {
    matchingJobs,
    consultantProfiles,
    matchingResults,
    agentStatus,
    fetchMatchingJobs,
    fetchConsultantProfiles,
    fetchMatchingResults,
    startMatching
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};