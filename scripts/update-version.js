import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * @param {object} pluginConfig
 * @param {object} context
 * @returns {Promise<void>}
 */
export default async function prepare(_pluginConfig, context) {
	const { nextRelease } = context;
	const { version } = nextRelease;
	if (!version) {
		throw new Error("No version provided in nextRelease");
	}
	const versionFilePath = join(__dirname, "..", "src", "lib", "version.ts");
	const versionFileContent = readFileSync(versionFilePath, "utf-8");
	const updatedContent = versionFileContent.replace(
		/export const APP_VERSION = ".*";/,
		`export const APP_VERSION = "${version}";`,
	);
	writeFileSync(versionFilePath, updatedContent, "utf-8");
	context.logger.log(`Updated src/lib/version.ts to version ${version}`);
}
