"use client";

import { Icon } from "@/components/Icon";

interface OutputContentToolbarProps {
	onCopy?: () => void;
	copyDisabled?: boolean;
	copied?: boolean;
	showViewToggle?: boolean;
	isRendered?: boolean;
	onToggleView?: () => void;
}

export function OutputContentToolbar({
	onCopy,
	copyDisabled = false,
	copied = false,
	showViewToggle = false,
	isRendered = true,
	onToggleView,
}: OutputContentToolbarProps) {
	if (!onCopy && !(showViewToggle && onToggleView)) {
		return null;
	}

	return (
		<div className="mb-2 flex items-center gap-2">
			{onCopy && (
				<button
					type="button"
					onClick={onCopy}
					disabled={copyDisabled}
					className="md-icon-btn disabled:cursor-not-allowed disabled:opacity-40"
					title="Copy response"
					aria-label="Copy response"
				>
					<Icon
						name={copied ? "check" : "copy"}
						style={{ width: 13, height: 13 }}
					/>
				</button>
			)}
			{showViewToggle && onToggleView && (
				<button
					type="button"
					className={
						isRendered
							? "mode-toggle mode-toggle--compact"
							: "mode-toggle mode-toggle--compact mode-toggle--source"
					}
					aria-pressed={!isRendered}
					aria-label="Toggle between rendered and source view"
					onClick={onToggleView}
				>
					<span className="mode-toggle-option">Rendered</span>
					<span className="mode-toggle-option">Source</span>
					<span className="mode-toggle-slider" aria-hidden="true" />
				</button>
			)}
		</div>
	);
}
