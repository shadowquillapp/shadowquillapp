/** @jsxImportSource react */
"use client";
import { useEffect } from "react";

interface ShadowQuillViewApi {
	view?: {
		getZoomFactor?: () => Promise<number>;
		setZoomFactor?: (factor: number) => Promise<void>;
	};
}

type WindowWithShadowQuill = Window & {
	shadowquill?: ShadowQuillViewApi;
};

/**
 * Global zoom control that enables Control/Cmd + Scroll Wheel zooming
 * throughout the entire application.
 */
export default function GlobalZoomControl() {
	useEffect(() => {
		const api = (window as WindowWithShadowQuill).shadowquill;
		if (!api?.view?.setZoomFactor || !api?.view?.getZoomFactor) return;

		const handleWheel = async (e: WheelEvent) => {
			if (e.ctrlKey || e.metaKey) {
				e.preventDefault();

				try {
					const currentZoom = await api.view?.getZoomFactor?.();
					if (typeof currentZoom !== "number" || !Number.isFinite(currentZoom)) {
						return;
					}
					const delta = -Math.sign(e.deltaY) * 0.05;
					const newFactor = Math.max(0.8, Math.min(1.5, currentZoom + delta));
					await api.view?.setZoomFactor?.(newFactor);
				} catch (error) {
					console.error("Failed to adjust zoom:", error);
				}
			}
		};
		window.addEventListener("wheel", handleWheel, { passive: false });
		return () => {
			window.removeEventListener("wheel", handleWheel);
		};
	}, []);
	return null;
}
