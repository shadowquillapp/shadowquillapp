import { Icon } from "@/components/Icon";
import { useEffect, useRef, useState } from "react";
import type { MessageItem, VersionNodeMetadata } from "./types";

interface Version {
	id: string;
	label: string;
	content: string;
	originalInput?: string;
	outputMessageId?: string | null;
	createdAt: number;
	metadata?: VersionNodeMetadata;
}

interface VersionHistoryModalProps {
	open: boolean;
	onClose: () => void;
	versions: Version[];
	activeVersionId: string;
	onJumpToVersion: (id: string) => void;
	messages?: MessageItem[];
	onCopy?: (id: string, content: string) => Promise<void>;
	copiedMessageId?: string | null;
}

export function VersionHistoryModal({
	open,
	onClose,
	versions,
	activeVersionId,
	onJumpToVersion,
	messages = [],
	onCopy,
	copiedMessageId = null,
}: VersionHistoryModalProps) {
	const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
	const [focusedIndex, setFocusedIndex] = useState<number>(0);
	const cardRefs = useRef<(HTMLElement | null)[]>([]);
	const modalRef = useRef<HTMLDivElement>(null);

	// Reverse versions so newest is at top
	const sortedVersions = [...versions].reverse();

	// Close on Escape and handle keyboard navigation
	useEffect(() => {
		if (!open) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
				return;
			}

			// Arrow key navigation between cards
			if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				e.preventDefault();
				const direction = e.key === "ArrowDown" ? 1 : -1;
				const newIndex = Math.max(
					0,
					Math.min(sortedVersions.length - 1, focusedIndex + direction),
				);
				setFocusedIndex(newIndex);
				cardRefs.current[newIndex]?.focus();
			}

			// Enter or Space to expand/collapse
			if (e.key === "Enter" || e.key === " ") {
				if (document.activeElement === cardRefs.current[focusedIndex]) {
					e.preventDefault();
					const version = sortedVersions[focusedIndex];
					if (version) {
						setExpandedVersion(
							expandedVersion === version.id ? null : version.id,
						);
					}
				}
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [open, onClose, focusedIndex, expandedVersion, sortedVersions]);

	if (!open) return null;

	// Helper to find output content by message ID
	const getOutputContent = (
		outputMessageId: string | null | undefined,
	): string | null => {
		if (!outputMessageId) return null;
		const message = messages.find(
			(m) => m.id === outputMessageId && m.role === "assistant",
		);
		return message?.content ?? null;
	};

	// Get relative time for recent versions
	const getRelativeTime = (timestamp: number) => {
		const now = Date.now();
		const diff = now - timestamp;
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return "now";
		if (minutes < 60) return `${minutes}m`;
		if (hours < 24) return `${hours}h`;
		if (days < 7) return `${days}d`;
		return new Date(timestamp).toLocaleDateString([], {
			month: "short",
			day: "numeric",
		});
	};

	const handleRestore = (versionId: string) => {
		onJumpToVersion(versionId);
		onClose();
	};

	const toggleExpand = (versionId: string) => {
		setExpandedVersion(expandedVersion === versionId ? null : versionId);
	};

	return (
		<div
			className="modal-container"
			aria-modal="true"
			aria-labelledby="version-history-title"
			ref={modalRef}
		>
			<div
				className="modal-backdrop-blur"
				onClick={onClose}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") onClose();
				}}
				role="button"
				tabIndex={0}
				aria-label="Close modal"
			/>
			<dialog
				open
				className="modal-content modal-content--version-history"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<header className="vh-modal-header">
					<h2 id="version-history-title" className="vh-modal-title">
						<Icon name="git-compare" aria-hidden="true" />
						<span>Version History</span>
					</h2>
					<button
						type="button"
						aria-label="Close version history"
						className="vh-close-btn"
						onClick={onClose}
					>
						<Icon name="close" aria-hidden="true" />
					</button>
				</header>

				{/* Body */}
				<section
					className="modal-body vh-modal-body"
					aria-label={`${versions.length} version${versions.length !== 1 ? "s" : ""} available`}
				>
					{versions.length === 0 ? (
						<output className="vh-empty">
							<Icon
								name="folder-open"
								className="vh-empty-icon"
								aria-hidden="true"
							/>
							<div className="vh-empty-title">No versions yet</div>
							<div className="vh-empty-desc">
								Run a prompt to create your first version
							</div>
						</output>
					) : (
						<div className="vh-cards-container">
							{sortedVersions.map((version, index) => {
								const isActive = version.id === activeVersionId;
								const outputContent = getOutputContent(version.outputMessageId);
								const hasOutput = outputContent !== null;
								const inputPreview = (
									version.originalInput ||
									version.content ||
									""
								).trim();
								const isExpanded = expandedVersion === version.id;
								const runNumber = versions.length - index;
								const isRefinement = version.metadata?.isRefinement === true;

								// Determine badge text and type
								let versionType = "";
								if (hasOutput) {
									versionType = isRefinement ? "Refinement" : "Base";
								} else {
									versionType = "Draft";
								}

								const isBase = hasOutput && !isRefinement;

								return (
									<article
										key={version.id}
										ref={(el) => {
											cardRefs.current[index] = el;
										}}
										className={`vh-card${isActive ? " vh-card--active" : ""}${isExpanded ? " vh-card--expanded" : ""}`}
										aria-expanded={isExpanded}
										aria-label={`Version ${runNumber}, ${versionType}${isActive ? ", current version" : ""}, created ${getRelativeTime(version.createdAt)}`}
										onClick={() => toggleExpand(version.id)}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												toggleExpand(version.id);
											}
										}}
									>
										{/* Card Header - Collapsed View */}
										<div className="vh-card-header">
											<div className="vh-card-main">
												{/* Base Icon (left of version number) */}
												{isBase && (
													<Icon
														name="file-text"
														className="vh-base-icon"
														aria-label="Base version"
													/>
												)}

												{/* Version Number */}
												<span
													className="vh-version-number"
													aria-label={`Version ${runNumber}`}
												>
													v{runNumber}
												</span>

												{/* Preview Text */}
												<span className="vh-preview-text">
													{inputPreview.slice(0, 60) || "Empty"}
													{inputPreview.length > 60 ? "…" : ""}
												</span>
											</div>

											{/* Time and Icons */}
											<div className="vh-card-meta">
												{/* Current/Selected Icon */}
												{isActive && (
													<Icon
														name="check"
														className="vh-current-icon"
														aria-label="Current version"
													/>
												)}

												<span
													className="vh-timestamp"
													aria-label={`Created ${getRelativeTime(version.createdAt)}`}
												>
													{getRelativeTime(version.createdAt)}
												</span>
												<Icon
													name={isExpanded ? "chevron-up" : "chevron-down"}
													className="vh-expand-icon"
													aria-hidden="true"
												/>
											</div>
										</div>

										{/* Card Body - Expanded View */}
										<div
											className="vh-card-body-wrapper"
											data-expanded={isExpanded}
										>
											<div
												className="vh-card-body"
												onClick={(e) => e.stopPropagation()}
												onKeyDown={(e) => e.stopPropagation()}
											>
												{/* Input Section */}
												<section className="vh-content-section">
													<div className="vh-section-header">
														<h3 className="vh-section-title">
															<Icon
																name={isRefinement ? "refresh" : "edit"}
																aria-hidden="true"
															/>
															{isRefinement
																? "REFINEMENT REQUEST"
																: "INITIAL INPUT"}
														</h3>
														{onCopy && inputPreview && (
															<button
																type="button"
																onClick={(e) => {
																	e.stopPropagation();
																	onCopy(`${version.id}-input`, inputPreview);
																}}
																className="vh-copy-btn"
																title="Copy input"
																aria-label="Copy input"
															>
																<Icon
																	name={
																		copiedMessageId === `${version.id}-input`
																			? "check"
																			: "copy"
																	}
																	style={{ width: 12, height: 12 }}
																/>
															</button>
														)}
													</div>
													<div className="vh-section-text">
														{inputPreview || (
															<em className="vh-empty-text">Empty prompt</em>
														)}
													</div>
												</section>

												{/* Output Section */}
												{hasOutput && (
													<section className="vh-content-section vh-content-section--output">
														<div className="vh-section-header">
															<h3 className="vh-section-title">
																<Icon name="comments" aria-hidden="true" />
																{isRefinement
																	? "REFINED OUTPUT"
																	: "GENERATED OUTPUT"}
															</h3>
															{onCopy && outputContent && (
																<button
																	type="button"
																	onClick={(e) => {
																		e.stopPropagation();
																		onCopy(
																			`${version.id}-output`,
																			outputContent,
																		);
																	}}
																	className="vh-copy-btn"
																	title="Copy output"
																	aria-label="Copy output"
																>
																	<Icon
																		name={
																			copiedMessageId === `${version.id}-output`
																				? "check"
																				: "copy"
																		}
																		style={{ width: 12, height: 12 }}
																	/>
																</button>
															)}
														</div>
														<div className="vh-section-text">
															{outputContent}
														</div>
													</section>
												)}

												{/* Restore Button */}
												{!isActive && (
													<div className="vh-card-actions">
														<button
															type="button"
															className="vh-restore-btn"
															onClick={(e) => {
																e.stopPropagation();
																handleRestore(version.id);
															}}
															aria-label={`Restore version ${runNumber}`}
														>
															<Icon name="refresh" aria-hidden="true" />
															Restore this version
														</button>
													</div>
												)}
											</div>
										</div>
									</article>
								);
							})}
						</div>
					)}
				</section>
			</dialog>
		</div>
	);
}
