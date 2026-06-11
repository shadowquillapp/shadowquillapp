"use client";

import type { ReactNode } from "react";
import { useCallback } from "react";
import { MarkdownCodeBlock } from "./components/MarkdownCodeBlock";
import { OutputContentToolbar } from "./components/OutputContentToolbar";
import { hasMarkdownFence, isMarkdownLang } from "./utils/markdown-fence";

interface MessageRendererProps {
	content: string;
	markdownRendered?: boolean;
	onToggleMarkdownView?: () => void;
	onCopy?: () => void;
	copyDisabled?: boolean;
	copied?: boolean;
}

const escapeRegExp = (value: string) =>
	value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const codeBlock = (key: string, label: string, body: ReactNode) => (
	<div
		key={key}
		className="my-4 overflow-x-auto whitespace-pre-wrap rounded-[var(--radius-sm)] border border-[var(--color-outline)] bg-[var(--color-surface)] p-4 font-mono text-[11px]"
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
	markdownRendered = true,
	onToggleMarkdownView,
	onCopy,
	copyDisabled = false,
	copied = false,
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

	const highlightFor = (lang: string, code: string): string | ReactNode[] => {
		if (lang === "json") return highlightJSON(code);
		return code;
	};

	const renderMessageContent = () => {
		const codeBlockRegex = /```([^\n]*)\n?([\s\S]*?)```/g;
		const unclosedCodeBlockRegex = /```([^\n]*)\n([\s\S]+)$/;
		const displayContent = /(?:^|\n)```$/.test(content)
			? content.replace(/```$/, "")
			: content;
		const parts: ReactNode[] = [];
		let lastIndex = 0;
		let markdownToolbarShown = false;

		const pushFenceBlock = (
			key: string,
			label: string,
			lang: string,
			code: string,
		) => {
			const showToolbar =
				isMarkdownLang(lang) &&
				!markdownToolbarShown &&
				(onCopy !== undefined || onToggleMarkdownView !== undefined);
			const showViewToggle = showToolbar && onToggleMarkdownView !== undefined;
			if (showToolbar) {
				markdownToolbarShown = true;
			}

			parts.push(
				isMarkdownLang(lang) ? (
					<MarkdownCodeBlock
						key={key}
						label={label}
						source={code}
						isRendered={markdownRendered}
						showToolbar={showToolbar}
						{...(showToolbar && onCopy !== undefined && { onCopy })}
						copyDisabled={copyDisabled}
						copied={copied}
						showViewToggle={showViewToggle}
						{...(showToolbar &&
							onToggleMarkdownView !== undefined && {
								onToggleView: onToggleMarkdownView,
							})}
					/>
				) : (
					codeBlock(key, label, highlightFor(lang, code))
				),
			);
		};

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

			pushFenceBlock("code-unclosed", languageLabel, lang, cleanedCode);

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

			pushFenceBlock(`code-${match.index}`, languageLabel, lang, code || "");

			lastIndex = match.index + match[0].length;
		}

		if (lastIndex < displayContent.length) {
			let remainingText = displayContent.slice(lastIndex);
			if (remainingText.trim()) {
				remainingText = remainingText.replace(/\n?\s*`{3,}\s*$/g, "");
			}
			if (remainingText.trim()) {
				const langWithCodePattern = /^(json)\s*\n+([\s\S]+)$/i;
				const langMatch = langWithCodePattern.exec(remainingText.trim());

				if (langMatch?.[1] && langMatch[2]) {
					parts.push(
						codeBlock(
							`code-${lastIndex}`,
							langMatch[1].toUpperCase(),
							highlightJSON(langMatch[2].trim()),
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

	const body = renderMessageContent();

	if (hasMarkdownFence(content)) {
		return body;
	}

	return (
		<>
			<OutputContentToolbar
				{...(onCopy !== undefined && { onCopy })}
				copyDisabled={copyDisabled}
				copied={copied}
			/>
			{body}
		</>
	);
}
