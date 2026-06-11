import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = "http://localhost:31415";
const outDir = path.join(".audit", "runtime-screenshots");

async function probeRoute(route, marker) {
	const response = await fetch(`${baseUrl}${route}`, { redirect: "follow" });
	const html = await response.text();
	return {
		route,
		status: response.status,
		ok: response.ok && html.includes(marker),
		marker,
	};
}

const routes = [
	{ route: "/workbench", marker: "ShadowQuill" },
	{ route: "/studio", marker: "Preset Studio" },
];

const results = [];
for (const item of routes) {
	results.push(await probeRoute(item.route, item.marker));
}

await mkdir(outDir, { recursive: true });
await writeFile(
	path.join(outDir, "fetch-probe.json"),
	JSON.stringify({ baseUrl, results, at: new Date().toISOString() }, null, 2),
);

let playwrightOk = false;
try {
	const { chromium } = await import("playwright");
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage({
		viewport: { width: 1280, height: 800 },
	});

	for (const item of routes) {
		await page.goto(`${baseUrl}${item.route}`, { waitUntil: "networkidle" });
		await page.screenshot({
			path: path.join(outDir, `${item.route.replace(/\//g, "") || "root"}.png`),
			fullPage: true,
		});
	}

	await browser.close();
	playwrightOk = true;
} catch (error) {
	await writeFile(path.join(outDir, "playwright-error.txt"), String(error));
}

const failed = results.filter((result) => !result.ok);
if (failed.length > 0) {
	console.error("Route probe failed:", failed);
	process.exitCode = 1;
}

console.log(JSON.stringify({ results, playwrightOk, outDir }, null, 2));
