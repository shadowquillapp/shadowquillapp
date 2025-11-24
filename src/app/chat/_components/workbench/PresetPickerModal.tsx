import { Icon } from "@/components/Icon";
import { useEffect, useRef, useState } from "react";
import type React from "react";
import type { PromptPresetSummary } from "./types";

// Minimal visually hidden style for a11y announcements
const visuallyHidden: React.CSSProperties = {
	position: "absolute",
	width: 1,
	height: 1,
	padding: 0,
	margin: -1,
	overflow: "hidden",
	clip: "rect(0, 0, 0, 0)",
	whiteSpace: "nowrap",
	border: 0,
};

interface PresetPickerModalProps {
	open: boolean;
	onClose: () => void;
	onSelectPreset: (preset: PromptPresetSummary) => void;
	presets: PromptPresetSummary[];
	title?: string;
}

export function PresetPickerModal({
	open,
	onClose,
	onSelectPreset,
	presets,
	title = "Select a Preset",
}: PresetPickerModalProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedTaskType, setSelectedTaskType] = useState<string | null>(null);
		const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
		const searchInputRef = useRef<HTMLInputElement | null>(null);
		const gridRef = useRef<HTMLDivElement | null>(null);
		const modalContentRef = useRef<HTMLDivElement | null>(null);
		const lastActiveEl = useRef<HTMLElement | null>(null);

		const doesMatchSearch = (preset: PromptPresetSummary, query: string) => {
			if (query.trim() === "") return true;
			const q = query.toLowerCase();
			return (
				preset.name.toLowerCase().includes(q) ||
				preset.taskType.toLowerCase().includes(q)
			);
		};

	// Close on Escape
	useEffect(() => {
		if (!open) return;
		const onEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				// If the search is focused and has a value, clear instead of close
				const active = document.activeElement;
				if (active === searchInputRef.current && searchQuery) {
					e.preventDefault();
					setSearchQuery("");
					return;
				}
				onClose();
			}
		};
		document.addEventListener("keydown", onEsc);
		return () => document.removeEventListener("keydown", onEsc);
	}, [open, onClose, searchQuery]);

	// Reset search when modal opens/closes
	useEffect(() => {
		if (!open) {
			setSearchQuery("");
			setSelectedTaskType(null);
			// Restore focus back to opener
			try {
				lastActiveEl.current?.focus();
			} catch {}
		}
	}, [open]);

	// Autofocus the search input when the modal opens
	useEffect(() => {
		if (!open) return;
		// Save the element that was focused before opening
		lastActiveEl.current = document.activeElement as HTMLElement | null;
		// Defer focus to after render
		const id = window.requestAnimationFrame(() => {
			searchInputRef.current?.focus();
		});
		return () => window.cancelAnimationFrame(id);
	}, [open]);

	// Focus trap within the modal
	useEffect(() => {
		if (!open) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key !== "Tab") return;
			const root = modalContentRef.current;
			if (!root) return;
			const focusables = Array.from(
				root.querySelectorAll<HTMLElement>(
					'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
				),
			).filter((el) => !el.hasAttribute("disabled"));
			if (focusables.length === 0) return;
			const first = focusables[0]!;
			const last = focusables[focusables.length - 1]!;
			const active = document.activeElement as HTMLElement | null;
			if (e.shiftKey) {
				if (active === first || !root.contains(active)) {
					e.preventDefault();
					last.focus();
				}
			} else {
				if (active === last || !root.contains(active)) {
					e.preventDefault();
					first.focus();
				}
			}
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [open]);

	if (!open) return null;

	// Filter presets
	const filteredPresets = presets.filter((preset) => {
			return doesMatchSearch(preset, searchQuery);
	});
		const presetKeys = filteredPresets.map((p) => p.id ?? p.name);

		const moveFocus = (fromIndex: number, delta: number) => {
			const nextIdx = fromIndex + delta;
			if (nextIdx < 0 || nextIdx >= presetKeys.length) return;
			const nextKey = presetKeys[nextIdx];
			if (!nextKey) return;
			itemRefs.current[nextKey]?.focus();
		};

		const onCardKeyDown = (key: string, e: React.KeyboardEvent<HTMLButtonElement>) => {
			const idx = presetKeys.indexOf(key);
			if (idx === -1) return;
			// Global shortcuts: Home/End jump
			if (e.key === "Home") {
				e.preventDefault();
				const firstKey = presetKeys[0];
				if (firstKey) itemRefs.current[firstKey]?.focus();
				return;
			}
			if (e.key === "End") {
				e.preventDefault();
				const lastKey = presetKeys[presetKeys.length - 1];
				if (lastKey) itemRefs.current[lastKey]?.focus();
				return;
			}
			if (e.key === "ArrowLeft") {
				e.preventDefault();
				moveFocus(idx, -1);
				return;
			}
			if (e.key === "ArrowRight") {
				e.preventDefault();
				moveFocus(idx, +1);
				return;
			}
			if (e.key === "ArrowUp" || e.key === "ArrowDown") {
				// Compute columns from container width and minimum card width
				const container = gridRef.current;
				const minCardWidth = 190;
				const columns =
					container && container.clientWidth
						? Math.max(1, Math.floor(container.clientWidth / minCardWidth))
						: 3;
				const delta = e.key === "ArrowDown" ? columns : -columns;
				e.preventDefault();
				moveFocus(idx, delta);
				return;
			}
		};

	const getTaskTypeIcon = (taskType: string) => {
		switch (taskType) {
			case "coding":
				return "git-compare";
			case "image":
				return "palette";
			case "video":
				return "eye";
			case "research":
				return "search";
			case "writing":
				return "edit";
			case "marketing":
				return "thumbsUp";
			default:
				return "folder-open";
		}
	};

	return (
		<div
			className="modal-container"
			aria-modal="true"
			role="dialog"
			aria-labelledby="preset-picker-title"
			onClick={onClose}
			onKeyDown={(e) => {
				// "/" to focus search unless typing in an input/textarea
				if (e.key === "/" && e.target instanceof HTMLElement) {
					const tag = (e.target.tagName || "").toLowerCase();
					if (tag !== "input" && tag !== "textarea") {
						e.preventDefault();
						searchInputRef.current?.focus();
					}
				}
			}}
		>
			<div className="modal-backdrop-blur" />
			<div
				className="modal-content"
				ref={modalContentRef}
				onClick={(e) => e.stopPropagation()}
			>
					<div className="modal-header">
						<div className="modal-title" id="preset-picker-title" style={{ fontWeight: 700 }}>{title}</div>
					<button
						aria-label="Close"
						className="md-btn"
						onClick={onClose}
						style={{ width: 32, height: 32, padding: 0 }}
					>
						<Icon name="close" />
					</button>
				</div>

					<div className="modal-body" style={{ padding: 20 }}>
					{/* A11y live region for results count */}
					<div role="status" aria-live="polite" style={visuallyHidden}>
						{filteredPresets.length} presets found
					</div>
					{/* Search Bar (sticky) */}
					<div
						style={{
							position: "sticky",
							top: 0,
							zIndex: 5,
							display: "flex",
							flexDirection: "column",
							gap: 8,
							marginBottom: 20,
							paddingBottom: 12,
							background: "var(--color-surface-variant)",
							borderBottom: "1px solid var(--color-outline)",
						}}
					>
							<div style={{ width: "100%", position: "relative" }}>
							<input
								ref={searchInputRef}
								className="md-input"
								type="text"
								placeholder="Search presets..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
									aria-label="Search presets"
								style={{
									width: "100%",
										paddingLeft: 36,
										paddingRight: 36,
										height: 36,
								}}
							/>
							<Icon
								name="search"
								style={{
									position: "absolute",
										left: 10,
									top: "50%",
									transform: "translateY(-50%)",
									opacity: 0.5,
									width: 16,
									height: 16,
								}}
							/>
								{searchQuery && (
									<button
										type="button"
										aria-label="Clear search"
										className="md-btn"
										onClick={() => setSearchQuery("")}
										style={{
											position: "absolute",
											right: 6,
											top: "50%",
											transform: "translateY(-50%)",
											width: 24,
											height: 24,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											borderRadius: 6,
											background: "transparent",
										}}
									>
										<Icon name="close" style={{ width: 12, height: 12, opacity: 0.55 }} />
									</button>
								)}
						</div>
					</div>
					{/* End Search Bar */}

					{/* Preset Grid */}
					{filteredPresets.length === 0 ? (
						<div
							className="text-secondary"
							style={{
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									gap: 10,
									fontSize: 13,
									padding: 24,
									textAlign: "center",
							}}
						>
								No presets found.
								<div style={{ opacity: 0.8 }}>
									Try a different search or reset filters.
								</div>
								<div style={{ display: "flex", gap: 8 }}>
									{searchQuery && (
										<button
											type="button"
											className="md-btn"
											onClick={() => {
												setSearchQuery("");
											}}
											style={{
												padding: "6px 10px",
												fontSize: 12,
												borderRadius: 8,
												border: "1px solid var(--color-outline-variant)",
												background: "var(--color-surface)",
												color: "var(--color-on-surface)",
											}}
										>
											Reset
										</button>
									)}
								</div>
						</div>
					) : (
						<div
							ref={gridRef}
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
									gap: 18,
							}}
						>
							{filteredPresets.map((preset) => (
								<button
									key={preset.id ?? preset.name}
									type="button"
									className="md-btn"
									onClick={() => {
										onSelectPreset(preset);
										onClose();
									}}
										title={preset.name}
										aria-label={`${preset.name} preset (${preset.taskType})`}
										ref={(el) => {
											itemRefs.current[preset.id ?? preset.name] = el;
										}}
										onKeyDown={(e) => onCardKeyDown(preset.id ?? preset.name, e)}
									style={{
										display: "flex",
										flexDirection: "column",
										justifyContent: "space-between",
										alignItems: "flex-start",
										gap: 8,
										padding: 14,
										textAlign: "left",
										minHeight: 120,
										height: "auto",
											background: "var(--color-surface-variant)",
											border: "1px solid var(--color-outline)",
											borderRadius: 12,
											transition: "transform 0.15s, box-shadow 0.15s, border-color 0.15s",
											overflow: "hidden",
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.transform = "translateY(-2px)";
										e.currentTarget.style.boxShadow =
											"0 4px 12px rgba(0,0,0,0.1)";
											e.currentTarget.style.borderColor = "var(--color-outline-variant)";
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.transform = "translateY(0)";
										e.currentTarget.style.boxShadow = "none";
											e.currentTarget.style.borderColor = "var(--color-outline)";
										}}
										onFocus={(e) => {
											e.currentTarget.style.boxShadow =
												"0 0 0 3px var(--focus-ring, rgba(99,102,241,0.25))";
											e.currentTarget.style.borderColor = "var(--color-primary)";
										}}
										onBlur={(e) => {
											e.currentTarget.style.boxShadow = "none";
											e.currentTarget.style.borderColor = "var(--color-outline)";
									}}
								>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: 12,
											width: "100%",
										}}
									>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												width: 32,
												height: 32,
													borderRadius: 8,
													background: "color-mix(in oklab, var(--color-primary) 18%, transparent)",
													color: "var(--color-primary)",
												flexShrink: 0,
											}}
										>
											<Icon
												name={getTaskTypeIcon(preset.taskType)}
												style={{ width: 16, height: 16 }}
											/>
										</div>
										<div style={{ flex: 1, minWidth: 0 }}>
											<div
												style={{
														fontSize: 14,
														fontWeight: 600,
													color: "var(--color-on-surface)",
													overflow: "hidden",
													textOverflow: "ellipsis",
													display: "-webkit-box",
													WebkitLineClamp: 2,
													WebkitBoxOrient: "vertical" as any,
												}}
											>
												{preset.name}
											</div>
											<div
												style={{
														fontSize: 11,
														fontWeight: 600,
														color: "var(--color-primary)",
													textTransform: "uppercase",
													letterSpacing: "0.5px",
												}}
											>
												{preset.taskType}
											</div>
										</div>
									</div>

									{/* Compact options display */}
									{(preset.options?.tone || preset.options?.format || typeof preset.options?.temperature === "number") && (
										<div
											style={{
												fontSize: 10,
												color: "var(--color-on-surface-variant)",
												opacity: 0.75,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
												width: "100%",
											}}
										>
											{[
												preset.options?.tone && (preset.options.tone.charAt(0).toUpperCase() + preset.options.tone.slice(1)),
												preset.options?.format &&
													(preset.options.format === "plain"
														? "Plain"
														: preset.options.format === "markdown"
															? "Markdown"
															: preset.options.format.toUpperCase()),
												typeof preset.options?.temperature === "number" && `${preset.options.temperature.toFixed(1)}`,
											]
												.filter(Boolean)
												.join(" • ")}
										</div>
									)}
								</button>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

