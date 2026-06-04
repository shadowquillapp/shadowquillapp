"use client";

import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

interface ErrorBoundaryProps {
	children: ReactNode;
}

interface ErrorBoundaryState {
	error: Error | null;
}

export class ErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	override state: ErrorBoundaryState = { error: null };

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { error };
	}

	override componentDidCatch(error: Error, info: ErrorInfo): void {
		console.error("[ErrorBoundary]", error, info);
	}

	override render() {
		if (!this.state.error) return this.props.children;
		return (
			<div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
				<h1 className="font-semibold text-lg">Something went wrong</h1>
				<p className="max-w-md text-secondary text-sm">
					ShadowQuill hit an unexpected renderer error.
				</p>
				<button
					type="button"
					className="md-btn md-btn--primary"
					onClick={() => this.setState({ error: null })}
				>
					Try again
				</button>
			</div>
		);
	}
}
