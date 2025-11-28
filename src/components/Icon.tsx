"use client";
import {
	faBars,
	faBriefcase,
	faBrush,
	faBullhorn,
	faBullseye,
	faCheck,
	faChevronDown,
	faChevronLeft,
	faChevronRight,
	faChevronUp,
	faCircleInfo,
	faCodeCompare,
	faComments,
	faCopy,
	faDatabase,
	faEquals,
	faEye,
	faFaceSmile,
	faFileLines,
	faFlask,
	faFolderOpen,
	faGear,
	faImage,
	faLayerGroup,
	faMicrochip,
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
	faTerminal,
	faThumbsDown,
	faThumbsUp,
	faTrash,
	faTriangleExclamation,
	faUpRightAndDownLeftFromCenter,
	faSun,
	faMoon,
	faVideo,
	faWandMagicSparkles,
	faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type React from "react";

const icons = {
	gear: faGear,
	sliders: faSliders,
	brush: faBrush,
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
	chevronUp: faChevronUp,
	"chevron-up": faChevronUp,
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
	sparkles: faWandMagicSparkles,
	warning: faTriangleExclamation,
	cpu: faMicrochip,
	layout: faLayerGroup,
	image: faImage,
	"file-text": faFileLines,
	settings: faGear,
	sun: faSun,
	moon: faMoon,
	terminal: faTerminal,
	// Task Type icons
	bullseye: faBullseye,
	video: faVideo,
	flask: faFlask,
	bullhorn: faBullhorn,
	// Tone icons
	equals: faEquals,
	"face-smile": faFaceSmile,
	briefcase: faBriefcase,
} as const;

export type _IconNameForceInclude = "edit";
export type IconName = _IconNameForceInclude | keyof typeof icons;
export const Icon: React.FC<{
	name: IconName;
	className?: string;
	title?: string;
	style?: React.CSSProperties;
}> = ({ name, className, title, style }) => {
	const icon = icons[name];
	if (!icon) {
		console.error(`Icon "${name}" not found in icons object`);
		return null;
	}
	return (
		<FontAwesomeIcon
			icon={icon}
			className={className}
			title={title}
			style={style}
		/>
	);
};
