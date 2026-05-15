import React, { useState, useEffect } from 'react';
import './App.css';
import Lenis from 'lenis';
import GoalForm from './components/GoalForm';
import LiveFeed from './components/LiveFeed';
import ResultSection from './components/ResultSection';
import Loader from './components/Loader';
import TaskHistory from './components/TaskHistory';
import DotsBackground from './components/DotsBackground';
import Toast from './components/Toast';

const LogoIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="round">
    <line x1="12" y1="2" x2="12" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
  </svg>
);

function App() {
  const [showApp, setShowApp] = useState(false);
  const [view, setView] = useState('input');
  const [agentMessages, setAgentMessages] = useState([]);
  const [finalResult, setFinalResult] = useState('');
  const [loaderStep, setLoaderStep] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (showApp) return;
    const lenis = new Lenis({ duration: 1.2, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
    return () => { lenis.destroy(); observer.disconnect(); };
  }, [showApp]);

  useEffect(() => {
    const handle = document.getElementById('resize-handle');
    const sidebar = document.getElementById('sidebar');
    if (!handle || !sidebar) return;
    let dragging = false;
    const onMouseDown = () => { dragging = true; document.body.style.cursor = 'col-resize'; };
    const onMouseMove = (e) => {
      if (!dragging) return;
      const newWidth = Math.min(Math.max(e.clientX, 160), 480);
      sidebar.style.width = newWidth + 'px';
    };
    const onMouseUp = () => { dragging = false; document.body.style.cursor = ''; };
    handle.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      handle.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [showApp]);

  useEffect(() => {
    const navbar = document.getElementById('navbar');
    const header = document.getElementById('header-wrapper');
    if (!navbar || !header) return;
    let ticking = false;
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (!showApp && window.scrollY > 50) {
            navbar.classList.add('scrolled');
            header.classList.add('floating');
          } else {
            navbar.classList.remove('scrolled');
            header.classList.remove('floating');
          }
          ticking = false;
        });
        ticking = true;
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [showApp]);

  const handleGetStarted = () => setShowApp(true);

  const handleSubmitGoal = async (goal) => {
    const newTask = { id: Date.now(), goal, status: 'processing', time: new Date().toLocaleTimeString() };
    setTasks(prev => [newTask, ...prev]);
    setAgentMessages([]);
    setLoaderStep(0);
    setView('loader');

    const steps = [
      { agent: 'planner', message: 'breaking goal into subtasks...' },
      { agent: 'router', message: 'routing tasks to specialist agents...' },
      { agent: 'webAgent', message: 'searching the internet...' },
      { agent: 'critic', message: 'reviewing output quality...' },
      { agent: 'summarizer', message: 'compiling final report...' },
      { agent: 'system', message: 'task completed successfully!' }
    ];

    steps.forEach((step, i) => {
      setTimeout(() => {
        setLoaderStep(i);
        setAgentMessages(prev => [...prev, step]);
        if (i === steps.length - 1) {
          setTasks(prev => prev.map(t => t.id === newTask.id ? { ...t, status: 'completed' } : t));
          setToast('task completed successfully!');
          setTimeout(() => {
            setFinalResult('demo result: your multi-agent system has successfully processed the goal. in production, this would connect to groq llm, tavily search api, and execute real agent workflows.');
            setTasks(prev => prev.map(t => t.id === newTask.id ? { ...t, result: 'demo result: your multi-agent system has successfully processed the goal. in production, this would connect to groq llm, tavily search api, and execute real agent workflows.' } : t));
            setView('result');
          }, 800);
        }
      }, i * 900);
    });
  };

  const handleSelectTask = (task) => {
    if (task.result) {
      setFinalResult(task.result);
      setView('result');
    }
  };

  const handleNewGoal = () => {
    setView('input');
    setAgentMessages([]);
    setFinalResult('');
    setLoaderStep(0);
  };

  if (showApp) {
    return (
      <div className="app">
        <DotsBackground />
        <div className="app-layout">
          <aside className="sidebar" id="sidebar">
            <div className="sidebar-logo">
              <LogoIcon />
              <h1>orian</h1>
            </div>
            <TaskHistory tasks={tasks} onSelect={handleSelectTask} onNewGoal={handleNewGoal} />
          </aside>
          <div className="resize-handle" id="resize-handle">
            <div className="resize-dots">
              <span /><span /><span />
            </div>
          </div>
          <main className="app-main">
            <button className="hamburger-btn" onClick={() => setDrawerOpen(o => !o)}>
              <span /><span /><span />
            </button>
            {view === 'input' && <GoalForm onSubmit={handleSubmitGoal} />}
            {view === 'loader' && <Loader currentStep={loaderStep} />}
            {view === 'result' && <ResultSection result={finalResult} onNewGoal={handleNewGoal} />}
          </main>
        </div>
        {drawerOpen && (
          <div className="drawer-overlay" onClick={() => setDrawerOpen(false)}>
            <div className="drawer" onClick={e => e.stopPropagation()}>
              <div className="drawer-header">
                <div className="sidebar-logo">
                  <LogoIcon />
                  <h1>orian</h1>
                </div>
                <button className="drawer-close" onClick={() => setDrawerOpen(false)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <TaskHistory tasks={tasks} onSelect={handleSelectTask} onNewGoal={handleNewGoal} />
            </div>
          </div>
        )}
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </div>
    );
  }

  return (
    <div className="app">
      <DotsBackground />
      <div className="container">
        <div className="header-wrapper" id="header-wrapper">
          <nav className="navbar" id="navbar">
            <div className="logo">
              <LogoIcon />
              <h1>orian</h1>
            </div>
            <div className="nav-links">
              <a href="#features">features</a>
              <a href="#about">about</a>
              <a href="#docs" style={{ marginRight: '1.5rem' }}>docs</a>
            </div>
          </nav>
          <button className="nav-cta-external" onClick={handleGetStarted}>
            get started <span>↗</span>
          </button>
        </div>

        <section className="hero animate-on-scroll">
          <h1 className="hero-title">multi-agent autonomy that ships real work, end-to-end.</h1>
          <p className="hero-subtitle">just tell us what you want. we'll make it happen.</p>
          <p className="hero-codename">/ codename: cortex /</p>
          <button className="hero-cta" onClick={handleGetStarted}>
            start building <span>↗</span>
          </button>
        </section>

        <section className="features animate-on-scroll" id="features">
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

        <section className="about animate-on-scroll" id="about">
          <div className="about-grid">
            <div className="about-left">
              <h2 className="section-title">about orian</h2>
              <p className="section-text">orian is a goal-driven multi-agent ai platform that transforms natural language goals into executed results.</p>
            </div>
            <div className="about-right">
              <div className="about-stat">
                <span className="about-stat-number">6</span>
                <span className="about-stat-label">specialist agents</span>
              </div>
              <div className="about-stat">
                <span className="about-stat-number">∞</span>
                <span className="about-stat-label">possible goals</span>
              </div>
              <div className="about-stat">
                <span className="about-stat-number">0</span>
                <span className="about-stat-label">manual steps</span>
              </div>
            </div>
          </div>
          <div className="about-pills">
            <span className="about-pill">groq llm</span>
            <span className="about-pill">tavily search</span>
            <span className="about-pill">bullmq</span>
            <span className="about-pill">socket.io</span>
            <span className="about-pill">react</span>
            <span className="about-pill">autonomous execution</span>
          </div>
        </section>

        <section className="docs animate-on-scroll" id="docs">
          <h2 className="section-title">documentation</h2>
          <p className="section-text" style={{ marginBottom: '3rem' }}>everything you need to build with orian.</p>
          <div className="docs-grid">
            <div className="doc-card">
              <div className="doc-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h3 className="doc-card-title">quick start</h3>
              <p className="doc-card-text">get up and running with orian in under 5 minutes. set up your api keys and run your first goal.</p>
            </div>
            <div className="doc-card">
              <div className="doc-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
                </svg>
              </div>
              <h3 className="doc-card-title">agent api</h3>
              <p className="doc-card-text">full reference for the planner, router, and specialist agent apis. configure and extend each agent.</p>
            </div>
            <div className="doc-card">
              <div className="doc-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                </svg>
              </div>
              <h3 className="doc-card-title">integrations</h3>
              <p className="doc-card-text">connect groq, tavily, and custom tools. build pipelines that interact with external services.</p>
            </div>
            <div className="doc-card">
              <div className="doc-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <h3 className="doc-card-title">examples</h3>
              <p className="doc-card-text">real-world goal examples — research reports, code generation, data analysis and more.</p>
            </div>
          </div>
        </section>

        <footer className="footer animate-on-scroll">
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
