"use client";
import { useEffect, useState } from "react";
import { getElectronDataPaths } from "@/lib/electron-storage";
import {
	abortFactoryReset,
	clearAllStorageForFactoryReset,
	isFactoryResetInProgress,
} from "@/lib/local-storage";
import { useDialog } from "../DialogProvider";

export default function LocalDataManagementContent() {
	const { confirm } = useDialog();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [paths, setPaths] = useState<null | {
		userData?: string;
		localStorageDir?: string;
		localStorageLevelDb?: string;
	}>(null);

	useEffect(() => {
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
	}, []);

	return (
		<div className="shadowquill-setup">
			<section className="shadowquill-panel">
				<header className="shadowquill-panel__head">
					<div>
						<p className="shadowquill-panel__eyebrow">Application Storage</p>
						<h3>Data Management</h3>
						<p className="shadowquill-panel__subtitle">
							View storage locations and manage your local application data.
						</p>
					</div>
				</header>

				<div className="shadowquill-panel__body">
					{error && (
						<div className="shadowquill-error-banner" role="alert">
							{error}
						</div>
					)}

					<div className="shadowquill-field">
						<div className="shadowquill-label">
							Application Data Directory
							<span>Main storage location for settings and configurations</span>
						</div>
						<input
							type="text"
							readOnly
							className="md-input"
							value={paths?.userData || "Unknown"}
							style={{
								fontFamily: "var(--font-mono, monospace)",
								fontSize: "var(--text-xs)",
								background: "var(--color-surface)",
								padding: "10px 12px",
							}}
						/>
					</div>

					<div className="shadowquill-field">
						<div className="shadowquill-label">
							Local Storage Database
							<span>LevelDB storage for conversations and workspace data</span>
						</div>
						<input
							type="text"
							readOnly
							className="md-input"
							value={
								paths?.localStorageLevelDb ||
								paths?.localStorageDir ||
								"Unknown"
							}
							style={{
								fontFamily: "var(--font-mono, monospace)",
								fontSize: "var(--text-xs)",
								background: "var(--color-surface)",
								padding: "10px 12px",
							}}
						/>
					</div>

					<div
						className="shadowquill-status-card shadowquill-status-card--error"
						style={{ marginTop: "8px" }}
					>
						<div className="shadowquill-status-card__content">
							<p className="shadowquill-status-card__title">Delete All Data</p>
							<p className="shadowquill-status-card__body">
								Factory reset will permanently delete all local data including
								settings, saved prompts, and presets. This action cannot be
								undone. The app will return to its initial setup state.
							</p>
							<div className="shadowquill-status-card__actions">
								<button
									type="button"
									className="md-btn md-btn--destructive md-btn--label"
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
											const res =
												await (window.shadowquill?.factoryReset?.() as Promise<
													{ ok: boolean; error?: string } | undefined
												>);
											if (!res?.ok) {
												setError(res?.error || "Reset failed");
												setLoading(false);
												return;
											}
											clearAllStorageForFactoryReset();
											window.location.assign("/workbench");
										} catch (e: unknown) {
											if (isFactoryResetInProgress()) {
												abortFactoryReset();
											}
											const err = e as Error;
											setError(err?.message || "Reset failed");
											setLoading(false);
										}
									}}
									disabled={loading}
								>
									Factory Reset
								</button>
							</div>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
