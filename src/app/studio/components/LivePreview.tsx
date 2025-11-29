"use client";

import { Icon } from "@/components/Icon";
import type { PresetExample, PresetLite } from "@/types";
import React, { useState } from "react";

interface LivePreviewProps {
	preset: PresetLite | null;
	className?: string;
	onGenerateExamples?: () => void;
	onRegenerateExample?: (index: 0 | 1) => void;
	isGenerating?: boolean;
	regeneratingIndex?: 0 | 1 | null;
}

interface ExampleCardProps {
	title: string;
	example: PresetExample;
	index: 0 | 1;
	onRegenerate?: ((index: 0 | 1) => void) | undefined;
	isRegenerating?: boolean;
}

/**
 * Parse output to extract language and content from code fences
 */
function parseCodeFence(output: string): {
	language: string | null;
	content: string;
} {
	const fenceMatch = output.match(/^```(\w*)\n([\s\S]*?)\n```$/);
	if (fenceMatch) {
		return {
			language: fenceMatch[1] || null,
			content: fenceMatch[2] || "",
		};
	}
	return { language: null, content: output };
}

function ExampleCard({
	title,
	example,
	index,
	onRegenerate,
	isRegenerating,
}: ExampleCardProps) {
	const [copied, setCopied] = useState(false);
	const { language, content } = parseCodeFence(example.output.trim());

	const handleCopy = () => {
		// Copy the clean content without fences
		navigator.clipboard.writeText(content);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="relative flex flex-col overflow-hidden rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface)]">
			{/* Regenerating overlay */}
			{isRegenerating && (
				<div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-surface)]/80 backdrop-blur-sm">
					<div className="flex flex-col items-center gap-2">
						<div className="relative h-8 w-8">
							<div className="absolute inset-0 rounded-full border-2 border-[var(--color-outline)]" />
							<div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[var(--color-primary)]" />
						</div>
						<span className="font-medium text-secondary text-xs">
							Regenerating...
						</span>
					</div>
				</div>
			)}

			{/* Card Header */}
			<div className="flex items-center justify-between border-[var(--color-outline)] border-b bg-[var(--color-surface-variant)] px-4 py-2.5">
				<span className="font-semibold text-on-surface text-xs">{title}</span>
				{onRegenerate && (
					<button
						type="button"
						onClick={() => onRegenerate(index)}
						disabled={isRegenerating}
						className="flex items-center gap-1 rounded px-2 py-0.5 font-medium text-[10px] text-secondary transition-colors hover:bg-[var(--color-surface)] hover:text-primary disabled:opacity-50"
						title="Regenerate this example"
					>
						<Icon name="refresh" className="h-4 w-4" />
						Regenerate
					</button>
				)}
			</div>

			{/* Input Section */}
			<div className="border-[var(--color-outline)] border-b bg-[var(--color-surface)] px-4 py-3">
				<div className="mb-1 font-semibold text-[10px] text-secondary uppercase tracking-wider">
					AI-Generated Input
				</div>
				<p className="text-on-surface/80 text-xs italic leading-relaxed">
					"{example.input}"
				</p>
			</div>

			{/* Generated Prompt Section */}
			<div className="relative flex-1">
				<div className="bg-[var(--color-surface-variant)] px-4 py-3">
					<div className="mb-2 flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div className="font-semibold text-[10px] text-secondary uppercase tracking-wider">
								Generated Prompt
							</div>
							{language && (
								<span className="rounded border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/20 px-1.5 py-0.5 font-bold text-[9px] text-primary uppercase tracking-wider">
									{language}
								</span>
							)}
						</div>
						<button
							type="button"
							onClick={handleCopy}
							className="flex items-center gap-1 rounded px-2 py-0.5 font-medium text-[10px] text-secondary transition-colors hover:bg-[var(--color-surface)] hover:text-primary"
							title="Copy to clipboard"
						>
							<Icon name={copied ? "check" : "copy"} className="h-4 w-4" />
							{copied ? "Copied!" : "Copy"}
						</button>
					</div>

					<div className="overflow-hidden rounded-lg border border-[var(--color-outline)] bg-[var(--color-surface)]">
						<pre className="custom-scrollbar max-h-[300px] overflow-y-auto whitespace-pre-wrap break-words p-3 font-mono text-on-surface text-xs leading-relaxed">
							{content}
						</pre>
					</div>
				</div>
			</div>
		</div>
	);
}

function formatTimestamp(timestamp: number): string {
	const date = new Date(timestamp);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) return "just now";
	if (diffMins < 60)
		return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
	if (diffHours < 24)
		return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
	if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;

	return date.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
	});
}

/**
 * LivePreview component showing cached AI-generated examples
 * Examples are generated manually via the Generate button
 */
export default function LivePreview({
	preset,
	className = "",
	onGenerateExamples,
	onRegenerateExample,
	isGenerating = false,
	regeneratingIndex = null,
}: LivePreviewProps) {
	if (!preset) {
		return null;
	}

	const hasExamples =
		preset.generatedExamples && preset.generatedExamples.length === 2;
	const isAnyRegenerating = regeneratingIndex !== null;
	const isAnyGenerating = isGenerating || isAnyRegenerating;

	return (
		<div
			className={`flex flex-col gap-4 ${className}`}
			style={{ position: "relative" }}
		>
			{/* Floating Generating Status - stays above the page overlay */}
			{isAnyGenerating && (
				<div
					className="generating-status-floating"
					style={{
						position: "fixed",
						top: "50%",
						left: "50%",
						transform: "translate(-50%, -50%)",
						zIndex: 150,
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						padding: "32px 48px",
						borderRadius: "16px",
						background: "var(--color-surface)",
						border: "1px solid var(--color-outline)",
						boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
					}}
				>
					{/* Loading spinner */}
					<div className="relative mb-4 h-16 w-16">
						<div className="absolute inset-0 rounded-full border-4 border-[var(--color-outline)]" />
						<div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[var(--color-primary)]" />
						<div
							className="absolute inset-2 animate-spin rounded-full border-4 border-transparent border-b-[var(--color-primary)]"
							style={{
								animationDirection: "reverse",
								animationDuration: "0.8s",
							}}
						/>
					</div>
					<h4 className="mb-1 font-semibold text-on-surface text-sm">
						{isAnyRegenerating ? "Regenerating Example" : "Generating Examples"}
					</h4>
					<p className="max-w-sm text-center text-secondary text-xs">
						{isAnyRegenerating
							? `Regenerating example ${(regeneratingIndex ?? 0) + 1} with AI...`
							: "Using AI to create example inputs and generate outputs..."}
					</p>
					<div className="mt-4 flex gap-1.5">
						<span
							className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-primary)]"
							style={{ animationDelay: "0ms" }}
						/>
						<span
							className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-primary)]"
							style={{ animationDelay: "150ms" }}
						/>
						<span
							className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-primary)]"
							style={{ animationDelay: "300ms" }}
						/>
					</div>
				</div>
			)}
			{/* Header */}
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2">
						<Icon name="eye" className="h-4 w-4 text-primary" />
						<h3 className="font-bold text-base text-on-surface">
							Example Prompts
						</h3>
					</div>
					<p className="text-secondary text-xs">
						AI-generated examples for this preset
					</p>
				</div>

				<div className="flex items-center gap-3">
					{hasExamples && (
						<>
							<span className="text-[10px] text-secondary">
								Generated{" "}
								{formatTimestamp(
									preset.generatedExamples?.[0]?.generatedAt ?? 0,
								)}
							</span>
							{onGenerateExamples && (
								<button
									type="button"
									onClick={onGenerateExamples}
									disabled={isGenerating || isAnyRegenerating}
									className="flex items-center gap-1.5 rounded-lg border border-[var(--color-outline)] px-3 py-1.5 font-medium text-secondary text-xs transition-colors hover:border-[var(--color-primary)] hover:text-primary disabled:opacity-50"
									title="Regenerate both examples"
								>
									<Icon name="refresh" className="h-4 w-4" />
									Regenerate All
								</button>
							)}
						</>
					)}
				</div>
			</div>

			{/* Preset Summary */}
			<div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-outline)] bg-[var(--color-surface-variant)] px-3 py-2">
				<span className="font-semibold text-[10px] text-secondary uppercase tracking-wider">
					Settings:
				</span>
				<span className="rounded border border-[var(--color-outline)] bg-[var(--color-surface)] px-2 py-0.5 font-medium text-[10px] text-on-surface">
					{preset.taskType}
				</span>
				<span className="rounded border border-[var(--color-outline)] bg-[var(--color-surface)] px-2 py-0.5 font-medium text-[10px] text-on-surface">
					{preset.options?.tone || "neutral"}
				</span>
				<span className="rounded border border-[var(--color-outline)] bg-[var(--color-surface)] px-2 py-0.5 font-medium text-[10px] text-on-surface">
					{preset.options?.detail || "normal"} detail
				</span>
				<span className="rounded border border-[var(--color-outline)] bg-[var(--color-surface)] px-2 py-0.5 font-medium text-[10px] text-on-surface">
					{preset.options?.format || "markdown"}
				</span>
				<span className="rounded border border-[var(--color-outline)] bg-[var(--color-surface)] px-2 py-0.5 font-medium text-[10px] text-on-surface">
					temp: {(preset.options?.temperature ?? 0.7).toFixed(1)}
				</span>
			</div>

			{hasExamples &&
			preset.generatedExamples?.[0] &&
			preset.generatedExamples?.[1] ? (
				/* Example Cards Grid */
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
					<ExampleCard
						title="Example 1"
						example={preset.generatedExamples[0]}
						index={0}
						onRegenerate={onRegenerateExample}
						isRegenerating={regeneratingIndex === 0}
					/>
					<ExampleCard
						title="Example 2"
						example={preset.generatedExamples[1]}
						index={1}
						onRegenerate={onRegenerateExample}
						isRegenerating={regeneratingIndex === 1}
					/>
				</div>
			) : (
				/* No examples message */
				<div className="flex flex-col items-center justify-center rounded-xl border-2 border-[var(--color-outline)] border-dashed bg-[var(--color-surface-variant)]/50 px-6 py-12">
					<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--color-outline)] bg-[var(--color-surface)]">
						<Icon name="file-text" className="h-12 w-12 text-secondary/60" />
					</div>
					<h4 className="mb-1 font-semibold text-on-surface text-sm">
						No Examples Yet
					</h4>
					<p className="mb-4 max-w-sm text-center text-secondary text-xs">
						Generate AI-powered example prompts that demonstrate how this preset
						transforms different inputs.
					</p>

					{onGenerateExamples && (
						<button
							type="button"
							onClick={onGenerateExamples}
							disabled={isGenerating}
							className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 font-medium text-on-primary text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
						>
							<Icon name="refresh" className="h-4 w-4" />
							Generate Examples
						</button>
					)}
				</div>
			)}
		</div>
	);
}
