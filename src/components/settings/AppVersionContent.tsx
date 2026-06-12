/** @jsxImportSource react */
"use client";
import { useState } from "react";
import { Icon } from "@/components/Icon";
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
			const result = await window.shadowquill?.checkForUpdates?.();
			if (result) setUpdateResult(result);
		} catch (error) {
			setUpdateResult({
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		} finally {
			setIsChecking(false);
		}
	};

	const handleOpenGitHubRepo = async () => {
		try {
			await window.shadowquill?.openExternalUrl?.(
				"https://github.com/shadowquillapp/shadowquillapp",
			);
		} catch (error) {
			console.error("Failed to open URL:", error);
		}
	};

	const handleOpenReleaseUrl = async () => {
		if (updateResult?.releaseUrl) {
			try {
				await window.shadowquill?.openExternalUrl?.(updateResult.releaseUrl);
			} catch (error) {
				console.error("Failed to open URL:", error);
			}
		}
	};

	const statusBannerClass = updateResult?.success
		? updateResult.updateAvailable
			? "status-banner status-banner--warning"
			: "status-banner status-banner--success"
		: "status-banner status-banner--error";

	return (
		<div className="shadowquill-setup">
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
						<div className="md-input md-input--readonly font-mono font-semibold">
							{APP_VERSION}
						</div>
					</div>

					<div className="shadowquill-field mt-6">
						<div className="flex items-center gap-3">
							<div className="shadowquill-label">Check for Updates</div>
							<button
								type="button"
								onClick={handleCheckForUpdates}
								disabled={isChecking}
								className="md-icon-btn disabled:cursor-wait disabled:opacity-60"
								title={isChecking ? "Checking..." : "Check for Updates"}
								aria-label={isChecking ? "Checking..." : "Check for Updates"}
							>
								<Icon
									name="refresh"
									className={`h-5 w-5 ${isChecking ? "md-spin" : ""}`}
								/>
							</button>
						</div>

						{updateResult && (
							<div className={`${statusBannerClass} mt-4`}>
								{updateResult.success ? (
									updateResult.updateAvailable ? (
										<>
											<div className="status-banner__title">
												Update Available!
											</div>
											<div className="status-banner__body">
												Version {updateResult.latestVersion} is now available.
												You are currently running version{" "}
												{updateResult.currentVersion}.
											</div>
											{updateResult.publishedAt && (
												<div className="status-banner__meta">
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
												className="md-btn mt-3"
											>
												Download Latest Version
											</button>
										</>
									) : (
										<>
											<div className="status-banner__title">
												You're up to date!
											</div>
											<div className="status-banner__body">
												You are running the latest version (
												{updateResult.currentVersion}).
											</div>
										</>
									)
								) : (
									<>
										<div className="status-banner__title">
											Error Checking for Updates
										</div>
										<div className="status-banner__body">
											{updateResult.error || "Unknown error occurred"}
										</div>
									</>
								)}
								<button
									type="button"
									onClick={handleOpenGitHubRepo}
									className="md-link mt-3 border-none bg-transparent p-0"
								>
									github.com/shadowquillapp/shadowquillapp
								</button>
							</div>
						)}
					</div>
				</div>
			</section>
		</div>
	);
}
