import React from 'react';

/**
 * Generic error boundary to catch render errors and display a fallback UI.
 * Wrap high-level app structure so hook/order mistakes or runtime exceptions
 * don't crash the entire UI tree.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Could integrate with logging/analytics service here
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', error, info);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-xl mx-auto text-center">
          <h2 className="text-xl font-bold mb-2">Something went wrong.</h2>
          <p className="text-sm text-gray-600 mb-4">{this.state.error?.message || 'Unexpected error.'}</p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 rounded bg-[#2c60ce] text-white hover:opacity-90"
          >Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;