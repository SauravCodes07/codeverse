import React, { Component, ErrorInfo } from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[CodeVerse ErrorBoundary]', error, info);
    this.props.onError?.(error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            minHeight: '400px',
            padding: '40px',
            background: 'var(--color-bg-primary)',
            color: 'var(--color-text-primary)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              marginBottom: '24px',
              background: 'rgba(239, 68, 68, 0.15)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
            }}
          >
            ⚠
          </div>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 700,
              marginBottom: '12px',
              color: '#ef4444',
            }}
          >
            Something went wrong
          </h2>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--color-text-secondary)',
              marginBottom: '8px',
              maxWidth: '400px',
            }}
          >
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <p
            style={{
              fontSize: '12px',
              color: 'var(--color-text-muted)',
              marginBottom: '32px',
              maxWidth: '400px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {this.state.error?.stack?.split('\n')[1]?.trim() ?? ''}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #00d4ff, #4f7cff)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
