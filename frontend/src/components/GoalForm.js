import React, { useState, useRef, useEffect } from 'react';
import './GoalForm.css';

const CHIPS = [
  'research top ai startups in india',
  'write a market analysis on ev industry',
  'summarize the latest news on openai',
  'find top 5 open source llms in 2024',
  'create a competitor analysis for notion',
];

function GoalForm({ onSubmit }) {
  const [goal, setGoal] = useState('');
  const [mounted, setMounted] = useState(false);
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const handleChange = (e) => {
    setGoal(e.target.value);
    autoResize();
  };

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

  const handleChip = (chip) => {
    setGoal(chip);
    textareaRef.current?.focus();
    setTimeout(autoResize, 0);
  };

  return (
    <div className="goalform-layout">
      <div className={`goalform-body ${mounted ? 'visible' : ''}`}>
        <h2 className="goalform-title">what would you like me to do?</h2>
        <p className="goalform-codename">/ codename: genesis /</p>
      </div>
      <div className="goalform-bar-wrapper">
        <div className="goalform-chips">
          {CHIPS.map((chip) => (
            <button key={chip} className="goalform-chip" onClick={() => handleChip(chip)}>
              {chip}
            </button>
          ))}
        </div>
        <div className={`goalform-bar ${focused ? 'focused' : ''}`}>
          <textarea
            ref={textareaRef}
            value={goal}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="e.g., find the top 10 ai startups in india and create a summary report"
            rows="1"
          />
          <button onClick={handleSubmit} disabled={!goal.trim()} className={`goalform-send-btn ${goal.trim() ? 'has-text' : ''}`}>
            <span className="goalform-send-arrow">↗</span>
            <span className="goalform-send-label">run</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default GoalForm;
