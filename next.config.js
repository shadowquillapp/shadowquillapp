/**
 * @type {object}
 */

const config = {
	output: undefined,
	basePath: process.env.NEXT_BASE_PATH || "",
	typescript: { ignoreBuildErrors: true },
	images: { unoptimized: true },
	turbopack: {},
	webpack: (config) => {
		// Find the oneOf rule which contains the JS/TS rules
		const oneOfRule = config.module.rules.find(
			(rule) => rule.oneOf !== undefined,
		);

		if (oneOfRule?.oneOf) {
			for (const rule of oneOfRule.oneOf) {
				// Find rules that process JS/TS files and have an exclude
				if (
					rule.test &&
					rule.exclude &&
					(rule.test.toString().includes("tsx?") ||
						rule.test.toString().includes("jsx?"))
				) {
					const originalExclude = rule.exclude;
					// Convert exclude to a function if it isn't already
					if (typeof originalExclude !== "function") {
						// If it's a regex or string, convert to function
						const originalValue = originalExclude;
						rule.exclude = (modulePath) => {
							// Allow shadowquill package
							if (
								typeof modulePath === "string" &&
								modulePath.includes("node_modules/shadowquill")
							) {
								return false;
							}
							// Apply original exclude logic
							if (originalValue instanceof RegExp) {
								return originalValue.test(modulePath);
							}
							if (typeof originalValue === "string") {
								return modulePath.includes(originalValue);
							}
							if (Array.isArray(originalValue)) {
								return originalValue.some((excl) => {
									if (excl instanceof RegExp) {
										return excl.test(modulePath);
									}
									if (typeof excl === "string") {
										return modulePath.includes(excl);
									}
									return false;
								});
							}
							return false;
						};
					} else {
						// It's already a function, wrap it
						rule.exclude = (modulePath, ...args) => {
							// Allow shadowquill package
							if (
								typeof modulePath === "string" &&
								modulePath.includes("node_modules/shadowquill")
							) {
								return false;
							}
							// Call original function
							return originalExclude(modulePath, ...args);
						};
					}
				}
			}
		}

		return config;
	},
};

export default config;
