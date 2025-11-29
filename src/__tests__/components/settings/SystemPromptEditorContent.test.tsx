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
});
