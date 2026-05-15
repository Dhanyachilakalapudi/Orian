import React, { useEffect, useRef } from 'react';
import './ProgressSection.css';

const agentEmojis = {
  planner: '🧠',
  router: '🔀',
  webAgent: '🔍',
  fileAgent: '📁',
  codeAgent: '💻',
  critic: '✅',
  summarizer: '📝',
  system: '⚙️'
};

function ProgressSection({ messages }) {
  const feedRef = useRef(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="progress-section">
      <div className="progress-header">
        <div>
          <h2 className="progress-title">agent activity</h2>
          <p className="progress-codename">/ codename: hive /</p>
        </div>
        <div className="status-badge">
          <span className="status-dot"></span>
          processing
        </div>
      </div>
      <div className="agent-feed" ref={feedRef}>
        {messages.map((msg, index) => (
          <div key={index} className="agent-message">
            <div className="agent-name">
              {agentEmojis[msg.agent] || '🤖'} {msg.agent}
            </div>
            <div className="agent-text">{msg.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProgressSection;
