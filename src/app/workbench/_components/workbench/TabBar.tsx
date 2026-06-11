"use client";

import type { CSSProperties } from "react";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { getTaskTypeIcon } from "@/lib/task-type-icon";
import type { PromptPresetSummary } from "./types";

export interface TabInfo {
	id: string;
	label: string;
	preset: PromptPresetSummary;
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

	const checkScroll = useCallback(() => {
		const container = tabsContainerRef.current;
		if (!container) return;
		setShowLeftScroll(container.scrollLeft > 0);
		setShowRightScroll(
			container.scrollLeft < container.scrollWidth - container.clientWidth - 1,
		);
	}, []);

	const recalcSizes = useCallback(() => {
		const container = tabsContainerRef.current;
		if (!container) return;
		const addBtn = 28;
		const scrollReserve =
			(showLeftScroll ? 28 : 0) + (showRightScroll ? 28 : 0);
		const safety = 4;
		const available = container.clientWidth - addBtn - scrollReserve - safety;
		const n = Math.max(1, tabs.length);
		const ideal = Math.floor(available / n);
		const minW = 84;
		const maxW = 200;
		const width = Math.max(minW, Math.min(maxW, ideal));
		setComputedTabWidth(Number.isFinite(width) ? width : null);
	}, [showLeftScroll, showRightScroll, tabs.length]);

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
	}, [checkScroll, recalcSizes]);

	useEffect(() => {
		recalcSizes();
	}, [recalcSizes]);

	const scrollLeft = () => {
		tabsContainerRef.current?.scrollBy({ left: -200, behavior: "smooth" });
	};

	const scrollRight = () => {
		tabsContainerRef.current?.scrollBy({ left: 200, behavior: "smooth" });
	};

	const canAddTab = tabs.length < maxTabs;
	const noTabs = tabs.length === 0;
	const focusTabAt = (index: number) => {
		const target = tabs[index];
		if (!target) return;
		onSwitchTab(target.id);
		requestAnimationFrame(() => {
			tabsContainerRef.current
				?.querySelector<HTMLElement>(`[data-tab-id="${target.id}"]`)
				?.focus();
		});
	};

	const tabWidthStyle: CSSProperties = computedTabWidth
		? {
				minWidth: computedTabWidth,
				maxWidth: computedTabWidth,
				width: computedTabWidth,
			}
		: { minWidth: 100, maxWidth: 200 };

	return (
		<div
			className={`workbench-tab-bar ${embedded ? "workbench-tab-bar--embedded" : ""}`}
		>
			{showLeftScroll && (
				<button
					type="button"
					className="workbench-tab-scroll"
					onClick={scrollLeft}
					title="Scroll left"
					aria-label="Scroll tabs left"
				>
					<Icon name="chevron-left" style={{ width: 14, height: 14 }} />
				</button>
			)}

			<div
				ref={tabsContainerRef}
				role="tablist"
				aria-label="Workbench tabs"
				className={`workbench-tab-list ${noTabs ? "workbench-tab-list--empty" : ""}`}
			>
				{tabs.map((tab, index) => {
					const isActive = tab.id === activeTabId;
					const isDragging = draggedIndex === index;

					return (
						<Fragment key={tab.id}>
							{onReorderTabs &&
								draggedIndex !== null &&
								draggedIndex !== index && (
									<button
										key={`drop-before-${tab.id}`}
										type="button"
										className={`workbench-tab-drop-zone ${dragOverIndex === index ? "workbench-tab-drop-zone--target" : ""}`}
										aria-label="Drop zone for reordering tabs"
										onDragOver={(e) => {
											if (draggedIndex === null || draggedIndex === index)
												return;
											e.preventDefault();
											e.dataTransfer.dropEffect = "move";
											if (dragOverIndex !== index) {
												setDragOverIndex(index);
											}
										}}
										onDrop={(e) => {
											if (draggedIndex === null || dropHandledRef.current)
												return;
											e.preventDefault();
											dropHandledRef.current = true;

											let targetIndex = index;
											if (draggedIndex < index) {
												targetIndex = index - 1;
											}

											if (draggedIndex !== targetIndex) {
												onReorderTabs(draggedIndex, targetIndex);
											}

											setDraggedIndex(null);
											setDragOverIndex(null);
										}}
									/>
								)}

							<div
								role="tab"
								aria-selected={isActive}
								aria-label={tab.label}
								data-tab-id={tab.id}
								tabIndex={isActive ? 0 : -1}
								className={`workbench-tab fade-in-scale ${isActive ? "workbench-tab--active" : ""} ${isDragging ? "workbench-tab--dragging" : ""}`}
								style={{
									...tabWidthStyle,
									cursor: onReorderTabs ? "grab" : "pointer",
								}}
								draggable={!!onReorderTabs}
								onClick={() => onSwitchTab(tab.id)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										onSwitchTab(tab.id);
									} else if (e.key === "ArrowLeft") {
										e.preventDefault();
										focusTabAt(index === 0 ? tabs.length - 1 : index - 1);
									} else if (e.key === "ArrowRight") {
										e.preventDefault();
										focusTabAt(index === tabs.length - 1 ? 0 : index + 1);
									} else if (e.key === "Home") {
										e.preventDefault();
										focusTabAt(0);
									} else if (e.key === "End") {
										e.preventDefault();
										focusTabAt(tabs.length - 1);
									}
								}}
								onDragStart={(e) => {
									if (!onReorderTabs) return;
									dropHandledRef.current = false;
									setDraggedIndex(index);
									e.dataTransfer.effectAllowed = "move";
								}}
								onDragEnd={() => {
									if (!dropHandledRef.current) {
										setDraggedIndex(null);
										setDragOverIndex(null);
									}
									dropHandledRef.current = false;
								}}
								onDragOver={(e) => {
									if (
										!onReorderTabs ||
										draggedIndex === null ||
										draggedIndex === index
									)
										return;
									e.preventDefault();
									e.dataTransfer.dropEffect = "move";
									setDragOverIndex(index);
								}}
								onDrop={(e) => {
									if (
										!onReorderTabs ||
										draggedIndex === null ||
										dropHandledRef.current
									)
										return;
									e.preventDefault();
									dropHandledRef.current = true;

									const targetIndex = index;

									if (draggedIndex !== targetIndex) {
										onReorderTabs(draggedIndex, targetIndex);
									}

									setDraggedIndex(null);
									setDragOverIndex(null);
								}}
							>
								<Icon
									name={getTaskTypeIcon(tab.preset.taskType)}
									className="workbench-tab__icon"
								/>

								<span className="workbench-tab__label">{tab.label}</span>

								<button
									type="button"
									className="workbench-tab__close"
									onClick={(e) => {
										e.stopPropagation();
										onCloseTab(tab.id);
									}}
									title="Close tab"
									aria-label={`Close ${tab.label}`}
								>
									<Icon name="close" style={{ width: 10, height: 10 }} />
								</button>
							</div>
						</Fragment>
					);
				})}

				{onReorderTabs && draggedIndex !== null && (
					<button
						type="button"
						className={`workbench-tab-drop-zone ${dragOverIndex === tabs.length ? "workbench-tab-drop-zone--target" : ""}`}
						aria-label="Drop zone for reordering tabs"
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

							if (draggedIndex !== tabs.length - 1) {
								onReorderTabs(draggedIndex, tabs.length - 1);
							}

							setDraggedIndex(null);
							setDragOverIndex(null);
						}}
					/>
				)}

				<button
					type="button"
					className={`workbench-tab-new ${embedded ? "" : "workbench-tab-new--standalone"}`}
					onClick={onNewTab}
					disabled={!canAddTab}
					aria-label="New tab"
					title={canAddTab ? "New tab" : `Maximum ${maxTabs} tabs reached`}
					style={
						noTabs
							? { position: "relative", zIndex: 10, overflow: "visible" }
							: undefined
					}
				>
					<Icon name="plus" style={{ width: 12, height: 12 }} />
				</button>
			</div>

			{showRightScroll && (
				<button
					type="button"
					className="workbench-tab-scroll"
					onClick={scrollRight}
					title="Scroll right"
					aria-label="Scroll tabs right"
				>
					<Icon name="chevron-right" style={{ width: 14, height: 14 }} />
				</button>
			)}
		</div>
	);
}
