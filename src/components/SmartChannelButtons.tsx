import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  Search,
  ExternalLink,
  Copy,
  Check,
  Star,
  ListPlus,
  Shuffle,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Layers,
  ArrowRight,
  Tv,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
  Flame,
  Globe,
  Play,
  Download
} from 'lucide-react';
import { TIKTOK_DRAMA_CHANNELS, DramaChannel } from '../data/dramaChannels';

interface Props {
  isKm: boolean;
  onScanChannel: (channelUrl: string) => void;
  onAddToBatch?: (channelUrls: string[]) => void;
  onPasteToInput?: (channelUrl: string) => void;
  showToast: (msg: string) => void;
  currentActiveUrl?: string;
  defaultCollapsed?: boolean;
}

export default function SmartChannelButtons({
  isKm,
  onScanChannel,
  onAddToBatch,
  onPasteToInput,
  showToast,
  currentActiveUrl,
  defaultCollapsed = true
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'pills'>('grid');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('svd_smart_channels_collapsed');
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch {}
    return defaultCollapsed;
  });

  const handleToggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('svd_smart_channels_collapsed', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [scanningId, setScanningId] = useState<string | null>(null);

  // Stored favorites in localStorage
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('svd_fav_channels');
      return saved ? JSON.parse(saved).filter((id: string) => id !== 'dramafish_id') : ['zhihudramahub_vn', 'hnrgtk188_ca', 'hongshengmediatv_id'];
    } catch {
      return ['zhihudramahub_vn', 'hnrgtk188_ca', 'hongshengmediatv_id'];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('svd_fav_channels', JSON.stringify(favoriteIds));
    } catch {}
  }, [favoriteIds]);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteIds(prev => {
      const isFav = prev.includes(id);
      const next = isFav ? prev.filter(item => item !== id) : [...prev, id];
      showToast(
        isFav
          ? (isKm ? 'បានដកចេញពីបញ្ជីចូលចិត្ត' : 'Removed from favorites')
          : (isKm ? 'បានរក្សាទុកក្នុងបញ្ជីចូលចិត្ត ⭐' : 'Saved to favorites ⭐')
      );
      return next;
    });
  };

  const handleCopy = (channel: DramaChannel, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(channel.url);
    setCopiedId(channel.id);
    showToast(isKm ? `បានចម្លង ${channel.handle} រួចរាល់!` : `Copied ${channel.handle} URL!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleScan = (channel: DramaChannel, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setScanningId(channel.id);
    onScanChannel(channel.url);
    showToast(isKm ? `កំពុងស្កេនប៉ុស្តិ៍ ${channel.handle}...` : `Scanning channel ${channel.handle}...`);
    setTimeout(() => setScanningId(null), 3000);
  };

  const handleBatch = (channel: DramaChannel, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onAddToBatch) {
      onAddToBatch([channel.url]);
      showToast(isKm ? `បានបន្ថែម ${channel.handle} ចូលក្នុង Batch Queue` : `Added ${channel.handle} to Batch Queue`);
    } else if (onPasteToInput) {
      onPasteToInput(channel.url);
    }
  };

  // Filter categories
  const categories = useMemo(() => [
    { id: 'all', labelKm: 'ទាំងអស់', labelEn: 'All', count: TIKTOK_DRAMA_CHANNELS.length, icon: '✨' },
    { id: 'yt', labelKm: '▶️ YouTube Shorts', labelEn: '▶️ YouTube Shorts', count: TIKTOK_DRAMA_CHANNELS.filter(c => c.category === 'yt' || c.platform === 'youtube').length, icon: '▶️' },
    { id: 'cn', labelKm: '🇨🇳 ចិន (Kuaishou / Bilibili)', labelEn: '🇨🇳 China (Kuaishou / Bilibili)', count: TIKTOK_DRAMA_CHANNELS.filter(c => c.category === 'cn').length, icon: '🇨🇳' },
    { id: 'id', labelKm: '🇮🇩 ឥណ្ឌូនេស៊ី', labelEn: '🇮🇩 Indonesia', count: TIKTOK_DRAMA_CHANNELS.filter(c => c.category === 'id').length, icon: '🇮🇩' },
    { id: 'vn', labelKm: '🇻🇳 វៀតណាម', labelEn: '🇻🇳 Vietnam', count: TIKTOK_DRAMA_CHANNELS.filter(c => c.category === 'vn').length, icon: '🇻🇳' },
    { id: 'ca', labelKm: '🇨🇦 កាណាដា', labelEn: '🇨🇦 Canada', count: TIKTOK_DRAMA_CHANNELS.filter(c => c.category === 'ca').length, icon: '🇨🇦' },
    { id: 'mx', labelKm: '🇲🇽 ម៉ិកស៊ិក', labelEn: '🇲🇽 Mexico', count: TIKTOK_DRAMA_CHANNELS.filter(c => c.category === 'mx').length, icon: '🇲🇽' },
    { id: 'sa', labelKm: '🇸🇦 អារ៉ាប៊ីសាអ៊ូឌីត', labelEn: '🇸🇦 Saudi Arabia', count: TIKTOK_DRAMA_CHANNELS.filter(c => c.category === 'sa').length, icon: '🇸🇦' },
    { id: 'hub', labelKm: '🌐 Drama Hubs', labelEn: '🌐 Drama Hubs', count: TIKTOK_DRAMA_CHANNELS.filter(c => c.category === 'hub').length, icon: '🌐' },
    { id: 'favorites', labelKm: '⭐ បានចូលចិត្ត', labelEn: '⭐ Favorites', count: favoriteIds.length, icon: '⭐' }
  ], [favoriteIds]);

  // Filter channels based on search and category
  const filteredChannels = useMemo(() => {
    return TIKTOK_DRAMA_CHANNELS.filter(channel => {
      const isFav = favoriteIds.includes(channel.id);
      const matchesCategory =
        selectedCategory === 'all' ||
        (selectedCategory === 'favorites' ? isFav : channel.category === selectedCategory);

      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        channel.handle.toLowerCase().includes(q) ||
        channel.username.toLowerCase().includes(q) ||
        channel.displayName.toLowerCase().includes(q) ||
        channel.countryCode.toLowerCase().includes(q) ||
        channel.tagBadge.toLowerCase().includes(q) ||
        (channel.descriptionKm && channel.descriptionKm.toLowerCase().includes(q)) ||
        (channel.descriptionEn && channel.descriptionEn.toLowerCase().includes(q))
      );
    }).sort((a, b) => {
      // Pinned favorites at top if in 'all' view
      if (selectedCategory === 'all') {
        const aFav = favoriteIds.includes(a.id) ? 1 : 0;
        const bFav = favoriteIds.includes(b.id) ? 1 : 0;
        if (aFav !== bFav) return bFav - aFav;
      }
      return 0;
    });
  }, [selectedCategory, searchQuery, favoriteIds]);

  // Bulk: Queue All Filtered to Batch
  const handleQueueAllToBatch = () => {
    if (!onAddToBatch) return;
    const urls = filteredChannels.map(c => c.url);
    if (urls.length === 0) return;
    onAddToBatch(urls);
    showToast(isKm ? `បានបញ្ជូន ${urls.length} ប៉ុស្តិ៍ចូលក្នុង Batch Queue ដោយជោគជ័យ!` : `Queued ${urls.length} channels to Batch Queue!`);
  };

  // Bulk: Copy All Filtered URLs
  const handleCopyAllUrls = () => {
    const text = filteredChannels.map(c => c.url).join('\n');
    navigator.clipboard.writeText(text);
    showToast(isKm ? `បានចម្លងតំណភ្ជាប់ទាំង ${filteredChannels.length} ទៅកាន់ Clipboard!` : `Copied all ${filteredChannels.length} channel URLs to clipboard!`);
  };

  // Random Channel Pick
  const handleRandomPick = () => {
    if (filteredChannels.length === 0) return;
    const randomIdx = Math.floor(Math.random() * filteredChannels.length);
    const chosen = filteredChannels[randomIdx];
    handleScan(chosen);
    showToast(isKm ? `🎲 បានជ្រើសរើសដោយចៃដន្យ: ${chosen.handle}` : `🎲 Randomly picked: ${chosen.handle}`);
  };

  return (
    <div
      id="smart-channel-buttons-hub"
      className="bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-amber-500/25 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden transition-all"
    >
      {/* Top Banner Header */}
      <div
        onClick={handleToggleCollapse}
        className={`p-4 sm:p-5 bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 cursor-pointer select-none transition-colors hover:bg-slate-900/90 ${
          !isCollapsed ? 'border-b border-slate-800/80' : ''
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/25 shrink-0">
            <Tv className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                <span>{isKm ? `បណ្តុំប៉ុស្តិ៍ឆ្លាតវៃទាំង ${TIKTOK_DRAMA_CHANNELS.length}` : `${TIKTOK_DRAMA_CHANNELS.length} Smart Channels`}</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 shadow-sm">
                  {isKm ? '🖼️ LOGO & POSTER 3D' : '🖼️ LOGO & POSTER 3D'}
                </span>
                {isCollapsed && (
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    {isKm ? 'បានបង្រួមជាចម្បង' : 'Collapsed (Primary)'}
                  </span>
                )}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isKm
                ? (isCollapsed
                    ? `ចុចត្រង់នេះ ឬចុចប៊ូតុង "ពង្រីក" ដើម្បីមើលរូបភាព Logo & Poster របស់ប៉ុស្តិ៍ TikTok, Bilibili & Kuaishou ទាំង ${TIKTOK_DRAMA_CHANNELS.length}`
                    : 'បង្ហាញរូបភាព Logo Poster កម្រិតច្បាស់ • ចុច ១ ដងដើម្បីស្កេនរឿងភាគ ឬបញ្ជូនទៅ Batch Queue')
                : (isCollapsed
                    ? `Click here or click "Expand" to view Logo & Poster of all ${TIKTOK_DRAMA_CHANNELS.length} smart channels (TikTok, Bilibili & Kuaishou)`
                    : 'Displaying official platform logos & HD drama posters • 1-click to scan episodes or queue to Batch')}
            </p>
          </div>
        </div>

        {/* Right side controls: view toggle, collapse */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0" onClick={e => e.stopPropagation()}>
          {!isCollapsed && (
            <>
              {/* View mode toggle */}
              <div className="bg-slate-950/80 border border-slate-800 p-1 rounded-xl flex items-center gap-1">
                <button
                  id="channels-view-grid-btn"
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={isKm ? 'ទម្រង់ Card ធំ (Grid)' : 'Grid View'}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  id="channels-view-pills-btn"
                  type="button"
                  onClick={() => setViewMode('pills')}
                  className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'pills'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={isKm ? 'ទម្រង់ប៊ូតុងបង្រួម (Compact Pills)' : 'Compact Pills View'}
                >
                  <Layers className="w-4 h-4" />
                </button>
              </div>

              {/* Random Pick Button */}
              <button
                id="channels-random-btn"
                type="button"
                onClick={handleRandomPick}
                className="bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-amber-300 hover:text-amber-200 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title={isKm ? 'ជ្រើសរើសប៉ុស្តិ៍ចៃដន្យ' : 'Random Pick'}
              >
                <Shuffle className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">{isKm ? 'ចៃដន្យ' : 'Random'}</span>
              </button>
            </>
          )}

          {/* Collapse/Expand Toggle Button */}
          <button
            id="channels-collapse-btn"
            type="button"
            onClick={handleToggleCollapse}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
              isCollapsed
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 font-bold shadow-amber-500/20'
                : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border-slate-700'
            }`}
            title={
              isCollapsed
                ? (isKm ? 'ចុចដើម្បីពង្រីកមើលប៉ុស្តិ៍ទាំង ២០' : 'Click to expand 20 drama channels')
                : (isKm ? 'ចុចដើម្បីបង្រួមជាចម្បង' : 'Click to collapse (primary default)')
            }
          >
            <span>
              {isCollapsed
                ? (isKm ? 'ពង្រីក (២០ ប៉ុស្តិ៍)' : 'Expand (20 Channels)')
                : (isKm ? 'បង្រួម (ជាចម្បង)' : 'Collapse (Default)')}
            </span>
            {isCollapsed ? <ChevronDown className="w-4 h-4 text-slate-950" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
          </button>
        </div>
      </div>

      {/* Main Collapsible Content */}
      {!isCollapsed && (
        <div className="p-4 sm:p-5 flex flex-col gap-4">
          {/* Search bar & Bulk Actions Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="channel-search-input"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={
                  isKm
                    ? 'ស្វែងរកប៉ុស្តិ៍តាមឈ្មោះ, @handle, ប្រទេស (ID, VN, CA, MX, SA)...'
                    : 'Search channels by name, @handle, region (ID, VN, CA, MX, SA)...'
                }
                className="w-full bg-slate-950/90 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 text-slate-100 placeholder-slate-500 rounded-xl pl-9 pr-8 py-2.5 text-xs sm:text-sm outline-none transition-all font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs p-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Bulk Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {onAddToBatch && (
                <button
                  id="channels-queue-all-btn"
                  type="button"
                  onClick={handleQueueAllToBatch}
                  className="btn-3d-glass btn-3d-glass-emerald px-3 py-1.5 text-xs font-semibold text-slate-950 gap-1.5 shadow-xs"
                >
                  <ListPlus className="w-3.5 h-3.5 text-slate-950" />
                  <span>{isKm ? `Batch Queue (${filteredChannels.length})` : `Queue (${filteredChannels.length})`}</span>
                </button>
              )}

              <button
                id="channels-copy-all-btn"
                type="button"
                onClick={handleCopyAllUrls}
                className="btn-3d-glass btn-3d-glass-slate px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white gap-1.5 shadow-xs"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>{isKm ? 'ចម្លង Link ទាំងអស់' : 'Copy All Links'}</span>
              </button>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map(cat => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  id={`channel-filter-${cat.id}`}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`btn-3d-glass px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap gap-1.5 shrink-0 ${
                    active
                      ? 'btn-3d-glass-amber text-slate-950 font-bold'
                      : 'btn-3d-glass-slate text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{isKm ? cat.labelKm : cat.labelEn}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      active ? 'bg-slate-950 text-amber-300 font-bold' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Content: Bento Grid View vs Compact Pills View */}
          {filteredChannels.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs sm:text-sm">
              <p>{isKm ? 'រកមិនឃើញប៉ុស្តិ៍ដែលត្រូវនឹងពាក្យស្វែងរកទេ' : 'No channels found matching your filter.'}</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="mt-2 text-amber-400 hover:underline font-semibold"
              >
                {isKm ? 'សម្អាតការស្វែងរក' : 'Reset search filters'}
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* Bento Grid Mode (Responsive: 1 col on mobile, 2 on tablet, 4 on desktop) */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {filteredChannels.map(channel => {
                const isFav = favoriteIds.includes(channel.id);
                const isCurrentActive = currentActiveUrl?.includes(channel.username);
                const isScanning = scanningId === channel.id;
                const isCopied = copiedId === channel.id;

                const platformLogo =
                  channel.logoUrl ||
                  (channel.platform === 'youtube'
                    ? '/logos/youtube.svg'
                    : channel.platform === 'kuaishou'
                    ? '/logos/kuaishou.svg'
                    : channel.platform === 'bilibili'
                    ? '/logos/bilibili.svg'
                    : channel.platform === 'douyin'
                    ? '/logos/douyin.svg'
                    : '/logos/tiktok.svg');

                return (
                  <div
                    key={channel.id}
                    id={`channel-card-${channel.id}`}
                    className={`group relative rounded-xl border transition-all flex flex-col justify-between overflow-hidden backdrop-blur-md cursor-pointer ${
                      isCurrentActive
                        ? 'bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-500/15 ring-1 ring-amber-500/40'
                        : 'bg-slate-950/80 hover:bg-slate-900/90 border-slate-800 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/5'
                    }`}
                    onClick={() => handleScan(channel)}
                  >
                    {/* Top Poster Cover Banner with Official Logo */}
                    <div className="relative w-full h-36 sm:h-40 overflow-hidden bg-slate-950">
                      <img
                        src={channel.posterUrl}
                        alt={channel.previewDramaTitle || channel.displayName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                      {/* Gradient overlay for text legibility */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                      {/* Top Overlay Controls: Platform Logo + Flag + Favorite Star */}
                      <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-auto">
                        {/* Official Platform Logo Badge */}
                        <div className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md px-2 py-0.5 rounded-lg border border-slate-700/60 shadow-md">
                          <img
                            src={platformLogo}
                            alt={channel.platform || 'Platform'}
                            className="w-3.5 h-3.5 object-contain shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <span className="text-[10px] font-extrabold text-white uppercase tracking-wider">
                            {channel.platform === 'youtube'
                              ? 'YouTube'
                              : channel.platform === 'kuaishou'
                              ? '快手'
                              : channel.platform === 'bilibili'
                              ? 'Bilibili'
                              : channel.platform === 'douyin'
                              ? '抖音'
                              : 'TikTok'}
                          </span>
                        </div>

                        {/* Country Flag & Favorite Star */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-950/85 text-white backdrop-blur-md border border-slate-700/50">
                            {channel.flagEmoji} {channel.countryCode}
                          </span>
                          <button
                            type="button"
                            onClick={e => toggleFavorite(channel.id, e)}
                            className={`p-1 rounded-md backdrop-blur-md transition-colors cursor-pointer ${
                              isFav
                                ? 'text-amber-400 bg-amber-500/30 border border-amber-400/50'
                                : 'text-slate-400 hover:text-amber-400 bg-slate-950/70 border border-slate-700/50'
                            }`}
                            title={isFav ? (isKm ? 'ដកចេញពីបញ្ជីចូលចិត្ត' : 'Remove favorite') : (isKm ? 'ចូលចិត្ត' : 'Favorite')}
                          >
                            <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Overlay Info over Poster: Featured Drama Title + Episode Count */}
                      <div className="absolute bottom-2 left-2.5 right-2.5 flex items-end justify-between gap-1.5">
                        <div className="min-w-0 flex-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 drop-shadow-md truncate max-w-full">
                            <Sparkles className="w-2.5 h-2.5 shrink-0 fill-amber-300 text-amber-300" />
                            <span className="truncate">{channel.previewDramaTitle}</span>
                          </span>
                        </div>
                        {channel.episodeCount && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/90 text-slate-950 shrink-0 shadow-xs">
                            {channel.episodeCount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Body: Channel Avatar, Handle, Badges & Description */}
                    <div className="p-3.5 flex flex-col justify-between gap-2.5 flex-1">
                      {/* Avatar Initials, Handle, Display Name */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg bg-gradient-to-br ${channel.themeGradient} flex items-center justify-center text-slate-950 font-bold text-xs shadow-md shrink-0 uppercase`}
                        >
                          {channel.countryCode.slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-xs truncate group-hover:text-amber-300 transition-colors">
                              {channel.displayName}
                            </span>
                          </div>
                          <p className="text-[11px] font-mono text-amber-400/90 truncate font-semibold">
                            {channel.handle}
                          </p>
                        </div>
                      </div>

                      {/* Middle: Badges & Description */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 truncate max-w-[170px]">
                            {channel.tagBadge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {isKm ? channel.descriptionKm : channel.descriptionEn}
                        </p>
                      </div>

                      {/* Bottom Row: Smart Action Buttons */}
                      <div
                        className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-800/80 mt-1"
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Primary 1-Click Scan Button */}
                        <button
                          id={`btn-scan-${channel.id}`}
                          type="button"
                          onClick={e => handleScan(channel, e)}
                          disabled={isScanning}
                          className="btn-3d-glass btn-3d-glass-amber flex-1 text-slate-950 font-bold px-2.5 py-1.5 text-xs gap-1 min-h-[34px] shadow-xs"
                          title={channel.platform === 'youtube' ? (isKm ? 'ទាញយក និងមើលវីដេអូ YouTube Shorts' : 'Download and watch YouTube Shorts') : (isKm ? 'ស្កេន Short Dramas របស់ប៉ុស្តិ៍នេះ' : 'Scan short dramas from this channel')}
                        >
                          {isScanning ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin text-slate-950" />
                              <span>{isKm ? 'កំពុងស្កេន...' : 'Scanning...'}</span>
                            </>
                          ) : channel.platform === 'youtube' ? (
                            <>
                              <Play className="w-3 h-3 fill-slate-950 text-slate-950" />
                              <span>{isKm ? 'ទាញយក & មើល' : 'Get & Watch'}</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 fill-slate-950 text-slate-950" />
                              <span>{isKm ? 'ស្កេនរឿង' : 'Scan'}</span>
                            </>
                          )}
                        </button>

                        {/* Add to Batch Button */}
                        {onAddToBatch && (
                          <button
                            id={`btn-batch-${channel.id}`}
                            type="button"
                            onClick={e => handleBatch(channel, e)}
                            className="btn-3d-glass btn-3d-glass-emerald p-1.5 text-slate-950 min-w-[34px] min-h-[34px]"
                            title={isKm ? 'បញ្ជូនទៅកាន់ Batch Queue' : 'Queue to Batch'}
                          >
                            <ListPlus className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Copy Link Button */}
                        <button
                          id={`btn-copy-${channel.id}`}
                          type="button"
                          onClick={e => handleCopy(channel, e)}
                          className={`btn-3d-glass p-1.5 min-w-[34px] min-h-[34px] ${
                            isCopied
                              ? 'btn-3d-glass-emerald text-slate-950'
                              : 'btn-3d-glass-slate text-slate-300'
                          }`}
                          title={isKm ? 'ចម្លង URL ប៉ុស្តិ៍' : 'Copy channel URL'}
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-slate-950" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Open in External App / Website */}
                        <a
                          href={channel.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-3d-glass btn-3d-glass-slate p-1.5 text-slate-400 hover:text-white min-w-[34px] min-h-[34px]"
                          title={
                            channel.platform === 'youtube'
                              ? (isKm ? 'បើកមើលលើ YouTube' : 'Open YouTube Channel')
                              : channel.platform === 'kuaishou'
                              ? (isKm ? 'បើកមើលលើ Kuaishou' : 'Open Kuaishou Profile')
                              : channel.platform === 'bilibili'
                              ? (isKm ? 'បើកមើលលើ Bilibili' : 'Open Bilibili Profile')
                              : channel.platform === 'douyin'
                              ? (isKm ? 'បើកមើលលើ Douyin' : 'Open Douyin Profile')
                              : (isKm ? 'បើកមើលលើ TikTok' : 'Open TikTok Profile')
                          }
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Compact Pills View with Logo & Mini Poster Thumbnail */
            <div className="flex flex-wrap items-center gap-2">
              {filteredChannels.map(channel => {
                const isFav = favoriteIds.includes(channel.id);
                const isCurrentActive = currentActiveUrl?.includes(channel.username);
                const isScanning = scanningId === channel.id;
                const isCopied = copiedId === channel.id;

                const platformLogo =
                  channel.logoUrl ||
                  (channel.platform === 'youtube'
                    ? '/logos/youtube.svg'
                    : channel.platform === 'kuaishou'
                    ? '/logos/kuaishou.svg'
                    : channel.platform === 'bilibili'
                    ? '/logos/bilibili.svg'
                    : channel.platform === 'douyin'
                    ? '/logos/douyin.svg'
                    : '/logos/tiktok.svg');

                return (
                  <div
                    key={channel.id}
                    id={`channel-pill-${channel.id}`}
                    className={`group inline-flex items-center gap-2 p-1.5 rounded-xl border transition-all cursor-pointer ${
                      isCurrentActive
                        ? 'bg-amber-500/20 border-amber-500/60 shadow-md shadow-amber-500/10 text-white'
                        : 'bg-slate-950/85 hover:bg-slate-900 border-slate-800 hover:border-amber-500/40 text-slate-200'
                    }`}
                    onClick={() => handleScan(channel)}
                  >
                    {/* Mini Poster Thumbnail */}
                    <img
                      src={channel.posterUrl}
                      alt={channel.displayName}
                      className="w-7 h-7 rounded-lg object-cover shadow-xs border border-amber-400/30 shrink-0"
                      referrerPolicy="no-referrer"
                    />

                    {/* Official Platform Logo */}
                    <img
                      src={platformLogo}
                      alt={channel.platform || 'logo'}
                      className="w-3.5 h-3.5 object-contain shrink-0"
                      referrerPolicy="no-referrer"
                    />

                    {/* Handle & Name */}
                    <span className="text-xs font-mono font-bold group-hover:text-amber-300 transition-colors">
                      {channel.handle}
                    </span>

                    {/* Flag & Country */}
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 flex items-center gap-0.5">
                      <span>{channel.flagEmoji}</span>
                      <span>{channel.countryCode}</span>
                    </span>

                    {/* Scan Action Icon */}
                    <button
                      type="button"
                      onClick={e => handleScan(channel, e)}
                      disabled={isScanning}
                      className="p-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 transition-colors cursor-pointer"
                      title={channel.platform === 'youtube' ? (isKm ? 'ទាញយក និងមើលវីដេអូ YouTube Shorts' : 'Download and watch YouTube Shorts') : (isKm ? 'ស្កេនប៉ុស្តិ៍នេះ' : 'Scan channel')}
                    >
                      {isScanning ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : channel.platform === 'youtube' ? (
                        <Play className="w-3 h-3 fill-current" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                    </button>

                    {/* Copy Link */}
                    <button
                      type="button"
                      onClick={e => handleCopy(channel, e)}
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title={isKm ? 'ចម្លង URL' : 'Copy link'}
                    >
                      {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>

                    {/* External Link */}
                    <a
                      href={channel.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
                      title={isKm ? 'បើកមើលទម្រង់ Profile' : 'Open Profile'}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer Stats & Quick Note */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {isKm
                  ? `បានត្រៀមប៉ុស្តិ៍ចំនួន ${filteredChannels.length} / ${TIKTOK_DRAMA_CHANNELS.length} រួចរាល់ សម្រាប់ស្កេន និងទាញយក`
                  : `${filteredChannels.length} / ${TIKTOK_DRAMA_CHANNELS.length} channels ready for instant scanning and download`}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-500">
                {isKm ? 'គាំទ្រស្កេន Poster ដើម 100% គ្មានសញ្ញាទឹក' : 'Supports 100% original posters & uncropped covers'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
