import { Icon, type IconName } from "@/components/Icon";
import type { PresetLite } from "@/types";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

interface PresetInfoDialogProps {
	open: boolean;
	onClose: () => void;
	preset: PresetLite;
}

const CATEGORIES = {
	general: ["tone", "detail", "format", "language"],
	model: [
		"temperature",
		"reasoningStyle",
		"includeVerification",
		"endOfPromptToken",
	],
	content: [
		"useDelimiters",
		"requireCitations",
		"includeTests",
		"outputXMLSchema",
	],
	media: [
		"stylePreset",
		"aspectRatio",
		"videoStylePreset",
		"cameraMovement",
		"shotType",
		"durationSeconds",
		"frameRate",
	],
	context: ["additionalContext", "examplesText"],
};

const CATEGORY_LABELS: Record<string, string> = {
	general: "General Settings",
	model: "Model Configuration",
	content: "Content Structure",
	media: "Media Settings",
	context: "Context & Examples",
};

const CATEGORY_ICONS: Record<string, IconName> = {
	general: "sliders",
	model: "cpu",
	content: "layout",
	media: "image",
	context: "file-text",
};

export function PresetInfoDialog({
	open,
	onClose,
	preset,
}: PresetInfoDialogProps) {
	const router = useRouter();

	const handleOpenInStudio = () => {
		// Set the preset ID in localStorage so it auto-selects when studio loads
		if (preset.id) {
			localStorage.setItem("last-selected-preset", preset.id);
		} else if (preset.name) {
			localStorage.setItem("last-selected-preset", preset.name);
		}
		onClose();
		router.push("/studio");
	};

	useEffect(() => {
		if (!open) return;
		const onEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onEsc);
		return () => document.removeEventListener("keydown", onEsc);
	}, [open, onClose]);

	if (!open) return null;

	const options = preset.options || {};

	// Group options by category
	const groupedOptions: Record<
		string,
		Array<{ key: string; value: unknown }>
	> = {};

	for (const [key, value] of Object.entries(options)) {
		if (
			value === undefined ||
			value === null ||
			value === "" ||
			value === false
		) {
			continue;
		}

		let category = "other";
		for (const [cat, keys] of Object.entries(CATEGORIES)) {
			if (keys.includes(key)) {
				category = cat;
				break;
			}
		}

		if (!groupedOptions[category]) {
			groupedOptions[category] = [];
		}
		groupedOptions[category]?.push({ key, value });
	}

	// Order categories
	const categoryOrder = [
		"general",
		"model",
		"content",
		"media",
		"context",
		"other",
	];

	return (
		<div className="modal-container" aria-modal="true">
			<div className="modal-backdrop-blur" />
			<dialog
				open
				className="modal-content"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
				style={{ maxWidth: 520 }}
			>
				<div className="modal-header">
					<div className="modal-title flex items-center gap-2">
						<Icon name="info" className="text-primary" />
						<span>Preset Details</span>
					</div>
					<button
						type="button"
						aria-label="Close"
						className="md-btn"
						onClick={onClose}
						style={{ width: 32, height: 32, padding: 0 }}
					>
						<Icon name="close" />
					</button>
				</div>

				<div className="modal-body">
					<div className="flex flex-col gap-6">
						{/* Header Info */}
						<div
							className="flex items-start justify-between gap-4 rounded-xl border border-[var(--color-outline)] p-5"
							style={{
								background:
									"linear-gradient(135deg, var(--color-surface-variant) 0%, color-mix(in srgb, var(--color-surface-variant), transparent 50%) 100%)",
							}}
						>
							<div className="flex flex-col gap-2">
								<div
									className="font-bold text-xl leading-tight tracking-tight"
									style={{ color: "var(--color-on-surface)" }}
								>
									{preset.name}
								</div>
								<div className="flex items-center gap-2">
									<span className="inline-flex items-center gap-1.5 font-bold text-[10px] text-primary uppercase tracking-wider">
										<Icon
											name={
												preset.taskType === "coding"
													? "git-compare"
													: preset.taskType === "image"
														? "palette"
														: preset.taskType === "video"
															? "eye"
															: "sparkles"
											}
											className="h-3 w-3"
										/>
										{preset.taskType || "General"}
									</span>
								</div>
							</div>
							<button
								type="button"
								className="md-btn md-btn--primary"
								onClick={handleOpenInStudio}
								title="Open in Preset Studio"
								aria-label="Open in Preset Studio"
								style={{
									display: "flex",
									alignItems: "center",
									gap: 6,
									padding: "8px 12px",
									fontSize: 12,
									fontWeight: 600,
									whiteSpace: "nowrap",
								}}
							>
								<Icon name="brush" style={{ width: 14, height: 14 }} />
								Edit
							</button>
						</div>

						{/* Grouped Settings */}
						<div className="flex flex-col gap-5">
							{categoryOrder.map((cat) => {
								const items = groupedOptions[cat];
								if (!items || items.length === 0) return null;

								return (
									<div key={cat} className="flex flex-col gap-3">
										<div
											className="flex items-center gap-2 border-[var(--color-outline)]/50 border-b pb-1.5 font-bold text-xs uppercase tracking-wider"
											style={{ color: "var(--color-on-surface)" }}
										>
											<Icon
												name={CATEGORY_ICONS[cat] || "settings"}
												className="h-3.5 w-3.5 opacity-70"
											/>
											{CATEGORY_LABELS[cat] || "Other Settings"}
										</div>

										<div className="grid grid-cols-2 gap-3">
											{items.map(({ key, value }) => {
												const label = key
													.replace(/([A-Z])/g, " $1")
													.replace(/^./, (str) => str.toUpperCase());

												const displayValue =
													typeof value === "boolean" ? "Yes" : String(value);
												const isLongText = displayValue.length > 40;

												return (
													<div
														key={key}
														className={`flex flex-col gap-1.5 rounded-lg border border-[var(--color-outline)] p-3 transition-colors hover:border-primary/50 ${isLongText ? "col-span-2" : ""}`}
														style={{
															background: "var(--color-surface)",
														}}
													>
														<span
															className="font-bold text-[10px] uppercase leading-none tracking-wide"
															style={{
																color: "var(--color-on-surface-variant)",
															}}
														>
															{label}
														</span>
														<span
															className={`font-mono text-sm ${isLongText ? "whitespace-pre-wrap leading-relaxed" : "truncate"}`}
															style={{ color: "var(--color-on-surface)" }}
															title={displayValue}
														>
															{displayValue}
														</span>
													</div>
												);
											})}
										</div>
									</div>
								);
							})}

							{Object.keys(groupedOptions).length === 0 && (
								<div className="flex flex-col items-center justify-center py-8 text-secondary text-sm italic">
									No specific options configured for this preset.
								</div>
							)}
						</div>
					</div>

					<div className="mt-6 flex justify-end border-[var(--color-outline)] border-t pt-4">
						<button
							type="button"
							className="md-btn md-btn--primary px-6"
							onClick={onClose}
						>
							Close
						</button>
					</div>
				</div>
			</dialog>
		</div>
	);
}
