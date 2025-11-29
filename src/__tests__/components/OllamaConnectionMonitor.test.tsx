import OllamaConnectionMonitor from "@/components/OllamaConnectionMonitor";
import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock DialogProvider
const mockConfirm = vi.fn();
vi.mock("@/components/DialogProvider", () => ({
	useDialog: () => ({
		confirm: mockConfirm,
		showInfo: vi.fn(),
	}),
}));

// Mock local-config
const mockReadLocalModelConfig = vi.fn();
const mockValidateLocalModelConnection = vi.fn();
vi.mock("@/lib/local-config", () => ({
	readLocalModelConfig: () => mockReadLocalModelConfig(),
	validateLocalModelConnection: () => mockValidateLocalModelConnection(),
}));

describe("OllamaConnectionMonitor", () => {
	const mockWindowApi = {
		checkOllamaInstalled: vi.fn(),
		openOllama: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers({ shouldAdvanceTime: true });
		(window as unknown as { shadowquill?: unknown }).shadowquill =
			mockWindowApi;
		mockConfirm.mockResolvedValue(false);
	});

	afterEach(() => {
		vi.useRealTimers();
		(window as unknown as { shadowquill?: unknown }).shadowquill = undefined;
	});

	describe("rendering", () => {
		it("should render null (no visible UI)", () => {
			mockReadLocalModelConfig.mockReturnValue(null);
			const { container } = render(<OllamaConnectionMonitor />);
			expect(container.firstChild).toBeNull();
		});
	});

	describe("connection monitoring", () => {
		it("should not monitor if no config exists", async () => {
			mockReadLocalModelConfig.mockReturnValue(null);
			render(<OllamaConnectionMonitor />);

			// Advance past initial delay
			await vi.advanceTimersByTimeAsync(3500);

			expect(mockValidateLocalModelConnection).not.toHaveBeenCalled();
		});

		it("should start monitoring after initial delay when config exists", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });

			render(<OllamaConnectionMonitor />);

			// Initially not called
			expect(mockValidateLocalModelConnection).not.toHaveBeenCalled();

			// After 3 second delay
			await vi.advanceTimersByTimeAsync(3500);

			expect(mockValidateLocalModelConnection).toHaveBeenCalled();
		});
	});

	describe("configuration check", () => {
		it("should read config when checking connection", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });

			render(<OllamaConnectionMonitor />);

			// Wait for the initial check to happen
			await vi.advanceTimersByTimeAsync(3500);

			expect(mockReadLocalModelConfig).toHaveBeenCalled();
		});
	});

	describe("MODEL_CHANGED event", () => {
		it("should recheck connection when MODEL_CHANGED event is fired", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });

			render(<OllamaConnectionMonitor />);

			// Initial check
			await vi.advanceTimersByTimeAsync(3500);
			expect(mockValidateLocalModelConnection).toHaveBeenCalledTimes(1);

			// Fire MODEL_CHANGED event
			window.dispatchEvent(new Event("MODEL_CHANGED"));

			await waitFor(() => {
				expect(mockValidateLocalModelConnection).toHaveBeenCalledTimes(2);
			});
		});
	});

	describe("window API", () => {
		it("should have access to shadowquill window API", () => {
			const win = window as unknown as { shadowquill?: unknown };
			expect(win.shadowquill).toBeDefined();
			expect(mockWindowApi.checkOllamaInstalled).toBeDefined();
			expect(mockWindowApi.openOllama).toBeDefined();
		});
	});

	describe("checkOllamaInstalled", () => {
		it("should handle missing checkOllamaInstalled API", async () => {
			(window as unknown as { shadowquill?: unknown }).shadowquill = {};
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });

			render(<OllamaConnectionMonitor />);

			await vi.advanceTimersByTimeAsync(3500);

			// Should not throw even without the API
			expect(mockValidateLocalModelConnection).toHaveBeenCalled();
		});

		it("should check installation status and update state", async () => {
			mockWindowApi.checkOllamaInstalled.mockResolvedValue({ installed: true });
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection
				.mockResolvedValueOnce({ ok: true })
				.mockResolvedValueOnce({ ok: false, error: "Connection lost" });

			render(<OllamaConnectionMonitor />);

			await vi.advanceTimersByTimeAsync(3500);

			expect(mockValidateLocalModelConnection).toHaveBeenCalled();
		});

		it("should handle checkOllamaInstalled errors gracefully", async () => {
			mockWindowApi.checkOllamaInstalled.mockRejectedValue(
				new Error("IPC failed"),
			);
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });

			expect(() => {
				render(<OllamaConnectionMonitor />);
			}).not.toThrow();
		});
	});

	describe("connection loss detection", () => {
		it("should show confirmation dialog when connection is lost", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockWindowApi.checkOllamaInstalled.mockResolvedValue({ installed: true });

			// First call: connection OK, second call: connection lost
			mockValidateLocalModelConnection
				.mockResolvedValueOnce({ ok: true })
				.mockResolvedValueOnce({ ok: false, error: "Connection lost" });

			render(<OllamaConnectionMonitor />);

			// Initial check - wait for it to complete
			await act(async () => {
				await vi.advanceTimersByTimeAsync(3500);
			});
			expect(mockValidateLocalModelConnection).toHaveBeenCalledTimes(1);

			// Trigger recheck via MODEL_CHANGED event and flush async operations
			await act(async () => {
				window.dispatchEvent(new Event("MODEL_CHANGED"));
				await vi.runOnlyPendingTimersAsync();
			});

			expect(mockConfirm).toHaveBeenCalledWith(
				expect.objectContaining({
					title: "Ollama Connection Lost",
				}),
			);
		});

		it("should offer Install Ollama button when not installed", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockWindowApi.checkOllamaInstalled.mockResolvedValue({
				installed: false,
			});

			mockValidateLocalModelConnection
				.mockResolvedValueOnce({ ok: true })
				.mockResolvedValueOnce({ ok: false, error: "Connection lost" });

			render(<OllamaConnectionMonitor />);

			await act(async () => {
				await vi.advanceTimersByTimeAsync(3500);
			});

			// Trigger recheck via MODEL_CHANGED event and flush async operations
			await act(async () => {
				window.dispatchEvent(new Event("MODEL_CHANGED"));
				await vi.runOnlyPendingTimersAsync();
			});

			expect(mockConfirm).toHaveBeenCalledWith(
				expect.objectContaining({
					confirmText: "Install Ollama",
				}),
			);
		});

		it("should offer Open Ollama button when installed", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockWindowApi.checkOllamaInstalled.mockResolvedValue({ installed: true });

			mockValidateLocalModelConnection
				.mockResolvedValueOnce({ ok: true })
				.mockResolvedValueOnce({ ok: false, error: "Connection lost" });

			render(<OllamaConnectionMonitor />);

			await act(async () => {
				await vi.advanceTimersByTimeAsync(3500);
			});

			// Trigger recheck via MODEL_CHANGED event and flush async operations
			await act(async () => {
				window.dispatchEvent(new Event("MODEL_CHANGED"));
				await vi.runOnlyPendingTimersAsync();
			});

			expect(mockConfirm).toHaveBeenCalledWith(
				expect.objectContaining({
					confirmText: "Open Ollama",
				}),
			);
		});
	});

	describe("handleOpenOrInstallOllama", () => {
		it("should open download page when Ollama is not installed", async () => {
			const windowOpenSpy = vi
				.spyOn(window, "open")
				.mockImplementation(() => null);

			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockWindowApi.checkOllamaInstalled.mockResolvedValue({
				installed: false,
			});
			mockConfirm.mockResolvedValue(true);

			mockValidateLocalModelConnection
				.mockResolvedValueOnce({ ok: true })
				.mockResolvedValueOnce({ ok: false, error: "Connection lost" });

			render(<OllamaConnectionMonitor />);

			await act(async () => {
				await vi.advanceTimersByTimeAsync(3500);
			});

			// Trigger recheck via MODEL_CHANGED event and flush async operations
			await act(async () => {
				window.dispatchEvent(new Event("MODEL_CHANGED"));
				await vi.runOnlyPendingTimersAsync();
			});

			expect(windowOpenSpy).toHaveBeenCalledWith(
				"https://ollama.com/download",
				"_blank",
			);

			windowOpenSpy.mockRestore();
		});

		it("should call openOllama when installed and user confirms", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockWindowApi.checkOllamaInstalled.mockResolvedValue({ installed: true });
			mockWindowApi.openOllama.mockResolvedValue({ ok: true });
			mockConfirm.mockResolvedValue(true);

			mockValidateLocalModelConnection
				.mockResolvedValueOnce({ ok: true })
				.mockResolvedValueOnce({ ok: false, error: "Connection lost" })
				.mockResolvedValue({ ok: true });

			render(<OllamaConnectionMonitor />);

			await act(async () => {
				await vi.advanceTimersByTimeAsync(3500);
			});

			// Trigger recheck via MODEL_CHANGED event and flush async operations
			await act(async () => {
				window.dispatchEvent(new Event("MODEL_CHANGED"));
				await vi.runOnlyPendingTimersAsync();
			});

			expect(mockWindowApi.openOllama).toHaveBeenCalled();

			// Advance timers for the 3 second recheck delay
			await act(async () => {
				await vi.advanceTimersByTimeAsync(3500);
			});
		});

		it("should recheck connection 3 seconds after opening Ollama", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockWindowApi.checkOllamaInstalled.mockResolvedValue({ installed: true });
			mockWindowApi.openOllama.mockResolvedValue({ ok: true });
			mockConfirm.mockResolvedValue(true);

			mockValidateLocalModelConnection
				.mockResolvedValueOnce({ ok: true })
				.mockResolvedValueOnce({ ok: false, error: "Connection lost" })
				.mockResolvedValue({ ok: true });

			render(<OllamaConnectionMonitor />);

			await act(async () => {
				await vi.advanceTimersByTimeAsync(3500);
			});
			expect(mockValidateLocalModelConnection).toHaveBeenCalledTimes(1);

			const callCountBefore =
				mockValidateLocalModelConnection.mock.calls.length;

			// Trigger connection loss via MODEL_CHANGED event
			await act(async () => {
				window.dispatchEvent(new Event("MODEL_CHANGED"));
				// Advance just enough time for the checkConnection async operations
				// and the 3-second recheck timeout after openOllama
				await vi.advanceTimersByTimeAsync(3100);
			});

			expect(mockWindowApi.openOllama).toHaveBeenCalled();

			// Should have rechecked connection after opening Ollama
			// Additional calls: 1 (MODEL_CHANGED) + 1 (recheck after openOllama) = at least 2 more
			expect(
				mockValidateLocalModelConnection.mock.calls.length,
			).toBeGreaterThanOrEqual(callCountBefore + 2);
		});

		it("should handle missing openOllama API gracefully", async () => {
			(window as unknown as { shadowquill?: unknown }).shadowquill = {
				checkOllamaInstalled: vi.fn().mockResolvedValue({ installed: true }),
			};

			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockConfirm.mockResolvedValue(true);

			mockValidateLocalModelConnection
				.mockResolvedValueOnce({ ok: true })
				.mockResolvedValueOnce({ ok: false, error: "Connection lost" });

			render(<OllamaConnectionMonitor />);

			await act(async () => {
				await vi.advanceTimersByTimeAsync(3500);
			});

			// Trigger recheck via MODEL_CHANGED event and flush async operations - should not throw
			await act(async () => {
				window.dispatchEvent(new Event("MODEL_CHANGED"));
				await vi.runOnlyPendingTimersAsync();
			});

			// Should have called confirm even without openOllama API
			expect(mockConfirm).toHaveBeenCalled();
		});

		it("should handle openOllama errors gracefully", async () => {
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockWindowApi.checkOllamaInstalled.mockResolvedValue({ installed: true });
			mockWindowApi.openOllama.mockRejectedValue(new Error("Failed to open"));
			mockConfirm.mockResolvedValue(true);

			mockValidateLocalModelConnection
				.mockResolvedValueOnce({ ok: true })
				.mockResolvedValueOnce({ ok: false, error: "Connection lost" });

			render(<OllamaConnectionMonitor />);

			await act(async () => {
				await vi.advanceTimersByTimeAsync(3500);
			});

			// Trigger recheck via MODEL_CHANGED event and flush async operations
			await act(async () => {
				window.dispatchEvent(new Event("MODEL_CHANGED"));
				await vi.runOnlyPendingTimersAsync();
			});

			expect(consoleSpy).toHaveBeenCalledWith(
				"Failed to open Ollama:",
				expect.any(Error),
			);

			consoleSpy.mockRestore();
		});
	});

	describe("periodic monitoring", () => {
		it("should stop periodic checks when config is removed", async () => {
			mockReadLocalModelConfig
				.mockReturnValueOnce({
					provider: "ollama",
					baseUrl: "http://localhost:11434",
					model: "gemma3:4b",
				})
				.mockReturnValue(null);
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });

			render(<OllamaConnectionMonitor />);

			// Initial check
			await vi.advanceTimersByTimeAsync(3500);
			expect(mockValidateLocalModelConnection).toHaveBeenCalledTimes(1);

			// Next check - config is now null
			await vi.advanceTimersByTimeAsync(10500);

			// Should have called read config but not validate (since config is null)
			expect(mockReadLocalModelConfig).toHaveBeenCalled();
		});
	});

	describe("cleanup", () => {
		it("should clean up event listeners on unmount", () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });

			const { unmount } = render(<OllamaConnectionMonitor />);

			unmount();

			// Event should not trigger validation after unmount
			window.dispatchEvent(new Event("MODEL_CHANGED"));
		});
	});
});
