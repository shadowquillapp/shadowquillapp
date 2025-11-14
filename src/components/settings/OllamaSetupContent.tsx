"use client";
import React, { useEffect, useMemo, useState } from "react";
import { readLocalModelConfig as readLocalModelConfigClient, writeLocalModelConfig as writeLocalModelConfigClient, validateLocalModelConnection as validateLocalModelConnectionClient, listAvailableModels } from "@/lib/local-config";

type TestResult = null | { success: boolean; url: string; models?: Array<{ name: string; size: number }>; error?: string; duration?: number };

export default function OllamaSetupContent() {
  const [localPort, setLocalPort] = useState<string>("11434");
  const [model, setModel] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [testingLocal, setTestingLocal] = useState(false);
  const [localTestResult, setLocalTestResult] = useState<TestResult>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const cfg = readLocalModelConfigClient();
        if (cfg?.provider === "ollama") {
          const base = String(cfg.baseUrl || "http://localhost:11434");
          const portMatch = base.match(/:(\d{1,5})/);
          setLocalPort(portMatch?.[1] ?? "11434");
          await testLocalConnection(cfg.baseUrl, cfg.model);
        }
      } catch {
        // ignore
      }
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isValidPort = (port: string): boolean => {
    return /^\d{2,5}$/.test((port || "").trim());
  };

  const normalizeToBaseUrl = (value?: string): string => {
    const raw = (value || "").trim();
    if (!raw) return "";
    if (/^\d{1,5}$/.test(raw)) return `http://localhost:${raw}`;
    if (/^localhost:\d{1,5}$/.test(raw)) return `http://${raw}`;
    if (/^https?:\/\//.test(raw)) return raw.replace(/\/$/, "");
    return raw;
  };

  const testLocalConnection = async (baseUrlParam?: string, configuredModel?: string) => {
    const url = normalizeToBaseUrl(baseUrlParam ?? localPort);
    if (!url) return;
    setTestingLocal(true);
    setLocalTestResult(null);
    const start = Date.now();
    try {
      const models = await listAvailableModels(url);
      const duration = Date.now() - start;
      const gemmaModels = models.filter((m) => m?.name && /^gemma3\b/i.test(m.name));
      const gemmaModelNames = gemmaModels.map((m) => m.name);
      setLocalTestResult({ success: true, url, models: gemmaModels, duration });
      setAvailableModels(gemmaModelNames);
      if (configuredModel && gemmaModelNames.includes(configuredModel)) {
        setModel(configuredModel as string);
      } else if (gemmaModelNames.length > 0) {
        setModel(gemmaModelNames[0] ?? "");
      } else {
        setModel("");
      }
    } catch {
      const duration = Date.now() - start;
      setLocalTestResult({ success: false, url, error: "Connection failed", duration });
      setAvailableModels([]);
    } finally {
      setTestingLocal(false);
    }
  };

  const canSave = useMemo(() => {
    return !saving && !validating && model.trim() !== "";
  }, [saving, validating, model]);

  return (
    <form
      data-provider-form="true"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
          const payload = { provider: "ollama", baseUrl: normalizeToBaseUrl(localPort), model };
          writeLocalModelConfigClient(payload as any);
          setValidating(true);
          try {
            const vjson = await validateLocalModelConnectionClient(payload as any);
            if (vjson.ok) {
              setConnectionError(null);
              try {
                window.dispatchEvent(new Event("MODEL_CHANGED"));
              } catch {}
            } else {
              const errorMsg = vjson.error || "Connection failed";
              if (errorMsg === "model-not-found") {
                setConnectionError(`Model "${model}" not found in Ollama. Run: ollama pull ${model}`);
              } else {
                setConnectionError(errorMsg);
              }
            }
          } finally {
            setValidating(false);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
          setSaving(false);
        }
      }}
      className="space-y-4"
    >
      <div style={{ paddingTop: 16, paddingBottom: 16 }}>
        <label className="data-location-label" htmlFor="port">
          Local Ollama port <i>(Default: <b>11434</b>)</i>
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            id="port"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={5}
            value={localPort}
            onChange={(e) => {
              const raw = (e.target.value || "").replace(/\D/g, "").slice(0, 5);
              setLocalPort(raw);
              setLocalTestResult(null);
            }}
            required
            className="md-input"
            placeholder="11434"
            autoComplete="off"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={() => testLocalConnection()}
            disabled={testingLocal || !isValidPort(localPort)}
            className="md-btn md-btn--attention"
            title="Check for available Ollama models"
            style={{ whiteSpace: "nowrap" }}
          >
            {testingLocal ? "Checking…" : "Check for models"}
          </button>
        </div>
        {localTestResult && (
          <div
            className="md-card"
            style={{
              marginTop: 12,
              padding: 0,
              overflow: "hidden",
              borderLeft: localTestResult.success ? "3px solid #10b981" : "3px solid #ef4444",
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                background: localTestResult.success ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
                borderBottom: localTestResult.success && localTestResult.models?.length ? "1px solid rgba(255, 255, 255, 0.05)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: 16,
                    color: localTestResult.success ? "#10b981" : "#ef4444",
                    fontWeight: "bold",
                  }}
                >
                  {localTestResult.success ? "" : "✕"}
                </span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: localTestResult.success ? "#10b981" : "#ef4444",
                      marginBottom: 2,
                    }}
                  >
                    {localTestResult.success ? "Gemma 3 Connection Successful!" : "Connection Failed!"}
                  </div>
                </div>
              </div>
            </div>
            {localTestResult.success && localTestResult.models && localTestResult.models.length > 0 && (
              <div
                style={{
                  padding: "8px 12px",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {localTestResult.models.map((m) => {
                  const size = (m.name.split(":")[1] || "").toUpperCase();
                  const displayName = size ? `Gemma 3 ${size}` : "Gemma 3";
                  const sizeInGB = (m.size / (1024 * 1024 * 1024)).toFixed(1);
                  return (
                    <div
                      key={m.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 12px",
                        borderRadius: 6,
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        transition: "all 0.2s ease",
                        cursor: "default",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(16, 185, 129, 0.1)";
                        e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.05)";
                      }}
                    >
                      <span style={{ color: "#10b981", fontSize: 14, fontWeight: "bold", lineHeight: 1 }}>✓</span>
                      <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }} className="truncate">
                        {displayName}{" "}
                        <code
                          style={{
                            fontFamily: "var(--font-mono, monospace)",
                            opacity: 0.7,
                            fontSize: 11,
                            background: "rgba(255, 255, 255, 0.05)",
                            padding: "2px 4px",
                            borderRadius: 3,
                          }}
                        >
                          {m.name} ({sizeInGB}GB)
                        </code>
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "rgba(16, 185, 129, 0.15)",
                          color: "#10b981",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Ready
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {localTestResult.success && localTestResult.models && localTestResult.models.length === 0 && (
              <div style={{ padding: "12px 16px", fontSize: 12, opacity: 0.6, textAlign: "center" }}>No Gemma models found</div>
            )}
          </div>
        )}
      </div>
      <div className="text-secondary" style={{ fontSize: 14, lineHeight: "18px" }}>
        {availableModels.length === 0 ? (
          <>
            PromptCrafter requires a local Ollama installation with Gemma 3 models for complete privacy.<br />
            <br />
            Click “Check for models” to find available Gemma 3 models in Ollama. <br />
            <br />
            If none are found, install Ollama and pull a compatible Gemma 3 model.
          </>
        ) : (
          <>
            Found{" "}
            <b>
              {availableModels.length} usable model{availableModels.length !== 1 ? "s" : ""}
            </b>
          </>
        )}
      </div>
      {(error || connectionError) && (
        <div className="md-card" style={{ padding: 12, borderLeft: "4px solid #ef4444" }}>
          <div style={{ fontSize: 12 }}>{error || connectionError}</div>
        </div>
      )}
      <div style={{ paddingTop: 8, display: "flex", justifyContent: "flex-end" }}>
        <button disabled={!canSave} className="md-btn md-btn--primary">
          {saving || validating ? "Validating…" : "Save"}
        </button>
      </div>
    </form>
  );
}


