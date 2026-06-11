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
}

export function computeMenuPosition(
	triggerRect: DOMRect,
	itemCount: number,
	{
		rowHeight = 40,
		padding = 16,
		maxHeightCap = 300,
		gap = 4,
	}: ComputeMenuPositionOptions = {},
): MenuPosition {
	const viewportHeight = window.innerHeight;
	const viewportWidth = window.innerWidth;

	const estimatedDropdownHeight = itemCount * rowHeight + padding;

	const spaceBelow = viewportHeight - triggerRect.bottom - 8;
	const spaceAbove = triggerRect.top - 8;

	const openUpward =
		spaceBelow < estimatedDropdownHeight && spaceAbove > spaceBelow;

	const availableSpace = openUpward ? spaceAbove : spaceBelow;
	const maxHeight = Math.max(
		0,
		Math.min(estimatedDropdownHeight, availableSpace, maxHeightCap),
	);

	const dropdownWidth = triggerRect.width;
	const maxLeft = Math.max(8, viewportWidth - dropdownWidth - 8);
	const left = Math.max(8, Math.min(triggerRect.left, maxLeft));

	return {
		top: openUpward
			? triggerRect.top - maxHeight - gap
			: triggerRect.bottom + gap,
		left,
		width: dropdownWidth,
		maxHeight,
		openUpward,
	};
}
