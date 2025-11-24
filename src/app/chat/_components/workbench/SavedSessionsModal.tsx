import { useDialog } from "@/components/DialogProvider";
import { Icon } from "@/components/Icon";
import { useEffect } from "react";

interface SavedSession {
	id: string;
	title: string | null;
	updatedAt: Date | number | string; // Handling loose types from DB
}

interface SavedSessionsModalProps {
	open: boolean;
	onClose: () => void;
	sessions: SavedSession[];
	activeSessionId: string | null;
	onLoadSession: (id: string) => void;
	onDeleteSession: (id: string) => Promise<void>;
	onDeleteAllSessions: () => Promise<void>;
}

export function SavedSessionsModal({
	open,
	onClose,
	sessions,
	activeSessionId,
	onLoadSession,
	onDeleteSession,
	onDeleteAllSessions,
}: SavedSessionsModalProps) {
	const { confirm } = useDialog();

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

	const handleDeleteAll = async () => {
		const ok = await confirm({
			title: "Delete All Projects",
			message: "Delete ALL saved projects? This cannot be undone.",
			confirmText: "Delete All",
			cancelText: "Cancel",
			tone: "destructive",
		});
		if (!ok) return;
		await onDeleteAllSessions();
	};

	const handleDeleteSingle = async (e: React.MouseEvent, id: string) => {
		e.stopPropagation();
		const ok = await confirm({
			title: "Delete Project",
			message: "Delete this project? This cannot be undone.",
			confirmText: "Delete",
			cancelText: "Cancel",
			tone: "destructive",
		});
		if (!ok) return;
		await onDeleteSession(id);
	};

	return (
		<div
			className="modal-container"
			aria-modal="true"
			role="dialog"
			onClick={onClose}
		>
			<div className="modal-backdrop-blur" />
			<div className="modal-content" onClick={(e) => e.stopPropagation()}>
				<div className="modal-header">
					<div className="modal-title">Saved Projects</div>
					<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
						<button
							className="md-btn md-btn--destructive"
							onClick={handleDeleteAll}
							style={{
								padding: "6px 10px",
								color: "#ef4444",
								marginRight: 10,
								height: 32,
							}}
							title="Delete all projects"
						>
							<b>Delete All</b>
						</button>
						<button
							aria-label="Close"
							className="md-btn"
							onClick={onClose}
							style={{ width: 32, height: 32, padding: 0 }}
						>
							<Icon name="close" />
						</button>
					</div>
				</div>
				<div className="modal-body">
					{sessions.length === 0 ? (
						<div
							className="text-secondary"
							style={{ fontSize: 13, padding: 12, textAlign: "center" }}
						>
							No saved projects yet.
						</div>
					) : (
						<ul
							style={{
								listStyle: "none",
								margin: 0,
								padding: 0,
								display: "grid",
								gap: 6,
							}}
						>
							{sessions.map((c) => {
								const isActive = activeSessionId === c.id;
								return (
									<li
										key={c.id}
										style={{
											display: "flex",
											alignItems: "center",
											gap: 6,
										}}
									>
										<button
											type="button"
											aria-current={isActive ? "true" : undefined}
											className="md-btn"
											style={{
												width: "100%",
												justifyContent: "space-between",
												padding: "10px 12px",
												background: isActive
													? "rgba(108,140,255,0.12)"
													: "transparent",
												outline: isActive
													? "2px solid var(--color-primary)"
													: "none",
												outlineOffset: -2,
												cursor: "pointer",
												flex: 1,
											}}
											onClick={() => {
												onLoadSession(c.id);
												onClose();
											}}
										>
											<span
												style={{
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap",
													fontWeight: isActive ? 600 : 500,
												}}
											>
												{c.title ?? "Untitled"}...
											</span>
											<span className="text-secondary" style={{ fontSize: 12 }}>
												{new Date(c.updatedAt).toLocaleString()}
											</span>
										</button>
										<button
											type="button"
											className="md-btn md-btn--destructive"
											title="Delete project"
											style={{
												width: 32,
												height: 32,
												borderRadius: "50%",
												padding: 0,
												color: "#ef4444",
											}}
											onClick={(e) => handleDeleteSingle(e, c.id)}
											aria-label="Delete project"
										>
											<Icon name="trash" className="text-[13px]" />
										</button>
									</li>
								);
							})}
						</ul>
					)}
				</div>
			</div>
		</div>
	);
}
