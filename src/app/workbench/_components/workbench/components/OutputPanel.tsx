import FeatherLoader from "@/components/FeatherLoader";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { MessageRenderer } from "../MessageRenderer";
import type { MessageItem } from "../types";
import type { useTabManager } from "../useTabManager";
import { getOutputMessageId } from "../version-graph";
import { TextStats } from "./TextStats";
import { VersionDropdown } from "./VersionDropdown";

interface OutputPanelProps {
	tabManager: ReturnType<typeof useTabManager>;
	isResizing: boolean;
	isGenerating: boolean;
	versionDropdownRef: React.RefObject<HTMLButtonElement | null>;
	showVersionDropdown: boolean;
	setShowVersionDropdown: (show: boolean) => void;
	versions: Array<{
		id: string;
		label: string;
		metadata?: { isRefinement?: boolean };
	}>;
	activeTab: ReturnType<typeof useTabManager>["activeTab"];
	jumpToVersion: (versionId: string) => void;
	outputWordCount: number;
	outputCharCount: number;
	copyMessage: (messageId: string, content: string) => Promise<void>;
	copiedMessageId: string | null;
	lastAssistantMessage: MessageItem | undefined;
	scrollContainerRef: React.RefObject<HTMLDivElement | null>;
	activeMessages: MessageItem[];
	hasMessages: boolean;
	outputAnimateKey: number;
	endRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Output panel component displaying generated responses, version navigation, and error messages.
 */
export function OutputPanel({
	tabManager,
	isResizing,
	isGenerating,
	versionDropdownRef,
	showVersionDropdown,
	setShowVersionDropdown,
	versions,
	activeTab,
	jumpToVersion,
	outputWordCount,
	outputCharCount,
	copyMessage,
	copiedMessageId,
	lastAssistantMessage,
	scrollContainerRef,
	activeMessages,
	hasMessages,
	outputAnimateKey,
	endRef,
}: OutputPanelProps) {
	return (
		<section
			className="prompt-output-pane relative flex h-full flex-col overflow-hidden"
			style={{
				flex: 1,
				minWidth: 480,
				opacity: tabManager.tabs.length === 0 ? 0.4 : 1,
				pointerEvents:
					tabManager.tabs.length === 0
						? "none"
						: isGenerating
							? "none"
							: "auto",
				transition: isResizing ? "none" : "opacity 0.3s ease",
				filter: tabManager.tabs.length === 0 ? "grayscale(0.3)" : "none",
				// Elevate above overlay when generating so the animation is visible
				zIndex: isGenerating ? 150 : "auto",
				gap: "var(--space-4)",
				padding: "var(--space-6)",
			}}
		>
			{/* Content Body with Integrated Toolbar Style */}
			<div
				className={`group relative flex min-h-0 flex-1 flex-col rounded-2xl ${activeTab?.sending ? "output-generating" : ""}`}
				style={{
					// Clean solid background
					background: "var(--color-output-panel, var(--color-surface-variant))",
					// Subtle border with highlight for depth
					border: "1px solid var(--color-outline)",
					borderTop:
						"1px solid color-mix(in srgb, var(--color-outline), rgba(255,255,255,0.1))",
					// Clean elevation shadow - single, well-defined
					boxShadow: "0 6px 12px rgba(0,0,0,0.18)",
				}}
			>
				{/* Toolbar Header inside container */}
				<div
					className="flex shrink-0 items-center justify-between rounded-t-2xl"
					style={{
						// No gradients — keep header flat
						background:
							"var(--color-output-panel, var(--color-surface-variant))",
						borderBottom:
							"1px solid color-mix(in srgb, var(--color-outline), transparent 60%)",
						gap: "var(--space-3)",
						padding:
							"var(--space-3) var(--space-3) var(--space-3) var(--space-3)",
					}}
				>
					{/* Left: Title & Stats */}
					<div
						className="flex min-w-0 items-center"
						style={{ gap: "var(--space-3)" }}
					>
						{/* Version Badge */}
						<VersionDropdown
							versionDropdownRef={versionDropdownRef}
							showVersionDropdown={showVersionDropdown}
							setShowVersionDropdown={setShowVersionDropdown}
							versions={versions}
							activeTab={activeTab}
							jumpToVersion={jumpToVersion}
						/>

						{/* Stats - Hidden on very small screens */}
						<TextStats
							wordCount={outputWordCount}
							charCount={outputCharCount}
						/>
					</div>

					{/* Right: Actions */}
					<div className="flex items-center" style={{ gap: "var(--space-1)" }}>
						{/* Copy Button */}
						<button
							type="button"
							onClick={() => {
								if (lastAssistantMessage?.content) {
									copyMessage(
										lastAssistantMessage.id,
										lastAssistantMessage.content,
									);
								}
							}}
							disabled={!lastAssistantMessage}
							className="flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
							title="Copy response"
							aria-label="Copy response"
							style={{
								width: 28,
								height: 28,
								borderRadius: "var(--radius-sm)",
								background:
									copiedMessageId === lastAssistantMessage?.id
										? "var(--color-save)"
										: "var(--color-surface)",
								border:
									copiedMessageId === lastAssistantMessage?.id
										? "1px solid var(--color-save)"
										: "1px solid var(--color-outline)",
								color:
									copiedMessageId === lastAssistantMessage?.id
										? "var(--color-on-save)"
										: "var(--color-on-surface-variant)",
							}}
						>
							<Icon
								name={
									copiedMessageId === lastAssistantMessage?.id
										? "check"
										: "copy"
								}
								style={{ width: 13, height: 13 }}
							/>
						</button>
					</div>
				</div>

				{/* Scrollable Content Area */}
				<div
					ref={scrollContainerRef}
					className="custom-scrollbar relative min-h-0 flex-1 overflow-y-auto"
					style={{
						paddingLeft: "var(--space-6)",
						paddingRight: "var(--space-6)",
					}}
				>
					{!hasMessages ? (
						<div
							className="flex h-full flex-col items-center justify-center text-center opacity-60"
							style={{ gap: "var(--space-4)" }}
						>
							<div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--color-outline)] bg-surface">
								<Logo className="h-8 w-8 opacity-50 grayscale" />
							</div>
							<div className="max-w-[240px]">
								<p className="font-medium text-on-surface text-sm">
									Ready to Generate
								</p>
								<p
									className="text-on-surface-variant text-xs"
									style={{ marginTop: "var(--space-1)" }}
								>
									Run your prompt to see the results appear here.
								</p>
							</div>
						</div>
					) : (
						(() => {
							// Get the active version's output message ID
							const activeOutputId = activeTab
								? getOutputMessageId(
										activeTab.versionGraph,
										activeTab.versionGraph.activeId,
									)
								: null;
							const activeOutput = activeOutputId
								? activeMessages.find(
										(m) => m.id === activeOutputId && m.role === "assistant",
									)
								: null;

							return (
								<div
									key={outputAnimateKey}
									className="output-animate-in flex flex-col"
									style={{ gap: "var(--space-6)" }}
								>
									{activeTab?.sending ? (
										<div
											className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-on-surface-variant"
											style={{
												// Ensure the crafting animation is fully visible and not grayed out
												filter: "none",
												opacity: 1,
											}}
										>
											<FeatherLoader />
										</div>
									) : activeOutput ? (
										<div
											className="group relative flex flex-col"
											style={{ gap: "var(--space-3)" }}
										>
											{/* Message Content */}
											<div className="max-w-none font-mono text-[11px] text-on-surface leading-relaxed">
												<MessageRenderer
													content={activeOutput.content}
													messageId={activeOutput.id}
													copiedMessageId={copiedMessageId}
													onCopy={copyMessage}
												/>
											</div>
										</div>
									) : (
										<div
											className="flex flex-col items-center justify-center text-center opacity-60"
											style={{
												gap: "var(--space-3)",
												paddingTop: "var(--space-8)",
												paddingBottom: "var(--space-8)",
											}}
										>
											<div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--color-outline)] bg-surface">
												<Icon name="file-text" className="h-6 w-6 opacity-50" />
											</div>
											<div className="max-w-[280px]">
												<p className="font-medium text-on-surface text-sm">
													No Output for This Version
												</p>
												<p
													className="text-on-surface-variant text-xs"
													style={{ marginTop: "var(--space-1)" }}
												>
													This version is a manual save. Run the prompt to
													generate output.
												</p>
											</div>
										</div>
									)}
									<div ref={endRef} />
								</div>
							);
						})()
					)}
				</div>
			</div>

			{/* Error Toast/Banner */}
			{activeTab?.error && (
				<div
					className="slide-in-from-bottom-2 absolute flex animate-in items-center rounded-lg border border-attention/10 bg-attention/10 text-attention shadow-lg"
					style={{
						right: "var(--space-6)",
						bottom: "var(--space-6)",
						left: "var(--space-6)",
						gap: "var(--space-3)",
						padding: "var(--space-4)",
					}}
				>
					<Icon name="warning" className="h-5 w-5 shrink-0" />
					<p className="font-medium text-sm">{activeTab.error}</p>
					<button
						type="button"
						className="ml-auto rounded p-1 hover:bg-attention/10"
						onClick={() => tabManager.setError(null)}
					>
						<Icon name="close" className="h-4 w-4" />
					</button>
				</div>
			)}
		</section>
	);
}
