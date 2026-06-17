"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import {
	DEFAULT_OLLAMA_PORT,
	formatOllamaModelName,
	isValidOllamaPort,
} from "@/lib/local-config";
import { Icon } from "./Icon";
import type { OllamaSetupState } from "./useOllamaSetup";

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
	localTestResult: OllamaSetupState["localTestResult"],
) {
	if (tone === "error") {
		return {
			title: "Connection failed",
			body: "No compatible Gemma models detected yet. Make sure you have Ollama installed and running with a compatible Gemma model.",
		};
	}
	if (tone === "loading") {
		return {
			title: "Checking local Ollama endpoint",
			body: "Hang tight while we verify the connection and discover Gemma builds.",
		};
	}
	if (tone === "success") {
		const hasGemmaModels =
			localTestResult?.models != null && localTestResult.models.length > 0;
		if (hasGemmaModels) {
			return {
				title: "Gemma connection successful",
				body: "Found compatible Gemma models ready for use.",
			};
		}
		return {
			title: "Ollama connected",
			body: "No compatible Gemma models found. Pull one to get started.",
		};
	}
	return { title: "", body: "" };
}

function getChecklistSteps(setup: OllamaSetupState) {
	const {
		ollamaInstalled,
		localTestResult,
		availableModels,
		statusTone,
		model,
	} = setup;

	const step1Done = ollamaInstalled === true;
	const step2Done = localTestResult?.success === true;
	const step3Done = availableModels.length > 0;
	const step4Done = statusTone === "success" && model.trim() !== "";

	const steps = [
		{ id: 1, label: "Install Ollama", done: step1Done },
		{ id: 2, label: "Start Ollama", done: step2Done },
		{ id: 3, label: "Pull a compatible model", done: step3Done },
		{ id: 4, label: "Select a model and save", done: step4Done },
	];

	let firstActiveFound = false;
	return steps.map((s) => {
		if (s.done) return { ...s, state: "done" as const };
		if (!firstActiveFound) {
			firstActiveFound = true;
			return { ...s, state: "active" as const };
		}
		return { ...s, state: "pending" as const };
	});
}

function CopyableCommand({ command }: { command: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<div style={{ position: "relative" }}>
			<code
				className="shadowquill-pull-guidance__cmd"
				style={{ paddingRight: "36px" }}
			>
				{command}
			</code>
			<button
				type="button"
				onClick={() => {
					void navigator.clipboard.writeText(command);
					setCopied(true);
					setTimeout(() => setCopied(false), 2000);
				}}
				className="md-icon-btn"
				title="Copy command"
				aria-label="Copy command"
				style={{
					position: "absolute",
					right: "4px",
					top: "50%",
					transform: "translateY(-50%)",
					width: "28px",
					height: "28px",
				}}
			>
				<Icon
					name={copied ? "check" : "copy"}
					variant="Linear"
					style={{ width: 14, height: 14 }}
				/>
			</button>
		</div>
	);
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
		availableModels,
	} = setup;

	const isGate = variant === "gate";
	const isSettings = variant === "settings";
	const clearTestResult = () => setLocalTestResult(null);

	const details = statusDetails(statusTone, localTestResult);
	const showStatusCard = isSettings || localTestResult !== null;
	const statusLabel = isGate
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
					{isSettings && (
						<div className="shadowquill-checklist">
							{getChecklistSteps(setup).map((step) => (
								<div
									key={step.id}
									className={`shadowquill-checklist-item shadowquill-checklist-item--${step.state}`}
								>
									<div className="shadowquill-checklist-icon">
										{step.state === "done" ? (
											<Icon name="check" />
										) : step.state === "active" ? (
											<Icon name="info" />
										) : (
											<div className="shadowquill-checklist-dot" />
										)}
									</div>
									<span className="shadowquill-checklist-label">
										{step.label}
									</span>
								</div>
							))}
						</div>
					)}

					<div className="shadowquill-field">
						<label className="shadowquill-label" htmlFor={portInputId}>
							Ollama localhost port
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
									clearTestResult();
								}}
								required
								className="md-input shadowquill-port-input"
								placeholder={DEFAULT_OLLAMA_PORT}
								autoComplete="off"
							/>
							<button
								type="button"
								onClick={() => testLocalConnection()}
								disabled={testingLocal || !isValidOllamaPort(localPort)}
								className="md-icon-btn shadowquill-port-check disabled:cursor-wait disabled:opacity-60"
								title="Check for available Ollama models"
								aria-label="Check for available Ollama models"
							>
								<Icon
									name="refresh"
									variant="Linear"
									style={{ width: 16, height: 16 }}
									{...(testingLocal && {
										className: "shadowquill-refresh-spin",
									})}
								/>
							</button>
						</div>
						<div className="shadowquill-field-meta">
							<p className="shadowquill-field-hint" aria-live="polite">
								{portInvalid
									? "Enter a valid port (2-5 digits)."
									: normalizedBaseUrl || "Waiting for a port value."}
							</p>
							{localPort !== DEFAULT_OLLAMA_PORT && (
								<button
									type="button"
									className="md-btn shadowquill-port-reset"
									onClick={() => {
										setLocalPort(DEFAULT_OLLAMA_PORT);
										clearTestResult();
									}}
								>
									Reset to {DEFAULT_OLLAMA_PORT}
								</button>
							)}
						</div>
					</div>

					{showStatusCard && (
						<div
							className={`shadowquill-status-card shadowquill-status-card--${statusTone}`}
							aria-live="polite"
						>
							<div className="shadowquill-status-card__icon">
								<Icon
									name={STATUS_ICONS[statusTone]}
									variant="Linear"
									{...(statusTone === "loading" && { className: "md-spin" })}
								/>
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
								{(statusTone === "error" ||
									(statusTone === "success" &&
										(localTestResult?.models?.length ?? 0) === 0)) && (
									<div className="shadowquill-pull-guidance">
										<p className="shadowquill-pull-guidance__title">
											No compatible model yet? Pull one from your terminal:
										</p>
										<CopyableCommand command="ollama pull gemma3:4b" />
										<p className="shadowquill-pull-guidance__hint">
											Gemma 3 4B is a small, fast starting point. Once it
											finishes downloading, click "Retry check" above.
										</p>
									</div>
								)}
								{openOllamaError && (
									<p className="shadowquill-error-inline">{openOllamaError}</p>
								)}
							</div>
						</div>
					)}

					{showAvailabilitySummary && availableModels.length > 0 && (
						<div className="shadowquill-availability">
							Found <strong>{availableModels.length}</strong> usable model
							{availableModels.length > 1 ? "s" : ""}. Auto-selecting:{" "}
							<code>{model}</code>
						</div>
					)}

					{(
						[
							["error", error],
							["connection", connectionError],
						] as const
					)
						.filter(([, message]) => message)
						.map(([key, message]) => (
							<div key={key} className="shadowquill-error-banner" role="alert">
								{message}
							</div>
						))}
				</div>

				<footer
					className="shadowquill-panel__footer"
					style={isGate ? { justifyContent: "flex-start" } : undefined}
				>
					{isSettings && (
						<span>
							{saving || validating
								? "Validating secure connection…"
								: "Save to apply this Ollama endpoint globally."}
						</span>
					)}
					<button
						type="submit"
						disabled={!canSave}
						className="md-btn md-btn--primary"
						style={
							isGate
								? { display: "flex", alignItems: "center", gap: "8px" }
								: undefined
						}
					>
						{saving || validating ? (
							"Validating…"
						) : isGate ? (
							<>
								<Icon name="brush" className="shadowquill-cta-logo" />
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
