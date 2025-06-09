import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [matchingJobs, setMatchingJobs] = useState([]);
  const [consultantProfiles, setConsultantProfiles] = useState([]);
  const [matchingResults, setMatchingResults] = useState([]);
  const [agentStatus, setAgentStatus] = useState({
    comparison: { status: 'idle', progress: 0 },
    ranking: { status: 'idle', progress: 0 },
    communication: { status: 'idle', progress: 0 }
  });

  const fetchMatchingJobs = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/jobs');
      setMatchingJobs(response.data);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    }
  };

  const fetchConsultantProfiles = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/consultants');
      setConsultantProfiles(response.data);
    } catch (error) {
      console.error('Failed to fetch consultant profiles:', error);
    }
  };

  const fetchMatchingResults = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/matching/results');
      setMatchingResults(response.data);
    } catch (error) {
      console.error('Failed to fetch matching results:', error);
    }
  };

  const startMatching = async (jobId) => {
    try {
      const response = await axios.post(`http://localhost:8000/api/matching/start/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to start matching:', error);
      throw error;
    }
  };

  const fetchAgentStatus = async (jobId) => {
    try {
      const response = await axios.get(`http://localhost:8000/api/matching/status/${jobId}`);
      setAgentStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch agent status:', error);
    }
  };

  useEffect(() => {
    fetchMatchingJobs();
    fetchConsultantProfiles();
    fetchMatchingResults();
  }, []);

  const value = {
    matchingJobs,
    consultantProfiles,
    matchingResults,
    agentStatus,
    fetchMatchingJobs,
    fetchConsultantProfiles,
    fetchMatchingResults,
    startMatching,
    fetchAgentStatus
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};