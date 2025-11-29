import { DialogProvider, useDialog } from "@/components/DialogProvider";
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Test component that uses the dialog hooks
function TestConsumer({
	onReady,
}: { onReady?: (dialog: ReturnType<typeof useDialog>) => void }) {
	const dialog = useDialog();
	if (onReady) {
		onReady(dialog);
	}
	return (
		<div>
			<button
				type="button"
				onClick={() => dialog.showInfo({ message: "Test info message" })}
				data-testid="show-info"
			>
				Show Info
			</button>
			<button
				type="button"
				onClick={() => dialog.confirm({ message: "Test confirm message" })}
				data-testid="show-confirm"
			>
				Show Confirm
			</button>
		</div>
	);
}

describe("DialogProvider", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("rendering", () => {
		it("should render children", () => {
			render(
				<DialogProvider>
					<div data-testid="child">Child content</div>
				</DialogProvider>,
			);

			expect(screen.getByTestId("child")).toBeInTheDocument();
		});

		it("should not render dialog when no dialog is active", () => {
			render(
				<DialogProvider>
					<div>Content</div>
				</DialogProvider>,
			);

			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
	});

	describe("useDialog hook", () => {
		it("should provide showInfo and confirm functions", () => {
			let dialogContext: ReturnType<typeof useDialog> | undefined;

			render(
				<DialogProvider>
					<TestConsumer
						onReady={(d) => {
							dialogContext = d;
						}}
					/>
				</DialogProvider>,
			);

			expect(dialogContext).toBeDefined();
			expect(typeof dialogContext?.showInfo).toBe("function");
			expect(typeof dialogContext?.confirm).toBe("function");
		});
	});

	describe("showInfo dialog", () => {
		it("should display info dialog when showInfo is called", async () => {
			const user = userEvent.setup();

			render(
				<DialogProvider>
					<TestConsumer />
				</DialogProvider>,
			);

			await user.click(screen.getByTestId("show-info"));

			expect(screen.getByRole("dialog")).toBeInTheDocument();
			expect(screen.getByText("Test info message")).toBeInTheDocument();
		});

		it("should display custom title for info dialog", async () => {
			let dialogApi: ReturnType<typeof useDialog> | null = null;

			render(
				<DialogProvider>
					<TestConsumer
						onReady={(d) => {
							dialogApi = d;
						}}
					/>
				</DialogProvider>,
			);

			await act(async () => {
				dialogApi?.showInfo({ title: "Custom Title", message: "Info message" });
			});

			expect(screen.getByText("Custom Title")).toBeInTheDocument();
		});

		it("should display default title 'Information' for info dialog", async () => {
			const user = userEvent.setup();

			render(
				<DialogProvider>
					<TestConsumer />
				</DialogProvider>,
			);

			await user.click(screen.getByTestId("show-info"));

			expect(screen.getByText("Information")).toBeInTheDocument();
		});

		it("should display custom OK button text", async () => {
			let dialogApi: ReturnType<typeof useDialog> | null = null;

			render(
				<DialogProvider>
					<TestConsumer
						onReady={(d) => {
							dialogApi = d;
						}}
					/>
				</DialogProvider>,
			);

			await act(async () => {
				dialogApi?.showInfo({ message: "Message", okText: "Got it!" });
			});

			expect(screen.getByText("Got it!")).toBeInTheDocument();
		});

		it("should close info dialog when OK is clicked", async () => {
			const user = userEvent.setup();

			render(
				<DialogProvider>
					<TestConsumer />
				</DialogProvider>,
			);

			await user.click(screen.getByTestId("show-info"));
			expect(screen.getByRole("dialog")).toBeInTheDocument();

			await user.click(screen.getByText("OK"));

			await waitFor(() => {
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
			});
		});

		it("should resolve promise when info dialog is closed", async () => {
			const user = userEvent.setup();
			let resolved = false;
			let dialogApi: ReturnType<typeof useDialog> | null = null;

			render(
				<DialogProvider>
					<TestConsumer
						onReady={(d) => {
							dialogApi = d;
						}}
					/>
				</DialogProvider>,
			);

			act(() => {
				dialogApi?.showInfo({ message: "Test" }).then(() => {
					resolved = true;
				});
			});

			await waitFor(() => {
				expect(screen.getByRole("dialog")).toBeInTheDocument();
			});

			await user.click(screen.getByText("OK"));

			await waitFor(() => {
				expect(resolved).toBe(true);
			});
		});
	});

	describe("confirm dialog", () => {
		it("should display confirm dialog when confirm is called", async () => {
			const user = userEvent.setup();

			render(
				<DialogProvider>
					<TestConsumer />
				</DialogProvider>,
			);

			await user.click(screen.getByTestId("show-confirm"));

			expect(screen.getByRole("dialog")).toBeInTheDocument();
			expect(screen.getByText("Test confirm message")).toBeInTheDocument();
		});

		it("should display default title 'Confirm Action' for confirm dialog", async () => {
			const user = userEvent.setup();

			render(
				<DialogProvider>
					<TestConsumer />
				</DialogProvider>,
			);

			await user.click(screen.getByTestId("show-confirm"));

			expect(screen.getByText("Confirm Action")).toBeInTheDocument();
		});

		it("should display Cancel and Confirm buttons by default", async () => {
			const user = userEvent.setup();

			render(
				<DialogProvider>
					<TestConsumer />
				</DialogProvider>,
			);

			await user.click(screen.getByTestId("show-confirm"));

			expect(screen.getByText("Cancel")).toBeInTheDocument();
			expect(screen.getByText("Confirm")).toBeInTheDocument();
		});

		it("should display custom button text", async () => {
			let dialogApi: ReturnType<typeof useDialog> | null = null;

			render(
				<DialogProvider>
					<TestConsumer
						onReady={(d) => {
							dialogApi = d;
						}}
					/>
				</DialogProvider>,
			);

			await act(async () => {
				dialogApi?.confirm({
					message: "Message",
					confirmText: "Yes, do it",
					cancelText: "No, cancel",
				});
			});

			expect(screen.getByText("Yes, do it")).toBeInTheDocument();
			expect(screen.getByText("No, cancel")).toBeInTheDocument();
		});

		it("should resolve with true when confirm button is clicked", async () => {
			const user = userEvent.setup();
			let result: boolean | null = null;
			let dialogApi: ReturnType<typeof useDialog> | null = null;

			render(
				<DialogProvider>
					<TestConsumer
						onReady={(d) => {
							dialogApi = d;
						}}
					/>
				</DialogProvider>,
			);

			act(() => {
				dialogApi?.confirm({ message: "Test" }).then((r) => {
					result = r;
				});
			});

			await waitFor(() => {
				expect(screen.getByRole("dialog")).toBeInTheDocument();
			});

			await user.click(screen.getByText("Confirm"));

			await waitFor(() => {
				expect(result).toBe(true);
			});
		});

		it("should resolve with false when cancel button is clicked", async () => {
			const user = userEvent.setup();
			let result: boolean | null = null;
			let dialogApi: ReturnType<typeof useDialog> | null = null;

			render(
				<DialogProvider>
					<TestConsumer
						onReady={(d) => {
							dialogApi = d;
						}}
					/>
				</DialogProvider>,
			);

			act(() => {
				dialogApi?.confirm({ message: "Test" }).then((r) => {
					result = r;
				});
			});

			await waitFor(() => {
				expect(screen.getByRole("dialog")).toBeInTheDocument();
			});

			await user.click(screen.getByText("Cancel"));

			await waitFor(() => {
				expect(result).toBe(false);
			});
		});

		it("should render destructive tone with red text", async () => {
			let dialogApi: ReturnType<typeof useDialog> | null = null;

			render(
				<DialogProvider>
					<TestConsumer
						onReady={(d) => {
							dialogApi = d;
						}}
					/>
				</DialogProvider>,
			);

			await act(async () => {
				dialogApi?.confirm({
					message: "Delete this?",
					tone: "destructive",
					confirmText: "Delete",
				});
			});

			const deleteButton = screen.getByText("Delete");
			expect(deleteButton).toHaveStyle({ color: "#ef4444" });
		});

		it("should render primary tone button with primary class", async () => {
			let dialogApi: ReturnType<typeof useDialog> | null = null;

			render(
				<DialogProvider>
					<TestConsumer
						onReady={(d) => {
							dialogApi = d;
						}}
					/>
				</DialogProvider>,
			);

			await act(async () => {
				dialogApi?.confirm({
					message: "Proceed?",
					tone: "primary",
					confirmText: "Proceed",
				});
			});

			const proceedButton = screen.getByText("Proceed");
			expect(proceedButton).toHaveClass("md-btn--primary");
		});

		it("should render default tone button without special styling", async () => {
			let dialogApi: ReturnType<typeof useDialog> | null = null;

			render(
				<DialogProvider>
					<TestConsumer
						onReady={(d) => {
							dialogApi = d;
						}}
					/>
				</DialogProvider>,
			);

			await act(async () => {
				dialogApi?.confirm({
					message: "Proceed?",
					tone: "default",
					confirmText: "OK",
				});
			});

			const okButton = screen.getByText("OK");
			expect(okButton).toHaveClass("md-btn");
			expect(okButton).not.toHaveClass("md-btn--primary");
		});
	});

	describe("keyboard navigation", () => {
		it("should close dialog on Escape key", async () => {
			const user = userEvent.setup();

			render(
				<DialogProvider>
					<TestConsumer />
				</DialogProvider>,
			);

			await user.click(screen.getByTestId("show-info"));
			expect(screen.getByRole("dialog")).toBeInTheDocument();

			fireEvent.keyDown(document, { key: "Escape" });

			await waitFor(() => {
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
			});
		});

		it("should confirm on Enter key", async () => {
			const user = userEvent.setup();
			let result: boolean | null = null;
			let dialogApi: ReturnType<typeof useDialog> | null = null;

			render(
				<DialogProvider>
					<TestConsumer
						onReady={(d) => {
							dialogApi = d;
						}}
					/>
				</DialogProvider>,
			);

			act(() => {
				dialogApi?.confirm({ message: "Test" }).then((r) => {
					result = r;
				});
			});

			await waitFor(() => {
				expect(screen.getByRole("dialog")).toBeInTheDocument();
			});

			fireEvent.keyDown(document, { key: "Enter" });

			await waitFor(() => {
				expect(result).toBe(true);
			});
		});
	});

	describe("dialog queue", () => {
		it("should queue multiple dialogs and show them sequentially", async () => {
			const user = userEvent.setup();
			let dialogApi: ReturnType<typeof useDialog> | null = null;

			render(
				<DialogProvider>
					<TestConsumer
						onReady={(d) => {
							dialogApi = d;
						}}
					/>
				</DialogProvider>,
			);

			// Queue two dialogs
			act(() => {
				dialogApi?.showInfo({ message: "First dialog" });
				dialogApi?.showInfo({ message: "Second dialog" });
			});

			// First dialog should be visible
			await waitFor(() => {
				expect(screen.getByText("First dialog")).toBeInTheDocument();
			});

			// Close first dialog
			await user.click(screen.getByText("OK"));

			// Second dialog should appear
			await waitFor(() => {
				expect(screen.getByText("Second dialog")).toBeInTheDocument();
			});
		});
	});

	describe("app-info event listener", () => {
		it("should show info dialog when app-info event is dispatched", async () => {
			render(
				<DialogProvider>
					<div>Content</div>
				</DialogProvider>,
			);

			const event = new CustomEvent("app-info", {
				detail: { title: "Event Title", message: "Event message" },
			});

			act(() => {
				window.dispatchEvent(event);
			});

			await waitFor(() => {
				expect(screen.getByRole("dialog")).toBeInTheDocument();
				expect(screen.getByText("Event Title")).toBeInTheDocument();
				expect(screen.getByText("Event message")).toBeInTheDocument();
			});
		});

		it("should use default title when app-info event has no title", async () => {
			render(
				<DialogProvider>
					<div>Content</div>
				</DialogProvider>,
			);

			const event = new CustomEvent("app-info", {
				detail: { message: "Event message" },
			});

			act(() => {
				window.dispatchEvent(event);
			});

			await waitFor(() => {
				expect(screen.getByText("Information")).toBeInTheDocument();
			});
		});
	});

	describe("dialog content", () => {
		it("should support React nodes as message content", async () => {
			let dialogApi: ReturnType<typeof useDialog> | null = null;

			render(
				<DialogProvider>
					<TestConsumer
						onReady={(d) => {
							dialogApi = d;
						}}
					/>
				</DialogProvider>,
			);

			await act(async () => {
				dialogApi?.showInfo({
					message: <span data-testid="custom-node">Custom React Node</span>,
				});
			});

			expect(screen.getByTestId("custom-node")).toBeInTheDocument();
			expect(screen.getByText("Custom React Node")).toBeInTheDocument();
		});
	});

	describe("click propagation", () => {
		it("should stop propagation on dialog click", async () => {
			let dialogApi: ReturnType<typeof useDialog> | null = null;

			render(
				<DialogProvider>
					<TestConsumer
						onReady={(d) => {
							dialogApi = d;
						}}
					/>
				</DialogProvider>,
			);

			await act(async () => {
				dialogApi?.showInfo({ message: "Test" });
			});

			const dialog = screen.getByRole("dialog");
			const clickEvent = new MouseEvent("click", { bubbles: true });
			const stopPropagationSpy = vi.spyOn(clickEvent, "stopPropagation");

			dialog.dispatchEvent(clickEvent);

			expect(stopPropagationSpy).toHaveBeenCalled();
		});
	});

	describe("default context", () => {
		it("should provide default no-op functions when used outside provider", async () => {
			// This tests the default context value
			let dialogApi: ReturnType<typeof useDialog> | undefined;

			// Render without provider to use default context
			render(
				<TestConsumer
					onReady={(d) => {
						dialogApi = d;
					}}
				/>,
			);

			expect(dialogApi).toBeDefined();
			// Default confirm should return false
			const result = await dialogApi?.confirm({ message: "Test" });
			expect(result).toBe(false);
		});
	});

	describe("event listener edge cases", () => {
		it("should handle window.addEventListener throwing error", async () => {
			const originalAddEventListener = window.addEventListener;
			let callCount = 0;

			// Make addEventListener throw on "app-info" event registration
			window.addEventListener = vi.fn((type, listener, options) => {
				callCount++;
				if (type === "app-info") {
					throw new Error("addEventListener failed");
				}
				return originalAddEventListener.call(window, type, listener, options);
			}) as typeof window.addEventListener;

			// Should not throw
			expect(() => {
				render(
					<DialogProvider>
						<div>Content</div>
					</DialogProvider>,
				);
			}).not.toThrow();

			// Restore
			window.addEventListener = originalAddEventListener;
		});
	});

	describe("dialog keydown propagation", () => {
		it("should stop keydown event propagation on dialog", async () => {
			let dialogApi: ReturnType<typeof useDialog> | null = null;

			render(
				<DialogProvider>
					<TestConsumer
						onReady={(d) => {
							dialogApi = d;
						}}
					/>
				</DialogProvider>,
			);

			await act(async () => {
				dialogApi?.showInfo({ message: "Test" });
			});

			const dialog = screen.getByRole("dialog");
			expect(dialog).toBeInTheDocument();

			// Dispatch keydown on the dialog
			const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true });
			const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

			dialog.dispatchEvent(event);

			expect(stopPropagationSpy).toHaveBeenCalled();
		});
	});
});
