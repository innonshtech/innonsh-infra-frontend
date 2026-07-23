import React from 'react';

export default class ModalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Modal Error Boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="modal-overlay" onClick={this.props.onClose}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="modal-header" style={{ justifyContent: 'center' }}>
              <h3 style={{ color: 'var(--text-danger)' }}>⚠️ Something went wrong</h3>
            </div>
            <div className="modal-body">
              <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
                An error occurred while loading this modal.
              </p>
              <div style={{ background: 'var(--bg-tertiary)', padding: 8, borderRadius: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
                {this.state.error?.message || 'Unknown error'}
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn btn-primary" onClick={this.props.onClose}>Close</button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
