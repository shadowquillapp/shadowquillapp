export function extractCodeFenceContent(content: string): string {
	let textToCopy = content;
	const fenceMatch = textToCopy.match(
		/^\s*```([^\n]*)\n?([\s\S]*?)\n```[\s\r]*$/,
	);
	if (fenceMatch) {
		const lang = (fenceMatch[1] || "").trim().toLowerCase();
		textToCopy = fenceMatch[2] || "";
		if (lang) {
			const duplicateMarkerPattern = new RegExp(
				`^\\s*\\\`\\\`\\\`${lang}\\s*\\n`,
				"i",
			);
			textToCopy = textToCopy.replace(duplicateMarkerPattern, "");
		}
	}
	return textToCopy;
}
