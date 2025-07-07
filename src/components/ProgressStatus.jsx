import React, { useEffect, useState } from 'react';
import ProgressBar from './ProgressBar';

const steps = [
  'JD comparison started',
  'JD compared ✅',
  'Profile ranking started',
  'Profiles ranked ✅',
  'Sending email to AR requestor...',
  'Email sent ✅',
  '✅ All steps completed'
];

function ProgressStatus({ jobId, jobDescriptionId, onDone }) {
  const [messages, setMessages] = useState([]);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    if (!jobId) return;
    setMessages([]);
    setPercent(0);
    const eventSource = new EventSource(`/api/consultants/status/${jobId}`);
    eventSource.onmessage = function (event) {
      const msg = event.data;
      setMessages((prev) => {
        const newMsgs = [...prev, msg];
        let completed = 0;
        for (let i = 0; i < steps.length; i++) {
          if (newMsgs.some(m => m.includes(steps[i]))) completed = i + 1;
        }
        setPercent(Math.round((completed / steps.length) * 100));
        return newMsgs;
      });
    };
    eventSource.onerror = function () {
      eventSource.close();
    };
    return () => {
      eventSource.close();
    };
  }, [jobId]);

  // Only call onDone after progress is 100%
  useEffect(() => {
    if (percent === 100 && jobDescriptionId && onDone) {
      onDone();
    }
  }, [percent, jobDescriptionId, onDone]);

  // Show progress/status card
  return (
    <div className="p-6 bg-white rounded-xl shadow-lg max-w-lg mx-auto">
      <h4 className="font-bold mb-2 text-lg text-indigo-700">Live Upload & Matching Status</h4>
      <ul className="mb-2 text-sm">
        {messages.map((msg, i) => (
          <li key={i}>{msg}</li>
        ))}
      </ul>
      <ProgressBar progress={percent} label="Progress" />
    </div>
  );
}

export default ProgressStatus; 