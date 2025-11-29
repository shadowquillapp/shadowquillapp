"use client";
import {
	AdjustmentsHorizontalIcon,
	ArrowPathIcon,
	ArrowsPointingOutIcon,
	ArrowsRightLeftIcon,
	Bars2Icon,
	Bars3Icon,
	BeakerIcon,
	BriefcaseIcon,
	ChatBubbleLeftRightIcon,
	CheckIcon,
	ChevronDownIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	ChevronUpIcon,
	CircleStackIcon,
	Cog6ToothIcon,
	CommandLineIcon,
	CpuChipIcon,
	DocumentDuplicateIcon,
	DocumentTextIcon,
	ExclamationTriangleIcon,
	EyeIcon,
	FaceSmileIcon,
	FolderOpenIcon,
	HandThumbDownIcon,
	HandThumbUpIcon,
	InformationCircleIcon,
	MagnifyingGlassIcon,
	MegaphoneIcon,
	MinusIcon,
	MoonIcon,
	PaintBrushIcon,
	PencilSquareIcon,
	PhotoIcon,
	PlusIcon,
	SparklesIcon,
	Squares2X2Icon,
	StarIcon,
	StopIcon,
	SunIcon,
	SwatchIcon,
	TrashIcon,
	VideoCameraIcon,
	WrenchScrewdriverIcon,
	XMarkIcon,
} from "@heroicons/react/24/solid";
import type React from "react";
import type { ComponentType, SVGProps } from "react";

type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>;

const icons: Record<string, HeroIcon> = {
	gear: Cog6ToothIcon,
	sliders: AdjustmentsHorizontalIcon,
	brush: PaintBrushIcon,
	info: InformationCircleIcon,
	comments: ChatBubbleLeftRightIcon,
	tools: WrenchScrewdriverIcon,
	scroll: DocumentTextIcon,
	db: CircleStackIcon,
	star: StarIcon,
	close: XMarkIcon,
	bars: Bars3Icon,
	thumbsUp: HandThumbUpIcon,
	thumbsDown: HandThumbDownIcon,
	minus: MinusIcon,
	plus: PlusIcon,
	expand: ArrowsPointingOutIcon,
	chevronDown: ChevronDownIcon,
	"chevron-down": ChevronDownIcon,
	chevronUp: ChevronUpIcon,
	"chevron-up": ChevronUpIcon,
	"chevron-left": ChevronLeftIcon,
	"chevron-right": ChevronRightIcon,
	refresh: ArrowPathIcon,
	palette: SwatchIcon,
	copy: DocumentDuplicateIcon,
	check: CheckIcon,
	stop: StopIcon,
	trash: TrashIcon,
	edit: PencilSquareIcon,
	search: MagnifyingGlassIcon,
	eye: EyeIcon,
	"folder-open": FolderOpenIcon,
	save: DocumentDuplicateIcon,
	"git-compare": ArrowsRightLeftIcon,
	"code-compare": ArrowsRightLeftIcon,
	sparkles: SparklesIcon,
	warning: ExclamationTriangleIcon,
	cpu: CpuChipIcon,
	layout: Squares2X2Icon,
	image: PhotoIcon,
	"file-text": DocumentTextIcon,
	settings: Cog6ToothIcon,
	sun: SunIcon,
	moon: MoonIcon,
	terminal: CommandLineIcon,
	// Task Type icons
	bullseye: StopIcon,
	video: VideoCameraIcon,
	flask: BeakerIcon,
	bullhorn: MegaphoneIcon,
	// Tone icons
	equals: Bars2Icon,
	"face-smile": FaceSmileIcon,
	briefcase: BriefcaseIcon,
} as const;

export type _IconNameForceInclude = "edit";
export type IconName = _IconNameForceInclude | keyof typeof icons;
export const Icon: React.FC<{
	name: IconName;
	className?: string;
	title?: string;
	style?: React.CSSProperties;
}> = ({ name, className, title, style }) => {
	const IconComponent = icons[name];
	if (!IconComponent) {
		console.error(`Icon "${name}" not found in icons object`);
		return null;
	}
	return (
		<IconComponent
			className={className}
			aria-label={title}
			style={style}
			aria-hidden={!title}
		/>
	);
};
