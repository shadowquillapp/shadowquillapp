"use client";

import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { trapModalTabKey } from "@/components/modal-focus-trap";

type DialogTone = "default" | "destructive" | "primary";

interface BaseDialogOptions {
	title?: string;
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
	| {
			kind: "confirm";
			options: ConfirmDialogOptions;
			resolve: (accepted: boolean) => void;
	  };

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

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [queue, setQueue] = useState<EnqueuedDialog[]>([]);
	const dialogRef = useRef<HTMLDialogElement>(null);
	const previousFocusRef = useRef<HTMLElement | null>(null);
	const titleId = useId();

	const active = queue[0] || null;

	const closeActive = useCallback((result?: boolean) => {
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
			} catch (e) {
				console.error("[DialogProvider] dialog resolve failed:", e);
			}
			return rest;
		});
	}, []);

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

	useEffect(() => {
		if (!active) {
			previousFocusRef.current?.focus();
			previousFocusRef.current = null;
			return;
		}

		previousFocusRef.current = document.activeElement as HTMLElement | null;
		requestAnimationFrame(() => {
			const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
				'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
			);
			firstFocusable?.focus();
		});
	}, [active]);

	useEffect(() => {
		if (!active) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				closeActive(false);
				return;
			}
			if (e.key !== "Enter") return;
			if ((e.target as HTMLElement).closest("button")) return;
			e.preventDefault();
			if (active.kind === "info") {
				closeActive(true);
			} else {
				closeActive(true);
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [active, closeActive]);

	useEffect(() => {
		const onAppInfoEvent = (evt: Event) => {
			try {
				const detail = (evt as CustomEvent)?.detail || {};
				const title =
					typeof detail.title === "string" ? detail.title : "Information";
				const message = detail.message ?? "";
				void showInfo({
					title,
					message,
					okText: typeof detail.okText === "string" ? detail.okText : "OK",
				});
			} catch (e) {
				console.error("[DialogProvider] app-info event failed:", e);
			}
		};
		try {
			window.addEventListener("app-info", onAppInfoEvent);
			return () => window.removeEventListener("app-info", onAppInfoEvent);
		} catch {
			return () => {};
		}
	}, [showInfo]);

	const value = useMemo<DialogContextValue>(
		() => ({
			showInfo,
			confirm,
		}),
		[showInfo, confirm],
	);

	return (
		<DialogContext.Provider value={value}>
			{children}
			{active && (
				<div className="modal-container">
					<button
						type="button"
						className="modal-backdrop-blur"
						aria-label="Close dialog"
						onClick={() => closeActive(false)}
					/>
					<dialog
						ref={dialogRef}
						open
						className="modal-content"
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => trapModalTabKey(e, dialogRef.current)}
						aria-modal="true"
						aria-labelledby={titleId}
					>
						<div className="modal-header">
							<div className="modal-title" id={titleId}>
								{active.options.title ||
									(active.kind === "info" ? "Information" : "Confirm Action")}
							</div>
						</div>
						<div className="modal-body">
							<div className="text-on-surface">{active.options.message}</div>
							<div className="modal-footer">
								{active.kind === "confirm" ? (
									<>
										<button
											type="button"
											className="md-btn"
											onClick={() => closeActive(false)}
										>
											{(active.options as ConfirmDialogOptions).cancelText ||
												"Cancel"}
										</button>
										{renderConfirmButton(
											active.options as ConfirmDialogOptions,
											() => closeActive(true),
										)}
									</>
								) : (
									<button
										type="button"
										className="md-btn md-btn--primary"
										onClick={() => closeActive(true)}
									>
										{(active.options as InfoDialogOptions).okText || "OK"}
									</button>
								)}
							</div>
						</div>
					</dialog>
				</div>
			)}
		</DialogContext.Provider>
	);
};

function renderConfirmButton(
	options: ConfirmDialogOptions,
	onClick: () => void,
) {
	const tone = options.tone || "primary";
	const className =
		tone === "destructive"
			? "md-btn md-btn--destructive"
			: tone === "primary"
				? "md-btn md-btn--primary"
				: "md-btn";
	return (
		<button type="button" className={className} onClick={onClick}>
			{options.confirmText || "Confirm"}
		</button>
	);
}

export default DialogProvider;
