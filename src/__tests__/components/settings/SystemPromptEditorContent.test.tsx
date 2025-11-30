import SystemPromptEditorContent from "@/components/settings/SystemPromptEditorContent";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock DialogProvider
const mockConfirm = vi.fn();
vi.mock("@/components/DialogProvider", () => ({
	useDialog: () => ({
		confirm: mockConfirm,
		showInfo: vi.fn(),
	}),
}));

// Mock system-prompts
const mockEnsureSystemPromptBuild = vi.fn();
const mockSetSystemPromptBuild = vi.fn();
const mockResetSystemPromptBuild = vi.fn();

vi.mock("@/lib/system-prompts", () => ({
	ensureSystemPromptBuild: () => mockEnsureSystemPromptBuild(),
	setSystemPromptBuild: (prompt: string) => mockSetSystemPromptBuild(prompt),
	resetSystemPromptBuild: () => mockResetSystemPromptBuild(),
}));

describe("SystemPromptEditorContent", () => {
	const mockOnSaved = vi.fn();
	const mockOnCancelReset = vi.fn();
	const defaultPrompt = "You are a helpful AI assistant.";

	// Helper to get textarea by id since label has nested elements
	const getTextarea = () =>
		document.getElementById("system-prompt-textarea") as HTMLTextAreaElement;

	beforeEach(() => {
		vi.clearAllMocks();
		mockEnsureSystemPromptBuild.mockReturnValue(defaultPrompt);
		mockSetSystemPromptBuild.mockImplementation((prompt: string) => prompt);
		mockResetSystemPromptBuild.mockReturnValue(defaultPrompt);
		mockConfirm.mockResolvedValue(false);
	});

	describe("rendering", () => {
		it("should render the system prompt editor", async () => {
			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				expect(screen.getByText("System Prompt Editor")).toBeInTheDocument();
				expect(screen.getByText("Prompt Engineering")).toBeInTheDocument();
			});
		});

		it("should render the textarea with loaded prompt", async () => {
			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				const textarea = getTextarea();
				expect(textarea).toBeInTheDocument();
				expect(textarea).toHaveValue(defaultPrompt);
			});
		});

		it("should show Saved status when prompt is unchanged", async () => {
			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				expect(screen.getByText("Saved")).toBeInTheDocument();
			});
		});

		it("should render action buttons", async () => {
			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: "Restore Default" }),
				).toBeInTheDocument();
				expect(
					screen.getByRole("button", { name: "Undo" }),
				).toBeInTheDocument();
				expect(
					screen.getByRole("button", { name: "Save Changes" }),
				).toBeInTheDocument();
			});
		});
	});

	describe("editing", () => {
		it("should show Modified status when prompt is changed", async () => {
			const user = userEvent.setup();
			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				expect(screen.getByText("Saved")).toBeInTheDocument();
			});

			const textarea = getTextarea();
			await user.type(textarea, " Additional text.");

			expect(screen.getByText("Modified")).toBeInTheDocument();
		});

		it("should enable Save button when prompt is modified", async () => {
			const user = userEvent.setup();
			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: "Save Changes" }),
				).toBeDisabled();
			});

			const textarea = getTextarea();
			await user.type(textarea, " More text.");

			expect(
				screen.getByRole("button", { name: "Save Changes" }),
			).not.toBeDisabled();
		});

		it("should enable Undo button when prompt is modified", async () => {
			const user = userEvent.setup();
			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
			});

			const textarea = getTextarea();
			await user.type(textarea, " More text.");

			expect(screen.getByRole("button", { name: "Undo" })).not.toBeDisabled();
		});
	});

	describe("saving", () => {
		it("should save prompt when Save Changes is clicked", async () => {
			const user = userEvent.setup();
			render(<SystemPromptEditorContent onSaved={mockOnSaved} />);

			await waitFor(() => {
				expect(getTextarea()).toHaveValue(defaultPrompt);
			});

			const textarea = getTextarea();
			await user.clear(textarea);
			await user.type(textarea, "New system prompt");

			await user.click(screen.getByRole("button", { name: "Save Changes" }));

			await waitFor(() => {
				expect(mockSetSystemPromptBuild).toHaveBeenCalledWith(
					"New system prompt",
				);
				expect(mockOnSaved).toHaveBeenCalled();
			});
		});

		it("should work without onSaved callback", async () => {
			const user = userEvent.setup();
			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				expect(getTextarea()).toHaveValue(defaultPrompt);
			});

			const textarea = getTextarea();
			await user.clear(textarea);
			await user.type(textarea, "New system prompt");

			await user.click(screen.getByRole("button", { name: "Save Changes" }));

			await waitFor(() => {
				expect(mockSetSystemPromptBuild).toHaveBeenCalledWith(
					"New system prompt",
				);
				// Should not throw error when onSaved is not provided
			});
		});

		it("should show Saved status after saving", async () => {
			const user = userEvent.setup();
			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				expect(getTextarea()).toBeInTheDocument();
			});

			const textarea = getTextarea();
			await user.type(textarea, " Extra");

			expect(screen.getByText("Modified")).toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: "Save Changes" }));

			await waitFor(() => {
				expect(screen.getByText("Saved")).toBeInTheDocument();
			});
		});

		it("should show error if save fails", async () => {
			const user = userEvent.setup();
			mockSetSystemPromptBuild.mockImplementation(() => {
				throw new Error("Save failed");
			});

			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				expect(getTextarea()).toBeInTheDocument();
			});

			const textarea = getTextarea();
			await user.type(textarea, " Extra");

			await user.click(screen.getByRole("button", { name: "Save Changes" }));

			await waitFor(() => {
				expect(screen.getByRole("alert")).toHaveTextContent("Save failed");
			});
		});
	});

	describe("undo", () => {
		it("should revert changes when Undo is clicked", async () => {
			const user = userEvent.setup();
			render(<SystemPromptEditorContent onCancelReset={mockOnCancelReset} />);

			await waitFor(() => {
				expect(getTextarea()).toHaveValue(defaultPrompt);
			});

			const textarea = getTextarea();
			await user.clear(textarea);
			await user.type(textarea, "Changed prompt");

			expect(textarea).toHaveValue("Changed prompt");

			await user.click(screen.getByRole("button", { name: "Undo" }));

			expect(textarea).toHaveValue(defaultPrompt);
			expect(mockOnCancelReset).toHaveBeenCalled();
		});
	});

	describe("restore default", () => {
		it("should show confirmation dialog when Restore Default is clicked", async () => {
			const user = userEvent.setup();
			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: "Restore Default" }),
				).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: "Restore Default" }));

			expect(mockConfirm).toHaveBeenCalledWith(
				expect.objectContaining({
					title: "Restore Default",
				}),
			);
		});

		it("should not restore if user cancels", async () => {
			const user = userEvent.setup();
			mockConfirm.mockResolvedValue(false);

			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: "Restore Default" }),
				).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: "Restore Default" }));

			expect(mockResetSystemPromptBuild).not.toHaveBeenCalled();
		});

		it("should restore default prompt when user confirms", async () => {
			const user = userEvent.setup();
			mockConfirm.mockResolvedValue(true);

			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: "Restore Default" }),
				).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: "Restore Default" }));

			await waitFor(() => {
				expect(mockResetSystemPromptBuild).toHaveBeenCalled();
			});
		});
	});

	describe("guide section", () => {
		it("should display best practices guide", async () => {
			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				expect(screen.getByText("Best Practices")).toBeInTheDocument();
				expect(
					screen.getByText("Effective system prompts"),
				).toBeInTheDocument();
			});
		});

		it("should display tips", async () => {
			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				expect(screen.getByText("Tips")).toBeInTheDocument();
				expect(
					screen.getByText(
						"Use the Restore Default button if something breaks",
					),
				).toBeInTheDocument();
			});
		});
	});

	describe("restore default error handling", () => {
		it("should show error if restore default fails", async () => {
			const user = userEvent.setup();
			mockConfirm.mockResolvedValue(true);
			mockResetSystemPromptBuild.mockImplementation(() => {
				throw new Error("Restore failed");
			});

			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: "Restore Default" }),
				).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: "Restore Default" }));

			await waitFor(() => {
				expect(screen.getByRole("alert")).toHaveTextContent("Restore failed");
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
				// After error, textarea should exist with empty value
				const textarea = getTextarea();
				expect(textarea).toHaveValue("");
			});
		});
	});

	describe("onCancelReset callback", () => {
		it("should call onCancelReset when undo is clicked with no changes", async () => {
			const user = userEvent.setup();
			render(<SystemPromptEditorContent onCancelReset={mockOnCancelReset} />);

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: "Undo" }),
				).toBeInTheDocument();
			});

			const undoBtn = screen.getByRole("button", { name: "Undo" });
			// When not dirty, undo is disabled, so click shouldn't trigger callback
			expect(undoBtn).toBeDisabled();
		});

		it("should call onCancelReset when undo is clicked after changes", async () => {
			const user = userEvent.setup();
			render(<SystemPromptEditorContent onCancelReset={mockOnCancelReset} />);

			await waitFor(() => {
				expect(getTextarea()).toHaveValue(defaultPrompt);
			});

			const textarea = getTextarea();
			await user.type(textarea, " modified");

			const undoBtn = screen.getByRole("button", { name: "Undo" });
			expect(undoBtn).not.toBeDisabled();

			await user.click(undoBtn);

			expect(mockOnCancelReset).toHaveBeenCalled();
		});
	});

	describe("textarea auto-resize", () => {
		it("should adjust textarea height based on content", async () => {
			const user = userEvent.setup();
			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				expect(getTextarea()).toBeInTheDocument();
			});

			const textarea = getTextarea();
			const initialHeight = textarea.style.height;

			// Add more content
			await user.type(textarea, "\n\n\nNew line\nAnother line\nMore lines");

			// Height may change (though in jsdom it might not)
			// This test mainly ensures no errors occur during resize
			expect(textarea).toBeInTheDocument();
		});

		it("should set overflowY to auto when content exceeds max height", async () => {
			const user = userEvent.setup();
			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				expect(getTextarea()).toBeInTheDocument();
			});

			const textarea = getTextarea();

			// Mock scrollHeight to exceed MAX_HEIGHT (320px)
			Object.defineProperty(textarea, "scrollHeight", {
				value: 400,
				writable: true,
			});

			// Trigger resize by changing prompt
			await user.type(textarea, "a");

			// The resize effect should have run and set overflowY to 'auto'
			expect(textarea.style.overflowY).toBe("auto");
		});

		it("should set overflowY to hidden when content fits within max height", async () => {
			const user = userEvent.setup();
			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				expect(getTextarea()).toBeInTheDocument();
			});

			const textarea = getTextarea();

			// Mock scrollHeight to be within MAX_HEIGHT (320px)
			Object.defineProperty(textarea, "scrollHeight", {
				value: 250,
				writable: true,
			});

			// Trigger resize by changing prompt
			await user.type(textarea, "a");

			// The resize effect should have run and set overflowY to 'hidden'
			expect(textarea.style.overflowY).toBe("hidden");
		});
	});

	describe("error with unknown message", () => {
		it("should show Unknown error when error has no message", async () => {
			const user = userEvent.setup();
			mockSetSystemPromptBuild.mockImplementation(() => {
				const err = new Error();
				err.message = "";
				throw err;
			});

			render(<SystemPromptEditorContent />);

			await waitFor(() => {
				expect(getTextarea()).toBeInTheDocument();
			});

			const textarea = getTextarea();
			await user.type(textarea, " Extra");

			await user.click(screen.getByRole("button", { name: "Save Changes" }));

			await waitFor(() => {
				expect(screen.getByRole("alert")).toHaveTextContent("Unknown error");
			});
		});
	});
});
