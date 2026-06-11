"use client";

import type React from "react";
import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "@/components/Icon";
import { useMenuKeyboard } from "@/components/useMenuKeyboard";
import { usePortalMenuAnchor } from "@/components/usePortalMenuAnchor";

interface Option {
	value: string;
	label: string;
	icon?: IconName;
	disabled?: boolean;
}

interface CustomSelectProps {
	value: string;
	onChange: (value: string) => void;
	options: Option[];
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	id?: string;
	"aria-label"?: string;
	title?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
	value,
	onChange,
	options,
	placeholder = "Select...",
	className = "",
	disabled = false,
	id,
	"aria-label": ariaLabel,
	title,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const buttonRef = useRef<HTMLButtonElement | null>(null);
	const menuRef = useRef<HTMLDivElement | null>(null);

	const selectedOption = options.find((opt) => opt.value === value);
	const displayText = selectedOption?.label || placeholder;

	const closeMenu = useCallback(() => setIsOpen(false), []);
	const dropdownPos = usePortalMenuAnchor({
		open: isOpen,
		onClose: closeMenu,
		triggerRef: buttonRef,
		menuRef,
		itemCount: options.length,
	});

	const toggleDropdown = () => {
		if (disabled) return;
		setIsOpen((open) => !open);
	};

	const selectOption = (optionValue: string) => {
		onChange(optionValue);
		setIsOpen(false);
		buttonRef.current?.focus();
	};

	const handleMenuKeyDown = useMenuKeyboard({
		open: isOpen,
		onClose: closeMenu,
		menuRef,
		triggerRef: buttonRef,
	});

	return (
		<>
			<button
				ref={buttonRef}
				type="button"
				id={id}
				onClick={(e) => {
					e.stopPropagation();
					toggleDropdown();
				}}
				disabled={disabled}
				aria-haspopup="menu"
				aria-expanded={isOpen}
				aria-label={ariaLabel}
				title={title}
				className={`md-select md-select--trigger ${className}`.trim()}
			>
				<span
					className={`flex items-center gap-2 ${selectedOption ? "" : "opacity-80"}`}
				>
					{selectedOption?.icon && (
						<Icon
							name={selectedOption.icon}
							className="h-4 w-4 text-secondary"
						/>
					)}
					{displayText}
				</span>
				<svg
					className={`dropdown-arrow ml-2 h-4 w-4 shrink-0 ${isOpen ? "dropdown-arrow--open" : ""}`}
					viewBox="0 0 20 20"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
					aria-hidden="true"
				>
					<path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			</button>

			{isOpen &&
				dropdownPos &&
				typeof document !== "undefined" &&
				createPortal(
					<div
						ref={menuRef}
						role="menu"
						onKeyDown={handleMenuKeyDown}
						className={`menu-panel fixed z-[10001] overflow-y-auto ${
							dropdownPos.openUpward ? "fade-in-up" : "fade-in-down"
						}`}
						style={{
							top: dropdownPos.top,
							left: dropdownPos.left,
							width: dropdownPos.width,
							maxHeight: dropdownPos.maxHeight,
						}}
					>
						{options.map((option) => (
							<button
								key={option.value}
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									if (!option.disabled) {
										selectOption(option.value);
									}
								}}
								className={`menu-item ${option.disabled ? "menu-item--disabled" : ""}`}
								data-selected={option.value === value}
								role="menuitem"
								disabled={option.disabled}
							>
								<span className="flex items-center gap-2">
									{option.icon && (
										<Icon name={option.icon} className="h-4 w-4" />
									)}
									{option.label}
								</span>
							</button>
						))}
					</div>,
					document.body,
				)}
		</>
	);
};
