"use client";

import { useEffect, useRef, useState } from "react";
import BasicSettings from "@/app/studio/components/BasicSettings";
import SettingRow from "@/app/studio/components/SettingRow";
import { Icon } from "@/components/Icon";
import type { PresetLite } from "@/types";

const STUDIO_EDITOR_EXIT_MS = 180;

interface PresetEditorProps {
	preset: PresetLite | null;
	isDirty: boolean;
	onFieldChange: (field: string, value: unknown) => void;
	onSave: () => void;
	onDuplicate: (presetId: string) => void;
	onDelete: (presetId: string) => void;
	className?: string;
}

export default function PresetEditor({
	preset,
	isDirty,
	onFieldChange,
	onSave,
	onDuplicate,
	onDelete,
	className = "",
}: PresetEditorProps) {
	const presetKey = preset?.id ?? preset?.name ?? null;
	const [visiblePreset, setVisiblePreset] = useState<PresetLite | null>(preset);
	const [animClass, setAnimClass] = useState(
		preset ? "studio-editor--enter" : "",
	);
	const visibleKeyRef = useRef(presetKey);
	const isFirstRenderRef = useRef(true);

	useEffect(() => {
		if (isFirstRenderRef.current) {
			isFirstRenderRef.current = false;
			visibleKeyRef.current = presetKey;
			return;
		}

		if (presetKey === visibleKeyRef.current) {
			setVisiblePreset(preset);
			return;
		}

		let cancelled = false;
		setAnimClass("studio-editor--exit");

		const exitTimer = window.setTimeout(() => {
			if (cancelled) return;
			visibleKeyRef.current = presetKey;
			setVisiblePreset(preset);
			setAnimClass(preset ? "studio-editor--enter" : "");
		}, STUDIO_EDITOR_EXIT_MS);

		return () => {
			cancelled = true;
			clearTimeout(exitTimer);
		};
	}, [preset, presetKey]);

	if (!visiblePreset && animClass !== "studio-editor--exit") {
		return (
			<section className={`${className} bg-surface`} aria-label="Preset Editor">
				<div className="empty-state">
					<Icon name="edit" className="empty-state__icon" />
					<p className="empty-state__title">
						Select a preset to edit or create a new one
					</p>
				</div>
			</section>
		);
	}

	if (!visiblePreset) return null;

	const editorPreset = visiblePreset;
	const statusTone = isDirty ? "error" : !editorPreset.id ? "idle" : "success";
	const statusLabel = isDirty ? "Unsaved" : !editorPreset.id ? "New" : "Saved";

	return (
		<section className={`${className} bg-surface`} aria-label="Preset Editor">
			<div className={`${animClass} flex h-full flex-col`}>
				<div className="flex-1 overflow-y-auto">
					<header className="shadowquill-panel__head border-[var(--color-outline)] border-b bg-surface px-6 py-4">
						<div>
							<p className="shadowquill-panel__eyebrow">Preset Configuration</p>
							<h3>{editorPreset.name || "Untitled Preset"}</h3>
							<p className="shadowquill-panel__subtitle">
								Configure how this preset compiles prompts.
							</p>
						</div>
						<span
							className={`shadowquill-status-chip shadowquill-status-chip--${statusTone}`}
						>
							{statusLabel}
						</span>
					</header>

					<div className="mx-auto max-w-3xl px-6 py-6">
						<section className="studio-editor__section settings-category">
							<h3 className="settings-category__title">Basics</h3>
							<BasicSettings
								preset={editorPreset}
								onFieldChange={onFieldChange}
							/>
						</section>

						<section className="studio-editor__section settings-category mt-8">
							<h3 className="settings-category__title">Context</h3>
							<div className="flex flex-col">
								<SettingRow
									label="Additional Context"
									description="Background info, definitions, constraints to include in the prompt."
									htmlFor="additional-context"
									stacked={true}
								>
									<textarea
										id="additional-context"
										value={editorPreset.options?.additionalContext || ""}
										onChange={(e) =>
											onFieldChange("additionalContext", e.target.value)
										}
										placeholder="Background info, definitions, constraints to include in the prompt."
										className="md-input w-full resize-none text-sm"
										rows={4}
									/>
								</SettingRow>
							</div>
						</section>
					</div>
				</div>

				<div className="border-[var(--color-outline)] border-t bg-[var(--color-panel-head)] px-6 py-3">
					<div className="mx-auto flex max-w-3xl items-center justify-between">
						<button
							type="button"
							onClick={() => editorPreset.id && onDelete(editorPreset.id)}
							className="md-btn md-btn--destructive md-btn--label"
							disabled={!editorPreset.id || editorPreset.name === "Default"}
							title={
								editorPreset.name === "Default"
									? "Default preset cannot be deleted"
									: "Delete preset"
							}
						>
							Delete
						</button>

						<div className="flex gap-2">
							<button
								type="button"
								onClick={() => editorPreset.id && onDuplicate(editorPreset.id)}
								className="md-btn md-btn--label"
								disabled={!editorPreset.id}
								title={
									editorPreset.id
										? "Duplicate preset"
										: "Save this preset before duplicating"
								}
							>
								Duplicate
							</button>

							<button
								type="button"
								onClick={onSave}
								disabled={!isDirty}
								className="md-btn md-btn--save md-btn--label flex items-center gap-2"
							>
								<Icon name="save" className="h-3.5 w-3.5" />
								Save
							</button>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
