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
					const nodeClass = ["ide-timeline__item"];
					if (isActive) nodeClass.push("ide-timeline__item--active");
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
									: "Jump to this version"
							}
						>
							<div className="ide-timeline__item-head">
								<div>
									<div className="ide-timeline__step">
										Step {String(index + 1).padStart(2, "0")}
									</div>
									<div className="ide-timeline__label">{node.label}</div>
								</div>
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
								{node.content.slice(0, 140) || "—"}
							</p>
							{isActive && (
								<div className="ide-timeline__active-tag">
									<Icon name="star" /> Active version
								</div>
							)}
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

