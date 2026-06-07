"use client";

import { useEffect } from "react";

export function useCloseOnEscape(open: boolean, onClose: () => void): void {
	useEffect(() => {
		if (!open) return;

		const onEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};

		document.addEventListener("keydown", onEsc);
		return () => document.removeEventListener("keydown", onEsc);
	}, [open, onClose]);
}
