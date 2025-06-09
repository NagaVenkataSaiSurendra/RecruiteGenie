import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext.jsx';
import { Search, Filter, Download, AlertCircle, TrendingUp, Clock } from 'lucide-react';

const RecruiterDashboard = () => {
  const { matchingJobs, consultantProfiles, matchingResults, agentStatus } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recruiter Console</h1>
          <p className="mt-2 text-gray-600">Monitor and manage the matching system</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Download className="w-5 h-5 mr-2" />
          Generate Report
        </button>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Jobs</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalJobs}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Matching</p>
              <p className="text-2xl font-bold text-orange-600">{metrics.activeMatching}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{metrics.completedJobs}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Consultants</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalConsultants}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Agent Status Monitoring */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Agent Framework Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
              agentStatus.comparison.status === 'completed' ? 'bg-green-100 text-green-600' :
              agentStatus.comparison.status === 'in-progress' ? 'bg-blue-100 text-blue-600' :
              agentStatus.comparison.status === 'error' ? 'bg-red-100 text-red-600' :
              'bg-gray-100 text-gray-600'
            }`}>
              <Search className="w-8 h-8" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Comparison Agent</h3>
            <p className="text-sm text-gray-600 mt-2">
              Status: {agentStatus.comparison.status}
            </p>
            <p className="text-sm text-gray-600">
              Progress: {agentStatus.comparison.progress}%
            </p>
          </div>
          
          <div className="text-center">
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
              agentStatus.ranking.status === 'completed' ? 'bg-green-100 text-green-600' :
              agentStatus.ranking.status === 'in-progress' ? 'bg-blue-100 text-blue-600' :
              agentStatus.ranking.status === 'error' ? 'bg-red-100 text-red-600' :
              'bg-gray-100 text-gray-600'
            }`}>
              <TrendingUp className="w-8 h-8" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Ranking Agent</h3>
            <p className="text-sm text-gray-600 mt-2">
              Status: {agentStatus.ranking.status}
            </p>
            <p className="text-sm text-gray-600">
              Progress: {agentStatus.ranking.progress}%
            </p>
          </div>
          
          <div className="text-center">
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
              agentStatus.communication.status === 'completed' ? 'bg-green-100 text-green-600' :
              agentStatus.communication.status === 'in-progress' ? 'bg-blue-100 text-blue-600' :
              agentStatus.communication.status === 'error' ? 'bg-red-100 text-red-600' :
              'bg-gray-100 text-gray-600'
            }`}>
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Communication Agent</h3>
            <p className="text-sm text-gray-600 mt-2">
              Status: {agentStatus.communication.status}
            </p>
            <p className="text-sm text-gray-600">
              Progress: {agentStatus.communication.progress}%
            </p>
          </div>
        </div>
      </div>

      {/* JD Search & Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Job Description Management</h2>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by job title or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="matching">Matching</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Skills Required
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{job.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{job.department}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {job.skills.slice(0, 3).map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {skill}
                        </span>
                      ))}
                      {job.skills.length > 3 && (
                        <span className="text-xs text-gray-500">+{job.skills.length - 3} more</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      job.status === 'completed' ? 'bg-green-100 text-green-800' :
                      job.status === 'matching' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(job.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RecruiterDashboard;