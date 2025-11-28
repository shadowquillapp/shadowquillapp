import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomSelect } from "@/components/CustomSelect";

const defaultOptions = [
	{ value: "option1", label: "Option 1" },
	{ value: "option2", label: "Option 2" },
	{ value: "option3", label: "Option 3" },
];

describe("CustomSelect", () => {
	const mockOnChange = vi.fn();

	beforeEach(() => {
		mockOnChange.mockClear();
	});

	describe("rendering", () => {
		it("should render with placeholder when no value selected", () => {
			render(
				<CustomSelect
					value=""
					onChange={mockOnChange}
					options={defaultOptions}
					placeholder="Select an option"
				/>,
			);

			expect(screen.getByText("Select an option")).toBeInTheDocument();
		});

		it("should render selected option label", () => {
			render(
				<CustomSelect
					value="option2"
					onChange={mockOnChange}
					options={defaultOptions}
				/>,
			);

			expect(screen.getByText("Option 2")).toBeInTheDocument();
		});

		it("should use default placeholder when none provided", () => {
			render(
				<CustomSelect
					value=""
					onChange={mockOnChange}
					options={defaultOptions}
				/>,
			);

			expect(screen.getByText("Select...")).toBeInTheDocument();
		});

		it("should apply custom className", () => {
			render(
				<CustomSelect
					value=""
					onChange={mockOnChange}
					options={defaultOptions}
					className="custom-class"
				/>,
			);

			const button = screen.getByRole("button");
			expect(button).toHaveClass("custom-class");
		});

		it("should have correct ARIA attributes", () => {
			render(
				<CustomSelect
					value=""
					onChange={mockOnChange}
					options={defaultOptions}
					aria-label="Choose option"
				/>,
			);

			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("aria-haspopup", "menu");
			expect(button).toHaveAttribute("aria-expanded", "false");
			expect(button).toHaveAttribute("aria-label", "Choose option");
		});

		it("should apply title attribute", () => {
			render(
				<CustomSelect
					value=""
					onChange={mockOnChange}
					options={defaultOptions}
					title="Select tooltip"
				/>,
			);

			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("title", "Select tooltip");
		});
	});

	describe("disabled state", () => {
		it("should be disabled when disabled prop is true", () => {
			render(
				<CustomSelect
					value=""
					onChange={mockOnChange}
					options={defaultOptions}
					disabled
				/>,
			);

			const button = screen.getByRole("button");
			expect(button).toBeDisabled();
		});

		it("should not open dropdown when disabled", async () => {
			const user = userEvent.setup();

			render(
				<CustomSelect
					value=""
					onChange={mockOnChange}
					options={defaultOptions}
					disabled
				/>,
			);

			const button = screen.getByRole("button");
			await user.click(button);

			expect(screen.queryByRole("menu")).not.toBeInTheDocument();
		});
	});

	describe("dropdown behavior", () => {
		it("should open dropdown on click", async () => {
			const user = userEvent.setup();

			render(
				<CustomSelect
					value=""
					onChange={mockOnChange}
					options={defaultOptions}
				/>,
			);

			const button = screen.getByRole("button");
			await user.click(button);

			expect(screen.getByRole("menu")).toBeInTheDocument();
		});

		it("should show all options when open", async () => {
			const user = userEvent.setup();

			render(
				<CustomSelect
					value=""
					onChange={mockOnChange}
					options={defaultOptions}
				/>,
			);

			const button = screen.getByRole("button");
			await user.click(button);

			expect(screen.getByText("Option 1")).toBeInTheDocument();
			expect(screen.getByText("Option 2")).toBeInTheDocument();
			expect(screen.getByText("Option 3")).toBeInTheDocument();
		});

		it("should update aria-expanded when open", async () => {
			const user = userEvent.setup();

			render(
				<CustomSelect
					value=""
					onChange={mockOnChange}
					options={defaultOptions}
				/>,
			);

			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("aria-expanded", "false");

			await user.click(button);

			expect(button).toHaveAttribute("aria-expanded", "true");
		});

		it("should close dropdown on escape key", async () => {
			const user = userEvent.setup();

			render(
				<CustomSelect
					value=""
					onChange={mockOnChange}
					options={defaultOptions}
				/>,
			);

			const button = screen.getByRole("button");
			await user.click(button);

			expect(screen.getByRole("menu")).toBeInTheDocument();

			await user.keyboard("{Escape}");

			await waitFor(() => {
				expect(screen.queryByRole("menu")).not.toBeInTheDocument();
			});
		});

		it("should toggle dropdown on repeated clicks", async () => {
			const user = userEvent.setup();

			render(
				<CustomSelect
					value=""
					onChange={mockOnChange}
					options={defaultOptions}
				/>,
			);

			const button = screen.getByRole("button");

			// Open
			await user.click(button);
			expect(screen.getByRole("menu")).toBeInTheDocument();

			// Close
			await user.click(button);
			await waitFor(() => {
				expect(screen.queryByRole("menu")).not.toBeInTheDocument();
			});
		});
	});

	describe("selection", () => {
		it("should call onChange when option is selected", async () => {
			const user = userEvent.setup();

			render(
				<CustomSelect
					value=""
					onChange={mockOnChange}
					options={defaultOptions}
				/>,
			);

			const button = screen.getByRole("button");
			await user.click(button);

			const option = screen.getByText("Option 2");
			await user.click(option);

			expect(mockOnChange).toHaveBeenCalledWith("option2");
		});

		it("should close dropdown after selection", async () => {
			const user = userEvent.setup();

			render(
				<CustomSelect
					value=""
					onChange={mockOnChange}
					options={defaultOptions}
				/>,
			);

			const button = screen.getByRole("button");
			await user.click(button);

			const option = screen.getByText("Option 1");
			await user.click(option);

			await waitFor(() => {
				expect(screen.queryByRole("menu")).not.toBeInTheDocument();
			});
		});

		it("should not select disabled option", async () => {
			const user = userEvent.setup();
			const optionsWithDisabled = [
				{ value: "option1", label: "Option 1" },
				{ value: "option2", label: "Option 2", disabled: true },
			];

			render(
				<CustomSelect
					value=""
					onChange={mockOnChange}
					options={optionsWithDisabled}
				/>,
			);

			const button = screen.getByRole("button");
			await user.click(button);

			const disabledOption = screen.getByText("Option 2");
			await user.click(disabledOption);

			expect(mockOnChange).not.toHaveBeenCalled();
		});

		it("should highlight selected option", async () => {
			const user = userEvent.setup();

			render(
				<CustomSelect
					value="option2"
					onChange={mockOnChange}
					options={defaultOptions}
				/>,
			);

			const button = screen.getByRole("button");
			await user.click(button);

			const menuItems = screen.getAllByRole("menuitem");
			const selectedItem = menuItems.find(
				(item) => item.textContent === "Option 2",
			);

			expect(selectedItem).toHaveStyle({
				background: "var(--color-primary)",
			});
		});
	});

	describe("options with icons", () => {
		it("should render icon when option has icon property", async () => {
			const user = userEvent.setup();
			const optionsWithIcons = [
				{ value: "gear", label: "Settings", icon: "gear" as const },
				{ value: "star", label: "Favorites", icon: "star" as const },
			];

			render(
				<CustomSelect
					value="gear"
					onChange={mockOnChange}
					options={optionsWithIcons}
				/>,
			);

			// Icon should appear in the selected display
			const svgInButton = screen
				.getByRole("button")
				.querySelector("svg.svg-inline--fa");
			expect(svgInButton).toBeInTheDocument();

			// Open dropdown
			const button = screen.getByRole("button");
			await user.click(button);

			// Icons should appear in dropdown options
			const menu = screen.getByRole("menu");
			const svgsInMenu = menu.querySelectorAll("svg.svg-inline--fa");
			expect(svgsInMenu.length).toBe(2);
		});
	});
});

