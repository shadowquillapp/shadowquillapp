import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const { openExternalUrl, parseAllowedExternalUrl } =
	require("../../electron/utils/external-url.cjs") as {
		openExternalUrl: (
			shell: { openExternal: (url: string) => Promise<void> },
			value: unknown,
		) => Promise<void>;
		parseAllowedExternalUrl: (value: unknown) => string | null;
	};

describe("electron external URL boundary", () => {
	it.each([
		[
			"https://github.com/shadowquillapp/shadowquillapp",
			"https://github.com/shadowquillapp/shadowquillapp",
		],
		["https://ollama.com/download", "https://ollama.com/download"],
		["https://shadowquill.org", "https://shadowquill.org/"],
	])("allows %s", (url, normalizedUrl) => {
		expect(parseAllowedExternalUrl(url)).toBe(normalizedUrl);
	});

	it.each([
		["http://github.com/shadowquillapp/shadowquillapp"],
		["https://evil.github.com"],
		["https://github.com.evil.test"],
		["https://localhost:31415"],
		["javascript:alert(1)"],
		["not a url"],
		[null],
	])("rejects %s", (url) => {
		expect(parseAllowedExternalUrl(url)).toBeNull();
	});

	it("opens only validated URLs", async () => {
		const shell = { openExternal: vi.fn().mockResolvedValue(undefined) };

		await openExternalUrl(shell, "https://ollama.com/download");

		expect(shell.openExternal).toHaveBeenCalledWith(
			"https://ollama.com/download",
		);
	});

	it("does not call shell for rejected URLs", async () => {
		const shell = { openExternal: vi.fn().mockResolvedValue(undefined) };

		await expect(openExternalUrl(shell, "javascript:alert(1)")).rejects.toThrow(
			"External URL is not allowed",
		);
		expect(shell.openExternal).not.toHaveBeenCalled();
	});
});
