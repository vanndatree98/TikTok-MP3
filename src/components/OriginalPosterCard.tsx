import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Download,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Film,
  X,
  ExternalLink,
  ShieldCheck,
  Image as ImageIcon
} from 'lucide-react';
import { VideoInfo } from '../types';

export interface PosterAutoLinkInfo {
  posterUrl: string;
  posterType: 'static' | 'dynamic';
  downloaded?: boolean;
}

interface OriginalPosterCardProps {
  video: VideoInfo;
  isKm: boolean;
  onShowToast?: (msg: string) => void;
  onOpenThumbnailStudio?: (info?: PosterAutoLinkInfo) => void;
}

export default function OriginalPosterCard({
  video,
  isKm,
  onShowToast,
  onOpenThumbnailStudio
}: OriginalPosterCardProps) {
  // Determine primary original poster and fallback cover
  const rawPosterUrl = video.originCover || video.cover;
  const posterUrl = rawPosterUrl
    ? (rawPosterUrl.startsWith('/api/') || rawPosterUrl.startsWith('data:')
        ? rawPosterUrl
        : `/api/proxy-media?url=${encodeURIComponent(rawPosterUrl)}`)
    : '';

  const rawDynamicCover = video.dynamicCover;
  const dynamicPosterUrl = rawDynamicCover
    ? (rawDynamicCover.startsWith('/api/') || rawDynamicCover.startsWith('data:')
        ? rawDynamicCover
        : `/api/proxy-media?url=${encodeURIComponent(rawDynamicCover)}`)
    : '';

  const [activeTab, setActiveTab] = useState<'static' | 'dynamic'>('static');
  const [naturalDims, setNaturalDims] = useState<{ width: number; height: number } | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxScaleMode, setLightboxScaleMode] = useState<'fit' | 'actual'>('fit');
  const [posterFitMode, setPosterFitMode] = useState<'contain' | 'cover'>('contain');
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoLinkOnDownload, setAutoLinkOnDownload] = useState(true);

  // Reset natural dimensions when video changes
  useEffect(() => {
    setNaturalDims(null);
    setActiveTab('static');
    setLightboxZoom(1);
    setLightboxScaleMode('fit');
  }, [video.id, video.cover, video.originCover]);

  // Handle ESC key for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLightboxOpen) {
        setIsLightboxOpen(false);
        setLightboxZoom(1);
        setLightboxScaleMode('fit');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen]);

  if (!posterUrl) {
    return null;
  }

  const currentDisplayUrl = activeTab === 'dynamic' && dynamicPosterUrl ? dynamicPosterUrl : posterUrl;

  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setNaturalDims({ width: img.naturalWidth, height: img.naturalHeight });
    }
  };

  const getCleanTitle = () => {
    return (video.title || 'original_poster')
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 45);
  };

  const handleDownloadPoster = async (forceAutoLink?: boolean) => {
    try {
      setIsDownloading(true);
      const title = getCleanTitle();
      const ext = activeTab === 'dynamic' ? 'webp' : 'jpg';
      const filename = `${title}_Original_Poster.${ext}`;

      const downloadApi = `/api/download?url=${encodeURIComponent(currentDisplayUrl)}&sourceUrl=${encodeURIComponent(
        video.sourceUrl || ''
      )}&format=${ext}&filename=${encodeURIComponent(filename)}`;

      const link = document.createElement('a');
      link.href = downloadApi;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const shouldLink = forceAutoLink !== undefined ? forceAutoLink : autoLinkOnDownload;

      if (shouldLink && onOpenThumbnailStudio) {
        onOpenThumbnailStudio({
          posterUrl: currentDisplayUrl,
          posterType: activeTab,
          downloaded: true
        });

        if (onShowToast) {
          onShowToast(
            isKm
              ? '✨ បានទាញយករូបភាព Poster ដើម និងភ្ជាប់ទៅកាន់ "បង្កើតរូប Thumbnail & Watermark ដោយ AI (Shared Links)" ដោយស្វ័យប្រវត្តិ!'
              : '✨ Downloaded original poster & auto-linked to AI Thumbnail & Watermark Studio!'
          );
        }
      } else {
        if (onShowToast) {
          onShowToast(
            isKm
              ? 'បានទាញយករូបភាព Poster ដើម (Original Poster) រួចរាល់!'
              : 'Downloaded original poster image successfully!'
          );
        }
      }
    } catch {
      if (onShowToast) {
        onShowToast(isKm ? 'បរាជ័យក្នុងការទាញយក Poster' : 'Failed to download original poster');
      }
    } finally {
      setTimeout(() => setIsDownloading(false), 800);
    }
  };

  const handleLinkOnly = () => {
    if (onOpenThumbnailStudio) {
      onOpenThumbnailStudio({
        posterUrl: currentDisplayUrl,
        posterType: activeTab,
        downloaded: false
      });
      if (onShowToast) {
        onShowToast(
          isKm
            ? '🔗 បានភ្ជាប់រូបភាព Poster ដើម ទៅកាន់ "បង្កើតរូប Thumbnail & Watermark ដោយ AI (Shared Links)" រួចរាល់!'
            : '🔗 Connected original poster to AI Thumbnail Studio!'
        );
      }
    }
  };

  const handleCopyLink = () => {
    const absoluteUrl = currentDisplayUrl.startsWith('http')
      ? currentDisplayUrl
      : `${window.location.origin}${currentDisplayUrl}`;
    navigator.clipboard.writeText(absoluteUrl);
    setCopied(true);
    if (onShowToast) {
      onShowToast(isKm ? 'បានចម្លង Link រូបភាព Poster ដើម!' : 'Copied original poster URL to clipboard!');
    }
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div
        id="auto-scanned-original-poster"
        className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-950 border border-amber-500/40 hover:border-amber-400/60 rounded-2xl p-4 sm:p-5 shadow-xl transition-all relative overflow-hidden"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        {/* Header with Auto-Scan Success Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-800/80 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Sparkles className="w-5 h-5 fill-slate-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-sm sm:text-base text-white flex items-center gap-1.5">
                  <span>{isKm ? 'រូបភាព Poster ដើម (Original HD Poster)' : 'Original HD Poster'}</span>
                </h4>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  {isKm ? 'ស្កេនរកឃើញដោយស្វ័យប្រវត្តិ' : 'Auto-Scanned'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  {isKm
                    ? 'គុណភាពច្បាស់ដើម 100% គ្មានសញ្ញាទឹក ឬកាត់បន្ថយគុណភាព'
                    : 'Original uncompressed master quality • Watermark-free'}
                </span>
              </p>
            </div>
          </div>

          {/* Tab Switcher: Static vs Dynamic Poster (if dynamicCover exists) */}
          {dynamicPosterUrl && (
            <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab('static')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'static'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isKm ? 'Poster រូបភាព' : 'Static Poster'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('dynamic')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  activeTab === 'dynamic'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Film className="w-3 h-3" />
                <span>{isKm ? 'Poster មានចលនា' : 'Dynamic'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body: Poster Preview & Metadata Grid */}
        <div className="mt-4 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 relative z-10">
          {/* Poster Preview Frame */}
          <div className="relative group w-36 h-48 sm:w-44 sm:h-60 rounded-xl overflow-hidden bg-slate-950 border-2 border-amber-500/40 shrink-0 shadow-2xl shadow-black flex items-center justify-center p-1">
            <img
              src={currentDisplayUrl}
              alt={video.title || 'Original Poster'}
              onLoad={handleImageLoaded}
              className={`w-full h-full ${posterFitMode === 'contain' ? 'object-contain' : 'object-cover'} group-hover:scale-105 transition-transform duration-300`}
            />

            {/* Quick Action Overlay on Hover */}
            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
              <button
                type="button"
                id="view-poster-fullscreen-overlay-btn"
                onClick={() => setIsLightboxOpen(true)}
                className="w-full py-1.5 px-2.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors shadow flex items-center justify-center gap-1 cursor-pointer"
                title={isKm ? 'មើលទំហំពេញ 100%' : 'View 100% Full'}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{isKm ? 'មើល 100% ពេញ' : 'View 100%'}</span>
              </button>
              <button
                type="button"
                id="download-poster-overlay-btn"
                onClick={() => handleDownloadPoster(autoLinkOnDownload)}
                className="w-full py-1.5 px-2.5 rounded-lg bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 border border-slate-700 transition-colors shadow flex items-center justify-center gap-1 cursor-pointer"
                title={isKm ? 'ទាញយក Poster ដើម' : 'Download Poster'}
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>{isKm ? 'ទាញយក' : 'Save'}</span>
              </button>
            </div>

            {/* Poster Tag Pill in Frame */}
            <div className="absolute top-2 left-2 z-10 pointer-events-none">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-950/90 text-amber-300 border border-amber-500/40 shadow backdrop-blur-sm">
                {posterFitMode === 'contain' ? (isKm ? '100% ពេញ' : '100% Full') : (isKm ? 'រូបភាពដើម' : 'Original')}
              </span>
            </div>

            {/* Inline 100% vs Cover Toggle on Frame */}
            <div className="absolute top-2 right-2 z-10">
              <button
                type="button"
                onClick={() => setPosterFitMode(m => (m === 'contain' ? 'cover' : 'contain'))}
                className="bg-black/80 hover:bg-black text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-500/40 backdrop-blur-md cursor-pointer flex items-center gap-1 shadow"
                title={isKm ? 'ប្តូររវាង បង្ហាញ 100% ពេញ ឬ កាត់ពេញស៊ុម' : 'Toggle 100% View vs Cover'}
              >
                <span>{posterFitMode === 'contain' ? '100%' : 'Crop'}</span>
              </button>
            </div>
          </div>

          {/* Right Side Info & Action Buttons */}
          <div className="flex-1 flex flex-col justify-between self-stretch gap-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-400 font-medium">
                  {isKm ? 'ប្រភពរូបភាព:' : 'Image Source:'}
                </span>
                <span className="bg-slate-800 text-slate-200 text-xs font-mono px-2 py-0.5 rounded border border-slate-700">
                  {video.sourceUrl.includes('douyin') ? 'Douyin Official CDN' : 'TikTok Official CDN'}
                </span>
                {naturalDims && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold px-2 py-0.5 rounded">
                    {naturalDims.width} × {naturalDims.height} px
                  </span>
                )}
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold px-2 py-0.5 rounded">
                  {activeTab === 'dynamic' ? 'WebP / GIF' : 'JPG / JPEG High-Res'}
                </span>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                <p className="font-semibold text-amber-300 mb-1 flex items-center gap-1">
                  <span>{isKm ? '✨ ព័ត៌មានលម្អិតអំពី Poster ដើម:' : '✨ Original Poster Details:'}</span>
                </p>
                <p className="text-slate-300">
                  {isKm
                    ? 'រូបភាព Poster នេះត្រូវបានស្កេន និងស្រង់ចេញពីម៉ាស៊ីនបម្រើដើម ដោយផ្ទាល់ មិនមានសញ្ញាទឹក (No Watermark) សម្រាប់ប្រើប្រាស់ធ្វើជាផ្ទាំងរូបភាព Cover ឬ Thumbnail កម្រិតខ្ពស់។'
                    : 'This original poster has been automatically scanned and extracted directly from original media servers with full resolution, suitable for covers and thumbnails.'}
                </p>
              </div>
            </div>

            {/* Auto-Link Option Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-slate-950/80 border border-indigo-500/30 rounded-xl shadow-xs">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-200 select-none">
                <input
                  type="checkbox"
                  id="auto-link-ai-thumbnail-checkbox"
                  checked={autoLinkOnDownload}
                  onChange={(e) => setAutoLinkOnDownload(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 accent-indigo-500 cursor-pointer"
                />
                <span className="flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                  <span>
                    {isKm
                      ? 'ភ្ជាប់រូបភាព Poster ដើម ទៅកាន់ "បង្កើតរូប Thumbnail & Watermark ដោយ AI (Shared Links)" ដោយស្វ័យប្រវត្តិ'
                      : 'Auto-link original poster directly to AI Thumbnail & Watermark Generator (Shared Links)'}
                  </span>
                </span>
              </label>
              <span className="self-start sm:self-auto text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
                {isKm ? 'ភ្ជាប់ស្វ័យប្រវត្តិ' : 'Auto-Link Active'}
              </span>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              {/* Primary Dual Download & Auto-Link Button */}
              <button
                type="button"
                id="download-and-autolink-poster-btn"
                onClick={() => handleDownloadPoster(true)}
                disabled={isDownloading}
                className="bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-slate-950 hover:text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 group"
                title={isKm ? 'ទាញយករូបភាព Poster ដើម និងភ្ជាប់ទៅកាន់ AI Thumbnail & Watermark ភ្លាមៗ' : 'Download Original Poster and auto-link to AI Thumbnail Studio'}
              >
                <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                <span>
                  {isDownloading
                    ? isKm ? 'កំពុងទាញយក & ភ្ជាប់...' : 'Downloading & Linking...'
                    : isKm ? 'ទាញយក Poster & ភ្ជាប់ទៅ AI Thumbnail' : 'Download & Auto-Link to AI'}
                </span>
                <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
              </button>

              {/* Just Download Clean Poster Button */}
              <button
                type="button"
                id="download-original-poster-primary-btn"
                onClick={() => handleDownloadPoster(false)}
                disabled={isDownloading}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title={isKm ? 'ទាញយករូបភាព Poster ដើម តែមួយមុខ (JPG/WebP)' : 'Download Clean Original Poster only'}
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>
                  {isDownloading
                    ? isKm ? 'កំពុងទាញយក...' : 'Downloading...'
                    : isKm ? 'ទាញយក Poster ដើម' : 'Download Original Poster'}
                </span>
              </button>

              {/* AI Branded Thumbnail Studio Direct Button */}
              {onOpenThumbnailStudio && (
                <button
                  type="button"
                  id="open-branded-thumbnail-studio-btn"
                  onClick={handleLinkOnly}
                  className="bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 font-semibold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  title={isKm ? 'ភ្ជាប់រូបភាព Poster ដើម ទៅកាន់ "បង្កើតរូប Thumbnail & Watermark ដោយ AI (Shared Links)"' : 'Link original poster to AI Thumbnail & Watermark Studio'}
                >
                  <Sparkles className="w-4 h-4 text-indigo-300" />
                  <span>{isKm ? 'ភ្ជាប់ទៅ AI Studio' : 'Link to AI Studio'}</span>
                </button>
              )}

              {/* View Fullscreen Modal Button */}
              <button
                type="button"
                id="view-poster-lightbox-btn"
                onClick={() => setIsLightboxOpen(true)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-4 h-4 text-amber-400" />
                <span>{isKm ? 'មើលទំហំពេញ' : 'View Fullscreen'}</span>
              </button>

              {/* Copy Poster Link Button */}
              <button
                type="button"
                id="copy-poster-link-btn"
                onClick={handleCopyLink}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                title={isKm ? 'ចម្លងតំណភ្ជាប់រូបភាព' : 'Copy Image Link'}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">{isKm ? 'បានចម្លង!' : 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-400" />
                    <span>{isKm ? 'ចម្លង Link' : 'Copy Link'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div
          id="original-poster-lightbox-modal"
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col animate-in fade-in duration-200"
          onClick={e => {
            if (e.target === e.currentTarget) {
              setIsLightboxOpen(false);
              setLightboxZoom(1);
            }
          }}
        >
          {/* Lightbox Header Controls */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-900/80 border-b border-slate-800 text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">
                  {isKm ? 'រូបភាព Poster ដើម (Full HD)' : 'Original HD Poster'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {naturalDims ? `${naturalDims.width} × ${naturalDims.height} px` : ''} •{' '}
                  {video.author?.name || video.author?.username}
                </p>
              </div>
            </div>

            {/* Zoom Controls & Close Button */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* 100% Fit & 1:1 Actual Toggles */}
              <button
                type="button"
                onClick={() => {
                  setLightboxScaleMode('fit');
                  setLightboxZoom(1);
                }}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  lightboxScaleMode === 'fit' && lightboxZoom === 1
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                }`}
                title="100% Fit Screen"
              >
                <span>{isKm ? '100% ពេញ' : '100% Fit'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLightboxScaleMode(m => (m === 'actual' ? 'fit' : 'actual'));
                  setLightboxZoom(1);
                }}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer hidden sm:inline-block ${
                  lightboxScaleMode === 'actual'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                }`}
                title="1:1 Actual Resolution"
              >
                <span>1:1 Pixel</span>
              </button>

              <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setLightboxScaleMode('fit');
                    setLightboxZoom(prev => Math.max(prev - 0.25, 0.5));
                  }}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono font-bold text-amber-300 px-1.5 min-w-[38px] text-center">
                  {Math.round(lightboxZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setLightboxScaleMode('fit');
                    setLightboxZoom(prev => Math.min(prev + 0.25, 3));
                  }}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="h-4 w-px bg-slate-700 mx-1" />
              <button
                type="button"
                onClick={handleDownloadPoster}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isKm ? 'ទាញយក' : 'Download'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLightboxOpen(false);
                  setLightboxZoom(1);
                  setLightboxScaleMode('fit');
                }}
                className="p-2 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors cursor-pointer ml-1"
                title="Close (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lightbox Center Stage */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            <img
              src={currentDisplayUrl}
              alt={video.title || 'Original Poster'}
              style={{
                transform: `scale(${lightboxZoom})`,
                transition: 'transform 0.15s ease-out'
              }}
              className={`${
                lightboxScaleMode === 'actual'
                  ? 'max-w-none'
                  : 'max-h-[85vh] max-w-[92vw] w-auto h-auto'
              } object-contain rounded-lg shadow-2xl`}
            />
          </div>
        </div>
      )}
    </>
  );
}
