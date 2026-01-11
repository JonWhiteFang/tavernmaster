import { Component } from "react";
import type { ErrorInfo, PropsWithChildren } from "react";
import { logger } from "../utils/logger";

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export default class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  constructor(props: PropsWithChildren) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error(`ErrorBoundary caught: ${info.componentStack}`, error, "ErrorBoundary");
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="panel" style={{ margin: "2rem", textAlign: "center" }}>
          <div className="panel-title">Something went wrong</div>
          <div className="panel-copy" style={{ marginTop: "1rem" }}>
            {this.state.error?.message ?? "An unexpected error occurred."}
          </div>
          <button
            className="primary-button"
            style={{ marginTop: "1rem" }}
            onClick={this.handleReset}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
