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
		const oneOfRule = config.module.rules.find(
			(rule) => rule.oneOf !== undefined,
		);

		if (oneOfRule?.oneOf) {
			for (const rule of oneOfRule.oneOf) {
				if (
					rule.test &&
					rule.exclude &&
					(rule.test.toString().includes("tsx?") ||
						rule.test.toString().includes("jsx?"))
				) {
					const originalExclude = rule.exclude;
					if (typeof originalExclude !== "function") {
						const originalValue = originalExclude;
						rule.exclude = (modulePath) => {
							if (
								typeof modulePath === "string" &&
								modulePath.includes("node_modules/shadowquillapp")
							) {
								return false;
							}
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
						rule.exclude = (modulePath, ...args) => {
							if (
								typeof modulePath === "string" &&
								modulePath.includes("node_modules/shadowquillapp")
							) {
								return false;
							}
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
