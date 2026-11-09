import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Sparkles,
  Film,
  Tv,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  X,
  Layers,
  ChevronRight,
  Zap,
  Flame,
  Bookmark,
  Play,
  Globe,
  Share2,
  Download
} from 'lucide-react';
import {
  POPULAR_DRAMA_TITLES,
  DramaTitleItem,
  searchDramaTitles
} from '../data/popularDramaTitles';
import {
  SUPPORTED_COUNTRIES,
  GLOBAL_SOCIAL_NETWORKS,
  SocialNetworkPlatform,
  getSocialPlatformsByCountry
} from '../utils/socialSearchHelper';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isKm: boolean;
  initialQuery?: string;
  initialTab?: 'dramas' | 'social_networks';
  onSelectTitle: (item: DramaTitleItem, action: 'resolve' | 'poster' | 'shortdrama') => void;
  onSendToDownloader?: (url: string) => void;
  showToast: (msg: string) => void;
}

const QUICK_LETTERS = ['A', 'B', 'C', 'D', 'E', 'S', 'T', 'M', 'K', 'W', 'Z'];

export default function SmartTitleSearchModal({
  isOpen,
  onClose,
  isKm,
  initialQuery = '',
  initialTab = 'dramas',
  onSelectTitle,
  onSendToDownloader,
  showToast
}: Props) {
  const [activeTab, setActiveTab] = useState<'dramas' | 'social_networks'>(initialTab);
  const [searchQuery, setSearchQuery] = useState(initialQuery || 'A');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Sync initial query when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery(initialQuery || 'A');
      setActiveTab(initialTab || 'dramas');
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, initialQuery, initialTab]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filtered titles
  const searchResults = useMemo(() => {
    const results = searchDramaTitles(searchQuery);
    if (selectedCategory === 'all') return results;
    return results.filter(item => {
      if (selectedCategory === 'tiktok') return item.platform === 'tiktok';
      if (selectedCategory === 'kuaishou') return item.platform === 'kuaishou';
      if (selectedCategory === 'douyin') return item.platform === 'douyin';
      if (selectedCategory === 'bilibili') return item.platform === 'bilibili';
      return item.category === selectedCategory;
    });
  }, [searchQuery, selectedCategory]);

  const activeSocialQuery = (searchQuery || '').trim() || 'Short Drama';

  // Filtered social platforms
  const socialPlatforms = useMemo(() => {
    return getSocialPlatformsByCountry(selectedCountry);
  }, [selectedCountry]);

  const handleCopyLink = (item: DramaTitleItem, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.url);
    setCopiedId(item.id);
    showToast(isKm ? `បានចម្លងតំណភ្ជាប់: ${item.title}` : `Copied link: ${item.title}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopySocialUrl = (platform: SocialNetworkPlatform, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = platform.getSearchUrl(activeSocialQuery);
    navigator.clipboard.writeText(url);
    setCopiedId(platform.id);
    showToast(isKm ? `បានចម្លងតំណភ្ជាប់ ${platform.name}` : `Copied ${platform.name} search URL`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleBatchOpenSocials = () => {
    const top = socialPlatforms.slice(0, 4);
    top.forEach(p => {
      window.open(p.getSearchUrl(activeSocialQuery), '_blank', 'noopener,noreferrer');
    });
    showToast(isKm ? `បានបើកបណ្ដាញសង្គម ${top.length} ក្នុងពេលតែមួយ!` : `Opened ${top.length} social platforms in tabs!`);
  };

  if (!isOpen) return null;

  return (
    <div
      id="smart-title-search-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="smart-title-search-container"
        className="bg-slate-900 border border-teal-500/40 w-full max-w-5xl rounded-2xl shadow-2xl shadow-teal-950/60 overflow-hidden flex flex-col max-h-[92vh] my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-teal-950/30 to-slate-950 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-500 flex items-center justify-center text-slate-950 shadow-md shadow-teal-500/25 shrink-0">
              {activeTab === 'social_networks' ? (
                <Globe className="w-5 h-5 stroke-[2.5]" />
              ) : (
                <Search className="w-5 h-5 stroke-[2.5]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {activeTab === 'social_networks'
                    ? (isKm ? 'ស្វែងរកតាមឈ្មោះ ភ្ជាប់បណ្ដាញសង្គមគ្រប់ប្រទេស' : 'Auto Search All Social Networks in All Countries')
                    : (isKm ? 'ស្វែងរក តាមចំណងជើង ឆ្លាតវ៉ៃ' : 'Smart Drama Title Search')}
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Auto Smart
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isKm
                  ? 'ស្វែងរកឈ្មោះរឿង និងភ្ជាប់ដោយស្វ័យប្រវត្តិទៅ TikTok, Douyin, Kuaishou, YouTube, FB គ្រប់ប្រទេស'
                  : 'Search titles & automatically connect to TikTok, Douyin, Kuaishou, YouTube & Facebook across all countries'}
              </p>
            </div>
          </div>

          <button
            id="close-title-search-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title={isKm ? 'បិទ' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Mode Tabs: [Drama Titles & Posters] vs [All Social Networks Across All Countries] */}
        <div className="px-4 pt-3 bg-slate-950/80 border-b border-slate-800/80 flex items-center gap-2">
          <button
            id="tab-dramas-view-btn"
            type="button"
            onClick={() => setActiveTab('dramas')}
            className={`px-4 py-2 rounded-t-xl text-xs sm:text-sm font-bold flex items-center gap-2 border-t border-x transition-all cursor-pointer ${
              activeTab === 'dramas'
                ? 'bg-slate-900 border-teal-500/50 text-teal-300 shadow-sm'
                : 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Film className="w-4 h-4 text-teal-400" />
            <span>{isKm ? '🎬 រឿងភាគ & Poster ដើម (HD)' : '🎬 Drama Titles & Posters'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
              {searchResults.length}
            </span>
          </button>

          <button
            id="tab-social-networks-view-btn"
            type="button"
            onClick={() => setActiveTab('social_networks')}
            className={`px-4 py-2 rounded-t-xl text-xs sm:text-sm font-bold flex items-center gap-2 border-t border-x transition-all cursor-pointer ${
              activeTab === 'social_networks'
                ? 'bg-slate-900 border-teal-500/50 text-teal-300 shadow-sm'
                : 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>{isKm ? '🌐 ភ្ជាប់បណ្ដាញសង្គមគ្រប់ប្រទេស' : '🌐 All Social Networks (All Countries)'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              20+
            </span>
          </button>
        </div>

        {/* Search Bar with live reactive typing */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/60 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1 flex items-center">
              <Search className="w-5 h-5 text-teal-400 absolute left-3.5 pointer-events-none" />
              <input
                id="title-search-modal-input"
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === 'social_networks'
                    ? (isKm ? 'វាយឈ្មោះរឿង ឬពាក្យគន្លឹះដើម្បីភ្ជាប់បណ្ដាញសង្គម...' : 'Type name or keyword to connect to all social platforms...')
                    : (isKm ? 'សរសេរអក្សរ A ឬចំណងជើងរឿង (ឧ. After, Alpha, Divorce, Dong...)' : 'Type letter "A" or title keyword (e.g. After, Alpha, Divorce, Dong...)...')
                }
                className="w-full bg-slate-900 border border-slate-700/80 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 text-slate-100 placeholder-slate-500 rounded-xl pl-11 pr-20 py-3 text-sm sm:text-base outline-none transition-all font-medium"
              />
              {searchQuery && (
                <button
                  id="clear-title-search-input-btn"
                  onClick={() => {
                    setSearchQuery('');
                    inputRef.current?.focus();
                  }}
                  className="absolute right-3 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded-md transition-colors cursor-pointer"
                >
                  {isKm ? 'លុប' : 'Clear'}
                </button>
              )}
            </div>

            {activeTab === 'social_networks' && (
              <button
                type="button"
                onClick={handleBatchOpenSocials}
                className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold px-4 py-3 rounded-xl transition-all shadow-md shadow-teal-500/20 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm shrink-0"
              >
                <Share2 className="w-4 h-4 stroke-[2.5]" />
                <span>{isKm ? 'បើកបណ្ដាញសង្គមចម្បង 4' : 'Open Top 4 Networks'}</span>
              </button>
            )}
          </div>

          {activeTab === 'dramas' ? (
            /* Quick Alphabet & Filter Pills for Dramas */
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
                <Zap className="w-3 h-3 text-teal-400" />
                {isKm ? 'អក្សរលឿន:' : 'Quick Letters:'}
              </span>

              {QUICK_LETTERS.map(letter => {
                const isSelected = searchQuery.toUpperCase() === letter;
                return (
                  <button
                    key={letter}
                    id={`filter-letter-${letter}-btn`}
                    onClick={() => {
                      setSearchQuery(letter);
                      inputRef.current?.focus();
                    }}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                      isSelected
                        ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/30 scale-105'
                        : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
                    }`}
                    title={isKm ? `បង្ហាញចំណងជើងចាប់ផ្តើមដោយអក្សរ ${letter}` : `Show titles starting with ${letter}`}
                  >
                    {letter}
                  </button>
                );
              })}

              <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

              {/* Category pills */}
              <div className="flex flex-wrap items-center gap-1 mt-1 sm:mt-0">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                      : 'text-slate-400 hover:text-white bg-slate-800/50'
                  }`}
                >
                  {isKm ? 'ទាំងអស់' : 'All'}
                </button>
                <button
                  onClick={() => setSelectedCategory('tiktok')}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    selectedCategory === 'tiktok'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : 'text-slate-400 hover:text-white bg-slate-800/50'
                  }`}
                >
                  TikTok
                </button>
                <button
                  onClick={() => setSelectedCategory('kuaishou')}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    selectedCategory === 'kuaishou'
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                      : 'text-slate-400 hover:text-white bg-slate-800/50'
                  }`}
                >
                  🇨🇳 Kuaishou (快手)
                </button>
                <button
                  onClick={() => setSelectedCategory('douyin')}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    selectedCategory === 'douyin'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      : 'text-slate-400 hover:text-white bg-slate-800/50'
                  }`}
                >
                  抖音 Douyin
                </button>
                <button
                  onClick={() => setSelectedCategory('bilibili')}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    selectedCategory === 'bilibili'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'text-slate-400 hover:text-white bg-slate-800/50'
                  }`}
                >
                  Bilibili
                </button>
              </div>
            </div>
          ) : (
            /* Country Pills for Social Networks Mode */
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
              <span className="text-slate-400 font-bold shrink-0 text-[11px] flex items-center gap-1">
                <Globe className="w-3 h-3 text-cyan-400" />
                {isKm ? 'ប្រទេស:' : 'Country:'}
              </span>
              {SUPPORTED_COUNTRIES.map(c => {
                const isSelected = selectedCountry === c.code;
                return (
                  <button
                    key={c.code}
                    onClick={() => setSelectedCountry(c.code)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                      isSelected
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-black shadow'
                        : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/50'
                    }`}
                  >
                    <span>{c.flag}</span>
                    <span>{isKm ? c.nameKm : c.nameEn}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Results Counter Banner */}
        <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            {activeTab === 'dramas' ? (
              <>
                <span className="font-medium">
                  {isKm ? (
                    <>បានរកឃើញ <strong className="text-teal-400 font-bold">{searchResults.length}</strong> ចំណងជើង{searchQuery ? <> ដែលត្រូវនឹង "<strong className="text-white">{searchQuery}</strong>"</> : ''}:</>
                  ) : (
                    <>Found <strong className="text-teal-400 font-bold">{searchResults.length}</strong> titles{searchQuery ? <> matching "<strong className="text-white">{searchQuery}</strong>"</> : ''}:</>
                  )}
                </span>
                {searchQuery.toUpperCase() === 'A' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    ✨ {isKm ? 'ចំណងជើងចាប់ផ្តើមដោយអក្សរ A' : 'Titles starting with "A"'}
                  </span>
                )}
              </>
            ) : (
              <span className="font-medium">
                {isKm ? (
                  <>ភ្ជាប់បណ្ដាញសង្គមចំនួន <strong className="text-teal-400 font-bold">{socialPlatforms.length}</strong> ជាមួយពាក្យគន្លឹះ: "<strong className="text-white">{activeSocialQuery}</strong>"</>
                ) : (
                  <>Connected <strong className="text-teal-400 font-bold">{socialPlatforms.length}</strong> platforms for: "<strong className="text-white">{activeSocialQuery}</strong>"</>
                )}
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            {activeTab === 'dramas'
              ? (isKm ? 'ចុចលើរឿងដើម្បីទាញយក ឬស្កេន' : 'Click title to fetch or scan')
              : (isKm ? 'ចុចដើម្បីបើកស្វែងរក ឬចម្លងតំណភ្ជាប់' : 'Click to open live search or copy URL')}
          </span>
        </div>

        {/* Results Body: Dramas Tab vs Social Networks Tab */}
        {activeTab === 'dramas' ? (
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 divide-y divide-slate-800/40">
            {searchResults.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center gap-3 text-slate-400">
                <Search className="w-10 h-10 text-slate-600" />
                <p className="text-sm font-medium">
                  {isKm ? `រកមិនឃើញចំណងជើងដែលត្រូវនឹង "${searchQuery}" ទេ` : `No drama titles found for "${searchQuery}"`}
                </p>
                <p className="text-xs text-slate-500 max-w-sm">
                  {isKm ? 'សូមសាកល្បងចុចលើអក្សរ A ឬពាក្យគន្លឹះទូទៅដូចជា Drama, Revenge, Billionaire, ឬ Kuaishou' : 'Try clicking letter "A" or searching keywords like Drama, Revenge, Billionaire, or Kuaishou'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => setSearchQuery('A')}
                    className="text-xs font-bold text-teal-400 hover:text-teal-300 bg-teal-500/10 border border-teal-500/30 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    {isKm ? 'បង្ហាញចំណងជើងអក្សរ A ភ្លាមៗ' : 'Show Letter "A" Titles'}
                  </button>
                  <button
                    onClick={() => setActiveTab('social_networks')}
                    className="text-xs font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>{isKm ? 'ស្វែងរកលើបណ្ដាញសង្គមគ្រប់ប្រទេស' : 'Search Across All Socials'}</span>
                  </button>
                </div>
              </div>
            ) : (
              searchResults.map((item) => {
                const isStartsWithQuery = searchQuery && item.title.toLowerCase().startsWith(searchQuery.toLowerCase());
                return (
                  <div
                    key={item.id}
                    id={`title-search-result-${item.id}`}
                    className="pt-3 first:pt-0 group bg-slate-900/40 hover:bg-slate-800/60 p-3 rounded-xl border border-slate-800/50 hover:border-teal-500/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5"
                  >
                    {/* Left info & poster */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div className="relative w-14 h-18 sm:w-16 sm:h-20 rounded-lg overflow-hidden bg-slate-800 shrink-0 border border-slate-700/60 shadow-md group-hover:border-teal-400/50 transition-colors">
                        <img
                          src={item.posterUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                        {item.episodeCount && (
                          <div className="absolute bottom-1 right-1 bg-slate-950/90 text-teal-300 text-[9px] font-bold px-1 rounded shadow">
                            {item.episodeCount} ភាគ
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          {isStartsWithQuery && (
                            <span className="text-[10px] font-black bg-teal-500 text-slate-950 px-1.5 py-0.2 rounded font-mono">
                              {searchQuery.toUpperCase()}
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.platform === 'kuaishou'
                              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                              : item.platform === 'douyin'
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                              : item.platform === 'bilibili'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          }`}>
                            {item.platformLabel}
                          </span>

                          <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                            {item.categoryLabelKm}
                          </span>

                          {item.viewCount && (
                            <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                              <Flame className="w-3 h-3" />
                              {item.viewCount}
                            </span>
                          )}
                        </div>

                        {/* Main Title */}
                        <h4 className="font-bold text-sm sm:text-base text-slate-100 group-hover:text-teal-300 transition-colors truncate">
                          {item.title}
                        </h4>

                        {/* Khmer Title */}
                        <p className="text-xs text-teal-400/90 font-medium truncate mt-0.5">
                          {item.titleKm}
                        </p>

                        {/* Channel & description */}
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                          {item.channelHandle && (
                            <span className="font-mono text-indigo-300 bg-indigo-950/40 px-1.5 py-0.2 rounded border border-indigo-500/20">
                              {item.channelHandle}
                            </span>
                          )}
                          <span className="truncate max-w-xs sm:max-w-md text-slate-500">
                            {item.descriptionKm}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {/* Switch to Social Networks search for this title */}
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery(item.title);
                          setActiveTab('social_networks');
                        }}
                        className="p-2 text-cyan-300 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1"
                        title={isKm ? 'ស្វែងរកចំណងជើងនេះលើបណ្ដាញសង្គមគ្រប់ប្រទេស' : 'Search this title across all global social networks'}
                      >
                        <Globe className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="hidden lg:inline">{isKm ? 'បណ្ដាញសង្គម' : 'Socials'}</span>
                      </button>

                      <button
                        id={`copy-title-link-${item.id}`}
                        onClick={(e) => handleCopyLink(item, e)}
                        className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-xs"
                        title={isKm ? 'ចម្លងតំណភ្ជាប់' : 'Copy Link'}
                      >
                        {copiedId === item.id ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        id={`scan-poster-title-${item.id}`}
                        onClick={() => {
                          onSelectTitle(item, 'poster');
                          onClose();
                        }}
                        className="text-xs font-bold px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                        title={isKm ? 'ស្កេនរក Poster ដើម' : 'Scan Original Poster'}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden md:inline">{isKm ? 'Poster ដើម' : 'Poster'}</span>
                      </button>

                      <button
                        id={`select-title-btn-${item.id}`}
                        onClick={() => {
                          onSelectTitle(item, 'resolve');
                          onClose();
                        }}
                        className="text-xs font-bold px-3.5 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-teal-500/20"
                      >
                        <Film className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{isKm ? 'ទាញយកវីដេអូ' : 'Fetch Video'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Social Networks Across All Countries Tab */
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {socialPlatforms.map(platform => {
              const searchUrl = platform.getSearchUrl(activeSocialQuery);
              return (
                <div
                  key={platform.id}
                  className={`bg-gradient-to-br ${platform.bgGradient} border border-slate-800 hover:border-teal-500/40 p-4 rounded-xl shadow-lg transition-all flex flex-col justify-between gap-3 group`}
                >
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

                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg px-3 py-1.5 flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span className="truncate max-w-[260px] sm:max-w-sm text-slate-300">
                      {searchUrl}
                    </span>
                    <button
                      onClick={(e) => handleCopySocialUrl(platform, e)}
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

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/50">
                    {platform.isDownloadSupportedInApp && onSendToDownloader ? (
                      <button
                        type="button"
                        onClick={() => {
                          const qTrim = searchQuery.trim();
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
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{isKm ? 'ទាញយកក្នុង App' : 'Fetch in App'}</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-teal-400" />
                        {isKm ? 'ស្វែងរកផ្ទាល់លើវេបសាយ' : 'Live Web Feed'}
                      </span>
                    )}

                    <a
                      href={searchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 flex items-center gap-1.5 transition-all shadow-md shadow-teal-500/20 cursor-pointer ml-auto"
                    >
                      <span>{isKm ? 'បើកស្វែងរកផ្ទាល់' : 'Open Search'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Globe className="w-3.5 h-3.5 text-teal-400" />
            <span>{isKm ? 'គាំទ្រ TikTok, Douyin, Kuaishou, YouTube, Facebook, Bilibili គ្រប់ប្រទេស' : 'Supports TikTok, Douyin, Kuaishou, YouTube, FB & Bilibili globally'}</span>
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

