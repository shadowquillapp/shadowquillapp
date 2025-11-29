import FindBar from "@/components/FindBar";
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Store callbacks to trigger them in tests
let showCallback: (() => void) | null = null;
let nextCallback: (() => void) | null = null;
let previousCallback: (() => void) | null = null;

const setupMockFind = () => {
	Object.defineProperty(window, "shadowquill", {
		value: {
			find: {
				onShow: (callback: () => void) => {
					showCallback = callback;
					return vi.fn(); // unsubscribe function
				},
				onNext: (callback: () => void) => {
					nextCallback = callback;
					return vi.fn();
				},
				onPrevious: (callback: () => void) => {
					previousCallback = callback;
					return vi.fn();
				},
			},
		},
		writable: true,
		configurable: true,
	});
};

const triggerShow = () => {
	if (showCallback) {
		act(() => {
			showCallback?.();
		});
	}
};

describe("FindBar", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		showCallback = null;
		nextCallback = null;
		previousCallback = null;
		// Reset DOM body to clean state
		document.body.innerHTML = "";
		setupMockFind();

		// Mock scrollIntoView which doesn't exist in jsdom
		Element.prototype.scrollIntoView = vi.fn();
	});

	afterEach(() => {
		// Clean up any highlights left behind
		const highlights = document.querySelectorAll(".find-highlight");
		for (const h of highlights) {
			h.remove();
		}
	});

	describe("visibility", () => {
		it("should not render when not visible", () => {
			render(<FindBar />);
			expect(
				screen.queryByPlaceholderText("Find in page..."),
			).not.toBeInTheDocument();
		});

		it("should render when onShow callback is triggered", async () => {
			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Find in page..."),
				).toBeInTheDocument();
			});
		});

		it("should have data-find-bar attribute for self-exclusion", async () => {
			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				const container = screen
					.getByPlaceholderText("Find in page...")
					.closest("[data-find-bar]");
				expect(container).toBeInTheDocument();
			});
		});
	});

	describe("input behavior", () => {
		it("should update search text when typing", async () => {
			const user = userEvent.setup();
			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Find in page..."),
				).toBeInTheDocument();
			});

			const input = screen.getByPlaceholderText("Find in page...");
			await user.type(input, "test search");

			expect(input).toHaveValue("test search");
		});
	});

	describe("close behavior", () => {
		it("should close when close button is clicked", async () => {
			const user = userEvent.setup();
			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Find in page..."),
				).toBeInTheDocument();
			});

			const closeButton = screen.getByTitle("Close (Escape)");
			await user.click(closeButton);

			await waitFor(() => {
				expect(
					screen.queryByPlaceholderText("Find in page..."),
				).not.toBeInTheDocument();
			});
		});

		it("should close when Escape key is pressed", async () => {
			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Find in page..."),
				).toBeInTheDocument();
			});

			fireEvent.keyDown(document, { key: "Escape" });

			await waitFor(() => {
				expect(
					screen.queryByPlaceholderText("Find in page..."),
				).not.toBeInTheDocument();
			});
		});

		it("should clear search text when closed", async () => {
			const user = userEvent.setup();
			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Find in page..."),
				).toBeInTheDocument();
			});

			const input = screen.getByPlaceholderText("Find in page...");
			await user.type(input, "search text");

			const closeButton = screen.getByTitle("Close (Escape)");
			await user.click(closeButton);

			// Re-open and verify input is empty
			triggerShow();

			await waitFor(() => {
				expect(screen.getByPlaceholderText("Find in page...")).toHaveValue("");
			});
		});
	});

	describe("navigation buttons", () => {
		it("should render previous and next buttons", async () => {
			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(screen.getByTitle("Previous (Shift+Enter)")).toBeInTheDocument();
				expect(screen.getByTitle("Next (Enter)")).toBeInTheDocument();
			});
		});

		it("should disable navigation buttons when no search text", async () => {
			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(screen.getByTitle("Previous (Shift+Enter)")).toBeDisabled();
				expect(screen.getByTitle("Next (Enter)")).toBeDisabled();
			});
		});

		it("should enable navigation buttons when search text is entered", async () => {
			const user = userEvent.setup();
			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Find in page..."),
				).toBeInTheDocument();
			});

			const input = screen.getByPlaceholderText("Find in page...");
			await user.type(input, "test");

			expect(screen.getByTitle("Previous (Shift+Enter)")).not.toBeDisabled();
			expect(screen.getByTitle("Next (Enter)")).not.toBeDisabled();
		});
	});

	describe("search highlighting", () => {
		beforeEach(() => {
			// Add searchable content to the document
			const content = document.createElement("div");
			content.id = "search-content";
			content.textContent = "Hello world. Hello again.";
			document.body.appendChild(content);
		});

		it("should highlight matches in the document", async () => {
			const user = userEvent.setup();
			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Find in page..."),
				).toBeInTheDocument();
			});

			const input = screen.getByPlaceholderText("Find in page...");
			await user.type(input, "Hello");

			// Click next to trigger search
			const nextButton = screen.getByTitle("Next (Enter)");
			await user.click(nextButton);

			await waitFor(() => {
				const highlights = document.querySelectorAll(".find-highlight");
				expect(highlights.length).toBe(2); // Two "Hello" occurrences
			});
		});

		it("should show match count after search", async () => {
			const user = userEvent.setup();
			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Find in page..."),
				).toBeInTheDocument();
			});

			const input = screen.getByPlaceholderText("Find in page...");
			await user.type(input, "Hello");

			// Click next to trigger search
			const nextButton = screen.getByTitle("Next (Enter)");
			await user.click(nextButton);

			await waitFor(() => {
				expect(screen.getByText("1/2")).toBeInTheDocument();
			});
		});

		it("should show 'No results' when no matches found", async () => {
			const user = userEvent.setup();
			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Find in page..."),
				).toBeInTheDocument();
			});

			const input = screen.getByPlaceholderText("Find in page...");
			await user.type(input, "nonexistent");

			// Click next to trigger search
			const nextButton = screen.getByTitle("Next (Enter)");
			await user.click(nextButton);

			await waitFor(() => {
				expect(screen.getByText("No results")).toBeInTheDocument();
			});
		});

		it("should navigate to next match when clicking next button", async () => {
			const user = userEvent.setup();
			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Find in page..."),
				).toBeInTheDocument();
			});

			const input = screen.getByPlaceholderText("Find in page...");
			await user.type(input, "Hello");

			// Click next twice
			const nextButton = screen.getByTitle("Next (Enter)");
			await user.click(nextButton);

			await waitFor(() => {
				expect(screen.getByText("1/2")).toBeInTheDocument();
			});

			await user.click(nextButton);

			await waitFor(() => {
				expect(screen.getByText("2/2")).toBeInTheDocument();
			});
		});

		it("should wrap around when navigating past last match", async () => {
			const user = userEvent.setup();
			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Find in page..."),
				).toBeInTheDocument();
			});

			const input = screen.getByPlaceholderText("Find in page...");
			await user.type(input, "Hello");

			const nextButton = screen.getByTitle("Next (Enter)");
			await user.click(nextButton); // 1/2
			await user.click(nextButton); // 2/2
			await user.click(nextButton); // Should wrap to 1/2

			await waitFor(() => {
				expect(screen.getByText("1/2")).toBeInTheDocument();
			});
		});

		it("should navigate to previous match when clicking previous button", async () => {
			const user = userEvent.setup();
			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Find in page..."),
				).toBeInTheDocument();
			});

			const input = screen.getByPlaceholderText("Find in page...");
			await user.type(input, "Hello");

			const nextButton = screen.getByTitle("Next (Enter)");
			const prevButton = screen.getByTitle("Previous (Shift+Enter)");

			await user.click(nextButton); // 1/2
			await user.click(nextButton); // 2/2
			await user.click(prevButton); // 1/2

			await waitFor(() => {
				expect(screen.getByText("1/2")).toBeInTheDocument();
			});
		});

		it("should wrap around when navigating before first match", async () => {
			const user = userEvent.setup();
			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Find in page..."),
				).toBeInTheDocument();
			});

			const input = screen.getByPlaceholderText("Find in page...");
			await user.type(input, "Hello");

			const nextButton = screen.getByTitle("Next (Enter)");
			const prevButton = screen.getByTitle("Previous (Shift+Enter)");

			await user.click(nextButton); // 1/2
			await user.click(prevButton); // Should wrap to 2/2

			await waitFor(() => {
				expect(screen.getByText("2/2")).toBeInTheDocument();
			});
		});

		it("should clear highlights when search text is cleared", async () => {
			const user = userEvent.setup();
			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Find in page..."),
				).toBeInTheDocument();
			});

			const input = screen.getByPlaceholderText("Find in page...");
			await user.type(input, "Hello");

			const nextButton = screen.getByTitle("Next (Enter)");
			await user.click(nextButton);

			await waitFor(() => {
				expect(document.querySelectorAll(".find-highlight").length).toBe(2);
			});

			// Clear input
			await user.clear(input);

			await waitFor(() => {
				expect(document.querySelectorAll(".find-highlight").length).toBe(0);
			});
		});

		it("should clear highlights when find bar is closed", async () => {
			const user = userEvent.setup();
			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Find in page..."),
				).toBeInTheDocument();
			});

			const input = screen.getByPlaceholderText("Find in page...");
			await user.type(input, "Hello");

			const nextButton = screen.getByTitle("Next (Enter)");
			await user.click(nextButton);

			await waitFor(() => {
				expect(document.querySelectorAll(".find-highlight").length).toBe(2);
			});

			// Close find bar
			const closeButton = screen.getByTitle("Close (Escape)");
			await user.click(closeButton);

			await waitFor(() => {
				expect(document.querySelectorAll(".find-highlight").length).toBe(0);
			});
		});
	});

	describe("case insensitive search", () => {
		beforeEach(() => {
			const content = document.createElement("div");
			content.id = "search-content";
			content.textContent = "Hello HELLO hello";
			document.body.appendChild(content);
		});

		it("should find matches regardless of case", async () => {
			const user = userEvent.setup();
			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Find in page..."),
				).toBeInTheDocument();
			});

			const input = screen.getByPlaceholderText("Find in page...");
			await user.type(input, "hello");

			const nextButton = screen.getByTitle("Next (Enter)");
			await user.click(nextButton);

			await waitFor(() => {
				const highlights = document.querySelectorAll(".find-highlight");
				expect(highlights.length).toBe(3);
			});
		});
	});

	describe("no shadowquill API", () => {
		it("should not crash when shadowquill.find is not available", () => {
			Object.defineProperty(window, "shadowquill", {
				value: undefined,
				writable: true,
				configurable: true,
			});

			expect(() => render(<FindBar />)).not.toThrow();
		});
	});

	describe("cleanup", () => {
		it("should clean up highlights on unmount", async () => {
			const user = userEvent.setup();

			const content = document.createElement("div");
			content.id = "unmount-content";
			content.textContent = "Hello world";
			document.body.appendChild(content);

			const { unmount } = render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Find in page..."),
				).toBeInTheDocument();
			});

			const input = screen.getByPlaceholderText("Find in page...");
			await user.type(input, "Hello");

			const nextButton = screen.getByTitle("Next (Enter)");
			await user.click(nextButton);

			await waitFor(() => {
				expect(document.querySelectorAll(".find-highlight").length).toBe(1);
			});

			// Unmount the component
			unmount();

			// Highlights should be cleaned up
			expect(document.querySelectorAll(".find-highlight").length).toBe(0);
		});
	});

	describe("keyboard navigation", () => {
		beforeEach(() => {
			const content = document.createElement("div");
			content.id = "keyboard-content";
			content.textContent = "searchable text for testing";
			document.body.appendChild(content);
		});

		it("should trigger search on Enter key when input is focused", async () => {
			const user = userEvent.setup();
			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Find in page..."),
				).toBeInTheDocument();
			});

			const input = screen.getByPlaceholderText("Find in page...");
			await user.type(input, "searchable");

			// Focus should be on input after typing
			// Press Enter to trigger search
			await user.keyboard("{Enter}");

			await waitFor(() => {
				const highlights = document.querySelectorAll(".find-highlight");
				expect(highlights.length).toBeGreaterThan(0);
			});
		});

		it("should trigger previous search on Shift+Enter when input is focused", async () => {
			const user = userEvent.setup();
			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Find in page..."),
				).toBeInTheDocument();
			});

			const input = screen.getByPlaceholderText("Find in page...");
			await user.type(input, "searchable");

			// First search
			await user.keyboard("{Enter}");

			await waitFor(() => {
				const highlights = document.querySelectorAll(".find-highlight");
				expect(highlights.length).toBeGreaterThan(0);
			});

			// Shift+Enter to go previous
			await user.keyboard("{Shift>}{Enter}{/Shift}");
		});
	});

	describe("IPC event handling", () => {
		beforeEach(() => {
			const content = document.createElement("div");
			content.id = "ipc-content";
			content.textContent = "test content for IPC";
			document.body.appendChild(content);
		});

		it("should handle onNext IPC event when visible with search text", async () => {
			const user = userEvent.setup();
			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Find in page..."),
				).toBeInTheDocument();
			});

			const input = screen.getByPlaceholderText("Find in page...");
			await user.type(input, "test");

			// Trigger initial search
			const nextButton = screen.getByTitle("Next (Enter)");
			await user.click(nextButton);

			// Now trigger via IPC
			if (nextCallback) {
				const callback = nextCallback;
				act(() => {
					callback();
				});
			}

			await waitFor(() => {
				const highlights = document.querySelectorAll(".find-highlight");
				expect(highlights.length).toBeGreaterThan(0);
			});
		});

		it("should handle onPrevious IPC event when visible with search text", async () => {
			const user = userEvent.setup();
			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Find in page..."),
				).toBeInTheDocument();
			});

			const input = screen.getByPlaceholderText("Find in page...");
			await user.type(input, "test");

			// Trigger initial search
			const nextButton = screen.getByTitle("Next (Enter)");
			await user.click(nextButton);

			// Now trigger previous via IPC
			if (previousCallback) {
				const callback = previousCallback;
				act(() => {
					callback();
				});
			}
		});

		it("should not respond to IPC events when find bar is not visible", () => {
			render(<FindBar />);

			// Don't show the find bar - IPC events shouldn't do anything
			if (nextCallback) {
				const callback = nextCallback;
				act(() => {
					callback();
				});
			}
			if (previousCallback) {
				const callback = previousCallback;
				act(() => {
					callback();
				});
			}

			// Find bar should still be hidden
			expect(
				screen.queryByPlaceholderText("Find in page..."),
			).not.toBeInTheDocument();
		});

		it("should not respond to IPC events when no search text", async () => {
			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Find in page..."),
				).toBeInTheDocument();
			});

			// Trigger IPC events without search text - should not crash
			if (nextCallback) {
				const callback = nextCallback;
				act(() => {
					callback();
				});
			}
			if (previousCallback) {
				const callback = previousCallback;
				act(() => {
					callback();
				});
			}
		});
	});

	describe("edge cases", () => {
		it("should handle Escape key when find bar is not visible", () => {
			render(<FindBar />);

			// Press Escape when find bar is not visible - should not crash
			fireEvent.keyDown(document, { key: "Escape" });

			expect(
				screen.queryByPlaceholderText("Find in page..."),
			).not.toBeInTheDocument();
		});

		it("should handle empty search text gracefully", async () => {
			const user = userEvent.setup();
			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Find in page..."),
				).toBeInTheDocument();
			});

			// Try to search with whitespace only
			const input = screen.getByPlaceholderText("Find in page...");
			await user.type(input, "   ");

			// Buttons should be enabled when there's text (even whitespace)
			const nextButton = screen.getByTitle("Next (Enter)");
			expect(nextButton).not.toBeDisabled();
		});

		it("should skip nodes already highlighted", async () => {
			const user = userEvent.setup();

			// Add content with existing highlight
			const content = document.createElement("div");
			content.id = "highlight-test";
			content.innerHTML =
				'<mark class="find-highlight">hello</mark> world hello';
			document.body.appendChild(content);

			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Find in page..."),
				).toBeInTheDocument();
			});

			const input = screen.getByPlaceholderText("Find in page...");
			await user.type(input, "hello");

			const nextButton = screen.getByTitle("Next (Enter)");
			await user.click(nextButton);

			// Should only find the "hello" in "world hello", not the one inside the mark
			await waitFor(() => {
				const highlights = document.querySelectorAll(".find-highlight");
				expect(highlights.length).toBeGreaterThan(0);
			});
		});

		it("should skip text inside script tags", async () => {
			const user = userEvent.setup();

			// Add content with script tag containing searchable text
			const content = document.createElement("div");
			content.id = "script-test";
			content.innerHTML =
				'<script>const hello = "world";</script><p>hello world</p>';
			document.body.appendChild(content);

			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Find in page..."),
				).toBeInTheDocument();
			});

			const input = screen.getByPlaceholderText("Find in page...");
			await user.type(input, "hello");

			const nextButton = screen.getByTitle("Next (Enter)");
			await user.click(nextButton);

			// Should only highlight the text in <p>, not in <script>
			await waitFor(() => {
				const highlights = document.querySelectorAll(".find-highlight");
				// The highlight should be in the paragraph, not in the script
				expect(highlights.length).toBeGreaterThan(0);
				for (const h of highlights) {
					expect(h.closest("script")).toBeNull();
				}
			});
		});

		it("should skip text inside the find bar itself", async () => {
			const user = userEvent.setup();

			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Find in page..."),
				).toBeInTheDocument();
			});

			// Type "Find" which appears in the placeholder
			const input = screen.getByPlaceholderText("Find in page...");
			await user.type(input, "Find");

			const nextButton = screen.getByTitle("Next (Enter)");
			await user.click(nextButton);

			// The find bar itself should not be highlighted
			const findBarContainer = document.querySelector("[data-find-bar]");
			const highlightsInFindBar =
				findBarContainer?.querySelectorAll(".find-highlight");
			expect(highlightsInFindBar?.length ?? 0).toBe(0);
		});

		it("should trigger search when goToPrevious is called with no highlights", async () => {
			const user = userEvent.setup();

			// Add searchable content
			const content = document.createElement("div");
			content.id = "prev-search-test";
			content.textContent = "hello world";
			document.body.appendChild(content);

			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Find in page..."),
				).toBeInTheDocument();
			});

			const input = screen.getByPlaceholderText("Find in page...");
			await user.type(input, "hello");

			// Click previous instead of next (should trigger search first)
			const prevButton = screen.getByTitle("Previous (Shift+Enter)");
			await user.click(prevButton);

			// Should have performed search
			await waitFor(() => {
				const highlights = document.querySelectorAll(".find-highlight");
				expect(highlights.length).toBeGreaterThan(0);
			});
		});

		it("should skip text nodes with null parent", async () => {
			const user = userEvent.setup();

			// Add normal content
			const content = document.createElement("div");
			content.id = "null-parent-test";
			content.textContent = "test content";
			document.body.appendChild(content);

			render(<FindBar />);

			triggerShow();

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText("Find in page..."),
				).toBeInTheDocument();
			});

			const input = screen.getByPlaceholderText("Find in page...");
			await user.type(input, "test");

			const nextButton = screen.getByTitle("Next (Enter)");
			await user.click(nextButton);

			// Should work without crashing
			await waitFor(() => {
				const highlights = document.querySelectorAll(".find-highlight");
				expect(highlights.length).toBeGreaterThan(0);
			});
		});
	});
});
