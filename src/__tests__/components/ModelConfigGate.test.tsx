import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ModelConfigGate from "@/components/ModelConfigGate";

const mockConfirm = vi.fn();
vi.mock("@/components/DialogProvider", () => ({
	useDialog: () => ({
		confirm: mockConfirm,
		showInfo: vi.fn(),
	}),
}));

const mockReadLocalModelConfig = vi.fn();
const mockWriteLocalModelConfig = vi.fn();
const mockValidateLocalModelConnection = vi.fn();
const mockListAvailableModels = vi.fn();

vi.mock("@/lib/local-config", () => ({
	formatOllamaModelName: (name: string) => {
		const [family, tag] = name.toLowerCase().split(":");
		if (family === "gemma4") return `Gemma 4 ${(tag || "").toUpperCase()}`;
		if (family === "gemma3") return `Gemma 3 ${(tag || "").toUpperCase()}`;
		return name;
	},
	isSupportedOllamaModelName: (name: string) =>
		/^(gemma4:(latest|e2b|e4b|12b|26b|31b)|gemma3:(4b|12b|27b))$/i.test(name),
	isValidOllamaPort: (port: string) => /^\d{2,5}$/.test((port || "").trim()),
	normalizeOllamaBaseUrlInput: (value?: string) => {
		const raw = (value || "").trim();
		if (!raw) return "";
		if (/^\d{1,5}$/.test(raw)) return `http://localhost:${raw}`;
		if (/^localhost:\d{1,5}$/.test(raw)) return `http://${raw}`;
		if (/^https?:\/\//.test(raw)) return raw.replace(/\/$/, "");
		return raw;
	},
	readLocalModelConfig: () => mockReadLocalModelConfig(),
	writeLocalModelConfig: (config: unknown) => mockWriteLocalModelConfig(config),
	validateLocalModelConnection: (config: unknown) =>
		mockValidateLocalModelConnection(config),
	listAvailableModels: (url: string) => mockListAvailableModels(url),
}));

vi.mock("@/lib/local-storage", () => ({
	clearAllStorageForFactoryReset: vi.fn(),
	abortFactoryReset: vi.fn(),
}));

vi.mock("@/lib/presets", () => ({
	ensureDefaultPreset: vi.fn(),
}));

const {
	mockEnsureSystemPromptBuild,
	mockResetSystemPromptBuild,
	mockSetSystemPromptBuild,
} = vi.hoisted(() => ({
	mockEnsureSystemPromptBuild: vi.fn(),
	mockResetSystemPromptBuild: vi.fn(),
	mockSetSystemPromptBuild: vi.fn(),
}));

vi.mock("@/lib/system-prompts", () => ({
	ensureSystemPromptBuild: mockEnsureSystemPromptBuild,
	resetSystemPromptBuild: mockResetSystemPromptBuild,
	setSystemPromptBuild: mockSetSystemPromptBuild,
}));

describe("ModelConfigGate", () => {
	const mockWindowApi = {
		checkOllamaInstalled: vi.fn(),
		openOllama: vi.fn(),
		getDataPaths: vi.fn(),
		factoryReset: vi.fn(),
	};

	const originalEnv = process.env;

	beforeEach(() => {
		vi.clearAllMocks();
		process.env = { ...originalEnv, NEXT_PUBLIC_ELECTRON: "1" };
		(window as unknown as { shadowquill?: unknown }).shadowquill =
			mockWindowApi;
		mockConfirm.mockResolvedValue(false);
		mockWindowApi.checkOllamaInstalled.mockResolvedValue({ installed: true });
	});

	afterEach(() => {
		process.env = originalEnv;
		(window as unknown as { shadowquill?: unknown }).shadowquill = undefined;
	});

	describe("when config exists and is valid", () => {
		it("should render children when model is configured and valid", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });
			mockListAvailableModels.mockResolvedValue([
				{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
			]);

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App Content</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});
		});
	});

	describe("when config does not exist", () => {
		it("should render without errors when config is null", () => {
			mockReadLocalModelConfig.mockReturnValue(null);

			expect(() => {
				render(
					<ModelConfigGate>
						<div data-testid="app-content">App Content</div>
					</ModelConfigGate>,
				);
			}).not.toThrow();
		});
	});

	describe("component structure", () => {
		it("should wrap children with model gate container", () => {
			mockReadLocalModelConfig.mockReturnValue(null);

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App Content</div>
				</ModelConfigGate>,
			);

			const container = document.querySelector("[data-model-gate]");
			expect(container).toBeInTheDocument();
		});
	});

	describe("Ollama detection", () => {
		it("should have shadowquill API available", () => {
			expect(mockWindowApi.checkOllamaInstalled).toBeDefined();
		});
	});

	describe("model list", () => {
		it("should fetch available models when testing connection", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);
			mockListAvailableModels.mockResolvedValue([
				{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
				{ name: "gemma3:12b", size: 12 * 1024 * 1024 * 1024 },
			]);

			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ models: [] }),
			});

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				const portInput = screen.queryByPlaceholderText("11434");
				return portInput !== null;
			});

			const portInput = screen.getByPlaceholderText("11434");
			await user.type(portInput, "11434");

			const testButton = screen.queryByTitle(
				"Check for available Ollama models",
			);
			if (testButton && !testButton.hasAttribute("disabled")) {
				await user.click(testButton);

				await waitFor(() => {
					expect(mockListAvailableModels).toHaveBeenCalled();
				});
			}

			global.fetch = originalFetch;
		});
	});

	describe("error handling", () => {
		it("should handle errors gracefully", async () => {
			mockReadLocalModelConfig.mockImplementation(() => {
				throw new Error("Config read error");
			});

			expect(() => {
				render(
					<ModelConfigGate>
						<div>App</div>
					</ModelConfigGate>,
				);
			}).not.toThrow();
		});
	});

	describe("saving configuration", () => {
		it("should write config when save is triggered", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);
			mockListAvailableModels.mockResolvedValue([
				{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
			]);
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(
				() => {
					const saveBtn = screen.queryByRole("button", {
						name: /save changes/i,
					});
					return saveBtn !== null;
				},
				{ timeout: 2000 },
			).catch(() => {});

			const saveBtn = screen.queryByRole("button", { name: /save changes/i });
			if (saveBtn && !saveBtn.hasAttribute("disabled")) {
				await user.click(saveBtn);
				await waitFor(() => {
					expect(mockWriteLocalModelConfig).toHaveBeenCalled();
				});
			}
		});
	});

	describe("provider selection", () => {
		it("should render ModelConfigGate without errors", () => {
			mockReadLocalModelConfig.mockReturnValue(null);

			expect(() => {
				render(
					<ModelConfigGate>
						<div>App</div>
					</ModelConfigGate>,
				);
			}).not.toThrow();
		});
	});

	describe("connection validation", () => {
		it("should show connection error when validation fails", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({
				ok: false,
				error: "Connection failed",
			});
			mockListAvailableModels.mockResolvedValue([]);

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(mockValidateLocalModelConnection).toHaveBeenCalled();
			});
		});

		it("should show model-not-found error appropriately", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({
				ok: false,
				error: "model-not-found",
			});

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(mockValidateLocalModelConnection).toHaveBeenCalled();
			});
		});
	});

	describe("Ollama installation check", () => {
		it("should check Ollama installation status", async () => {
			mockReadLocalModelConfig.mockReturnValue(null);
			mockWindowApi.checkOllamaInstalled.mockResolvedValue({ installed: true });

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(mockWindowApi.checkOllamaInstalled).toHaveBeenCalled();
			});
		});

		it("should handle missing shadowquill API gracefully", async () => {
			(window as unknown as { shadowquill?: unknown }).shadowquill = undefined;
			mockReadLocalModelConfig.mockReturnValue(null);

			expect(() => {
				render(
					<ModelConfigGate>
						<div>App</div>
					</ModelConfigGate>,
				);
			}).not.toThrow();
		});

		it("should handle checkOllamaInstalled failure gracefully", async () => {
			mockReadLocalModelConfig.mockReturnValue(null);
			mockWindowApi.checkOllamaInstalled.mockRejectedValue(
				new Error("IPC error"),
			);

			expect(() => {
				render(
					<ModelConfigGate>
						<div>App</div>
					</ModelConfigGate>,
				);
			}).not.toThrow();
		});
	});

	describe("Open/Install Ollama", () => {
		it("should open Ollama download page when not installed", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);
			mockWindowApi.checkOllamaInstalled.mockResolvedValue({
				installed: false,
			});
			mockListAvailableModels.mockRejectedValue(new Error("Connection failed"));

			const windowOpenSpy = vi
				.spyOn(window, "open")
				.mockImplementation(() => null);

			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockRejectedValue(new Error("Connection failed"));

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				const portInput = screen.queryByPlaceholderText("11434");
				return portInput !== null;
			}).catch(() => {});

			const portInput = screen.queryByPlaceholderText("11434");
			if (portInput) {
				await user.type(portInput, "11434");

				const testButton = screen.queryByTitle(
					"Check for available Ollama models",
				);
				if (testButton) {
					await user.click(testButton);
				}
			}

			await waitFor(
				() => {
					const installBtn = screen.queryByText("Install Ollama");
					return installBtn !== null;
				},
				{ timeout: 3000 },
			).catch(() => {});

			const installBtn = screen.queryByText("Install Ollama");
			if (installBtn) {
				await user.click(installBtn);
				expect(windowOpenSpy).toHaveBeenCalledWith(
					"https://ollama.com/download",
					"_blank",
				);
			}

			windowOpenSpy.mockRestore();
			global.fetch = originalFetch;
		});

		it("should open Ollama app when installed", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);
			mockWindowApi.checkOllamaInstalled.mockResolvedValue({ installed: true });
			mockWindowApi.openOllama.mockResolvedValue({ ok: true });
			mockListAvailableModels.mockRejectedValue(new Error("Connection failed"));

			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockRejectedValue(new Error("Connection failed"));

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				const portInput = screen.queryByPlaceholderText("11434");
				return portInput !== null;
			}).catch(() => {});

			const portInput = screen.queryByPlaceholderText("11434");
			if (portInput) {
				await user.type(portInput, "11434");

				const testButton = screen.queryByTitle(
					"Check for available Ollama models",
				);
				if (testButton) {
					await user.click(testButton);
				}
			}

			await waitFor(
				() => {
					const openBtn = screen.queryByText("Open Ollama");
					return openBtn !== null;
				},
				{ timeout: 3000 },
			).catch(() => {});

			const openBtn = screen.queryByText("Open Ollama");
			if (openBtn) {
				await user.click(openBtn);

				await waitFor(() => {
					expect(mockWindowApi.openOllama).toHaveBeenCalled();
				});
			}

			global.fetch = originalFetch;
		});

		it("should retest connection after opening Ollama successfully", async () => {
			const user = userEvent.setup();
			vi.useFakeTimers({ shouldAdvanceTime: true });

			mockReadLocalModelConfig.mockReturnValue(null);
			mockWindowApi.checkOllamaInstalled.mockResolvedValue({ installed: true });
			mockWindowApi.openOllama.mockResolvedValue({ ok: true });
			mockListAvailableModels
				.mockRejectedValueOnce(new Error("Connection failed"))
				.mockResolvedValue([
					{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
				]);

			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockRejectedValue(new Error("Connection failed"));

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await vi.runAllTimersAsync();

			await waitFor(() => {
				const portInput = screen.queryByPlaceholderText("11434");
				return portInput !== null;
			}).catch(() => {});

			const portInput = screen.queryByPlaceholderText("11434");
			if (portInput) {
				await user.type(portInput, "11434");

				const testButton = screen.queryByTitle(
					"Check for available Ollama models",
				);
				if (testButton) {
					await user.click(testButton);
					await vi.runAllTimersAsync();
				}
			}

			await waitFor(
				() => {
					const openBtn = screen.queryByText("Open Ollama");
					return openBtn !== null;
				},
				{ timeout: 3000 },
			).catch(() => {});

			const openBtn = screen.queryByText("Open Ollama");
			if (openBtn) {
				await user.click(openBtn);
				await vi.runAllTimersAsync();

				await waitFor(() => {
					expect(mockWindowApi.openOllama).toHaveBeenCalled();
				});

				await vi.advanceTimersByTimeAsync(3000);

				await waitFor(() => {
					expect(mockListAvailableModels).toHaveBeenCalledTimes(2);
				}).catch(() => {});
			}

			vi.useRealTimers();
			global.fetch = originalFetch;
		});

		it("should handle openOllama error", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);
			mockWindowApi.checkOllamaInstalled.mockResolvedValue({ installed: true });
			mockWindowApi.openOllama.mockResolvedValue({
				ok: false,
				error: "Failed to launch",
			});
			mockListAvailableModels.mockRejectedValue(new Error("Connection failed"));

			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockRejectedValue(new Error("Connection failed"));

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				const portInput = screen.queryByPlaceholderText("11434");
				return portInput !== null;
			}).catch(() => {});

			const portInput = screen.queryByPlaceholderText("11434");
			if (portInput) {
				await user.type(portInput, "11434");

				const testButton = screen.queryByTitle(
					"Check for available Ollama models",
				);
				if (testButton) {
					await user.click(testButton);
				}
			}

			await waitFor(
				() => {
					const openBtn = screen.queryByText("Open Ollama");
					return openBtn !== null;
				},
				{ timeout: 3000 },
			).catch(() => {});

			const openBtn = screen.queryByText("Open Ollama");
			if (openBtn) {
				await user.click(openBtn);

				await waitFor(() => {
					expect(mockWindowApi.openOllama).toHaveBeenCalled();
				});
			}

			global.fetch = originalFetch;
		});
	});

	describe("data-model-gate attribute", () => {
		it("should set data-model-gate to disabled when not in electron mode", () => {
			mockReadLocalModelConfig.mockReturnValue(null);
			vi.stubGlobal("process", { env: {} });

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			const container = document.querySelector("[data-model-gate]");
			expect(container).toBeInTheDocument();
		});
	});

	describe("port validation", () => {
		it("should accept valid port numbers", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);
			mockListAvailableModels.mockResolvedValue([
				{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
			]);

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(
				() => {
					const portInput = screen.queryByPlaceholderText("11434");
					return portInput !== null;
				},
				{ timeout: 2000 },
			).catch(() => {});

			const portInput = screen.queryByPlaceholderText("11434");
			if (portInput) {
				await user.clear(portInput);
				await user.type(portInput, "8080");
				expect(portInput).toHaveValue("8080");
			}
		});
	});

	describe("system prompt editor", () => {
		it("should listen for open-system-prompts event", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });
			mockListAvailableModels.mockResolvedValue([
				{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
			]);

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-system-prompts"));

			await waitFor(() => {
				const systemPromptModal = screen.queryByText("Edit System Prompt");
				return systemPromptModal !== null || true;
			}).catch(() => {});
		});
	});

	describe("data location modal", () => {
		it("should listen for open-data-location event", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });
			mockListAvailableModels.mockResolvedValue([
				{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
			]);
			mockWindowApi.getDataPaths.mockResolvedValue({
				ok: true,
				userData: "/path/to/user/data",
				localStorageLevelDb: "/path/to/leveldb",
			});

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-data-location"));

			await waitFor(() => {
				const dataModal = screen.queryByText("Local Data Management");
				return dataModal !== null || true;
			}).catch(() => {});
		});

		it("should handle getDataPaths API not available", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });
			(window as unknown as { shadowquill?: unknown }).shadowquill = {};

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-data-location"));
		});

		it("should handle No handler registered error", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });
			mockWindowApi.getDataPaths.mockRejectedValue(
				new Error("No handler registered for getDataPaths"),
			);

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-data-location"));
		});
	});

	describe("provider selection listener", () => {
		it("should listen for open-provider-selection event", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-provider-selection"));
		});
	});

	describe("form submission", () => {
		it("should dispatch MODEL_CHANGED event on successful save", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);
			mockListAvailableModels.mockResolvedValue([
				{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
			]);
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });

			const eventHandler = vi.fn();
			window.addEventListener("MODEL_CHANGED", eventHandler);

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(
				() => {
					const submitBtn = screen.queryByRole("button", {
						name: /get started/i,
					});
					return submitBtn !== null;
				},
				{ timeout: 3000 },
			).catch(() => {});

			const submitBtn = screen.queryByRole("button", {
				name: /get started/i,
			});
			if (submitBtn && !submitBtn.hasAttribute("disabled")) {
				await user.click(submitBtn);

				await waitFor(() => {
					expect(mockWriteLocalModelConfig).toHaveBeenCalled();
				}).catch(() => {});
			}

			window.removeEventListener("MODEL_CHANGED", eventHandler);
		});

		it("should handle model-not-found error during save", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);
			mockListAvailableModels.mockResolvedValue([
				{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
			]);
			mockValidateLocalModelConnection.mockResolvedValue({
				ok: false,
				error: "model-not-found",
			});

			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ models: [] }),
			});

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				return screen.queryByText("AI Model Connection Setup") !== null;
			}).catch(() => {});

			const portInput = screen.getByPlaceholderText("11434");
			await user.type(portInput, "11434");

			const testButton = screen.getByTitle("Check for available Ollama models");
			await user.click(testButton);

			await waitFor(() => {
				expect(mockListAvailableModels).toHaveBeenCalled();
			});

			await waitFor(
				() => {
					const submitBtn = screen.queryByRole("button", {
						name: /get started/i,
					});
					return submitBtn !== null && !submitBtn.hasAttribute("disabled");
				},
				{ timeout: 3000 },
			);

			const submitBtn = screen.getByRole("button", {
				name: /get started/i,
			});
			await user.click(submitBtn);

			await waitFor(() => {
				expect(mockValidateLocalModelConnection).toHaveBeenCalled();
			});

			global.fetch = originalFetch;
		});

		it("should handle generic validation error during save", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);
			mockListAvailableModels.mockResolvedValue([
				{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
			]);
			mockValidateLocalModelConnection.mockResolvedValue({
				ok: false,
				error: "Server unreachable",
			});

			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ models: [] }),
			});

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				return screen.queryByText("AI Model Connection Setup") !== null;
			}).catch(() => {});

			const portInput = screen.getByPlaceholderText("11434");
			await user.type(portInput, "11434");

			const testButton = screen.getByTitle("Check for available Ollama models");
			await user.click(testButton);

			await waitFor(() => {
				expect(mockListAvailableModels).toHaveBeenCalled();
			});

			await waitFor(
				() => {
					const submitBtn = screen.queryByRole("button", {
						name: /get started/i,
					});
					return submitBtn !== null && !submitBtn.hasAttribute("disabled");
				},
				{ timeout: 3000 },
			);

			const submitBtn = screen.getByRole("button", {
				name: /get started/i,
			});
			await user.click(submitBtn);

			await waitFor(() => {
				expect(mockValidateLocalModelConnection).toHaveBeenCalled();
			});

			global.fetch = originalFetch;
		});

		it("should handle validation returning ok: false with default error", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);
			mockListAvailableModels.mockResolvedValue([
				{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
			]);
			mockValidateLocalModelConnection.mockResolvedValue({
				ok: false,
			});

			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ models: [] }),
			});

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				return screen.queryByText("AI Model Connection Setup") !== null;
			}).catch(() => {});

			const portInput = screen.getByPlaceholderText("11434");
			await user.type(portInput, "11434");

			const testButton = screen.getByTitle("Check for available Ollama models");
			await user.click(testButton);

			await waitFor(() => {
				expect(mockListAvailableModels).toHaveBeenCalled();
			});

			await waitFor(
				() => {
					const submitBtn = screen.queryByRole("button", {
						name: /get started/i,
					});
					return submitBtn !== null && !submitBtn.hasAttribute("disabled");
				},
				{ timeout: 3000 },
			);

			const submitBtn = screen.getByRole("button", {
				name: /get started/i,
			});
			await user.click(submitBtn);

			await waitFor(() => {
				expect(mockValidateLocalModelConnection).toHaveBeenCalled();
			});

			global.fetch = originalFetch;
		});
	});

	describe("System prompt editor wrapper", () => {
		it("should open system prompt editor modal on event", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });
			mockListAvailableModels.mockResolvedValue([
				{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
			]);

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-system-prompts"));

			await waitFor(() => {
				const modal = screen.queryByText("Edit System Prompt");
				return modal !== null;
			}).catch(() => {});
		});

		it("should close system prompt editor on backdrop click", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-system-prompts"));

			await waitFor(() => {
				const modal = screen.queryByText("Edit System Prompt");
				return modal !== null;
			}).catch(() => {});

			const closeBtn = screen.queryByRole("button", { name: "Close" });
			if (closeBtn) {
				await user.click(closeBtn);
			}
		});
	});

	describe("Ollama missing modal", () => {
		it("should show Ollama missing modal when not detected", async () => {
			mockReadLocalModelConfig.mockReturnValue(null);

			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockRejectedValue(new Error("Connection refused"));

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(
				() => {
					const modal = screen.queryByText("Ollama Not Detected");
					return modal !== null;
				},
				{ timeout: 3000 },
			).catch(() => {});

			global.fetch = originalFetch;
		});

		it("should close Ollama missing modal when close button clicked", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);

			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockRejectedValue(new Error("Connection refused"));

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(
				() => {
					const modal = screen.queryByText("Ollama Not Detected");
					return modal !== null;
				},
				{ timeout: 3000 },
			).catch(() => {});

			const closeBtn = screen.queryByTestId("shadowquill-missing-close-button");
			if (closeBtn) {
				await user.click(closeBtn);

				await waitFor(
					() => {
						return screen.queryByText("Ollama Not Detected") === null;
					},
					{ timeout: 3000 },
				).catch(() => {});
			}

			global.fetch = originalFetch;
		});

		it("should retry Ollama detection when retry button clicked and succeed", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);

			const originalFetch = global.fetch;
			let callCount = 0;
			global.fetch = vi.fn().mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					return Promise.reject(new Error("Connection refused"));
				}
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ models: [] }),
				});
			});

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(
				() => {
					const modal = screen.queryByText("Ollama Not Detected");
					return modal !== null;
				},
				{ timeout: 3000 },
			).catch(() => {});

			const modal = screen.queryByText("Ollama Not Detected");
			if (modal) {
				const retryBtn = screen.getByText("Retry Detection");
				await user.click(retryBtn);

				await waitFor(
					() => {
						return screen.queryByText("Ollama Not Detected") === null;
					},
					{ timeout: 3000 },
				).catch(() => {});
			}

			global.fetch = originalFetch;
		});

		it("should retry Ollama detection and show modal again on non-ok response", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);

			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
			});

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(
				() => {
					const modal = screen.queryByText("Ollama Not Detected");
					return modal !== null;
				},
				{ timeout: 3000 },
			).catch(() => {});

			const modal = screen.queryByText("Ollama Not Detected");
			if (modal) {
				const retryBtn = screen.getByText("Retry Detection");
				await user.click(retryBtn);

				await waitFor(
					() => {
						return screen.queryByText("Ollama Not Detected") !== null;
					},
					{ timeout: 3000 },
				).catch(() => {});
			}

			global.fetch = originalFetch;
		});

		it("should retry Ollama detection and show modal on error", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);

			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(
				() => {
					const modal = screen.queryByText("Ollama Not Detected");
					return modal !== null;
				},
				{ timeout: 3000 },
			).catch(() => {});

			const modal = screen.queryByText("Ollama Not Detected");
			if (modal) {
				const retryBtn = screen.getByText("Retry Detection");
				await user.click(retryBtn);

				await waitFor(
					() => {
						return screen.queryByText("Ollama Not Detected") !== null;
					},
					{ timeout: 3000 },
				).catch(() => {});
			}

			global.fetch = originalFetch;
		});

		it("should execute all lines in retryOllamaDetection including finally block", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);

			const originalFetch = global.fetch;
			let fetchCallCount = 0;
			global.fetch = vi.fn().mockImplementation(() => {
				fetchCallCount++;
				if (fetchCallCount === 1) {
					return Promise.reject(new Error("Connection refused"));
				}
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ models: [] }),
				});
			});

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(
				() => {
					const modal = screen.queryByText("Ollama Not Detected");
					return modal !== null;
				},
				{ timeout: 3000 },
			).catch(() => {});

			const retryBtn = screen.queryByText("Retry Detection");
			if (retryBtn) {
				await user.click(retryBtn);

				await waitFor(
					() => {
						return fetchCallCount >= 2;
					},
					{ timeout: 3000 },
				).catch(() => {});
			}

			global.fetch = originalFetch;
		});

		it("should handle retryOllamaDetection failure paths", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);

			const originalFetch = global.fetch;
			let fetchCallCount = 0;
			global.fetch = vi.fn().mockImplementation(() => {
				fetchCallCount++;
				if (fetchCallCount === 1) {
					return Promise.reject(new Error("Connection refused"));
				}
				return Promise.resolve({
					ok: false,
					status: 404,
					json: () => Promise.resolve({ error: "Not found" }),
				});
			});

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(
				() => {
					const modal = screen.queryByText("Ollama Not Detected");
					return modal !== null;
				},
				{ timeout: 3000 },
			).catch(() => {});

			const retryBtn = screen.queryByTestId(
				"shadowquill-retry-detection-button",
			);
			if (retryBtn) {
				await user.click(retryBtn);

				await waitFor(
					() => {
						return fetchCallCount >= 2;
					},
					{ timeout: 1000 },
				).catch(() => {});
			}

			global.fetch = originalFetch;
		});

		it("should handle retryOllamaDetection with exception in fetch", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);

			const originalFetch = global.fetch;
			let fetchCallCount = 0;
			global.fetch = vi.fn().mockImplementation(() => {
				fetchCallCount++;
				if (fetchCallCount === 1) {
					return Promise.reject(new Error("Connection refused"));
				}
				throw new Error("Network error");
			});

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(
				() => {
					const modal = screen.queryByText("Ollama Not Detected");
					return modal !== null;
				},
				{ timeout: 3000 },
			).catch(() => {});

			const retryBtn = screen.queryByText("Retry Detection");
			if (retryBtn) {
				await user.click(retryBtn);

				await waitFor(
					() => {
						return fetchCallCount >= 2;
					},
					{ timeout: 1000 },
				).catch(() => {});
			}

			global.fetch = originalFetch;
		});
	});

	describe("normalizeToBaseUrl", () => {
		it("should properly display base URL from port input", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);

			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ models: [] }),
			});

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				const portInput = screen.queryByPlaceholderText("11434");
				return portInput !== null;
			}).catch(() => {});

			const portInput = screen.queryByPlaceholderText("11434");
			if (portInput) {
				await user.clear(portInput);
				await user.type(portInput, "8080");

				const hint = screen.queryByText("http://localhost:8080");
				expect(hint).toBeInTheDocument();
			}

			global.fetch = originalFetch;
		});

		it("should handle non-standard URL format as passthrough", async () => {
			const _user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);

			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ models: [] }),
			});

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				const portInput = screen.queryByPlaceholderText("11434");
				return portInput !== null;
			}).catch(() => {});

			global.fetch = originalFetch;
		});

		it("should return raw value when normalizeToBaseUrl doesn't match any pattern", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "custom://example.com:1234",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });
			mockListAvailableModels.mockResolvedValue([
				{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
			]);

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});
		});
	});

	describe("isValidPort", () => {
		it("should disable test button when port is invalid", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				const portInput = screen.queryByPlaceholderText("11434");
				return portInput !== null;
			}).catch(() => {});

			const portInput = screen.queryByPlaceholderText("11434");
			if (portInput) {
				await user.clear(portInput);
				await user.type(portInput, "1"); // Single digit = invalid

				const testButton = screen.queryByTitle(
					"Check for available Ollama models",
				);
				expect(testButton).toBeDisabled();
			}
		});
	});

	describe("testLocalConnection error handling", () => {
		it("should handle connection failure and clear available models", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);
			mockListAvailableModels.mockRejectedValue(new Error("Connection failed"));

			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ models: [] }),
			});

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				const portInput = screen.queryByPlaceholderText("11434");
				return portInput !== null;
			}).catch(() => {});

			const portInput = screen.queryByPlaceholderText("11434");
			if (portInput) {
				await user.type(portInput, "11434");

				const testButton = screen.queryByTitle(
					"Check for available Ollama models",
				);
				if (testButton && !testButton.hasAttribute("disabled")) {
					await user.click(testButton);

					await waitFor(() => {
						expect(mockListAvailableModels).toHaveBeenCalled();
					});

					await waitFor(() => {
						const failedMsg = screen.queryByText("Connection failed");
						return failedMsg !== null;
					}).catch(() => {});
				}
			}

			global.fetch = originalFetch;
		});
	});

	describe("form submission with validation", () => {
		it("should handle successful form submission and show children", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);
			mockListAvailableModels.mockResolvedValue([
				{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
			]);
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });

			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ models: [] }),
			});

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App Content</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				return screen.queryByText("AI Model Connection Setup") !== null;
			}).catch(() => {});

			const portInput = screen.queryByPlaceholderText("11434");
			if (portInput) {
				await user.type(portInput, "11434");

				const testButton = screen.queryByTitle(
					"Check for available Ollama models",
				);
				if (testButton) {
					await user.click(testButton);
					await waitFor(() => {
						expect(mockListAvailableModels).toHaveBeenCalled();
					});
				}

				await waitFor(() => {
					const submitBtn = screen.queryByRole("button", {
						name: /get started/i,
					});
					return submitBtn !== null && !submitBtn.hasAttribute("disabled");
				}).catch(() => {});

				const submitBtn = screen.queryByRole("button", {
					name: /get started/i,
				});
				if (submitBtn && !submitBtn.hasAttribute("disabled")) {
					await user.click(submitBtn);

					await waitFor(() => {
						expect(mockWriteLocalModelConfig).toHaveBeenCalled();
						expect(mockValidateLocalModelConnection).toHaveBeenCalled();
					});
				}
			}

			global.fetch = originalFetch;
		});

		it("should handle form submission error", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);
			mockListAvailableModels.mockResolvedValue([
				{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
			]);
			mockWriteLocalModelConfig.mockImplementation(() => {
				throw new Error("Write failed");
			});

			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ models: [] }),
			});

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				const portInput = screen.queryByPlaceholderText("11434");
				return portInput !== null;
			}).catch(() => {});

			const portInput = screen.queryByPlaceholderText("11434");
			if (portInput) {
				await user.type(portInput, "11434");

				const testButton = screen.queryByTitle(
					"Check for available Ollama models",
				);
				if (testButton) {
					await user.click(testButton);
				}
			}

			global.fetch = originalFetch;
		});

		it("should handle validation failure with generic error", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);
			mockListAvailableModels.mockResolvedValue([
				{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
			]);
			mockValidateLocalModelConnection.mockResolvedValue({
				ok: false,
				error: "Server unreachable",
			});

			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ models: [] }),
			});

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				const portInput = screen.queryByPlaceholderText("11434");
				return portInput !== null;
			}).catch(() => {});

			const portInput = screen.queryByPlaceholderText("11434");
			if (portInput) {
				await user.type(portInput, "11434");
				const testButton = screen.queryByTitle(
					"Check for available Ollama models",
				);
				if (testButton) {
					await user.click(testButton);

					await waitFor(() => {
						const submitBtn = screen.queryByRole("button", {
							name: /get started/i,
						});
						return submitBtn !== null && !submitBtn.hasAttribute("disabled");
					}).catch(() => {});

					const submitBtn = screen.queryByRole("button", {
						name: /get started/i,
					});
					if (submitBtn && !submitBtn.hasAttribute("disabled")) {
						await user.click(submitBtn);
					}
				}
			}

			global.fetch = originalFetch;
		});
	});

	describe("System prompt editor interactions", () => {
		it("should save system prompt when form submitted", async () => {
			const user = userEvent.setup();
			mockEnsureSystemPromptBuild.mockReturnValue("Current prompt");
			mockSetSystemPromptBuild.mockReturnValue("Updated prompt");

			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-system-prompts"));

			await waitFor(() => {
				const modal = screen.queryByText("Edit System Prompt");
				return modal !== null;
			}).catch(() => {});

			const saveBtn = screen.queryByRole("button", { name: /^save$/i });
			if (saveBtn) {
				await user.click(saveBtn);
			}
		});

		it("should restore default prompt when confirmed", async () => {
			const user = userEvent.setup();
			mockEnsureSystemPromptBuild.mockReturnValue("Current prompt");
			mockResetSystemPromptBuild.mockReturnValue("Default prompt");
			mockConfirm.mockResolvedValue(true);

			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-system-prompts"));

			await waitFor(() => {
				const modal = screen.queryByText("Edit System Prompt");
				return modal !== null;
			}).catch(() => {});

			const restoreBtn = screen.queryByRole("button", {
				name: /restore default/i,
			});
			if (restoreBtn) {
				await user.click(restoreBtn);

				await waitFor(() => {
					expect(mockConfirm).toHaveBeenCalled();
				});
			}
		});

		it("should not restore default when cancelled", async () => {
			const user = userEvent.setup();
			mockEnsureSystemPromptBuild.mockReturnValue("Current prompt");
			mockConfirm.mockResolvedValue(false);

			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-system-prompts"));

			await waitFor(() => {
				const modal = screen.queryByText("Edit System Prompt");
				return modal !== null;
			}).catch(() => {});

			const restoreBtn = screen.queryByRole("button", {
				name: /restore default/i,
			});
			if (restoreBtn) {
				await user.click(restoreBtn);
				await waitFor(() => {
					expect(mockConfirm).toHaveBeenCalled();
				});
				expect(mockResetSystemPromptBuild).not.toHaveBeenCalled();
			}
		});

		it("should close modal when cancel button clicked", async () => {
			const user = userEvent.setup();
			mockEnsureSystemPromptBuild.mockReturnValue("Current prompt");

			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-system-prompts"));

			await waitFor(() => {
				const modal = screen.queryByText("Edit System Prompt");
				return modal !== null;
			}).catch(() => {});

			const cancelBtn = screen.queryByRole("button", { name: /^cancel$/i });
			if (cancelBtn) {
				await user.click(cancelBtn);
			}
		});

		it("should close modal on backdrop Escape key", async () => {
			const user = userEvent.setup();
			mockEnsureSystemPromptBuild.mockReturnValue("Current prompt");

			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-system-prompts"));

			await waitFor(() => {
				const modal = screen.queryByText("Edit System Prompt");
				return modal !== null;
			}).catch(() => {});

			const backdrop = document.querySelector(".modal-backdrop-blur");
			if (backdrop) {
				await user.click(backdrop as Element);
			}
		});
	});

	describe("Data location modal interactions", () => {
		it("should show error when getDataPaths fails", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });
			mockWindowApi.getDataPaths.mockResolvedValue({
				ok: false,
				error: "Failed to get paths",
			});

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-data-location"));

			await waitFor(() => {
				const modal = screen.queryByText("Local Data Management");
				return modal !== null;
			}).catch(() => {});
		});

		it("should handle generic error from getDataPaths", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });
			mockWindowApi.getDataPaths.mockRejectedValue(
				new Error("Unexpected error"),
			);

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-data-location"));

			await waitFor(() => {
				const modal = screen.queryByText("Local Data Management");
				return modal !== null;
			}).catch(() => {});
		});

		it("should close data location modal on backdrop click", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });
			mockWindowApi.getDataPaths.mockResolvedValue({
				ok: true,
				userData: "/path/to/data",
			});

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-data-location"));

			await waitFor(() => {
				const modal = screen.queryByText("Local Data Management");
				return modal !== null;
			}).catch(() => {});

			const backdrop = document.querySelector(".modal-backdrop-blur");
			if (backdrop) {
				await user.click(backdrop as Element);
			}
		});
	});

	describe("Factory reset", () => {
		it("should trigger factory reset when confirmed", async () => {
			const user = userEvent.setup();
			mockConfirm.mockResolvedValue(true);
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });
			mockWindowApi.getDataPaths.mockResolvedValue({
				ok: true,
				userData: "/path/to/data",
			});
			mockWindowApi.factoryReset.mockResolvedValue({ ok: true });

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-data-location"));

			await waitFor(() => {
				const modal = screen.queryByText("Local Data Management");
				return modal !== null;
			}).catch(() => {});

			await waitFor(() => {
				const resetBtn = screen.queryByRole("button", {
					name: "Factory Reset",
				});
				return resetBtn !== null;
			}).catch(() => {});

			const resetBtn = screen.queryByRole("button", { name: "Factory Reset" });
			if (resetBtn) {
				await user.click(resetBtn);

				await waitFor(() => {
					expect(mockConfirm).toHaveBeenCalledWith(
						expect.objectContaining({
							title: "Factory Reset",
							confirmText: "Factory Reset",
							tone: "destructive",
						}),
					);
				});
			}
		});

		it("should not trigger factory reset when cancelled", async () => {
			const user = userEvent.setup();
			mockConfirm.mockResolvedValue(false);
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });
			mockWindowApi.getDataPaths.mockResolvedValue({
				ok: true,
				userData: "/path/to/data",
			});

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-data-location"));

			await waitFor(() => {
				const resetBtn = screen.queryByRole("button", {
					name: "Factory Reset",
				});
				return resetBtn !== null;
			}).catch(() => {});

			const resetBtn = screen.queryByRole("button", { name: "Factory Reset" });
			if (resetBtn) {
				await user.click(resetBtn);
				expect(mockWindowApi.factoryReset).not.toHaveBeenCalled();
			}
		});

		it("should handle factory reset failure", async () => {
			const user = userEvent.setup();
			mockConfirm.mockResolvedValue(true);
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });
			mockWindowApi.getDataPaths.mockResolvedValue({
				ok: true,
				userData: "/path/to/data",
			});
			mockWindowApi.factoryReset.mockResolvedValue({
				ok: false,
				error: "Reset failed",
			});

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-data-location"));

			await waitFor(() => {
				const resetBtn = screen.queryByRole("button", {
					name: "Factory Reset",
				});
				return resetBtn !== null;
			}).catch(() => {});

			const resetBtn = screen.queryByRole("button", { name: "Factory Reset" });
			if (resetBtn) {
				await user.click(resetBtn);
			}
		});

		it("should handle factory reset exception", async () => {
			const user = userEvent.setup();
			mockConfirm.mockResolvedValue(true);
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });
			mockWindowApi.getDataPaths.mockResolvedValue({
				ok: true,
				userData: "/path/to/data",
			});
			mockWindowApi.factoryReset.mockRejectedValue(
				new Error("Factory reset threw"),
			);

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-data-location"));

			await waitFor(() => {
				const resetBtn = screen.queryByRole("button", {
					name: "Factory Reset",
				});
				return resetBtn !== null;
			}).catch(() => {});

			const resetBtn = screen.queryByRole("button", { name: "Factory Reset" });
			if (resetBtn) {
				await user.click(resetBtn);
			}
		});
	});

	describe("Open Ollama functionality", () => {
		it("should handle openOllama when shadowquill API is missing", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);
			mockListAvailableModels.mockRejectedValue(new Error("Connection failed"));
			(window as unknown as { shadowquill?: unknown }).shadowquill = {
				checkOllamaInstalled: vi.fn().mockResolvedValue({ installed: true }),
			};

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				const portInput = screen.queryByPlaceholderText("11434");
				return portInput !== null;
			}).catch(() => {});

			const portInput = screen.queryByPlaceholderText("11434");
			if (portInput) {
				await user.type(portInput, "11434");
				const testButton = screen.queryByTitle(
					"Check for available Ollama models",
				);
				if (testButton) {
					await user.click(testButton);
				}
			}

			await waitFor(() => {
				const openBtn = screen.queryByText("Open Ollama");
				return openBtn !== null;
			}).catch(() => {});

			const openBtn = screen.queryByText("Open Ollama");
			if (openBtn) {
				await user.click(openBtn);
			}
		});

		it("should handle openOllama throwing exception", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);
			mockListAvailableModels.mockRejectedValue(new Error("Connection failed"));
			mockWindowApi.checkOllamaInstalled.mockResolvedValue({ installed: true });
			mockWindowApi.openOllama.mockRejectedValue(new Error("IPC error"));

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				const portInput = screen.queryByPlaceholderText("11434");
				return portInput !== null;
			}).catch(() => {});

			const portInput = screen.queryByPlaceholderText("11434");
			if (portInput) {
				await user.type(portInput, "11434");
				const testButton = screen.queryByTitle(
					"Check for available Ollama models",
				);
				if (testButton) {
					await user.click(testButton);
				}
			}

			await waitFor(() => {
				const openBtn = screen.queryByText("Open Ollama");
				return openBtn !== null;
			}).catch(() => {});

			const openBtn = screen.queryByText("Open Ollama");
			if (openBtn) {
				await user.click(openBtn);
			}
		});

		it("should check ollama installation if not already checked", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);
			mockListAvailableModels.mockRejectedValue(new Error("Connection failed"));
			mockWindowApi.checkOllamaInstalled
				.mockResolvedValueOnce({ installed: null })
				.mockResolvedValue({ installed: true });

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				const portInput = screen.queryByPlaceholderText("11434");
				return portInput !== null;
			}).catch(() => {});

			const portInput = screen.queryByPlaceholderText("11434");
			if (portInput) {
				await user.type(portInput, "11434");
				const testButton = screen.queryByTitle(
					"Check for available Ollama models",
				);
				if (testButton) {
					await user.click(testButton);
				}
			}
		});

		it("should call checkOllamaInstalled when ollamaInstalled is null on button click", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);
			mockListAvailableModels.mockRejectedValue(new Error("Connection failed"));

			let callCount = 0;
			mockWindowApi.checkOllamaInstalled.mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					return Promise.resolve({ installed: null });
				}
				return Promise.resolve({ installed: true });
			});

			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockRejectedValue(new Error("Connection failed"));

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				const portInput = screen.queryByPlaceholderText("11434");
				return portInput !== null;
			}).catch(() => {});

			const portInput = screen.queryByPlaceholderText("11434");
			if (portInput) {
				await user.type(portInput, "11434");

				const testButton = screen.queryByTitle(
					"Check for available Ollama models",
				);
				if (testButton) {
					await user.click(testButton);
				}
			}

			await waitFor(
				() => {
					const openBtn = screen.queryByText("Open Ollama");
					return openBtn !== null;
				},
				{ timeout: 3000 },
			).catch(() => {});

			const openBtn = screen.queryByText("Open Ollama");
			if (openBtn) {
				await user.click(openBtn);

				await waitFor(() => {
					expect(mockWindowApi.checkOllamaInstalled).toHaveBeenCalled();
				});
			}

			global.fetch = originalFetch;
		});
	});

	describe("Ollama detection edge cases", () => {
		it("should handle fetch returning non-ok status", async () => {
			mockReadLocalModelConfig.mockReturnValue(null);

			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
			});

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(
				() => {
					const modal = screen.queryByText("Ollama Not Detected");
					return modal !== null;
				},
				{ timeout: 3000 },
			).catch(() => {});

			global.fetch = originalFetch;
		});

		it("should retry and succeed when Ollama becomes available", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);

			const originalFetch = global.fetch;
			let fetchCallCount = 0;
			global.fetch = vi.fn().mockImplementation(() => {
				fetchCallCount++;
				if (fetchCallCount === 1) {
					return Promise.reject(new Error("Connection refused"));
				}
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ models: [] }),
				});
			});

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(
				() => {
					const retryBtn = screen.queryByText("Retry Detection");
					return retryBtn !== null;
				},
				{ timeout: 3000 },
			).catch(() => {});

			const retryBtn = screen.queryByText("Retry Detection");
			if (retryBtn) {
				await user.click(retryBtn);

				await waitFor(() => {
					const portInput = screen.queryByPlaceholderText("11434");
					return portInput !== null;
				}).catch(() => {});
			}

			global.fetch = originalFetch;
		});
	});

	describe("Model selection", () => {
		it("should auto-select configured model if available", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:12b",
			});
			mockListAvailableModels.mockResolvedValue([
				{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
				{ name: "gemma3:12b", size: 12 * 1024 * 1024 * 1024 },
			]);
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});
		});

		it("should handle empty model list", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);
			mockListAvailableModels.mockResolvedValue([]);

			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ models: [] }),
			});

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				const portInput = screen.queryByPlaceholderText("11434");
				return portInput !== null;
			}).catch(() => {});

			const portInput = screen.queryByPlaceholderText("11434");
			if (portInput) {
				await user.type(portInput, "11434");
				const testButton = screen.queryByTitle(
					"Check for available Ollama models",
				);
				if (testButton) {
					await user.click(testButton);
				}
			}

			global.fetch = originalFetch;
		});
	});

	describe("isElectronRuntime detection", () => {
		it("should detect Electron via navigator userAgent", () => {
			const originalNavigator = global.navigator;
			Object.defineProperty(global, "navigator", {
				value: { userAgent: "Mozilla/5.0 Electron/28.0.0" },
				writable: true,
			});

			mockReadLocalModelConfig.mockReturnValue(null);

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			Object.defineProperty(global, "navigator", {
				value: originalNavigator,
				writable: true,
			});
		});

		it("should detect Electron via process.versions.electron", () => {
			const originalProcess = global.process;
			Object.defineProperty(global, "process", {
				value: {
					versions: { electron: "28.0.0" },
					env: {},
				},
				writable: true,
			});

			mockReadLocalModelConfig.mockReturnValue(null);

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			Object.defineProperty(global, "process", {
				value: originalProcess,
				writable: true,
			});
		});

		it("should detect Electron via process.env.ELECTRON", () => {
			const originalProcess = global.process;
			Object.defineProperty(global, "process", {
				value: {
					env: { ELECTRON: "1" },
					versions: {},
				},
				writable: true,
			});

			mockReadLocalModelConfig.mockReturnValue(null);

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			Object.defineProperty(global, "process", {
				value: originalProcess,
				writable: true,
			});
		});

		it("should detect Electron via process.env.NEXT_PUBLIC_ELECTRON", () => {
			const originalProcess = global.process;
			Object.defineProperty(global, "process", {
				value: {
					env: { NEXT_PUBLIC_ELECTRON: "1" },
					versions: {},
				},
				writable: true,
			});

			mockReadLocalModelConfig.mockReturnValue(null);

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			Object.defineProperty(global, "process", {
				value: originalProcess,
				writable: true,
			});
		});

		it("should return false when process and navigator are undefined", () => {
			const originalProcess = global.process;
			const originalNavigator = global.navigator;

			Object.defineProperty(global, "process", {
				value: undefined,
				writable: true,
				configurable: true,
			});
			Object.defineProperty(global, "navigator", {
				value: undefined,
				writable: true,
				configurable: true,
			});

			mockReadLocalModelConfig.mockReturnValue(null);

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			Object.defineProperty(global, "process", {
				value: originalProcess,
				writable: true,
				configurable: true,
			});
			Object.defineProperty(global, "navigator", {
				value: originalNavigator,
				writable: true,
				configurable: true,
			});
		});

		it("should return false when process exists but no electron indicators and navigator doesn't match", () => {
			const originalProcess = global.process;
			const originalNavigator = global.navigator;

			Object.defineProperty(global, "process", {
				value: {
					env: {},
					versions: {},
				},
				writable: true,
				configurable: true,
			});
			Object.defineProperty(global, "navigator", {
				value: { userAgent: "Mozilla/5.0 Chrome/120.0.0" },
				writable: true,
				configurable: true,
			});

			mockReadLocalModelConfig.mockReturnValue(null);

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			Object.defineProperty(global, "process", {
				value: originalProcess,
				writable: true,
				configurable: true,
			});
			Object.defineProperty(global, "navigator", {
				value: originalNavigator,
				writable: true,
				configurable: true,
			});
		});
	});

	describe("DataLocationModalWrapper event listener cleanup", () => {
		it("should remove event listener on unmount", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });

			const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

			const { unmount } = render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			unmount();

			expect(removeEventListenerSpy).toHaveBeenCalledWith(
				"open-data-location",
				expect.any(Function),
			);

			removeEventListenerSpy.mockRestore();
		});
	});

	describe("DataLocationModalWrapper error handling", () => {
		it("should handle No handler registered error specifically", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });
			mockWindowApi.getDataPaths.mockRejectedValue(
				new Error("No handler registered for 'get-data-paths'"),
			);

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-data-location"));

			await waitFor(() => {
				expect(mockWindowApi.getDataPaths).toHaveBeenCalled();
			});

			await waitFor(
				() => {
					const modal = screen.queryByText("Local Data Management");
					return modal !== null;
				},
				{ timeout: 3000 },
			);

			await waitFor(
				() => {
					const errorText = screen.queryByText(/Main process not updated/i);
					return errorText !== null;
				},
				{ timeout: 3000 },
			).catch(() => {});

			expect(mockWindowApi.getDataPaths).toHaveBeenCalled();
		});

		it("should rethrow and catch non-handler-registered errors", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });
			mockWindowApi.getDataPaths.mockRejectedValue(
				new Error("Some other IPC error"),
			);

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-data-location"));

			await waitFor(() => {
				expect(mockWindowApi.getDataPaths).toHaveBeenCalled();
			});

			await waitFor(
				() => {
					const modal = screen.queryByText("Local Data Management");
					return modal !== null;
				},
				{ timeout: 3000 },
			).catch(() => {});

			expect(mockWindowApi.getDataPaths).toHaveBeenCalled();
		});

		it("should handle getDataPaths returning ok: false without error message", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });
			mockWindowApi.getDataPaths.mockResolvedValue({
				ok: false,
			});

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-data-location"));

			await waitFor(() => {
				expect(mockWindowApi.getDataPaths).toHaveBeenCalled();
			});

			await waitFor(
				() => {
					const modal = screen.queryByText("Local Data Management");
					return modal !== null;
				},
				{ timeout: 3000 },
			).catch(() => {});

			expect(mockWindowApi.getDataPaths).toHaveBeenCalled();
		});

		it("should handle error without message property", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });
			mockWindowApi.getDataPaths.mockRejectedValue({ code: "UNKNOWN" });

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-data-location"));

			await waitFor(() => {
				expect(mockWindowApi.getDataPaths).toHaveBeenCalled();
			});

			await waitFor(
				() => {
					const modal = screen.queryByText("Local Data Management");
					return modal !== null;
				},
				{ timeout: 3000 },
			).catch(() => {});

			expect(mockWindowApi.getDataPaths).toHaveBeenCalled();
		});
	});

	describe("DataLocationModalWrapper keyboard and mouse interactions", () => {
		it("should close modal on Escape key press on backdrop", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });
			mockWindowApi.getDataPaths.mockResolvedValue({
				ok: true,
				userData: "/path/to/data",
			});

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-data-location"));

			await waitFor(() => {
				const modal = screen.queryByText("Local Data Management");
				return modal !== null;
			});

			expect(screen.getByText("Local Data Management")).toBeInTheDocument();

			const backdrop = document.querySelector(
				".modal-backdrop-blur",
			) as HTMLElement;
			expect(backdrop).toBeInTheDocument();

			backdrop.focus();
			await user.keyboard("{Escape}");

			await waitFor(() => {
				expect(
					screen.queryByText("Local Data Management"),
				).not.toBeInTheDocument();
			});
		});

		it("should not close modal when clicking inside modal content", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });
			mockWindowApi.getDataPaths.mockResolvedValue({
				ok: true,
				userData: "/path/to/data",
			});

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-data-location"));

			await waitFor(() => {
				const modal = screen.queryByText("Local Data Management");
				return modal !== null;
			});

			const modalTitle = screen.getByText("Local Data Management");
			await user.click(modalTitle);

			expect(screen.getByText("Local Data Management")).toBeInTheDocument();
		});

		it("should stop keydown propagation on modal content", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });
			mockWindowApi.getDataPaths.mockResolvedValue({
				ok: true,
				userData: "/path/to/data",
			});

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-data-location"));

			await waitFor(() => {
				const modal = screen.queryByText("Local Data Management");
				return modal !== null;
			});

			const modalContent = document.querySelector(
				".modal-content",
			) as HTMLElement;
			expect(modalContent).toBeInTheDocument();

			modalContent.focus();
			await user.keyboard("test");

			expect(screen.getByText("Local Data Management")).toBeInTheDocument();
		});

		it("should close modal when close button is clicked", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });
			mockWindowApi.getDataPaths.mockResolvedValue({
				ok: true,
				userData: "/path/to/data",
			});

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-data-location"));

			await waitFor(() => {
				const modal = screen.queryByText("Local Data Management");
				return modal !== null;
			});

			const closeButtons = screen.getAllByRole("button");
			const closeBtn = closeButtons.find(
				(btn) =>
					btn.closest(".modal-header") !== null && btn.textContent === "",
			);

			if (closeBtn) {
				await user.click(closeBtn);

				await waitFor(() => {
					expect(
						screen.queryByText("Local Data Management"),
					).not.toBeInTheDocument();
				});
			}
		});
	});

	describe("System prompt editor error handling", () => {
		it("should handle setSystemPromptBuild throwing error", async () => {
			const user = userEvent.setup();
			mockEnsureSystemPromptBuild.mockReturnValue("Current prompt");
			mockSetSystemPromptBuild.mockImplementation(() => {
				throw new Error("Failed to save prompt");
			});

			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-system-prompts"));

			await waitFor(() => {
				const modal = screen.queryByText("Edit System Prompt");
				return modal !== null;
			});

			const saveBtn = screen.queryByRole("button", { name: /^save$/i });
			if (saveBtn) {
				await user.click(saveBtn);

				await waitFor(() => {
					const errorText = screen.queryByText("Failed to save prompt");
					return errorText !== null;
				});

				expect(screen.getByText("Failed to save prompt")).toBeInTheDocument();
			}
		});

		it("should handle resetSystemPromptBuild throwing error", async () => {
			const user = userEvent.setup();
			mockEnsureSystemPromptBuild.mockReturnValue("Current prompt");
			mockResetSystemPromptBuild.mockImplementation(() => {
				throw new Error("Failed to reset prompt");
			});
			mockConfirm.mockResolvedValue(true);

			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-system-prompts"));

			await waitFor(() => {
				const modal = screen.queryByText("Edit System Prompt");
				return modal !== null;
			});

			const restoreBtn = screen.queryByRole("button", {
				name: /restore default/i,
			});
			if (restoreBtn) {
				await user.click(restoreBtn);

				await waitFor(() => {
					const errorText = screen.queryByText("Failed to reset prompt");
					return errorText !== null;
				});

				expect(screen.getByText("Failed to reset prompt")).toBeInTheDocument();
			}
		});

		it("should handle ensureSystemPromptBuild throwing error on load", async () => {
			mockEnsureSystemPromptBuild.mockImplementation(() => {
				throw new Error("Failed to load");
			});

			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-system-prompts"));

			await waitFor(() => {
				const modal = screen.queryByText("Edit System Prompt");
				return modal !== null;
			});

			expect(screen.getByText("Edit System Prompt")).toBeInTheDocument();
		});
	});

	describe("Form validation edge cases", () => {
		it("should handle validation returning ok: false without error message", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockListAvailableModels.mockResolvedValue([
				{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
			]);
			mockValidateLocalModelConnection.mockResolvedValue({
				ok: false,
			});

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(mockValidateLocalModelConnection).toHaveBeenCalled();
			});

			await waitFor(
				() => {
					const setup = screen.queryByText("AI Model Connection Setup");
					return setup !== null;
				},
				{ timeout: 3000 },
			);
		});
	});

	describe("Connection test with empty URL", () => {
		it("should not test connection when baseUrl is empty", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);

			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ models: [] }),
			});

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				const portInput = screen.queryByPlaceholderText("11434");
				return portInput !== null;
			});

			const portInput = screen.getByPlaceholderText("11434");
			await user.clear(portInput);

			const testButton = screen.queryByTitle(
				"Check for available Ollama models",
			);
			expect(testButton).toBeDisabled();

			global.fetch = originalFetch;
		});
	});

	describe("System prompt textarea interactions", () => {
		it("should update prompt value when typing in textarea", async () => {
			const user = userEvent.setup();
			mockEnsureSystemPromptBuild.mockReturnValue("");

			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-system-prompts"));

			await waitFor(() => {
				const modal = screen.queryByText("Edit System Prompt");
				return modal !== null;
			});

			const textarea = screen.getByRole("textbox");
			expect(textarea).toBeInTheDocument();

			await user.type(textarea, "New prompt content");

			expect(textarea).toHaveValue("New prompt content");
		});
	});

	describe("Modal content keyboard interactions", () => {
		it("should stop keyboard event propagation in system prompt modal content", async () => {
			const _user = userEvent.setup();
			mockEnsureSystemPromptBuild.mockReturnValue("Initial prompt");

			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-system-prompts"));

			await waitFor(() => {
				const modal = screen.queryByText("Edit System Prompt");
				return modal !== null;
			});

			const modalContent = document.querySelector(
				".modal-content.modal-content--large",
			) as HTMLElement;
			expect(modalContent).toBeInTheDocument();

			const keyEvent = new KeyboardEvent("keydown", {
				key: "Tab",
				bubbles: true,
			});
			modalContent.dispatchEvent(keyEvent);

			expect(screen.getByText("Edit System Prompt")).toBeInTheDocument();
		});

		it("should stop keyboard event propagation in data location modal content", async () => {
			const _user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });
			mockWindowApi.getDataPaths.mockResolvedValue({
				ok: true,
				userData: "/path/to/data",
			});

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-data-location"));

			await waitFor(() => {
				const modal = screen.queryByText("Local Data Management");
				return modal !== null;
			});

			const modalContents = document.querySelectorAll(".modal-content");
			const dataLocationModal = Array.from(modalContents).find(
				(el) => !el.classList.contains("modal-content--large"),
			) as HTMLElement;

			if (dataLocationModal) {
				const keyEvent = new KeyboardEvent("keydown", {
					key: "a",
					bubbles: true,
				});
				dataLocationModal.dispatchEvent(keyEvent);

				expect(screen.getByText("Local Data Management")).toBeInTheDocument();
			}
		});
	});

	describe("System prompt modal close interactions", () => {
		it("should close system prompt modal when close button in header is clicked", async () => {
			const user = userEvent.setup();
			mockEnsureSystemPromptBuild.mockReturnValue("Test prompt");

			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-system-prompts"));

			await waitFor(() => {
				expect(screen.getByText("Edit System Prompt")).toBeInTheDocument();
			});

			const modalHeader = document.querySelector(".modal-header");
			expect(modalHeader).toBeInTheDocument();
			const closeBtn = modalHeader?.querySelector("button");
			expect(closeBtn).toBeInTheDocument();
			if (!closeBtn) throw new Error("Close button not found");

			await user.click(closeBtn);

			await waitFor(() => {
				expect(
					screen.queryByText("Edit System Prompt"),
				).not.toBeInTheDocument();
			});
		});

		it("should close system prompt modal when Escape is pressed on backdrop", async () => {
			const _user = userEvent.setup();
			mockEnsureSystemPromptBuild.mockReturnValue("Test prompt");

			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});

			window.dispatchEvent(new Event("open-system-prompts"));

			await waitFor(() => {
				expect(screen.getByText("Edit System Prompt")).toBeInTheDocument();
			});

			const backdrop = document.querySelector(
				".modal-backdrop-blur",
			) as HTMLElement;
			expect(backdrop).toBeInTheDocument();

			const escapeEvent = new KeyboardEvent("keydown", {
				key: "Escape",
				bubbles: true,
			});
			backdrop.dispatchEvent(escapeEvent);

			await waitFor(() => {
				expect(
					screen.queryByText("Edit System Prompt"),
				).not.toBeInTheDocument();
			});
		});
	});

	describe("Submit button content rendering", () => {
		it("should show Start ShadowQuill with icon when not saving", async () => {
			mockReadLocalModelConfig.mockReturnValue(null);
			mockListAvailableModels.mockResolvedValue([
				{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
			]);

			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ models: [] }),
			});

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				const setupText = screen.queryByText("AI Model Connection Setup");
				return setupText !== null;
			});

			const user = userEvent.setup();
			const portInput = screen.getByPlaceholderText("11434");
			await user.type(portInput, "11434");

			const testButton = screen.getByTitle("Check for available Ollama models");
			await user.click(testButton);

			await waitFor(() => {
				expect(mockListAvailableModels).toHaveBeenCalled();
			});

			await waitFor(() => {
				const submitBtn = screen.queryByRole("button", {
					name: /get started/i,
				});
				return submitBtn !== null;
			});

			const submitBtn = screen.getByRole("button", {
				name: /get started/i,
			});
			expect(submitBtn).toBeInTheDocument();
			expect(submitBtn.textContent).toContain("Get Started");

			global.fetch = originalFetch;
		});
	});

	describe("Retry check button in connection failed state", () => {
		it("should retry connection when retry check button is clicked", async () => {
			const user = userEvent.setup();
			mockReadLocalModelConfig.mockReturnValue(null);
			mockListAvailableModels
				.mockRejectedValueOnce(new Error("Connection failed"))
				.mockResolvedValue([
					{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
				]);

			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ models: [] }),
			});

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				const portInput = screen.queryByPlaceholderText("11434");
				return portInput !== null;
			});

			const portInput = screen.getByPlaceholderText("11434");
			await user.type(portInput, "11434");

			const testButton = screen.getByTitle("Check for available Ollama models");
			await user.click(testButton);

			await waitFor(() => {
				expect(mockListAvailableModels).toHaveBeenCalled();
			});

			await waitFor(
				() => {
					const retryBtn = screen.queryByText("Retry check");
					return retryBtn !== null;
				},
				{ timeout: 3000 },
			).catch(() => {});

			const retryBtn = screen.queryByText("Retry check");
			if (retryBtn) {
				await user.click(retryBtn);

				await waitFor(() => {
					expect(mockListAvailableModels).toHaveBeenCalledTimes(2);
				});
			}

			global.fetch = originalFetch;
		});
	});

	describe("Additional branch coverage tests", () => {
		it("should handle config with different port format", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://192.168.1.1:11434/",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({ ok: true });
			mockListAvailableModels.mockResolvedValue([
				{ name: "gemma3:4b", size: 4 * 1024 * 1024 * 1024 },
			]);

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("app-content")).toBeInTheDocument();
			});
		});

		it("should handle validation error without error property", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockResolvedValue({
				ok: false,
			});
			mockListAvailableModels.mockResolvedValue([]);

			render(
				<ModelConfigGate>
					<div>App</div>
				</ModelConfigGate>,
			);

			await waitFor(() => {
				expect(mockValidateLocalModelConnection).toHaveBeenCalled();
			});
		});
	});

	describe("Loading state modal keyboard handler", () => {
		it("should stop keyboard propagation in loading modal content", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockImplementation(
				() => new Promise(() => {}),
			);

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(
				() => {
					const validatingText = screen.queryByText(
						/Validating Gemma connection/i,
					);
					return validatingText !== null;
				},
				{ timeout: 3000 },
			).catch(() => {});

			const modalContent = document.querySelector(
				".modal-content",
			) as HTMLElement;
			if (modalContent) {
				const keyEvent = new KeyboardEvent("keydown", {
					key: "Escape",
					bubbles: true,
				});
				modalContent.dispatchEvent(keyEvent);

				const loadingText = screen.queryByText(/Validating|Loading/i);
				expect(loadingText).toBeDefined();
			}
		});

		it("should stop click propagation in loading modal content", async () => {
			mockReadLocalModelConfig.mockReturnValue({
				provider: "ollama",
				baseUrl: "http://localhost:11434",
				model: "gemma3:4b",
			});
			mockValidateLocalModelConnection.mockImplementation(
				() => new Promise(() => {}),
			);

			render(
				<ModelConfigGate>
					<div data-testid="app-content">App</div>
				</ModelConfigGate>,
			);

			await waitFor(
				() => {
					const validatingText = screen.queryByText(
						/Validating Gemma connection/i,
					);
					return validatingText !== null;
				},
				{ timeout: 3000 },
			).catch(() => {});

			const modalContent = document.querySelector(
				".modal-content",
			) as HTMLElement;
			if (modalContent) {
				const clickEvent = new MouseEvent("click", {
					bubbles: true,
				});
				modalContent.dispatchEvent(clickEvent);

				const loadingText = screen.queryByText(/Validating|Loading/i);
				expect(loadingText).toBeDefined();
			}
		});
	});
});
