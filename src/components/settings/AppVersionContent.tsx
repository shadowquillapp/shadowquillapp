/** @jsxImportSource react */
"use client";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { APP_VERSION } from "@/lib/version";

interface UpdateCheckResult {
	success: boolean;
	currentVersion?: string;
	latestVersion?: string;
	updateAvailable?: boolean;
	releaseUrl?: string;
	releaseNotes?: string;
	publishedAt?: string;
	error?: string;
}

export default function AppVersionContent() {
	const [isChecking, setIsChecking] = useState(false);
	const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(
		null,
	);

	const handleCheckForUpdates = async () => {
		setIsChecking(true);
		setUpdateResult(null);

		try {
			// @ts-expect-error - window.shadowquill is defined in preload
			const result = await window.shadowquill.checkForUpdates();
			setUpdateResult(result);
		} catch (error) {
			setUpdateResult({
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		} finally {
			setIsChecking(false);
		}
	};

	const handleOpenReleaseUrl = async () => {
		if (updateResult?.releaseUrl) {
			try {
				// @ts-expect-error - window.shadowquill is defined in preload
				await window.shadowquill.openExternalUrl(updateResult.releaseUrl);
			} catch (error) {
				console.error("Failed to open URL:", error);
			}
		}
	};

	return (
		<div className="shadowquill-setup">
			<style>{`
				@keyframes spin {
					from {
						transform: rotate(0deg);
					}
					to {
						transform: rotate(360deg);
					}
				}
				.animate-spin {
					animation: spin 1s linear infinite;
				}
			`}</style>
			<section className="shadowquill-panel">
				<header className="shadowquill-panel__head">
					<div>
						<p className="shadowquill-panel__eyebrow">
							Application Information
						</p>
						<h3>ShadowQuill Version</h3>
					</div>
				</header>

				<div className="shadowquill-panel__body">
					<div className="shadowquill-field">
						<div className="shadowquill-label">Current Version</div>
						<div
							className="md-input"
							style={{
								fontFamily: "var(--font-mono, monospace)",
								fontSize: "16px",
								fontWeight: 600,
								padding: "12px 16px",
								background: "var(--color-surface)",
							}}
						>
							{APP_VERSION}
						</div>
					</div>

					<div className="shadowquill-field" style={{ marginTop: "24px" }}>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "12px",
							}}
						>
							<div className="shadowquill-label">Check for Updates</div>
							<button
								type="button"
								onClick={handleCheckForUpdates}
								disabled={isChecking}
								className="md-btn"
								style={{
									padding: "8px",
									opacity: isChecking ? 0.6 : 1,
									cursor: isChecking ? "wait" : "pointer",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									minWidth: "36px",
									minHeight: "36px",
								}}
								title={isChecking ? "Checking..." : "Check for Updates"}
								aria-label={isChecking ? "Checking..." : "Check for Updates"}
							>
								<ArrowPathIcon
									className={`h-5 w-5 ${isChecking ? "animate-spin" : ""}`}
								/>
							</button>
						</div>

						{updateResult && (
							<div
								style={{
									marginTop: "16px",
									padding: "16px",
									borderRadius: "8px",
									background: updateResult.success
										? updateResult.updateAvailable
											? "rgba(255, 193, 7, 0.1)"
											: "rgba(76, 175, 80, 0.1)"
										: "rgba(244, 67, 54, 0.1)",
									border: updateResult.success
										? updateResult.updateAvailable
											? "1px solid rgba(255, 193, 7, 0.3)"
											: "1px solid rgba(76, 175, 80, 0.3)"
										: "1px solid rgba(244, 67, 54, 0.3)",
								}}
							>
								{updateResult.success ? (
									updateResult.updateAvailable ? (
										<>
											<div
												style={{
													fontSize: "16px",
													fontWeight: 600,
													marginBottom: "8px",
													color: "rgba(255, 193, 7, 1)",
												}}
											>
												Update Available!
											</div>
											<div style={{ marginBottom: "12px" }}>
												Version {updateResult.latestVersion} is now available.
												You are currently running version{" "}
												{updateResult.currentVersion}.
											</div>
											{updateResult.publishedAt && (
												<div
													style={{
														fontSize: "14px",
														opacity: 0.7,
														marginBottom: "12px",
													}}
												>
													Released:{" "}
													{new Date(
														updateResult.publishedAt,
													).toLocaleDateString(undefined, {
														year: "numeric",
														month: "long",
														day: "numeric",
													})}
												</div>
											)}
											<button
												type="button"
												onClick={handleOpenReleaseUrl}
												className="md-btn"
												style={{
													padding: "8px 16px",
													background: "rgba(255, 193, 7, 0.2)",
													border: "1px solid rgba(255, 193, 7, 0.4)",
												}}
											>
												Download Latest Version
											</button>
										</>
									) : (
										<>
											<div
												style={{
													fontSize: "16px",
													fontWeight: 600,
													color: "rgba(76, 175, 80, 1)",
												}}
											>
												You're up to date!
											</div>
											<div style={{ marginTop: "4px" }}>
												You are running the latest version (
												{updateResult.currentVersion}).
											</div>
										</>
									)
								) : (
									<>
										<div
											style={{
												fontSize: "16px",
												fontWeight: 600,
												marginBottom: "4px",
												color: "rgba(244, 67, 54, 1)",
											}}
										>
											Error Checking for Updates
										</div>
										<div>{updateResult.error || "Unknown error occurred"}</div>
									</>
								)}
							</div>
						)}
					</div>
				</div>
			</section>
		</div>
	);
}
