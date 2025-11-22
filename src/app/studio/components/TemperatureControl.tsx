"use client";

import React, { useState } from 'react';
import { Icon } from '@/components/Icon';

interface TemperatureControlProps {
  value: number;
  onChange: (value: number) => void;
}

export default function TemperatureControl({ value, onChange }: TemperatureControlProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Determine semantic band
  const getBand = (val: number) => {
    if (val <= 0.3) return { name: 'Precise', color: 'blue' };
    if (val <= 0.7) return { name: 'Balanced', color: 'yellow' };
    return { name: 'Creative', color: 'purple' };
  };
  
  const band = getBand(value);
  
  // Band colors for styling
  const bandStyles: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', border: '#3b82f6' },
    yellow: { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308', border: '#eab308' },
    purple: { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7', border: '#a855f7' },
  };

  const currentBandStyle = bandStyles[band.color as keyof typeof bandStyles];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-secondary flex items-center gap-1">
          Temperature (Creativity)
          <div className="relative inline-block">
            <button
              type="button"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              className="p-0.5 transition-colors"
              style={{ color: 'var(--color-on-surface-variant)' }}
              onMouseOver={(e) => e.currentTarget.style.color = 'var(--color-on-surface)'}
              onMouseOut={(e) => e.currentTarget.style.color = 'var(--color-on-surface-variant)'}
              aria-label="Temperature information"
            >
              <Icon name="info" className="text-xs" />
            </button>
            {showTooltip && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20
                              w-64 p-3 rounded-lg shadow-xl"
                   style={{ 
                     background: 'var(--color-surface)', 
                     border: '1px solid var(--color-outline)' 
                   }}>
                <div className="text-xs space-y-1" style={{ color: 'var(--color-on-surface)' }}>
                  <p className="font-medium">Temperature controls randomness:</p>
                  <p><span style={{ color: '#3b82f6' }}>0.0-0.3</span>: Focused, deterministic responses</p>
                  <p><span style={{ color: '#eab308' }}>0.4-0.7</span>: Balanced creativity and consistency</p>
                  <p><span style={{ color: '#a855f7' }}>0.8-1.0</span>: Creative, diverse outputs</p>
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                  <div className="w-2 h-2 transform rotate-45" 
                       style={{ 
                         background: 'var(--color-surface)', 
                         borderBottom: '1px solid var(--color-outline)', 
                         borderRight: '1px solid var(--color-outline)' 
                       }} />
                </div>
              </div>
            )}
          </div>
        </label>
        <span className="px-2 py-1 text-xs font-medium rounded-full border"
              style={{
                background: currentBandStyle.bg,
                color: currentBandStyle.text,
                borderColor: currentBandStyle.border,
              }}>
          {band.name}
        </span>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, 
                #3b82f6 0%, #3b82f6 30%, 
                #eab308 30%, #eab308 70%, 
                #a855f7 70%, #a855f7 100%)`,
            }}
          />
          {/* Value indicator */}
          <div 
            className="absolute -bottom-6 text-xs text-secondary pointer-events-none"
            style={{ left: `${value * 100}%`, transform: 'translateX(-50%)' }}
          >
            {value.toFixed(2)}
          </div>
        </div>
      </div>
      
      {/* Semantic markers */}
      <div className="flex justify-between text-xs text-secondary px-1 mt-8" style={{ opacity: 0.7 }}>
        <span>Precise</span>
        <span>Balanced</span>
        <span>Creative</span>
      </div>
    </div>
  );
}
