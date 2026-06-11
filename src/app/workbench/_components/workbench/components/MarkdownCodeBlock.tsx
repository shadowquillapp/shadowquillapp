"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { highlightMarkdown } from "../utils/markdown-highlight";
import { OutputContentToolbar } from "./OutputContentToolbar";

const REMARK_PLUGINS = [remarkGfm];

interface MarkdownCodeBlockProps {
	label: string;
	source: string;
	isRendered: boolean;
	showToolbar?: boolean;
	onCopy?: () => void;
	copyDisabled?: boolean;
	copied?: boolean;
	showViewToggle?: boolean;
	onToggleView?: () => void;
}

export function MarkdownCodeBlock({
	label,
	source,
	isRendered,
	showToolbar = false,
	onCopy,
	copyDisabled = false,
	copied = false,
	showViewToggle = false,
	onToggleView,
}: MarkdownCodeBlockProps) {
	return (
		<div className="my-4 overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--color-outline)] bg-[var(--color-surface)] p-4">
			{showToolbar && (
				<OutputContentToolbar
					{...(onCopy !== undefined && { onCopy })}
					copyDisabled={copyDisabled}
					copied={copied}
					showViewToggle={showViewToggle}
					isRendered={isRendered}
					{...(onToggleView !== undefined && { onToggleView })}
				/>
			)}
			{label && (
				<div className="mb-2 font-semibold text-[9px] text-on-surface-variant uppercase opacity-60">
					{label}
				</div>
			)}
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
