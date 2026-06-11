import { useCallback, useEffect, useRef } from "react";
import type { useDialog } from "@/components/DialogProvider";
import { appendMessagesWithCap as localAppendMessages } from "@/lib/domain/projects";
import { callLocalModelClient } from "@/lib/model-client";
import {
	buildRefinementPrompt,
	buildUnifiedPrompt,
} from "@/lib/prompt-builder-client";
import type { GenerationOptions } from "@/types";
import type { MessageItem } from "../types";
import type { useTabManager } from "../useTabManager";
import { appendVersion, versionList } from "../version-graph";

export function useGeneration(
	tabManager: ReturnType<typeof useTabManager>,
	ensureProject: (firstLine: string, tabId?: string) => Promise<string | null>,
	refreshProjectList: () => Promise<void>,
	confirm: ReturnType<typeof useDialog>["confirm"],
	setOutputAnimateKey: React.Dispatch<React.SetStateAction<number>>,
) {
	const abortRef = useRef<{
		controller: AbortController;
		tabId: string;
	} | null>(null);
	const tabManagerRef = useRef(tabManager);

	useEffect(() => {
		tabManagerRef.current = tabManager;
	}, [tabManager]);

	const send = useCallback(async () => {
		const activeTab = tabManager.activeTab;
		if (!activeTab) return;
		const tabId = activeTab.id;

		const text = activeTab.draft.trim();
		if (!text || activeTab.sending) return;

		const graph = activeTab.versionGraph;
		if (graph.activeId !== graph.tailId) {
			let versionsToRemove = 0;
			let cursor = graph.nodes[graph.activeId]?.nextId;
			const seen = new Set<string>();
			while (cursor && !seen.has(cursor)) {
				seen.add(cursor);
				versionsToRemove++;
				cursor = graph.nodes[cursor]?.nextId ?? null;
			}

			const confirmed = await confirm({
				title: "Generate from Past Version",
				message: `You are on a past version. Generating here will remove ${versionsToRemove} version${versionsToRemove === 1 ? "" : "s"} ahead of this point. This cannot be undone.`,
				confirmText: "Continue & Revert",
				cancelText: "Cancel",
				tone: "destructive",
			});

			if (!confirmed) return;
		}

		const originalInput = text;

		tabManager.setSendingForTab(tabId, true);
		tabManager.setErrorForTab(tabId, null);
		const controller = new AbortController();
		abortRef.current = { controller, tabId };
		try {
			const projectId = await ensureProject(text, tabId);
			if (!projectId) return;
			const user: MessageItem = {
				id: crypto.randomUUID(),
				role: "user",
				content: text,
			};
			tabManager.pushMessageForTab(tabId, user);

			try {
				const result = await localAppendMessages(
					projectId,
					[{ role: user.role, content: user.content }],
					50,
				);
				const createdUserId = result?.created?.[0]?.id;
				if (createdUserId)
					tabManager.updateMessageForTab(tabId, user.id, { id: createdUserId });
			} catch {}

			const tabPreset = activeTab.preset;
			const tabTaskType = tabPreset.taskType;
			const tabOptions = tabPreset.options ?? ({} as GenerationOptions);

			const options: GenerationOptions = {
				tone: tabOptions.tone ?? "neutral",
				detail: tabOptions.detail ?? "normal",
				format: tabOptions.format ?? "markdown",
				...(tabOptions.language && { language: tabOptions.language }),
				...(tabOptions.audience?.trim() && {
					audience: tabOptions.audience.trim(),
				}),
				...(tabOptions.styleGuidelines?.trim() && {
					styleGuidelines: tabOptions.styleGuidelines.trim(),
				}),
				...(tabOptions.additionalContext && {
					additionalContext: tabOptions.additionalContext,
				}),
			};

			const existingVersions = versionList(graph).filter(
				(v) => v.label !== "Start",
			);
			const versionsWithOutput = existingVersions.filter(
				(v) => v.outputMessageId,
			);
			const isRefinementMode = versionsWithOutput.length > 0;

			let built: string;
			let refinedVersionId: string | undefined;

			if (isRefinementMode) {
				const lastVersionWithOutput =
					versionsWithOutput[versionsWithOutput.length - 1];
				refinedVersionId = lastVersionWithOutput?.id;
				const lastOutputMessage = activeTab.messages.find(
					(m) =>
						m.id === lastVersionWithOutput?.outputMessageId &&
						m.role === "assistant",
				);

				if (lastOutputMessage?.content) {
					built = await buildRefinementPrompt({
						previousOutput: lastOutputMessage.content,
						refinementRequest: text,
						taskType: tabTaskType,
						options,
					});
				} else {
					built = await buildUnifiedPrompt({
						input: text,
						taskType: tabTaskType,
						options,
					});
				}
			} else {
				built = await buildUnifiedPrompt({
					input: text,
					taskType: tabTaskType,
					options,
				});
			}

			const output = await callLocalModelClient(built, {
				taskType: tabTaskType,
				options,
				signal: controller.signal,
			});
			const assistant: MessageItem = {
				id: crypto.randomUUID(),
				role: "assistant",
				content: output,
			};
			tabManager.pushMessageForTab(tabId, assistant);

			let finalAssistantId = assistant.id;

			try {
				const result = await localAppendMessages(
					projectId,
					[{ role: assistant.role, content: assistant.content }],
					50,
				);
				const createdAssistantId = result?.created?.[0]?.id;
				if (createdAssistantId) {
					tabManager.updateMessageForTab(tabId, assistant.id, {
						id: createdAssistantId,
					});
					finalAssistantId = createdAssistantId;
				}
				await refreshProjectList();
			} catch {}

			const currentGraph = activeTab.versionGraph;
			const timestamp = new Date().toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			});
			const versionLabel = isRefinementMode
				? `Refined ${timestamp}`
				: `Generated ${timestamp}`;
			const updatedGraph = appendVersion(
				currentGraph,
				text,
				versionLabel,
				originalInput,
				finalAssistantId,
				{
					taskType: tabTaskType,
					options: options as Record<string, unknown>,
					isRefinement: isRefinementMode,
					...(refinedVersionId && { refinedVersionId }),
				},
			);
			tabManager.setVersionGraphForTab(tabId, updatedGraph);
			tabManager.updateDraftForTab(tabId, "");

			if (!isRefinementMode) {
				const truncatedLabel =
					originalInput.length > 40
						? `${originalInput.slice(0, 40).trim()}…`
						: originalInput;
				tabManager.updateTabLabel(tabId, truncatedLabel);
			}

			setOutputAnimateKey((prev) => prev + 1);
		} catch (e: unknown) {
			const error = e as Error & { name?: string };
			if (error?.name === "AbortError" || error?.message?.includes("aborted")) {
			} else {
				tabManager.setErrorForTab(
					tabId,
					error?.message || "Something went wrong",
				);
			}
		} finally {
			tabManager.setSendingForTab(tabId, false);
			if (abortRef.current?.controller === controller) abortRef.current = null;
		}
	}, [
		tabManager,
		ensureProject,
		refreshProjectList,
		confirm,
		setOutputAnimateKey,
	]);

	const abortGenerating = useCallback((showMessage: boolean) => {
		const manager = tabManagerRef.current;
		const activeRequest = abortRef.current;
		if (!activeRequest) return;
		activeRequest.controller.abort();
		manager.setSendingForTab(activeRequest.tabId, false);

		if (!showMessage) return;
		const abortedMsg: MessageItem = {
			id: crypto.randomUUID(),
			role: "assistant",
			content: "Response aborted",
		};
		manager.pushMessageForTab(activeRequest.tabId, abortedMsg);

		const tab = manager
			.getTabs()
			.find((item) => item.id === activeRequest.tabId);
		if (tab) {
			const timestamp = new Date().toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			});
			manager.setVersionGraphForTab(
				activeRequest.tabId,
				appendVersion(
					tab.versionGraph,
					tab.draft,
					`Aborted ${timestamp}`,
					tab.draft,
					abortedMsg.id,
					{ taskType: tab.preset.taskType, isRefinement: false },
				),
			);
		}
	}, []);

	useEffect(() => {
		return () => {
			abortGenerating(false);
		};
	}, [abortGenerating]);

	const stopGenerating = useCallback(() => {
		try {
			abortGenerating(true);
		} catch {}
	}, [abortGenerating]);

	return { send, stopGenerating };
}
