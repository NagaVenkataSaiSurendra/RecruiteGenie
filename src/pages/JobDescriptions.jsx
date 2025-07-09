import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext.jsx';
import { Plus, Edit, Trash2, Eye, FileText, UploadCloud, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const JobDescriptions = () => {
  const { matchingJobs, fetchMatchingJobs } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const navigate = useNavigate();
  const [arUploadFile, setArUploadFile] = useState(null);
  const [arUploadStatus, setArUploadStatus] = useState("");
  const [arParsedInfo, setArParsedInfo] = useState(null);
  const [jobDescriptions, setJobDescriptions] = useState([]);
  const [showJDModal, setShowJDModal] = useState(false);

  useEffect(() => {
    fetchJobDescriptions();
  }, []);

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

  const handleViewJob = (job) => {
    setSelectedJob(job);
    setShowModal(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-200">Job Descriptions</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Manage and view all job descriptions</p>
        </div>
      </div>

      {/* Upload Job Description Heading and Button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-200">Upload Job Description</h2>
        <button
          className="flex items-center bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200"
          onClick={() => setShowJDModal(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Upload
        </button>
      </div>

      {/* AR Requestor Job Description Upload Modal */}
      {showJDModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl p-6 max-w-md w-full relative flex flex-col items-center border border-blue-200 dark:border-blue-700">
            <button
              onClick={() => setShowJDModal(false)}
              className="absolute top-3 right-3 text-gray-300 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-300 text-2xl focus:outline-none"
            >
              <XCircle className="w-7 h-7" />
            </button>
            <div className="flex flex-col items-center mb-4 w-full">
              <div className="bg-gradient-to-tr from-blue-400 to-indigo-400 p-3 rounded-full shadow-lg mb-2">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div className="text-xl font-extrabold text-gray-900 dark:text-gray-200 mb-1">Upload Job Description</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 text-center max-w-xs">
                Select or drag & drop a job description document (PDF, DOC, DOCX, TXT). This will be securely stored and used for matching.
              </div>
            </div>
            <form className="w-full flex flex-col items-center space-y-4">
              <div
                className={`w-full border-2 border-dashed border-gray-300 dark:border-dark-700 bg-gray-50 dark:bg-dark-900 rounded-xl flex flex-col items-center justify-center p-4 transition-all duration-200 cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-dark-700`}
                onClick={() => document.getElementById('ar-upload-input').click()}
                style={{ minHeight: '80px' }}
              >
                {arUploadFile ? (
                  <div className="flex items-center space-x-2">
                    <FileText className="w-6 h-6 text-blue-500" />
                    <span className="font-semibold text-blue-700 dark:text-primary-400 text-base">{arUploadFile.name}</span>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setArUploadFile(null); }}
                      className="ml-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                      title="Remove file"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <UploadCloud className="w-7 h-7 text-blue-400 mb-1" />
                    <span className="text-gray-500 dark:text-gray-300 font-medium text-sm">Click or drag & drop to select a file</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Accepted: PDF, DOC, DOCX, TXT</span>
                  </div>
                )}
                <input
                  id="ar-upload-input"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={e => setArUploadFile(e.target.files[0])}
                  className="hidden"
                />
              </div>
              <div className="flex w-full justify-end space-x-2 mt-1">
                <button
                  type="button"
                  onClick={() => { setArUploadFile(null); setArUploadStatus(""); setShowJDModal(false); }}
                  className="px-4 py-1.5 rounded-lg bg-gray-200 dark:bg-dark-700 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-300 dark:hover:bg-dark-600 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (arUploadFile) {
                      const fileURL = URL.createObjectURL(arUploadFile);
                      window.open(fileURL, '_blank');
                    }
                  }}
                  disabled={!arUploadFile}
                  className={`px-4 py-1.5 rounded-lg font-semibold transition text-sm ${arUploadFile ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-blue-100 dark:bg-dark-700 text-blue-300 dark:text-blue-400 cursor-not-allowed'}`}
                >
                  Preview
                </button>
                <button
                  type="button"
                  disabled={!arUploadFile}
                  className={`px-4 py-1.5 rounded-lg font-semibold transition text-sm ${arUploadFile ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-100 dark:bg-dark-700 text-indigo-300 dark:text-indigo-400 cursor-not-allowed'}`}
                  onClick={async () => {
                    if (!arUploadFile) {
                      setArUploadStatus("Please select a file to upload.");
                      return;
                    }
                    setArUploadStatus("Uploading...");
                    const formData = new FormData();
                    formData.append('file', arUploadFile);
                    try {
                      const res = await fetch('http://localhost:8000/api/jobs/job-descriptions/upload-ar', {
                        method: 'POST',
                        body: formData
                      });
                      const data = await res.json();
                      setArUploadStatus(data.message || "Upload successful!");
                      setArParsedInfo(data);
                      fetchJobDescriptions(); // Refresh job descriptions after upload
                      setShowJDModal(false);
                    } catch (err) {
                      setArUploadStatus("Upload failed.");
                    }
                  }}
                >
                  Upload
                </button>
              </div>
              {arUploadStatus && <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">{arUploadStatus}</div>}
            </form>
          </div>
        </div>
      )}

      {/* Show parsed info in a table after upload */}
      {arParsedInfo && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <h3 className="font-bold text-blue-800 dark:text-blue-200 mb-2">Parsed AR Requestor & Job Description</h3>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-600 bg-white dark:bg-dark-800 rounded shadow">
            <tbody>
              <tr>
                <td className="font-semibold text-blue-900 dark:text-blue-300 pr-4">AR Requestor</td>
                <td className="text-gray-900 dark:text-gray-200">{arParsedInfo.ar_requestor}</td>
              </tr>
              <tr>
                <td className="font-semibold text-blue-900 dark:text-blue-300 pr-4">Email</td>
                <td className="text-gray-900 dark:text-gray-200">{arParsedInfo.ar_email}</td>
              </tr>
              <tr>
                <td className="font-semibold text-blue-900 dark:text-blue-300 pr-4">Department</td>
                <td className="text-gray-900 dark:text-gray-200">{arParsedInfo.department}</td>
              </tr>
              <tr>
                <td className="font-semibold text-blue-900 dark:text-blue-300 pr-4">Job Title</td>
                <td className="text-gray-900 dark:text-gray-200">{arParsedInfo.job_title}</td>
              </tr>
              <tr>
                <td className="font-semibold text-blue-900 dark:text-blue-300 pr-4">Skills</td>
                <td className="text-gray-900 dark:text-gray-200">{arParsedInfo.skills && arParsedInfo.skills.length > 0 ? arParsedInfo.skills.join(', ') : 'N/A'}</td>
              </tr>
              <tr>
                <td className="font-semibold text-blue-900 dark:text-blue-300 pr-4">Experience Required</td>
                <td className="text-gray-900 dark:text-gray-200">{arParsedInfo.experience_required || 'N/A'} years</td>
              </tr>
              <tr>
                <td className="font-semibold text-blue-900 dark:text-blue-300 pr-4">Job Description</td>
                <td><span className="text-gray-700 dark:text-gray-300">{arParsedInfo.job_description}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Job Descriptions Table */}
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-600">
            <thead className="bg-gray-50 dark:bg-dark-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Job Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Experience Required
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Skills
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-dark-600">
              {jobDescriptions.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors duration-200">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-200">{job.job_title}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-900 dark:text-gray-200">{job.department}</td>
                  <td className="px-6 py-4 text-gray-900 dark:text-gray-200">{job.experience_required} years</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {job.skills.slice(0, 4).map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                        >
                          {skill}
                        </span>
                      ))}
                      {job.skills.length > 4 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">+{job.skills.length - 4} more</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      job.status === 'completed' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                      job.status === 'matching' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200' :
                      'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200'
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewJob(job)}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 p-1 rounded-full hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors duration-200"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors duration-200">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Job Details Modal */}
      {showModal && selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-dark-800 rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-200">{selectedJob.job_title}</h2>
                  <p className="text-gray-600 dark:text-gray-300">{selectedJob.department}</p>
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 dark:text-gray-200">Job Description</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{selectedJob.description}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 dark:text-gray-200">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.skills.map((skill, index) => (
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
                    <h4 className="font-semibold text-gray-900 dark:text-gray-200">Experience Required</h4>
                    <p className="text-gray-600 dark:text-gray-300">{selectedJob.experience_required} years</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-200">Status</h4>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      selectedJob.status === 'completed' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                      selectedJob.status === 'matching' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200' :
                      'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200'
                    }`}>
                      {selectedJob.status}
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

export default JobDescriptions;