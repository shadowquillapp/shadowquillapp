"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { highlightMarkdown } from "../utils/markdown-highlight";

const REMARK_PLUGINS = [remarkGfm];

interface MarkdownCodeBlockProps {
	label: string;
	source: string;
}

export function MarkdownCodeBlock({ label, source }: MarkdownCodeBlockProps) {
	const [isRendered, setIsRendered] = useState(true);

	return (
		<div className="my-4 overflow-x-auto rounded-lg border border-[var(--color-outline)] bg-[var(--color-surface)] p-4">
			<div className="code-block-header">
				<div className="font-semibold text-[9px] text-on-surface-variant uppercase opacity-60">
					{label}
				</div>
				<button
					type="button"
					className={
						isRendered
							? "mode-toggle mode-toggle--compact"
							: "mode-toggle mode-toggle--compact mode-toggle--source"
					}
					aria-pressed={!isRendered}
					aria-label="Toggle between rendered and source view"
					onClick={() => setIsRendered((v) => !v)}
				>
					<span className="mode-toggle-option">Rendered</span>
					<span className="mode-toggle-option">Source</span>
					<span className="mode-toggle-slider" aria-hidden="true" />
				</button>
			</div>
			{isRendered ? (
				<div className="message-prose font-sans text-[12px] text-on-surface leading-relaxed">
					<ReactMarkdown remarkPlugins={REMARK_PLUGINS}>{source}</ReactMarkdown>
				</div>
			) : (
				<div className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px]">
					{highlightMarkdown(source)}
				</div>
			)}
		</div>
	);
}
