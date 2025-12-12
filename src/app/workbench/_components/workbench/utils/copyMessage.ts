/**
 * Extracts content from code fences if present, otherwise returns the original content.
 * Removes duplicate code fence markers from the extracted content.
 */
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

/**
 * Copies text to clipboard with fallback for older browsers.
 */
export async function copyToClipboard(content: string): Promise<void> {
	const textToCopy = extractCodeFenceContent(content);
	try {
		await navigator.clipboard.writeText(textToCopy);
	} catch {
		// Fallback for older browsers
		const textArea = document.createElement("textarea");
		textArea.value = textToCopy;
		document.body.appendChild(textArea);
		textArea.select();
		document.execCommand("copy");
		document.body.removeChild(textArea);
	}
}
