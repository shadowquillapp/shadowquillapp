/** @jsxImportSource react */
"use client";
import React from "react";
import { getJSON, setJSON } from "@/lib/local-storage";
import { Icon, type IconName } from "../Icon";

interface ShadowQuillViewApi {
	view?: {
		getZoomFactor?: () => Promise<number>;
		setZoomFactor?: (factor: number) => Promise<void>;
		onZoomChanged?: (
			callback: (event: unknown, factor: number) => void,
		) => () => void;
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
	// Initialize theme from localStorage immediately to prevent reset on mount
	const [currentTheme, setCurrentTheme] = React.useState<
		"earth" | "purpledark" | "dark" | "light"
	>(() => {
		// Load saved theme synchronously during initialization
		let savedTheme = getJSON<
			"earth" | "purpledark" | "dark" | "light" | "default" | null
		>("theme-preference", null);
		if (savedTheme === "default") {
			savedTheme = "purpledark";
			setJSON("theme-preference", "purpledark");
		}
		if (
			savedTheme &&
			(savedTheme === "earth" ||
				savedTheme === "purpledark" ||
				savedTheme === "dark" ||
				savedTheme === "light")
		) {
			return savedTheme;
		}
		return "earth";
	});

	React.useEffect(() => {
		const api = (window as WindowWithShadowQuill).shadowquill;
		const hasApi = !!api?.view?.getZoomFactor;
		setAvailable(hasApi);
		setContentSize({
			w: window.innerWidth,
			h: window.innerHeight,
		});

		// Ensure theme is applied to document (in case it wasn't set during init)
		document.documentElement.setAttribute(
			"data-theme",
			currentTheme === "earth" ? "" : currentTheme,
		);

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
	}, [currentTheme]);

	React.useEffect(() => {
		const api = (window as WindowWithShadowQuill).shadowquill;
		if (!api?.view?.onZoomChanged) return;

		const unsubscribe = api.view.onZoomChanged((_event, factor) => {
			if (typeof factor === "number" && Number.isFinite(factor)) {
				setZoomFactor(factor);
			}
		});

		return unsubscribe;
	}, []);

	const applyZoom = async (factor: number) => {
		const api = (window as WindowWithShadowQuill).shadowquill;
		const clamped = Math.max(0.8, Math.min(1.5, factor));
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
		void applyZoom(1.0);
	};

	const handleThemeChange = (
		theme: "earth" | "purpledark" | "dark" | "light",
	) => {
		setCurrentTheme(theme);
		document.documentElement.setAttribute(
			"data-theme",
			theme === "earth" ? "" : theme,
		);
		setJSON("theme-preference", theme);
	};

	const percent = Math.round(zoomFactor * 100);

	const themeOptions = [
		{ value: "earth" as const, label: "Earth", icon: "palette" },
		{ value: "purpledark" as const, label: "Dark Purple", icon: "sparkles" },
		{ value: "dark" as const, label: "Dark", icon: "moon" },
		{ value: "light" as const, label: "Light", icon: "sun" },
	];


	return (
		<div className="ollama-setup">
			<section className="ollama-panel">
				<header className="ollama-panel__head">
					<div>
						<p className="ollama-panel__eyebrow" style={{ fontSize: "9px", marginBottom: "2px" }}>Display & Theme</p>
						<h3 style={{ fontSize: "18px", marginBottom: "0" }}>Display</h3>
					</div>
				</header>

				<div className="ollama-panel__body" style={{ paddingTop: "20px" }}>
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
					<div className="ollama-field" style={{ marginBottom: "24px" }}>
						<div className="ollama-label" style={{ marginBottom: "10px", fontSize: "13px", fontWeight: 600 }}>
							Theme
						</div>
						<div className="grid grid-cols-4 gap-2">
							{themeOptions.map((option) => (
								<button
									key={option.value}
									type="button"
									onClick={() => handleThemeChange(option.value)}
									className={`flex flex-col items-center gap-1.5 rounded-lg p-3 transition-all ${
										currentTheme === option.value
											? "bg-primary/10"
											: "bg-[var(--color-surface-variant)]"
									}`}
									style={
										currentTheme === option.value
											? {
													border: "2px solid var(--color-primary)",
													outline: "2px solid var(--color-primary)",
													outlineOffset: "-2px",
												}
											: { border: "2px solid var(--color-outline)" }
									}
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
					<div className="ollama-field" style={{ marginBottom: "24px" }}>
						<div className="ollama-label" style={{ marginBottom: "10px", fontSize: "13px", fontWeight: 600 }}>
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
							style={{ width: "36px", height: "36px", padding: "0", fontSize: "18px", borderRadius: "8px" }}
						>
							−
						</button>
							<input
								type="range"
								min={80}
								max={150}
								step={10}
								value={Math.max(80, Math.min(150, percent))}
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
							style={{ width: "36px", height: "36px", padding: "0", fontSize: "18px", borderRadius: "8px" }}
						>
							+
						</button>
						<button
							type="button"
							className="md-input"
							onClick={resetZoom}
							disabled={!available}
							aria-label="Reset zoom"
							title="Click to reset to 100%"
							style={{
								minWidth: "60px",
								textAlign: "center",
								fontFamily: "var(--font-mono, monospace)",
								padding: "6px 10px",
								fontSize: "13px",
								cursor: available ? "pointer" : "default",
								border: "1px solid var(--color-outline)",
							}}
							aria-live="polite"
						>
							{percent}%
						</button>
						</div>
					</div>

					{/* Display Stats */}
					<div className="ollama-field" style={{ marginBottom: "0" }}>
						<div className="ollama-label" style={{ marginBottom: "10px", fontSize: "13px", fontWeight: 600 }}>
							Display Stats
						</div>
						<div className="grid grid-cols-2 gap-2">
							<div className="md-input" style={{ padding: "8px 10px" }}>
								<div className="mb-1 text-on-surface-variant text-xs">
									Window Size
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
					</div>
				</div>
			</section>
		</div>
	);
}
