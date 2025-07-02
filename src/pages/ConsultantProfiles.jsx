import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext.jsx';
import { Search, Filter, Eye, Star } from 'lucide-react';
import ConsultantUploadModal from '../components/ConsultantUploadModal';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

const ConsultantProfiles = () => {
  const { consultantProfiles, fetchConsultantProfiles } = useApp();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('all');
  const [selectedConsultant, setSelectedConsultant] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [llmResults, setLlmResults] = useState([]);
  const [showLlmModal, setShowLlmModal] = useState(false);
  const navigate = useNavigate();

  const filteredConsultants = consultantProfiles.filter(consultant => {
    const matchesSearch = consultant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         consultant.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesExperience = experienceFilter === 'all' || 
                             (experienceFilter === 'junior' && consultant.experience < 3) ||
                             (experienceFilter === 'mid' && consultant.experience >= 3 && consultant.experience < 7) ||
                             (experienceFilter === 'senior' && consultant.experience >= 7);
    return matchesSearch && matchesExperience;
  });

  const handleViewConsultant = (consultant) => {
    setSelectedConsultant(consultant);
    setShowModal(true);
  };

  // Upload consultant profile document handler (match JD upload logic)
  const handleConsultantUpload = async (file, jobDescription) => {
    setUploading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      alert('You must be logged in to upload a consultant profile.');
      navigate('/login');
      return;
    }
    if (!user || !user.id) {
      alert('Recruiter information not found. Please log in again.');
      navigate('/login');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('recruiter_id', user.id);
      formData.append('job_description', jobDescription);
      const response = await fetch('http://localhost:8000/api/consultants/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setLlmResults(data.llm_scores || []);
        setShowLlmModal(true);

        // Fallback: If no new scores, trigger a search for top matches
        if (!data.llm_scores || data.llm_scores.length === 0) {
          const searchRes = await fetch(
            `http://localhost:8000/api/consultants/search?query=${encodeURIComponent(jobDescription)}`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            setLlmResults(searchData.results || []);
          }
        }

        alert('Upload successful!');
        setShowUploadModal(false);
        fetchConsultantProfiles && fetchConsultantProfiles();
      } else if (response.status === 401) {
        alert('Session expired or unauthorized. Please log in again.');
        navigate('/login');
      } else {
        const error = await response.text();
        alert('Upload failed: ' + error);
      }
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Consultant Profiles</h1>
          <p className="mt-2 text-gray-600">Browse and manage consultant profiles</p>
        </div>
        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold shadow hover:bg-indigo-700 transition"
          onClick={() => setShowUploadModal(true)}
        >
          Upload Consultant Profile
        </button>
      </div>
      <ConsultantUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleConsultantUpload}
      />

      {/* LLM Results Modal */}
      {showLlmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h2 className="text-2xl font-bold mb-4 text-center">Top 3 LLM-Scored Profiles</h2>
            <ol className="space-y-4">
              {llmResults
                .map(profile => ({ ...profile, llm_score: Number(profile.llm_score) }))
                .sort((a, b) => b.llm_score - a.llm_score)
                .slice(0, 3)
                .map((profile, idx) => (
                  <li key={idx} className="border rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-lg">{profile.name || 'N/A'}</span>
                      <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">LLM Score: {profile.llm_score}</span>
                    </div>
                    <div className="text-sm text-gray-700 mb-1">Experience: {profile.experience || 'N/A'} years</div>
                    <div className="text-sm text-gray-700 mb-1">Education: {profile.education || 'N/A'}</div>
                    <div className="text-sm text-gray-700 mb-1">Skills: {Array.isArray(profile.skills) ? profile.skills.join(', ') : profile.skills}</div>
                    <div className="text-xs text-gray-600 mt-2"><span className="font-semibold">Reasoning:</span> {profile.llm_reasoning || 'No reasoning provided.'}</div>
                  </li>
                ))}
            </ol>
            <button
              className="mt-6 w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
              onClick={() => setShowLlmModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={experienceFilter}
              onChange={(e) => setExperienceFilter(e.target.value)}
              className="pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            >
              <option value="all">All Experience</option>
              <option value="junior">Junior (0-3 years)</option>
              <option value="mid">Mid-level (3-7 years)</option>
              <option value="senior">Senior (7+ years)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Consultant Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredConsultants.map((consultant) => (
          <div key={consultant.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-lg">
                    {consultant.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-gray-900">{consultant.name}</h3>
                  <p className="text-sm text-gray-600">{consultant.experience} years experience</p>
                </div>
              </div>
              <div className="flex items-center">
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                <span className="text-sm text-gray-600 ml-1">4.8</span>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Skills</h4>
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
              <button
                onClick={() => handleViewConsultant(consultant)}
                className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                <Eye className="w-4 h-4 mr-1" />
                View Profile
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Consultant Profile Modal */}
      {showModal && selectedConsultant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-xl">
                      {selectedConsultant.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="ml-4">
                    <h2 className="text-2xl font-bold text-gray-900">{selectedConsultant.name}</h2>
                    <p className="text-gray-600">{selectedConsultant.experience} years of experience</p>
                    <div className="flex items-center mt-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-sm text-gray-600 ml-1">4.8 rating</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">About</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {selectedConsultant.bio || "Experienced professional with a strong technical background and proven track record in delivering high-quality solutions. Passionate about technology and continuous learning."}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Technical Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedConsultant.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">Experience Level</h4>
                    <p className="text-gray-600">{selectedConsultant.experience} years</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Availability</h4>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      selectedConsultant.availability === 'available' ? 'bg-green-100 text-green-800' :
                      selectedConsultant.availability === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedConsultant.availability || 'available'}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Projects</h3>
                  <div className="space-y-2">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900">E-commerce Platform Development</h4>
                      <p className="text-sm text-gray-600">Full-stack development using React and Node.js</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900">Mobile App Development</h4>
                      <p className="text-sm text-gray-600">Cross-platform mobile application</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
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

export default ConsultantProfiles;