import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext.jsx';
import { Search, Filter, Eye, Star } from 'lucide-react';
import ConsultantUploadModal from '../components/ConsultantUploadModal';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import Confetti from 'react-confetti';

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
  const [lastJobDescriptionId, setLastJobDescriptionId] = useState(null);
  const [notifyStatus, setNotifyStatus] = useState("");
  const [emailPreview, setEmailPreview] = useState(null);
  const [jobDescriptions, setJobDescriptions] = useState([]);
  const [selectedJobDescription, setSelectedJobDescription] = useState(null);
  const [profileMatches, setProfileMatches] = useState([]);

  useEffect(() => {
    // Fetch job descriptions on mount
    const fetchJobDescriptions = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:8000/api/jobs/job-descriptions/', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        setJobDescriptions(data);
      } catch (err) {
        // handle error
      }
    };
    fetchJobDescriptions();
  }, []);

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
  const handleConsultantUpload = async (file) => {
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
    if (!selectedJobDescription) {
      alert('Please select a job description.');
      setUploading(false);
      return;
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('recruiter_id', user.id);
      formData.append('job_description_id', selectedJobDescription.id);
      // Compose a single job_description string with all details
      const jobDescriptionString = `Job Title: ${selectedJobDescription.job_title}\nDepartment: ${selectedJobDescription.department}\nExperience Required: ${selectedJobDescription.experience_required} years\nSkills: ${(selectedJobDescription.skills || []).join(', ')}\nDescription: ${selectedJobDescription.job_description}`;
      formData.append('job_description', jobDescriptionString);
      // Remove job_details field, only send the composed string
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
        // Fetch profile matches for the selected job description
        const matchesRes = await fetch(`http://localhost:8000/api/consultants/matching-results/grouped`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const matchesData = await matchesRes.json();
        const group = matchesData.find(g => g.job_description_id === Number(selectedJobDescription.id));
        setProfileMatches(group ? group.top_matches : []);
        if (data.job_description_id) {
          setLastJobDescriptionId(data.job_description_id);
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
      {/* Job Description Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-6 mb-4">
        <label className="block text-blue-800 font-bold mb-2">Select Job Description:</label>
        <select
          value={selectedJobDescription ? selectedJobDescription.id : ''}
          onChange={e => {
            const jd = jobDescriptions.find(jd => jd.id === Number(e.target.value));
            setSelectedJobDescription(jd || null);
          }}
          className="w-full border border-gray-300 rounded-lg px-4 py-2"
        >
          <option value="">-- Select Job Description --</option>
          {jobDescriptions.map(jd => (
            <option key={jd.id} value={jd.id}>
              {jd.job_title} ({jd.department})
            </option>
          ))}
        </select>
      </div>

      {selectedJobDescription && (
        <div className="bg-white rounded-lg shadow border border-blue-300 p-6 mb-4">
          <h2 className="text-xl font-bold text-blue-900 mb-2">Selected Job Description</h2>
          <div className="mb-2"><b>Job Title:</b> {selectedJobDescription.job_title}</div>
          <div className="mb-2"><b>Department:</b> {selectedJobDescription.department}</div>
          <div className="mb-2"><b>Experience Required:</b> {selectedJobDescription.experience_required} years</div>
          <div className="mb-2"><b>Status:</b> {selectedJobDescription.status}</div>
          <div className="mb-2"><b>Skills/Requirements:</b> {selectedJobDescription.skills && selectedJobDescription.skills.length > 0 ? selectedJobDescription.skills.join(', ') : 'N/A'}</div>
          <div className="mb-2"><b>Description:</b> <span className="text-gray-700">{selectedJobDescription.job_description}</span></div>
        </div>
      )}

      {selectedJobDescription && (
        <div className="mb-6">
          <ConsultantUploadModal
            isOpen={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            onUpload={handleConsultantUpload}
            selectedJobDescription={selectedJobDescription}
          />
          <button
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold shadow hover:bg-indigo-700 transition mt-2"
            onClick={() => setShowUploadModal(true)}
          >
            Upload Consultant Profile
          </button>
        </div>
      )}

      {/* LLM Results Modal */}
      {showLlmModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-5xl animate-fade-in overflow-x-auto">
            <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Top 3 LLM-Scored Profiles</h2>
            <table className="min-w-full bg-white border border-gray-200 rounded-xl shadow">
              <thead>
                <tr className="bg-gray-50 text-gray-700 text-sm">
                  <th className="py-3 px-4 text-left">Rank</th>
                  <th className="py-3 px-4 text-left">Name</th>
                  <th className="py-3 px-4 text-left">Experience</th>
                  <th className="py-3 px-4 text-left">Education</th>
                  <th className="py-3 px-4 text-left">Skills</th>
                  <th className="py-3 px-4 text-left">LLM Score</th>
                  <th className="py-3 px-4 text-left">Reasoning</th>
                </tr>
              </thead>
              <tbody>
                {llmResults
                  .map(profile => ({ ...profile, llm_score: Number(profile.llm_score) }))
                  .sort((a, b) => b.llm_score - a.llm_score)
                  .slice(0, 3)
                  .map((profile, idx) => (
                    <tr key={profile.name} className="border-t hover:bg-blue-50">
                      <td className="py-2 px-4 font-bold text-lg">
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                      </td>
                      <td className="py-2 px-4 font-semibold text-gray-800">{profile.name || 'N/A'}</td>
                      <td className="py-2 px-4">{profile.experience || 'N/A'} yrs</td>
                      <td className="py-2 px-4">{profile.education || 'N/A'}</td>
                      <td className="py-2 px-4">
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(profile.skills)
                            ? profile.skills.map((skill, i) => (
                                <span key={i} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                                  {skill}
                                </span>
                              ))
                            : profile.skills}
                        </div>
                      </td>
                      <td className="py-2 px-4">
                        <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow">
                          {profile.llm_score}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-xs text-gray-600 max-w-xs whitespace-normal">
                        {profile.llm_reasoning || 'No reasoning provided.'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <button
              className="mt-8 w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 transition text-lg shadow-lg"
              onClick={() => setShowLlmModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Top 3 LLM-Scored Profiles Cards (Persistent) */}
      {llmResults && llmResults.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Top 3 LLM-Scored Profiles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {llmResults
              .map(profile => ({ ...profile, llm_score: Number(profile.llm_score) }))
              .sort((a, b) => b.llm_score - a.llm_score)
              .slice(0, 3)
              .map((profile, idx) => (
                <div key={profile.name} className="bg-white rounded-xl shadow p-6 border-t-4 flex flex-col h-full justify-between border-blue-400">
                  <div className="flex items-center mb-2">
                    <span className="text-2xl mr-2">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}</span>
                    <span className="font-bold text-lg text-gray-900">{profile.name || 'N/A'}</span>
                  </div>
                  <div className="text-sm text-gray-700 mb-1"><span className="font-medium">Experience:</span> {profile.experience || 'N/A'} yrs</div>
                  <div className="text-sm text-gray-700 mb-1"><span className="font-medium">Education:</span> {profile.education || 'N/A'}</div>
                  <div className="mb-2">
                    <span className="font-medium text-sm">Skills:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Array.isArray(profile.skills)
                        ? profile.skills.map((skill, i) => (
                            <span key={i} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                              {skill}
                            </span>
                          ))
                        : profile.skills}
                    </div>
                  </div>
                  <div className="flex items-center mt-2">
                    <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow mr-2">
                      LLM Score: {profile.llm_score}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-2">
                    <span className="font-semibold">Reasoning:</span> {profile.llm_reasoning || 'No reasoning provided.'}
                  </div>
                </div>
              ))}
          </div>
          {/* Notify Matches Button */}
          {selectedJobDescription && (
            <button
              className="mt-6 bg-green-600 text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-green-700 transition"
              onClick={async () => {
                setNotifyStatus("Sending notification...");
                try {
                  const token = localStorage.getItem('token');
                  const res = await fetch(`http://localhost:8000/api/consultants/notify-matches`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ job_description_id: selectedJobDescription.id })
                  });
                  const data = await res.json();
                  setNotifyStatus(data.message || "Notification sent!");
                } catch (err) {
                  setNotifyStatus("Failed to send notification.");
                }
              }}
            >
              Notify Matches Found
            </button>
          )}
          {notifyStatus && <div className="mt-2 text-sm text-blue-700">{notifyStatus}</div>}
        </div>
      )}

      {/* Email Preview Modal */}
      {emailPreview && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg animate-fade-in">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Email Preview</h2>
            <div className="mb-2"><b>Job Title:</b> {emailPreview.jobTitle}</div>
            <div className="mb-4">
              <b>Top 3 Matches:</b>
              <ol className="list-decimal ml-6">
                {emailPreview.matches.map((m, i) => (
                  <li key={i} className="mb-2">
                    <b>{m.name}</b> (Score: {m.score})<br/>
                    <span className="text-xs text-gray-600">Reasoning: {m.reasoning}</span>
                  </li>
                ))}
              </ol>
            </div>
            <button
              className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
              onClick={() => setEmailPreview(null)}
            >
              Close Preview
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

      {/* Profile Matches Table */}
      {profileMatches.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-4">
          <h2 className="text-lg font-bold mb-4 text-blue-800">Top Matches for Selected Job Description</h2>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2">ID</th>
                <th className="px-2 py-2">AR Requestor ID</th>
                <th className="px-2 py-2">Recruiter ID</th>
                <th className="px-2 py-2">Profile ID</th>
                <th className="px-2 py-2">Candidate Name</th>
                <th className="px-2 py-2">LLM Score</th>
                <th className="px-2 py-2">LLM Reasoning</th>
                <th className="px-2 py-2">Job Description ID</th>
              </tr>
            </thead>
            <tbody>
              {profileMatches.map((match, idx) => (
                <tr key={idx}>
                  <td className="px-2 py-2">{match.id}</td>
                  <td className="px-2 py-2">{match.ar_requestor_id}</td>
                  <td className="px-2 py-2">{match.recruiter_id}</td>
                  <td className="px-2 py-2">{match.profile_id}</td>
                  <td className="px-2 py-2">{match.consultant_name}</td>
                  <td className="px-2 py-2">{match.score}</td>
                  <td className="px-2 py-2">{match.llm_reasoning || match.reasoning}</td>
                  <td className="px-2 py-2">{match.job_description_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ConsultantProfiles;