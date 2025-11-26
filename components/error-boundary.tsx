"use client";

import React, { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: (error: Error, errorInfo: React.ErrorInfo) => ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary component to catch and handle React errors gracefully
 * Prevents the entire app from crashing when a component error occurs
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error to console in development
        console.error("Error Boundary caught an error:", error, errorInfo);

        // TODO: Log to error tracking service (Sentry, etc.)
        // Example: logErrorToService(error, errorInfo);

        this.setState({
            error,
            errorInfo,
        });
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback(
                    this.state.error!,
                    this.state.errorInfo!
                );
            }

            // Default fallback UI
            return (
                <DefaultErrorFallback
                    error={this.state.error!}
                    onReset={this.handleReset}
                />
            );
        }

        return this.props.children;
    }
}

interface DefaultErrorFallbackProps {
    error: Error;
    onReset: () => void;
}

function DefaultErrorFallback({ error, onReset }: DefaultErrorFallbackProps) {
    const isDevelopment = process.env.NODE_ENV === "development";

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
            <div className="w-full max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-slate-900">
                        Something went wrong
                    </h2>
                    <p className="text-sm text-slate-600">
                        We encountered an unexpected error. Please try refreshing the page or contact support
                        if the problem persists.
                    </p>
                </div>

                {isDevelopment && (
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-700">Error Details (Development Only):</p>
                        <pre className="overflow-auto rounded border border-red-200 bg-red-50 p-3 text-xs text-red-900">
                            {error.toString()}
                        </pre>
                        {error.stack && (
                            <details className="text-xs">
                                <summary className="cursor-pointer text-slate-600 hover:text-slate-900">
                                    Stack Trace
                                </summary>
                                <pre className="mt-2 overflow-auto rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                                    {error.stack}
                                </pre>
                            </details>
                        )}
                    </div>
                )}

                <div className="flex gap-2">
                    <Button onClick={onReset} variant="outline" size="sm">
                        Try Again
                    </Button>
                    <Button
                        onClick={() => window.location.reload()}
                        size="sm"
                    >
                        Refresh Page
                    </Button>
                </div>
            </div>
        </div>
    );
}
