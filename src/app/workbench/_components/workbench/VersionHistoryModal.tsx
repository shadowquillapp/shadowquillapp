import { Icon } from "@/components/Icon";
import { useEffect } from "react";

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
}

export function VersionHistoryModal({
	open,
	onClose,
	versions,
	activeVersionId,
	onJumpToVersion,
}: VersionHistoryModalProps) {
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

	return (
		<div
			className="modal-container"
			aria-modal="true"
			role="dialog"
		>
			<div className="modal-backdrop-blur" />
			<div className="modal-content" onClick={(e) => e.stopPropagation()}>
				<div className="modal-header">
					<div className="modal-title">Current Project's Version History</div>
					<button
						aria-label="Close version history"
						className="md-btn"
						onClick={onClose}
						style={{ width: 32, height: 32, padding: 0 }}
					>
						<Icon name="close" />
					</button>
				</div>
				<div className="modal-body">
					{versions.length === 0 ? (
						<div
							className="text-secondary"
							style={{ textAlign: "center", padding: 24 }}
						>
							No snapshots yet. Click the save icon to capture a snapshot.
						</div>
					) : (
						<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
							{versions.map((version, index) => {
								const isActive = version.id === activeVersionId;
								return (
									<button
										key={version.id}
										type="button"
										className={`version-history-item${isActive ? " version-history-item--active" : ""}`}
										onClick={() => {
											onJumpToVersion(version.id);
											onClose();
										}}
									>
									<div className="version-history-item__head">
										<span className="version-history-item__label">
											v{index + 1}
										</span>
										<span className="text-primary text-xs">
											<b>{new Date(version.createdAt).toLocaleString()}</b>
										</span>
									</div>
										<p className="version-history-item__preview">
											{(version.originalInput || version.content).slice(0, 200)}...
										</p>
									</button>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

