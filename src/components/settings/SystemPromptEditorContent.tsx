"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDialog } from "../DialogProvider";
import { ensureSystemPromptBuild, resetSystemPromptBuild, setSystemPromptBuild } from "@/lib/system-prompts";

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
        const initial = ensureSystemPromptBuild();
        setPrompt(initial);
        setInitialPrompt(initial);
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
            const normalized = setSystemPromptBuild(prompt);
            setInitialPrompt(normalized);
            setPrompt(normalized);
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
                  const def = resetSystemPromptBuild();
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
              Undo
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


