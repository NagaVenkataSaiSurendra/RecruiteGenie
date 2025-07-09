import React, { useState } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle } from 'lucide-react';

const JDUploadModal = ({ isOpen, onClose, onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [parsedInfo, setParsedInfo] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setUploadStatus('');
    setParsedInfo(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setUploadStatus('Uploading...');
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/jobs/job-descriptions/upload-ar', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setUploadStatus('Upload successful!');
        setParsedInfo(data);
        if (onUploadSuccess) {
          onUploadSuccess(data);
        }
      } else {
        setUploadStatus(data.message || 'Upload failed.');
      }
    } catch (err) {
      setUploadStatus('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setUploadStatus('');
    setParsedInfo(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-700">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200">
              Upload Job Description
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* File Upload Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Job Description File
              </label>
              <div className="border-2 border-dashed border-gray-300 dark:border-dark-600 rounded-lg p-6 text-center hover:border-primary-400 dark:hover:border-primary-500 transition-colors duration-200">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500">
                      Click to upload
                    </span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    PDF, DOC, DOCX, or TXT files only
                  </p>
                </label>
              </div>
            </div>

            {file && (
              <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-200">{file.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Status */}
            {uploadStatus && (
              <div className={`flex items-center space-x-2 p-3 rounded-lg ${
                uploadStatus.includes('successful') 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                  : uploadStatus.includes('Uploading')
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
              }`}>
                {uploadStatus.includes('successful') ? (
                  <CheckCircle className="w-5 h-5" />
                ) : uploadStatus.includes('Uploading') ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">{uploadStatus}</span>
              </div>
            )}
          </div>

          {/* Parsed Information */}
          {parsedInfo && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">
                Parsed Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-800 dark:text-blue-300">AR Requestor:</span>
                  <p className="text-blue-700 dark:text-blue-400">{parsedInfo.ar_requestor}</p>
                </div>
                <div>
                  <span className="font-medium text-blue-800 dark:text-blue-300">Email:</span>
                  <p className="text-blue-700 dark:text-blue-400">{parsedInfo.ar_email}</p>
                </div>
                <div>
                  <span className="font-medium text-blue-800 dark:text-blue-300">Department:</span>
                  <p className="text-blue-700 dark:text-blue-400">{parsedInfo.department}</p>
                </div>
                <div>
                  <span className="font-medium text-blue-800 dark:text-blue-300">Job Title:</span>
                  <p className="text-blue-700 dark:text-blue-400">{parsedInfo.job_title}</p>
                </div>
                <div>
                  <span className="font-medium text-blue-800 dark:text-blue-300">Experience Required:</span>
                  <p className="text-blue-700 dark:text-blue-400">{parsedInfo.experience_required || 'N/A'} years</p>
                </div>
                <div>
                  <span className="font-medium text-blue-800 dark:text-blue-300">Skills:</span>
                  <p className="text-blue-700 dark:text-blue-400">
                    {parsedInfo.skills && parsedInfo.skills.length > 0 
                      ? parsedInfo.skills.join(', ') 
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-dark-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200 flex items-center"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Uploading...
              </>
            ) : (
              'Upload'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JDUploadModal; 