'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error | null; resetError: () => void }>;
}

class ErrorBoundaryClass extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }
      return <DefaultErrorFallback error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, resetError }: { error: Error | null; resetError: () => void }) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle>Something went wrong</CardTitle>
          </div>
          <CardDescription>
            An unexpected error occurred. Please try again or return to the home page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-semibold">Error Details:</p>
              <p className="mt-1">{error.message || 'Unknown error occurred'}</p>
              {process.env.NODE_ENV === 'development' && error.stack && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs opacity-75 hover:opacity-100">
                    Stack Trace
                  </summary>
                  <pre className="mt-2 text-xs overflow-auto max-h-40 bg-background/50 p-2 rounded">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={resetError} variant="outline" className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button onClick={() => router.push('/')} className="flex-1">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  return <ErrorBoundaryClass fallback={fallback}>{children}</ErrorBoundaryClass>;
}

