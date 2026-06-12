"use client";

import type { ErrorInfo, ReactNode } from "react";
import { Component, Fragment } from "react";

interface ErrorBoundaryProps {
	children: ReactNode;
}

interface ErrorBoundaryState {
	error: Error | null;
	retryKey: number;
}

export class ErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	override state: ErrorBoundaryState = { error: null, retryKey: 0 };

	static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
		return { error };
	}

	override componentDidCatch(error: Error, info: ErrorInfo): void {
		console.error("[ErrorBoundary]", error, info);
	}

	override render() {
		if (!this.state.error) {
			return (
				<Fragment key={this.state.retryKey}>{this.props.children}</Fragment>
			);
		}
		return (
			<div
				className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center"
				role="alert"
			>
				<h1 className="font-semibold text-lg">Something went wrong</h1>
				<p className="max-w-md text-on-surface-variant text-sm">
					ShadowQuill hit an unexpected renderer error.
				</p>
				<button
					type="button"
					className="md-btn md-btn--primary"
					onClick={() =>
						this.setState((state) => ({
							error: null,
							retryKey: state.retryKey + 1,
						}))
					}
				>
					Try again
				</button>
			</div>
		);
	}
}
