import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, Sparkles, ChevronDown, X, Sliders } from 'lucide-react';
import { THEME_PRESETS, ThemePresetId, ThemePreset, applyTheme } from '../utils/themePresets';

interface ThemeSelectorProps {
  currentThemeId: ThemePresetId;
  onThemeChange: (themeId: ThemePresetId) => void;
  isKm: boolean;
  className?: string;
  variant?: 'header' | 'inline';
}

export default function ThemeSelector({
  currentThemeId,
  onThemeChange,
  isKm,
  className = '',
  variant = 'header'
}: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activePreset = THEME_PRESETS.find(t => t.id === currentThemeId) || THEME_PRESETS[0];

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (preset: ThemePreset) => {
    applyTheme(preset.id);
    onThemeChange(preset.id);
    if (variant === 'header') {
      setIsOpen(false);
    }
  };

  if (variant === 'inline') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ${className}`}>
        {THEME_PRESETS.map((preset) => {
          const isSelected = preset.id === currentThemeId;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelect(preset)}
              className={`relative text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
                isSelected
                  ? 'border-indigo-400/80 bg-slate-900/90 shadow-lg shadow-indigo-950/50 ring-2 ring-indigo-500/30'
                  : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
              }`}
            >
              {/* Preview Bar */}
              <div
                className="w-full h-8 rounded-lg shadow-inner relative overflow-hidden flex items-center justify-between px-3 border border-white/15"
                style={{ background: preset.previewGradient }}
              >
                <div className="flex items-center gap-1.5">
                  {preset.dotColors.map((col, idx) => (
                    <span
                      key={idx}
                      className="w-2.5 h-2.5 rounded-full border border-black/30 shadow-sm"
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-bold text-white/90 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/20">
                  {preset.badge}
                </span>
              </div>

              {/* Title & Description */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    <span>{isKm ? preset.nameKm : preset.name}</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                    {isKm ? preset.taglineKm : preset.tagline}
                  </p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center border transition-colors ${
                    isSelected
                      ? 'bg-indigo-500 border-indigo-400 text-white'
                      : 'border-slate-700 bg-slate-800/80 text-transparent'
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Header Trigger Button */}
      <button
        id="theme-selector-trigger"
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="btn-3d-glass btn-3d-glass-slate px-2.5 sm:px-3 py-1.5 text-xs font-semibold gap-2 border border-slate-700/60 shadow-sm hover:border-slate-600 transition-colors"
        title={isKm ? 'ជ្រើសរើសរចនាបថពណ៌ Theme' : 'Choose Aesthetic Theme Preset'}
        aria-expanded={isOpen}
      >
        <Palette className="w-3.5 h-3.5 text-indigo-400" />
        
        {/* Color Palette Dots */}
        <span className="hidden sm:inline-flex items-center gap-1 bg-black/30 px-1.5 py-0.5 rounded-md border border-white/10">
          {activePreset.dotColors.map((col, idx) => (
            <span
              key={idx}
              className="w-2 h-2 rounded-full border border-black/40 shadow-xs"
              style={{ backgroundColor: col }}
            />
          ))}
        </span>

        <span className="hidden md:inline font-medium text-slate-200">
          {isKm ? activePreset.name : activePreset.name}
        </span>

        <ChevronDown
          className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Floating Theme Preset Selector Menu */}
      {isOpen && (
        <div
          id="theme-selector-menu"
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-slate-950/95 border border-slate-800/90 shadow-2xl shadow-black/80 backdrop-blur-2xl z-50 p-3.5 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Menu Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                <Palette className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-100">
                  {isKm ? 'រចនាបថពណ៌ Theme (Aesthetic Themes)' : 'Aesthetic Theme Presets'}
                </h3>
                <p className="text-[10px] text-slate-400">
                  {isKm ? 'ប្តូរពណ៌ ពន្លឺ និង gradients ទូទាំង UI ភ្លាមៗ' : 'Live updates global CSS variables & gradients'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Theme Presets List */}
          <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto pr-0.5">
            {THEME_PRESETS.map((preset) => {
              const isSelected = preset.id === currentThemeId;
              return (
                <button
                  key={preset.id}
                  id={`theme-preset-${preset.id}`}
                  type="button"
                  onClick={() => handleSelect(preset)}
                  className={`group relative text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                    isSelected
                      ? 'border-indigo-400/90 bg-indigo-950/30 shadow-md ring-1 ring-indigo-500/40'
                      : 'border-slate-800/70 bg-slate-900/40 hover:border-slate-700/90 hover:bg-slate-900/80'
                  }`}
                >
                  {/* Swatch Pill with Gradient */}
                  <div
                    className="w-14 h-11 rounded-lg shrink-0 border border-white/20 shadow-md relative overflow-hidden flex flex-col justify-between p-1"
                    style={{ background: preset.previewGradient }}
                  >
                    <div className="flex items-center gap-1">
                      {preset.dotColors.map((col, idx) => (
                        <span
                          key={idx}
                          className="w-1.5 h-1.5 rounded-full border border-black/40"
                          style={{ backgroundColor: col }}
                        />
                      ))}
                    </div>
                    <span className="text-[8px] font-black text-white/90 bg-black/50 px-1 rounded backdrop-blur-xs self-start tracking-tighter">
                      {preset.id.split('-')[0].toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-100 group-hover:text-white">
                        {isKm ? preset.nameKm : preset.name}
                      </span>
                      <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300">
                        {preset.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {isKm ? preset.taglineKm : preset.tagline}
                    </p>
                  </div>

                  {/* Active Indicator Checkmark */}
                  <div
                    className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center border transition-colors ${
                      isSelected
                        ? 'bg-indigo-500 border-indigo-400 text-white shadow-sm shadow-indigo-500/50'
                        : 'border-slate-700/80 bg-slate-800/40 text-transparent group-hover:border-slate-600'
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bottom helper tip */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              {isKm ? 'រក្សាទុកដោយស្វ័យប្រវត្តិក្នង Browser' : 'Auto-saved in browser preferences'}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {THEME_PRESETS.length} presets
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
