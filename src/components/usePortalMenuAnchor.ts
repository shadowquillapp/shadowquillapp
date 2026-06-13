"use client";

import type React from "react";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
	computeMenuPosition,
	type MenuPosition,
} from "@/components/menu-position";

interface PortalMenuAnchorOptions {
	open: boolean;
	onClose: () => void;
	triggerRef: React.RefObject<HTMLElement | null>;
	menuRef: React.RefObject<HTMLElement | null>;
	itemCount: number;
	rowHeight?: number;
	align?: "start" | "end" | "viewport-end";
	menuWidth?: number;
	gap?: number;
	verticalAnchorSelector?: string;
}

export function usePortalMenuAnchor({
	open,
	onClose,
	triggerRef,
	menuRef,
	itemCount,
	rowHeight,
	align,
	menuWidth,
	gap,
	verticalAnchorSelector,
}: PortalMenuAnchorOptions): MenuPosition | null {
	const [position, setPosition] = useState<MenuPosition | null>(null);

	const calculate = useCallback(() => {
		if (!triggerRef.current) return null;
		const triggerRect = triggerRef.current.getBoundingClientRect();
		const verticalAnchorRect = verticalAnchorSelector
			? triggerRef.current
					.closest(verticalAnchorSelector)
					?.getBoundingClientRect()
			: undefined;
		return computeMenuPosition(triggerRect, itemCount, {
			...(rowHeight === undefined ? {} : { rowHeight }),
			...(align === undefined ? {} : { align }),
			...(menuWidth === undefined ? {} : { menuWidth }),
			...(gap === undefined ? {} : { gap }),
			...(verticalAnchorRect === undefined ? {} : { verticalAnchorRect }),
		});
	}, [
		triggerRef,
		itemCount,
		rowHeight,
		align,
		menuWidth,
		gap,
		verticalAnchorSelector,
	]);

	const updatePosition = useCallback(() => {
		setPosition((prev) => {
			const next = calculate();
			if (
				prev?.top === next?.top &&
				prev?.left === next?.left &&
				prev?.width === next?.width &&
				prev?.maxHeight === next?.maxHeight &&
				prev?.openUpward === next?.openUpward
			) {
				return prev;
			}
			return next;
		});
	}, [calculate]);

	useLayoutEffect(() => {
		if (!open) {
			setPosition(null);
			return;
		}
		updatePosition();
	}, [open, updatePosition]);

	useEffect(() => {
		if (!open) return;

		const handlePointerOutside = (event: MouseEvent) => {
			const target = event.target as Node;
			if (
				triggerRef.current?.contains(target) ||
				menuRef.current?.contains(target)
			) {
				return;
			}
			onClose();
		};

		document.addEventListener("mousedown", handlePointerOutside);
		return () =>
			document.removeEventListener("mousedown", handlePointerOutside);
	}, [open, onClose, triggerRef, menuRef]);

	useEffect(() => {
		if (!open) return;

		const handleReposition = () => updatePosition();
		window.addEventListener("resize", handleReposition);
		window.addEventListener("scroll", handleReposition, true);
		return () => {
			window.removeEventListener("resize", handleReposition);
			window.removeEventListener("scroll", handleReposition, true);
		};
	}, [open, updatePosition]);

	if (!open) return null;
	return position ?? calculate();
}
