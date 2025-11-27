"use client";

import type { PresetExample, PresetLite } from "@/types";
import React, { useState } from "react";
import { Icon } from "@/components/Icon";

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
function parseCodeFence(output: string): { language: string | null; content: string } {
	const fenceMatch = output.match(/^```(\w*)\n([\s\S]*?)\n```$/);
	if (fenceMatch) {
		return {
			language: fenceMatch[1] || null,
			content: fenceMatch[2] || "",
		};
	}
	return { language: null, content: output };
}

function ExampleCard({ title, example, index, onRegenerate, isRegenerating }: ExampleCardProps) {
	const [copied, setCopied] = useState(false);
	const { language, content } = parseCodeFence(example.output.trim());

	const handleCopy = () => {
		// Copy the clean content without fences
		navigator.clipboard.writeText(content);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="flex flex-col rounded-xl border border-[var(--color-outline)] overflow-hidden bg-[var(--color-surface)] relative">
			{/* Regenerating overlay */}
			{isRegenerating && (
				<div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-surface)]/80 backdrop-blur-sm">
					<div className="flex flex-col items-center gap-2">
						<div className="relative w-8 h-8">
							<div className="absolute inset-0 rounded-full border-2 border-[var(--color-outline)]" />
							<div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--color-primary)] animate-spin" />
						</div>
						<span className="text-xs font-medium text-secondary">Regenerating...</span>
					</div>
				</div>
			)}

			{/* Card Header */}
			<div className="flex items-center justify-between px-4 py-2.5 bg-[var(--color-surface-variant)] border-b border-[var(--color-outline)]">
				<span className="text-xs font-semibold text-on-surface">{title}</span>
				{onRegenerate && (
					<button
						type="button"
						onClick={() => onRegenerate(index)}
						disabled={isRegenerating}
						className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-secondary hover:text-primary hover:bg-[var(--color-surface)] rounded transition-colors disabled:opacity-50"
						title="Regenerate this example"
					>
						<Icon name="refresh" className="w-3 h-3" />
						Regenerate
					</button>
				)}
			</div>

			{/* Input Section */}
			<div className="px-4 py-3 border-b border-[var(--color-outline)] bg-[var(--color-surface)]">
				<div className="text-[10px] font-semibold text-secondary uppercase tracking-wider mb-1">
					AI-Generated Input
				</div>
				<p className="text-xs text-on-surface/80 italic leading-relaxed">
					"{example.input}"
				</p>
			</div>

			{/* Generated Prompt Section */}
			<div className="flex-1 relative">
				<div className="px-4 py-3 bg-[var(--color-surface-variant)]">
					<div className="flex items-center justify-between mb-2">
						<div className="flex items-center gap-2">
							<div className="text-[10px] font-semibold text-secondary uppercase tracking-wider">
								Generated Prompt
							</div>
							{language && (
								<span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-[var(--color-primary)]/20 text-primary border border-[var(--color-primary)]/30">
									{language}
								</span>
							)}
						</div>
						<button
							type="button"
							onClick={handleCopy}
							className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-secondary hover:text-primary hover:bg-[var(--color-surface)] rounded transition-colors"
							title="Copy to clipboard"
						>
							<Icon name={copied ? "check" : "copy"} className="w-3 h-3" />
							{copied ? "Copied!" : "Copy"}
						</button>
					</div>

					<div className="rounded-lg border border-[var(--color-outline)] bg-[var(--color-surface)] overflow-hidden">
						<pre className="p-3 text-xs font-mono text-on-surface whitespace-pre-wrap break-words leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar">
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
	if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
	if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
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

	const hasExamples = preset.generatedExamples && preset.generatedExamples.length === 2;
	const isAnyRegenerating = regeneratingIndex !== null;

	return (
		<div className={`flex flex-col gap-4 ${className}`}>
			{/* Header */}
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2">
						<Icon name="eye" className="w-5 h-5 text-primary" />
						<h3 className="text-base font-bold text-on-surface">
							Example Prompts
						</h3>
					</div>
					<p className="text-xs text-secondary">
						AI-generated examples for this preset
					</p>
				</div>
				
				<div className="flex items-center gap-3">
					{hasExamples && (
						<>
							<span className="text-[10px] text-secondary">
								Generated {formatTimestamp(preset.generatedExamples![0].generatedAt)}
							</span>
							{onGenerateExamples && (
								<button
									type="button"
									onClick={onGenerateExamples}
									disabled={isGenerating || isAnyRegenerating}
									className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-secondary hover:text-primary border border-[var(--color-outline)] hover:border-[var(--color-primary)] rounded-lg transition-colors disabled:opacity-50"
									title="Regenerate both examples"
								>
									<Icon name="refresh" className="w-3.5 h-3.5" />
									Regenerate All
								</button>
							)}
						</>
					)}
				</div>
			</div>

			{/* Preset Summary */}
			<div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-surface-variant)] border border-[var(--color-outline)]">
				<span className="text-[10px] font-semibold text-secondary uppercase tracking-wider">
					Settings:
				</span>
				<span className="px-2 py-0.5 text-[10px] font-medium text-on-surface bg-[var(--color-surface)] rounded border border-[var(--color-outline)]">
					{preset.taskType}
				</span>
				<span className="px-2 py-0.5 text-[10px] font-medium text-on-surface bg-[var(--color-surface)] rounded border border-[var(--color-outline)]">
					{preset.options?.tone || "neutral"}
				</span>
				<span className="px-2 py-0.5 text-[10px] font-medium text-on-surface bg-[var(--color-surface)] rounded border border-[var(--color-outline)]">
					{preset.options?.detail || "normal"} detail
				</span>
				<span className="px-2 py-0.5 text-[10px] font-medium text-on-surface bg-[var(--color-surface)] rounded border border-[var(--color-outline)]">
					{preset.options?.format || "markdown"}
				</span>
				<span className="px-2 py-0.5 text-[10px] font-medium text-on-surface bg-[var(--color-surface)] rounded border border-[var(--color-outline)]">
					temp: {(preset.options?.temperature ?? 0.7).toFixed(1)}
				</span>
			</div>

			{hasExamples ? (
				/* Example Cards Grid */
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					<ExampleCard
						title="Example 1"
						example={preset.generatedExamples![0]}
						index={0}
						onRegenerate={onRegenerateExample}
						isRegenerating={regeneratingIndex === 0}
					/>
					<ExampleCard
						title="Example 2"
						example={preset.generatedExamples![1]}
						index={1}
						onRegenerate={onRegenerateExample}
						isRegenerating={regeneratingIndex === 1}
					/>
				</div>
			) : (
				/* No examples message */
				<div className="flex flex-col items-center justify-center py-12 px-6 rounded-xl border-2 border-dashed border-[var(--color-outline)] bg-[var(--color-surface-variant)]/50">
					{isGenerating ? (
						<>
							{/* Loading state */}
							<div className="relative w-16 h-16 mb-4">
								<div className="absolute inset-0 rounded-full border-4 border-[var(--color-outline)]" />
								<div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[var(--color-primary)] animate-spin" />
								<div className="absolute inset-2 rounded-full border-4 border-transparent border-b-[var(--color-primary)] animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
							</div>
							<h4 className="text-sm font-semibold text-on-surface mb-1">
								Generating Examples
							</h4>
							<p className="text-xs text-secondary text-center max-w-sm">
								Using AI to create example inputs and generate outputs...
							</p>
							<div className="mt-4 flex gap-1.5">
								<span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce" style={{ animationDelay: '0ms' }} />
								<span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce" style={{ animationDelay: '150ms' }} />
								<span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce" style={{ animationDelay: '300ms' }} />
							</div>
						</>
					) : (
						<>
							<div className="w-16 h-16 rounded-full bg-[var(--color-surface)] border border-[var(--color-outline)] flex items-center justify-center mb-4">
								<Icon name="file-text" className="w-8 h-8 text-secondary/60" />
							</div>
							<h4 className="text-sm font-semibold text-on-surface mb-1">
								No Examples Yet
							</h4>
							<p className="text-xs text-secondary text-center max-w-sm mb-4">
								Generate AI-powered example prompts that demonstrate how this preset transforms different inputs.
							</p>
							
							{onGenerateExamples && (
								<button
									type="button"
									onClick={onGenerateExamples}
									className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-on-primary font-medium text-sm hover:opacity-90 transition-opacity"
								>
									<Icon name="refresh" className="w-4 h-4" />
									Generate Examples
								</button>
							)}
						</>
					)}
				</div>
			)}
		</div>
	);
}
