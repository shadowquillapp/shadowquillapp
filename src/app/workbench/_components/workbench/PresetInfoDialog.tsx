"use client";

import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/Icon";
import { useCloseOnEscape } from "@/components/useCloseOnEscape";
import { setLastSelectedPresetKey } from "@/lib/preset-store";
import { getTaskTypeIcon } from "@/lib/task-type-icon";
import type { PresetLite } from "@/types";

interface PresetInfoDialogProps {
	open: boolean;
	onClose: () => void;
	preset: PresetLite;
}

const CATEGORIES = {
	general: [
		"tone",
		"detail",
		"format",
		"language",
		"additionalContext",
		"audience",
		"styleGuidelines",
	],
};

const CATEGORY_LABELS: Record<string, string> = {
	general: "Settings",
};

export function PresetInfoDialog({
	open,
	onClose,
	preset,
}: PresetInfoDialogProps) {
	const router = useRouter();
	const dialogRef = useRef<HTMLDialogElement | null>(null);

	const handleOpenInStudio = () => {
		if (preset.id) {
			setLastSelectedPresetKey(preset.id);
		} else if (preset.name) {
			setLastSelectedPresetKey(preset.name);
		}
		onClose();
		router.push("/studio");
	};

	useCloseOnEscape(open, onClose);

	useEffect(() => {
		if (!open) return;
		requestAnimationFrame(() => {
			dialogRef.current
				?.querySelector<HTMLElement>(
					'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
				)
				?.focus();
		});
	}, [open]);

	const handleDialogKeyDown = (e: React.KeyboardEvent<HTMLDialogElement>) => {
		e.stopPropagation();
		if (e.key !== "Tab") return;
		const focusable = Array.from(
			dialogRef.current?.querySelectorAll<HTMLElement>(
				'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
			) ?? [],
		).filter((item) => item.offsetParent !== null);
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (!first || !last) return;
		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	};

	if (!open) return null;

	const options = preset.options || {};

	const groupedOptions: Record<
		string,
		Array<{ key: string; value: unknown }>
	> = {};

	for (const [key, value] of Object.entries(options)) {
		if (value === undefined || value === null || value === "") {
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

	for (const items of Object.values(groupedOptions)) {
		items.sort((a, b) => {
			const order = CATEGORIES.general;
			return order.indexOf(a.key) - order.indexOf(b.key);
		});
	}

	const categoryOrder = ["general", "other"];
	const taskType = preset.taskType || "intent";

	const formatLabel = options.format
		? options.format === "plain"
			? "Plain"
			: "MD"
		: null;
	const metaPills: Array<string> = [];
	if (options.tone) metaPills.push(options.tone);
	if (formatLabel) metaPills.push(formatLabel);
	if (options.detail) metaPills.push(options.detail);

	return (
		<div className="modal-container">
			<button
				type="button"
				className="modal-backdrop-blur"
				aria-label="Close preset details"
				onClick={onClose}
			/>
			<dialog
				ref={dialogRef}
				aria-modal="true"
				aria-labelledby="preset-info-title"
				open
				className="modal-content modal-content--medium"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={handleDialogKeyDown}
			>
				<div className="modal-header">
					<div className="modal-title flex items-center gap-2">
						<Icon name="info" className="text-primary" />
						<span id="preset-info-title">Preset Details</span>
					</div>
					<button
						type="button"
						aria-label="Close"
						className="md-close-btn"
						onClick={onClose}
						title="Close"
					>
						<Icon name="close" className="h-4 w-4" />
					</button>
				</div>

				<div className="modal-body">
					<div className="flex flex-col gap-4">
						<div className="panel">
							<div className="panel__head">
								<span
									className="min-w-0 truncate font-semibold text-sm"
									style={{ color: "var(--color-on-surface)" }}
									title={preset.name}
								>
									{preset.name}
								</span>
								<span className="panel__head-spacer" />
								<button
									type="button"
									className="panel__head-action"
									onClick={handleOpenInStudio}
									title="Open in Preset Studio"
									aria-label="Open in Preset Studio"
								>
									<Icon name="edit" className="h-3.5 w-3.5" />
									Open in Studio
								</button>
							</div>
							<div className="panel__body flex flex-wrap items-center gap-1.5 py-2">
								<span className="workbench-meta-pill workbench-meta-pill--accent inline-flex items-center gap-1">
									<Icon name={getTaskTypeIcon(taskType)} className="h-3 w-3" />
									{taskType}
								</span>
								{metaPills.map((item) => (
									<span key={item} className="workbench-meta-pill" title={item}>
										{item}
									</span>
								))}
							</div>
						</div>

						<div className="flex flex-col gap-5">
							{categoryOrder.map((cat) => {
								const items = groupedOptions[cat];
								if (!items || items.length === 0) return null;

								return (
									<div key={cat} className="flex flex-col gap-3">
										<h3
											className="border-[var(--color-outline)] border-b pb-1.5 font-semibold text-secondary text-xs uppercase"
											style={{ letterSpacing: "var(--label-tracking)" }}
										>
											{CATEGORY_LABELS[cat] || "Other Settings"}
										</h3>

										<div className="data-table">
											<div className="data-table__head-row">
												<span className="data-table__cell data-table__cell--grow">
													Setting
												</span>
												<span className="data-table__cell">Value</span>
											</div>
											{items.map(({ key, value }) => {
												const label = key
													.replace(/([A-Z])/g, " $1")
													.replace(/^./, (str) => str.toUpperCase());

												const displayValue =
													typeof value === "boolean"
														? value
															? "Yes"
															: "No"
														: String(value);
												const isLongText = displayValue.length > 40;

												return (
													<div
														key={key}
														className={`data-table__row ${isLongText ? "data-table__row--top" : ""}`}
													>
														<span className="data-table__cell data-table__cell--grow">
															{label}
														</span>
														<span
															className={`data-table__cell data-table__cell--mono ${isLongText ? "data-table__cell--wrap" : ""}`}
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
								<div className="data-table">
									<div className="data-table__empty">
										No specific options configured for this preset.
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</dialog>
		</div>
	);
}
