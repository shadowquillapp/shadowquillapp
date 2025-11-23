"use client";
import { useEffect, useRef, useState } from 'react';
import { Icon } from "./Icon";
import { useDialog } from "./DialogProvider";
import { isElectronRuntime } from '@/lib/runtime';
import { readLocalModelConfig as readLocalModelConfigClient, writeLocalModelConfig as writeLocalModelConfigClient, validateLocalModelConnection as validateLocalModelConnectionClient, listAvailableModels } from '@/lib/local-config';
import { ensureDefaultPreset } from '@/lib/presets';
import { ensureSystemPromptBuild, resetSystemPromptBuild, setSystemPromptBuild } from '@/lib/system-prompts';
import Titlebar from './Titlebar';

interface Props { children: React.ReactNode }

interface WindowWithShadowQuill extends Window {
  shadowquill?: {
    checkOllamaInstalled?: () => Promise<{ installed: boolean }>;
    openOllama?: () => Promise<{ ok: boolean; error?: string }>;
  };
}

export default function ModelConfigGate({ children }: Props) {
  // Detect Electron at build/SSR via env; fall back to client runtime detection.
  const initialElectron = typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_ELECTRON === '1' || process.env.ELECTRON === '1');
  const [electronMode, setElectronMode] = useState<boolean>(initialElectron);
  const [fetching, setFetching] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [localPort, setLocalPort] = useState<string>('11434');
  const [model, setModel] = useState<string>('');
  const [provider] = useState<'ollama'>('ollama');
  const [saving, setSaving] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [validating, setValidating] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [previouslyConfigured, setPreviouslyConfigured] = useState(false);
  const [defaultProvider, setDefaultProvider] = useState<'ollama' | null>(null);
  const [hasValidDefault, setHasValidDefault] = useState(false);
  const [showProviderSelection, setShowProviderSelection] = useState(false);
  const [ollamaCheckPerformed, setOllamaCheckPerformed] = useState(false);
  const [showOllamaMissingModal, setShowOllamaMissingModal] = useState(false);
  const [testingLocal, setTestingLocal] = useState(false);
  const [localTestResult, setLocalTestResult] = useState<null | { success: boolean; url: string; models?: Array<{ name: string; size: number }>; error?: string; duration?: number }>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isOpeningOllama, setIsOpeningOllama] = useState(false);
  const [openOllamaError, setOpenOllamaError] = useState<string | null>(null);
  const [ollamaInstalled, setOllamaInstalled] = useState<boolean | null>(null);

  // Client side enhancement
  useEffect(() => {
    if (!electronMode && (isElectronRuntime() || process.env.NEXT_PUBLIC_ELECTRON === '1')) {
      setElectronMode(true);
    }
  }, [electronMode]);

  // Ensure the 'Default' preset exists on startup (idempotent)
  useEffect(() => {
    try { ensureDefaultPreset(); } catch {}
  }, []);

  // Load configuration and default provider on startup
  useEffect(() => {
    if (!electronMode || loadedOnce) return;
    let cancelled = false;
    
    const load = async () => {
      setFetching(true);
      try {
        // Check if Ollama is installed
        await checkOllamaInstalled();
        
        // Load config from local storage
        const cfg = readLocalModelConfigClient();
        if (cancelled) return;

        // Default to Ollama since it's the only option
        setDefaultProvider('ollama');

        // Load existing configuration if available
        if (cfg) {
          setConfig(cfg);
          if (cfg.provider === 'ollama') {
            const base = String(cfg.baseUrl || 'http://localhost:11434');
            const portMatch = base.match(/:(\d{1,5})/);
            setLocalPort(portMatch?.[1] ?? '11434');
            // Load available models immediately
            testLocalConnection(cfg.baseUrl, cfg.model);
          }
          setPreviouslyConfigured(true);

          // Validate loaded config
          try {
            setValidating(true);
            const vr = await validateLocalModelConnectionClient(cfg);
            if (vr.ok) {
              setHasValidDefault(true);
              setConnectionError(null);
              setShowProviderSelection(false);
              return;
            } else {
              setConnectionError(vr.error || 'Connection failed');
            }
          } finally {
            setValidating(false);
          }
        }

        // Show provider selection if no valid default
        setShowProviderSelection(true);
        
      } catch (err) {
        console.error('Failed to load configuration:', err);
        if (!cancelled) {
          setError('Failed to load Gemma 3 configuration');
          setShowProviderSelection(true);
        }
      } finally {
        if (!cancelled) {
          setFetching(false);
          setLoadedOnce(true);
        }
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [electronMode, loadedOnce]);
  
  const gated = electronMode && (fetching || showProviderSelection || (!hasValidDefault && !config));

  // Detect if Ollama is running when provider selection first appears (initial launch, not previously configured)
  useEffect(() => {
    if (!showProviderSelection) return;
    if (previouslyConfigured) return; // don't override existing settings
    if (ollamaCheckPerformed) return; // run once until user retries
    let cancelled = false;
    const detect = async () => {
      setOllamaCheckPerformed(true);
      // Only probe the default URL; if user already changed baseUrl, skip
      const defaultUrl = 'http://localhost:11434';
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(defaultUrl + '/api/tags', { signal: controller.signal });
        clearTimeout(t);
        if (cancelled) return;
        if (!res.ok) throw new Error('status ' + res.status);
        // success -> keep default base URL
      } catch (_err) {
        if (cancelled) return;
        // Not reachable: blank out the URL so user explicitly sets it and show modal
        setLocalPort('');
        setShowOllamaMissingModal(true);
      }
    };
    void detect();
    return () => { cancelled = true; };
  }, [showProviderSelection, provider, previouslyConfigured, ollamaCheckPerformed]);

  // Allow retry from modal
  const retryOllamaDetection = async () => {
    setOllamaCheckPerformed(false);
    setShowOllamaMissingModal(false);
    // trigger effect by manual check immediate
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 2500);
      const res = await fetch('http://localhost:11434/api/tags', { signal: controller.signal });
      clearTimeout(t);
      if (res.ok) {
        setLocalPort('11434');
      } else {
        setLocalPort('');
        setShowOllamaMissingModal(true);
      }
    } catch {
      setLocalPort('');
      setShowOllamaMissingModal(true);
    } finally {
      setOllamaCheckPerformed(true);
    }
  };

  const isValidPort = (port: string): boolean => {
    // Only digits, length between 2 and 5
    return /^\d{2,5}$/.test((port || '').trim());
  };

  const normalizeToBaseUrl = (value?: string): string => {
    const raw = (value || '').trim();
    if (!raw) return '';
    if (/^\d{1,5}$/.test(raw)) return `http://localhost:${raw}`;
    if (/^localhost:\d{1,5}$/.test(raw)) return `http://${raw}`;
    if (/^https?:\/\//.test(raw)) return raw.replace(/\/$/, '');
    return raw;
  };

  const checkOllamaInstalled = async () => {
    try {
      const win = window as WindowWithShadowQuill;
      if (!win.shadowquill?.checkOllamaInstalled) {
        return;
      }
      const result = await win.shadowquill.checkOllamaInstalled();
      setOllamaInstalled(result.installed);
    } catch (e) {
      console.error("Failed to check Ollama installation:", e);
    }
  };

  const handleOpenOrInstallOllama = async () => {
    setIsOpeningOllama(true);
    setOpenOllamaError(null);

    try {
      const win = window as WindowWithShadowQuill;
      
      // Check if installed first
      if (ollamaInstalled === null) {
        await checkOllamaInstalled();
      }

      if (ollamaInstalled === false) {
        // Open download page
        window.open("https://ollama.com/download", "_blank");
        setIsOpeningOllama(false);
        return;
      }

      if (!win.shadowquill?.openOllama) {
        setOpenOllamaError("This feature is only available in the desktop app.");
        return;
      }

      const result = await win.shadowquill.openOllama();

      if (result.ok) {
        // Wait 3 seconds then retest the connection
        setTimeout(() => {
          setOpenOllamaError(null);
          void testLocalConnection();
        }, 3000);
      } else {
        setOpenOllamaError(result.error || "Failed to open Ollama");
      }
    } catch (e: unknown) {
      setOpenOllamaError(e instanceof Error ? e.message : "Failed to open Ollama");
    } finally {
      setIsOpeningOllama(false);
    }
  };

  // Test connection to local Ollama server using specified baseUrl (or current localBaseUrl if not provided)
  // If configuredModel is provided, it will be selected if found in available models
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
      setConnectionError(null); // Clear connection error on success
      if (configuredModel && gemmaModelNames.includes(configuredModel)) {
        setModel(configuredModel as string);
      } else if (gemmaModelNames.length > 0) {
        setModel(gemmaModelNames[0] ?? '');
      } else {
        setModel('');
      }
    } catch (e:any) {
      const duration = Date.now() - start;
      setLocalTestResult({ success: false, url, error: 'Connection failed', duration });
      setAvailableModels([]);
    } finally {
      setTestingLocal(false);
    }
  };

  return (
    <SystemPromptEditorWrapper>
      <DataLocationModalWrapper />
      <OpenProviderSelectionListener onOpen={() => setShowProviderSelection(true)} />
      <div className="relative w-full h-full" data-model-gate={electronMode ? (config ? 'ready' : 'pending') : 'disabled'}>
        {/* Ensure the custom Electron titlebar is ALWAYS visible, even when gated */}
        {electronMode && gated && <Titlebar />}
        {!gated && children}
        {electronMode && gated && (
          <div className="modal-container">
            <div className="modal-backdrop-blur" />
            {((fetching && !loadedOnce) || validating) ? (
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-title">{validating ? 'Validating Gemma 3 connection…' : 'Loading Gemma 3 configuration…'}</div>
                </div>
                <div className="modal-body">
                  <div className="text-secondary text-sm">
                    {validating ? 'Testing your default provider…' : 'Checking for saved settings…'}
                  </div>
                </div>
              </div>
            ) : showProviderSelection ? (
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-title">Ollama Connection Setup</div>
                </div>
                <div className="modal-body">
                  {previouslyConfigured && connectionError && (
                    <div className="md-card" style={{ padding: 12, borderLeft: '4px solid var(--color-primary)' }}>
                      <div style={{ fontSize: 12 }}>
                        Previous configuration detected but connection failed ({connectionError}). Update values and save again.
                      </div>
                    </div>
                  )}
                  <form data-provider-form="true" onSubmit={async (e) => {
                  e.preventDefault();
                  setSaving(true); setError(null);
                  try {
                  const payload = { provider: 'ollama', baseUrl: normalizeToBaseUrl(localPort), model };
                  writeLocalModelConfigClient(payload as any);
                  // After saving validate immediately
                    setValidating(true);
                    try {
                      const vjson = await validateLocalModelConnectionClient(payload as any);
                      if (vjson.ok) {
                        setConfig(payload);
                        setConnectionError(null);
                        setPreviouslyConfigured(true);
                        setShowProviderSelection(false);
                        try { window.dispatchEvent(new Event('MODEL_CHANGED')); } catch {}
                      } else {
                        const errorMsg = vjson.error || 'Connection failed';
                        if (errorMsg === 'model-not-found') {
                          setConnectionError(`Model "${model}" not found in Ollama. Run: ollama pull ${model}`);
                        } else {
                          setConnectionError(errorMsg);
                        }
                      }
                    } finally { setValidating(false); }
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Unknown error');
                  } finally { setSaving(false); }
                }} className="space-y-4">
                    {/* Ollama configuration */}
                    <div style={{ paddingTop: 16, paddingBottom: 16 }}>
                      <label className="data-location-label" htmlFor="port">Local Ollama port <i>(Default: <b>11434</b>)</i></label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          id="port"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={5}
                          value={localPort}
                          onChange={e => {
                            const raw = (e.target.value || '').replace(/\D/g, '').slice(0, 5);
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
                          className="md-btn md-btn--primary"
                          title="Check for available Ollama models"
                          style={{ 
                            whiteSpace: 'nowrap', 
                            padding: 0, 
                            aspectRatio: '1',
                            height: '100%',
                            minWidth: '46px',
                            borderRadius: '12px'
                          }}
                          aria-label="Check for available Ollama models"
                        ><Icon name="refresh" /></button>
                      </div>
                      {localTestResult && (
                        <div className="md-card" style={{ 
                          marginTop: 12, 
                          padding: 0,
                          overflow: 'hidden',
                          borderLeft: localTestResult.success ? '3px solid #10b981' : '3px solid #ef4444'
                        }}>
                          <div style={{ 
                            padding: '12px 16px',
                            background: localTestResult.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                            borderBottom: localTestResult.success && localTestResult.models?.length ? '1px solid rgba(255, 255, 255, 0.05)' : 'none'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ 
                                fontSize: 16, 
                                color: localTestResult.success ? '#10b981' : '#ef4444',
                                fontWeight: 'bold'
                              }}>
                                {localTestResult.success ? '' : '✕'}
                              </span>
                              <div style={{ flex: 1 }}>
                                <div style={{ 
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: localTestResult.success ? '#10b981' : '#ef4444',
                                  marginBottom: 2
                                }}>
                                  {localTestResult.success ? 'Gemma 3 Connection Successful!' : 'Connection Failed!'}
                                </div>
                              </div>
                              {!localTestResult.success && (
                                <button
                                  type="button"
                                  onClick={handleOpenOrInstallOllama}
                                  disabled={isOpeningOllama}
                                  className="md-btn md-btn--primary"
                                  style={{ 
                                    fontSize: 12, 
                                    padding: "6px 12px",
                                    opacity: isOpeningOllama ? 0.5 : 1,
                                    whiteSpace: "nowrap"
                                  }}
                                  title={ollamaInstalled === false ? "Install Ollama from ollama.com" : "Launch Ollama application"}
                                >
                                  {isOpeningOllama ? "Opening..." : (ollamaInstalled === false ? "Install Ollama" : "Open Ollama")}
                                </button>
                              )}
                            </div>
                            {openOllamaError && (
                              <div style={{ 
                                marginTop: 8, 
                                padding: 8, 
                                background: "rgba(239, 68, 68, 0.1)", 
                                borderRadius: 4,
                                fontSize: 12,
                                color: "#ef4444"
                              }}>
                                {openOllamaError}
                              </div>
                            )}
                          </div>
                          {localTestResult.success && localTestResult.models && localTestResult.models.length > 0 && (
                            <div style={{ 
                              padding: '8px 12px',
                              maxHeight: 180, 
                              overflowY: 'auto',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6
                            }}>
                              {localTestResult.models.map((m, idx) => {
                                const size = (m.name.split(':')[1] || '').toUpperCase();
                                const displayName = size ? `Gemma 3 ${size}` : 'Gemma 3';
                                const sizeInGB = (m.size / (1024 * 1024 * 1024)).toFixed(1);
                                return (
                                  <div 
                                    key={m.name} 
                                    style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: 10, 
                                      padding: '8px 12px',
                                      borderRadius: 6,
                                      background: 'rgba(255, 255, 255, 0.02)',
                                      border: '1px solid rgba(255, 255, 255, 0.05)',
                                      transition: 'all 0.2s ease',
                                      cursor: 'default'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                                      e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                                    }}
                                  >
                                    <span style={{ 
                                      color: '#10b981', 
                                      fontSize: 14, 
                                      fontWeight: 'bold',
                                      lineHeight: 1
                                    }}>✓</span>
                                    <span style={{ 
                                      fontSize: 13,
                                      fontWeight: 500,
                                      flex: 1
                                    }} className="truncate">
                                      {displayName} <code style={{ 
                                        fontFamily: 'var(--font-mono, monospace)',
                                        opacity: 0.7,
                                        fontSize: 11,
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        padding: '2px 4px',
                                        borderRadius: 3
                                      }}>{m.name} ({sizeInGB}GB)</code>
                                    </span>
                                    <span style={{
                                      fontSize: 10,
                                      padding: '2px 6px',
                                      borderRadius: 4,
                                      background: 'rgba(16, 185, 129, 0.15)',
                                      color: '#10b981',
                                      fontWeight: 600,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px'
                                    }}>Ready</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {localTestResult.success && localTestResult.models && localTestResult.models.length === 0 && (
                            <div style={{ padding: '12px 16px', fontSize: 12, opacity: 0.6, textAlign: 'center' }}>
                              No Gemma models found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-secondary" style={{ fontSize: 14, lineHeight: '18px' }}>
                      {availableModels.length === 0 ? (
                        <>ShadowQuill requires a local Ollama installation with Gemma 3 models for complete privacy.<br/><br/>Click “Check for models” to find available Gemma 3 models in Ollama. <br/><br/>If none are found, install Ollama and pull a compatible Gemma 3 model.</>
                      ) : (
                        <>Found <b>{availableModels.length} usable model{availableModels.length !== 1 ? 's' : ''}</b>. Auto selecting: <code style={{ fontSize: 13 }}>{model}</code> <code style={{ fontSize: 11 }}>(You can change this later from within the app)</code></>
                      )}
                    </div>
                
                    <div style={{ paddingTop: 16 }}>
                      <button 
                        disabled={saving || validating || (!model || model.trim() === '')}
                        className="md-btn md-btn--primary"
                        style={{ 
                          width: '100%',
                          padding: '16px 24px',
                          fontSize: '15px',
                          fontWeight: 600,
                          letterSpacing: '0.02em',
                          boxShadow: 'var(--shadow-2)',
                          transition: 'all 150ms ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px'
                        }}
                        title={(!model || model.trim() === '') ? 'Please check for models first' : undefined}
                      >
                        {saving || validating ? 'Validating…' : (
                          <>
                            Start ShadowQuill
                            <Icon name="chevron-right" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : null}
            {showOllamaMissingModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop-blur">
                <div className="w-full max-w-lg rounded-xl border border-surface-a40 bg-surface-a10 p-6 text-light shadow-2xl" style={{ backgroundColor: '#1e2028', borderColor: '#2d3039' }}>
                  <h2 className="mb-3 text-lg font-semibold text-primary-300">Ollama Not Detected</h2>
                  <div className="mb-4 space-y-3 text-sm text-surface-400">
                    <p>Hmm you don't seem to have <strong>Ollama</strong> running or installed.</p>
                    <p>Make sure it is open and running in the background with your <code>gemma3</code> models pulled and downloaded.</p>
                    <p>If you don't have Ollama, download it here: <a className="text-primary-300 underline" href="https://ollama.com/download" target="_blank" rel="noreferrer">https://ollama.com/download</a></p>
                    <p className="text-[11px] text-surface-400">After installing & starting Ollama, pull a model e.g.: <code>ollama pull gemma3:1b</code></p>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <button onClick={() => setShowOllamaMissingModal(false)} className="flex-1 rounded-md bg-surface-200 py-2 text-sm font-medium hover:bg-surface-300 interactive-glow"><Icon name="close" /></button>
                    <button onClick={retryOllamaDetection} className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-light hover:bg-primary-200 interactive-glow">Retry Detection</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </SystemPromptEditorWrapper>
  );
}

function SystemPromptEditorWrapper({ children }: { children: React.ReactNode }) {
  const { confirm } = useDialog();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      try {
        // Load from local storage
        try {
          const value = ensureSystemPromptBuild();
          setPrompt(value);
        } catch { setPrompt(''); }
      } finally { setLoading(false); }
    };
    void load();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = textareaRef.current;
    if (!el) return;
    const MIN_HEIGHT = 200;
    const MAX_HEIGHT = 520;
    el.style.height = 'auto';
    const scrollHeight = el.scrollHeight;
    const nextHeight = Math.min(Math.max(scrollHeight, MIN_HEIGHT), MAX_HEIGHT);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden';
  }, [prompt, open]);

  return (
    <>
  {/* System Prompt open controlled via global event */}
  <OpenSystemPromptsListener onOpen={() => setOpen(true)} />
      {children}
      {open && (
        <div className="modal-container">
          <div className="modal-backdrop-blur" onClick={() => setOpen(false)} />
          <div className="modal-content modal-content--large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Edit System Prompt</div>
              <button onClick={() => setOpen(false)} className="md-btn" style={{ padding: '6px 10px' }}><Icon name="close" /></button>
            </div>
            <div className="modal-body">
              <div className="system-prompts-container">
                {loading ? <div className="text-sm">Loading…</div> : (
                  <form className="system-prompts-form" onSubmit={async (e) => {
                    e.preventDefault();
                    setSaving(true); setError(null);
                    try {
                      const normalized = setSystemPromptBuild(prompt);
                      setPrompt(normalized);
                      setOpen(false);
                    } catch (err:any) { setError(err.message || 'Unknown error'); } finally { setSaving(false); }
                  }}>
                    <div className="system-prompts-field">
                      <label className="system-prompts-label">System Prompt</label>
                      <textarea
                        ref={textareaRef}
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        className="system-prompts-textarea"
                      />
                    </div>
                    {error && <div className="system-prompts-error">{error}</div>}
                    <div className="system-prompts-actions">
                      <div className="system-prompts-actions-left">
                        <button
                          type="button"
                          onClick={async () => {
                            const ok = await confirm({ title: 'Restore Default', message: 'Restore default system prompt? This will overwrite your current edits.', confirmText: 'Restore', cancelText: 'Cancel' });
                            if (!ok) return;
                            setSaving(true); setError(null);
                            try {
                              const def = resetSystemPromptBuild();
                              setPrompt(def);
                            } catch (err:any) {
                              setError(err.message || 'Unknown error');
                            } finally { setSaving(false); }
                          }}
                          className="md-btn md-btn--attention"
                        >Restore Default</button>
                      </div>
                      <div className="system-prompts-actions-right">
                        <button type="button" onClick={() => setOpen(false)} className="md-btn">Cancel</button>
                        <button disabled={saving} className="md-btn md-btn--primary">{saving ? 'Saving…' : 'Save'}</button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function OpenSystemPromptsListener({ onOpen }: { onOpen: () => void }) {
  useEffect(() => {
    const handler = () => onOpen();
    window.addEventListener('open-system-prompts', handler as any);
    return () => window.removeEventListener('open-system-prompts', handler as any);
  }, [onOpen]);
  return null;
}

function OpenProviderSelectionListener({ onOpen }: { onOpen: () => void }) {
  useEffect(() => {
    const handler = () => onOpen();
    window.addEventListener('open-provider-selection', handler as any);
    return () => window.removeEventListener('open-provider-selection', handler as any);
  }, [onOpen]);
  return null;
}

function DataLocationModalWrapper() {
  const { confirm } = useDialog();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paths, setPaths] = useState<null | {
    userData?: string;
    localStorageDir?: string;
    localStorageLevelDb?: string;
  }>(null);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-data-location', handler as any);
    return () => window.removeEventListener('open-data-location', handler as any);
  }, []);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const api = (window as any).shadowquill;
        if (!api?.getDataPaths) {
          setPaths(null);
          setError('Not available outside the desktop app');
          return;
        }
        let res: any = null;
        try {
          res = await api.getDataPaths();
        } catch (e: any) {
          const msg = String(e?.message || '');
          if (msg.includes('No handler registered')) {
            setPaths(null);
            setError('Main process not updated yet. Please fully quit and relaunch the app.');
            return;
          }
          throw e;
        }
        if (res?.ok) {
          setPaths({
            userData: res.userData,
            localStorageDir: res.localStorageDir,
            localStorageLevelDb: res.localStorageLevelDb,
          });
        } else {
          setError(res?.error || 'Failed to load data paths');
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load data paths');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [open]);

  return (
    <>
      {open && (
        <div className="modal-container">
          <div className="modal-backdrop-blur" onClick={() => setOpen(false)} />
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Local Data Management</div>
              <button onClick={() => setOpen(false)} className="md-btn" style={{ padding: '6px 10px' }}><Icon name="close" /></button>
            </div>
            <div className="modal-body">
              {loading ? (
                <div className="text-sm">Loading…</div>
              ) : (
                <div className="space-y-3">
                  {error && <div className="md-card" style={{ padding: 12, borderLeft: '4px solid #ef4444' }}>
                    <div style={{ fontSize: 12 }}>{error}</div>
                  </div>}
                  <div className="md-card" style={{ padding: 12 }}>
                    <div className="text-sm text-secondary" style={{ marginBottom: 8 }}>Electron Profile (userData)</div>
                    <code style={{ fontSize: 12, wordBreak: 'break-all' }}>{paths?.userData || 'Unknown'}</code>
                  </div>
                  <div className="md-card" style={{ padding: 12 }}>
                    <div className="text-sm text-secondary" style={{ marginBottom: 8 }}>Local Storage (LevelDB)</div>
                    <code style={{ fontSize: 12, wordBreak: 'break-all' }}>{paths?.localStorageLevelDb || paths?.localStorageDir || 'Unknown'}</code>
                  </div>
                  <div className="md-card" style={{ padding: 12, borderLeft: '4px solid #ef4444' }}>
                    <div className="text-sm" style={{ marginBottom: 8, color: '#ef4444' }}><b>Reset Application</b></div>
                    <div className="text-xs text-secondary" style={{ marginBottom: 10 }}>
                      This will delete all local data (settings, chats, presets) PERMANENTLY. Only use this if you want to start fresh.
                    </div>
                    <button
                      className="md-btn md-btn--destructive"
                      onClick={async () => {
                        const ok = await confirm({ title: 'Factory Reset', message: 'Delete ALL local data and restart?', confirmText: 'Delete & Restart', cancelText: 'Cancel', tone: 'destructive' });
                        if (!ok) return;
                        setLoading(true); setError(null);
                        try {
                          const api = (window as any).shadowquill;
                          const res = await api?.factoryReset?.();
                          if (!res?.ok) {
                            setError(res?.error || 'Reset failed');
                            setLoading(false);
                            return;
                          }
                          await api?.restartApp?.();
                        } catch (e: any) {
                          setError(e?.message || 'Reset failed');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      style={{ padding: '6px 10px', color: '#ef4444', marginRight: 30, borderColor: '#ef4444' }}
                    >
                      <b>DELETE ALL LOCAL DATA</b>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

