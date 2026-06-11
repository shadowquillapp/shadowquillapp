"use client";

import { useState } from "react";
import FeatherLoader from "@/components/FeatherLoader";
import { Icon } from "@/components/Icon";
import { MessageRenderer } from "../MessageRenderer";
import type { MessageItem } from "../types";
import type { useTabManager } from "../useTabManager";
import { getOutputMessageId } from "../version-graph";
import { TextStats } from "./TextStats";
import { VersionDropdown } from "./VersionDropdown";

interface ActiveOutputViewProps {
	output: MessageItem;
	copyMessage: (messageId: string, content: string) => Promise<void>;
	copiedMessageId: string | null;
}

function ActiveOutputView({
	output,
	copyMessage,
	copiedMessageId,
}: ActiveOutputViewProps) {
	const [isMarkdownRendered, setIsMarkdownRendered] = useState(true);

	return (
		<div className="max-w-none break-words font-mono text-[11px] text-on-surface leading-relaxed">
			<MessageRenderer
				content={output.content}
				markdownRendered={isMarkdownRendered}
				onToggleMarkdownView={() => setIsMarkdownRendered((value) => !value)}
				onCopy={() => {
					if (output.content) {
						void copyMessage(output.id, output.content);
					}
				}}
				copyDisabled={!output.content}
				copied={copiedMessageId === output.id}
			/>
		</div>
	);
}

interface OutputPanelProps {
	tabManager: ReturnType<typeof useTabManager>;
	isResizing: boolean;
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
	scrollContainerRef: React.RefObject<HTMLDivElement | null>;
	activeMessages: MessageItem[];
	outputAnimateKey: number;
	endRef: React.RefObject<HTMLDivElement | null>;
}

export function OutputPanel({
	tabManager,
	isResizing,
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
	scrollContainerRef,
	activeMessages,
	outputAnimateKey,
	endRef,
}: OutputPanelProps) {
	const hasMessages = activeMessages.length > 0;
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
		<section
			className="prompt-output-pane relative flex h-full flex-col overflow-hidden"
			style={{
				flex: 1,
				minWidth: 0,
				opacity: tabManager.tabs.length === 0 ? 0.4 : 1,
				pointerEvents: tabManager.tabs.length === 0 ? "none" : "auto",
				transition: isResizing ? "none" : "opacity 0.3s ease",
				filter: tabManager.tabs.length === 0 ? "grayscale(0.3)" : "none",
			}}
		>
			<div
				className={`panel group relative min-h-0 flex-1 ${activeTab?.sending ? "output-generating" : ""}`}
			>
				<div className="panel__head">
					<span className="panel__title">Output</span>
					<span className="panel__head-spacer" />
					<TextStats wordCount={outputWordCount} charCount={outputCharCount} />
					<VersionDropdown
						versionDropdownRef={versionDropdownRef}
						showVersionDropdown={showVersionDropdown}
						setShowVersionDropdown={setShowVersionDropdown}
						versions={versions}
						activeTab={activeTab}
						jumpToVersion={jumpToVersion}
					/>
				</div>

				<div
					ref={scrollContainerRef}
					className="custom-scrollbar relative min-w-0 overflow-x-auto overflow-y-auto"
					style={{
						paddingLeft: "var(--space-4)",
						paddingRight: "var(--space-4)",
						paddingTop: "var(--space-3)",
						paddingBottom: "var(--space-3)",
						flex: 1,
						minHeight: 0,
					}}
				>
					{!hasMessages ? (
						<div className="workbench-empty">
							<Icon name="terminal" className="workbench-empty__icon" />
							<p className="workbench-empty__title">Ready to generate</p>
							<p className="workbench-empty__hint">
								Run your prompt to see results here.
							</p>
						</div>
					) : (
						(() => {
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
												filter: "none",
												opacity: 1,
											}}
										>
											<FeatherLoader />
										</div>
									) : activeOutput ? (
										<ActiveOutputView
											key={`${activeOutput.id}-${outputAnimateKey}`}
											output={activeOutput}
											copyMessage={copyMessage}
											copiedMessageId={copiedMessageId}
										/>
									) : (
										<div className="workbench-empty">
											<Icon
												name="file-text"
												className="workbench-empty__icon"
											/>
											<p className="workbench-empty__title">
												No Output for This Version
											</p>
											<p className="workbench-empty__hint">
												This version is a manual save. Run the prompt to
												generate output.
											</p>
										</div>
									)}
									<div ref={endRef} />
								</div>
							);
						})()
					)}
				</div>
			</div>

			{activeTab?.error && (
				<div
					className="fade-in-up absolute flex items-center rounded-[var(--radius-sm)] border border-[var(--color-outline)] bg-[var(--color-surface-variant)] text-attention"
					role="alert"
					style={{
						right: "var(--space-4)",
						bottom: "var(--space-4)",
						left: "var(--space-4)",
						gap: "var(--space-3)",
						padding: "var(--space-3)",
						boxShadow: "inset 2px 0 0 var(--color-attention)",
					}}
				>
					<Icon name="warning" className="h-5 w-5 shrink-0" />
					<p className="font-medium text-sm">{activeTab.error}</p>
					<button
						type="button"
						className="md-icon-btn ml-auto disabled:cursor-not-allowed disabled:opacity-40"
						onClick={() => tabManager.setError(null)}
						aria-label="Dismiss error"
					>
						<Icon name="close" className="h-4 w-4" />
					</button>
				</div>
			)}
		</section>
	);
}
