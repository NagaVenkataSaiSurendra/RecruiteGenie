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
  const [llmResults, setLlmResults] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const navigate = useNavigate();
  const [lastJobDescriptionId, setLastJobDescriptionId] = useState(null);
  const [notifyStatus, setNotifyStatus] = useState("");
  const [emailPreview, setEmailPreview] = useState(null);
  const [jobDescriptions, setJobDescriptions] = useState([]);
  const [selectedJobDescription, setSelectedJobDescription] = useState(null);
  const [profileMatches, setProfileMatches] = useState([]);
  const [emailNotification, setEmailNotification] = useState('');
  const [uploadInProgress, setUploadInProgress] = useState(false);

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

  useEffect(() => {
    setShowLeaderboard(false);
    fetchConsultantProfiles && fetchConsultantProfiles();
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

  console.log('filteredConsultants:', filteredConsultants);

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
        console.log('UPLOAD RESPONSE:', data);
        console.log('SET LLM RESULTS:', data.llm_scores || []);
        setShowLeaderboard(true);
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

  // Fetch top 3 LLM results for the selected job description
  const fetchLeaderboardResults = async (jobDescriptionId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8000/api/consultants/matching-results/grouped`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      const group = data.find(g => g.job_description_id === Number(jobDescriptionId));
      const topMatches = group ? group.top_matches : [];
      setLlmResults(topMatches);
      setShowLeaderboard(true);
      console.log('LEADERBOARD FETCHED:', topMatches);
    } catch (err) {
      setLlmResults([]);
      setShowLeaderboard(false);
      console.error('Failed to fetch leaderboard results:', err);
    }
  };

  // Send notification email after leaderboard is fetched
  const sendNotificationEmail = async (jobDescriptionId) => {
    try {
      const token = localStorage.getItem('token');
      const notifyRes = await fetch('http://localhost:8000/api/consultants/notify-matches', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ job_description_id: jobDescriptionId })
      });
      const notifyData = await notifyRes.json();
      setEmailNotification(notifyData.message || 'Notification email sent!');
      setTimeout(() => setEmailNotification(''), 5000);
    } catch (err) {
      setEmailNotification('Failed to send notification email.');
      setTimeout(() => setEmailNotification(''), 5000);
      console.error('Failed to send notification email:', err);
    }
  };

  // Only fetch leaderboard and send email after a successful upload
  const handleUploadComplete = async (jobDescriptionId) => {
    if (jobDescriptionId) {
      await fetchLeaderboardResults(jobDescriptionId);
      await sendNotificationEmail(jobDescriptionId);
    }
  };

  console.log('RENDER LEADERBOARD:', { showLeaderboard, llmResults });

  return (
    <div className="space-y-8">
      {emailNotification && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-800 px-4 py-2 rounded shadow z-50">
          {emailNotification}
        </div>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-blue-900 dark:text-primary-400">Consultant Profiles</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Browse and manage consultant profiles</p>
        </div>
        
      </div>
      {/* Job Description Selector */}
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-blue-200 dark:border-dark-700 p-6 mb-4">
        <label className="block text-blue-800 dark:text-primary-400 font-bold mb-2">Select Job Description:</label>
        <select
          value={selectedJobDescription ? selectedJobDescription.id : ''}
          onChange={e => {
            const jd = jobDescriptions.find(jd => jd.id === Number(e.target.value));
            setSelectedJobDescription(jd || null);
          }}
          className="w-full border border-gray-300 dark:border-dark-700 rounded-lg px-4 py-2 bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-200"
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
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow border border-blue-300 dark:border-dark-700 p-6 mb-4">
          <h2 className="text-xl font-bold text-blue-900 dark:text-primary-400 mb-2">Selected Job Description</h2>
          <div className="mb-2 text-gray-900 dark:text-gray-200"><b className="text-gray-900 dark:text-gray-200">Job Title:</b> {selectedJobDescription.job_title}</div>
          <div className="mb-2 text-gray-900 dark:text-gray-200"><b className="text-gray-900 dark:text-gray-200">Department:</b> {selectedJobDescription.department}</div>
          <div className="mb-2 text-gray-900 dark:text-gray-200"><b className="text-gray-900 dark:text-gray-200">Experience Required:</b> {selectedJobDescription.experience_required} years</div>
          <div className="mb-2 text-gray-900 dark:text-gray-200"><b className="text-gray-900 dark:text-gray-200">Status:</b> {selectedJobDescription.status}</div>
          <div className="mb-2 text-gray-900 dark:text-gray-200"><b className="text-gray-900 dark:text-gray-200">Skills/Requirements:</b> {selectedJobDescription.skills && selectedJobDescription.skills.length > 0 ? selectedJobDescription.skills.join(', ') : 'N/A'}</div>
          <div className="mb-2 text-gray-900 dark:text-gray-200"><b className="text-gray-900 dark:text-gray-200">Description:</b> <span className="text-gray-700 dark:text-gray-300">{selectedJobDescription.job_description}</span></div>
        </div>
      )}

      {selectedJobDescription && (
        <div className="mb-6">
          <ConsultantUploadModal
            isOpen={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            selectedJobDescription={selectedJobDescription}
            onUploadComplete={handleUploadComplete}
            onUploadFinished={() => setUploadInProgress(false)}
          />
          <button
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold shadow hover:bg-indigo-700 transition mt-2"
            style={{ position: 'relative', zIndex: 1000 }}
            onClick={() => {
              setShowUploadModal(true);
              setShowLeaderboard(false);
              setLlmResults([]);
              setEmailNotification('');
              setUploadInProgress(true);
            }}
          >
            Upload Consultant Profile
          </button>
        </div>
      )}

      {/* LLM Results Leaderboard Card List (as a normal section) */}
      {!uploadInProgress && showLeaderboard && llmResults && llmResults.length > 0 && (
        <div className="mb-8" style={{ position: 'static', zIndex: 1 }}>
          <h2 className="text-2xl font-bold text-indigo-700 mb-6 text-center">Leaderboard</h2>
          <div className="flex flex-col gap-6">
            {llmResults
              .map(profile => ({ ...profile, llm_score: Number(profile.llm_score ?? profile.score) }))
              .sort((a, b) => b.llm_score - a.llm_score)
              .slice(0, 3)
              .map((profile, idx) => (
                <div
                  key={profile.name || profile.id || idx}
                  className={`flex flex-col md:flex-row items-stretch bg-white/80 rounded-2xl shadow-xl border transition-all duration-200 ${idx === 0 ? 'border-yellow-300 bg-yellow-50/80' : 'border-indigo-100 hover:shadow-2xl hover:scale-[1.01]'} overflow-hidden`}
                  style={{ margin: 0, position: 'static', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}
                >
                  {/* Score Ribbon */}
                  <div className={`flex flex-row md:flex-col items-center justify-center md:w-24 w-full md:min-w-[72px] md:max-w-[90px] bg-gradient-to-b ${idx === 0 ? 'from-yellow-400/90 to-yellow-200/80' : 'from-indigo-400/80 to-indigo-200/60'} px-4 py-2 md:py-6`}
                    style={{ minHeight: '100%', minWidth: '72px' }}
                  >
                    <span className={`font-extrabold text-3xl md:text-4xl ${idx === 0 ? 'text-yellow-900' : 'text-indigo-900'} drop-shadow`}>{profile.llm_score ?? profile.score ?? 'NA'}</span>
                    <span className="text-xs text-gray-700 font-semibold mt-1 md:mt-2">Score</span>
                  </div>
                  {/* Main Info */}
                  <div className="flex-1 flex flex-col md:flex-row gap-2 md:gap-6 p-4 md:p-6">
                    <div className="flex-1 flex flex-col gap-2 min-w-[180px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-lg md:text-xl text-indigo-900">{profile.name || profile.consultant_name || profile.candidate_name || <span className="text-gray-400 italic">NA</span>}</span>
                        <span className="text-indigo-800 font-medium text-base ml-2">{profile.experience !== undefined ? `${profile.experience} yrs` : <span className="text-gray-400 italic">NA</span>}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(profile.skills) ? (
                          profile.skills.map((skill, i) => (
                            <span key={i} className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium shadow-sm border border-indigo-200">{skill}</span>
                          ))
                        ) : (
                          profile.skills || <span className="text-gray-400 italic">NA</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 flex items-center">
                      <div className="w-full bg-indigo-50/80 border border-indigo-100 rounded-xl px-4 py-3 text-indigo-900 text-sm shadow-inner whitespace-pre-line break-words">
                        {profile.llm_reasoning || <span className="text-gray-400 italic">NA</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
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

      {/* Consultant Profile Modal */}
      {showModal && selectedConsultant && (
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
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-sm text-gray-600 dark:text-gray-300 ml-1">4.8 rating</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
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
                  onClick={() => setShowModal(false)}
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

export default ConsultantProfiles;