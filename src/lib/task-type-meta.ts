import type { TaskType } from "@/types";

export interface TaskTypeMeta {
	/** Friendly, plain-language category shown to non-technical users. */
	label: string;
	/** What this kind of prompt is good for, in everyday terms. */
	description: string;
	/** Starter prompts users can click to get going quickly. */
	examples: readonly string[];
}

const TASK_TYPE_META: Record<TaskType, TaskTypeMeta> = {
	intent: {
		label: "Everyday",
		description: "Turn a rough idea into a clear, ready-to-use prompt.",
		examples: [
			"Help me plan a 3-day trip to Lisbon on a budget",
			"Write a polite email asking my landlord to fix the heating",
			"Summarize this article into 5 key points",
		],
	},
	engineering: {
		label: "Code & Tech",
		description:
			"Get precise prompts for coding, debugging, and technical work.",
		examples: [
			"Build a React component for a searchable dropdown",
			"Find why my Python script crashes on large files",
			"Explain this error message and how to fix it",
		],
	},
	visual: {
		label: "Images",
		description: "Describe an image so an AI image tool can create it.",
		examples: [
			"A cozy reading nook by a rainy window, warm light",
			"Minimalist logo for a coffee shop called Driftwood",
			"Futuristic city skyline at sunset, cinematic",
		],
	},
	analysis: {
		label: "Research & Study",
		description: "Break down topics, compare options, and study smarter.",
		examples: [
			"Compare electric vs hybrid cars for city driving",
			"Explain the causes of inflation in simple terms",
			"Create a study guide for my biology exam",
		],
	},
	narrative: {
		label: "Writing & Stories",
		description: "Shape creative writing, stories, and scripts.",
		examples: [
			"Write the opening of a mystery set on a night train",
			"Turn my rough notes into a short personal essay",
			"Draft a 60-second video script about morning routines",
		],
	},
	persuasion: {
		label: "Marketing & Posts",
		description: "Craft messages that connect and convince.",
		examples: [
			"Write a LinkedIn post announcing my new job",
			"Create an Instagram caption for a bakery launch",
			"Draft a short pitch for my freelance services",
		],
	},
	motion: {
		label: "Video",
		description: "Describe motion and scenes for AI video tools.",
		examples: [
			"A drone shot flying over misty mountains at dawn",
			"Slow-motion coffee pour into a clear glass cup",
			"Time-lapse of a city street from day to night",
		],
	},
};

export function getTaskTypeMeta(taskType: string): TaskTypeMeta {
	return TASK_TYPE_META[taskType as TaskType] ?? TASK_TYPE_META.intent;
}

export function getTaskTypeLabel(taskType: string): string {
	return getTaskTypeMeta(taskType).label;
}

export function getTaskTypeExamples(taskType: string): readonly string[] {
	return getTaskTypeMeta(taskType).examples;
}
