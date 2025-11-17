"use client";

import React, { useState } from 'react';
import { Icon } from '@/components/Icon';
import { CustomSelect } from '@/components/CustomSelect';
import BasicSettings from '@/app/studio/presets/components/BasicSettings';
import AdvancedSettings from '@/app/studio/presets/components/AdvancedSettings';
import TypeSpecificFields from '@/app/studio/presets/components/TypeSpecificFields';
import SaveAsDialog from '@/app/studio/presets/components/SaveAsDialog';
import type { PresetLite } from '@/app/studio/presets/types';

interface PresetEditorProps {
  preset: PresetLite | null;
  isDirty: boolean;
  onFieldChange: (field: string, value: any) => void;
  onSave: () => void;
  onSaveAs: (newName: string) => void;
  onApplyToChat: () => void;
  className?: string;
}

export default function PresetEditor({
  preset,
  isDirty,
  onFieldChange,
  onSave,
  onSaveAs,
  onApplyToChat,
  className = '',
}: PresetEditorProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['basic'])
  );
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

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
          <div className="max-w-5xl mx-auto space-y-4">
            {/* Section: Basic Settings */}
            <div className="md-card">
              <button
                onClick={() => toggleSection('basic')}
                className="w-full px-5 py-3 flex items-center justify-between
                           transition-colors rounded-t-lg"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-outline)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                aria-expanded={expandedSections.has('basic')}
              >
                <h3 className="text-sm font-bold tracking-wide uppercase text-secondary">
                  Basic Settings
                </h3>
                <Icon 
                  name={expandedSections.has('basic') ? 'chevron-down' : 'chevron-right'}
                  className="text-lg text-secondary"
                />
              </button>
              {expandedSections.has('basic') && (
                <div className="px-5 pb-5">
                  <BasicSettings
                    preset={preset}
                    onFieldChange={onFieldChange}
                  />
                </div>
              )}
            </div>

            {/* Section: Advanced Settings */}
            <div className="md-card">
              <button
                onClick={() => toggleSection('advanced')}
                className="w-full px-5 py-3 flex items-center justify-between
                           transition-colors rounded-t-lg"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-outline)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                aria-expanded={expandedSections.has('advanced')}
              >
                <h3 className="text-sm font-bold tracking-wide uppercase text-secondary">
                  Advanced Settings
                  <span className="ml-2 text-xs font-normal" style={{ opacity: 0.6 }}>(Optional)</span>
                </h3>
                <Icon 
                  name={expandedSections.has('advanced') ? 'chevron-down' : 'chevron-right'}
                  className="text-lg text-secondary"
                />
              </button>
              {expandedSections.has('advanced') && (
                <div className="px-5 pb-5">
                  <AdvancedSettings
                    preset={preset}
                    onFieldChange={onFieldChange}
                  />
                </div>
              )}
            </div>

            {/* Section: Type-Specific Settings */}
            {preset.taskType !== 'general' && (
              <div className="md-card">
                <button
                  onClick={() => toggleSection('typeSpecific')}
                  className="w-full px-5 py-3 flex items-center justify-between
                             transition-colors rounded-t-lg"
                  style={{ background: 'transparent' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-outline)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  aria-expanded={expandedSections.has('typeSpecific')}
                >
                  <h3 className="text-sm font-bold tracking-wide uppercase text-secondary">
                    {preset.taskType.charAt(0).toUpperCase() + preset.taskType.slice(1)} Settings
                  </h3>
                  <Icon 
                    name={expandedSections.has('typeSpecific') ? 'chevron-down' : 'chevron-right'}
                    className="text-lg text-secondary"
                  />
                </button>
                {expandedSections.has('typeSpecific') && (
                  <div className="px-5 pb-5">
                    <TypeSpecificFields
                      taskType={preset.taskType}
                      options={preset.options || {}}
                      onFieldChange={onFieldChange}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Section: Output Settings */}
            <div className="md-card">
              <button
                onClick={() => toggleSection('output')}
                className="w-full px-5 py-3 flex items-center justify-between
                           transition-colors rounded-t-lg"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-outline)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                aria-expanded={expandedSections.has('output')}
              >
                <h3 className="text-sm font-bold tracking-wide uppercase text-secondary">
                  Output Settings
                  <span className="ml-2 text-xs font-normal" style={{ opacity: 0.6 }}>(Optional)</span>
                </h3>
                <Icon 
                  name={expandedSections.has('output') ? 'chevron-down' : 'chevron-right'}
                  className="text-lg text-secondary"
                />
              </button>
              {expandedSections.has('output') && (
                <div className="px-5 pb-5 space-y-4">
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
                      placeholder="Example:
Q: [task]
A: Let's think step by step... [reasoning]. Therefore, [answer]."
                      className="md-input w-full text-sm resize-none font-mono"
                      style={{ padding: '8px 12px', fontFamily: 'var(--font-mono, monospace)' }}
                      rows={4}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="px-6 py-4" 
             style={{ 
               borderTop: '1px solid var(--color-outline)', 
               background: 'var(--color-surface)' 
             }}>
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="text-xs text-secondary">
              {isDirty && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-attention)' }} />
                  Unsaved changes
                </span>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onApplyToChat}
                className="md-btn text-sm font-medium"
              >
                Apply to Chat
              </button>
              
              <button
                onClick={() => {
                  const newName = prompt('Save as new preset with name:', preset.name + ' Copy');
                  if (newName) {
                    onFieldChange('name', newName);
                    onSave();
                  }
                }}
                className="md-btn text-sm font-medium"
              >
                Save As...
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
    </section>
  );
}
