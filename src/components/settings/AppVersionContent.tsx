/** @jsxImportSource react */
"use client";
import { APP_VERSION } from "@/lib/version";

export default function AppVersionContent() {
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
						<div className="shadowquill-label">Version</div>
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
		</div>
	);
}
