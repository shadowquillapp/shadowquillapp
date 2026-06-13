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

function GitHubLogo() {
	return (
		<svg
			aria-hidden="true"
			className="app-version-github__logo"
			viewBox="0 0 24 24"
			fill="currentColor"
		>
			<path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.5v-1.9c-2.78.62-3.37-1.22-3.37-1.22-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.57 2.34 1.12 2.91.86.09-.66.35-1.12.63-1.37-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.37 9.37 0 0 1 12 6.95c.85 0 1.7.12 2.5.34 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.56 5.06.36.32.68.94.68 1.9v2.81c0 .28.18.61.69.5A10.15 10.15 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
		</svg>
	);
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
						<h3>
							ShadowQuill{" "}
							<span className="font-mono font-semibold">v{APP_VERSION}</span>
						</h3>
						<div className="app-version-github mt-3">
							<button
								type="button"
								onClick={handleOpenGitHubRepo}
								className="md-icon-btn app-version-github__button"
								aria-label="Open GitHub repository"
								title="Open GitHub repository"
							>
								<GitHubLogo />
							</button>
							<button
								type="button"
								onClick={handleOpenGitHubRepo}
								className="status-banner__meta app-version-github__text"
							>
								Check GitHub for download/reinstallation instructions.
							</button>
						</div>
					</div>
				</header>

				<div className="shadowquill-panel__body">
					<div className="shadowquill-field mt-6">
						<div className="flex items-center gap-3">
							<div className="shadowquill-label">Check for Updates</div>
							<button
								type="button"
								onClick={handleCheckForUpdates}
								disabled={isChecking}
								className="inline-flex border-none bg-transparent p-0 text-current disabled:cursor-wait disabled:opacity-60"
								title={isChecking ? "Checking..." : "Check for Updates"}
								aria-label={isChecking ? "Checking..." : "Check for Updates"}
							>
								<Icon
									name="refresh"
									variant="Linear"
									style={{ width: 20, height: 20 }}
									{...(isChecking && { className: "md-spin" })}
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
										<div className="status-banner__title">
											You're up to date!
										</div>
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
							</div>
						)}
					</div>
				</div>
			</section>
		</div>
	);
}
