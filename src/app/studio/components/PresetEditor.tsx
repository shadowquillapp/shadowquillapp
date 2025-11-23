"use client";

import AdvancedSettings from "@/app/studio/components/AdvancedSettings";
import BasicSettings from "@/app/studio/components/BasicSettings";
import SaveAsDialog from "@/app/studio/components/SaveAsDialog";
import TypeSpecificFields from "@/app/studio/components/TypeSpecificFields";
import type { PresetLite } from "@/app/studio/types";
import { Icon } from "@/components/Icon";
import React, { useEffect, useState } from "react";

interface PresetEditorProps {
	preset: PresetLite | null;
	isDirty: boolean;
	onFieldChange: (field: string, value: any) => void;
	onSave: () => void;
	onApplyToChat: () => void;
	onDuplicate: (presetId: string, newName?: string) => void;
	onDelete: (presetId: string) => void;
	className?: string;
}

export default function PresetEditor({
	preset,
	isDirty,
	onFieldChange,
	onSave,
	onApplyToChat,
	onDuplicate,
	onDelete,
	className = "",
}: PresetEditorProps) {
	const [activeTab, setActiveTab] = useState<
		"basic" | "advanced" | "type" | "output"
	>("basic");
	const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

	// Ensure we don't stay on "type" tab when no type-specific fields exist
	useEffect(() => {
		if (activeTab === "type" && preset?.taskType === "general") {
			setActiveTab("basic");
		}
	}, [activeTab, preset?.taskType]);

	if (!preset) {
		return (
			<section
				className={`${className} bg-surface`}
				aria-label="Preset Editor"
			>
				<div className="flex h-full items-center justify-center">
					<div className="text-center">
						<Icon
							name="edit"
							className="mb-2 text-4xl text-secondary opacity-50"
						/>
						<p className="text-secondary text-sm">
							Select a preset to edit or create a new one
						</p>
					</div>
				</div>
			</section>
		);
	}

	return (
		<section
			className={`${className} bg-surface`}
			aria-label="Preset Editor"
		>
			<div className="flex h-full flex-col">
				{/* Editor content */}
				<div className="flex-1 overflow-y-auto px-6 py-4">
					<div className="mx-auto max-w-5xl">
						{/* Tabs */}
						<div className="flex flex-wrap items-center border-b border-[var(--color-outline)]">
							<button
								className={`cursor-pointer border-t border-r border-l border-[var(--color-outline)] rounded-t-lg px-4 py-2 font-medium text-sm transition-colors -mb-px ${
									activeTab === "basic"
										? "bg-surface-0 text-light border-b-surface-0"
										: "bg-transparent text-secondary hover:bg-surface-0/50 hover:text-light border-transparent"
								}`}
								aria-selected={activeTab === "basic"}
								onClick={() => setActiveTab("basic")}
							>
								Basic Settings
							</button>
							<button
								className={`cursor-pointer border-t border-r border-l border-[var(--color-outline)] rounded-t-lg px-4 py-2 font-medium text-sm transition-colors -mb-px ${
									activeTab === "advanced"
										? "bg-surface-0 text-light border-b-surface-0"
										: "bg-transparent text-secondary hover:bg-surface-0/50 hover:text-light border-transparent"
								}`}
								aria-selected={activeTab === "advanced"}
								onClick={() => setActiveTab("advanced")}
							>
								Advanced Settings
								<span className="ml-1 hidden text-xs opacity-60 sm:inline">
									(Optional)
								</span>
							</button>
							{preset.taskType !== "general" && (
								<button
									className={`cursor-pointer border-t border-r border-l border-[var(--color-outline)] rounded-t-lg px-4 py-2 font-medium text-sm transition-colors -mb-px ${
										activeTab === "type"
											? "bg-surface-0 text-light border-b-surface-0"
											: "bg-transparent text-secondary hover:bg-surface-0/50 hover:text-light border-transparent"
									}`}
									aria-selected={activeTab === "type"}
									onClick={() => setActiveTab("type")}
								>
									{preset.taskType.charAt(0).toUpperCase() +
										preset.taskType.slice(1)}{" "}
									Settings
								</button>
							)}
							<button
								className={`cursor-pointer border-t border-r border-l border-[var(--color-outline)] rounded-t-lg px-4 py-2 font-medium text-sm transition-colors -mb-px ${
									activeTab === "output"
										? "bg-surface-0 text-light border-b-surface-0"
										: "bg-transparent text-secondary hover:bg-surface-0/50 hover:text-light border-transparent"
								}`}
								aria-selected={activeTab === "output"}
								onClick={() => setActiveTab("output")}
							>
								Output Settings
								<span className="ml-1 hidden text-xs opacity-60 sm:inline">
									(Optional)
								</span>
							</button>
						</div>

					{/* Tab Content */}
					<div className="mt-6 space-y-4">
						{activeTab === "basic" && (
							<BasicSettings
								preset={preset}
								onFieldChange={onFieldChange}
							/>
						)}

						{activeTab === "advanced" && (
							<AdvancedSettings
								preset={preset}
								onFieldChange={onFieldChange}
							/>
						)}

						{activeTab === "type" && preset.taskType !== "general" && (
							<TypeSpecificFields
								taskType={preset.taskType}
								options={preset.options || {}}
								onFieldChange={onFieldChange}
							/>
						)}

						{activeTab === "output" && (
							<div className="space-y-4">
								{preset.options?.format === "xml" && (
									<div>
										<label className="mb-1 block font-medium text-secondary text-xs">
											XML Output Schema / Tags
										</label>
										<textarea
											value={preset.options?.outputXMLSchema || ""}
											onChange={(e) =>
												onFieldChange("outputXMLSchema", e.target.value)
											}
											placeholder="<root><title/><summary/><tags><tag/></tags></root>"
											className="md-input w-full resize-none py-2 px-3 text-sm"
											rows={3}
										/>
									</div>
								)}

								<div>
									<label className="mb-1 block font-medium text-secondary text-xs">
										Additional Context
									</label>
									<textarea
										value={preset.options?.additionalContext || ""}
										onChange={(e) =>
											onFieldChange("additionalContext", e.target.value)
										}
										placeholder="Background info, definitions, constraints to include in the prompt."
										className="md-input w-full resize-none py-2 px-3 text-sm"
										rows={3}
									/>
								</div>

								<div>
									<label className="mb-1 block font-medium text-secondary text-xs">
										Few-shot Examples
									</label>
									<textarea
										value={preset.options?.examplesText || ""}
										onChange={(e) =>
											onFieldChange("examplesText", e.target.value)
										}
										placeholder={`Example:
Q: [task]
A: Let's think step by step... [reasoning]. Therefore, [answer].`}
										className="md-input w-full resize-none font-mono text-sm"
										style={{
											fontFamily: "var(--font-mono, monospace)",
										}}
										rows={4}
									/>
								</div>
							</div>
						)}
					</div>

						{/* Unsaved changes indicator below settings */}
						{isDirty && (
							<div className="mt-4 flex items-center gap-2 font-semibold text-base text-[var(--color-attention)]">
								<span className="h-2.5 w-2.5 rounded-full bg-[var(--color-attention)]" />
								{`Unsaved Changes to (${preset.name})`}
							</div>
						)}
					</div>
				</div>

				{/* Action bar */}
				<div className="border-t border-[var(--color-outline)] bg-surface-0 px-6 py-4">
					<div className="mx-auto flex max-w-5xl items-center justify-between">
						<div className="flex items-center gap-3">
							<button
								onClick={onApplyToChat}
								className="md-btn md-btn--primary font-medium text-sm"
							>
								Apply to Session
							</button>
						</div>

						<div className="flex gap-3">
							<button
								onClick={() => preset?.id && setShowDuplicateDialog(true)}
								className="md-btn font-medium text-sm"
								disabled={!preset?.id}
								title="Duplicate preset"
							>
								Duplicate
							</button>

							<button
								onClick={() => preset?.id && onDelete(preset.id)}
								className="md-btn md-btn--destructive font-medium text-sm text-red-500"
								disabled={!preset?.id || preset?.name === "Default"}
								title="Delete preset"
								style={{ color: "#ef4444" }}
							>
								Delete
							</button>

							<button
								onClick={onSave}
								disabled={!isDirty}
								className="md-btn md-btn--primary flex items-center gap-2 font-medium text-sm"
							>
								<Icon name="save" className="text-base" />
								Save Preset
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Duplicate Confirm Dialog with name input */}
			<SaveAsDialog
				isOpen={showDuplicateDialog}
				currentName={preset?.name || "Untitled"}
				title="Duplicate Preset"
				message={`Are you sure you want to duplicate "${preset?.name}"? You can change the name below.`}
				confirmLabel="Duplicate"
				onSave={(newName) => {
					if (preset?.id) {
						onDuplicate(preset.id, newName);
					}
					setShowDuplicateDialog(false);
				}}
				onCancel={() => setShowDuplicateDialog(false)}
			/>
		</section>
	);
}
