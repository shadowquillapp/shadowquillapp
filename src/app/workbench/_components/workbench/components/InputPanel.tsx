import { Icon } from "@/components/Icon";
import type { useTabManager } from "../useTabManager";
import { ModelSelector } from "./ModelSelector";
import { PresetInfoRow } from "./PresetInfoRow";
import { RefinementContextPanel } from "./RefinementContextPanel";
import { TextStats } from "./TextStats";

interface InputPanelProps {
	leftPanelWidth: number;
	isResizing: boolean;
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
	inputThatGeneratedOutput: string | null;
	outputToRefine: string | null | undefined;
	textareaContainerRef: React.RefObject<HTMLDivElement | null>;
	activeTab: ReturnType<typeof useTabManager>["activeTab"];
	isGenerating: boolean;
	availableModels: Array<{ name: string; size: number }>;
	currentModelId: string | null;
	setCurrentModelId: (id: string) => void;
	send: () => Promise<void>;
	stopGenerating: () => void;
	setShowPresetInfo: (show: boolean) => void;
}

/**
 * Input panel component containing the editor, refinement context, model selector, and run button.
 */
export function InputPanel({
	leftPanelWidth,
	isResizing,
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
	inputThatGeneratedOutput,
	outputToRefine,
	textareaContainerRef,
	activeTab,
	isGenerating,
	availableModels,
	currentModelId,
	setCurrentModelId,
	send,
	stopGenerating,
	setShowPresetInfo,
}: InputPanelProps) {
	return (
		<section
			className="prompt-input-pane flex h-full flex-col overflow-hidden bg-surface"
			style={{
				backgroundColor: "var(--color-surface)",
				width: `${leftPanelWidth}%`,
				flexShrink: 0,
				flexGrow: 0,
				minWidth: 480,
				opacity: tabManager.tabs.length === 0 ? 0.4 : 1,
				pointerEvents: tabManager.tabs.length === 0 ? "none" : "auto",
				transition: isResizing ? "none" : "opacity 0.3s ease",
				filter: tabManager.tabs.length === 0 ? "grayscale(0.3)" : "none",
				gap: "var(--space-4)",
				padding: "var(--space-6)",
			}}
		>
			{/* Editor Area with Integrated Toolbar */}
			<div
				className="group relative flex min-h-0 flex-1 flex-col rounded-2xl"
				style={{
					// Solid background + solid border (no gradient)
					// Use input-card variable if available, fallback to surface-variant
					background: "var(--color-input-card, var(--color-surface-variant))",
					border: "1px solid var(--color-outline)",
					boxShadow: "0 6px 12px rgba(0,0,0,0.18)",
				}}
			>
				{/* Header bar inside the text area container */}
				<div
					className="flex shrink-0 items-center justify-between rounded-t-2xl"
					style={{
						// No gradients — keep header flat
						background: "var(--color-input-card, var(--color-surface-variant))",
						borderBottom:
							"1px solid color-mix(in srgb, var(--color-outline), transparent 60%)",
						gap: "var(--space-3)",
						padding:
							"var(--space-3) var(--space-3) var(--space-3) var(--space-3)",
					}}
				>
					{/* Left: Badge & Stats */}
					<div
						className="flex min-w-0 items-center"
						style={{ gap: "var(--space-3)" }}
					>
						{/* Editor Badge - Changes based on refinement mode */}
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "var(--space-2)",
								padding: "var(--space-1) var(--space-3)",
								borderRadius: "20px",
								background: isRefinementMode
									? "var(--color-tertiary)"
									: "var(--color-surface)",
								border: isRefinementMode
									? "none"
									: "1px solid var(--color-outline)",
								color: isRefinementMode
									? "var(--color-on-tertiary)"
									: "var(--color-on-surface-variant)",
								boxShadow: isRefinementMode
									? "0 2px 6px color-mix(in srgb, var(--color-tertiary), transparent 60%)"
									: "none",
							}}
							title={
								isRefinementMode
									? "Refinement mode: Your input will modify the previous output"
									: "Initial mode: Your input will generate a new prompt"
							}
						>
							<Icon
								name={isRefinementMode ? "refresh" : "edit"}
								style={{
									width: 11,
									height: 11,
									opacity: isRefinementMode ? 1 : 0.7,
								}}
							/>
							<span
								style={{
									fontSize: "10px",
									fontWeight: 600,
									letterSpacing: "0.02em",
								}}
							>
								{isRefinementMode ? "Refine" : "Input"}
							</span>
						</div>

						{/* Stats - Hidden on very small screens */}
						<TextStats wordCount={wordCount} charCount={charCount} />
					</div>

					{/* Right: Actions */}
					<div className="flex items-center" style={{ gap: "var(--space-1)" }}>
						{/* Copy Button */}
						<button
							type="button"
							onClick={() =>
								copyMessage("prompt-draft", activeTab?.draft ?? "")
							}
							disabled={!activeTab}
							className="flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
							title="Copy prompt"
							aria-label="Copy prompt"
							style={{
								width: 28,
								height: 28,
								borderRadius: "var(--radius-sm)",
								background:
									copiedMessageId === "prompt-draft"
										? "var(--color-save)"
										: "var(--color-surface)",
								border:
									copiedMessageId === "prompt-draft"
										? "1px solid var(--color-save)"
										: "1px solid var(--color-outline)",
								color:
									copiedMessageId === "prompt-draft"
										? "var(--color-on-save)"
										: "var(--color-on-surface-variant)",
							}}
						>
							<Icon
								name={copiedMessageId === "prompt-draft" ? "check" : "copy"}
								style={{ width: 13, height: 13 }}
							/>
						</button>
					</div>
				</div>

				{/* Refinement Context Panel - Version History Timeline */}
				{isRefinementMode && outputToRefine && (
					<RefinementContextPanel
						showRefinementContext={showRefinementContext}
						setShowRefinementContext={setShowRefinementContext}
						versions={versions}
						activeVersionId={activeVersionId}
						activeVersionNumber={activeVersionNumber}
						activeVersionIsRefinement={activeVersionIsRefinement}
						inputThatGeneratedOutput={inputThatGeneratedOutput}
						activeTab={activeTab}
						tabManager={tabManager}
						copyMessage={copyMessage}
						copiedMessageId={copiedMessageId}
					/>
				)}

				<div
					ref={textareaContainerRef}
					className="relative min-h-0 w-full flex-1"
					style={{
						// When generating, elevate this container above the overlay so the stop button is clickable
						zIndex: isGenerating ? 150 : "auto",
					}}
				>
					<textarea
						className="absolute inset-0 h-full w-full resize-none rounded-b-2xl p-3 pt-3 pb-24 font-mono text-[10px] text-on-surface leading-[20px] shadow-none transition-all duration-200 ease-out placeholder:text-on-surface-variant/50 focus:border-[var(--color-outline)] focus:outline-none focus:ring-2 focus:ring-[var(--color-outline)] md:p-6 md:pt-4 md:pb-24 md:text-[11px] md:leading-[24px]"
						style={{
							// Lighter background that respects theme - lighter in light mode, slightly lighter in dark mode
							backgroundColor:
								"color-mix(in srgb, var(--color-surface-variant), var(--color-surface) 55%)",
							caretColor: "var(--color-primary)",
							boxShadow:
								"inset 0 0 0 1px color-mix(in srgb, var(--color-outline), white 18%)",
							// Disable pointer events when generating
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

					{/* Model Selector - Bottom Left */}
					<ModelSelector
						availableModels={availableModels}
						currentModelId={currentModelId}
						setCurrentModelId={setCurrentModelId}
						isGenerating={isGenerating}
					/>

					{/* Run Button - Bottom Right */}
					<button
						type="button"
						onClick={() =>
							activeTab?.sending ? stopGenerating() : void send()
						}
						disabled={
							!activeTab || (!activeTab.sending && !activeTab.draft.trim())
						}
						className={`absolute flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-50 ${
							activeTab?.sending
								? "bg-transparent hover:opacity-80"
								: "rounded-full bg-[var(--color-primary)] text-on-primary hover:bg-[var(--color-primary-variant)]"
						}`}
						style={{
							width: activeTab?.sending ? "auto" : "min(42px, 10vw)",
							height: activeTab?.sending ? "auto" : "min(42px, 10vw)",
							minWidth: activeTab?.sending ? "auto" : "36px",
							minHeight: activeTab?.sending ? "auto" : "36px",
							right: "var(--space-4)",
							bottom: "var(--space-4)",
							border: activeTab?.sending
								? "none"
								: "1px solid var(--color-outline)",
							boxShadow: activeTab?.sending ? "none" : "var(--shadow-1)",
							transition:
								"background 120ms ease, border-color 120ms ease, box-shadow 120ms ease, opacity 120ms ease",
							// High z-index to stay above the generation overlay
							zIndex: activeTab?.sending ? 150 : 10,
						}}
						onMouseEnter={(e) => {
							if (!activeTab?.sending) {
								e.currentTarget.style.boxShadow = "var(--shadow-2)";
								e.currentTarget.style.borderColor = "var(--color-primary)";
							}
						}}
						onMouseLeave={(e) => {
							if (!activeTab?.sending) {
								e.currentTarget.style.boxShadow = "var(--shadow-1)";
								e.currentTarget.style.borderColor = "var(--color-outline)";
							}
						}}
						title={activeTab?.sending ? "Stop Generation" : "Run Prompt"}
					>
						{activeTab?.sending ? (
							<Icon
								name="stop"
								className="relative z-10"
								style={{
									width: "28px",
									height: "28px",
									fontSize: "28px",
									color: "#dc6b6b",
								}}
							/>
						) : (
							<Icon
								name="chevron-right"
								className="relative z-10"
								style={{
									width: "22px",
									height: "22px",
									fontSize: "22px",
									left: "calc(var(--space-1) / 3)",
									color: "var(--color-on-primary)",
								}}
							/>
						)}
					</button>
				</div>
			</div>

			{/* Preset Info Row - Moved Under Editor Area */}
			{activeTab?.preset && (
				<PresetInfoRow
					preset={activeTab.preset}
					onClick={() => setShowPresetInfo(true)}
				/>
			)}
		</section>
	);
}
