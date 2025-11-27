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
import { buildUnifiedPrompt } from "@/lib/prompt-builder-client";
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
import { SavedSessionsModal } from "./workbench/SavedSessionsModal";
import type { MessageItem, PromptPresetSummary } from "./workbench/types";
import { useTabManager } from "./workbench/useTabManager";
import { appendVersion, createVersionGraph, versionList, getOutputMessageId, migrateVersionGraph } from "./workbench/version-graph";
import { VersionHistoryModal } from "./workbench/VersionHistoryModal";
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
	const { showInfo } = useDialog();
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
	const [showAllProjectsOpen, setShowAllProjectsOpen] = useState(false);
	const [showVersionHistory, setShowVersionHistory] = useState(false);
	const [showPresetInfo, setShowPresetInfo] = useState(false);
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

			const built = await buildUnifiedPrompt({
				input: text,
				taskType,
				options,
			});
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
			const updatedGraph = appendVersion(
				currentGraph,
				text,
				`Generated ${timestamp}`,
				originalInput,
				finalAssistantId,
				{ taskType, options }
			);
			tabManager.setVersionGraph(updatedGraph);
			tabManager.markDirty(false);
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
					tabManager.setError("Maximum number of tabs reached. Close a tab to open this project.");
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
				
				// If no preset found, ask user to select one
				if (!projectPreset) {
					// For now, use first preset or show picker
					if (presets.length > 0) {
						projectPreset = presets[0] ?? null;
					}
				}
				
				if (!projectPreset) {
					tabManager.setError("No preset available to open this project");
					return;
				}
				
				// Apply preset configuration
				applyPreset(projectPreset, { trackRecent: false });
				
				// Create new tab with project data
				tabManager.createTab(projectPreset);
				
				// Wait for tab to be created and active
				setTimeout(() => {
					tabManager.setMessages(loaded);
					
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
					tabManager.setVersionGraph(graph);
					tabManager.attachProject(id);
					
					// Update tab label with project title
					if (tabManager.activeTab && data.title) {
						tabManager.updateTabLabel(tabManager.activeTab.id, data.title);
					}
				}, 50);
			} catch {
				tabManager.setError("Failed to load project");
			}
		},
		[tabManager, presets, applyPreset],
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
			<div className="simple-workbench">
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
						type="button"
						onClick={() => setShowAllProjectsOpen(true)}
						className="md-btn"
						title="View saved projects"
					>
						<Icon name="folder-open" />
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

				

				<div className="simple-workbench__panels" style={{
					display: 'flex',
					flexDirection: 'row',
					height: '100%',
					overflow: 'hidden',
					position: 'relative'
				}}>
					{/* LEFT PANE: Input */}
					<section className="prompt-input-pane flex flex-col gap-4 p-4 md:p-6 bg-surface border-r border-outline h-full overflow-hidden" style={{ 
						backgroundColor: 'var(--color-surface)',
						flex: '1 1 50%',
						minWidth: 0,
						opacity: tabManager.tabs.length === 0 ? 0.4 : 1,
						pointerEvents: tabManager.tabs.length === 0 ? 'none' : 'auto',
						transition: 'opacity 0.3s ease',
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
							<div className="flex items-center justify-between gap-2 px-2 md:px-3 py-2 rounded-t-2xl">
								{/* Left: label + live metrics */}
								<div className="flex items-center gap-1 md:gap-2 text-on-surface-variant min-w-0">
									<span className="text-[10px] md:text-[12px] font-bold tracking-wider uppercase truncate">
										Prompt Editor
									</span>
									<span className="hidden sm:inline w-1.5 h-1.5 rounded-full bg-outline/60" />
									<span className="text-[9px] md:text-[10px] whitespace-nowrap">
										{wordCount} {wordCount === 1 ? "word" : "words"} · {charCount.toLocaleString()} {charCount === 1 ? "char" : "chars"}
									</span>
								</div>
								{/* Right: controls */}
								<div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
								<button
									type="button"
									onClick={() => copyMessage("prompt-draft", activeTab?.draft ?? "")}
									className="w-6 h-6 md:w-8 md:h-8 p-0 hover:bg-surface rounded-md transition-all duration-150 text-on-surface-variant hover:text-on-surface"
									title="Copy prompt"
									aria-label="Copy prompt"
									disabled={!activeTab}
								>
									<Icon name={copiedMessageId === "prompt-draft" ? "check" : "copy"} className="w-3 h-3 md:w-3.5 md:h-3.5" />
								</button>
								</div>
							</div>

							<div ref={textareaContainerRef} className="relative flex-1 min-h-0 w-full">
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
									}}
									value={activeTab?.draft ?? ""}
									onChange={(e) => tabManager.updateDraft(e.target.value)}
									placeholder={activeTab ? "Describe your prompt & intent..." : "Create or open a tab to get started..."}
									disabled={!activeTab}
								/>

							{/* Model Selector - Bottom Left */}
							<div 
								className="absolute z-10"
								style={{
									left: '20px',
									bottom: '20px',
								}}
							>
								{/* Vertical Slider Model Selector */}
								<div
									className="relative"
									style={{
										width: "min(64px, 12.75vw)",
										height: "min(64px, 12.75vw)",
										minWidth: "43px",
										minHeight: "43px",
									}}
								>
									{/* Slider container */}
									<div
										className="absolute inset-0 rounded-[14px] border overflow-hidden"
										style={{
											borderColor: "var(--color-outline)",
											background: "var(--color-surface)",
											padding: "6px",
										}}
									>
										{/* Stops */}
										<div className="flex flex-col justify-between items-stretch h-full relative z-[1]">
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
														className={`w-full h-[18px] flex items-center justify-center text-[11px] font-bold rounded-[10px] transition-colors ${
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
								disabled={!activeTab || !activeTab.draft.trim()}
								className={`group absolute z-10 rounded-full transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none overflow-hidden flex items-center justify-center ${
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
							<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 p-2 md:p-2.5 rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-variant)] shadow-sm transition-all hover:shadow-md">
								{/* Header: Icon + Title + Type */}
								<div className="flex items-center gap-2.5 min-w-0">
									<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-sm ring-1 ring-inset ring-primary/10">
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
											className="h-3.5 w-3.5"
										/>
									</div>
									<div className="flex flex-col min-w-0 gap-0">
										<button
											type="button"
											onClick={() => setShowPresetInfo(true)}
											className="flex items-center gap-1.5 group/btn text-left"
										>
											<span
												className="text-xs font-bold text-on-surface truncate leading-tight group-hover/btn:text-primary transition-colors"
												title="Click for full preset details"
											>
												{activeTab.preset.name}
											</span>
											<Icon
												name="info"
												className="w-2.5 h-2.5 text-secondary/50 group-hover/btn:text-primary transition-colors"
											/>
										</button>
										<span className="text-[9px] font-bold text-primary/80 uppercase tracking-wider leading-none mt-0.5">
											{activeTab.preset.taskType}
										</span>
									</div>
								</div>

								{/* Metadata Tags */}
								{(activeTab.preset.options?.tone ||
									activeTab.preset.options?.format ||
									activeTab.preset.options?.detail ||
									typeof activeTab.preset.options?.temperature === "number") && (
									<div className="flex flex-wrap justify-end gap-1.5">
										{activeTab.preset.options?.tone && (
											<div className="flex items-center px-1.5 py-0.5 rounded-md bg-surface/50 border border-[var(--color-outline)]/50">
												<span className="text-[9px] font-medium text-secondary capitalize leading-none">
													{activeTab.preset.options.tone}
												</span>
											</div>
										)}
										{activeTab.preset.options?.format && (
											<div className="flex items-center px-1.5 py-0.5 rounded-md bg-surface/50 border border-[var(--color-outline)]/50">
												<span className="text-[9px] font-medium text-secondary leading-none">
													{activeTab.preset.options.format === "plain"
														? "Plain"
														: activeTab.preset.options.format === "markdown"
															? "Markdown"
															: activeTab.preset.options.format.toUpperCase()}
												</span>
											</div>
										)}
										{activeTab.preset.options?.detail && (
											<div className="flex items-center px-1.5 py-0.5 rounded-md bg-surface/50 border border-[var(--color-outline)]/50">
												<span className="text-[9px] font-medium text-secondary capitalize leading-none">
													{activeTab.preset.options.detail}
												</span>
											</div>
										)}
										{typeof activeTab.preset.options?.temperature === "number" && (
											<div className="flex items-center px-1.5 py-0.5 rounded-md bg-surface/50 border border-[var(--color-outline)]/50">
												<span className="text-[9px] font-medium text-secondary capitalize leading-none">
													{activeTab.preset.options.temperature.toFixed(1)}
												</span>
											</div>
										)}
									</div>
								)}
							</div>
						)}
					</section>

					{/* RIGHT PANE: Output */}
					<section className="prompt-output-pane flex flex-col gap-4 p-4 md:p-6 h-full overflow-hidden relative" style={{
						flex: '1 1 50%',
						minWidth: 0,
						opacity: tabManager.tabs.length === 0 ? 0.4 : 1,
						pointerEvents: tabManager.tabs.length === 0 ? 'none' : 'auto',
						transition: 'opacity 0.3s ease',
						filter: tabManager.tabs.length === 0 ? 'grayscale(0.3)' : 'none'
					}}>
						{/* Content Body with Integrated Toolbar Style */}
						<div 
							className="relative flex-1 min-h-0 flex flex-col group rounded-2xl"
							style={{
								background: "var(--color-surface-variant)",
								border: "1px solid var(--color-outline)",
								boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
							}}
						>
							{/* Toolbar Header inside container */}
							<div className="flex items-center justify-between gap-2 px-2 md:px-3 py-2 rounded-t-2xl shrink-0 border-b border-[var(--color-outline)]/50 flex-wrap">
								<div className="flex items-center gap-1 md:gap-2 text-on-surface-variant min-w-0">
									<span className="text-[10px] md:text-[12px] font-bold tracking-wider uppercase truncate">
										Response Output
									</span>
									<span className="hidden sm:inline w-1.5 h-1.5 rounded-full bg-outline/60" />
									<span className="text-[9px] md:text-[10px] whitespace-nowrap">
										{outputWordCount} {outputWordCount === 1 ? "word" : "words"} · {outputCharCount.toLocaleString()} {outputCharCount === 1 ? "char" : "chars"}
									</span>
								</div>
								
								{/* Actions */}
								<div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
									<button
										type="button"
										className={`flex items-center gap-1.5 text-[10px] font-medium transition-colors bg-[var(--color-surface)] border border-[var(--color-outline)] rounded-md px-2 py-1 h-7 ${
											versions.length > 0
												? "text-on-surface-variant hover:text-primary"
												: "text-on-surface-variant/40 cursor-default"
										}`}
										onClick={() => {
											if (versions.length > 0) setShowVersionHistory(true);
										}}
										disabled={versions.length === 0}
										title={
											versions.length > 0
												? "View output version history"
												: "No versions available"
										}
									>
										<Icon name="git-compare" className="w-3 h-3" />
										<span>
											v{versions.length > 0 && activeTab ? versions.findIndex(v => v.id === activeTab.versionGraph.activeId) + 1 : 0}
										</span>
									</button>

								<div className="w-px h-4 bg-[var(--color-outline)]/50 mx-1" />

								<button
									type="button"
									onClick={() => {
										if (!activeTab) return;
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
									}}
									disabled={!activeTab || !activeTab.draft.trim() || !activeTab.isDirty}
									className="md-btn md-btn--primary w-8 h-8 p-0 rounded-full transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed scale-90 origin-right"
									title="Save snapshot (⌘S)"
									aria-label="Save snapshot"
								>
									<Icon name="save" className="w-4 h-4" />
								</button>
								<div className="w-px h-4 bg-[var(--color-outline)]/50 mx-1" />
								<button
									type="button"
									onClick={() => {
										if (lastAssistantMessage?.content) {
											copyMessage(lastAssistantMessage.id, lastAssistantMessage.content);
										}
									}}
									disabled={!lastAssistantMessage}
									className="w-8 h-8 p-0 hover:bg-surface rounded-md transition-all duration-150 text-on-surface-variant hover:text-on-surface flex items-center justify-center"
									title="Copy response"
									aria-label="Copy response"
								>
									<Icon
										name={
											copiedMessageId === lastAssistantMessage?.id ? "check" : "copy"
										}
										className="w-3.5 h-3.5"
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
										<div className="flex flex-col gap-6 pb-2">
											{activeOutput ? (
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
											) : !activeTab?.sending && (
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

											{activeTab?.sending && (
												<div className="flex flex-col items-center justify-center py-4 gap-3 text-on-surface-variant opacity-70">
													<FeatherLoader />
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
						const updatedGraph = {
							...activeTab.versionGraph,
							activeId: versionId,
						};
						tabManager.setVersionGraph(updatedGraph);
					}}
				/>
			)}

			{/* All Projects Modal */}
			<SavedSessionsModal
				open={showAllProjectsOpen}
				onClose={() => setShowAllProjectsOpen(false)}
				sessions={recentProjects}
				activeSessionId={activeTab?.projectId ?? null}
				onLoadSession={loadProject}
				onDeleteSession={deleteProject}
				onDeleteAllSessions={deleteAllProjects}
			/>

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
				presets={presets}
				title={presetPickerForNewTab ? "Select Preset for New Tab" : "Select a Preset"}
			/>
		</>
	);
}
