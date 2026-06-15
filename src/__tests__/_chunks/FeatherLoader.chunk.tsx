import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FeatherLoader from "@/components/FeatherLoader";

describe("FeatherLoader", () => {
	it("exposes a busy status region with static screen-reader text", () => {
		render(<FeatherLoader text="Generating" />);

		const status = screen.getByRole("status");
		expect(status).toHaveAttribute("aria-busy", "true");
		expect(status).toHaveTextContent("Generating");
		expect(
			screen.getByText("Generating", { selector: ".sr-only" }),
		).toBeTruthy();
	});
});
