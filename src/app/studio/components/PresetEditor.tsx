"use client";

import React, { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import BasicSettings from '@/app/studio/components/BasicSettings';
import AdvancedSettings from '@/app/studio/components/AdvancedSettings';
import TypeSpecificFields from '@/app/studio/components/TypeSpecificFields';
import type { PresetLite } from '@/app/studio/types';
import SaveAsDialog from '@/app/studio/components/SaveAsDialog';

interface PresetEditorProps {
  preset: PresetLite | null;
  isDirty: boolean;
  onFieldChange: (field: string, value: any) => void;
  onSave: () => void;
  onApplyToChat: () => void;
  onDuplicate: (presetId: string, newName?: string) => void;
  onDelete: (presetId: string) => void;
  className?: string;
}

export default function PresetEditor({
  preset,
  isDirty,
  onFieldChange,
  onSave,
  onApplyToChat,
  onDuplicate,
  onDelete,
  className = '',
}: PresetEditorProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'type' | 'output'>('basic');
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

  // Ensure we don't stay on "type" tab when no type-specific fields exist
  useEffect(() => {
    if (activeTab === 'type' && preset?.taskType === 'general') {
      setActiveTab('basic');
    }
  }, [activeTab, preset?.taskType]);

  if (!preset) {
    return (
      <section className={className} style={{ background: 'var(--color-surface-variant)' }} aria-label="Preset Editor">
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <Icon name="edit" className="text-4xl mb-2" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.5 }} />
            <p className="text-sm text-secondary">
              Select a preset to edit or create a new one
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={className} style={{ background: 'var(--color-surface-variant)' }} aria-label="Preset Editor">
      <div className="h-full flex flex-col">
        {/* Editor content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="max-w-5xl mx-auto">
            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b" style={{ borderColor: 'var(--color-outline)' }}>
              <button
                className="px-4 py-2 text-sm font-medium rounded-t-md"
                style={{
                  background: activeTab === 'basic' ? 'var(--color-surface)' : 'transparent',
                  color: 'var(--color-on-surface)',
                  borderTopLeftRadius: '8px',
                  borderTopRightRadius: '8px'
                }}
                aria-selected={activeTab === 'basic'}
                onClick={() => setActiveTab('basic')}
              >
                Basic Settings
              </button>
              <button
                className="px-4 py-2 text-sm font-medium rounded-t-md"
                style={{
                  background: activeTab === 'advanced' ? 'var(--color-surface)' : 'transparent',
                  color: 'var(--color-on-surface)',
                  borderTopLeftRadius: '8px',
                  borderTopRightRadius: '8px'
                }}
                aria-selected={activeTab === 'advanced'}
                onClick={() => setActiveTab('advanced')}
              >
                Advanced Settings<span className="ml-1 text-xs hidden sm:inline" style={{ opacity: 0.6 }}>(Optional)</span>
              </button>
              {preset.taskType !== 'general' && (
                <button
                  className="px-4 py-2 text-sm font-medium rounded-t-md"
                  style={{
                    background: activeTab === 'type' ? 'var(--color-surface)' : 'transparent',
                    color: 'var(--color-on-surface)',
                    borderTopLeftRadius: '8px',
                    borderTopRightRadius: '8px'
                  }}
                  aria-selected={activeTab === 'type'}
                  onClick={() => setActiveTab('type')}
                >
                  {preset.taskType.charAt(0).toUpperCase() + preset.taskType.slice(1)} Settings
                </button>
              )}
              <button
                className="px-4 py-2 text-sm font-medium rounded-t-md"
                style={{
                  background: activeTab === 'output' ? 'var(--color-surface)' : 'transparent',
                  color: 'var(--color-on-surface)',
                  borderTopLeftRadius: '8px',
                  borderTopRightRadius: '8px'
                }}
                aria-selected={activeTab === 'output'}
                onClick={() => setActiveTab('output')}
              >
                Output Settings<span className="ml-1 text-xs hidden sm:inline" style={{ opacity: 0.6 }}>(Optional)</span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="md-card mt-4">
              <div className="px-5 py-5">
                {activeTab === 'basic' && (
                  <BasicSettings
                    preset={preset}
                    onFieldChange={onFieldChange}
                  />
                )}

                {activeTab === 'advanced' && (
                  <AdvancedSettings
                    preset={preset}
                    onFieldChange={onFieldChange}
                  />
                )}

                {activeTab === 'type' && preset.taskType !== 'general' && (
                  <TypeSpecificFields
                    taskType={preset.taskType}
                    options={preset.options || {}}
                    onFieldChange={onFieldChange}
                  />
                )}

                {activeTab === 'output' && (
                  <div className="space-y-4">
                    {preset.options?.format === 'xml' && (
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-1">
                          XML Output Schema / Tags
                        </label>
                        <textarea
                          value={preset.options?.outputXMLSchema || ''}
                          onChange={(e) => onFieldChange('outputXMLSchema', e.target.value)}
                          placeholder="<root><title/><summary/><tags><tag/></tags></root>"
                          className="md-input w-full text-sm resize-none"
                          style={{ padding: '8px 12px' }}
                          rows={3}
                        />
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">
                        Additional Context
                      </label>
                      <textarea
                        value={preset.options?.additionalContext || ''}
                        onChange={(e) => onFieldChange('additionalContext', e.target.value)}
                        placeholder="Background info, definitions, constraints to include in the prompt."
                        className="md-input w-full text-sm resize-none"
                        style={{ padding: '8px 12px' }}
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">
                        Few-shot Examples
                      </label>
                      <textarea
                        value={preset.options?.examplesText || ''}
                        onChange={(e) => onFieldChange('examplesText', e.target.value)}
                        placeholder={`Example:
Q: [task]
A: Let's think step by step... [reasoning]. Therefore, [answer].`}
                        className="md-input w-full text-sm resize-none font-mono"
                        style={{ padding: '8px 12px', fontFamily: 'var(--font-mono, monospace)' }}
                        rows={4}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Unsaved changes indicator below settings */}
            {isDirty && (
              <div className="mt-4 flex items-center gap-2 text-base font-semibold"
                   style={{ color: 'var(--color-attention)' }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--color-attention)' }} />
                {`Unsaved Changes to (${preset.name})`}
              </div>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className="px-6 py-4" 
             style={{ 
               borderTop: '1px solid var(--color-outline)', 
               background: 'var(--color-surface)' 
             }}>
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onApplyToChat}
                className="md-btn md-btn--primary text-sm font-medium"
              >
                Apply to Chat
              </button>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => preset?.id && setShowDuplicateDialog(true)}
                className="md-btn text-sm font-medium"
                disabled={!preset?.id}
                title="Duplicate preset"
              >
                Duplicate
              </button>
              
              <button
                onClick={() => preset?.id && onDelete(preset.id)}
                className="md-btn md-btn--destructive text-sm font-medium"
                disabled={!preset?.id || preset?.name === 'Default'}
                title="Delete preset"
                style={{ color: '#ef4444' }}
              >
                Delete
              </button>
              
              <button
                onClick={onSave}
                disabled={!isDirty}
                className="md-btn md-btn--primary text-sm font-medium"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Icon name="save" className="text-base" />
                Save Preset
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Duplicate Confirm Dialog with name input */}
      <SaveAsDialog
        isOpen={showDuplicateDialog}
        currentName={preset?.name || 'Untitled'}
        title="Duplicate Preset"
        message={`Are you sure you want to duplicate "${preset?.name}"? You can change the name below.`}
        confirmLabel="Duplicate"
        onSave={(newName) => {
          if (preset?.id) {
            onDuplicate(preset.id, newName);
          }
          setShowDuplicateDialog(false);
        }}
        onCancel={() => setShowDuplicateDialog(false)}
      />
    </section>
  );
}
