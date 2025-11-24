import type { ReactNode } from "react";
import { useCallback } from "react";

interface MessageRendererProps {
	content: string;
	messageId: string;
	copiedMessageId: string | null;
	onCopy: (id: string, content: string) => void;
}

export function MessageRenderer({
	content,
	messageId,
	copiedMessageId,
	onCopy,
}: MessageRendererProps) {
	// Syntax highlighting helpers
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
			if (token.type === "whitespace" || token.type === "plain") {
				return <span key={`json-${idx}`}>{token.value}</span>;
			}
			return (
				<span key={`json-${idx}`} className={`token-${token.type}`}>
					{token.value}
				</span>
			);
		});
	}, []);

	const highlightXML = useCallback((code: string) => {
		const tokens: ReactNode[] = [];
		let i = 0;
		const MAX_ITERATIONS = 50000;
		let iterations = 0;

		while (i < code.length && iterations < MAX_ITERATIONS) {
			iterations++;

			if (code.startsWith("<!--", i)) {
				const closeIndex = code.indexOf("-->", i);
				const end = closeIndex === -1 ? code.length : closeIndex + 3;
				const comment = code.slice(i, end);
				tokens.push(
					<span key={`xml-comment-${i}`} className="token-comment">
						{comment}
					</span>,
				);
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

				tokens.push(
					<span key={`xml-tag-open-${tagStart}`} className="token-punctuation">
						&lt;{isClosing ? "/" : ""}
					</span>,
				);
				if (tagName) {
					tokens.push(
						<span key={`xml-tag-name-${nameStart}`} className="token-key">
							{tagName}
						</span>,
					);
				}

				i = j;

				let attrIterations = 0;
				while (i < code.length && attrIterations < 1000) {
					attrIterations++;
					const whitespaceMatch = code.slice(i).match(/^\s+/);
					if (whitespaceMatch) {
						tokens.push(<span key={`xml-ws-${i}`}>{whitespaceMatch[0]}</span>);
						i += whitespaceMatch[0].length;
						continue;
					}

					if (code[i] === ">") {
						tokens.push(
							<span key={`xml-tag-close-${i}`} className="token-punctuation">
								&gt;
							</span>,
						);
						i++;
						break;
					}
					if (code.startsWith("/>", i)) {
						tokens.push(
							<span key={`xml-tag-close-${i}`} className="token-punctuation">
								/&gt;
							</span>,
						);
						i += 2;
						break;
					}

					const attrMatch = code.slice(i).match(/^[a-zA-Z0-9_\-:]+/);
					if (attrMatch) {
						tokens.push(
							<span key={`xml-attr-name-${i}`} className="token-attribute">
								{attrMatch[0]}
							</span>,
						);
						i += attrMatch[0].length;

						const eqMatch = code.slice(i).match(/^\s*=/);
						if (eqMatch) {
							tokens.push(
								<span key={`xml-eq-${i}`} className="token-punctuation">
									{eqMatch[0]}
								</span>,
							);
							i += eqMatch[0].length;

							const wsAfterEq = code.slice(i).match(/^\s+/);
							if (wsAfterEq) {
								tokens.push(
									<span key={`xml-ws-val-${i}`}>{wsAfterEq[0]}</span>,
								);
								i += wsAfterEq[0].length;
							}

							if (code[i] === '"' || code[i] === "'") {
								const quote = code[i];
								tokens.push(
									<span key={`xml-quote-${i}`} className="token-string">
										{quote}
									</span>,
								);
								i++;
								const valContentStart = i;
								while (i < code.length && code[i] !== quote) {
									i++;
								}
								tokens.push(
									<span
										key={`xml-attr-val-${valContentStart}`}
										className="token-string"
									>
										{code.slice(valContentStart, i)}
									</span>,
								);
								if (i < code.length && code[i] === quote) {
									tokens.push(
										<span key={`xml-quote-end-${i}`} className="token-string">
											{quote}
										</span>,
									);
									i++;
								}
							} else {
								const unquotedMatch = code.slice(i).match(/^[^\s>]+/);
								if (unquotedMatch) {
									tokens.push(
										<span
											key={`xml-attr-val-unquoted-${i}`}
											className="token-string"
										>
											{unquotedMatch[0]}
										</span>,
									);
									i += unquotedMatch[0].length;
								}
							}
						}
						continue;
					}

					tokens.push(<span key={`xml-unexpected-${i}`}>{code[i]}</span>);
					i++;
				}
				continue;
			}

			const nextTag = code.indexOf("<", i);
			const textEnd = nextTag === -1 ? code.length : nextTag;
			const text = code.slice(i, textEnd);
			tokens.push(<span key={`xml-text-${i}`}>{text}</span>);
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
			let match: RegExpExecArray | null;
			let tokenIndex = 0;

			while ((match = inlinePattern.exec(text)) !== null) {
				if (match.index > lastIndex) {
					const plain = text.slice(lastIndex, match.index);
					nodes.push(
						<span key={`${keyPrefix}-plain-${tokenIndex++}`}>{plain}</span>,
					);
				}
				const token = match[0];

				if (/^`/.test(token)) {
					nodes.push(
						<span
							key={`${keyPrefix}-code-open-${tokenIndex++}`}
							className="token-md-code-tick"
						>
							`
						</span>,
					);
					nodes.push(
						<span
							key={`${keyPrefix}-code-text-${tokenIndex++}`}
							className="token-md-code"
						>
							{token.slice(1, -1)}
						</span>,
					);
					nodes.push(
						<span
							key={`${keyPrefix}-code-close-${tokenIndex++}`}
							className="token-md-code-tick"
						>
							`
						</span>,
					);
				} else if (/^\*\*\*/.test(token) || /^___/.test(token)) {
					nodes.push(
						<span
							key={`${keyPrefix}-bold-italic-open-${tokenIndex++}`}
							className="token-md-bold"
						>
							**
						</span>,
					);
					nodes.push(
						<span
							key={`${keyPrefix}-bold-italic-mid-${tokenIndex++}`}
							className="token-md-italic"
						>
							*
						</span>,
					);
					nodes.push(
						<span
							key={`${keyPrefix}-bold-italic-text-${tokenIndex++}`}
							className="token-md-bold-text token-md-italic-text"
						>
							{token.slice(3, -3)}
						</span>,
					);
					nodes.push(
						<span
							key={`${keyPrefix}-bold-italic-mid-close-${tokenIndex++}`}
							className="token-md-italic"
						>
							*
						</span>,
					);
					nodes.push(
						<span
							key={`${keyPrefix}-bold-italic-close-${tokenIndex++}`}
							className="token-md-bold"
						>
							**
						</span>,
					);
				} else if (/^\*\*/.test(token) || /^__/.test(token)) {
					nodes.push(
						<span
							key={`${keyPrefix}-bold-open-${tokenIndex++}`}
							className="token-md-bold"
						>
							**
						</span>,
					);
					nodes.push(
						<span
							key={`${keyPrefix}-bold-text-${tokenIndex++}`}
							className="token-md-bold-text"
						>
							{token.slice(2, -2)}
						</span>,
					);
					nodes.push(
						<span
							key={`${keyPrefix}-bold-close-${tokenIndex++}`}
							className="token-md-bold"
						>
							**
						</span>,
					);
				} else if (/^\*(?!\*)/.test(token) || /^_(?!_)/.test(token)) {
					nodes.push(
						<span
							key={`${keyPrefix}-italic-open-${tokenIndex++}`}
							className="token-md-italic"
						>
							*
						</span>,
					);
					nodes.push(
						<span
							key={`${keyPrefix}-italic-text-${tokenIndex++}`}
							className="token-md-italic-text"
						>
							{token.slice(1, -1)}
						</span>,
					);
					nodes.push(
						<span
							key={`${keyPrefix}-italic-close-${tokenIndex++}`}
							className="token-md-italic"
						>
							*
						</span>,
					);
				} else if (/^~~/.test(token)) {
					nodes.push(
						<span
							key={`${keyPrefix}-strike-open-${tokenIndex++}`}
							className="token-md-strike"
						>
							~~
						</span>,
					);
					nodes.push(
						<span
							key={`${keyPrefix}-strike-text-${tokenIndex++}`}
							className="token-md-strike-text"
						>
							{token.slice(2, -2)}
						</span>,
					);
					nodes.push(
						<span
							key={`${keyPrefix}-strike-close-${tokenIndex++}`}
							className="token-md-strike"
						>
							~~
						</span>,
					);
				} else if (/^\[/.test(token) || /^!\[/.test(token)) {
					const linkMatch = token.match(/^(!)?\[([^\]]+)]\(([^)]+)\)$/);
					if (linkMatch) {
						const isImage = Boolean(linkMatch[1]);
						nodes.push(
							<span
								key={`${keyPrefix}-link-open-${tokenIndex++}`}
								className="token-md-punctuation"
							>
								{isImage ? "![" : "["}
							</span>,
						);
						nodes.push(
							<span
								key={`${keyPrefix}-link-text-${tokenIndex++}`}
								className="token-md-link-text"
							>
								{linkMatch[2]}
							</span>,
						);
						nodes.push(
							<span
								key={`${keyPrefix}-link-mid-${tokenIndex++}`}
								className="token-md-punctuation"
							>
								](
							</span>,
						);
						nodes.push(
							<span
								key={`${keyPrefix}-link-url-${tokenIndex++}`}
								className="token-md-url"
							>
								{linkMatch[3]}
							</span>,
						);
						nodes.push(
							<span
								key={`${keyPrefix}-link-close-${tokenIndex++}`}
								className="token-md-punctuation"
							>
								)
							</span>,
						);
					} else {
						nodes.push(
							<span key={`${keyPrefix}-unknown-${tokenIndex++}`}>{token}</span>,
						);
					}
				} else {
					nodes.push(
						<span key={`${keyPrefix}-unknown-${tokenIndex++}`}>{token}</span>,
					);
				}
				lastIndex = match.index + token.length;
			}

			if (lastIndex < text.length) {
				nodes.push(
					<span key={`${keyPrefix}-plain-${tokenIndex++}`}>
						{text.slice(lastIndex)}
					</span>,
				);
			}

			return nodes;
		};

		const lines = code.split("\n");
		return lines.map((line, lineIdx) => {
			const lineKey = `md-line-${lineIdx}`;
			const newline = lineIdx < lines.length - 1 ? "\n" : "";

			const headerMatch = line.match(/^(#{1,6})(\s+)(.*)$/);
			if (headerMatch) {
				const hashSymbols = headerMatch[1] ?? "";
				const spacing = headerMatch[2] ?? " ";
				const headingText = headerMatch[3] ?? "";
				return (
					<span key={lineKey}>
						<span className="token-md-header">{hashSymbols}</span>
						<span>{spacing}</span>
						<span className="token-md-header-text">
							{renderInline(headingText, `${lineKey}-header`)}
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
				const quoteMarker = blockquoteMatch[1] ?? "";
				const quoteContent = blockquoteMatch[2] ?? "";
				return (
					<span key={lineKey}>
						<span className="token-md-quote-marker">{quoteMarker}</span>
						<span className="token-md-quote-text">
							{renderInline(quoteContent, `${lineKey}-quote`)}
						</span>
						{newline}
					</span>
				);
			}

			const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
			if (listMatch) {
				const listIndent = listMatch[1] ?? "";
				const listMarker = listMatch[2] ?? "";
				const listBody = listMatch[3] ?? "";
				return (
					<span key={lineKey}>
						<span>{listIndent}</span>
						<span className="token-md-list-marker">{listMarker}</span>
						<span> </span>
						{renderInline(listBody, `${lineKey}-list`)}
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

	const renderMessageContent = () => {
		// Handle both proper code blocks and malformed ones (e.g., missing closing backticks)
		const codeBlockRegex = /```([^\n]*)\n?([\s\S]*?)```/g;
		const unclosedCodeBlockRegex = /```([^\n]*)\n([\s\S]+)$/;
		// Ensure UI matches copy behavior: hide a final bare fence line (exactly ```) from display.
		const displayContent =
			/(?:^|\n)```$/.test(content) ? content.replace(/```$/, "") : content;
		const parts = [];
		let lastIndex = 0;
		let match;
		
		// First check for unclosed code block at the end
		const unclosedMatch = unclosedCodeBlockRegex.exec(displayContent);
		if (unclosedMatch) {
			// If we find an unclosed code block, treat it as a complete block
			const [fullMatch, language, code] = unclosedMatch;
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
			
			// Clean up duplicate opening markers (e.g., ```xml\n```xml\n<content>)
			let cleanedCode = code || "";
			const duplicateMarkerPattern = new RegExp(`^\\s*\`\`\`${lang}\\s*\\n`, 'i');
			cleanedCode = cleanedCode.replace(duplicateMarkerPattern, '');
			
			let highlightedCode;
			if (lang === "json") {
				highlightedCode = highlightJSON(cleanedCode);
			} else if (lang === "markdown" || lang === "md") {
				highlightedCode = highlightMarkdown(cleanedCode);
			} else if (lang === "xml" || lang === "html" || lang === "svg") {
				highlightedCode = highlightXML(cleanedCode);
			} else {
				highlightedCode = cleanedCode;
			}
			
			parts.push(
				<div
					key="code-unclosed"
					className="font-mono text-[11px] my-4 whitespace-pre-wrap overflow-x-auto bg-[var(--color-surface)] border border-[var(--color-outline)] rounded-lg p-4"
				>
					{languageLabel && (
						<div className="text-[9px] text-on-surface-variant uppercase mb-2 font-semibold opacity-60">
							{languageLabel}
						</div>
					)}
					<div className="overflow-x-auto">
						{highlightedCode}
					</div>
				</div>,
			);
			
			return parts.length > 0 ? <>{parts}</> : <span style={{ whiteSpace: "pre-wrap" }}>{content}</span>;
		}

		while ((match = codeBlockRegex.exec(displayContent)) !== null) {
			if (match.index > lastIndex) {
				const textBefore = displayContent.slice(lastIndex, match.index);
				// Remove a trailing fence-only line (e.g., ``` at bottom of a text segment)
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

			let highlightedCode;
			if (lang === "json") {
				highlightedCode = highlightJSON(code || "");
			} else if (lang === "markdown" || lang === "md") {
				highlightedCode = highlightMarkdown(code || "");
			} else if (lang === "xml" || lang === "html" || lang === "svg") {
				highlightedCode = highlightXML(code || "");
			} else {
				highlightedCode = code;
			}

		parts.push(
			<div
				key={`code-${match.index}`}
				className="font-mono text-[11px] my-4 whitespace-pre-wrap overflow-x-auto bg-[var(--color-surface)] border border-[var(--color-outline)] rounded-lg p-4"
			>
				{languageLabel && (
					<div className="text-[9px] text-on-surface-variant uppercase mb-2 font-semibold opacity-60">
						{languageLabel}
					</div>
				)}
				<div className="overflow-x-auto">
					{highlightedCode}
				</div>
			</div>,
		);

			lastIndex = match.index + match[0].length;
		}

		if (lastIndex < displayContent.length) {
			let remainingText = displayContent.slice(lastIndex);
			if (remainingText.trim()) {
				// Drop a trailing fence-only line (closing ```), so it is not rendered
				remainingText = remainingText.replace(/\n?\s*`{3,}\s*$/g, "");
			}
			if (remainingText.trim()) {
				// Check if text starts with a language identifier followed by XML/HTML/JSON
				const langWithCodePattern = /^(xml|html|svg|json)\s*\n+([\s\S]+)$/i;
				const langMatch = langWithCodePattern.exec(remainingText.trim());
				
				if (langMatch && langMatch[1] && langMatch[2]) {
					const lang = langMatch[1];
					const codeContent = langMatch[2];
					const normalizedLang = lang.toLowerCase();
					const highlighter = normalizedLang === 'json' ? highlightJSON : highlightXML;
					parts.push(
						<div
							key={`code-${lastIndex}`}
							className="font-mono text-[11px] my-4 whitespace-pre-wrap overflow-x-auto bg-[var(--color-surface)] border border-[var(--color-outline)] rounded-lg p-4"
						>
							<div className="text-[9px] text-on-surface-variant uppercase mb-2 font-semibold opacity-60">
								{lang.toUpperCase()}
							</div>
							<div className="overflow-x-auto">
								{highlighter(codeContent.trim())}
							</div>
						</div>,
					);
				} else {
					// Check if remaining text looks like XML/HTML that wasn't in code blocks
					const xmlPattern = /^\s*<[\s\S]*>\s*$/;
					if (xmlPattern.test(remainingText.trim())) {
						parts.push(
							<div
								key={`code-${lastIndex}`}
								className="font-mono text-[11px] my-4 whitespace-pre-wrap overflow-x-auto bg-[var(--color-surface)] border border-[var(--color-outline)] rounded-lg p-4"
							>
								<div className="text-[9px] text-on-surface-variant uppercase mb-2 font-semibold opacity-60">
									XML
								</div>
								<div className="overflow-x-auto">
									{highlightXML(remainingText.trim())}
								</div>
							</div>,
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
		}

		return parts.length > 0 ? (
			<>{parts}</>
		) : (
			<span style={{ whiteSpace: "pre-wrap" }}>{displayContent}</span>
		);
	};

	return renderMessageContent();
}

