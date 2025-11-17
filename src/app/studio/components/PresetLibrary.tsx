"use client";

import React, { useState } from 'react';
import { Icon } from '@/components/Icon';
import { CustomSelect } from '@/components/CustomSelect';
import PresetCard from '@/app/studio/components/PresetCard';
import type { PresetLite } from '@/app/studio/types';

interface PresetLibraryProps {
  presets: PresetLite[];
  selectedPresetId: string | null;
  onSelectPreset: (id: string) => void;
  onCreateNew?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function PresetLibrary({
  presets,
  selectedPresetId,
  onSelectPreset,
  onCreateNew,
  className = '',
  style,
}: PresetLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'general' | 'coding' | 'image' | 'video' | 'research' | 'writing' | 'marketing'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'temperature'>('name');

  // Filter + sort presets
  const filteredPresets = presets
    .filter(preset => (typeFilter === 'all' ? true : preset.taskType === typeFilter))
    .filter(preset => {
      const query = searchQuery.toLowerCase();
      return preset.name.toLowerCase().includes(query) || preset.taskType.toLowerCase().includes(query);
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      const at = a.options?.temperature ?? 0;
      const bt = b.options?.temperature ?? 0;
      return at - bt;
    });

  return (
    <section className={className} style={{ background: 'var(--color-surface-variant)', ...style }} aria-label="Preset Library">
      <div className="h-full flex flex-col">
        {/* Sticky Header */}
        <div className="px-6 pt-4 pb-3 sticky top-0 z-10"
             style={{ background: 'var(--color-surface-variant)', borderBottom: '1px solid var(--color-outline)' }}>
          <div className="flex flex-col gap-3">
            <h2 className="text-xs font-bold tracking-wide uppercase text-secondary">
              Your Presets <span className="ml-2 text-[10px]" style={{ opacity: 0.7 }}>({filteredPresets.length})</span>
            </h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="search"
                  placeholder="Search presets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="md-input w-64 px-3 py-1.5 pr-8 text-sm"
                  style={{ padding: '6px 12px', paddingRight: '32px' }}
                  aria-label="Search presets"
                />
                <Icon 
                  name="search" 
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm" 
                  style={{ color: 'var(--color-on-surface-variant)' }}
                />
              </div>
              <CustomSelect
                value={typeFilter}
                onChange={(v) => setTypeFilter(v as any)}
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'general', label: 'General' },
                  { value: 'coding', label: 'Coding' },
                  { value: 'image', label: 'Image' },
                  { value: 'video', label: 'Video' },
                  { value: 'research', label: 'Research' },
                  { value: 'writing', label: 'Writing' },
                  { value: 'marketing', label: 'Marketing' },
                ]}
              />
              <CustomSelect
                value={sortBy}
                onChange={(v) => setSortBy(v as any)}
                options={[
                  { value: 'name', label: 'Sort: Name' },
                  { value: 'temperature', label: 'Sort: Temperature' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Preset Cards Container */}
        <div className="flex-1 px-6 pb-4 overflow-y-auto">
          {filteredPresets.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Icon name="folder-open" className="text-4xl mb-2" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.5 }} />
                <p className="text-sm text-secondary">
                  {searchQuery ? 'No presets match your search' : 'No presets yet'}
                </p>
                {!searchQuery && onCreateNew && (
                  <p className="text-xs mt-1 text-secondary" style={{ opacity: 0.7 }}>
                    Click "New Preset" to create your first preset
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div role="list" className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(220px,1fr))] py-2">
              {onCreateNew && (
                <button
                  onClick={onCreateNew}
                  className="relative flex flex-col items-center justify-center p-3 rounded-lg border transition-all hover:shadow-lg cursor-pointer min-w-[220px] max-w-[220px] h-[136px]"
                  style={{ borderColor: 'var(--color-outline)', background: 'var(--color-surface)' }}
                  aria-label="Create new preset"
                >
                  <Icon name="plus" className="text-xl mb-1.5" />
                  <span className="text-xs font-medium" style={{ color: 'var(--color-on-surface)' }}>New Preset</span>
                </button>
              )}
              {filteredPresets.map((preset) => (
                <PresetCard
                  key={preset.id || preset.name}
                  preset={preset}
                  isSelected={selectedPresetId === preset.id}
                  onSelect={() => onSelectPreset(preset.id || preset.name)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
