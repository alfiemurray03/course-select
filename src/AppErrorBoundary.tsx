import { Component, ErrorInfo, ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Aptenvo application error', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="app-error-screen">
        <section className="app-error-card" role="alert">
          <div className="app-error-wordmark">Aptenvo</div>
          <p className="app-error-eyebrow">Temporary page error</p>
          <h1>We could not open that page correctly.</h1>
          <p>Your basket and course selections are still saved on this device. Reload the page to continue.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload Aptenvo
          </button>
        </section>
      </main>
    );
  }
}
