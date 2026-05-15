import React, { useState, useEffect } from 'react';
import './App.css';
import InputSection from './components/InputSection';
import ProgressSection from './components/ProgressSection';
import ResultSection from './components/ResultSection';

function App() {
  const [showApp, setShowApp] = useState(false);
  const [view, setView] = useState('input');
  const [agentMessages, setAgentMessages] = useState([]);
  const [finalResult, setFinalResult] = useState('');

  useEffect(() => {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    let ticking = false;

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
          } else {
            navbar.classList.remove('scrolled');
          }
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleGetStarted = () => {
    setShowApp(true);
  };

  const handleSubmitGoal = async (goal) => {
    setAgentMessages([
      { agent: 'planner', message: 'breaking goal into subtasks...' },
      { agent: 'router', message: 'routing tasks to specialist agents...' },
      { agent: 'webAgent', message: 'searching the internet...' },
      { agent: 'critic', message: 'reviewing output quality...' },
      { agent: 'summarizer', message: 'compiling final report...' },
      { agent: 'system', message: 'task completed successfully!' }
    ]);
    setView('progress');
    
    setTimeout(() => {
      setFinalResult('demo result: your multi-agent system has successfully processed the goal. in production, this would connect to groq llm, tavily search api, and execute real agent workflows.');
      setView('result');
    }, 5000);
  };

  const handleNewGoal = () => {
    setView('input');
    setAgentMessages([]);
    setFinalResult('');
  };

  if (showApp) {
    return (
      <div className="app">
        <div className="container">
        <div className="header-wrapper">
          <nav className="navbar" id="navbar">
            <div className="logo">
              <span className="logo-symbol">✳</span>
              <h1>orian</h1>
            </div>
            <div className="nav-links">
              <a href="#features">features</a>
              <a href="#about">about</a>
              <a href="#docs">docs</a>
            </div>
          </nav>
          <button className="nav-cta-external" onClick={() => setShowApp(false)}>
            back to home <span>→</span>
          </button>
        </div>

          <main style={{ padding: '3rem', flex: 1 }}>
            {view === 'input' && <InputSection onSubmit={handleSubmitGoal} />}
            {view === 'progress' && <ProgressSection messages={agentMessages} />}
            {view === 'result' && <ResultSection result={finalResult} onNewGoal={handleNewGoal} />}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="container">
        <div className="header-wrapper">
          <nav className="navbar" id="navbar">
            <div className="logo">
              <span className="logo-symbol">✳</span>
              <h1>orian</h1>
            </div>
            <div className="nav-links">
              <a href="#features">features</a>
              <a href="#about">about</a>
              <a href="#docs">docs</a>
            </div>
          </nav>
          <button className="nav-cta-external" onClick={handleGetStarted}>
            get started <span>↗</span>
          </button>
        </div>

        <section className="hero">
          <h1 className="hero-title">goal-driven multi-agent ai platform</h1>
          <p className="hero-subtitle">just tell us what you want. we'll make it happen.</p>
          <p className="hero-codename">/ codename: cortex /</p>
          <button className="hero-cta" onClick={handleGetStarted}>
            start building <span>↗</span>
          </button>
        </section>

        <section className="features" id="features">
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-number">1.</div>
              <h3 className="feature-title">planner</h3>
              <p className="feature-codename">/ codename: architect /</p>
              <p className="feature-description">breaks down complex goals into actionable subtasks using advanced llm reasoning</p>
            </div>

            <div className="feature-card">
              <div className="feature-number">2.</div>
              <h3 className="feature-title">router</h3>
              <p className="feature-codename">/ codename: dispatcher /</p>
              <p className="feature-description">intelligently assigns each subtask to the right specialist agent for optimal execution</p>
            </div>

            <div className="feature-card">
              <div className="feature-number">3.</div>
              <h3 className="feature-title">web agent</h3>
              <p className="feature-codename">/ codename: scout /</p>
              <p className="feature-description">searches the internet using tavily api to gather real-time information</p>
            </div>

            <div className="feature-card">
              <div className="feature-number">4.</div>
              <h3 className="feature-title">file agent</h3>
              <p className="feature-codename">/ codename: scribe /</p>
              <p className="feature-description">handles document creation, file operations, and data persistence</p>
            </div>

            <div className="feature-card">
              <div className="feature-number">5.</div>
              <h3 className="feature-title">code agent</h3>
              <p className="feature-codename">/ codename: forge /</p>
              <p className="feature-description">generates and executes code to solve computational tasks</p>
            </div>

            <div className="feature-card">
              <div className="feature-number">6.</div>
              <h3 className="feature-title">critic</h3>
              <p className="feature-codename">/ codename: sentinel /</p>
              <p className="feature-description">reviews output quality and requests retries when needed for autonomous excellence</p>
            </div>
          </div>
        </section>

        <section className="about" id="about">
          <h2 className="section-title">about orian</h2>
          <p className="section-text">orian is a goal-driven multi-agent ai platform that transforms natural language goals into executed results. by orchestrating specialized agents, we handle everything from research to code generation autonomously.</p>
        </section>

        <section className="docs" id="docs">
          <h2 className="section-title">documentation</h2>
          <p className="section-text">learn how to integrate orian into your workflow. our agents work together to break down complex tasks, gather information, and deliver results without manual intervention.</p>
        </section>

        <footer className="footer">
          <h3 className="footer-heading">join the autonomous revolution</h3>
          <p className="footer-text">powered by groq, tavily & multi-agent intelligence</p>
          <button className="footer-cta" onClick={handleGetStarted}>
            try it now <span>↗</span>
          </button>
          <p className="footer-links">built with react · socket.io · bullmq</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
