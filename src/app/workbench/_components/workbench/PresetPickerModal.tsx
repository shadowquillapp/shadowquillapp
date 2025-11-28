import { useDialog } from "@/components/DialogProvider";
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
	const [selectedTaskType, setSelectedTaskType] = useState<string | null>(null);
	const [activeSection, setActiveSection] = useState<"presets" | "saved">("presets");
	const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
	const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
	const searchInputRef = useRef<HTMLInputElement | null>(null);
	const gridRef = useRef<HTMLDivElement | null>(null);
	const modalContentRef = useRef<HTMLDivElement | null>(null);
	const lastActiveEl = useRef<HTMLElement | null>(null);

	const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
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

	const doesMatchSearch = (preset: PromptPresetSummary, query: string) => {
		if (query.trim() === "") return true;
		const q = query.toLowerCase();
		return (
			preset.name.toLowerCase().includes(q) ||
			preset.taskType.toLowerCase().includes(q)
		);
	};

	const doesMatchProjectSearch = (project: SavedProject, query: string) => {
		if (query.trim() === "") return true;
		const q = query.toLowerCase();
		return (project.title ?? "Untitled").toLowerCase().includes(q);
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
			setActiveSection("presets");
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

	// Filter saved projects
	const filteredProjects = savedProjects
		.filter((project) => doesMatchProjectSearch(project, searchQuery))
		.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

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
						{activeSection === "presets" 
							? `${filteredPresets.length} presets found`
							: `${filteredProjects.length} saved workbenches found`
						}
					</div>
					{/* Tab Switcher + Search Bar (sticky) */}
					<div
						style={{
							position: "sticky",
							top: 0,
							zIndex: 5,
							display: "flex",
							flexDirection: "column",
							gap: 12,
							marginBottom: 20,
							paddingBottom: 12,
							background: "var(--color-surface-variant)",
							borderBottom: "1px solid var(--color-outline)",
						}}
					>
						{/* Tab Switcher */}
						<div
							style={{
								display: "flex",
								gap: 4,
								padding: 4,
								background: "var(--color-surface)",
								borderRadius: 10,
								border: "1px solid var(--color-outline)",
							}}
						>
							<button
								type="button"
								onClick={() => setActiveSection("presets")}
								style={{
									flex: 1,
									padding: "8px 12px",
									fontSize: 13,
									fontWeight: 600,
									border: "none",
									borderRadius: 8,
									cursor: "pointer",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									gap: 6,
									transition: "all 0.15s",
									background: activeSection === "presets" 
										? "var(--color-primary)" 
										: "transparent",
									color: activeSection === "presets" 
										? "var(--color-on-primary)" 
										: "var(--color-on-surface-variant)",
								}}
							>
								<Icon name="brush" style={{ width: 14, height: 14 }} />
								Presets
							</button>
							<button
								type="button"
								onClick={() => setActiveSection("saved")}
								style={{
									flex: 1,
									padding: "8px 12px",
									fontSize: 13,
									fontWeight: 600,
									border: "none",
									borderRadius: 8,
									cursor: "pointer",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									gap: 6,
									transition: "all 0.15s",
									background: activeSection === "saved" 
										? "var(--color-primary)" 
										: "transparent",
									color: activeSection === "saved" 
										? "var(--color-on-primary)" 
										: "var(--color-on-surface-variant)",
								}}
							>
								<Icon name="folder-open" style={{ width: 14, height: 14 }} />
								Saved Tabs{savedProjects.length > 0 && ` (${savedProjects.length})`}
							</button>
						</div>

						{/* Search Bar */}
						<div style={{ width: "100%", position: "relative" }}>
							<input
								ref={searchInputRef}
								className="md-input"
								type="text"
								placeholder={activeSection === "presets" ? "Search presets..." : "Search saved workbenches..."}
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								aria-label={activeSection === "presets" ? "Search presets" : "Search saved workbenches"}
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
					{/* End Tab Switcher + Search Bar */}

					{/* Content based on active section */}
					{activeSection === "presets" ? (
						/* Preset Grid */
						filteredPresets.length === 0 ? (
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
								gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
								gap: 10,
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
										alignItems: "center",
										gap: 10,
										padding: "10px 12px",
										textAlign: "left",
										height: "auto",
										background: "var(--color-surface-variant)",
										border: "1px solid var(--color-outline)",
										borderRadius: 10,
										transition: "transform 0.15s, box-shadow 0.15s, border-color 0.15s",
										overflow: "hidden",
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.transform = "translateY(-1px)";
										e.currentTarget.style.boxShadow =
											"0 2px 8px rgba(0,0,0,0.1)";
										e.currentTarget.style.borderColor = "var(--color-primary)";
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.transform = "translateY(0)";
										e.currentTarget.style.boxShadow = "none";
										e.currentTarget.style.borderColor = "var(--color-outline)";
									}}
									onFocus={(e) => {
										e.currentTarget.style.boxShadow =
											"0 0 0 2px var(--focus-ring, rgba(99,102,241,0.25))";
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
											justifyContent: "center",
											width: 28,
											height: 28,
											borderRadius: 6,
											background: "color-mix(in oklab, var(--color-primary) 18%, transparent)",
											color: "var(--color-primary)",
											flexShrink: 0,
										}}
									>
										<Icon
											name={getTaskTypeIcon(preset.taskType)}
											style={{ width: 14, height: 14 }}
										/>
									</div>
									<div style={{ flex: 1, minWidth: 0 }}>
										<div
											style={{
												fontSize: 13,
												fontWeight: 600,
												color: "var(--color-on-surface)",
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
											}}
										>
											{preset.name}
										</div>
										<div
											style={{
												fontSize: 10,
												fontWeight: 500,
												color: "var(--color-on-surface-variant)",
												textTransform: "capitalize",
											}}
										>
											{preset.taskType}
										</div>
									</div>
								</button>
							))}
						</div>
						)
					) : (
						/* Saved Projects List */
						<>
							{/* Delete All button when there are projects */}
							{savedProjects.length > 0 && onDeleteAllProjects && (
								<div
									style={{
										display: "flex",
										justifyContent: "flex-end",
										marginBottom: 12,
									}}
								>
									<button
										type="button"
										className="md-btn md-btn--destructive"
										onClick={handleDeleteAllProjects}
										style={{
											padding: "6px 12px",
											fontSize: 11,
											fontWeight: 600,
											borderRadius: 6,
											display: "flex",
											alignItems: "center",
											gap: 6,
											color: "#ef4444",
											border: "1px solid rgba(239, 68, 68, 0.3)",
											background: "rgba(239, 68, 68, 0.08)",
										}}
									>
										<Icon name="trash" style={{ width: 12, height: 12 }} />
										Delete All
									</button>
								</div>
							)}
							
							{filteredProjects.length === 0 ? (
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
								{savedProjects.length === 0 ? (
									<>
										<Icon name="folder-open" style={{ width: 32, height: 32, opacity: 0.4 }} />
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
											transition: "opacity 0.2s",
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
										disabled={isDeleting}
										style={{
											display: "flex",
											alignItems: "center",
											gap: 12,
											padding: "12px 14px",
											textAlign: "left",
											background: "var(--color-surface-variant)",
											border: "1px solid var(--color-outline)",
											borderRadius: 10,
											transition: "transform 0.15s, box-shadow 0.15s, border-color 0.15s",
											flex: 1,
											height: "auto",
											minHeight: 56,
										}}
										onMouseEnter={(e) => {
											if (isDeleting) return;
											e.currentTarget.style.transform = "translateY(-1px)";
											e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
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
												justifyContent: "center",
												width: 36,
												height: 36,
												borderRadius: 8,
												background: "color-mix(in oklab, var(--color-secondary) 15%, transparent)",
												color: "var(--color-secondary)",
												flexShrink: 0,
											}}
										>
											<Icon name="file-text" style={{ width: 18, height: 18 }} />
										</div>
										<div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
											<div
												style={{
													fontSize: 14,
													fontWeight: 600,
													color: "var(--color-on-surface)",
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap",
													maxWidth: "100%",
												}}
											>
												{project.title ?? "Untitled"}
											</div>
											<div
												style={{
													fontSize: 11,
													color: "var(--color-on-surface-variant)",
													opacity: 0.75,
												}}
											>
												{new Date(project.updatedAt).toLocaleDateString(undefined, {
													month: "short",
													day: "numeric",
													year: "numeric",
												})}
												{" · "}
												{new Date(project.updatedAt).toLocaleTimeString(undefined, {
													hour: "2-digit",
													minute: "2-digit",
												})}
											</div>
										</div>
										<Icon
											name="chevron-right"
											style={{
												width: 16,
												height: 16,
												opacity: 0.4,
												flexShrink: 0,
											}}
										/>
									</button>
									
									{/* Delete button */}
									{onDeleteProject && (
										<button
											type="button"
											className="md-btn"
											onClick={(e) => handleDeleteProject(e, project.id)}
											disabled={isDeleting}
											title="Delete workbench"
											aria-label="Delete workbench"
											style={{
												width: 36,
												height: 36,
												padding: 0,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												borderRadius: 8,
												border: "1px solid rgba(239, 68, 68, 0.2)",
												background: "rgba(239, 68, 68, 0.06)",
												color: "#ef4444",
												flexShrink: 0,
												transition: "all 0.15s",
											}}
											onMouseEnter={(e) => {
												if (isDeleting) return;
												e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
												e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.4)";
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.background = "rgba(239, 68, 68, 0.06)";
												e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.2)";
											}}
										>
											<Icon name="trash" style={{ width: 14, height: 14 }} />
										</button>
									)}
									</div>
								);
								})}
							</div>
						)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}

