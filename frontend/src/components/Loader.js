import React from 'react';
import './Loader.css';

const steps = ['planning', 'routing', 'executing', 'reviewing', 'compiling'];

function Loader({ currentStep = 0 }) {
  return (
    <div className="loader-layout">
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
    </div>
  );
}

export default Loader;
