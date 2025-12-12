import { useCallback, useState } from "react";
import { copyToClipboard } from "../utils/copyMessage";

/**
 * Hook for copying message content to clipboard with visual feedback.
 * Returns the copy function and the currently copied message ID.
 */
export function useCopyMessage() {
	const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

	const copyMessage = useCallback(
		async (messageId: string, content: string) => {
			await copyToClipboard(content);
			setCopiedMessageId(messageId);
			setTimeout(() => setCopiedMessageId(null), 2000);
		},
		[],
	);

	return { copyMessage, copiedMessageId };
}
