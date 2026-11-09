import React, { useMemo } from 'react';
import {
  Search,
  Sparkles,
  Film,
  ExternalLink,
  ChevronRight,
  Flame,
  Globe,
  Share2,
  X
} from 'lucide-react';
import {
  DramaTitleItem,
  searchDramaTitles
} from '../data/popularDramaTitles';
import { GLOBAL_SOCIAL_NETWORKS } from '../utils/socialSearchHelper';

interface Props {
  query: string;
  isKm: boolean;
  onSelectTitle: (item: DramaTitleItem, action: 'resolve' | 'poster') => void;
  onOpenFullSearch: (currentQuery: string) => void;
  onOpenSocialSearch?: (currentQuery: string) => void;
  onDismiss: () => void;
}

export default function SmartTitleAutocomplete({
  query,
  isKm,
  onSelectTitle,
  onOpenFullSearch,
  onOpenSocialSearch,
  onDismiss
}: Props) {
  const trimmed = (query || '').trim();

  // If query is an actual http URL or empty, don't show the autocomplete
  const isUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://');

  const matches = useMemo(() => {
    if (!trimmed || isUrl) return [];
    return searchDramaTitles(trimmed);
  }, [trimmed, isUrl]);

  if (isUrl || !trimmed) {
    return null;
  }

  const topMatches = matches.slice(0, 5);

  // Top social networks for instant search
  const quickSocials = [
    { name: 'TikTok', flag: '🌐', url: `https://www.tiktok.com/search?q=${encodeURIComponent(trimmed)}`, color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
    { name: '抖音 Douyin', flag: '🇨🇳', url: `https://www.douyin.com/search/${encodeURIComponent(trimmed)}`, color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
    { name: '快手 Kuaishou', flag: '🇨🇳', url: `https://www.kuaishou.com/search/video?searchKey=${encodeURIComponent(trimmed)}`, color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
    { name: 'YouTube', flag: '🌐', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(trimmed)}`, color: 'bg-red-500/20 text-red-300 border-red-500/30' },
    { name: 'FB Watch', flag: '🌐', url: `https://www.facebook.com/watch/search/?q=${encodeURIComponent(trimmed)}`, color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    { name: 'Bilibili', flag: '🇨🇳', url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(trimmed)}`, color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  ];

  return (
    <div
      id="smart-title-autocomplete-dropdown"
      className="absolute top-full left-0 right-0 mt-2 z-40 bg-slate-900/95 backdrop-blur-xl border border-teal-500/40 rounded-2xl shadow-2xl shadow-teal-950/70 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {/* Autocomplete Header */}
      <div className="px-4 py-2.5 bg-gradient-to-r from-slate-950 via-teal-950/40 to-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center">
            <Sparkles className="w-3 h-3" />
          </div>
          <span className="text-xs font-bold text-slate-200">
            {isKm ? (
              <>ស្វែងរកឆ្លាតវ៉ៃ: ត្រូវនឹង "<span className="text-white">{trimmed}</span>" ({matches.length} រឿង)</>
            ) : (
              <>Smart Match: "{trimmed}" ({matches.length} titles)</>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenSocialSearch && (
            <button
              type="button"
              onClick={() => onOpenSocialSearch(trimmed)}
              className="text-[11px] font-bold text-cyan-300 hover:text-white flex items-center gap-1 cursor-pointer bg-cyan-500/20 hover:bg-cyan-500/30 px-2 py-0.5 rounded border border-cyan-500/40 transition-colors"
            >
              <Globe className="w-3 h-3 text-cyan-400" />
              <span>{isKm ? 'គ្រប់បណ្ដាញសង្គម' : 'All Networks'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenFullSearch(trimmed)}
            className="text-[11px] font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20"
          >
            <span>{isKm ? 'មើលទាំងអស់' : 'View All'}</span>
            <ChevronRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
            title={isKm ? 'បិទ' : 'Dismiss'}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Instant Social Networks Quick Search Row Across Countries */}
      <div className="px-4 py-2 bg-slate-950/90 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
        <span className="text-slate-400 font-bold shrink-0 flex items-center gap-1 mr-1">
          <Globe className="w-3 h-3 text-teal-400" />
          {isKm ? 'ស្វែងរកលើបណ្ដាញសង្គម:' : 'Search across socials:'}
        </span>
        {quickSocials.map(s => (
          <a
            key={s.name}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className={`px-2 py-0.5 rounded-md font-semibold whitespace-nowrap border flex items-center gap-1 hover:brightness-125 transition-all cursor-pointer shrink-0 ${s.color}`}
            title={`Search "${trimmed}" on ${s.name}`}
          >
            <span>{s.flag}</span>
            <span>{s.name}</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
          </a>
        ))}
        {onOpenSocialSearch && (
          <button
            type="button"
            onClick={() => onOpenSocialSearch(trimmed)}
            className="px-2 py-0.5 rounded-md font-bold whitespace-nowrap bg-teal-500 text-slate-950 hover:bg-teal-400 transition-colors cursor-pointer shrink-0 flex items-center gap-1"
          >
            <Share2 className="w-2.5 h-2.5" />
            <span>{isKm ? 'ភ្ជាប់គ្រប់ប្រទេស →' : 'All Countries →'}</span>
          </button>
        )}
      </div>

      {/* Suggested Titles List */}
      <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto">
        {topMatches.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <Globe className="w-8 h-8 text-teal-500/40" />
            <p>
              {isKm
                ? `ចុចប៊ូតុងខាងលើ ដើម្បីស្វែងរក "${trimmed}" លើ TikTok, Douyin, YouTube និងបណ្ដាញសង្គមគ្រប់ប្រទេស`
                : `Click above to search "${trimmed}" across TikTok, Douyin, YouTube & all social networks worldwide`}
            </p>
            {onOpenSocialSearch && (
              <button
                type="button"
                onClick={() => onOpenSocialSearch(trimmed)}
                className="mt-1 text-xs font-bold text-teal-300 bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{isKm ? 'បើកផ្ទាំងភ្ជាប់បណ្ដាញសង្គមគ្រប់ប្រទេស' : 'Open Global Social Networks Hub'}</span>
              </button>
            )}
          </div>
        ) : (
          topMatches.map((item) => (
            <div
              key={item.id}
              id={`autocomplete-item-${item.id}`}
              onClick={() => onSelectTitle(item, 'resolve')}
              className="px-4 py-2.5 hover:bg-slate-800/70 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <img
                  src={item.posterUrl}
                  alt={item.title}
                  className="w-10 h-12 rounded object-cover bg-slate-800 shrink-0 border border-slate-700/60 group-hover:border-teal-400/60"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      {item.platformLabel}
                    </span>
                    {item.episodeCount && (
                      <span className="text-[10px] text-slate-400">
                        {item.episodeCount} ភាគ
                      </span>
                    )}
                    {item.viewCount && (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                        <Flame className="w-2.5 h-2.5" />
                        {item.viewCount}
                      </span>
                    )}
                  </div>
                  <h5 className="text-xs sm:text-sm font-semibold text-slate-100 group-hover:text-teal-300 truncate">
                    {item.title}
                  </h5>
                  <p className="text-[11px] text-teal-400/80 truncate">
                    {item.titleKm}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {onOpenSocialSearch && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSocialSearch(item.title);
                    }}
                    className="text-[10px] font-bold px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                    title={isKm ? 'ស្វែងរកលើបណ្ដាញសង្គមគ្រប់ប្រទេស' : 'Search across all social networks'}
                  >
                    <Globe className="w-3 h-3 text-teal-400" />
                    <span className="hidden sm:inline">{isKm ? 'បណ្ដាញសង្គម' : 'Socials'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTitle(item, 'poster');
                  }}
                  className="text-[11px] font-bold px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
                  title={isKm ? 'ស្កេនរក Poster ដើម' : 'Scan Poster'}
                >
                  Poster
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTitle(item, 'resolve');
                  }}
                  className="text-[11px] font-bold px-2.5 py-1 rounded bg-teal-500 hover:bg-teal-400 text-slate-950 transition-colors cursor-pointer flex items-center gap-1 shadow"
                >
                  <span>{isKm ? 'ទាញយក' : 'Fetch'}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer bar */}
      <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span>
          {isKm ? 'ចុចលើរឿងណាមួយ ដើម្បីបញ្ចូលតំណភ្ជាប់ និងទាញយកដោយស្វ័យប្រវត្តិ' : 'Click any title to load URL & auto-fetch'}
        </span>
        <button
          type="button"
          onClick={() => onOpenFullSearch(trimmed)}
          className="text-teal-400 hover:underline font-semibold cursor-pointer"
        >
          {isKm ? `មើលទាំងអស់ (${matches.length}) →` : `View All (${matches.length}) →`}
        </button>
      </div>
    </div>
  );
}
