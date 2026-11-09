import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Globe,
  Search,
  ExternalLink,
  Copy,
  Check,
  X,
  Sparkles,
  Share2,
  Tv,
  Film,
  Download,
  Zap,
  ArrowRight,
  Flame,
  Layers
} from 'lucide-react';
import {
  SUPPORTED_COUNTRIES,
  GLOBAL_SOCIAL_NETWORKS,
  SocialNetworkPlatform,
  getSocialPlatformsByCountry
} from '../utils/socialSearchHelper';
import { POPULAR_DRAMA_TITLES, DramaTitleItem } from '../data/popularDramaTitles';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isKm: boolean;
  initialQuery?: string;
  onSendToDownloader?: (url: string, isPosterScan?: boolean) => void;
  showToast: (msg: string) => void;
}

export default function GlobalSocialSearchModal({
  isOpen,
  onClose,
  isKm,
  initialQuery = 'After Divorce',
  onSendToDownloader,
  showToast
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'shortvideo' | 'drama' | 'social'>('all');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery || 'After Divorce');
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, initialQuery]);

  // Handle ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const activeQuery = (query || '').trim() || 'Drama';

  // Filtered platforms
  const filteredPlatforms = useMemo(() => {
    let list = getSocialPlatformsByCountry(selectedCountry);
    if (selectedCategory !== 'all') {
      list = list.filter(p => p.category === selectedCategory);
    }
    return list;
  }, [selectedCountry, selectedCategory]);

  // Suggested popular titles for quick switching
  const quickDramaSuggestions = useMemo(() => {
    return POPULAR_DRAMA_TITLES.slice(0, 8);
  }, []);

  const handleCopyLink = (platform: SocialNetworkPlatform, e: React.MouseEvent) => {
    e.stopPropagation();
    const searchUrl = platform.getSearchUrl(activeQuery);
    navigator.clipboard.writeText(searchUrl);
    setCopiedId(platform.id);
    showToast(isKm ? `បានចម្លងតំណភ្ជាប់ស្វែងរកលើ ${platform.name}` : `Copied ${platform.name} search URL`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenPlatform = (platform: SocialNetworkPlatform) => {
    const searchUrl = platform.getSearchUrl(activeQuery);
    window.open(searchUrl, '_blank', 'noopener,noreferrer');
  };

  // Open Top 4 Social Networks in tabs
  const handleOpenTopBatch = () => {
    const topFour = filteredPlatforms.slice(0, 4);
    topFour.forEach(p => {
      window.open(p.getSearchUrl(activeQuery), '_blank', 'noopener,noreferrer');
    });
    showToast(
      isKm
        ? `បានបើកស្វែងរកលើបណ្ដាញសង្គម ${topFour.length} ក្នុងពេលតែមួយ!`
        : `Opened ${topFour.length} social platforms in tabs!`
    );
  };

  if (!isOpen) return null;

  return (
    <div
      id="global-social-search-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="global-social-search-container"
        className="bg-slate-900 border border-teal-500/40 w-full max-w-5xl rounded-2xl shadow-2xl shadow-teal-950/70 overflow-hidden flex flex-col max-h-[92vh] my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-teal-950/40 to-slate-950 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-400 to-cyan-500 flex items-center justify-center text-slate-950 shadow-md shadow-teal-500/30 shrink-0">
              <Globe className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>{isKm ? 'ស្វែងរកតាមឈ្មោះ ភ្ជាប់គ្រប់បណ្ដាញសង្គមគ្រប់ប្រទេស' : 'Auto Search Across All Global Social Networks'}</span>
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Auto Connected
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isKm
                  ? 'វាយបញ្ចូលឈ្មោះរឿង ឬចំណងជើង ដើម្បីភ្ជាប់ទៅ TikTok, Douyin, Kuaishou, YouTube, Facebook, Bilibili គ្រប់ប្រទេសដោយស្វ័យប្រវត្តិ'
                  : 'Type any title or keyword to automatically generate live search feeds across TikTok, Douyin, Kuaishou, YouTube & Facebook worldwide'}
              </p>
            </div>
          </div>

          <button
            id="close-social-search-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title={isKm ? 'បិទ' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/70 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1 flex items-center">
              <Search className="w-5 h-5 text-teal-400 absolute left-3.5 pointer-events-none" />
              <input
                id="social-search-query-input"
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={
                  isKm
                    ? 'វាយឈ្មោះរឿង ឧ. After Divorce, Alpha King, Revenge, 抖音短剧...'
                    : 'Type drama title or name (e.g. After Divorce, Alpha King, Revenge, 抖音短剧)...'
                }
                className="w-full bg-slate-900 border border-slate-700/80 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 text-slate-100 placeholder-slate-500 rounded-xl pl-11 pr-24 py-3 text-sm sm:text-base outline-none transition-all font-medium shadow-inner"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="absolute right-3 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded-md transition-colors cursor-pointer"
                >
                  {isKm ? 'លុប' : 'Clear'}
                </button>
              )}
            </div>

            {/* Quick Batch Open Top Networks Button */}
            <button
              id="batch-open-top-social-btn"
              type="button"
              onClick={handleOpenTopBatch}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold px-4 py-3 rounded-xl transition-all shadow-md shadow-teal-500/20 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm shrink-0"
              title={isKm ? 'បើកស្វែងរកលើបណ្ដាញសង្គមចម្បង 4 ក្នុងពេលតែមួយ' : 'Open top 4 social platforms in tabs'}
            >
              <Share2 className="w-4 h-4 stroke-[2.5]" />
              <span>{isKm ? 'បើកបណ្ដាញសង្គមចម្បងទាំងអស់' : 'Open Top Platforms'}</span>
            </button>
          </div>

          {/* Quick Popular Drama Titles Suggestions Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-slate-500 font-bold shrink-0 flex items-center gap-1 text-[11px]">
              <Flame className="w-3 h-3 text-amber-400" />
              {isKm ? 'ឈ្មោះរឿងល្បីៗ:' : 'Hot Titles:'}
            </span>
            {quickDramaSuggestions.map(drama => (
              <button
                key={drama.id}
                onClick={() => setQuery(drama.title)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 border ${
                  query.toLowerCase() === drama.title.toLowerCase()
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                    : 'bg-slate-800/60 text-slate-300 hover:text-white border-slate-700/60 hover:bg-slate-800'
                }`}
              >
                {drama.title}
              </button>
            ))}
          </div>

          {/* Country Selection Horizontal Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1 border-t border-slate-800/60">
            <span className="text-slate-500 font-bold shrink-0 text-[11px] px-1">
              {isKm ? 'ប្រទេស/តំបន់:' : 'Countries:'}
            </span>
            {SUPPORTED_COUNTRIES.map(c => {
              const isSelected = selectedCountry === c.code;
              return (
                <button
                  key={c.code}
                  id={`country-filter-${c.code}-btn`}
                  onClick={() => setSelectedCountry(c.code)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-md font-black'
                      : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/50'
                  }`}
                >
                  <span className="text-sm">{c.flag}</span>
                  <span>{isKm ? c.nameKm : c.nameEn}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Summary & Category Selector */}
        <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              {isKm ? (
                <>បណ្ដាញសង្គមចំនួន <strong className="text-teal-400 font-bold">{filteredPlatforms.length}</strong> ភ្ជាប់ជាមួយពាក្យគន្លឹះ: "<strong className="text-white">{activeQuery}</strong>"</>
              ) : (
                <>Connected <strong className="text-teal-400 font-bold">{filteredPlatforms.length}</strong> platforms for: "<strong className="text-white">{activeQuery}</strong>"</>
              )}
            </span>
          </div>

          {/* Sub-category pills */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                selectedCategory === 'all' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isKm ? 'ទាំងអស់' : 'All'}
            </button>
            <button
              onClick={() => setSelectedCategory('shortvideo')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                selectedCategory === 'shortvideo' ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              TikTok/Reels
            </button>
            <button
              onClick={() => setSelectedCategory('drama')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                selectedCategory === 'drama' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Short Drama / Kuaishou
            </button>
            <button
              onClick={() => setSelectedCategory('social')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                selectedCategory === 'social' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              FB / RED
            </button>
          </div>
        </div>

        {/* Social Platforms Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredPlatforms.map((platform) => {
            const searchUrl = platform.getSearchUrl(activeQuery);
            return (
              <div
                key={platform.id}
                id={`social-platform-card-${platform.id}`}
                className={`bg-gradient-to-br ${platform.bgGradient} border border-slate-800 hover:border-teal-500/40 p-4 rounded-xl shadow-lg transition-all flex flex-col justify-between gap-3 group`}
              >
                {/* Top: Platform Name, Flag & Country */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{platform.countryFlag}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm sm:text-base text-white group-hover:text-teal-300 transition-colors">
                          {platform.name}
                        </h4>
                        <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${platform.colorBadge}`}>
                          {platform.countryFlag} {isKm ? platform.countryNameKm : platform.countryNameEn}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isKm ? platform.descriptionKm : platform.descriptionEn}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Middle: Search preview link */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg px-3 py-1.5 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span className="truncate max-w-[280px] sm:max-w-sm text-slate-300">
                    {searchUrl}
                  </span>
                  <button
                    onClick={(e) => handleCopyLink(platform, e)}
                    className="ml-2 text-slate-400 hover:text-teal-300 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                    title={isKm ? 'ចម្លងតំណភ្ជាប់ស្វែងរក' : 'Copy Search URL'}
                  >
                    {copiedId === platform.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/50">
                  {platform.isDownloadSupportedInApp && onSendToDownloader ? (
                    <button
                      type="button"
                      onClick={() => {
                        const qTrim = query.trim();
                        const qLower = qTrim.toLowerCase();
                        let targetToSend = searchUrl;

                        if (qLower) {
                          const matched = POPULAR_DRAMA_TITLES.find(d => 
                            d.title.toLowerCase().includes(qLower) ||
                            qLower.includes(d.title.toLowerCase()) ||
                            d.tags.some(t => t.toLowerCase() === qLower)
                          );
                          if (matched?.url) {
                            targetToSend = matched.url;
                          } else {
                            targetToSend = qTrim;
                          }
                        }

                        onSendToDownloader(targetToSend);
                        onClose();
                        showToast(isKm ? `បានបញ្ជូនទៅប្រអប់ទាញយក: ${platform.name}` : `Sent to Downloader: ${platform.name}`);
                      }}
                      className="text-xs font-bold text-teal-300 hover:text-teal-200 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      title={isKm ? 'ទាញយក ឬស្កេនក្នុងកម្មវិធីនេះ' : 'Fetch/Scan in App'}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isKm ? 'ទាញយកក្នុង App' : 'Fetch in App'}</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-teal-400" />
                      {isKm ? 'ស្វែងរកផ្ទាល់លើវេបសាយ' : 'Live Platform Feed'}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenPlatform(platform)}
                    className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 flex items-center gap-1.5 transition-all shadow-md shadow-teal-500/20 cursor-pointer ml-auto"
                    title={isKm ? `បើកស្វែងរក ${platform.name} ផ្ទាល់` : `Open live search on ${platform.name}`}
                  >
                    <span>{isKm ? 'បើកស្វែងរកផ្ទាល់' : 'Open Search'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Globe className="w-3.5 h-3.5 text-teal-400" />
            <span>
              {isKm
                ? 'ភ្ជាប់ដោយស្វ័យប្រវត្តិជាមួយ TikTok, Douyin, Kuaishou, YouTube, FB, Bilibili គ្រប់ប្រទេស'
                : 'Connected automatically to TikTok, Douyin, Kuaishou, YouTube, FB & Bilibili in all countries'}
            </span>
          </span>
          <button
            onClick={onClose}
            className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            {isKm ? 'បិទផ្ទាំង' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
