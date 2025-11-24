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
				? `Connected`
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
						provider: "ollama",
						baseUrl: normalizeToBaseUrl(localPort),
						model,
					};
					writeLocalModelConfigClient(payload as any);
					setValidating(true);
					try {
						const vjson = await validateLocalModelConnectionClient(
							payload as any,
						);
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
									const raw = (e.target.value || "").replace(/\D/g, "").slice(
										0,
										5,
									);
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
								{...(testingLocal && { className: "md-spin" })}
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
						<Icon
							name={statusIconMap[statusTone]}
							{...(statusTone === "loading" && { className: "md-spin" })}
						/>
					</div>
						<div className="ollama-status-card__content">
							<div>
								<p className="ollama-status-card__title">{statusDetails.title}</p>
								<p className="ollama-status-card__body">{statusDetails.body}</p>
							</div>
							{statusTone === "success" &&
								localTestResult?.models &&
								localTestResult.models.length > 0 && (
								<div className="ollama-models-list">
									{localTestResult.models.map((m) => {
										const size = (m.name.split(":")[1] || "").toUpperCase();
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

					{hasModels && (
						<div className="ollama-field">
							<label className="ollama-label">
								Choose a Gemma build
								<span>
									ShadowQuill will default to the first model if none is chosen.
								</span>
							</label>
							<div style={{ maxWidth: "280px" }}>
								<CustomSelect
									value={model}
									onChange={setModel}
									options={availableModels.map((m) => ({
										value: m,
										label: m,
									}))}
									placeholder="Select model"
									aria-label="Choose Gemma model"
								/>
							</div>
							{selectedModelMetadata && (
								<p className="ollama-field-hint">
									Approx. download size: {formattedModelSize}GB · Path:{" "}
									{selectedModelMetadata.name}
								</p>
							)}
						</div>
					)}

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
					<button disabled={!canSave} className="md-btn md-btn--primary">
						{saving || validating ? "Validating…" : "Save changes"}
					</button>
				</footer>
			</section>

			<aside className="ollama-guide">
				<div className="ollama-guide-card">
					<p className="ollama-panel__eyebrow">Quick checklist</p>
					<h4>Ready your workstation</h4>
					<ol>
						<li>Install Ollama and launch the desktop app.</li>
						<li>Pull a Gemma 3 build (4B fits most laptops).</li>
						<li>Keep Ollama running, then press “Check” above.</li>
					</ol>
				</div>
				<div className="ollama-guide-card">
					<p className="ollama-panel__eyebrow">Power tips</p>
					<ul>
						<li>
							Ollama defaults to <code>http://localhost:11434</code>, but any
							HTTP host/port works.
						</li>
						<li>
							Need to reset quickly? Run <code>ollama rm gemma3:*</code> to clear
							old downloads.
						</li>
						<li>
							If you prefer CPU-only inference, pick the smallest Gemma variant
							for smoother runs.
						</li>
					</ul>
				</div>
			</aside>
		</form>
	);
}
