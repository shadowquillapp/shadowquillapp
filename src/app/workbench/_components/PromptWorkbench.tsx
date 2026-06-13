"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDialog } from "@/components/DialogProvider";
import { getJSON } from "@/lib/local-storage";
import { setLastSelectedPresetKey } from "@/lib/preset-store";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import { InputPanel } from "./workbench/components/InputPanel";
import { OutputPanel } from "./workbench/components/OutputPanel";
import { useCopyMessage } from "./workbench/hooks/useCopyMessage";
import { useGeneration } from "./workbench/hooks/useGeneration";
import { useKeyboardShortcuts } from "./workbench/hooks/useKeyboardShortcuts";
import { useModelManager } from "./workbench/hooks/useModelManager";
import { usePanelResize } from "./workbench/hooks/usePanelResize";
import { usePresetManager } from "./workbench/hooks/usePresetManager";
import { useProjectManager } from "./workbench/hooks/useProjectManager";
import { useTextStats } from "./workbench/hooks/useTextStats";
import { useVersionNavigation } from "./workbench/hooks/useVersionNavigation";
import { PresetInfoDialog } from "./workbench/PresetInfoDialog";
import { PresetPickerModal } from "./workbench/PresetPickerModal";
import { TabBar } from "./workbench/TabBar";
import { useTabManager } from "./workbench/useTabManager";
import { versionList } from "./workbench/version-graph";

export default function PromptWorkbench() {
	const { showInfo, confirm } = useDialog();
	const {
		availableModels,
		modelLoadError,
		refreshModels,
		currentModelId,
		setCurrentModelId,
	} = useModelManager();
	const [showPresetInfo, setShowPresetInfo] = useState(false);
	const [showRefinementContext, setShowRefinementContext] = useState(false);
	const [showVersionDropdown, setShowVersionDropdown] = useState(false);
	const versionDropdownRef = useRef<HTMLButtonElement | null>(null);
	const [outputAnimateKey, setOutputAnimateKey] = useState(0);
	const [leftPanelWidth, setLeftPanelWidth] = useState(50);
	const [isResizing, setIsResizing] = useState(false);
	const panelsRef = useRef<HTMLDivElement | null>(null);
	const { copyMessage, copiedMessageId } = useCopyMessage();
	const scrollContainerRef = useRef<HTMLDivElement | null>(null);
	const textareaContainerRef = useRef<HTMLDivElement | null>(null);
	const tabManager = useTabManager();
	const [showPresetPicker, setShowPresetPicker] = useState(false);
	const { presets, applyPreset } = usePresetManager(tabManager);

	const {
		recentProjects,
		refreshProjectList,
		ensureProject,
		loadProject,
		deleteProject,
	} = useProjectManager(tabManager, presets, applyPreset, showInfo);

	useEffect(() => {
		setLeftPanelWidth(getJSON<number>(STORAGE_KEYS.PANEL_WIDTH.key, 50));
	}, []);

	const { send, stopGenerating } = useGeneration(
		tabManager,
		ensureProject,
		refreshProjectList,
		confirm,
		setOutputAnimateKey,
	);

	const { jumpToVersion } = useVersionNavigation(
		tabManager,
		setOutputAnimateKey,
		setShowVersionDropdown,
	);

	const endRef = useRef<HTMLDivElement | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional - scroll when messages/sending changes
	useEffect(() => {
		const container = scrollContainerRef.current;
		if (!container) return;
		const distanceFromBottom =
			container.scrollHeight - container.scrollTop - container.clientHeight;
		if (distanceFromBottom > 160 && !tabManager.activeTab?.sending) return;
		requestAnimationFrame(() => {
			container.scrollTo({
				top: container.scrollHeight,
				behavior: "auto",
			});
		});
	}, [tabManager.activeTab?.messages, tabManager.activeTab?.sending]);

	const activeTab = tabManager.activeTab;
	const activeMessages = activeTab?.messages ?? [];

	const versions = activeTab
		? versionList(activeTab.versionGraph).filter((v) => v.label !== "Start")
		: [];
	const versionsWithOutput = versions.filter((v) => v.outputMessageId);
	const isRefinementMode = versionsWithOutput.length > 0;

	const activeVersionId = activeTab?.versionGraph.activeId;
	const activeVersion = activeVersionId
		? activeTab?.versionGraph.nodes[activeVersionId]
		: null;
	const outputToRefine = activeVersion?.outputMessageId
		? activeMessages.find(
				(m) => m.id === activeVersion.outputMessageId && m.role === "assistant",
			)?.content
		: null;

	const { wordCount, charCount } = useTextStats(activeTab?.draft);

	const activeVersionOutput = useMemo(() => {
		if (!activeVersion?.outputMessageId) return null;
		return activeMessages.find(
			(m) => m.id === activeVersion.outputMessageId && m.role === "assistant",
		);
	}, [activeVersion?.outputMessageId, activeMessages]);

	const { wordCount: outputWordCount, charCount: outputCharCount } =
		useTextStats(activeVersionOutput?.content);

	const closeActiveTab = useCallback(() => {
		if (tabManager.activeTabId) tabManager.closeTab(tabManager.activeTabId);
	}, [tabManager]);

	useKeyboardShortcuts(tabManager, setShowPresetPicker, closeActiveTab, send);

	const { handleResizeStart } = usePanelResize(
		leftPanelWidth,
		setLeftPanelWidth,
		isResizing,
		setIsResizing,
		panelsRef,
	);

	const isGenerating = activeTab?.sending ?? false;

	// Keep Studio's "last selected preset" in sync with the active tab,
	// since cross-route navigation now happens through the console rail.
	const activePresetKey = activeTab?.preset
		? (activeTab.preset.id ?? activeTab.preset.name)
		: null;
	useEffect(() => {
		if (activePresetKey) setLastSelectedPresetKey(activePresetKey);
	}, [activePresetKey]);

	useEffect(() => {
		window.dispatchEvent(
			new CustomEvent("sq-generation-status", {
				detail: { generating: isGenerating },
			}),
		);
		return () => {
			window.dispatchEvent(
				new CustomEvent("sq-generation-status", {
					detail: { generating: false },
				}),
			);
		};
	}, [isGenerating]);

	const handleResizeKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
		e.preventDefault();
		const delta = e.key === "ArrowLeft" ? -5 : 5;
		setLeftPanelWidth((value) => Math.min(80, Math.max(20, value + delta)));
	}, []);

	return (
		<>
			<div
				className={`simple-workbench page-animate ${isGenerating ? "workbench--generating" : ""}`}
			>
				<header className="simple-workbench__header simple-workbench__header--tabs">
					<TabBar
						embedded
						tabs={tabManager.tabs}
						activeTabId={tabManager.activeTabId}
						maxTabs={tabManager.maxTabs}
						onSwitchTab={tabManager.switchTab}
						onCloseTab={tabManager.closeTab}
						onReorderTabs={tabManager.reorderTabs}
						onNewTab={() => setShowPresetPicker(true)}
					/>
				</header>

				<div ref={panelsRef} className="simple-workbench__panels">
					<div className="workbench-split panel">
						<InputPanel
							leftPanelWidth={leftPanelWidth}
							isResizing={isResizing}
							onResizeStart={handleResizeStart}
							onResizeKeyDown={handleResizeKeyDown}
							tabManager={tabManager}
							isRefinementMode={isRefinementMode}
							wordCount={wordCount}
							charCount={charCount}
							copyMessage={copyMessage}
							copiedMessageId={copiedMessageId}
							showRefinementContext={showRefinementContext}
							setShowRefinementContext={setShowRefinementContext}
							versions={versions}
							activeVersionId={activeVersionId}
							outputToRefine={outputToRefine}
							textareaContainerRef={textareaContainerRef}
							activeTab={activeTab}
							isGenerating={isGenerating}
							availableModels={availableModels}
							modelLoadError={modelLoadError}
							refreshModels={refreshModels}
							currentModelId={currentModelId}
							setCurrentModelId={setCurrentModelId}
							send={send}
							stopGenerating={stopGenerating}
							setShowPresetInfo={setShowPresetInfo}
						/>

						<OutputPanel
							tabManager={tabManager}
							isResizing={isResizing}
							versionDropdownRef={versionDropdownRef}
							showVersionDropdown={showVersionDropdown}
							setShowVersionDropdown={setShowVersionDropdown}
							versions={versions}
							activeTab={activeTab}
							jumpToVersion={jumpToVersion}
							outputWordCount={outputWordCount}
							outputCharCount={outputCharCount}
							copyMessage={copyMessage}
							copiedMessageId={copiedMessageId}
							scrollContainerRef={scrollContainerRef}
							activeMessages={activeMessages}
							outputAnimateKey={outputAnimateKey}
							endRef={endRef}
						/>
					</div>
				</div>
			</div>

			{activeTab?.preset && (
				<PresetInfoDialog
					open={showPresetInfo}
					onClose={() => setShowPresetInfo(false)}
					preset={activeTab.preset}
				/>
			)}

			<PresetPickerModal
				open={showPresetPicker}
				onClose={() => setShowPresetPicker(false)}
				onSelectPreset={(preset) => {
					applyPreset(preset);
					tabManager.createTab(preset);
					setShowPresetPicker(false);
				}}
				onSelectProject={async (projectId) => {
					await loadProject(projectId);
					setShowPresetPicker(false);
				}}
				onDeleteProject={deleteProject}
				presets={presets}
				savedProjects={recentProjects}
			/>
		</>
	);
}
