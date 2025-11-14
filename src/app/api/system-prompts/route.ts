import { NextResponse } from 'next/server';
import { auth } from '@/server/auth';
import { readSystemPromptForMode, writeSystemPromptForMode } from '@/server/settings';
import { ensureSystemPromptsDefaultFile, initializeSystemPrompts } from '@/server/storage/system-prompts-init';

// Ensure system prompt is never empty (single prompt)
const DEFAULT_PROMPT = `You are PromptCrafter, an expert at authoring high performance prompts for AI models.

Goal:
- Create a single, self contained prompt from scratch that achieves the user's objective, or refine existing prompt content when provided.

Behavior:
- Strictly obey any provided Task type and Constraints.
- Incorporate tone, detail level, audience, language, and formatting requirements.
- Be precise, unambiguous, and concise; avoid filler and meta commentary.

Adaptation:
- If the user provides an existing prompt, improve it while preserving intent and tightening scope.
- If the user asks for direct technical help (code/UI), provide actionable code and explanation instead of a prompt.

Structure for prompt creation or enhancement (no extra explanation):
1) Instructions (clear objective and role)
2) Inputs to consider (summarize and normalize the user input)
3) Steps/Policy (how to think, what to do, what to avoid)
4) Constraints and acceptance criteria (must/should; edge cases)

Rules:
- Do not include code fences or rationale.
- Prefer measurable criteria over vague language.
- When constraints conflict, prioritize explicit Constraints, then Task type guidelines, then general quality.`;

export async function GET() {
  console.log('[api/system-prompts] GET request received');
  const isElectron = !!(process as any)?.versions?.electron || process.env.ELECTRON === '1' || process.env.NEXT_PUBLIC_ELECTRON === '1';
  const session = await auth();
  if (!isElectron && !session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    // Try to initialize system prompts first to ensure they exist
    await initializeSystemPrompts();
    
    // Read single prompt from settings (use build as the unified prompt)
    let prompt = await readSystemPromptForMode('build');
    
    // Ensure prompt is never empty
    if (!prompt || prompt.trim() === '') {
      console.log('[api/system-prompts] System prompt is empty, using default');
      prompt = DEFAULT_PROMPT;
      // Try to save the default
      try {
        await writeSystemPromptForMode('build', DEFAULT_PROMPT);
      } catch (e) {
        console.error('[api/system-prompts] Failed to write default system prompt:', e);
      }
    }
    
    console.log('[api/system-prompts] Returning prompt length:', prompt?.length || 0);
    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('[api/system-prompts] Error in GET:', error);
    // If all else fails, return hardcoded defaults
    return NextResponse.json({ prompt: DEFAULT_PROMPT, error: 'Using fallback prompt due to error' });
  }
}

export async function PUT(req: Request) {
  console.log('[api/system-prompts] PUT request received');
  const isElectron = !!(process as any)?.versions?.electron || process.env.ELECTRON === '1' || process.env.NEXT_PUBLIC_ELECTRON === '1';
  const session = await auth();
  if (!isElectron && !session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const body = await req.json().catch(() => ({}));
    
    console.log('[api/system-prompts] Updating prompt, length:', body.prompt?.length || 0);
    if (typeof body.prompt === 'string') {
      if (body.prompt.trim() === '') {
        console.warn('[api/system-prompts] Attempted to save empty system prompt, using default instead');
        await writeSystemPromptForMode('build', DEFAULT_PROMPT);
      } else {
        await writeSystemPromptForMode('build', body.prompt);
      }
    } else {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/system-prompts] Error in PUT:', error);
    return NextResponse.json({ error: 'Failed to update system prompts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  console.log('[api/system-prompts] POST request received');
  const isElectron = !!(process as any)?.versions?.electron || process.env.ELECTRON === '1' || process.env.NEXT_PUBLIC_ELECTRON === '1';
  const session = await auth();
  if (!isElectron && !session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const body = await req.json().catch(() => ({}));
    
    if (body?.action === 'reset') {
      console.log('[api/system-prompts] Resetting to defaults');
      // First try to get defaults from file
      try {
        // Load defaults from the system-prompts-default.json file
        const defaults = await ensureSystemPromptsDefaultFile();
        await writeSystemPromptForMode('build', defaults.build);
        return NextResponse.json({ ok: true, reset: true, prompt: defaults.build });
      } catch (error) {
        console.error('[api/system-prompts] Error resetting to defaults from file:', error);
        // If that fails, use hardcoded defaults
        await writeSystemPromptForMode('build', DEFAULT_PROMPT);
        return NextResponse.json({ ok: true, reset: true, prompt: DEFAULT_PROMPT, note: 'Using hardcoded default due to error' });
      }
    }
    
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[api/system-prompts] Error in POST:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
