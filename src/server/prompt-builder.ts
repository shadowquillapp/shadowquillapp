import { readSystemPromptForMode } from '@/server/settings';
import type { TaskType, GenerationOptions } from '@/server/googleai';
// Image style descriptor expansion removed for minimal prompts

const TYPE_GUIDELINES: Record<TaskType, string> = {
  general: '',
  coding: 'Code: state language, environment, and I/O. Be precise.',
  image: 'Image: cover subject, context, style, lighting. No meta.',
  research: 'Research: precise claims; cite if requested.',
  writing: 'Writing: align audience, tone, and structure.',
  marketing: 'Marketing: persona, benefits, CTA.',
};

// Smart context detection function
function detectUserIntent(input: string, taskType: TaskType, options?: GenerationOptions): {
  isDirectTechnicalQuestion: boolean;
  isPromptCreation: boolean;
  isPromptEnhancement: boolean; // retained for future extensibility, treated as structured_prompt
  responseStrategy: 'direct_help' | 'structured_prompt';
} {
  const trimmed = input.trim();

  // Check for direct technical/implementation questions
  const technicalKeywords = /\b(make|change|fix|update|improve|modify|add|implement|create|build)\b.*\b(chat|ui|interface|width|sidebar|bubble|responsive|css|style|layout|component|code|javascript|react|tailwind|html|function|class)\b/i;
  const howToPatterns = /\b(how\s+to|can\s+you|help\s+me)\b.*\b(code|implement|add|create|fix|make|change)\b/i;
  const technicalTerms = /\b(css|javascript|react|tailwind|html|typescript|component|function|class|api|database|query)\b/i;

  const hasTechnicalIntent = technicalKeywords.test(trimmed) ||
                            howToPatterns.test(trimmed) ||
                            technicalTerms.test(trimmed);

  // Check if user is providing actual prompt text to enhance
  const looksLikeExistingPrompt = /1?\)\s*(Instruction|Key inputs|Steps|Policy|Constraints|Output)/i.test(trimmed) ||
                                  /^["""]/.test(trimmed) ||
                                  /\b(prompt|instruction|assistant|ai|model|system)\b.*:/i.test(trimmed) ||
                                  trimmed.split('\n').length > 3 && /\b(you are|your role|you should|you must)\b/i.test(trimmed);

  // Determine response strategy
  if (hasTechnicalIntent && (taskType === 'coding' || taskType === 'general')) {
    return {
      isDirectTechnicalQuestion: true,
      isPromptCreation: false,
      isPromptEnhancement: false,
      responseStrategy: 'direct_help'
    };
  } else {
    return {
      isDirectTechnicalQuestion: false,
      isPromptCreation: true,
      isPromptEnhancement: looksLikeExistingPrompt,
      responseStrategy: 'structured_prompt'
    };
  }
}

const UNIFIED_MODE_GUIDELINES: string = [
  'Create ONE minimal prompt. No meta.',
  'Never include answers or code. Output the prompt only.',
  'No headings, no numbered sections, no labels.',
].join('\n');

export interface BuildPromptInput {
  input: string;
  taskType: TaskType;
  options?: GenerationOptions;
}

export async function buildUnifiedPrompt({ input, taskType, options }: BuildPromptInput): Promise<string> {
  const rawUserInput = input.trim();
  const validationError = validateBuilderInput(rawUserInput, taskType);
  if (validationError) return validationError;

  // Smart context detection to determine response strategy
  const userIntent = detectUserIntent(rawUserInput, taskType, options);

  // Get the system prompt, which will now come from either the app settings or system-prompts-default.json
  const systemPrompt = await readSystemPromptForMode('build') ?? '';

  // Minimal constraints line
  const constraintParts: string[] = [];
  if (options?.tone) constraintParts.push(`tone=${options.tone}`);
  if (options?.detail) constraintParts.push(`detail=${options.detail}`);
  if (options?.audience) constraintParts.push(`audience=${options.audience}`);
  if (options?.language && options.language.toLowerCase() !== 'english') constraintParts.push(`lang=${options.language}`);
  if (options?.format) constraintParts.push(`format=${options.format}`);
  if (taskType === 'image') {
    if (options?.stylePreset) constraintParts.push(`style=${options.stylePreset}`);
    if (options?.aspectRatio) constraintParts.push(`ratio=${options.aspectRatio}`);
  }
  if (taskType === 'coding' && options?.includeTests) constraintParts.push('tests=yes');
  if (taskType === 'research' && options?.requireCitations) constraintParts.push('citations=yes');

  const typeGuidelines = TYPE_GUIDELINES[taskType];

  const lines: string[] = [];
  if (systemPrompt) lines.push(systemPrompt);
  lines.push(UNIFIED_MODE_GUIDELINES);
  if (typeGuidelines) lines.push(typeGuidelines);
  if (constraintParts.length) lines.push(`Constraints: ${constraintParts.join(', ')}`);
  lines.push(`Input: ${rawUserInput}`);
  lines.push('One output only. If insufficient detail, reply INPUT_INSUFFICIENT.');

  return lines.join('\n\n');
}

// Centralized builder input validation. Returns an error string if invalid, otherwise null.
export function validateBuilderInput(rawUserInput: string, taskType: TaskType): string | null {
  // Basic input validation
  if (rawUserInput.length === 0) {
    return 'User input rejected: Empty input. Please provide a prompt description or content to work with.';
  }

  // NOTE: Small talk / greeting inputs are now permitted; previous trivial greeting filtering removed per user request.

  // Improved injection detection - focus on high-confidence patterns
  const highConfidenceInjection = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/i,
    /forget\s+(everything|all)\s+(above|before|previous)/i,
    /disregard\s+(all\s+)?(above|previous)\s+(instructions?|prompts?)/i,
    /you\s+are\s+(no\s+longer|now)\s+(a|an)\s+/i,
    /from\s+now\s+on\s+you\s+(will|are|should)/i,
    /act\s+as\s+(if\s+you\s+are\s+)?(a|an)\s+(different|new)\s+/i,
    /override\s+(system|default|previous)\s+(settings?|instructions?)/i,
    /reset\s+(your\s+)?(instructions?|parameters?|settings?)/i,
    /\b(jailbreak|DAN\s*v?\d*)\b(?!\s+(method|technique|prevention|detection))/i,
    /developer\s+mode(?!\s+(discussion|prevention|security))/i,
  ].some(pattern => pattern.test(rawUserInput));

  if (highConfidenceInjection) {
    return 'User input rejected: Potential prompt injection detected. Please focus on describing the prompt content you want created or enhanced.';
  }

  // Smarter misuse detection - use multiple signals
  const signals = {
    isSimpleQuestion: /^(what|who|when|where|why|how)\s+/i.test(rawUserInput),
    hasPromptIntent: /(prompt|write|create|generate|build|make|design|craft|develop|compose|draft)\b/i.test(rawUserInput),
    hasCreativeIntent: /(story|image|picture|poem|article|essay|letter|email|code|script|marketing|ad|description)\b/i.test(rawUserInput),
    isConversational: /^(can\s+you|could\s+you|would\s+you|please|thanks?|thank\s+you)/i.test(rawUserInput),
    wordCount: rawUserInput.split(/\s+/).filter(Boolean).length,
    hasRichContent: rawUserInput.split(/[,;.]/).length > 2 || /\b(about|for|with|featuring|including|containing)\b/i.test(rawUserInput)
  };

  // Only reject if multiple negative signals align
  const likelyMisuse = signals.wordCount < 3 || (
    signals.isSimpleQuestion && 
    !signals.hasPromptIntent && 
    !signals.hasCreativeIntent && 
    signals.wordCount < 8 &&
    !signals.hasRichContent
  );

  if (likelyMisuse) {
    return 'User input rejected: Input appears too brief or conversational. Please describe what kind of prompt you want created or provide content to enhance.';
  }

  return null;
}
