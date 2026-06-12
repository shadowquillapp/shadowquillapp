import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useModelManager } from "@/app/workbench/_components/workbench/hooks/useModelManager";

const listAvailableModels = vi.fn();

vi.mock("@/lib/local-config", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/local-config")>();
	return {
		...actual,
		listAvailableModels: (
			...args: Parameters<typeof actual.listAvailableModels>
		) => listAvailableModels(...args),
	};
});

describe("useModelManager", () => {
	beforeEach(() => {
		localStorage.clear();
		listAvailableModels.mockReset();
		listAvailableModels.mockResolvedValue([{ name: "gemma3:4b", size: 1 }]);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("lists models from the configured Ollama base URL", async () => {
		localStorage.setItem("MODEL_PROVIDER", '"ollama"');
		localStorage.setItem("MODEL_BASE_URL", '"http://localhost:11500"');
		localStorage.setItem("MODEL_NAME", '"gemma3:4b"');

		renderHook(() => useModelManager());

		await waitFor(() => {
			expect(listAvailableModels).toHaveBeenCalledWith(
				"http://localhost:11500",
			);
		});
	});

	it("refreshes models when settings dispatch MODEL_CHANGED", async () => {
		renderHook(() => useModelManager());

		await waitFor(() => {
			expect(listAvailableModels).toHaveBeenCalledTimes(1);
		});

		window.dispatchEvent(new Event("MODEL_CHANGED"));

		await waitFor(() => {
			expect(listAvailableModels).toHaveBeenCalledTimes(2);
		});
	});
});
