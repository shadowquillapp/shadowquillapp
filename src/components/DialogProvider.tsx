"use client";

import { Icon } from "./Icon";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type DialogTone = "default" | "destructive" | "primary";

interface BaseDialogOptions {
	title?: string;
	// Accept string or React node for rich content
	message: React.ReactNode;
}

export interface InfoDialogOptions extends BaseDialogOptions {
	okText?: string;
}

export interface ConfirmDialogOptions extends BaseDialogOptions {
	confirmText?: string;
	cancelText?: string;
	tone?: DialogTone;
}

type EnqueuedDialog =
	| { kind: "info"; options: InfoDialogOptions; resolve: () => void }
	| { kind: "confirm"; options: ConfirmDialogOptions; resolve: (accepted: boolean) => void };

interface DialogContextValue {
	showInfo: (options: InfoDialogOptions) => Promise<void>;
	confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextValue>({
	showInfo: async () => {},
	confirm: async () => false,
});

export function useDialog(): DialogContextValue {
	return useContext(DialogContext);
}

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [queue, setQueue] = useState<EnqueuedDialog[]>([]);

	const active = queue[0] || null;

	const closeActive = useCallback(
		(result?: boolean) => {
			setQueue((prev) => {
				if (!prev.length) return prev;
				const dialog = prev[0] as EnqueuedDialog;
				const rest = prev.slice(1);
				try {
					if (dialog.kind === "info") {
						(dialog.resolve as () => void)();
					} else {
						(dialog.resolve as (accepted: boolean) => void)(!!result);
					}
				} catch {}
				return rest;
			});
		},
		[setQueue]
	);

	const showInfo = useCallback((options: InfoDialogOptions) => {
		return new Promise<void>((resolve) => {
			setQueue((prev) => [...prev, { kind: "info", options, resolve }]);
		});
	}, []);

	const confirm = useCallback((options: ConfirmDialogOptions) => {
		return new Promise<boolean>((resolve) => {
			setQueue((prev) => [...prev, { kind: "confirm", options, resolve }]);
		});
	}, []);

	// Keyboard handlers for active dialog
	useEffect(() => {
		if (!active) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				closeActive(false);
			} else if (e.key === "Enter") {
				e.preventDefault();
				closeActive(true);
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [active, closeActive]);

	// Listen for Electron->renderer info notifications, if available
	useEffect(() => {
		const handler = (evt: any) => {
			try {
				const detail = (evt as CustomEvent)?.detail || {};
				const title = typeof detail.title === "string" ? detail.title : "Information";
				const message = detail.message ?? "";
				void showInfo({ title, message, okText: typeof detail.okText === "string" ? detail.okText : "OK" });
			} catch {}
		};
		try {
			window.addEventListener("app-info", handler as any);
			return () => window.removeEventListener("app-info", handler as any);
		} catch {
			return () => {};
		}
	}, [showInfo]);

	const value = useMemo<DialogContextValue>(
		() => ({
			showInfo,
			confirm,
		}),
		[showInfo, confirm]
	);

	return (
		<DialogContext.Provider value={value}>
			{children}
			{active && (
				<div className="modal-container" aria-modal="true" role="dialog" onClick={() => closeActive(false)}>
					<div className="modal-backdrop-blur" />
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<div className="modal-title">{active.options.title || (active.kind === "info" ? "Information" : "Confirm Action")}</div>
						</div>
						<div className="modal-body">
							<div style={{ color: "var(--color-on-surface)" }}>
								{active.options.message}
							</div>
							<div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
								{active.kind === "confirm" ? (
									<>
										<button className="md-btn" onClick={() => closeActive(false)}>
											{(active.options as ConfirmDialogOptions).cancelText || "Cancel"}
										</button>
										{renderConfirmButton(active.options as ConfirmDialogOptions, () => closeActive(true))}
									</>
								) : (
									<button className="md-btn md-btn--primary" onClick={() => closeActive(true)}>
										{(active.options as InfoDialogOptions).okText || "OK"}
									</button>
								)}
							</div>
						</div>
					</div>
				</div>
			)}
		</DialogContext.Provider>
	);
};

function renderConfirmButton(options: ConfirmDialogOptions, onClick: () => void) {
	const label = options.confirmText || "Confirm";
	const tone = options.tone || "primary";
	if (tone === "destructive") {
		return (
			<button className="md-btn" onClick={onClick} style={{ color: "#ef4444" }}>
				{label}
			</button>
		);
	}
	if (tone === "primary") {
		return (
			<button className="md-btn md-btn--primary" onClick={onClick}>
				{label}
			</button>
		);
	}
	return (
		<button className="md-btn" onClick={onClick}>
			{label}
		</button>
	);
}

export default DialogProvider;


