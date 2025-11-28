"use client";

import { Icon } from "@/components/Icon";
import type React from "react";
import { useEffect, useRef, useState } from "react";

interface SaveAsDialogProps {
	isOpen: boolean;
	currentName: string;
	onSave: (newName: string) => void;
	onCancel: () => void;
	title?: string;
	message?: string;
	confirmLabel?: string;
}

export default function SaveAsDialog({
	isOpen,
	currentName,
	onSave,
	onCancel,
	title,
	message,
	confirmLabel,
}: SaveAsDialogProps) {
	const [name, setName] = useState(`${currentName} Copy`);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isOpen) {
			setName(`${currentName} Copy`);
			setTimeout(() => {
				inputRef.current?.focus();
				inputRef.current?.select();
			}, 100);
		}
	}, [isOpen, currentName]);

	// Handle Escape key
	useEffect(() => {
		if (!isOpen) return;

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onCancel();
			}
		};

		window.addEventListener("keydown", handleEscape);
		return () => window.removeEventListener("keydown", handleEscape);
	}, [isOpen, onCancel]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (name.trim()) {
			onSave(name.trim());
		}
	};

	if (!isOpen) return null;

	return (
		<div className="modal-container" onClick={onCancel}>
			<div className="modal-backdrop-blur" />
			<div
				className="modal-content"
				onClick={(e) => e.stopPropagation()}
				style={{ width: "min(480px, 92vw)" }}
			>
				<div className="modal-header">
					<div className="modal-title">{title || "Save As New Preset"}</div>
					<button onClick={onCancel} className="md-icon-btn" aria-label="Close">
						<Icon name="close" />
					</button>
				</div>

				<form onSubmit={handleSubmit}>
					<div className="modal-body">
						{message && <p className="mb-3 text-light text-sm">{message}</p>}
						<div>
							<label className="mb-2 block font-medium text-secondary text-xs">
								Preset Name
							</label>
							<input
								ref={inputRef}
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Enter preset name"
								className="md-input w-full px-3.5 py-2.5 text-sm"
								required
							/>
						</div>
					</div>

					<div className="modal-body flex justify-end gap-3 border-[var(--color-outline)] border-t pt-3">
						<button type="button" onClick={onCancel} className="md-btn">
							Cancel
						</button>
						<button
							type="submit"
							className="md-btn md-btn--primary"
							disabled={!name.trim()}
						>
							{confirmLabel || "Save As New"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
