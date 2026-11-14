import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/app.css';

interface ErrorBoundaryState {
  errorMessage: string | null;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = { errorMessage: null };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { errorMessage: error.message || 'Erreur inattendue' };
  }

  public render(): React.ReactNode {
    if (this.state.errorMessage) {
      return (
        <div className="app-shell">
          <div className="modal-backdrop">
            <div className="modal-card">
              <h2 className="modal-title">ERREUR</h2>
              <p className="control-hint">{this.state.errorMessage}</p>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </React.StrictMode>,
  );
}
