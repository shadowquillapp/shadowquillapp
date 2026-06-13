import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDialog } from "@/components/DialogProvider";
import { Icon } from "@/components/Icon";
import { getTaskTypeIcon } from "@/lib/task-type-icon";
import type { PromptPresetSummary } from "./types";

const PAGE_SIZE = 10;

function paginate<T>(items: T[], page: number, pageSize: number) {
	const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
	const safePage = Math.min(Math.max(1, page), totalPages);
	const start = (safePage - 1) * pageSize;
	return {
		items: items.slice(start, start + pageSize),
		page: safePage,
		totalPages,
		totalItems: items.length,
		rangeStart: items.length === 0 ? 0 : start + 1,
		rangeEnd: Math.min(start + pageSize, items.length),
	};
}

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
	onSelectProject?: (projectId: string) => void;
	onDeleteProject?: (projectId: string) => Promise<void>;
	presets: PromptPresetSummary[];
	savedProjects?: SavedProject[];
	title?: string;
}

interface SavedProject {
	id: string;
	title: string | null;
	updatedAt: Date | number | string;
	messageCount?: number;
}

interface TablePaginationProps {
	page: number;
	totalPages: number;
	rangeStart: number;
	rangeEnd: number;
	totalItems: number;
	onPageChange: (page: number) => void;
	label: string;
}

function TablePagination({
	page,
	totalPages,
	rangeStart,
	rangeEnd,
	totalItems,
	onPageChange,
	label,
}: TablePaginationProps) {
	if (totalPages <= 1) return null;

	return (
		<nav className="picker-modal__pagination" aria-label={label}>
			<span className="picker-modal__pagination-info">
				{rangeStart}–{rangeEnd} of {totalItems}
			</span>
			<div className="picker-modal__pagination-controls">
				<button
					type="button"
					className="md-icon-btn"
					onClick={() => onPageChange(page - 1)}
					disabled={page <= 1}
					aria-label="Previous page"
					title="Previous page"
				>
					<Icon name="chevron-left" style={{ width: 14, height: 14 }} />
				</button>
				<span className="picker-modal__pagination-page">
					{page} / {totalPages}
				</span>
				<button
					type="button"
					className="md-icon-btn"
					onClick={() => onPageChange(page + 1)}
					disabled={page >= totalPages}
					aria-label="Next page"
					title="Next page"
				>
					<Icon name="chevron-right" style={{ width: 14, height: 14 }} />
				</button>
			</div>
		</nav>
	);
}

export function PresetPickerModal({
	open,
	onClose,
	onSelectPreset,
	onSelectProject,
	onDeleteProject,
	presets,
	savedProjects = [],
	title = "Select a Preset",
}: PresetPickerModalProps) {
	const { confirm } = useDialog();
	const [searchQuery, setSearchQuery] = useState("");
	const [activeSection, setActiveSection] = useState<"presets" | "saved">(
		title === "Open Saved Workbench" ? "saved" : "presets",
	);
	const [deletingProjectId, setDeletingProjectId] = useState<string | null>(
		null,
	);
	const [savedPage, setSavedPage] = useState(1);
	const [presetsPage, setPresetsPage] = useState(1);
	const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
	const searchInputRef = useRef<HTMLInputElement | null>(null);
	const gridRef = useRef<HTMLDivElement | null>(null);
	const modalContentRef = useRef<HTMLDivElement | null>(null);
	const lastActiveEl = useRef<HTMLElement | null>(null);

	const resetPages = () => {
		setSavedPage(1);
		setPresetsPage(1);
	};

	const handleSearchChange = (value: string) => {
		setSearchQuery(value);
		resetPages();
	};

	const handleSectionChange = (section: "presets" | "saved") => {
		setActiveSection(section);
		resetPages();
	};

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

	useEffect(() => {
		if (!open) return;
		const onEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				const active = document.activeElement;
				if (active === searchInputRef.current && searchQuery) {
					e.preventDefault();
					setSearchQuery("");
					setSavedPage(1);
					setPresetsPage(1);
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
			setActiveSection(title === "Open Saved Workbench" ? "saved" : "presets");
			setSavedPage(1);
			setPresetsPage(1);
			try {
				lastActiveEl.current?.focus();
			} catch {}
		}
	}, [open, title]);

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

	const filteredPresets = useMemo(
		() =>
			presets.filter((preset) => {
				if (searchQuery.trim() === "") return true;
				const q = searchQuery.toLowerCase();
				return (
					preset.name.toLowerCase().includes(q) ||
					preset.taskType.toLowerCase().includes(q)
				);
			}),
		[presets, searchQuery],
	);

	const filteredProjects = useMemo(
		() =>
			savedProjects
				.filter((project) => {
					if (searchQuery.trim() === "") return true;
					return (project.title ?? "Untitled")
						.toLowerCase()
						.includes(searchQuery.toLowerCase());
				})
				.sort(
					(a, b) =>
						new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
				),
		[savedProjects, searchQuery],
	);

	const savedPagination = useMemo(
		() => paginate(filteredProjects, savedPage, PAGE_SIZE),
		[filteredProjects, savedPage],
	);
	const presetsPagination = useMemo(
		() => paginate(filteredPresets, presetsPage, PAGE_SIZE),
		[filteredPresets, presetsPage],
	);

	useEffect(() => {
		if (savedPage !== savedPagination.page) {
			setSavedPage(savedPagination.page);
		}
	}, [savedPage, savedPagination.page]);

	useEffect(() => {
		if (presetsPage !== presetsPagination.page) {
			setPresetsPage(presetsPagination.page);
		}
	}, [presetsPage, presetsPagination.page]);

	if (!open) return null;

	const presetKeys = presetsPagination.items.map((p) => p.id ?? p.name);

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

				<div className="modal-body">
					<output aria-live="polite" style={visuallyHidden}>
						{activeSection === "presets"
							? `${filteredPresets.length} presets found${
									presetsPagination.totalPages > 1
										? `, showing ${presetsPagination.rangeStart} to ${presetsPagination.rangeEnd}`
										: ""
								}`
							: `${filteredProjects.length} saved workbenches found${
									savedPagination.totalPages > 1
										? `, showing ${savedPagination.rangeStart} to ${savedPagination.rangeEnd}`
										: ""
								}`}
					</output>

					<div className="picker-modal__toolbar">
						<div
							role="tablist"
							aria-label="Picker sections"
							className="picker-modal__tabs"
						>
							<button
								type="button"
								onClick={() => handleSectionChange("presets")}
								role="tab"
								aria-selected={activeSection === "presets"}
							>
								<Icon name="brush" style={{ width: 14, height: 14 }} />
								Presets
								<span
									className="flex h-5 min-w-[20px] items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-outline)] px-1.5 font-mono text-[length:var(--text-2xs)]"
									style={{
										background: "var(--color-surface)",
										color: "inherit",
										opacity: 0.8,
									}}
								>
									{presets.length}
								</span>
							</button>
							<button
								type="button"
								onClick={() => handleSectionChange("saved")}
								role="tab"
								aria-selected={activeSection === "saved"}
							>
								<Icon name="folder-open" style={{ width: 14, height: 14 }} />
								Saved Workbenches
								<span
									className="flex h-5 min-w-[20px] items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-outline)] px-1.5 font-mono text-[length:var(--text-2xs)]"
									style={{
										background: "var(--color-surface)",
										color: "inherit",
										opacity: 0.8,
									}}
								>
									{savedProjects.length}
								</span>
							</button>
						</div>

						<div className="picker-modal__toolbar-actions">
							<div className="picker-modal__search">
								<input
									ref={searchInputRef}
									className="md-input picker-modal__search-input"
									type="text"
									placeholder={
										activeSection === "presets"
											? "Search presets..."
											: "Search saved workbenches..."
									}
									value={searchQuery}
									onChange={(e) => handleSearchChange(e.target.value)}
									aria-label={
										activeSection === "presets"
											? "Search presets"
											: "Search saved workbenches"
									}
								/>
								<Icon name="search" className="picker-modal__search-icon" />
								{searchQuery && (
									<button
										type="button"
										aria-label="Clear search"
										className="md-icon-btn picker-modal__search-clear"
										onClick={() => handleSearchChange("")}
									>
										<Icon
											name="close"
											style={{ width: 12, height: 12, opacity: 0.55 }}
										/>
									</button>
								)}
							</div>
						</div>
					</div>

					<div className="picker-modal__panel--enter" key={activeSection}>
						{activeSection === "presets" ? (
							filteredPresets.length === 0 ? (
								<div className="empty-state">
									<Icon name="brush" className="empty-state__icon" />
									<p className="empty-state__title">No presets found</p>
									<p className="empty-state__hint">
										Try a different search or reset filters.
									</p>
									{searchQuery && (
										<button
											type="button"
											className="md-btn mt-2"
											onClick={() => {
												handleSearchChange("");
											}}
										>
											Reset
										</button>
									)}
								</div>
							) : (
								<>
									<div ref={gridRef} className="data-table">
										<div className="data-table__head-row">
											<span className="data-table__cell data-table__cell--grow">
												Name
											</span>
											<span className="data-table__cell">Type</span>
										</div>
										{presetsPagination.items.map((preset) => (
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
									<TablePagination
										page={presetsPagination.page}
										totalPages={presetsPagination.totalPages}
										rangeStart={presetsPagination.rangeStart}
										rangeEnd={presetsPagination.rangeEnd}
										totalItems={presetsPagination.totalItems}
										onPageChange={setPresetsPage}
										label="Presets pagination"
									/>
								</>
							)
						) : filteredProjects.length === 0 ? (
							<div className="empty-state">
								<Icon name="folder-open" className="empty-state__icon" />
								{savedProjects.length === 0 ? (
									<>
										<p className="empty-state__title">
											No saved workbenches yet
										</p>
										<p className="empty-state__hint">
											Run a prompt to create your first workbench.
										</p>
									</>
								) : (
									<>
										<p className="empty-state__title">
											No matching workbenches found
										</p>
										<p className="empty-state__hint">
											Try a different search term.
										</p>
										{searchQuery && (
											<button
												type="button"
												className="md-btn mt-2"
												onClick={() => handleSearchChange("")}
											>
												Reset
											</button>
										)}
									</>
								)}
							</div>
						) : (
							<>
								<div className="data-table">
									<div className="data-table__head-row">
										<span className="data-table__cell data-table__cell--grow">
											Name
										</span>
										<span className="data-table__cell">Modified</span>
										{onDeleteProject && (
											<span className="data-table__cell data-table__cell--actions" />
										)}
									</div>
									{savedPagination.items.map((project) => {
										const isDeleting = deletingProjectId === project.id;
										return (
											// biome-ignore lint/a11y/useSemanticElements: nested interactive elements (delete button) are not allowed inside buttons
											<div
												key={project.id}
												className="data-table__row data-table__row--interactive"
												onClick={() => {
													if (isDeleting) return;
													if (onSelectProject) {
														onSelectProject(project.id);
													}
													onClose();
												}}
												role="button"
												tabIndex={0}
												onKeyDown={(e) => {
													if (e.key === "Enter" || e.key === " ") {
														e.preventDefault();
														if (!isDeleting && onSelectProject) {
															onSelectProject(project.id);
														}
														onClose();
													}
												}}
												style={{ opacity: isDeleting ? 0.5 : 1 }}
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
												<span
													className="data-table__cell data-table__cell--grow"
													style={{
														fontWeight: 600,
														color: "var(--color-on-surface)",
													}}
												>
													{project.title ?? "Untitled"}
												</span>
												<span className="data-table__cell data-table__cell--mono">
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
												</span>
												{onDeleteProject && (
													<div className="data-table__cell data-table__cell--actions">
														<button
															type="button"
															onClick={(e) =>
																handleDeleteProject(e, project.id)
															}
															disabled={isDeleting}
															title="Delete workbench"
															aria-label="Delete workbench"
															className="md-icon-btn"
														>
															<Icon
																name="trash"
																className="h-4 w-4"
																style={{
																	color: "var(--color-on-destructive)",
																}}
															/>
														</button>
													</div>
												)}
											</div>
										);
									})}
								</div>
								<TablePagination
									page={savedPagination.page}
									totalPages={savedPagination.totalPages}
									rangeStart={savedPagination.rangeStart}
									rangeEnd={savedPagination.rangeEnd}
									totalItems={savedPagination.totalItems}
									onPageChange={setSavedPage}
									label="Saved workbenches pagination"
								/>
							</>
						)}
					</div>
				</div>
			</div>
		</dialog>
	);
}
