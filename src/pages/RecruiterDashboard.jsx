import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext.jsx';
import { Search, Filter, Download, AlertCircle, TrendingUp, Clock, BarChart2, AlertTriangle, FileText, Users, Eye } from 'lucide-react';
import ConsultantUploadModal from '../components/ConsultantUploadModal';
import axios from 'axios';


const RecruiterDashboard = () => {
  const { matchingJobs, consultantProfiles, agentStatus, fetchConsultantProfiles } = useApp();
  const [matchingResults, setMatchingResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [consultantSearch, setConsultantSearch] = useState("");
  const [selectedConsultant, setSelectedConsultant] = useState(null);
  const [showConsultantModal, setShowConsultantModal] = useState(false);

  useEffect(() => {
    async function fetchResults() {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:8000/api/consultants/matching-results/grouped', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setMatchingResults(Array.isArray(data) ? data : []);
      } catch (err) {
        setMatchingResults([]);
      }
    }
    fetchResults();
  }, []);

  const filteredJobs = matchingJobs.filter(job => {
    const matchesSearch = (job.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ((job.skills || []).some(skill => (skill || '').toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredConsultants = consultantProfiles.filter(consultant =>
    consultant.name.toLowerCase().includes(consultantSearch.toLowerCase()) ||
    (consultant.skills && consultant.skills.some(skill => skill.toLowerCase().includes(consultantSearch.toLowerCase())))
  );

  const getMetrics = () => {
    return {
      totalJobs: matchingJobs.length,
      activeMatching: matchingJobs.filter(job => job.status === 'matching').length,
      completedJobs: matchingJobs.filter(job => job.status === 'completed').length,
      totalConsultants: consultantProfiles.length
    };
  };

  const metrics = getMetrics();

  // Helper to get matching result for a job
  const getMatchingResult = (jobId) => matchingResults.find(r => r.job_description_id === jobId);

  const handleConsultantUpload = async (file) => {
    setUploading(true);
    const token = localStorage.getItem('token');
    const uploadUrl = 'http://localhost:8000/api/consultants/upload';
    console.log('DEBUG: Uploading consultant profile');
    console.log('DEBUG: Upload URL:', uploadUrl);
    console.log('DEBUG: Token:', token);
    if (!token) {
      alert('You must be logged in to upload a consultant profile.');
      setUploading(false);
      return;
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      console.log('DEBUG: FormData file:', file);
      const response = await axios.post(uploadUrl, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true,
      });
      console.log('DEBUG: Upload response:', response);
      alert('Consultant profile uploaded successfully!');
      setShowUploadModal(false);
      fetchConsultantProfiles && fetchConsultantProfiles();
    } catch (error) {
      console.error('DEBUG: Upload error:', error);
      alert('Consultant profile upload failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploading(false);
    }
  };

  // Add handler for viewing consultant
  const handleViewConsultant = (consultant) => {
    setSelectedConsultant(consultant);
    setShowConsultantModal(true);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-indigo-700 flex items-center gap-2">
        <Users className="w-7 h-7" /> Recruiter Admin Console
        
      </h1>
      <ConsultantUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleConsultantUpload}
        uploading={uploading}
      />
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center mb-4 gap-4">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search JDs by title or skills..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="border border-gray-300 dark:border-dark-700 rounded-lg px-3 py-2 w-full max-w-md bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <table className="min-w-full bg-white dark:bg-dark-900 rounded-lg overflow-hidden shadow">
          <thead>
            <tr className="bg-primary-50 dark:bg-dark-800/60">
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Title</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Skills</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Status</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Top Matches</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.map(jd => {
              const matchResult = getMatchingResult(jd.id);
              return (
                <tr key={jd.id} className="border-b border-gray-100 dark:border-dark-700 hover:bg-primary-50/40 dark:hover:bg-dark-800/40 transition-colors">
                  <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-200">{matchResult ? matchResult.job_title : jd.title}</td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{Array.isArray(jd.skills) ? jd.skills.join(', ') : jd.skills}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${jd.status === 'Completed' ? 'bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-300' : jd.status === 'In Progress' ? 'bg-yellow-200 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300' : 'bg-gray-200 dark:bg-dark-700 text-gray-800 dark:text-gray-300'}`}>{jd.status}</span>
                  </td>
                  <td className="px-4 py-2 text-center font-bold text-indigo-700 dark:text-primary-400">
                    {matchResult && Array.isArray(matchResult.top_matches) && matchResult.top_matches.length > 0 ? (
                      <div className="flex flex-wrap gap-1 justify-center">
                        {matchResult.top_matches.slice(0, 3).map((m, i) => (
                          <span key={i} className="inline-block bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-full text-xs font-semibold">{m.consultant_name}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 text-xs">No matches</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Consultant Profiles Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-indigo-700 mb-6 flex items-center gap-2"><Users className="w-6 h-6" /> Consultant Profiles</h2>
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-center">
          <input
            type="text"
            placeholder="Search by name or skills..."
            value={consultantSearch}
            onChange={e => setConsultantSearch(e.target.value)}
            className="w-full md:w-1/2 px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredConsultants.map((consultant) => (
            <div key={consultant.id} className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-700 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-dark-700 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 dark:text-primary-400 font-semibold text-lg">
                      {consultant.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-200">{consultant.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{consultant.experience} years experience</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300 ml-1">4.8</span>
                  <button
                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-700 transition"
                    onClick={() => handleViewConsultant(consultant)}
                    title="View Profile"
                  >
                    <Eye className="w-5 h-5 text-blue-500 dark:text-primary-400" />
                  </button>
                </div>
              </div>
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-200">Skills</h4>
                <div className="flex flex-wrap gap-1">
                  {consultant.skills.slice(0, 4).map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {skill}
                    </span>
                  ))}
                  {consultant.skills.length > 4 && (
                    <span className="text-xs text-gray-500">+{consultant.skills.length - 4} more</span>
                  )}
                </div>
              </div>
              <div className="mb-4">
                <p className="text-sm text-gray-600 line-clamp-2">
                  {consultant.bio || "Experienced professional with strong technical background."}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  consultant.availability === 'available' ? 'bg-green-100 text-green-800' :
                  consultant.availability === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {consultant.availability || 'available'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Consultant Profile Modal */}
      {showConsultantModal && selectedConsultant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-dark-800 rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-dark-700 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 dark:text-primary-400 font-semibold text-xl">
                      {selectedConsultant.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="ml-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-200">{selectedConsultant.name}</h2>
                    <p className="text-gray-600 dark:text-gray-300">{selectedConsultant.experience} years of experience</p>
                    <div className="flex items-center mt-1">
                      <span className="text-sm text-gray-600 dark:text-gray-300 ml-1">4.8 rating</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowConsultantModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-200">About</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {selectedConsultant.bio || "Experienced professional with a strong technical background and proven track record in delivering high-quality solutions. Passionate about technology and continuous learning."}
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-200">Technical Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedConsultant.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-primary-900/20 text-blue-800 dark:text-primary-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-200">Experience Level</h4>
                    <p className="text-gray-600 dark:text-gray-300">{selectedConsultant.experience} years</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-200">Availability</h4>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      selectedConsultant.availability === 'available' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                      selectedConsultant.availability === 'busy' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200' :
                      'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                    }`}>
                      {selectedConsultant.availability || 'available'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-8 flex justify-end space-x-3">
                <button
                  onClick={() => setShowConsultantModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-700 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruiterDashboard;