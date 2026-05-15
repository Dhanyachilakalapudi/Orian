import React, { useState } from 'react';
import './InputSection.css';

function InputSection({ onSubmit }) {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!goal.trim()) {
      alert('please enter a goal');
      return;
    }

    setLoading(true);
    await onSubmit(goal);
  };

  return (
    <div className="input-section">
      <div className="input-wrapper">
        <div>
          <h2 className="input-label">what would you like me to do?</h2>
          <p className="input-codename">/ codename: genesis /</p>
        </div>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g., find the top 10 ai startups in india and create a summary report"
          rows="4"
          disabled={loading}
        />
        <button onClick={handleSubmit} disabled={loading} className="submit-btn">
          <span>{loading ? 'processing...' : 'execute goal'}</span>
          {!loading && <span className="arrow-icon">↗</span>}
        </button>
      </div>
    </div>
  );
}

export default InputSection;
