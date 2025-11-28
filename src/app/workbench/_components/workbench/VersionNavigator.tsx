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

	return (
		<div className={`version-nav-vertical ${justCreatedVersion ? 'version-nav-vertical--pulse' : ''} ${isGenerating ? 'version-nav-vertical--generating' : ''}`}>
			{/* Up: Previous button */}
			<button
				type="button"
				className="version-nav-vertical__btn"
				onClick={onPrev}
				disabled={!canGoPrev || isGenerating}
				title="Previous version"
				aria-label="Go to previous version"
			>
				<Icon name="chevron-up" />
			</button>

			{/* Center: Version info */}
			<button
				type="button"
				className="version-nav-vertical__center"
				onClick={onOpenHistory}
				title="View version history"
			>
				<div className={`version-nav-vertical__badge ${isGenerating ? 'version-nav-vertical__badge--generating' : ''}`}>
					<span className="version-nav-vertical__current">
						v{currentVersion}
					</span>
				</div>
			</button>

			{/* Down: Next button */}
			<button
				type="button"
				className="version-nav-vertical__btn"
				onClick={onNext}
				disabled={!canGoNext || isGenerating}
				title="Next version"
				aria-label="Go to next version"
			>
				<Icon name="chevron-down" />
			</button>
		</div>
	);
}
