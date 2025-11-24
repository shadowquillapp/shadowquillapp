import { Icon } from "@/components/Icon";
import { Fragment, useEffect, useRef, useState } from "react";
import type { PromptPresetSummary } from "./types";

export interface TabInfo {
	id: string;
	label: string;
	preset: PromptPresetSummary;
	isDirty: boolean;
}

interface TabBarProps {
	tabs: TabInfo[];
	activeTabId: string | null;
	maxTabs: number;
	onSwitchTab: (tabId: string) => void;
	onCloseTab: (tabId: string) => void;
	onNewTab: () => void;
	onReorderTabs?: (fromIndex: number, toIndex: number) => void;
	embedded?: boolean;
}

export function TabBar({
	tabs,
	activeTabId,
	maxTabs,
	onSwitchTab,
	onCloseTab,
	onNewTab,
	onReorderTabs,
	embedded = false,
}: TabBarProps) {
	const tabsContainerRef = useRef<HTMLDivElement>(null);
	const [showLeftScroll, setShowLeftScroll] = useState(false);
	const [showRightScroll, setShowRightScroll] = useState(false);
	const [computedTabWidth, setComputedTabWidth] = useState<number | null>(null);
	const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
	const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
	const dropHandledRef = useRef(false);

	// Check scroll position
	const checkScroll = () => {
		const container = tabsContainerRef.current;
		if (!container) return;
		setShowLeftScroll(container.scrollLeft > 0);
		setShowRightScroll(
			container.scrollLeft < container.scrollWidth - container.clientWidth - 1
		);
	};

	// Recalculate tab width based on available space
	const recalcSizes = () => {
		const container = tabsContainerRef.current;
		if (!container) return;
		const gap = embedded ? 6 : 4;
		const addBtn = embedded ? 32 : 28;
		const scrollReserve =
			(showLeftScroll ? 28 + gap : 0) + (showRightScroll ? 28 + gap : 0);
		// small safety padding to avoid crowding
		const safety = embedded ? 8 : 4;
		const available =
			container.clientWidth - addBtn - scrollReserve - safety - gap;
		const n = Math.max(1, tabs.length);
		// space per tab, accounting for gaps between them
		const ideal = Math.floor((available - gap * (n - 1)) / n);
		const minW = 84;
		const maxW = 180;
		const width = Math.max(minW, Math.min(maxW, ideal));
		setComputedTabWidth(Number.isFinite(width) ? width : null);
	};

	useEffect(() => {
		checkScroll();
		const container = tabsContainerRef.current;
		if (container) {
			container.addEventListener("scroll", checkScroll);
			window.addEventListener("resize", checkScroll);
			window.addEventListener("resize", recalcSizes);
			return () => {
				container.removeEventListener("scroll", checkScroll);
				window.removeEventListener("resize", checkScroll);
				window.removeEventListener("resize", recalcSizes);
			};
		}
		return undefined;
	}, [tabs]);

	// Recalc sizes when inputs change
	useEffect(() => {
		recalcSizes();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tabs.length, embedded, showLeftScroll, showRightScroll]);

	const scrollLeft = () => {
		tabsContainerRef.current?.scrollBy({ left: -200, behavior: "smooth" });
	};

	const scrollRight = () => {
		tabsContainerRef.current?.scrollBy({ left: 200, behavior: "smooth" });
	};

	const getTaskTypeIcon = (taskType: string) => {
		switch (taskType) {
			case "coding":
				return "git-compare";
			case "image":
				return "palette";
			case "video":
				return "eye";
			case "research":
				return "search";
			case "writing":
				return "edit";
			case "marketing":
				return "thumbsUp";
			default:
				return "folder-open";
		}
	};

	const canAddTab = tabs.length < maxTabs;
	const noTabs = tabs.length === 0;

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: embedded ? 6 : 4,
				background: embedded ? "transparent" : "var(--color-surface)",
				borderBottom: embedded ? "none" : "1px solid var(--color-outline)",
				padding: embedded ? 0 : "6px 8px",
				position: "relative",
				flexWrap: "nowrap",
				flex: embedded ? 1 : undefined,
				minWidth: embedded ? 0 : undefined,
				minHeight: embedded ? "auto" : "48px",
			}}
		>
			{/* Tab counter */}
			<div
				style={{
					fontSize: 10,
					color: "var(--color-on-surface-variant)",
					fontWeight: 500,
					flexShrink: 0,
					padding: "0 2px",
				}}
			>
				{tabs.length}/{maxTabs}
			</div>

			{/* Left scroll button */}
			{showLeftScroll && (
				<button
					type="button"
					className="md-btn"
					onClick={scrollLeft}
					style={{
						width: 28,
						height: 28,
						padding: 0,
						flexShrink: 0,
						background: "var(--color-surface-variant)",
					}}
					title="Scroll left"
				>
					<Icon name="chevron-left" style={{ width: 14, height: 14 }} />
				</button>
			)}

			{/* Tabs container */}
			<div
				ref={tabsContainerRef}
				style={{
					display: "flex",
					gap: 4,
					flex: 1,
					overflowX: noTabs ? "visible" : "auto",
					overflowY: noTabs ? "visible" : "hidden",
					scrollbarWidth: "none",
					msOverflowStyle: "none",
					minWidth: 0,
				}}
				className="hide-scrollbar"
			>
				{tabs.map((tab, index) => {
					const isActive = tab.id === activeTabId;
					const isDragging = draggedIndex === index;
					
					return (
						<Fragment key={tab.id}>
							{/* Drop zone before each tab (only show when dragging) */}
							{onReorderTabs && draggedIndex !== null && draggedIndex !== index && (
								<div
									key={`drop-before-${tab.id}`}
									className={`drop-zone ${dragOverIndex === index ? "drop-target" : ""}`}
									onDragOver={(e) => {
										if (draggedIndex === null || draggedIndex === index) return;
										e.preventDefault();
										e.dataTransfer.dropEffect = "move";
										if (dragOverIndex !== index) {
											setDragOverIndex(index);
										}
									}}
									onDrop={(e) => {
										if (draggedIndex === null || dropHandledRef.current) return;
										e.preventDefault();
										dropHandledRef.current = true;
										
										// Calculate correct target index
										// When moving forward, we need to account for the removal shifting indices
										let targetIndex = index;
										if (draggedIndex < index) {
											targetIndex = index - 1;
										}
										
										if (draggedIndex !== targetIndex) {
											onReorderTabs(draggedIndex, targetIndex);
										}
										
										// Clear immediately
										setDraggedIndex(null);
										setDragOverIndex(null);
									}}
									style={{
										width: 24,
										height: 32,
										flexShrink: 0,
										borderRadius: "4px",
										border: "1px dashed transparent",
										transition: "all 0.15s ease",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
									}}
								/>
							)}
							
							<div
								key={tab.id}
								role="tab"
								aria-selected={isActive}
								tabIndex={0}
								className={`md-btn tab-item ${isDragging ? "dragging" : ""}`}
								draggable={!!onReorderTabs}
							onClick={() => onSwitchTab(tab.id)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									onSwitchTab(tab.id);
								}
							}}
							onDragStart={(e) => {
								if (!onReorderTabs) return;
								dropHandledRef.current = false;
								setDraggedIndex(index);
								e.dataTransfer.effectAllowed = "move";
							}}
							onDragEnd={() => {
								// Cleanup if drop wasn't handled (dragged outside)
								if (!dropHandledRef.current) {
									setDraggedIndex(null);
									setDragOverIndex(null);
								}
								dropHandledRef.current = false;
							}}
							onDragOver={(e) => {
								// Prevent default to allow dropping, but don't set dragOverIndex for tabs
								if (!onReorderTabs || draggedIndex === null || draggedIndex === index) return;
								e.preventDefault();
								e.dataTransfer.dropEffect = "move";
							}}
							onDrop={(e) => {
								if (!onReorderTabs || draggedIndex === null || dropHandledRef.current) return;
								// Use the last highlighted drop zone position if available
								if (dragOverIndex !== null && dragOverIndex !== index) {
									e.preventDefault();
									dropHandledRef.current = true;
									
									// Calculate target based on dragOverIndex
									let targetIndex = dragOverIndex;
									if (dragOverIndex === tabs.length) {
										// Drop at end
										targetIndex = tabs.length - 1;
									} else if (draggedIndex < dragOverIndex) {
										targetIndex = dragOverIndex - 1;
									}
									
									if (draggedIndex !== targetIndex) {
										onReorderTabs(draggedIndex, targetIndex);
									}
									
									setDraggedIndex(null);
									setDragOverIndex(null);
								}
							}}
							style={{
								display: "flex",
								alignItems: "center",
								gap: 6,
								padding: "6px 8px",
								minWidth: computedTabWidth ?? 100,
								maxWidth: computedTabWidth ?? 180,
								width: computedTabWidth ?? undefined,
								height: 32,
								background: isActive
									? "var(--color-primary)"
									: "var(--color-surface-variant)",
								color: isActive
									? "var(--color-on-primary)"
									: "var(--color-on-surface)",
								border: isActive
									? "1px solid var(--color-primary)"
									: "1px solid var(--color-outline)",
								borderRadius: "8px 8px 0 0",
								position: "relative",
								flexShrink: 0,
								cursor: onReorderTabs ? "grab" : "pointer",
							}}
							onMouseEnter={(e) => {
								if (!isActive && !isDragging) {
									e.currentTarget.style.borderColor = "var(--color-primary)";
								}
							}}
							onMouseLeave={(e) => {
								if (!isActive && !isDragging) {
									e.currentTarget.style.borderColor = "var(--color-outline)";
								}
							}}
						>
							{/* Preset icon */}
							<Icon
								name={getTaskTypeIcon(tab.preset.taskType)}
								style={{
									width: 12,
									height: 12,
									flexShrink: 0,
									opacity: isActive ? 1 : 0.7,
								}}
							/>

							{/* Tab label with dirty indicator */}
							<span
								style={{
									flex: 1,
									fontSize: 11,
									fontWeight: isActive ? 600 : 500,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
									display: "flex",
									alignItems: "center",
									gap: 3,
									minWidth: 0,
								}}
							>
								{tab.label}
								{tab.isDirty && (
									<span
										style={{
											width: 6,
											height: 6,
											borderRadius: "50%",
											background: isActive
												? "var(--color-on-primary)"
												: "var(--color-primary)",
											flexShrink: 0,
										}}
									/>
								)}
							</span>

							{/* Close button */}
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onCloseTab(tab.id);
								}}
								style={{
									width: 16,
									height: 16,
									padding: 0,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									background: "transparent",
									border: "none",
									borderRadius: 4,
									cursor: "pointer",
									flexShrink: 0,
									opacity: 0.6,
									transition: "opacity 0.15s",
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.opacity = "1";
									e.currentTarget.style.background = isActive
										? "rgba(255,255,255,0.2)"
										: "rgba(0,0,0,0.1)";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.opacity = "0.6";
									e.currentTarget.style.background = "transparent";
								}}
								title="Close tab"
							>
								<Icon name="close" style={{ width: 10, height: 10 }} />
							</button>
						</div>
						</Fragment>
					);
				})}
				
				{/* Drop zone after last tab */}
				{onReorderTabs && draggedIndex !== null && (
					<div
						className={`drop-zone ${dragOverIndex === tabs.length ? "drop-target" : ""}`}
						onDragOver={(e) => {
							if (draggedIndex === null) return;
							e.preventDefault();
							e.dataTransfer.dropEffect = "move";
							if (dragOverIndex !== tabs.length) {
								setDragOverIndex(tabs.length);
							}
						}}
						onDrop={(e) => {
							if (draggedIndex === null || dropHandledRef.current) return;
							e.preventDefault();
							dropHandledRef.current = true;
							
							// Move to end
							if (draggedIndex !== tabs.length - 1) {
								onReorderTabs(draggedIndex, tabs.length - 1);
							}
							
							setDraggedIndex(null);
							setDragOverIndex(null);
						}}
						style={{
							width: 24,
							height: 32,
							flexShrink: 0,
							borderRadius: "4px",
							border: "1px dashed transparent",
							transition: "all 0.15s ease",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					/>
				)}
				
				{/* New tab button - positioned right after tabs */}
				<button
					type="button"
					className={`md-btn ${noTabs ? "glow-animation" : ""}`}
					onClick={onNewTab}
					disabled={!canAddTab}
					aria-label="New tab"
					title={canAddTab ? "New tab" : `Maximum ${maxTabs} tabs reached`}
					style={{
						width: embedded ? 32 : 28,
						height: embedded ? 32 : 28,
						padding: 0,
						flexShrink: 0,
						border: embedded ? "1px solid var(--color-outline)" : undefined,
						borderRadius: embedded ? "8px 8px 0 0" : 6,
						background: embedded
							? "transparent"
							: canAddTab
								? "var(--color-primary)"
								: "var(--color-surface-variant)",
						color: embedded
							? "var(--color-on-surface-variant)"
							: canAddTab
								? "var(--color-on-primary)"
								: "var(--color-outline)",
						cursor: canAddTab ? "pointer" : "not-allowed",
						opacity: canAddTab ? 1 : 0.5,
						transition: "background-color 0.15s, border-color 0.15s, color 0.15s",
						overflow: noTabs ? "visible" : undefined,
						position: noTabs ? "relative" : undefined,
						zIndex: noTabs ? 10 : undefined,
					}}
					onMouseEnter={(e) => {
						if (!canAddTab) return;
						if (embedded) {
							e.currentTarget.style.background = "var(--color-surface-variant)";
							e.currentTarget.style.borderColor = "var(--color-primary)";
							e.currentTarget.style.color = "var(--color-on-surface)";
						}
					}}
					onMouseLeave={(e) => {
						if (!canAddTab) return;
						if (embedded) {
							e.currentTarget.style.background = "transparent";
							e.currentTarget.style.borderColor = "var(--color-outline)";
							e.currentTarget.style.color = "var(--color-on-surface-variant)";
						}
					}}
				>
					<Icon
						name="plus"
						style={{
							width: embedded ? 12 : 14,
							height: embedded ? 12 : 14,
						}}
					/>
				</button>
			</div>

			{/* Right scroll button */}
			{showRightScroll && (
				<button
					type="button"
					className="md-btn"
					onClick={scrollRight}
					style={{
						width: 28,
						height: 28,
						padding: 0,
						flexShrink: 0,
						background: "var(--color-surface-variant)",
					}}
					title="Scroll right"
				>
					<Icon name="chevron-right" style={{ width: 14, height: 14 }} />
				</button>
			)}

			<style jsx>{`
				.hide-scrollbar::-webkit-scrollbar {
					display: none;
				}
				
				.tab-item {
					transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
				}
				
				.tab-item:active {
					cursor: grabbing !important;
				}
				
				.tab-item.dragging {
					opacity: 0.4;
					cursor: grabbing !important;
					z-index: 1000;
					transition: opacity 0.15s ease;
				}
				
				.drop-zone {
					transition: all 0.15s ease;
					position: relative;
				}
				
				.drop-zone::before {
					content: "";
					position: absolute;
					left: 50%;
					transform: translateX(-50%);
					width: 4px;
					height: 100%;
					border-radius: 2px;
					background: transparent;
					transition: all 0.15s ease;
				}
				
				.drop-zone.drop-target::before {
					width: 4px;
					background: var(--color-primary);
					box-shadow: 0 0 8px rgba(var(--color-primary-rgb, 99, 102, 241), 0.6);
				}
				
				@keyframes glow-pulse {
					0%, 100% {
						box-shadow: 0 0 10px var(--color-primary);
						opacity: 0.8;
					}
					50% {
						box-shadow: 0 0 20px var(--color-primary);
						opacity: 1;
					}
				}
				
				:global(.glow-animation) {
					position: relative;
					z-index: 10;
				}
				
				:global(.glow-animation::before) {
					content: "";
					position: absolute;
					inset: -4px;
					border-radius: inherit;
					animation: glow-pulse 2s ease-in-out infinite;
					z-index: -1;
					pointer-events: none;
				}
			`}</style>
		</div>
	);
}

