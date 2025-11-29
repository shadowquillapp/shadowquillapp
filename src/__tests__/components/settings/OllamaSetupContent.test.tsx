import OllamaSetupContent from "@/components/settings/OllamaSetupContent";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock local-config
const mockReadLocalModelConfig = vi.fn();
const mockWriteLocalModelConfig = vi.fn();
const mockValidateLocalModelConnection = vi.fn();
const mockListAvailableModels = vi.fn();

vi.mock("@/lib/local-config", () => ({
	readLocalModelConfig: () => mockReadLocalModelConfig(),
	writeLocalModelConfig: (config: unknown) => mockWriteLocalModelConfig(config),
	validateLocalModelConnection: (config: unknown) =>
		mockValidateLocalModelConnection(config),
	listAvailableModels: (url: string) => mockListAvailableModels(url),
}));

describe("OllamaSetupContent", () => {
	const mockWindowApi = {
		checkOllamaInstalled: vi.fn(),
		openOllama: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		(window as unknown as { shadowquill?: unknown }).shadowquill =
			mockWindowApi;
		mockWindowApi.checkOllamaInstalled.mockResolvedValue({ installed: true });
		mockReadLocalModelConfig.mockReturnValue(null);
		mockListAvailableModels.mockRejectedValue(new Error("Not connected"));
	});

	afterEach(() => {
		(window as unknown as { shadowquill?: unknown }).shadowquill = undefined;
	});

	describe("rendering", () => {
		it("should render the Ollama setup form", () => {
			render(<OllamaSetupContent />);
			expect(screen.getByText("Secure Ollama bridge")).toBeInTheDocument();
			expect(screen.getByText("Local inference (Gemma 3)")).toBeInTheDocument();
		});

		it("should render port input field", () => {
			render(<OllamaSetupContent />);
			expect(
				screen.getByLabelText("Ollama localhost Port"),
			).toBeInTheDocument();
		});

		it("should render test connection button", () => {
			render(<OllamaSetupContent />);
			expect(
				screen.getByTitle("Check for available Ollama models"),
			).toBeInTheDocument();
		});

		it("should render save button", () => {
			render(<OllamaSetupContent />);
			expect(
				screen.getByRole("button", { name: /save changes/i }),
			).toBeInTheDocument();
		});

		it("should show checklist guide", () => {
			render(<OllamaSetupContent />);
			expect(screen.getByText("Checklist")).toBeInTheDocument();
			expect(screen.getByText("Ready your workstation")).toBeInTheDocument();
		});
	});

	describe("port input", () => {
		it("should default to port 11434", () => {
			render(<OllamaSetupContent />);
			const portInput = screen.getByLabelText("Ollama localhost Port");
			expect(portInput).toHaveValue("11434");
		});

		it("should only allow numeric input", async () => {
			const user = userEvent.setup();
			render(<OllamaSetupContent />);

			const portInput = screen.getByLabelText("Ollama localhost Port");
			await user.clear(portInput);
			await user.type(portInput, "abc123def");

			expect(portInput).toHaveValue("123");
		});

		it("should limit port to 5 digits", async () => {
			const user = userEvent.setup();
			render(<OllamaSetupContent />);

			const portInput = screen.getByLabelText("Ollama localhost Port");
			await user.clear(portInput);
			await user.type(portInput, "1234567890");

			expect(portInput).toHaveValue("12345");
		});

		it("should show normalized URL hint", async () => {
			const user = userEvent.setup();
			render(<OllamaSetupContent />);

			const portInput = screen.getByLabelText("Ollama localhost Port");
			await user.clear(portInput);
			await user.type(portInput, "8080");

			expect(screen.getByText("http://localhost:8080")).toBeInTheDocument();
		});

		it("should show error for invalid port", async () => {
			const user = userEvent.setup();
			render(<OllamaSetupContent />);

			const portInput = screen.getByLabelText("Ollama localhost Port");
			await user.clear(portInput);
			await user.type(portInput, "1");

			expect(
				screen.getByText("Enter a valid port (2-5 digits)."),
			).toBeInTheDocument();
		});
	});

	describe("connection testing", () => {
		it("should test connection when refresh button is clicked", async () => {
			const user = userEvent.setup();
			mockListAvailableModels.mockResolvedValue([
				{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
			]);

			render(<OllamaSetupContent />);

			await user.click(screen.getByTitle("Check for available Ollama models"));

			await waitFor(() => {
				expect(mockListAvailableModels).toHaveBeenCalledWith(
					"http://localhost:11434",
				);
			});
		});

		it("should show success status when connection succeeds", async () => {
			const user = userEvent.setup();
			mockListAvailableModels.mockResolvedValue([
				{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
			]);

			render(<OllamaSetupContent />);

			await user.click(screen.getByTitle("Check for available Ollama models"));

			await waitFor(() => {
				expect(screen.getByText("Connected")).toBeInTheDocument();
				expect(
					screen.getByText("Gemma 3 connection successful"),
				).toBeInTheDocument();
			});
		});

		it("should show error status when connection fails", async () => {
			const user = userEvent.setup();
			mockListAvailableModels.mockRejectedValue(new Error("Connection failed"));

			render(<OllamaSetupContent />);

			await user.click(screen.getByTitle("Check for available Ollama models"));

			await waitFor(() => {
				expect(screen.getByText("Needs attention")).toBeInTheDocument();
				// "Connection failed" appears in both title and body
				expect(screen.getAllByText("Connection failed").length).toBeGreaterThan(
					0,
				);
			});
		});

		it("should display available Gemma models", async () => {
			const user = userEvent.setup();
			mockListAvailableModels.mockResolvedValue([
				{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
				{ name: "gemma3:12b", size: 12 * 1024 * 1024 * 1024 },
			]);

			render(<OllamaSetupContent />);

			await user.click(screen.getByTitle("Check for available Ollama models"));

			await waitFor(() => {
				expect(screen.getByText("Gemma 3 4B")).toBeInTheDocument();
				expect(screen.getByText("Gemma 3 12B")).toBeInTheDocument();
			});
		});

		it("should show message when no Gemma models found", async () => {
			const user = userEvent.setup();
			mockListAvailableModels.mockResolvedValue([
				{ name: "llama2:7b", size: 7 * 1024 * 1024 * 1024 },
			]);

			render(<OllamaSetupContent />);

			await user.click(screen.getByTitle("Check for available Ollama models"));

			await waitFor(() => {
				expect(
					screen.getByText(/No Gemma 3 models detected/),
				).toBeInTheDocument();
			});
		});
	});

	describe("Open/Install Ollama", () => {
		it("should show Open Ollama button when Ollama is installed", async () => {
			const user = userEvent.setup();
			mockWindowApi.checkOllamaInstalled.mockResolvedValue({ installed: true });
			mockListAvailableModels.mockRejectedValue(new Error("Connection failed"));

			render(<OllamaSetupContent />);

			await user.click(screen.getByTitle("Check for available Ollama models"));

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /open ollama/i }),
				).toBeInTheDocument();
			});
		});

		it("should show Install Ollama button when Ollama is not installed", async () => {
			const user = userEvent.setup();
			mockWindowApi.checkOllamaInstalled.mockResolvedValue({
				installed: false,
			});
			mockListAvailableModels.mockRejectedValue(new Error("Connection failed"));

			render(<OllamaSetupContent />);

			await user.click(screen.getByTitle("Check for available Ollama models"));

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /install ollama/i }),
				).toBeInTheDocument();
			});
		});

		it("should open Ollama when button is clicked", async () => {
			const user = userEvent.setup();
			mockWindowApi.openOllama.mockResolvedValue({ ok: true });
			mockListAvailableModels.mockRejectedValue(new Error("Connection failed"));

			render(<OllamaSetupContent />);

			await user.click(screen.getByTitle("Check for available Ollama models"));

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /open ollama/i }),
				).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /open ollama/i }));

			expect(mockWindowApi.openOllama).toHaveBeenCalled();
		});
	});

	describe("form submission", () => {
		it("should save configuration when form is submitted", async () => {
			const user = userEvent.setup();
			mockListAvailableModels.mockResolvedValue([
				{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
			]);
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });

			render(<OllamaSetupContent />);

			// First test connection to enable save
			await user.click(screen.getByTitle("Check for available Ollama models"));

			await waitFor(() => {
				expect(screen.getByText("Connected")).toBeInTheDocument();
			});

			// Submit form
			await user.click(screen.getByRole("button", { name: /save changes/i }));

			await waitFor(() => {
				expect(mockWriteLocalModelConfig).toHaveBeenCalledWith({
					provider: "ollama",
					baseUrl: "http://localhost:11434",
					model: "gemma3:4b",
				});
			});
		});

		it("should disable save button when no model is selected", () => {
			render(<OllamaSetupContent />);
			expect(
				screen.getByRole("button", { name: /save changes/i }),
			).toBeDisabled();
		});

		it("should show validation error if connection fails after save", async () => {
			const user = userEvent.setup();
			mockListAvailableModels.mockResolvedValue([
				{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
			]);
			mockValidateLocalModelConnection.mockResolvedValue({
				ok: false,
				error: "model-not-found",
			});

			render(<OllamaSetupContent />);

			await user.click(screen.getByTitle("Check for available Ollama models"));

			await waitFor(() => {
				expect(screen.getByText("Connected")).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /save changes/i }));

			await waitFor(() => {
				expect(screen.getByRole("alert")).toHaveTextContent(/Model.*not found/);
			});
		});
	});

	describe("loading existing config", () => {
		it("should load existing config on mount", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:8080",
				model: "gemma3:12b",
			});
			mockListAvailableModels.mockResolvedValue([
				{ name: "gemma3:12b", size: 12 * 1024 * 1024 * 1024 },
			]);

			render(<OllamaSetupContent />);

			await waitFor(() => {
				const portInput = screen.getByLabelText("Ollama localhost Port");
				expect(portInput).toHaveValue("8080");
			});
		});
	});

	describe("normalizeToBaseUrl edge cases", () => {
		it("should handle localhost:port format", async () => {
			const user = userEvent.setup();
			mockListAvailableModels.mockResolvedValue([]);

			render(<OllamaSetupContent />);

			const portInput = screen.getByLabelText("Ollama localhost Port");
			await user.clear(portInput);
			// This will be filtered to just digits
			await user.type(portInput, "8080");

			expect(screen.getByText("http://localhost:8080")).toBeInTheDocument();
		});
	});

	describe("checkOllamaInstalled edge cases", () => {
		it("should handle missing checkOllamaInstalled API", async () => {
			(window as unknown as { shadowquill?: unknown }).shadowquill = {};

			render(<OllamaSetupContent />);

			// Should not throw and should render normally
			expect(screen.getByText("Secure Ollama bridge")).toBeInTheDocument();
		});

		it("should handle checkOllamaInstalled throwing error", async () => {
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});
			mockWindowApi.checkOllamaInstalled.mockRejectedValue(
				new Error("API error"),
			);

			render(<OllamaSetupContent />);

			await waitFor(() => {
				expect(consoleSpy).toHaveBeenCalledWith(
					"Failed to check Ollama installation:",
					expect.any(Error),
				);
			});

			consoleSpy.mockRestore();
		});
	});

	describe("handleOpenOrInstallOllama edge cases", () => {
		it("should open download page when Ollama is not installed", async () => {
			const user = userEvent.setup();
			const windowOpenSpy = vi
				.spyOn(window, "open")
				.mockImplementation(() => null);
			mockWindowApi.checkOllamaInstalled.mockResolvedValue({
				installed: false,
			});
			mockListAvailableModels.mockRejectedValue(new Error("Connection failed"));

			render(<OllamaSetupContent />);

			await user.click(screen.getByTitle("Check for available Ollama models"));

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /install ollama/i }),
				).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /install ollama/i }));

			expect(windowOpenSpy).toHaveBeenCalledWith(
				"https://ollama.com/download",
				"_blank",
			);

			windowOpenSpy.mockRestore();
		});

		it("should show error when openOllama API is not available", async () => {
			const user = userEvent.setup();
			(window as unknown as { shadowquill?: unknown }).shadowquill = {
				checkOllamaInstalled: vi.fn().mockResolvedValue({ installed: true }),
				// openOllama is not defined
			};
			mockListAvailableModels.mockRejectedValue(new Error("Connection failed"));

			render(<OllamaSetupContent />);

			await user.click(screen.getByTitle("Check for available Ollama models"));

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /open ollama/i }),
				).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /open ollama/i }));

			await waitFor(() => {
				expect(
					screen.getByText(/only available in the desktop app/i),
				).toBeInTheDocument();
			});
		});

		it("should handle openOllama returning error", async () => {
			const user = userEvent.setup();
			mockWindowApi.openOllama.mockResolvedValue({
				ok: false,
				error: "Ollama failed to start",
			});
			mockListAvailableModels.mockRejectedValue(new Error("Connection failed"));

			render(<OllamaSetupContent />);

			await user.click(screen.getByTitle("Check for available Ollama models"));

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /open ollama/i }),
				).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /open ollama/i }));

			await waitFor(() => {
				expect(screen.getByText("Ollama failed to start")).toBeInTheDocument();
			});
		});

		it("should handle openOllama throwing exception", async () => {
			const user = userEvent.setup();
			mockWindowApi.openOllama.mockRejectedValue(new Error("Unexpected error"));
			mockListAvailableModels.mockRejectedValue(new Error("Connection failed"));

			render(<OllamaSetupContent />);

			await user.click(screen.getByTitle("Check for available Ollama models"));

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /open ollama/i }),
				).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /open ollama/i }));

			await waitFor(() => {
				expect(screen.getByText("Unexpected error")).toBeInTheDocument();
			});
		});

		it("should retest connection after successfully opening Ollama", async () => {
			vi.useFakeTimers({ shouldAdvanceTime: true });
			const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
			mockWindowApi.openOllama.mockResolvedValue({ ok: true });
			mockListAvailableModels.mockRejectedValue(new Error("Connection failed"));

			render(<OllamaSetupContent />);

			await user.click(screen.getByTitle("Check for available Ollama models"));

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /open ollama/i }),
				).toBeInTheDocument();
			});

			mockListAvailableModels.mockClear();

			await user.click(screen.getByRole("button", { name: /open ollama/i }));

			// Advance time to trigger the setTimeout
			vi.advanceTimersByTime(3500);

			await waitFor(() => {
				expect(mockListAvailableModels).toHaveBeenCalled();
			});

			vi.useRealTimers();
		});

		it("should check Ollama installation if ollamaInstalled is null", async () => {
			const user = userEvent.setup();
			// Initially set to null by not calling checkOllamaInstalled
			(window as unknown as { shadowquill?: unknown }).shadowquill = {
				checkOllamaInstalled: vi.fn().mockResolvedValue({ installed: true }),
				openOllama: vi.fn().mockResolvedValue({ ok: true }),
			};
			mockListAvailableModels.mockRejectedValue(new Error("Connection failed"));

			render(<OllamaSetupContent />);

			await user.click(screen.getByTitle("Check for available Ollama models"));

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /open ollama/i }),
				).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /open ollama/i }));

			await waitFor(() => {
				expect(
					(
						window as unknown as {
							shadowquill: { checkOllamaInstalled: ReturnType<typeof vi.fn> };
						}
					).shadowquill.checkOllamaInstalled,
				).toHaveBeenCalled();
			});
		});
	});

	describe("form validation errors", () => {
		it("should show generic connection error after save", async () => {
			const user = userEvent.setup();
			mockListAvailableModels.mockResolvedValue([
				{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
			]);
			mockValidateLocalModelConnection.mockResolvedValue({
				ok: false,
				error: "unreachable",
			});

			render(<OllamaSetupContent />);

			await user.click(screen.getByTitle("Check for available Ollama models"));

			await waitFor(() => {
				expect(screen.getByText("Connected")).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /save changes/i }));

			await waitFor(() => {
				expect(screen.getByRole("alert")).toHaveTextContent("unreachable");
			});
		});

		it("should handle save throwing exception", async () => {
			const user = userEvent.setup();
			mockListAvailableModels.mockResolvedValue([
				{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
			]);
			mockWriteLocalModelConfig.mockImplementation(() => {
				throw new Error("Storage full");
			});

			render(<OllamaSetupContent />);

			await user.click(screen.getByTitle("Check for available Ollama models"));

			await waitFor(() => {
				expect(screen.getByText("Connected")).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /save changes/i }));

			await waitFor(() => {
				expect(screen.getByText("Storage full")).toBeInTheDocument();
			});
		});
	});

	describe("model display", () => {
		it("should display model size", async () => {
			const user = userEvent.setup();
			mockListAvailableModels.mockResolvedValue([
				{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
			]);

			render(<OllamaSetupContent />);

			await user.click(screen.getByTitle("Check for available Ollama models"));

			await waitFor(() => {
				expect(screen.getByText("4.0GB")).toBeInTheDocument();
			});
		});

		it("should show empty models message when connected but no Gemma models", async () => {
			const user = userEvent.setup();
			mockListAvailableModels.mockResolvedValue([]);

			render(<OllamaSetupContent />);

			await user.click(screen.getByTitle("Check for available Ollama models"));

			await waitFor(() => {
				expect(
					screen.getByText(/Gemma 3 models have not been pulled yet/),
				).toBeInTheDocument();
			});
		});
	});
});
