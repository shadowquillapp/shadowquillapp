import DisplayContent from "@/components/settings/DisplayContent";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("DisplayContent", () => {
	const mockViewApi = {
		getZoomFactor: vi.fn(),
		setZoomFactor: vi.fn(),
		onZoomChanged: vi.fn(),
	};
	const mockWindowApi = {
		getSize: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		(window as unknown as { shadowquill?: unknown }).shadowquill = {
			view: mockViewApi,
			window: mockWindowApi,
		};
		// Mock localStorage
		vi.spyOn(Storage.prototype, "getItem").mockReturnValue(null);
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {});
	});

	afterEach(() => {
		(window as unknown as { shadowquill?: unknown }).shadowquill = undefined;
		vi.restoreAllMocks();
	});

	describe("rendering", () => {
		it("should render the display settings panel", () => {
			mockViewApi.getZoomFactor.mockResolvedValue(1);
			render(<DisplayContent />);
			expect(screen.getByText("Display")).toBeInTheDocument();
			expect(screen.getByText("Display & Theme")).toBeInTheDocument();
		});

		it("should render theme selection buttons", () => {
			mockViewApi.getZoomFactor.mockResolvedValue(1);
			render(<DisplayContent />);
			expect(screen.getByLabelText("Select Default theme")).toBeInTheDocument();
			expect(
				screen.getByLabelText("Select Dark Purple theme"),
			).toBeInTheDocument();
			expect(screen.getByLabelText("Select Dark theme")).toBeInTheDocument();
			expect(screen.getByLabelText("Select Light theme")).toBeInTheDocument();
		});

		it("should render zoom controls", () => {
			mockViewApi.getZoomFactor.mockResolvedValue(1);
			render(<DisplayContent />);
			expect(screen.getByText("Zoom")).toBeInTheDocument();
			expect(screen.getByLabelText("Zoom out")).toBeInTheDocument();
			expect(screen.getByLabelText("Zoom in")).toBeInTheDocument();
			expect(screen.getByLabelText("Zoom level")).toBeInTheDocument();
			expect(screen.getByLabelText("Reset zoom")).toBeInTheDocument();
		});

		it("should show unavailable message when API not present", () => {
			(window as unknown as { shadowquill?: unknown }).shadowquill = undefined;
			render(<DisplayContent />);
			expect(
				screen.getByText("Not available outside the desktop app."),
			).toBeInTheDocument();
		});
	});

	describe("zoom controls", () => {
		it("should display current zoom level", async () => {
			mockViewApi.getZoomFactor.mockResolvedValue(1.1);
			render(<DisplayContent />);

			await waitFor(() => {
				expect(screen.getByText("110%")).toBeInTheDocument();
			});
		});

		it("should increase zoom when + button is clicked", async () => {
			const user = userEvent.setup();
			mockViewApi.getZoomFactor.mockResolvedValue(1);
			mockViewApi.setZoomFactor.mockResolvedValue(undefined);
			render(<DisplayContent />);

			await waitFor(() => {
				expect(screen.getByText("100%")).toBeInTheDocument();
			});

			await user.click(screen.getByLabelText("Zoom in"));

			expect(mockViewApi.setZoomFactor).toHaveBeenCalledWith(1.1);
		});

		it("should decrease zoom when - button is clicked", async () => {
			const user = userEvent.setup();
			mockViewApi.getZoomFactor.mockResolvedValue(1.1);
			mockViewApi.setZoomFactor.mockResolvedValue(undefined);
			render(<DisplayContent />);

			await waitFor(() => {
				expect(screen.getByText("110%")).toBeInTheDocument();
			});

			await user.click(screen.getByLabelText("Zoom out"));

			expect(mockViewApi.setZoomFactor).toHaveBeenCalledWith(1);
		});

		it("should reset zoom to 110% when reset button is clicked", async () => {
			const user = userEvent.setup();
			mockViewApi.getZoomFactor.mockResolvedValue(1.3);
			mockViewApi.setZoomFactor.mockResolvedValue(undefined);
			render(<DisplayContent />);

			await waitFor(() => {
				expect(screen.getByText("130%")).toBeInTheDocument();
			});

			await user.click(screen.getByLabelText("Reset zoom"));

			expect(mockViewApi.setZoomFactor).toHaveBeenCalledWith(1.1);
		});

		it("should update zoom via slider", async () => {
			mockViewApi.getZoomFactor.mockResolvedValue(1);
			mockViewApi.setZoomFactor.mockResolvedValue(undefined);
			render(<DisplayContent />);

			await waitFor(() => {
				expect(screen.getByText("100%")).toBeInTheDocument();
			});

			const slider = screen.getByLabelText("Zoom level");
			fireEvent.change(slider, { target: { value: "120" } });

			expect(mockViewApi.setZoomFactor).toHaveBeenCalledWith(1.2);
		});

		it("should disable zoom controls when API not available", () => {
			(window as unknown as { shadowquill?: unknown }).shadowquill = undefined;
			render(<DisplayContent />);

			expect(screen.getByLabelText("Zoom out")).toBeDisabled();
			expect(screen.getByLabelText("Zoom in")).toBeDisabled();
			expect(screen.getByLabelText("Zoom level")).toBeDisabled();
			expect(screen.getByLabelText("Reset zoom")).toBeDisabled();
		});
	});

	describe("theme selection", () => {
		it("should change theme when theme button is clicked", async () => {
			const user = userEvent.setup();
			mockViewApi.getZoomFactor.mockResolvedValue(1);
			render(<DisplayContent />);

			await user.click(screen.getByLabelText("Select Dark theme"));

			expect(localStorage.setItem).toHaveBeenCalledWith(
				"theme-preference",
				"dark",
			);
			expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
		});

		it("should render all theme options", () => {
			mockViewApi.getZoomFactor.mockResolvedValue(1);
			render(<DisplayContent />);

			// Verify all theme options are rendered
			expect(screen.getByLabelText("Select Default theme")).toBeInTheDocument();
			expect(
				screen.getByLabelText("Select Dark Purple theme"),
			).toBeInTheDocument();
			expect(screen.getByLabelText("Select Dark theme")).toBeInTheDocument();
			expect(screen.getByLabelText("Select Light theme")).toBeInTheDocument();
		});

		it("should update document data-theme attribute on theme change", async () => {
			const user = userEvent.setup();
			mockViewApi.getZoomFactor.mockResolvedValue(1);
			render(<DisplayContent />);

			// Click on light theme
			await user.click(screen.getByLabelText("Select Light theme"));

			expect(document.documentElement.getAttribute("data-theme")).toBe("light");
		});
	});

	describe("display stats", () => {
		it("should toggle display stats visibility", async () => {
			const user = userEvent.setup();
			mockViewApi.getZoomFactor.mockResolvedValue(1);
			render(<DisplayContent />);

			// Stats should be hidden initially
			expect(screen.queryByText("Content Area")).not.toBeInTheDocument();

			// Click to show stats
			await user.click(screen.getByText("Display Stats"));

			expect(screen.getByText("Content Area")).toBeInTheDocument();
			expect(screen.getByText("OS Window")).toBeInTheDocument();
		});

		it("should display window size information", async () => {
			const user = userEvent.setup();
			mockViewApi.getZoomFactor.mockResolvedValue(1);
			mockWindowApi.getSize.mockResolvedValue({
				ok: true,
				windowSize: [1920, 1080],
				contentSize: [1904, 1040],
				isMaximized: false,
				isFullScreen: false,
			});
			render(<DisplayContent />);

			await user.click(screen.getByText("Display Stats"));

			await waitFor(() => {
				expect(screen.getByText("1920 × 1080 px")).toBeInTheDocument();
				expect(screen.getByText("1904 × 1040 px")).toBeInTheDocument();
				expect(screen.getByText("Windowed")).toBeInTheDocument();
			});
		});

		it("should show Maximized state", async () => {
			const user = userEvent.setup();
			mockViewApi.getZoomFactor.mockResolvedValue(1);
			mockWindowApi.getSize.mockResolvedValue({
				ok: true,
				windowSize: [1920, 1080],
				contentSize: [1904, 1040],
				isMaximized: true,
				isFullScreen: false,
			});
			render(<DisplayContent />);

			await user.click(screen.getByText("Display Stats"));

			await waitFor(() => {
				expect(screen.getByText("Maximized")).toBeInTheDocument();
			});
		});

		it("should show Fullscreen state", async () => {
			const user = userEvent.setup();
			mockViewApi.getZoomFactor.mockResolvedValue(1);
			mockWindowApi.getSize.mockResolvedValue({
				ok: true,
				windowSize: [1920, 1080],
				contentSize: [1920, 1080],
				isMaximized: false,
				isFullScreen: true,
			});
			render(<DisplayContent />);

			await user.click(screen.getByText("Display Stats"));

			await waitFor(() => {
				expect(screen.getByText("Fullscreen")).toBeInTheDocument();
			});
		});
	});
});
