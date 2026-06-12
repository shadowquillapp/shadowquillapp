import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useDialog } from "@/components/DialogProvider";
import { Icon } from "@/components/Icon";
import { getTaskTypeIcon } from "@/lib/task-type-icon";
import type { PromptPresetSummary } from "./types";

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

const resetButtonStyle: React.CSSProperties = {
	padding: "4px 10px",
	fontSize: "var(--text-sm)",
	borderRadius: "var(--radius-sm)",
	border: "1px solid var(--color-outline)",
	background: "var(--color-surface)",
	color: "var(--color-on-surface)",
};

const sectionTabStyle = (active: boolean): React.CSSProperties => ({
	flex: 1,
	padding: "6px 12px",
	fontSize: "var(--text-sm)",
	fontWeight: 600,
	letterSpacing: "var(--label-tracking)",
	textTransform: "uppercase",
	border: "none",
	borderRadius: "var(--radius-sm)",
	cursor: "pointer",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	gap: 6,
	transition:
		"background-color var(--duration-fast) var(--ease-ios), color var(--duration-fast) var(--ease-ios), box-shadow var(--duration-fast) var(--ease-ios), transform var(--duration-fast) var(--ease-ios-spring)",
	background: active
		? "color-mix(in srgb, var(--color-accent) 16%, transparent)"
		: "transparent",
	boxShadow: active ? "inset 0 0 0 1px var(--color-accent)" : "none",
	color: active ? "var(--color-on-surface)" : "var(--color-on-surface-variant)",
});

const setCardStyle = (
	e: React.SyntheticEvent<HTMLButtonElement>,
	borderColor: string,
) => {
	e.currentTarget.style.borderColor = borderColor;
};

interface SavedProject {
	id: string;
	title: string | null;
	updatedAt: Date | number | string;
	messageCount?: number;
}

interface PresetPickerModalProps {
	open: boolean;
	onClose: () => void;
	onSelectPreset: (preset: PromptPresetSummary) => void;
	onSelectProject?: (projectId: string) => void;
	onDeleteProject?: (projectId: string) => Promise<void>;
	onDeleteAllProjects?: () => Promise<void>;
	presets: PromptPresetSummary[];
	savedProjects?: SavedProject[];
	title?: string;
}

export function PresetPickerModal({
	open,
	onClose,
	onSelectPreset,
	onSelectProject,
	onDeleteProject,
	onDeleteAllProjects,
	presets,
	savedProjects = [],
	title = "Select a Preset",
}: PresetPickerModalProps) {
	const { confirm } = useDialog();
	const [searchQuery, setSearchQuery] = useState("");
	const [activeSection, setActiveSection] = useState<"presets" | "saved">(
		"presets",
	);
	const [isAnimating, setIsAnimating] = useState(false);
	const [slideDirection, setSlideDirection] = useState<"left" | "right">(
		"left",
	);
	const [contentHeight, setContentHeight] = useState<number | "auto">("auto");
	const [deletingProjectId, setDeletingProjectId] = useState<string | null>(
		null,
	);
	const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
	const searchInputRef = useRef<HTMLInputElement | null>(null);
	const gridRef = useRef<HTMLDivElement | null>(null);
	const modalContentRef = useRef<HTMLDivElement | null>(null);
	const lastActiveEl = useRef<HTMLElement | null>(null);
	const contentWrapperRef = useRef<HTMLDivElement | null>(null);

	const handleDeleteProject = async (
		e: React.MouseEvent,
		projectId: string,
	) => {
		e.stopPropagation();
		if (!onDeleteProject) return;

		const ok = await confirm({
			title: "Delete Workbench",
			message: "Delete this workbench? This cannot be undone.",
			confirmText: "Delete",
			cancelText: "Cancel",
			tone: "destructive",
		});
		if (!ok) return;

		setDeletingProjectId(projectId);
		try {
			await onDeleteProject(projectId);
		} finally {
			setDeletingProjectId(null);
		}
	};

	const handleDeleteAllProjects = async () => {
		if (!onDeleteAllProjects) return;

		const ok = await confirm({
			title: "Delete All Workbenches",
			message: `Delete ALL ${savedProjects.length} saved workbenches? This cannot be undone.`,
			confirmText: "Delete All",
			cancelText: "Cancel",
			tone: "destructive",
		});
		if (!ok) return;

		await onDeleteAllProjects();
	};

	useEffect(() => {
		if (!open) return;
		const onEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
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

	useEffect(() => {
		if (!open) {
			setSearchQuery("");
			setActiveSection("presets");
			setIsAnimating(false);
			setContentHeight("auto");
			try {
				lastActiveEl.current?.focus();
			} catch {}
		}
	}, [open]);

	const handleTabSwitch = (newSection: "presets" | "saved") => {
		if (newSection === activeSection || isAnimating) return;

		const currentHeight = contentWrapperRef.current?.offsetHeight;
		if (currentHeight) {
			setContentHeight(currentHeight);
		}

		setSlideDirection(newSection === "saved" ? "left" : "right");
		setIsAnimating(true);

		setTimeout(() => {
			setActiveSection(newSection);
			requestAnimationFrame(() => {
				const newHeight = contentWrapperRef.current?.scrollHeight;
				if (newHeight) {
					setContentHeight(newHeight);
				}
				setTimeout(() => {
					setIsAnimating(false);
					setTimeout(() => {
						setContentHeight("auto");
					}, 200);
				}, 20);
			});
		}, 150);
	};

	useEffect(() => {
		if (!open) return;
		lastActiveEl.current = document.activeElement as HTMLElement | null;
		const id = window.requestAnimationFrame(() => {
			searchInputRef.current?.focus();
		});
		return () => window.cancelAnimationFrame(id);
	}, [open]);

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
			const first = focusables[0];
			const last = focusables[focusables.length - 1];
			if (!first || !last) return;
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

	const filteredPresets = presets.filter((preset) => {
		if (searchQuery.trim() === "") return true;
		const q = searchQuery.toLowerCase();
		return (
			preset.name.toLowerCase().includes(q) ||
			preset.taskType.toLowerCase().includes(q)
		);
	});
	const presetKeys = filteredPresets.map((p) => p.id ?? p.name);

	const filteredProjects = savedProjects
		.filter((project) => {
			if (searchQuery.trim() === "") return true;
			return (project.title ?? "Untitled")
				.toLowerCase()
				.includes(searchQuery.toLowerCase());
		})
		.sort(
			(a, b) =>
				new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
		);

	const moveFocus = (fromIndex: number, delta: number) => {
		const nextIdx = fromIndex + delta;
		if (nextIdx < 0 || nextIdx >= presetKeys.length) return;
		const nextKey = presetKeys[nextIdx];
		if (!nextKey) return;
		itemRefs.current[nextKey]?.focus();
	};

	const onCardKeyDown = (
		key: string,
		e: React.KeyboardEvent<HTMLButtonElement>,
	) => {
		const idx = presetKeys.indexOf(key);
		if (idx === -1) return;
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
			// Rows are a single-column table; move one row at a time.
			const delta = e.key === "ArrowDown" ? 1 : -1;
			e.preventDefault();
			moveFocus(idx, delta);
			return;
		}
	};

	return (
		<dialog
			open
			className="modal-container"
			aria-modal="true"
			aria-labelledby="preset-picker-title"
			onKeyDown={(e) => {
				if (e.key === "/" && e.target instanceof HTMLElement) {
					const tag = (e.target.tagName || "").toLowerCase();
					if (tag !== "input" && tag !== "textarea") {
						e.preventDefault();
						searchInputRef.current?.focus();
					}
				}
			}}
		>
			<button
				type="button"
				className="modal-backdrop-blur"
				aria-label="Close picker"
				onClick={onClose}
			/>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: modal content needs to stop propagation */}
			<div
				className="modal-content"
				ref={modalContentRef}
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
			>
				<div className="modal-header">
					<div
						className="modal-title"
						id="preset-picker-title"
						style={{ fontWeight: 700 }}
					>
						{title}
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

				<div className="modal-body" style={{ padding: 20 }}>
					<output aria-live="polite" style={visuallyHidden}>
						{activeSection === "presets"
							? `${filteredPresets.length} presets found`
							: `${filteredProjects.length} saved workbenches found`}
					</output>
					<div
						style={{
							position: "sticky",
							top: 0,
							zIndex: 5,
							display: "flex",
							flexDirection: "column",
							gap: 12,
							marginBottom: 16,
							paddingBottom: 12,
							background: "var(--color-surface)",
							borderBottom: "1px solid var(--color-outline)",
						}}
					>
						<div
							role="tablist"
							aria-label="Picker sections"
							style={{
								display: "flex",
								gap: 4,
								padding: 4,
								background: "var(--color-surface)",
								borderRadius: "var(--radius-sm)",
								border: "1px solid var(--color-outline)",
							}}
						>
							<button
								type="button"
								onClick={() => handleTabSwitch("presets")}
								role="tab"
								aria-selected={activeSection === "presets"}
								style={sectionTabStyle(activeSection === "presets")}
							>
								<Icon name="brush" style={{ width: 14, height: 14 }} />
								Presets
							</button>
							<button
								type="button"
								onClick={() => handleTabSwitch("saved")}
								role="tab"
								aria-selected={activeSection === "saved"}
								style={sectionTabStyle(activeSection === "saved")}
							>
								<Icon name="folder-open" style={{ width: 14, height: 14 }} />
								Saved Workbenches
								{savedProjects.length > 0 && ` (${savedProjects.length})`}
							</button>
						</div>

						<div
							style={{
								width: "100%",
								display: "flex",
								alignItems: "center",
								gap: 16,
							}}
						>
							<div style={{ flex: 1, position: "relative" }}>
								<input
									ref={searchInputRef}
									className="md-input"
									type="text"
									placeholder={
										activeSection === "presets"
											? "Search presets..."
											: "Search saved workbenches..."
									}
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									aria-label={
										activeSection === "presets"
											? "Search presets"
											: "Search saved workbenches"
									}
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
										className="md-icon-btn"
										onClick={() => setSearchQuery("")}
										style={{
											position: "absolute",
											right: 6,
											top: "50%",
											transform: "translateY(-50%)",
										}}
									>
										<Icon
											name="close"
											style={{ width: 12, height: 12, opacity: 0.55 }}
										/>
									</button>
								)}
							</div>

							{activeSection === "saved" &&
								savedProjects.length > 0 &&
								onDeleteAllProjects && (
									<button
										type="button"
										className="md-btn md-btn--destructive"
										onClick={handleDeleteAllProjects}
										style={{
											padding: "4px 12px",
											fontSize: "var(--text-xs)",
											fontWeight: 600,
											borderRadius: "var(--radius-sm)",
											display: "flex",
											alignItems: "center",
											gap: 6,
											color: "var(--color-on-destructive)",
											border: "1px solid var(--color-destructive)",
											background:
												"color-mix(in srgb, var(--color-destructive) 25%, transparent)",
											flexShrink: 0,
										}}
									>
										<Icon name="trash" style={{ width: 12, height: 12 }} />
										Delete All
									</button>
								)}
						</div>
					</div>
					<div
						style={{
							overflow: "hidden",
							position: "relative",
							height: contentHeight === "auto" ? "auto" : contentHeight,
							transition:
								"height var(--duration-normal) var(--ease-ios-out)",
						}}
					>
						<div
							ref={contentWrapperRef}
							style={{
								transform: isAnimating
									? slideDirection === "left"
										? "translateX(-20px)"
										: "translateX(20px)"
									: "translateX(0)",
								opacity: isAnimating ? 0 : 1,
								transition:
									"transform var(--duration-fast) var(--ease-ios-out), opacity var(--duration-fast) var(--ease-ios-out)",
							}}
						>
							{activeSection === "presets" ? (
								filteredPresets.length === 0 ? (
									<div
										className="text-secondary"
										style={{
											display: "flex",
											flexDirection: "column",
											alignItems: "center",
											gap: 10,
											fontSize: "var(--text-md)",
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
													style={resetButtonStyle}
												>
													Reset
												</button>
											)}
										</div>
									</div>
								) : (
									<div ref={gridRef} className="data-table">
										<div className="data-table__head-row">
											<span className="data-table__cell data-table__cell--grow">
												Name
											</span>
											<span className="data-table__cell">Type</span>
										</div>
										{filteredPresets.map((preset) => (
											<button
												key={preset.id ?? preset.name}
												type="button"
												className="data-table__row"
												onClick={() => {
													onSelectPreset(preset);
													onClose();
												}}
												title={preset.name}
												aria-label={`${preset.name} preset (${preset.taskType})`}
												ref={(el) => {
													itemRefs.current[preset.id ?? preset.name] = el;
												}}
												onKeyDown={(e) =>
													onCardKeyDown(preset.id ?? preset.name, e)
												}
											>
												<Icon
													name={getTaskTypeIcon(preset.taskType)}
													style={{
														width: 14,
														height: 14,
														flexShrink: 0,
														color: "var(--color-on-surface-variant)",
													}}
												/>
												<span
													className="data-table__cell data-table__cell--grow"
													style={{
														fontWeight: 600,
														color: "var(--color-on-surface)",
													}}
												>
													{preset.name}
												</span>
												<span className="data-table__cell data-table__cell--mono uppercase">
													{preset.taskType}
												</span>
											</button>
										))}
									</div>
								)
							) : filteredProjects.length === 0 ? (
								<div
									className="text-secondary"
									style={{
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										gap: 10,
										fontSize: "var(--text-md)",
										padding: 24,
										textAlign: "center",
									}}
								>
									{savedProjects.length === 0 ? (
										<>
											<Icon
												name="folder-open"
												style={{ width: 32, height: 32, opacity: 0.4 }}
											/>
											No saved workbenches yet.
											<div style={{ opacity: 0.8 }}>
												Run a prompt to create your first workbench.
											</div>
										</>
									) : (
										<>
											No matching workbenches found.
											<div style={{ opacity: 0.8 }}>
												Try a different search term.
											</div>
											{searchQuery && (
												<button
													type="button"
													className="md-btn"
													onClick={() => setSearchQuery("")}
													style={resetButtonStyle}
												>
													Reset
												</button>
											)}
										</>
									)}
								</div>
							) : (
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: 8,
									}}
								>
									{filteredProjects.map((project) => {
										const isDeleting = deletingProjectId === project.id;
										return (
											<div
												key={project.id}
												style={{
													display: "flex",
													alignItems: "center",
													gap: 8,
													opacity: isDeleting ? 0.5 : 1,
													transition:
														"opacity var(--duration-fast) var(--ease-ios)",
												}}
											>
												<button
													type="button"
													className="md-btn"
													onClick={() => {
														if (onSelectProject) {
															onSelectProject(project.id);
														}
														onClose();
													}}
													aria-label={`Open saved workbench ${project.title}`}
													disabled={isDeleting}
													style={{
														display: "flex",
														alignItems: "center",
														gap: 8,
														padding: "6px 10px",
														textAlign: "left",
														background: "var(--color-surface-variant)",
														border: "1px solid var(--color-outline)",
														borderRadius: "var(--radius-sm)",
														flex: 1,
														height: 36,
													}}
													onMouseEnter={(e) => {
														if (isDeleting) return;
														setCardStyle(e, "var(--color-outline-variant)");
													}}
													onMouseLeave={(e) =>
														setCardStyle(e, "var(--color-outline)")
													}
													onFocus={(e) =>
														setCardStyle(e, "var(--color-primary)")
													}
													onBlur={(e) =>
														setCardStyle(e, "var(--color-outline)")
													}
												>
													<Icon
														name="file-text"
														style={{
															width: 14,
															height: 14,
															flexShrink: 0,
															color: "var(--color-on-surface-variant)",
														}}
													/>
													<div
														style={{
															flex: 1,
															minWidth: 0,
															overflow: "hidden",
															paddingRight: 8,
														}}
													>
														<div
															style={{
																fontSize: "var(--text-sm)",
																fontWeight: 600,
																color: "var(--color-on-surface)",
																overflow: "hidden",
																textOverflow: "ellipsis",
																whiteSpace: "nowrap",
																maxWidth: "200px",
																paddingTop: 2,
															}}
														>
															{project.title ?? "Untitled"}
														</div>
														<div
															style={{
																fontSize: "var(--text-2xs)",
																color: "var(--color-on-surface-variant)",
																opacity: 0.75,
																paddingBottom: 2,
																marginTop: -2,
															}}
														>
															{new Date(project.updatedAt).toLocaleDateString(
																undefined,
																{
																	month: "short",
																	day: "numeric",
																	year: "numeric",
																},
															)}
															{" · "}
															{new Date(project.updatedAt).toLocaleTimeString(
																undefined,
																{
																	hour: "2-digit",
																	minute: "2-digit",
																},
															)}
														</div>
													</div>
													<Icon
														name="chevron-right"
														style={{
															width: 14,
															height: 14,
															opacity: 0.4,
															flexShrink: 0,
														}}
													/>
												</button>

												{onDeleteProject && (
													<button
														type="button"
														onClick={(e) => handleDeleteProject(e, project.id)}
														disabled={isDeleting}
														title="Delete workbench"
														aria-label="Delete workbench"
														className="flex items-center justify-center"
													>
														<Icon
															name="trash"
															className="h-4 w-4"
															style={{ color: "var(--color-on-destructive)" }}
														/>
													</button>
												)}
											</div>
										);
									})}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</dialog>
	);
}
