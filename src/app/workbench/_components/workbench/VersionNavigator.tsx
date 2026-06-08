"use client";

import { Icon } from "@/components/Icon";
import type { VersionGraph } from "./types";
import { hasRedo, hasUndo, versionList } from "./version-graph";

interface VersionNavigatorProps {
	versionGraph: VersionGraph;
	onPrev: () => void;
	onNext: () => void;
	isGenerating?: boolean;
	justCreatedVersion?: boolean;
}

export function VersionNavigator({
	versionGraph,
	onPrev,
	onNext,
	isGenerating = false,
	justCreatedVersion = false,
}: VersionNavigatorProps) {
	const versions = versionList(versionGraph).filter((v) => v.label !== "Start");
	const currentIndex = versions.findIndex(
		(v) => v.id === versionGraph.activeId,
	);
	const currentVersion = currentIndex >= 0 ? currentIndex + 1 : 0;
	const totalVersions = versions.length;

	const currentVersionNode = versions[currentIndex];
	const isRefinement = currentVersionNode?.metadata?.isRefinement === true;
	const hasBaseVersion = versions.some((v) => v.outputMessageId);

	const canGoPrev = hasUndo(versionGraph);
	const canGoNext = hasRedo(versionGraph);

	if (totalVersions === 0) {
		return (
			<div
				className={`version-nav-vertical version-nav-vertical--empty ${isGenerating ? "version-nav-vertical--generating" : ""}`}
			>
				<div className="version-nav-vertical__icon-wrap">
					<Icon name="git-compare" />
				</div>
				<span className="version-nav-vertical__hint">No versions</span>
			</div>
		);
	}

	const tooltipText = hasBaseVersion
		? `v${currentVersion} ${isRefinement ? "(Refinement)" : "(Base)"} • Click to view history • Next input will refine this output`
		: `v${currentVersion} • Click to view history`;

	return (
		<div
			className={`version-nav-vertical version-nav-vertical--compact ${justCreatedVersion ? "version-nav-vertical--pulse" : ""} ${isGenerating ? "version-nav-vertical--generating" : ""}`}
		>
			<button
				type="button"
				className="version-nav-vertical__btn"
				onClick={onPrev}
				disabled={!canGoPrev || isGenerating}
				title={`Previous version • ${tooltipText}`}
				aria-label="Go to previous version"
			>
				<Icon name="chevron-up" />
			</button>

			<div
				className="version-nav-vertical__center"
				style={{ cursor: "default", pointerEvents: "none" }}
			>
				<Icon name="code-compare" style={{ width: 16, height: 16 }} />
			</div>

			<button
				type="button"
				className="version-nav-vertical__btn"
				onClick={onNext}
				disabled={!canGoNext || isGenerating}
				title={`Next version • ${tooltipText}`}
				aria-label="Go to next version"
			>
				<Icon name="chevron-down" />
			</button>
		</div>
	);
}
