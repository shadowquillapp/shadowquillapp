import { Icon } from "@/components/Icon";
import type { VersionGraph } from "../types";
import type { useTabManager } from "../useTabManager";

interface RefinementContextPanelProps {
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
	activeTab: ReturnType<typeof useTabManager>["activeTab"];
	tabManager: ReturnType<typeof useTabManager>;
	copyMessage: (messageId: string, content: string) => Promise<void>;
	copiedMessageId: string | null;
}

/**
 * Collapsible refinement context panel showing version history timeline.
 */
export function RefinementContextPanel({
	showRefinementContext,
	setShowRefinementContext,
	versions,
	activeVersionId,
	activeVersionNumber,
	activeVersionIsRefinement,
	inputThatGeneratedOutput,
	activeTab,
	tabManager,
	copyMessage,
	copiedMessageId,
}: RefinementContextPanelProps) {
	return (
		<div
			className={`refine-panel ${showRefinementContext ? "refine-panel--expanded" : ""}`}
		>
			<button
				type="button"
				onClick={() => setShowRefinementContext(!showRefinementContext)}
				className="refine-panel__header"
			>
				<div className="refine-panel__left">
					<div className="refine-panel__badge">
						<Icon name="refresh" className="refine-panel__badge-icon" />
						<span className="refine-panel__badge-text">
							v{activeVersionNumber}{" "}
							{activeVersionIsRefinement ? "Refinement" : "Base"}
						</span>
					</div>
					<span className="refine-count" title={`${versions.length} versions`}>
						<Icon
							name="layout"
							style={{ width: 11, height: 11, opacity: 0.85 }}
						/>
						{versions.length}
					</span>
				</div>
				{!showRefinementContext && inputThatGeneratedOutput && (
					<div className="refine-panel__preview">
						<span className="refine-panel__preview-label">Preview:</span>
						<span className="refine-panel__preview-text">
							{inputThatGeneratedOutput.slice(0, 25)}
							{inputThatGeneratedOutput.length > 25 ? "..." : ""}
						</span>
					</div>
				)}
				<div className="refine-panel__toggle">
					<span>{showRefinementContext ? "Hide" : "History"}</span>
					<Icon name="chevron-down" className="refine-panel__toggle-icon" />
				</div>
			</button>

			<div className="refine-panel__content-wrapper">
				<div className="refine-panel__content-inner">
					<div className="refine-timeline">
						{versions.map((version, index) => {
							const versionNum = index + 1;
							const isCurrentVersion = version.id === activeVersionId;
							const isRefinement = version.metadata?.isRefinement === true;

							const handleJumpToVersion = () => {
								if (isCurrentVersion) return;
								// Keep draft empty when jumping to a version that has output (refinement mode)
								if (version.outputMessageId) {
									tabManager.updateDraft("");
								} else {
									tabManager.updateDraft(
										version.originalInput || version.content,
									);
								}
								// Update the version graph to point to this version
								if (activeTab?.versionGraph) {
									const updatedGraph: VersionGraph = {
										...activeTab.versionGraph,
										activeId: version.id,
									};
									tabManager.setVersionGraph(updatedGraph);
								}
								tabManager.markDirty(false);
							};

							const versionInput = version.originalInput || "";
							const copyId = `refine-v-${version.id}`;

							return (
								<div
									key={version.id}
									className={`refine-timeline__item ${isCurrentVersion ? "refine-timeline__item--current" : ""}`}
								>
									<button
										type="button"
										onClick={handleJumpToVersion}
										disabled={isCurrentVersion}
										className="refine-timeline__item-btn"
										title={
											isCurrentVersion
												? "Current version"
												: `Jump to v${versionNum}`
										}
									>
										<div
											className={`refine-timeline__node ${isRefinement ? "refine-timeline__node--refinement" : "refine-timeline__node--base"}`}
										>
											{versionNum}
										</div>
									</button>
									<div
										className="refine-timeline__content"
										{...(!isCurrentVersion
											? {
													onClick: handleJumpToVersion,
													role: "button",
													tabIndex: 0,
													onKeyDown: (e) => {
														if (e.key === "Enter" || e.key === " ") {
															e.preventDefault();
															handleJumpToVersion();
														}
													},
												}
											: {})}
										title={
											isCurrentVersion
												? "Current version"
												: `Jump to v${versionNum}`
										}
									>
										<div className="refine-timeline__header">
											<div className="refine-timeline__title">
												<span
													className={`refine-timeline__type ${isRefinement ? "refine-timeline__type--refinement" : "refine-timeline__type--base"}`}
												>
													{isRefinement ? "Refinement" : "Base"}
												</span>
											</div>
											<div className="refine-timeline__actions">
												{isCurrentVersion && (
													<span className="refine-timeline__current-badge">
														Current
													</span>
												)}
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														if (versionInput) {
															copyMessage(copyId, versionInput);
														}
													}}
													disabled={!versionInput}
													className="refine-timeline__copy-btn"
													title="Copy this input"
													aria-label="Copy input"
												>
													<Icon
														name={copiedMessageId === copyId ? "check" : "copy"}
														style={{ width: 10, height: 10 }}
													/>
												</button>
											</div>
										</div>
										<div className="refine-timeline__body">
											{versionInput || <em style={{ opacity: 0.5 }}>Empty</em>}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}
