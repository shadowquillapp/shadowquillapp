"use client";

import type { PresetLite } from "@/app/studio/types";
import { CustomSelect } from "@/components/CustomSelect";
import React from "react";

interface AdvancedSettingsProps {
	preset: PresetLite;
	onFieldChange: (field: string, value: any) => void;
}

export default function AdvancedSettings({
	preset,
	onFieldChange,
}: AdvancedSettingsProps) {
	const options = preset.options || {};

	return (
		<div className="mt-4 space-y-4">
			{/* Checkboxes */}
			<div className="flex flex-col gap-4 sm:flex-row">
				<label className="flex cursor-pointer items-center gap-2">
					<input
						type="checkbox"
						checked={options.useDelimiters ?? true}
						onChange={(e) => onFieldChange("useDelimiters", e.target.checked)}
						className="h-4 w-4 rounded"
						style={{ accentColor: "var(--color-primary)" }}
					/>
					<span
						className="text-sm"
						style={{ color: "var(--color-on-surface)" }}
					>
						Use explicit section delimiters
					</span>
				</label>

				<label className="flex cursor-pointer items-center gap-2">
					<input
						type="checkbox"
						checked={options.includeVerification ?? false}
						onChange={(e) =>
							onFieldChange("includeVerification", e.target.checked)
						}
						className="h-4 w-4 rounded"
						style={{ accentColor: "var(--color-primary)" }}
					/>
					<span
						className="text-sm"
						style={{ color: "var(--color-on-surface)" }}
					>
						Include verification checklist
					</span>
				</label>
			</div>

			{/* Grid for select fields */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				{/* Reasoning Style */}
				<div>
					<label className="mb-1 block font-medium text-secondary text-xs">
						Reasoning Strategy
					</label>
					<CustomSelect
						value={options.reasoningStyle || "none"}
						onChange={(v) => onFieldChange("reasoningStyle", v)}
						options={[
							{ value: "none", label: "None" },
							{ value: "cot", label: "Chain-of-Thought (CoT)" },
							{ value: "plan_then_solve", label: "Plan then Solve" },
							{ value: "tree_of_thought", label: "Tree-of-Thought" },
						]}
					/>
					<p className="mt-1 text-secondary text-xs" style={{ opacity: 0.8 }}>
						{options.reasoningStyle === "cot" &&
							"Step-by-step thinking with concise result"}
						{options.reasoningStyle === "plan_then_solve" &&
							"Strategize first, then execute"}
						{options.reasoningStyle === "tree_of_thought" &&
							"Explore multiple paths"}
					</p>
				</div>

				{/* End of Prompt Token */}
				<div>
					<label className="mb-1 block font-medium text-secondary text-xs">
						Prompt Terminator
					</label>
					<input
						type="text"
						value={options.endOfPromptToken || ""}
						onChange={(e) => onFieldChange("endOfPromptToken", e.target.value)}
						placeholder="<|endofprompt|>"
						className="md-input w-full font-mono text-sm"
						style={{
							padding: "8px 12px",
							fontFamily: "var(--font-mono, monospace)",
						}}
					/>
					<p className="mt-1 text-secondary text-xs" style={{ opacity: 0.8 }}>
						Special token to mark prompt end
					</p>
				</div>
			</div>
		</div>
	);
}
