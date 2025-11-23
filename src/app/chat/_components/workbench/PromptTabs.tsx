"use client";

import { Icon } from "@/components/Icon";
import type { PromptTabState } from "./types";
import { getActiveContent } from "./version-graph";

interface PromptTabsProps {
	tabs: PromptTabState[];
	activeTabId: string | null;
	onSelect: (tabId: string) => void;
	onClose: (tab: PromptTabState) => void;
	onNew: () => void;
}

export function PromptTabsBar({
	tabs,
	activeTabId,
	onSelect,
	onClose,
	onNew,
}: PromptTabsProps) {
	return (
		<div className="ide-tabs-bar">
			<div className="ide-tabs-scroll" role="tablist" aria-label="Prompt tabs">
				{tabs.map((tab) => {
					const isActive = tab.id === activeTabId;
					const baseline = getActiveContent(tab.versionGraph);
					const isDirty = tab.draft !== baseline;
					const tabClassName = ["ide-tab"];
					if (isActive) tabClassName.push("ide-tab--active");

					return (
						<div
							key={tab.id}
							className={tabClassName.join(" ")}
							role="tab"
							aria-selected={isActive}
							tabIndex={0}
							onClick={() => onSelect(tab.id)}
							onKeyDown={(event) => {
								if (event.key === "Enter" || event.key === " ") {
									event.preventDefault();
									onSelect(tab.id);
								}
							}}
						>
							<div className="ide-tab__titles">
								<span className="ide-tab__label">{tab.title}</span>
								<span className="ide-tab__preset">{tab.preset.name}</span>
							</div>
							<div className="ide-tab__meta">
								{isDirty && <span className="ide-tab__dot">●</span>}
								<button
									type="button"
									className="ide-tab__close"
									onClick={(event) => {
										event.stopPropagation();
										onClose(tab);
									}}
									title="Close tab"
								>
									<Icon name="close" />
								</button>
							</div>
						</div>
					);
				})}
			</div>
			<button type="button" className="ide-tab ide-tab--ghost" onClick={onNew}>
				<Icon name="plus" />
				New tab
			</button>
		</div>
	);
}

