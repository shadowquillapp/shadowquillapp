export const isMarkdownLang = (lang: string): boolean =>
	lang === "markdown" || lang === "md";

export const hasMarkdownFence = (content: string): boolean => {
	if (!content) return false;

	const displayContent = /(?:^|\n)```$/.test(content)
		? content.replace(/```$/, "")
		: content;

	const unclosedMatch = /```([^\n]*)\n([\s\S]+)$/.exec(displayContent);
	if (unclosedMatch) {
		const lang = ((unclosedMatch[1] ?? "").trim() || "code").toLowerCase();
		if (isMarkdownLang(lang)) return true;
	}

	const codeBlockRegex = /```([^\n]*)\n?([\s\S]*?)```/g;
	for (
		let match = codeBlockRegex.exec(displayContent);
		match !== null;
		match = codeBlockRegex.exec(displayContent)
	) {
		const lang = ((match[1] ?? "").trim() || "code").toLowerCase();
		if (isMarkdownLang(lang)) return true;
	}

	return false;
};
