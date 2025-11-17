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
      className="relative flex flex-col p-3 rounded-lg border transition-all
                 hover:shadow-lg cursor-pointer min-w-[220px] max-w-[220px] h-[136px] group"
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
      {/* Kebab for actions on small screens (optional future) */}

      {/* Preset info */}
      <div className="flex-1 mb-2">
        <h3 className="font-semibold text-sm mb-0.5 pr-6 line-clamp-2" style={{ color: 'var(--color-on-surface)' }}>
          {preset.name}
        </h3>
        <div className="text-xs text-secondary">{taskTypeLabel}</div>
        <div className="mt-0.5 text-[11px] text-secondary flex items-center flex-wrap gap-x-2">
          <span>{toneLabel} Tone • {detailLabel} Detail • {formatLabel}</span>
        </div>
      </div>
    </div>
  );
}
