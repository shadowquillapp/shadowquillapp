"use client";

import { useDialog } from "@/components/DialogProvider";
import FeatherLoader from "@/components/FeatherLoader";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import SettingsDialog from "@/components/SettingsDialog";
import {
	listAvailableModels,
	readLocalModelConfig as readLocalModelConfigClient,
	writeLocalModelConfig as writeLocalModelConfigClient,
} from "@/lib/local-config";
import { getJSON, setJSON } from "@/lib/local-storage";
import {
	appendMessagesWithCap as localAppendMessages,
	createProject as localCreateProject,
	deleteProject as localDeleteProject,
	getProject as localGetProject,
	listProjectsByUser as localListProjects,
	updateProjectVersionGraph,
} from "@/lib/local-db";
import { callLocalModelClient } from "@/lib/model-client";
import { getPresets } from "@/lib/presets";
import { buildUnifiedPrompt, buildRefinementPrompt } from "@/lib/prompt-builder-client";
import {
	normalizeAspectRatio,
	normalizeCameraMovement,
	normalizeDurationSeconds,
	normalizeFrameRate,
	normalizeShotType,
	normalizeStylePreset,
	normalizeVideoStylePreset,
} from "@/lib/prompt-normalization";
import { useRouter } from "next/navigation";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { MessageRenderer } from "./workbench/MessageRenderer";
import type { MessageItem, PromptPresetSummary } from "./workbench/types";
import { useTabManager } from "./workbench/useTabManager";
import { appendVersion, createVersionGraph, versionList, getOutputMessageId, migrateVersionGraph, undoVersion, redoVersion } from "./workbench/version-graph";
import { VersionHistoryModal } from "./workbench/VersionHistoryModal";
import { VersionNavigator } from "./workbench/VersionNavigator";
import { PresetInfoDialog } from "./workbench/PresetInfoDialog";
import { TabBar } from "./workbench/TabBar";
import { PresetPickerModal } from "./workbench/PresetPickerModal";

import type {
	CameraMovement,
	Detail,
	Format,
	FrameRate,
	GenerationOptions,
	ImageAspectRatio,
	ImageStylePreset,
	ReasoningStyle,
	ShotType,
	TaskType,
	Tone,
	VideoStylePreset,
} from "@/types";

export default function PromptWorkbench() {
	const { showInfo, confirm } = useDialog();
	const router = useRouter();
	const [modelLabel, setModelLabel] = useState<string>("Gemma 3 4B");
	const [availableModels, setAvailableModels] = useState<
		Array<{ name: string; size: number }>
	>([]);
	const [currentModelId, setCurrentModelId] = useState<string | null>(null);
	const [modelMenuOpen, setModelMenuOpen] = useState(false);
	const [modelMenuUp, setModelMenuUp] = useState(false);
	const modelBtnRef = useRef<HTMLButtonElement | null>(null);
	const modelMenuRef = useRef<HTMLDivElement | null>(null);
	const [showVersionHistory, setShowVersionHistory] = useState(false);
	const [showPresetInfo, setShowPresetInfo] = useState(false);
	const [justCreatedVersion, setJustCreatedVersion] = useState(false);
	const [showRefinementContext, setShowRefinementContext] = useState(false);
	const [outputAnimateKey, setOutputAnimateKey] = useState(0);
	const [leftPanelWidth, setLeftPanelWidth] = useState(() => 
		getJSON<number>("shadowquill:panelWidth", 50)
	); // percentage - persisted
	const [isResizing, setIsResizing] = useState(false);
	const panelsRef = useRef<HTMLDivElement | null>(null);
	const [currentTheme, setCurrentTheme] = useState<
		"earth" | "purpledark" | "dark" | "light"
	>("earth");
	const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
	const abortRef = useRef<AbortController | null>(null);
	const scrollContainerRef = useRef<HTMLDivElement | null>(null);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [settingsInitialTab, setSettingsInitialTab] = useState<
		"system" | "ollama" | "data" | "display"
	>("ollama");
	const textareaContainerRef = useRef<HTMLDivElement | null>(null);
	const [taskType, setTaskType] = useState<TaskType>("general");
	const [tone, setTone] = useState<Tone>("neutral");
	const [detail, setDetail] = useState<Detail>("normal");
	const [format, setFormat] = useState<Format>("markdown");
	const [language, setLanguage] = useState("English");
	const [temperature, setTemperature] = useState(0.7);
	const [stylePreset, setStylePreset] =
		useState<ImageStylePreset>("photorealistic");
	const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>("1:1");
	const [videoStylePreset, setVideoStylePreset] =
		useState<VideoStylePreset>("cinematic");
	const [cameraMovement, setCameraMovement] =
		useState<CameraMovement>("static");
	const [shotType, setShotType] = useState<ShotType>("medium");
	const [durationSeconds, setDurationSeconds] = useState<number>(5);
	const [frameRate, setFrameRate] = useState<FrameRate>(24);
	const [includeStoryboard, setIncludeStoryboard] = useState(false);
	const [includeTests, setIncludeTests] = useState(true);
	const [requireCitations, setRequireCitations] = useState(true);
	const [useDelimiters, setUseDelimiters] = useState(true);
	const [includeVerification, setIncludeVerification] = useState(false);
	const [reasoningStyle, setReasoningStyle] = useState<ReasoningStyle>("none");
	const [endOfPromptToken, setEndOfPromptToken] = useState("<|endofprompt|>");
	const [outputXMLSchema, setOutputXMLSchema] = useState("");
	const [additionalContext, setAdditionalContext] = useState("");
	const [examplesText, setExamplesText] = useState("");
	const [presets, setPresets] = useState<
		Array<{ id?: string; name: string; taskType: TaskType; options?: any }>
	>([]);
	const [loadingPresets, setLoadingPresets] = useState(false);
	const [selectedPresetKey, setSelectedPresetKey] = useState("");
	const [recentPresetKeys, setRecentPresetKeys] = useState<string[]>([]);

	// Tab management
	const tabManager = useTabManager();
	const [showPresetPicker, setShowPresetPicker] = useState(false);
	const [presetPickerForNewTab, setPresetPickerForNewTab] = useState(false);
	const hasAutoShownPresetPicker = useRef(false);

	// Local project list state
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

	// Load local Ollama models only
	useEffect(() => {
		const load = async () => {
			try {
				const cfg = readLocalModelConfigClient();
				const models = await listAvailableModels("http://localhost:11434");
				setAvailableModels(models);
				if (cfg && cfg.provider === "ollama" && typeof cfg.model === "string") {
					setCurrentModelId(cfg.model);
					const size = (cfg.model.split(":")[1] || "").toUpperCase();
					setModelLabel(size ? `Gemma 3 ${size}` : "Gemma 3");
				}
			} catch {
				/* ignore */
			}
		};
		load();
	}, []);

	// Theme management
	useEffect(() => {
		let savedTheme = localStorage.getItem("theme-preference") as
			| "earth"
			| "purpledark"
			| "dark"
			| "light"
			| "default"
			| null;
		// Migrate old 'default' theme to 'purpledark'
		if (savedTheme === "default") {
			savedTheme = "purpledark";
			localStorage.setItem("theme-preference", "purpledark");
		}
		if (
			savedTheme &&
			(savedTheme === "earth" ||
				savedTheme === "purpledark" ||
				savedTheme === "dark" ||
				savedTheme === "light")
		) {
			setCurrentTheme(savedTheme);
			document.documentElement.setAttribute(
				"data-theme",
				savedTheme === "earth" ? "" : savedTheme,
			);
		}
		// Load recent presets (initial)
		try {
			const stored = localStorage.getItem("recent-presets");
			if (stored) {
				const arr = JSON.parse(stored);
				if (Array.isArray(arr))
					setRecentPresetKeys(arr.filter((x) => typeof x === "string"));
			}
		} catch {
			/* noop */
		}
	}, []);

	// Drag handlers for controls

	const modelIds = useMemo(
		() => ["gemma3:4b", "gemma3:12b", "gemma3:27b"],
		[],
	);
	const activeIndex = useMemo(
		() => Math.max(0, modelIds.indexOf(currentModelId ?? "")),
		[currentModelId, modelIds],
	);

	// Refresh available models
	const refreshModels = useCallback(async () => {
		try {
			const models = await listAvailableModels("http://localhost:11434");
			setAvailableModels(models);
			const cfg = readLocalModelConfigClient();
			if (cfg && cfg.provider === "ollama" && typeof cfg.model === "string") {
				setCurrentModelId(cfg.model);
				const size = (cfg.model.split(":")[1] || "").toUpperCase();
				setModelLabel(size ? `Gemma 3 ${size}` : "Gemma 3");
			}
		} catch {
			setAvailableModels([]);
		}
	}, []);

	// Position model dropdown to avoid viewport overflow
	useEffect(() => {
		if (!modelMenuOpen) return;
		const btn = modelBtnRef.current;
		const menu = modelMenuRef.current;
		if (!btn) return;
		const rect = btn.getBoundingClientRect();
		const spaceBelow = window.innerHeight - rect.bottom;
		const spaceAbove = rect.top;
		const estimatedMenuH = Math.min(
			320,
			menu?.getBoundingClientRect().height || 240,
		);
		setModelMenuUp(spaceBelow < estimatedMenuH && spaceAbove > spaceBelow);

		const onClickOutside = (e: MouseEvent) => {
			const target = e.target as Node;
			if (!btn.contains(target) && !menu?.contains(target)) {
				setModelMenuOpen(false);
			}
		};
		const onEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") setModelMenuOpen(false);
		};
		document.addEventListener("mousedown", onClickOutside);
		document.addEventListener("keydown", onEsc);
		return () => {
			document.removeEventListener("mousedown", onClickOutside);
			document.removeEventListener("keydown", onEsc);
		};
	}, [modelMenuOpen]);

	// Global event to open Settings dialog with initial tab
	useEffect(() => {
		const handler = (e: Event) => {
			try {
				const ce = e as CustomEvent;
				const tab = ce?.detail?.tab as "system" | "ollama" | "data" | undefined;
				if (tab) setSettingsInitialTab(tab);
			} catch {}
			setSettingsOpen(true);
		};
		window.addEventListener("open-app-settings", handler as any);
		return () =>
			window.removeEventListener("open-app-settings", handler as any);
	}, []);

	// Ensure project exists or create one
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

	const applyPreset = useCallback(
		(
			p: { name: string; taskType: TaskType; options?: any; id?: string },
			opts?: { trackRecent?: boolean },
		) => {
			const trackRecent = opts?.trackRecent ?? true;
			setTaskType(p.taskType);
			const o = p.options ?? {};
			if (o.tone) setTone(o.tone);
			if (o.detail) setDetail(o.detail);
			if (o.format) setFormat(o.format);
			setLanguage(o.language ?? "English");
			setTemperature(typeof o.temperature === "number" ? o.temperature : 0.7);
			setStylePreset(o.stylePreset ?? "photorealistic");
			setAspectRatio(o.aspectRatio ?? "1:1");
			setVideoStylePreset(o.stylePreset ?? "cinematic");
			setCameraMovement(o.cameraMovement ?? "static");
			setShotType(o.shotType ?? "medium");
			setDurationSeconds(
				typeof o.durationSeconds === "number" ? o.durationSeconds : 5,
			);
			setFrameRate(
				typeof o.frameRate === "number" ? (o.frameRate as FrameRate) : 24,
			);
			setIncludeStoryboard(!!o.includeStoryboard);
			setIncludeTests(!!o.includeTests);
			setRequireCitations(!!o.requireCitations);
			setUseDelimiters(
				typeof o.useDelimiters === "boolean" ? o.useDelimiters : true,
			);
			setIncludeVerification(!!o.includeVerification);
			setReasoningStyle((o.reasoningStyle as ReasoningStyle) ?? "none");
			setEndOfPromptToken(o.endOfPromptToken ?? "<|endofprompt|>");
			setOutputXMLSchema(o.outputXMLSchema ?? o.outputSchema ?? "");
			setAdditionalContext(o.additionalContext ?? "");
			setExamplesText(o.examplesText ?? "");
			if (trackRecent) {
				const key = (p as any).id ?? p.name;
				setRecentPresetKeys((prev) => {
					const next = [key, ...prev.filter((k) => k !== key)].slice(0, 3);
					try {
						localStorage.setItem("recent-presets", JSON.stringify(next));
					} catch {}
					return next;
				});
			}
		},
		[],
	);

	const presetToSummary = useCallback(
		(p: { id?: string; name: string; taskType: TaskType; options?: any }) => {
			const summary: PromptPresetSummary = {
				name: p.name,
				taskType: p.taskType,
				options: p.options,
			};
			if (typeof p.id === "string") summary.id = p.id;
			return summary;
		},
		[],
	);

	const seedDraftFromPreset = useCallback((preset: PromptPresetSummary) => {
		return "";
	}, []);

	const loadPreset = useCallback(
		(
			preset: { id?: string; name: string; taskType: TaskType; options?: any },
			opts?: { trackRecent?: boolean },
		) => {
			const summary = presetToSummary(preset);
			const applyOpts =
				opts?.trackRecent === undefined
					? undefined
					: { trackRecent: opts.trackRecent };
			applyPreset(preset, applyOpts);
			const newKey = summary.id ?? summary.name;
			setSelectedPresetKey(newKey);
			try {
				localStorage.setItem("last-selected-preset", newKey);
			} catch {}
			// Create a new tab with this preset
			if (tabManager.canCreateTab) {
				tabManager.createTab(summary);
			}
		},
		[applyPreset, presetToSummary, tabManager],
	);

	useEffect(() => {
		const load = async () => {
			setLoadingPresets(true);
			try {
				const data = getPresets();
				const list = (data ?? []).map((p: any) => ({
					id: p.id,
					name: p.name,
					taskType: p.taskType,
					options: p.options,
				}));
				setPresets(list);
				setRecentPresetKeys((prev) => {
					const set = new Set(list.map((p: any) => p.id ?? p.name));
					const cleaned = prev.filter((k) => set.has(k)).slice(0, 3);
					try {
						localStorage.setItem("recent-presets", JSON.stringify(cleaned));
					} catch {}
					return cleaned;
				});
				if (!selectedPresetKey) {
					const lastKey =
						(typeof window !== "undefined"
							? localStorage.getItem("last-selected-preset")
							: null) || "";
					const pick =
						(lastKey && list.find((p: any) => (p.id ?? p.name) === lastKey)) ||
						list[0] ||
						null;
					if (pick) {
						const key = pick.id ?? pick.name;
						setSelectedPresetKey(key);
						try {
							if (typeof window !== "undefined")
								localStorage.setItem("last-selected-preset", key);
						} catch {}
						applyPreset(pick);
					}
				}
			} finally {
				setLoadingPresets(false);
			}
		};
		void load();
	}, [applyPreset, selectedPresetKey]);

	// Check for preset applied from Preset Studio page
	useEffect(() => {
		const applyPresetFromStorage = () => {
			try {
				const stored = sessionStorage.getItem("PC_APPLY_PRESET");
				if (stored) {
					const preset = JSON.parse(stored);
					loadPreset(preset);
					sessionStorage.removeItem("PC_APPLY_PRESET");
				}
			} catch (error) {
				console.error("Failed to apply preset from storage:", error);
			}
		};
		applyPresetFromStorage();
	}, [loadPreset]);

	// Auto-show preset picker when no tabs are open
	useEffect(() => {
		// Wait for presets to be loaded
		if (loadingPresets || presets.length === 0) return;

		// Reset the auto-show flag when tabs exist
		if (tabManager.tabs.length > 0) {
			hasAutoShownPresetPicker.current = false;
			return;
		}

		// If no tabs and we haven't auto-shown yet, show the preset picker
		if (!hasAutoShownPresetPicker.current && !showPresetPicker) {
			hasAutoShownPresetPicker.current = true;
			setShowPresetPicker(true);
			setPresetPickerForNewTab(true);
		}
	}, [loadingPresets, presets.length, tabManager.tabs.length, showPresetPicker]);

	const send = useCallback(async () => {
		const activeTab = tabManager.activeTab;
		if (!activeTab) return;
		
		const text = activeTab.draft.trim();
		if (!text || activeTab.sending) return;
		
		// Check if user is on a past version - if so, confirm before proceeding
		const graph = activeTab.versionGraph;
		if (graph.activeId !== graph.tailId) {
			// Count how many versions will be removed
			let versionsToRemove = 0;
			let cursor = graph.nodes[graph.activeId]?.nextId;
			while (cursor) {
				versionsToRemove++;
				cursor = graph.nodes[cursor]?.nextId ?? null;
			}
			
			const confirmed = await confirm({
				title: "Generate from Past Version",
				message: `You are on a past version. Generating here will remove ${versionsToRemove} version${versionsToRemove === 1 ? '' : 's'} ahead of this point. This cannot be undone.`,
				confirmText: "Continue & Revert",
				cancelText: "Cancel",
				tone: "destructive",
			});
			
			if (!confirmed) return;
		}
		
		// Capture original input before processing
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
				if (createdUserId) tabManager.updateMessage(user.id, { id: createdUserId });
			} catch {}

			// Pre-compute normalized values to avoid spreading undefined with exactOptionalPropertyTypes
			const normalizedImageStyle = normalizeStylePreset(stylePreset);
			const normalizedVideoStyle = normalizeVideoStylePreset(videoStylePreset);
			const normalizedAspect = normalizeAspectRatio(aspectRatio);
			const normalizedCamera = normalizeCameraMovement(cameraMovement);
			const normalizedShot = normalizeShotType(shotType);
			const normalizedDuration = normalizeDurationSeconds(durationSeconds);
			const normalizedFrame = normalizeFrameRate(frameRate);

			const options: GenerationOptions = {
				tone,
				detail,
				format,
				...(language && { language }),
				temperature,
				...(taskType === "image" && normalizedImageStyle && { stylePreset: normalizedImageStyle }),
				...(taskType === "video" && normalizedVideoStyle && { stylePreset: normalizedVideoStyle }),
				...((taskType === "image" || taskType === "video") && normalizedAspect && { aspectRatio: normalizedAspect }),
				...(taskType === "coding" && { includeTests }),
				...(taskType === "research" && { requireCitations }),
				...(taskType === "video" && {
					...(normalizedCamera && { cameraMovement: normalizedCamera }),
					...(normalizedShot && { shotType: normalizedShot }),
					...(normalizedDuration && { durationSeconds: normalizedDuration }),
					...(normalizedFrame && { frameRate: normalizedFrame }),
					includeStoryboard,
				}),
				useDelimiters,
				includeVerification,
				reasoningStyle,
				...(endOfPromptToken && { endOfPromptToken }),
				...(format === "xml" && outputXMLSchema && { outputXMLSchema }),
				...(additionalContext && { additionalContext }),
				...(examplesText && { examplesText }),
			};

			// Check if we're in refinement mode (has at least one version with output)
			const existingVersions = versionList(graph).filter(v => v.label !== "Start");
			const versionsWithOutput = existingVersions.filter(v => v.outputMessageId);
			const isRefinementMode = versionsWithOutput.length > 0;
			
			let built: string;
			let refinedVersionId: string | undefined;
			
			if (isRefinementMode) {
				// REFINEMENT MODE: Use the last version's output as the base to refine
				const lastVersionWithOutput = versionsWithOutput[versionsWithOutput.length - 1];
				refinedVersionId = lastVersionWithOutput?.id;
				const lastOutputMessage = activeTab.messages.find(
					m => m.id === lastVersionWithOutput?.outputMessageId && m.role === "assistant"
				);
				
				if (lastOutputMessage?.content) {
					built = await buildRefinementPrompt({
						previousOutput: lastOutputMessage.content,
						refinementRequest: text,
						taskType,
						options,
					});
				} else {
					// Fallback to initial mode if we can't find the previous output
					built = await buildUnifiedPrompt({
						input: text,
						taskType,
						options,
					});
				}
			} else {
				// INITIAL MODE: Generate base output from user input
				built = await buildUnifiedPrompt({
					input: text,
					taskType,
					options,
				});
			}
			
			const output = await callLocalModelClient(built, {
				taskType,
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
			
			// Update version graph
			const currentGraph = activeTab.versionGraph;
			const timestamp = new Date().toLocaleTimeString([], { 
				hour: '2-digit', 
				minute: '2-digit' 
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
					taskType, 
					options,
					isRefinement: isRefinementMode,
					...(refinedVersionId && { refinedVersionId }),
				}
			);
			tabManager.setVersionGraph(updatedGraph);
			tabManager.markDirty(false);
			
			// Clear the input after successful generation so user can enter refinement
			tabManager.updateDraft("");
			
			// Auto-sync tab name to the prompt input (only for base version, not refinements)
			if (!isRefinementMode) {
				const truncatedLabel = originalInput.length > 40 
					? originalInput.slice(0, 40).trim() + "…" 
					: originalInput;
				tabManager.updateTabLabel(activeTab.id, truncatedLabel);
			}
			
			// Trigger version creation animation
			setJustCreatedVersion(true);
			setOutputAnimateKey(prev => prev + 1);
			setTimeout(() => setJustCreatedVersion(false), 700);
		} catch (e: any) {
			if (e?.name === "AbortError" || e?.message?.includes("aborted")) {
				// Silent abort
			} else {
				tabManager.setError(e?.message || "Something went wrong");
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
		taskType,
		tone,
		detail,
		format,
		language,
		temperature,
		stylePreset,
		videoStylePreset,
		aspectRatio,
		includeTests,
		requireCitations,
		cameraMovement,
		shotType,
		durationSeconds,
		frameRate,
		includeStoryboard,
		useDelimiters,
		includeVerification,
		reasoningStyle,
		endOfPromptToken,
		outputXMLSchema,
		additionalContext,
		examplesText,
		buildUnifiedPrompt,
		callLocalModelClient,
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

	// Version navigation handlers
	const goToPreviousVersion = useCallback(() => {
		const tab = tabManager.activeTab;
		if (!tab) return;
		const prevGraph = undoVersion(tab.versionGraph);
		if (prevGraph) {
			const prevNode = prevGraph.nodes[prevGraph.activeId];
			// Keep draft empty when navigating to a version that has output (refinement mode)
			// The original input is shown in the context preview, not the editable field
			if (prevNode && !prevNode.outputMessageId) {
				tabManager.updateDraft(prevNode.originalInput || prevNode.content);
			} else {
				tabManager.updateDraft("");
			}
			tabManager.setVersionGraph(prevGraph);
			tabManager.markDirty(false);
			setOutputAnimateKey(prev => prev + 1);
		}
	}, [tabManager]);

	const goToNextVersion = useCallback(() => {
		const tab = tabManager.activeTab;
		if (!tab) return;
		const nextGraph = redoVersion(tab.versionGraph);
		if (nextGraph) {
			const nextNode = nextGraph.nodes[nextGraph.activeId];
			// Keep draft empty when navigating to a version that has output (refinement mode)
			// The original input is shown in the context preview, not the editable field
			if (nextNode && !nextNode.outputMessageId) {
				tabManager.updateDraft(nextNode.originalInput || nextNode.content);
			} else {
				tabManager.updateDraft("");
			}
			tabManager.setVersionGraph(nextGraph);
			tabManager.markDirty(false);
			setOutputAnimateKey(prev => prev + 1);
		}
	}, [tabManager]);

	const endRef = useRef<HTMLDivElement | null>(null);

	// Auto-scroll to bottom when messages change or when sending
	useEffect(() => {
		const container = scrollContainerRef.current;
		if (!container) return;
		requestAnimationFrame(() => {
			container.scrollTo({
				top: container.scrollHeight,
				behavior: "smooth",
			});
		});
	}, [tabManager.activeTab?.messages, tabManager.activeTab?.sending]);

	const activeTab = tabManager.activeTab;
	const activeMessages = activeTab?.messages ?? [];
	const hasMessages = activeMessages.length > 0;
	const recentProjects = useMemo(
		() =>
			(projectList ?? [])
				.slice()
				.sort((a: any, b: any) => (b.updatedAt as any) - (a.updatedAt as any)),
		[projectList],
	);

	// Project selection & deletion
	const loadProject = useCallback(
		async (id: string) => {
			try {
				// Check if project is already open in a tab
				const existingTab = tabManager.findTabByProjectId(id);
				if (existingTab) {
					tabManager.switchTab(existingTab.id);
					return;
				}
				
				// Check if we can create a new tab
				if (!tabManager.canCreateTab) {
					// Use activeTab's error if available, otherwise show alert
					if (tabManager.activeTab) {
						tabManager.setError("Maximum number of tabs reached. Close a tab to open this project.");
					} else {
						showInfo({ title: "Tab Limit", message: "Maximum number of tabs reached. Close a tab to open this project." });
					}
					return;
				}
				
				const data = await localGetProject(id, 50);
				const loaded: MessageItem[] = (data.messages ?? []).map((m: any) => ({
					id: m.id,
					role: m.role,
					content: m.content,
				}));

				// Find the preset for this project
				let projectPreset: PromptPresetSummary | null = null;
				if (data.presetId) {
					const preset = presets.find((p) => p.id === data.presetId);
					if (preset) {
						projectPreset = preset;
					}
				}
				
				// If no preset found, use first available preset
				if (!projectPreset) {
					if (presets.length > 0) {
						projectPreset = presets[0] ?? null;
					}
				}
				
				if (!projectPreset) {
					showInfo({ title: "No Preset", message: "No preset available to open this project." });
					return;
				}
				
				// Apply preset configuration
				applyPreset(projectPreset, { trackRecent: false });
				
				// Create new tab and capture the tab ID for synchronous operations
				const newTabId = tabManager.createTab(projectPreset);
				
				// Build the version graph
				let graph: any;
				if (data.versionGraph) {
					// Migrate version graph for backward compatibility
					graph = migrateVersionGraph(data.versionGraph, loaded);
				} else {
					// Reconstruct history from user messages for legacy sessions
					graph = createVersionGraph("", "Start", "", null);
					const userMsgs = loaded.filter((m) => m.role === "user");
					const assistantMsgs = loaded.filter((m) => m.role === "assistant");
					
					if (userMsgs.length > 0) {
						userMsgs.forEach((msg, i) => {
							// Try to link with corresponding assistant message
							const outputId = assistantMsgs[i]?.id ?? null;
							graph = appendVersion(
								graph, 
								msg.content, 
								`Version ${i + 1}`,
								msg.content,
								outputId
							);
						});
					}
				}
				
				// Jump to the most recent version when opening a saved project
				if (graph.tailId && graph.nodes[graph.tailId]) {
					graph = { ...graph, activeId: graph.tailId };
				}
				
				// Apply all data to the new tab using explicit tabId-based operations
				tabManager.setMessagesForTab(newTabId, loaded);
				tabManager.setVersionGraphForTab(newTabId, graph);
				tabManager.attachProjectForTab(newTabId, id);
				
				const activeNode = graph.nodes[graph.activeId];
				if (activeNode && !activeNode.outputMessageId) {
					const draftContent = activeNode.originalInput || activeNode.content || "";
					tabManager.updateDraftForTab(newTabId, draftContent);
				} else {
					tabManager.updateDraftForTab(newTabId, "");
				}
				
				// Update tab label with project title
				if (data.title) {
					tabManager.updateTabLabel(newTabId, data.title);
				}
			} catch (e) {
				// Use tabId-based error if we have a tab, otherwise show info dialog
				if (tabManager.activeTab) {
					tabManager.setError("Failed to load project");
				} else {
					showInfo({ title: "Error", message: "Failed to load project" });
				}
			}
		},
		[tabManager, presets, applyPreset, showInfo],
	);

	// Auto-save version graph
	useEffect(() => {
		if (!activeTab?.projectId || !activeTab?.versionGraph) return;
		const timer = setTimeout(() => {
			updateProjectVersionGraph(activeTab.projectId!, activeTab.versionGraph);
		}, 1000);
		return () => clearTimeout(timer);
	}, [activeTab?.projectId, activeTab?.versionGraph]);

	const deleteProject = useCallback(
		async (id: string) => {
			try {
				await localDeleteProject(id);
				await refreshProjectList();
			} catch {}
			
			// Close any tabs with this project
			tabManager.tabs.forEach((tab) => {
				if (tab.projectId === id) {
					tabManager.closeTab(tab.id);
				}
			});
		},
		[refreshProjectList, tabManager],
	);

	const deleteAllProjects = useCallback(async () => {
		const ids = recentProjects.map((c) => c.id);
		try {
			await Promise.allSettled(ids.map((id) => deleteProject(id)));
		} catch {}
	}, [recentProjects, deleteProject]);

	// Copy message content
	const copyMessage = useCallback(
		async (messageId: string, content: string) => {
			try {
				// Strip a single OUTER fenced code block (e.g., ```xml ... ```) from copied text
				let textToCopy = content;
				const fenceMatch = textToCopy.match(/^\s*```([^\n]*)\n?([\s\S]*?)\n```[\s\r]*$/);
				if (fenceMatch) {
					const lang = (fenceMatch[1] || "").trim().toLowerCase();
					textToCopy = fenceMatch[2] || "";
					// Clean duplicate opening marker inside inner content if present (e.g., ```xml\n at start)
					if (lang) {
						const duplicateMarkerPattern = new RegExp(`^\\s*\\\`\\\`\\\`${lang}\\s*\\n`, "i");
						textToCopy = textToCopy.replace(duplicateMarkerPattern, "");
					}
				}

				await navigator.clipboard.writeText(textToCopy);
				setCopiedMessageId(messageId);
				setTimeout(() => setCopiedMessageId(null), 2000);
			} catch {
				const textArea = document.createElement("textarea");
				// Fallback path mirrors fenced stripping as above
				let textToCopy = content;
				const fenceMatch = textToCopy.match(/^\s*```([^\n]*)\n?([\s\S]*?)\n```[\s\r]*$/);
				if (fenceMatch) {
					const lang = (fenceMatch[1] || "").trim().toLowerCase();
					textToCopy = fenceMatch[2] || "";
					if (lang) {
						const duplicateMarkerPattern = new RegExp(`^\\s*\\\`\\\`\\\`${lang}\\s*\\n`, "i");
						textToCopy = textToCopy.replace(duplicateMarkerPattern, "");
					}
				}
				textArea.value = textToCopy;
				document.body.appendChild(textArea);
				textArea.select();
				document.execCommand("copy");
				document.body.removeChild(textArea);
				setCopiedMessageId(messageId);
				setTimeout(() => setCopiedMessageId(null), 2000);
			}
		},
		[],
	);

	const versions = activeTab ? versionList(activeTab.versionGraph).filter(
		(v) => v.label !== "Start",
	) : [];
	
	// Refinement mode: true when there's at least one version with generated output
	const versionsWithOutput = versions.filter(v => v.outputMessageId);
	const isRefinementMode = versionsWithOutput.length > 0;
	
	// Get the currently ACTIVE version for context display
	const activeVersionId = activeTab?.versionGraph.activeId;
	const activeVersion = activeVersionId ? activeTab?.versionGraph.nodes[activeVersionId] : null;
	const activeVersionIndex = versions.findIndex(v => v.id === activeVersionId);
	const activeVersionNumber = activeVersionIndex >= 0 ? activeVersionIndex + 1 : 0;
	
	// Determine if the active version is a refinement
	const activeVersionIsRefinement = activeVersion?.metadata?.isRefinement === true;
	
	// Get the version to show in context (for refinement, show what's being refined)
	// When creating a new refinement, use the active version's output
	// When viewing a refinement version, show the version it refined
	const contextVersion = activeVersionIsRefinement && activeVersion?.metadata?.refinedVersionId
		? activeTab?.versionGraph.nodes[activeVersion.metadata.refinedVersionId]
		: activeVersion;
	
	// Get output and input for the context display
	const contextOutput = contextVersion?.outputMessageId
		? activeMessages.find(m => m.id === contextVersion.outputMessageId && m.role === "assistant")?.content
		: null;
	const contextInput = contextVersion?.originalInput ?? null;
	
	// For refinement mode display, show what will be refined (the active version's output)
	const lastVersionWithOutput = versionsWithOutput[versionsWithOutput.length - 1];
	const outputToRefine = activeVersion?.outputMessageId
		? activeMessages.find(m => m.id === activeVersion.outputMessageId && m.role === "assistant")?.content
		: null;
	const inputThatGeneratedOutput = activeVersion?.originalInput ?? null;
	
	
	// Live word count for the editor header
	const wordCount = useMemo(() => {
		const text = activeTab?.draft || "";
		const trimmed = text.trim();
		if (!trimmed) return 0;
		return trimmed.split(/\s+/).filter(Boolean).length;
	}, [activeTab?.draft]);

	const charCount = useMemo(() => {
		const text = activeTab?.draft || "";
		return text.length;
	}, [activeTab?.draft]);

	const lastAssistantMessage = useMemo(
		() => activeMessages.filter((m) => m.role === "assistant").slice(-1)[0],
		[activeMessages],
	);

	const outputWordCount = useMemo(() => {
		const text = lastAssistantMessage?.content || "";
		const trimmed = text.trim();
		if (!trimmed) return 0;
		return trimmed.split(/\s+/).filter(Boolean).length;
	}, [lastAssistantMessage]);

	const outputCharCount = useMemo(() => {
		const text = lastAssistantMessage?.content || "";
		return text.length;
	}, [lastAssistantMessage]);

	// Global keyboard shortcut for saving (Cmd+S / Ctrl+S) and tabs
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			// Save
			if ((e.metaKey || e.ctrlKey) && e.key === "s") {
				e.preventDefault();
				if (activeTab && activeTab.draft.trim() && activeTab.isDirty) {
					const timestamp = new Date().toLocaleTimeString([], { 
						hour: '2-digit', 
						minute: '2-digit' 
					});
					const updatedGraph = appendVersion(
						activeTab.versionGraph,
						activeTab.draft,
						`Manual save ${timestamp}`,
						activeTab.draft,
						null
					);
					tabManager.setVersionGraph(updatedGraph);
					tabManager.markDirty(false);
				}
			}
			// New tab
			if ((e.metaKey || e.ctrlKey) && e.key === "t") {
				e.preventDefault();
				if (tabManager.canCreateTab) {
					setShowPresetPicker(true);
					setPresetPickerForNewTab(true);
				}
			}
			// Close tab
			if ((e.metaKey || e.ctrlKey) && e.key === "w") {
				e.preventDefault();
				if (activeTab) {
					tabManager.closeTab(activeTab.id);
				}
			}
			// Switch tabs with Cmd/Ctrl + 1-8
			if ((e.metaKey || e.ctrlKey) && e.key >= "1" && e.key <= "8") {
				e.preventDefault();
				const index = parseInt(e.key, 10) - 1;
				const targetTab = tabManager.tabs[index];
				if (targetTab) {
					tabManager.switchTab(targetTab.id);
				}
			}
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [activeTab, tabManager]);

	// Panel resize handlers
	const grabOffsetRef = useRef<number>(0);
	const handleResizeStart = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		// Calculate and store the offset from the center divider to maintain cursor position
		if (panelsRef.current) {
			const rect = panelsRef.current.getBoundingClientRect();
			const currentDividerX = rect.left + (rect.width * leftPanelWidth) / 100;
			grabOffsetRef.current = e.clientX - currentDividerX;
		}
		setIsResizing(true);
	}, [leftPanelWidth]);

	// Track the latest panel width in a ref for saving on resize end
	const latestPanelWidthRef = useRef(leftPanelWidth);
	useEffect(() => {
		latestPanelWidthRef.current = leftPanelWidth;
	}, [leftPanelWidth]);

	useEffect(() => {
		if (!isResizing) return;

		const handleMouseMove = (e: MouseEvent) => {
			if (!panelsRef.current) return;
			const rect = panelsRef.current.getBoundingClientRect();
			// Subtract the grab offset so cursor stays where the user grabbed
			const adjustedX = e.clientX - grabOffsetRef.current;
			const newWidth = ((adjustedX - rect.left) / rect.width) * 100;
			
			// Minimum pixel width for both panes
			const MIN_PANE_WIDTH_PX = 430;
			// Calculate minimum percentage based on container width
			const minPercentage = (MIN_PANE_WIDTH_PX / rect.width) * 100;
			// Max percentage for left pane = 100% - minPercentage (to leave room for right pane)
			const maxPercentage = 100 - minPercentage;
			
			// Clamp between minPercentage and maxPercentage (ensuring both panes have at least 430px)
			setLeftPanelWidth(Math.min(maxPercentage, Math.max(minPercentage, newWidth)));
		};

		const handleMouseUp = () => {
			setIsResizing(false);
			// Persist the panel width to localStorage
			setJSON("shadowquill:panelWidth", latestPanelWidthRef.current);
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
		// Add cursor style to body during resize
		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
		};
	}, [isResizing]);

	const isGenerating = activeTab?.sending ?? false;

	return (
		<>
			<style jsx global>{`
				@media (max-width: 768px) {
					.simple-workbench__panels {
						flex-direction: column !important;
					}
					.prompt-input-pane,
					.prompt-output-pane {
						height: 50vh !important;
						border-right: none !important;
						border-bottom: 1px solid var(--color-outline) !important;
					}
					.prompt-output-pane {
						border-bottom: none !important;
					}
				}
				@media (max-width: 640px) {
					.hidden-mobile {
						display: none !important;
					}
				}
			`}</style>
			<div className="simple-workbench" style={{ position: 'relative' }}>
				{/* Generation Overlay - blocks all interactions except stop button in left panel */}
				{isGenerating && (
					<div 
						className="generation-overlay"
						style={{
							position: 'absolute',
							inset: 0,
							backgroundColor: 'rgba(0, 0, 0, 0.35)',
							zIndex: 100,
							pointerEvents: 'auto',
							cursor: 'not-allowed',
							transition: 'opacity 0.2s ease',
							backdropFilter: 'grayscale(0.5)',
						}}
						onClick={(e) => e.stopPropagation()}
					/>
				)}
				<header className="simple-workbench__header" style={{ 
					flexWrap: 'nowrap', 
					gap: '8px',
					padding: '8px 12px 2px 12px',
					alignItems: 'flex-end'
				}}>
					<div className="simple-workbench__header-left" style={{ 
						display: 'flex', 
						gap: '8px', 
						flexWrap: 'nowrap',
						flex: '1 1 auto',
						minWidth: 0,
						overflow: 'hidden'
					}}>
						<TabBar
							embedded
							tabs={tabManager.tabs.map((tab) => ({
								id: tab.id,
								label: tab.label,
								preset: tab.preset,
								isDirty: tab.isDirty,
							}))}
							activeTabId={tabManager.activeTabId}
							maxTabs={tabManager.maxTabs}
							onSwitchTab={tabManager.switchTab}
							onCloseTab={tabManager.closeTab}
							onReorderTabs={tabManager.reorderTabs}
							onNewTab={() => {
								setShowPresetPicker(true);
								setPresetPickerForNewTab(true);
							}}
						/>
					</div>
					<div className="simple-workbench__header-actions" style={{ 
						display: 'flex', 
						gap: '8px',
						flexShrink: 0,
						paddingBottom: '6px'
					}}>
					<button
						type="button"
						onClick={() => router.push("/studio")}
						className="md-btn md-btn--primary"
						title="Open Preset Studio"
						style={{ minWidth: 0 }}
					>
						<Icon name="brush" />
					</button>
					<button
						className="md-btn"
						onClick={() => {
							setSettingsOpen(true);
						}}
						title="Settings"
					>
						<Icon name="gear" />
					</button>
					</div>
				</header>

				

				<div 
					ref={panelsRef}
					className="simple-workbench__panels" 
					style={{
						display: 'flex',
						flexDirection: 'row',
						height: '100%',
						overflow: 'hidden',
						position: 'relative',
						marginRight: '8px',
					}}
				>
					{/* LEFT PANE: Input */}
					<section className="prompt-input-pane flex flex-col gap-4 p-4 md:p-6 bg-surface h-full overflow-hidden" style={{ 
						backgroundColor: 'var(--color-surface)',
						width: `${leftPanelWidth}%`,
						flexShrink: 0,
						flexGrow: 0,
						minWidth: 430,
						opacity: tabManager.tabs.length === 0 ? 0.4 : 1,
						pointerEvents: tabManager.tabs.length === 0 ? 'none' : 'auto',
						transition: isResizing ? 'none' : 'opacity 0.3s ease',
						filter: tabManager.tabs.length === 0 ? 'grayscale(0.3)' : 'none'
					}}>

						{/* Editor Area with Integrated Toolbar */}
						<div
							className="relative flex-1 min-h-0 flex flex-col group rounded-2xl"
							style={{
								// Solid background + solid border (no gradient)
								background: "var(--color-surface-variant)",
								border: "1px solid var(--color-outline)",
								boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
							}}
						>
							{/* Header bar inside the text area container */}
							<div 
								className="flex items-center justify-between gap-3 px-3 md:px-4 py-2.5 rounded-t-2xl shrink-0"
								style={{
									background: "linear-gradient(180deg, color-mix(in srgb, var(--color-surface), var(--color-surface-variant) 50%) 0%, var(--color-surface-variant) 100%)",
									borderBottom: "1px solid color-mix(in srgb, var(--color-outline), transparent 60%)",
								}}
							>
								{/* Left: Badge & Stats */}
								<div className="flex items-center gap-3 min-w-0">
									{/* Editor Badge - Changes based on refinement mode */}
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "6px",
											padding: "4px 10px",
											borderRadius: "20px",
											background: isRefinementMode 
												? "linear-gradient(135deg, var(--color-tertiary), color-mix(in srgb, var(--color-tertiary), var(--color-surface) 30%))"
												: "var(--color-surface)",
											border: isRefinementMode 
												? "none"
												: "1px solid var(--color-outline)",
											color: isRefinementMode 
												? "var(--color-on-tertiary)" 
												: "var(--color-on-surface-variant)",
											boxShadow: isRefinementMode 
												? "0 2px 6px color-mix(in srgb, var(--color-tertiary), transparent 60%)"
												: "none",
										}}
										title={isRefinementMode 
											? "Refinement mode: Your input will modify the previous output" 
											: "Initial mode: Your input will generate a new prompt"}
									>
										<Icon 
											name={isRefinementMode ? "refresh" : "edit"} 
											style={{ width: 11, height: 11, opacity: isRefinementMode ? 1 : 0.7 }} 
										/>
										<span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.02em" }}>
											{isRefinementMode ? "Refine" : "Input"}
										</span>
									</div>

									{/* Stats - Hidden on very small screens */}
									<div className="hidden sm:flex items-center gap-2 text-on-surface-variant/70">
										<div className="flex items-center gap-1.5" style={{ fontSize: "10px" }}>
											<Icon name="file-text" style={{ width: 10, height: 10, opacity: 0.6 }} />
											<span style={{ fontVariantNumeric: "tabular-nums" }}>{wordCount.toLocaleString()}</span>
											<span style={{ opacity: 0.5 }}>words</span>
										</div>
										<span style={{ opacity: 0.3 }}>•</span>
										<div className="flex items-center gap-1" style={{ fontSize: "10px" }}>
											<span style={{ fontVariantNumeric: "tabular-nums" }}>{charCount.toLocaleString()}</span>
											<span style={{ opacity: 0.5 }}>chars</span>
										</div>
									</div>
								</div>

								{/* Right: Actions */}
								<div className="flex items-center gap-1">
									{/* Copy Button */}
									<button
										type="button"
										onClick={() => copyMessage("prompt-draft", activeTab?.draft ?? "")}
										disabled={!activeTab}
										className="flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
										title="Copy prompt"
										aria-label="Copy prompt"
										style={{
											width: 28,
											height: 28,
											borderRadius: "8px",
											background: copiedMessageId === "prompt-draft" 
												? "var(--color-save)" 
												: "var(--color-surface)",
											border: copiedMessageId === "prompt-draft" 
												? "1px solid var(--color-save)"
												: "1px solid var(--color-outline)",
											color: copiedMessageId === "prompt-draft" 
												? "var(--color-on-save)" 
												: "var(--color-on-surface-variant)",
										}}
									>
										<Icon
											name={copiedMessageId === "prompt-draft" ? "check" : "copy"}
											style={{ width: 13, height: 13 }}
										/>
									</button>
								</div>
							</div>

							{/* Refinement Context Panel - Version History Timeline */}
							{isRefinementMode && outputToRefine && (
								<div className={`refine-panel ${showRefinementContext ? "refine-panel--expanded" : ""}`}>
									<button
										type="button"
										onClick={() => setShowRefinementContext(!showRefinementContext)}
										className="refine-panel__header"
									>
										<div className="refine-panel__left">
											<div className="refine-panel__badge">
												<Icon name="refresh" className="refine-panel__badge-icon" />
												<span className="refine-panel__badge-text">
													v{activeVersionNumber} {activeVersionIsRefinement ? "Refinement" : "Base"}
												</span>
											</div>
											<span className="refine-count" title={`${versions.length} versions`}>
												<Icon name="layout" style={{ width: 11, height: 11, opacity: 0.85 }} />
												{versions.length}
											</span>
										</div>
										{!showRefinementContext && inputThatGeneratedOutput && (
											<div className="refine-panel__preview">
												<span className="refine-panel__preview-label">Previous Input:</span>
												<span className="refine-panel__preview-text">
													{inputThatGeneratedOutput.slice(0, 25)}{inputThatGeneratedOutput.length > 25 ? "..." : ""}
												</span>
											</div>
										)}
										<div className="refine-panel__toggle">
											<span>{showRefinementContext ? "Hide" : "History"}</span>
											<Icon name="chevron-down" className="refine-panel__toggle-icon" />
										</div>
									</button>

									{showRefinementContext && (
										<div className="refine-timeline">
											{versions.map((version, index) => {
												const versionNum = index + 1;
												const isCurrentVersion = version.id === activeVersionId;
												const isRefinement = version.metadata?.isRefinement === true;

												const handleJumpToVersion = () => {
													if (isCurrentVersion) return;
													// Keep draft empty when jumping to a version that has output (refinement mode)
													if (version.outputMessageId) {
														tabManager.updateDraft("");
													} else {
														tabManager.updateDraft(version.originalInput || version.content);
													}
													// Update the version graph to point to this version
													const updatedGraph = {
														...activeTab!.versionGraph,
														activeId: version.id,
													};
													tabManager.setVersionGraph(updatedGraph);
													tabManager.markDirty(false);
												};

											const versionInput = version.originalInput || "";
											const copyId = `refine-v-${version.id}`;

											return (
												<div
													key={version.id}
													className={`refine-timeline__item ${isCurrentVersion ? "refine-timeline__item--current" : ""}`}
												>
													<button
														type="button"
														onClick={handleJumpToVersion}
														disabled={isCurrentVersion}
														className="refine-timeline__item-btn"
														title={isCurrentVersion ? "Current version" : `Jump to v${versionNum}`}
													>
														<div className={`refine-timeline__node ${isRefinement ? "refine-timeline__node--refinement" : "refine-timeline__node--base"}`}>
															{versionNum}
														</div>
													</button>
													<div className="refine-timeline__content">
														<div className="refine-timeline__header">
															<div className="refine-timeline__title">
																<span className={`refine-timeline__type ${isRefinement ? "refine-timeline__type--refinement" : "refine-timeline__type--base"}`}>
																	{isRefinement ? "Refinement" : "Base"}
																</span>
															</div>
															<div className="refine-timeline__actions">
																{isCurrentVersion && (
																	<span className="refine-timeline__current-badge">Current</span>
																)}
																<button
																	type="button"
																	onClick={(e) => {
																		e.stopPropagation();
																		if (versionInput) {
																			copyMessage(copyId, versionInput);
																		}
																	}}
																	disabled={!versionInput}
																	className="refine-timeline__copy-btn"
																	title="Copy this input"
																	aria-label="Copy input"
																>
																	<Icon
																		name={copiedMessageId === copyId ? "check" : "copy"}
																		style={{ width: 10, height: 10 }}
																	/>
																</button>
															</div>
														</div>
														<button
															type="button"
															onClick={handleJumpToVersion}
															disabled={isCurrentVersion}
															className="refine-timeline__body"
															title={isCurrentVersion ? "Current version" : `Jump to v${versionNum}`}
														>
															{versionInput || <em style={{ opacity: 0.5 }}>Empty</em>}
														</button>
													</div>
												</div>
											);
											})}
										</div>
									)}
								</div>
							)}

							<div 
								ref={textareaContainerRef} 
								className="relative flex-1 min-h-0 w-full"
								style={{
									// When generating, elevate this container above the overlay so the stop button is clickable
									zIndex: isGenerating ? 150 : 'auto',
								}}
							>
								<textarea
									className="absolute inset-0 w-full h-full p-3 md:p-6 pt-3 md:pt-4 pb-24 md:pb-24 rounded-b-2xl resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-outline)] focus:border-[var(--color-outline)] transition-all duration-200 ease-out font-mono text-[10px] md:text-[11px] leading-[20px] md:leading-[24px] text-on-surface placeholder:text-on-surface-variant/50 shadow-none"
									style={{
										// Lighter background that respects theme - lighter in light mode, slightly lighter in dark mode
										backgroundColor: "color-mix(in srgb, var(--color-surface-variant), var(--color-surface) 55%)",
										// Subtle ruled-paper lines to signal this is a text input area
										backgroundImage:
											currentTheme === "light"
												? "none"
												: "repeating-linear-gradient(0deg, transparent, transparent 23px, color-mix(in srgb, var(--color-outline), transparent 80%) 23px, color-mix(in srgb, var(--color-outline), transparent 80%) 24px)",
										backgroundSize:
											currentTheme === "light" ? undefined : "100% 24px",
										backgroundPosition:
											currentTheme === "light" ? undefined : "0 40px", // align after header (pt-4 ≈ 16px + header height)
										caretColor: "var(--color-primary)",
										boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--color-outline), white 18%)",
										// Disable pointer events when generating
										pointerEvents: isGenerating ? 'none' : 'auto',
									}}
									value={activeTab?.draft ?? ""}
									onChange={(e) => tabManager.updateDraft(e.target.value)}
									placeholder={
										!activeTab 
											? "Create or open a tab to get started..." 
											: isRefinementMode 
												? 'Enter refinement (e.g., "more minimal", "add details about X", "change aesthetic to minimalist")...' 
												: "Describe your prompt & intent..."
									}
									disabled={!activeTab || isGenerating}
								/>

							{/* Model Selector - Bottom Left */}
							<div 
								className="absolute z-10"
								style={{
									left: '20px',
									bottom: '20px',
									// Disable during generation
									pointerEvents: isGenerating ? 'none' : 'auto',
									opacity: isGenerating ? 0.5 : 1,
								}}
							>
								{/* Vertical Slider Model Selector */}
								<div
									className="relative"
									style={{
										width: "min(80px, 16vw)",
										height: "min(80px, 16vw)",
										minWidth: "54px",
										minHeight: "54px",
									}}
								>
									{/* Slider container */}
									<div
										className="absolute inset-0 rounded-[18px] border overflow-hidden"
										style={{
											borderColor: "var(--color-outline)",
											background: "var(--color-surface)",
											padding: "8px",
										}}
									>
										{/* Header */}
										<div 
											className="text-center font-bold text-[10px] tracking-wider uppercase mb-1"
											style={{
												color: "var(--color-on-surface)",
												opacity: 0.7,
												lineHeight: 1,
											}}
										>
											GEMMA 3
										</div>
										{/* Stops */}
										<div className="flex flex-col justify-between items-stretch h-full relative z-[1]" style={{ height: 'calc(100% - 16px)' }}>
											{[
												{ label: "4B", id: "gemma3:4b" },
												{ label: "12B", id: "gemma3:12b" },
												{ label: "27B", id: "gemma3:27b" },
											].map((model, idx) => {
												const isInstalled = availableModels.some((m) => m.name === model.id);
												const isActive = currentModelId === model.id;
												return (
													<button
														key={model.id}
														type="button"
														disabled={!isInstalled}
														onClick={() => {
															if (!isInstalled) return;
															writeLocalModelConfigClient({
																provider: "ollama",
																baseUrl: "http://localhost:11434",
																model: model.id,
															} as any);
															setCurrentModelId(model.id);
															setModelLabel(`Gemma 3 ${model.label}`);
															try {
																window.dispatchEvent(
																	new CustomEvent("sq-model-changed", {
																		detail: { modelId: model.id },
																	}) as any,
																);
															} catch {}
														}}
														className={`w-full h-[22px] flex items-center justify-center text-[13px] font-bold rounded-[12px] transition-colors ${
															!isInstalled ? "opacity-40 cursor-not-allowed" : ""
														}`}
														title={
															isInstalled
																? `Switch to Gemma 3 ${model.label}`
																: `Gemma 3 ${model.label} is not installed`
														}
														aria-pressed={isActive}
														style={{
															lineHeight: 1,
															color: "var(--color-on-surface)",
															background: isActive
																? "color-mix(in srgb, var(--color-primary), var(--color-surface) 72%)"
																: "transparent",
															border: isActive
																? "1px solid color-mix(in srgb, var(--color-primary), var(--color-outline) 55%)"
																: "1px solid transparent",
														}}
													>
														{model.label}
													</button>
												);
											})}
										</div>
									</div>
								</div>
							</div>

							{/* Run Button - Bottom Right */}
							<button
								type="button"
								onClick={() => (activeTab?.sending ? stopGenerating() : void send())}
								disabled={!activeTab || (!activeTab.sending && !activeTab.draft.trim())}
								className={`group absolute rounded-full transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none overflow-hidden flex items-center justify-center ${
									activeTab?.sending
										? "text-on-attention"
										: "text-on-primary"
								}`}
								style={{ 
									width: 'min(48px, 10vw)', 
									height: 'min(48px, 10vw)',
									minWidth: '36px',
									minHeight: '36px',
									right: '20px',
									bottom: '20px',
									border: '1px solid var(--color-outline)',
									background: activeTab?.sending ? "var(--color-attention)" : "var(--color-primary)",
									// High z-index to stay above the generation overlay
									zIndex: activeTab?.sending ? 150 : 10,
								}}
								title={activeTab?.sending ? "Stop Generation" : "Run Prompt"}
							>
								{/* Subtle shimmer effect */}
								<div className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out pointer-events-none rounded-full" />

							{activeTab?.sending ? (
								<Icon 
									name="stop" 
									className="relative z-10" 
									style={{ width: '22px', height: '22px', fontSize: '22px' }}
								/>
							) : (
								<Icon
									name="chevron-right"
									className="relative z-10 transition-transform group-hover:translate-x-0.5"
									style={{ width: '22px', height: '22px', fontSize: '22px' }}
								/>
							)}
							</button>
							</div>
						</div>

						{/* Preset Info Row - Moved Under Editor Area */}
						{activeTab?.preset && (
							<div 
								className="flex items-center gap-3 p-2.5 md:p-3 rounded-xl transition-all"
								style={{
									background: "linear-gradient(135deg, color-mix(in srgb, var(--color-primary), var(--color-surface-variant) 85%) 0%, var(--color-surface-variant) 100%)",
									border: "1px solid color-mix(in srgb, var(--color-primary), var(--color-outline) 70%)",
									boxShadow: "0 2px 8px color-mix(in srgb, var(--color-primary), transparent 85%)",
								}}
							>
								{/* Icon */}
								<div 
									className="flex shrink-0 items-center justify-center"
									style={{
										width: 36,
										height: 36,
										borderRadius: 10,
										background: "linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary), var(--color-surface) 30%))",
										color: "var(--color-on-primary)",
										boxShadow: "0 2px 6px color-mix(in srgb, var(--color-primary), transparent 50%)",
									}}
								>
									<Icon
										name={
											activeTab.preset.taskType === "coding"
												? "git-compare"
												: activeTab.preset.taskType === "image"
													? "palette"
													: activeTab.preset.taskType === "video"
														? "eye"
														: activeTab.preset.taskType === "research"
															? "search"
															: activeTab.preset.taskType === "writing"
																? "edit"
																: activeTab.preset.taskType === "marketing"
																	? "thumbsUp"
																	: "folder-open"
										}
										style={{ width: 16, height: 16 }}
									/>
								</div>

								{/* Title & Type */}
								<div className="flex flex-col min-w-0 gap-0.5 flex-1">
									<button
										type="button"
										onClick={() => setShowPresetInfo(true)}
										className="flex items-center gap-1.5 group/btn text-left"
									>
										<span
											className="text-[13px] font-bold text-on-surface truncate leading-tight group-hover/btn:text-primary transition-colors"
											title="Click for full preset details"
										>
											{activeTab.preset.name}
										</span>
										<Icon
											name="info"
											className="text-on-surface-variant/40 group-hover/btn:text-primary transition-colors"
											style={{ width: 10, height: 10 }}
										/>
									</button>
									
									{/* Tags Row */}
									<div className="flex items-center gap-1.5 flex-wrap">
										{/* Task Type Badge */}
										<span 
											style={{ 
												fontSize: 9, 
												fontWeight: 700, 
												textTransform: "uppercase", 
												letterSpacing: "0.05em",
												color: "var(--color-primary)",
												opacity: 0.9,
											}}
										>
											{activeTab.preset.taskType}
										</span>
										
										{/* Separator */}
										{(activeTab.preset.options?.tone || activeTab.preset.options?.format || activeTab.preset.options?.detail || typeof activeTab.preset.options?.temperature === "number") && (
											<span style={{ opacity: 0.3, fontSize: 9 }}>•</span>
										)}
										
										{/* Metadata Tags - Inline */}
										{activeTab.preset.options?.tone && (
											<span style={{ fontSize: 9, color: "var(--color-on-surface-variant)", opacity: 0.7, textTransform: "capitalize" }}>
												{activeTab.preset.options.tone}
											</span>
										)}
										{activeTab.preset.options?.format && (
											<span style={{ fontSize: 9, color: "var(--color-on-surface-variant)", opacity: 0.7 }}>
												{activeTab.preset.options.format === "plain" ? "Plain" : activeTab.preset.options.format === "markdown" ? "MD" : activeTab.preset.options.format.toUpperCase()}
											</span>
										)}
										{typeof activeTab.preset.options?.temperature === "number" && (
											<span style={{ fontSize: 9, color: "var(--color-on-surface-variant)", opacity: 0.7, fontVariantNumeric: "tabular-nums" }}>
												temp {activeTab.preset.options.temperature.toFixed(1)}
											</span>
										)}
									</div>
								</div>

								{/* Edit Button */}
								<button
									type="button"
									onClick={() => router.push("/studio")}
									className="flex items-center justify-center shrink-0 transition-all duration-200 hover:scale-105 active:scale-95"
									title="Edit preset in Studio"
									aria-label="Edit preset in Studio"
									style={{
										width: 32,
										height: 32,
										borderRadius: 8,
										background: "var(--color-surface)",
										border: "1px solid var(--color-outline)",
										color: "var(--color-on-surface-variant)",
									}}
								>
									<Icon name="brush" style={{ width: 14, height: 14 }} />
								</button>
							</div>
						)}
					</section>

					{/* CENTER: Resize Handle + Version Navigator */}
					<div 
						className={`hidden md:flex flex-col items-center justify-center relative panel-resize-container ${isResizing ? 'panel-resize-container--active' : ''}`}
						onMouseDown={handleResizeStart}
						title="Drag to resize panels"
						style={{
							width: '8px',
							flexShrink: 0,
						}}
					>
						{/* Single centered resize line - top segment */}
						<div className="panel-resize-line panel-resize-line--top" />
						{/* Single centered resize line - bottom segment */}
						<div className="panel-resize-line panel-resize-line--bottom" />
						
						{/* Version Navigator - sits in the cutout */}
						{activeTab && (
							<VersionNavigator
								versionGraph={activeTab.versionGraph}
								onPrev={goToPreviousVersion}
								onNext={goToNextVersion}
								onOpenHistory={() => setShowVersionHistory(true)}
								isGenerating={activeTab.sending}
								justCreatedVersion={justCreatedVersion}
							/>
						)}
					</div>

					{/* RIGHT PANE: Output */}
					<section className="prompt-output-pane flex flex-col gap-4 p-4 md:p-6 h-full overflow-hidden relative" style={{
						flex: 1,
						minWidth: 430,
						opacity: tabManager.tabs.length === 0 ? 0.4 : 1,
						pointerEvents: tabManager.tabs.length === 0 ? 'none' : (isGenerating ? 'none' : 'auto'),
						transition: isResizing ? 'none' : 'opacity 0.3s ease',
						filter: tabManager.tabs.length === 0 ? 'grayscale(0.3)' : 'none',
						// Elevate above overlay when generating so the animation is visible
						zIndex: isGenerating ? 150 : 'auto',
					}}>
						{/* Content Body with Integrated Toolbar Style */}
						<div 
							className={`relative flex-1 min-h-0 flex flex-col group rounded-2xl ${activeTab?.sending ? 'output-generating' : ''}`}
							style={{
								background: "var(--color-surface-variant)",
								border: "1px solid var(--color-outline)",
								boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
							}}
						>
							{/* Toolbar Header inside container */}
							<div 
								className="flex items-center justify-between gap-3 px-3 md:px-4 py-2.5 rounded-t-2xl shrink-0"
								style={{
									background: "linear-gradient(180deg, color-mix(in srgb, var(--color-surface), var(--color-surface-variant) 50%) 0%, var(--color-surface-variant) 100%)",
									borderBottom: "1px solid color-mix(in srgb, var(--color-outline), transparent 60%)",
								}}
							>
								{/* Left: Title & Stats */}
								<div className="flex items-center gap-3 min-w-0">
									{/* Version Badge */}
									<button
										type="button"
										className={`flex items-center gap-1.5 transition-all duration-200 ${
											versions.length > 0
												? "opacity-100 cursor-pointer hover:scale-105"
												: "opacity-40 cursor-default"
										}`}
										onClick={() => {
											if (versions.length > 0) setShowVersionHistory(true);
										}}
										disabled={versions.length === 0}
										title={versions.length > 0 ? "View version history" : "No versions"}
										style={{
											padding: "4px 10px",
											borderRadius: "20px",
											background: versions.length > 0 
												? "linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary), var(--color-surface) 30%))"
												: "var(--color-surface)",
											color: versions.length > 0 ? "var(--color-on-primary)" : "var(--color-on-surface-variant)",
											border: versions.length > 0 ? "none" : "1px solid var(--color-outline)",
											boxShadow: versions.length > 0 ? "0 2px 8px color-mix(in srgb, var(--color-primary), transparent 60%)" : "none",
										}}
									>
										<Icon name="git-compare" style={{ width: 11, height: 11 }} />
										<span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.02em" }}>
											v{versions.length > 0 && activeTab ? versions.findIndex(v => v.id === activeTab.versionGraph.activeId) + 1 : 0}
										</span>
									</button>

									{/* Stats - Hidden on very small screens */}
									<div className="hidden sm:flex items-center gap-2 text-on-surface-variant/70">
										<div className="flex items-center gap-1.5" style={{ fontSize: "10px" }}>
											<Icon name="file-text" style={{ width: 10, height: 10, opacity: 0.6 }} />
											<span style={{ fontVariantNumeric: "tabular-nums" }}>{outputWordCount.toLocaleString()}</span>
											<span style={{ opacity: 0.5 }}>words</span>
										</div>
										<span style={{ opacity: 0.3 }}>•</span>
										<div className="flex items-center gap-1" style={{ fontSize: "10px" }}>
											<span style={{ fontVariantNumeric: "tabular-nums" }}>{outputCharCount.toLocaleString()}</span>
											<span style={{ opacity: 0.5 }}>chars</span>
										</div>
									</div>
								</div>
								
								{/* Right: Actions */}
								<div className="flex items-center gap-1">
									{/* Copy Button */}
									<button
										type="button"
										onClick={() => {
											if (lastAssistantMessage?.content) {
												copyMessage(lastAssistantMessage.id, lastAssistantMessage.content);
											}
										}}
										disabled={!lastAssistantMessage}
										className="flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
										title="Copy response"
										aria-label="Copy response"
										style={{
											width: 28,
											height: 28,
											borderRadius: "8px",
											background: copiedMessageId === lastAssistantMessage?.id 
												? "var(--color-save)" 
												: "var(--color-surface)",
											border: copiedMessageId === lastAssistantMessage?.id 
												? "1px solid var(--color-save)"
												: "1px solid var(--color-outline)",
											color: copiedMessageId === lastAssistantMessage?.id 
												? "var(--color-on-save)" 
												: "var(--color-on-surface-variant)",
										}}
									>
										<Icon
											name={copiedMessageId === lastAssistantMessage?.id ? "check" : "copy"}
											style={{ width: 13, height: 13 }}
										/>
									</button>
								</div>
							</div>

							{/* Scrollable Content Area */}
							<div
								ref={scrollContainerRef}
								className="relative flex-1 min-h-0 overflow-y-auto p-3 md:p-6 custom-scrollbar"
							>
								{!hasMessages ? (
									<div className="flex flex-col items-center justify-center h-full text-center gap-4 opacity-60">
										<div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center border border-[var(--color-outline)]">
											<Logo className="w-8 h-8 opacity-50 grayscale" />
										</div>
										<div className="max-w-[240px]">
											<p className="text-sm font-medium text-on-surface">
												Ready to Generate
											</p>
											<p className="text-xs text-on-surface-variant mt-1">
												Run your prompt to see the results appear here.
											</p>
										</div>
									</div>
								) : (() => {
									// Get the active version's output message ID
									const activeOutputId = activeTab ? getOutputMessageId(activeTab.versionGraph, activeTab.versionGraph.activeId) : null;
									const activeOutput = activeOutputId 
										? activeMessages.find(m => m.id === activeOutputId && m.role === "assistant")
										: null;
									
									return (
										<div key={outputAnimateKey} className="flex flex-col gap-6 output-animate-in">
											{activeTab?.sending ? (
												<div 
													className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3 text-on-surface-variant"
													style={{
														// Ensure the crafting animation is fully visible and not grayed out
														filter: 'none',
														opacity: 1,
													}}
												>
													<FeatherLoader />
												</div>
											) : activeOutput ? (
												<div className="group relative flex flex-col gap-3">
													{/* Message Content */}
													<div className="max-w-none text-on-surface leading-relaxed text-[11px] font-mono">
														<MessageRenderer
															content={activeOutput.content}
															messageId={activeOutput.id}
															copiedMessageId={copiedMessageId}
															onCopy={copyMessage}
														/>
													</div>
												</div>
											) : (
												<div className="flex flex-col items-center justify-center py-12 gap-3 text-center opacity-60">
													<div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center border border-[var(--color-outline)]">
														<Icon name="file-text" className="w-6 h-6 opacity-50" />
													</div>
													<div className="max-w-[280px]">
														<p className="text-sm font-medium text-on-surface">
															No Output for This Version
														</p>
														<p className="text-xs text-on-surface-variant mt-1">
															This version is a manual save. Run the prompt to generate output.
														</p>
													</div>
												</div>
											)}
											<div ref={endRef} />
										</div>
									);
								})()}
							</div>
						</div>

						{/* Error Toast/Banner */}
						{activeTab?.error && (
							<div className="absolute bottom-6 left-6 right-6 p-4 rounded-lg bg-attention/10 border border-attention/10 text-attention flex items-center gap-3 shadow-lg animate-in slide-in-from-bottom-2">
								<Icon name="warning" className="w-5 h-5 shrink-0" />
								<p className="text-sm font-medium">{activeTab.error}</p>
								<button
									className="ml-auto p-1 hover:bg-attention/10 rounded"
									onClick={() => tabManager.setError(null)}
								>
									<Icon name="close" className="w-4 h-4" />
								</button>
							</div>
						)}
					</section>
				</div>
			</div>

			{/* Settings Dialog */}
			{settingsOpen && (
				<SettingsDialog
					open={settingsOpen}
					onClose={() => setSettingsOpen(false)}
					initialTab={settingsInitialTab}
				/>
			)}

			{/* Version History Modal */}
			{activeTab && (
				<VersionHistoryModal
					open={showVersionHistory}
					onClose={() => setShowVersionHistory(false)}
					versions={versions}
					activeVersionId={activeTab.versionGraph.activeId}
					onJumpToVersion={(versionId) => {
						// Get the version node
						const versionNode = activeTab.versionGraph.nodes[versionId];
						// Keep draft empty when jumping to a version that has output (refinement mode)
						// The original input is shown in the context preview, not the editable field
						if (versionNode && !versionNode.outputMessageId) {
							tabManager.updateDraft(versionNode.originalInput || versionNode.content);
						} else {
							tabManager.updateDraft("");
						}
						// Update the version graph to point to this version
						const updatedGraph = {
							...activeTab.versionGraph,
							activeId: versionId,
						};
						tabManager.setVersionGraph(updatedGraph);
						tabManager.markDirty(false);
					}}
					messages={activeMessages}
				/>
			)}

			{/* Preset Info Dialog */}
			{activeTab?.preset && (
				<PresetInfoDialog
					open={showPresetInfo}
					onClose={() => setShowPresetInfo(false)}
					preset={activeTab.preset}
				/>
			)}

			{/* Preset Picker Modal */}
			<PresetPickerModal
				open={showPresetPicker}
				onClose={() => {
					setShowPresetPicker(false);
					setPresetPickerForNewTab(false);
				}}
				onSelectPreset={(preset) => {
					if (presetPickerForNewTab) {
						// Create new tab with selected preset
						applyPreset(preset);
						tabManager.createTab(preset);
					}
					setShowPresetPicker(false);
					setPresetPickerForNewTab(false);
				}}
				onSelectProject={(projectId) => {
					loadProject(projectId);
					setShowPresetPicker(false);
					setPresetPickerForNewTab(false);
				}}
				onDeleteProject={deleteProject}
				onDeleteAllProjects={deleteAllProjects}
				presets={presets}
				savedProjects={recentProjects}
				title={presetPickerForNewTab ? "Open Workbench Tab" : "Select a Preset"}
			/>
		</>
	);
}
