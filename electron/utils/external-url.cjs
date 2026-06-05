const ALLOWED_EXTERNAL_HOSTS = new Set([
	"github.com",
	"ollama.com",
	"shadowquill.org",
]);

function parseAllowedExternalUrl(value) {
	try {
		const url = new URL(String(value));
		if (
			url.protocol !== "https:" ||
			!ALLOWED_EXTERNAL_HOSTS.has(url.hostname)
		) {
			return null;
		}
		return url.toString();
	} catch (_) {
		return null;
	}
}

async function openExternalUrl(shell, value) {
	const url = parseAllowedExternalUrl(value);
	if (!url) {
		throw new Error("External URL is not allowed");
	}
	await shell.openExternal(url);
}

module.exports = { openExternalUrl, parseAllowedExternalUrl };
