import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('DELVE render error:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div
        style={{
          minHeight: '100vh',
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif',
          background: 'var(--bg, #ebe3d6)',
          color: '#1c1410',
        }}
      >
        <h1 style={{ marginTop: 0 }}>Something went wrong</h1>
        <p>DELVE hit an error while loading this page.</p>
        <pre
          style={{
            padding: '1rem',
            background: '#fff',
            border: '1px solid #e8dfd6',
            borderRadius: '8px',
            overflow: 'auto',
            fontSize: '13px',
          }}
        >
          {this.state.error.message}
        </pre>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            marginTop: '1rem',
            padding: '0.6rem 1.2rem',
            background: '#e8620a',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Reload page
        </button>
      </div>
    )
  }
}
