import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
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

/**
 * Version dropdown component for selecting and switching between versions.
 */
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

	return (
		<div style={{ position: "relative" }}>
			<button
				ref={versionDropdownRef}
				type="button"
				className={`md-btn ${versions.length > 0 ? "md-btn" : ""}`}
				disabled={versions.length === 0}
				onClick={() => {
					if (versions.length > 0) {
						setShowVersionDropdown(!showVersionDropdown);
					}
				}}
				title={
					versions.length > 0 && activeTab
						? `Version ${currentVersionIndex} - Click to switch versions`
						: "No versions"
				}
			>
				<Icon name="git-compare" style={{ width: 11, height: 11 }} />
				<span
					style={{
						fontSize: "10px",
						fontWeight: 700,
						letterSpacing: "0.02em",
					}}
				>
					v{currentVersionIndex}
				</span>
			</button>
			{showVersionDropdown &&
				versions.length > 0 &&
				typeof document !== "undefined" &&
				createPortal(
					<div
						className="version-dropdown-menu menu-panel slide-in-from-top-2 fixed z-[10001] animate-in overflow-y-auto"
						style={{
							top:
								(versionDropdownRef.current?.getBoundingClientRect().bottom ||
									0) + 4,
							left:
								versionDropdownRef.current?.getBoundingClientRect().left || 0,
							width:
								versionDropdownRef.current?.getBoundingClientRect().width || 0,
							maxHeight: 300,
						}}
					>
						{versions.map((version, index) => {
							const versionNum = index + 1;
							const isCurrentVersion = Boolean(
								activeTab && version.id === activeTab.versionGraph.activeId,
							);
							const isRefinement = version.metadata?.isRefinement === true;

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
									className="menu-item"
									style={{
										opacity: isCurrentVersion ? 0.6 : 1,
										cursor: isCurrentVersion ? "default" : "pointer",
										background: isCurrentVersion
											? "var(--color-primary)"
											: "transparent",
										color: isCurrentVersion
											? "var(--color-on-primary)"
											: "var(--color-on-surface)",
									}}
									disabled={isCurrentVersion}
								>
									<span
										style={{
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
											width: "100%",
										}}
									>
										<span
											style={{
												display: "flex",
												alignItems: "center",
												gap: "8px",
											}}
										>
											<span
												style={{
													fontSize: "12px",
													fontWeight: 600,
												}}
											>
												v{versionNum}
											</span>
											<span
												style={{
													fontSize: "11px",
													opacity: 0.7,
													textTransform: "uppercase",
													letterSpacing: "0.05em",
												}}
											>
												{isRefinement ? "Refinement" : "Base"}
											</span>
										</span>
										{isCurrentVersion && (
											<Icon name="check" style={{ width: 14, height: 14 }} />
										)}
									</span>
								</button>
							);
						})}
					</div>,
					document.body,
				)}
		</div>
	);
}
