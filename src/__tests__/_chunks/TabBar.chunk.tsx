import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TabBar } from "@/app/workbench/_components/workbench/TabBar";
import type { PromptPresetSummary } from "@/app/workbench/_components/workbench/types";

const preset: PromptPresetSummary = {
	id: "preset_1",
	name: "Test Preset",
	taskType: "intent",
	options: {
		tone: "neutral",
		detail: "normal",
		format: "markdown",
		language: "English",
	},
};

describe("TabBar", () => {
	it("keeps the close control outside the tab element", () => {
		render(
			<TabBar
				tabs={[{ id: "tab_1", label: "My Tab", preset }]}
				activeTabId="tab_1"
				maxTabs={8}
				onSwitchTab={vi.fn()}
				onCloseTab={vi.fn()}
				onNewTab={vi.fn()}
			/>,
		);

		const tab = screen.getByRole("tab", { name: "My Tab" });
		const close = screen.getByRole("button", { name: "Close My Tab" });

		expect(tab.contains(close)).toBe(false);
		expect(tab.parentElement).toBe(close.parentElement);
	});
});
