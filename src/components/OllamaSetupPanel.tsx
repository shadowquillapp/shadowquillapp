"use client";

import type { FormEvent } from "react";
import { formatOllamaModelName, isValidOllamaPort } from "@/lib/local-config";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import type { OllamaSetupState } from "./useOllamaSetup";

function GemmaBrandIcon() {
	return (
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
	);
}

const SETTINGS_STATUS_LABELS = {
	success: "Connected",
	error: "Needs attention",
	loading: "Checking…",
	idle: "Awaiting test",
} as const;

function gateStatusLabel(
	testingLocal: boolean,
	localTestResult: OllamaSetupState["localTestResult"],
	connectionError: string | null,
): string {
	if (testingLocal) return "Checking…";
	if (localTestResult) {
		return localTestResult.success ? "Connected" : "Failed";
	}
	if (connectionError) return "Error";
	return "Ready";
}

const STATUS_ICONS = {
	success: "check",
	error: "warning",
	loading: "refresh",
	idle: "info",
} as const;

function statusDetails(
	tone: OllamaSetupState["statusTone"],
	connectionError: string | null,
	localTestResult: OllamaSetupState["localTestResult"],
) {
	if (tone === "error") {
		return {
			title: "Connection failed",
			body:
				connectionError ||
				localTestResult?.error ||
				"Could not reach the Ollama runtime. Make sure it is running locally.",
		};
	}
	if (tone === "loading") {
		return {
			title: "Checking local Ollama endpoint",
			body: "Hang tight while we verify the connection and discover Gemma builds.",
		};
	}
	if (tone === "success") {
		return {
			title: "Gemma connection successful",
			body: "Found compatible Gemma models ready for use.",
		};
	}
	return { title: "", body: "" };
}

export type OllamaSetupPanelProps = {
	setup: OllamaSetupState;
	variant: "gate" | "settings";
	eyebrow: string;
	title: string;
	subtitle: string;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	portInputId?: string;
	showAvailabilitySummary?: boolean;
};

export function OllamaSetupPanel({
	setup,
	variant,
	eyebrow,
	title,
	subtitle,
	onSubmit,
	portInputId = "port",
	showAvailabilitySummary = variant === "gate",
}: OllamaSetupPanelProps) {
	const {
		localPort,
		setLocalPort,
		setLocalTestResult,
		model,
		saving,
		validating,
		error,
		connectionError,
		testingLocal,
		localTestResult,
		testLocalConnection,
		handleOpenOrInstallOllama,
		isOpeningOllama,
		openOllamaError,
		ollamaInstalled,
		statusTone,
		portInvalid,
		normalizedBaseUrl,
		canSave,
		hasModels,
		availableModels,
	} = setup;

	const details = statusDetails(statusTone, connectionError, localTestResult);
	const showStatusCard = variant === "settings" || localTestResult !== null;
	const statusLabel =
		variant === "gate"
			? gateStatusLabel(testingLocal, localTestResult, connectionError)
			: SETTINGS_STATUS_LABELS[statusTone];

	return (
		<form className="shadowquill-setup" onSubmit={onSubmit}>
			<section className="shadowquill-panel">
				<header className="shadowquill-panel__head">
					<div>
						<p className="shadowquill-panel__eyebrow">{eyebrow}</p>
						<h3>{title}</h3>
						<p className="shadowquill-panel__subtitle">{subtitle}</p>
					</div>
					<span
						className={`shadowquill-status-chip shadowquill-status-chip--${statusTone}`}
					>
						{statusLabel}
					</span>
				</header>

				<div className="shadowquill-panel__body">
					<div className="shadowquill-field">
						<label className="shadowquill-label" htmlFor={portInputId}>
							Ollama localhost Port
						</label>
						<div className="shadowquill-input-row">
							<input
								id={portInputId}
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
								disabled={testingLocal || !isValidOllamaPort(localPort)}
								className={[
									"md-btn",
									"md-btn--primary",
									"shadowquill-field__action",
									statusTone !== "success" && "pulse-glow",
								]
									.filter(Boolean)
									.join(" ")}
								title="Check for available Ollama models"
								aria-label="Check for available Ollama models"
							>
								<Icon
									name="refresh"
									{...(testingLocal && {
										className: "shadowquill-refresh-spin",
									})}
								/>
							</button>
						</div>
						<p className="shadowquill-field-hint" aria-live="polite">
							{portInvalid
								? "Enter a valid port (2-5 digits)."
								: normalizedBaseUrl || "Waiting for a port value."}
						</p>
					</div>

					{showStatusCard && (
						<div
							className={`shadowquill-status-card shadowquill-status-card--${statusTone}`}
							aria-live="polite"
						>
							<div className="shadowquill-status-card__icon">
								{statusTone === "success" ? (
									<GemmaBrandIcon />
								) : (
									<Icon
										name={STATUS_ICONS[statusTone]}
										{...(statusTone === "loading" && { className: "md-spin" })}
									/>
								)}
							</div>
							<div className="shadowquill-status-card__content">
								<div>
									<p className="shadowquill-status-card__title">
										{details.title}
									</p>
									<p className="shadowquill-status-card__body">
										{details.body}
									</p>
								</div>
								{statusTone === "success" &&
									localTestResult?.models &&
									localTestResult.models.length > 0 && (
										<div className="shadowquill-models-list">
											{localTestResult.models.map((m) => {
												const readable = formatOllamaModelName(m.name);
												const sizeInGB = (
													m.size /
													(1024 * 1024 * 1024)
												).toFixed(1);
												return (
													<div key={m.name} className="shadowquill-model-item">
														<Icon name="check" />
														<span className="shadowquill-model-name">
															{readable}
														</span>
														<span className="shadowquill-model-size">
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
										<p className="shadowquill-empty-note">
											Connected, but Gemma models have not been pulled yet.
										</p>
									)}
								{statusTone === "error" && (
									<div className="shadowquill-status-card__actions">
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
									<p className="shadowquill-error-inline">{openOllamaError}</p>
								)}
							</div>
						</div>
					)}

					{((variant === "gate" &&
						!localTestResult &&
						availableModels.length === 0) ||
						(variant === "settings" &&
							!hasModels &&
							statusTone === "success")) && (
						<div className="shadowquill-availability" aria-live="polite">
							No compatible Gemma models detected yet. After installing Ollama,
							run <code>ollama pull gemma4</code> (or your preferred tag) and
							retest.
						</div>
					)}

					{showAvailabilitySummary && availableModels.length > 0 && (
						<div className="shadowquill-availability">
							Found <strong>{availableModels.length}</strong> usable model
							{availableModels.length > 1 ? "s" : ""}. Auto-selecting:{" "}
							<code>{model}</code>
						</div>
					)}

					{error && (
						<div className="shadowquill-error-banner" role="alert">
							{error}
						</div>
					)}
					{connectionError && (
						<div className="shadowquill-error-banner" role="alert">
							{connectionError}
						</div>
					)}
				</div>

				<footer
					className="shadowquill-panel__footer"
					style={
						variant === "gate" ? { justifyContent: "flex-start" } : undefined
					}
				>
					{variant === "settings" && (
						<span>
							{saving || validating
								? "Validating secure connection…"
								: "Save to apply this Ollama endpoint globally."}
						</span>
					)}
					<button
						type="submit"
						disabled={!canSave}
						className={[
							"md-btn",
							"md-btn--primary",
							variant === "gate" && localTestResult?.success && "pulse-glow",
						]
							.filter(Boolean)
							.join(" ")}
						style={
							variant === "gate"
								? { display: "flex", alignItems: "center", gap: "8px" }
								: undefined
						}
					>
						{saving || validating ? (
							"Validating…"
						) : variant === "gate" ? (
							<>
								<Logo className="shadowquill-cta-logo" />
								Get Started
							</>
						) : (
							"Save changes"
						)}
					</button>
				</footer>
			</section>
		</form>
	);
}
