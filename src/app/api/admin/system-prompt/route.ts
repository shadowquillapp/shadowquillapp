import { NextResponse } from "next/server";
import { env } from "@/env";
import { z } from "zod";

import { auth } from "@/server/auth";
import { readSystemPromptForMode, writeSystemPromptForMode } from "@/server/settings";

// Electron-only: all local users are treated as admin.
function isAdmin(): boolean { return true; }

export async function GET() {
  const session = await auth();
  if (!session?.user || !isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const prompt = (await readSystemPromptForMode("build")) ?? env.GOOGLE_SYSTEM_PROMPT_BUILD ?? env.GOOGLE_SYSTEM_PROMPT ?? "";
  return NextResponse.json({ prompt });
}

const BodySchema = z.object({ prompt: z.string().optional() });

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user || !isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let parsed: z.infer<typeof BodySchema>;
  try {
    parsed = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!parsed.prompt) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  if (parsed.prompt !== undefined) {
    await writeSystemPromptForMode("build", parsed.prompt);
  }
  return NextResponse.json({ ok: true });
}


