import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext.jsx';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
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
          <h1 className="text-3xl font-bold text-gray-900">Job Descriptions</h1>
          <p className="mt-2 text-gray-600">Manage and view all job descriptions</p>
        </div>
      </div>

      {/* AR Requestor Job Description Upload */}
      <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-6 mb-8">
        <h2 className="text-lg font-bold mb-2 text-blue-800">Upload Job Description (AR Requestor)</h2>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          onChange={e => setArUploadFile(e.target.files[0])}
          className="mb-2"
        />
        <button
          className="ml-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 transition"
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
            } catch (err) {
              setArUploadStatus("Upload failed.");
            }
          }}
        >
          Upload
        </button>
        {arUploadStatus && <div className="mt-2 text-sm text-blue-700">{arUploadStatus}</div>}
      </div>

      {/* Show parsed info in a table after upload */}
      {arParsedInfo && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-bold text-blue-800 mb-2">Parsed AR Requestor & Job Description</h3>
          <table className="min-w-full divide-y divide-gray-200 bg-white rounded shadow">
            <tbody>
              <tr>
                <td className="font-semibold text-blue-900 pr-4">AR Requestor</td>
                <td>{arParsedInfo.ar_requestor}</td>
              </tr>
              <tr>
                <td className="font-semibold text-blue-900 pr-4">Email</td>
                <td>{arParsedInfo.ar_email}</td>
              </tr>
              <tr>
                <td className="font-semibold text-blue-900 pr-4">Department</td>
                <td>{arParsedInfo.department}</td>
              </tr>
              <tr>
                <td className="font-semibold text-blue-900 pr-4">Job Title</td>
                <td>{arParsedInfo.job_title}</td>
              </tr>
              <tr>
                <td className="font-semibold text-blue-900 pr-4">Skills</td>
                <td>{arParsedInfo.skills && arParsedInfo.skills.length > 0 ? arParsedInfo.skills.join(', ') : 'N/A'}</td>
              </tr>
              <tr>
                <td className="font-semibold text-blue-900 pr-4">Experience Required</td>
                <td>{arParsedInfo.experience_required || 'N/A'} years</td>
              </tr>
              <tr>
                <td className="font-semibold text-blue-900 pr-4">Job Description</td>
                <td><span className="text-gray-700">{arParsedInfo.job_description}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Job Descriptions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
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
                  Experience Required
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Skills
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobDescriptions.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{job.job_title}</div>
                  </td>
                  <td className="px-6 py-4">{job.department}</td>
                  <td className="px-6 py-4">{job.experience_required} years</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {job.skills.slice(0, 4).map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {skill}
                        </span>
                      ))}
                      {job.skills.length > 4 && (
                        <span className="text-xs text-gray-500">+{job.skills.length - 4} more</span>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewJob(job)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900 p-1 rounded-full hover:bg-gray-50">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50">
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
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedJob.job_title}</h2>
                  <p className="text-gray-600">{selectedJob.department}</p>
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Description</h3>
                  <p className="text-gray-700 leading-relaxed">{selectedJob.description}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.skills.map((skill, index) => (
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
                    <h4 className="font-semibold text-gray-900">Experience Required</h4>
                    <p className="text-gray-600">{selectedJob.experience_required} years</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Status</h4>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      selectedJob.status === 'completed' ? 'bg-green-100 text-green-800' :
                      selectedJob.status === 'matching' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedJob.status}
                    </span>
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
                <button className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                  Start Matching
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