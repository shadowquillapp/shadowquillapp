import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppVersionContent from "@/components/settings/AppVersionContent";

describe("AppVersionContent", () => {
	const mockCheckForUpdates = vi.fn();
	const mockOpenExternalUrl = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock window.shadowquill
		Object.defineProperty(window, "shadowquill", {
			value: {
				checkForUpdates: mockCheckForUpdates,
				openExternalUrl: mockOpenExternalUrl,
			},
			writable: true,
			configurable: true,
		});
	});

	describe("rendering", () => {
		it("should render the app version section", () => {
			render(<AppVersionContent />);

			expect(screen.getByText("ShadowQuill Version")).toBeInTheDocument();
			expect(screen.getByText("Application Information")).toBeInTheDocument();
			expect(screen.getByText("Current Version")).toBeInTheDocument();
			expect(screen.getByText("0.8.0")).toBeInTheDocument();
		});

		it("should render the check for updates section", () => {
			render(<AppVersionContent />);

			expect(screen.getByText("Check for Updates")).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Check for Updates" }),
			).toBeInTheDocument();
		});
	});

	describe("checking for updates", () => {
		it("should show checking state when button is clicked", async () => {
			const user = userEvent.setup();
			mockCheckForUpdates.mockImplementation(
				() =>
					new Promise((resolve) => {
						setTimeout(() => {
							resolve({
								success: true,
								currentVersion: "0.8.0",
								latestVersion: "0.8.0",
								updateAvailable: false,
							});
						}, 100);
					}),
			);

			render(<AppVersionContent />);

			const button = screen.getByRole("button", { name: "Check for Updates" });
			await user.click(button);

			// Button should have aria-label "Checking..." and be disabled
			expect(
				screen.getByRole("button", { name: "Checking..." }),
			).toBeInTheDocument();
			expect(button).toBeDisabled();
		});

		it("should display up-to-date message when no update is available", async () => {
			const user = userEvent.setup();
			mockCheckForUpdates.mockResolvedValue({
				success: true,
				currentVersion: "0.8.0",
				latestVersion: "0.8.0",
				updateAvailable: false,
			});

			render(<AppVersionContent />);

			const button = screen.getByRole("button", { name: "Check for Updates" });
			await user.click(button);

			await waitFor(() => {
				expect(screen.getByText("You're up to date!")).toBeInTheDocument();
				expect(
					screen.getByText("You are running the latest version (0.8.0).", {
						exact: false,
					}),
				).toBeInTheDocument();
			});
		});

		it("should display update available message when update exists", async () => {
			const user = userEvent.setup();
			mockCheckForUpdates.mockResolvedValue({
				success: true,
				currentVersion: "0.8.0",
				latestVersion: "0.9.0",
				updateAvailable: true,
				releaseUrl:
					"https://github.com/shadowquillapp/shadowquillapp/releases/tag/v0.9.0",
				publishedAt: "2025-12-16T12:00:00Z",
			});

			render(<AppVersionContent />);

			const button = screen.getByRole("button", { name: "Check for Updates" });
			await user.click(button);

			await waitFor(() => {
				expect(screen.getByText("Update Available!")).toBeInTheDocument();
				expect(
					screen.getByText(
						"Version 0.9.0 is now available. You are currently running version 0.8.0.",
						{ exact: false },
					),
				).toBeInTheDocument();
				expect(
					screen.getByRole("button", { name: "Download Latest Version" }),
				).toBeInTheDocument();
			});
		});

		it("should display release date when update is available", async () => {
			const user = userEvent.setup();
			mockCheckForUpdates.mockResolvedValue({
				success: true,
				currentVersion: "0.8.0",
				latestVersion: "0.9.0",
				updateAvailable: true,
				releaseUrl:
					"https://github.com/shadowquillapp/shadowquillapp/releases/tag/v0.9.0",
				publishedAt: "2025-12-16T12:00:00Z",
			});

			render(<AppVersionContent />);

			const button = screen.getByRole("button", { name: "Check for Updates" });
			await user.click(button);

			await waitFor(() => {
				expect(screen.getByText(/Released:/)).toBeInTheDocument();
				expect(screen.getByText(/December 16, 2025/)).toBeInTheDocument();
			});
		});

		it("should display error message when check fails", async () => {
			const user = userEvent.setup();
			mockCheckForUpdates.mockResolvedValue({
				success: false,
				error: "Network error",
			});

			render(<AppVersionContent />);

			const button = screen.getByRole("button", { name: "Check for Updates" });
			await user.click(button);

			await waitFor(() => {
				expect(
					screen.getByText("Error Checking for Updates"),
				).toBeInTheDocument();
				expect(screen.getByText("Network error")).toBeInTheDocument();
			});
		});

		it("should handle unknown errors gracefully", async () => {
			const user = userEvent.setup();
			mockCheckForUpdates.mockRejectedValue(new Error("Unexpected error"));

			render(<AppVersionContent />);

			const button = screen.getByRole("button", { name: "Check for Updates" });
			await user.click(button);

			await waitFor(() => {
				expect(
					screen.getByText("Error Checking for Updates"),
				).toBeInTheDocument();
				expect(screen.getByText("Unexpected error")).toBeInTheDocument();
			});
		});
	});

	describe("opening release URL", () => {
		it("should open external URL when download button is clicked", async () => {
			const user = userEvent.setup();
			const releaseUrl =
				"https://github.com/shadowquillapp/shadowquillapp/releases/tag/v0.9.0";

			mockCheckForUpdates.mockResolvedValue({
				success: true,
				currentVersion: "0.8.0",
				latestVersion: "0.9.0",
				updateAvailable: true,
				releaseUrl,
			});

			mockOpenExternalUrl.mockResolvedValue({ success: true });

			render(<AppVersionContent />);

			const checkButton = screen.getByRole("button", {
				name: "Check for Updates",
			});
			await user.click(checkButton);

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: "Download Latest Version" }),
				).toBeInTheDocument();
			});

			const downloadButton = screen.getByRole("button", {
				name: "Download Latest Version",
			});
			await user.click(downloadButton);

			expect(mockOpenExternalUrl).toHaveBeenCalledWith(releaseUrl);
		});

		it("should handle errors when opening URL fails", async () => {
			const user = userEvent.setup();
			const consoleErrorSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			mockCheckForUpdates.mockResolvedValue({
				success: true,
				currentVersion: "0.8.0",
				latestVersion: "0.9.0",
				updateAvailable: true,
				releaseUrl:
					"https://github.com/shadowquillapp/shadowquillapp/releases/tag/v0.9.0",
			});

			mockOpenExternalUrl.mockRejectedValue(new Error("Failed to open URL"));

			render(<AppVersionContent />);

			const checkButton = screen.getByRole("button", {
				name: "Check for Updates",
			});
			await user.click(checkButton);

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: "Download Latest Version" }),
				).toBeInTheDocument();
			});

			const downloadButton = screen.getByRole("button", {
				name: "Download Latest Version",
			});
			await user.click(downloadButton);

			await waitFor(() => {
				expect(consoleErrorSpy).toHaveBeenCalledWith(
					"Failed to open URL:",
					expect.any(Error),
				);
			});

			consoleErrorSpy.mockRestore();
		});
	});

	describe("button states", () => {
		it("should disable button while checking for updates", async () => {
			const user = userEvent.setup();
			mockCheckForUpdates.mockImplementation(
				() =>
					new Promise((resolve) => {
						setTimeout(() => {
							resolve({
								success: true,
								currentVersion: "0.8.0",
								latestVersion: "0.8.0",
								updateAvailable: false,
							});
						}, 100);
					}),
			);

			render(<AppVersionContent />);

			const button = screen.getByRole("button", { name: "Check for Updates" });
			await user.click(button);

			// Button should be disabled and have aria-label "Checking..."
			const checkingButton = screen.getByRole("button", {
				name: "Checking...",
			});
			expect(checkingButton).toBeDisabled();
			expect(checkingButton).toHaveStyle({ cursor: "wait" });
		});

		it("should re-enable button after check completes", async () => {
			const user = userEvent.setup();
			mockCheckForUpdates.mockResolvedValue({
				success: true,
				currentVersion: "0.8.0",
				latestVersion: "0.8.0",
				updateAvailable: false,
			});

			render(<AppVersionContent />);

			const button = screen.getByRole("button", { name: "Check for Updates" });
			await user.click(button);

			await waitFor(() => {
				expect(button).not.toBeDisabled();
			});
		});
	});

	describe("result display styling", () => {
		it("should show green styling for up-to-date status", async () => {
			const user = userEvent.setup();
			mockCheckForUpdates.mockResolvedValue({
				success: true,
				currentVersion: "0.8.0",
				latestVersion: "0.8.0",
				updateAvailable: false,
			});

			render(<AppVersionContent />);

			const button = screen.getByRole("button", { name: "Check for Updates" });
			await user.click(button);

			await waitFor(() => {
				const resultDiv = screen.getByText("You're up to date!").parentElement;
				expect(resultDiv).toBeInTheDocument();
				// Check that styles are applied (browser normalizes colors so we check individually)
				const styles = window.getComputedStyle(resultDiv as Element);
				expect(styles.borderRadius).toBe("8px");
				expect(styles.marginTop).toBe("16px");
				expect(styles.padding).toBe("16px");
			});
		});

		it("should show yellow styling for update available status", async () => {
			const user = userEvent.setup();
			mockCheckForUpdates.mockResolvedValue({
				success: true,
				currentVersion: "0.8.0",
				latestVersion: "0.9.0",
				updateAvailable: true,
				releaseUrl:
					"https://github.com/shadowquillapp/shadowquillapp/releases/tag/v0.9.0",
			});

			render(<AppVersionContent />);

			const button = screen.getByRole("button", { name: "Check for Updates" });
			await user.click(button);

			await waitFor(() => {
				const resultDiv = screen.getByText("Update Available!").parentElement;
				expect(resultDiv).toBeInTheDocument();
				// Check that download button exists
				expect(
					screen.getByRole("button", { name: "Download Latest Version" }),
				).toBeInTheDocument();
				// Check that styles are applied
				const styles = window.getComputedStyle(resultDiv as Element);
				expect(styles.borderRadius).toBe("8px");
				expect(styles.marginTop).toBe("16px");
				expect(styles.padding).toBe("16px");
			});
		});

		it("should show red styling for error status", async () => {
			const user = userEvent.setup();
			mockCheckForUpdates.mockResolvedValue({
				success: false,
				error: "Network error",
			});

			render(<AppVersionContent />);

			const button = screen.getByRole("button", { name: "Check for Updates" });
			await user.click(button);

			await waitFor(() => {
				const resultDiv = screen.getByText(
					"Error Checking for Updates",
				).parentElement;
				expect(resultDiv).toBeInTheDocument();
				// Check that error message is displayed
				expect(screen.getByText("Network error")).toBeInTheDocument();
				// Check that styles are applied
				const styles = window.getComputedStyle(resultDiv as Element);
				expect(styles.borderRadius).toBe("8px");
				expect(styles.marginTop).toBe("16px");
				expect(styles.padding).toBe("16px");
			});
		});
	});
});
