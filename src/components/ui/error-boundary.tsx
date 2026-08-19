"""Global error boundary for graceful error handling and user experience."""
'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ error, errorInfo })
    
    // Log error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // Example: logToMonitoring(error, errorInfo)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error!} reset={this.handleReset} />
      }

      return <DefaultErrorFallback error={this.state.error!} reset={this.handleReset} />
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  const [isRetrying, setIsRetrying] = React.useState(false)

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      reset()
      // In a real app, you might want to refresh data here
    } finally {
      setIsRetrying(false)
    }
  }

  const handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  const isNetworkError = error.message.includes('Network') || 
                         error.message.includes('fetch') ||
                         error.message.includes('status')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-lg shadow-xl border-0">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              {isNetworkError ? 'Connection Problem' : 'Something Went Wrong'}
            </h1>
            <p className="text-slate-600 mb-4">
              {isNetworkError 
                ? 'Unable to connect to the server. Please check your internet connection and try again.'
                : 'An unexpected error occurred. Please try again, or contact support if the problem persists.'
              }
            </p>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mb-6 text-left">
              <summary className="cursor-pointer text-sm font-medium text-slate-700 mb-2">
                Error Details (Development)
              </summary>
              <div className="bg-slate-100 p-3 rounded text-xs font-mono text-slate-600 overflow-auto">
                <div className="font-semibold mb-1">Message:</div>
                <div>{error.message}</div>
                {error.stack && (
                  <>
                    <div className="font-semibold mt-2 mb-1">Stack:</div>
                    <pre className="whitespace-pre-wrap overflow-x-auto">
                      {error.stack}
                    </pre>
                  </>
                )}
              </div>
            </details>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex-1"
              variant="default"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </Button>
            <Button
              onClick={handleGoHome}
              variant="outline"
              className="flex-1"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ErrorBoundary
