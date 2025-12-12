import { useCallback, useEffect, useMemo, useState } from "react";
import type { useDialog } from "@/components/DialogProvider";
import {
	createProject as localCreateProject,
	deleteProject as localDeleteProject,
	getProject as localGetProject,
	listProjectsByUser as localListProjects,
	updateProjectVersionGraph,
} from "@/lib/local-db";
import type { MessageItem, PromptPresetSummary, VersionGraph } from "../types";
import type { useTabManager } from "../useTabManager";
import {
	appendVersion,
	createVersionGraph,
	migrateVersionGraph,
} from "../version-graph";

/**
 * Hook for managing projects: loading, deleting, and ensuring project existence.
 */
export function useProjectManager(
	tabManager: ReturnType<typeof useTabManager>,
	presets: Array<{
		id?: string;
		name: string;
		taskType: string;
		options?: unknown;
	}>,
	applyPreset: (
		preset: PromptPresetSummary,
		opts?: { trackRecent?: boolean },
	) => void,
	showInfo: ReturnType<typeof useDialog>["showInfo"],
) {
	const [projectList, setProjectList] = useState<
		Array<{
			id: string;
			title: string | null;
			updatedAt: Date;
			messageCount: number;
		}>
	>([]);

	useEffect(() => {
		void (async () => {
			const list = await localListProjects();
			setProjectList(list);
		})();
	}, []);

	const refreshProjectList = useCallback(async () => {
		const list = await localListProjects();
		setProjectList(list);
	}, []);

	const recentProjects = useMemo(
		() =>
			(projectList ?? []).slice().sort((a, b) => {
				const aTime =
					typeof a.updatedAt === "number"
						? a.updatedAt
						: new Date(a.updatedAt).getTime();
				const bTime =
					typeof b.updatedAt === "number"
						? b.updatedAt
						: new Date(b.updatedAt).getTime();
				return bTime - aTime;
			}),
		[projectList],
	);

	const ensureProject = useCallback(
		async (firstLine: string) => {
			const activeTab = tabManager.activeTab;
			if (!activeTab) return null;
			if (activeTab.projectId) return activeTab.projectId;
			const title =
				(firstLine || activeTab.preset?.name || "New project").slice(0, 40) ||
				"New project";
			const presetId = activeTab.preset?.id ?? undefined;
			const created = await localCreateProject(title, "local-user", presetId);
			tabManager.attachProject(created.id);
			await refreshProjectList();
			return created.id;
		},
		[tabManager, refreshProjectList],
	);

	const loadProject = useCallback(
		async (id: string) => {
			try {
				const existingTab = tabManager.findTabByProjectId(id);
				if (existingTab) {
					tabManager.switchTab(existingTab.id);
					return;
				}

				if (!tabManager.canCreateTab) {
					if (tabManager.activeTab) {
						tabManager.setError(
							"Maximum number of tabs reached. Close a tab to open this project.",
						);
					} else {
						showInfo({
							title: "Tab Limit",
							message:
								"Maximum number of tabs reached. Close a tab to open this project.",
						});
					}
					return;
				}

				const data = await localGetProject(id, 50);
				const loaded: MessageItem[] = (data.messages ?? []).map(
					(m: { id: string; role: string; content: string }) => ({
						id: m.id,
						role: m.role as "user" | "assistant",
						content: m.content,
					}),
				);

				// Find the preset for this project
				let projectPreset: PromptPresetSummary | null = null;
				if (data.presetId) {
					const preset = presets.find((p) => p.id === data.presetId);
					if (preset) {
						projectPreset = preset as PromptPresetSummary;
					}
				}

				if (!projectPreset) {
					if (presets.length > 0) {
						projectPreset = presets[0] as PromptPresetSummary;
					}
				}

				if (!projectPreset) {
					showInfo({
						title: "No Preset",
						message: "No preset available to open this project.",
					});
					return;
				}

				applyPreset(projectPreset, { trackRecent: false });

				const newTabId = tabManager.createTab(projectPreset);

				let graph: VersionGraph;
				if (
					data.versionGraph &&
					typeof (data.versionGraph as VersionGraph).nodes === "object"
				) {
					// Migrate version graph for backward compatibility
					graph = migrateVersionGraph(
						data.versionGraph as VersionGraph,
						loaded,
					);
				} else {
					graph = createVersionGraph("", "Start", "", null);
					const userMsgs = loaded.filter((m) => m.role === "user");
					const assistantMsgs = loaded.filter((m) => m.role === "assistant");

					if (userMsgs.length > 0) {
						userMsgs.forEach((msg, i) => {
							const outputId = assistantMsgs[i]?.id ?? null;
							graph = appendVersion(
								graph,
								msg.content,
								`Version ${i + 1}`,
								msg.content,
								outputId,
							);
						});
					}
				}

				if (graph.tailId && graph.nodes[graph.tailId]) {
					graph = { ...graph, activeId: graph.tailId };
				}

				tabManager.setMessagesForTab(newTabId, loaded);
				tabManager.setVersionGraphForTab(newTabId, graph);
				tabManager.attachProjectForTab(newTabId, id);

				const activeNode = graph.nodes[graph.activeId];
				if (activeNode && !activeNode.outputMessageId) {
					const draftContent =
						activeNode.originalInput || activeNode.content || "";
					tabManager.updateDraftForTab(newTabId, draftContent);
				} else {
					tabManager.updateDraftForTab(newTabId, "");
				}

				if (data.title) {
					tabManager.updateTabLabel(newTabId, data.title);
				}
			} catch (_e) {
				if (tabManager.activeTab) {
					tabManager.setError("Failed to load project");
				} else {
					showInfo({ title: "Error", message: "Failed to load project" });
				}
			}
		},
		[tabManager, presets, applyPreset, showInfo],
	);

	const deleteProject = useCallback(
		async (id: string) => {
			try {
				await localDeleteProject(id);
				await refreshProjectList();
			} catch {}

			for (const tab of tabManager.tabs) {
				if (tab.projectId === id) {
					tabManager.closeTab(tab.id);
				}
			}
		},
		[refreshProjectList, tabManager],
	);

	const deleteAllProjects = useCallback(async () => {
		const ids = recentProjects.map((c) => c.id);
		try {
			await Promise.allSettled(ids.map((id) => deleteProject(id)));
		} catch {}
	}, [recentProjects, deleteProject]);

	// Auto-save version graph when project changes
	const activeTab = tabManager.activeTab;
	useEffect(() => {
		if (!activeTab?.projectId || !activeTab?.versionGraph) return;
		const timer = setTimeout(() => {
			if (activeTab.projectId) {
				updateProjectVersionGraph(activeTab.projectId, activeTab.versionGraph);
			}
		}, 1000);
		return () => clearTimeout(timer);
	}, [activeTab?.projectId, activeTab?.versionGraph]);

	return {
		projectList,
		recentProjects,
		refreshProjectList,
		ensureProject,
		loadProject,
		deleteProject,
		deleteAllProjects,
	};
}
