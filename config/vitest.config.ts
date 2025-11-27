import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// Test environment
		environment: "node",

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
			include: ["src/lib/**/*.ts"],
			exclude: [
				"src/**/*.test.ts",
				"src/**/*.d.ts",
				"node_modules/**",
			],
		},

		// Setup files
		setupFiles: [],

		// Global variables
		globals: true,
	},

	// Path resolution (matching tsconfig)
	resolve: {
		alias: {
			"@": resolve(__dirname, "./src"),
		},
	},
});

