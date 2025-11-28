/**
 * AI-powered example generator for presets
 * Uses Gemma 3 to generate contextually relevant example inputs,
 * then generates outputs using the prompt builder
 */
import type { PresetExample, PresetLite, TaskType } from "@/types";
import { callLocalModelClient } from "./model-client";
import { buildPromptPreview } from "./prompt-builder-client";

/** Task type descriptions for the AI to understand context */
const TASK_DESCRIPTIONS: Record<TaskType, string> = {
  general: "general-purpose questions, explanations, or assistance requests",
  coding:
    "programming tasks like writing functions, debugging, or explaining code concepts",
  image:
    "image generation prompts describing visual scenes, subjects, or artistic styles",
  video:
    "video production prompts describing shots, scenes, or visual sequences",
  research:
    "research queries requiring analysis, investigation, or evidence-based responses",
  writing:
    "creative or professional writing tasks like articles, stories, or documentation",
  marketing:
    "marketing content like ad copy, landing pages, email campaigns, or social posts",
};

const TASK_SCENARIO_HINTS: Record<TaskType, string[]> = {
  general: [
    "Lean into day-to-day productivity scenarios such as planning, prioritization, or synthesizing information for stakeholders.",
    "Reference deadlines, roles, KPIs, or meeting context to ground the prompt in reality.",
  ],
  coding: [
    "Reference concrete files, frameworks, stack details, bug IDs, or error logs.",
    "State acceptance criteria such as tests to add, performance budgets, or critical edge cases.",
  ],
  image: [
    "Describe the hero subject, composition, lighting, camera details, and mood clearly.",
    "Call out the desired style preset, aspect ratio, and production intent (e.g., marketing banner, concept art).",
  ],
  video: [
    "Detail the scene, pacing, camera movement, and storyboard beats.",
    "Include how/where the clip will be used plus timing requirements like duration or frame rate.",
  ],
  research: [
    "Define the research question, scope, and type of evidence desired.",
    "Mention decision context, comparison criteria, or stakeholder concerns.",
  ],
  writing: [
    "Specify the publication medium, narrative device, and perspective.",
    "Include audience expectations, tone, and any structural elements like headings or sections.",
  ],
  marketing: [
    "Highlight the campaign goal, target segment, and platform nuances.",
    "Mention concrete value props, proof points, and compliance considerations.",
  ],
};

function summarizeText(value?: string, maxLength = 220): string | undefined {
  if (!value) return undefined;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 3)}...`
    : normalized;
}

function buildDirectiveList(preset: PresetLite): string[] {
  const directives: string[] = [];
  const options = preset.options;

  if (!options) {
    return directives;
  }

  const push = (text?: string) => {
    if (text) directives.push(text);
  };

  if (options.tone) push(`Tone: ${options.tone}.`);
  if (options.detail) push(`Detail level: ${options.detail}.`);
  if (options.format) push(`Output format: ${options.format}.`);
  if (options.language) push(`Respond in ${options.language}.`);
  if (options.audience) push(`Primary audience: ${options.audience}.`);
  if (typeof options.temperature === "number")
    push(`Creativity setting (temperature): ${options.temperature}.`);
  if (options.useDelimiters) push("Require delimiter-separated sections.");
  if (options.includeVerification)
    push("Include verification or QA checklist.");
  if (options.reasoningStyle && options.reasoningStyle !== "none")
    push(
      `Encourage ${options.reasoningStyle.replace(/_/g, " ")} reasoning steps.`,
    );
  if (options.endOfPromptToken)
    push(`End with custom token "${options.endOfPromptToken}".`);
  if (options.outputXMLSchema)
    push("Output must follow a provided XML schema.");

  const contextSnippet = summarizeText(options.additionalContext);
  if (contextSnippet) push(`Context emphasis: ${contextSnippet}`);

  const examplesSnippet = summarizeText(options.examplesText);
  if (examplesSnippet) push(`Example inspiration: ${examplesSnippet}`);

  const styleSnippet = summarizeText(options.styleGuidelines);
  if (styleSnippet) push(`Style guidelines: ${styleSnippet}`);

  switch (preset.taskType) {
    case "coding":
      if (options.includeTests) push("Request accompanying automated tests.");
      if (options.techStack) push(`Tech stack focus: ${options.techStack}.`);
      if (options.projectContext) {
        const snippet = summarizeText(options.projectContext);
        if (snippet) push(`Project context: ${snippet}`);
      }
      if (options.codingConstraints) {
        const snippet = summarizeText(options.codingConstraints);
        if (snippet) push(`Constraints: ${snippet}`);
      }
      break;
    case "research":
      if (options.requireCitations) push("Require citations for all claims.");
      break;
    case "writing":
      if (options.writingStyle) push(`Writing style: ${options.writingStyle}.`);
      if (options.pointOfView)
        push(`Point of view: ${options.pointOfView}-person perspective.`);
      if (options.readingLevel) push(`Reading level: ${options.readingLevel}.`);
      if (options.targetWordCount)
        push(`Approximate length: ${options.targetWordCount} words.`);
      if (options.includeHeadings) push("Request organized headings.");
      break;
    case "marketing":
      if (options.marketingChannel)
        push(`Channel/platform: ${options.marketingChannel}.`);
      if (options.ctaStyle) push(`CTA style: ${options.ctaStyle}.`);
      if (options.valueProps) {
        const snippet = summarizeText(options.valueProps);
        if (snippet) push(`Value props to highlight: ${snippet}`);
      }
      if (options.complianceNotes) {
        const snippet = summarizeText(options.complianceNotes);
        if (snippet) push(`Compliance constraints: ${snippet}`);
      }
      break;
    case "image":
      if (options.stylePreset)
        push(`Visual style preset: ${options.stylePreset}.`);
      if (options.aspectRatio) push(`Aspect ratio: ${options.aspectRatio}.`);
      if (options.targetResolution)
        push(`Target resolution: ${options.targetResolution}.`);
      break;
    case "video":
      if (options.stylePreset)
        push(`Video style preset: ${options.stylePreset}.`);
      if (options.aspectRatio) push(`Aspect ratio: ${options.aspectRatio}.`);
      if (options.targetResolution)
        push(`Target resolution: ${options.targetResolution}.`);
      if (options.cameraMovement)
        push(`Camera movement: ${options.cameraMovement}.`);
      if (options.shotType) push(`Shot type: ${options.shotType}.`);
      if (options.durationSeconds)
        push(`Duration: ${options.durationSeconds} seconds.`);
      if (options.frameRate) push(`Frame rate: ${options.frameRate} fps.`);
      if (options.includeStoryboard)
        push("Include storyboard beats or shot list.");
      break;
    default:
      break;
  }

  return directives;
}

/**
 * Build a prompt to ask Gemma for realistic example inputs
 */
function buildExampleGenerationPrompt(
  preset: PresetLite,
  count: 1 | 2 = 2,
): string {
  const taskDesc = TASK_DESCRIPTIONS[preset.taskType];
  const directives = buildDirectiveList(preset);
  const directiveSection =
    directives.length > 0
      ? `\n\nKey preset requirements derived from the configuration:\n- ${directives.join(
          "\n- ",
        )}`
      : "";

  const scenarioHints = TASK_SCENARIO_HINTS[preset.taskType] ?? [];
  const scenarioSection =
    scenarioHints.length > 0
      ? `\n\nScenario guidance:\n- ${scenarioHints.join("\n- ")}`
      : "";

  const quantityLine =
    count === 1
      ? "Generate exactly 1 realistic example input that a user might send to this preset."
      : "Generate exactly 2 distinct, realistic example inputs that a user might send to this preset.";

  const sharedBullets = `Each example must:
- Start with a concrete user persona, goal, or situation.
- Reference specific deliverable requirements pulled from the preset details above (tone, structure, tests, citations, etc.).
- Mention quantifiable constraints or contextual signals (dates, KPIs, industries, characters, etc.) whenever available.
- Stay between 1-3 sentences while remaining vivid and practical.
- Avoid referencing these instructions or the preset directly.`;

  const formatInstructions =
    count === 2
      ? `IMPORTANT: Respond with ONLY the two examples, separated by the delimiter "---SPLIT---". Do not include numbering, labels, or explanations.
Example format:
First example text here
---SPLIT---
Second example text here`
      : `IMPORTANT: Respond with ONLY the single example and no numbering, greeting, or trailing commentary.
Example format:
Single example text here`;

  return `You are helping generate example prompts for a prompt engineering tool.

Preset name: ${preset.name ?? "Unnamed preset"}
Task type: ${preset.taskType} (${taskDesc})${directiveSection}${scenarioSection}

${quantityLine}
${sharedBullets}

${formatInstructions}`;
}

/**
 * Parse Gemma's response to extract two example inputs
 */
function parseExampleInputs(response: string): [string, string] | null {
  const cleaned = response.trim();
  const parts = cleaned
    .split("---SPLIT---")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length >= 2 && parts[0] && parts[1]) {
    return [parts[0], parts[1]];
  }
  const numberedMatch = cleaned.match(
    /(?:^|\n)\s*(?:1[.):]\s*)(.+?)(?:\n\s*(?:2[.):]\s*))(.+)/s,
  );
  if (numberedMatch && numberedMatch[1] && numberedMatch[2]) {
    return [numberedMatch[1].trim(), numberedMatch[2].trim()];
  }
  const paragraphs = cleaned
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length >= 2 && paragraphs[0] && paragraphs[1]) {
    return [paragraphs[0], paragraphs[1]];
  }
  return null;
}

/**
 * Generate example inputs using Gemma 3
 */
async function generateExampleInputs(
  preset: PresetLite,
): Promise<[string, string]> {
  const prompt = buildExampleGenerationPrompt(preset, 2);
  const response = await callLocalModelClient(prompt, {
    taskType: "general",
    options: { temperature: 0.8, format: "plain" },
  });
  const parsed = parseExampleInputs(response);

  if (!parsed) {
    return getFallbackExamples(preset.taskType);
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
  const fullPrompt = await buildPromptPreview({
    input,
    taskType: preset.taskType,
    ...(preset.options && { options: preset.options }),
  });
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

  const [input1, input2] = await generateExampleInputs(preset);

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

  const singlePrompt = buildExampleGenerationPrompt(preset, 1);

  let input: string;
  try {
    const response = await callLocalModelClient(singlePrompt, {
      taskType: "general",
      options: { temperature: 0.8, format: "plain" },
    });
    input = response.trim() || getFallbackExamples(preset.taskType)[0];
  } catch {
    input = getFallbackExamples(preset.taskType)[0];
  }

  const output = await generateRealOutput(input, preset);

  return { input, output, generatedAt: now };
}
