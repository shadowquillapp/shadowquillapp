import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FeatherLoader from "@/components/FeatherLoader";

describe("FeatherLoader", () => {
	it("should render with default text", () => {
		render(<FeatherLoader />);
		expect(screen.getByText("Crafting...")).toBeInTheDocument();
	});

	it("should render with custom text", () => {
		render(<FeatherLoader text="Loading..." />);
		expect(screen.getByText("Loading...")).toBeInTheDocument();
	});

	it("should have luxury-loader class", () => {
		const { container } = render(<FeatherLoader />);
		expect(container.firstChild).toHaveClass("luxury-loader");
	});

	it("should apply custom className", () => {
		const { container } = render(<FeatherLoader className="my-custom-class" />);
		expect(container.firstChild).toHaveClass("my-custom-class");
	});

	it("should render an SVG icon", () => {
		render(<FeatherLoader />);
		const svg = document.querySelector("svg");
		expect(svg).toBeInTheDocument();
	});

	it("should have icon container with correct class", () => {
		const { container } = render(<FeatherLoader />);
		const iconContainer = container.querySelector(".luxury-loader__icon");
		expect(iconContainer).toBeInTheDocument();
	});

	it("should have text element with correct class", () => {
		const { container } = render(<FeatherLoader />);
		const textElement = container.querySelector(".luxury-loader__text");
		expect(textElement).toBeInTheDocument();
		expect(textElement).toHaveTextContent("Crafting...");
	});

	it("should render with empty text", () => {
		render(<FeatherLoader text="" />);
		const textElement = document.querySelector(".luxury-loader__text");
		expect(textElement).toBeInTheDocument();
		expect(textElement).toHaveTextContent("");
	});

	it("should have SVG with correct viewBox", () => {
		render(<FeatherLoader />);
		const svg = document.querySelector("svg");
		expect(svg).toHaveAttribute("viewBox", "-20 -21 375 375");
	});

	it("should use currentColor for the path fill", () => {
		render(<FeatherLoader />);
		const path = document.querySelector("path");
		expect(path).toHaveAttribute("fill", "currentColor");
	});
});

