import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * ErrorBoundary — Capture les erreurs React non gérées dans l'arbre des composants
 * et affiche un fallback propre au lieu d'un écran blanc.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    if (import.meta.env?.DEV) {
      console.error('[ErrorBoundary]', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleHome = () => {
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'linear-gradient(135deg, #fafbfc 0%, #f1f5f9 100%)',
      }}>
        <div style={{
          maxWidth: 540,
          width: '100%',
          background: '#fff',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 12px 40px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
          textAlign: 'center',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64, height: 64,
            borderRadius: 16,
            background: '#fef3c7',
            marginBottom: 18,
          }}>
            <AlertTriangle size={30} color="#d97706" strokeWidth={2.2} />
          </div>

          <h1 style={{
            margin: 0, marginBottom: 8,
            fontSize: 22, fontWeight: 800,
            color: '#0f172a', letterSpacing: '-0.01em',
          }}>
            Oups — quelque chose a planté
          </h1>

          <p style={{
            margin: 0, marginBottom: 22,
            fontSize: 14, lineHeight: 1.55,
            color: '#475569',
          }}>
            Une erreur inattendue s&apos;est produite sur cette page. Tu peux essayer de
            recharger ou retourner à l&apos;accueil. Si le problème persiste, contacte
            le support depuis ton tableau de bord.
          </p>

          {import.meta.env?.DEV && this.state.error && (
            <details style={{
              textAlign: 'left',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: 12,
              marginBottom: 20,
              fontSize: 12,
              fontFamily: 'monospace',
              color: '#64748b',
              maxHeight: 220,
              overflow: 'auto',
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#dc2626' }}>
                Détails techniques (dev only)
              </summary>
              <pre style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={this.handleReload}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 10,
                border: 'none', cursor: 'pointer',
                background: '#1B4F72', color: '#fff',
                fontWeight: 700, fontSize: 13,
                boxShadow: '0 4px 12px rgba(27,79,114,0.25)',
                transition: 'transform 120ms, box-shadow 120ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <RefreshCw size={15} /> Recharger la page
            </button>
            <button
              onClick={this.handleHome}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 10,
                border: '1px solid #e2e8f0',
                background: '#fff', color: '#1B4F72',
                cursor: 'pointer',
                fontWeight: 700, fontSize: 13,
                transition: 'background 120ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
            >
              <Home size={15} /> Accueil
            </button>
          </div>
        </div>
      </div>
    );
  }
}
