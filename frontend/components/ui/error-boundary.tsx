"use client"

import React from "react"

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <h2 className="text-2xl font-bold text-destructive mb-2">Something went wrong</h2>
              <p className="text-muted-foreground mb-4">{this.state.error?.message}</p>
              <button
                onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Reload Page
              </button>
            </div>
          </div>
        )
      )
    }
    return this.props.children
  }
}
