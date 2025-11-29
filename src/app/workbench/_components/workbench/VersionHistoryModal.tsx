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
	const [focusedIndex, setFocusedIndex] = useState<number>(0);
	const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
	const modalRef = useRef<HTMLDivElement>(null);

	// Close on Escape and handle keyboard navigation
	useEffect(() => {
		if (!open) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
				return;
			}

			// Arrow key navigation between items
			if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				e.preventDefault();
				const direction = e.key === "ArrowDown" ? 1 : -1;
				const newIndex = Math.max(
					0,
					Math.min(versions.length - 1, focusedIndex + direction),
				);
				setFocusedIndex(newIndex);
				itemRefs.current[newIndex]?.focus();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [open, onClose, focusedIndex, versions.length]);

	if (!open) return null;

	const handleRestore = (versionId: string) => {
		onJumpToVersion(versionId);
		onClose();
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
						<div className="refine-timeline refine-timeline--modal">
							{versions.map((version, index) => {
								const versionNum = index + 1;
								const isCurrentVersion = version.id === activeVersionId;
								const isRefinement = version.metadata?.isRefinement === true;
								const versionInput =
									version.originalInput || version.content || "";
								const copyId = `vh-${version.id}`;

								return (
									<div
										key={version.id}
										ref={(el) => {
											itemRefs.current[index] = el;
										}}
										className={`refine-timeline__item ${isCurrentVersion ? "refine-timeline__item--current" : ""}`}
										onKeyDown={(e) => {
											if (
												(e.key === "Enter" || e.key === " ") &&
												!isCurrentVersion
											) {
												e.preventDefault();
												handleRestore(version.id);
											}
										}}
									>
										<button
											type="button"
											onClick={() =>
												!isCurrentVersion && handleRestore(version.id)
											}
											disabled={isCurrentVersion}
											className="refine-timeline__item-btn"
											title={
												isCurrentVersion
													? "Current version"
													: `Jump to v${versionNum}`
											}
										>
											<div
												className={`refine-timeline__node ${isRefinement ? "refine-timeline__node--refinement" : "refine-timeline__node--base"}`}
											>
												{versionNum}
											</div>
										</button>
										<div className="refine-timeline__content">
											<div className="refine-timeline__header">
												<div className="refine-timeline__title">
													<span
														className={`refine-timeline__type ${isRefinement ? "refine-timeline__type--refinement" : "refine-timeline__type--base"}`}
													>
														{isRefinement ? "Refinement" : "Base"}
													</span>
												</div>
												<div className="refine-timeline__actions">
													{isCurrentVersion && (
														<span className="refine-timeline__current-badge">
															Current
														</span>
													)}
													{onCopy && (
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																if (versionInput) {
																	onCopy(copyId, versionInput);
																}
															}}
															disabled={!versionInput}
															className="refine-timeline__copy-btn"
															title="Copy this input"
															aria-label="Copy input"
														>
															<Icon
																name={
																	copiedMessageId === copyId ? "check" : "copy"
																}
																style={{ width: 10, height: 10 }}
															/>
														</button>
													)}
												</div>
											</div>
											<button
												type="button"
												onClick={() =>
													!isCurrentVersion && handleRestore(version.id)
												}
												disabled={isCurrentVersion}
												className="refine-timeline__body"
												title={
													isCurrentVersion
														? "Current version"
														: `Jump to v${versionNum}`
												}
											>
												{versionInput || (
													<em style={{ opacity: 0.5 }}>Empty</em>
												)}
											</button>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</section>
			</dialog>
		</div>
	);
}
