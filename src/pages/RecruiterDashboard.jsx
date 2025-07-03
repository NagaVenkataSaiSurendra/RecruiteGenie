import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext.jsx';
import { Search, Filter, Download, AlertCircle, TrendingUp, Clock, BarChart2, AlertTriangle, FileText, Users } from 'lucide-react';
import ConsultantUploadModal from '../components/ConsultantUploadModal';
import axios from 'axios';

const mockJDs = [
  { id: 1, title: 'Data Scientist', skills: 'Python, ML, SQL', status: 'Completed', matches: 3 },
  { id: 2, title: 'Java Developer', skills: 'Java, Spring', status: 'In Progress', matches: 2 },
  { id: 3, title: 'Frontend Engineer', skills: 'React, CSS', status: 'Pending', matches: 0 },
];

const mockQueue = [
  { id: 1, job: 'Data Scientist', status: 'Completed', latency: '2s', errors: 0 },
  { id: 2, job: 'Java Developer', status: 'In Progress', latency: '5s', errors: 1 },
];

const RecruiterDashboard = () => {
  const { matchingJobs, consultantProfiles, matchingResults, agentStatus, fetchConsultantProfiles } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const filteredJobs = matchingJobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getMetrics = () => {
    return {
      totalJobs: matchingJobs.length,
      activeMatching: matchingJobs.filter(job => job.status === 'matching').length,
      completedJobs: matchingJobs.filter(job => job.status === 'completed').length,
      totalConsultants: consultantProfiles.length
    };
  };

  const metrics = getMetrics();

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
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center mb-4 gap-4">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search JDs by title or skills..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 w-full max-w-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <table className="min-w-full bg-white rounded-lg overflow-hidden shadow">
          <thead>
            <tr className="bg-indigo-50">
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Title</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Skills</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Status</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Top Matches</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.map(jd => (
              <tr key={jd.id} className="border-b hover:bg-indigo-50">
                <td className="px-4 py-2 font-medium text-gray-900">{jd.title}</td>
                <td className="px-4 py-2 text-gray-700">{jd.skills}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${jd.status === 'Completed' ? 'bg-green-200 text-green-800' : jd.status === 'In Progress' ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-200 text-gray-800'}`}>{jd.status}</span>
                </td>
                <td className="px-4 py-2 text-center font-bold text-indigo-700">{jd.matches}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><BarChart2 className="w-5 h-5" /> Agentic Queue & Latency</h2>
          <table className="min-w-full bg-white rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Job</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Status</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Latency</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Errors</th>
              </tr>
            </thead>
            <tbody>
              {mockQueue.map(item => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-900">{item.job}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.status === 'Completed' ? 'bg-green-200 text-green-800' : item.status === 'In Progress' ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-200 text-gray-800'}`}>{item.status}</span>
                  </td>
                  <td className="px-4 py-2 text-gray-700">{item.latency}</td>
                  <td className="px-4 py-2 text-center">
                    {item.errors > 0 ? <span className="flex items-center gap-1 text-red-600 font-bold"><AlertTriangle className="w-4 h-4" /> {item.errors}</span> : '0'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col justify-between">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><FileText className="w-5 h-5" /> Report Generation</h2>
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold shadow hover:bg-indigo-700 transition">Generate Report</button>
        </div>
      </div>
    </div>
  );
};

export default RecruiterDashboard;