import { useCallback } from "react";
import type { useTabManager } from "../useTabManager";
import { redoVersion, undoVersion } from "../version-graph";

/**
 * Hook for navigating between versions in the version graph.
 */
export function useVersionNavigation(
	tabManager: ReturnType<typeof useTabManager>,
	setOutputAnimateKey: React.Dispatch<React.SetStateAction<number>>,
	setShowVersionDropdown?: React.Dispatch<React.SetStateAction<boolean>>,
) {
	const goToPreviousVersion = useCallback(() => {
		const tab = tabManager.activeTab;
		if (!tab) return;
		const prevGraph = undoVersion(tab.versionGraph);
		if (prevGraph) {
			const prevNode = prevGraph.nodes[prevGraph.activeId];
			if (prevNode && !prevNode.outputMessageId) {
				tabManager.updateDraft(prevNode.originalInput || prevNode.content);
			} else {
				tabManager.updateDraft("");
			}
			tabManager.setVersionGraph(prevGraph);
			tabManager.markDirty(false);
			setOutputAnimateKey((prev) => prev + 1);
		}
	}, [tabManager, setOutputAnimateKey]);

	const goToNextVersion = useCallback(() => {
		const tab = tabManager.activeTab;
		if (!tab) return;
		const nextGraph = redoVersion(tab.versionGraph);
		if (nextGraph) {
			const nextNode = nextGraph.nodes[nextGraph.activeId];
			if (nextNode && !nextNode.outputMessageId) {
				tabManager.updateDraft(nextNode.originalInput || nextNode.content);
			} else {
				tabManager.updateDraft("");
			}
			tabManager.setVersionGraph(nextGraph);
			tabManager.markDirty(false);
			setOutputAnimateKey((prev) => prev + 1);
		}
	}, [tabManager, setOutputAnimateKey]);

	const jumpToVersion = useCallback(
		(versionId: string) => {
			const tab = tabManager.activeTab;
			if (!tab) return;
			const versionNode = tab.versionGraph.nodes[versionId];
			if (!versionNode) return;

			// Keep draft empty when jumping to a version that has output (refinement mode)
			// The original input is shown in the context preview, not the editable field
			if (!versionNode.outputMessageId) {
				tabManager.updateDraft(
					versionNode.originalInput || versionNode.content,
				);
			} else {
				tabManager.updateDraft("");
			}
			// Update the version graph to point to this version
			const updatedGraph = {
				...tab.versionGraph,
				activeId: versionId,
			};
			tabManager.setVersionGraph(updatedGraph);
			tabManager.markDirty(false);
			setOutputAnimateKey((prev) => prev + 1);
			if (setShowVersionDropdown) {
				setShowVersionDropdown(false);
			}
		},
		[tabManager, setOutputAnimateKey, setShowVersionDropdown],
	);

	return { goToPreviousVersion, goToNextVersion, jumpToVersion };
}
