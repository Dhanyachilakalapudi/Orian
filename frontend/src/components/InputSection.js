import React, { useState } from 'react';
import './InputSection.css';

function InputSection({ onSubmit }) {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!goal.trim()) return;
    setLoading(true);
    await onSubmit(goal);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="chat-layout">
      <div className="chat-body">
        <h2 className="chat-title">what would you like me to do?</h2>
        <p className="chat-codename">/ codename: genesis /</p>
      </div>
      <div className="chat-input-bar">
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., find the top 10 ai startups in india and create a summary report"
          rows="1"
          disabled={loading}
        />
        <button onClick={handleSubmit} disabled={loading || !goal.trim()} className="send-btn">
          {loading ? '...' : '↗'}
        </button>
      </div>
    </div>
  );
}

export default InputSection;
