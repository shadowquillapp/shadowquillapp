import type React from "react";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/Icon";
import { getTaskTypeExamples } from "@/lib/task-type-meta";
import type { useTabManager } from "../useTabManager";
import { ModelSelector } from "./ModelSelector";
import { RefinementContextPanel } from "./RefinementContextPanel";
import { TextStats } from "./TextStats";

const REFINEMENT_CHIPS: readonly { label: string; request: string }[] = [
	{ label: "Shorter", request: "Make it shorter and more concise." },
	{ label: "More detail", request: "Add more detail and specifics." },
	{ label: "Friendlier", request: "Make the tone warmer and friendlier." },
	{
		label: "More structured",
		request: "Organize it with clear structure and headings.",
	},
	{ label: "Add examples", request: "Add concrete examples." },
];

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
	outputToRefine: string | null | undefined;
	activeTab: ReturnType<typeof useTabManager>["activeTab"];
	isGenerating: boolean;
	availableModels: Array<{ name: string; size: number }>;
	modelLoadError: string | null;
	refreshModels: () => Promise<void>;
	currentModelId: string | null;
	setCurrentModelId: (id: string) => void;
	send: (overrideText?: string) => Promise<void>;
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
	outputToRefine,
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
	const inputRef = useRef<HTMLTextAreaElement | null>(null);
	const draft = activeTab?.draft ?? "";
	const showRefinementUi = isRefinementMode && !!outputToRefine;

	// biome-ignore lint/correctness/useExhaustiveDependencies: re-measure when draft or mode changes
	useEffect(() => {
		const el = inputRef.current;
		if (!el) return;
		el.style.height = "auto";
		el.style.height = `${el.scrollHeight}px`;
	}, [draft, isRefinementMode]);

	const runButton = (
		<button
			type="button"
			onClick={() => (activeTab?.sending ? stopGenerating() : void send())}
			disabled={!activeTab || (!activeTab.sending && !activeTab.draft.trim())}
			className={`run-button-container md-btn md-btn--label disabled:cursor-not-allowed disabled:opacity-50 ${
				activeTab?.sending ? "md-btn--destructive" : "md-btn--primary"
			}`}
			title={
				activeTab?.sending ? "Stop Generation" : "Run Prompt (Ctrl/Cmd+Enter)"
			}
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
	);

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
				transition: isResizing
					? "none"
					: "opacity var(--duration-slow) var(--ease-ios)",
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
				<div className="panel__head panel__head--tall">
					<span
						className="panel__title"
						style={{ color: "var(--color-accent)" }}
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
							title="Preset settings"
							aria-label={`Open preset settings for ${activeTab.preset.name}`}
						>
							<Icon name="sliders" style={{ width: 14, height: 14 }} />
						</button>
					)}

					<span
						className="panel__head-divider hidden sm:block"
						aria-hidden="true"
					/>
					<TextStats wordCount={wordCount} charCount={charCount} />
					<span className="panel__head-spacer" />

					{showRefinementUi && (
						<button
							type="button"
							className={`panel__head-action ${
								showRefinementContext ? "panel__head-history--active" : ""
							}`}
							onClick={() => setShowRefinementContext(!showRefinementContext)}
							aria-expanded={showRefinementContext}
							title={
								showRefinementContext
									? "Hide version history"
									: `Show version history (${versions.length} versions)`
							}
						>
							<Icon name="layout" style={{ width: 12, height: 12 }} />
							History
						</button>
					)}
				</div>

				{showRefinementUi && (
					<RefinementContextPanel
						showRefinementContext={showRefinementContext}
						versions={versions}
						activeVersionId={activeVersionId}
						activeTab={activeTab}
						tabManager={tabManager}
						copyMessage={copyMessage}
						copiedMessageId={copiedMessageId}
					/>
				)}

				{activeTab &&
					!isGenerating &&
					(showRefinementUi ? (
						<div className="workbench-suggestions">
							<span className="workbench-suggestions__label">
								Quick changes
							</span>
							<div className="workbench-suggestions__row">
								{REFINEMENT_CHIPS.map((chip) => (
									<button
										key={chip.label}
										type="button"
										className="md-chip workbench-suggestions__chip"
										onClick={() => tabManager.updateDraft(chip.request)}
										title={chip.request}
									>
										{chip.label}
									</button>
								))}
							</div>
						</div>
					) : !isRefinementMode && !activeTab.draft.trim() ? (
						<div className="workbench-suggestions">
							<span className="workbench-suggestions__label">
								Try an example
							</span>
							<div className="workbench-suggestions__row">
								{getTaskTypeExamples(activeTab.preset.taskType).map(
									(example) => (
										<button
											key={example}
											type="button"
											className="md-chip workbench-suggestions__chip workbench-suggestions__chip--example"
											onClick={() => tabManager.updateDraft(example)}
											title={example}
										>
											{example}
										</button>
									),
								)}
							</div>
						</div>
					) : null)}

				<div className="custom-scrollbar relative flex min-h-0 w-full flex-1 flex-col overflow-y-auto">
					<textarea
						ref={inputRef}
						rows={1}
						aria-label={isRefinementMode ? "Refinement prompt" : "Prompt input"}
						className="w-full resize-none overflow-hidden border-none p-3 font-sans text-[length:var(--text-sm)] text-on-surface leading-[24px] shadow-none placeholder:text-on-surface-variant/50 focus:outline-none md:p-4 md:text-[length:var(--text-md)] md:leading-[28px]"
						style={{
							backgroundColor: "var(--color-surface)",
							caretColor: "var(--color-accent)",
							pointerEvents: isGenerating ? "none" : "auto",
						}}
						value={activeTab?.draft ?? ""}
						onChange={(e) => tabManager.updateDraft(e.target.value)}
						placeholder={
							!activeTab
								? "Pick a starting point to get started..."
								: isRefinementMode
									? 'Ask for a change (e.g., "make it shorter", "more friendly", "add an example")...'
									: "Describe what you want help with, in plain words..."
						}
						disabled={!activeTab || isGenerating}
					/>

					{activeTab && (
						<div className="prompt-input__run px-3 pb-3 md:px-4">
							{runButton}
						</div>
					)}
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
				</div>
			</div>
		</section>
	);
}
