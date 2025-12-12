import { useCallback, useEffect, useRef } from "react";
import { setJSON } from "@/lib/local-storage";

/**
 * Hook for managing panel resizing with mouse drag.
 */
export function usePanelResize(
	leftPanelWidth: number,
	setLeftPanelWidth: React.Dispatch<React.SetStateAction<number>>,
	isResizing: boolean,
	setIsResizing: React.Dispatch<React.SetStateAction<boolean>>,
	panelsRef: React.RefObject<HTMLDivElement | null>,
) {
	const grabOffsetRef = useRef<number>(0);
	const latestPanelWidthRef = useRef(leftPanelWidth);

	useEffect(() => {
		latestPanelWidthRef.current = leftPanelWidth;
	}, [leftPanelWidth]);

	const handleResizeStart = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			if (panelsRef.current) {
				const rect = panelsRef.current.getBoundingClientRect();
				const currentDividerX = rect.left + (rect.width * leftPanelWidth) / 100;
				grabOffsetRef.current = e.clientX - currentDividerX;
			}
			setIsResizing(true);
		},
		[leftPanelWidth, setIsResizing, panelsRef],
	);

	useEffect(() => {
		if (!isResizing) return;

		const handleMouseMove = (e: MouseEvent) => {
			if (!panelsRef.current) return;
			const rect = panelsRef.current.getBoundingClientRect();
			const adjustedX = e.clientX - grabOffsetRef.current;
			const newWidth = ((adjustedX - rect.left) / rect.width) * 100;

			const MIN_PANE_WIDTH_PX = 480;
			const minPercentage = (MIN_PANE_WIDTH_PX / rect.width) * 100;
			const maxPercentage = 100 - minPercentage;

			setLeftPanelWidth(
				Math.min(maxPercentage, Math.max(minPercentage, newWidth)),
			);
		};

		const handleMouseUp = () => {
			setIsResizing(false);
			setJSON("shadowquill:panelWidth", latestPanelWidthRef.current);
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
		};
	}, [isResizing, setLeftPanelWidth, setIsResizing, panelsRef.current]);

	return { handleResizeStart };
}
