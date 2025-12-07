import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "jsdom",

		include: ["src/**/*.test.ts", "src/**/*.test.tsx"],

		exclude: ["node_modules", ".next", "dist", "electron"],

		testTimeout: 10000,

		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			include: ["src/lib/**/*.ts", "src/components/**/*.tsx"],
			exclude: [
				"src/**/*.test.ts",
				"src/**/*.test.tsx",
				"src/**/*.d.ts",
				"node_modules/**",
			],
		},

		setupFiles: ["./src/__tests__/setup.ts"],

		globals: true,

		environmentOptions: {
			jsdom: {
				url: "http://localhost:31415",
			},
		},

		onUnhandledError(error) {
			if (
				error?.message?.includes("Cannot read properties of undefined") &&
				error?.message?.includes("deno")
			) {
				return false;
			}
		},
	},

	resolve: {
		alias: {
			"@": resolve(__dirname, "../src"),
		},
	},
});
