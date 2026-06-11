import type React from "react";
import { Icon } from "@/components/Icon";
import type { useTabManager } from "../useTabManager";
import { ModelSelector } from "./ModelSelector";
import { RefinementContextPanel } from "./RefinementContextPanel";
import { TextStats } from "./TextStats";

interface InputPanelProps {
	leftPanelWidth: number;
	isResizing: boolean;
	onResizeStart: (e: React.MouseEvent) => void;
	onResizeKeyDown: (e: React.KeyboardEvent) => void;
	tabManager: ReturnType<typeof useTabManager>;
	isRefinementMode: boolean;
	wordCount: number;
	charCount: number;
	copyMessage: (messageId: string, content: string) => Promise<void>;
	copiedMessageId: string | null;
	showRefinementContext: boolean;
	setShowRefinementContext: (show: boolean) => void;
	versions: Array<{
		id: string;
		label: string;
		originalInput?: string;
		content: string;
		outputMessageId?: string | null;
		metadata?: { isRefinement?: boolean };
	}>;
	activeVersionId: string | undefined;
	activeVersionNumber: number;
	activeVersionIsRefinement: boolean;
	outputToRefine: string | null | undefined;
	textareaContainerRef: React.RefObject<HTMLDivElement | null>;
	activeTab: ReturnType<typeof useTabManager>["activeTab"];
	isGenerating: boolean;
	availableModels: Array<{ name: string; size: number }>;
	modelLoadError: string | null;
	refreshModels: () => Promise<void>;
	currentModelId: string | null;
	setCurrentModelId: (id: string) => void;
	send: () => Promise<void>;
	stopGenerating: () => void;
	setShowPresetInfo: (show: boolean) => void;
}

export function InputPanel({
	leftPanelWidth,
	isResizing,
	onResizeStart,
	onResizeKeyDown,
	tabManager,
	isRefinementMode,
	wordCount,
	charCount,
	copyMessage,
	copiedMessageId,
	showRefinementContext,
	setShowRefinementContext,
	versions,
	activeVersionId,
	activeVersionNumber,
	activeVersionIsRefinement,
	outputToRefine,
	textareaContainerRef,
	activeTab,
	isGenerating,
	availableModels,
	modelLoadError,
	refreshModels,
	currentModelId,
	setCurrentModelId,
	send,
	stopGenerating,
	setShowPresetInfo,
}: InputPanelProps) {
	return (
		<section
			className={`prompt-input-pane flex h-full flex-col overflow-hidden bg-surface ${isResizing ? "prompt-input-pane--resizing" : ""}`}
			style={{
				backgroundColor: "var(--color-surface)",
				["--pane-width" as string]: `${leftPanelWidth}%`,
				flexShrink: 0,
				flexGrow: 0,
				minWidth: 0,
				opacity: tabManager.tabs.length === 0 ? 0.4 : 1,
				pointerEvents: tabManager.tabs.length === 0 ? "none" : "auto",
				transition: isResizing ? "none" : "opacity 0.3s ease",
				filter: tabManager.tabs.length === 0 ? "grayscale(0.3)" : "none",
			}}
		>
			{/* biome-ignore lint/a11y/useSemanticElements: Interactive resize handle requires div, not hr */}
			<div
				className="workbench-split__handle"
				role="separator"
				aria-orientation="vertical"
				aria-label="Resize panels"
				aria-valuenow={leftPanelWidth}
				aria-valuemin={20}
				aria-valuemax={80}
				tabIndex={0}
				title="Drag to resize panels"
				onMouseDown={onResizeStart}
				onKeyDown={onResizeKeyDown}
			/>
			<div className="panel group relative min-h-0 flex-1">
				<div className="panel__head">
					<span
						className="panel__title"
						style={
							isRefinementMode ? { color: "var(--color-accent)" } : undefined
						}
						title={
							isRefinementMode
								? "Refinement mode: Your input will modify the previous output"
								: "Initial mode: Your input will generate a new prompt"
						}
					>
						{isRefinementMode ? "Refine" : "Input"}
					</span>

					{activeTab?.preset && (
						<button
							type="button"
							className="panel__head-action"
							onClick={() => setShowPresetInfo(true)}
							title="Preset details"
							aria-label={`Show details for ${activeTab.preset.name}`}
						>
							<Icon name="info" style={{ width: 14, height: 14 }} />
						</button>
					)}

					<span className="panel__head-spacer" />
					<TextStats wordCount={wordCount} charCount={charCount} />
				</div>

				{isRefinementMode && outputToRefine && (
					<RefinementContextPanel
						showRefinementContext={showRefinementContext}
						setShowRefinementContext={setShowRefinementContext}
						versions={versions}
						activeVersionId={activeVersionId}
						activeVersionNumber={activeVersionNumber}
						activeVersionIsRefinement={activeVersionIsRefinement}
						activeTab={activeTab}
						tabManager={tabManager}
						copyMessage={copyMessage}
						copiedMessageId={copiedMessageId}
					/>
				)}

				<div
					ref={textareaContainerRef}
					className="relative min-h-0 w-full flex-1"
				>
					<textarea
						aria-label={isRefinementMode ? "Refinement prompt" : "Prompt input"}
						className="absolute inset-0 h-full w-full resize-none border-none p-3 font-mono text-[10px] text-on-surface leading-[20px] shadow-none placeholder:text-on-surface-variant/50 focus:outline-none md:p-4 md:text-[11px] md:leading-[24px]"
						style={{
							backgroundColor: "var(--color-surface)",
							caretColor: "var(--color-accent)",
							pointerEvents: isGenerating ? "none" : "auto",
						}}
						value={activeTab?.draft ?? ""}
						onChange={(e) => tabManager.updateDraft(e.target.value)}
						placeholder={
							!activeTab
								? "Create or open a tab to get started..."
								: isRefinementMode
									? 'Enter refinement (e.g., "more minimal", "add details about X", "change aesthetic to minimalist")...'
									: "Describe your prompt & intent..."
						}
						disabled={!activeTab || isGenerating}
					/>
				</div>

				<div className="panel__foot">
					<ModelSelector
						availableModels={availableModels}
						modelLoadError={modelLoadError}
						refreshModels={refreshModels}
						currentModelId={currentModelId}
						setCurrentModelId={setCurrentModelId}
						isGenerating={isGenerating}
					/>

					<span className="panel__head-spacer" />

					<button
						type="button"
						onClick={() =>
							activeTab?.sending ? stopGenerating() : void send()
						}
						disabled={
							!activeTab || (!activeTab.sending && !activeTab.draft.trim())
						}
						className={`run-button-container md-btn md-btn--label disabled:cursor-not-allowed disabled:opacity-50 ${
							activeTab?.sending ? "md-btn--destructive" : "md-btn--primary"
						}`}
						style={{ minWidth: 96 }}
						title={activeTab?.sending ? "Stop Generation" : "Run Prompt"}
						aria-label={activeTab?.sending ? "Stop generation" : "Run prompt"}
					>
						{activeTab?.sending ? (
							<>
								<Icon name="stop" style={{ width: 14, height: 14 }} />
								Stop
							</>
						) : (
							<>
								<Icon name="chevron-right" style={{ width: 14, height: 14 }} />
								Run
							</>
						)}
					</button>
				</div>
			</div>
		</section>
	);
}
