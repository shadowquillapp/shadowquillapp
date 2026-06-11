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
		rowHeight: 24,
		align: "end",
		menuWidth: Math.max(40, `${versions.length}`.length * 8 + 24),
	});

	const handleMenuKeyDown = useMenuKeyboard({
		open: showVersionDropdown,
		onClose: closeMenu,
		menuRef,
		triggerRef: versionDropdownRef,
	});

	const toggleMenu = () => {
		if (versions.length === 0) return;
		setShowVersionDropdown(!showVersionDropdown);
	};

	return (
		<div style={{ position: "relative" }}>
			<button
				ref={versionDropdownRef}
				type="button"
				className="panel__head-action"
				aria-haspopup="menu"
				aria-expanded={showVersionDropdown}
				aria-label={
					versions.length > 0 && activeTab
						? `Switch version, currently version ${currentVersionIndex}`
						: "No versions available"
				}
				disabled={versions.length === 0}
				onClick={toggleMenu}
				title={
					versions.length > 0 && activeTab
						? `Version ${currentVersionIndex} - Click to switch versions`
						: "No versions"
				}
			>
				<Icon name="git-compare" style={{ width: 11, height: 11 }} />
				<span>v{currentVersionIndex}</span>
			</button>
			{showVersionDropdown &&
				versions.length > 0 &&
				dropdownPos &&
				typeof document !== "undefined" &&
				createPortal(
					<div
						ref={menuRef}
						role="menu"
						onKeyDown={handleMenuKeyDown}
						className={`version-dropdown-menu fixed z-[10001] overflow-y-auto ${
							dropdownPos.openUpward ? "fade-in-up" : "fade-in-down"
						}`}
						style={{
							top: dropdownPos.top,
							left: dropdownPos.left,
							width: dropdownPos.width,
							maxHeight: dropdownPos.maxHeight,
						}}
					>
						{versions.map((version, index) => {
							const versionNum = index + 1;
							const isCurrentVersion = Boolean(
								activeTab && version.id === activeTab.versionGraph.activeId,
							);

							return (
								<button
									key={version.id}
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										if (!isCurrentVersion && activeTab) {
											jumpToVersion(version.id);
										}
									}}
									className="version-dropdown-item"
									role="menuitem"
									aria-current={isCurrentVersion ? "true" : undefined}
									disabled={isCurrentVersion}
								>
									v{versionNum}
								</button>
							);
						})}
					</div>,
					document.body,
				)}
		</div>
	);
}
