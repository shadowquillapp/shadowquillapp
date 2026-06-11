import { describe, expect, it } from "vitest";
import { computeMenuPosition } from "@/components/menu-position";

function rect(
	top: number,
	left: number,
	width: number,
	height: number,
): DOMRect {
	return {
		top,
		left,
		right: left + width,
		bottom: top + height,
		width,
		height,
		x: left,
		y: top,
		toJSON: () => ({}),
	} as DOMRect;
}

describe("computeMenuPosition", () => {
	it("opens downward when there is room below", () => {
		Object.defineProperty(window, "innerHeight", {
			value: 800,
			configurable: true,
		});
		Object.defineProperty(window, "innerWidth", {
			value: 1200,
			configurable: true,
		});

		const position = computeMenuPosition(rect(100, 200, 160, 32), 4);

		expect(position.openUpward).toBe(false);
		expect(position.top).toBe(136);
		expect(position.left).toBe(200);
		expect(position.width).toBe(160);
		expect(position.maxHeight).toBeGreaterThan(0);
	});

	it("opens upward when below space is tight and above has more room", () => {
		Object.defineProperty(window, "innerHeight", {
			value: 300,
			configurable: true,
		});
		Object.defineProperty(window, "innerWidth", {
			value: 800,
			configurable: true,
		});

		const position = computeMenuPosition(rect(240, 40, 120, 28), 6, {
			rowHeight: 40,
			padding: 16,
			maxHeightCap: 300,
		});

		expect(position.openUpward).toBe(true);
		expect(position.top).toBeLessThan(240);
	});

	it("aligns end menus to the trigger right edge", () => {
		Object.defineProperty(window, "innerHeight", {
			value: 800,
			configurable: true,
		});
		Object.defineProperty(window, "innerWidth", {
			value: 400,
			configurable: true,
		});

		const position = computeMenuPosition(rect(80, 300, 80, 24), 3, {
			align: "end",
			menuWidth: 200,
		});

		expect(position.left).toBe(180);
		expect(position.width).toBe(200);
	});

	it("clamps left within viewport padding", () => {
		Object.defineProperty(window, "innerHeight", {
			value: 800,
			configurable: true,
		});
		Object.defineProperty(window, "innerWidth", {
			value: 320,
			configurable: true,
		});

		const position = computeMenuPosition(rect(40, 2, 120, 24), 2, {
			menuWidth: 280,
		});

		expect(position.left).toBe(8);
	});
});
