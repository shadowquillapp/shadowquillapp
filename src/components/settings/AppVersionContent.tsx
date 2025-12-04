/** @jsxImportSource react */
"use client";
import { APP_VERSION } from "@/lib/version";

export default function AppVersionContent() {
	return (
		<div className="ollama-setup">
			<section className="ollama-panel">
				<header className="ollama-panel__head">
					<div>
						<p className="ollama-panel__eyebrow">Application Information</p>
						<h3>ShadowQuill Version</h3>
					</div>
				</header>

				<div className="ollama-panel__body">
					<div className="ollama-field">
						<div className="ollama-label">Version</div>
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
				</div>
			</section>

			<aside className="ollama-guide">
				<div className="ollama-guide-card">
					<p className="ollama-panel__eyebrow">About</p>
					<ul>
						<li>ShadowQuill version information</li>
						<li>Check for updates regularly</li>
						<li>Report issues on the homepage</li>
					</ul>
				</div>
			</aside>
		</div>
	);
}
