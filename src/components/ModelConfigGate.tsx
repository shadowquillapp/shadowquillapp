"use client";
import {
	listAvailableModels,
	readLocalModelConfig as readLocalModelConfigClient,
	validateLocalModelConnection as validateLocalModelConnectionClient,
	writeLocalModelConfig as writeLocalModelConfigClient,
} from "@/lib/local-config";
import { ensureDefaultPreset } from "@/lib/presets";
import {
	ensureSystemPromptBuild,
	resetSystemPromptBuild,
	setSystemPromptBuild,
} from "@/lib/system-prompts";
import { useEffect, useRef, useState } from "react";
import { useDialog } from "./DialogProvider";
import { Icon } from "./Icon";

interface Props {
	children: React.ReactNode;
}

interface WindowWithShadowQuill extends Window {
	shadowquill?: {
		checkOllamaInstalled?: () => Promise<{ installed: boolean }>;
		openOllama?: () => Promise<{ ok: boolean; error?: string }>;
	};
}

function isElectronRuntime(): boolean {
	if (typeof process !== "undefined") {
		if ((process as any)?.versions?.electron) return true;
		if (process.env.ELECTRON === "1" || process.env.NEXT_PUBLIC_ELECTRON === "1") return true;
	}
	if (typeof navigator !== "undefined") {
		return /Electron/i.test(navigator.userAgent);
	}
	return false;
}

export default function ModelConfigGate({ children }: Props) {
	// Detect Electron at build/SSR via env; fall back to client runtime detection.
	const initialElectron =
		typeof process !== "undefined" &&
		(process.env.NEXT_PUBLIC_ELECTRON === "1" || process.env.ELECTRON === "1");
	const [electronMode, setElectronMode] = useState<boolean>(initialElectron);
	const [fetching, setFetching] = useState(false);
	const [config, setConfig] = useState<any>(null);
	const [error, setError] = useState<string | null>(null);
	const [localPort, setLocalPort] = useState<string>("11434");
	const [model, setModel] = useState<string>("");
	const [provider] = useState<"ollama">("ollama");
	const [saving, setSaving] = useState(false);
	const [loadedOnce, setLoadedOnce] = useState(false);
	const [validating, setValidating] = useState(false);
	const [connectionError, setConnectionError] = useState<string | null>(null);
	const [previouslyConfigured, setPreviouslyConfigured] = useState(false);
	const [defaultProvider, setDefaultProvider] = useState<"ollama" | null>(null);
	const [hasValidDefault, setHasValidDefault] = useState(false);
	const [showProviderSelection, setShowProviderSelection] = useState(false);
	const [ollamaCheckPerformed, setOllamaCheckPerformed] = useState(false);
	const [showOllamaMissingModal, setShowOllamaMissingModal] = useState(false);
	const [testingLocal, setTestingLocal] = useState(false);
	const [localTestResult, setLocalTestResult] = useState<null | {
		success: boolean;
		url: string;
		models?: Array<{ name: string; size: number }>;
		error?: string;
		duration?: number;
	}>(null);
	const [availableModels, setAvailableModels] = useState<string[]>([]);
	const [isOpeningOllama, setIsOpeningOllama] = useState(false);
	const [openOllamaError, setOpenOllamaError] = useState<string | null>(null);
	const [ollamaInstalled, setOllamaInstalled] = useState<boolean | null>(null);

	// Client side enhancement
	useEffect(() => {
		if (
			!electronMode &&
			(isElectronRuntime() || process.env.NEXT_PUBLIC_ELECTRON === "1")
		) {
			setElectronMode(true);
		}
	}, [electronMode]);

	// Ensure the 'Default' preset exists on startup (idempotent)
	useEffect(() => {
		try {
			ensureDefaultPreset();
		} catch {}
	}, []);

	// Load configuration and default provider on startup
	useEffect(() => {
		if (!electronMode || loadedOnce) return;
		let cancelled = false;

		const load = async () => {
			setFetching(true);
			try {
				// Check if Ollama is installed
				await checkOllamaInstalled();

				// Load config from local storage
				const cfg = readLocalModelConfigClient();
				if (cancelled) return;

				// Default to Ollama since it's the only option
				setDefaultProvider("ollama");

				// Load existing configuration if available
				if (cfg) {
					setConfig(cfg);
					if (cfg.provider === "ollama") {
						const base = String(cfg.baseUrl || "http://localhost:11434");
						const portMatch = base.match(/:(\d{1,5})/);
						setLocalPort(portMatch?.[1] ?? "11434");
						// Load available models immediately
						testLocalConnection(cfg.baseUrl, cfg.model);
					}
					setPreviouslyConfigured(true);

					// Validate loaded config
					try {
						setValidating(true);
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

				// Show provider selection if no valid default
				setShowProviderSelection(true);
			} catch (err) {
				console.error("Failed to load configuration:", err);
				if (!cancelled) {
					setError("Failed to load Gemma 3 configuration");
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
	}, [electronMode, loadedOnce]);

	const gated =
		electronMode &&
		(fetching || showProviderSelection || (!hasValidDefault && !config));

	// Detect if Ollama is running when provider selection first appears (initial launch, not previously configured)
	useEffect(() => {
		if (!showProviderSelection) return;
		if (previouslyConfigured) return; // don't override existing settings
		if (ollamaCheckPerformed) return; // run once until user retries
		let cancelled = false;
		const detect = async () => {
			setOllamaCheckPerformed(true);
			// Only probe the default URL; if user already changed baseUrl, skip
			const defaultUrl = "http://localhost:11434";
			try {
				const controller = new AbortController();
				const t = setTimeout(() => controller.abort(), 2500);
				const res = await fetch(`${defaultUrl}/api/tags`, {
					signal: controller.signal,
				});
				clearTimeout(t);
				if (cancelled) return;
				if (!res.ok) throw new Error(`status ${res.status}`);
				// success -> keep default base URL
			} catch (_err) {
				if (cancelled) return;
				// Not reachable: blank out the URL so user explicitly sets it and show modal
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
		provider,
		previouslyConfigured,
		ollamaCheckPerformed,
	]);

	// Allow retry from modal
	const retryOllamaDetection = async () => {
		setOllamaCheckPerformed(false);
		setShowOllamaMissingModal(false);
		// trigger effect by manual check immediate
		try {
			const controller = new AbortController();
			const t = setTimeout(() => controller.abort(), 2500);
			const res = await fetch("http://localhost:11434/api/tags", {
				signal: controller.signal,
			});
			clearTimeout(t);
			if (res.ok) {
				setLocalPort("11434");
			} else {
				setLocalPort("");
				setShowOllamaMissingModal(true);
			}
		} catch {
			setLocalPort("");
			setShowOllamaMissingModal(true);
		} finally {
			setOllamaCheckPerformed(true);
		}
	};

	const isValidPort = (port: string): boolean => {
		// Only digits, length between 2 and 5
		return /^\d{2,5}$/.test((port || "").trim());
	};

	const normalizeToBaseUrl = (value?: string): string => {
		const raw = (value || "").trim();
		if (!raw) return "";
		if (/^\d{1,5}$/.test(raw)) return `http://localhost:${raw}`;
		if (/^localhost:\d{1,5}$/.test(raw)) return `http://${raw}`;
		if (/^https?:\/\//.test(raw)) return raw.replace(/\/$/, "");
		return raw;
	};

	const checkOllamaInstalled = async () => {
		try {
			const win = window as WindowWithShadowQuill;
			if (!win.shadowquill?.checkOllamaInstalled) {
				return;
			}
			const result = await win.shadowquill.checkOllamaInstalled();
			setOllamaInstalled(result.installed);
		} catch (e) {
			console.error("Failed to check Ollama installation:", e);
		}
	};

	const handleOpenOrInstallOllama = async () => {
		setIsOpeningOllama(true);
		setOpenOllamaError(null);

		try {
			const win = window as WindowWithShadowQuill;

			// Check if installed first
			if (ollamaInstalled === null) {
				await checkOllamaInstalled();
			}

			if (ollamaInstalled === false) {
				// Open download page
				window.open("https://ollama.com/download", "_blank");
				setIsOpeningOllama(false);
				return;
			}

			if (!win.shadowquill?.openOllama) {
				setOpenOllamaError(
					"This feature is only available in the desktop app.",
				);
				return;
			}

			const result = await win.shadowquill.openOllama();

			if (result.ok) {
				// Wait 3 seconds then retest the connection
				setTimeout(() => {
					setOpenOllamaError(null);
					void testLocalConnection();
				}, 3000);
			} else {
				setOpenOllamaError(result.error || "Failed to open Ollama");
			}
		} catch (e: unknown) {
			setOpenOllamaError(
				e instanceof Error ? e.message : "Failed to open Ollama",
			);
		} finally {
			setIsOpeningOllama(false);
		}
	};

	// Test connection to local Ollama server using specified baseUrl (or current localBaseUrl if not provided)
	// If configuredModel is provided, it will be selected if found in available models
	const testLocalConnection = async (
		baseUrlParam?: string,
		configuredModel?: string,
	) => {
		const url = normalizeToBaseUrl(baseUrlParam ?? localPort);
		if (!url) return;

		setTestingLocal(true);
		setLocalTestResult(null);
		const start = Date.now();

		try {
			const models = await listAvailableModels(url);
			const duration = Date.now() - start;

			const gemmaModels = models.filter(
				(m) => m?.name && /^gemma3\b/i.test(m.name),
			);
			const gemmaModelNames = gemmaModels.map((m) => m.name);
			setLocalTestResult({ success: true, url, models: gemmaModels, duration });
			setAvailableModels(gemmaModelNames);
			setConnectionError(null); // Clear connection error on success
			if (configuredModel && gemmaModelNames.includes(configuredModel)) {
				setModel(configuredModel as string);
			} else if (gemmaModelNames.length > 0) {
				setModel(gemmaModelNames[0] ?? "");
			} else {
				setModel("");
			}
		} catch (e: any) {
			const duration = Date.now() - start;
			setLocalTestResult({
				success: false,
				url,
				error: "Connection failed",
				duration,
			});
			setAvailableModels([]);
		} finally {
			setTestingLocal(false);
		}
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
							>
								<div className="modal-header">
									<div className="modal-title">
										{validating
											? "Validating Gemma 3 connection…"
											: "Loading Gemma 3 configuration…"}
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
								style={{ overflow: "hidden" }}
							>
								<div className="modal-header">
									<div className="modal-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
										<Icon name="gear" />
										<span>Ollama Connection Setup</span>
									</div>
								</div>
								<div className="modal-body" style={{ overflow: "hidden" }}>
									<form
										className="ollama-setup"
										onSubmit={async (e) => {
											e.preventDefault();
											setSaving(true);
											setError(null);
											try {
												const payload = {
													provider: "ollama",
													baseUrl: normalizeToBaseUrl(localPort),
													model,
												};
												writeLocalModelConfigClient(payload as any);
												// After saving validate immediately
												setValidating(true);
												try {
													const vjson =
														await validateLocalModelConnectionClient(
															payload as any,
														);
													if (vjson.ok) {
														setConfig(payload);
														setConnectionError(null);
														setPreviouslyConfigured(true);
														setShowProviderSelection(false);
														try {
															window.dispatchEvent(new Event("MODEL_CHANGED"));
														} catch {}
													} else {
														const errorMsg = vjson.error || "Connection failed";
														if (errorMsg === "model-not-found") {
															setConnectionError(
																`Model "${model}" not found in Ollama. Run: ollama pull ${model}`,
															);
														} else {
															setConnectionError(errorMsg);
														}
													}
												} finally {
													setValidating(false);
												}
											} catch (err) {
												setError(
													err instanceof Error ? err.message : "Unknown error",
												);
											} finally {
												setSaving(false);
											}
										}}
									>
										<section className="ollama-panel">
											<header className="ollama-panel__head">
												<div>
													<p className="ollama-panel__eyebrow">First-Time Setup</p>
													<h3>Connect to Ollama</h3>
													<p className="ollama-panel__subtitle">
														Configure your local Ollama connection to start using ShadowQuill.
													</p>
												</div>
												<span className={`ollama-status-chip ollama-status-chip--${
													testingLocal ? "loading" :
													localTestResult ? (localTestResult.success ? "success" : "error") :
													connectionError ? "error" : "idle"
												}`}>
													{testingLocal ? "Checking…" :
													localTestResult ? (localTestResult.success ? "Connected" : "Failed") :
													connectionError ? "Error" : "Ready"}
												</span>
											</header>

											<div className="ollama-panel__body">
												{previouslyConfigured && connectionError && (
													<div className="ollama-error-banner" role="alert" hidden>
														Previous configuration failed: {connectionError}. Please update and save again.
													</div>
												)}

												<div className="ollama-field">
													<label className="ollama-label" htmlFor="port">
														Ollama localhost Port
													</label>
													<div className="ollama-input-row">
														<input
															id="port"
															type="text"
															inputMode="numeric"
															pattern="[0-9]*"
															maxLength={5}
															value={localPort}
															onChange={(e) => {
																const raw = (e.target.value || "")
																	.replace(/\D/g, "")
																	.slice(0, 5);
																setLocalPort(raw);
																setLocalTestResult(null);
															}}
															required
															className="md-input"
															placeholder="11434"
															autoComplete="off"
														/>
														<button
															type="button"
															onClick={() => testLocalConnection()}
															disabled={testingLocal || !isValidPort(localPort)}
															className={`md-btn md-btn--primary ollama-field__action${!localTestResult?.success ? " pulse-glow" : ""}`}
															title="Check for available Ollama models"
															aria-label="Check for available Ollama models"
														>
															<Icon name="refresh" {...(testingLocal && { className: "md-spin" })} />
														</button>
													</div>
													<p className="ollama-field-hint">
														{normalizeToBaseUrl(localPort) || "Waiting for port value."}
													</p>
												</div>

												{localTestResult && (
													<div className={`ollama-status-card ollama-status-card--${localTestResult.success ? "success" : "error"}`}>
														<div className="ollama-status-card__icon">
															<Icon name={localTestResult.success ? "check" : "warning"} />
														</div>
														<div className="ollama-status-card__content">
															<div>
																<p className="ollama-status-card__title">
																	{localTestResult.success
																		? "Gemma 3 connection successful"
																		: "Connection failed"}
																</p>
																<p className="ollama-status-card__body">
																	{localTestResult.success
																		? "Found compatible Gemma 3 models ready for use."
																		: "Could not reach Ollama. Make sure it's running locally."}
																</p>
															</div>
															{!localTestResult.success && (
																<div className="ollama-status-card__actions">
																	<button
																		type="button"
																		onClick={handleOpenOrInstallOllama}
																		disabled={isOpeningOllama}
																		className="md-btn md-btn--primary"
																		title={
																			ollamaInstalled === false
																				? "Install Ollama from ollama.com"
																				: "Launch Ollama application"
																		}
																	>
																		{isOpeningOllama
																			? "Opening…"
																			: ollamaInstalled === false
																				? "Install Ollama"
																				: "Open Ollama"}
																	</button>
																	<button
																		type="button"
																		className="md-btn"
																		onClick={() => testLocalConnection()}
																		disabled={testingLocal}
																	>
																		Retry check
																	</button>
																</div>
															)}
															{openOllamaError && (
																<p className="ollama-error-inline">{openOllamaError}</p>
															)}
															{localTestResult.success &&
																localTestResult.models &&
																localTestResult.models.length > 0 && (
																	<div className="ollama-models-list">
																		{localTestResult.models.map((m) => {
																			const size = (
																				m.name.split(":")[1] || ""
																			).toUpperCase();
																			const readable = size ? `Gemma 3 ${size}` : m.name;
																			const sizeInGB = (
																				m.size /
																				(1024 * 1024 * 1024)
																			).toFixed(1);
																			return (
																				<div key={m.name} className="ollama-model-item">
																					<Icon name="check" />
																					<span className="ollama-model-name">{readable}</span>
																					<span className="ollama-model-size">{sizeInGB}GB</span>
																				</div>
																			);
																		})}
																	</div>
																)}
															{localTestResult.success &&
																localTestResult.models &&
																localTestResult.models.length === 0 && (
																	<p className="ollama-empty-note">
																		Connected, but Gemma 3 models have not been pulled yet.
																	</p>
																)}
														</div>
													</div>
												)}

												{!localTestResult && availableModels.length === 0 && (
													<div className="ollama-availability">
														No Gemma 3 models detected yet. After installing Ollama, run{" "}
														<code>ollama pull gemma3:4b</code> (or your preferred size) and
														retest.
													</div>
												)}

												{availableModels.length > 0 && (
													<div className="ollama-availability">
														Found <strong>{availableModels.length}</strong> usable model
														{availableModels.length > 1 ? "s" : ""}. Auto-selecting: <code>{model}</code>
													</div>
												)}
											</div>

											<footer className="ollama-panel__footer">
												<span>
													{saving || validating
														? "Validating connection…"
														: "Click below to finish setup and start using ShadowQuill."}
												</span>
												<button
													disabled={
														saving || validating || !model || model.trim() === ""
													}
													className={`md-btn md-btn--primary${localTestResult?.success ? " pulse-glow" : ""}`}
													style={{
														display: "flex",
														alignItems: "center",
														gap: "8px",
													}}
												>
													{saving || validating ? (
														"Validating…"
													) : (
														<>
															Start ShadowQuill
															<Icon name="chevron-right" />
														</>
													)}
												</button>
											</footer>
										</section>

										<aside className="ollama-guide">
											<div className="ollama-guide-card">
												<p className="ollama-panel__eyebrow">Quick Start</p>
												<h4>Get up and running</h4>
												<ol>
													<li>Install Ollama and launch the desktop app</li>
													<li>Pull a Gemma 3 build (4B fits most laptops)</li>
													<li>Keep Ollama running, then press "Check" above</li>
													<li>Click "Start ShadowQuill" once connected</li>
												</ol>
											</div>
											<div className="ollama-guide-card">
												<p className="ollama-panel__eyebrow">Privacy First</p>
												<ul>
													<li>All processing happens locally on your device</li>
													<li>No data sent to external servers</li>
													<li>Complete control over your AI interactions</li>
												</ul>
											</div>
										</aside>
									</form>
								</div>
							</div>
						) : null}
						{showOllamaMissingModal && (
							<div className="modal-backdrop-blur fixed inset-0 z-50 flex items-center justify-center">
								<div
									className="w-full max-w-lg rounded-xl border border-surface-a40 bg-surface-a10 p-6 text-light shadow-2xl"
									style={{ backgroundColor: "#1e2028", borderColor: "#2d3039" }}
								>
									<h2 className="mb-3 font-semibold text-lg text-primary-300">
										Ollama Not Detected
									</h2>
									<div className="mb-4 space-y-3 text-sm text-surface-400">
										<p>
											Hmm you don't seem to have <strong>Ollama</strong> running
											or installed.
										</p>
										<p>
											Make sure it is open and running in the background with
											your <code>gemma3</code> models pulled and downloaded.
										</p>
										<p>
											If you don't have Ollama, download it here:{" "}
											<a
												className="text-primary-300 underline"
												href="https://ollama.com/download"
												target="_blank"
												rel="noreferrer"
											>
												https://ollama.com/download
											</a>
										</p>
										<p className="text-[11px] text-surface-400">
											After installing & starting Ollama, pull a model e.g.:{" "}
											<code>ollama pull gemma3:4b</code>
										</p>
									</div>
									<div className="flex flex-wrap gap-3">
										<button
											onClick={() => setShowOllamaMissingModal(false)}
											className="interactive-glow flex-1 rounded-md bg-surface-200 py-2 font-medium text-sm hover:bg-surface-300"
										>
											<Icon name="close" />
										</button>
										<button
											onClick={retryOllamaDetection}
											className="interactive-glow flex-1 rounded-md bg-primary py-2 font-medium text-light text-sm hover:bg-primary-200"
										>
											Retry Detection
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
}: { children: React.ReactNode }) {
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
				// Load from local storage
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
			{/* System Prompt open controlled via global event */}
			<OpenSystemPromptsListener onOpen={() => setOpen(true)} />
			{children}
			{open && (
				<div className="modal-container">
					<div className="modal-backdrop-blur" onClick={() => setOpen(false)} />
					<div
						className="modal-content modal-content--large"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="modal-header">
							<div className="modal-title">Edit System Prompt</div>
							<button
								onClick={() => setOpen(false)}
								className="md-btn"
								style={{ padding: "6px 10px" }}
							>
								<Icon name="close" />
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
											} catch (err: any) {
												setError(err.message || "Unknown error");
											} finally {
												setSaving(false);
											}
										}}
									>
										<div className="system-prompts-field">
											<label className="system-prompts-label">
												System Prompt
											</label>
											<textarea
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
														} catch (err: any) {
															setError(err.message || "Unknown error");
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
		window.addEventListener("open-system-prompts", handler as any);
		return () =>
			window.removeEventListener("open-system-prompts", handler as any);
	}, [onOpen]);
	return null;
}

function OpenProviderSelectionListener({ onOpen }: { onOpen: () => void }) {
	useEffect(() => {
		const handler = () => onOpen();
		window.addEventListener("open-provider-selection", handler as any);
		return () =>
			window.removeEventListener("open-provider-selection", handler as any);
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
		window.addEventListener("open-data-location", handler as any);
		return () =>
			window.removeEventListener("open-data-location", handler as any);
	}, []);

	useEffect(() => {
		if (!open) return;
		const load = async () => {
			setLoading(true);
			setError(null);
			try {
				const api = (window as any).shadowquill;
				if (!api?.getDataPaths) {
					setPaths(null);
					setError("Not available outside the desktop app");
					return;
				}
				let res: any = null;
				try {
					res = await api.getDataPaths();
				} catch (e: any) {
					const msg = String(e?.message || "");
					if (msg.includes("No handler registered")) {
						setPaths(null);
						setError(
							"Main process not updated yet. Please fully quit and relaunch the app.",
						);
						return;
					}
					throw e;
				}
				if (res?.ok) {
					setPaths({
						userData: res.userData,
						localStorageDir: res.localStorageDir,
						localStorageLevelDb: res.localStorageLevelDb,
					});
				} else {
					setError(res?.error || "Failed to load data paths");
				}
			} catch (e: any) {
				setError(e?.message || "Failed to load data paths");
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
					<div className="modal-backdrop-blur" onClick={() => setOpen(false)} />
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<div className="modal-title">Local Data Management</div>
							<button
								onClick={() => setOpen(false)}
								className="md-btn"
								style={{ padding: "6px 10px" }}
							>
								<Icon name="close" />
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
											This will delete all local data (settings, sessions, presets)
											PERMANENTLY. Only use this if you want to start fresh.
										</div>
										<button
											className="md-btn md-btn--destructive"
											onClick={async () => {
												const ok = await confirm({
													title: "Factory Reset",
													message: "Delete ALL local data and restart?",
													confirmText: "Delete & Restart",
													cancelText: "Cancel",
													tone: "destructive",
												});
												if (!ok) return;
												setLoading(true);
												setError(null);
												try {
													const api = (window as any).shadowquill;
													const res = await api?.factoryReset?.();
													if (!res?.ok) {
														setError(res?.error || "Reset failed");
														setLoading(false);
														return;
													}
													// Give the factory reset a moment to fully complete
													await new Promise(resolve => setTimeout(resolve, 500));
													// Restart the app
													await api?.restartApp?.();
												} catch (e: any) {
													setError(e?.message || "Reset failed");
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
											<b>DELETE ALL LOCAL DATA</b>
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
