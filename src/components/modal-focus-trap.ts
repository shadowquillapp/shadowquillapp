import type React from "react";

export function trapModalTabKey(
	e: React.KeyboardEvent<HTMLElement>,
	root: HTMLElement | null,
): void {
	e.stopPropagation();
	if (e.key !== "Tab") return;
	const focusable = Array.from(
		root?.querySelectorAll<HTMLElement>(
			'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
		) ?? [],
	).filter((item) => item.offsetParent !== null);
	const first = focusable[0];
	const last = focusable[focusable.length - 1];
	if (!first || !last) return;
	if (e.shiftKey && document.activeElement === first) {
		e.preventDefault();
		last.focus();
	} else if (!e.shiftKey && document.activeElement === last) {
		e.preventDefault();
		first.focus();
	}
}
