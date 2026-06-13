"use client";
import type { Icon as IconsaxIcon } from "iconsax-reactjs";
import {
	Add,
	ArrowDown2,
	ArrowLeft2,
	ArrowRight2,
	ArrowSwapHorizontal,
	ArrowUp2,
	Briefcase,
	Brush,
	CloseCircle,
	Code,
	ColorSwatch,
	Copy,
	Cpu,
	Data,
	Designtools,
	Dislike,
	DocumentText,
	Edit2,
	Element4,
	EmojiHappy,
	Eye,
	FolderOpen,
	Gallery,
	Gps,
	HamburgerMenu,
	InfoCircle,
	Like1,
	MagicStar,
	Maximize4,
	Menu,
	Messages,
	Microscope,
	Minus,
	Moon,
	Refresh,
	Save2,
	SearchNormal,
	Setting2,
	Setting4,
	Star1,
	Stop,
	Sun1,
	TickCircle,
	Trash,
	Video,
	VolumeHigh,
	Warning2,
} from "iconsax-reactjs";
import type React from "react";

const icons: Record<string, IconsaxIcon> = {
	gear: Setting2,
	sliders: Setting4,
	brush: Brush,
	info: InfoCircle,
	comments: Messages,
	tools: Designtools,
	scroll: DocumentText,
	db: Data,
	star: Star1,
	close: CloseCircle,
	bars: HamburgerMenu,
	thumbsUp: Like1,
	thumbsDown: Dislike,
	minus: Minus,
	plus: Add,
	expand: Maximize4,
	chevronDown: ArrowDown2,
	"chevron-down": ArrowDown2,
	chevronUp: ArrowUp2,
	"chevron-up": ArrowUp2,
	"chevron-left": ArrowLeft2,
	"chevron-right": ArrowRight2,
	refresh: Refresh,
	palette: ColorSwatch,
	copy: Copy,
	check: TickCircle,
	stop: Stop,
	trash: Trash,
	edit: Edit2,
	search: SearchNormal,
	eye: Eye,
	"folder-open": FolderOpen,
	save: Save2,
	"git-compare": ArrowSwapHorizontal,
	"code-compare": ArrowSwapHorizontal,
	sparkles: MagicStar,
	warning: Warning2,
	cpu: Cpu,
	layout: Element4,
	image: Gallery,
	"file-text": DocumentText,
	settings: Setting2,
	sun: Sun1,
	moon: Moon,
	terminal: Code,
	bullseye: Gps,
	video: Video,
	flask: Microscope,
	bullhorn: VolumeHigh,
	equals: Menu,
	"face-smile": EmojiHappy,
	briefcase: Briefcase,
} as const;

export type _IconNameForceInclude = "edit";
export type IconName = _IconNameForceInclude | keyof typeof icons;

function resolveSize(style?: React.CSSProperties): number | string {
	const dim = style?.width ?? style?.height;
	if (typeof dim === "number") return dim;
	if (typeof dim === "string" && dim.endsWith("px")) {
		return Number.parseFloat(dim);
	}
	return 24;
}

type IconVariant = "Bulk" | "Bold" | "Linear" | "Outline" | "TwoTone";

export const Icon: React.FC<{
	name: IconName;
	className?: string;
	title?: string;
	style?: React.CSSProperties;
	variant?: IconVariant;
}> = ({ name, className, title, style, variant = "Bulk" }) => {
	const IconComponent = icons[name];
	if (!IconComponent) {
		console.error(`Icon "${name}" not found in icons object`);
		return null;
	}
	return (
		<IconComponent
			variant={variant}
			color="currentColor"
			size={resolveSize(style)}
			{...(className !== undefined && { className })}
			{...(style !== undefined && { style })}
			{...(title !== undefined && { "aria-label": title })}
			aria-hidden={!title}
		/>
	);
};
