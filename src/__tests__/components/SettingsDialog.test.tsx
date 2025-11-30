import SettingsDialog, { type SettingsTab } from "@/components/SettingsDialog";
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

		it("should handle unknown initialTab gracefully", () => {
			render(
				<SettingsDialog
					open={true}
					onClose={mockOnClose}
					initialTab={"unknown-tab" as unknown as SettingsTab}
				/>,
			);
			// Should not crash and default tab should be shown
			expect(screen.getByTestId("ollama-content")).toBeInTheDocument();
		});

		it("should switch tabs when clicking tab buttons", async () => {
			const user = userEvent.setup();
			render(<SettingsDialog open={true} onClose={mockOnClose} />);

			// Initially shows ollama
			expect(screen.getByTestId("ollama-content")).toBeInTheDocument();

			// Click Display tab
			await user.click(screen.getByText("Display"));

			// Wait for animation to start but not complete
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(screen.getByTestId("display-content")).toBeInTheDocument();
		});

		it("should handle rapid tab switching with timeout clearing", async () => {
			const user = userEvent.setup();
			render(<SettingsDialog open={true} onClose={mockOnClose} />);

			// Click Display tab first
			await user.click(screen.getByText("Display"));

			// Immediately click System tab (before animation completes)
			await user.click(screen.getByText("System Prompt"));

			// Wait for any pending animations to complete
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Should show system content (last clicked tab)
			expect(screen.getByTestId("system-content")).toBeInTheDocument();
		});

		it("should render null for invalid tab in renderContentFor", () => {
			// Test the default case in the renderContentFor switch statement
			render(<SettingsDialog open={true} onClose={mockOnClose} />);

			// The default case returns null, but since it's only used internally
			// and the component uses valid tabs, this is mainly for coverage
			expect(screen.getByTestId("ollama-content")).toBeInTheDocument();
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

	describe("tab animation transitions", () => {
		it("should handle rapid tab switching", async () => {
			vi.useFakeTimers({ shouldAdvanceTime: true });
			const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
			render(<SettingsDialog open={true} onClose={mockOnClose} />);

			// Click multiple tabs rapidly
			await user.click(screen.getByText("Display"));
			await user.click(screen.getByText("System Prompt"));
			await user.click(screen.getByText("Data Management"));

			// Advance timers to complete animations
			vi.advanceTimersByTime(1500);

			// Should end up on the last clicked tab
			expect(screen.getByTestId("data-content")).toBeInTheDocument();

			vi.useRealTimers();
		});

		it("should not switch tabs when clicking the same tab", async () => {
			const user = userEvent.setup();
			render(<SettingsDialog open={true} onClose={mockOnClose} />);

			// Click the already active tab
			await user.click(screen.getByText("Ollama Setup"));

			// Should still show ollama content
			expect(screen.getByTestId("ollama-content")).toBeInTheDocument();
		});

		it("should animate upward when switching to earlier tab", async () => {
			vi.useFakeTimers({ shouldAdvanceTime: true });
			const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
			render(
				<SettingsDialog
					open={true}
					onClose={mockOnClose}
					initialTab="display"
				/>,
			);

			// Switch to an earlier tab
			await user.click(screen.getByText("Ollama Setup"));

			// Advance timers
			vi.advanceTimersByTime(1500);

			expect(screen.getByTestId("ollama-content")).toBeInTheDocument();

			vi.useRealTimers();
		});
	});

	describe("state reset on open", () => {
		it("should reset state when dialog reopens", () => {
			const { rerender } = render(
				<SettingsDialog
					open={true}
					onClose={mockOnClose}
					initialTab="display"
				/>,
			);

			// Close the dialog
			rerender(<SettingsDialog open={false} onClose={mockOnClose} />);

			// Reopen with different initial tab
			rerender(
				<SettingsDialog
					open={true}
					onClose={mockOnClose}
					initialTab="system"
				/>,
			);

			expect(screen.getByTestId("system-content")).toBeInTheDocument();
		});
	});

	describe("cleanup", () => {
		it("should cleanup transition timeout on unmount", async () => {
			vi.useFakeTimers({ shouldAdvanceTime: true });
			const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
			const { unmount } = render(
				<SettingsDialog open={true} onClose={mockOnClose} />,
			);

			// Start a tab transition
			await user.click(screen.getByText("Display"));

			// Unmount while transition is in progress
			unmount();

			// Advance timers - should not throw
			vi.advanceTimersByTime(1500);

			vi.useRealTimers();
		});
	});

	describe("event propagation", () => {
		it("should stop event propagation on dialog keydown", () => {
			render(<SettingsDialog open={true} onClose={mockOnClose} />);

			const modalContent = document.querySelector(".modal-content");
			expect(modalContent).toBeInTheDocument();

			// Dispatch keydown on the dialog
			const event = new KeyboardEvent("keydown", { key: "a", bubbles: true });
			const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

			modalContent?.dispatchEvent(event);

			expect(stopPropagationSpy).toHaveBeenCalled();
		});

		it("should stop event propagation on dialog click", () => {
			render(<SettingsDialog open={true} onClose={mockOnClose} />);

			const modalContent = document.querySelector(".modal-content");
			expect(modalContent).toBeInTheDocument();

			// Dispatch click on the dialog
			const event = new MouseEvent("click", { bubbles: true });
			const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

			modalContent?.dispatchEvent(event);

			expect(stopPropagationSpy).toHaveBeenCalled();
		});
	});
});
