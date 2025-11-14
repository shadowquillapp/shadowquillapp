"use client";
import { useEffect, useState } from 'react';
import { isElectronRuntime } from '@/lib/runtime';
import { CustomSelect } from './CustomSelect';
import Titlebar from './Titlebar';

interface Props { children: React.ReactNode }

export default function ModelConfigGate({ children }: Props) {
  // Detect Electron at build/SSR via env; fall back to client runtime detection.
  const initialElectron = typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_ELECTRON === '1' || process.env.ELECTRON === '1');
  const [electronMode, setElectronMode] = useState<boolean>(initialElectron);
  const [fetching, setFetching] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  // Store Ollama base URL separately so API provider never overwrites user local choice
  const [localBaseUrl, setLocalBaseUrl] = useState('http://localhost:11434');
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
  const [setAsDefault, setSetAsDefault] = useState(false);
  // Legacy DB reset state removed (no longer using SQLite); keep placeholders if needed for future migration features
  // const [resettingDb, setResettingDb] = useState(false);
  // const [resetNote, setResetNote] = useState<string | null>(null);
  // const [showRestartModal, setShowRestartModal] = useState(false);
  // Ollama detection state
  const [ollamaCheckPerformed, setOllamaCheckPerformed] = useState(false);
  const [showOllamaMissingModal, setShowOllamaMissingModal] = useState(false);
  // Local test state for Ollama connection (mirrors Local Gemma3 Models modal behavior)
  const [testingLocal, setTestingLocal] = useState(false);
  const [localTestResult, setLocalTestResult] = useState<null | { success: boolean; url: string; models?: string[]; error?: string; duration?: number }>(null);
  // Available models from Ollama
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // Client side enhancement: if we didn't know on SSR, detect now (may cause gating AFTER first paint in rare cases where env var missing) but we avoid unmounting children if already rendered to prevent hydration mismatch warnings.
  useEffect(() => {
    if (!electronMode && (isElectronRuntime() || process.env.NEXT_PUBLIC_ELECTRON === '1')) {
      setElectronMode(true);
    }
  }, [electronMode]);

  // Load configuration and default provider on startup
  useEffect(() => {
    if (!electronMode || loadedOnce) return;
    let cancelled = false;
    
    const load = async () => {
      setFetching(true);
      try {
        // Load both config and default provider preference
        const configRes = await fetch('/api/model/config').catch(() => null);

        if (cancelled) return;

        // Default to Ollama since it's the only option
        setDefaultProvider('ollama');

        // Load existing configuration if available
        if (configRes?.ok) {
          try {
            const configData = await configRes.json();
            if (configData?.config) {
              setConfig(configData.config);
              if (configData.config.provider === 'ollama') {
                setLocalBaseUrl(configData.config.baseUrl || 'http://localhost:11434');
                // Store the configured model, but don't set it as selected until we check availability
                const configuredModel = configData.config.model;
                
                // Load available models immediately
                testLocalConnection(configData.config.baseUrl, configuredModel);
              }
              setPreviouslyConfigured(true);

              // Always validate loaded config; only proceed if validation passes
              try {
                setValidating(true);
                const validateRes = await fetch('/api/model/validate');
                if (validateRes.ok) {
                  const validateData = await validateRes.json();
                  if (validateData.ok) {
                    setHasValidDefault(true);
                    setConnectionError(null);
                    setShowProviderSelection(false);
                    return;
                  } else {
                    setConnectionError(validateData.error || 'Connection failed');
                  }
                } else {
                  setConnectionError('Connection failed');
                }
              } catch (e) {
                setConnectionError('Connection failed');
              } finally {
                setValidating(false);
              }
            }
          } catch (e) {
            console.warn('Failed to parse config response:', e);
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

  // App is gated if we're in electron mode and either:
  // 1. Still loading, OR
  // 2. Need to show provider selection, OR  
  // 3. Don't have a valid config yet
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
        setLocalBaseUrl('');
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
        setLocalBaseUrl('http://localhost:11434');
      } else {
        setLocalBaseUrl('');
        setShowOllamaMissingModal(true);
      }
    } catch {
      setLocalBaseUrl('');
      setShowOllamaMissingModal(true);
    } finally {
      setOllamaCheckPerformed(true);
    }
  };

  // Test connection to local Ollama server using specified baseUrl (or current localBaseUrl if not provided)
  // If configuredModel is provided, it will be selected if found in available models
  const testLocalConnection = async (baseUrlParam?: string, configuredModel?: string) => {
    const url = (baseUrlParam || localBaseUrl || '').replace(/\/$/, '');
    if (!url) return;
    
    setTestingLocal(true);
    setLocalTestResult(null);
    const start = Date.now();
    
    try {
      const res = await fetch(`/api/model/available?baseUrl=${encodeURIComponent(url)}`);
      const data = await res.json().catch(() => ({}));
      const duration = Date.now() - start;
      
      if (data.error) {
        setLocalTestResult({ success: false, url, error: data.error, duration });
        setAvailableModels([]);
      } else {
        const models = data.available || [];
        setLocalTestResult({ success: true, url, models, duration });
        setAvailableModels(models);
        
        // If a configured model was provided, set it if it's in the available models
        // Otherwise, select the first available model if there are any
        if (configuredModel && models.includes(configuredModel)) {
          setModel(configuredModel);
        } else if (models.length > 0) {
          setModel(models[0]);
        } else {
          setModel('');
        }
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
                  <div className="modal-title">Configure Local Ollama</div>
                </div>
                <div className="modal-body">
                  <p className="text-sm text-secondary mb-4">PromptCrafter requires a local Ollama installation with Gemma 3 models for complete privacy.</p>
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
                    const payload = { provider: 'ollama', baseUrl: localBaseUrl, model, setDefault: !!setAsDefault };
                    
                    const res = await fetch('/api/model/config', { 
                      method: 'POST', 
                      headers: { 'Content-Type': 'application/json' }, 
                      body: JSON.stringify(payload) 
                    });
                    if (!res.ok) throw new Error('Save failed');
                    
                    // Default provider is saved server-side via setDefault flag above
                    
                    // After saving validate immediately
                    setValidating(true);
                    try {
                      const vr = await fetch('/api/model/validate');
                      if (vr.ok) {
                        const vjson = await vr.json();
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
                      } else {
                        setConnectionError('Connection failed');
                      }
                    } finally { setValidating(false); }
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Unknown error');
                  } finally { setSaving(false); }
                }} className="space-y-4">
                    {/* Ollama configuration */}
                    <div>
                      <label className="data-location-label" htmlFor="baseUrl">Base URL (local only)</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          id="baseUrl"
                          value={localBaseUrl}
                          onChange={e => { setLocalBaseUrl(e.target.value); setLocalTestResult(null); }}
                          required
                          className="md-input"
                          placeholder="http://localhost:11434"
                          autoComplete="off"
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          onClick={() => testLocalConnection()}
                          disabled={testingLocal || !localBaseUrl}
                          className="md-btn"
                          title="Check for available Ollama models"
                          style={{ whiteSpace: 'nowrap' }}
                        >{testingLocal ? 'Checking…' : 'Check for models'}</button>
                      </div>
                      {localTestResult && (
                        <div className="md-card" style={{ marginTop: 8, padding: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
                            <span style={{ color: localTestResult.success ? 'var(--color-primary)' : '#ef4444' }}>
                              {localTestResult.success ? 'Connection successful' : 'Connection failed'}
                              {localTestResult.duration != null && ` (${localTestResult.duration}ms)`}
                            </span>
                          </div>
                          {!localTestResult.success && localTestResult.error && (
                            <div style={{ marginTop: 6, fontSize: 12 }} className="text-secondary">{localTestResult.error}</div>
                          )}
                          {localTestResult.success && localTestResult.models && (
                            <div style={{ marginTop: 8, maxHeight: 160, overflowY: 'auto', display: 'grid', gap: 6 }}>
                              {localTestResult.models.length ? localTestResult.models.map(m => (
                                <div key={m} className="md-card" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px' }}>
                                  <span style={{ width: 6, height: 6, borderRadius: 9999, background: 'var(--color-primary)' }} />
                                  <span style={{ fontSize: 12 }} className="truncate">{m}</span>
                                </div>
                              )) : <div className="text-secondary" style={{ fontSize: 12, opacity: 0.8 }}>No models reported</div>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="data-location-label" htmlFor="model">Ollama Model</label>
                      <CustomSelect
                        value={model}
                        onChange={(value) => setModel(value as string)}
                        options={
                          availableModels.length > 0 
                            ? availableModels.map(m => ({ value: m, label: m }))
                            : [{ value: "", label: "First check for available models", disabled: true }]
                        }
                        className="w-full"
                        disabled={availableModels.length === 0}
                        aria-label="Available Ollama models"
                      />
                    </div>
                    <div className="text-secondary" style={{ fontSize: 12, lineHeight: '18px' }}>
                      {availableModels.length === 0 ? (
                        <>Click “Check for models” to find available Ollama models. If none are found, install Ollama and pull a compatible model.</>
                      ) : (
                        <>Found {availableModels.length} available model{availableModels.length !== 1 ? 's' : ''}. Select one from the dropdown.</>
                      )}
                    </div>
                
                    {(error || connectionError) && (
                      <div className="md-card" style={{ padding: 12, borderLeft: '4px solid #ef4444' }}>
                        <div style={{ fontSize: 12 }}>{error || connectionError}</div>
                      </div>
                    )}
                
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input 
                        type="checkbox" 
                        id="setAsDefault"
                        checked={setAsDefault}
                        onChange={(e) => setSetAsDefault(e.target.checked)}
                      />
                      <label htmlFor="setAsDefault" className="text-secondary" style={{ fontSize: 12 }}>
                        Set as default (auto-load this provider on startup)
                      </label>
                    </div>
                    <div style={{ paddingTop: 8 }}>
                      <button 
                        disabled={saving || validating || (!model || model.trim() === '')}
                        className="md-btn md-btn--primary"
                        style={{ width: '100%' }}
                        title={(!model || model.trim() === '') ? 'Please check for models and select one' : undefined}
                      >
                        {saving || validating ? 'Validating…' : 'Start PromptCrafter'}
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
                    <button onClick={() => setShowOllamaMissingModal(false)} className="flex-1 rounded-md bg-surface-200 py-2 text-sm font-medium hover:bg-surface-300 interactive-glow">Close</button>
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
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/system-prompts');
        if (res.ok) {
          const data = await res.json();
            setPrompt(data.prompt || data.build || '');
        }
      } finally { setLoading(false); }
    };
    void load();
  }, [open]);

  return (
    <>
  {/* System Prompts open controlled via global event */}
  <OpenSystemPromptsListener onOpen={() => setOpen(true)} />
      {children}
      {open && (
        <div className="modal-container">
          <div className="modal-backdrop-blur" onClick={() => setOpen(false)} />
          <div className="modal-content modal-content--large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Edit System Prompt</div>
              <button onClick={() => setOpen(false)} className="md-btn" style={{ padding: '6px 10px' }}>Close</button>
            </div>
            <div className="modal-body">
              <div className="system-prompts-container">
                {loading ? <div className="text-sm">Loading…</div> : (
                  <form className="system-prompts-form" onSubmit={async (e) => {
                    e.preventDefault();
                    setSaving(true); setError(null);
                    try {
                      const res = await fetch('/api/system-prompts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
                      if (!res.ok) throw new Error('Save failed');
                      setOpen(false);
                    } catch (err:any) { setError(err.message || 'Unknown error'); } finally { setSaving(false); }
                  }}>
                    <div className="system-prompts-field">
                      <label className="system-prompts-label">System Prompt</label>
                      <textarea value={prompt} onChange={e => setPrompt(e.target.value)} className="system-prompts-textarea" />
                    </div>
                    {error && <div className="system-prompts-error">{error}</div>}
                    <div className="system-prompts-actions">
                      <div className="system-prompts-actions-left">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm('Restore default system prompt? This will overwrite your current edits.')) return;
                            setSaving(true); setError(null);
                            try {
                              const res = await fetch('/api/system-prompts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reset' }) });
                              if (!res.ok) throw new Error('Reset failed');
                              const data = await res.json();
                              if (data.prompt) setPrompt(data.prompt);
                              else if (data.build) setPrompt(data.build);
                            } catch (err:any) {
                              setError(err.message || 'Unknown error');
                            } finally { setSaving(false); }
                          }}
                          className="md-btn"
                        >Restore Defaults</button>
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

