"use client";
import {
	faBars,
	faCheck,
	faChevronDown,
	faChevronLeft,
	faChevronRight,
	faCircleInfo,
	faCodeCompare,
	faComments,
	faCopy,
	faDatabase,
	faEye,
	faFolderOpen,
	faGear,
	faMinus,
	faPalette,
	faPenToSquare,
	faPlus,
	faRotateRight,
	faSave,
	faScrewdriverWrench,
	faScroll,
	faSearch,
	faSliders,
	faSquare,
	faStar,
	faThumbsDown,
	faThumbsUp,
	faTrash,
	faUpRightAndDownLeftFromCenter,
	faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type React from "react";

const icons = {
	gear: faGear,
	sliders: faSliders,
	info: faCircleInfo,
	comments: faComments,
	tools: faScrewdriverWrench,
	scroll: faScroll,
	db: faDatabase,
	star: faStar,
	close: faXmark,
	bars: faBars,
	thumbsUp: faThumbsUp,
	thumbsDown: faThumbsDown,
	minus: faMinus,
	plus: faPlus,
	expand: faUpRightAndDownLeftFromCenter,
	chevronDown: faChevronDown,
	"chevron-down": faChevronDown,
	"chevron-left": faChevronLeft,
	"chevron-right": faChevronRight,
	refresh: faRotateRight,
	palette: faPalette,
	copy: faCopy,
	check: faCheck,
	stop: faSquare,
	trash: faTrash,
	edit: faPenToSquare,
	search: faSearch,
	eye: faEye,
	"folder-open": faFolderOpen,
	save: faSave,
	"git-compare": faCodeCompare,
} as const;

export type _IconNameForceInclude = "edit";
export type IconName = _IconNameForceInclude | keyof typeof icons;
export const Icon: React.FC<{
	name: IconName;
	className?: string;
	title?: string;
	style?: React.CSSProperties;
}> = ({ name, className, title, style }) => (
	<FontAwesomeIcon
		icon={icons[name]}
		className={className}
		title={title}
		style={style}
	/>
);
