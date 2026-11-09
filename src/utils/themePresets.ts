/**
 * Aesthetic Theme Presets and Management for Social Video Downloader
 */

export type ThemePresetId =
  | 'midnight-blue'
  | 'cyberpunk-purple'
  | 'minimalist-slate'
  | 'emerald-matrix'
  | 'sunset-amber';

export interface ThemePreset {
  id: ThemePresetId;
  name: string;
  nameKm: string;
  tagline: string;
  taglineKm: string;
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  previewGradient: string;
  badge: string;
  dotColors: [string, string, string];
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    nameKm: 'ខៀវរាត្រី (Midnight Blue)',
    tagline: 'Deep oceanic navy with sapphire & electric indigo glow',
    taglineKm: 'ពណ៌ខៀវទឹកសមុទ្រជ្រៅ លាយពន្លឺខៀវ Sapphire & ឥន្ទនីល',
    primaryColor: '#3b82f6',
    accentColor: '#38bdf8',
    bgColor: '#030712',
    previewGradient: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #38bdf8 100%)',
    badge: 'Classic Default',
    dotColors: ['#3b82f6', '#0ea5e9', '#6366f1']
  },
  {
    id: 'cyberpunk-purple',
    name: 'Cyberpunk Purple',
    nameKm: 'ស្វាយសាយប័រផាំង (Cyberpunk)',
    tagline: 'Neon violet, vivid synth fuchsia & ultraviolet radiance',
    taglineKm: 'ពន្លឺស្វាយ Neon រួមជាមួយផ្កាឈូក Fuchsia បែបអនាគត',
    primaryColor: '#a855f7',
    accentColor: '#ec4899',
    bgColor: '#080214',
    previewGradient: 'linear-gradient(135deg, #701a75 0%, #a855f7 50%, #ec4899 100%)',
    badge: 'Neon Glow',
    dotColors: ['#a855f7', '#ec4899', '#06b6d4']
  },
  {
    id: 'minimalist-slate',
    name: 'Minimalist Slate',
    nameKm: 'ប្រផេះស្អាត (Minimalist Slate)',
    tagline: 'Refined graphite, subtle platinum & architectural mono',
    taglineKm: 'ពណ៌ប្រផេះចាស់ស្រទន់ រចនាបថស្អាតបែប Monochromatic',
    primaryColor: '#94a3b8',
    accentColor: '#e2e8f0',
    bgColor: '#090c10',
    previewGradient: 'linear-gradient(135deg, #1e293b 0%, #475569 50%, #94a3b8 100%)',
    badge: 'Clean & Focus',
    dotColors: ['#94a3b8', '#cbd5e1', '#475569']
  },
  {
    id: 'emerald-matrix',
    name: 'Emerald Matrix',
    nameKm: 'ត្បូងមរកត (Emerald Matrix)',
    tagline: 'Bio-digital deep forest obsidian, mint jade & cyber green',
    taglineKm: 'ពណ៌បៃតងត្បូងមរកត លាយពន្លឺម្ជុលពេជ្រ និងព្រៃជ្រៅ',
    primaryColor: '#10b981',
    accentColor: '#34d399',
    bgColor: '#021008',
    previewGradient: 'linear-gradient(135deg, #064e3b 0%, #10b981 50%, #34d399 100%)',
    badge: 'Bio-Digital',
    dotColors: ['#10b981', '#14b8a6', '#34d399']
  },
  {
    id: 'sunset-amber',
    name: 'Sunset Amber',
    nameKm: 'ក្រហមអស្តង្គត (Sunset Amber)',
    tagline: 'Luminescent golden amber, warm copper & dusk crimson',
    taglineKm: 'ពណ៌ទឹកក្រូចមាស លាយក្រហមអស្តង្គតកក់ក្តៅ និងរស់រវើក',
    primaryColor: '#f59e0b',
    accentColor: '#f97316',
    bgColor: '#100702',
    previewGradient: 'linear-gradient(135deg, #78350f 0%, #f59e0b 50%, #f97316 100%)',
    badge: 'Warm Radiant',
    dotColors: ['#f59e0b', '#f97316', '#f43f5e']
  }
];

export const DEFAULT_THEME_ID: ThemePresetId = 'midnight-blue';

export function getStoredTheme(): ThemePresetId {
  try {
    const saved = localStorage.getItem('svd_theme');
    if (saved && THEME_PRESETS.some(t => t.id === saved)) {
      return saved as ThemePresetId;
    }
  } catch {}
  return DEFAULT_THEME_ID;
}

export function applyTheme(themeId: ThemePresetId): void {
  try {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', themeId);
      // Also sync body class for background transitions
      document.body.setAttribute('data-theme', themeId);
      localStorage.setItem('svd_theme', themeId);
    }
  } catch (err) {
    console.error('Failed to apply theme:', err);
  }
}
