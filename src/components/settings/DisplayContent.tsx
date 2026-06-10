/** @jsxImportSource react */
"use client";
import React from "react";
import {
	applyThemeToDocument,
	persistTheme,
	readThemePreference,
	type ThemeId,
} from "@/lib/theme-preference";
import { Icon, type IconName } from "../Icon";

const FIELD_LABEL_STYLE: React.CSSProperties = {
	marginBottom: "10px",
	fontSize: "13px",
	fontWeight: 600,
};

const ZOOM_BTN_STYLE: React.CSSProperties = {
	width: "36px",
	height: "36px",
	padding: "0",
	fontSize: "18px",
	borderRadius: "8px",
};

export default function DisplayContent() {
	const [available, setAvailable] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [zoomFactor, setZoomFactor] = React.useState(1);
	const [windowInfo, setWindowInfo] = React.useState<{
		ok?: boolean;
		windowSize?: [number, number];
		contentSize?: [number, number];
		isMaximized?: boolean;
		isFullScreen?: boolean;
	} | null>(null);
	const [currentTheme, setCurrentTheme] =
		React.useState<ThemeId>(readThemePreference);

	React.useEffect(() => {
		const api = window.shadowquill;
		const hasApi = !!api?.view?.getZoomFactor;
		setAvailable(hasApi);

		applyThemeToDocument(currentTheme);

		const refreshWindowInfo = async () => {
			try {
				const s = await api?.window?.getSize?.();
				if (s?.ok) setWindowInfo(s);
			} catch {}
		};

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
			await refreshWindowInfo();
		};
		void init();

		const onResize = () => void refreshWindowInfo();
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, [currentTheme]);

	React.useEffect(() => {
		const api = window.shadowquill;
		if (!api?.view?.onZoomChanged) return;

		const unsubscribe = api.view.onZoomChanged((factor) => {
			if (typeof factor === "number" && Number.isFinite(factor)) {
				setZoomFactor(factor);
			}
		});

		return unsubscribe;
	}, []);

	const applyZoom = async (factor: number) => {
		const api = window.shadowquill;
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
		void applyZoom((Math.round(zoomFactor * 100) + deltaPercent) / 100);
	};

	const handleThemeChange = (theme: ThemeId) => {
		setCurrentTheme(theme);
		applyThemeToDocument(theme);
		persistTheme(theme);
	};

	const percent = Math.round(zoomFactor * 100);

	const themeOptions = [
		{ value: "earth" as const, label: "Earth", icon: "palette" },
		{ value: "purpledark" as const, label: "Dark Purple", icon: "sparkles" },
		{ value: "dark" as const, label: "Dark", icon: "moon" },
		{ value: "light" as const, label: "Light", icon: "sun" },
	];

	return (
		<div className="shadowquill-setup">
			<section className="shadowquill-panel">
				<header className="shadowquill-panel__head">
					<div>
						<p
							className="shadowquill-panel__eyebrow"
							style={{ fontSize: "9px", marginBottom: "2px" }}
						>
							Display & Theme
						</p>
						<h3 style={{ fontSize: "18px", marginBottom: "0" }}>Display</h3>
					</div>
				</header>

				<div className="shadowquill-panel__body" style={{ paddingTop: "20px" }}>
					{!available && (
						<div
							className="shadowquill-error-banner"
							role="alert"
							style={{ marginBottom: "16px" }}
						>
							Not available outside the desktop app.
						</div>
					)}
					{error && (
						<div
							className="shadowquill-error-banner"
							role="alert"
							style={{ marginBottom: "16px" }}
						>
							{error}
						</div>
					)}

					<div className="shadowquill-field" style={{ marginBottom: "24px" }}>
						<div className="shadowquill-label" style={FIELD_LABEL_STYLE}>
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

					<div className="shadowquill-field" style={{ marginBottom: "24px" }}>
						<div className="shadowquill-label" style={FIELD_LABEL_STYLE}>
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
								style={ZOOM_BTN_STYLE}
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
								style={ZOOM_BTN_STYLE}
							>
								+
							</button>
							<button
								type="button"
								className="md-input"
								onClick={() => void applyZoom(1.0)}
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

					<div className="shadowquill-field" style={{ marginBottom: "0" }}>
						<div className="shadowquill-label" style={FIELD_LABEL_STYLE}>
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
