import { useCallback } from "react";
import type { useTabManager } from "../useTabManager";
import { jumpToVersion as activateVersionInGraph } from "../version-graph";

export function useVersionNavigation(
	tabManager: ReturnType<typeof useTabManager>,
	setOutputAnimateKey: React.Dispatch<React.SetStateAction<number>>,
	setShowVersionDropdown?: React.Dispatch<React.SetStateAction<boolean>>,
) {
	const jumpToVersion = useCallback(
		(versionId: string) => {
			const tab = tabManager.activeTab;
			if (!tab) return;
			const versionNode = tab.versionGraph.nodes[versionId];
			if (!versionNode) return;

			if (!versionNode.outputMessageId) {
				tabManager.updateDraft(
					versionNode.originalInput || versionNode.content,
				);
			} else {
				tabManager.updateDraft("");
			}
			const updatedGraph = activateVersionInGraph(tab.versionGraph, versionId);
			tabManager.setVersionGraph(updatedGraph);
			setOutputAnimateKey((prev) => prev + 1);
			if (setShowVersionDropdown) {
				setShowVersionDropdown(false);
			}
		},
		[tabManager, setOutputAnimateKey, setShowVersionDropdown],
	);

	return { jumpToVersion };
}
