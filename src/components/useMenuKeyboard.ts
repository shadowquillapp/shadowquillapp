"use client";

import type React from "react";
import { useEffect, useLayoutEffect } from "react";

interface MenuKeyboardOptions {
	open: boolean;
	onClose: () => void;
	menuRef: React.RefObject<HTMLElement | null>;
	triggerRef: React.RefObject<HTMLButtonElement | null>;
}

function enabledItems(menu: HTMLElement | null): HTMLButtonElement[] {
	if (!menu) return [];
	return Array.from(
		menu.querySelectorAll<HTMLButtonElement>(".menu-item:not(:disabled)"),
	);
}

/**
 * Shared keyboard behavior for portal dropdown menus (.menu-panel):
 * Escape closes and restores trigger focus; the selected (or first
 * enabled) item is focused on open; the returned handler implements
 * ArrowUp/ArrowDown (wrapping), Home/End, and Tab-to-close.
 */
export function useMenuKeyboard({
	open,
	onClose,
	menuRef,
	triggerRef,
}: MenuKeyboardOptions): (event: React.KeyboardEvent<HTMLElement>) => void {
	useEffect(() => {
		if (!open) return;
		const onEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
				triggerRef.current?.focus();
			}
		};
		document.addEventListener("keydown", onEsc);
		return () => document.removeEventListener("keydown", onEsc);
	}, [open, onClose, triggerRef]);

	useLayoutEffect(() => {
		if (!open) return;
		const items = enabledItems(menuRef.current);
		const selected = items.find(
			(item) => item.getAttribute("data-selected") === "true",
		);
		(selected ?? items[0])?.focus();
	}, [open, menuRef]);

	return (event: React.KeyboardEvent<HTMLElement>) => {
		const items = enabledItems(menuRef.current);
		if (items.length === 0) return;
		const active = document.activeElement;
		const currentIndex =
			active instanceof HTMLButtonElement ? items.indexOf(active) : -1;

		let nextIndex: number;
		switch (event.key) {
			case "ArrowDown":
				nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
				break;
			case "ArrowUp":
				nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
				break;
			case "Home":
				nextIndex = 0;
				break;
			case "End":
				nextIndex = items.length - 1;
				break;
			case "Tab":
				onClose();
				return;
			default:
				return;
		}
		event.preventDefault();
		items[nextIndex]?.focus();
	};
}
