import React, { useState, useMemo } from 'react';
import './ResultSection.css';

function buildLiveHtml(code, files) {
  const htmlFile = files.find(f => f.filename?.endsWith('.html') || f.format === 'html');
  if (htmlFile?.content) return htmlFile.content;

  const allCode = code.map(c => c.code || '').join('\n\n');
  const cssBlocks = [...allCode.matchAll(/```css\n([\s\S]*?)```/g)].map(m => m[1]).join('\n');
  const jsBlocks = [...allCode.matchAll(/```(?:js|javascript)\n([\s\S]*?)```/g)].map(m => m[1]).join('\n');
  const htmlBlocks = [...allCode.matchAll(/```(?:html)\n([\s\S]*?)```/g)].map(m => m[1]).join('\n');

  const rawJs = code.map(c => {
    const raw = c.code || '';
    if (!raw.includes('```')) return raw;
    return '';
  }).join('\n');

  if (!htmlBlocks && !jsBlocks && !rawJs && !cssBlocks) return null;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: sans-serif; margin: 0; padding: 16px; }
  ${cssBlocks}
</style>
</head>
<body>
${htmlBlocks}
<script>
${jsBlocks || rawJs}
</script>
</body>
</html>`;
}

function ResultSection({ result, onNewGoal }) {
  const report = typeof result === 'string' ? result : result?.report || '';
  const artifacts = typeof result === 'object' ? result?.artifacts : { code: [], files: [] };
  const code = artifacts?.code || [];
  const files = artifacts?.files || [];

  const liveHtml = useMemo(() => buildLiveHtml(code, files), [code, files]);
  const hasLive = !!liveHtml;
  const hasCode = code.length > 0;

  const [tab, setTab] = useState('report');

  const handleDownload = () => {
    const content = tab === 'live' && liveHtml ? liveHtml : report;
    const ext = tab === 'live' ? 'html' : 'md';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orian-result-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    const content = tab === 'live' && liveHtml ? liveHtml : report;
    navigator.clipboard.writeText(content);
  };

  return (
    <div className="result-layout">
      <div className="result-section">
        <div className="result-paperclip">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
        </div>
        <div className="result-header">
          <div className="result-header-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <div>
              <h2 className="result-title">final result</h2>
              <p className="result-codename">/ codename: synthesis /</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleCopy} className="download-btn">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              copy
            </button>
            <button onClick={handleDownload} className="download-btn">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              download
            </button>
          </div>
        </div>

        {(hasLive || hasCode) && (
          <div className="result-tabs">
            <button className={`result-tab ${tab === 'report' ? 'active' : ''}`} onClick={() => setTab('report')}>report</button>
            {hasCode && <button className={`result-tab ${tab === 'code' ? 'active' : ''}`} onClick={() => setTab('code')}>code</button>}
            {hasLive && <button className={`result-tab ${tab === 'live' ? 'active' : ''}`} onClick={() => setTab('live')}>
              <span className="live-dot" />live preview
            </button>}
          </div>
        )}

        {tab === 'report' && (
          <div className="result-content">{report}</div>
        )}

        {tab === 'code' && (
          <div className="result-content">
            {code.map((c, i) => (
              <div key={i} className="result-code-block">
                <div className="result-code-label">{c.description || `snippet ${i + 1}`} · {c.language}</div>
                <pre><code>{c.code}</code></pre>
              </div>
            ))}
          </div>
        )}

        {tab === 'live' && liveHtml && (
          <iframe
            className="result-preview"
            srcDoc={liveHtml}
            sandbox="allow-scripts"
            title="live preview"
          />
        )}

        <button onClick={onNewGoal} className="new-goal-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          new goal
        </button>
      </div>
    </div>
  );
}

export default ResultSection;
