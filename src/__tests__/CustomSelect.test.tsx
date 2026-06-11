import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CustomSelect } from "@/components/CustomSelect";

const OPTIONS = [
	{ value: "a", label: "Alpha" },
	{ value: "b", label: "Beta" },
	{ value: "c", label: "Gamma", disabled: true },
];

function openSelect() {
	const trigger = screen.getByRole("button", { name: /select option/i });
	fireEvent.click(trigger);
	return trigger;
}

describe("CustomSelect", () => {
	it("opens the menu and focuses the selected option", () => {
		render(
			<CustomSelect
				value="b"
				onChange={() => {}}
				options={OPTIONS}
				aria-label="Select option"
			/>,
		);
		openSelect();
		expect(screen.getByRole("menu")).toBeTruthy();
		expect(document.activeElement?.textContent).toContain("Beta");
	});

	it("moves focus with arrow keys, skipping disabled options and wrapping", () => {
		render(
			<CustomSelect
				value="a"
				onChange={() => {}}
				options={OPTIONS}
				aria-label="Select option"
			/>,
		);
		openSelect();
		const menu = screen.getByRole("menu");
		fireEvent.keyDown(menu, { key: "ArrowDown" });
		expect(document.activeElement?.textContent).toContain("Beta");
		// Gamma is disabled, so ArrowDown wraps back to Alpha.
		fireEvent.keyDown(menu, { key: "ArrowDown" });
		expect(document.activeElement?.textContent).toContain("Alpha");
		fireEvent.keyDown(menu, { key: "ArrowUp" });
		expect(document.activeElement?.textContent).toContain("Beta");
	});

	it("selects an option on click and closes the menu", () => {
		const onChange = vi.fn();
		render(
			<CustomSelect
				value="a"
				onChange={onChange}
				options={OPTIONS}
				aria-label="Select option"
			/>,
		);
		openSelect();
		fireEvent.click(screen.getByRole("menuitem", { name: "Beta" }));
		expect(onChange).toHaveBeenCalledWith("b");
		expect(screen.queryByRole("menu")).toBeNull();
	});

	it("closes on Escape and restores trigger focus", () => {
		render(
			<CustomSelect
				value="a"
				onChange={() => {}}
				options={OPTIONS}
				aria-label="Select option"
			/>,
		);
		const trigger = openSelect();
		fireEvent.keyDown(document, { key: "Escape" });
		expect(screen.queryByRole("menu")).toBeNull();
		expect(document.activeElement).toBe(trigger);
	});

	it("does not invoke onChange for disabled options", () => {
		const onChange = vi.fn();
		render(
			<CustomSelect
				value="a"
				onChange={onChange}
				options={OPTIONS}
				aria-label="Select option"
			/>,
		);
		openSelect();
		fireEvent.click(screen.getByRole("menuitem", { name: "Gamma" }));
		expect(onChange).not.toHaveBeenCalled();
	});
});
