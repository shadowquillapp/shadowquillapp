import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FindBar from "@/components/FindBar";

describe("FindBar", () => {
	let showHandler: (() => void) | undefined;

	beforeEach(() => {
		document.body.innerHTML = "<main><p>Hello shadow world</p></main>";
		showHandler = undefined;
		Element.prototype.scrollIntoView = vi.fn();

		Object.defineProperty(window, "shadowquill", {
			configurable: true,
			value: {
				find: {
					onShow: (callback: () => void) => {
						showHandler = callback;
						return () => {
							showHandler = undefined;
						};
					},
					onNext: () => () => {},
					onPrevious: () => () => {},
				},
			},
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("searches while typing after the debounce delay", () => {
		vi.useFakeTimers();
		render(<FindBar />);

		act(() => {
			showHandler?.();
		});

		const input = screen.getByPlaceholderText("Find in page...");
		fireEvent.change(input, { target: { value: "shadow" } });

		expect(screen.queryByText("1/1")).not.toBeInTheDocument();

		act(() => {
			vi.advanceTimersByTime(200);
		});

		expect(screen.getByText("1/1")).toBeInTheDocument();
	});
});
