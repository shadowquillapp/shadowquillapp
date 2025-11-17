"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Titlebar from '@/components/Titlebar';
import { isElectronRuntime } from '@/lib/runtime';
import { useDialog } from '@/components/DialogProvider';
import PresetLibrary from '@/app/studio/components/PresetLibrary';
import PresetEditor from '@/app/studio/components/PresetEditor';
import StudioHeader from '@/app/studio/components/StudioHeader';
import { usePresetManager } from '@/app/studio/hooks/usePresetManager';
import type { PresetLite } from '@/app/studio/types';

export default function PresetStudioPage() {
  const router = useRouter();
  const { confirm } = useDialog();
  const {
    presets,
    loadPresets,
    savePreset,
    deletePreset,
    duplicatePreset,
  } = usePresetManager();

  // Selection states
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  
  // Editor state
  const [editingPreset, setEditingPreset] = useState<PresetLite | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  
  // Load presets on mount
  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  // Load and apply saved theme
  useEffect(() => {
    let savedTheme = localStorage.getItem('theme-preference') as 'earth' | 'purpledark' | 'dark' | 'light' | 'default' | null;
    // Migrate old 'default' theme to 'purpledark'
    if (savedTheme === 'default') {
      savedTheme = 'purpledark';
      localStorage.setItem('theme-preference', 'purpledark');
    }
    if (savedTheme && (savedTheme === 'earth' || savedTheme === 'purpledark' || savedTheme === 'dark' || savedTheme === 'light')) {
      document.documentElement.setAttribute('data-theme', savedTheme === 'earth' ? '' : savedTheme);
    }
  }, []);

  // Handle preset selection
  const handleSelectPreset = useCallback((presetId: string) => {
    const preset = presets.find((p: PresetLite) => p.id === presetId);
    if (preset) {
      setSelectedPresetId(presetId);
      setEditingPreset({ ...preset });
      setIsDirty(false);
    }
  }, [presets]);

  // Handle creating new preset
  const handleNewPreset = useCallback(() => {
    const newPreset: PresetLite = {
      id: `preset_${Date.now()}`,
      name: 'Untitled Preset',
      taskType: 'general',
      options: {
        tone: 'neutral',
        detail: 'normal',
        format: 'markdown',
        language: 'English',
        temperature: 0.7,
        useDelimiters: true,
        includeVerification: false,
        reasoningStyle: 'none',
        endOfPromptToken: '<|endofprompt|>',
      },
    };
    setEditingPreset(newPreset);
    setSelectedPresetId(null);
    setIsDirty(true);
  }, []);

  // Handle field changes in editor
  const handleFieldChange = useCallback((field: string, value: any) => {
    if (!editingPreset) return;
    
    const updatedPreset = { ...editingPreset };
    
    // Handle top-level fields
    if (field === 'name' || field === 'taskType') {
      updatedPreset[field] = value;
    } else {
      // Handle options fields
      updatedPreset.options = {
        ...updatedPreset.options,
        [field]: value,
      };
    }
    
    setEditingPreset(updatedPreset);
    setIsDirty(true);
  }, [editingPreset]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!editingPreset) return;
    
    try {
      await savePreset(editingPreset);
      setSelectedPresetId(editingPreset.id || null);
      setIsDirty(false);
      await loadPresets();
    } catch (error) {
      console.error('Failed to save preset:', error);
    }
  }, [editingPreset, savePreset, loadPresets]);

  // Handle save as new preset
  const handleSaveAs = useCallback(async (newName: string) => {
    if (!editingPreset) return;
    
    try {
      const newPreset = {
        ...editingPreset,
        id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: newName,
      };
      await savePreset(newPreset);
      setSelectedPresetId(newPreset.id || null);
      setEditingPreset(newPreset);
      setIsDirty(false);
      await loadPresets();
    } catch (error) {
      console.error('Failed to save preset:', error);
    }
  }, [editingPreset, savePreset, loadPresets]);

  // Handle delete
  const handleDelete = useCallback(async (presetId: string) => {
    const preset = presets.find((p: PresetLite) => p.id === presetId);
    if (!preset || preset.name === 'Default') return;
    
    const confirmed = await confirm({
      title: 'Delete Preset',
      message: `Are you sure you want to delete "${preset.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'destructive',
    });
    
    if (confirmed) {
      await deletePreset(presetId);
      if (selectedPresetId === presetId) {
        setSelectedPresetId(null);
        setEditingPreset(null);
      }
      await loadPresets();
    }
  }, [presets, selectedPresetId, deletePreset, loadPresets, confirm]);

  // Handle duplicate
  const handleDuplicate = useCallback(async (presetId: string, newName?: string) => {
    const duplicated = await duplicatePreset(presetId);
    if (duplicated) {
      // If a new name was provided, immediately rename the duplicated preset
      if (newName && newName.trim() && newName !== duplicated.name) {
        try {
          await savePreset({ ...duplicated, name: newName.trim() });
        } catch (e) {
          console.error('Failed to rename duplicated preset:', e);
        }
      }
      await loadPresets();
      handleSelectPreset(duplicated.id || '');
    }
  }, [duplicatePreset, savePreset, loadPresets, handleSelectPreset]);

  // Handle apply to chat
  const handleApplyToChat = useCallback((preset: PresetLite) => {
    // Store in sessionStorage for ChatClient to pick up
    sessionStorage.setItem('PC_APPLY_PRESET', JSON.stringify(preset));
    router.push('/chat');
  }, [router]);

  // Handle unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const isElectron = isElectronRuntime();

  return (
    <>
      {/* Electron Titlebar */}
      {isElectron && <Titlebar />}
      
      <div className="flex flex-col" 
           style={{ 
             background: 'var(--color-surface)', 
             color: 'var(--color-on-surface)',
             height: isElectron ? 'calc(100vh - 32px)' : '100vh',
             marginTop: isElectron ? '32px' : '0'
           }}>
        <StudioHeader 
          onNewPreset={handleNewPreset}
          onBack={() => router.push('/chat')}
          isDirty={isDirty}
        />
        
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Row 1: Preset Library */}
          <PresetLibrary
            presets={presets}
            selectedPresetId={selectedPresetId}
            onSelectPreset={handleSelectPreset}
            onCreateNew={handleNewPreset}
            className="min-h-[14rem] max-h-[40vh] flex-shrink-0 overflow-y-auto"
            style={{ borderBottom: '1px solid var(--color-outline)' }}
          />
          
          {/* Row 2: Preset Editor */}
          <PresetEditor
            preset={editingPreset}
            isDirty={isDirty}
            onFieldChange={handleFieldChange}
            onSave={handleSave}
            onApplyToChat={() => editingPreset && handleApplyToChat(editingPreset)}
            onDuplicate={(id, name) => handleDuplicate(id, name)}
            onDelete={(id) => handleDelete(id)}
            className="flex-1 overflow-y-auto min-h-0"
          />
        </main>
      </div>
    </>
  );
}
