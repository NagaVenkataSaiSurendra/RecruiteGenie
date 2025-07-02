import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, XCircle } from 'lucide-react';

const ConsultantUploadModal = ({ isOpen, onClose, onUpload }) => {
  const [file, setFile] = useState(null);
  const fileInputRef = useRef();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (file) {
      setUploading(true);
      try {
        await onUpload(file);
        setFile(null);
        onClose();
      } catch (err) {
        alert('Upload failed: ' + err.message);
      } finally {
        setUploading(false);
      }
    }
  };

  const handlePreview = () => {
    if (file) {
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, '_blank');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full relative flex flex-col items-center">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-300 hover:text-gray-500 text-2xl focus:outline-none" disabled={uploading}>
          <XCircle className="w-7 h-7" />
        </button>
        <div className="flex flex-col items-center mb-4">
          <div className="bg-gradient-to-tr from-indigo-400 to-purple-400 p-3 rounded-full shadow-lg mb-2">
            <UploadCloud className="w-8 h-8 text-white" />
          </div>
          <div className="text-xl font-extrabold text-gray-900 mb-1">Upload Consultant Profile</div>
          <div className="text-sm text-gray-600 text-center max-w-xs">
            Select or drag & drop a consultant profile document (PDF or Word). This will be securely stored and used to update consultant records.
          </div>
        </div>
        <form onSubmit={handleUpload} className="w-full flex flex-col items-center space-y-4">
          <div
            className={`w-full border-2 ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-dashed border-gray-300 bg-gray-50'} rounded-xl flex flex-col items-center justify-center p-4 transition-all duration-200 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50`}
            onClick={() => fileInputRef.current.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{ minHeight: '80px' }}
          >
            {file ? (
              <div className="flex items-center space-x-2">
                <FileText className="w-6 h-6 text-indigo-500" />
                <span className="font-semibold text-indigo-700 text-base">{file.name}</span>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setFile(null); }}
                  className="ml-1 text-gray-400 hover:text-red-500"
                  title="Remove file"
                  disabled={uploading}
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <UploadCloud className="w-7 h-7 text-indigo-400 mb-1" />
                <span className="text-gray-500 font-medium text-sm">Click or drag & drop to select a file</span>
                <span className="text-xs text-gray-400 mt-0.5">Accepted: PDF, DOC, DOCX</span>
              </div>
            )}
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
              disabled={uploading}
            />
          </div>
          <div className="flex w-full justify-end space-x-2 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition text-sm"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePreview}
              disabled={!file || uploading}
              className={`px-4 py-1.5 rounded-lg font-semibold transition text-sm ${file && !uploading ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-blue-100 text-blue-300 cursor-not-allowed'}`}
            >
              Preview
            </button>
            <button
              type="submit"
              disabled={!file || uploading}
              className={`px-4 py-1.5 rounded-lg font-semibold transition text-sm ${file && !uploading ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-100 text-indigo-300 cursor-not-allowed'}`}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConsultantUploadModal; 