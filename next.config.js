/**
 * @type {object}
 */

const config = {
	output: undefined,
	basePath: process.env.NEXT_BASE_PATH || "",
	typescript: { ignoreBuildErrors: true },
	images: { unoptimized: true },
	turbopack: {},
};

export default config;
