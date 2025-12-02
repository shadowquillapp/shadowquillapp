"use client";
import {
	ensureSystemPromptBuild,
	resetSystemPromptBuild,
	setSystemPromptBuild,
} from "@/lib/system-prompts";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDialog } from "../DialogProvider";

interface Props {
	onSaved?: () => void;
	onCancelReset?: () => void;
}

export default function SystemPromptEditorContent({
	onSaved,
	onCancelReset,
}: Props) {
	const { confirm } = useDialog();
	const [loading, setLoading] = useState(true);
	const [prompt, setPrompt] = useState("");
	const [initialPrompt, setInitialPrompt] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			try {
				const initial = ensureSystemPromptBuild();
				setPrompt(initial);
				setInitialPrompt(initial);
			} catch {
				setPrompt("");
				setInitialPrompt("");
			} finally {
				setLoading(false);
			}
		};
		void load();
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional - resize when prompt content changes
	useEffect(() => {
		const el = textareaRef.current;
		if (!el) return;
		const MIN_HEIGHT = 200;
		const MAX_HEIGHT = 320;
		el.style.height = "auto";
		const scrollHeight = el.scrollHeight;
		const nextHeight = Math.min(Math.max(scrollHeight, MIN_HEIGHT), MAX_HEIGHT);
		el.style.height = `${nextHeight}px`;
		el.style.overflowY = scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
	}, [prompt]);

	const isDirty = useMemo(
		() => prompt !== initialPrompt,
		[prompt, initialPrompt],
	);

	if (loading) {
		return <div className="text-sm">Loading…</div>;
	}

	return (
		<form
			className="ollama-setup"
			onSubmit={async (e) => {
				e.preventDefault();
				setSaving(true);
				setError(null);
				try {
					const normalized = setSystemPromptBuild(prompt);
					setInitialPrompt(normalized);
					setPrompt(normalized);
					onSaved?.();
				} catch (err: unknown) {
					const error = err as Error;
					setError(error.message || "Unknown error");
				} finally {
					setSaving(false);
				}
			}}
		>
			<section className="ollama-panel">
				<header className="ollama-panel__head">
					<div>
						<p className="ollama-panel__eyebrow">Prompt Engineering</p>
						<h3>System Prompt Editor</h3>
						<p className="ollama-panel__subtitle">
							Customize the AI's core instructions and behavior patterns.
						</p>
					</div>
					<span
						className={`ollama-status-chip ${isDirty ? "ollama-status-chip--attention" : "ollama-status-chip--success"}`}
					>
						{isDirty ? "Modified" : "Saved"}
					</span>
				</header>

				<div className="ollama-panel__body">
					<div className="ollama-field">
						<label className="ollama-label" htmlFor="system-prompt-textarea">
							System Prompt Content
							<span>
								This prompt guides how the AI processes and enhances your input.
							</span>
						</label>
						<textarea
							id="system-prompt-textarea"
							ref={textareaRef}
							value={prompt}
							onChange={(e) => setPrompt(e.target.value)}
							className="md-input"
							style={{
								minHeight: "200px",
								maxHeight: "320px",
								fontFamily: "var(--font-mono, monospace)",
								fontSize: "12px",
								lineHeight: "1.5",
								resize: "vertical",
							}}
						/>
					</div>

					{error && (
						<div className="ollama-error-banner" role="alert">
							{error}
						</div>
					)}
				</div>

				<footer className="ollama-panel__footer">
					<button
						type="button"
						onClick={async () => {
							const ok = await confirm({
								title: "Restore Default",
								message:
									"Restore default system prompt? This will overwrite your current edits.",
								confirmText: "Restore",
								cancelText: "Cancel",
							});
							if (!ok) return;
							setSaving(true);
							setError(null);
							try {
								const def = resetSystemPromptBuild();
								setPrompt(def);
								setInitialPrompt(def);
							} catch (err: unknown) {
								const error = err as Error;
								setError(error.message || "Unknown error");
							} finally {
								setSaving(false);
							}
						}}
						className="md-btn md-btn--attention"
					>
						Restore Default
					</button>
					<div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
						<button
							type="submit"
							disabled={saving || !isDirty}
							className="md-btn md-btn--primary"
						>
							{saving ? "Saving…" : "Save Changes"}
						</button>
					</div>
				</footer>
			</section>

			<aside className="ollama-guide">
				<div className="ollama-guide-card">
					<p className="ollama-panel__eyebrow">Best Practices</p>
					<h4>Effective system prompts</h4>
					<ul>
						<li>Be clear and specific about the AI's role and capabilities</li>
						<li>Define expected output format and structure</li>
						<li>Include constraints and guardrails as needed</li>
					</ul>
				</div>
				<div className="ollama-guide-card">
					<p className="ollama-panel__eyebrow">Tips</p>
					<ul>
						<li>Test changes with sample inputs before saving</li>
						<li>Use the Restore Default button if something breaks</li>
						<li>Keep prompts focused on core behavior patterns</li>
					</ul>
				</div>
			</aside>
		</form>
	);
}
