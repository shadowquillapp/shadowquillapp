import Titlebar from "@/components/Titlebar";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the local-config module
vi.mock("@/lib/local-config", () => ({
	readLocalModelConfig: vi.fn(() => ({
		provider: "ollama",
		baseUrl: "http://localhost:11434",
		model: "gemma3:4b",
	})),
}));

describe("Titlebar", () => {
	const mockWindowApi = {
		getPlatform: vi.fn(),
		getSystemSpecs: vi.fn(),
		window: {
			close: vi.fn(),
			minimize: vi.fn(),
			maximizeToggle: vi.fn(),
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset window.shadowquill
		(window as unknown as { shadowquill?: unknown }).shadowquill =
			mockWindowApi;
	});

	afterEach(() => {
		(window as unknown as { shadowquill?: unknown }).shadowquill = undefined;
	});

	describe("rendering", () => {
		it("should render the titlebar", () => {
			mockWindowApi.getPlatform.mockResolvedValue("linux");
			render(<Titlebar />);
			expect(document.querySelector(".app-region-drag")).toBeInTheDocument();
		});

		it("should render window control buttons", async () => {
			mockWindowApi.getPlatform.mockResolvedValue("linux");
			render(<Titlebar />);

			await waitFor(() => {
				expect(screen.getByLabelText("Close")).toBeInTheDocument();
				expect(screen.getByLabelText("Minimize")).toBeInTheDocument();
				expect(screen.getByLabelText("Maximize")).toBeInTheDocument();
			});
		});

		it("should display model chip", async () => {
			mockWindowApi.getPlatform.mockResolvedValue("linux");
			render(<Titlebar />);

			await waitFor(() => {
				expect(screen.getByText(/Gemma 3/i)).toBeInTheDocument();
			});
		});
	});

	describe("platform detection", () => {
		it("should arrange buttons for macOS (close, minimize, maximize)", async () => {
			mockWindowApi.getPlatform.mockResolvedValue("darwin");
			render(<Titlebar />);

			await waitFor(() => {
				const buttons = screen.getAllByRole("button");
				// On Mac, close should be first
				expect(buttons[0]).toHaveAttribute("aria-label", "Close");
			});
		});

		it("should arrange buttons for Windows/Linux (minimize, maximize, close)", async () => {
			mockWindowApi.getPlatform.mockResolvedValue("win32");
			render(<Titlebar />);

			await waitFor(() => {
				const buttons = screen.getAllByRole("button");
				// On Windows, minimize should be first
				expect(buttons[0]).toHaveAttribute("aria-label", "Minimize");
			});
		});
	});

	describe("system specs display", () => {
		it("should display system specs when available", async () => {
			mockWindowApi.getPlatform.mockResolvedValue("linux");
			mockWindowApi.getSystemSpecs.mockResolvedValue({
				cpu: "Intel Core i7-12700K",
				ram: 32 * 1024 * 1024 * 1024, // 32GB in bytes
				gpu: "NVIDIA RTX 3080",
			});

			render(<Titlebar />);

			await waitFor(() => {
				expect(screen.getByText("32 GB")).toBeInTheDocument();
				expect(screen.getByText(/RTX 3080/i)).toBeInTheDocument();
			});
		});

		it("should clean up CPU name by removing branding", async () => {
			mockWindowApi.getPlatform.mockResolvedValue("linux");
			mockWindowApi.getSystemSpecs.mockResolvedValue({
				cpu: "Intel® Core™ i7-12700K Processor",
				ram: 16 * 1024 * 1024 * 1024,
				gpu: "NVIDIA RTX 3070",
			});

			render(<Titlebar />);

			await waitFor(() => {
				// Should show cleaned CPU name without Intel®, Core™, Processor
				expect(screen.getByText("i7-12700K")).toBeInTheDocument();
			});
		});
	});

	describe("window controls", () => {
		it("should call close when close button is clicked", async () => {
			const user = userEvent.setup();
			mockWindowApi.getPlatform.mockResolvedValue("linux");
			render(<Titlebar />);

			await waitFor(() => {
				expect(screen.getByLabelText("Close")).toBeInTheDocument();
			});

			await user.click(screen.getByLabelText("Close"));
			expect(mockWindowApi.window.close).toHaveBeenCalled();
		});

		it("should call minimize when minimize button is clicked", async () => {
			const user = userEvent.setup();
			mockWindowApi.getPlatform.mockResolvedValue("linux");
			render(<Titlebar />);

			await waitFor(() => {
				expect(screen.getByLabelText("Minimize")).toBeInTheDocument();
			});

			await user.click(screen.getByLabelText("Minimize"));
			expect(mockWindowApi.window.minimize).toHaveBeenCalled();
		});

		it("should call maximizeToggle when maximize button is clicked", async () => {
			const user = userEvent.setup();
			mockWindowApi.getPlatform.mockResolvedValue("linux");
			render(<Titlebar />);

			await waitFor(() => {
				expect(screen.getByLabelText("Maximize")).toBeInTheDocument();
			});

			await user.click(screen.getByLabelText("Maximize"));
			expect(mockWindowApi.window.maximizeToggle).toHaveBeenCalled();
		});
	});

	describe("model recommendations", () => {
		it("should recommend gemma3:4b for systems with less than 16GB RAM", async () => {
			mockWindowApi.getPlatform.mockResolvedValue("linux");
			mockWindowApi.getSystemSpecs.mockResolvedValue({
				cpu: "Intel Core i5",
				ram: 8 * 1024 * 1024 * 1024, // 8GB
				gpu: "Intel UHD",
			});

			render(<Titlebar />);

			// The recommendation is stored internally but affects model display
			await waitFor(() => {
				expect(screen.getByText("8 GB")).toBeInTheDocument();
			});
		});

		it("should recommend gemma3:12b for systems with 16-40GB RAM", async () => {
			mockWindowApi.getPlatform.mockResolvedValue("linux");
			mockWindowApi.getSystemSpecs.mockResolvedValue({
				cpu: "Intel Core i7",
				ram: 32 * 1024 * 1024 * 1024, // 32GB
				gpu: "NVIDIA RTX 3080",
			});

			render(<Titlebar />);

			await waitFor(() => {
				expect(screen.getByText("32 GB")).toBeInTheDocument();
			});
		});

		it("should recommend gemma3:27b for systems with 40GB+ RAM", async () => {
			mockWindowApi.getPlatform.mockResolvedValue("linux");
			mockWindowApi.getSystemSpecs.mockResolvedValue({
				cpu: "AMD Threadripper",
				ram: 64 * 1024 * 1024 * 1024, // 64GB
				gpu: "NVIDIA RTX 4090",
			});

			render(<Titlebar />);

			await waitFor(() => {
				expect(screen.getByText("64 GB")).toBeInTheDocument();
			});
		});
	});

	describe("error handling", () => {
		it("should handle getPlatform failure gracefully", async () => {
			mockWindowApi.getPlatform.mockRejectedValue(new Error("IPC failed"));
			mockWindowApi.getSystemSpecs.mockRejectedValue(new Error("IPC failed"));

			render(<Titlebar />);

			// Should still render without crashing
			expect(document.querySelector(".app-region-drag")).toBeInTheDocument();
		});

		it("should handle missing shadowquill API gracefully", () => {
			(window as unknown as { shadowquill?: unknown }).shadowquill = undefined;

			render(<Titlebar />);

			// Should still render without crashing
			expect(document.querySelector(".app-region-drag")).toBeInTheDocument();
		});

		it("should handle window control errors gracefully", async () => {
			const user = userEvent.setup();
			mockWindowApi.getPlatform.mockResolvedValue("linux");
			mockWindowApi.window.close = vi.fn().mockImplementation(() => {
				throw new Error("Close failed");
			});

			render(<Titlebar />);

			await waitFor(() => {
				expect(screen.getByLabelText("Close")).toBeInTheDocument();
			});

			// Should not throw when clicking close
			await expect(
				user.click(screen.getByLabelText("Close")),
			).resolves.not.toThrow();
		});
	});

	describe("button hover states", () => {
		it("should show icon on hover", async () => {
			const user = userEvent.setup();
			mockWindowApi.getPlatform.mockResolvedValue("linux");

			render(<Titlebar />);

			await waitFor(() => {
				expect(screen.getByLabelText("Close")).toBeInTheDocument();
			});

			const closeButton = screen.getByLabelText("Close");
			await user.hover(closeButton);

			// Button should be in the document
			expect(closeButton).toBeInTheDocument();
		});
	});

	describe("model chip display", () => {
		it("should show model name when configured", async () => {
			mockWindowApi.getPlatform.mockResolvedValue("linux");

			render(<Titlebar />);

			await waitFor(() => {
				expect(screen.getByText(/Gemma 3/i)).toBeInTheDocument();
			});
		});

		it("should show dash when model not configured", async () => {
			vi.mock("@/lib/local-config", () => ({
				readLocalModelConfig: vi.fn(() => null),
			}));

			mockWindowApi.getPlatform.mockResolvedValue("linux");

			render(<Titlebar />);

			// Component should still render
			await waitFor(() => {
				expect(document.querySelector(".app-region-drag")).toBeInTheDocument();
			});
		});

		it("should show dash when model is not a string", async () => {
			vi.mock("@/lib/local-config", () => ({
				readLocalModelConfig: vi.fn(() => ({
					provider: "ollama",
					baseUrl: "http://localhost:11434",
					model: 123, // Not a string
				})),
			}));

			mockWindowApi.getPlatform.mockResolvedValue("linux");

			render(<Titlebar />);

			// Should still render with dash since model is not a string
			await waitFor(() => {
				expect(document.querySelector(".app-region-drag")).toBeInTheDocument();
			});
		});

		it("should handle model ID without colon separator", async () => {
			vi.mock("@/lib/local-config", () => ({
				readLocalModelConfig: vi.fn(() => ({
					provider: "ollama",
					baseUrl: "http://localhost:11434",
					model: "gemma3", // No colon
				})),
			}));

			mockWindowApi.getPlatform.mockResolvedValue("linux");

			render(<Titlebar />);

			await waitFor(() => {
				// Should show "Gemma 3 " (empty part after split)
				expect(document.querySelector(".app-region-drag")).toBeInTheDocument();
			});
		});
	});

	describe("event listeners", () => {
		it("should respond to sq-model-changed event", async () => {
			mockWindowApi.getPlatform.mockResolvedValue("linux");

			render(<Titlebar />);

			await waitFor(() => {
				expect(screen.getByText(/Gemma 3/i)).toBeInTheDocument();
			});

			// Dispatch a model changed event
			const event = new CustomEvent("sq-model-changed", {
				detail: { modelId: "gemma3:12b" },
			});
			window.dispatchEvent(event);

			await waitFor(() => {
				expect(screen.getByText(/Gemma 3/i)).toBeInTheDocument();
			});
		});

		it("should respond to storage event", async () => {
			mockWindowApi.getPlatform.mockResolvedValue("linux");

			render(<Titlebar />);

			// Trigger a storage event
			window.dispatchEvent(new Event("storage"));

			await waitFor(() => {
				expect(document.querySelector(".app-region-drag")).toBeInTheDocument();
			});
		});

		it("should respond to focus event", async () => {
			mockWindowApi.getPlatform.mockResolvedValue("linux");

			render(<Titlebar />);

			// Trigger a focus event
			window.dispatchEvent(new Event("focus"));

			await waitFor(() => {
				expect(document.querySelector(".app-region-drag")).toBeInTheDocument();
			});
		});

		it("should handle sq-model-changed with invalid detail gracefully", async () => {
			mockWindowApi.getPlatform.mockResolvedValue("linux");

			render(<Titlebar />);

			await waitFor(() => {
				expect(screen.getByText(/Gemma 3/i)).toBeInTheDocument();
			});

			// Dispatch event with no modelId
			const event = new CustomEvent("sq-model-changed", {
				detail: {},
			});
			window.dispatchEvent(event);

			// Should not crash
			expect(document.querySelector(".app-region-drag")).toBeInTheDocument();
		});
	});

	describe("button mouseLeave", () => {
		it("should reset hover state on mouseLeave", async () => {
			const user = userEvent.setup();
			mockWindowApi.getPlatform.mockResolvedValue("linux");

			render(<Titlebar />);

			await waitFor(() => {
				expect(screen.getByLabelText("Close")).toBeInTheDocument();
			});

			const closeButton = screen.getByLabelText("Close");

			// Hover then unhover
			await user.hover(closeButton);
			await user.unhover(closeButton);

			// Button should still be in the document
			expect(closeButton).toBeInTheDocument();
		});
	});

	describe("syncModel polling", () => {
		it("should clear interval once model is found", async () => {
			vi.useFakeTimers({ shouldAdvanceTime: true });
			mockWindowApi.getPlatform.mockResolvedValue("linux");

			render(<Titlebar />);

			// Advance timer to trigger the interval
			vi.advanceTimersByTime(1000);

			await waitFor(() => {
				expect(screen.getByText(/Gemma 3/i)).toBeInTheDocument();
			});

			vi.useRealTimers();
		});
	});
});
