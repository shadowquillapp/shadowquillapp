"use client";

import { Icon } from "@/components/Icon";
import type { VersionGraph } from "./types";
import { hasUndo, hasRedo, versionList } from "./version-graph";

interface VersionNavigatorProps {
	versionGraph: VersionGraph;
	onPrev: () => void;
	onNext: () => void;
	onOpenHistory: () => void;
	isGenerating?: boolean;
	justCreatedVersion?: boolean;
}

export function VersionNavigator({
	versionGraph,
	onPrev,
	onNext,
	onOpenHistory,
	isGenerating = false,
	justCreatedVersion = false,
}: VersionNavigatorProps) {
	const versions = versionList(versionGraph).filter(v => v.label !== "Start");
	const currentIndex = versions.findIndex(v => v.id === versionGraph.activeId);
	const currentVersion = currentIndex >= 0 ? currentIndex + 1 : 0;
	const totalVersions = versions.length;
	
	// Get current version's metadata for mode indication
	const currentVersionNode = versions[currentIndex];
	const isRefinement = currentVersionNode?.metadata?.isRefinement === true;
	const versionsWithOutput = versions.filter(v => v.outputMessageId);
	const hasBaseVersion = versionsWithOutput.length > 0;
	
	const canGoPrev = hasUndo(versionGraph);
	const canGoNext = hasRedo(versionGraph);

	if (totalVersions === 0) {
		return (
			<div className="version-nav-vertical version-nav-vertical--empty">
				<div className="version-nav-vertical__icon-wrap">
					<Icon name="git-compare" />
				</div>
				<span className="version-nav-vertical__hint">
					No versions
				</span>
			</div>
		);
	}

	// Build tooltip text based on mode
	const tooltipText = hasBaseVersion
		? `v${currentVersion} ${isRefinement ? "(Refinement)" : "(Base)"} • Click to view history • Next input will refine this output`
		: `v${currentVersion} • Click to view history`;

	return (
		<div className={`version-nav-vertical version-nav-vertical--compact ${justCreatedVersion ? 'version-nav-vertical--pulse' : ''} ${isGenerating ? 'version-nav-vertical--generating' : ''}`}>
			{/* Up: Previous button */}
			<button
				type="button"
				className="version-nav-vertical__btn"
				onClick={onPrev}
				disabled={!canGoPrev || isGenerating}
				title={`Previous version${tooltipText ? ` • ${tooltipText}` : ''}`}
				aria-label="Go to previous version"
			>
				<Icon name="chevron-up" />
			</button>

			{/* Center: Version indicator */}
			<button
				type="button"
				className="version-nav-vertical__center"
				onClick={onOpenHistory}
				title={tooltipText}
				aria-label="View version history"
			>
				<Icon name="code-compare" style={{ width: 16, height: 16 }} />
			</button>

			{/* Down: Next button */}
			<button
				type="button"
				className="version-nav-vertical__btn"
				onClick={onNext}
				disabled={!canGoNext || isGenerating}
				title={`Next version${tooltipText ? ` • ${tooltipText}` : ''}`}
				aria-label="Go to next version"
			>
				<Icon name="chevron-down" />
			</button>
		</div>
	);
}
