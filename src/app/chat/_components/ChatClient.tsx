"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import type { ReactNode } from "react";
// Local-only storage and model access (no API)
import { createChat as localCreateChat, appendMessagesWithCap as localAppendMessages, deleteChat as localDeleteChat, listChatsByUser as localListChats, getChat as localGetChat } from "@/lib/local-db";
import { buildUnifiedPrompt } from "@/lib/prompt-builder-client";
import { callLocalModelClient } from "@/lib/model-client";
import { readLocalModelConfig as readLocalModelConfigClient, listAvailableModels, writeLocalModelConfig as writeLocalModelConfigClient } from "@/lib/local-config";
import { getPresets, savePreset as savePresetLocal, deletePresetByIdOrName } from "@/lib/presets";
import { CustomSelect } from "@/components/CustomSelect";
import { Icon } from "@/components/Icon";
import { isElectronRuntime } from '@/lib/runtime';
import Titlebar from "@/components/Titlebar";
import { useDialog } from "@/components/DialogProvider";
import SettingsDialog from "@/components/SettingsDialog";

type MessageRole = "user" | "assistant";
interface MessageItem { id: string; role: MessageRole; content: string; }
type UserInfo = { name?: string | null; image?: string | null; email?: string | null };

// Small FLIP-style animation helper for reordering/fading list items without extra deps
function useFLIPListAnimation(keys: readonly string[]) {
  const nodeMapRef = useRef<Map<string, HTMLElement>>(new Map());
  const prevRectsRef = useRef<Map<string, DOMRect>>(new Map());

  const register = useCallback((key: string) => {
    return (el: HTMLElement | null) => {
      if (el) {
        nodeMapRef.current.set(key, el);
      } else {
        nodeMapRef.current.delete(key);
      }
    };
  }, []);

  useLayoutEffect(() => {
    const nodeMap = nodeMapRef.current;
    // Measure new rects
    const nextRects = new Map<string, DOMRect>();
    nodeMap.forEach((el, key) => {
      try {
        nextRects.set(key, el.getBoundingClientRect());
      } catch {
        // ignore measure errors
      }
    });

    // Animate from previous rects to new rects
    nextRects.forEach((nextRect, key) => {
      const el = nodeMap.get(key);
      if (!el) return;

      const prevRect = prevRectsRef.current.get(key);
      if (prevRect) {
        const dx = prevRect.left - nextRect.left;
        const dy = prevRect.top - nextRect.top;
        if (dx !== 0 || dy !== 0) {
          el.style.transition = "none";
          el.style.transform = `translate(${dx}px, ${dy}px)`;
          el.style.willChange = "transform, opacity";
          el.style.zIndex = "10";
          // Next frame, animate to identity
          requestAnimationFrame(() => {
            el.style.transition = "transform 500ms ease, opacity 400ms ease";
            el.style.transform = "";
            // Reset z-index after animation completes
            setTimeout(() => {
              el.style.zIndex = "";
            }, 500);
          });
        }
      } else {
        // New element entering: fade/slide in slightly
        el.style.transition = "none";
        el.style.opacity = "0";
        el.style.transform = "translateY(-6px)";
        el.style.willChange = "transform, opacity";
        el.style.zIndex = "10";
        requestAnimationFrame(() => {
          el.style.transition = "transform 500ms ease, opacity 400ms ease";
          el.style.opacity = "1";
          el.style.transform = "";
          // Reset z-index after animation completes
          setTimeout(() => {
            el.style.zIndex = "";
          }, 500);
        });
      }
    });

    // Store rects for next pass
    prevRectsRef.current = nextRects;
  }, [keys]);

  return register;
}

export default function ChatClient(_props: { user?: UserInfo }) {
  const { confirm, showInfo } = useDialog();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelLabel, setModelLabel] = useState<string>("Gemma 3 4B");
  const [availableModels, setAvailableModels] = useState<Array<{ name: string; size: number }>>([]);
  const [currentModelId, setCurrentModelId] = useState<string | null>(null);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [modelMenuUp, setModelMenuUp] = useState(false);
  const modelBtnRef = useRef<HTMLButtonElement | null>(null);
  const modelMenuRef = useRef<HTMLDivElement | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [desktopRailEntering, setDesktopRailEntering] = useState(false);
  const desktopRailEnterTimerRef = useRef<number | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [presetEditorOpen, setPresetEditorOpen] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingPresetOriginalName, setEditingPresetOriginalName] = useState<string | null>(null);
  const [showAllChatsOpen, setShowAllChatsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'default' | 'earth' | 'light'>('default');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [presetSelectorOpen, setPresetSelectorOpen] = useState(false);
  const [deletingPresetId, setDeletingPresetId] = useState<string | null>(null);
  const [themeSwitchCooldown, setThemeSwitchCooldown] = useState(false);
  const [themeToast, setThemeToast] = useState<{ key: number; label: string } | null>(null);
  const themeToastTimerRef = useRef<number | null>(null);
  const themeCooldownTimerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'system' | 'ollama' | 'data'>('system');

  // Material UI + app settings (presets)
type TaskType = "general" | "coding" | "image" | "research" | "writing" | "marketing";
type Tone = "neutral" | "friendly" | "formal" | "technical" | "persuasive";
type Detail = "brief" | "normal" | "detailed";
type Format = "plain" | "markdown" | "json";
type ImageStylePreset = "photorealistic" | "illustration" | "3d" | "anime" | "watercolor";
type ImageAspectRatio = "1:1" | "16:9" | "9:16" | "4:3";

  const normalizeStylePreset = (v: string | undefined): ImageStylePreset | undefined => {
    const allowed: ImageStylePreset[] = ["photorealistic", "illustration", "3d", "anime", "watercolor"];
    return allowed.includes(v as ImageStylePreset) ? (v as ImageStylePreset) : undefined;
  };

  const normalizeAspectRatio = (v: string | undefined): ImageAspectRatio | undefined => {
    const allowed: ImageAspectRatio[] = ["1:1", "16:9", "9:16", "4:3"];
    return allowed.includes(v as ImageAspectRatio) ? (v as ImageAspectRatio) : undefined;
  };

  const [taskType, setTaskType] = useState<TaskType>("general");
  const [tone, setTone] = useState<Tone>("neutral");
  const [detail, setDetail] = useState<Detail>("normal");
  const [format, setFormat] = useState<Format>("markdown");
  const [language, setLanguage] = useState("English");
  const [temperature, setTemperature] = useState(0.7);
  const [stylePreset, setStylePreset] = useState("photorealistic");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [includeTests, setIncludeTests] = useState(true);
  const [requireCitations, setRequireCitations] = useState(true);
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<Array<{ id?: string; name: string; taskType: TaskType; options?: any }>>([]);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [selectedPresetKey, setSelectedPresetKey] = useState("");
  const [recentPresetKeys, setRecentPresetKeys] = useState<string[]>([]);

  // Animation registration for recent presets reorder/replace
  const registerRecentPresetItem = useFLIPListAnimation(recentPresetKeys);

  // Local chat list state
  const [chatList, setChatList] = useState<Array<{ id: string; title: string | null; updatedAt: number; messageCount: number }>>([]);
  useEffect(() => { void (async () => { const list = await localListChats(); setChatList(list); })(); }, []);
  const refreshChatList = useCallback(async () => { const list = await localListChats(); setChatList(list); }, []);

  // Load local Ollama models only
  useEffect(() => {
    const load = async () => {
      try {
        const cfg = readLocalModelConfigClient();
        const models = await listAvailableModels('http://localhost:11434');
        setAvailableModels(models);
        if (cfg && cfg.provider === 'ollama' && typeof cfg.model === 'string') {
          setCurrentModelId(cfg.model);
          const size = (cfg.model.split(':')[1] || '').toUpperCase();
          setModelLabel(size ? `Gemma 3 ${size}` : 'Gemma 3');
        }
      } catch {/* ignore */}
    };
    load();
  }, []);

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme-preference') as 'default' | 'earth' | 'light' | null;
    if (savedTheme) {
      setCurrentTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme === 'default' ? '' : savedTheme);
    }
    // Load recent presets
    try {
      const stored = localStorage.getItem('recent-presets');
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) setRecentPresetKeys(arr.filter((x) => typeof x === 'string'));
      }
    } catch {/* noop */}
  }, []);

  const cycleTheme = useCallback(() => {
    if (themeSwitchCooldown) return;
    const themeOrder: Array<'default' | 'light' | 'earth'> = ['default', 'light', 'earth'];
    const currentIndex = themeOrder.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    const nextTheme = themeOrder[nextIndex] ?? 'default';
    // Begin cooldown to avoid rapid toggling
    setThemeSwitchCooldown(true);
    if (themeCooldownTimerRef.current) window.clearTimeout(themeCooldownTimerRef.current);
    themeCooldownTimerRef.current = window.setTimeout(() => {
      setThemeSwitchCooldown(false);
      themeCooldownTimerRef.current = null;
    }, 800);
    
    setCurrentTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme === 'default' ? '' : nextTheme);
    localStorage.setItem('theme-preference', nextTheme);
    // Show a transient theme toast
    const label = nextTheme === 'default' ? 'Dark' : (nextTheme.charAt(0).toUpperCase() + nextTheme.slice(1));
    const key = Date.now();
    setThemeToast({ key, label });
    if (themeToastTimerRef.current) window.clearTimeout(themeToastTimerRef.current);
    themeToastTimerRef.current = window.setTimeout(() => {
      setThemeToast(null);
      themeToastTimerRef.current = null;
    }, 900);
  }, [currentTheme, themeSwitchCooldown]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (themeToastTimerRef.current) window.clearTimeout(themeToastTimerRef.current);
      if (themeCooldownTimerRef.current) window.clearTimeout(themeCooldownTimerRef.current);
    };
  }, []);

  // Refresh available models
  const refreshModels = useCallback(async () => {
    try {
      const models = await listAvailableModels('http://localhost:11434');
      setAvailableModels(models);
      const cfg = readLocalModelConfigClient();
      if (cfg && cfg.provider === 'ollama' && typeof cfg.model === 'string') {
        setCurrentModelId(cfg.model);
        const size = (cfg.model.split(':')[1] || '').toUpperCase();
        setModelLabel(size ? `Gemma 3 ${size}` : 'Gemma 3');
      }
                } catch {
      setAvailableModels([]);
    }
  }, []);

  // Check Ollama connection and show dialog with results
  const [checkingConnection, setCheckingConnection] = useState(false);
  const checkOllamaConnection = useCallback(async () => {
    setCheckingConnection(true);
    const startTime = Date.now();
    
    try {
      const models = await listAvailableModels('http://localhost:11434');
      const duration = Date.now() - startTime;
      if (!models.length) {
        await showInfo({
          title: 'Connection Failed',
          message: (
            <div className="md-card" style={{ 
              marginTop: 12, 
              padding: 0,
              overflow: 'hidden',
              borderLeft: '3px solid #ef4444'
            }}>
              <div style={{ 
                padding: '12px 16px',
                background: 'rgba(239, 68, 68, 0.08)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ 
                    fontSize: 16, 
                    color: '#ef4444',
                    fontWeight: 'bold'
                  }}>✕</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#ef4444',
                      marginBottom: 2
                    }}>
                      Connection Failed
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.6 }}>
                      No models detected • {duration}ms
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ padding: '12px 16px', fontSize: 12, opacity: 0.8 }}>
                Make sure Ollama is running on port 11434.
              </div>
            </div>
          )
        });
        setAvailableModels([]);
      } else {
        const allModels: Array<{ name: string; size: number }> = models;
        const gemmaModels = allModels.filter((m: { name: string }) => /^gemma3\b/i.test(m.name));
        
        if (gemmaModels.length > 0) {
          await showInfo({
            title: 'Ollama Connection Status',
            message: (
              <div className="md-card" style={{ 
                marginTop: 12, 
                padding: 0,
                overflow: 'hidden',
                borderLeft: '3px solid #10b981'
              }}>
                <div style={{ 
                  padding: '12px 16px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ 
                      fontSize: 16, 
                      color: '#10b981',
                      fontWeight: 'bold'
                    }}></span>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#10b981',
                        marginBottom: 2
                      }}>
                        Gemma 3 Connection Successful!
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.6 }}>
                        Found {gemmaModels.length} model{gemmaModels.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ 
                  padding: '8px 12px',
                  maxHeight: 180, 
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6
                }}>
                  {gemmaModels.map((m) => {
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
                        }}>
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
              </div>
            )
          });
          setAvailableModels(allModels);
          
          const cfg = readLocalModelConfigClient();
          if (cfg && cfg.provider === 'ollama' && typeof cfg.model === 'string') {
            setCurrentModelId(cfg.model);
            const size = (cfg.model.split(':')[1] || '').toUpperCase();
            setModelLabel(size ? `Gemma 3 ${size}` : 'Gemma 3');
          }
        } else {
          await showInfo({
            title: 'No Gemma Models',
            message: (
              <div className="md-card" style={{ 
                marginTop: 12, 
                padding: 0,
                overflow: 'hidden',
                borderLeft: '3px solid #f59e0b'
              }}>
                <div style={{ 
                  padding: '12px 16px',
                  background: 'rgba(245, 158, 11, 0.08)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ 
                      fontSize: 16, 
                      color: '#f59e0b',
                      fontWeight: 'bold'
                    }}>⚠</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#f59e0b',
                        marginBottom: 2
                      }}>
                        No Gemma Models Found
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.6 }}>
                        Connected but no models detected • {duration}ms
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ padding: '12px 16px', fontSize: 12, opacity: 0.8, lineHeight: 1.6 }}>
                  Please install a Gemma 3 model:<br/><br/>
                  <code style={{ fontSize: 11, background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 3 }}>ollama pull gemma3:4b</code><br/>
                  <code style={{ fontSize: 11, background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 3 }}>ollama pull gemma3:12b</code>
                </div>
              </div>
            )
          });
          setAvailableModels([]);
        }
      }
    } catch (e: any) {
      const duration = Date.now() - startTime;
      await showInfo({
        title: 'Connection Failed',
        message: (
          <div className="md-card" style={{ 
            marginTop: 12, 
            padding: 0,
            overflow: 'hidden',
            borderLeft: '3px solid #ef4444'
          }}>
            <div style={{ 
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ 
                  fontSize: 16, 
                  color: '#ef4444',
                  fontWeight: 'bold'
                }}>✕</span>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#ef4444',
                    marginBottom: 2
                  }}>
                    Connection Failed
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>
                    {e.message || 'Connection error'} • {duration}ms
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '12px 16px', fontSize: 12, opacity: 0.8 }}>
              Make sure Ollama is running on port 11434.
            </div>
          </div>
        )
      });
      setAvailableModels([]);
    } finally {
      setCheckingConnection(false);
    }
  }, [showInfo]);

  // Handle responsive sidebar
  useEffect(() => {
    const checkScreenSize = () => {
      const isSmall = window.innerWidth < 1280; // xl breakpoint
      setIsSmallScreen((prev) => {
        if (prev && !isSmall) {
          setSidebarOpen(false);
          setDesktopRailEntering(true);
          if (desktopRailEnterTimerRef.current) {
            clearTimeout(desktopRailEnterTimerRef.current);
          }
          desktopRailEnterTimerRef.current = window.setTimeout(() => {
            setDesktopRailEntering(false);
            desktopRailEnterTimerRef.current = null;
          }, 320);
        }
        return isSmall;
      });
      if (!isSmall) setSidebarOpen(false); // Auto-close sidebar on large screens
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => {
      window.removeEventListener('resize', checkScreenSize);
      if (desktopRailEnterTimerRef.current) {
        clearTimeout(desktopRailEnterTimerRef.current);
      }
    };
  }, []);

  // Position model dropdown to avoid viewport overflow
  useEffect(() => {
    if (!modelMenuOpen) return;
    const btn = modelBtnRef.current;
    const menu = modelMenuRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedMenuH = Math.min(320, menu?.getBoundingClientRect().height || 240);
    setModelMenuUp(spaceBelow < estimatedMenuH && spaceAbove > spaceBelow);

    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!btn.contains(target) && !(menu && menu.contains(target))) {
        setModelMenuOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setModelMenuOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [modelMenuOpen]);


  // Global event to open Settings dialog with initial tab
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const ce = e as CustomEvent;
        const tab = ce?.detail?.tab as 'system' | 'ollama' | 'data' | undefined;
        if (tab) setSettingsInitialTab(tab);
      } catch {}
      setSettingsOpen(true);
    };
    window.addEventListener('open-app-settings', handler as any);
    return () => window.removeEventListener('open-app-settings', handler as any);
  }, []);

  // Close All Chats modal on Escape (prevents overlay trapping clicks)
  useEffect(() => {
    if (!showAllChatsOpen) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowAllChatsOpen(false); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [showAllChatsOpen]);

  // Auto-resize the chat input up to a reasonable max height
  const autoResizeInput = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    // Reset height to measure scrollHeight accurately
    ta.style.height = 'auto';
    const computed = window.getComputedStyle(ta);
    const lineHeight = parseFloat(computed.lineHeight || '0') || 20;
    const paddingTop = parseFloat(computed.paddingTop || '0') || 0;
    const paddingBottom = parseFloat(computed.paddingBottom || '0') || 0;
    const borderTop = parseFloat(computed.borderTopWidth || '0') || 0;
    const borderBottom = parseFloat(computed.borderBottomWidth || '0') || 0;
    const minHeight = parseFloat(computed.minHeight || '0') || 40;
    // Clamp to a maximum number of lines
    const MAX_ROWS = 8;
    const maxHeight = Math.ceil(lineHeight * MAX_ROWS + paddingTop + paddingBottom + borderTop + borderBottom);
    const nextHeight = Math.max(Math.min(ta.scrollHeight, maxHeight), minHeight);
    ta.style.height = `${nextHeight}px`;
    ta.style.overflowY = ta.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, []);

  // Recalculate input height whenever content changes
  useEffect(() => { autoResizeInput(); }, [input, autoResizeInput]);

  // Ensure chat exists or create one
  const ensureChat = useCallback(async (firstLine: string) => {
    if (currentChatId) return currentChatId;
    const title = (firstLine || "New chat").slice(0, 40) || "New chat";
    const created = await localCreateChat(title);
    setCurrentChatId(created.id);
    await refreshChatList();
    return created.id;
  }, [currentChatId, refreshChatList]);

  // Presets load / helpers
  useEffect(() => {
    const load = async () => {
      setLoadingPresets(true);
      try {
        const data = getPresets();
        const list = (data ?? []).map((p: any) => ({ id: p.id, name: p.name, taskType: p.taskType, options: p.options }));
        setPresets(list);
          // Clean stale recent keys based on available presets
          setRecentPresetKeys((prev) => {
            const set = new Set(list.map((p: any) => (p.id ?? p.name)));
            const cleaned = prev.filter((k) => set.has(k)).slice(0, 3);
            try { localStorage.setItem('recent-presets', JSON.stringify(cleaned)); } catch {}
            return cleaned;
          });
          if (!selectedPresetKey) {
            const lastKey = (typeof window !== 'undefined' ? localStorage.getItem('last-selected-preset') : null) || '';
            const pick = (lastKey && list.find((p: any) => (p.id ?? p.name) === lastKey)) || list[0] || null;
            if (pick) {
              const key = pick.id ?? pick.name;
              setSelectedPresetKey(key);
              try { if (typeof window !== 'undefined') localStorage.setItem('last-selected-preset', key); } catch {}
              applyPreset(pick);
            }
          }
      } finally {
        setLoadingPresets(false);
      }
    };
    void load();
  }, []);

  const reloadPresets = useCallback(async () => {
    setLoadingPresets(true);
    try {
      const data = getPresets();
      setPresets((data ?? []).map((p: any) => ({ id: p.id, name: p.name, taskType: p.taskType, options: p.options })));
        // Clean recent presets after any mutation
        setRecentPresetKeys((prev) => {
          const list = (data ?? []) as any[];
          const set = new Set(list.map((p) => (p.id ?? p.name)));
          const cleaned = prev.filter((k) => set.has(k)).slice(0, 3);
          try { localStorage.setItem('recent-presets', JSON.stringify(cleaned)); } catch {}
          return cleaned;
        });
    } finally { setLoadingPresets(false); }
  }, []);

  const applyPreset = useCallback((p: { name: string; taskType: TaskType; options?: any; id?: string }) => {
    setPresetName(p.name);
    setTaskType(p.taskType);
    const o = p.options ?? {};
    if (o.tone) setTone(o.tone);
    if (o.detail) setDetail(o.detail);
    if (o.format) setFormat(o.format);
    setLanguage(o.language ?? "English");
    setTemperature(typeof o.temperature === "number" ? o.temperature : 0.7);
    setStylePreset(o.stylePreset ?? "photorealistic");
    setAspectRatio(o.aspectRatio ?? "1:1");
    setIncludeTests(!!o.includeTests);
    setRequireCitations(!!o.requireCitations);
    // Track recent presets
    const key = (p as any).id ?? p.name;
    setRecentPresetKeys((prev) => {
      const next = [key, ...prev.filter((k) => k !== key)].slice(0, 3);
      try { localStorage.setItem('recent-presets', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const savePreset = useCallback(async () => {
    const name = presetName.trim();
    if (!name) return;
    const payload: any = {
      id: editingPresetId || undefined,
      name,
      taskType,
      options: {
        tone,
        detail,
        format,
        language: language || undefined,
        temperature,
        stylePreset: taskType === "image" ? normalizeStylePreset(stylePreset) : undefined,
        aspectRatio: taskType === "image" ? normalizeAspectRatio(aspectRatio) : undefined,
        includeTests: taskType === "coding" ? includeTests : undefined,
        requireCitations: taskType === "research" ? requireCitations : undefined,
      },
    };
    savePresetLocal(payload);
    // If editing a legacy preset (no id) and the name changed, remove the old entry by name
    if (!editingPresetId && editingPresetOriginalName && editingPresetOriginalName !== name) {
      try { deletePresetByIdOrName(undefined, editingPresetOriginalName); } catch {}
    }
  }, [presetName, taskType, tone, detail, format, language, temperature, stylePreset, aspectRatio, includeTests, requireCitations, editingPresetId, editingPresetOriginalName]);

  const deletePreset = useCallback(async (presetId: string, presetName: string) => {
    if ((presetName || '').trim().toLowerCase() === 'default') return; // Default preset is non-deletable (safety)
    const ok = await confirm({ title: 'Delete Preset', message: `Delete preset "${presetName}"? This cannot be undone.`, confirmText: 'Delete', cancelText: 'Cancel', tone: 'destructive' });
    if (!ok) return;
    
    setDeletingPresetId(presetId);
    try {
      const query = presetId ? `id=${encodeURIComponent(presetId)}` : `name=${encodeURIComponent(presetName)}`;
      deletePresetByIdOrName(presetId, presetName);
      await reloadPresets();
      
      // If deleted preset was selected, choose next available and persist
      if (selectedPresetKey === presetId || selectedPresetKey === presetName) {
        setSelectedPresetKey("");
        try {
          const list = getPresets();
          const next = list[0] || null;
          if (next) {
            const key = next.id ?? next.name;
            setSelectedPresetKey(key);
            applyPreset({ name: next.name, taskType: next.taskType, options: next.options });
            try { localStorage.setItem('last-selected-preset', key); } catch {}
          } else {
            try { localStorage.removeItem('last-selected-preset'); } catch {}
          }
        } catch {}
      }
    } catch (err) {
      setError('Failed to delete preset');
    } finally {
      setDeletingPresetId(null);
    }
  }, [selectedPresetKey, reloadPresets, applyPreset]);

  

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
        const controller = new AbortController();
    abortRef.current = controller;
    setInput("");
    const chatId = await ensureChat(text);
    const user: MessageItem = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((m) => [...m, user]);
    try {
      // Persist user message
      try {
        const result = await localAppendMessages(chatId, [{ role: user.role, content: user.content }], 50);
        const createdUserId = result?.created?.[0]?.id;
        if (createdUserId) setMessages((m) => m.map(msg => msg.id === user.id ? { ...msg, id: createdUserId } : msg));
      } catch {}

      // Build prompt and call local model directly
      const built = await buildUnifiedPrompt({
        input: text,
        taskType,
        options: {
          tone,
          detail,
          format,
          language: language || undefined,
          temperature,
          stylePreset: taskType === 'image' ? normalizeStylePreset(stylePreset) : undefined,
          aspectRatio: taskType === 'image' ? normalizeAspectRatio(aspectRatio) : undefined,
          includeTests: taskType === 'coding' ? includeTests : undefined,
          requireCitations: taskType === 'research' ? requireCitations : undefined,
        }
      });
      const output = await callLocalModelClient(built, { taskType, options: { tone, detail, format, language: language || undefined, temperature, stylePreset: taskType === 'image' ? normalizeStylePreset(stylePreset) : undefined, aspectRatio: taskType === 'image' ? normalizeAspectRatio(aspectRatio) : undefined, includeTests: taskType === 'coding' ? includeTests : undefined, requireCitations: taskType === 'research' ? requireCitations : undefined } });
      const assistant: MessageItem = { id: crypto.randomUUID(), role: 'assistant', content: output };
      setMessages((m) => [...m, assistant]);
      try {
        const result = await localAppendMessages(chatId, [{ role: assistant.role, content: assistant.content }], 50);
        const createdAssistantId = result?.created?.[0]?.id;
        if (createdAssistantId) setMessages((m) => m.map(msg => msg.id === assistant.id ? { ...msg, id: createdAssistantId } : msg));
        await refreshChatList();
      } catch {}
    } catch (e: any) {
      // Handle abort signal specifically
      if (e?.name === 'AbortError' || e?.message?.includes('aborted')) {
        // Don't show error for abort - handled by stopGenerating
      } else {
        setError(e?.message || 'Something went wrong');
      }
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }, [input, sending, ensureChat, taskType, tone, detail, format, language, temperature, stylePreset, aspectRatio, includeTests, requireCitations]);

  const stopGenerating = useCallback(() => {
    try { 
      abortRef.current?.abort(); 
      // Add aborted message as a chat bubble
      const abortedMsg: MessageItem = { 
        id: crypto.randomUUID(), 
        role: 'assistant', 
        content: 'Response aborted' 
      };
      setMessages((m) => [...m, abortedMsg]);
    } catch {}
    setSending(false);
  }, []);

  const endRef = useRef<HTMLDivElement | null>(null);
  
  // Auto-scroll to bottom when messages change or when sending
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    });
  }, [messages, sending]);

  const hasMessages = messages.length > 0;
  const recentChats = useMemo(() => (chatList ?? []).slice().sort((a: any, b: any) => (b.updatedAt as any) - (a.updatedAt as any)), [chatList]);
  const recentThree = useMemo(() => recentChats.slice(0, 3), [recentChats]);

  // Chat selection & deletion
  const selectChat = useCallback(async (id: string) => {
    // Optimistically set active selection for immediate visual feedback
    const prevId = currentChatId;
    setCurrentChatId(id);
    try {
      const data = await localGetChat(id, 50);
      const loaded: MessageItem[] = (data.messages ?? []).map((m: any) => ({ id: m.id, role: m.role, content: m.content }));
      setMessages(loaded);
    } catch (e) {
      setError('Failed to load chat');
      setCurrentChatId(prevId ?? null);
    }
  }, [chatList, currentChatId]);

  const deleteChat = useCallback(async (id: string) => {
    try { await localDeleteChat(id); await refreshChatList(); } catch {}
    if (currentChatId === id) { setCurrentChatId(null); setMessages([]); }
  }, [refreshChatList, currentChatId]);

  // Copy message content
  const copyMessage = useCallback(async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    }
  }, []);

  // Syntax highlighting for JSON
  const highlightJSON = useCallback((rawCode: string) => {
    const normalize = () => {
      if (!rawCode) return "";
      try {
        const parsed = JSON.parse(rawCode);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return rawCode;
      }
    };

    const code = normalize();
    type JsonToken =
      | { type: "string" | "number" | "boolean" | "null" | "key" | "brace" | "bracket" | "colon" | "comma"; value: string }
      | { type: "whitespace" | "plain"; value: string };
    const tokens: JsonToken[] = [];
    let i = 0;

    const readString = () => {
      let result = '"';
      i += 1;
      while (i < code.length) {
        const ch = code[i] ?? "";
        result += ch;
        if (ch === "\\") {
          i += 1;
          result += code[i] ?? "";
        } else if (ch === '"') {
          i += 1;
          break;
        }
        i += 1;
      }
      return result;
    };

    while (i < code.length) {
      const ch = code[i] ?? "";
      if (/\s/.test(ch)) {
        const start = i;
        while (i < code.length && /\s/.test(code[i] ?? "")) i += 1;
        tokens.push({ type: "whitespace", value: code.slice(start, i) });
        continue;
      }
      if (ch === '"') {
        const strValue = readString();
        let j = i;
        while (j < code.length && /\s/.test(code[j] ?? "")) j += 1;
        const nextChar = code[j] ?? "";
        const isKey = nextChar === ":";
        tokens.push({ type: isKey ? "key" : "string", value: strValue });
        continue;
      }
      if (/[0-9-]/.test(ch)) {
        const match = code.slice(i).match(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/);
        if (match) {
          tokens.push({ type: "number", value: match[0] });
          i += match[0].length;
          continue;
        }
      }
      if (code.startsWith("true", i) || code.startsWith("false", i)) {
        const value = code.startsWith("true", i) ? "true" : "false";
        tokens.push({ type: "boolean", value });
        i += value.length;
        continue;
      }
      if (code.startsWith("null", i)) {
        tokens.push({ type: "null", value: "null" });
        i += 4;
        continue;
      }
      const punctuationMap: Record<string, JsonToken["type"] | undefined> = {
        "{": "brace",
        "}": "brace",
        "[": "bracket",
        "]": "bracket",
        ":": "colon",
        ",": "comma",
      };
      const punctuationType = punctuationMap[ch];
      if (punctuationType) {
        tokens.push({ type: punctuationType, value: ch });
        i += 1;
        continue;
      }
      tokens.push({ type: "plain", value: ch });
      i += 1;
    }

    return tokens.map((token, idx) => {
      if (token.type === "whitespace" || token.type === "plain") {
        return (
          <span key={`json-${idx}`}>
            {token.value}
          </span>
        );
      }
      return (
        <span key={`json-${idx}`} className={`token-${token.type}`}>
          {token.value}
        </span>
      );
    });
  }, []);

  // Syntax highlighting for Markdown
  const highlightMarkdown = useCallback((code: string) => {
    const inlinePattern =
      /(!?\[[^\]]*?\]\([^)]+\)|`[^`]+`|\*\*\*[^*]+?\*\*\*|___[^_]+?___|\*\*[^*]+?\*\*|__[^_]+?__|~~[^~]+?~~|\*(?!\s)(?:\\.|[^*])*(?:[^*\s])\*|_(?!\s)(?:\\.|[^_])*(?:[^_\s])_)/g;

    const renderInline = (text: string, keyPrefix: string) => {
      if (!text) return text;
      const nodes: ReactNode[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      let tokenIndex = 0;

      while ((match = inlinePattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
          const plain = text.slice(lastIndex, match.index);
          nodes.push(<span key={`${keyPrefix}-plain-${tokenIndex++}`}>{plain}</span>);
        }
        const token = match[0];

        if (/^`/.test(token)) {
          nodes.push(<span key={`${keyPrefix}-code-open-${tokenIndex++}`} className="token-md-code-tick">`</span>);
          nodes.push(<span key={`${keyPrefix}-code-text-${tokenIndex++}`} className="token-md-code">{token.slice(1, -1)}</span>);
          nodes.push(<span key={`${keyPrefix}-code-close-${tokenIndex++}`} className="token-md-code-tick">`</span>);
        } else if (/^\*\*\*/.test(token) || /^___/.test(token)) {
          nodes.push(<span key={`${keyPrefix}-bold-italic-open-${tokenIndex++}`} className="token-md-bold">**</span>);
          nodes.push(<span key={`${keyPrefix}-bold-italic-mid-${tokenIndex++}`} className="token-md-italic">*</span>);
          nodes.push(<span key={`${keyPrefix}-bold-italic-text-${tokenIndex++}`} className="token-md-bold-text token-md-italic-text">{token.slice(3, -3)}</span>);
          nodes.push(<span key={`${keyPrefix}-bold-italic-mid-close-${tokenIndex++}`} className="token-md-italic">*</span>);
          nodes.push(<span key={`${keyPrefix}-bold-italic-close-${tokenIndex++}`} className="token-md-bold">**</span>);
        } else if (/^\*\*/.test(token) || /^__/.test(token)) {
          nodes.push(<span key={`${keyPrefix}-bold-open-${tokenIndex++}`} className="token-md-bold">**</span>);
          nodes.push(<span key={`${keyPrefix}-bold-text-${tokenIndex++}`} className="token-md-bold-text">{token.slice(2, -2)}</span>);
          nodes.push(<span key={`${keyPrefix}-bold-close-${tokenIndex++}`} className="token-md-bold">**</span>);
        } else if (/^\*(?!\*)/.test(token) || /^_(?!_)/.test(token)) {
          nodes.push(<span key={`${keyPrefix}-italic-open-${tokenIndex++}`} className="token-md-italic">*</span>);
          nodes.push(<span key={`${keyPrefix}-italic-text-${tokenIndex++}`} className="token-md-italic-text">{token.slice(1, -1)}</span>);
          nodes.push(<span key={`${keyPrefix}-italic-close-${tokenIndex++}`} className="token-md-italic">*</span>);
        } else if (/^~~/.test(token)) {
          nodes.push(<span key={`${keyPrefix}-strike-open-${tokenIndex++}`} className="token-md-strike">~~</span>);
          nodes.push(<span key={`${keyPrefix}-strike-text-${tokenIndex++}`} className="token-md-strike-text">{token.slice(2, -2)}</span>);
          nodes.push(<span key={`${keyPrefix}-strike-close-${tokenIndex++}`} className="token-md-strike">~~</span>);
        } else if (/^\[/.test(token) || /^!\[/.test(token)) {
          const linkMatch = token.match(/^(!)?\[([^\]]+)]\(([^)]+)\)$/);
          if (linkMatch) {
            const isImage = Boolean(linkMatch[1]);
            nodes.push(<span key={`${keyPrefix}-link-open-${tokenIndex++}`} className="token-md-punctuation">{isImage ? "![" : "["}</span>);
            nodes.push(<span key={`${keyPrefix}-link-text-${tokenIndex++}`} className="token-md-link-text">{linkMatch[2]}</span>);
            nodes.push(<span key={`${keyPrefix}-link-mid-${tokenIndex++}`} className="token-md-punctuation">](</span>);
            nodes.push(<span key={`${keyPrefix}-link-url-${tokenIndex++}`} className="token-md-url">{linkMatch[3]}</span>);
            nodes.push(<span key={`${keyPrefix}-link-close-${tokenIndex++}`} className="token-md-punctuation">)</span>);
          } else {
            nodes.push(<span key={`${keyPrefix}-unknown-${tokenIndex++}`}>{token}</span>);
          }
        } else {
          nodes.push(<span key={`${keyPrefix}-unknown-${tokenIndex++}`}>{token}</span>);
        }
        lastIndex = match.index + token.length;
      }

      if (lastIndex < text.length) {
        nodes.push(<span key={`${keyPrefix}-plain-${tokenIndex++}`}>{text.slice(lastIndex)}</span>);
      }

      return nodes;
    };

    const lines = code.split("\n");
    return lines.map((line, lineIdx) => {
      const lineKey = `md-line-${lineIdx}`;
      const newline = lineIdx < lines.length - 1 ? "\n" : "";

      const headerMatch = line.match(/^(#{1,6})(\s+)(.*)$/);
      if (headerMatch) {
        const hashSymbols = headerMatch[1] ?? "";
        const spacing = headerMatch[2] ?? " ";
        const headingText = headerMatch[3] ?? "";
        return (
          <span key={lineKey}>
            <span className="token-md-header">{hashSymbols}</span>
            <span>{spacing}</span>
            <span className="token-md-header-text">
              {renderInline(headingText, `${lineKey}-header`)}
            </span>
            {newline}
          </span>
        );
      }

      if (/^(\s*)(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        return (
          <span key={lineKey} className="token-md-hr">
            {line}
            {newline}
          </span>
        );
      }

      const blockquoteMatch = line.match(/^(\s*>+\s*)(.*)$/);
      if (blockquoteMatch) {
        const quoteMarker = blockquoteMatch[1] ?? "";
        const quoteContent = blockquoteMatch[2] ?? "";
        return (
          <span key={lineKey}>
            <span className="token-md-quote-marker">{quoteMarker}</span>
            <span className="token-md-quote-text">
              {renderInline(quoteContent, `${lineKey}-quote`)}
            </span>
            {newline}
          </span>
        );
      }

      const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
      if (listMatch) {
        const listIndent = listMatch[1] ?? "";
        const listMarker = listMatch[2] ?? "";
        const listBody = listMatch[3] ?? "";
        return (
          <span key={lineKey}>
            <span>{listIndent}</span>
            <span className="token-md-list-marker">{listMarker}</span>
            <span> </span>
            {renderInline(listBody, `${lineKey}-list`)}
            {newline}
          </span>
        );
      }

      return (
        <span key={lineKey}>
          {renderInline(line || " ", `${lineKey}-plain`)}
          {newline}
        </span>
      );
    });
  }, []);

  // Render message content with code block support
  const renderMessageContent = useCallback((content: string, messageId: string) => {
    const codeBlockRegex = /```([^\n]*)\n?([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textBefore = content.slice(lastIndex, match.index);
        if (textBefore.trim()) {
          parts.push(
            <span key={`text-${lastIndex}`} style={{ whiteSpace: 'pre-wrap' }}>
              {textBefore}
            </span>
          );
        }
      }

      const [, language, code] = match;
      const codeId = `code-${messageId}-${match.index}`;
      const languageLabel = (language || '').trim();
      const lang = (languageLabel || 'code').toLowerCase();
      
      // Apply syntax highlighting for specific languages
      let highlightedCode;
      if (lang === 'json') {
        highlightedCode = highlightJSON(code || '');
      } else if (lang === 'markdown' || lang === 'md') {
        highlightedCode = highlightMarkdown(code || '');
      } else {
        highlightedCode = code;
      }
      
      parts.push(
        <div key={`code-${match.index}`} className="bubble-code-block">
          <div className="bubble-code-header">
            <span className="bubble-code-lang">{languageLabel || 'code'}</span>
            <button
              type="button"
              className="bubble-code-copy"
              onClick={() => copyMessage(codeId, code || '')}
              title="Copy code"
            >
              <Icon name={copiedMessageId === codeId ? 'check' : 'copy'} />
            </button>
          </div>
          <div className="bubble-code-content">{highlightedCode}</div>
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      const remainingText = content.slice(lastIndex);
      if (remainingText.trim()) {
        parts.push(
          <span key={`text-${lastIndex}`} style={{ whiteSpace: 'pre-wrap' }}>
            {remainingText}
          </span>
        );
      }
    }

    return parts.length > 0 ? <>{parts}</> : <span style={{ whiteSpace: 'pre-wrap' }}>{content}</span>;
  }, [copyMessage, copiedMessageId, highlightJSON, highlightMarkdown]);

  const railClassName = isSmallScreen
    ? `app-rail--mobile ${sidebarOpen ? 'open' : ''}`
    : `app-rail${desktopRailEntering ? ' app-rail--entering' : ''}`;

  return (
    <>
    {/* Electron Titlebar */}
    {isElectronRuntime() && <Titlebar />}
    
    <div className={isSmallScreen ? "app-shell--mobile" : "app-shell"}>
      {/* Sidebar backdrop for mobile */}
      {isSmallScreen && sidebarOpen && (
        <div 
          style={{ position: 'fixed', top: isElectronRuntime() ? 32 : 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 25 }}
        onClick={() => setSidebarOpen(false)}
      />
      )}
      
      {/* Left rail (Material list of presets + chat history) */}
      <aside className={railClassName} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20, paddingTop: !isSmallScreen && isElectronRuntime() ? 60 : 20, top: isSmallScreen && isElectronRuntime() ? 32 : 0, height: isSmallScreen && isElectronRuntime() ? 'calc(100vh - 32px)' : undefined, fontSize: 15 }}>
        <button
          type="button"
          className="md-btn md-btn--primary"
          style={{ width: '100%', border: '1px solid var(--color-outline)', fontSize: 16, padding: '14px 18px', minHeight: 52, fontWeight: 600 }}
          onClick={() => { setMessages([]); setCurrentChatId(null); setInput(""); }}
        >
          New Crafter Chat
        </button>

        <div className="text-secondary" style={{ fontSize: 13, letterSpacing: 0.4, marginTop: 10 }}><b>RECENT PRESETS</b></div>
        {loadingPresets ? (
          <div className="text-secondary" style={{ fontSize: 14 }}>Loading…</div>
        ) : (
          <>
            {/* Recently used presets (up to 3) */}
            <div style={{ display: 'grid', gap: 12 }}>
              {recentPresetKeys
                .map((key) => presets.find((p) => (p.id ?? p.name) === key))
                .filter((p): p is { id?: string; name: string; taskType: TaskType; options?: any } => !!p)
                .slice(0, 3)
                .map((p) => {
                  const key = p.id ?? p.name;
                  const isActive = key === selectedPresetKey;
                  return (
                    <div
                      key={key}
                      ref={registerRecentPresetItem(key)}
                      className="md-card"
                      title={`Use preset "${p.name}"`}
                      style={{
                        padding: 12,
                        borderRadius: 10,
                        position: 'relative',
                        ...(currentTheme === 'earth'
                          ? {
                              border: `2px solid ${isActive ? 'var(--color-on-surface)' : 'var(--color-outline)'}`,
                              background: isActive ? 'rgba(238,232,213,0.06)' : 'transparent'
                            }
                          : currentTheme === 'light'
                          ? {
                              border: `2px solid ${isActive ? 'var(--color-primary)' : 'var(--color-outline)'}`
                            }
                          : {
                              borderColor: isActive ? 'var(--color-primary)' : 'var(--color-outline)'
                            }),
                        boxShadow: 'var(--shadow-2)',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setSelectedPresetKey(key);
                        try { localStorage.setItem('last-selected-preset', key); } catch {}
                        applyPreset(p);
                      }}
                    >
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>{p.name}</span>
                        {isActive && <Icon name="check" className="text-[13px]" style={{ color: 'var(--color-on-surface)', marginLeft: 6 }} />}
                      </div>
                      <div className="text-secondary" style={{ fontSize: 13, marginTop: 4 }}>
                        {p.taskType.charAt(0).toUpperCase() + p.taskType.slice(1)}
                      </div>
                      {(() => {
                        const o = p.options || {};
                        const parts: string[] = [];
                        const capitalize = (str: string) => {
                          if (str.toLowerCase() === 'json') return 'JSON';
                          return str.charAt(0).toUpperCase() + str.slice(1);
                        };
                        if (o.tone) parts.push(`${capitalize(o.tone)} Tone`);
                        if (o.detail) parts.push(`${capitalize(o.detail)} Detail`);
                        if (o.format) parts.push(capitalize(o.format));
                        if (o.stylePreset) parts.push(capitalize(o.stylePreset));
                        if (o.aspectRatio) parts.push(capitalize(o.aspectRatio));
                        return parts.length ? (
                          <div className="text-secondary" style={{ fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>
                            {parts.join(' • ')}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  );
                })}
              {recentPresetKeys.length === 0 && (
                <div className="text-secondary" style={{ fontSize: 14 }}>No presets used yet</div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button className="md-btn md-btn--primary" onClick={() => setPresetSelectorOpen(true)} style={{ padding: '10px 13px', fontSize: 13 }}>Preset Settings</button>
            </div>
          </>
        )}

        {/* Recent chats pinned to bottom */}
        <div style={{ marginTop: 'auto' }}>
          <div className="text-secondary" style={{ fontSize: 13, letterSpacing: 0.4, marginBottom: 12 }}><b>RECENT CRAFT CHATS</b></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentThree.map((c: any) => {
              const isActive = currentChatId === c.id;
              return (
            <button
                  key={c.id}
              type="button"
                  onClick={() => { void selectChat(c.id); }}
                  title={c.title ?? 'Untitled'}
                  style={{
                    textAlign: 'left',
                    background: 'transparent',
                    border: '1px solid var(--color-outline)',
                    borderRadius: 12,
                    padding: '10px 14px',
                    cursor: 'pointer',
                    color: isActive ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)',
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    transition: 'color 120ms ease'
                  }}
                >
                  {(c.title ?? 'Untitled') + ' ...'}
            </button>
              );
            })}
            {recentThree.length === 0 && (
              <div className="text-secondary" style={{ fontSize: 14, padding: '6px 0' }}>No chats yet</div>
            )}
            </div>
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 12 }}>
            <button className="md-btn md-btn--primary" style={{ padding: '10px 13px', fontSize: 13, marginTop: 8}} onClick={() => setShowAllChatsOpen(true)}>Show All Chats</button>
          </div>
            </div>
      </aside>

      {/* Main content */}
      <section className={isSmallScreen ? "app-content--mobile" : "app-content"} style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Header actions */}
        <div className={`app-header ${isElectronRuntime() ? 'app-header--electron' : ''}`} style={{ padding: '16px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          {/* Hamburger menu for mobile */}
          {isSmallScreen && (
              <button
              className="md-btn" 
              style={{ 
                width: 40, 
                height: 40, 
                padding: 0, 
                borderRadius: 8, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }} 
              onClick={() => setSidebarOpen((v) => !v)}
              title="Toggle sidebar"
            >
              ☰
              </button>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <button className="md-btn md-btn--primary" style={{ padding: '8px 12px', minHeight: 40, display: 'flex', alignItems: 'center', gap: 6 }} onClick={cycleTheme} disabled={themeSwitchCooldown} title={`Current theme: ${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)} (click to cycle)`}>
              <Icon name="palette" />
            </button>
            </div>
            <div>
              <button
                className="md-btn"
                style={{ padding: '8px 12px', minHeight: 40, display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => { setSettingsInitialTab('system'); setSettingsOpen(true); }}
                title="Settings"
              >
                <Icon name="gear" />
              </button>
            </div>
          </div>
          {themeToast && (
            <div
              key={themeToast.key}
              className="theme-toast"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                margin: 'auto',
                pointerEvents: 'none',
                zIndex: 2,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 16px',
                borderRadius: 12,
                background: 'var(--color-surface-variant)',
                color: 'var(--color-on-surface)',
                border: '1px solid var(--color-outline)',
                boxShadow: 'var(--shadow-2)',
                fontWeight: 700,
                fontSize: 14,
                whiteSpace: 'nowrap',
                width: 'max-content',
                height: 'max-content'
              }}
              aria-live="polite"
              aria-atomic="true"
            >
              <Icon name="palette" />
              <span style={{ marginLeft: 4 }}>{themeToast.label} theme</span>
            </div>
          )}
        </div>

        {/* Content area (scrolls) */}
        <div ref={scrollContainerRef} style={{ padding: 24, paddingTop: 28, flex: 1, overflow: 'auto' }}>
          <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {!hasMessages ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24, textAlign: 'center' }}>How can I help you craft prompts today?</h1>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {messages.map((m) => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div className="bubble-container">
                        <div className={`bubble ${m.role === 'user' ? 'bubble--user' : 'bubble--assistant'}`}>
                          {renderMessageContent(m.content, m.id)}
                        </div>
                        
                        {/* Copy button outside bubble */}
                        <button
                          type="button"
                          className={`bubble-copy ${m.role === 'user' ? 'bubble-copy--user' : 'bubble-copy--assistant'}`}
                          onClick={() => copyMessage(m.id, m.content)}
                          title="Copy message"
                        >
                          <Icon name={copiedMessageId === m.id ? 'check' : 'copy'} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {sending && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
                      <div className="bubble bubble--assistant" style={{ opacity: .95, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>Generating prompt... </span>
                        <div style={{ width: 14, height: 14, border: '2px solid var(--color-on-surface-variant)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} className="md-spin" />
                      </div>
                    </div>
                  )}
                  <div ref={endRef} style={{ marginBottom: 32 }} />
                </div>
              )}

              {error && (
                <div className="md-card" style={{ padding: 12, marginTop: 12, borderLeft: '4px solid var(--color-primary)' }}>{error}</div>
              )}
            </div>

            <div
              className="chat-composer-shell"
              style={{
                position: 'sticky',
                bottom: isSmallScreen ? 16 : 24,
                marginTop: 32,
                paddingTop: 16,
                paddingBottom: isSmallScreen ? 8 : 0,
                zIndex: 5
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: isSmallScreen ? '100%' : '960px',
                  margin: '0 auto'
                }}
              >
                <div className="md-card chat-composer-card">
                  {/* Text input (full width) */}
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
                    placeholder="Ready to craft? Describe your task or paste an existing prompt..."
                    className="md-input"
                    rows={1}
                    style={{
                      resize: 'none',
                      minHeight: 40,
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-outline)',
                      marginBottom: 12,
                      width: '100%',
                      borderRadius: 16,
                      padding: '12px 14px'
                    }}
                  />

                  {/* Controls row below input */}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Model selection (left) */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {/* Refresh connection button */}
                      <button 
                        type="button" 
                        className="md-btn md-btn--primary" 
                        title="Check Ollama connection and refresh models" 
                        onClick={() => void checkOllamaConnection()}
                        disabled={checkingConnection}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          width: 40, 
                          height: 40, 
                          padding: 0,
                          opacity: checkingConnection ? 0.5 : 1,
                          cursor: checkingConnection ? 'wait' : 'pointer',
                          marginRight: 8,
                        }}
                      >
                        <Icon name="refresh" className={checkingConnection ? 'md-spin' : ''} />
                      </button>
                      <div style={{ position: 'relative' }}>
                        <button
                          ref={modelBtnRef}
                          type="button"
                          className="md-btn"
                          title="Select model"
                          onClick={() => {
                            const wasOpen = modelMenuOpen;
                            setModelMenuOpen((v) => !v);
                            // Auto-refresh models when opening dropdown
                            if (!wasOpen) {
                              refreshModels();
                            }
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          {modelLabel}
                          <Icon name="chevronDown" className={`dropdown-arrow ${modelMenuOpen ? 'dropdown-arrow--open' : ''}`} />
                        </button>
                        {modelMenuOpen && (
                          <div
                            ref={modelMenuRef}
                            className="menu-panel"
                            style={{ position: 'absolute', left: 0, top: modelMenuUp ? 'auto' : 'calc(100% + 6px)', bottom: modelMenuUp ? 'calc(100% + 6px)' : 'auto', maxHeight: 320, overflowY: 'auto' }}
                          >
                            {availableModels.length > 0 ? (
                              availableModels.map((m) => {
                                const label = `Gemma 3 ${(m.name.split(':')[1] || '').toUpperCase()}`;
                                const isSelected = currentModelId === m.name;
                                return (
                                  <button
                                    key={m.name}
                                    className="menu-item"
                                    aria-current={isSelected ? 'true' : undefined}
                                    onClick={async () => {
                                      writeLocalModelConfigClient({ provider: 'ollama', baseUrl: 'http://localhost:11434', model: m.name } as any);
                                      setCurrentModelId(m.name);
                                      setModelLabel(label);
                                      setModelMenuOpen(false);
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: 8,
                                      background: isSelected ? 'rgba(108,140,255,0.12)' : undefined,
                                      outline: isSelected ? '2px solid var(--color-primary)' : 'none',
                                      outlineOffset: -2,
                                      fontWeight: isSelected ? 600 : undefined,
                                    }}
                                  >
                                    <span>{label}</span>
                                    {isSelected && <Icon name="check" />}
                                  </button>
                                );
                              })
                            ) : (
                              <div>
                                <div className="menu-item" style={{ opacity: 0.6, cursor: 'default' }}>No local models found</div>
                                <button className="menu-item" onClick={() => { refreshModels(); }} style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <Icon name="refresh" />
                                  Refresh
                                </button>
                                <div className="menu-divider" />
                                <div className="menu-item" style={{ opacity: 0.6, cursor: 'default', fontSize: 12, padding: '8px 12px' }}>
                                  Install Ollama and pull gemma3 models:<br/>
                                  <code style={{ fontSize: 11 }}>ollama pull gemma3:1b</code>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Send or Stop (right) */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {sending ? (
                        <button
                          type="button"
                          className="md-btn md-btn--primary"
                          onClick={stopGenerating}
                          title="Stop generating"
                          style={{ 
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            padding: 0,
                            border: currentTheme === 'earth' ? '1px solid var(--color-outline)' : undefined
                          }}
                        >
                          <Icon name="stop" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="md-btn md-btn--primary" 
                          onClick={() => void send()}
                          disabled={!input.trim()}
                          style={{ width: 40, height: 40, borderRadius: '50%', padding: 0, border: currentTheme === 'earth' ? '1px solid var(--color-outline)' : undefined }}
                          title="Send message"
                        >
                          ↑
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
    
    {/* Settings Dialog */}
    {settingsOpen && (
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} initialTab={settingsInitialTab} />
    )}

    {/* All Chats Modal */}
    {showAllChatsOpen && (
      <div className="modal-container" aria-modal="true" role="dialog" onClick={() => setShowAllChatsOpen(false)}>
        <div className="modal-backdrop-blur" />
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">Craft Chat History</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                className="md-btn md-btn--destructive"
                onClick={async () => {
                  const ok = await confirm({ title: 'Craft Chat Deletion', message: 'Delete ALL chats? This will permanently remove all chats.', confirmText: 'Confirm', cancelText: 'Cancel', tone: 'destructive' });
                  if (!ok) return;  
                  const ids = recentChats.map((c: any) => c.id);
                  try {
                    await Promise.allSettled(ids.map((id: string) => deleteChat(id)));
                  } catch {}
                }}
                style={{ padding: '6px 10px', color: '#ef4444', marginRight: 30 }}
                title="Delete all chats"
              >
                <b>Delete All</b>
              </button>
              <button
                aria-label="Close chat history dialog"
                className="md-btn"
                onClick={() => setShowAllChatsOpen(false)}
                style={{ width: 36, height: 36, padding: 0 }}
              >
                <Icon name="close" />
              </button>
            </div>
          </div>
          <div className="modal-body">
            {recentChats.length === 0 ? (
              <div className="text-secondary" style={{ fontSize: 13, padding: 12, textAlign: 'center' }}>
                No chats have been created yet.
              </div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
                {(recentChats).map((c: any) => {
                const isActive = currentChatId === c.id;
                return (
                  <li key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      type="button"
                      aria-current={isActive ? 'true' : undefined}
                      className="md-btn"
                      style={{
                        width: '100%',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: isActive ? 'rgba(108,140,255,0.12)' : 'transparent',
                        outline: isActive ? '2px solid var(--color-primary)' : 'none',
                        outlineOffset: -2,
                        cursor: 'pointer',
                        flex: 1
                      }}
                      onClick={() => { void selectChat(c.id); setShowAllChatsOpen(false); }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isActive ? 600 : 500 }}>{c.title ?? 'Untitled'}</span>
                      <span className="text-secondary" style={{ fontSize: 12 }}>{new Date(c.updatedAt as any).toLocaleString()}</span>
                    </button>
                    <button
                      type="button"
                      className="md-btn md-btn--destructive"
                      title="Delete chat"
                      style={{ width: 36, height: 36, borderRadius: '50%', padding: 0, color: '#ef4444' }}
                      onClick={async (e) => { e.stopPropagation(); const ok = await confirm({ title: 'Delete Chat', message: 'Delete this chat? This will permanently remove it.', confirmText: 'Delete', cancelText: 'Cancel', tone: 'destructive' }); if (!ok) return; await deleteChat(c.id); }}
                      aria-label="Delete chat"
                    >
                      <Icon name="trash" className="text-[13px]" />
                    </button>
                  </li>
                );
                })}
              </ul>
            )}
                  </div>
                    </div>
                    </div>
    )}
    {/* Removed separate preset manage menu; Manage opens the editor directly */}

    {/* Preset Editor Modal */}
    {presetEditorOpen && (
      <div className="modal-container" aria-modal="true" role="dialog" onClick={() => setPresetEditorOpen(false)}>
        <div className="modal-backdrop-blur" />
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">Edit Preset</div>
            <button className="md-btn" onClick={() => setPresetEditorOpen(false)} style={{ padding: '6px 10px' }}><Icon name="close" /></button>
                    </div>
          <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="text-secondary" style={{ fontSize: 12 }}>Preset Name&emsp;</label>
              <input className="md-input" value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="Preset name" />
                    </div>
            <div>
              <label className="text-secondary" style={{ fontSize: 12 }}>Type</label>
              <CustomSelect value={taskType} onChange={(v) => setTaskType(v as any)} options={[{value:'general',label:'General'},{value:'coding',label:'Coding'},{value:'image',label:'Image'},{value:'research',label:'Research'},{value:'writing',label:'Writing'},{value:'marketing',label:'Marketing'}]} />
                    </div>
            <div>
              <label className="text-secondary" style={{ fontSize: 12 }}>Tone</label>
              <CustomSelect value={tone} onChange={(v) => setTone(v as any)} options={[{value:'neutral',label:'Neutral'},{value:'friendly',label:'Friendly'},{value:'formal',label:'Formal'},{value:'technical',label:'Technical'},{value:'persuasive',label:'Persuasive'}]} />
                    </div>
            <div>
              <label className="text-secondary" style={{ fontSize: 12 }}>Detail</label>
              <CustomSelect value={detail} onChange={(v) => setDetail(v as any)} options={[{value:'brief',label:'Brief'},{value:'normal',label:'Normal'},{value:'detailed',label:'Detailed'}]} />
                  </div>
            <div>
              <label className="text-secondary" style={{ fontSize: 12 }}>Format</label>
              <CustomSelect value={format} onChange={(v) => setFormat(v as any)} options={[{value:'plain',label:'Plain'},{value:'markdown',label:'Markdown'},{value:'json',label:'JSON'}]} />
                </div>
            <div>
              <label className="text-secondary" style={{ fontSize: 12 }}>Language</label>
              <CustomSelect value={language} onChange={(v) => setLanguage(v)} options={[{value:'English',label:'English'},{value:'Dutch',label:'Dutch'},{value:'Arabic',label:'Arabic'},{value:'Mandarin Chinese',label:'Mandarin Chinese'},{value:'Spanish',label:'Spanish'},{value:'French',label:'French'},{value:'Russian',label:'Russian'},{value:'Urdu',label:'Urdu'}]} />
                    </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label className="text-secondary" style={{ fontSize: 12 }}>Temperature</label>
                <button
                  type="button"
                  onClick={async () => {
                    await showInfo({
                      title: 'Temperature',
                      message: 'Temperature controls randomness. Lower values (e.g., 0.2) are more focused and deterministic; higher values (e.g., 0.8) are more creative and diverse. Range: 0.0–1.0.',
                      okText: 'Got it'
                    });
                  }}
                  title="Controls randomness: lower = focused/deterministic, higher = creative/diverse (0–1)"
                  aria-label="What does temperature do?"
                  style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-on-surface-variant)', display: 'inline-flex', alignItems: 'center' }}
                >
                  <Icon name="info" className="text-[13px]" />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full"
                />
                <span className="text-secondary" style={{ fontSize: 12, width: 28, textAlign: 'right' }}>{temperature.toFixed(1)}</span>
              </div>
            </div>
            {taskType === 'image' && (
              <>
                <div>
                  <label className="text-secondary" style={{ fontSize: 12 }}>Image Style</label>
                  <CustomSelect value={stylePreset} onChange={(v) => setStylePreset(v)} options={[{value:'photorealistic',label:'Photorealistic'},{value:'illustration',label:'Illustration'},{value:'3d',label:'3D'},{value:'anime',label:'Anime'},{value:'watercolor',label:'Watercolor'}]} />
                  </div>
                <div>
                  <label className="text-secondary" style={{ fontSize: 12 }}>Aspect Ratio</label>
                  <CustomSelect value={aspectRatio} onChange={(v) => setAspectRatio(v)} options={[{value:'1:1',label:'1:1'},{value:'16:9',label:'16:9'},{value:'9:16',label:'9:16'},{value:'4:3',label:'4:3'}]} />
                  </div>
              </>
              )}
            {taskType === 'coding' && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <input type="checkbox" checked={includeTests} onChange={(e) => setIncludeTests(e.target.checked)} />
                <label className="text-secondary" style={{ fontSize: 12 }}>Include tests</label>
              </div>
            )}
            {taskType === 'research' && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <input type="checkbox" checked={requireCitations} onChange={(e) => setRequireCitations(e.target.checked)} />
                <label className="text-secondary" style={{ fontSize: 12 }}>Require citations</label>
              </div>
            )}
                  </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="md-btn" onClick={() => { setEditingPresetId(null); setEditingPresetOriginalName(null); setPresetEditorOpen(false); }}>Cancel</button>
              <button className="md-btn md-btn--primary" onClick={async () => {
                const name = (presetName || "").trim();
                await savePreset();
                await reloadPresets();
                try {
                  const list = getPresets();
                  const found = list.find((p: any) => p.name === name);
                  if (found) {
                    const key = found.id ?? found.name;
                    setSelectedPresetKey(key);
                    try { localStorage.setItem('last-selected-preset', key); } catch {}
                    try { applyPreset(found); } catch {}
                  }
                } catch {/* noop */}
                setEditingPresetId(null);
                setEditingPresetOriginalName(null);
                setPresetEditorOpen(false);
              }}>Save</button>
            </div>
          </div>
        </div>
      </div>
    )}


    {/* Preset Selector Modal */}
    {presetSelectorOpen && (
      <div className="modal-container" aria-modal="true" role="dialog" onClick={() => setPresetSelectorOpen(false)}>
        <div className="modal-backdrop-blur" />
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">Preset Settings</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="md-btn" onClick={() => setPresetSelectorOpen(false)} style={{ padding: '6px 10px' }}><Icon name="close" /></button>
            </div>
          </div>
          <div className="modal-body">
            <div style={{ display: 'grid', gap: 12 }}>
              {/* Create New Preset button at top */}
                    <button
                className="md-btn md-btn--primary" 
                      onClick={() => {
                  // Don't change selectedPresetKey - keep current selection
                  setPresetName("");
                  // Reset form to defaults for new preset creation
                  setTaskType("general");
                  setTone("neutral");
                  setDetail("normal");
                  setFormat("markdown");
                  setLanguage("English");
                  setTemperature(0.7);
                  setStylePreset("photorealistic");
                  setAspectRatio("1:1");
                  setIncludeTests(true);
                  setRequireCitations(true);
                  setEditingPresetId(null);
                  setEditingPresetOriginalName(null);
                  setPresetEditorOpen(true);
                  setPresetSelectorOpen(false);
                }}
                style={{ padding: '12px 16px' }}
              >
                Create Preset
                    </button>

              {presets.length > 0 ? (
                presets.map((p) => {
                  const isSel = (p.id ?? p.name) === selectedPresetKey;
                  const presetId = p.id ?? p.name;
                  const isDeleting = deletingPresetId === presetId;
                  
                  return (
                    <div key={presetId} className="md-card" style={{ 
                      padding: 16, 
                      borderRadius: 12, 
                      position: 'relative',
                      ...(currentTheme === 'earth'
                        ? {
                            border: `2px solid ${isSel ? 'var(--color-on-surface)' : 'var(--color-outline)'}`,
                            background: isSel ? 'rgba(238,232,213,0.06)' : 'transparent'
                          }
                        : currentTheme === 'light'
                        ? {
                            border: `2px solid ${isSel ? 'var(--color-primary)' : 'var(--color-outline)'}`
                          }
                        : {
                            borderColor: isSel ? 'var(--color-primary)' : 'var(--color-outline)',
                            borderWidth: isSel ? '2px' : '1px'
                          })
                    }}>
                      <div
                        style={{
                          textAlign: 'left',
                          cursor: 'pointer',
                          background: 'transparent',
                          // Ensure readable text across all themes (Earth primary matches surface)
                          color: 'var(--color-on-surface)',
                          padding: 0,
                          border: 'none'
                        }}
                        onClick={() => { 
                          setSelectedPresetKey(presetId);
                          try { localStorage.setItem('last-selected-preset', presetId); } catch {}
                          applyPreset(p);
                          setPresetSelectorOpen(false);
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>
                          {isSel && <Icon name="star" className="text-[13px]" style={{ color: 'var(--color-on-surface)', marginRight: 6 }} />}
                          {p.name}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>{p.taskType.charAt(0).toUpperCase() + p.taskType.slice(1)}</div>
                        {(() => {
                          const o = p.options || {};
                          const parts: string[] = [];
                          const capitalize = (str: string) => {
                            if ((str || '').toLowerCase() === 'json') return 'JSON';
                            return (str || '').charAt(0).toUpperCase() + (str || '').slice(1);
                          };
                          if (o.tone) parts.push(`${capitalize(o.tone)} Tone`);
                          if (o.detail) parts.push(`${capitalize(o.detail)} Detail`);
                          if (o.format) parts.push(capitalize(o.format));
                          if (o.stylePreset) parts.push(capitalize(o.stylePreset));
                          if (o.aspectRatio) parts.push(capitalize(o.aspectRatio));
                          return parts.length ? (
                            <div className="text-secondary" style={{ fontSize: 11, marginTop: 2 }}>
                              {parts.join(' • ')}
                            </div>
                          ) : null;
                        })()}
            </div>
                      
                      {/* Action buttons (top-right): trash (if not Default) + cog (always) */}
                      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6 }}>
                        {(p.name || '').trim().toLowerCase() !== 'default' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePreset(presetId, p.name);
                            }}
                            disabled={isDeleting}
                            className="md-btn md-btn--destructive"
                            style={{ 
                              padding: 8,
                              opacity: isDeleting ? 0.6 : 1,
                              color: '#ef4444'
                            }}
                            title={`Delete preset "${p.name}"`}
                            aria-label={`Delete preset ${p.name}`}
                          >
                            {isDeleting ? '...' : <Icon name="trash" className="text-[13px]" />}
                          </button>
                        )}
                        {(p.name || '').trim().toLowerCase() !== 'default' && (
                          <button
                            type="button"
                            className="md-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Prefill and open editor for this preset
                              setPresetName(p.name);
                            setEditingPresetId(p.id ?? null);
                            setEditingPresetOriginalName(p.name);
                              setTaskType(p.taskType as any);
                              const o = p.options || {};
                              setTone(o.tone ?? 'neutral');
                              setDetail(o.detail ?? 'normal');
                              setFormat(o.format ?? 'markdown');
                              setLanguage(o.language ?? 'English');
                              setTemperature(typeof o.temperature === 'number' ? o.temperature : 0.7);
                              setStylePreset(o.stylePreset ?? 'photorealistic');
                              setAspectRatio(o.aspectRatio ?? '1:1');
                              setIncludeTests(!!o.includeTests);
                              setRequireCitations(!!o.requireCitations);
                              setPresetEditorOpen(true);
                              setPresetSelectorOpen(false);
                            }}
                            title={`Edit preset "${p.name}"`}
                            aria-label={`Edit preset ${p.name}`}
                            style={{ padding: 8 }}
                          >
                            <Icon name={'edit' as any} className="text-[13px]" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-secondary" style={{ textAlign: 'center', padding: 24 }}>
                  No presets available. Create your first preset to get started.
          </div>
        )}
      </div>
    </div>
        </div>
      </div>
    )}
    </>
  );
}

function AnimatedDots() {
  const [ticks, setTicks] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTicks((t) => (t + 1) % 3), 500);
    return () => clearInterval(id);
  }, []);
  const dots = '.'.repeat((ticks % 3) + 1);
  return <span className="text-secondary" style={{ width: 16, display: 'inline-block' }}>{dots}</span>;
}
