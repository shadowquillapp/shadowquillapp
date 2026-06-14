"use client";

import { useEffect, useRef, useState } from "react";
import BasicSettings from "@/app/studio/components/BasicSettings";
import SettingRow from "@/app/studio/components/SettingRow";
import { Icon } from "@/components/Icon";
import type { PresetLite } from "@/types";

const STUDIO_EDITOR_EXIT_MS = 180;
const UNSAVED_STATUS_COLOR = "#d8efff";

interface PresetEditorProps {
	preset: PresetLite | null;
	isDirty: boolean;
	onFieldChange: (field: string, value: unknown) => void;
	onSave: () => void;
	onRevert: () => void;
	onDelete: (presetId: string) => void;
	className?: string;
}

export default function PresetEditor({
	preset,
	isDirty,
	onFieldChange,
	onSave,
	onRevert,
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

	return (
		<section className={`${className} bg-surface`} aria-label="Preset Editor">
			<div className={`${animClass} flex h-full flex-col`}>
				<div className="flex-1 overflow-y-auto">
					<header className="shadowquill-panel__head border-[var(--color-outline)] border-b bg-surface py-4">
						<div className="mx-auto flex w-full max-w-3xl items-start justify-between gap-4 px-6">
							<div className="min-w-0">
								<h3 style={{ color: "var(--color-primary)" }}>
									{editorPreset.name || "Untitled Preset"}
								</h3>
								<p className="shadowquill-panel__subtitle">
									<i>Configure how this preset compiles prompts.</i>
								</p>
							</div>

							{isDirty && (
								<span
									className="flex shrink-0 items-center gap-1 font-normal text-[length:var(--text-xs)]"
									style={{
										color: UNSAVED_STATUS_COLOR,
										fontStyle: "oblique 14deg",
									}}
								>
									<button
										type="button"
										onClick={onRevert}
										className="md-icon-btn"
										aria-label="Revert unsaved changes"
										title="Revert unsaved changes"
										style={{ color: "inherit" }}
									>
										<Icon name="back" className="h-5 w-5" />
									</button>
									Unsaved changes
								</span>
							)}
						</div>
					</header>

					<div className="mx-auto max-w-3xl px-6 py-6">
						<section className="studio-editor__section settings-category">
							<BasicSettings
								preset={editorPreset}
								onFieldChange={onFieldChange}
							/>
						</section>

						<section className="studio-editor__section settings-category mt-8">
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
							className="md-icon-btn studio-editor__delete-btn"
							disabled={!editorPreset.id || editorPreset.name === "Default"}
							aria-label="Delete preset"
							title={
								editorPreset.name === "Default"
									? "Default preset cannot be deleted"
									: "Delete preset"
							}
						>
							<Icon name="trash" className="h-6 w-6" />
						</button>

						<button
							type="button"
							onClick={onSave}
							disabled={!isDirty}
							className={`md-icon-btn studio-editor__save-btn${isDirty ? "studio-editor__save-btn--dirty" : ""}`}
							aria-label="Save preset"
							title="Save preset"
						>
							<Icon name="save" className="h-6 w-6" />
						</button>
					</div>
				</div>
			</div>
		</section>
	);
}
