/** @jsxImportSource react */
"use client";
import { useEffect } from "react";

export default function GlobalZoomControl() {
	useEffect(() => {
		const api = window.shadowquill;
		if (!api?.view?.setZoomFactor || !api?.view?.getZoomFactor) return;

		const handleWheel = async (e: WheelEvent) => {
			if (e.ctrlKey || e.metaKey) {
				e.preventDefault();

				try {
					const currentZoom = await api.view?.getZoomFactor?.();
					if (
						typeof currentZoom !== "number" ||
						!Number.isFinite(currentZoom)
					) {
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
