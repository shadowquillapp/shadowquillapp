import LocalDataManagementContent from "@/components/settings/LocalDataManagementContent";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock DialogProvider
const mockConfirm = vi.fn();
vi.mock("@/components/DialogProvider", () => ({
	useDialog: () => ({
		confirm: mockConfirm,
		showInfo: vi.fn(),
	}),
}));

// Mock local-storage
vi.mock("@/lib/local-storage", () => ({
	clearAllStorageForFactoryReset: vi.fn(),
}));

import { clearAllStorageForFactoryReset } from "@/lib/local-storage";

describe("LocalDataManagementContent", () => {
	const mockApi = {
		getDataPaths: vi.fn(),
		factoryReset: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		(window as unknown as { shadowquill?: unknown }).shadowquill = mockApi;
		mockConfirm.mockResolvedValue(false);
	});

	afterEach(() => {
		(window as unknown as { shadowquill?: unknown }).shadowquill = undefined;
	});

	describe("rendering", () => {
		it("should render the data management panel", async () => {
			mockApi.getDataPaths.mockResolvedValue({
				ok: true,
				userData: "/home/user/.config/shadowquill",
				localStorageLevelDb: "/home/user/.config/shadowquill/Local Storage",
			});

			render(<LocalDataManagementContent />);

			expect(screen.getByText("Data Management")).toBeInTheDocument();
			expect(screen.getByText("Application Storage")).toBeInTheDocument();
		});

		it("should display data paths when loaded", async () => {
			mockApi.getDataPaths.mockResolvedValue({
				ok: true,
				userData: "/home/user/.config/shadowquill",
				localStorageLevelDb:
					"/home/user/.config/shadowquill/Local Storage/leveldb",
			});

			render(<LocalDataManagementContent />);

			await waitFor(() => {
				expect(
					screen.getByText("/home/user/.config/shadowquill"),
				).toBeInTheDocument();
				expect(
					screen.getByText(
						"/home/user/.config/shadowquill/Local Storage/leveldb",
					),
				).toBeInTheDocument();
			});
		});

		it("should show error when API not available", async () => {
			(window as unknown as { shadowquill?: unknown }).shadowquill = undefined;

			render(<LocalDataManagementContent />);

			await waitFor(() => {
				expect(
					screen.getByText("Not available outside the desktop app"),
				).toBeInTheDocument();
			});
		});

		it("should show error when getDataPaths fails", async () => {
			mockApi.getDataPaths.mockResolvedValue({
				ok: false,
				error: "Failed to retrieve paths",
			});

			render(<LocalDataManagementContent />);

			await waitFor(() => {
				expect(
					screen.getByText("Failed to retrieve paths"),
				).toBeInTheDocument();
			});
		});

		it("should show Unknown for paths when not provided", async () => {
			mockApi.getDataPaths.mockResolvedValue({
				ok: true,
			});

			render(<LocalDataManagementContent />);

			await waitFor(() => {
				const unknownElements = screen.getAllByText("Unknown");
				expect(unknownElements.length).toBeGreaterThanOrEqual(2);
			});
		});
	});

	describe("factory reset", () => {
		it("should render factory reset button", async () => {
			mockApi.getDataPaths.mockResolvedValue({
				ok: true,
				userData: "/path/to/data",
			});

			render(<LocalDataManagementContent />);

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: "Factory Reset" }),
				).toBeInTheDocument();
			});
		});

		it("should show confirmation dialog when factory reset is clicked", async () => {
			const user = userEvent.setup();
			mockApi.getDataPaths.mockResolvedValue({
				ok: true,
				userData: "/path/to/data",
			});

			render(<LocalDataManagementContent />);

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: "Factory Reset" }),
				).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: "Factory Reset" }));

			expect(mockConfirm).toHaveBeenCalledWith(
				expect.objectContaining({
					title: "Factory Reset",
					tone: "destructive",
				}),
			);
		});

		it("should not proceed with reset if user cancels", async () => {
			const user = userEvent.setup();
			mockApi.getDataPaths.mockResolvedValue({
				ok: true,
				userData: "/path/to/data",
			});
			mockConfirm.mockResolvedValue(false);

			render(<LocalDataManagementContent />);

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: "Factory Reset" }),
				).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: "Factory Reset" }));

			expect(clearAllStorageForFactoryReset).not.toHaveBeenCalled();
			expect(mockApi.factoryReset).not.toHaveBeenCalled();
		});

		it("should perform factory reset when user confirms", async () => {
			const user = userEvent.setup();
			mockApi.getDataPaths.mockResolvedValue({
				ok: true,
				userData: "/path/to/data",
			});
			mockConfirm.mockResolvedValue(true);
			mockApi.factoryReset.mockResolvedValue({ ok: true });

			render(<LocalDataManagementContent />);

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: "Factory Reset" }),
				).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: "Factory Reset" }));

			await waitFor(() => {
				expect(clearAllStorageForFactoryReset).toHaveBeenCalled();
				expect(mockApi.factoryReset).toHaveBeenCalled();
			});
		});

		it("should show error if factory reset fails", async () => {
			const user = userEvent.setup();
			mockApi.getDataPaths.mockResolvedValue({
				ok: true,
				userData: "/path/to/data",
			});
			mockConfirm.mockResolvedValue(true);
			mockApi.factoryReset.mockResolvedValue({
				ok: false,
				error: "Reset failed",
			});

			render(<LocalDataManagementContent />);

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: "Factory Reset" }),
				).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: "Factory Reset" }));

			await waitFor(() => {
				expect(screen.getByText("Reset failed")).toBeInTheDocument();
			});
		});
	});

	describe("guide section", () => {
		it("should display storage information", async () => {
			mockApi.getDataPaths.mockResolvedValue({
				ok: true,
				userData: "/path/to/data",
			});

			render(<LocalDataManagementContent />);

			expect(screen.getByText("About Storage")).toBeInTheDocument();
			expect(screen.getByText("Privacy Note")).toBeInTheDocument();
			expect(
				screen.getByText("All data is stored locally on your device"),
			).toBeInTheDocument();
		});
	});

	describe("error handling edge cases", () => {
		it("should handle No handler registered error", async () => {
			mockApi.getDataPaths.mockRejectedValue(
				new Error("No handler registered for getDataPaths"),
			);

			render(<LocalDataManagementContent />);

			await waitFor(() => {
				expect(
					screen.getByText(
						"Main process not updated yet. Please fully quit and relaunch the app.",
					),
				).toBeInTheDocument();
			});
		});

		it("should handle generic errors", async () => {
			mockApi.getDataPaths.mockRejectedValue(new Error("Unknown error"));

			render(<LocalDataManagementContent />);

			await waitFor(() => {
				expect(screen.getByText("Unknown error")).toBeInTheDocument();
			});
		});

		it("should fallback to localStorageDir when localStorageLevelDb not provided", async () => {
			mockApi.getDataPaths.mockResolvedValue({
				ok: true,
				userData: "/home/user/.config/shadowquill",
				localStorageDir: "/home/user/.config/shadowquill/Local Storage",
			});

			render(<LocalDataManagementContent />);

			await waitFor(() => {
				expect(
					screen.getByText("/home/user/.config/shadowquill/Local Storage"),
				).toBeInTheDocument();
			});
		});

		it("should handle missing userData gracefully", async () => {
			mockApi.getDataPaths.mockResolvedValue({
				ok: true,
				localStorageLevelDb: "/path/to/leveldb",
			});

			render(<LocalDataManagementContent />);

			await waitFor(() => {
				expect(screen.getByText("Unknown")).toBeInTheDocument();
			});
		});
	});

	describe("factory reset edge cases", () => {
		it("should handle exception during factory reset", async () => {
			const user = userEvent.setup();
			mockApi.getDataPaths.mockResolvedValue({
				ok: true,
				userData: "/path/to/data",
			});
			mockConfirm.mockResolvedValue(true);
			mockApi.factoryReset.mockRejectedValue(new Error("Reset exception"));

			render(<LocalDataManagementContent />);

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: "Factory Reset" }),
				).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: "Factory Reset" }));

			await waitFor(() => {
				expect(screen.getByText("Reset exception")).toBeInTheDocument();
			});
		});

		it("should handle null factoryReset response", async () => {
			const user = userEvent.setup();
			mockApi.getDataPaths.mockResolvedValue({
				ok: true,
				userData: "/path/to/data",
			});
			mockConfirm.mockResolvedValue(true);
			mockApi.factoryReset.mockResolvedValue(undefined);

			render(<LocalDataManagementContent />);

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: "Factory Reset" }),
				).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: "Factory Reset" }));

			await waitFor(() => {
				expect(screen.getByText("Reset failed")).toBeInTheDocument();
			});
		});

		it("should disable button while loading", async () => {
			const user = userEvent.setup();
			mockApi.getDataPaths.mockResolvedValue({
				ok: true,
				userData: "/path/to/data",
			});
			mockConfirm.mockResolvedValue(true);
			// Make factoryReset hang
			mockApi.factoryReset.mockImplementation(
				() => new Promise(() => {}), // Never resolves
			);

			render(<LocalDataManagementContent />);

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: "Factory Reset" }),
				).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: "Factory Reset" }));

			await waitFor(() => {
				const button = screen.getByRole("button", { name: "Factory Reset" });
				expect(button).toBeDisabled();
			});
		});
	});

	describe("loading state", () => {
		it("should show loading indicator initially", () => {
			mockApi.getDataPaths.mockImplementation(
				() => new Promise(() => {}), // Never resolves
			);

			render(<LocalDataManagementContent />);

			expect(screen.getByText("Loading…")).toBeInTheDocument();
		});
	});
});
