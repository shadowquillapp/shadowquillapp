"use client";

import React from 'react';
import type { PresetLite } from '@/app/studio/types';

interface PresetCardProps {
  preset: PresetLite;
  isSelected: boolean;
  onSelect: () => void;
}

export default function PresetCard({
  preset,
  isSelected,
  onSelect,
}: PresetCardProps) {
  const isDefault = preset.name === 'Default';
  const temperature = preset.options?.temperature ?? 0.7;
  const band =
    temperature <= 0.3 ? { name: 'Precise', color: '#3b82f6' } :
    temperature <= 0.7 ? { name: 'Balanced', color: '#eab308' } :
    { name: 'Creative', color: '#a855f7' };

  const capitalize = (s: string | undefined) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
  const taskTypeLabel = capitalize(preset.taskType);
  const toneLabel = capitalize(preset.options?.tone || 'neutral');
  const detailLabel = capitalize(preset.options?.detail || 'normal');
  const formatMap: Record<string, string> = { markdown: 'Markdown', plain: 'Plain Text', xml: 'XML' };
  const formatLabel = formatMap[preset.options?.format || 'plain'] || capitalize(preset.options?.format || 'plain');

  return (
    <div
      className="relative flex flex-col p-2.5 rounded-lg border transition-all
                 hover:shadow-lg cursor-pointer w-full group"
      style={{
        borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-outline)',
        background: isSelected ? 'var(--color-surface)' : 'var(--color-surface-variant)',
        boxShadow: isSelected ? 'var(--shadow-1)' : 'none',
      }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-label={`Select preset: ${preset.name}`}
      aria-pressed={isSelected}
    >
      {/* Preset info */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm leading-tight line-clamp-1" style={{ color: 'var(--color-on-surface)' }}>
            {preset.name}
          </h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-surface-variant)] border border-[var(--color-outline)] text-secondary shrink-0">
            {taskTypeLabel}
          </span>
        </div>
        <div className="text-[11px] text-secondary flex items-center gap-1.5 opacity-80 flex-wrap leading-tight">
          <span className="truncate">
            {toneLabel} • {detailLabel} • {formatLabel} • Temp: {temperature.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
}
