import React, { useEffect } from 'react';
import { FaMedal, FaStar, FaTools } from 'react-icons/fa';
import { X } from 'lucide-react';

// Badges
const getBadges = (result, idx) => {
  const badges = [];
  if (idx === 0) {
    badges.push(<span key="top" title="Top Scorer" className="inline-flex items-center mr-1"><FaMedal className="text-yellow-400 text-lg" /></span>);
  }
  if (result.experience >= 7) {
    badges.push(<span key="exp" title="Highly Experienced" className="inline-flex items-center mr-1"><FaStar className="text-indigo-400 text-base" /></span>);
  }
  if (Array.isArray(result.skills) && result.skills.length >= 6) {
    badges.push(<span key="skills" title="Diverse Skills" className="inline-flex items-center mr-1"><FaTools className="text-green-400 text-base" /></span>);
  }
  return badges;
};

const LLMResultsCard = ({ llmResults = [], isOpen = true, onClose = () => {} }) => {
  // ESC to close
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="relative w-full max-w-5xl mx-2 p-0">
        {/* Close Icon Button */}
        <button
          className="absolute top-5 right-6 z-10 bg-white/80 hover:bg-red-100 border border-gray-200 shadow-lg rounded-full w-11 h-11 flex items-center justify-center transition-all duration-200 focus:outline-none"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="w-7 h-7 text-indigo-700 hover:text-red-500 transition" />
        </button>
        <div className="rounded-3xl shadow-2xl border border-indigo-100 bg-white/70 backdrop-blur-lg p-6 md:p-10 flex flex-col items-center">
          <h2 className="text-3xl font-extrabold text-indigo-700 mb-6 text-center tracking-tight drop-shadow-lg">Top LLM Matches</h2>

          {llmResults.length === 0 ? (
            <div className="text-gray-500 text-center">No matches found.</div>
          ) : (
            <div className="w-full flex flex-col gap-6">
              {llmResults.map((result, idx) => (
                <div
                  key={result.id || result.email || idx}
                  className={`relative flex flex-col md:flex-row items-stretch bg-white/80 rounded-2xl shadow-xl border transition-all duration-200 ${idx === 0 ? 'border-yellow-300 bg-yellow-50/80' : 'border-indigo-100 hover:shadow-2xl hover:scale-[1.01]'} overflow-hidden`}
                >
                  {/* Score */}
                  <div className={`flex flex-row md:flex-col items-center justify-center md:w-24 w-full md:min-w-[72px] md:max-w-[90px] bg-gradient-to-b ${idx === 0 ? 'from-yellow-400/90 to-yellow-200/80' : 'from-indigo-400/80 to-indigo-200/60'} px-4 py-2 md:py-6`}>
                    <span className={`font-extrabold text-3xl md:text-4xl ${idx === 0 ? 'text-yellow-900' : 'text-indigo-900'} drop-shadow`}>
                      {result.score ?? result.llm_score ?? <span className="text-gray-400 italic">NA</span>}
                    </span>
                    <span className="text-xs text-gray-700 font-semibold mt-1 md:mt-2">Score</span>
                  </div>

                  {/* Details */}
                  <div className="flex-1 flex flex-col md:flex-row gap-2 md:gap-6 p-4 md:p-6">
                    <div className="flex-1 flex flex-col gap-2 min-w-[180px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-lg md:text-xl text-indigo-900">
                          {result.name || result.consultant_name || result.candidate_name || <span className="text-gray-400 italic">NA</span>}
                        </span>
                        <span className="text-indigo-800 font-medium text-base ml-2">
                          {result.experience !== undefined ? `${result.experience} yrs` : <span className="text-gray-400 italic">NA</span>}
                        </span>
                        <span>{getBadges(result, idx)}</span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(result.skills) ? (
                          result.skills.map((skill, i) => (
                            <span key={i} className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium shadow-sm border border-indigo-200">{skill}</span>
                          ))
                        ) : (
                          <span className="text-gray-400 italic">NA</span>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 flex items-center">
                      <div className="w-full bg-indigo-50/80 border border-indigo-100 rounded-xl px-4 py-3 text-indigo-900 text-sm shadow-inner whitespace-pre-line break-words">
                        {result.llm_reasoning || <span className="text-gray-400 italic">NA</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LLMResultsCard;
