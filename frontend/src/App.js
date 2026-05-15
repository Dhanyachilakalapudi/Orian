import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css';
import InputSection from './components/InputSection';
import ProgressSection from './components/ProgressSection';
import ResultSection from './components/ResultSection';

const socket = io('http://localhost:3000');

function App() {
  const [view, setView] = useState('input');
  const [taskId, setTaskId] = useState(null);
  const [agentMessages, setAgentMessages] = useState([]);
  const [finalResult, setFinalResult] = useState('');

  useEffect(() => {
    socket.on('progress', (data) => {
      setAgentMessages(prev => [...prev, data]);
    });

    socket.on('completed', (data) => {
      setFinalResult(data.result);
      setView('result');
    });

    return () => {
      socket.off('progress');
      socket.off('completed');
    };
  }, []);

  const handleSubmitGoal = async (goal) => {
    try {
      const response = await fetch('/api/goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal })
      });

      const data = await response.json();
      setTaskId(data.taskId);
      socket.emit('subscribe', data.taskId);
      setAgentMessages([]);
      setView('progress');
    } catch (error) {
      alert('Failed to submit goal: ' + error.message);
    }
  };

  const handleNewGoal = () => {
    setView('input');
    setTaskId(null);
    setAgentMessages([]);
    setFinalResult('');
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <div className="logo">
            <span className="logo-symbol">✳</span>
            <h1>orian</h1>
          </div>
          <p className="tagline">/ codename: cortex / goal-driven multi-agent ai</p>
        </header>

        <main className="main-content">
          {view === 'input' && <InputSection onSubmit={handleSubmitGoal} />}
          {view === 'progress' && <ProgressSection messages={agentMessages} />}
          {view === 'result' && <ResultSection result={finalResult} onNewGoal={handleNewGoal} />}
        </main>

        <footer className="footer">
          <h3 className="footer-heading">join the autonomous revolution</h3>
          <p className="footer-text">powered by groq, tavily & multi-agent intelligence</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
