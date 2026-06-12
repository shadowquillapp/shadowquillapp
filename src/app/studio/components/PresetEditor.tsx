"use client";

import type { ReactNode } from "react";
import BasicSettings from "@/app/studio/components/BasicSettings";
import { Icon } from "@/components/Icon";
import type { PresetLite } from "@/types";

interface PresetEditorProps {
	preset: PresetLite | null;
	isDirty: boolean;
	onFieldChange: (field: string, value: unknown) => void;
	onSave: () => void;
	onDuplicate: (presetId: string) => void;
	onDelete: (presetId: string) => void;
	className?: string;
}

function SectionHeading({ children }: { children: ReactNode }) {
	return (
		<h3
			className="border-[var(--color-outline)] border-b pb-1.5 font-semibold text-secondary text-xs uppercase"
			style={{ letterSpacing: "var(--label-tracking)" }}
		>
			{children}
		</h3>
	);
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
	if (!preset) {
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

	return (
		<section className={`${className} bg-surface`} aria-label="Preset Editor">
			<div
				key={preset.id ?? preset.name}
				className="studio-editor--enter flex h-full flex-col"
			>
				<div className="flex-1 overflow-y-auto px-4 py-3">
					<div className="mx-auto max-w-5xl space-y-6">
						<section className="space-y-4">
							<SectionHeading>Basics</SectionHeading>
							<BasicSettings preset={preset} onFieldChange={onFieldChange} />
						</section>

						<section className="space-y-4">
							<SectionHeading>Context</SectionHeading>
							<div>
								<label
									htmlFor="additional-context"
									className="mb-1 block font-medium text-secondary text-xs"
								>
									Additional Context
								</label>
								<textarea
									id="additional-context"
									value={preset.options?.additionalContext || ""}
									onChange={(e) =>
										onFieldChange("additionalContext", e.target.value)
									}
									placeholder="Background info, definitions, constraints to include in the prompt."
									className="md-input w-full resize-none px-3 py-2 text-sm"
									rows={3}
								/>
							</div>
						</section>

						{isDirty && (
							<div
								className="flex items-center gap-2 font-mono text-[var(--color-attention)] text-xs uppercase"
								style={{ letterSpacing: "var(--label-tracking)" }}
							>
								<span className="h-2 w-2 rounded-[var(--radius-sm)] bg-[var(--color-attention)]" />
								{`Unsaved changes to ${preset.name}`}
							</div>
						)}
					</div>
				</div>

				<div className="border-[var(--color-outline)] border-t bg-[var(--color-panel-head)] px-4 py-2">
					<div className="mx-auto flex max-w-5xl items-center justify-between">
						<button
							type="button"
							onClick={() => preset.id && onDelete(preset.id)}
							className="md-btn md-btn--destructive md-btn--label"
							disabled={!preset.id || preset.name === "Default"}
							title={
								preset.name === "Default"
									? "Default preset cannot be deleted"
									: "Delete preset"
							}
						>
							Delete
						</button>

						<div className="flex gap-2">
							<button
								type="button"
								onClick={() => preset.id && onDuplicate(preset.id)}
								className="md-btn md-btn--label"
								disabled={!preset.id}
								title={
									preset.id
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
