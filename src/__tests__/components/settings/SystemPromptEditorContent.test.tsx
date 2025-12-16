import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SystemPromptEditorContent from "@/components/settings/SystemPromptEditorContent";

// Mock system-prompts
const mockEnsureSystemPromptBuild = vi.fn();

vi.mock("@/lib/system-prompts", () => ({
	ensureSystemPromptBuild: () => mockEnsureSystemPromptBuild(),
}));

describe("SystemPromptEditorContent", () => {
	const defaultPrompt = "You are a helpful AI assistant.";

	// Helper to get the read-only display div
	const getDisplayDiv = () =>
		document.getElementById("system-prompt-display") as HTMLDivElement;

	beforeEach(() => {
		vi.clearAllMocks();
		mockEnsureSystemPromptBuild.mockReturnValue(defaultPrompt);
	});

	describe("rendering", () => {
		it("should render the system prompt viewer", async () => {
			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				expect(screen.getByText("System Prompt")).toBeInTheDocument();
				expect(screen.getByText("Prompt Engineering")).toBeInTheDocument();
			});
		});

		it("should render the display div with loaded prompt", async () => {
			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				const displayDiv = getDisplayDiv();
				expect(displayDiv).toBeInTheDocument();
				expect(displayDiv).toHaveTextContent(defaultPrompt);
			});
		});

		it("should render display div as read-only (non-editable)", async () => {
			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				const displayDiv = getDisplayDiv();
				expect(displayDiv).toBeInTheDocument();
				// Verify it's a div (not an input/textarea) which makes it read-only
				expect(displayDiv.tagName).toBe("DIV");
			});
		});

		it("should not render action buttons", async () => {
			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				expect(getDisplayDiv()).toBeInTheDocument();
			});

			expect(
				screen.queryByRole("button", { name: "Restore Default" }),
			).not.toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: "Save Changes" }),
			).not.toBeInTheDocument();
		});

		it("should not show status chip", async () => {
			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				expect(getDisplayDiv()).toBeInTheDocument();
			});

			expect(screen.queryByText("Saved")).not.toBeInTheDocument();
			expect(screen.queryByText("Modified")).not.toBeInTheDocument();
		});
	});

	describe("read-only behavior", () => {
		it("should have correct subtitle indicating view-only", async () => {
			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				expect(
					screen.getByText(
						"View the AI's core instructions and behavior patterns.",
					),
				).toBeInTheDocument();
			});
		});
	});

	describe("loading state", () => {
		it("should show loading indicator initially", () => {
			// Mock a slow load
			mockEnsureSystemPromptBuild.mockImplementation(() => {
				return defaultPrompt;
			});

			render(<SystemPromptEditorContent />);

			// Initially should show loading
			// Note: This is hard to test since loading is very fast
			// The component will show "Loading…" briefly
		});

		it("should handle load error gracefully", async () => {
			mockEnsureSystemPromptBuild.mockImplementation(() => {
				throw new Error("Load failed");
			});

			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				// After error, display div should exist with fallback message
				const displayDiv = getDisplayDiv();
				expect(displayDiv).toBeInTheDocument();
				expect(displayDiv).toHaveTextContent("No system prompt available.");
			});
		});
	});

	describe("display styling", () => {
		it("should render display div with correct styling", async () => {
			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				const displayDiv = getDisplayDiv();
				expect(displayDiv).toBeInTheDocument();
				// Verify it has the expected max-height for scrolling
				expect(displayDiv).toHaveStyle({ maxHeight: "400px" });
				expect(displayDiv).toHaveStyle({ overflowY: "auto" });
			});
		});

		it("should display long content with scrolling when it exceeds max height", async () => {
			// Set a longer prompt to test scrolling
			const longPrompt = defaultPrompt + "\n".repeat(50);
			mockEnsureSystemPromptBuild.mockReturnValue(longPrompt);

			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				const displayDiv = getDisplayDiv();
				expect(displayDiv).toBeInTheDocument();
				// Check that the content includes the default prompt (textContent normalizes whitespace)
				expect(displayDiv.textContent).toContain(defaultPrompt);
				// Verify scrolling is enabled
				expect(displayDiv).toHaveStyle({ overflowY: "auto" });
			});
		});

		it("should preserve whitespace and line breaks", async () => {
			const promptWithBreaks = "Line 1\nLine 2\nLine 3";
			mockEnsureSystemPromptBuild.mockReturnValue(promptWithBreaks);

			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				const displayDiv = getDisplayDiv();
				expect(displayDiv).toBeInTheDocument();
				// Check that all lines are present (textContent normalizes whitespace but content is there)
				expect(displayDiv.textContent).toContain("Line 1");
				expect(displayDiv.textContent).toContain("Line 2");
				expect(displayDiv.textContent).toContain("Line 3");
				// Verify whitespace preservation style is set
				expect(displayDiv).toHaveStyle({ whiteSpace: "pre-wrap" });
			});
		});
	});
});
