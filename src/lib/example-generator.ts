/**
 * AI-powered example generator for presets
 * Uses Gemma 3 to generate contextually relevant example inputs,
 * then generates outputs using the prompt builder
 */
import type { GenerationOptions, PresetExample, PresetLite, TaskType } from "@/types";
import { callLocalModelClient } from "./model-client";
import { buildPromptPreview } from "./prompt-builder-client";

/** Task type descriptions for the AI to understand context */
const TASK_DESCRIPTIONS: Record<TaskType, string> = {
	general: "general-purpose questions, explanations, or assistance requests",
	coding: "programming tasks like writing functions, debugging, or explaining code concepts",
	image: "image generation prompts describing visual scenes, subjects, or artistic styles",
	video: "video production prompts describing shots, scenes, or visual sequences",
	research: "research queries requiring analysis, investigation, or evidence-based responses",
	writing: "creative or professional writing tasks like articles, stories, or documentation",
	marketing: "marketing content like ad copy, landing pages, email campaigns, or social posts",
};

/**
 * Build a prompt to ask Gemma for two example inputs
 */
function buildExampleGenerationPrompt(
	taskType: TaskType,
	options?: GenerationOptions,
): string {
	const taskDesc = TASK_DESCRIPTIONS[taskType];
	
	const settingsParts: string[] = [];
	if (options?.tone) settingsParts.push(`tone: ${options.tone}`);
	if (options?.detail) settingsParts.push(`detail level: ${options.detail}`);
	if (options?.format) settingsParts.push(`output format: ${options.format}`);
	if (options?.language && options.language !== "English") {
		settingsParts.push(`language: ${options.language}`);
	}
	if (options?.audience) settingsParts.push(`target audience: ${options.audience}`);
	
	// Task-specific settings
	if (taskType === "coding" && options?.includeTests) {
		settingsParts.push("includes test cases");
	}
	if (taskType === "research" && options?.requireCitations) {
		settingsParts.push("requires citations");
	}
	if (taskType === "image" && options?.stylePreset) {
		settingsParts.push(`style: ${options.stylePreset}`);
	}
	if (taskType === "video") {
		if (options?.stylePreset) settingsParts.push(`style: ${options.stylePreset}`);
		if (options?.cameraMovement) settingsParts.push(`camera: ${options.cameraMovement}`);
	}
	if (taskType === "marketing" && options?.marketingChannel) {
		settingsParts.push(`channel: ${options.marketingChannel}`);
	}
	if (taskType === "writing" && options?.writingStyle) {
		settingsParts.push(`writing style: ${options.writingStyle}`);
	}

	const settingsStr = settingsParts.length > 0 
		? `\n\nPreset settings: ${settingsParts.join(", ")}`
		: "";

	return `You are helping generate example prompts for a prompt engineering tool.

Task type: ${taskType} (${taskDesc})${settingsStr}

Generate exactly 2 distinct, realistic example inputs that a user might provide for this type of task. Each example should be:
- Specific and detailed enough to be useful
- Different from each other (cover different use cases)
- Appropriate for the task type and settings
- Between 1-3 sentences

IMPORTANT: Respond with ONLY the two examples, separated by the delimiter "---SPLIT---". Do not include any numbering, labels, explanations, or other text.

Example format:
First example text here
---SPLIT---
Second example text here`;
}

/**
 * Parse Gemma's response to extract two example inputs
 */
function parseExampleInputs(response: string): [string, string] | null {
	// Clean up the response
	const cleaned = response.trim();
	
	// Try to split by the delimiter
	const parts = cleaned.split("---SPLIT---").map(p => p.trim()).filter(Boolean);
	
	if (parts.length >= 2 && parts[0] && parts[1]) {
		return [parts[0], parts[1]];
	}
	
	// Fallback: try splitting by numbered patterns like "1." or "1:"
	const numberedMatch = cleaned.match(/(?:^|\n)\s*(?:1[.):]\s*)(.+?)(?:\n\s*(?:2[.):]\s*))(.+)/s);
	if (numberedMatch && numberedMatch[1] && numberedMatch[2]) {
		return [numberedMatch[1].trim(), numberedMatch[2].trim()];
	}
	
	// Fallback: split by double newlines
	const paragraphs = cleaned.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
	if (paragraphs.length >= 2 && paragraphs[0] && paragraphs[1]) {
		return [paragraphs[0], paragraphs[1]];
	}
	
	return null;
}

/**
 * Generate example inputs using Gemma 3
 */
async function generateExampleInputs(
	taskType: TaskType,
	options?: GenerationOptions,
): Promise<[string, string]> {
	const prompt = buildExampleGenerationPrompt(taskType, options);
	
	const response = await callLocalModelClient(prompt, {
		taskType: "general",
		options: { temperature: 0.8, format: "plain" },
	});
	
	const parsed = parseExampleInputs(response);
	
	if (!parsed) {
		// Use fallback examples if parsing fails
		return getFallbackExamples(taskType);
	}
	
	return parsed;
}

/**
 * Fallback examples for each task type
 */
function getFallbackExamples(taskType: TaskType): [string, string] {
	const fallbacks: Record<TaskType, [string, string]> = {
		general: [
			"Explain the concept of machine learning to a beginner",
			"What are the pros and cons of renewable energy sources?",
		],
		coding: [
			"Create a REST API endpoint for user authentication with JWT",
			"Write a function to validate email addresses using regex",
		],
		image: [
			"A serene mountain landscape at sunset with a reflective lake",
			"A cozy coffee shop interior with warm lighting and plants",
		],
		video: [
			"A cinematic drone shot flying over a forest canopy at dawn",
			"A time-lapse of a bustling city street from day to night",
		],
		research: [
			"Analyze the impact of remote work on employee productivity",
			"Compare the effectiveness of different learning methods",
		],
		writing: [
			"Write an engaging blog post about sustainable living tips",
			"Create a compelling product description for wireless headphones",
		],
		marketing: [
			"Create landing page copy for a fitness tracking app",
			"Write an email campaign for a software product launch",
		],
	};
	
	return fallbacks[taskType];
}

/**
 * Generate a real output by building the prompt and calling the model
 */
async function generateRealOutput(
	input: string,
	preset: PresetLite,
): Promise<string> {
	// Step 1: Build the full prompt using the preset settings
	const fullPrompt = await buildPromptPreview({
		input,
		taskType: preset.taskType,
		...(preset.options && { options: preset.options }),
	});
	
	// Step 2: Actually call the model with the built prompt to get the real output
	const output = await callLocalModelClient(fullPrompt, {
		taskType: preset.taskType,
		...(preset.options && { options: preset.options }),
	});
	
	return output;
}

/**
 * Generate complete examples (input + output) for a preset
 * This generates real AI outputs by actually running the prompts through the model
 */
export async function generatePresetExamples(
	preset: PresetLite,
): Promise<[PresetExample, PresetExample]> {
	const now = Date.now();
	
	// Step 1: Generate two example inputs using Gemma
	const [input1, input2] = await generateExampleInputs(
		preset.taskType,
		preset.options,
	);
	
	// Step 2: Generate REAL outputs by calling the model with each input
	// This shows what users would actually get when using this preset
	const [output1, output2] = await Promise.all([
		generateRealOutput(input1, preset),
		generateRealOutput(input2, preset),
	]);
	
	return [
		{ input: input1, output: output1, generatedAt: now },
		{ input: input2, output: output2, generatedAt: now },
	];
}

/**
 * Generate a single example (input + output) for a preset
 */
export async function generateSingleExample(
	preset: PresetLite,
): Promise<PresetExample> {
	const now = Date.now();
	
	// Generate one example input
	const prompt = buildExampleGenerationPrompt(preset.taskType, preset.options);
	const singlePrompt = prompt.replace(
		"Generate exactly 2 distinct",
		"Generate exactly 1"
	).replace(
		"---SPLIT---",
		""
	);
	
	let input: string;
	try {
		const response = await callLocalModelClient(singlePrompt, {
			taskType: "general",
			options: { temperature: 0.8, format: "plain" },
		});
		input = response.trim().split("\n")[0]?.trim() || getFallbackExamples(preset.taskType)[0];
	} catch {
		input = getFallbackExamples(preset.taskType)[0];
	}
	
	// Generate the output
	const output = await generateRealOutput(input, preset);
	
	return { input, output, generatedAt: now };
}

