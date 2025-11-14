"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDialog } from "../DialogProvider";

interface Props {
  onSaved?: () => void;
  onCancelReset?: () => void;
}

export default function SystemPromptEditorContent({ onSaved, onCancelReset }: Props) {
  const { confirm } = useDialog();
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [initialPrompt, setInitialPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const p = (typeof window !== "undefined" ? localStorage.getItem("SYSTEM_PROMPT_BUILD") : null) || "";
        setPrompt(p);
        setInitialPrompt(p);
      } catch {
        setPrompt("");
        setInitialPrompt("");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const MIN_HEIGHT = 200;
    el.style.height = "auto";
    const scrollHeight = el.scrollHeight;
    const nextHeight = Math.max(scrollHeight, MIN_HEIGHT);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = "hidden";
  }, [prompt]);

  const isDirty = useMemo(() => prompt !== initialPrompt, [prompt, initialPrompt]);

  if (loading) {
    return <div className="text-sm">Loading…</div>;
  }

  return (
    <div className="system-prompts-container">
      <form
        className="system-prompts-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setError(null);
          try {
            try {
              if (typeof window !== "undefined") localStorage.setItem("SYSTEM_PROMPT_BUILD", prompt || "");
            } catch {}
            setInitialPrompt(prompt);
            onSaved?.();
          } catch (err: any) {
            setError(err.message || "Unknown error");
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="system-prompts-field">
          <label className="system-prompts-label">System Prompt</label>
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="system-prompts-textarea"
          />
        </div>
        {error && <div className="system-prompts-error">{error}</div>}
        <div className="system-prompts-actions">
          <div className="system-prompts-actions-left">
            <button
              type="button"
              onClick={async () => {
                const ok = await confirm({
                  title: "Restore Default",
                  message: "Restore default system prompt? This will overwrite your current edits.",
                  confirmText: "Restore",
                  cancelText: "Cancel",
                });
                if (!ok) return;
                setSaving(true);
                setError(null);
                try {
                  const def = `You are PromptCrafter, an expert at authoring high-performance prompts for AI models.

Goal:
- Create a single, self-contained prompt from scratch that achieves the user's objective.

Behavior:
- Strictly obey any provided Mode, Task type, and Constraints.
- Incorporate tone, detail level, audience, language, and formatting requirements.
- Be precise, unambiguous, and concise; avoid filler and meta commentary.

Structure the final prompt (no extra explanation):
1) Instruction to the assistant (clear objective and role)
2) Inputs to consider (summarize and normalize the user input)
3) Steps/Policy (how to think, what to do, what to avoid)
4) Constraints and acceptance criteria (must/should; edge cases)
5) Output format (structure; if JSON is requested, specify keys and rules only)

Rules:
- Do not include code fences or rationale.
- Prefer measurable criteria over vague language.
- Ensure output is ready for direct copy-paste.`;
                  try {
                    if (typeof window !== "undefined") localStorage.setItem("SYSTEM_PROMPT_BUILD", def);
                  } catch {}
                  setPrompt(def);
                  setInitialPrompt(def);
                } catch (err: any) {
                  setError(err.message || "Unknown error");
                } finally {
                  setSaving(false);
                }
              }}
              className="md-btn md-btn--attention"
            >
              Restore Default
            </button>
          </div>
          <div className="system-prompts-actions-right">
            <button
              type="button"
              onClick={() => {
                if (isDirty) setPrompt(initialPrompt);
                onCancelReset?.();
              }}
              className="md-btn"
            >
              Cancel
            </button>
            <button disabled={saving} className="md-btn md-btn--primary">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}


