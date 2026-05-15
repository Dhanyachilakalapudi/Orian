import React, { useState, useRef, useEffect } from 'react';
import './GoalForm.css';

function GoalForm({ onSubmit }) {
  const [goal, setGoal] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleSubmit = () => {
    if (!goal.trim()) return;
    onSubmit(goal);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="goalform-layout">
      <div className="goalform-body">
        <h2 className="goalform-title">what would you like me to do?</h2>
        <p className="goalform-codename">/ codename: genesis /</p>
      </div>
      <div className="goalform-bar-wrapper">
        <div className="goalform-bar">
          <textarea
            ref={textareaRef}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., find the top 10 ai startups in india and create a summary report"
            rows="1"
          />
          <button onClick={handleSubmit} disabled={!goal.trim()} className="goalform-send-btn">
            ↗
          </button>
        </div>
      </div>
    </div>
  );
}

export default GoalForm;
