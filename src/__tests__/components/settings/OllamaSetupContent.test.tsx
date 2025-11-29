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
});
