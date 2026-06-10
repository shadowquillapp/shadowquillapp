"use client";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { useCallback, useEffect, useRef, useState } from "react";
import { getElectronDataPaths } from "@/lib/electron-storage";
import { validateLocalModelConnection as validateLocalModelConnectionClient } from "@/lib/local-config";
import {
	abortFactoryReset,
	clearAllStorageForFactoryReset,
} from "@/lib/local-storage";
import { ensureDefaultPreset } from "@/lib/presets";
import {
	ensureSystemPromptBuild,
	resetSystemPromptBuild,
	setSystemPromptBuild,
} from "@/lib/system-prompts";
import { useDialog } from "./DialogProvider";
import { Icon } from "./Icon";
import { OllamaSetupPanel } from "./OllamaSetupPanel";
import { useOllamaSetup } from "./useOllamaSetup";

interface Props {
	children: React.ReactNode;
}

function isElectronRuntime(): boolean {
	if (typeof process !== "undefined") {
		if (
			(process as NodeJS.Process & { versions?: { electron?: string } })
				?.versions?.electron
		)
			return true;
	}
	if (typeof navigator !== "undefined") {
		return /Electron/i.test(navigator.userAgent);
	}
	return false;
}

export default function ModelConfigGate({ children }: Props) {
	const initialElectron =
		typeof process !== "undefined" &&
		(process.env.NEXT_PUBLIC_ELECTRON === "1" || process.env.ELECTRON === "1");
	const [electronMode, setElectronMode] = useState<boolean>(initialElectron);
	const [fetching, setFetching] = useState(false);
	const [config, setConfig] = useState<{
		provider: "ollama";
		baseUrl: string;
		model: string;
	} | null>(null);
	const [_error, setError] = useState<string | null>(null);
	const [loadedOnce, setLoadedOnce] = useState(false);
	const [previouslyConfigured, setPreviouslyConfigured] = useState(false);
	const [_defaultProvider, setDefaultProvider] = useState<"ollama" | null>(
		null,
	);
	const [hasValidDefault, setHasValidDefault] = useState(false);
	const [showProviderSelection, setShowProviderSelection] = useState(false);
	const [ollamaCheckPerformed, setOllamaCheckPerformed] = useState(false);
	const [showOllamaMissingModal, setShowOllamaMissingModal] = useState(false);
	const setup = useOllamaSetup();
	const {
		validating,
		setValidating,
		setConnectionError,
		setLocalPort,
		loadFromStorage,
		saveConfiguration,
	} = setup;

	useEffect(() => {
		if (
			!electronMode &&
			(isElectronRuntime() ||
				(typeof process !== "undefined" &&
					process.env.NEXT_PUBLIC_ELECTRON === "1"))
		) {
			setElectronMode(true);
		}
	}, [electronMode]);

	const performOllamaDetection = useCallback(async () => {
		try {
			const controller = new AbortController();
			const t = setTimeout(() => controller.abort(), 2500);
			const res = await fetch("http://localhost:11434/api/tags", {
				signal: controller.signal,
			});
			clearTimeout(t);
			return res.ok;
		} catch {
			return false;
		}
	}, []);

	useEffect(() => {
		try {
			ensureDefaultPreset();
		} catch {}
	}, []);

	useEffect(() => {
		if (!electronMode || loadedOnce) return;
		let cancelled = false;

		const load = async () => {
			setFetching(true);
			try {
				const cfg = await loadFromStorage();
				if (cancelled) return;

				setDefaultProvider("ollama");

				if (cfg) {
					setConfig(cfg);
					setPreviouslyConfigured(true);

					setValidating(true);
					try {
						const vr = await validateLocalModelConnectionClient(cfg);
						if (vr.ok) {
							setHasValidDefault(true);
							setConnectionError(null);
							setShowProviderSelection(false);
							return;
						}
						setConnectionError(vr.error || "Connection failed");
					} finally {
						setValidating(false);
					}
				}

				setShowProviderSelection(true);
			} catch (err) {
				console.error("Failed to load configuration:", err);
				if (!cancelled) {
					setError("Failed to load Gemma configuration");
					setShowProviderSelection(true);
				}
			} finally {
				if (!cancelled) {
					setFetching(false);
					setLoadedOnce(true);
				}
			}
		};

		void load();
		return () => {
			cancelled = true;
		};
	}, [
		electronMode,
		loadedOnce,
		loadFromStorage,
		setConnectionError,
		setValidating,
	]);

	const gated =
		electronMode &&
		(fetching || showProviderSelection || (!hasValidDefault && !config));

	useEffect(() => {
		if (!showProviderSelection) return;
		if (previouslyConfigured) return;
		if (ollamaCheckPerformed) return;
		let cancelled = false;
		const detect = async () => {
			setOllamaCheckPerformed(true);
			const isOk = await performOllamaDetection();
			if (cancelled) return;
			if (!isOk) {
				setLocalPort("");
				setShowOllamaMissingModal(true);
			}
		};
		void detect();
		return () => {
			cancelled = true;
		};
	}, [
		showProviderSelection,
		previouslyConfigured,
		ollamaCheckPerformed,
		performOllamaDetection,
		setLocalPort,
	]);

	const retryOllamaDetection = async () => {
		setOllamaCheckPerformed(false);
		setShowOllamaMissingModal(false);
		const isOk = await performOllamaDetection();
		if (isOk) {
			setLocalPort("11434");
		} else {
			setLocalPort("");
			setShowOllamaMissingModal(true);
		}
		setOllamaCheckPerformed(true);
	};

	return (
		<SystemPromptEditorWrapper>
			<DataLocationModalWrapper />
			<OpenProviderSelectionListener
				onOpen={() => setShowProviderSelection(true)}
			/>
			<div
				className="relative h-full w-full"
				data-model-gate={
					electronMode ? (config ? "ready" : "pending") : "disabled"
				}
			>
				{!gated && children}
				{electronMode && gated && (
					<div className="modal-container">
						<div className="modal-backdrop-blur" />
						{(fetching && !loadedOnce) || validating ? (
							<div
								className="modal-content"
								onClick={(e) => e.stopPropagation()}
								onKeyDown={(e) => e.stopPropagation()}
								role="dialog"
							>
								<div className="modal-header">
									<div className="modal-title">
										{validating
											? "Validating Gemma connection…"
											: "Loading Gemma configuration…"}
									</div>
								</div>
								<div className="modal-body">
									<div className="text-secondary text-sm">
										{validating
											? "Testing your default provider…"
											: "Checking for saved settings…"}
									</div>
								</div>
							</div>
						) : showProviderSelection ? (
							<div
								className="modal-content modal-content--large"
								onClick={(e) => e.stopPropagation()}
								onKeyDown={(e) => e.stopPropagation()}
								style={{ overflow: "hidden" }}
								role="dialog"
							>
								<div className="modal-header">
									<div
										className="modal-title"
										style={{ display: "flex", alignItems: "center", gap: 10 }}
									>
										<Icon name="gear" />
										<span>AI Model Setup</span>
									</div>
								</div>
								<div className="modal-body" style={{ overflow: "hidden" }}>
									<OllamaSetupPanel
										setup={setup}
										variant="gate"
										eyebrow="First-Time Setup"
										title="Connect to Ollama"
										subtitle="Configure your local Ollama connection to start using ShadowQuill."
										onSubmit={async (e) => {
											e.preventDefault();
											setError(null);
											const result = await saveConfiguration();
											if (result.ok) {
												setConfig(result.payload);
												setPreviouslyConfigured(true);
												setShowProviderSelection(false);
											}
										}}
									/>
								</div>
							</div>
						) : null}
						{showOllamaMissingModal && (
							<div className="modal-backdrop-blur fixed inset-0 z-50 flex items-center justify-center">
								<div className="w-full max-w-lg rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-variant)] p-6 text-[var(--color-on-surface)] shadow-2xl">
									<h2 className="mb-3 font-semibold text-[var(--color-primary)] text-lg">
										Ollama Not Detected
									</h2>
									<div className="mb-4 space-y-3 text-[var(--color-on-surface-variant)] text-sm">
										<p>
											Hmm you don't seem to have <strong>Ollama</strong> running
											or installed.
										</p>
										<p>
											Make sure it is open and running in the background with
											your <code>gemma4</code> models pulled and downloaded.
										</p>
										<p>
											If you don't have Ollama, download it here:{" "}
											<a
												className="text-[var(--color-primary)] underline"
												href="https://ollama.com/download"
												target="_blank"
												rel="noreferrer"
											>
												https://ollama.com/download
											</a>
										</p>
										<p className="text-[11px] text-[var(--color-on-surface-variant)]">
											After installing & starting Ollama, pull a model e.g.:{" "}
											<code>ollama pull gemma4</code>
										</p>
									</div>
									<div className="flex flex-wrap gap-3">
										<button
											type="button"
											data-testid="shadowquill-retry-detection-button"
											onClick={retryOllamaDetection}
											className="interactive-glow flex-1 rounded-md bg-[var(--color-primary)] py-2 font-medium text-[var(--color-on-primary)] text-sm hover:bg-[var(--color-primary-variant)]"
										>
											Retry Detection
										</button>
										<button
											type="button"
											data-testid="shadowquill-missing-close-button"
											onClick={() => setShowOllamaMissingModal(false)}
											className="md-close-btn"
											aria-label="Close"
											title="Close"
										>
											<XMarkIcon className="h-4 w-4" />
										</button>
									</div>
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</SystemPromptEditorWrapper>
	);
}

function SystemPromptEditorWrapper({
	children,
}: {
	children: React.ReactNode;
}) {
	const { confirm } = useDialog();
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [prompt, setPrompt] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);

	useEffect(() => {
		if (!open) return;
		const load = async () => {
			setLoading(true);
			try {
				try {
					const value = ensureSystemPromptBuild();
					setPrompt(value);
				} catch {
					setPrompt("");
				}
			} finally {
				setLoading(false);
			}
		};
		void load();
	}, [open]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional - resize when prompt content changes or dialog opens
	useEffect(() => {
		if (!open) return;
		const el = textareaRef.current;
		if (!el) return;
		const MIN_HEIGHT = 200;
		const MAX_HEIGHT = 520;
		el.style.height = "auto";
		const scrollHeight = el.scrollHeight;
		const nextHeight = Math.min(Math.max(scrollHeight, MIN_HEIGHT), MAX_HEIGHT);
		el.style.height = `${nextHeight}px`;
		el.style.overflowY = scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
	}, [prompt, open]);

	return (
		<>
			<OpenSystemPromptsListener onOpen={() => setOpen(true)} />
			{children}
			{open && (
				<div className="modal-container">
					<button
						type="button"
						className="modal-backdrop-blur"
						onClick={() => setOpen(false)}
						onKeyDown={(e) => {
							if (e.key === "Escape") {
								setOpen(false);
							}
						}}
						aria-label="Close modal"
					/>
					<div
						className="modal-content modal-content--large"
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => e.stopPropagation()}
						role="dialog"
					>
						<div className="modal-header">
							<div className="modal-title">Edit System Prompt</div>
							<button
								type="button"
								onClick={() => setOpen(false)}
								className="md-close-btn"
								aria-label="Close"
								title="Close"
							>
								<XMarkIcon className="h-4 w-4" />
							</button>
						</div>
						<div className="modal-body">
							<div className="system-prompts-container">
								{loading ? (
									<div className="text-sm">Loading…</div>
								) : (
									<form
										className="system-prompts-form"
										onSubmit={async (e) => {
											e.preventDefault();
											setSaving(true);
											setError(null);
											try {
												const normalized = setSystemPromptBuild(prompt);
												setPrompt(normalized);
												setOpen(false);
											} catch (err: unknown) {
												const error = err as Error;
												setError(error.message || "Unknown error");
											} finally {
												setSaving(false);
											}
										}}
									>
										<div className="system-prompts-field">
											<label
												className="system-prompts-label"
												htmlFor="system-prompt-edit"
											>
												System Prompt
											</label>
											<textarea
												id="system-prompt-edit"
												ref={textareaRef}
												value={prompt}
												onChange={(e) => setPrompt(e.target.value)}
												className="system-prompts-textarea"
											/>
										</div>
										{error && (
											<div className="system-prompts-error">{error}</div>
										)}
										<div className="system-prompts-actions">
											<div className="system-prompts-actions-left">
												<button
													type="button"
													onClick={async () => {
														const ok = await confirm({
															title: "Restore Default",
															message:
																"Restore default system prompt? This will overwrite your current edits.",
															confirmText: "Restore",
															cancelText: "Cancel",
														});
														if (!ok) return;
														setSaving(true);
														setError(null);
														try {
															const def = resetSystemPromptBuild();
															setPrompt(def);
														} catch (err: unknown) {
															const error = err as Error;
															setError(error.message || "Unknown error");
														} finally {
															setSaving(false);
														}
													}}
													className="md-btn md-btn--attention"
												>
													Restore Default
												</button>
											</div>
											<div className="system-prompts-actions-right">
												<button
													type="button"
													onClick={() => setOpen(false)}
													className="md-btn"
												>
													Cancel
												</button>
												<button
													type="submit"
													disabled={saving}
													className="md-btn md-btn--primary"
												>
													{saving ? "Saving…" : "Save"}
												</button>
											</div>
										</div>
									</form>
								)}
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
}

function OpenSystemPromptsListener({ onOpen }: { onOpen: () => void }) {
	useEffect(() => {
		const handler = () => onOpen();
		window.addEventListener("open-system-prompts", handler);
		return () => window.removeEventListener("open-system-prompts", handler);
	}, [onOpen]);
	return null;
}

function OpenProviderSelectionListener({ onOpen }: { onOpen: () => void }) {
	useEffect(() => {
		const handler = () => onOpen();
		window.addEventListener("open-provider-selection", handler);
		return () => window.removeEventListener("open-provider-selection", handler);
	}, [onOpen]);
	return null;
}

function DataLocationModalWrapper() {
	const { confirm } = useDialog();
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [paths, setPaths] = useState<null | {
		userData?: string;
		localStorageDir?: string;
		localStorageLevelDb?: string;
	}>(null);

	useEffect(() => {
		const handler = () => setOpen(true);
		window.addEventListener("open-data-location", handler);
		return () => window.removeEventListener("open-data-location", handler);
	}, []);

	useEffect(() => {
		if (!open) return;
		const load = async () => {
			setLoading(true);
			setError(null);
			try {
				const result = await getElectronDataPaths();
				if (result.ok) {
					setPaths(result.paths);
				} else {
					setError(result.error);
				}
			} catch (e: unknown) {
				const err = e as Error;
				setError(err?.message || "Failed to load data paths");
			} finally {
				setLoading(false);
			}
		};
		void load();
	}, [open]);

	return (
		<>
			{open && (
				<div className="modal-container">
					<button
						type="button"
						className="modal-backdrop-blur"
						onClick={() => setOpen(false)}
						onKeyDown={(e) => {
							if (e.key === "Escape") {
								setOpen(false);
							}
						}}
						aria-label="Close modal"
					/>
					<div
						className="modal-content"
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => e.stopPropagation()}
						role="dialog"
					>
						<div className="modal-header">
							<div className="modal-title">Local Data Management</div>
							<button
								type="button"
								onClick={() => setOpen(false)}
								className="md-close-btn"
								aria-label="Close"
								title="Close"
							>
								<XMarkIcon className="h-4 w-4" />
							</button>
						</div>
						<div className="modal-body">
							{loading ? (
								<div className="text-sm">Loading…</div>
							) : (
								<div className="space-y-3">
									{error && (
										<div
											className="md-card"
											style={{ padding: 12, borderLeft: "4px solid #ef4444" }}
										>
											<div style={{ fontSize: 12 }}>{error}</div>
										</div>
									)}
									<div className="md-card" style={{ padding: 12 }}>
										<div
											className="text-secondary text-sm"
											style={{ marginBottom: 8 }}
										>
											Electron Profile (userData)
										</div>
										<code style={{ fontSize: 12, wordBreak: "break-all" }}>
											{paths?.userData || "Unknown"}
										</code>
									</div>
									<div className="md-card" style={{ padding: 12 }}>
										<div
											className="text-secondary text-sm"
											style={{ marginBottom: 8 }}
										>
											Local Storage (LevelDB)
										</div>
										<code style={{ fontSize: 12, wordBreak: "break-all" }}>
											{paths?.localStorageLevelDb ||
												paths?.localStorageDir ||
												"Unknown"}
										</code>
									</div>
									<div
										className="md-card"
										style={{ padding: 12, borderLeft: "4px solid #ef4444" }}
									>
										<div
											className="text-sm"
											style={{ marginBottom: 8, color: "#ef4444" }}
										>
											<b>Reset Application</b>
										</div>
										<div
											className="text-secondary text-xs"
											style={{ marginBottom: 10 }}
										>
											This will delete all local data (settings, workbenchs,
											presets) permanently. The app will return to its initial
											setup state.
										</div>
										<button
											type="button"
											className="md-btn md-btn--destructive"
											onClick={async () => {
												const ok = await confirm({
													title: "Factory Reset",
													message:
														"Delete ALL local data? Settings, prompts, and presets will be permanently removed. The app will return to its initial setup state.",
													confirmText: "Factory Reset",
													cancelText: "Cancel",
													tone: "destructive",
												});
												if (!ok) return;
												setLoading(true);
												setError(null);
												try {
													// CRITICAL: Clear all renderer storage FIRST to prevent
													// beforeunload handlers from re-saving data
													clearAllStorageForFactoryReset();

													const api = window.shadowquill;
													const res = await api?.factoryReset?.();
													if (!res?.ok) {
														abortFactoryReset();
														setError(res?.error || "Reset failed");
														setLoading(false);
														return;
													}
													window.location.assign("/workbench");
												} catch (e: unknown) {
													abortFactoryReset();
													const err = e as Error;
													setError(err?.message || "Reset failed");
													setLoading(false);
												}
											}}
											style={{
												padding: "6px 10px",
												color: "#ef4444",
												marginRight: 30,
												borderColor: "#ef4444",
											}}
										>
											Factory Reset
										</button>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</>
	);
}
