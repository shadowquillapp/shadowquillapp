import type { TaskType, GenerationOptions } from '@/server/googleai';

export interface SanitizationResult {
  cleaned: string;
  driftReasons: string[];
}

// Detect placeholder markdown image (like ![desc](16:9) or empty alt)
function isMarkdownImageOnly(s: string) {
  return /^!\[[^\]]*\]\([^)]*\)\s*$/m.test(s.trim());
}

// Detect incomplete / partial markdown image start (e.g., model began image syntax)
function startsLikeMarkdownImage(s: string) {
  return /^!\[[^\]]*$/.test(s.trim()) || /^!\[[^\]]*\]\([^)]*$/.test(s.trim());
}

function isHtmlImgOnly(s: string) {
  const t = s.trim();
  // <img ...> possibly self closing and maybe wrapped in backticks accidentally
  return /^<img\s+[^>]*>$/i.test(t) || /^<img\s+[^>]*\/>$/i.test(t);
}

// Inserted helpers for format-aware sanitization
function stripOuterFence(text: string): { inner: string; stripped: boolean } {
  const m = /^```[a-zA-Z0-9_-]*\r?\n([\s\S]*?)\r?\n```\s*$/.exec(text.trim());
  if (!m) return { inner: text, stripped: false };
  return { inner: m[1] ?? text, stripped: true };
}

function removeFencedBlocksByLang(text: string, lang: string): string {
  const re = new RegExp('```' + lang + "\\r?\\n[\\s\\S]*?\\r?\\n```", 'gi');
  return text.replace(re, '').trim();
}

function removeProgrammingFencedBlocks(text: string): string {
  // Remove fenced blocks with or without language tags (conservative for coding prompts)
  return text.replace(/```[a-zA-Z0-9_-]*\r?\n[\s\S]*?\r?\n```/g, '').trim();
}

// Remove common meta lines that models sometimes invent for coding tasks
function removeCodingMetaLines(text: string): string {
  let out = text;
  const metaLine = /^\s*(Language|Env|Environment|I\/O|IO|Tech\s*stack|Runtime|Tools?|Editor|IDE)\s*:\s*.*$/gim;
  out = out.replace(metaLine, '').trim();
  // Also remove bullet-form meta like "- Language: X"
  const bulletMeta = /^\s*[-*]\s*(Language|Env|Environment|I\/O|IO|Tech\s*stack|Runtime|Tools?|Editor|IDE)\s*:\s*.*$/gim;
  out = out.replace(bulletMeta, '').trim();
  // Collapse excess blank lines
  out = out.replace(/\n{3,}/g, '\n\n');
  return out;
}

// Remove meta-level output formatting directives such as
// "Output should be in markdown format." or "Respond in JSON format."
function removeOutputFormatDirectives(text: string): string {
  let out = text;
  const patterns: RegExp[] = [
    /^\s*(Output|The output|Your output)\s+should\s+be\s+in\s+(markdown|json|plain)(\s+format)?\.?\s*$/gim,
    /^\s*(Output|Answer|Respond|Reply)\s+(in|as)\s+(markdown|json|plain)(\s+format)?\.?\s*$/gim,
    /^\s*(Provide|Return)\s+(the\s+)?(output|result|response)\s+(in|as)\s+(markdown|json|plain)(\s+format)?\.?\s*$/gim,
    /^\s*(Format|Formatting)\s*:\s*(markdown|json|plain)\s*$/gim,
    /^\s*Use\s+(markdown|json|plain)\s+(format|formatting)\s*(for\s+the\s+output)?\.?\s*$/gim,
  ];
  for (const re of patterns) {
    out = out.replace(re, '').trim();
  }
  // Collapse excess blank lines created by removals
  out = out.replace(/\n{3,}/g, '\n\n');
  return out;
}

// Remove short conversational lead-ins (e.g., "Sure, here's the prompt:")
function stripCommonPrefaces(text: string): { result: string; removed: boolean } {
  let s = text;
  let removed = false;
  for (let i = 0; i < 2; i++) {
    const firstLine = s.split(/\r?\n/, 1)[0] ?? '';
    const isPreface = /^\s*(sure|okay|alright)\b/i.test(firstLine) ||
      /^\s*here('?s)?\b/i.test(firstLine) ||
      /^\s*below\b/i.test(firstLine) ||
      /^\s*i\s+(will|can|have)\b/i.test(firstLine) ||
      /^\s*let('?s)?\b/i.test(firstLine);
    if (isPreface && firstLine.length <= 120) {
      const rest = s.substring(firstLine.length).replace(/^\r?\n/, '');
      s = rest;
      removed = true;
      continue;
    }
    break;
  }
  return { result: s, removed };
}

function extractTopLevelJson(text: string): string | null {
  const s = text;
  let start = -1;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i] as string;
    if (inString) {
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') { inString = false; continue; }
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
      continue;
    }
    if (ch === '}') {
      if (depth > 0) depth--;
      if (depth === 0 && start !== -1) {
        const candidate = s.slice(start, i + 1).trim();
        try { JSON.parse(candidate); return candidate; } catch { /* try next */ }
        start = -1;
      }
    }
  }
  return null;
}

function toPlainFromMarkdown(text: string): string {
  let out = text;
  // Unfence any blocks (keep content, drop fences)
  out = out.replace(/```[a-zA-Z0-9_-]*\r?\n([\s\S]*?)\r?\n```/g, '$1');
  // Drop images entirely
  out = out.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
  // Convert headings to plain lines
  out = out.replace(/^\s{0,3}#{1,6}\s+/gm, '');
  // Remove emphasis markers
  out = out.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/_([^_]+)_/g, '$1');
  // Remove inline code backticks
  out = out.replace(/`([^`]+)`/g, '$1');
  // Normalize bullet prefixes (keep a dash)
  out = out.replace(/^\s*[-*+]\s+/gm, '- ');
  // Collapse quotes to plain
  out = out.replace(/^\s*>\s?/gm, '');
  // Trim excess blank lines to max 2
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

function keepPreferredMarkdown(text: string): string {
  let out = text;
  // If entire thing is fenced as markdown, unwrap
  const f = stripOuterFence(out);
  if (f.stripped) out = f.inner;
  // Remove any legacy "Output Contract" blocks or headings that leaked from older prompts
  out = out.replace(/^#+\s*Output\s+Contract[\s\S]*?$(\n)?/gim, '').trim();
  // Remove fenced JSON blocks entirely
  out = removeFencedBlocksByLang(out, 'json');
  // If there are labeled sections, prefer the markdown one
  const lines = out.split(/\r?\n/);
  const jsonHeadingIdx = lines.findIndex(l => /^\s*#{1,6}\s*JSON\s*Format\s*$/i.test(l));
  const mdHeadingIdx = lines.findIndex(l => /^\s*#{1,6}\s*Markdown\s*Format\s*$/i.test(l));
  if (jsonHeadingIdx !== -1 || mdHeadingIdx !== -1) {
    const cut = Math.min(...[jsonHeadingIdx, mdHeadingIdx].filter(i => i !== -1));
    const before = lines.slice(0, cut).join('\n').trim();
    if (before.length >= 80 || before.split(/\n/).filter(Boolean).length >= 3) {
      out = before;
    } else if (mdHeadingIdx !== -1) {
      // Keep from Markdown Format heading onward, but drop the heading label itself
      const tail = lines.slice(mdHeadingIdx + 1).join('\n');
      out = tail.trim();
    }
  }
  // Trim excess blank lines
  out = out.replace(/\n{3,}/g, '\n\n').trim();
  return out;
}

function unwrapJsonIfSinglePromptObject(raw: string): string | null {
  const trimmed = raw.trim();
  if (!/^\{[\s\S]*\}$/.test(trimmed)) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      const candidate = (parsed.prompt || parsed.image_prompt || parsed.text || parsed.data);
      if (typeof candidate === 'string') return candidate.trim();
    }
  } catch { /* ignore */ }
  return null;
}

export function sanitizeAndDetectDrift(taskType: TaskType, options: GenerationOptions | undefined, rawOutput: string): SanitizationResult {
  const driftReasons: string[] = [];
  const requestedFormat = options?.format || 'plain';
  let cleaned = String(rawOutput ?? '');

  if (requestedFormat === 'json') {
    // Unwrap outer fence if entire content is fenced
    const f = stripOuterFence(cleaned);
    if (f.stripped) { cleaned = f.inner; driftReasons.push('removed_json_fences'); }
    // Prefer extracting a valid top-level JSON
    let jsonCandidate: string | null = null;
    const direct = cleaned.trim();
    if (direct.startsWith('{') && direct.endsWith('}')) {
      try { JSON.parse(direct); jsonCandidate = direct; } catch { /* ignore */ }
    }
    if (!jsonCandidate) {
      // Look for fenced JSON blocks
      const match = /```json\r?\n([\s\S]*?)\r?\n```/i.exec(cleaned);
      if (match && match[1]) {
        const inner = match[1].trim();
        try { JSON.parse(inner); jsonCandidate = inner; driftReasons.push('extracted_json_block'); } catch { /* ignore */ }
      }
    }
    if (!jsonCandidate) {
      const extracted = extractTopLevelJson(cleaned);
      if (extracted) { jsonCandidate = extracted; driftReasons.push('extracted_top_level_json'); }
    }
    if (jsonCandidate) cleaned = jsonCandidate;
    // Validate JSON (for reporting only)
    try { JSON.parse(cleaned.trim()); } catch { driftReasons.push('invalid_json_format'); }
    // Wrap in JSON code block for proper display
    return { cleaned: `\`\`\`json\n${cleaned.trim()}\n\`\`\``, driftReasons };
  }

  if (requestedFormat === 'markdown') {
    // Strip conversational prefaces
    const pre = stripCommonPrefaces(cleaned);
    if (pre.removed) driftReasons.push('removed_preface');
    cleaned = pre.result;
    // For coding prompts, remove any code blocks (answers)
    if (taskType === 'coding') {
      const before = cleaned.length;
      cleaned = removeProgrammingFencedBlocks(cleaned);
      if (cleaned.length !== before) driftReasons.push('removed_code_blocks');
    }
    cleaned = keepPreferredMarkdown(cleaned);
    if (taskType === 'coding') {
      const beforeMeta = cleaned.length;
      cleaned = removeCodingMetaLines(cleaned);
      if (cleaned.length !== beforeMeta) driftReasons.push('removed_coding_meta_lines');
    }
    // Ensure no JSON fenced blocks remain
    cleaned = removeFencedBlocksByLang(cleaned, 'json');
    // Remove simple "Prompt:" labels
    cleaned = cleaned.replace(/^\s*(Prompt|Final\s+prompt)\s*:\s*/gim, '');
    // Remove any meta-level output format directives
    cleaned = removeOutputFormatDirectives(cleaned);
    // Wrap in markdown code block for proper display
    return { cleaned: `\`\`\`markdown\n${cleaned.trim()}\n\`\`\``, driftReasons };
  }

  // Plain text: remove markdown constructs conservatively
  // Remove only clear "Prompt:" or "Image prompt:" prefixes
  // Strip conversational prefaces first
  {
    const pre = stripCommonPrefaces(cleaned);
    if (pre.removed) driftReasons.push('removed_preface');
    cleaned = pre.result;
  }
  // For coding prompts, remove any fenced code blocks entirely
  if (taskType === 'coding') {
    const before = cleaned.length;
    cleaned = removeProgrammingFencedBlocks(cleaned);
    if (cleaned.length !== before) driftReasons.push('removed_code_blocks');
  }
  if (taskType === 'coding') {
    const beforeMeta = cleaned.length;
    cleaned = removeCodingMetaLines(cleaned);
    if (cleaned.length !== beforeMeta) driftReasons.push('removed_coding_meta_lines');
  }
  if (/^(prompt|final\s+prompt|image\s+prompt)\s*:\s*/i.test(cleaned.trim())) {
    cleaned = cleaned.replace(/^(prompt|final\s+prompt|image\s+prompt)\s*:\s*/i, '').trim();
    driftReasons.push('removed_prompt_prefix');
  }
  // Remove any meta-level output format directives
  cleaned = removeOutputFormatDirectives(cleaned);
  // Only unwrap JSON if it's clearly a wrapper object with a single prompt field
  const unwrapped = unwrapJsonIfSinglePromptObject(cleaned);
  if (unwrapped && unwrapped.length > cleaned.length * 0.7) {
    cleaned = unwrapped;
    driftReasons.push('unwrapped_json_object');
  }
  cleaned = toPlainFromMarkdown(cleaned);
  return { cleaned, driftReasons };
}
