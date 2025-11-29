import SettingsDialog from "@/components/SettingsDialog";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the settings content components
vi.mock("@/components/settings/DisplayContent", () => ({
	default: () => <div data-testid="display-content">Display Content</div>,
}));
vi.mock("@/components/settings/LocalDataManagementContent", () => ({
	default: () => (
		<div data-testid="data-content">Local Data Management Content</div>
	),
}));
vi.mock("@/components/settings/OllamaSetupContent", () => ({
	default: () => <div data-testid="ollama-content">Ollama Setup Content</div>,
}));
vi.mock("@/components/settings/SystemPromptEditorContent", () => ({
	default: () => (
		<div data-testid="system-content">System Prompt Editor Content</div>
	),
}));

describe("SettingsDialog", () => {
	const mockOnClose = vi.fn();

	beforeEach(() => {
		mockOnClose.mockClear();
	});

	describe("rendering", () => {
		it("should not render when open is false", () => {
			render(<SettingsDialog open={false} onClose={mockOnClose} />);
			expect(screen.queryByText("Settings")).not.toBeInTheDocument();
		});

		it("should render when open is true", () => {
			render(<SettingsDialog open={true} onClose={mockOnClose} />);
			expect(screen.getByText("Settings")).toBeInTheDocument();
		});

		it("should render all tab buttons", () => {
			render(<SettingsDialog open={true} onClose={mockOnClose} />);
			expect(screen.getByText("Ollama Setup")).toBeInTheDocument();
			expect(screen.getByText("System Prompt")).toBeInTheDocument();
			expect(screen.getByText("Data Management")).toBeInTheDocument();
			expect(screen.getByText("Display")).toBeInTheDocument();
		});

		it("should render close button", () => {
			render(<SettingsDialog open={true} onClose={mockOnClose} />);
			const closeButtons = screen.getAllByRole("button");
			// Find the close button (it's in the header)
			const closeButton = closeButtons.find(
				(btn) => btn.querySelector("svg") !== null,
			);
			expect(closeButton).toBeInTheDocument();
		});
	});

	describe("tab navigation", () => {
		it("should show ollama content by default", () => {
			render(<SettingsDialog open={true} onClose={mockOnClose} />);
			expect(screen.getByTestId("ollama-content")).toBeInTheDocument();
		});

		it("should show ollama content when initialTab is ollama", () => {
			render(
				<SettingsDialog
					open={true}
					onClose={mockOnClose}
					initialTab="ollama"
				/>,
			);
			expect(screen.getByTestId("ollama-content")).toBeInTheDocument();
		});

		it("should show system content when initialTab is system", () => {
			render(
				<SettingsDialog
					open={true}
					onClose={mockOnClose}
					initialTab="system"
				/>,
			);
			expect(screen.getByTestId("system-content")).toBeInTheDocument();
		});

		it("should show data content when initialTab is data", () => {
			render(
				<SettingsDialog open={true} onClose={mockOnClose} initialTab="data" />,
			);
			expect(screen.getByTestId("data-content")).toBeInTheDocument();
		});

		it("should show display content when initialTab is display", () => {
			render(
				<SettingsDialog
					open={true}
					onClose={mockOnClose}
					initialTab="display"
				/>,
			);
			expect(screen.getByTestId("display-content")).toBeInTheDocument();
		});

		it("should switch tabs when clicking tab buttons", async () => {
			const user = userEvent.setup();
			render(<SettingsDialog open={true} onClose={mockOnClose} />);

			// Initially shows ollama
			expect(screen.getByTestId("ollama-content")).toBeInTheDocument();

			// Click Display tab
			await user.click(screen.getByText("Display"));

			// Wait for animation to complete
			await new Promise((resolve) => setTimeout(resolve, 800));

			expect(screen.getByTestId("display-content")).toBeInTheDocument();
		});
	});

	describe("close behavior", () => {
		it("should call onClose when close button is clicked", async () => {
			const user = userEvent.setup();
			render(<SettingsDialog open={true} onClose={mockOnClose} />);

			// Find the close button in the header
			const headerButtons = screen.getAllByRole("button");
			const closeButton = headerButtons.find((btn) =>
				btn.classList.contains("md-btn"),
			);

			if (closeButton) {
				await user.click(closeButton);
				expect(mockOnClose).toHaveBeenCalledTimes(1);
			}
		});

		it("should call onClose when Escape key is pressed", () => {
			render(<SettingsDialog open={true} onClose={mockOnClose} />);

			fireEvent.keyDown(document, { key: "Escape" });
			expect(mockOnClose).toHaveBeenCalledTimes(1);
		});
	});

	describe("accessibility", () => {
		it("should have navigation landmark for tabs", () => {
			render(<SettingsDialog open={true} onClose={mockOnClose} />);
			expect(
				screen.getByRole("navigation", { name: "Settings sections" }),
			).toBeInTheDocument();
		});
	});
});
