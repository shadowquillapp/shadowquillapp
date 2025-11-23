/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/**
 * Minimal, stable Next config for both web and Electron builds.
 * We rely on the build script setting NEXT_DISABLE_FILE_TRACE=1 to avoid
 * file tracing that was walking protected Windows junctions (EPERM errors).
 * All custom webpack hacks were removed to eliminate schema / ESM issues.
 * @type {object}
 */
// We attempted 'export' for Electron, but dynamic API routes require a server.
// So always build the normal server output. Standalone tracing is disabled via env (NEXT_DISABLE_FILE_TRACE=1)
// to avoid EPERM on Windows junctions.
const config = {
	output: undefined,
	basePath: process.env.NEXT_BASE_PATH || "",
	typescript: { ignoreBuildErrors: true },
	images: { unoptimized: true },
};

export default config;
