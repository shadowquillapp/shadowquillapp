const MIN_ZOOM = 0.8;
const MAX_ZOOM = 1.5;
const ZOOM_STEP = 0.1;
const DEFAULT_ZOOM = 1.0;

function clampZoom(factor) {
	let f = Number(factor);
	if (!Number.isFinite(f)) f = DEFAULT_ZOOM;
	return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, f));
}

function applyZoom(webContents, factor) {
	const f = clampZoom(factor);
	webContents.setZoomFactor(f);
	webContents.send("shadowquill:zoom:changed", f);
	return f;
}

module.exports = {
	MIN_ZOOM,
	MAX_ZOOM,
	ZOOM_STEP,
	DEFAULT_ZOOM,
	clampZoom,
	applyZoom,
};
