import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[CNIVE ErrorBoundary] Erreur interceptée:", error, errorInfo);
    this.setState({ errorInfo });

    // Si c'est une erreur de type removeChild / insertBefore liée aux extensions ou au DOM
    const isDomMismatch = 
      error?.name === 'NotFoundError' || 
      error?.message?.includes('removeChild') || 
      error?.message?.includes('insertBefore') ||
      error?.message?.includes('not a child of this node');

    if (isDomMismatch) {
      console.warn("[CNIVE ErrorBoundary] Erreur de réconciliation DOM détectée (souvent causée par Google Traduction ou une extension).");
    }
  }

  public handleReset = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public handleReload = () => {
    window.location.reload();
  };

  public handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || this.state.error?.toString() || 'Erreur inconnue';
      const isDomMismatch = 
        errorMsg.includes('removeChild') || 
        errorMsg.includes('insertBefore') || 
        errorMsg.includes('not a child of this node');

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          padding: '24px',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          boxSizing: 'border-box'
        }}>
          <div style={{
            maxWidth: '640px',
            width: '100%',
            backgroundColor: '#1e293b',
            borderRadius: '24px',
            padding: '36px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            textAlign: 'center'
          }}>
            {/* Icône */}
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '22px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              margin: '0 auto 20px'
            }}>
              ⚠️
            </div>

            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#f8fafc',
              marginBottom: '10px',
              letterSpacing: '-0.02em'
            }}>
              {this.props.fallbackTitle || "Une interruption est survenue"}
            </h1>

            <p style={{
              fontSize: '0.95rem',
              color: '#94a3b8',
              lineHeight: 1.6,
              marginBottom: '24px'
            }}>
              {isDomMismatch
                ? "Une interférence du navigateur ou d'une extension (ex: Google Traduction) a temporairement désynchronisé l'affichage. Vous pouvez reprendre directement votre travail sans perdre votre session."
                : "Une anomalie inattendue s'est produite lors de l'exécution. L'incident a été consigné pour analyse."}
            </p>

            {/* Boutons d'action */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              justifyContent: 'center',
              marginBottom: '24px'
            }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '14px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                  transition: 'all 0.2s'
                }}
              >
                🔄 Reprendre la session
              </button>

              <button
                onClick={this.handleReload}
                style={{
                  padding: '12px 20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#f8fafc',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '14px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Recharger la page
              </button>

              <button
                onClick={this.handleGoHome}
                style={{
                  padding: '12px 20px',
                  backgroundColor: 'transparent',
                  color: '#94a3b8',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '14px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Accueil
              </button>
            </div>

            {/* Détails techniques dépliables */}
            <div style={{ textAlign: 'left', marginTop: '16px' }}>
              <button
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0
                }}
              >
                {this.state.showDetails ? "Masquer les détails techniques ▲" : "Afficher les détails techniques ▼"}
              </button>

              {this.state.showDetails && (
                <pre style={{
                  backgroundColor: '#090d16',
                  color: '#f87171',
                  padding: '16px',
                  borderRadius: '12px',
                  overflow: 'auto',
                  marginTop: '12px',
                  fontSize: '0.78rem',
                  lineHeight: 1.5,
                  maxHeight: '220px',
                  border: '1px solid rgba(248, 113, 113, 0.2)'
                }}>
                  {this.state.error?.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
