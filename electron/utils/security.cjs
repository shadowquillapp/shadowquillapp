// Security and CSP configuration
const { session } = require("electron");

function buildCspPolicy(isDev) {
	const scriptSrc = isDev
		? "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* https://localhost:*"
		: "script-src 'self' 'unsafe-inline'";
	return [
		"default-src 'self'",
		scriptSrc,
		"style-src 'self' 'unsafe-inline'",
		"font-src 'self'",
		"img-src 'self' data: blob: https: http:",
		"connect-src 'self' http://localhost:* https://localhost:* http://127.0.0.1:* https://127.0.0.1:*",
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'none'",
	].join("; ");
}

function setupSecurityForSessions(isDev, sessions) {
	const cspPolicy = buildCspPolicy(isDev);

	const applyHeaders = (targetSession) => {
		targetSession.webRequest.onHeadersReceived((details, cb) => {
			cb({
				responseHeaders: {
					...details.responseHeaders,
					"Content-Security-Policy": [cspPolicy],
					"X-Content-Type-Options": ["nosniff"],
					"X-Frame-Options": ["DENY"],
					"X-XSS-Protection": ["1; mode=block"],
				},
			});
		});

		targetSession.setPermissionRequestHandler?.(
			(_webContents, _permission, callback) => {
				callback(false);
			},
		);
		targetSession.setPermissionCheckHandler?.(() => false);
	};

	for (const targetSession of sessions) {
		applyHeaders(targetSession);
	}
}

function setupSecurity(isDev) {
	setupSecurityForSessions(isDev, [
		session.defaultSession,
		session.fromPartition("persist:main"),
	]);
}

module.exports = { buildCspPolicy, setupSecurity, setupSecurityForSessions };
