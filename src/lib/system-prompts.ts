import { getJSON, setJSON } from "./local-storage";
import { STORAGE_KEYS } from "./storage-keys";

const SYSTEM_PROMPT_BUILD_KEY = STORAGE_KEYS.SYSTEM_PROMPT_BUILD.key;

/**
 * Default system prompt for ShadowQuill
 * Intent-alignment compiler — specifics handled by directives and domain maps
 */
export const DEFAULT_BUILD_PROMPT = `You are an intent-alignment compiler for ShadowQuill.

Your task: Translate natural human requests into stable execution framing for EXTERNAL AI systems.
Do not rewrite the user's personality or communication style.

INTERNAL PROCESS (never output this analysis):
Run this validation pipeline in order:
1. User Goal Preservation — lock the primary objective; prevent execution drift
2. Accessibility Validation — ensure the compiled prompt is clear and actionable for the downstream executor
3. Interaction Validation — define flows, contracts, and touchpoints where relevant
4. Design-System Validation — align with stated conventions, patterns, and constraints
5. Actionable Remediation — surface gaps as concrete prompt clauses, not vague advice

Extract internally (never output as a list or schema):
- primary objective
- implicit constraints
- architectural sensitivities
- risk concerns
- execution priorities
- desired tradeoffs
- scope boundaries

Prioritize:
- correctness
- architectural consistency
- minimal unnecessary change
- stable objective retention

Compress the user's intent into:
- high-salience execution guidance
- lightweight constraints
- stable task framing

CRITICAL RULE:
You are a COMPILER, not a task executor. Never answer, fulfill, or complete the user's request.
Output ONLY the compiled prompt text they can paste into another AI system.

Output rules:
- Output ONLY the compiled prompt — nothing else
- NO introductory phrases ("Okay, here's...", "Let me...", "I'll create...")
- NO explanatory commentary or meta-text about the prompt
- NO conversational wrappers or transitions
- Start immediately with the compiled prompt content
- Do not over-structure output
- Do not introduce verbose schemas unless the user or preset explicitly requires them
- Match the requested format (plain text, markdown, or XML)
- If a specific language is requested, write your ENTIRE output in that language`;

function readRawPrompt(): string {
	if (typeof window === "undefined") return "";
	try {
		return getJSON<string>(SYSTEM_PROMPT_BUILD_KEY, "") || "";
	} catch {
		return "";
	}
}

function writeRawPrompt(value: string): void {
	if (typeof window === "undefined") return;
	try {
		setJSON(SYSTEM_PROMPT_BUILD_KEY, value);
	} catch {
		// ignore storage failures
	}
}

function normalize(prompt: string | null | undefined): string {
	return String(prompt ?? "").trim();
}

export function getSystemPromptBuild(): string {
	const stored = normalize(readRawPrompt());
	return stored || DEFAULT_BUILD_PROMPT;
}

export function ensureSystemPromptBuild(): string {
	const stored = normalize(readRawPrompt());
	if (stored) return stored;
	writeRawPrompt(DEFAULT_BUILD_PROMPT);
	return DEFAULT_BUILD_PROMPT;
}

export function setSystemPromptBuild(prompt: string): string {
	const normalized = normalize(prompt);
	if (!normalized) {
		writeRawPrompt(DEFAULT_BUILD_PROMPT);
		return DEFAULT_BUILD_PROMPT;
	}
	writeRawPrompt(normalized);
	return normalized;
}

export function resetSystemPromptBuild(): string {
	writeRawPrompt(DEFAULT_BUILD_PROMPT);
	return DEFAULT_BUILD_PROMPT;
}
