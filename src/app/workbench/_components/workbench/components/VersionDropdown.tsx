import type React from "react";
import { useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { useMenuKeyboard } from "@/components/useMenuKeyboard";
import { usePortalMenuAnchor } from "@/components/usePortalMenuAnchor";
import type { VersionGraph } from "../types";

interface VersionDropdownProps {
	versionDropdownRef: React.RefObject<HTMLButtonElement | null>;
	showVersionDropdown: boolean;
	setShowVersionDropdown: (show: boolean) => void;
	versions: Array<{
		id: string;
		label: string;
		metadata?: { isRefinement?: boolean };
	}>;
	activeTab: { versionGraph: VersionGraph } | null;
	jumpToVersion: (versionId: string) => void;
}

export function VersionDropdown({
	versionDropdownRef,
	showVersionDropdown,
	setShowVersionDropdown,
	versions,
	activeTab,
	jumpToVersion,
}: VersionDropdownProps) {
	const currentVersionIndex =
		activeTab && versions.length > 0
			? versions.findIndex((v) => v.id === activeTab.versionGraph.activeId) + 1
			: 0;
	const activeVersionId = activeTab?.versionGraph.activeId;
	const hasVersions = versions.length > 0;

	const menuRef = useRef<HTMLDivElement | null>(null);

	const closeMenu = useCallback(
		() => setShowVersionDropdown(false),
		[setShowVersionDropdown],
	);

	const dropdownPos = usePortalMenuAnchor({
		open: showVersionDropdown,
		onClose: closeMenu,
		triggerRef: versionDropdownRef,
		menuRef,
		itemCount: versions.length,
		rowHeight: 32,
		align: "viewport-end",
		menuWidth: 120,
		gap: 0,
		verticalAnchorSelector: ".panel__head",
	});

	const handleMenuKeyDown = useMenuKeyboard({
		open: showVersionDropdown,
		onClose: closeMenu,
		menuRef,
		triggerRef: versionDropdownRef,
	});

	return (
		<>
			<button
				ref={versionDropdownRef}
				type="button"
				className="panel__head-action"
				aria-haspopup="menu"
				aria-expanded={showVersionDropdown}
				aria-label={
					hasVersions && activeTab
						? `Switch version, currently version ${currentVersionIndex}`
						: "No versions available"
				}
				disabled={!hasVersions}
				onClick={() => {
					if (hasVersions) setShowVersionDropdown(!showVersionDropdown);
				}}
				title={
					hasVersions && activeTab
						? `Version ${currentVersionIndex} - Click to switch versions`
						: "No versions"
				}
			>
				<Icon name="git-compare" style={{ width: 11, height: 11 }} />
				<span>V{currentVersionIndex}</span>
			</button>
			{showVersionDropdown &&
				hasVersions &&
				dropdownPos &&
				typeof document !== "undefined" &&
				createPortal(
					<div
						ref={menuRef}
						role="menu"
						onKeyDown={handleMenuKeyDown}
						className={`menu-panel menu-panel--attached fixed z-[10001] overflow-y-auto ${
							dropdownPos.openUpward
								? "menu-panel--attached-up fade-in-up"
								: "fade-in-down"
						}`}
						style={{
							top: dropdownPos.top,
							left: dropdownPos.left,
							width: dropdownPos.width,
							maxHeight: dropdownPos.maxHeight,
						}}
					>
						{versions.map((version, index) => {
							const isCurrentVersion = version.id === activeVersionId;

							return (
								<button
									key={version.id}
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										if (!isCurrentVersion) jumpToVersion(version.id);
									}}
									className="menu-item"
									role="menuitem"
									aria-current={isCurrentVersion ? "true" : undefined}
									data-selected={isCurrentVersion}
									disabled={isCurrentVersion}
								>
									<span className="flex items-center gap-2">
										<Icon name="git-compare" className="h-4 w-4" />
										Version {index + 1}
									</span>
								</button>
							);
						})}
					</div>,
					document.body,
				)}
		</>
	);
}
