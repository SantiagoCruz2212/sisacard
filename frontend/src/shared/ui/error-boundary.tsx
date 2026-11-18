import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

/** Evita la pantalla en blanco: si algo explota al renderizar, se muestra un mensaje y un botón para recargar. */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center p-4 text-center">
        <div>
          <p className="mb-3">😵 Algo salió mal / Something went wrong</p>
          <button className="rounded-lg bg-primary px-4 py-2 text-white" onClick={() => location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}
