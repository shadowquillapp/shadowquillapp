"use client";

import { CustomSelect } from "@/components/CustomSelect";
import type { PresetLite } from "@/types";
import React from "react";

interface AdvancedSettingsProps {
	preset: PresetLite;
	onFieldChange: (field: string, value: unknown) => void;
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
						className="md-checkbox"
					/>
					<span className="text-light text-sm">
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
						className="md-checkbox"
					/>
					<span className="text-light text-sm">
						Include verification checklist
					</span>
				</label>
			</div>

			{/* Grid for select fields */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				{/* Reasoning Style */}
				<div>
					<label
						htmlFor="reasoning-style"
						className="mb-1 block font-medium text-secondary text-xs"
					>
						Reasoning Strategy
					</label>
					<CustomSelect
						id="reasoning-style"
						value={options.reasoningStyle || "none"}
						onChange={(v) => onFieldChange("reasoningStyle", v)}
						options={[
							{ value: "none", label: "None" },
							{ value: "cot", label: "Chain-of-Thought (CoT)" },
							{ value: "plan_then_solve", label: "Plan then Solve" },
							{ value: "tree_of_thought", label: "Tree-of-Thought" },
						]}
					/>
					<p className="mt-1 text-secondary text-xs opacity-80">
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
					<label
						htmlFor="end-of-prompt-token"
						className="mb-1 block font-medium text-secondary text-xs"
					>
						Prompt Terminator
					</label>
					<input
						id="end-of-prompt-token"
						type="text"
						value={options.endOfPromptToken || ""}
						onChange={(e) => onFieldChange("endOfPromptToken", e.target.value)}
						placeholder="<|endofprompt|>"
						className="md-input !rounded-lg h-10 w-full px-3 py-2 font-mono text-sm"
						style={{
							fontFamily: "var(--font-mono, monospace)",
						}}
					/>
					<p className="mt-1 text-secondary text-xs opacity-80">
						Special token to mark prompt end
					</p>
				</div>
			</div>
		</div>
	);
}
