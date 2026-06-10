"use client";

import type { ReactNode } from "react";
import { useCallback } from "react";

interface MessageRendererProps {
	content: string;
	messageId: string;
	copiedMessageId: string | null;
	onCopy: (id: string, content: string) => void;
}

const escapeRegExp = (value: string) =>
	value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const codeBlock = (key: string, label: string, body: ReactNode) => (
	<div
		key={key}
		className="my-4 overflow-x-auto whitespace-pre-wrap rounded-lg border border-[var(--color-outline)] bg-[var(--color-surface)] p-4 font-mono text-[11px]"
	>
		{label && (
			<div className="mb-2 font-semibold text-[9px] text-on-surface-variant uppercase opacity-60">
				{label}
			</div>
		)}
		<div className="overflow-x-auto">{body}</div>
	</div>
);

export function MessageRenderer({
	content,
	messageId: _messageId,
	copiedMessageId: _copiedMessageId,
	onCopy: _onCopy,
}: MessageRendererProps) {
	const highlightJSON = useCallback((rawCode: string) => {
		const normalize = () => {
			if (!rawCode) return "";
			try {
				const parsed = JSON.parse(rawCode);
				return JSON.stringify(parsed, null, 2);
			} catch {
				return rawCode;
			}
		};

		const code = normalize();
		type JsonToken =
			| {
					type:
						| "string"
						| "number"
						| "boolean"
						| "null"
						| "key"
						| "brace"
						| "bracket"
						| "colon"
						| "comma";
					value: string;
			  }
			| { type: "whitespace" | "plain"; value: string };
		const tokens: JsonToken[] = [];
		let i = 0;

		const readString = () => {
			let result = '"';
			i += 1;
			while (i < code.length) {
				const ch = code[i] ?? "";
				result += ch;
				if (ch === "\\") {
					i += 1;
					result += code[i] ?? "";
				} else if (ch === '"') {
					i += 1;
					break;
				}
				i += 1;
			}
			return result;
		};

		while (i < code.length) {
			const ch = code[i] ?? "";
			if (/\s/.test(ch)) {
				const start = i;
				while (i < code.length && /\s/.test(code[i] ?? "")) i += 1;
				tokens.push({ type: "whitespace", value: code.slice(start, i) });
				continue;
			}
			if (ch === '"') {
				const strValue = readString();
				let j = i;
				while (j < code.length && /\s/.test(code[j] ?? "")) j += 1;
				const nextChar = code[j] ?? "";
				const isKey = nextChar === ":";
				tokens.push({ type: isKey ? "key" : "string", value: strValue });
				continue;
			}
			if (/[0-9-]/.test(ch)) {
				const match = code.slice(i).match(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/);
				if (match) {
					tokens.push({ type: "number", value: match[0] });
					i += match[0].length;
					continue;
				}
			}
			if (code.startsWith("true", i) || code.startsWith("false", i)) {
				const value = code.startsWith("true", i) ? "true" : "false";
				tokens.push({ type: "boolean", value });
				i += value.length;
				continue;
			}
			if (code.startsWith("null", i)) {
				tokens.push({ type: "null", value: "null" });
				i += 4;
				continue;
			}
			const punctuationMap: Record<string, JsonToken["type"] | undefined> = {
				"{": "brace",
				"}": "brace",
				"[": "bracket",
				"]": "bracket",
				":": "colon",
				",": "comma",
			};
			const punctuationType = punctuationMap[ch];
			if (punctuationType) {
				tokens.push({ type: punctuationType, value: ch });
				i += 1;
				continue;
			}
			tokens.push({ type: "plain", value: ch });
			i += 1;
		}

		return tokens.map((token, idx) => {
			const key = `json-${idx}-${token.type}-${token.value.slice(0, 5)}`;
			if (token.type === "whitespace" || token.type === "plain") {
				return <span key={key}>{token.value}</span>;
			}
			return (
				<span key={key} className={`token-${token.type}`}>
					{token.value}
				</span>
			);
		});
	}, []);

	const highlightXML = useCallback((code: string) => {
		const tokens: ReactNode[] = [];
		const push = (key: string, value: ReactNode, className?: string) => {
			tokens.push(
				<span key={key} className={className}>
					{value}
				</span>,
			);
		};
		let i = 0;
		const MAX_ITERATIONS = 50000;
		let iterations = 0;

		while (i < code.length && iterations < MAX_ITERATIONS) {
			iterations++;

			if (code.startsWith("<!--", i)) {
				const closeIndex = code.indexOf("-->", i);
				const end = closeIndex === -1 ? code.length : closeIndex + 3;
				push(`xml-comment-${i}`, code.slice(i, end), "token-comment");
				i = end;
				continue;
			}

			if (code[i] === "<") {
				const tagStart = i;
				let j = i + 1;
				let isClosing = false;
				if (code[j] === "/") {
					isClosing = true;
					j++;
				}

				const nameStart = j;
				while (j < code.length && /[a-zA-Z0-9_\-:]/.test(code[j] ?? "")) {
					j++;
				}
				const tagName = code.slice(nameStart, j);

				push(
					`xml-tag-open-${tagStart}`,
					`<${isClosing ? "/" : ""}`,
					"token-punctuation",
				);
				if (tagName) {
					push(`xml-tag-name-${nameStart}`, tagName, "token-key");
				}

				i = j;

				let attrIterations = 0;
				while (i < code.length && attrIterations < 1000) {
					attrIterations++;
					const whitespaceMatch = code.slice(i).match(/^\s+/);
					if (whitespaceMatch) {
						push(`xml-ws-${i}`, whitespaceMatch[0]);
						i += whitespaceMatch[0].length;
						continue;
					}

					if (code[i] === ">") {
						push(`xml-tag-close-${i}`, ">", "token-punctuation");
						i++;
						break;
					}
					if (code.startsWith("/>", i)) {
						push(`xml-tag-close-${i}`, "/>", "token-punctuation");
						i += 2;
						break;
					}

					const attrMatch = code.slice(i).match(/^[a-zA-Z0-9_\-:]+/);
					if (attrMatch) {
						push(`xml-attr-name-${i}`, attrMatch[0], "token-attribute");
						i += attrMatch[0].length;

						const eqMatch = code.slice(i).match(/^\s*=/);
						if (eqMatch) {
							push(`xml-eq-${i}`, eqMatch[0], "token-punctuation");
							i += eqMatch[0].length;

							const wsAfterEq = code.slice(i).match(/^\s+/);
							if (wsAfterEq) {
								push(`xml-ws-val-${i}`, wsAfterEq[0]);
								i += wsAfterEq[0].length;
							}

							if (code[i] === '"' || code[i] === "'") {
								const quote = code[i];
								push(`xml-quote-${i}`, quote, "token-string");
								i++;
								const valContentStart = i;
								while (i < code.length && code[i] !== quote) {
									i++;
								}
								push(
									`xml-attr-val-${valContentStart}`,
									code.slice(valContentStart, i),
									"token-string",
								);
								if (i < code.length && code[i] === quote) {
									push(`xml-quote-end-${i}`, quote, "token-string");
									i++;
								}
							} else {
								const unquotedMatch = code.slice(i).match(/^[^\s>]+/);
								if (unquotedMatch) {
									push(
										`xml-attr-val-unquoted-${i}`,
										unquotedMatch[0],
										"token-string",
									);
									i += unquotedMatch[0].length;
								}
							}
						}
						continue;
					}

					push(`xml-unexpected-${i}`, code[i]);
					i++;
				}
				continue;
			}

			const nextTag = code.indexOf("<", i);
			const textEnd = nextTag === -1 ? code.length : nextTag;
			push(`xml-text-${i}`, code.slice(i, textEnd));
			i = textEnd;
		}

		return tokens;
	}, []);

	const highlightMarkdown = useCallback((code: string) => {
		const inlinePattern =
			/(!?\[[^\]]*?\]\([^)]+\)|`[^`]+`|\*\*\*[^*]+?\*\*\*|___[^_]+?___|\*\*[^*]+?\*\*|__[^_]+?__|~~[^~]+?~~|\*(?!\s)(?:\\.|[^*])*(?:[^*\s])\*|_(?!\s)(?:\\.|[^_])*(?:[^_\s])_)/g;

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
					push("`", "token-md-code-tick");
					push(token.slice(1, -1), "token-md-code");
					push("`", "token-md-code-tick");
				} else if (/^\*\*\*/.test(token) || /^___/.test(token)) {
					push("**", "token-md-bold");
					push("*", "token-md-italic");
					push(token.slice(3, -3), "token-md-bold-text token-md-italic-text");
					push("*", "token-md-italic");
					push("**", "token-md-bold");
				} else if (/^\*\*/.test(token) || /^__/.test(token)) {
					push("**", "token-md-bold");
					push(token.slice(2, -2), "token-md-bold-text");
					push("**", "token-md-bold");
				} else if (/^\*(?!\*)/.test(token) || /^_(?!_)/.test(token)) {
					push("*", "token-md-italic");
					push(token.slice(1, -1), "token-md-italic-text");
					push("*", "token-md-italic");
				} else if (/^~~/.test(token)) {
					push("~~", "token-md-strike");
					push(token.slice(2, -2), "token-md-strike-text");
					push("~~", "token-md-strike");
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

		const lines = code.split("\n");
		return lines.map((line, lineIdx) => {
			const lineKey = `md-line-${lineIdx}`;
			const newline = lineIdx < lines.length - 1 ? "\n" : "";

			const headerMatch = line.match(/^(#{1,6})(\s+)(.*)$/);
			if (headerMatch) {
				return (
					<span key={lineKey}>
						<span className="token-md-header">{headerMatch[1] ?? ""}</span>
						<span>{headerMatch[2] ?? " "}</span>
						<span className="token-md-header-text">
							{renderInline(headerMatch[3] ?? "", `${lineKey}-header`)}
						</span>
						{newline}
					</span>
				);
			}

			if (/^(\s*)(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
				return (
					<span key={lineKey} className="token-md-hr">
						{line}
						{newline}
					</span>
				);
			}

			const blockquoteMatch = line.match(/^(\s*>+\s*)(.*)$/);
			if (blockquoteMatch) {
				return (
					<span key={lineKey}>
						<span className="token-md-quote-marker">
							{blockquoteMatch[1] ?? ""}
						</span>
						<span className="token-md-quote-text">
							{renderInline(blockquoteMatch[2] ?? "", `${lineKey}-quote`)}
						</span>
						{newline}
					</span>
				);
			}

			const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
			if (listMatch) {
				return (
					<span key={lineKey}>
						<span>{listMatch[1] ?? ""}</span>
						<span className="token-md-list-marker">{listMatch[2] ?? ""}</span>
						<span> </span>
						{renderInline(listMatch[3] ?? "", `${lineKey}-list`)}
						{newline}
					</span>
				);
			}

			return (
				<span key={lineKey}>
					{renderInline(line || " ", `${lineKey}-plain`)}
					{newline}
				</span>
			);
		});
	}, []);

	const highlightFor = (lang: string, code: string): string | ReactNode[] => {
		if (lang === "json") return highlightJSON(code);
		if (lang === "markdown" || lang === "md") return highlightMarkdown(code);
		if (lang === "xml" || lang === "html" || lang === "svg")
			return highlightXML(code);
		return code;
	};

	const renderMessageContent = () => {
		const codeBlockRegex = /```([^\n]*)\n?([\s\S]*?)```/g;
		const unclosedCodeBlockRegex = /```([^\n]*)\n([\s\S]+)$/;
		const displayContent = /(?:^|\n)```$/.test(content)
			? content.replace(/```$/, "")
			: content;
		const parts = [];
		let lastIndex = 0;

		const unclosedMatch = unclosedCodeBlockRegex.exec(displayContent);
		if (unclosedMatch) {
			const [_fullMatch, language, code] = unclosedMatch;
			const beforeBlock = displayContent.slice(0, unclosedMatch.index);

			if (beforeBlock.trim()) {
				parts.push(
					<span key="text-0" style={{ whiteSpace: "pre-wrap" }}>
						{beforeBlock}
					</span>,
				);
			}

			const languageLabel = (language || "").trim();
			const lang = (languageLabel || "code").toLowerCase();
			let cleanedCode = code || "";
			const safeLang = lang.replace(/[^\w-]/g, "");
			if (safeLang) {
				try {
					const duplicateMarkerPattern = new RegExp(
						`^\\s*\`\`\`${escapeRegExp(safeLang)}\\s*\\n`,
						"i",
					);
					cleanedCode = cleanedCode.replace(duplicateMarkerPattern, "");
				} catch {}
			}

			parts.push(
				codeBlock(
					"code-unclosed",
					languageLabel,
					highlightFor(lang, cleanedCode),
				),
			);

			return parts.length > 0 ? (
				parts
			) : (
				<span style={{ whiteSpace: "pre-wrap" }}>{content}</span>
			);
		}

		for (
			let match = codeBlockRegex.exec(displayContent);
			match !== null;
			match = codeBlockRegex.exec(displayContent)
		) {
			if (match.index > lastIndex) {
				const textBefore = displayContent.slice(lastIndex, match.index);
				const cleanedTextBefore = textBefore.replace(/\n?\s*`{3,}\s*$/g, "");
				if (cleanedTextBefore.trim()) {
					parts.push(
						<span key={`text-${lastIndex}`} style={{ whiteSpace: "pre-wrap" }}>
							{cleanedTextBefore}
						</span>,
					);
				}
			}

			const [, language, code] = match;
			const languageLabel = (language || "").trim();
			const lang = (languageLabel || "code").toLowerCase();

			parts.push(
				codeBlock(
					`code-${match.index}`,
					languageLabel,
					highlightFor(lang, code || ""),
				),
			);

			lastIndex = match.index + match[0].length;
		}

		if (lastIndex < displayContent.length) {
			let remainingText = displayContent.slice(lastIndex);
			if (remainingText.trim()) {
				remainingText = remainingText.replace(/\n?\s*`{3,}\s*$/g, "");
			}
			if (remainingText.trim()) {
				const langWithCodePattern = /^(xml|html|svg|json)\s*\n+([\s\S]+)$/i;
				const langMatch = langWithCodePattern.exec(remainingText.trim());

				if (langMatch?.[1] && langMatch[2]) {
					const lang = langMatch[1];
					const highlighter =
						lang.toLowerCase() === "json" ? highlightJSON : highlightXML;
					parts.push(
						codeBlock(
							`code-${lastIndex}`,
							lang.toUpperCase(),
							highlighter(langMatch[2].trim()),
						),
					);
				} else if (/^\s*<[\s\S]*>\s*$/.test(remainingText.trim())) {
					parts.push(
						codeBlock(
							`code-${lastIndex}`,
							"XML",
							highlightXML(remainingText.trim()),
						),
					);
				} else {
					parts.push(
						<span key={`text-${lastIndex}`} style={{ whiteSpace: "pre-wrap" }}>
							{remainingText}
						</span>,
					);
				}
			}
		}

		return parts.length > 0 ? (
			parts
		) : (
			<span style={{ whiteSpace: "pre-wrap" }}>{displayContent}</span>
		);
	};

	return renderMessageContent();
}
