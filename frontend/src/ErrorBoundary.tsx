import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-shell" data-theme="obsidian-dark">
          <div className="app-inner">
            <h1 className="header-widget" style={{ fontSize: "1.25rem" }}>
              Something broke
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              {this.state.error.message}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "1rem" }}>
              Open the browser developer console (F12) for the full stack trace. If you edited{" "}
              <code>data/config.json</code>, try fixing <code>activeWorkspaceId</code> or widget fields.
            </p>
            <button
              type="button"
              className="icon-btn"
              style={{ marginTop: "1rem", width: "auto", padding: "0 0.75rem" }}
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
