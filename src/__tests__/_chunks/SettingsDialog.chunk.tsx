import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SettingsDialog from "@/components/SettingsDialog";

vi.mock("@/components/useCloseOnEscape", () => ({
	useCloseOnEscape: vi.fn(),
}));

vi.mock("@/components/settings/AppVersionContent", () => ({
	default: () => <div>App Version panel</div>,
}));

vi.mock("@/components/settings/LocalDataManagementContent", () => ({
	default: () => <div>Data Management panel</div>,
}));

vi.mock("@/components/settings/OllamaSetupContent", () => ({
	default: () => <div>Ollama Setup panel</div>,
}));

vi.mock("@/components/settings/SystemPromptEditorContent", () => ({
	default: () => <div>System Prompt panel</div>,
}));

describe("SettingsDialog motion wiring", () => {
	it("applies panel enter class to the active tab panel", () => {
		render(<SettingsDialog open onClose={vi.fn()} initialTab="version" />);

		const panel = screen.getByRole("tabpanel");
		expect(panel).toHaveClass("settings-panel--enter");
		expect(panel).toHaveAttribute("id", "settings-panel-version");
	});

	it("remounts the tab panel with enter class when switching tabs", async () => {
		const user = userEvent.setup();
		render(<SettingsDialog open onClose={vi.fn()} initialTab="version" />);

		await user.click(screen.getByRole("tab", { name: "Data Management" }));

		const panel = screen.getByRole("tabpanel");
		expect(panel).toHaveClass("settings-panel--enter");
		expect(panel).toHaveAttribute("id", "settings-panel-data");
		expect(screen.getByText("Data Management panel")).toBeInTheDocument();
	});
});
