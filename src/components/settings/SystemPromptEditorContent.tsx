"use client";
import { useEffect, useState } from "react";
import { ensureSystemPromptBuild } from "@/lib/system-prompts";

export default function SystemPromptEditorContent() {
	const [loading, setLoading] = useState(true);
	const [prompt, setPrompt] = useState("");

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			try {
				const initial = ensureSystemPromptBuild();
				setPrompt(initial);
			} catch {
				setPrompt("");
			} finally {
				setLoading(false);
			}
		};
		void load();
	}, []);

	if (loading) {
		return <div className="text-sm">Loading…</div>;
	}

	return (
		<div className="ollama-setup">
			<section className="ollama-panel">
				<header className="ollama-panel__head">
					<div>
						<p className="ollama-panel__eyebrow">Prompt Engineering</p>
						<h3>System Prompt</h3>
						<p className="ollama-panel__subtitle">
							View the AI's core instructions and behavior patterns.
						</p>
					</div>
				</header>

				<div className="ollama-panel__body">
					<div
						id="system-prompt-display"
						data-testid="system-prompt-display"
						style={{
							padding: "16px",
							backgroundColor: "var(--color-surface)",
							border: "1px solid var(--color-outline)",
							borderRadius: "8px",
							fontFamily: "var(--font-mono, monospace)",
							fontSize: "12px",
							lineHeight: "1.5",
							maxHeight: "400px",
							overflowY: "auto",
							whiteSpace: "pre-wrap",
							wordBreak: "break-word",
							color: "var(--color-on-surface)",
						}}
					>
						{prompt || "No system prompt available."}
					</div>
				</div>
			</section>
			<aside className="ollama-guide">
				<div className="ollama-guide-card">
					<p className="ollama-panel__eyebrow">ShadowQuill System Prompt</p>
					<h4>Read-only view</h4>
					<ol>
						The system prompt is displayed here for reference. It cannot be
						modified through this interface.
					</ol>
				</div>
			</aside>
		</div>
	);
}
