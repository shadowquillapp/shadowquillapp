import type { PresetLite } from "@/types";
import { Icon } from "@/components/Icon";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

interface PresetInfoDialogProps {
	open: boolean;
	onClose: () => void;
	preset: PresetLite;
}

const CATEGORIES = {
	general: ["tone", "detail", "format", "language"],
	model: ["temperature", "reasoningStyle", "includeVerification", "endOfPromptToken"],
	content: ["useDelimiters", "requireCitations", "includeTests", "outputXMLSchema"],
	media: ["stylePreset", "aspectRatio", "videoStylePreset", "cameraMovement", "shotType", "durationSeconds", "frameRate"],
	context: ["additionalContext", "examplesText"],
};

const CATEGORY_LABELS: Record<string, string> = {
	general: "General Settings",
	model: "Model Configuration",
	content: "Content Structure",
	media: "Media Settings",
	context: "Context & Examples",
};

const CATEGORY_ICONS: Record<string, any> = {
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
	const groupedOptions: Record<string, Array<{ key: string; value: any }>> = {};
	
	Object.entries(options).forEach(([key, value]) => {
		if (value === undefined || value === null || value === "" || value === false) return;

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
		groupedOptions[category]!.push({ key, value });
	});

	// Order categories
	const categoryOrder = ["general", "model", "content", "media", "context", "other"];

	return (
		<div
			className="modal-container"
			aria-modal="true"
			role="dialog"
		>
			<div className="modal-backdrop-blur" />
			<div
				className="modal-content"
				onClick={(e) => e.stopPropagation()}
				style={{ maxWidth: 520 }}
			>
				<div className="modal-header">
					<div className="modal-title flex items-center gap-2">
						<Icon name="info" className="text-primary" />
						<span>Preset Details</span>
					</div>
					<button
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
							className="flex items-start justify-between gap-4 p-5 rounded-xl border border-[var(--color-outline)]"
							style={{
								background: "linear-gradient(135deg, var(--color-surface-variant) 0%, color-mix(in srgb, var(--color-surface-variant), transparent 50%) 100%)"
							}}
						>
							<div className="flex flex-col gap-2">
								<div className="text-xl font-bold text-on-surface leading-tight tracking-tight">
									{preset.name}
								</div>
								<div className="flex items-center gap-2">
									<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/10">
										<Icon name={
											preset.taskType === "coding" ? "git-compare" :
											preset.taskType === "image" ? "palette" :
											preset.taskType === "video" ? "eye" :
											"sparkles"
										} className="w-3 h-3" />
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
										<div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-[var(--color-outline)]/50 pb-1.5">
											<Icon name={CATEGORY_ICONS[cat] || "settings"} className="w-3.5 h-3.5 opacity-70" />
											{CATEGORY_LABELS[cat] || "Other Settings"}
										</div>
										
										<div className="grid grid-cols-2 gap-3">
											{items.map(({ key, value }) => {
												const label = key
													.replace(/([A-Z])/g, " $1")
													.replace(/^./, (str) => str.toUpperCase());

												const displayValue = typeof value === "boolean" ? "Yes" : String(value);
												const isLongText = displayValue.length > 40;

												return (
													<div 
														key={key} 
														className={`flex flex-col gap-1.5 p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-outline)]/50 hover:border-[var(--color-outline)] transition-colors ${isLongText ? 'col-span-2' : ''}`}
													>
														<span className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-wide leading-none">
															{label}
														</span>
														<span className={`font-mono text-xs text-on-surface ${isLongText ? 'whitespace-pre-wrap leading-relaxed' : 'truncate'}`} title={displayValue}>
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
								<div className="flex flex-col items-center justify-center py-8 text-secondary italic text-sm">
									No specific options configured for this preset.
								</div>
							)}
						</div>
					</div>

					<div className="flex justify-end mt-6 pt-4 border-t border-[var(--color-outline)]">
						<button className="md-btn md-btn--primary px-6" onClick={onClose}>
							Close
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
