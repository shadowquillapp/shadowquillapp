import { useCallback, useRef } from "react";
import type { useDialog } from "@/components/DialogProvider";
import { appendMessagesWithCap as localAppendMessages } from "@/lib/local-db";
import { callLocalModelClient } from "@/lib/model-client";
import {
	buildRefinementPrompt,
	buildUnifiedPrompt,
} from "@/lib/prompt-builder-client";
import {
	normalizeAspectRatio,
	normalizeCameraMovement,
	normalizeDurationSeconds,
	normalizeFrameRate,
	normalizeShotType,
	normalizeStylePreset,
	normalizeVideoStylePreset,
} from "@/lib/prompt-normalization";
import type {
	FrameRate,
	GenerationOptions,
	ImageStylePreset,
	ReasoningStyle,
	VideoStylePreset,
} from "@/types";
import type { MessageItem } from "../types";
import type { useTabManager } from "../useTabManager";
import { appendVersion, versionList } from "../version-graph";

/**
 * Hook for managing prompt generation: sending prompts and stopping generation.
 */
export function useGeneration(
	tabManager: ReturnType<typeof useTabManager>,
	ensureProject: (firstLine: string) => Promise<string | null>,
	refreshProjectList: () => Promise<void>,
	confirm: ReturnType<typeof useDialog>["confirm"],
	setJustCreatedVersion: (value: boolean) => void,
	setOutputAnimateKey: React.Dispatch<React.SetStateAction<number>>,
) {
	const abortRef = useRef<AbortController | null>(null);

	const send = useCallback(async () => {
		const activeTab = tabManager.activeTab;
		if (!activeTab) return;

		const text = activeTab.draft.trim();
		if (!text || activeTab.sending) return;

		const graph = activeTab.versionGraph;
		if (graph.activeId !== graph.tailId) {
			let versionsToRemove = 0;
			let cursor = graph.nodes[graph.activeId]?.nextId;
			while (cursor) {
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

		tabManager.setSending(true);
		tabManager.setError(null);
		const controller = new AbortController();
		abortRef.current = controller;
		const projectId = await ensureProject(text);
		if (!projectId) {
			tabManager.setSending(false);
			return;
		}
		const user: MessageItem = {
			id: crypto.randomUUID(),
			role: "user",
			content: text,
		};
		tabManager.pushMessage(user);
		try {
			try {
				const result = await localAppendMessages(
					projectId,
					[{ role: user.role, content: user.content }],
					50,
				);
				const createdUserId = result?.created?.[0]?.id;
				if (createdUserId)
					tabManager.updateMessage(user.id, { id: createdUserId });
			} catch {}

			// Use the active tab's preset directly to ensure tab isolation
			const tabPreset = activeTab.preset;
			const tabTaskType = tabPreset.taskType;
			const tabOptions = tabPreset.options ?? ({} as GenerationOptions);

			const normalizedImageStyle = normalizeStylePreset(
				(tabOptions.stylePreset as ImageStylePreset) ?? "photorealistic",
			);
			const normalizedVideoStyle = normalizeVideoStylePreset(
				(tabOptions.stylePreset as VideoStylePreset) ?? "cinematic",
			);
			const normalizedAspect = normalizeAspectRatio(
				tabOptions.aspectRatio ?? "1:1",
			);
			const normalizedCamera = normalizeCameraMovement(
				tabOptions.cameraMovement ?? "static",
			);
			const normalizedShot = normalizeShotType(tabOptions.shotType ?? "medium");
			const normalizedDuration = normalizeDurationSeconds(
				typeof tabOptions.durationSeconds === "number"
					? tabOptions.durationSeconds
					: 5,
			);
			const normalizedFrame = normalizeFrameRate(
				typeof tabOptions.frameRate === "number"
					? (tabOptions.frameRate as FrameRate)
					: 24,
			);

			const options: GenerationOptions = {
				tone: tabOptions.tone ?? "neutral",
				detail: tabOptions.detail ?? "normal",
				format: tabOptions.format ?? "markdown",
				...(tabOptions.language && { language: tabOptions.language }),
				temperature:
					typeof tabOptions.temperature === "number"
						? tabOptions.temperature
						: 0.7,
				...(tabOptions.audience?.trim() && {
					audience: tabOptions.audience.trim(),
				}),
				...(tabTaskType === "image" &&
					normalizedImageStyle && { stylePreset: normalizedImageStyle }),
				...(tabTaskType === "video" &&
					normalizedVideoStyle && { stylePreset: normalizedVideoStyle }),
				...((tabTaskType === "image" || tabTaskType === "video") &&
					normalizedAspect && { aspectRatio: normalizedAspect }),
				...(tabTaskType === "coding" && {
					includeTests: !!tabOptions.includeTests,
					...(tabOptions.techStack?.trim() && {
						techStack: tabOptions.techStack.trim(),
					}),
					...(tabOptions.projectContext?.trim() && {
						projectContext: tabOptions.projectContext.trim(),
					}),
					...(tabOptions.codingConstraints?.trim() && {
						codingConstraints: tabOptions.codingConstraints.trim(),
					}),
				}),
				...(tabTaskType === "research" && {
					requireCitations: !!tabOptions.requireCitations,
				}),
				...(tabTaskType === "writing" && {
					...(tabOptions.writingStyle && {
						writingStyle: tabOptions.writingStyle,
					}),
					...(tabOptions.pointOfView && {
						pointOfView: tabOptions.pointOfView,
					}),
					...(tabOptions.readingLevel && {
						readingLevel: tabOptions.readingLevel,
					}),
					...(typeof tabOptions.targetWordCount === "number" && {
						targetWordCount: tabOptions.targetWordCount,
					}),
					includeHeadings: !!tabOptions.includeHeadings,
				}),
				...(tabTaskType === "marketing" && {
					...(tabOptions.marketingChannel && {
						marketingChannel: tabOptions.marketingChannel,
					}),
					...(tabOptions.ctaStyle && { ctaStyle: tabOptions.ctaStyle }),
					...(tabOptions.valueProps?.trim() && {
						valueProps: tabOptions.valueProps.trim(),
					}),
					...(tabOptions.complianceNotes?.trim() && {
						complianceNotes: tabOptions.complianceNotes.trim(),
					}),
				}),
				...(tabTaskType === "video" && {
					...(normalizedCamera && { cameraMovement: normalizedCamera }),
					...(normalizedShot && { shotType: normalizedShot }),
					...(normalizedDuration && { durationSeconds: normalizedDuration }),
					...(normalizedFrame && { frameRate: normalizedFrame }),
					includeStoryboard: !!tabOptions.includeStoryboard,
				}),
				useDelimiters:
					typeof tabOptions.useDelimiters === "boolean"
						? tabOptions.useDelimiters
						: true,
				includeVerification: !!tabOptions.includeVerification,
				reasoningStyle: (tabOptions.reasoningStyle as ReasoningStyle) ?? "none",
				...(tabOptions.endOfPromptToken && {
					endOfPromptToken: tabOptions.endOfPromptToken,
				}),
				...(tabOptions.format === "xml" &&
					tabOptions.outputXMLSchema && {
						outputXMLSchema: tabOptions.outputXMLSchema,
					}),
				...(tabOptions.identity?.trim() && {
					identity: tabOptions.identity.trim(),
				}),
				...(tabOptions.styleGuidelines?.trim() && {
					styleGuidelines: tabOptions.styleGuidelines.trim(),
				}),
				...(tabOptions.additionalContext && {
					additionalContext: tabOptions.additionalContext,
				}),
				...(tabOptions.examplesText && {
					examplesText: tabOptions.examplesText,
				}),
			};

			// Check if we're in refinement mode (has at least one version with output)
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
			});
			const assistant: MessageItem = {
				id: crypto.randomUUID(),
				role: "assistant",
				content: output,
			};
			tabManager.pushMessage(assistant);

			let finalAssistantId = assistant.id;

			try {
				const result = await localAppendMessages(
					projectId,
					[{ role: assistant.role, content: assistant.content }],
					50,
				);
				const createdAssistantId = result?.created?.[0]?.id;
				if (createdAssistantId) {
					tabManager.updateMessage(assistant.id, { id: createdAssistantId });
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
			tabManager.setVersionGraph(updatedGraph);
			tabManager.markDirty(false);

			tabManager.updateDraft("");

			if (!isRefinementMode) {
				const truncatedLabel =
					originalInput.length > 40
						? `${originalInput.slice(0, 40).trim()}…`
						: originalInput;
				tabManager.updateTabLabel(activeTab.id, truncatedLabel);
			}

			setJustCreatedVersion(true);
			setOutputAnimateKey((prev) => prev + 1);
			setTimeout(() => setJustCreatedVersion(false), 700);
		} catch (e: unknown) {
			const error = e as Error & { name?: string };
			if (error?.name === "AbortError" || error?.message?.includes("aborted")) {
			} else {
				tabManager.setError(error?.message || "Something went wrong");
			}
		} finally {
			tabManager.setSending(false);
			abortRef.current = null;
		}
	}, [
		tabManager,
		ensureProject,
		refreshProjectList,
		confirm,
		setJustCreatedVersion,
		setOutputAnimateKey,
	]);

	const stopGenerating = useCallback(() => {
		try {
			abortRef.current?.abort();
			const abortedMsg: MessageItem = {
				id: crypto.randomUUID(),
				role: "assistant",
				content: "Response aborted",
			};
			tabManager.pushMessage(abortedMsg);
		} catch {}
		tabManager.setSending(false);
	}, [tabManager]);

	return { send, stopGenerating };
}
