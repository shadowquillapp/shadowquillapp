import { useCallback, useState } from "react";
import { copyToClipboard } from "../utils/copyMessage";

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
