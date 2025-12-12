"use client";

import { Cog6ToothIcon, PaintBrushIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDialog } from "@/components/DialogProvider";
import SettingsDialog from "@/components/SettingsDialog";
import { getJSON, setJSON } from "@/lib/local-storage";
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
import { VersionNavigator } from "./workbench/VersionNavigator";
import { versionList } from "./workbench/version-graph";

export default function PromptWorkbench() {
	const { showInfo, confirm } = useDialog();
	const router = useRouter();
	const { availableModels, currentModelId, setCurrentModelId } =
		useModelManager();
	const [showPresetInfo, setShowPresetInfo] = useState(false);
	const [justCreatedVersion, setJustCreatedVersion] = useState(false);
	const [showRefinementContext, setShowRefinementContext] = useState(false);
	const [showVersionDropdown, setShowVersionDropdown] = useState(false);
	const versionDropdownRef = useRef<HTMLButtonElement | null>(null);
	const [outputAnimateKey, setOutputAnimateKey] = useState(0);
	const [leftPanelWidth, setLeftPanelWidth] = useState(() =>
		getJSON<number>("shadowquill:panelWidth", 50),
	);
	const [isResizing, setIsResizing] = useState(false);
	const panelsRef = useRef<HTMLDivElement | null>(null);
	const { copyMessage, copiedMessageId } = useCopyMessage();
	const scrollContainerRef = useRef<HTMLDivElement | null>(null);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [settingsInitialTab, setSettingsInitialTab] = useState<
		"system" | "ollama" | "data" | "display"
	>("ollama");
	const textareaContainerRef = useRef<HTMLDivElement | null>(null);
	const tabManager = useTabManager();
	const [showPresetPicker, setShowPresetPicker] = useState(false);
	const [presetPickerForNewTab, setPresetPickerForNewTab] = useState(false);
	const { presets, applyPreset } = usePresetManager(
		tabManager,
		showPresetPicker,
		setShowPresetPicker,
		setPresetPickerForNewTab,
	);

	const {
		recentProjects,
		refreshProjectList,
		ensureProject,
		loadProject,
		deleteProject,
		deleteAllProjects,
	} = useProjectManager(tabManager, presets, applyPreset, showInfo);

	useEffect(() => {
		let savedTheme = getJSON<
			"earth" | "purpledark" | "dark" | "light" | "default" | null
		>("theme-preference", null);
		if (savedTheme === "default") {
			savedTheme = "purpledark";
			setJSON("theme-preference", "purpledark");
		}
		if (
			savedTheme &&
			(savedTheme === "earth" ||
				savedTheme === "purpledark" ||
				savedTheme === "dark" ||
				savedTheme === "light")
		) {
			document.documentElement.setAttribute(
				"data-theme",
				savedTheme === "earth" ? "" : savedTheme,
			);
		} else {
			document.documentElement.setAttribute("data-theme", "");
		}
	}, []);

	const _modelIds = useMemo(
		() => ["gemma3:4b", "gemma3:12b", "gemma3:27b"],
		[],
	);

	useEffect(() => {
		const handler = (e: Event) => {
			try {
				const ce = e as CustomEvent<{ tab?: "system" | "ollama" | "data" }>;
				const tab = ce?.detail?.tab;
				if (tab) setSettingsInitialTab(tab);
			} catch {}
			setSettingsOpen(true);
		};
		window.addEventListener("open-app-settings", handler);
		return () => window.removeEventListener("open-app-settings", handler);
	}, []);

	const { send, stopGenerating } = useGeneration(
		tabManager,
		ensureProject,
		refreshProjectList,
		confirm,
		setJustCreatedVersion,
		setOutputAnimateKey,
	);

	const { goToPreviousVersion, goToNextVersion, jumpToVersion } =
		useVersionNavigation(
			tabManager,
			setOutputAnimateKey,
			setShowVersionDropdown,
		);

	const endRef = useRef<HTMLDivElement | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional - scroll when messages/sending changes
	useEffect(() => {
		const container = scrollContainerRef.current;
		if (!container) return;
		requestAnimationFrame(() => {
			container.scrollTo({
				top: container.scrollHeight,
				behavior: "smooth",
			});
		});
	}, [tabManager.activeTab?.messages, tabManager.activeTab?.sending]);

	const activeTab = tabManager.activeTab;
	const activeMessages = activeTab?.messages ?? [];
	const hasMessages = activeMessages.length > 0;

	const versions = activeTab
		? versionList(activeTab.versionGraph).filter((v) => v.label !== "Start")
		: [];

	// Close version dropdown when clicking outside
	useEffect(() => {
		if (!showVersionDropdown) return;

		const handleClickOutside = (e: MouseEvent) => {
			if (
				versionDropdownRef.current &&
				!versionDropdownRef.current.contains(e.target as Node) &&
				!(e.target as Element).closest(".version-dropdown-menu")
			) {
				setShowVersionDropdown(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [showVersionDropdown]);

	const versionsWithOutput = versions.filter((v) => v.outputMessageId);
	const isRefinementMode = versionsWithOutput.length > 0;

	const activeVersionId = activeTab?.versionGraph.activeId;
	const activeVersion = activeVersionId
		? activeTab?.versionGraph.nodes[activeVersionId]
		: null;
	const activeVersionIndex = versions.findIndex(
		(v) => v.id === activeVersionId,
	);
	const activeVersionNumber =
		activeVersionIndex >= 0 ? activeVersionIndex + 1 : 0;

	const activeVersionIsRefinement =
		activeVersion?.metadata?.isRefinement === true;

	const _contextVersion =
		activeVersionIsRefinement && activeVersion?.metadata?.refinedVersionId
			? activeTab?.versionGraph.nodes[activeVersion.metadata.refinedVersionId]
			: activeVersion;

	const outputToRefine = activeVersion?.outputMessageId
		? activeMessages.find(
				(m) => m.id === activeVersion.outputMessageId && m.role === "assistant",
			)?.content
		: null;
	const inputThatGeneratedOutput = activeVersion?.originalInput ?? null;

	const { wordCount, charCount } = useTextStats(activeTab?.draft);

	const lastAssistantMessage = useMemo(
		() => activeMessages.filter((m) => m.role === "assistant").slice(-1)[0],
		[activeMessages],
	);

	const activeVersionOutput = useMemo(() => {
		if (!activeVersion?.outputMessageId) return null;
		return activeMessages.find(
			(m) => m.id === activeVersion.outputMessageId && m.role === "assistant",
		);
	}, [activeVersion?.outputMessageId, activeMessages]);

	const { wordCount: outputWordCount, charCount: outputCharCount } =
		useTextStats(activeVersionOutput?.content);

	useKeyboardShortcuts(
		tabManager,
		setShowPresetPicker,
		setPresetPickerForNewTab,
	);

	const { handleResizeStart } = usePanelResize(
		leftPanelWidth,
		setLeftPanelWidth,
		isResizing,
		setIsResizing,
		panelsRef,
	);

	const isGenerating = activeTab?.sending ?? false;

	return (
		<>
			<style jsx global>{`
				@media (max-width: 768px) {
					.simple-workbench__panels {
						flex-direction: column !important;
					}
					.prompt-input-pane,
					.prompt-output-pane {
						height: 50vh !important;
						border-right: none !important;
						border-bottom: 1px solid var(--color-outline) !important;
					}
					.prompt-output-pane {
						border-bottom: none !important;
					}
				}
				@media (max-width: 640px) {
					.hidden-mobile {
						display: none !important;
					}
				}
			`}</style>
			<div className="simple-workbench" style={{ position: "relative" }}>
				{/* Generation Overlay - blocks all interactions except stop button in left panel */}
				{isGenerating && (
					<div
						className="generation-overlay"
						style={{
							position: "absolute",
							inset: 0,
							backgroundColor: "rgba(255, 255, 255, 0.08)",
							zIndex: 100,
							pointerEvents: "auto",
							cursor: "not-allowed",
							transition: "opacity 0.2s ease",
							backdropFilter: "blur(1px) brightness(0.85)",
						}}
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => e.stopPropagation()}
						role="presentation"
						aria-hidden="true"
					/>
				)}
				<header
					className="simple-workbench__header"
					style={{
						flexWrap: "nowrap",
						gap: "var(--space-2)",
						padding:
							"var(--space-2) var(--space-3) var(--space-1) var(--space-3)",
						alignItems: "flex-end",
					}}
				>
					<div
						className="simple-workbench__header-left"
						style={{
							display: "flex",
							gap: "var(--space-2)",
							flexWrap: "nowrap",
							flex: "1 1 auto",
							minWidth: 0,
							overflow: "hidden",
						}}
					>
						<TabBar
							embedded
							tabs={tabManager.tabs.map((tab) => ({
								id: tab.id,
								label: tab.label,
								preset: tab.preset,
								isDirty: tab.isDirty,
							}))}
							activeTabId={tabManager.activeTabId}
							maxTabs={tabManager.maxTabs}
							onSwitchTab={tabManager.switchTab}
							onCloseTab={tabManager.closeTab}
							onReorderTabs={tabManager.reorderTabs}
							onNewTab={() => {
								setShowPresetPicker(true);
								setPresetPickerForNewTab(true);
							}}
						/>
					</div>
					<div
						className="simple-workbench__header-actions"
						style={{
							display: "flex",
							gap: "var(--space-2)",
							flexShrink: 0,
							paddingBottom: "var(--space-2)",
						}}
					>
						<button
							type="button"
							onClick={() => {
								// Set the active tab's preset as the selected preset
								const activeTab = tabManager.activeTab;
								if (activeTab?.preset) {
									const presetKey =
										activeTab.preset.id ?? activeTab.preset.name;
									if (presetKey) {
										setJSON("last-selected-preset", presetKey);
									}
								}
								router.push("/studio");
							}}
							className="md-btn md-btn--primary"
							title="Open Preset Studio"
							style={{ minWidth: 0 }}
						>
							<PaintBrushIcon className="h-4 w-4" />
						</button>
						<button
							type="button"
							className="md-btn"
							onClick={() => {
								setSettingsOpen(true);
							}}
							title="Settings"
						>
							<Cog6ToothIcon className="h-4 w-4" />
						</button>
					</div>
				</header>

				<div
					ref={panelsRef}
					className="simple-workbench__panels"
					style={{
						display: "flex",
						flexDirection: "row",
						height: "100%",
						overflow: "hidden",
						position: "relative",
						marginRight: "var(--space-2)",
					}}
				>
					{/* LEFT PANE: Input */}
					<InputPanel
						leftPanelWidth={leftPanelWidth}
						isResizing={isResizing}
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
						activeVersionNumber={activeVersionNumber}
						activeVersionIsRefinement={activeVersionIsRefinement}
						inputThatGeneratedOutput={inputThatGeneratedOutput}
						outputToRefine={outputToRefine}
						textareaContainerRef={textareaContainerRef}
						activeTab={activeTab}
						isGenerating={isGenerating}
						availableModels={availableModels}
						currentModelId={currentModelId}
						setCurrentModelId={setCurrentModelId}
						send={send}
						stopGenerating={stopGenerating}
						setShowPresetInfo={setShowPresetInfo}
					/>

					{/* CENTER: Resize Handle + Version Navigator */}
					{/* biome-ignore lint/a11y/useSemanticElements: Interactive resize handle requires div, not hr */}
					<div
						className={`panel-resize-container relative hidden flex-col items-center justify-center md:flex ${isResizing ? "panel-resize-container--active" : ""}`}
						onMouseDown={handleResizeStart}
						role="separator"
						aria-orientation="vertical"
						aria-label="Resize panels"
						aria-valuenow={leftPanelWidth}
						aria-valuemin={0}
						aria-valuemax={100}
						tabIndex={0}
						title="Drag to resize panels"
						style={{
							width: "var(--space-2)",
							flexShrink: 0,
							cursor: "col-resize",
						}}
					>
						{/* Single centered resize line - top segment */}
						<div className="panel-resize-line panel-resize-line--top" />
						{/* Single centered resize line - bottom segment */}
						<div className="panel-resize-line panel-resize-line--bottom" />

						{/* Version Navigator - sits in the cutout */}
						{activeTab && (
							<VersionNavigator
								versionGraph={activeTab.versionGraph}
								onPrev={goToPreviousVersion}
								onNext={goToNextVersion}
								isGenerating={activeTab.sending}
								justCreatedVersion={justCreatedVersion}
							/>
						)}
					</div>

					{/* RIGHT PANE: Output */}
					<OutputPanel
						tabManager={tabManager}
						isResizing={isResizing}
						isGenerating={isGenerating}
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
						lastAssistantMessage={lastAssistantMessage}
						scrollContainerRef={scrollContainerRef}
						activeMessages={activeMessages}
						hasMessages={hasMessages}
						outputAnimateKey={outputAnimateKey}
						endRef={endRef}
					/>
				</div>
			</div>

			{/* Settings Dialog */}
			{settingsOpen && (
				<SettingsDialog
					open={settingsOpen}
					onClose={() => setSettingsOpen(false)}
					initialTab={settingsInitialTab}
				/>
			)}

			{/* Preset Info Dialog */}
			{activeTab?.preset && (
				<PresetInfoDialog
					open={showPresetInfo}
					onClose={() => setShowPresetInfo(false)}
					preset={activeTab.preset}
				/>
			)}

			{/* Preset Picker Modal */}
			<PresetPickerModal
				open={showPresetPicker}
				onClose={() => {
					setShowPresetPicker(false);
					setPresetPickerForNewTab(false);
				}}
				onSelectPreset={(preset) => {
					if (presetPickerForNewTab) {
						// Create new tab with selected preset
						applyPreset(preset);
						tabManager.createTab(preset);
					}
					setShowPresetPicker(false);
					setPresetPickerForNewTab(false);
				}}
				onSelectProject={(projectId) => {
					loadProject(projectId);
					setShowPresetPicker(false);
					setPresetPickerForNewTab(false);
				}}
				onDeleteProject={deleteProject}
				onDeleteAllProjects={deleteAllProjects}
				presets={presets}
				savedProjects={recentProjects}
				title={presetPickerForNewTab ? "Open Workbench Tab" : "Select a Preset"}
			/>
		</>
	);
}
