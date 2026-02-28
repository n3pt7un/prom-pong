import './styles.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: Error | null}> {
  constructor(props: any) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{padding:'40px',fontFamily:'monospace',color:'#ff6b6b',background:'#0a0a0a',minHeight:'100vh'}}>
          <h2 style={{color:'#ff4444'}}>⚠ React Render Error</h2>
          <pre style={{whiteSpace:'pre-wrap',color:'#ffaa44'}}>{this.state.error.message}</pre>
          <pre style={{whiteSpace:'pre-wrap',color:'#888',fontSize:'12px'}}>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);