import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Logo } from "@/components/Logo";

describe("Logo", () => {
	it("should render an SVG element", () => {
		render(<Logo />);
		const svg = document.querySelector("svg");
		expect(svg).toBeInTheDocument();
	});

	it("should have accessible aria-label", () => {
		render(<Logo />);
		const svg = screen.getByLabelText("ShadowQuill Logo");
		expect(svg).toBeInTheDocument();
	});

	it("should apply custom className", () => {
		render(<Logo className="custom-class" />);
		const svg = document.querySelector("svg");
		expect(svg).toHaveClass("custom-class");
	});

	it("should apply custom style", () => {
		render(<Logo style={{ width: "100px", height: "100px" }} />);
		const svg = document.querySelector("svg");
		expect(svg).toHaveStyle({ width: "100px", height: "100px" });
	});

	it("should have correct viewBox", () => {
		render(<Logo />);
		const svg = document.querySelector("svg");
		expect(svg).toHaveAttribute("viewBox", "-20 -21 375 375");
	});

	it("should contain a path element", () => {
		render(<Logo />);
		const path = document.querySelector("path");
		expect(path).toBeInTheDocument();
	});

	it("should use currentColor for fill", () => {
		render(<Logo />);
		const path = document.querySelector("path");
		expect(path).toHaveAttribute("fill", "currentColor");
	});
});

