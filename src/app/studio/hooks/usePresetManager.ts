import { useState, useCallback } from 'react';
import type { PresetLite } from '@/app/studio/types';

const STORAGE_KEY = 'PC_PRESETS';

export function usePresetManager() {
  const [presets, setPresets] = useState<PresetLite[]>([]);

  // Load presets from localStorage
  const loadPresets = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure each preset has an ID
        const presetsWithIds = parsed.map((preset: PresetLite) => ({
          ...preset,
          id: preset.id || `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        }));
        setPresets(presetsWithIds);
      } else {
        // Create default presets if none exist
        const defaultPresets: PresetLite[] = [
          {
            id: 'general-assistant',
            name: 'General Assistant',
            taskType: 'general',
            options: {
              tone: 'friendly',
              detail: 'normal',
              format: 'markdown',
              language: 'English',
              temperature: 0.7,
              useDelimiters: true,
              includeVerification: false,
              reasoningStyle: 'cot',
              endOfPromptToken: '<|endofprompt|>',
              additionalContext: 'You are a helpful AI assistant. Provide clear, accurate, and well-structured responses. Use examples when helpful.',
            },
          },
          {
            id: 'code-expert',
            name: 'Code Expert',
            taskType: 'coding',
            options: {
              tone: 'technical',
              detail: 'detailed',
              format: 'markdown',
              language: 'English',
              temperature: 0.4,
              includeTests: true,
              useDelimiters: true,
              includeVerification: true,
              reasoningStyle: 'plan_then_solve',
              endOfPromptToken: '<|endofprompt|>',
              additionalContext: 'Write clean, well-documented code following best practices. Include error handling, type safety, and comprehensive test cases. Explain your implementation choices.',
            },
          },
          {
            id: 'creative-writer',
            name: 'Creative Writer',
            taskType: 'writing',
            options: {
              tone: 'friendly',
              detail: 'detailed',
              format: 'markdown',
              language: 'English',
              temperature: 0.85,
              useDelimiters: false,
              includeVerification: false,
              reasoningStyle: 'none',
              endOfPromptToken: '<|endofprompt|>',
              additionalContext: 'Write engaging, creative content with vivid descriptions and natural flow. Focus on storytelling, emotion, and reader engagement.',
            },
          },
          {
            id: 'research-analyst',
            name: 'Research Analyst',
            taskType: 'research',
            options: {
              tone: 'formal',
              detail: 'detailed',
              format: 'markdown',
              language: 'English',
              temperature: 0.5,
              requireCitations: true,
              useDelimiters: true,
              includeVerification: true,
              reasoningStyle: 'cot',
              endOfPromptToken: '<|endofprompt|>',
              additionalContext: 'Provide thorough, well-researched analysis with proper citations. Be objective, evidence-based, and comprehensive. Verify facts and acknowledge limitations.',
            },
          },
          {
            id: 'technical-writer',
            name: 'Technical Writer',
            taskType: 'writing',
            options: {
              tone: 'technical',
              detail: 'detailed',
              format: 'markdown',
              language: 'English',
              temperature: 0.3,
              useDelimiters: true,
              includeVerification: true,
              reasoningStyle: 'plan_then_solve',
              endOfPromptToken: '<|endofprompt|>',
              additionalContext: 'Create clear, precise technical documentation. Use consistent terminology, proper formatting, and logical structure. Include examples, diagrams descriptions, and troubleshooting steps where relevant.',
            },
          },
          {
            id: 'marketing-expert',
            name: 'Marketing Expert',
            taskType: 'marketing',
            options: {
              tone: 'persuasive',
              detail: 'normal',
              format: 'markdown',
              language: 'English',
              temperature: 0.8,
              useDelimiters: true,
              includeVerification: false,
              reasoningStyle: 'cot',
              endOfPromptToken: '<|endofprompt|>',
              additionalContext: 'Create compelling marketing copy that resonates with target audiences. Focus on benefits, emotional appeal, and clear calls-to-action. Use persuasive techniques while maintaining authenticity.',
            },
          },
        ];
        setPresets(defaultPresets);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPresets));
      }
    } catch (error) {
      console.error('Failed to load presets:', error);
      setPresets([]);
    }
  }, []);

  // Save preset (create or update)
  const savePreset = useCallback(async (preset: PresetLite) => {
    try {
      const existing = presets.find(p => p.id === preset.id);
      let updatedPresets: PresetLite[];

      if (existing) {
        // Update existing preset
        updatedPresets = presets.map(p => 
          p.id === preset.id ? preset : p
        );
      } else {
        // Add new preset with generated ID if needed
        const newPreset = {
          ...preset,
          id: preset.id || `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };
        updatedPresets = [...presets, newPreset];
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPresets));
      setPresets(updatedPresets);
      return preset;
    } catch (error) {
      console.error('Failed to save preset:', error);
      throw error;
    }
  }, [presets]);

  // Delete preset
  const deletePreset = useCallback(async (presetId: string) => {
    try {
      const updatedPresets = presets.filter(p => p.id !== presetId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPresets));
      setPresets(updatedPresets);
    } catch (error) {
      console.error('Failed to delete preset:', error);
      throw error;
    }
  }, [presets]);

  // Duplicate preset
  const duplicatePreset = useCallback(async (presetId: string) => {
    try {
      const original = presets.find(p => p.id === presetId);
      if (!original) return null;

      const duplicated: PresetLite = {
        ...original,
        id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: `${original.name} Copy`,
        options: { ...original.options },
      };

      const updatedPresets = [...presets, duplicated];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPresets));
      setPresets(updatedPresets);
      return duplicated;
    } catch (error) {
      console.error('Failed to duplicate preset:', error);
      return null;
    }
  }, [presets]);

  // Export presets
  const exportPresets = useCallback(() => {
    try {
      const dataStr = JSON.stringify(presets, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `presets_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (error) {
      console.error('Failed to export presets:', error);
      throw error;
    }
  }, [presets]);

  // Import presets
  const importPresets = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      
      if (!Array.isArray(imported)) {
        throw new Error('Invalid preset file format');
      }

      // Merge with existing presets, avoiding duplicates
      const existingIds = new Set(presets.map(p => p.id));
      const newPresets = imported
        .filter((p: PresetLite) => !existingIds.has(p.id || ''))
        .map((p: PresetLite) => ({
          ...p,
          id: p.id || `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        }));

      const updatedPresets = [...presets, ...newPresets];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPresets));
      setPresets(updatedPresets);
      
      return newPresets.length;
    } catch (error) {
      console.error('Failed to import presets:', error);
      throw error;
    }
  }, [presets]);

  return {
    presets,
    loadPresets,
    savePreset,
    deletePreset,
    duplicatePreset,
    exportPresets,
    importPresets,
  };
}
