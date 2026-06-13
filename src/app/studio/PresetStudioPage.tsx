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
	const { confirm, showInfo } = useDialog();
	const { presets, loadPresets, savePreset, deletePreset } = usePresetManager();

	const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

	const [editingPreset, setEditingPreset] = useState<PresetLite | null>(null);
	const [isDirty, setIsDirty] = useState(false);

	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [isSmallScreen, setIsSmallScreen] = useState(false);

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

	const confirmDiscardChanges = useCallback(async () => {
		if (!isDirty) return true;
		return confirm({
			title: "Discard Changes?",
			message: "You have unsaved preset changes. Discard them and continue?",
			confirmText: "Discard",
			cancelText: "Keep Editing",
			tone: "destructive",
		});
	}, [confirm, isDirty]);

	const handleSelectPreset = useCallback(
		async (presetId: string) => {
			if (!(await confirmDiscardChanges())) return;
			const preset = presets.find(
				(p: PresetLite) => p.id === presetId || p.name === presetId,
			);
			if (preset) {
				setSelectedPresetId(presetId);
				setEditingPreset({ ...preset });
				setIsDirty(false);
			}
		},
		[presets, confirmDiscardChanges],
	);

	const handleNewPreset = useCallback(async () => {
		if (!(await confirmDiscardChanges())) return;
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
		setSelectedPresetId(newPreset.id ?? null);
		setIsDirty(true);
	}, [confirmDiscardChanges]);

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
			await showInfo({
				title: "Save Failed",
				message:
					error instanceof Error
						? error.message
						: "Unable to save this preset.",
			});
		}
	}, [editingPreset, savePreset, loadPresets, showInfo]);

	const handleRevert = useCallback(() => {
		if (!editingPreset) return;

		const savedPreset = presets.find(
			(p: PresetLite) =>
				p.id === selectedPresetId || p.name === selectedPresetId,
		);
		if (savedPreset) {
			setEditingPreset({ ...savedPreset });
		} else {
			setEditingPreset({
				...editingPreset,
				name: "Untitled Preset",
				taskType: "intent",
				options: {
					tone: "neutral",
					detail: "normal",
					format: "markdown",
					language: "English",
				},
			});
		}
		setIsDirty(false);
	}, [editingPreset, presets, selectedPresetId]);

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
		if (isDirty) {
			document.body.dataset.studioDirty = "true";
		} else {
			delete document.body.dataset.studioDirty;
		}
		return () => {
			delete document.body.dataset.studioDirty;
		};
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

		checkScreenSize();
		window.addEventListener("resize", checkScreenSize);
		return () => {
			window.removeEventListener("resize", checkScreenSize);
		};
	}, []);

	return (
		<div className="page-animate flex h-full flex-col bg-surface-0 text-light">
			<StudioHeader
				isSmallScreen={isSmallScreen}
				sidebarOpen={sidebarOpen}
				onToggleSidebar={() => setSidebarOpen((v) => !v)}
			/>

			{isSmallScreen && sidebarOpen && (
				<button
					type="button"
					className="modal-backdrop-blur studio-sidebar-backdrop fixed inset-0"
					onClick={() => setSidebarOpen(false)}
					aria-label="Close sidebar"
				/>
			)}

			<main
				className="flex flex-1 flex-col overflow-hidden xl:flex-row"
				style={{ position: "relative" }}
			>
				<aside
					className={`studio-sidebar ${
						isSmallScreen
							? `studio-sidebar--overlay ${
									sidebarOpen
										? "studio-sidebar--open"
										: "studio-sidebar--closed"
								}`
							: "studio-sidebar--docked"
					}`}
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
						onRevert={handleRevert}
						onDelete={(id) => handleDelete(id)}
						className="flex h-full flex-1 flex-col overflow-hidden"
					/>
				</div>
			</main>
		</div>
	);
}
