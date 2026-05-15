import React from 'react';
import './ResultSection.css';

function ResultSection({ result, onNewGoal }) {
  const handleDownload = () => {
    const blob = new Blob([result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orian-result-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="result-section">
      <div className="result-header">
        <div>
          <h2 className="result-title">final result</h2>
          <p className="result-codename">/ codename: synthesis /</p>
        </div>
        <button onClick={handleDownload} className="download-btn">
          download report <span>↗</span>
        </button>
      </div>
      <div className="result-content">{result}</div>
      <button onClick={onNewGoal} className="new-goal-btn">
        start new goal
      </button>
    </div>
  );
}

export default ResultSection;
