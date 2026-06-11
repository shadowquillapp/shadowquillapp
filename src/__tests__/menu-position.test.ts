import { describe, expect, it, vi } from "vitest";
import { computeMenuPosition } from "@/components/menu-position";

describe("computeMenuPosition", () => {
	const rect = {
		top: 100,
		bottom: 132,
		left: 40,
		right: 200,
		width: 160,
		height: 32,
	} as DOMRect;

	it("opens downward when there is room below", () => {
		vi.stubGlobal("innerHeight", 800);
		vi.stubGlobal("innerWidth", 1024);

		const pos = computeMenuPosition(rect, 3);
		expect(pos.openUpward).toBe(false);
		expect(pos.top).toBe(rect.bottom + 4);
		expect(pos.width).toBe(rect.width);
	});

	it("opens upward when below space is tight", () => {
		vi.stubGlobal("innerHeight", 180);
		vi.stubGlobal("innerWidth", 1024);

		const pos = computeMenuPosition(rect, 8);
		expect(pos.openUpward).toBe(true);
		expect(pos.top).toBeLessThan(rect.top);
	});

	it("clamps left edge inside the viewport", () => {
		vi.stubGlobal("innerHeight", 800);
		vi.stubGlobal("innerWidth", 200);

		const wideRect = { ...rect, left: 180, width: 160 } as DOMRect;
		const pos = computeMenuPosition(wideRect, 2);
		expect(pos.left).toBe(32);
		expect(pos.left + pos.width).toBeLessThanOrEqual(200 - 8);
	});

	it("never returns a negative maxHeight on a cramped viewport", () => {
		vi.stubGlobal("innerHeight", 40);
		vi.stubGlobal("innerWidth", 320);

		const pos = computeMenuPosition(rect, 20);
		expect(pos.maxHeight).toBeGreaterThanOrEqual(0);
	});

	it("handles zero items without throwing", () => {
		vi.stubGlobal("innerHeight", 800);
		vi.stubGlobal("innerWidth", 1024);

		const pos = computeMenuPosition(rect, 0);
		expect(pos.maxHeight).toBeGreaterThanOrEqual(0);
		expect(pos.width).toBe(rect.width);
	});
});
