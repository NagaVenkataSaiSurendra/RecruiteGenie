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

const InfoBanner = ({ onClose }) => (
  <div className="bg-gradient-to-r from-blue-100 to-indigo-100 border-l-4 border-blue-400 p-4 mb-6 rounded-lg flex items-center justify-between shadow">
    <div className="flex items-center space-x-3">
      <BarChart2 className="w-6 h-6 text-blue-500" />
      <span className="text-gray-800 font-medium">Welcome! This dashboard shows the real-time status of your job description matching process. Track progress, view top consultant matches, and get notified instantly.</span>
    </div>
    <button onClick={onClose} className="ml-4 text-blue-500 hover:text-blue-700 font-bold text-lg">×</button>
  </div>
);

const Stepper = ({ steps }) => (
  <div className="flex items-center justify-between w-full mb-8">
    {steps.map((step, idx) => (
      <div key={step.label} className="flex flex-col items-center flex-1 relative">
        <div className={`rounded-full w-12 h-12 flex items-center justify-center mb-2 transition-all duration-300 shadow-lg border-2 ${step.completed ? 'bg-green-500 border-green-500 text-white' : step.current ? 'bg-blue-500 border-blue-500 text-white animate-pulse' : 'bg-gray-200 border-gray-300 text-gray-400'}`}
          title={step.tooltip}>
          {step.completed ? <CheckCircle className="w-7 h-7" /> : step.current ? <Loader2 className="w-7 h-7 animate-spin" /> : <Clock className="w-7 h-7" />}
        </div>
        <span className={`text-xs font-semibold ${step.completed ? 'text-green-700' : step.current ? 'text-blue-700' : 'text-gray-500'}`}>{step.label}</span>
        {idx < steps.length - 1 && <div className="absolute top-6 right-0 w-full h-1 bg-gradient-to-r from-blue-200 to-green-200 z-0" style={{ left: '50%', width: '100%' }} />}
      </div>
    ))}
  </div>
);

const TopMatchCard = ({ name, score, skills, experience, avatarUrl }) => (
  <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center space-y-3 hover:shadow-2xl transition-all duration-300">
    <img src={avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`} alt={name} className="w-16 h-16 rounded-full border-2 border-indigo-200 mb-2" />
    <div className="text-lg font-bold text-gray-900">{name}</div>
    <div className="flex flex-wrap gap-2 mb-1">
      {skills.split(',').map(skill => (
        <span key={skill.trim()} className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs font-semibold">{skill.trim()}</span>
      ))}
    </div>
    <div className="text-sm text-gray-500">Experience: {experience || 'N/A'} years</div>
    <div className="relative flex items-center justify-center mt-2 mb-1">
      <svg className="w-12 h-12" viewBox="0 0 36 36">
        <path className="text-gray-200" d="M18 2.0845
          a 15.9155 15.9155 0 0 1 0 31.831
          a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path className="text-indigo-500" d="M18 2.0845
          a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray={`${Math.round(score*100)},100`} />
      </svg>
      <span className="absolute text-indigo-700 font-bold text-lg">{Math.round(score*100)}%</span>
    </div>
  </div>
);

const EmailStatusCard = ({ status, timestamp, onResend, onView }) => (
  <div className="bg-white rounded-xl shadow-lg p-6 flex items-center space-x-4 mb-4">
    <Mail className={`w-8 h-8 ${status === 'Sent' ? 'text-green-500' : status === 'Pending' ? 'text-yellow-500' : 'text-red-500'}`} title="Email Status" />
    <div className="flex-1">
      <div className="text-md font-semibold text-gray-800">Email Notification</div>
      <div className="text-sm text-gray-500">Status: <span className={`font-bold ${status === 'Sent' ? 'text-green-600' : status === 'Pending' ? 'text-yellow-600' : 'text-red-600'}`}>{status}</span></div>
      {timestamp && <div className="text-xs text-gray-400">{timestamp}</div>}
    </div>
    {status !== 'Sent' && <button onClick={onResend} className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded hover:bg-yellow-200 font-semibold text-xs">Resend</button>}
    <button onClick={onView} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded hover:bg-indigo-200 font-semibold text-xs">View Email</button>
  </div>
);

const JDStatusCard = ({ jdTitle, status, onViewJD }) => (
  <div className="bg-white rounded-xl shadow-lg p-6 flex items-center space-x-4 mb-4">
    <FileText className={`w-8 h-8 ${status === 'Completed' ? 'text-green-500' : status === 'In Progress' ? 'text-blue-500' : 'text-red-500'}`} title="JD Status" />
    <div className="flex-1">
      <div className="text-md font-semibold text-gray-800">JD Comparison</div>
      <div className="text-sm text-gray-500">{jdTitle}</div>
      <div className="text-xs font-bold mt-1">Status: <span className={`${status === 'Completed' ? 'text-green-600' : status === 'In Progress' ? 'text-blue-600' : 'text-red-600'}`}>{status}</span></div>
    </div>
    <button onClick={onViewJD} className="bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 font-semibold text-xs">View JD</button>
  </div>
);

const ARRequestorDashboard = () => {
  const { matchingJobs, agentStatus, startMatching, fetchAgentStatus, matchingResults } = useApp();
  const [selectedJob, setSelectedJob] = useState(null);
  const [isMatching, setIsMatching] = useState(false);
  const { user } = useAuth();
  const [showInfoBanner, setShowInfoBanner] = useState(true);
  const [showJDModal, setShowJDModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

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
    <div className="max-w-6xl mx-auto px-4 py-8 font-sans">
      {showInfoBanner && <InfoBanner onClose={() => setShowInfoBanner(false)} />}
      <div className="mb-8">
        <Stepper steps={[
          { label: 'JD Compared', completed: agentStatus.comparison?.status === 'completed', current: agentStatus.comparison?.status === 'in-progress', tooltip: 'The job description is being compared with consultant profiles.' },
          { label: 'Profiles Ranked', completed: agentStatus.ranking?.status === 'completed', current: agentStatus.ranking?.status === 'in-progress', tooltip: 'Consultant profiles are being ranked based on similarity.' },
          { label: 'Email Sent', completed: agentStatus.communication?.status === 'completed', current: agentStatus.communication?.status === 'in-progress', tooltip: 'Notification email is being sent to you.' },
        ]} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <JDStatusCard jdTitle={selectedJob?.title || 'No JD Selected'} status={agentStatus.comparison?.status === 'completed' ? 'Completed' : agentStatus.comparison?.status === 'in-progress' ? 'In Progress' : 'Pending'} onViewJD={() => setShowJDModal(true)} />
        <EmailStatusCard status={agentStatus.communication?.status === 'completed' ? 'Sent' : agentStatus.communication?.status === 'in-progress' ? 'Pending' : 'Pending'} timestamp={agentStatus.communication?.timestamp} onResend={() => {/* TODO: implement resend */}} onView={() => setShowEmailModal(true)} />
      </div>
      <div className="mb-8">
        <div className="text-xl font-bold text-gray-800 mb-4 flex items-center"><ListOrdered className="w-6 h-6 mr-2 text-indigo-500" />Top 3 Matches</div>
        {agentStatus.ranking?.status === 'completed' && matchingResults?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {matchingResults.slice(0, 3).map((match, idx) => (
              <TopMatchCard key={idx} name={match.name} score={match.similarity_score} skills={match.skills} experience={match.experience} avatarUrl={match.avatarUrl} />
            ))}
          </div>
        ) : agentStatus.ranking?.status === 'completed' && (!matchingResults || matchingResults.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-12">
            <img src="https://undraw.co/api/illustrations/empty?color=indigo" alt="No matches" className="w-32 h-32 mb-4" />
            <div className="text-lg text-gray-500 font-semibold">No suitable consultant matches found for this JD.</div>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-gray-400"><Loader2 className="animate-spin w-5 h-5" /> <span>Matching in progress...</span></div>
        )}
      </div>
      {/* JD Modal */}
      {showJDModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-lg w-full relative">
            <button onClick={() => setShowJDModal(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">×</button>
            <div className="text-xl font-bold mb-2">Job Description</div>
            <div className="text-gray-700 whitespace-pre-line">{selectedJob?.description || 'No JD available.'}</div>
          </div>
        </div>
      )}
      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-lg w-full relative">
            <button onClick={() => setShowEmailModal(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">×</button>
            <div className="text-xl font-bold mb-2">Notification Email</div>
            <div className="text-gray-700 whitespace-pre-line">{/* TODO: Render email content here */}Email content preview coming soon.</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ARRequestorDashboard;