import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../contexts/AppContext.jsx';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import DashboardCard from '../components/DashboardCard';
import MetricCard from '../components/MetricCard';
import DashboardTabs from '../components/DashboardTabs';
import StatusCard from '../components/StatusCard';
import ProgressBar from '../components/ProgressBar';
import ConsultantUploadModal from '../components/ConsultantUploadModal';
import JDUploadModal from '../components/JDUploadModal';
import { 
  FileText, 
  Users, 
  Mail, 
  Play, 
  RefreshCw, 
  BarChart3, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight, 
  Loader2, 
  ListOrdered, 
  BarChart2,
  TrendingUp,
  Download,
  Eye,
  Plus,
  Search,
  Filter,
  Upload,
  Bot,
  Target,
  Zap
} from 'lucide-react';
import axios from 'axios';

// Enhanced StatCard component
const StatCard = ({ title, value, icon: Icon, color, gradient, onClick }) => (
  <div 
    className={`bg-white dark:bg-dark-800 rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:scale-105 ${gradient} border border-gray-200 dark:border-dark-700 ${onClick ? 'cursor-pointer hover:shadow-xl' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-center">
      <div className={`p-3 rounded-full ${color} bg-opacity-10 dark:bg-opacity-20`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-200">{value}</p>
      </div>
    </div>
  </div>
);

// Enhanced ActivityItem component
const ActivityItem = ({ title, description, time, status, onClick }) => (
  <div 
    className="flex items-start space-x-4 py-4 border-b border-gray-200 dark:border-dark-600 last:border-0 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors duration-200 cursor-pointer"
    onClick={onClick}
  >
    <div className={`p-2 rounded-full ${
      status === 'completed' ? 'bg-green-100 dark:bg-green-900/20' : 
      status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/20' : 'bg-red-100 dark:bg-red-900/20'
    }`}>
      {status === 'completed' ? (
        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
      ) : status === 'pending' ? (
        <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
      ) : (
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900 dark:text-gray-200">{title}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </div>
    <div className="text-sm text-gray-500 dark:text-gray-400">{time}</div>
  </div>
);

// Enhanced QuickActionCard component
const QuickActionCard = ({ title, description, icon: Icon, color, to, onClick }) => {
  const Component = to ? Link : 'div';
  const props = to ? { to } : { onClick };
  
  return (
    <Component
      {...props}
      className="group bg-white dark:bg-dark-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200 dark:border-dark-700"
  >
    <div className="flex items-center space-x-4">
        <div className={`p-3 rounded-full ${color} bg-opacity-10 dark:bg-opacity-20 group-hover:bg-opacity-20 dark:group-hover:bg-opacity-30 transition-all duration-300`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 group-hover:translate-x-1 transition-all duration-200" />
      </div>
    </Component>
  );
};

// Enhanced TopMatchCard component
const TopMatchCard = ({ name, score, skills, experience, avatarUrl, onClick }) => (
  <div 
    className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-6 flex flex-col items-center space-y-3 hover:shadow-2xl transition-all duration-300 border border-gray-200 dark:border-dark-700 cursor-pointer"
    onClick={onClick}
  >
    <img 
      src={avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff`} 
      alt={name} 
      className="w-16 h-16 rounded-full border-2 border-primary-200 dark:border-primary-700 mb-2" 
    />
    <div className="text-lg font-bold text-gray-900 dark:text-gray-200">{name}</div>
    <div className="flex flex-wrap gap-2 mb-1">
      {skills.split(',').map(skill => (
        <span key={skill.trim()} className="bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-full text-xs font-semibold">
          {skill.trim()}
        </span>
      ))}
    </div>
    <div className="text-sm text-gray-500 dark:text-gray-400">Experience: {experience || 'N/A'} years</div>
    <div className="relative flex items-center justify-center mt-2 mb-1">
      <svg className="w-12 h-12" viewBox="0 0 36 36">
        <path className="text-gray-200 dark:text-gray-600" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path className="text-primary-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray={`${Math.round(score*100)},100`} />
      </svg>
      <span className="absolute text-primary-700 dark:text-primary-300 font-bold text-lg">{Math.round(score*100)}%</span>
    </div>
  </div>
);

const ARRequestorDashboard = () => {
  const { matchingJobs, agentStatus, startMatching, fetchAgentStatus, consultantProfiles } = useApp();
  const { user } = useAuth();
  const [selectedJob, setSelectedJob] = useState(null);
  const [isMatching, setIsMatching] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showJDModal, setShowJDModal] = useState(false);
  const [showConsultantModal, setShowConsultantModal] = useState(false);
  const [jobDescriptions, setJobDescriptions] = useState([]);
  const [matchingResults, setMatchingResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    fetchJobDescriptions();
    fetchMatchingResults();
  }, []);

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

  const fetchJobDescriptions = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/jobs/job-descriptions/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setJobDescriptions(data);
    } catch (err) {
      console.error('Failed to fetch job descriptions:', err);
    }
  };

  const fetchMatchingResults = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/consultants/matching-results/grouped', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMatchingResults(data);
    } catch (err) {
      console.error('Failed to fetch matching results:', err);
    }
  };

  const handleStartMatching = async () => {
    if (!selectedJob) return;
    
    setIsMatching(true);
    setLoading(true);
    try {
      await startMatching(selectedJob.id);
      fetchAgentStatus(selectedJob.id);
      
      // Monitor until completion
      const checkCompletion = setInterval(() => {
        fetchAgentStatus(selectedJob.id);
        if (agentStatus.communication.status === 'completed' || 
            agentStatus.communication.status === 'error') {
          setIsMatching(false);
          setLoading(false);
          clearInterval(checkCompletion);
          fetchMatchingResults(); // Refresh results
        }
      }, 2000);
    } catch (error) {
      setIsMatching(false);
      setLoading(false);
      console.error('Matching failed:', error);
    }
  };

  const getOverallProgress = () => {
    const totalSteps = 3;
    const completedSteps = [
      agentStatus.comparison.status === 'completed',
      agentStatus.ranking.status === 'completed',
      agentStatus.communication.status === 'completed'
    ].filter(Boolean).length;
    return (completedSteps / totalSteps) * 100;
  };

  const getOverallStatus = () => {
    if (agentStatus.communication.status === 'completed') return 'completed';
    if (agentStatus.communication.status === 'error') return 'error';
    if (isMatching) return 'pending';
    return 'idle';
  };

  const getMatchingResult = (jobId) =>
    matchingResults.find(result => result.job_description_id === jobId);

  // Dashboard metrics
  const metrics = {
    totalJobs: jobDescriptions?.length || 0,
    activeMatching: jobDescriptions?.filter(job => job.status === 'matching').length || 0,
    completedJobs: jobDescriptions?.filter(job => job.status === 'completed').length || 0,
    totalConsultants: consultantProfiles?.length || 0,
    totalMatches: matchingResults?.reduce((acc, result) => acc + (result.top_matches?.length || 0), 0) || 0,
    highMatches: matchingResults?.reduce((acc, result) => 
      acc + (result.top_matches?.filter(match => match.score >= 0.8).length || 0), 0
    ) || 0,
  };

  // Recent activities
  const recentActivities = [
    {
      title: 'Job Description Uploaded',
      description: 'Data Scientist position uploaded successfully',
      time: '2 hours ago',
      status: 'completed'
    },
    {
      title: 'Consultant Matching',
      description: 'Matching 15 consultant profiles',
      time: '1 hour ago',
      status: 'pending'
    },
    {
      title: 'Email Notification',
      description: 'Top matches sent to AR Requestor',
      time: '30 minutes ago',
      status: 'completed'
    }
  ];

  // Quick actions
  const quickActions = [
    {
      title: 'Upload Job Description',
      description: 'Add a new job description for matching',
      icon: Upload,
      color: 'text-blue-600 dark:text-blue-400',
      onClick: () => setShowJDModal(true)
    },
    {
      title: 'Upload Consultant Profile',
      description: 'Add consultant profiles for matching',
      icon: Users,
      color: 'text-green-600 dark:text-green-400',
      onClick: () => setShowConsultantModal(true)
    },
    {
      title: 'View Matching Results',
      description: 'See detailed matching analysis',
      icon: BarChart3,
      color: 'text-purple-600 dark:text-purple-400',
      to: '/matching-results'
    }
  ];

  // Tab configuration
  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: BarChart3,
      content: (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <MetricCard
              title="Total Jobs"
              value={metrics.totalJobs}
              icon={FileText}
              color="primary"
              className="min-h-[120px] md:min-h-[150px]"
            />
            <MetricCard
              title="Active Matching"
              value={metrics.totalMatches}
              icon={Loader2}
              color="warning"
              className="min-h-[120px] md:min-h-[150px]"
            />
            <MetricCard
              title="Completed Jobs"
              value={metrics.completedJobs}
              icon={CheckCircle}
              color="success"
            />
            <MetricCard
              title="Total Consultants"
              value={metrics.totalConsultants}
              icon={Users}
              color="info"
              className="min-h-[120px] md:min-h-[150px]"
            />
          </div>

          {/* Quick Actions */}
          <DashboardCard title="Quick Actions" icon={Zap}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickActions.map((action, index) => (
                <QuickActionCard key={index} {...action} />
              ))}
            </div>
          </DashboardCard>

          {/* Recent Activity */}
         
        </div>
      )
    },
    {
      id: 'job-descriptions',
      label: 'Job Descriptions',
      icon: FileText,
      badge: jobDescriptions?.length || 0,
      content: (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200">Job Descriptions</h2>
            <button
              onClick={() => setShowJDModal(true)}
              className="bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200 flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Upload JD
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobDescriptions.map((job) => (
              <DashboardCard
                key={job.id}
                title={job.job_title}
                icon={FileText}
                gradient
                onClick={() => setSelectedJob(job)}
              >
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Department:</strong> {job.department}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Experience:</strong> {job.experience_required} years
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {job.skills?.slice(0, 3).map((skill, index) => (
                      <span key={index} className="bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-full text-xs">
                        {skill}
                      </span>
                    ))}
                    {job.skills?.length > 3 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">+{job.skills.length - 3} more</span>
                    )}
                  </div>
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    job.status === 'completed' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                    job.status === 'matching' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200' :
                    'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200'
                  }`}>
                    {job.status}
                  </div>
                </div>
              </DashboardCard>
            ))}
      </div>
      </div>
      )
    },
    {
      id: 'matching',
      label: 'Matching Results',
      icon: Target,
      badge: matchingResults?.length || 0,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Total Matches"
              value={metrics.totalMatches}
              icon={BarChart3}
              color="primary"
            />
            <MetricCard
              title="High Matches (80%+)"
              value={metrics.highMatches}
              icon={TrendingUp}
              color="success"
            />
            <MetricCard
              title="Average Score"
              value={`${Math.round((matchingResults?.reduce((acc, result) => 
                acc + (result.top_matches?.reduce((sum, match) => sum + match.score, 0) || 0), 0
              ) || 0) / Math.max(metrics.totalMatches, 1) * 100)}%`}
              icon={BarChart2}
              color="info"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matchingResults.map((result) => (
              <DashboardCard
                key={result.job_description_id}
                title={result.job_title}
                icon={FileText}
                gradient
              >
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Department:</strong> {result.department}
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-200">Top Matches:</div>
                    {result.top_matches?.slice(0, 3).map((match, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">{match.consultant_name}</span>
                        <span className="font-semibold text-primary-600 dark:text-primary-400">
                          {Math.round(match.score * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </DashboardCard>
            ))}
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-200 flex items-center gap-2">
            <Bot className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            AR Requestor Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Welcome back, {user?.fullName || user?.email?.split('@')[0]}! Track your job matching progress and manage consultant profiles.
          </p>
        </div>
        
        {selectedJob && (
          <div className="flex items-center space-x-4">
            q
          </div>
        )}
      </div>

      {/* Progress Section */}
      {selectedJob && isMatching && (
        <DashboardCard title="Matching Progress" icon={Loader2}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Overall Progress: {Math.round(getOverallProgress())}%
              </span>
              <span className={`text-sm font-medium ${
                getOverallStatus() === 'completed' ? 'text-green-600 dark:text-green-400' :
                getOverallStatus() === 'error' ? 'text-red-600 dark:text-red-400' :
                'text-yellow-600 dark:text-yellow-400'
              }`}>
                {getOverallStatus().toUpperCase()}
              </span>
            </div>
            <ProgressBar progress={getOverallProgress()} />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                  agentStatus.comparison.status === 'completed' ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  {agentStatus.comparison.status === 'completed' ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">JD Comparison</p>
              </div>
              <div className="text-center">
                <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                  agentStatus.ranking.status === 'completed' ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  {agentStatus.ranking.status === 'completed' ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Profile Ranking</p>
              </div>
              <div className="text-center">
                <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                  agentStatus.communication.status === 'completed' ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  {agentStatus.communication.status === 'completed' ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Email Notification</p>
          </div>
        </div>
          </div>
        </DashboardCard>
      )}

      {/* Main Dashboard Content */}
      {/* Remove DashboardTabs and tab navigation logic */}
      {/* Render only the overview/main dashboard content directly */}
      {/* Find the overview tab content and render it as the main content */}
      <div className="space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <MetricCard
            title="Total Jobs"
            value={metrics.totalJobs}
            icon={FileText}
            color="primary"
            className="min-h-[120px] md:min-h-[150px]"
          />
          <MetricCard
            title="Active Matching"
            value={metrics.totalMatches}
            icon={Loader2}
            color="warning"
            className="min-h-[120px] md:min-h-[150px]"
          />
          {/* <MetricCard
            title="Completed Jobs"
            value={metrics.completedJobs}
            icon={CheckCircle}
            color="success"
          /> */}
          <MetricCard
            title="Total Consultants"
            value={metrics.totalConsultants}
            icon={Users}
            color="info"
            className="min-h-[120px] md:min-h-[150px]"
          />
        </div>

        {/* Quick Actions */}
        <DashboardCard title="Quick Actions" icon={Zap}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <QuickActionCard key={index} {...action} />
            ))}
          </div>
        </DashboardCard>

        {/* Recent Activity */}
        {/* <DashboardCard title="Recent Activity" icon={Clock}>
          <div className="space-y-0">
            {recentActivities.map((activity, index) => (
              <ActivityItem key={index} {...activity} />
            ))}
          </div>
        </DashboardCard> */}
      </div>

      {/* Modals */}
      <JDUploadModal
        isOpen={showJDModal}
        onClose={() => setShowJDModal(false)}
        onUploadSuccess={() => {
          setShowJDModal(false);
          fetchJobDescriptions();
        }}
      />
      
      <ConsultantUploadModal
        isOpen={showConsultantModal}
        onClose={() => setShowConsultantModal(false)}
        onUploadSuccess={() => {
          setShowConsultantModal(false);
          fetchMatchingResults();
        }}
      />
    </div>
  );
};

export default ARRequestorDashboard;