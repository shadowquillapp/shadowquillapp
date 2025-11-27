"use client";

import { Icon } from "@/components/Icon";
import type { PromptTabState, VersionNode } from "./types";
import { getActiveContent, versionList } from "./version-graph";

interface VersionTimelineProps {
	tab: PromptTabState;
	onJump: (versionId: string) => void;
}

const summarizeDelta = (current: VersionNode, previous?: VersionNode | null) => {
	const delta = current.content.length - (previous?.content.length ?? 0);
	if (delta === 0) return "±0 chars";
	return delta > 0 ? `+${delta} chars` : `${delta} chars`;
};

export function VersionTimeline({ tab, onJump }: VersionTimelineProps) {
	const versions = versionList(tab.versionGraph);
	const activeId = tab.versionGraph.activeId;
	const baseline = getActiveContent(tab.versionGraph);
	const hasDraft = tab.draft !== baseline;

	return (
		<aside className="ide-timeline" aria-label="Prompt version history">
			<div className="ide-timeline__header">
				<h2>Prompt evolution</h2>
				<p>Track every change and jump to any snapshot.</p>
			</div>
			<div className="ide-timeline__list">
				{versions.map((node, index) => {
					const prev = index > 0 ? versions[index - 1] : null;
					const isActive = node.id === activeId;
					const hasOutput = node.outputMessageId !== null;
					const nodeClass = ["ide-timeline__item"];
					if (isActive) nodeClass.push("ide-timeline__item--active");
					if (!hasOutput) nodeClass.push("ide-timeline__item--no-output");
					return (
						<button
							key={node.id}
							type="button"
							className={nodeClass.join(" ")}
							onClick={() => onJump(node.id)}
							aria-current={isActive ? "step" : undefined}
							title={
								isActive
									? "Currently active version"
									: hasOutput
										? "Jump to this version"
										: "Manual save (no output yet)"
							}
						>
							<div className="ide-timeline__item-head">
								<div className="flex items-center gap-2">
									<div className="ide-timeline__step">
										v{index + 1}
									</div>
									{hasOutput ? (
										<span className="text-green-500 text-[10px]" title="Has generated output">
											<Icon name="check" className="w-3 h-3" />
										</span>
									) : (
										<span className="text-amber-500 text-[10px]" title="Manual save (no output)">
											<Icon name="edit" className="w-3 h-3" />
										</span>
									)}
								</div>
								<div className="ide-timeline__label">{node.label}</div>
								<div className="ide-timeline__meta">
									<span>{summarizeDelta(node, prev)}</span>
									<span>
										{new Date(node.createdAt).toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</span>
								</div>
							</div>
							<p className="ide-timeline__preview">
								{node.originalInput?.slice(0, 140) || node.content.slice(0, 140) || "—"}
							</p>
						</button>
					);
				})}

				{versions.length === 0 && (
					<div className="ide-timeline__empty">
						Start typing in the editor to capture your first snapshot.
					</div>
				)}

				{hasDraft && (
					<div className="ide-timeline__draft">
						<div className="ide-timeline__item-head">
							<div>
								<div className="ide-timeline__step">Live</div>
								<div className="ide-timeline__label">Unsaved changes</div>
							</div>
							<div className="ide-timeline__meta">
								<span>updates in real time</span>
							</div>
						</div>
						<p className="ide-timeline__preview">
							{tab.draft.slice(0, 140) || "—"}
						</p>
					</div>
				)}
			</div>
		</aside>
	);
}

