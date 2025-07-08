import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import "./Chatbot.css";

const SUGGESTED_QUESTIONS = [
  "Show me top consultant matches for the latest job.",
  "What skills are most in demand?",
  "List consultants with the most experience.",
  "What is the status of my recent job posting?",
  "How do I shortlist candidates?"
];

const botAvatar = "https://media.istockphoto.com/id/1333838449/vector/chatbot-icon-support-bot-cute-smiling-robot-with-headset-the-symbol-of-an-instant-response.jpg?s=612x612&w=0&k=20&c=sJ_uGp9wJ5SRsFYKPwb-dWQqkskfs7Fz5vCs2w5w950=";

const Chatbot = () => {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const initialMessages = [];
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [hasChatted, setHasChatted] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (msg) => {
    if (!msg.trim()) return;
    setMessages((prev) => [...prev, { sender: "user", text: msg }]);
    setHasChatted(true);
    setLoading(true);
    setInput("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: messages })
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { sender: "bot", text: data.response }]);
    } catch (e) {
      setMessages((prev) => [...prev, { sender: "bot", text: "Sorry, I couldn't connect to the server." }]);
    }
    setLoading(false);
  };

  const handleInput = (e) => setInput(e.target.value);
  const handleSend = (e) => {
    e.preventDefault();
    sendMessage(input);
  };
  const handleSuggested = (q) => {
    setHasChatted(true);
    sendMessage(q);
  };
  const toggleChat = () => {
    if (isOpen) {
      // Reset state when closing
      setMessages(initialMessages);
      setInput("");
      setHasChatted(false);
    }
    setIsOpen(!isOpen);
  };

  // Don't render anything if user is not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="chatbot-wrapper">
      {/* Bot Icon */}
      <div className="chatbot-icon" onClick={toggleChat} title="Open AI Chatbot">
        <img src={botAvatar} alt="AI Bot" className="chatbot-bot-img" />
      </div>

      {/* Chat Container */}
      {isOpen && (
        <div className="chatbot-container">
          <div className="chatbot-header">
            <span>Recruitment AI Assistant</span>
            <button className="chatbot-close" onClick={toggleChat}>×</button>
          </div>
          <div className="chatbot-messages">
            {/* No initial welcome message, just show messages if any */}
            {messages.map((m, i) => (
              <div key={i} className={`chatbot-message chatbot-message-${m.sender}`}>{m.sender === 'bot' && (
                <img src={botAvatar} alt="Bot" className="chatbot-message-avatar" />
              )}<span>{m.text}</span></div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          {/* Only show suggested questions if user hasn't chatted yet */}
          {!hasChatted && (
            <div className="chatbot-suggested">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button key={i} onClick={() => handleSuggested(q)} className="chatbot-suggested-btn">{q}</button>
              ))}
            </div>
          )}
          <form className="chatbot-input-row" onSubmit={handleSend}>
            <input
              className="chatbot-input"
              type="text"
              value={input}
              onChange={handleInput}
              placeholder="Type your question..."
              disabled={loading}
            />
            <button className="chatbot-send-btn" type="submit" disabled={loading || !input.trim()}>
              {loading ? "..." : "Send"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Chatbot; 