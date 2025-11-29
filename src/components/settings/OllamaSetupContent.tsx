"use client";
import {
	listAvailableModels,
	readLocalModelConfig as readLocalModelConfigClient,
	validateLocalModelConnection as validateLocalModelConnectionClient,
	writeLocalModelConfig as writeLocalModelConfigClient,
} from "@/lib/local-config";
import React, { useEffect, useMemo, useState } from "react";
import { CustomSelect } from "../CustomSelect";
import { Icon } from "../Icon";

type TestResult = null | {
	success: boolean;
	url: string;
	models?: Array<{ name: string; size: number }>;
	error?: string;
	duration?: number;
};

interface WindowWithShadowQuill extends Window {
	shadowquill?: {
		checkOllamaInstalled?: () => Promise<{ installed: boolean }>;
		openOllama?: () => Promise<{ ok: boolean; error?: string }>;
	};
}

export default function OllamaSetupContent() {
	const [localPort, setLocalPort] = useState<string>("11434");
	const [model, setModel] = useState<string>("");
	const [saving, setSaving] = useState(false);
	const [validating, setValidating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [connectionError, setConnectionError] = useState<string | null>(null);
	const [testingLocal, setTestingLocal] = useState(false);
	const [localTestResult, setLocalTestResult] = useState<TestResult>(null);
	const [availableModels, setAvailableModels] = useState<string[]>([]);
	const [isOpeningOllama, setIsOpeningOllama] = useState(false);
	const [openOllamaError, setOpenOllamaError] = useState<string | null>(null);
	const [ollamaInstalled, setOllamaInstalled] = useState<boolean | null>(null);

	useEffect(() => {
		const load = async () => {
			try {
				await checkOllamaInstalled();
				const cfg = readLocalModelConfigClient();
				if (cfg?.provider === "ollama") {
					const base = String(cfg.baseUrl || "http://localhost:11434");
					const portMatch = base.match(/:(\d{1,5})/);
					setLocalPort(portMatch?.[1] ?? "11434");
					await testLocalConnection(cfg.baseUrl, cfg.model);
				}
			} catch {
				// ignore
			}
		};
		void load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const isValidPort = (port: string): boolean => {
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
		} catch {
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

	const canSave = useMemo(() => {
		return !saving && !validating && model.trim() !== "";
	}, [saving, validating, model]);

	const hasModels = availableModels.length > 0;
	const normalizedBaseUrl = normalizeToBaseUrl(localPort);
	const portInvalid = Boolean(localPort) && !isValidPort(localPort);
	const statusTone: "success" | "error" | "loading" | "idle" = testingLocal
		? "loading"
		: localTestResult
			? localTestResult.success
				? "success"
				: "error"
			: connectionError
				? "error"
				: "idle";
	const statusLabelMap = {
		success:
			statusTone === "success" && availableModels.length > 0
				? "Connected"
				: "Connected",
		error: "Needs attention",
		loading: "Checking…",
		idle: "Awaiting test",
	} as const;
	const statusIconMap = {
		success: "check",
		error: "warning",
		loading: "refresh",
		idle: "info",
	} as const;
	const statusDetails =
		statusTone === "error"
			? {
					title: "Connection failed",
					body:
						connectionError ||
						localTestResult?.error ||
						"Could not reach the Ollama runtime. Make sure it is running locally.",
				}
			: statusTone === "loading"
				? {
						title: "Checking local Ollama endpoint",
						body: "Hang tight while we verify the connection and discover Gemma builds.",
					}
				: statusTone === "success"
					? {
							title: "Gemma 3 connection successful",
							body: "Found compatible Gemma 3 models ready for use.",
						}
					: {
							title: "",
							body: "",
						};
	const selectedModelMetadata = localTestResult?.models?.find(
		(m) => m.name === model,
	);
	const formattedModelSize = selectedModelMetadata
		? (selectedModelMetadata.size / (1024 * 1024 * 1024)).toFixed(1)
		: null;

	return (
		<form
			data-provider-form="true"
			onSubmit={async (e) => {
				e.preventDefault();
				setSaving(true);
				setError(null);
				try {
					const payload = {
						provider: "ollama" as const,
						baseUrl: normalizeToBaseUrl(localPort),
						model,
					};
					writeLocalModelConfigClient(payload);
					setValidating(true);
					try {
						const vjson = await validateLocalModelConnectionClient(payload);
						if (vjson.ok) {
							setConnectionError(null);
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
					setError(err instanceof Error ? err.message : "Unknown error");
				} finally {
					setSaving(false);
				}
			}}
			className="ollama-setup"
		>
			<section className="ollama-panel">
				<header className="ollama-panel__head">
					<div>
						<p className="ollama-panel__eyebrow">Local inference (Gemma 3)</p>
						<h3>Secure Ollama bridge</h3>
						<p className="ollama-panel__subtitle">
							Run ShadowQuill fully offline by pointing to your local Ollama
							instance.
						</p>
					</div>
					<span
						className={`ollama-status-chip ollama-status-chip--${statusTone}`}
					>
						{statusLabelMap[statusTone]}
					</span>
				</header>

				<div className="ollama-panel__body">
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
								className={`md-btn md-btn--primary ollama-field__action${statusTone !== "success" ? " pulse-glow" : ""}`}
								title="Check for available Ollama models"
								aria-label="Check for available Ollama models"
							>
								<Icon
									name="refresh"
									{...(testingLocal && { className: "ollama-refresh-spin" })}
								/>
							</button>
						</div>
						<p className="ollama-field-hint" aria-live="polite">
							{portInvalid
								? "Enter a valid port (2-5 digits)."
								: normalizedBaseUrl || "Waiting for a port value."}
						</p>
					</div>

					<div
						className={`ollama-status-card ollama-status-card--${statusTone}`}
						aria-live="polite"
					>
						<div className="ollama-status-card__icon">
							{statusTone === "success" ? (
								<svg
									viewBox="0 0 24 24"
									fill="currentColor"
									aria-hidden="true"
									style={{ width: "16px", height: "16px" }}
								>
									<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
									<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
									<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
									<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
								</svg>
							) : (
								<Icon
									name={statusIconMap[statusTone]}
									{...(statusTone === "loading" && { className: "md-spin" })}
								/>
							)}
						</div>
						<div className="ollama-status-card__content">
							<div>
								<p className="ollama-status-card__title">
									{statusDetails.title}
								</p>
								<p className="ollama-status-card__body">{statusDetails.body}</p>
							</div>
							{statusTone === "success" &&
								localTestResult?.models &&
								localTestResult.models.length > 0 && (
									<div className="ollama-models-list">
										{localTestResult.models.map((m) => {
											const size = (m.name.split(":")[1] || "").toUpperCase();
											const readable = size ? `Gemma 3 ${size}` : m.name;
											const sizeInGB = (m.size / (1024 * 1024 * 1024)).toFixed(
												1,
											);
											return (
												<div key={m.name} className="ollama-model-item">
													<Icon name="check" />
													<span className="ollama-model-name">{readable}</span>
													<span className="ollama-model-size">
														{sizeInGB}GB
													</span>
												</div>
											);
										})}
									</div>
								)}
							{statusTone === "success" &&
								localTestResult?.models &&
								localTestResult.models.length === 0 && (
									<p className="ollama-empty-note">
										Connected, but Gemma 3 models have not been pulled yet.
									</p>
								)}
							{statusTone === "error" && (
								<div className="ollama-status-card__actions">
									<button
										type="button"
										onClick={handleOpenOrInstallOllama}
										disabled={isOpeningOllama}
										className="md-btn md-btn--primary"
										title={
											ollamaInstalled === false
												? "Install Ollama from ollama.com"
												: "Launch the Ollama desktop application"
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
						</div>
					</div>

					{!hasModels && statusTone === "success" && (
						<div className="ollama-availability" aria-live="polite">
							No Gemma 3 models detected yet. After installing Ollama, run{" "}
							<code>ollama pull gemma3:4b</code> (or your preferred size) and
							retest.
						</div>
					)}

					{error && (
						<div className="ollama-error-banner" role="alert">
							{error}
						</div>
					)}
					{connectionError && (
						<div className="ollama-error-banner" role="alert">
							{connectionError}
						</div>
					)}
				</div>

				<footer className="ollama-panel__footer">
					<span>
						{saving || validating
							? "Validating secure connection…"
							: "Save to apply this Ollama endpoint globally."}
					</span>
					<button
						type="submit"
						disabled={!canSave}
						className="md-btn md-btn--primary"
					>
						{saving || validating ? "Validating…" : "Save changes"}
					</button>
				</footer>
			</section>

			<aside className="ollama-guide">
				<div className="ollama-guide-card">
					<p className="ollama-panel__eyebrow">Checklist</p>
					<h4>Ready your workstation</h4>
					<ol>
						<li>Install Ollama and launch the desktop app</li>
						<li>Pull a Gemma 3 build (4B fits most machines)</li>
						<li>Keep Ollama running in the background</li>
					</ol>
				</div>
				<div className="ollama-guide-card">
					<p className="ollama-panel__eyebrow">Tips</p>
					<ul>
						<li>
							Ollama defaults to <code>http://localhost:11434</code>
						</li>
						<li>
							Need to reset/remove models quickly? Run{" "}
							<code>ollama rm gemma3:*</code> to clear old downloads
						</li>
						<li>
							If you prefer CPU-only inference, pick the smallest Gemma variant
							for smoother runs (e.g. gemma3:4b)
						</li>
					</ul>
				</div>
			</aside>
		</form>
	);
}
