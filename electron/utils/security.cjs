// Security and CSP configuration
const { session } = require("electron");

function setupSecurity(isDev) {
	const scriptSrc = isDev
		? "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* https://localhost:*"
		: "script-src 'self' 'unsafe-inline' http://localhost:* https://localhost:*";
	const cspPolicy = [
		"default-src 'self'",
		scriptSrc,
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		"font-src 'self' https://fonts.gstatic.com",
		"img-src 'self' data: blob: https: http:",
		"connect-src 'self' http://localhost:* https://localhost:* https://fonts.googleapis.com https://fonts.gstatic.com",
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'none'",
	].join("; ");

	session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
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
}

module.exports = { setupSecurity };
