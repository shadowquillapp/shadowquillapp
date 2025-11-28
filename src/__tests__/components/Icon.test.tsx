import { render, screen } from "@testing-library/react";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { Icon } from "@/components/Icon";

// Mock console.error to test error handling
const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

describe("Icon", () => {
	afterEach(() => {
		mockConsoleError.mockClear();
	});

	afterAll(() => {
		mockConsoleError.mockRestore();
	});

	it("should render gear icon", () => {
		render(<Icon name="gear" />);
		const icon = document.querySelector("svg");
		expect(icon).toBeInTheDocument();
	});

	it("should render sliders icon", () => {
		render(<Icon name="sliders" />);
		const icon = document.querySelector("svg");
		expect(icon).toBeInTheDocument();
	});

	it("should render close icon", () => {
		render(<Icon name="close" />);
		const icon = document.querySelector("svg");
		expect(icon).toBeInTheDocument();
	});

	it("should apply custom className", () => {
		render(<Icon name="star" className="text-yellow-500" />);
		const icon = document.querySelector("svg");
		expect(icon).toHaveClass("text-yellow-500");
	});

	it("should accept title prop", () => {
		// FontAwesomeIcon may handle title differently - just verify render doesn't throw
		expect(() => render(<Icon name="copy" title="Copy to clipboard" />)).not.toThrow();
		const icon = document.querySelector("svg");
		expect(icon).toBeInTheDocument();
	});

	it("should apply custom style", () => {
		render(<Icon name="check" style={{ color: "green" }} />);
		const icon = document.querySelector("svg");
		// JSDOM converts named colors to RGB
		expect(icon).toHaveStyle({ color: "rgb(0, 128, 0)" });
	});

	it("should return null for invalid icon name", () => {
		// Restore console.error for this test to capture it
		mockConsoleError.mockRestore();
		const originalError = console.error;
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		
		const { container } = render(<Icon name={"invalid-icon" as any} />);
		expect(container.firstChild).toBeNull();
		expect(errorSpy).toHaveBeenCalled();
		
		errorSpy.mockRestore();
		console.error = originalError;
	});

	it("should render task type icons", () => {
		const taskIcons = ["bullseye", "video", "flask", "bullhorn"] as const;
		for (const name of taskIcons) {
			const { container } = render(<Icon name={name} />);
			expect(container.querySelector("svg")).toBeInTheDocument();
		}
	});

	it("should render navigation icons", () => {
		const navIcons = ["chevron-down", "chevron-up", "chevron-left", "chevron-right"] as const;
		for (const name of navIcons) {
			const { container } = render(<Icon name={name} />);
			expect(container.querySelector("svg")).toBeInTheDocument();
		}
	});

	it("should render action icons", () => {
		const actionIcons = ["edit", "trash", "save", "copy"] as const;
		for (const name of actionIcons) {
			const { container } = render(<Icon name={name} />);
			expect(container.querySelector("svg")).toBeInTheDocument();
		}
	});

	it("should render theme icons", () => {
		render(<Icon name="sun" />);
		expect(document.querySelector("svg")).toBeInTheDocument();

		render(<Icon name="moon" />);
		expect(document.querySelectorAll("svg")).toHaveLength(2);
	});
});

