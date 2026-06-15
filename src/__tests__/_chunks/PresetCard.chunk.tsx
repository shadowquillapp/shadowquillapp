import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PresetCard from "@/app/studio/components/PresetCard";
import type { PresetLite } from "@/types";

const preset: PresetLite = {
	id: "preset_alpha",
	name: "Alpha Preset",
	taskType: "engineering",
	options: {
		tone: "neutral",
		detail: "normal",
		format: "markdown",
		language: "English",
	},
};

describe("PresetCard selection styling", () => {
	it("marks the selected preset row for selection animation", () => {
		render(<PresetCard preset={preset} isSelected onSelect={vi.fn()} />);

		const row = screen.getByRole("button", {
			name: "Select preset: Alpha Preset",
		});
		expect(row).toHaveClass("data-table__row--selected");
		expect(row).toHaveAttribute("aria-pressed", "true");
	});

	it("clears selected styling when not selected", () => {
		render(
			<PresetCard preset={preset} isSelected={false} onSelect={vi.fn()} />,
		);

		const row = screen.getByRole("button", {
			name: "Select preset: Alpha Preset",
		});
		expect(row).not.toHaveClass("data-table__row--selected");
		expect(row).toHaveAttribute("aria-pressed", "false");
	});
});
