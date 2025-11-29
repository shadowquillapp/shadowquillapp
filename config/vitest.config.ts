import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// Test environment - jsdom for component tests
		environment: "jsdom",

		// Include test files
		include: ["src/**/*.test.ts", "src/**/*.test.tsx"],

		// Exclude patterns
		exclude: ["node_modules", ".next", "dist", "electron"],

		// Global test timeout
		testTimeout: 10000,

		// Coverage configuration
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

		// Setup files
		setupFiles: ["./src/__tests__/setup.ts"],

		// Global variables
		globals: true,

		// Environment options for jsdom
		environmentOptions: {
			jsdom: {
				url: "http://localhost:31415",
			},
		},
	},

	// Path resolution (matching tsconfig)
	resolve: {
		alias: {
			"@": resolve(__dirname, "../src"),
		},
	},
});
