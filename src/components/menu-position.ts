export interface MenuPosition {
	top: number;
	left: number;
	width: number;
	maxHeight: number;
	openUpward: boolean;
}

interface ComputeMenuPositionOptions {
	rowHeight?: number;
	padding?: number;
	maxHeightCap?: number;
	gap?: number;
	align?: "start" | "end" | "viewport-end";
	menuWidth?: number;
	verticalAnchorRect?: DOMRect;
}

export function computeMenuPosition(
	triggerRect: DOMRect,
	itemCount: number,
	{
		rowHeight = 40,
		padding = 16,
		maxHeightCap = 300,
		gap = 4,
		align = "start",
		menuWidth,
		verticalAnchorRect,
	}: ComputeMenuPositionOptions = {},
): MenuPosition {
	const viewportHeight = window.innerHeight;
	const viewportWidth = window.innerWidth;
	const anchorRect = verticalAnchorRect ?? triggerRect;

	const estimatedDropdownHeight = itemCount * rowHeight + padding;

	const spaceBelow = viewportHeight - anchorRect.bottom - 8;
	const spaceAbove = anchorRect.top - 8;

	const openUpward =
		spaceBelow < estimatedDropdownHeight && spaceAbove > spaceBelow;

	const availableSpace = openUpward ? spaceAbove : spaceBelow;
	const maxHeight = Math.max(
		0,
		Math.min(estimatedDropdownHeight, availableSpace, maxHeightCap),
	);

	const dropdownWidth = menuWidth ?? triggerRect.width;
	const minLeft = 8;
	const maxLeft = Math.max(minLeft, viewportWidth - dropdownWidth - 8);
	const left =
		align === "viewport-end"
			? viewportWidth - dropdownWidth
			: align === "end"
				? Math.max(
						minLeft,
						Math.min(triggerRect.right - dropdownWidth, maxLeft),
					)
				: Math.max(minLeft, Math.min(triggerRect.left, maxLeft));

	return {
		top: openUpward
			? anchorRect.top - maxHeight - gap
			: anchorRect.bottom + gap,
		left,
		width: dropdownWidth,
		maxHeight,
		openUpward,
	};
}
