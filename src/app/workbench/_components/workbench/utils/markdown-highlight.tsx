import type { ReactNode } from "react";

const inlinePattern =
	/(!?\[[^\]]*?\]\([^)]+\)|`[^`]+`|\*\*\*[^*]+?\*\*\*|___[^_]+?___|\*\*[^*]+?\*\*|__[^_]+?__|~~[^~]+?~~|\*(?!\s)(?:\\.|[^*])*(?:[^*\s])\*|_(?!\s)(?:\\.|[^_])*(?:[^_\s])_)/g;

const markerClass: Record<string, string> = {
	"`": "token-md-code-tick",
	"~~": "token-md-strike",
	"**": "token-md-bold",
	"*": "token-md-italic",
};

const renderInline = (text: string, keyPrefix: string) => {
	if (!text) return text;
	const nodes: ReactNode[] = [];
	let lastIndex = 0;
	let tokenIndex = 0;
	const push = (value: ReactNode, className?: string) => {
		nodes.push(
			<span key={`${keyPrefix}-${tokenIndex++}`} className={className}>
				{value}
			</span>,
		);
	};
	const wrap = (delims: string[], inner: string, textClass: string) => {
		for (const d of delims) push(d, markerClass[d]);
		push(inner, textClass);
		for (const d of [...delims].reverse()) push(d, markerClass[d]);
	};

	for (
		let match = inlinePattern.exec(text);
		match !== null;
		match = inlinePattern.exec(text)
	) {
		if (match.index > lastIndex) {
			push(text.slice(lastIndex, match.index));
		}
		const token = match[0];

		if (/^`/.test(token)) {
			wrap(["`"], token.slice(1, -1), "token-md-code");
		} else if (/^\*\*\*/.test(token) || /^___/.test(token)) {
			wrap(
				["**", "*"],
				token.slice(3, -3),
				"token-md-bold-text token-md-italic-text",
			);
		} else if (/^\*\*/.test(token) || /^__/.test(token)) {
			wrap(["**"], token.slice(2, -2), "token-md-bold-text");
		} else if (/^\*(?!\*)/.test(token) || /^_(?!_)/.test(token)) {
			wrap(["*"], token.slice(1, -1), "token-md-italic-text");
		} else if (/^~~/.test(token)) {
			wrap(["~~"], token.slice(2, -2), "token-md-strike-text");
		} else if (/^\[/.test(token) || /^!\[/.test(token)) {
			const linkMatch = token.match(/^(!)?\[([^\]]+)]\(([^)]+)\)$/);
			if (linkMatch) {
				push(linkMatch[1] ? "![" : "[", "token-md-punctuation");
				push(linkMatch[2], "token-md-link-text");
				push("](", "token-md-punctuation");
				push(linkMatch[3], "token-md-url");
				push(")", "token-md-punctuation");
			} else {
				push(token);
			}
		} else {
			push(token);
		}
		lastIndex = match.index + token.length;
	}

	if (lastIndex < text.length) {
		push(text.slice(lastIndex));
	}

	return nodes;
};

export function highlightMarkdown(code: string): ReactNode[] {
	const lines = code.split("\n");
	return lines.map((line, lineIdx) => {
		const lineKey = `md-line-${lineIdx}`;
		const newline = lineIdx < lines.length - 1 ? "\n" : "";
		const mdLine = (children: ReactNode, className?: string) => (
			<span key={lineKey} className={className}>
				{children}
				{newline}
			</span>
		);

		const headerMatch = line.match(/^(#{1,6})(\s+)(.*)$/);
		if (headerMatch) {
			return mdLine(
				<>
					<span className="token-md-header">{headerMatch[1] ?? ""}</span>
					<span>{headerMatch[2] ?? " "}</span>
					<span className="token-md-header-text">
						{renderInline(headerMatch[3] ?? "", `${lineKey}-header`)}
					</span>
				</>,
			);
		}

		if (/^(\s*)(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
			return mdLine(line, "token-md-hr");
		}

		const blockquoteMatch = line.match(/^(\s*>+\s*)(.*)$/);
		if (blockquoteMatch) {
			return mdLine(
				<>
					<span className="token-md-quote-marker">
						{blockquoteMatch[1] ?? ""}
					</span>
					<span className="token-md-quote-text">
						{renderInline(blockquoteMatch[2] ?? "", `${lineKey}-quote`)}
					</span>
				</>,
			);
		}

		const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
		if (listMatch) {
			return mdLine(
				<>
					<span>{listMatch[1] ?? ""}</span>
					<span className="token-md-list-marker">{listMatch[2] ?? ""}</span>
					<span> </span>
					{renderInline(listMatch[3] ?? "", `${lineKey}-list`)}
				</>,
			);
		}

		return mdLine(renderInline(line || " ", `${lineKey}-plain`));
	});
}
