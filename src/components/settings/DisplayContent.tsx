/** @jsxImportSource react */
"use client";
import React from "react";
import { Icon, type IconName } from "../Icon";

interface ShadowQuillViewApi {
	view?: {
		getZoomFactor?: () => Promise<number>;
		setZoomFactor?: (factor: number) => Promise<void>;
	};
	window?: {
		getSize?: () => Promise<{
			ok: boolean;
			windowSize?: [number, number];
			contentSize?: [number, number];
			isMaximized?: boolean;
			isFullScreen?: boolean;
		}>;
	};
}

type WindowWithShadowQuill = Window & {
	shadowquill?: ShadowQuillViewApi;
};

export default function DisplayContent() {
	const [available, setAvailable] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [zoomFactor, setZoomFactor] = React.useState(1);
	const [contentSize, setContentSize] = React.useState<{
		w: number;
		h: number;
	}>({
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
	const [currentTheme, setCurrentTheme] = React.useState<
		"earth" | "purpledark" | "dark" | "light"
	>("earth");

	React.useEffect(() => {
		const api = (window as WindowWithShadowQuill).shadowquill;
		const hasApi = !!api?.view?.getZoomFactor;
		setAvailable(hasApi);
		setContentSize({
			w: window.innerWidth,
			h: window.innerHeight,
		});

		// Load saved theme
		let savedTheme = localStorage.getItem("theme-preference") as
			| "earth"
			| "purpledark"
			| "dark"
			| "light"
			| "default"
			| null;
		// Migrate old 'default' theme to 'purpledark'
		if (savedTheme === "default") {
			savedTheme = "purpledark";
			localStorage.setItem("theme-preference", "purpledark");
		}
		if (
			savedTheme &&
			(savedTheme === "earth" ||
				savedTheme === "purpledark" ||
				savedTheme === "dark" ||
				savedTheme === "light")
		) {
			setCurrentTheme(savedTheme);
		}

		const init = async () => {
			if (!hasApi) return;
			try {
				const z = await api?.view?.getZoomFactor?.();
				const factor = typeof z === "number" && Number.isFinite(z) ? z : 1;
				setZoomFactor(factor);
			} catch (e: unknown) {
				const err = e as Error;
				setError(err?.message || "Failed to read zoom level");
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
		const api = (window as WindowWithShadowQuill).shadowquill;
		const clamped = Math.max(0.5, Math.min(3, factor));
		setZoomFactor(clamped);
		try {
			await api?.view?.setZoomFactor?.(clamped);
		} catch (e: unknown) {
			const err = e as Error;
			setError(err?.message || "Failed to set zoom");
		}
	};

	const changeBy = (deltaPercent: number) => {
		const next = (Math.round(zoomFactor * 100) + deltaPercent) / 100;
		void applyZoom(next);
	};

	const resetZoom = () => {
		void applyZoom(1.1);
	};

	const handleThemeChange = (
		theme: "earth" | "purpledark" | "dark" | "light",
	) => {
		setCurrentTheme(theme);
		document.documentElement.setAttribute(
			"data-theme",
			theme === "earth" ? "" : theme,
		);
		localStorage.setItem("theme-preference", theme);
	};

	const percent = Math.round(zoomFactor * 100);

	const themeOptions = [
		{ value: "earth" as const, label: "Default", icon: "sun" },
		{ value: "purpledark" as const, label: "Dark Purple", icon: "moon" },
		{ value: "dark" as const, label: "Dark", icon: "moon" },
		{ value: "light" as const, label: "Light", icon: "sun" },
	];

	const [showStats, setShowStats] = React.useState(false);

	return (
		<div className="ollama-setup">
			<section className="ollama-panel">
				<header className="ollama-panel__head">
					<div>
						<p className="ollama-panel__eyebrow">Display & Theme</p>
						<h3>Display</h3>
					</div>
				</header>

				<div className="ollama-panel__body" style={{ paddingTop: "16px" }}>
					{!available && (
						<div
							className="ollama-error-banner"
							role="alert"
							style={{ marginBottom: "16px" }}
						>
							Not available outside the desktop app.
						</div>
					)}
					{error && (
						<div
							className="ollama-error-banner"
							role="alert"
							style={{ marginBottom: "16px" }}
						>
							{error}
						</div>
					)}

					{/* Theme Selection - More Compact */}
					<div className="ollama-field" style={{ marginBottom: "20px" }}>
						<div className="ollama-label" style={{ marginBottom: "8px" }}>
							Theme
						</div>
						<div className="grid grid-cols-4 gap-2">
							{themeOptions.map((option) => (
								<button
									key={option.value}
									type="button"
									onClick={() => handleThemeChange(option.value)}
									className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all ${
										currentTheme === option.value
											? "border-primary bg-primary/10"
											: "border-[var(--color-outline)] bg-[var(--color-surface-variant)] hover:border-primary/50"
									}`}
									aria-label={`Select ${option.label} theme`}
									title={option.label}
								>
									<Icon
										name={option.icon as IconName}
										className={`h-5 w-5 ${
											currentTheme === option.value
												? "text-primary"
												: "text-on-surface-variant"
										}`}
									/>
									<span
										className={`font-medium text-xs ${
											currentTheme === option.value
												? "text-primary"
												: "text-on-surface"
										}`}
									>
										{option.label}
									</span>
								</button>
							))}
						</div>
					</div>

					{/* Zoom Controls - More Compact */}
					<div className="ollama-field" style={{ marginBottom: "20px" }}>
						<div className="ollama-label" style={{ marginBottom: "8px" }}>
							Zoom
						</div>
						<div className="flex items-center gap-2">
							<button
								type="button"
								className="md-btn"
								onClick={() => changeBy(-10)}
								disabled={!available}
								aria-label="Zoom out"
								title="Zoom out"
								style={{ minWidth: "36px", padding: "6px 8px" }}
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
								type="button"
								className="md-btn"
								onClick={() => changeBy(10)}
								disabled={!available}
								aria-label="Zoom in"
								title="Zoom in"
								style={{ minWidth: "36px", padding: "6px 8px" }}
							>
								+
							</button>
							<div
								className="md-input"
								style={{
									minWidth: "60px",
									textAlign: "center",
									fontFamily: "var(--font-mono, monospace)",
									padding: "6px 10px",
									fontSize: "13px",
								}}
								aria-live="polite"
							>
								{percent}%
							</div>
							<button
								type="button"
								className="md-btn"
								onClick={resetZoom}
								disabled={!available || percent === 110}
								aria-label="Reset zoom"
								title="Reset to 110%"
								style={{ padding: "6px 12px", fontSize: "12px" }}
							>
								Reset
							</button>
						</div>
					</div>

					{/* Display Stats - Collapsible and Compact */}
					<div className="ollama-field" style={{ marginBottom: "0" }}>
						<button
							type="button"
							onClick={() => setShowStats(!showStats)}
							className="flex w-full items-center justify-between rounded p-2 transition-colors hover:bg-[var(--color-surface-variant)]"
							style={{
								background: "transparent",
								border: "none",
								cursor: "pointer",
								marginBottom: showStats ? "8px" : "0",
							}}
						>
							<span
								className="ollama-label"
								style={{ marginBottom: "0", cursor: "pointer" }}
							>
								Display Stats
							</span>
							<Icon
								name={(showStats ? "chevron-up" : "chevron-down") as IconName}
								className="h-4 w-4 text-on-surface-variant"
							/>
						</button>
						{showStats && (
							<div className="mt-2 grid grid-cols-2 gap-2">
								<div className="md-input" style={{ padding: "8px 10px" }}>
									<div className="mb-1 text-on-surface-variant text-xs">
										Content Area
									</div>
									<div
										className="font-mono text-xs"
										style={{ fontFamily: "var(--font-mono, monospace)" }}
									>
										{contentSize.w} × {contentSize.h} px
									</div>
								</div>
								<div className="md-input" style={{ padding: "8px 10px" }}>
									<div className="mb-1 text-on-surface-variant text-xs">
										OS Window
									</div>
									<div
										className="font-mono text-xs"
										style={{ fontFamily: "var(--font-mono, monospace)" }}
									>
										{windowInfo?.windowSize
											? `${windowInfo.windowSize[0]} × ${windowInfo.windowSize[1]} px`
											: "—"}
									</div>
								</div>
								<div className="md-input" style={{ padding: "8px 10px" }}>
									<div className="mb-1 text-on-surface-variant text-xs">
										Chromium Content
									</div>
									<div
										className="font-mono text-xs"
										style={{ fontFamily: "var(--font-mono, monospace)" }}
									>
										{windowInfo?.contentSize
											? `${windowInfo.contentSize[0]} × ${windowInfo.contentSize[1]} px`
											: "—"}
									</div>
								</div>
								<div className="md-input" style={{ padding: "8px 10px" }}>
									<div className="mb-1 text-on-surface-variant text-xs">
										State
									</div>
									<div className="font-mono text-xs">
										{windowInfo?.isFullScreen
											? "Fullscreen"
											: windowInfo?.isMaximized
												? "Maximized"
												: "Windowed"}
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			</section>

			<aside className="ollama-guide">
				<div className="ollama-guide-card">
					<p className="ollama-panel__eyebrow">Themes</p>
					<ul>
						<li>Choose from 4 color schemes</li>
						<li>Default (Earth) - warm, natural colors</li>
						<li>Dark Purple - rich purple dark theme</li>
						<li>Dark - pure dark theme</li>
						<li>Light - bright light theme</li>
					</ul>
				</div>
			</aside>
		</div>
	);
}
