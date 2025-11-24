/** @jsxImportSource react */
"use client";
import React from "react";

export default function DisplayContent() {
	const [available, setAvailable] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [zoomFactor, setZoomFactor] = React.useState(1);
	const [contentSize, setContentSize] = React.useState<{ w: number; h: number }>({
		w: 0,
		h: 0,
	});
	const [windowInfo, setWindowInfo] = React.useState<{
		ok?: boolean;
		windowSize?: [number, number];
		contentSize?: [number, number];
		isMaximized?: boolean;
		isFullScreen?: boolean;
	} | null>(null);

	React.useEffect(() => {
		const api = (window as any).shadowquill;
		const hasApi = !!api?.view?.getZoomFactor;
		setAvailable(hasApi);
		setContentSize({
			w: window.innerWidth,
			h: window.innerHeight,
		});

		const init = async () => {
			if (!hasApi) return;
			try {
				const z = await api.view.getZoomFactor();
				const factor = typeof z === "number" && Number.isFinite(z) ? z : 1;
				setZoomFactor(factor);
			} catch (e: any) {
				setError(e?.message || "Failed to read zoom level");
			}
			try {
				const s = await api?.window?.getSize?.();
				if (s?.ok) setWindowInfo(s);
			} catch {
				/* noop */
			}
		};
		void init();

		const onResize = async () => {
			setContentSize({
				w: window.innerWidth,
				h: window.innerHeight,
			});
			try {
				const s = await api?.window?.getSize?.();
				if (s?.ok) setWindowInfo(s);
			} catch {
				/* noop */
			}
		};
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);

	const applyZoom = async (factor: number) => {
		const api = (window as any).shadowquill;
		const clamped = Math.max(0.5, Math.min(3, factor));
		setZoomFactor(clamped);
		try {
			await api?.view?.setZoomFactor?.(clamped);
		} catch (e: any) {
			setError(e?.message || "Failed to set zoom");
		}
	};

	const changeBy = (deltaPercent: number) => {
		const next = (Math.round(zoomFactor * 100) + deltaPercent) / 100;
		void applyZoom(next);
	};

	const resetZoom = () => {
		void applyZoom(1);
	};

	const percent = Math.round(zoomFactor * 100);

	return (
		<div className="ollama-setup">
			<section className="ollama-panel">
				<header className="ollama-panel__head">
					<div>
						<p className="ollama-panel__eyebrow">Display & Zoom</p>
						<h3>Display</h3>
						<p className="ollama-panel__subtitle">
							Adjust the interface zoom level and view window size details.
						</p>
					</div>
					<span className="ollama-status-chip ollama-status-chip--idle">
						{available ? `${percent}%` : "Unavailable"}
					</span>
				</header>

				<div className="ollama-panel__body">
					{!available && (
						<div className="ollama-error-banner" role="alert">
							Not available outside the desktop app.
						</div>
					)}
					{error && (
						<div className="ollama-error-banner" role="alert">
							{error}
						</div>
					)}

					<div className="ollama-field">
						<label className="ollama-label">
							Zoom
							<span>Scale the UI to your preference (50% - 200%)</span>
						</label>
						<div
							className="flex items-center gap-3"
							style={{ alignItems: "center" }}
						>
							<button
								className="md-btn"
								onClick={() => changeBy(-10)}
								disabled={!available}
								aria-label="Zoom out"
								title="Zoom out"
							>
								−
							</button>
							<input
								type="range"
								min={50}
								max={200}
								step={10}
								value={Math.max(50, Math.min(200, percent))}
								onChange={(e) => {
									const v = Number(e.target.value) || 100;
									void applyZoom(v / 100);
								}}
								className="flex-1"
								disabled={!available}
								aria-label="Zoom level"
								title="Zoom level"
							/>
							<button
								className="md-btn"
								onClick={() => changeBy(10)}
								disabled={!available}
								aria-label="Zoom in"
								title="Zoom in"
							>
								+
							</button>
							<button
								className="md-btn"
								onClick={resetZoom}
								disabled={!available || percent === 100}
								aria-label="Reset zoom"
								title="Reset to 100%"
							>
								Reset
							</button>
							<div
								className="md-input"
								style={{
									width: 72,
									textAlign: "center",
									fontFamily: "var(--font-mono, monospace)",
								}}
								aria-live="polite"
							>
								{percent}%
							</div>
						</div>
					</div>

					<div className="ollama-field">
						<label className="ollama-label">
							Display Stats
							<span>Current sizes in pixels</span>
						</label>
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<div className="md-input" style={{ padding: "10px 12px" }}>
								<div className="text-xs text-on-surface-variant">Content Area</div>
								<div
									className="text-sm font-mono"
									style={{ fontFamily: "var(--font-mono, monospace)" }}
								>
									{contentSize.w} × {contentSize.h} px
								</div>
							</div>
							<div className="md-input" style={{ padding: "10px 12px" }}>
								<div className="text-xs text-on-surface-variant">OS Window</div>
								<div
									className="text-sm font-mono"
									style={{ fontFamily: "var(--font-mono, monospace)" }}
								>
									{windowInfo?.windowSize
										? `${windowInfo.windowSize[0]} × ${windowInfo.windowSize[1]} px`
										: "—"}
								</div>
							</div>
							<div className="md-input" style={{ padding: "10px 12px" }}>
								<div className="text-xs text-on-surface-variant">Chromium Content</div>
								<div
									className="text-sm font-mono"
									style={{ fontFamily: "var(--font-mono, monospace)" }}
								>
									{windowInfo?.contentSize
										? `${windowInfo.contentSize[0]} × ${windowInfo.contentSize[1]} px`
										: "—"}
								</div>
							</div>
							<div className="md-input" style={{ padding: "10px 12px" }}>
								<div className="text-xs text-on-surface-variant">State</div>
								<div className="text-sm font-mono">
									{windowInfo?.isFullScreen
										? "Fullscreen"
										: windowInfo?.isMaximized
										? "Maximized"
										: "Windowed"}
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			<aside className="ollama-guide">
				<div className="ollama-guide-card">
					<p className="ollama-panel__eyebrow">About Zoom</p>
					<ul>
						<li>Applies to the entire app UI</li>
						<li>Range 50% to 200% (default 100%)</li>
						<li>Use Reset to quickly return to 100%</li>
					</ul>
				</div>
			</aside>
		</div>
	);
}