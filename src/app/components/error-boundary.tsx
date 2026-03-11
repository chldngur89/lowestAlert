import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router';

interface Props {
  children: ReactNode;
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

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card rounded-2xl p-8 shadow-lg border border-border text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-xl font-bold mb-2">문제가 발생했어요</h1>
            <p className="text-muted-foreground mb-6">
              예상치 못한 오류가 발생했습니다. 다시 시도해 주세요.
            </p>
            <div className="flex gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 bg-[#0066FF] text-white py-3 rounded-xl font-semibold hover:bg-[#0052CC] transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                새로고침
              </button>
              <Link
                to="/home"
                className="flex-1 border border-border py-3 rounded-xl font-semibold hover:bg-accent transition-colors flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                홈으로
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
