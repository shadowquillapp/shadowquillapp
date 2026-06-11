"use client";

import { useCallback, useEffect, useState } from "react";
import PresetEditor from "@/app/studio/components/PresetEditor";
import PresetLibrary from "@/app/studio/components/PresetLibrary";
import StudioHeader from "@/app/studio/components/StudioHeader";
import { usePresetManager } from "@/app/studio/hooks/usePresetManager";
import { useDialog } from "@/components/DialogProvider";
import { getLastSelectedPresetKey } from "@/lib/preset-store";
import type { PresetLite } from "@/types";

export default function PresetStudioPage() {
	const { confirm } = useDialog();
	const { presets, loadPresets, savePreset, deletePreset, duplicatePreset } =
		usePresetManager();

	const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

	const [editingPreset, setEditingPreset] = useState<PresetLite | null>(null);
	const [isDirty, setIsDirty] = useState(false);

	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [isSmallScreen, setIsSmallScreen] = useState(() => {
		if (typeof window !== "undefined") {
			return window.innerWidth < 1280;
		}
		return false;
	});

	useEffect(() => {
		loadPresets();
	}, [loadPresets]);

	useEffect(() => {
		if (presets.length > 0 && !selectedPresetId && !editingPreset) {
			const lastSelectedPresetKey = getLastSelectedPresetKey();
			if (lastSelectedPresetKey) {
				const preset = presets.find(
					(p: PresetLite) =>
						p.id === lastSelectedPresetKey || p.name === lastSelectedPresetKey,
				);
				if (preset) {
					setSelectedPresetId(preset.id || null);
					setEditingPreset({ ...preset });
					setIsDirty(false);
				}
			}
		}
	}, [presets, selectedPresetId, editingPreset]);

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

	const handleNewPreset = useCallback(() => {
		const newPreset: PresetLite = {
			id: `preset_${Date.now()}`,
			name: "Untitled Preset",
			taskType: "intent",
			options: {
				tone: "neutral",
				detail: "normal",
				format: "markdown",
				language: "English",
			},
		};
		setEditingPreset(newPreset);
		setSelectedPresetId(null);
		setIsDirty(true);
	}, []);

	const handleFieldChange = useCallback(
		(field: string, value: unknown) => {
			if (!editingPreset) return;

			const updatedPreset = { ...editingPreset };

			if (field === "name" && typeof value === "string") {
				updatedPreset.name = value;
			} else if (field === "taskType") {
				updatedPreset.taskType = value as typeof updatedPreset.taskType;
			} else {
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

	const handleSave = useCallback(async () => {
		if (!editingPreset) return;

		try {
			const savedPreset = await savePreset(editingPreset);
			setSelectedPresetId(savedPreset.id || null);
			setEditingPreset(savedPreset);
			setIsDirty(false);
			await loadPresets();
		} catch (error) {
			console.error("Failed to save preset:", error);
		}
	}, [editingPreset, savePreset, loadPresets]);

	const handleDuplicate = useCallback(
		async (presetId: string) => {
			const duplicated = await duplicatePreset(presetId);
			if (duplicated) {
				await loadPresets();
				handleSelectPreset(duplicated.id || "");
			}
		},
		[duplicatePreset, loadPresets, handleSelectPreset],
	);

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

	useEffect(() => {
		const checkScreenSize = () => {
			const isSmall = window.innerWidth < 1280;
			setIsSmallScreen((prev) => {
				if (prev !== isSmall) {
					if (!isSmall) setSidebarOpen(false);
					return isSmall;
				}
				return prev;
			});
		};

		window.addEventListener("resize", checkScreenSize);
		return () => {
			window.removeEventListener("resize", checkScreenSize);
		};
	}, []);

	return (
		<div className="page-animate flex h-full flex-col bg-surface-0 text-light">
			<StudioHeader
				isSmallScreen={isSmallScreen}
				onToggleSidebar={() => setSidebarOpen((v) => !v)}
			/>

			{isSmallScreen && sidebarOpen && (
				<button
					type="button"
					style={{
						position: "fixed",
						inset: 0,
						background: "rgba(0,0,0,0.5)",
						zIndex: 25,
						border: "none",
						padding: 0,
						cursor: "pointer",
					}}
					onClick={() => setSidebarOpen(false)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							setSidebarOpen(false);
						}
					}}
					aria-label="Close sidebar"
				/>
			)}

			<main
				className="flex flex-1 flex-col overflow-hidden xl:flex-row"
				style={{ position: "relative" }}
			>
				<aside
					className={`flex flex-col border-[var(--color-outline)] transition-all duration-300 ${
						isSmallScreen
							? `fixed top-8 left-0 z-30 h-[calc(100vh-2rem)] w-[min(90vw,420px)] border-r ${
									sidebarOpen ? "translate-x-0" : "-translate-x-full"
								}`
							: "w-[420px] flex-shrink-0 border-r"
					}`}
					style={{
						background: "var(--color-surface-variant)",
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

				<div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface">
					<PresetEditor
						preset={editingPreset}
						isDirty={isDirty}
						onFieldChange={handleFieldChange}
						onSave={handleSave}
						onDuplicate={handleDuplicate}
						onDelete={(id) => handleDelete(id)}
						className="flex h-full flex-1 flex-col overflow-hidden"
					/>
				</div>
			</main>
		</div>
	);
}
