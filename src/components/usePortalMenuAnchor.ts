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
	align?: "start" | "end";
	menuWidth?: number;
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
}: PortalMenuAnchorOptions): MenuPosition | null {
	const [position, setPosition] = useState<MenuPosition | null>(null);

	const calculate = useCallback(() => {
		if (!triggerRef.current) return null;
		return computeMenuPosition(
			triggerRef.current.getBoundingClientRect(),
			itemCount,
			{
				...(rowHeight === undefined ? {} : { rowHeight }),
				...(align === undefined ? {} : { align }),
				...(menuWidth === undefined ? {} : { menuWidth }),
			},
		);
	}, [triggerRef, itemCount, rowHeight, align, menuWidth]);

	useLayoutEffect(() => {
		if (!open) {
			setPosition(null);
			return;
		}
		setPosition(calculate());
	}, [open, calculate]);

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

		const handleReposition = () => setPosition(calculate());
		window.addEventListener("resize", handleReposition);
		window.addEventListener("scroll", handleReposition, true);
		return () => {
			window.removeEventListener("resize", handleReposition);
			window.removeEventListener("scroll", handleReposition, true);
		};
	}, [open, calculate]);

	if (!open) return null;
	return position ?? calculate();
}
