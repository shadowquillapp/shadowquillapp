import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const { buildCspPolicy, setupSecurityForSessions } =
	require("../../electron/utils/security.cjs") as {
		buildCspPolicy: (isDev: boolean) => string;
		setupSecurityForSessions: (
			isDev: boolean,
			sessions: Array<{
				webRequest: {
					onHeadersReceived: (
						handler: (
							details: { responseHeaders?: Record<string, string[]> },
							cb: (response: {
								responseHeaders: Record<string, string[]>;
							}) => void,
						) => void,
					) => void;
				};
				setPermissionRequestHandler?: (
					handler: (
						webContents: unknown,
						permission: string,
						callback: (allowed: boolean) => void,
					) => void,
				) => void;
				setPermissionCheckHandler?: (
					handler: (
						webContents: unknown,
						permission: string,
						requestingOrigin: string,
						details: unknown,
					) => boolean,
				) => void;
			}>,
		) => void;
	};
const {
	_resetAllowedAppOriginsForTests,
	addAllowedAppOrigin,
	isAllowedAppUrl,
	validateIpcSender,
} = require("../../electron/utils/ipc-security.cjs") as {
	_resetAllowedAppOriginsForTests: () => void;
	addAllowedAppOrigin: (value: string) => void;
	isAllowedAppUrl: (value: unknown) => boolean;
	validateIpcSender: (event: unknown) => boolean;
};

function createSessionMock() {
	return {
		webRequest: {
			onHeadersReceived: vi.fn(),
		},
		setPermissionRequestHandler: vi.fn(),
		setPermissionCheckHandler: vi.fn(),
	};
}

describe("electron security", () => {
	afterEach(() => {
		_resetAllowedAppOriginsForTests();
	});

	it("keeps unsafe-eval out of production CSP", () => {
		const policy = buildCspPolicy(false);

		expect(policy).toContain("default-src 'self'");
		expect(policy).toContain("script-src 'self' 'unsafe-inline'");
		expect(policy).not.toContain(
			"script-src 'self' 'unsafe-inline' http://localhost:*",
		);
		expect(policy).not.toContain("'unsafe-eval'");
		expect(policy).not.toContain("fonts.googleapis.com");
		expect(policy).toContain("http://127.0.0.1:*");
	});

	it("allows unsafe-eval only for dev HMR", () => {
		expect(buildCspPolicy(true)).toContain("'unsafe-eval'");
	});

	it("applies security headers to every provided session", () => {
		const defaultSession = createSessionMock();
		const persistentSession = createSessionMock();

		setupSecurityForSessions(false, [defaultSession, persistentSession]);

		expect(defaultSession.webRequest.onHeadersReceived).toHaveBeenCalledTimes(
			1,
		);
		expect(
			persistentSession.webRequest.onHeadersReceived,
		).toHaveBeenCalledTimes(1);

		const handler =
			defaultSession.webRequest.onHeadersReceived.mock.calls[0]?.[0];
		const cb = vi.fn();
		handler?.({ responseHeaders: { Existing: ["1"] } }, cb);

		expect(cb).toHaveBeenCalledWith({
			responseHeaders: expect.objectContaining({
				Existing: ["1"],
				"Content-Security-Policy": [buildCspPolicy(false)],
				"X-Content-Type-Options": ["nosniff"],
				"X-Frame-Options": ["DENY"],
				"X-XSS-Protection": ["1; mode=block"],
			}),
		});
	});

	it("denies session permissions by default", () => {
		const defaultSession = createSessionMock();
		const persistentSession = createSessionMock();

		setupSecurityForSessions(false, [defaultSession, persistentSession]);

		const permissionHandler =
			defaultSession.setPermissionRequestHandler.mock.calls[0]?.[0];
		const callback = vi.fn();
		permissionHandler?.({}, "geolocation", callback);

		expect(callback).toHaveBeenCalledWith(false);

		const permissionCheck =
			persistentSession.setPermissionCheckHandler.mock.calls[0]?.[0];
		expect(permissionCheck?.({}, "media", "http://localhost:31415", {})).toBe(
			false,
		);
	});

	it("validates IPC senders by app origin", () => {
		expect(
			validateIpcSender({
				senderFrame: { url: "http://localhost:31415/workbench" },
			}),
		).toBe(true);
		expect(
			validateIpcSender({
				senderFrame: { url: "https://example.com" },
			}),
		).toBe(false);

		addAllowedAppOrigin("http://127.0.0.1:49152/workbench");

		expect(isAllowedAppUrl("http://127.0.0.1:49152/workbench")).toBe(true);
	});
});
