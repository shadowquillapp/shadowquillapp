import { useMemo } from "react";

/**
 * Calculates word and character counts for a given text.
 */
export function useTextStats(text: string | null | undefined): {
	wordCount: number;
	charCount: number;
} {
	return useMemo(() => {
		const textValue = text || "";
		const trimmed = textValue.trim();
		const wordCount = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
		const charCount = textValue.length;
		return { wordCount, charCount };
	}, [text]);
}
