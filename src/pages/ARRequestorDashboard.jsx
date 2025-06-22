import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../contexts/AppContext.jsx';
import StatusCard from '../components/StatusCard.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import { FileText, Users, Mail, Play, RefreshCw, BarChart3, Clock, CheckCircle, AlertCircle, ArrowRight, Loader2, ListOrdered, BarChart2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, color, gradient }) => (
  <div className={`bg-white rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:scale-105 ${gradient}`}>
    <div className="flex items-center">
      <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

const ActivityItem = ({ title, description, time, status }) => (
  <div className="flex items-start space-x-4 py-4 border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors duration-200">
    <div className={`p-2 rounded-full ${
      status === 'completed' ? 'bg-green-100' : 
      status === 'pending' ? 'bg-yellow-100' : 'bg-red-100'
    }`}>
      {status === 'completed' ? (
        <CheckCircle className="w-5 h-5 text-green-600" />
      ) : status === 'pending' ? (
        <Clock className="w-5 h-5 text-yellow-600" />
      ) : (
        <AlertCircle className="w-5 h-5 text-red-600" />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
    <div className="text-sm text-gray-500">{time}</div>
  </div>
);

const QuickActionCard = ({ title, description, icon: Icon, color, to }) => (
  <Link
    to={to}
    className="group bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
  >
    <div className="flex items-center space-x-4">
      <div className={`p-3 rounded-full ${color} bg-opacity-10 group-hover:bg-opacity-20 transition-all duration-300`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-medium text-gray-900 group-hover:text-indigo-600 transition-colors duration-200">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all duration-200" />
    </div>
  </Link>
);

const mockStatus = {
  jdCompared: true,
  profilesRanked: true,
  emailSent: false,
  topMatches: [
    { name: 'Priya Sharma', score: 0.92, skills: 'Python, ML, SQL' },
    { name: 'Rahul Verma', score: 0.89, skills: 'Java, Spring, AWS' },
    { name: 'Amit Patel', score: 0.85, skills: 'React, Node.js, MongoDB' },
  ],
  emailStatus: 'Pending',
};

const StepProgressBar = ({ steps }) => (
  <div className="flex items-center justify-between w-full mb-6">
    {steps.map((step, idx) => (
      <div key={step.label} className="flex flex-col items-center flex-1">
        <div className={`rounded-full w-10 h-10 flex items-center justify-center mb-2 ${step.completed ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>{step.completed ? <CheckCircle className="w-6 h-6" /> : <Loader2 className="w-6 h-6 animate-spin" />}</div>
        <span className="text-xs text-gray-700 text-center">{step.label}</span>
        {idx < steps.length - 1 && <div className="w-full h-1 bg-gray-300 mt-2 mb-2" />}
      </div>
    ))}
  </div>
);

const ARRequestorDashboard = () => {
  const { matchingJobs, agentStatus, startMatching, fetchAgentStatus, matchingResults } = useApp();
  const [selectedJob, setSelectedJob] = useState(null);
  const [isMatching, setIsMatching] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (matchingJobs.length > 0 && !selectedJob) {
      setSelectedJob(matchingJobs[0]);
    }
  }, [matchingJobs, selectedJob]);

  useEffect(() => {
    let interval;
    if (selectedJob && isMatching) {
      interval = setInterval(() => {
        fetchAgentStatus(selectedJob.id);
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedJob, isMatching, fetchAgentStatus]);

  const handleStartMatching = async () => {
    if (!selectedJob) return;
    
    setIsMatching(true);
    try {
      await startMatching(selectedJob.id);
      fetchAgentStatus(selectedJob.id);
      
      // Monitor until completion
      const checkCompletion = setInterval(() => {
        fetchAgentStatus(selectedJob.id);
        if (agentStatus.communication.status === 'completed' || 
            agentStatus.communication.status === 'error') {
          setIsMatching(false);
          clearInterval(checkCompletion);
        }
      }, 3000);
      
    } catch (error) {
      console.error('Failed to start matching:', error);
      setIsMatching(false);
    }
  };

  const getOverallProgress = () => {
    const statuses = Object.values(agentStatus);
    const totalProgress = statuses.reduce((sum, agent) => sum + agent.progress, 0);
    return Math.round(totalProgress / statuses.length);
  };

  const getOverallStatus = () => {
    const statuses = Object.values(agentStatus);
    if (statuses.some(agent => agent.status === 'error')) return 'error';
    if (statuses.some(agent => agent.status === 'in-progress')) return 'in-progress';
    if (statuses.every(agent => agent.status === 'completed')) return 'completed';
    return 'pending';
  };

  const stats = [
    { 
      title: 'Active Jobs', 
      value: '12', 
      icon: FileText, 
      color: 'text-blue-600',
      gradient: 'bg-gradient-to-br from-blue-50 to-white'
    },
    { 
      title: 'Total Consultants', 
      value: '45', 
      icon: Users, 
      color: 'text-green-600',
      gradient: 'bg-gradient-to-br from-green-50 to-white'
    },
    { 
      title: 'Matching Results', 
      value: '8', 
      icon: BarChart3, 
      color: 'text-purple-600',
      gradient: 'bg-gradient-to-br from-purple-50 to-white'
    },
    { 
      title: 'Pending Reviews', 
      value: '3', 
      icon: Clock, 
      color: 'text-yellow-600',
      gradient: 'bg-gradient-to-br from-yellow-50 to-white'
    },
  ];

  const recentActivities = [
    {
      title: 'New Job Description Added',
      description: 'Senior Software Engineer position',
      time: '2 hours ago',
      status: 'completed'
    },
    {
      title: 'Matching Process Started',
      description: 'For Product Manager role',
      time: '4 hours ago',
      status: 'pending'
    },
    {
      title: 'Consultant Profile Updated',
      description: 'John Doe updated their skills',
      time: '1 day ago',
      status: 'completed'
    },
    {
      title: 'Matching Failed',
      description: 'Error in processing job ID #123',
      time: '2 days ago',
      status: 'error'
    }
  ];

  const steps = [
    { label: 'JD Compared', completed: mockStatus.jdCompared },
    { label: 'Profiles Ranked', completed: mockStatus.profilesRanked },
    { label: 'Email Sent', completed: mockStatus.emailSent },
  ];

  // Only show jobs created by the current user
  const myJobs = useMemo(() =>
    matchingJobs.filter(job => job.user_id === user?.id),
    [matchingJobs, user]
  );

  // Helper to get matching result for a job
  const getMatchingResult = (jobId) =>
    matchingResults.find(result => result.job_description_id === jobId);

  return (
    <div className="space-y-8">
      {/* Welcome Section with Gradient Background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 p-8 text-white shadow-xl">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold">
            Welcome back, {user?.fullName || 'User'}!
          </h2>
          <p className="mt-2 text-indigo-100">
            Here's what's happening with your recruitment process.
          </p>
        </div>
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-64 w-64 transform rotate-45 bg-white opacity-10"></div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <QuickActionCard
          title="Create New Job"
          description="Add a new job description"
          icon={FileText}
          color="text-blue-600"
          to="/job-descriptions/new"
        />
        <QuickActionCard
          title="View Matches"
          description="Check matching results"
          icon={BarChart3}
          color="text-purple-600"
          to="/matching-results"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {recentActivities.map((activity, index) => (
            <ActivityItem key={index} {...activity} />
          ))}
        </div>
      </div>

      {/* Job Matching Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Job Matching</h2>
            <p className="mt-1 text-gray-600">Start the matching process for selected job</p>
          </div>
          <button
            onClick={handleStartMatching}
            disabled={isMatching || !selectedJob}
            className="flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
          >
            {isMatching ? (
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Play className="w-5 h-5 mr-2" />
            )}
            {isMatching ? 'Matching in Progress...' : 'Start AI Matching'}
          </button>
        </div>

        {/* Job Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matchingJobs.map((job) => (
            <div
              key={job.id}
              onClick={() => setSelectedJob(job)}
              className={`p-4 border rounded-lg cursor-pointer transition-all duration-300 hover:shadow-md ${
                selectedJob?.id === job.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <h3 className="font-medium text-gray-900">{job.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{job.department}</p>
              <div className="flex items-center mt-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  job.status === 'completed' ? 'bg-green-100 text-green-800' :
                  job.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {job.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Agent Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <StatusCard
            title="Comparison Agent"
            status={agentStatus.comparison.status}
            description="AI analyzing job description vs consultant profiles"
            icon={FileText}
          />
          <StatusCard
            title="Ranking Agent"
            status={agentStatus.ranking.status}
            description="AI ranking consultant profiles by similarity"
            icon={Users}
          />
          <StatusCard
            title="Communication Agent"
            status={agentStatus.communication.status}
            description="AI sending results to stakeholders"
            icon={Mail}
          />
        </div>

        {/* Progress Section */}
        <div className="mt-6 p-6 bg-gradient-to-r from-gray-50 to-white rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Workflow Progress</h3>
          <div className="space-y-4">
            <ProgressBar
              progress={agentStatus.comparison.progress}
              status={agentStatus.comparison.status}
              label="Document Comparison"
            />
            <ProgressBar
              progress={agentStatus.ranking.progress}
              status={agentStatus.ranking.status}
              label="Profile Ranking"
            />
            <ProgressBar
              progress={agentStatus.communication.progress}
              status={agentStatus.communication.status}
              label="Email Communication"
            />
          </div>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-blue-700 flex items-center gap-2"><BarChart2 className="w-7 h-7" /> Matching Status Dashboard</h1>
        {myJobs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-6 text-gray-500 text-center">No job descriptions found. Create a new job to get started!</div>
        ) : (
          myJobs.map(job => {
            const result = getMatchingResult(job.id);
            const status = result?.status || 'PENDING';
            const topMatches = result?.results?.top_matches || [];
            const emailStatus = status === 'COMPLETED' && topMatches.length > 0 ? 'Sent' : 'Pending';
            const steps = [
              { label: 'JD Compared', completed: status !== 'PENDING' },
              { label: 'Profiles Ranked', completed: status === 'COMPLETED' },
              { label: 'Email Sent', completed: emailStatus === 'Sent' },
            ];
            return (
              <div key={job.id} className="bg-white rounded-xl shadow-lg p-6 mb-8">
                <div className="mb-2">
                  <h2 className="text-xl font-semibold text-gray-800">{job.title}</h2>
                  <p className="text-sm text-gray-500">{job.description}</p>
                </div>
                {/* Progress Bar */}
                {Array.isArray(steps) && <StepProgressBar steps={steps} />}
                <div className="flex flex-col md:flex-row gap-6 mt-6">
                  <div className="flex-1 bg-blue-50 rounded-lg p-4 shadow">
                    <h2 className="text-lg font-semibold mb-2 flex items-center gap-2"><ListOrdered className="w-5 h-5" /> Top 3 Matches</h2>
                    {topMatches.length > 0 ? (
                      <ul className="space-y-2">
                        {topMatches.slice(0, 3).map((match, idx) => (
                          <li key={idx} className="flex items-center justify-between bg-white rounded p-2 shadow-sm">
                            <span className="font-medium text-gray-800">{match.consultant_name || match.consultant_id}</span>
                            <span className="text-xs text-gray-500">{match.skills}</span>
                            <span className="text-blue-600 font-bold">{(match.score * 100).toFixed(1)}%</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-gray-500">No matches found.</div>
                    )}
                  </div>
                  <div className="flex-1 bg-green-50 rounded-lg p-4 shadow flex flex-col justify-between">
                    <h2 className="text-lg font-semibold mb-2 flex items-center gap-2"><Mail className="w-5 h-5" /> Email Notification Status</h2>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${emailStatus === 'Sent' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>{emailStatus}</span>
                      {emailStatus === 'Sent' ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Loader2 className="w-5 h-5 text-yellow-600 animate-spin" />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ARRequestorDashboard;