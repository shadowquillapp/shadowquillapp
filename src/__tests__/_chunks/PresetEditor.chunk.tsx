import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PresetEditor from "@/app/studio/components/PresetEditor";
import type { PresetLite } from "@/types";

const preset: PresetLite = {
	id: "preset_test",
	name: "Test Preset",
	taskType: "intent",
	options: {
		tone: "neutral",
		detail: "normal",
		format: "markdown",
		language: "English",
	},
};

describe("PresetEditor motion wiring", () => {
	it("applies editor enter class when a preset is loaded", () => {
		const { container } = render(
			<PresetEditor
				preset={preset}
				isDirty={false}
				onFieldChange={vi.fn()}
				onSave={vi.fn()}
				onDuplicate={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);

		expect(
			container.querySelector(".studio-editor--enter"),
		).toBeInTheDocument();
	});

	it("does not apply editor enter class in the empty state", () => {
		const { container } = render(
			<PresetEditor
				preset={null}
				isDirty={false}
				onFieldChange={vi.fn()}
				onSave={vi.fn()}
				onDuplicate={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);

		expect(
			container.querySelector(".studio-editor--enter"),
		).not.toBeInTheDocument();
		expect(
			screen.getByText("Select a preset to edit or create a new one"),
		).toBeInTheDocument();
	});
});
