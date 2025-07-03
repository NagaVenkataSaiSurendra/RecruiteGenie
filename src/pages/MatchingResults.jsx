import React, { useEffect, useState } from 'react';
import { Download, Eye, Mail, TrendingUp } from 'lucide-react';

const safeArray = (arr) => Array.isArray(arr) ? arr : [];

const MatchingResults = () => {
  const [results, setResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailError, setEmailError] = useState(null);

  // Fetch grouped results as the single source of truth
  useEffect(() => {
    async function fetchResults() {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:8000/api/consultants/matching-results/grouped', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await res.json();
        setResults(safeArray(data));
      } catch (err) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, []);

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  // Export results to CSV
  const handleExport = () => {
    setExporting(true);
    try {
      const csvRows = [
        'Job Title,Department,Consultant Name,Score,Experience,Skills,LLM Reasoning,Email Sent',
        ...results.flatMap(result =>
          safeArray(result.top_matches).map(match =>
            [
              `"${result.job_title}"`,
              `"${result.department}"`,
              `"${match.consultant_name}"`,
              match.score,
              match.experience || '',
              `"${safeArray(match.skills).join('; ')}"`,
              `"${match.llm_reasoning || ''}"`,
              result.email_sent ? 'Yes' : 'No'
            ].join(',')
          )
        )
      ];
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'matching_results.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  // Send email for a job result
  const handleSendEmail = async (result) => {
    setSendingEmail(true);
    setEmailError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8000/api/consultants/send-matching-email/${result.job_description_id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error('Failed to send email');
      // Refresh results to update email_sent status
      const updated = results.map(r => r.job_description_id === result.job_description_id ? { ...r, email_sent: true } : r);
      setResults(updated);
      if (selectedResult && selectedResult.job_description_id === result.job_description_id) {
        setSelectedResult({ ...selectedResult, email_sent: true });
      }
    } catch (err) {
      setEmailError('Failed to send email. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  // Summary counts
  const allMatches = results.flatMap(r => safeArray(r.top_matches));
  const totalMatches = allMatches.length;
  const highMatches = allMatches.filter(m => m.score >= 80).length;
  const mediumMatches = allMatches.filter(m => m.score >= 60 && m.score < 80).length;
  const lowMatches = allMatches.filter(m => m.score < 60).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Matching Results</h1>
          <p className="mt-2 text-gray-600">View and analyze job-consultant matching results</p>
        </div>
        <button
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
          onClick={handleExport}
          disabled={exporting || loading || results.length === 0}
        >
          <Download className="w-5 h-5 mr-2" />
          {exporting ? 'Exporting...' : 'Export Results'}
        </button>
      </div>

      {/* Results Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Matches</p>
              <p className="text-2xl font-bold text-gray-900">{totalMatches}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">High Matches (80%+)</p>
              <p className="text-2xl font-bold text-green-600">{highMatches}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Medium Matches (60-79%)</p>
              <p className="text-2xl font-bold text-yellow-600">{mediumMatches}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Matches (&lt;60%)</p>
              <p className="text-2xl font-bold text-red-600">{lowMatches}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Matching Results Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recent Matching Results</h2>
        </div>
        {loading ? (
          <div className="py-8 text-center text-gray-500">Loading matching results...</div>
        ) : results.length === 0 ? (
          <div className="py-8 text-center text-gray-500">No matching results found. Please upload consultant profiles or job descriptions to see matches.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Top 3 Matches</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Best Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((result) => (
                  <tr key={result.job_description_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{result.job_title}</div>
                      <div className="text-sm text-gray-600">{result.department}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {safeArray(result.top_matches).slice(0, 3).map((match, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm text-gray-900">{match.consultant_name}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(match.score)}`}>{match.score}%</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(result.top_matches?.[0]?.score || 0)}`}>{result.top_matches?.[0]?.score || 0}%</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${result.email_sent ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{result.email_sent ? 'Email Sent' : 'Pending'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => { setSelectedResult(result); setShowModal(true); setEmailError(null); }}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSendEmail(result)}
                          className="text-green-600 hover:text-green-900 p-1 rounded-full hover:bg-green-50 disabled:opacity-50"
                          disabled={result.email_sent || sendingEmail}
                          title={result.email_sent ? 'Email already sent' : 'Send Email'}
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Result Details Modal */}
      {showModal && selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto shadow-2xl border-2 border-blue-200">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedResult.job_title}</h2>
                  <p className="text-gray-600">{selectedResult.department}</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Consultant Matches</h3>
                  <div className="space-y-4">
                    {safeArray(selectedResult.top_matches).map((match, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="text-lg font-medium text-gray-900">{match.consultant_name}</h4>
                            <p className="text-sm text-gray-600">{match.experience} years experience</p>
                          </div>
                          <div className="text-right">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(match.score)}`}>{match.score}% Match</span>
                            <div className="text-xs text-gray-500 mt-1">Rank #{index + 1}</div>
                          </div>
                        </div>
                        <div className="mb-3">
                          <h5 className="text-sm font-medium text-gray-900 mb-1">Matching Skills</h5>
                          <div className="flex flex-wrap gap-1">
                            {safeArray(match.matching_skills).map((skill, skillIndex) => (
                              <span key={skillIndex} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">{skill}</span>
                            ))}
                          </div>
                        </div>
                        {match.missing_skills && match.missing_skills.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 mb-1">Skills Gap</h5>
                            <div className="flex flex-wrap gap-1">
                              {match.missing_skills.map((skill, skillIndex) => (
                                <span key={skillIndex} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">{skill}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">Analysis Date</h4>
                    <p className="text-gray-600">{selectedResult.created_at ? new Date(selectedResult.created_at).toLocaleDateString() : '-'}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Email Status</h4>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${selectedResult.email_sent ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{selectedResult.email_sent ? 'Sent' : 'Pending'}</span>
                  </div>
                </div>
                {emailError && <div className="text-red-600 text-sm mt-2">{emailError}</div>}
              </div>
              <div className="mt-8 flex justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => handleSendEmail(selectedResult)}
                  className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  disabled={selectedResult.email_sent || sendingEmail}
                >
                  {sendingEmail ? 'Sending...' : selectedResult.email_sent ? 'Email Sent' : 'Send Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchingResults;