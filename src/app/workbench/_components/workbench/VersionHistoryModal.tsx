import { Icon } from "@/components/Icon";
import { useEffect, useState } from "react";
import type { MessageItem } from "./types";

interface Version {
	id: string;
	label: string;
	content: string;
	originalInput?: string;
	outputMessageId?: string | null;
	createdAt: number;
}

interface VersionHistoryModalProps {
	open: boolean;
	onClose: () => void;
	versions: Version[];
	activeVersionId: string;
	onJumpToVersion: (id: string) => void;
	messages?: MessageItem[];
}

export function VersionHistoryModal({
	open,
	onClose,
	versions,
	activeVersionId,
	onJumpToVersion,
	messages = [],
}: VersionHistoryModalProps) {
	const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

	// Close on Escape
	useEffect(() => {
		if (!open) return;
		const onEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onEsc);
		return () => document.removeEventListener("keydown", onEsc);
	}, [open, onClose]);

	if (!open) return null;

	// Helper to find output content by message ID
	const getOutputContent = (outputMessageId: string | null | undefined): string | null => {
		if (!outputMessageId) return null;
		const message = messages.find(m => m.id === outputMessageId && m.role === "assistant");
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
		return new Date(timestamp).toLocaleDateString([], { month: "short", day: "numeric" });
	};

	const handleRestore = (versionId: string) => {
		onJumpToVersion(versionId);
		onClose();
	};

	// Reverse versions so newest is at top
	const sortedVersions = [...versions].reverse();

	return (
		<div
			className="modal-container"
			aria-modal="true"
			role="dialog"
		>
			<div className="modal-backdrop-blur" />
			<div className="modal-content modal-content--medium" onClick={(e) => e.stopPropagation()}>
				<div className="modal-header" style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-outline)" }}>
					<div className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
						<Icon name="git-compare" style={{ width: 14, height: 14 }} />
						<span>Version History</span>
					</div>
					<button
						aria-label="Close"
						className="md-btn"
						onClick={onClose}
						style={{ width: 28, height: 28, padding: 0 }}
					>
						<Icon name="close" style={{ width: 14, height: 14 }} />
					</button>
				</div>
				<div className="modal-body" style={{ padding: 0, maxHeight: "60vh", overflowY: "auto" }}>
					{versions.length === 0 ? (
						<div style={{ padding: 32, textAlign: "center", color: "var(--color-on-surface-variant)" }}>
							<Icon name="folder-open" style={{ width: 32, height: 32, opacity: 0.4, marginBottom: 8 }} />
							<div style={{ fontSize: 13, fontWeight: 500 }}>No versions yet</div>
							<div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>Run a prompt to create your first version</div>
						</div>
					) : (
						<div className="vh-list">
							{sortedVersions.map((version, index) => {
								const isActive = version.id === activeVersionId;
								const outputContent = getOutputContent(version.outputMessageId);
								const hasOutput = outputContent !== null;
								const inputPreview = (version.originalInput || version.content || "").trim();
								const isExpanded = expandedVersion === version.id;
								const runNumber = versions.length - index;

								return (
									<div
										key={version.id}
										className={`vh-row${isActive ? " vh-row--active" : ""}`}
									>
										{/* Collapsed view - single row */}
										<button
											type="button"
											className="vh-row-main"
											onClick={() => setExpandedVersion(isExpanded ? null : version.id)}
										>
											{/* Left: Version indicator */}
											<div className="vh-row-left">
												<div className={`vh-dot${isActive ? " vh-dot--active" : ""}${!hasOutput ? " vh-dot--draft" : ""}`} />
												<span className="vh-num">v{runNumber}</span>
											</div>

											{/* Center: Preview */}
											<div className="vh-row-center">
												<span className="vh-preview">
													{inputPreview.slice(0, 60) || "Empty"}{inputPreview.length > 60 ? "…" : ""}
												</span>
											</div>

											{/* Right: Time + badges */}
											<div className="vh-row-right">
												{isActive && <span className="vh-badge vh-badge--current">Current</span>}
												{!hasOutput && <span className="vh-badge vh-badge--draft">Draft</span>}
												<span className="vh-time-compact">{getRelativeTime(version.createdAt)}</span>
												<Icon 
													name={isExpanded ? "chevron-up" : "chevron-down"} 
													className="vh-chevron"
												/>
											</div>
										</button>

										{/* Expanded view */}
										{isExpanded && (
											<div className="vh-expanded">
												{/* Input section */}
												<div className="vh-section">
													<div className="vh-section-label">
														<Icon name="edit" />
														Input
													</div>
													<div className="vh-section-content">
														{inputPreview || <em style={{ opacity: 0.5 }}>Empty prompt</em>}
													</div>
												</div>

												{/* Output section */}
												{hasOutput && (
													<div className="vh-section vh-section--output">
														<div className="vh-section-label">
															<Icon name="comments" />
															Output
														</div>
														<div className="vh-section-content">
															{outputContent}
														</div>
													</div>
												)}

												{/* Action */}
												{!isActive && (
													<button
														className="vh-restore-btn"
														onClick={(e) => {
															e.stopPropagation();
															handleRestore(version.id);
														}}
													>
														<Icon name="refresh" />
														Restore this version
													</button>
												)}
											</div>
										)}
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
