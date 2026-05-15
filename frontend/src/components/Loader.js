import React, { useEffect, useRef } from 'react';
import './Loader.css';

const steps = ['planning', 'routing', 'executing', 'reviewing', 'compiling'];

const AgentIcons = {
  planner: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>,
  router: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  webAgent: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  critic: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  summarizer: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  system: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>,
};

function Loader({ currentStep = 0, messages = [], onStop }) {
  const feedRef = useRef(null);
  const activeAgent = messages[messages.length - 1]?.agent ?? null;

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages]);

  return (
    <div className="loader-layout">
      <div className="loader-left">
        <div className="loader-orb">
          <div className="loader-core" />
          <div className="loader-ring ring-1" />
          <div className="loader-ring ring-2" />
          <div className="loader-ring ring-3" />
          <div className="loader-particle p1" />
          <div className="loader-particle p2" />
          <div className="loader-particle p3" />
        </div>
        <p className="loader-step">{steps[currentStep] ?? 'processing'}...</p>
        {onStop && (
          <button className="loader-stop-btn" onClick={onStop}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
            stop
          </button>
        )}
      </div>
      <div className="loader-feed" ref={feedRef}>
        <div className="loader-feed-header">
          <span className="loader-feed-title">agent activity</span>
          <span className="loader-feed-badge"><span className="loader-feed-dot" />live</span>
        </div>
        <div className="loader-feed-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`loader-feed-message ${i === messages.length - 1 ? 'active' : 'done'}`}>
              <span className="loader-feed-agent">
                <span className="loader-feed-icon">{AgentIcons[msg.agent] ?? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>}</span>
                {msg.agent}
                {i === messages.length - 1 && <span className="loader-feed-working">working...</span>}
                {i < messages.length - 1 && <span className="loader-feed-done-tag">done</span>}
              </span>
              <span className="loader-feed-text">{msg.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Loader;
