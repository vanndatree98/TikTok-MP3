import { useState } from 'react';
import { Languages, Check, Copy, Loader2, Sparkles, ChevronDown } from 'lucide-react';

export type SupportedLanguageCode = 'km' | 'en' | 'zh' | 'th' | 'ko' | 'tl';

export interface LanguageOption {
  code: SupportedLanguageCode;
  labelKm: string;
  labelEn: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'km', labelKm: 'ខ្មែរ', labelEn: 'Khmer', flag: '🇰🇭' },
  { code: 'en', labelKm: 'អង់គ្លេស', labelEn: 'English', flag: '🇬🇧' },
  { code: 'zh', labelKm: 'ចិន', labelEn: 'Chinese', flag: '🇨🇳' },
  { code: 'th', labelKm: 'ថៃ', labelEn: 'Thai', flag: '🇹🇭' },
  { code: 'ko', labelKm: 'កូរ៉េ', labelEn: 'Korean', flag: '🇰🇷' },
  { code: 'tl', labelKm: 'ហ្វីលីពីន', labelEn: 'Filipino', flag: '🇵🇭' },
];

interface DramaTitleTranslatorProps {
  originalTitle: string;
  isKm: boolean;
  onShowToast?: (msg: string) => void;
  className?: string;
  compact?: boolean;
}

export default function DramaTitleTranslator({
  originalTitle,
  isKm,
  onShowToast,
  className = '',
  compact = false,
}: DramaTitleTranslatorProps) {
  const [translations, setTranslations] = useState<Partial<Record<SupportedLanguageCode, string>>>({});
  const [activeLang, setActiveLang] = useState<SupportedLanguageCode>('km');
  const [loadingLangs, setLoadingLangs] = useState<Partial<Record<SupportedLanguageCode, boolean>>>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const translateTitle = async (targetLang: SupportedLanguageCode) => {
    if (!originalTitle || !originalTitle.trim()) return;

    // If already translated and cached in local state, just switch
    if (translations[targetLang]) {
      setActiveLang(targetLang);
      return;
    }

    try {
      setLoadingLangs(prev => ({ ...prev, [targetLang]: true }));
      setActiveLang(targetLang);

      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: originalTitle,
          targetLang,
        }),
      });

      if (!res.ok) {
        throw new Error(`Translation failed (${res.status})`);
      }

      const data = await res.json();
      if (data.translatedText) {
        setTranslations(prev => ({
          ...prev,
          [targetLang]: data.translatedText,
        }));
        const targetOption = SUPPORTED_LANGUAGES.find(l => l.code === targetLang);
        const langName = isKm ? targetOption?.labelKm : targetOption?.labelEn;
        if (onShowToast) {
          onShowToast(
            isKm
              ? `បានបកប្រែចំណងជើងជាភាសា ${langName} រួចរាល់!`
              : `Translated title to ${langName} successfully!`
          );
        }
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast(isKm ? 'បរាជ័យក្នុងការបកប្រែចំណងជើង' : 'Failed to translate title');
      }
    } finally {
      setLoadingLangs(prev => ({ ...prev, [targetLang]: false }));
    }
  };

  const handleCopy = (text: string, code: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(code);
    if (onShowToast) {
      onShowToast(isKm ? 'បានចម្លងចំណងជើងបកប្រែ!' : 'Copied translated title!');
    }
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const currentTranslation = translations[activeLang];
  const isLoadingCurrent = !!loadingLangs[activeLang];
  const activeOption = SUPPORTED_LANGUAGES.find(l => l.code === activeLang) || SUPPORTED_LANGUAGES[0];

  if (!originalTitle) return null;

  if (compact) {
    return (
      <div className={`flex flex-col gap-1.5 ${className}`}>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-amber-400/90 flex items-center gap-1">
            <Languages className="w-3.5 h-3.5 text-amber-400" />
            <span>{isKm ? 'បកប្រែ:' : 'Translate:'}</span>
          </span>
          {SUPPORTED_LANGUAGES.map(lang => {
            const isSelected = activeLang === lang.code;
            const isLoaded = !!translations[lang.code];
            const isLoading = !!loadingLangs[lang.code];

            return (
              <button
                key={lang.code}
                onClick={(e) => {
                  e.stopPropagation();
                  translateTitle(lang.code);
                }}
                disabled={isLoading}
                className={`text-[10px] font-medium px-2 py-0.5 rounded-md transition-all flex items-center gap-1 cursor-pointer border ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-xs'
                    : isLoaded
                    ? 'bg-slate-800/90 text-amber-300 border-amber-500/30 hover:bg-slate-700'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title={isKm ? `បកប្រែជាភាសា ${lang.labelKm}` : `Translate to ${lang.labelEn}`}
              >
                <span>{lang.flag}</span>
                <span>{isKm ? lang.labelKm : lang.labelEn}</span>
                {isLoading && <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-400" />}
              </button>
            );
          })}
        </div>

        {/* Display translated text preview if active */}
        {currentTranslation && (
          <div className="bg-slate-950/80 border border-amber-500/30 rounded-lg p-2 text-xs text-amber-200 flex items-start justify-between gap-2 shadow-xs">
            <div className="flex items-start gap-1.5 min-w-0">
              <span className="text-sm shrink-0">{activeOption.flag}</span>
              <span className="font-semibold text-white break-words line-clamp-2">{currentTranslation}</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCopy(currentTranslation, activeLang);
              }}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-300 cursor-pointer shrink-0 transition-colors"
              title={isKm ? 'ចម្លង' : 'Copy'}
            >
              {copiedCode === activeLang ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-amber-950/20 border border-amber-500/30 rounded-xl p-3 sm:p-3.5 shadow-lg backdrop-blur-md flex flex-col gap-2.5 ${className}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Languages className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-white flex items-center gap-1">
            <span>{isKm ? 'បកប្រែចំណងជើងដើម Short Drama' : 'Translate Original Drama Title'}</span>
            <Sparkles className="w-3 h-3 text-amber-400" />
          </span>
        </div>

        <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700 font-mono">
          6 ភាសា (AI Localization)
        </span>
      </div>

      {/* Language Buttons Row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {SUPPORTED_LANGUAGES.map(lang => {
          const isSelected = activeLang === lang.code;
          const isLoaded = !!translations[lang.code];
          const isLoading = !!loadingLangs[lang.code];

          return (
            <button
              key={lang.code}
              type="button"
              id={`translate-btn-${lang.code}`}
              onClick={() => translateTitle(lang.code)}
              disabled={isLoading}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                  : isLoaded
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700/80 hover:text-white'
              } disabled:opacity-60`}
            >
              <span className="text-sm">{lang.flag}</span>
              <span>{isKm ? lang.labelKm : lang.labelEn}</span>
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin text-amber-400 ml-0.5" />
              ) : isLoaded ? (
                <Check className={`w-3 h-3 ${isSelected ? 'text-slate-950' : 'text-emerald-400'} ml-0.5`} />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Translated Result Card */}
      {isLoadingCurrent ? (
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 flex items-center gap-2 text-xs text-amber-300/80 animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
          <span>{isKm ? `កំពុងបកប្រែជាភាសា ${activeOption.labelKm}...` : `Translating into ${activeOption.labelEn}...`}</span>
        </div>
      ) : currentTranslation ? (
        <div className="bg-slate-950/80 border border-amber-500/40 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-inner">
          <div className="flex items-start gap-2 min-w-0">
            <span className="text-base shrink-0 mt-0.5">{activeOption.flag}</span>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                {isKm ? `ចំណងជើងជាភាសា ${activeOption.labelKm}` : `${activeOption.labelEn} Title`}
              </span>
              <p className="text-sm sm:text-base font-bold text-white break-words mt-0.5 leading-snug">
                {currentTranslation}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              id={`copy-translation-${activeLang}`}
              onClick={() => handleCopy(currentTranslation, activeLang)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 hover:text-amber-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {copiedCode === activeLang ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">{isKm ? 'បានចម្លង!' : 'Copied!'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isKm ? 'ចម្លងចំណងជើង' : 'Copy'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
