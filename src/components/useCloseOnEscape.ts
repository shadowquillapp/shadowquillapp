"use client";

import { useEffect } from "react";

export function useCloseOnEscape(open: boolean, onClose: () => void): void {
	useEffect(() => {
		if (!open) return;

		const onEscapeKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};

		document.addEventListener("keydown", onEscapeKey);
		return () => document.removeEventListener("keydown", onEscapeKey);
	}, [open, onClose]);
}
