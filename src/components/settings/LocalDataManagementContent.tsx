"use client";
import React, { useEffect, useState } from "react";
import { useDialog } from "../DialogProvider";
import { clearAllStorageForFactoryReset } from "@/lib/local-storage";

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
	}, []);

	return (
		<div className="ollama-setup">
			<section className="ollama-panel">
				<header className="ollama-panel__head">
					<div>
						<p className="ollama-panel__eyebrow">Application Storage</p>
						<h3>Data Management</h3>
						<p className="ollama-panel__subtitle">
							View storage locations and manage your local application data.
						</p>
					</div>
					<span className="ollama-status-chip ollama-status-chip--idle">
						{loading ? "Loading…" : "Local"}
					</span>
				</header>

				<div className="ollama-panel__body">
					{error && (
						<div className="ollama-error-banner" role="alert">
							{error}
						</div>
					)}

					<div className="ollama-field">
						<label className="ollama-label">
							Application Data Directory
							<span>Main storage location for settings and configurations</span>
						</label>
						<div
							className="md-input"
							style={{
								fontFamily: "var(--font-mono, monospace)",
								fontSize: "11px",
								wordBreak: "break-all",
								background: "var(--color-surface)",
								padding: "10px 12px",
							}}
						>
							{paths?.userData || "Unknown"}
						</div>
					</div>

					<div className="ollama-field">
						<label className="ollama-label">
							Local Storage Database
							<span>LevelDB storage for conversations and workspace data</span>
						</label>
						<div
							className="md-input"
							style={{
								fontFamily: "var(--font-mono, monospace)",
								fontSize: "11px",
								wordBreak: "break-all",
								background: "var(--color-surface)",
								padding: "10px 12px",
							}}
						>
							{paths?.localStorageLevelDb ||
								paths?.localStorageDir ||
								"Unknown"}
						</div>
					</div>

					<div
						className="ollama-status-card ollama-status-card--error"
						style={{ marginTop: "8px" }}
					>
						<div className="ollama-status-card__content">
							<p className="ollama-status-card__title">Danger Zone</p>
							<p className="ollama-status-card__body">
								Factory reset will permanently delete all local data including settings,
								saved prompts, and presets. This action cannot be undone. The app will
								restart automatically with a fresh state.
							</p>
							<div className="ollama-status-card__actions">
								<button
									className="md-btn"
									style={{
										background: "rgba(239, 68, 68, 0.15)",
										borderColor: "#ef4444",
										color: "#ef4444",
									}}
									onClick={async () => {
										const ok = await confirm({
											title: "Factory Reset",
											message: "Delete ALL local data and restart? The app will restart with a completely fresh state.",
											confirmText: "Delete & Restart",
											cancelText: "Cancel",
											tone: "destructive",
										});
										if (!ok) return;
										setLoading(true);
										setError(null);
										try {
											clearAllStorageForFactoryReset();
											const api = (window as any).shadowquill;
											const res = await api?.factoryReset?.();
											if (!res?.ok) {
												setError(res?.error || "Reset failed");
												setLoading(false);
											}
											// App will close automatically after factory reset
										} catch (e: any) {
											setError(e?.message || "Reset failed");
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

			<aside className="ollama-guide">
				<div className="ollama-guide-card">
					<p className="ollama-panel__eyebrow">About Storage</p>
					<ul>
						<li>All workbench tabs and their history</li>
						<li>Custom presets and configurations</li>
						<li>Application settings and preferences</li>
						<li>System prompt modifications</li>
					</ul>
				</div>
				<div className="ollama-guide-card">
					<p className="ollama-panel__eyebrow">Privacy Note</p>
					<ul>
						<li>All data is stored locally on your device</li>
						<li>No cloud sync or external backups</li>
						<li>Complete control over your information</li>
					</ul>
				</div>
			</aside>
		</div>
	);
}
