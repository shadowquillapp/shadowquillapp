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
import { usePromptWorkspace } from "./workbench/usePromptWorkspace";
import { appendVersion, createVersionGraph, versionList } from "./workbench/version-graph";
import { VersionHistoryModal } from "./workbench/VersionHistoryModal";
import { PresetInfoDialog } from "./workbench/PresetInfoDialog";

import type {
	CameraMovement,
	Detail,
	Format,
	FrameRate,
	ImageAspectRatio,
	ImageStylePreset,
	ReasoningStyle,
	ShotType,
	TaskType,
	Tone,
	VideoStylePreset,
} from "@/app/studio/types";

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
	const [themeSwitchCooldown, setThemeSwitchCooldown] = useState(false);
	const [themeToast, setThemeToast] = useState<{
		key: number;
		label: string;
	} | null>(null);
	const themeToastTimerRef = useRef<number | null>(null);
	const themeCooldownTimerRef = useRef<number | null>(null);
	const abortRef = useRef<AbortController | null>(null);
	const scrollContainerRef = useRef<HTMLDivElement | null>(null);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [settingsInitialTab, setSettingsInitialTab] = useState<
		"system" | "ollama" | "data"
	>("ollama");

	// Draggable controls state
	const [controlsPosition, setControlsPosition] = useState({ x: 0, y: 0 });
	const [isDragging, setIsDragging] = useState(false);
	const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
	const controlsRef = useRef<HTMLDivElement | null>(null);
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

	const {
		session,
		setPreset,
		updateDraft,
		commitDraft,
		undo,
		redo,
		jumpToVersion,
		setMessages,
		pushMessage,
		updateMessage,
		setSending,
		setError: setSessionError,
		attachProject,
		hasUndo,
		hasRedo,
		activeContent,
		setVersionGraph,
	} = usePromptWorkspace();

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

	const cycleTheme = useCallback(() => {
		if (themeSwitchCooldown) return;
		const themeOrder: Array<"earth" | "purpledark" | "dark" | "light"> = [
			"earth",
			"purpledark",
			"dark",
			"light",
		];
		const currentIndex = themeOrder.indexOf(currentTheme);
		const nextIndex = (currentIndex + 1) % themeOrder.length;
		const nextTheme = themeOrder[nextIndex] ?? "earth";
		setThemeSwitchCooldown(true);
		if (themeCooldownTimerRef.current)
			window.clearTimeout(themeCooldownTimerRef.current);
		themeCooldownTimerRef.current = window.setTimeout(() => {
			setThemeSwitchCooldown(false);
			themeCooldownTimerRef.current = null;
		}, 800);

		setCurrentTheme(nextTheme);
		document.documentElement.setAttribute(
			"data-theme",
			nextTheme === "earth" ? "" : nextTheme,
		);
		localStorage.setItem("theme-preference", nextTheme);
		const themeLabels: Record<
			"earth" | "purpledark" | "dark" | "light",
			string
		> = {
			earth: "Default",
			purpledark: "Dark Purple",
			dark: "Dark",
			light: "Light",
		};
		const label = themeLabels[nextTheme];
		const key = Date.now();
		setThemeToast({ key, label });
		if (themeToastTimerRef.current)
			window.clearTimeout(themeToastTimerRef.current);
		themeToastTimerRef.current = window.setTimeout(() => {
			setThemeToast(null);
			themeToastTimerRef.current = null;
		}, 900);
	}, [currentTheme, themeSwitchCooldown]);

	// Cleanup timers on unmount
	useEffect(() => {
		return () => {
			if (themeToastTimerRef.current)
				window.clearTimeout(themeToastTimerRef.current);
			if (themeCooldownTimerRef.current)
				window.clearTimeout(themeCooldownTimerRef.current);
		};
	}, []);

	// Drag handlers for controls
	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		// Don't start dragging if clicking on a button or interactive element
		const target = e.target as HTMLElement;
		if (target.tagName === 'BUTTON' || target.closest('button')) return;
		
		if (!controlsRef.current || !textareaContainerRef.current) return;
		
		// If this is the first drag (position is still 0,0), calculate the actual position from right/bottom
		let currentX = controlsPosition.x;
		let currentY = controlsPosition.y;
		
		if (currentX === 0 && currentY === 0) {
			const containerRect = textareaContainerRef.current.getBoundingClientRect();
			const controlsRect = controlsRef.current.getBoundingClientRect();
			
			// Calculate position from right/bottom (16px from edges) to left/top
			currentX = containerRect.width - controlsRect.width - 16;
			currentY = containerRect.height - controlsRect.height - 16;
			
			setControlsPosition({ x: currentX, y: currentY });
		}
		
		setIsDragging(true);
		setDragStart({
			x: e.clientX - currentX,
			y: e.clientY - currentY,
		});
	}, [controlsPosition]);

	const handleMouseMove = useCallback((e: MouseEvent) => {
		if (!isDragging || !controlsRef.current || !textareaContainerRef.current) return;
		
		const containerRect = textareaContainerRef.current.getBoundingClientRect();
		const controlsRect = controlsRef.current.getBoundingClientRect();
		
		let newX = e.clientX - dragStart.x;
		let newY = e.clientY - dragStart.y;
		
		// Constrain to container bounds
		const maxX = containerRect.width - controlsRect.width - 16; // 16px padding
		const maxY = containerRect.height - controlsRect.height - 16;
		
		newX = Math.max(16, Math.min(newX, maxX));
		newY = Math.max(16, Math.min(newY, maxY));
		
		setControlsPosition({ x: newX, y: newY });
	}, [isDragging, dragStart]);

	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
	}, []);

	useEffect(() => {
		if (isDragging) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
			return () => {
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
			};
		}
		return undefined;
	}, [isDragging, handleMouseMove, handleMouseUp]);

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
			if (session.projectId) return session.projectId;
			const title =
				(firstLine || session.preset?.name || "New project").slice(0, 40) ||
				"New project";
			const created = await localCreateProject(title);
			attachProject(created.id);
			await refreshProjectList();
			return created.id;
		},
		[attachProject, session.projectId, session.preset, refreshProjectList],
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
			const draft = seedDraftFromPreset(summary);
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
			setPreset(summary, draft);
		},
		[applyPreset, setPreset, presetToSummary, seedDraftFromPreset],
	);

	// Initialize session if empty
	useEffect(() => {
		if (!session.preset && presets.length > 0 && !loadingPresets) {
			const preferred =
				presets.find((p) => (p.id ?? p.name) === selectedPresetKey) ??
				presets[0];
			if (preferred) loadPreset(preferred, { trackRecent: false });
		}
	}, [session.preset, presets, loadingPresets, selectedPresetKey, loadPreset]);

	// Presets load
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

	const send = useCallback(async () => {
		const text = session.draft.trim();
		if (!text || session.sending) return;
		setSending(true);
		setSessionError(null);
		const controller = new AbortController();
		abortRef.current = controller;
		const projectId = await ensureProject(text);
		const user: MessageItem = {
			id: crypto.randomUUID(),
			role: "user",
			content: text,
		};
		pushMessage(user);
		try {
			try {
				const result = await localAppendMessages(
					projectId,
					[{ role: user.role, content: user.content }],
					50,
				);
				const createdUserId = result?.created?.[0]?.id;
				if (createdUserId) updateMessage(user.id, { id: createdUserId });
			} catch {}

			const options = {
				tone,
				detail,
				format,
				language: language || undefined,
				temperature,
				stylePreset:
					taskType === "image"
						? normalizeStylePreset(stylePreset)
						: taskType === "video"
							? normalizeVideoStylePreset(videoStylePreset)
							: undefined,
				aspectRatio:
					taskType === "image" || taskType === "video"
						? normalizeAspectRatio(aspectRatio)
						: undefined,
				includeTests: taskType === "coding" ? includeTests : undefined,
				requireCitations:
					taskType === "research" ? requireCitations : undefined,
				cameraMovement:
					taskType === "video"
						? normalizeCameraMovement(cameraMovement)
						: undefined,
				shotType: taskType === "video" ? normalizeShotType(shotType) : undefined,
				durationSeconds:
					taskType === "video"
						? normalizeDurationSeconds(durationSeconds)
						: undefined,
				frameRate:
					taskType === "video" ? normalizeFrameRate(frameRate) : undefined,
				useDelimiters,
				includeVerification,
				reasoningStyle,
				endOfPromptToken: endOfPromptToken || undefined,
				outputXMLSchema:
					format === "xml" ? outputXMLSchema || undefined : undefined,
				additionalContext: additionalContext || undefined,
				examplesText: examplesText || undefined,
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
			pushMessage(assistant);
			try {
				const result = await localAppendMessages(
					projectId,
					[{ role: assistant.role, content: assistant.content }],
					50,
				);
				const createdAssistantId = result?.created?.[0]?.id;
				if (createdAssistantId)
					updateMessage(assistant.id, { id: createdAssistantId });
				await refreshProjectList();
			} catch {}
		} catch (e: any) {
			if (e?.name === "AbortError" || e?.message?.includes("aborted")) {
				// Silent abort
			} else {
				setSessionError(e?.message || "Something went wrong");
			}
		} finally {
			setSending(false);
			abortRef.current = null;
		}
	}, [
		session.draft,
		session.sending,
		ensureProject,
		pushMessage,
		refreshProjectList,
		setSessionError,
		setSending,
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
		useDelimiters,
		includeVerification,
		reasoningStyle,
		endOfPromptToken,
		outputXMLSchema,
		additionalContext,
		examplesText,
		buildUnifiedPrompt,
		callLocalModelClient,
		updateMessage,
	]);

	const stopGenerating = useCallback(() => {
		try {
			abortRef.current?.abort();
			const abortedMsg: MessageItem = {
				id: crypto.randomUUID(),
				role: "assistant",
				content: "Response aborted",
			};
			pushMessage(abortedMsg);
		} catch {}
		setSending(false);
	}, [pushMessage, setSending]);

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
	}, [session.messages, session.sending]);

	const activeMessages = session.messages;
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
				const data = await localGetProject(id, 50);
				const loaded: MessageItem[] = (data.messages ?? []).map((m: any) => ({
					id: m.id,
					role: m.role,
					content: m.content,
				}));
				setMessages(loaded);

				if (data.versionGraph) {
					setVersionGraph(data.versionGraph);
				} else {
					// Reconstruct history from user messages for legacy chats
					let graph = createVersionGraph("", "Start");
					const userMsgs = loaded.filter((m) => m.role === "user");
					if (userMsgs.length > 0) {
						userMsgs.forEach((msg, i) => {
							graph = appendVersion(graph, msg.content, `Version ${i + 1}`);
						});
					}
					setVersionGraph(graph);
				}

				attachProject(id);
			} catch {
				setSessionError("Failed to load project");
			}
		},
		[attachProject, setSessionError, setMessages, setVersionGraph],
	);

	// Auto-save version graph
	useEffect(() => {
		if (!session.projectId || !session.versionGraph) return;
		const timer = setTimeout(() => {
			updateProjectVersionGraph(session.projectId!, session.versionGraph);
		}, 1000);
		return () => clearTimeout(timer);
	}, [session.projectId, session.versionGraph]);

	const deleteProject = useCallback(
		async (id: string) => {
			try {
				await localDeleteProject(id);
				await refreshProjectList();
			} catch {}
			if (session.projectId === id) {
				attachProject(null);
				setMessages([]);
			}
		},
		[attachProject, refreshProjectList, setMessages, session.projectId],
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
				await navigator.clipboard.writeText(content);
				setCopiedMessageId(messageId);
				setTimeout(() => setCopiedMessageId(null), 2000);
			} catch {
				const textArea = document.createElement("textarea");
				textArea.value = content;
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

	const isDraftDirty = session.draft !== activeContent;
	const versions = versionList(session.versionGraph).filter(
		(v) => v.label !== "Start",
	);
	// Live word count for the editor header
	const wordCount = useMemo(() => {
		const text = session.draft || "";
		const trimmed = text.trim();
		if (!trimmed) return 0;
		return trimmed.split(/\s+/).filter(Boolean).length;
	}, [session.draft]);

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

	// Global keyboard shortcut for saving (Cmd+S / Ctrl+S)
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "s") {
				e.preventDefault();
				if (isDraftDirty) {
					commitDraft();
				}
			}
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [isDraftDirty, commitDraft]);

	return (
		<>
			<div className="simple-workbench">
				<header className="simple-workbench__header">
					<div className="simple-workbench__header-left">
						<button
							type="button"
							onClick={() => router.push("/studio")}
							className="md-btn md-btn--primary"
							title="Open Preset Studio"
						>
							<Icon name="brush" />
							<span>Preset Studio</span>
						</button>
						<button
							type="button"
							onClick={() => setShowAllProjectsOpen(true)}
							className="md-btn"
							title="View saved projects"
						>
							<Icon name="folder-open" />
						</button>
					</div>
					<div className="simple-workbench__header-actions">
					<button
						className="md-btn md-btn--primary"
						onClick={cycleTheme}
						disabled={themeSwitchCooldown}
						title={`Current theme: ${currentTheme}`}
					>
						<Icon name="palette" />
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
					{themeToast && (
						<div
							key={themeToast.key}
							className="theme-toast"
							aria-live="polite"
							aria-atomic="true"
						>
							<Icon name="palette" />
							<span>{themeToast.label} theme</span>
						</div>
					)}
				</header>

				<div className="simple-workbench__panels">
					{/* LEFT PANE: Input */}
					<section className="prompt-input-pane flex flex-col gap-4 p-6 bg-surface border-r border-outline h-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface)' }}>

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
							<div className="flex items-center justify-between gap-2 px-3 py-2 rounded-t-2xl">
								{/* Left: label + live metrics */}
								<div className="flex items-center gap-2 text-on-surface-variant">
									<span className="text-[12px] font-bold tracking-wider uppercase">
										Prompt Editor
									</span>
									<span className="w-1.5 h-1.5 rounded-full bg-outline/60" />
									<span className="text-[10px]">
										{wordCount} {wordCount === 1 ? "word" : "words"}
									</span>
								</div>
								{/* Right: controls */}
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={() => copyMessage("prompt-draft", session.draft)}
										className="w-8 h-8 p-0 hover:bg-surface rounded-md transition-all duration-150 text-on-surface-variant hover:text-on-surface"
										title="Copy prompt"
										aria-label="Copy prompt"
									>
										<Icon name={copiedMessageId === "prompt-draft" ? "check" : "copy"} className="w-3.5 h-3.5" />
									</button>
								</div>
							</div>

							<div ref={textareaContainerRef} className="relative flex-1 min-h-0 w-full">
								<textarea
									className="absolute inset-0 w-full h-full p-6 pt-4 pb-24 rounded-b-2xl resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-outline)] focus:border-[var(--color-outline)] transition-all duration-200 ease-out font-mono text-[11px] leading-[24px] text-on-surface placeholder:text-on-surface-variant/50 shadow-none"
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
									value={session.draft}
									onChange={(e) => updateDraft(e.target.value)}
									placeholder="Describe your prompt & intent..."
								/>

								{/* Floating Footer Controls - Draggable */}
								<div 
									ref={controlsRef}
									onMouseDown={handleMouseDown}
									className="absolute flex items-center gap-4 z-10 rounded-2xl border backdrop-blur-sm p-3 select-none"
									style={{
										borderColor: "var(--color-outline)",
										background: "color-mix(in srgb, var(--color-surface-variant) 30%, transparent)",
										right: controlsPosition.x === 0 ? '16px' : 'auto',
										bottom: controlsPosition.y === 0 ? '16px' : 'auto',
										left: controlsPosition.x !== 0 ? `${controlsPosition.x}px` : 'auto',
										top: controlsPosition.y !== 0 ? `${controlsPosition.y}px` : 'auto',
										cursor: isDragging ? 'grabbing' : 'grab',
									}}
								>
									{/* Minimal 3-Point Dial */}
									<div 
										className="relative flex items-center justify-center rounded-full"
										style={{ 
											width: "75px", 
											height: "75px",
											background: "var(--color-surface)",
										}}
									>
										{/* Subtle circle outline */}
										<div 
											className="absolute inset-0 rounded-full border"
											style={{
												borderColor: "var(--color-outline)",
												opacity: 0.3,
											}}
										/>
										
										{/* Center label - blended */}
										<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none select-none">
											<div className="text-[8px] font-bold text-on-surface-variant uppercase tracking-wider" style={{ opacity: 0.15 }}>
												Gemma
											</div>
										</div>
										
										{/* Model buttons in circle */}
										{[
											{ label: "4B", id: "gemma3:4b", angle: 0, color: "#e85d75", colorDark: "#b84555" },
											{ label: "12B", id: "gemma3:12b", angle: 120, color: "#5eb3a6", colorDark: "#3d8a7e" },
											{ label: "27B", id: "gemma3:27b", angle: 240, color: "#5b9ce8", colorDark: "#4070b8" },
										].map((model) => {
											const isInstalled = availableModels.some(
												(m) => m.name === model.id,
											);
											const isActive = currentModelId === model.id;
											const angleRad = (model.angle * Math.PI) / 180;
											const radius = 32;
											const x = Math.sin(angleRad) * radius;
											const y = -Math.cos(angleRad) * radius;
											
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
													}}
													className={`absolute group/model-btn transition-all duration-200 ${
														isInstalled && !isActive ? "hover:scale-110" : ""
													} ${!isInstalled ? "cursor-not-allowed opacity-40" : ""}`}
													style={{
														top: "50%",
														left: "50%",
														transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
													}}
													title={
														isInstalled
															? `Switch to Gemma 3 ${model.label}`
															: `Gemma 3 ${model.label} is not installed`
													}
												>
													<div 
														className="flex items-center justify-center rounded-full font-bold text-xs transition-all duration-200"
														style={{
															width: "28px",
															height: "28px",
															background: isActive 
																? model.color
																: "var(--color-surface)",
															color: isActive 
																? "#fff"
																: isInstalled
																	? model.color
																	: `${model.color}40`,
															border: isActive 
																? `2px solid ${model.colorDark}` 
																: `1px solid ${isInstalled ? model.color + '60' : 'var(--color-outline)'}`,
														}}
													>
														{model.label}
														{!isInstalled && (
															<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-surface-inverse text-on-surface-inverse text-[10px] rounded opacity-0 group-hover/model-btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md z-50 font-medium">
																Not Installed
															</div>
														)}
													</div>
												</button>
											);
										})}
									</div>

								<button
									type="button"
									onClick={() => (session.sending ? stopGenerating() : void send())}
									disabled={!session.draft.trim()}
									className={`group relative flex items-center justify-center rounded-full transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none overflow-hidden ${
										session.sending
											? "text-on-attention"
											: "text-on-primary"
									}`}
									style={{ 
										width: '75px', 
										height: '75px', 
										border: '1px solid var(--color-outline)',
										background: session.sending ? "var(--color-attention)" : "var(--color-primary)",
									}}
									title={session.sending ? "Stop Generation" : "Run Prompt"}
								>
									{/* Subtle shimmer effect */}
									<div className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out pointer-events-none rounded-full" />

									{session.sending ? (
										<Icon name="stop" className="w-8 h-8 relative z-10" />
									) : (
										<Icon
											name="chevron-right"
											className="w-8 h-8 relative z-10 transition-transform group-hover:translate-x-0.5"
										/>
									)}
								</button>
								</div>
							</div>
						</div>

						{/* Preset Info Row - Moved Under Editor Area */}
						{session.preset && (
							<div className="flex items-center justify-between gap-4 p-2.5 rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-variant)] shadow-sm transition-all hover:shadow-md">
								{/* Header: Icon + Title + Type */}
								<div className="flex items-center gap-2.5 min-w-0">
									<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-sm ring-1 ring-inset ring-primary/10">
										<Icon
											name={
												session.preset.taskType === "coding"
													? "git-compare"
													: session.preset.taskType === "image"
														? "palette"
														: session.preset.taskType === "video"
															? "eye"
															: session.preset.taskType === "research"
																? "search"
																: session.preset.taskType === "writing"
																	? "edit"
																	: session.preset.taskType === "marketing"
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
												{session.preset.name}
											</span>
											<Icon
												name="info"
												className="w-2.5 h-2.5 text-secondary/50 group-hover/btn:text-primary transition-colors"
											/>
										</button>
										<span className="text-[9px] font-bold text-primary/80 uppercase tracking-wider leading-none mt-0.5">
											{session.preset.taskType}
										</span>
									</div>
								</div>

								{/* Metadata Tags */}
								{(session.preset.options?.tone ||
									session.preset.options?.format ||
									session.preset.options?.detail ||
									typeof session.preset.options?.temperature === "number") && (
									<div className="flex flex-wrap justify-end gap-1.5">
										{session.preset.options?.tone && (
											<div className="flex items-center px-1.5 py-0.5 rounded-md bg-surface/50 border border-[var(--color-outline)]/50">
												<span className="text-[9px] font-medium text-secondary capitalize leading-none">
													{session.preset.options.tone}
												</span>
											</div>
										)}
										{session.preset.options?.format && (
											<div className="flex items-center px-1.5 py-0.5 rounded-md bg-surface/50 border border-[var(--color-outline)]/50">
												<span className="text-[9px] font-medium text-secondary uppercase leading-none">
													{session.preset.options.format === "plain"
														? "TXT"
														: session.preset.options.format}
												</span>
											</div>
										)}
										{session.preset.options?.detail && (
											<div className="flex items-center px-1.5 py-0.5 rounded-md bg-surface/50 border border-[var(--color-outline)]/50">
												<span className="text-[9px] font-medium text-secondary capitalize leading-none">
													{session.preset.options.detail}
												</span>
											</div>
										)}
										{typeof session.preset.options?.temperature === "number" && (
											<div className="flex items-center px-1.5 py-0.5 rounded-md bg-surface/50 border border-[var(--color-outline)]/50">
												<span className="text-[9px] font-medium text-secondary capitalize leading-none">
													{session.preset.options.temperature.toFixed(1)}
												</span>
											</div>
										)}
									</div>
								)}
							</div>
						)}
					</section>

					{/* RIGHT PANE: Output */}
					<section className="prompt-output-pane flex flex-col gap-4 p-6 h-full overflow-hidden relative">
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
							<div className="flex items-center justify-between gap-2 px-3 py-2 rounded-t-2xl shrink-0 border-b border-[var(--color-outline)]/50">
								<div className="flex items-center gap-2 text-on-surface-variant">
									<span className="text-[12px] font-bold tracking-wider uppercase">
										Response Output
									</span>
									<span className="w-1.5 h-1.5 rounded-full bg-outline/60" />
									<span className="text-[10px]">
										{outputWordCount} {outputWordCount === 1 ? "word" : "words"}
									</span>
									{session.sending && (
										<>
											<span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse ml-2" />
											<span className="text-[10px] text-primary font-medium">
												Generating...
											</span>
										</>
									)}
								</div>
								
								{/* Actions */}
								<div className="flex items-center gap-2">
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
											v{versions.length > 0 ? versions.findIndex(v => v.id === session.versionGraph.activeId) + 1 : 0}
										</span>
									</button>

								<div className="w-px h-4 bg-[var(--color-outline)]/50 mx-1" />

								<button
									type="button"
									onClick={() => commitDraft()}
									disabled={!isDraftDirty}
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
								className="relative flex-1 min-h-0 overflow-y-auto p-6 custom-scrollbar"
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
								) : (
									<div className="flex flex-col gap-6 pb-2">
										{activeMessages
											.filter((message) => message.role === "assistant")
											.map((message, index) => (
												<div
													key={message.id}
													className="group relative flex flex-col gap-3"
												>
													{/* Message Content */}
													<div className="max-w-none text-on-surface leading-relaxed text-[11px] font-mono">
														<MessageRenderer
															content={message.content}
															messageId={message.id}
															copiedMessageId={copiedMessageId}
															onCopy={copyMessage}
														/>
													</div>
													
													{index < activeMessages.filter(m => m.role === "assistant").length - 1 && (
														<div className="h-px w-full bg-[var(--color-outline)]/30 my-2" />
													)}
												</div>
											))}

										{session.sending && (
											<div className="flex flex-col items-center justify-center py-4 gap-3 text-on-surface-variant opacity-70">
												<FeatherLoader />
											</div>
										)}
										<div ref={endRef} />
									</div>
								)}
							</div>
						</div>

						{/* Error Toast/Banner */}
						{session.error && (
							<div className="absolute bottom-6 left-6 right-6 p-4 rounded-lg bg-attention/10 border border-attention/10 text-attention flex items-center gap-3 shadow-lg animate-in slide-in-from-bottom-2">
								<Icon name="warning" className="w-5 h-5 shrink-0" />
								<p className="text-sm font-medium">{session.error}</p>
								<button
									className="ml-auto p-1 hover:bg-attention/10 rounded"
									onClick={() => setSessionError(null)}
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
			<VersionHistoryModal
				open={showVersionHistory}
				onClose={() => setShowVersionHistory(false)}
				versions={versions}
				activeVersionId={session.versionGraph.activeId}
				onJumpToVersion={jumpToVersion}
			/>

			{/* All Projects Modal */}
			<SavedSessionsModal
				open={showAllProjectsOpen}
				onClose={() => setShowAllProjectsOpen(false)}
				sessions={recentProjects}
				activeSessionId={session.projectId}
				onLoadSession={loadProject}
				onDeleteSession={deleteProject}
				onDeleteAllSessions={deleteAllProjects}
			/>

			{/* Preset Info Dialog */}
			{session.preset && (
				<PresetInfoDialog
					open={showPresetInfo}
					onClose={() => setShowPresetInfo(false)}
					preset={session.preset}
				/>
			)}
		</>
	);
}
