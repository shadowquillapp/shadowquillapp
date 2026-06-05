const allowedAppOrigins = new Set([
	"http://localhost:31415",
	"http://127.0.0.1:31415",
]);

function addAllowedAppOrigin(value) {
	try {
		allowedAppOrigins.add(new URL(String(value)).origin);
	} catch (_) {
		/* ignore */
	}
}

function isAllowedAppUrl(value) {
	try {
		return allowedAppOrigins.has(new URL(String(value)).origin);
	} catch (_) {
		return false;
	}
}

function validateIpcSender(event) {
	return isAllowedAppUrl(event?.senderFrame?.url);
}

function requireValidIpcSender(event) {
	if (!validateIpcSender(event)) {
		throw new Error("Blocked IPC from untrusted sender");
	}
}

function _resetAllowedAppOriginsForTests() {
	allowedAppOrigins.clear();
	allowedAppOrigins.add("http://localhost:31415");
	allowedAppOrigins.add("http://127.0.0.1:31415");
}

module.exports = {
	_resetAllowedAppOriginsForTests,
	addAllowedAppOrigin,
	isAllowedAppUrl,
	requireValidIpcSender,
	validateIpcSender,
};
