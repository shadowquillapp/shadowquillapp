"use client";

import PresetEditor from "@/app/studio/components/PresetEditor";
import PresetLibrary from "@/app/studio/components/PresetLibrary";
import StudioHeader from "@/app/studio/components/StudioHeader";
import { usePresetManager } from "@/app/studio/hooks/usePresetManager";
import type { PresetLite } from "@/app/studio/types";
import { useDialog } from "@/components/DialogProvider";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useCallback, useMemo } from "react";

export default function PresetStudioPage() {
	const router = useRouter();
	const { confirm } = useDialog();
	const { presets, loadPresets, savePreset, deletePreset, duplicatePreset } =
		usePresetManager();

	// Selection states
	const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

	// Editor state
	const [editingPreset, setEditingPreset] = useState<PresetLite | null>(null);
	const [isDirty, setIsDirty] = useState(false);

	// Sidebar state - initialize based on window size to prevent flicker
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [isSmallScreen, setIsSmallScreen] = useState(() => {
		if (typeof window !== 'undefined') {
			return window.innerWidth < 1280;
		}
		return false;
	});

	// Load presets on mount
	useEffect(() => {
		loadPresets();
	}, [loadPresets]);

	// Auto-select the currently active preset when presets are loaded
	useEffect(() => {
		// Only auto-select if we don't already have an editing preset
		// (to avoid overwriting a new preset being created)
		if (presets.length > 0 && !selectedPresetId && !editingPreset) {
			const lastSelectedPresetKey = localStorage.getItem(
				"last-selected-preset",
			);
			if (lastSelectedPresetKey) {
				const preset = presets.find(
					(p: PresetLite) => p.id === lastSelectedPresetKey,
				);
				if (preset) {
					setSelectedPresetId(preset.id || null);
					setEditingPreset({ ...preset });
					setIsDirty(false);
				}
			}
		}
	}, [presets, selectedPresetId, editingPreset]);

	// Load and apply saved theme
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
			document.documentElement.setAttribute(
				"data-theme",
				savedTheme === "earth" ? "" : savedTheme,
			);
		}
	}, []);

	// Handle preset selection
	const handleSelectPreset = useCallback(
		(presetId: string) => {
			const preset = presets.find((p: PresetLite) => p.id === presetId);
			if (preset) {
				setSelectedPresetId(presetId);
				setEditingPreset({ ...preset });
				setIsDirty(false);
			}
		},
		[presets],
	);

	// Handle creating new preset
	const handleNewPreset = useCallback(() => {
		const newPreset: PresetLite = {
			id: `preset_${Date.now()}`,
			name: "Untitled Preset",
			taskType: "general",
			options: {
				tone: "neutral",
				detail: "normal",
				format: "markdown",
				language: "English",
				temperature: 0.7,
				useDelimiters: true,
				includeVerification: false,
				reasoningStyle: "none",
				endOfPromptToken: "<|endofprompt|>",
			},
		};
		setEditingPreset(newPreset);
		setSelectedPresetId(null);
		setIsDirty(true);
	}, []);

	// Handle field changes in editor
	const handleFieldChange = useCallback(
		(field: string, value: any) => {
			if (!editingPreset) return;

			const updatedPreset = { ...editingPreset };

			// Handle top-level fields
			if (field === "name" || field === "taskType") {
				updatedPreset[field] = value;
			} else {
				// Handle options fields
				updatedPreset.options = {
					...updatedPreset.options,
					[field]: value,
				};
			}

			setEditingPreset(updatedPreset);
			setIsDirty(true);
		},
		[editingPreset],
	);

	// Handle save
	const handleSave = useCallback(async () => {
		if (!editingPreset) return;

		try {
			await savePreset(editingPreset);
			setSelectedPresetId(editingPreset.id || null);
			setIsDirty(false);
			await loadPresets();
		} catch (error) {
			console.error("Failed to save preset:", error);
		}
	}, [editingPreset, savePreset, loadPresets]);

	// Handle save as new preset
	const handleSaveAs = useCallback(
		async (newName: string) => {
			if (!editingPreset) return;

			try {
				const newPreset = {
					...editingPreset,
					id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					name: newName,
				};
				await savePreset(newPreset);
				setSelectedPresetId(newPreset.id || null);
				setEditingPreset(newPreset);
				setIsDirty(false);
				await loadPresets();
			} catch (error) {
				console.error("Failed to save preset:", error);
			}
		},
		[editingPreset, savePreset, loadPresets],
	);

	// Handle delete
	const handleDelete = useCallback(
		async (presetId: string) => {
			const preset = presets.find((p: PresetLite) => p.id === presetId);
			if (!preset || preset.name === "Default") return;

			const confirmed = await confirm({
				title: "Delete Preset",
				message: `Are you sure you want to delete "${preset.name}"? This action cannot be undone.`,
				confirmText: "Delete",
				cancelText: "Cancel",
				tone: "destructive",
			});

			if (confirmed) {
				await deletePreset(presetId);
				if (selectedPresetId === presetId) {
					setSelectedPresetId(null);
					setEditingPreset(null);
				}
				await loadPresets();
			}
		},
		[presets, selectedPresetId, deletePreset, loadPresets, confirm],
	);

	// Handle duplicate
	const handleDuplicate = useCallback(
		async (presetId: string, newName?: string) => {
			const duplicated = await duplicatePreset(presetId);
			if (duplicated) {
				// If a new name was provided, immediately rename the duplicated preset
				if (newName?.trim() && newName !== duplicated.name) {
					try {
						await savePreset({ ...duplicated, name: newName.trim() });
					} catch (e) {
						console.error("Failed to rename duplicated preset:", e);
					}
				}
				await loadPresets();
				handleSelectPreset(duplicated.id || "");
			}
		},
		[duplicatePreset, savePreset, loadPresets, handleSelectPreset],
	);

	// Handle apply to chat
	const handleApplyToChat = useCallback(
		(preset: PresetLite) => {
			// Store in sessionStorage for ChatClient to pick up
			sessionStorage.setItem("PC_APPLY_PRESET", JSON.stringify(preset));
			router.push("/chat");
		},
		[router],
	);

	// Handle unsaved changes warning
	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (isDirty) {
				e.preventDefault();
				e.returnValue = "";
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [isDirty]);

	// Handle responsive sidebar
	useEffect(() => {
		const checkScreenSize = () => {
			const isSmall = window.innerWidth < 1280; // xl breakpoint
			setIsSmallScreen((prev) => {
				// Only update if the value actually changed to prevent unnecessary re-renders
				if (prev !== isSmall) {
					if (!isSmall) setSidebarOpen(false); // Auto-close sidebar when switching to large screen
					return isSmall;
				}
				return prev;
			});
		};
		
		// Only add resize listener, don't call checkScreenSize on mount since state is already initialized
		window.addEventListener("resize", checkScreenSize);
		return () => {
			window.removeEventListener("resize", checkScreenSize);
		};
	}, []);

	return (
	<>
		<div
			className="flex flex-col bg-surface-0 text-light h-full"
		>
		<StudioHeader
				onNewPreset={handleNewPreset}
				onBack={() => router.push("/chat")}
				isDirty={isDirty}
				isSmallScreen={isSmallScreen}
				onToggleSidebar={() => setSidebarOpen((v) => !v)}
			/>

			{/* Sidebar backdrop for mobile */}
			{isSmallScreen && sidebarOpen && (
				<div
					style={{
						position: "fixed",
						inset: 0,
						background: "rgba(0,0,0,0.5)",
						zIndex: 25,
					}}
					onClick={() => setSidebarOpen(false)}
				/>
			)}

			<main className="flex flex-1 flex-col overflow-hidden xl:flex-row" style={{ position: "relative" }}>
				{/* Row 1 / Col 1: Preset Library */}
				<aside
				className={`flex flex-col border-[var(--color-outline)] transition-all duration-300 ${
					isSmallScreen
						? `fixed top-12 left-0 h-[calc(100vh-3rem)] w-[min(90vw,320px)] z-30 border-r ${
								sidebarOpen ? "translate-x-0" : "-translate-x-full"
						  }`
						: "flex-shrink-0 w-[320px] border-r"
				}`}
				style={{ 
					background: 'var(--color-surface-variant)',
				}}
				>
					<PresetLibrary
						presets={presets}
						selectedPresetId={selectedPresetId}
						onSelectPreset={handleSelectPreset}
						onCreateNew={handleNewPreset}
						className="flex-1 overflow-hidden"
					/>
				</aside>

			{/* Row 2 / Col 2: Preset Editor */}
			<div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface">
				<PresetEditor
							preset={editingPreset}
							isDirty={isDirty}
							onFieldChange={handleFieldChange}
							onSave={handleSave}
							onApplyToChat={() =>
								editingPreset && handleApplyToChat(editingPreset)
							}
							onDuplicate={(id, name) => handleDuplicate(id, name)}
							onDelete={(id) => handleDelete(id)}
							className="flex h-full flex-1 flex-col overflow-hidden"
						/>
					</div>
				</main>
			</div>
		</>
	);
}
