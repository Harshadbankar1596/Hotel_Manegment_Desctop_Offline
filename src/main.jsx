import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
import App from './App.jsx';
import './styles.css';

class Boundary extends React.Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="loading">
        <h2>Something went wrong</h2>
        <p style={{ maxWidth: 420, textAlign: 'center' }}>{String(this.state.err?.message || this.state.err)}</p>
        <button className="primary" onClick={() => { location.hash = '#/dashboard'; location.reload(); }}>Reload app</button>
      </div>
    );
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode><Boundary><HashRouter><App /></HashRouter></Boundary></React.StrictMode>
);
