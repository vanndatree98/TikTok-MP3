/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Download,
  FolderDown,
  Music,
  Film,
  Sparkles,
  Settings,
  History,
  Trash2,
  Play,
  Pause,
  Copy,
  Check,
  AlertCircle,
  FolderCheck,
  HardDrive,
  Share2,
  ExternalLink,
  RefreshCw,
  Sliders,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Volume2,
  Tv,
  ListPlus,
  Layers,
  RotateCcw,
  ImageIcon,
  Search,
  Globe,
  Clock,
  Calendar,
  Bell,
  HelpCircle,
  Eye
} from 'lucide-react';
import ShortDramaConverter from './components/ShortDramaConverter';
import BatchDownloader from './components/BatchDownloader';
import FilenameSettingsPreview from './components/FilenameSettingsPreview';
import SaveLocationSettingsModal from './components/SaveLocationSettingsModal';
import DownloadCardFilenamePreview from './components/DownloadCardFilenamePreview';
import ImageGalleryViewer from './components/ImageGalleryViewer';
import OriginalPosterCard, { PosterAutoLinkInfo } from './components/OriginalPosterCard';
import BrandedThumbnailGenerator from './components/BrandedThumbnailGenerator';
import SmartChannelButtons from './components/SmartChannelButtons';
import VideoVolumeControl from './components/VideoVolumeControl';
import { VideoTrimmer } from './components/VideoTrimmer';
import SmartTitleSearchModal from './components/SmartTitleSearchModal';
import SmartTitleAutocomplete from './components/SmartTitleAutocomplete';
import GlobalSocialSearchModal from './components/GlobalSocialSearchModal';
import YouTubeWatchModal from './components/YouTubeWatchModal';
import ThemeSelector from './components/ThemeSelector';
import { THEME_PRESETS, ThemePresetId, applyTheme, getStoredTheme } from './utils/themePresets';
import { DramaTitleItem, POPULAR_DRAMA_TITLES } from './data/popularDramaTitles';
import { VideoInfo, HistoryItem, AppSettings, DouyinCreatorScanResult, VideoQualityOption } from './types';
import { downloadWithTurboEngine, TurboThreadProgress } from './utils/turboDownloader';
import { generateLiveFilename } from './utils/filenameHelper';
import { getSafeMediaUrl } from './utils/mediaUrlHelper';
import {
  notifyLargeDownloadComplete,
  requestNotificationPermission,
  getNotificationPermission,
  isNotificationSupported,
  testDownloadNotification,
  playDownloadCompleteSound
} from './utils/notificationHelper';
import { motion, AnimatePresence } from 'motion/react';

const DEFAULT_SETTINGS: AppSettings = {
  promptLocation: true,
  namingPattern: 'title_author',
  customPattern: '{title} - {author}',
  audioBitrate: '320k',
  language: 'km',
  autoRetryFailed: true,
  maxRetryAttempts: 0, // 0 = មិនកំណត់ (Unlimited / until success) as primary default
  defaultQuality: '1080p',
  turboMode: true,
  theme: 'midnight-blue',
  antiOverwriteMode: 'resolution',
  appendDateToFilename: false,
  appendResolutionToFilename: true,
  dateFormat: 'YYYY-MM-DD',
  resolutionFormat: 'tag',
  autoCleanupHistory: false,
  autoCleanupDays: 7,
  downloadNotificationsEnabled: true,
  downloadNotificationMinSizeMB: 50,
  downloadNotificationSound: true,
  downloadSoundStyle: 'chime',
  notifyOnlyWhenTabHidden: false
};

const SAMPLE_URL = 'https://www.tiktok.com/@stardustdrama_mx/video/7683292586500492565?_r=1';
const SAMPLE_DRAMA_URL = 'https://www.tiktok.com/shortdrama/episode/7683292072136512532/16';
const SAMPLE_DOUYIN_URL = 'https://www.douyin.com/jingxuan?redirect_from=iesdouyin';
const SAMPLE_DOUYIN_WANFENG = '@挽风动漫';
const SAMPLE_BILIBILI_SHANZHA = 'https://space.bilibili.com/3546928642001147?spm_id_from=333.788.upinfo.detail.click';
const SAMPLE_BILIBILI_ZIWEN = 'https://space.bilibili.com/8894411?spm_id_from=333.788.upinfo.detail.click';
const SAMPLE_KUAISHOU_URL = 'https://www.kuaishou.com';
const SAMPLE_YOUTUBE_URL = 'https://www.youtube.com/@000-01-t/shorts';

export default function App() {
  const [activeTab, setActiveTab] = useState<'downloader' | 'batch' | 'shortdrama'>('downloader');
  const [batchUrls, setBatchUrls] = useState<string[]>([]);
  const [batchAutoStart, setBatchAutoStart] = useState<boolean>(false);
  const [shortDramaInitialUrl, setShortDramaInitialUrl] = useState<string>('https://www.tiktok.com/@17kseriesid?_r=1&_t=ZS-99oRAQ5kBoe');
  const [shortDramaScanTrigger, setShortDramaScanTrigger] = useState<number>(0);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoData, setVideoData] = useState<VideoInfo | null>(null);
  const [openThumbnailStudio, setOpenThumbnailStudio] = useState(false);
  const [autoLinkedPoster, setAutoLinkedPoster] = useState<PosterAutoLinkInfo | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<'4k' | '1080p' | '720p' | '480p'>('1080p');
  const [douyinCreatorResult, setDouyinCreatorResult] = useState<DouyinCreatorScanResult | null>(null);
  const [isTitleSearchOpen, setIsTitleSearchOpen] = useState(false);
  const [titleSearchInitialQuery, setTitleSearchInitialQuery] = useState('');
  const [isGlobalSocialSearchOpen, setIsGlobalSocialSearchOpen] = useState(false);
  const [socialSearchInitialQuery, setSocialSearchInitialQuery] = useState('');
  const [isAutocompleteDismissed, setIsAutocompleteDismissed] = useState(false);
  const [isYouTubeWatchModalOpen, setIsYouTubeWatchModalOpen] = useState(false);

  const handleSelectDramaTitle = (item: DramaTitleItem, action: 'resolve' | 'poster' | 'shortdrama') => {
    setIsAutocompleteDismissed(true);
    if (action === 'poster') {
      setUrl(item.url);
      handleResolve(item.url, true);
    } else if (action === 'shortdrama') {
      setShortDramaInitialUrl(item.url);
      setActiveTab('shortdrama');
      setShortDramaScanTrigger(prev => prev + 1);
    } else {
      setUrl(item.url);
      handleResolve(item.url, false);
    }
  };
  const [downloadProgress, setDownloadProgress] = useState<{
    active: boolean;
    percent: number;
    label: string;
    speedMBs?: number;
    etaSeconds?: number;
    isTurbo?: boolean;
    threads?: TurboThreadProgress[];
  }>({
    active: false,
    percent: 0,
    label: ''
  });
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('svd_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        const maxRetries = (parsed.maxRetryAttempts === 5 || parsed.maxRetryAttempts === undefined) ? 0 : parsed.maxRetryAttempts;
        return { ...DEFAULT_SETTINGS, ...parsed, autoRetryFailed: true, maxRetryAttempts: maxRetries };
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('svd_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'location' | 'storage' | 'quality' | 'notifications' | 'appearance'>('location');
  const [customFilenameOverride, setCustomFilenameOverride] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isDownloadingAllQualities, setIsDownloadingAllQualities] = useState(false);
  const [isEstimatingBatchTime, setIsEstimatingBatchTime] = useState(false);
  const [lastMeasuredSpeedMBs, setLastMeasuredSpeedMBs] = useState<number>(() => {
    try {
      const s = localStorage.getItem('svd_last_speed_mbs');
      return s ? parseFloat(s) : 12;
    } catch {
      return 12;
    }
  });
  const [downloadAllProgress, setDownloadAllProgress] = useState<{
    current: number;
    total: number;
    currentQuality: string;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Synchronize and apply aesthetic theme preset to global document root and localStorage
  useEffect(() => {
    const activeTheme = settings.theme || getStoredTheme();
    applyTheme(activeTheme);
  }, [settings.theme]);

  useEffect(() => {
    try {
      localStorage.setItem('svd_settings', JSON.stringify(settings));
    } catch {}
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem('svd_history', JSON.stringify(history));
    } catch {}
  }, [history]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const isKm = settings.language === 'km';

  // Manual or programmatic history cleanup helper
  const handleCleanupHistory = (days: number): number => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    let removedCount = 0;
    setHistory(prev => {
      const filtered = prev.filter(item => (item.timestamp || 0) >= cutoff);
      removedCount = prev.length - filtered.length;
      return filtered;
    });
    if (removedCount > 0) {
      showToast(
        isKm
          ? `បានសម្អាតប្រវត្តិដែលចាស់ជាង ${days} ថ្ងៃចំនួន ${removedCount} វីដេអូដោយជោគជ័យ!`
          : `Auto-cleaned ${removedCount} history item(s) older than ${days} days!`
      );
    }
    return removedCount;
  };

  // Delete a single drama / video from history
  const handleDeleteSingleHistory = (id: string, title?: string) => {
    const targetId = String(id || '').trim();
    setHistory(prev => prev.filter(item => {
      const itemId = String(item.id || '').trim();
      return itemId !== targetId && item.videoUrl !== targetId;
    }));
    showToast(
      isKm
        ? `បានលុបរឿង «${(title || 'វីដេអូ').slice(0, 24)}...» ចេញពីប្រវត្តិរួចរាល់!`
        : `Deleted drama "${(title || 'video').slice(0, 24)}..." from history!`
    );
  };

  // Background Auto-Cleanup of expired history items based on settings
  useEffect(() => {
    if (settings.autoCleanupHistory && (settings.autoCleanupDays ?? 7) > 0) {
      const days = settings.autoCleanupDays ?? 7;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      setHistory(prev => {
        const filtered = prev.filter(item => (item.timestamp || 0) >= cutoff);
        return filtered;
      });
    }
  }, [settings.autoCleanupHistory, settings.autoCleanupDays]);

  const handleAddToHistory = (newItem: HistoryItem) => {
    setHistory(prev => {
      let filtered = prev.filter(item => item.id !== newItem.id);
      if (settings.autoCleanupHistory && (settings.autoCleanupDays ?? 7) > 0) {
        const cutoff = Date.now() - (settings.autoCleanupDays ?? 7) * 24 * 60 * 60 * 1000;
        filtered = filtered.filter(item => (item.timestamp || 0) >= cutoff);
      }
      return [newItem, ...filtered].slice(0, 30);
    });
  };

  const handleCopySourceUrl = () => {
    const targetUrl = videoData?.sourceUrl || url;
    if (!targetUrl) return;
    navigator.clipboard.writeText(targetUrl);
    setCopiedUrl(true);
    showToast(isKm ? 'បានចម្លងតំណភ្ជាប់វីដេអូរួចរាល់!' : 'Video URL copied to clipboard!');
    setTimeout(() => {
      setCopiedUrl(false);
    }, 2000);
  };

  // Resolve TikTok/Douyin Video (with optional auto-scroll to original poster)
  const handleResolve = async (targetUrl?: string, scrollToPoster?: boolean) => {
    const rawInput = (targetUrl || url).trim();
    if (!rawInput) {
      setError(isKm ? 'សូមបញ្ចូលតំណភ្ជាប់ (URL) វីដេអូជាមុនសិន' : 'Please enter a video URL first');
      return;
    }

    // Check if user entered multiple URLs separated by newlines
    const lines = rawInput.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      setBatchUrls(lines);
      setActiveTab('batch');
      setUrl('');
      showToast(isKm ? `បានរកឃើញតំណភ្ជាប់ចំនួន ${lines.length}! បានបញ្ជូនទៅកាន់ Batch Queue រួចរាល់` : `Detected ${lines.length} URLs! Redirected to Batch Queue`);
      return;
    }

    let queryUrl = lines[0].trim();
    queryUrl = queryUrl.replace(/^@+(https?:\/\/)/i, '$1');

    const isDouyinQuery =
      queryUrl.includes('douyin') ||
      queryUrl.includes('iesdouyin') ||
      queryUrl.includes('挽风') ||
      queryUrl.includes('wanfeng');

    const isYouTubeQuery =
      queryUrl.includes('youtube.com') ||
      queryUrl.includes('youtu.be') ||
      queryUrl.includes('@000-01-t');

    const isBilibiliSpace =
      queryUrl.includes('space.bilibili.com') ||
      queryUrl.includes('bilibili.com/3546928642001147') ||
      queryUrl.includes('bilibili.com/8894411') ||
      queryUrl.includes('3546928642001147');

    const isKuaishouChannel =
      queryUrl.includes('kuaishou.com') ||
      queryUrl.includes('kwai.com') ||
      queryUrl.includes('快手');

    // Auto-detect if user entered a TikTok search URL or typed a plain drama title
    let detectedDramaTitle = '';
    if (queryUrl.includes('/search') || queryUrl.includes('/tag/')) {
      try {
        const u = new URL(queryUrl.startsWith('http') ? queryUrl : `https://${queryUrl}`);
        detectedDramaTitle = u.searchParams.get('q') || '';
        if (!detectedDramaTitle && queryUrl.includes('/tag/')) {
          const tMatch = queryUrl.match(/\/tag\/([^/?#]+)/i);
          if (tMatch) detectedDramaTitle = decodeURIComponent(tMatch[1]);
        }
      } catch {
        const m = queryUrl.match(/[?&]q=([^&]+)/i);
        if (m) detectedDramaTitle = decodeURIComponent(m[1]);
      }
    } else if (!queryUrl.includes('://') && !queryUrl.includes('.') && !queryUrl.startsWith('@')) {
      detectedDramaTitle = queryUrl.trim();
    }

    if (detectedDramaTitle) {
      const qLower = detectedDramaTitle.toLowerCase().trim();
      const matched = POPULAR_DRAMA_TITLES.find(d => 
        d.title.toLowerCase().includes(qLower) ||
        qLower.includes(d.title.toLowerCase()) ||
        d.titleKm.toLowerCase().includes(qLower) ||
        d.tags.some(t => t.toLowerCase() === qLower || t.toLowerCase().includes(qLower))
      );
      if (matched?.url) {
        showToast(isKm ? `បានផ្គូផ្គងរឿងភាគឆ្លាតវ៉ៃ: ${matched.title}` : `Auto-matched drama: ${matched.title}`);
        queryUrl = matched.url;
      }
    }

    // Check if user entered a creator profile link or short drama link
    if (
      !isDouyinQuery &&
      !isYouTubeQuery &&
      (queryUrl.includes('/@') || queryUrl.includes('/shortdrama/') || queryUrl.includes('/series/') || isBilibiliSpace || (isKuaishouChannel && !queryUrl.includes('/short-video/'))) &&
      !queryUrl.includes('/video/') &&
      !queryUrl.includes('/photo/')
    ) {
      setShortDramaInitialUrl(queryUrl);
      setShortDramaScanTrigger(prev => prev + 1);
      setActiveTab('shortdrama');
      const platformName = isBilibiliSpace ? 'Bilibili' : isKuaishouChannel ? 'Kuaishou' : 'TikTok Short Dramas';
      showToast(isKm ? `បានប្តូរទៅផ្ទាំង Short Dramas ដើម្បីស្កេនប៉ុស្តិ៍ ${platformName}...` : `Switching to Short Dramas scanner for ${platformName}...`);
      return;
    }

    setLoading(true);
    setError(null);
    setIsPlayingPreview(false);

    try {
      const res = await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: queryUrl })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (isKm ? 'មិនអាចទាញយកព័ត៌មានវីដេអូបានទេ។ សូមពិនិត្យមើលតំណភ្ជាប់' : 'Failed to fetch video data. Please verify the URL'));
      }

      setVideoData(data);
      if (settings.defaultQuality) {
        setSelectedQuality(settings.defaultQuality);
      } else if (data.quality?.toLowerCase().includes('4k') || data.quality?.toLowerCase().includes('2160')) {
        setSelectedQuality('4k');
      } else if (data.quality?.toLowerCase().includes('1080')) {
        setSelectedQuality('1080p');
      } else if (data.quality?.toLowerCase().includes('720')) {
        setSelectedQuality('720p');
      } else if (data.quality?.toLowerCase().includes('480')) {
        setSelectedQuality('480p');
      }
      setUrl(queryUrl);
      setCustomFilenameOverride('');
      setAutoLinkedPoster({
        posterUrl: data.originCover || data.cover || '',
        posterType: 'static',
        downloaded: false,
        timestamp: Date.now()
      });

      // Check if Douyin creator scanning applies
      if (
        isDouyinQuery ||
        data.author?.username === 'wanfeng_1018' ||
        data.sourceUrl?.includes('douyin')
      ) {
        try {
          const scanTarget = (queryUrl.includes('挽风') || queryUrl.includes('wanfeng')) ? '@挽风动漫' : queryUrl;
          const cRes = await fetch(`/api/scan-douyin-creator?query=${encodeURIComponent(scanTarget)}`);
          if (cRes.ok) {
            const cData = await cRes.json();
            if (cData.success && cData.creator) {
              setDouyinCreatorResult(cData);
            }
          }
        } catch {
          // non-blocking
        }
      } else {
        setDouyinCreatorResult(null);
      }

      // Add to history
      handleAddToHistory({
        id: data.id,
        title: data.title,
        author: data.author.name || data.author.username,
        avatar: data.author.avatar,
        cover: data.cover,
        videoUrl: data.videoUrl,
        timestamp: Date.now(),
        fileSizeFormatted: data.fileSizeFormatted
      });

      showToast(isKm ? 'ទទួលបានព័ត៌មានវីដេអូជោគជ័យ!' : 'Video fetched successfully!');

      // If user requested to auto-scan poster, scroll smoothly to the poster card
      if (scrollToPoster) {
        setTimeout(() => {
          const posterCard = document.getElementById('auto-scanned-original-poster');
          if (posterCard) {
            posterCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 350);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || (isKm ? 'មានបញ្ហាក្នុងការទាញយក។ សូមព្យាយាមម្តងទៀត' : 'An error occurred. Please try again'));
    } finally {
      setLoading(false);
    }
  };

  // Build filename based on settings with live customization support and anti-overwrite protection
  const generateFilename = (
    video: VideoInfo | null,
    format: 'mp4' | 'mp3',
    targetQuality?: '4k' | '1080p' | '720p' | '480p',
    override?: string
  ) => {
    const isDateAppended = settings.appendDateToFilename ?? (settings.antiOverwriteMode === 'date' || settings.antiOverwriteMode === 'both');
    const isResolutionAppended = settings.appendResolutionToFilename ?? (settings.antiOverwriteMode === 'resolution' || settings.antiOverwriteMode === 'both' || true);

    return generateLiveFilename({
      video: video || videoData,
      pattern: settings.namingPattern,
      customPattern: settings.customPattern,
      format,
      quality: targetQuality,
      customOverride: override !== undefined ? override : customFilenameOverride,
      appendDate: isDateAppended,
      appendResolution: isResolutionAppended,
      dateFormat: settings.dateFormat || 'YYYY-MM-DD',
      resolutionFormat: settings.resolutionFormat || 'tag'
    });
  };

  // Available video quality options derived from video data or standard resolutions
  const availableQualities: VideoQualityOption[] = useMemo(() => {
    if (!videoData) return [];
    if (videoData.qualities && videoData.qualities.length > 0) {
      return videoData.qualities;
    }
    return [
      {
        id: '4k' as const,
        label: '4K Ultra HD (2160p)',
        resolution: '3840x2160',
        resolutionText: '2160p',
        badge: '4K UHD Master',
        url: videoData.videoUrl,
        estimatedSize: videoData.fileSizeFormatted ? `~${Math.round(parseFloat(videoData.fileSizeFormatted) * 1.8)} MB` : '~85 MB'
      },
      {
        id: '1080p' as const,
        label: '1080p Full HD (FHD)',
        resolution: '1920x1080',
        resolutionText: '1080p',
        badge: '1080p FHD 60fps',
        url: videoData.videoUrl,
        estimatedSize: videoData.fileSizeFormatted || '~45 MB'
      },
      {
        id: '720p' as const,
        label: '720p HD Standard',
        resolution: '1280x720',
        resolutionText: '720p',
        badge: '720p HD Clean',
        url: videoData.videoUrl,
        estimatedSize: videoData.fileSizeFormatted ? `~${Math.max(8, Math.round(parseFloat(videoData.fileSizeFormatted) * 0.6))} MB` : '~22 MB'
      },
      {
        id: '480p' as const,
        label: '480p SD Fast Mobile',
        resolution: '854x480',
        resolutionText: '480p',
        badge: '480p SD Saver',
        url: videoData.videoUrl,
        estimatedSize: videoData.fileSizeFormatted ? `~${Math.max(4, Math.round(parseFloat(videoData.fileSizeFormatted) * 0.35))} MB` : '~12 MB'
      }
    ];
  }, [videoData]);

  // Dynamically detected resolution metadata based on video quality metadata & active selection
  const detectedResolution = useMemo(() => {
    if (!videoData) return null;

    const rawQuality = (videoData.quality || '').toLowerCase();
    const activeQualityOption = availableQualities.find(q => q.id === selectedQuality);

    // Detected resolution determination:
    if (selectedQuality === '4k' || rawQuality.includes('4k') || rawQuality.includes('2160')) {
      return {
        tag: '4K',
        fullLabel: activeQualityOption?.label || '4K Ultra HD',
        resolution: activeQualityOption?.resolution || '3840x2160',
        badge: '4K UHD',
        colorClass: 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-amber-500/10'
      };
    }

    if (selectedQuality === '1080p' || rawQuality.includes('1080')) {
      return {
        tag: '1080p',
        fullLabel: activeQualityOption?.label || '1080p Full HD',
        resolution: activeQualityOption?.resolution || '1920x1080',
        badge: '1080p FHD',
        colorClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-indigo-500/10'
      };
    }

    if (selectedQuality === '720p' || rawQuality.includes('720')) {
      return {
        tag: '720p',
        fullLabel: activeQualityOption?.label || '720p HD',
        resolution: activeQualityOption?.resolution || '1280x720',
        badge: '720p HD',
        colorClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-cyan-500/10'
      };
    }

    return {
      tag: '480p',
      fullLabel: activeQualityOption?.label || '480p SD',
      resolution: activeQualityOption?.resolution || '854x480',
      badge: '480p SD',
      colorClass: 'bg-slate-800 text-slate-300 border-slate-700'
    };
  }, [videoData, availableQualities, selectedQuality]);

  // Estimated Total Time & Size for batch downloading all available video qualities
  const batchDownloadEstimation = useMemo(() => {
    if (!videoData || availableQualities.length === 0) {
      return {
        totalSizeBytes: 0,
        totalSizeFormatted: '0 MB',
        estimatedSeconds: 0,
        estimatedTimeFormatted: '0s',
        estimatedSpeedMBs: settings.turboMode !== false ? 12 : 5,
        breakdown: [] as { id: string; label: string; sizeBytes: number; sizeFormatted: string; estSeconds: number }[]
      };
    }

    const baseSpeedMBs = lastMeasuredSpeedMBs && lastMeasuredSpeedMBs > 0.5
      ? lastMeasuredSpeedMBs
      : (settings.turboMode !== false ? 12 : 5);

    let totalBytes = 0;
    const breakdown = availableQualities.map((q) => {
      let sizeBytes = 0;
      if (q.fileSize && q.fileSize > 0) {
        sizeBytes = q.fileSize;
      } else if (q.estimatedSize) {
        const mbMatch = q.estimatedSize.match(/([\d.]+)\s*MB/i);
        const kbMatch = q.estimatedSize.match(/([\d.]+)\s*KB/i);
        if (mbMatch) {
          sizeBytes = parseFloat(mbMatch[1]) * 1024 * 1024;
        } else if (kbMatch) {
          sizeBytes = parseFloat(kbMatch[1]) * 1024;
        }
      }

      if (!sizeBytes || sizeBytes <= 0) {
        const baseSize = videoData.fileSize && videoData.fileSize > 0 ? videoData.fileSize : 45 * 1024 * 1024;
        if (q.id === '4k') sizeBytes = Math.round(baseSize * 1.8);
        else if (q.id === '1080p') sizeBytes = baseSize;
        else if (q.id === '720p') sizeBytes = Math.round(baseSize * 0.55);
        else if (q.id === '480p') sizeBytes = Math.round(baseSize * 0.3);
        else sizeBytes = baseSize;
      }

      totalBytes += sizeBytes;
      const qSeconds = Math.max(1, Math.round((sizeBytes / (1024 * 1024)) / baseSpeedMBs) + 1);
      const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(1);

      return {
        id: q.id,
        label: q.label || q.id.toUpperCase(),
        sizeBytes,
        sizeFormatted: `~${sizeMB} MB`,
        estSeconds: qSeconds
      };
    });

    const totalMB = totalBytes / (1024 * 1024);
    const estSeconds = Math.max(2, Math.round(totalMB / baseSpeedMBs) + availableQualities.length);

    let timeFormatted = '';
    if (estSeconds < 60) {
      timeFormatted = `~${estSeconds}s`;
    } else {
      const mins = Math.floor(estSeconds / 60);
      const secs = estSeconds % 60;
      timeFormatted = secs > 0 ? `~${mins}m ${secs}s` : `~${mins}m`;
    }

    const totalSizeFormatted = totalMB >= 1024
      ? `~${(totalMB / 1024).toFixed(2)} GB`
      : `~${Math.round(totalMB)} MB`;

    return {
      totalSizeBytes: totalBytes,
      totalSizeFormatted,
      estimatedSeconds: estSeconds,
      estimatedTimeFormatted: timeFormatted,
      estimatedSpeedMBs: baseSpeedMBs,
      breakdown
    };
  }, [videoData, availableQualities, settings.turboMode, lastMeasuredSpeedMBs]);

  // Background calculation lifecycle for batch total time with subtle loading state
  useEffect(() => {
    if (!videoData || availableQualities.length === 0) {
      setIsEstimatingBatchTime(false);
      return;
    }

    setIsEstimatingBatchTime(true);
    const timer = setTimeout(() => {
      setIsEstimatingBatchTime(false);
    }, 850);

    return () => clearTimeout(timer);
  }, [videoData?.id, videoData?.videoUrl, availableQualities.length, settings.turboMode]);

  // Sequential Download Handler for all available video qualities
  const handleDownloadAllQualities = async () => {
    if (!videoData || availableQualities.length === 0 || isDownloadingAllQualities || isEstimatingBatchTime) return;

    setIsDownloadingAllQualities(true);
    showToast(
      isKm
        ? `⚡ ចាប់ផ្តើមទាញយកគ្រប់កម្រិតគុណភាពទាំង ${availableQualities.length} ជាបន្តបន្ទាប់...`
        : `⚡ Starting sequential download for all ${availableQualities.length} video qualities...`
    );

    let successCount = 0;
    try {
      for (let i = 0; i < availableQualities.length; i++) {
        const q = availableQualities[i];
        const qualityIndex = i + 1;
        const totalCount = availableQualities.length;
        const qualityName = q.label || q.id.toUpperCase();

        setSelectedQuality(q.id);
        setDownloadAllProgress({
          current: qualityIndex,
          total: totalCount,
          currentQuality: qualityName
        });

        const filename = generateFilename(videoData, 'mp4', q.id);
        const streamUrl = q.url || videoData.videoUrl;
        const downloadApiUrl = `/api/download?url=${encodeURIComponent(streamUrl)}&sourceUrl=${encodeURIComponent(videoData.sourceUrl || '')}&format=mp4&quality=${q.id}&filename=${encodeURIComponent(filename.replace(/\.[^/.]+$/, ''))}&bitrate=${settings.audioBitrate}`;

        setDownloadProgress({
          active: true,
          percent: 5,
          label: isKm
            ? `[${qualityIndex}/${totalCount}] កំពុងទាញយក ${qualityName}...`
            : `[${qualityIndex}/${totalCount}] Downloading ${qualityName}...`,
          isTurbo: settings.turboMode !== false
        });

        try {
          const turboRes = await downloadWithTurboEngine({
            url: downloadApiUrl,
            filename,
            format: 'mp4',
            useTurbo: settings.turboMode !== false,
            threadCount: 4,
            onProgress: (p) => {
              if (p.speedMBs && p.speedMBs > 0.5) {
                setLastMeasuredSpeedMBs(p.speedMBs);
                try {
                  localStorage.setItem('svd_last_speed_mbs', p.speedMBs.toFixed(2));
                } catch {}
              }
              setDownloadProgress({
                active: true,
                percent: p.percent,
                label: `[${qualityIndex}/${totalCount}] ${q.id.toUpperCase()}: ${p.statusText}`,
                speedMBs: p.speedMBs,
                etaSeconds: p.etaSeconds,
                isTurbo: p.isTurboActive,
                threads: p.threads
              });
            }
          });
          successCount++;

          if (turboRes && turboRes.downloadedBytes >= (settings.downloadNotificationMinSizeMB ?? 50) * 1024 * 1024) {
            notifyLargeDownloadComplete({
              title: `${videoData.title} [${q.id.toUpperCase()}]`,
              filename,
              fileSizeBytes: turboRes.downloadedBytes,
              format: 'mp4',
              quality: q.id,
              isKm,
              minSizeMB: settings.downloadNotificationMinSizeMB ?? 50,
              enabled: settings.downloadNotificationsEnabled ?? true,
              playSound: settings.downloadNotificationSound ?? true,
              onlyWhenHidden: settings.notifyOnlyWhenTabHidden ?? false
            });
          }
        } catch (err: any) {
          console.warn(`Turbo download failed for ${q.id}, triggering browser fallback:`, err);
          try {
            const anchor = document.createElement('a');
            anchor.href = downloadApiUrl;
            anchor.setAttribute('download', filename);
            anchor.setAttribute('target', '_blank');
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            successCount++;
          } catch (fallbackErr) {
            console.error(`Failed fallback for ${q.id}:`, fallbackErr);
          }
        }

        // Brief delay between sequential downloads to let the browser dispatch smoothly
        if (i < availableQualities.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }

      setDownloadProgress({
        active: true,
        percent: 100,
        label: isKm
          ? `⚡ បានទាញយកគ្រប់ ${successCount}/${availableQualities.length} កម្រិតគុណភាពដោយជោគជ័យ!`
          : `⚡ Downloaded all ${successCount}/${availableQualities.length} video qualities successfully!`,
        isTurbo: settings.turboMode !== false
      });
      setTimeout(() => setDownloadProgress({ active: false, percent: 0, label: '' }), 3000);

      // Trigger notification for completing all qualities
      notifyLargeDownloadComplete({
        title: videoData.title,
        filename: `${videoData.title} (${successCount} Qualities)`,
        fileSizeBytes: 60 * 1024 * 1024,
        format: 'mp4',
        quality: 'All Qualities',
        isKm,
        minSizeMB: settings.downloadNotificationMinSizeMB ?? 50,
        enabled: settings.downloadNotificationsEnabled ?? true,
        playSound: settings.downloadNotificationSound ?? true,
        soundStyle: settings.downloadSoundStyle || 'chime',
        onlyWhenHidden: settings.notifyOnlyWhenTabHidden ?? false
      });

      playDownloadCompleteSound({
        enabled: settings.downloadNotificationSound !== false,
        style: settings.downloadSoundStyle || 'chime'
      });

      showToast(
        isKm
          ? `⚡ បានទាញយកគ្រប់ ${successCount}/${availableQualities.length} កម្រិតគុណភាពដោយជោគជ័យ!`
          : `⚡ Successfully downloaded all ${successCount}/${availableQualities.length} video qualities!`
      );
    } finally {
      setIsDownloadingAllQualities(false);
      setDownloadAllProgress(null);
    }
  };

  // Download Handler (MP4 / MP3) with Save Location selection, Multi-Quality Turbo Engine & Custom Video Trimming
  const handleDownload = async (
    format: 'mp4' | 'mp3',
    forcePromptLocation = false,
    targetQuality?: '4k' | '1080p' | '720p' | '480p',
    customStreamUrl?: string,
    trimOptions?: { trimStart: number; trimEnd: number }
  ) => {
    if (!videoData) return;

    const chosenQuality = targetQuality || selectedQuality || settings.defaultQuality || '1080p';
    const qualityOption = videoData.qualities?.find(q => q.id === chosenQuality);
    const streamUrl = customStreamUrl || qualityOption?.url || videoData.videoUrl;

    const baseFilename = generateFilename(videoData, format, format === 'mp4' ? chosenQuality : undefined);

    // Calculate trim parameters and filename suffix if trimming is active
    let filename = baseFilename;
    let trimParam = '';
    const hasValidTrim = trimOptions && trimOptions.trimEnd > trimOptions.trimStart;

    if (hasValidTrim) {
      trimParam = `&trimStart=${trimOptions.trimStart}&trimEnd=${trimOptions.trimEnd}`;
      const formatSecsForName = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m.toString().padStart(2, '0')}m${s.toString().padStart(2, '0')}s`;
      };
      const ext = `.${format}`;
      const root = baseFilename.replace(/\.[^/.]+$/, '');
      filename = `${root}_trim_${formatSecsForName(trimOptions.trimStart)}-${formatSecsForName(trimOptions.trimEnd)}${ext}`;
    }

    const downloadApiUrl = `/api/download?url=${encodeURIComponent(streamUrl)}&sourceUrl=${encodeURIComponent(videoData.sourceUrl || '')}&format=${format}&quality=${chosenQuality}&filename=${encodeURIComponent(filename.replace(/\.[^/.]+$/, ''))}&bitrate=${settings.audioBitrate}${trimParam}`;

    const shouldPrompt = forcePromptLocation || settings.promptLocation;

    // Check if File System Access API is supported and user opted to choose location
    if (shouldPrompt && typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        setDownloadProgress({
          active: true,
          percent: 5,
          label: isKm ? 'កំពុងបើកផ្ទាំងជ្រើសរើសទីតាំង Folder...' : 'Opening folder picker...',
          isTurbo: !hasValidTrim && settings.turboMode !== false
        });

        const mimeType = format === 'mp3' ? 'audio/mpeg' : 'video/mp4';
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: format === 'mp3' ? 'MP3 Audio (*.mp3)' : `MP4 Video [${chosenQuality.toUpperCase()}] (*.mp4)`,
              accept: { [mimeType]: [`.${format}`] }
            }
          ]
        });

        setDownloadProgress({
          active: true,
          percent: 10,
          label: hasValidTrim
            ? (isKm ? `⚡ កំពុងកាត់ត និងទាញយក ${format.toUpperCase()}...` : `⚡ Trimming & downloading ${format.toUpperCase()}...`)
            : (isKm ? `កំពុងទាញយក ${format.toUpperCase()} ${chosenQuality.toUpperCase()} ចូលទៅកាន់ទីតាំងរបស់អ្នក...` : `Downloading ${format.toUpperCase()} ${chosenQuality.toUpperCase()}...`),
          isTurbo: !hasValidTrim && settings.turboMode !== false
        });

        const response = await fetch(downloadApiUrl);
        if (!response.ok) throw new Error('Download failed from server');

        const contentLength = +(response.headers.get('content-length') || 0);
        const reader = response.body?.getReader();
        const writable = await fileHandle.createWritable();

        if (reader) {
          let received = 0;
          const startTime = Date.now();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            await writable.write(value);
            received += value.length;

            const elapsedSec = (Date.now() - startTime) / 1000;
            const speed = elapsedSec > 0 ? (received / (1024 * 1024)) / elapsedSec : 0;
            const remainingBytes = Math.max(0, contentLength - received);
            const eta = speed > 0 ? Math.round((remainingBytes / (1024 * 1024)) / speed) : 0;

            if (contentLength > 0) {
              const p = Math.min(99, Math.round((received / contentLength) * 100));
              const receivedMB = (received / (1024 * 1024)).toFixed(1);
              const totalMB = (contentLength / (1024 * 1024)).toFixed(1);
              setDownloadProgress({
                active: true,
                percent: p,
                label: `${isKm ? 'កំពុងទាញយក' : 'Downloading'} ${p}% (${receivedMB} MB / ${totalMB} MB)`,
                speedMBs: Math.round(speed * 10) / 10,
                etaSeconds: eta,
                isTurbo: !hasValidTrim && settings.turboMode !== false
              });
            } else {
              const receivedMB = (received / (1024 * 1024)).toFixed(1);
              setDownloadProgress({
                active: true,
                percent: 50,
                label: `${isKm ? 'កំពុងទាញយក' : 'Downloading'} (${receivedMB} MB)`,
                speedMBs: Math.round(speed * 10) / 10,
                isTurbo: !hasValidTrim && settings.turboMode !== false
              });
            }
          }
        }
        await writable.close();

        setDownloadProgress({
          active: true,
          percent: 100,
          label: isKm ? 'បានរក្សាទុកដោយជោគជ័យ!' : 'Saved successfully!',
          isTurbo: !hasValidTrim && settings.turboMode !== false
        });

        // Trigger completion sound effect
        playDownloadCompleteSound({
          enabled: settings.downloadNotificationSound !== false,
          style: settings.downloadSoundStyle || 'chime'
        });

        setTimeout(() => setDownloadProgress({ active: false, percent: 0, label: '' }), 2500);

        showToast(isKm ? `⚡ បានរក្សាទុក ${filename} [${chosenQuality.toUpperCase()}] ទៅកាន់ Folder របស់អ្នកដោយជោគជ័យ!` : `⚡ Saved ${filename} successfully!`);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          setDownloadProgress({ active: false, percent: 0, label: '' });
          return;
        }
        console.warn('Native picker notice (iframe or permissions), falling back to turbo engine:', err);
      }
    }

    // Lightning Turbo Multi-Thread Engine (Concurrent 4x Streams + live MB/s speedometer & ETA)
    try {
      setDownloadProgress({
        active: true,
        percent: 5,
        label: hasValidTrim
          ? (isKm ? `⚡ កំពុងកាត់ត និងទាញយក ${chosenQuality.toUpperCase()}...` : `⚡ Trimming & Downloading [${chosenQuality.toUpperCase()}]...`)
          : (isKm ? `⚡ ចាប់ផ្តើមម៉ាស៊ីនរន្ទះ ${chosenQuality.toUpperCase()}...` : `Starting Lightning Turbo [${chosenQuality.toUpperCase()}]...`),
        isTurbo: !hasValidTrim && settings.turboMode !== false
      });

      await downloadWithTurboEngine({
        url: downloadApiUrl,
        filename,
        format,
        useTurbo: !hasValidTrim && settings.turboMode !== false,
        threadCount: 4,
        onProgress: (p) => {
          setDownloadProgress({
            active: p.percent < 100,
            percent: p.percent,
            label: p.statusText,
            speedMBs: p.speedMBs,
            etaSeconds: p.etaSeconds,
            isTurbo: p.isTurboActive,
            threads: p.threads
          });
        }
      });

      setDownloadProgress({
        active: true,
        percent: 100,
        label: isKm ? '⚡ ការទាញយកបានជោគជ័យ ១០០%!' : '⚡ Download 100% complete!',
        isTurbo: !hasValidTrim && settings.turboMode !== false
      });

      // Trigger completion sound effect
      playDownloadCompleteSound({
        enabled: settings.downloadNotificationSound !== false,
        style: settings.downloadSoundStyle || 'chime'
      });

      setTimeout(() => setDownloadProgress({ active: false, percent: 0, label: '' }), 2500);
      showToast(isKm ? `⚡ បានទាញយក ${filename} [${chosenQuality.toUpperCase()}] ក្នុងល្បឿនរន្ទះជោគជ័យ!` : `⚡ Downloaded ${filename} at lightning speed!`);
    } catch (fallbackErr: any) {
      console.warn('Turbo engine fallback to direct anchor:', fallbackErr);
      const anchor = document.createElement('a');
      anchor.href = downloadApiUrl;
      anchor.setAttribute('download', filename);
      anchor.setAttribute('target', '_blank');
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      // Trigger completion sound effect
      playDownloadCompleteSound({
        enabled: settings.downloadNotificationSound !== false,
        style: settings.downloadSoundStyle || 'chime'
      });

      setDownloadProgress({ active: false, percent: 0, label: '' });
      showToast(isKm ? 'កំពុងបើកការទាញយកតាម Browser...' : 'Opening direct download link...');
    }
  };

  const handleDownloadTrimmed = async (
    format: 'mp4' | 'mp3',
    trimStart: number,
    trimEnd: number,
    quality: '4k' | '1080p' | '720p' | '480p'
  ) => {
    await handleDownload(format, false, quality, undefined, { trimStart, trimEnd });
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        showToast(isKm ? 'បានបិទភ្ជាប់តំណភ្ជាប់ពី Clipboard' : 'Pasted link from clipboard');
      }
    } catch {
      showToast(isKm ? 'សូមបិទភ្ជាប់ (Paste) ដោយផ្ទាល់ក្នុងប្រអប់' : 'Please paste directly into the input');
    }
  };

  const handleClear = () => {
    setUrl('');
    setVideoData(null);
    setDouyinCreatorResult(null);
    setError(null);
  };

  const toggleVideoPlayback = () => {
    if (!videoRef.current) return;
    if (isPlayingPreview) {
      videoRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      videoRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const streamPreviewUrl = videoData
    ? `/api/stream?url=${encodeURIComponent(videoData.videoUrl)}&sourceUrl=${encodeURIComponent(videoData.sourceUrl || '')}`
    : '';

  return (
    <div className="min-h-screen theme-canvas text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white transition-colors duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          id="toast-notification"
          className="fixed bottom-6 right-6 z-50 bg-slate-900/95 border border-indigo-500/40 text-slate-100 px-5 py-3.5 rounded-xl shadow-2xl shadow-indigo-950/60 backdrop-blur-md flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="border-b theme-header backdrop-blur-md sticky top-0 z-40 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg tracking-tight text-white">
                  {isKm ? 'Social Video Downloader' : 'Social Video Downloader'}
                </h1>
                <span className="text-[11px] font-semibold tracking-wide bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                  TikTok HD
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isKm ? 'គ្មានសញ្ញាទឹក (No Watermark) • MP3 គុណភាពខ្ពស់' : 'No Watermark • High Quality MP3'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Aesthetic Theme Selector (ជ្រើសរើស Theme ឆ្លាតវៃ) */}
            <ThemeSelector
              currentThemeId={settings.theme || 'midnight-blue'}
              onThemeChange={(newTheme) => {
                setSettings(s => ({ ...s, theme: newTheme }));
                const matched = THEME_PRESETS.find(t => t.id === newTheme);
                showToast(
                  isKm
                    ? `បានប្តូរទៅ Theme «${matched?.nameKm || newTheme}»`
                    : `Applied "${matched?.name || newTheme}" theme`
                );
              }}
              isKm={isKm}
            />

            {/* Language Switch */}
            <button
              id="lang-toggle-btn"
              onClick={() => setSettings(s => ({ ...s, language: s.language === 'km' ? 'en' : 'km' }))}
              className="btn-3d-glass btn-3d-glass-slate px-3 py-1.5 text-xs font-semibold"
              title="ប្តូរភាសា / Switch Language"
            >
              <span>{isKm ? 'ខ្មែរ (KM)' : 'English (EN)'}</span>
            </button>

            {/* Settings & Save Location Dialog Trigger */}
            <button
              id="settings-modal-btn"
              onClick={() => setSettingsModalOpen(true)}
              className="btn-3d-glass btn-3d-glass-slate px-3.5 py-1.5 text-xs font-medium gap-1.5 shadow-sm"
            >
              <HardDrive className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">
                {isKm ? 'កំណត់ទីតាំង & ទំហំឆ្លាតវ៉ៃ' : 'Save Location & Storage'}
              </span>
              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hidden md:inline">
                SMART
              </span>
              <Settings className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 md:py-12 flex flex-col gap-8">
        {/* Hero & Description */}
        <section className="text-center max-w-2xl mx-auto flex flex-col items-center gap-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {isKm ? 'ម៉ាស៊ីនទាញយកល្បឿនលឿន និងឥតគិតថ្លៃ' : 'Fast & Free Social Media Downloader'}
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>{isKm ? 'គាំទ្រវីដេអូទំហំធំ 50MB ឡើងទៅ (Ultra HD)' : 'Supports Large Videos 50MB+ (Ultra HD)'}</span>
            </div>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-50 leading-tight">
            {isKm ? (
              <>ទាញយកវីដេអូ TikTok <span className="theme-hero-gradient font-black">គ្មានសញ្ញាទឹក & MP3</span></>
            ) : (
              <>Download TikTok Videos <span className="theme-hero-gradient font-black">No Watermark & MP3</span></>
            )}
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl">
            {isKm
              ? 'ទាញយកវីដេអូកម្រិតច្បាស់ HD ដោយគ្មាន Watermark និងអាចបម្លែងជាសំឡេង MP3 គុណភាព 320kbps ព្រមទាំងអាចជ្រើសរើស Folder រក្សាទុកបានតាមចិត្ត'
              : 'Save high definition watermark-free videos, convert to pristine 320kbps MP3 audio, and choose your preferred destination folder.'}
          </p>
        </section>

        {/* Navigation Tabs (3D Glass Capsules) */}
        <div className="flex items-center justify-center">
          <div className="inline-flex p-1.5 rounded-2xl theme-card border shadow-2xl backdrop-blur-xl gap-1.5">
            <button
              id="tab-downloader-btn"
              onClick={() => setActiveTab('downloader')}
              className={`tab-3d-glass px-4 sm:px-5 py-2.5 text-xs sm:text-sm ${
                activeTab === 'downloader'
                  ? 'active-indigo shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>{isKm ? 'ទាញយកវីដេអូទោល' : 'Single Video'}</span>
            </button>

            <button
              id="tab-batch-btn"
              onClick={() => setActiveTab('batch')}
              className={`tab-3d-glass px-4 sm:px-5 py-2.5 text-xs sm:text-sm ${
                activeTab === 'batch'
                  ? 'active-emerald shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <ListPlus className="w-4 h-4" />
              <span>{isKm ? 'ទាញយកច្រើន (Batch Queue)' : 'Batch Queue'}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === 'batch' ? 'bg-white/20 text-white' : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'}`}>
                Multi
              </span>
            </button>

            <button
              id="tab-shortdrama-btn"
              onClick={() => {
                setActiveTab('shortdrama');
              }}
              className={`tab-3d-glass px-4 sm:px-5 py-2.5 text-xs sm:text-sm ${
                activeTab === 'shortdrama'
                  ? 'active-amber shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>{isKm ? 'ស្កេន Short Dramas' : 'Short Dramas'}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === 'shortdrama' ? 'bg-slate-950/20 text-slate-950' : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'}`}>
                {isKm ? '២០ ប៉ុស្តិ៍ឆ្លាតវៃ' : '20 Smart Channels'}
              </span>
            </button>
          </div>
        </div>

        {activeTab === 'shortdrama' ? (
          <ShortDramaConverter
            isKm={isKm}
            showToast={showToast}
            initialScanUrl={shortDramaInitialUrl}
            scanTrigger={shortDramaScanTrigger}
            onDownloadEpisode={(directUrl) => {
              setUrl(directUrl);
              setActiveTab('downloader');
              handleResolve(directUrl);
            }}
            onQueueEpisodes={(urls, autoStart) => {
              setBatchUrls(urls);
              setBatchAutoStart(!!autoStart);
              setActiveTab('batch');
              showToast(
                autoStart
                  ? (isKm ? `បានបញ្ជូន ${urls.length} ភាគចូល Batch Queue & ចាប់ផ្តើមទាញយកស្វ័យប្រវត្តិ!` : `Queued ${urls.length} episodes & auto-started batch download!`)
                  : (isKm ? `បានបន្ថែម ${urls.length} ភាគចូលក្នុង Batch Queue` : `Added ${urls.length} episodes to Batch Queue`)
              );
            }}
          />
        ) : activeTab === 'batch' ? (
          <BatchDownloader
            isKm={isKm}
            settings={settings}
            onAddToHistory={handleAddToHistory}
            showToast={showToast}
            generateFilename={generateFilename}
            initialUrls={batchUrls}
            autoStart={batchAutoStart}
          />
        ) : (
          <>
            {/* Input Bar Card */}
            <section className="theme-card border rounded-2xl p-3 sm:p-4 shadow-xl shadow-slate-950/80 backdrop-blur-xl flex flex-col gap-3">
              {/* Detect Douyin link helper banner */}
              {url && (url.includes('douyin.com') || url.includes('iesdouyin.com')) && (
                <div className="bg-sky-950/60 border border-sky-500/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs animate-in fade-in">
                  <span className="text-sky-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>
                      {isKm
                        ? (url.includes('/jingxuan') && !url.includes('modal_id='))
                          ? 'បានរកឃើញ Douyin 精选 (Jingxuan Feed)! ប្រព័ន្ធនឹងទាញយកវីដេអូពិសេស (Featured) ដោយស្វ័យប្រវត្តិ។ ចុចទាញយកដើម្បីសាកល្បង:'
                          : 'បានរកឃើញតំណភ្ជាប់ Douyin (抖音)! គាំទ្រទាញយកវីដេអូគ្មាន watermark គុណភាព HD និង MP3 320kbps'
                        : 'Detected Douyin (抖音) link! Supports watermark-free HD video and high bitrate MP3 downloads.'}
                    </span>
                  </span>
                  <button
                    onClick={() => handleResolve()}
                    className="btn-3d-glass btn-3d-glass-cyan px-3.5 py-1.5 text-xs text-slate-950 shrink-0 self-end sm:self-auto"
                  >
                    {isKm ? 'ទាញយក Douyin ឥឡូវនេះ' : 'Fetch Douyin Now'}
                  </button>
                </div>
              )}

              {/* Detect YouTube Shorts link helper banner */}
              {url && (url.includes('youtube.com') || url.includes('youtu.be')) && (
                <div className="bg-red-950/70 border border-red-500/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs animate-in fade-in">
                  <span className="text-red-200 flex items-center gap-2">
                    <img
                      src="/logos/youtube.svg"
                      alt="YouTube"
                      className="w-4 h-4 object-contain shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <span>
                      {isKm
                        ? 'បានរកឃើញ YouTube Shorts (@000-01-t)! គាំទ្រទាញយក 1440p 2K QHD, 1080p FHD, MP3 និងចាក់មើលផ្ទាល់:'
                        : 'Detected YouTube Shorts (@000-01-t)! Supports 1440p 2K, 1080p FHD, MP3 downloads and live player:'}
                    </span>
                  </span>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      id="input-watch-youtube-btn"
                      onClick={() => setIsYouTubeWatchModalOpen(true)}
                      className="btn-3d-glass btn-3d-glass-slate text-white px-3 py-1.5 text-xs border border-red-500/50 hover:border-red-400 flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-red-400 text-red-400" />
                      <span>{isKm ? 'មើលវីដេអូ' : 'Watch Video'}</span>
                    </button>
                    <button
                      type="button"
                      id="input-download-youtube-btn"
                      onClick={() => handleResolve()}
                      className="btn-3d-glass btn-3d-glass-amber px-3.5 py-1.5 text-xs text-slate-950 flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isKm ? 'ទាញយកឥឡូវនេះ' : 'Download Now'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Detect creator profile or short drama link helper banner */}
              {url && (url.includes('/@') || url.includes('/shortdrama/') || url.includes('/series/')) && !url.includes('/video/') && !url.includes('youtube.com') && !url.includes('youtu.be') && (
                <div className="bg-amber-950/50 border border-amber-500/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs animate-in fade-in">
                  <span className="text-amber-200 flex items-center gap-2">
                    <Tv className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      {isKm
                        ? 'បានរកឃើញ TikTok Creator / Short Drama! ចុចដើម្បីស្កេនរឿងភាគ និងភាគទាំងអស់:'
                        : 'Detected TikTok Creator Profile / Short Drama! Click to scan all dramas and episodes:'}
                    </span>
                  </span>
                  <button
                    onClick={() => {
                      setShortDramaInitialUrl(url);
                      setActiveTab('shortdrama');
                    }}
                    className="btn-3d-glass btn-3d-glass-amber px-3.5 py-1.5 text-xs text-slate-950 shrink-0 self-end sm:self-auto"
                  >
                    {isKm ? 'ស្កេន Short Dramas ឥឡូវនេះ' : 'Scan Short Dramas Now'}
                  </button>
                </div>
              )}

              {/* Detect multi-line input helper banner */}
              {url.split(/\r?\n/).map(l => l.trim()).filter(Boolean).length > 1 && (
                <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs animate-in fade-in">
                  <span className="text-emerald-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {isKm
                        ? `បានរកឃើញតំណភ្ជាប់ចំនួន ${url.split(/\r?\n/).map(l => l.trim()).filter(Boolean).length} ក្នុងប្រអប់! ចុចដើម្បីទាញយកទាំងអស់ក្នុងពេលតែមួយ:`
                        : `Detected ${url.split(/\r?\n/).map(l => l.trim()).filter(Boolean).length} URLs in input! Click to queue multiple downloads:`}
                    </span>
                  </span>
                  <button
                    onClick={() => {
                      const links = url.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                      setBatchUrls(links);
                      setActiveTab('batch');
                      setUrl('');
                    }}
                    className="btn-3d-glass btn-3d-glass-emerald px-3.5 py-1.5 text-xs text-white shrink-0 self-end sm:self-auto"
                  >
                    {isKm ? 'បើកក្នុង Batch Queue' : 'Open in Batch Queue'}
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-indigo-400" />
                  {isKm ? 'បញ្ចូលតំណភ្ជាប់វីដេអូ TikTok ឬ Douyin (抖音):' : 'TikTok or Douyin Video URL:'}
                </span>

                <button
                  type="button"
                  onClick={() => setActiveTab('batch')}
                  className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ListPlus className="w-3.5 h-3.5" />
                  <span>{isKm ? 'មានតំណភ្ជាប់ច្រើន? ប្តូរទៅ Batch Queue' : 'Have multiple links? Use Batch Queue'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                <div className="relative flex-1 flex items-center">
                  <input
                    id="video-url-input"
                    type="text"
                    value={url}
                    onChange={e => {
                      setUrl(e.target.value);
                      setIsAutocompleteDismissed(false);
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleResolve()}
                    placeholder={isKm ? 'បិទភ្ជាប់តំណភ្ជាប់ TikTok/Douyin ឬសរសេរអក្សរ A ដើម្បីស្វែងរក...' : 'Paste TikTok/Douyin link or type "A" for smart title suggestions...'}
                    className="w-full bg-slate-950/90 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-3 text-sm sm:text-base outline-none transition-all pr-24"
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    {url ? (
                      <button
                        id="clear-url-btn"
                        onClick={handleClear}
                        className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                        title={isKm ? 'លុប' : 'Clear'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        id="paste-clipboard-btn"
                        onClick={handlePasteClipboard}
                        className="btn-3d-glass btn-3d-glass-slate text-xs text-indigo-300 px-2.5 py-1.5 gap-1"
                        title={isKm ? 'បិទភ្ជាប់ពី Clipboard' : 'Paste from clipboard'}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{isKm ? 'បិទភ្ជាប់' : 'Paste'}</span>
                      </button>
                    )}
                  </div>

                  {/* Smart Title Autocomplete floating dropdown */}
                  {!isAutocompleteDismissed && url.trim().length > 0 && !url.startsWith('http') && (
                    <SmartTitleAutocomplete
                      query={url}
                      isKm={isKm}
                      onSelectTitle={(item, action) => handleSelectDramaTitle(item, action)}
                      onOpenFullSearch={(q) => {
                        setTitleSearchInitialQuery(q);
                        setIsTitleSearchOpen(true);
                      }}
                      onOpenSocialSearch={(q) => {
                        setSocialSearchInitialQuery(q);
                        setIsGlobalSocialSearchOpen(true);
                      }}
                      onDismiss={() => setIsAutocompleteDismissed(true)}
                    />
                  )}
                </div>

                <button
                  id="submit-download-btn"
                  onClick={() => handleResolve()}
                  disabled={loading}
                  className="btn-3d-glass btn-3d-glass-indigo text-white text-xs sm:text-sm font-bold px-5 py-3 shrink-0 gap-1.5"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{isKm ? 'កំពុងទាញ...' : 'Fetching...'}</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>{isKm ? 'ទាញយក' : 'Download'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Compact Quick Action Tools Bar */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-slate-400 font-medium mr-0.5">
                  {isKm ? 'ឧបករណ៍បន្ថែម:' : 'Tools:'}
                </span>

                <button
                  id="scan-original-poster-btn"
                  type="button"
                  onClick={() => handleResolve(undefined, true)}
                  disabled={loading}
                  className="btn-3d-glass btn-3d-glass-amber text-slate-950 text-xs font-bold px-3 py-1.5 gap-1.5"
                  title={isKm ? 'ស្កេនរក រូបភាព Poster ដើម បង្ហាញ់ដោយស្វ័យប្រវត្តិ' : 'Auto-Scan and Display Original Poster'}
                >
                  <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                  <span>{isKm ? 'ស្កេន Poster' : 'Scan Poster'}</span>
                </button>

                <button
                  id="search-by-title-btn"
                  type="button"
                  onClick={() => {
                    setTitleSearchInitialQuery(url && !url.startsWith('http') ? url : 'A');
                    setIsTitleSearchOpen(true);
                  }}
                  className="btn-3d-glass btn-3d-glass-teal text-slate-950 text-xs font-bold px-3 py-1.5 gap-1.5"
                  title={isKm ? 'ស្វែងរក តាមចំណងជើង ឆ្លាតវ៉ៃ (សរសេរអក្សរ A បង្ហាញ់ឈ្មោះជាច្រើន)' : 'Smart Search by Title (Type "A" to show many titles)'}
                >
                  <Search className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
                  <span>{isKm ? 'រកតាមចំណងជើង' : 'By Title'}</span>
                </button>

                <button
                  id="global-social-search-main-btn"
                  type="button"
                  onClick={() => {
                    setSocialSearchInitialQuery(url && !url.startsWith('http') ? url : '');
                    setIsGlobalSocialSearchOpen(true);
                  }}
                  className="btn-3d-glass btn-3d-glass-cyan text-white text-xs font-bold px-3 py-1.5 gap-1.5"
                  title={isKm ? 'ស្វែងរកតាមឈ្មោះ ភ្ជាប់ទៅបណ្តាញសង្គមទាំងអស់គ្រប់ប្រទេស ដោយស្វ័យប្រវត្តិ' : 'Search by Name, Connected to All Social Networks in All Countries Automatically'}
                >
                  <Globe className="w-3.5 h-3.5 text-cyan-200 stroke-[2.5]" />
                  <span>{isKm ? 'បណ្ដាញសង្គម' : 'Social Search'}</span>
                </button>
              </div>

              {/* Quick test sample link pill with Network Logos */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs text-slate-400">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-slate-400 mr-1">{isKm ? 'តំណភ្ជាប់សាកល្បង:' : 'Test links:'}</span>

                  {/* TikTok Sample Button with Official TikTok Logo */}
                  <button
                    id="sample-url-trigger-btn"
                    onClick={() => {
                      setUrl(SAMPLE_URL);
                      handleResolve(SAMPLE_URL);
                    }}
                    className="btn-3d-glass btn-3d-glass-slate text-slate-100 hover:text-white px-2.5 py-1 text-xs gap-1.5 shadow-sm"
                    title="TikTok Video Sample"
                  >
                    <img src="/logos/tiktok.svg" alt="TikTok" className="w-3.5 h-3.5 rounded-sm object-contain shrink-0" referrerPolicy="no-referrer" />
                    <span className="font-medium">TikTok</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                  </button>

                  {/* Douyin Sample Button with Official Douyin Logo */}
                  <button
                    id="sample-douyin-url-trigger-btn"
                    onClick={() => {
                      setUrl(SAMPLE_DOUYIN_URL);
                      handleResolve(SAMPLE_DOUYIN_URL);
                    }}
                    className="btn-3d-glass btn-3d-glass-slate text-sky-200 hover:text-sky-100 px-2.5 py-1 text-xs gap-1.5 shadow-sm"
                    title="Douyin Video Sample"
                  >
                    <img src="/logos/douyin.svg" alt="Douyin" className="w-3.5 h-3.5 rounded-sm object-contain shrink-0" referrerPolicy="no-referrer" />
                    <span className="font-medium">抖音 Douyin</span>
                    <ArrowRight className="w-3 h-3 text-sky-400 shrink-0" />
                  </button>

                  {/* Short Drama Sample Button with TikTok Logo */}
                  <button
                    id="sample-drama-url-trigger-btn"
                    onClick={() => {
                      setUrl(SAMPLE_DRAMA_URL);
                      handleResolve(SAMPLE_DRAMA_URL);
                    }}
                    className="btn-3d-glass btn-3d-glass-slate text-amber-200 hover:text-amber-100 px-2.5 py-1 text-xs gap-1.5 shadow-sm"
                    title="TikTok Short Drama Sample"
                  >
                    <img src="/logos/tiktok.svg" alt="TikTok Drama" className="w-3.5 h-3.5 rounded-sm object-contain shrink-0" referrerPolicy="no-referrer" />
                    <span className="font-medium">Short Drama</span>
                    <ArrowRight className="w-3 h-3 text-amber-400 shrink-0" />
                  </button>

                  {/* Profile @stardustdrama_mx connecting directly to Short Drama Scanner with Original Covers */}
                  <button
                    id="sample-stardustdrama-profile-btn"
                    type="button"
                    onClick={() => {
                      const profileUrl = 'https://www.tiktok.com/@stardustdrama_mx';
                      setShortDramaInitialUrl(profileUrl);
                      setShortDramaScanTrigger(prev => prev + 1);
                      setActiveTab('shortdrama');
                      showToast(
                        isKm
                          ? 'ភ្ជាប់ទៅកាន់ «បញ្ចូល TikTok Profile URL ឬ Link ភាគរឿង Short Drama: បង្ហាញ់រូបភាពដើម» សម្រាប់ @stardustdrama_mx...'
                          : 'Opening @stardustdrama_mx in Short Drama tab with original images...'
                      );
                    }}
                    className="btn-3d-glass btn-3d-glass-slate text-amber-200 hover:text-amber-100 border border-amber-500/40 hover:border-amber-400 px-2.5 py-1 text-xs gap-1.5 shadow-sm"
                    title={
                      isKm
                        ? 'ចុច Profile @stardustdrama_mx ភ្ជាប់ទៅកាន់ បញ្ចូល TikTok Profile URL ឬ Link ភាគរឿង Short Drama: បង្ហាញ់រូបភាពដើម អោយស្រួលមើលLink'
                        : 'Click Profile @stardustdrama_mx: Connect to Short Drama tab with original images'
                    }
                  >
                    <img src="/logos/tiktok.svg" alt="TikTok" className="w-3.5 h-3.5 rounded-sm object-contain shrink-0" referrerPolicy="no-referrer" />
                    <span className="font-semibold text-white">Profile @stardustdrama_mx</span>
                    <ArrowRight className="w-3 h-3 text-amber-400 shrink-0" />
                  </button>

                  {/* Bilibili Shanzha Sample Button with Official Bilibili Logo */}
                  <button
                    id="sample-shanzha-bilibili-btn"
                    onClick={() => {
                      setUrl(SAMPLE_BILIBILI_SHANZHA);
                      handleResolve(SAMPLE_BILIBILI_SHANZHA);
                    }}
                    className="btn-3d-glass btn-3d-glass-slate text-cyan-200 hover:text-cyan-100 px-2.5 py-1 text-xs gap-1.5 shadow-sm"
                    title="Bilibili Creator Sample"
                  >
                    <img src="/logos/bilibili.svg" alt="Bilibili" className="w-3.5 h-3.5 rounded-sm object-contain shrink-0" referrerPolicy="no-referrer" />
                    <span className="font-medium">哔哩哔哩 @山楂</span>
                    <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
                  </button>

                  {/* Bilibili Ziwen Sample Button with Official Bilibili Logo */}
                  <button
                    id="sample-ziwen-bilibili-btn"
                    onClick={() => {
                      setUrl(SAMPLE_BILIBILI_ZIWEN);
                      handleResolve(SAMPLE_BILIBILI_ZIWEN);
                    }}
                    className="btn-3d-glass btn-3d-glass-slate text-cyan-200 hover:text-cyan-100 px-2.5 py-1 text-xs gap-1.5 shadow-sm"
                    title="Bilibili Creator Sample"
                  >
                    <img src="/logos/bilibili.svg" alt="Bilibili" className="w-3.5 h-3.5 rounded-sm object-contain shrink-0" referrerPolicy="no-referrer" />
                    <span className="font-medium">哔哩哔哩 @子文</span>
                    <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
                  </button>

                  {/* Kuaishou Sample Button with Official Kuaishou Logo */}
                  <button
                    id="sample-kuaishou-btn"
                    onClick={() => {
                      setUrl(SAMPLE_KUAISHOU_URL);
                      handleResolve(SAMPLE_KUAISHOU_URL);
                    }}
                    className="btn-3d-glass btn-3d-glass-slate text-orange-200 hover:text-orange-100 px-2.5 py-1 text-xs gap-1.5 shadow-sm"
                    title="Kuaishou Short Drama Sample"
                  >
                    <img src="/logos/kuaishou.svg" alt="Kuaishou" className="w-3.5 h-3.5 rounded-sm object-contain shrink-0" referrerPolicy="no-referrer" />
                    <span className="font-medium">快手 @快手短剧</span>
                    <ArrowRight className="w-3 h-3 text-orange-400 shrink-0" />
                  </button>

                  {/* YouTube Shorts Sample Button with Official YouTube Logo (Download & Watch) */}
                  <div className="inline-flex items-center rounded-xl bg-slate-900 border border-red-500/30 overflow-hidden shadow-xs hover:border-red-500/60 transition-colors">
                    <button
                      id="sample-youtube-download-btn"
                      type="button"
                      onClick={() => {
                        setUrl(SAMPLE_YOUTUBE_URL);
                        handleResolve(SAMPLE_YOUTUBE_URL);
                      }}
                      className="px-2.5 py-1 text-xs text-red-200 hover:text-white hover:bg-red-500/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                      title={isKm ? 'ទាញយក YouTube Shorts @000-01-t' : 'Download YouTube Shorts @000-01-t'}
                    >
                      <img src="/logos/youtube.svg" alt="YouTube" className="w-3.5 h-3.5 rounded-sm object-contain shrink-0" referrerPolicy="no-referrer" />
                      <span className="font-medium">YouTube Shorts</span>
                      <Download className="w-3 h-3 text-red-400 shrink-0" />
                    </button>
                    <div className="w-[1px] h-3.5 bg-red-500/30" />
                    <button
                      id="sample-youtube-watch-btn"
                      type="button"
                      onClick={() => {
                        setIsYouTubeWatchModalOpen(true);
                      }}
                      className="px-2 py-1 text-xs text-red-300 hover:text-white hover:bg-red-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                      title={isKm ? 'មើលវីដេអូ YouTube Shorts ផ្ទាល់' : 'Watch YouTube Shorts Player'}
                    >
                      <Play className="w-3 h-3 fill-red-400 text-red-400 shrink-0" />
                      <span>{isKm ? 'មើលវីដេអូ' : 'Watch'}</span>
                    </button>
                  </div>
                </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="inline-flex items-center gap-1 text-[11px] bg-slate-800/80 px-2 py-0.5 rounded">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                {isKm ? 'គ្មានសញ្ញាទឹក' : 'No Watermark'}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] bg-slate-800/80 px-2 py-0.5 rounded">
                <Music className="w-3 h-3 text-violet-400" />
                MP3 320k
              </span>
            </div>
          </div>
        </section>

        {/* 20 Smart Drama Channels Hub */}
        <SmartChannelButtons
          isKm={isKm}
          currentActiveUrl={url}
          showToast={showToast}
          defaultCollapsed={true}
          onScanChannel={(channelUrl) => {
            if (channelUrl.includes('youtube.com') || channelUrl.includes('youtu.be')) {
              setUrl(channelUrl);
              handleResolve(channelUrl);
              return;
            }
            setShortDramaInitialUrl(channelUrl);
            setActiveTab('shortdrama');
            setShortDramaScanTrigger(prev => prev + 1);
          }}
          onAddToBatch={(channelUrls) => {
            setBatchUrls(channelUrls);
            setActiveTab('batch');
            showToast(isKm ? `បានបន្ថែម ${channelUrls.length} ប៉ុស្តិ៍ទៅកាន់ Batch Queue` : `Added ${channelUrls.length} channels to Batch Queue`);
          }}
          onPasteToInput={(channelUrl) => {
            setUrl(channelUrl);
            showToast(isKm ? `បានបញ្ចូល ${channelUrl} ក្នុងប្រអប់` : `Pasted ${channelUrl} into input`);
          }}
        />

        {/* Error Alert */}
        {error && (
          <div
            id="error-banner"
            className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 flex items-start gap-3 animate-in fade-in duration-200"
          >
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-medium">{isKm ? 'មានកំហុសក្នុងការទាញយក' : 'Download Error'}</p>
              <p className="text-red-300/80 text-xs mt-0.5 whitespace-pre-line">{error}</p>
              {(error.includes('Paid Series') || error.includes('កញ្ចប់បង់ប្រាក់') || error.includes('Short Drama') || error.includes('Profile')) && (
                <div className="mt-2.5 pt-2 border-t border-red-800/40 flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (url) setShortDramaInitialUrl(url);
                      setActiveTab('shortdrama');
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow transition-colors"
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span>{isKm ? 'បើកផ្ទាំង Short Dramas ដើម្បីស្វែងរកភាគផ្សេង ឬភាគ Free' : 'Open Short Dramas Tab'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Download Progress Bar Modal or Banner with Lightning Turbo Speedometer */}
        {downloadProgress.active && (
          <div
            id="download-progress-banner"
            className="bg-gradient-to-r from-slate-950 via-indigo-950/80 to-slate-950 border border-amber-500/50 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-2xl shadow-amber-500/10 animate-in fade-in"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 animate-pulse">
                  <Zap className="w-5 h-5 fill-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white flex items-center gap-1.5">
                      {isKm ? '⚡ ម៉ាស៊ីនទាញយកល្បឿនរន្ទះ Turbo Boost' : '⚡ Lightning Turbo Accelerator'}
                    </span>
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {downloadProgress.isTurbo ? '4x Parallel Streams' : 'High Speed'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                    <span>{downloadProgress.label}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                {downloadProgress.speedMBs !== undefined && downloadProgress.speedMBs > 0 && (
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">{isKm ? 'ល្បឿន' : 'Speed'}</span>
                    <span className="font-mono font-black text-emerald-400 text-base">
                      {downloadProgress.speedMBs} MB/s
                    </span>
                  </div>
                )}
                {downloadProgress.etaSeconds !== undefined && downloadProgress.etaSeconds > 0 && (
                  <div className="flex flex-col items-end border-l border-slate-800 pl-3">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">{isKm ? 'នៅសល់' : 'ETA'}</span>
                    <span className="font-mono font-bold text-amber-300 text-sm">
                      {downloadProgress.etaSeconds}s
                    </span>
                  </div>
                )}
                <div className="flex flex-col items-end border-l border-slate-800 pl-3">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">{isKm ? 'សម្រេច' : 'Done'}</span>
                  <span className="font-mono font-black text-indigo-300 text-base sm:text-lg">
                    {downloadProgress.percent}%
                  </span>
                </div>
              </div>
            </div>

            {/* Glowing Lightning Progress Bar */}
            <div className="w-full bg-slate-900/90 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
              <div
                className="bg-gradient-to-r from-amber-400 via-cyan-400 to-indigo-500 h-full rounded-full transition-all duration-200 shadow-sm shadow-cyan-400/50"
                style={{ width: `${downloadProgress.percent}%` }}
              />
            </div>

            {/* 4x Concurrent Streams Multi-thread Visualizer */}
            {downloadProgress.threads && downloadProgress.threads.length > 1 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-800/60">
                {downloadProgress.threads.map(t => (
                  <div key={t.id} className="bg-slate-900/60 border border-slate-800/80 rounded-lg px-2 py-1 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-mono">Stream #{t.id}</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-10 sm:w-12 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-amber-400 h-full rounded-full transition-all"
                          style={{ width: `${t.percent}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-amber-300">{t.percent}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Video Result View */}
        {videoData && (
          <section
            id="video-result-card"
            className="theme-card border rounded-2xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300"
          >
            {/* Header info */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
              <div className="flex items-center gap-3.5">
                {/* Clickable Profile Avatar that connects to Short Drama Scanner */}
                <button
                  type="button"
                  id="profile-avatar-stardustdrama-btn"
                  onClick={() => {
                    const username = videoData.author.username || 'stardustdrama_mx';
                    const profileUrl = `https://www.tiktok.com/@${username}`;
                    setShortDramaInitialUrl(profileUrl);
                    setShortDramaScanTrigger(prev => prev + 1);
                    setActiveTab('shortdrama');
                    showToast(
                      isKm
                        ? `ភ្ជាប់ទៅកាន់ «បញ្ចូល TikTok Profile URL ឬ Link ភាគរឿង Short Drama: បង្ហាញ់រូបភាពដើម» សម្រាប់ @${username}...`
                        : `Opening Short Drama scanner for @${username} (Showing Original Images)...`
                    );
                  }}
                  title={
                    isKm
                      ? `ចុចដើម្បីស្កេន Profile @${videoData.author.username} ក្នុងផ្ទាំង Short Drama & បង្ហាញរូបភាពដើម`
                      : `Click to scan @${videoData.author.username} in Short Drama tab with original images`
                  }
                  className="relative group/avatar cursor-pointer rounded-full p-0.5 focus:outline-hidden focus:ring-2 focus:ring-amber-400 shrink-0"
                >
                  {videoData.author.avatar ? (
                    <img
                      src={getSafeMediaUrl(videoData.author.avatar)}
                      alt={videoData.author.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full border-2 border-indigo-500/40 group-hover/avatar:border-amber-400 object-cover transition-all shadow-md group-hover/avatar:scale-105"
                      onError={e => {
                        // fallback if avatar fails
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-indigo-900/40 border-2 border-indigo-500/40 group-hover/avatar:border-amber-400 flex items-center justify-center font-bold text-indigo-300 group-hover/avatar:scale-105 transition-all">
                      {videoData.author.username[0]?.toUpperCase() || 'T'}
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] shadow-sm font-bold" title="Short Drama Scanner">
                    🎬
                  </span>
                </button>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base text-white">{videoData.author.name || videoData.author.username}</h3>
                    
                    {/* Clickable Profile Badge */}
                    <button
                      type="button"
                      id="profile-stardustdrama-link-btn"
                      onClick={() => {
                        const username = videoData.author.username || 'stardustdrama_mx';
                        const profileUrl = `https://www.tiktok.com/@${username}`;
                        setShortDramaInitialUrl(profileUrl);
                        setShortDramaScanTrigger(prev => prev + 1);
                        setActiveTab('shortdrama');
                        showToast(
                          isKm
                            ? `ភ្ជាប់ទៅកាន់ «បញ្ចូល TikTok Profile URL ឬ Link ភាគរឿង Short Drama: បង្ហាញ់រូបភាពដើម»...`
                            : `Connecting to Short Drama scanner for @${username} (Showing Original Images)...`
                        );
                      }}
                      title={
                        isKm
                          ? `ចុច Profile @${videoData.author.username}: ភ្ជាប់ទៅកាន់ បញ្ចូល TikTok Profile URL ឬ Link ភាគរឿង Short Drama & បង្ហាញ់រូបភាពដើម`
                          : `Click Profile @${videoData.author.username}: Connect to Short Drama tab with original images`
                      }
                      className="group/author-badge text-xs bg-indigo-500/20 hover:bg-amber-500/20 text-indigo-200 hover:text-amber-200 border border-indigo-500/40 hover:border-amber-400/60 px-2.5 py-1 rounded-lg font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:shadow-amber-500/20 hover:scale-105 active:scale-95"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400 group-hover/author-badge:rotate-12 transition-transform" />
                      <span>@{videoData.author.username}</span>
                      <ArrowRight className="w-3 h-3 text-indigo-300 group-hover/author-badge:text-amber-300 group-hover/author-badge:translate-x-0.5 transition-transform" />
                    </button>

                    {/* Direct Action Link to Short Drama & Original Covers */}
                    <button
                      type="button"
                      id="scan-profile-dramas-action-btn"
                      onClick={() => {
                        const username = videoData.author.username || 'stardustdrama_mx';
                        const profileUrl = `https://www.tiktok.com/@${username}`;
                        setShortDramaInitialUrl(profileUrl);
                        setShortDramaScanTrigger(prev => prev + 1);
                        setActiveTab('shortdrama');
                        showToast(
                          isKm
                            ? `កំពុងស្កេន Short Dramas របស់ @${username} និងបង្ហាញរូបភាពដើម...`
                            : `Scanning Short Dramas for @${username} with original images...`
                        );
                      }}
                      className="text-[11px] bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 hover:text-amber-100 border border-amber-500/40 hover:border-amber-400 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                      title={isKm ? 'ស្កេនរឿងភាគ Short Drama ទាំងអស់ និងបង្ហាញរូបភាព Poster/Cover គុណភាពដើម' : 'Scan all short dramas and show original HD posters & covers'}
                    >
                      <Eye className="w-3 h-3 text-amber-400" />
                      <span>{isKm ? 'ស្កេន Short Drama & រូបភាពដើម' : 'Short Drama & Covers'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isKm
                      ? (videoData.sourceUrl.includes('douyin') ? 'វីដេអូ Douyin (抖音) ផ្លូវការ' : 'វីដេអូ TikTok ផ្លូវការ')
                      : (videoData.sourceUrl.includes('douyin') ? 'Official Douyin Video' : 'Official TikTok Video')} • ID: {videoData.id}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                <button
                  type="button"
                  id="copy-video-source-url-btn"
                  onClick={handleCopySourceUrl}
                  title={isKm ? 'ចម្លងតំណភ្ជាប់វីដេអូដើម' : 'Copy original video URL'}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700/60"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">{isKm ? 'បានចម្លង URL!' : 'Copied URL!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>{isKm ? 'ចម្លង URL' : 'Copy URL'}</span>
                    </>
                  )}
                </button>

                <a
                  id="open-source-video-link"
                  href={videoData.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors border border-slate-700/60"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>
                    {isKm
                      ? (videoData.sourceUrl.includes('douyin') ? 'បើកមើលលើ Douyin' : 'បើកមើលលើ TikTok')
                      : (videoData.sourceUrl.includes('douyin') ? 'Open in Douyin' : 'Open in TikTok')}
                  </span>
                </a>

                <button
                  type="button"
                  id="clear-video-data-btn"
                  onClick={() => {
                    setVideoData(null);
                    setUrl('');
                    showToast(isKm ? 'បានលុប/សម្អាតវីដេអូចេញពីអេក្រង់រួចរាល់' : 'Cleared video from screen');
                  }}
                  title={isKm ? 'លុប/សម្អាតវីដេអូនេះចេញពីអេក្រង់' : 'Clear/delete this video from screen'}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-xs font-medium text-slate-300 hover:text-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700/60 hover:border-rose-500/40"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>{isKm ? 'លុបចេញ' : 'Clear'}</span>
                </button>

                {videoData.images && videoData.images.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('image-gallery-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900/90 text-xs font-semibold text-indigo-300 hover:text-indigo-200 flex items-center gap-1.5 transition-colors border border-indigo-800/60 cursor-pointer"
                    title={isKm ? 'ចុចដើម្បីមើល និងទាញយករូបភាពទាំងអស់' : 'Click to view & download all photos'}
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>
                      {isKm
                        ? `មាន ${videoData.images.length} រូបភាព`
                        : `${videoData.images.length} Photos`}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Title / Description */}
            <div className="flex flex-col gap-2.5">
              <div className="bg-slate-950/40 p-3.5 sm:p-4 rounded-xl border border-slate-800/50">
                <div className="flex items-start gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2.5 flex-wrap">
                      <h3 className="text-sm sm:text-base text-slate-100 font-semibold leading-relaxed inline">
                        {videoData.title || (isKm ? 'វីដេអូគ្មានចំណងជើង' : 'Untitled video')}
                      </h3>

                      {/* Resolution Tag (e.g., '1080p', '4K') dynamically displayed next to the video title */}
                      {detectedResolution && (
                        <span
                          id="video-resolution-tag"
                          title={isKm ? `កម្រិតគុណភាពដែលបានរកឃើញ: ${detectedResolution.fullLabel} (${detectedResolution.resolution})` : `Detected Quality: ${detectedResolution.fullLabel} (${detectedResolution.resolution})`}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-black tracking-wider uppercase border shadow-xs transition-all select-none align-middle ${detectedResolution.colorClass}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />
                          <span>{detectedResolution.tag}</span>
                          <span className="text-[9px] font-bold opacity-80 font-mono shrink-0">
                            {detectedResolution.badge}
                          </span>
                        </span>
                      )}

                      {/* Watermark-free indicator tag */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 align-middle select-none shrink-0">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>{isKm ? 'គ្មានសញ្ញាទឹក' : 'No Watermark'}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Douyin Jingxuan Feed Tip Banner */}
              {videoData.sourceUrl.includes('douyin') && (
                <div className="bg-sky-950/40 border border-sky-500/30 rounded-xl p-3 text-xs text-sky-200 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sky-300">
                      {isKm ? 'ព័ត៌មានអំពី Douyin (抖音):' : 'About Douyin (抖音):'}
                    </p>
                    <p className="mt-0.5 text-sky-200/90 leading-relaxed">
                      {isKm
                        ? 'គាំទ្រការទាញយកវីដេអូ Douyin គ្មាន watermark (HD) និងទាញយក MP3។ ប្រសិនបើអ្នកចម្លងពីទំព័រ Jingxuan អ្នកក៏អាចចុចលើវីដេអូណាមួយដើម្បីទទួលបានតំណភ្ជាប់ផ្ទាល់ដែលមាន modal_id ឬចុច Share។'
                        : 'Supports downloading watermark-free Douyin videos and extracting MP3. If copying from the Jingxuan feed, you can also click on any specific video to get its link with modal_id or click Share.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Dynamic Real-Time Output Filename Preview */}
            <DownloadCardFilenamePreview
              video={videoData}
              settings={settings}
              onChangeSettings={setSettings}
              selectedQuality={selectedQuality}
              customFilenameOverride={customFilenameOverride}
              setCustomFilenameOverride={setCustomFilenameOverride}
              isKm={isKm}
            />

            {/* Video Player & Download Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Left column: Video Preview Player */}
              <div className="md:col-span-5 flex flex-col gap-2">
                <div className="relative rounded-xl overflow-hidden bg-black border border-slate-800 aspect-[9/16] max-h-[440px] flex items-center justify-center shadow-lg group">
                  {videoData.platform === 'youtube' && (videoData.embedUrl || videoData.youtubeId) ? (
                    <iframe
                      src={videoData.embedUrl || `https://www.youtube.com/embed/${videoData.youtubeId}?autoplay=1&enablejsapi=1`}
                      title={videoData.title}
                      className="w-full h-full border-0 rounded-xl"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      src={streamPreviewUrl}
                      poster={videoData.cover ? getSafeMediaUrl(videoData.cover) : undefined}
                      controls
                      playsInline
                      preload="metadata"
                      onPlay={() => setIsPlayingPreview(true)}
                      onPause={() => setIsPlayingPreview(false)}
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>

                {videoData.platform === 'youtube' && (
                  <button
                    type="button"
                    onClick={() => setIsYouTubeWatchModalOpen(true)}
                    className="btn-3d-glass btn-3d-glass-slate text-red-300 hover:text-white py-1.5 px-3 text-xs flex items-center justify-center gap-1.5 border border-red-500/40"
                  >
                    <Play className="w-3.5 h-3.5 fill-red-400 text-red-400" />
                    <span>{isKm ? 'បើកផ្ទាំងចាក់ធំ (Full Shorts Watch Mode)' : 'Open Full Shorts Watch Mode'}</span>
                  </button>
                )}

                {/* Custom Video Volume Control Slider */}
                <VideoVolumeControl
                  videoRef={videoRef}
                  isKm={isKm}
                />

                {/* Video Trimmer Feature (Select start/end times before download) */}
                <VideoTrimmer
                  videoRef={videoRef}
                  videoData={videoData}
                  selectedQuality={selectedQuality}
                  isKm={isKm}
                  onDownloadTrimmed={handleDownloadTrimmed}
                  showToast={showToast}
                />
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>{isKm ? 'ទំហំវីដេអូ:' : 'File size:'} <strong className="text-slate-200">{videoData.fileSizeFormatted || '~11 MB'}</strong></span>
                    {(videoData.fileSize >= 50 * 1024 * 1024 || (videoData.fileSizeFormatted && parseFloat(videoData.fileSizeFormatted) >= 50 && videoData.fileSizeFormatted.includes('MB'))) && (
                      <span className="bg-purple-500/20 text-purple-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-purple-500/30 flex items-center gap-1">
                        ⚡ {isKm ? 'ទំហំធំ 50MB+' : 'Large 50MB+'}
                      </span>
                    )}
                  </div>
                  <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                    <span>{detectedResolution ? `${detectedResolution.tag} (${detectedResolution.badge})` : '1080p FHD'}</span>
                    <span className="text-slate-600">•</span>
                    <span>{isKm ? 'គ្មានសញ្ញាទឹក' : 'No Watermark'}</span>
                  </span>
                </div>

                {/* Auto-detected Original Poster quick jump banner */}
                {(videoData.originCover || videoData.cover) && (
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('auto-scanned-original-poster');
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className="mt-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 rounded-xl p-2.5 flex items-center justify-between text-xs text-amber-300 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                      <span className="font-semibold">
                        {isKm ? '✨ បានស្កេនរកឃើញ Poster ដើម (HD)' : '✨ Auto-Scanned Original Poster (HD)'}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-amber-400 underline underline-offset-2">
                      {isKm ? 'មើល Poster ↓' : 'View Poster ↓'}
                    </span>
                  </button>
                )}
              </div>

              {/* Right column: Action Download Bento Cards */}
              <div className="md:col-span-7 flex flex-col gap-4 w-full min-w-0">
                <div className="p-0 sm:p-1 w-full min-w-0">
                  {/* Lightning Turbo Status Bar */}
                  <div className="mb-4 bg-gradient-to-r from-amber-500/15 via-indigo-500/15 to-cyan-500/15 border border-amber-500/40 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full min-w-0">
                    <div className="flex items-start sm:items-center gap-2.5 min-w-0 w-full sm:w-auto">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 animate-pulse mt-0.5 sm:mt-0">
                        <Zap className="w-4 h-4 fill-amber-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-white">
                            {isKm ? '⚡ ម៉ាស៊ីនទាញយកល្បឿនរន្ទះ គ្មានគូរប្រៀប' : '⚡ Lightning Turbo Accelerator'}
                          </span>
                          <span className="bg-amber-500/20 text-amber-300 text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-amber-500/30 shrink-0">
                            {settings.turboMode !== false ? '4x STREAMS ON' : 'OFF'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed break-words">
                          {isKm
                            ? 'ទាញយក 4 Streams ស្របគ្នា ល្បឿនលឿនបំផុតដូចរន្ទះ សម្រាប់ឯកសារទំហំ 50MB ឡើងទៅ'
                            : 'Parallel 4-stream concurrent downloading for lightning speeds (50MB+)'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings(s => ({ ...s, turboMode: !s.turboMode }))}
                      className={`btn-3d-glass w-full sm:w-auto text-xs px-4 py-2 sm:py-1.5 shrink-0 ${
                        settings.turboMode !== false
                          ? 'btn-3d-glass-amber text-slate-950'
                          : 'btn-3d-glass-slate text-slate-300'
                      }`}
                    >
                      {settings.turboMode !== false ? (isKm ? '✓ បើកដំណើរការ' : '✓ Active') : (isKm ? 'បិទ' : 'Disabled')}
                    </button>
                  </div>

                  {/* Quality Selection Header & Pills */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 w-full min-w-0">
                    <h4 className="font-bold text-sm text-slate-300 uppercase tracking-wider flex items-center gap-2 flex-wrap min-w-0">
                      <span>{isKm ? 'ជម្រើសគុណភាពវីដេអូ' : 'Video Quality Options'}</span>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded font-mono font-bold shrink-0">
                        HD • FHD • 4K
                      </span>
                    </h4>

                    {/* Quick Resolution Pills (3D Glass Pills) */}
                    <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
                      {(['4k', '1080p', '720p', '480p'] as const).map(qKey => (
                        <button
                          key={qKey}
                          onClick={() => setSelectedQuality(qKey)}
                          className={`btn-3d-glass px-3 py-1 rounded-lg text-[11px] font-bold uppercase transition-all cursor-pointer ${
                            selectedQuality === qKey
                              ? 'btn-3d-glass-indigo text-white shadow-md'
                              : 'btn-3d-glass-slate text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {qKey.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 w-full min-w-0">
                    {/* Download All Available Qualities Banner & Action Button */}
                    <div className="relative overflow-hidden rounded-xl p-3 sm:p-3.5 bg-gradient-to-r from-slate-900/95 via-indigo-950/70 to-slate-900/95 border border-indigo-500/30 backdrop-blur-md shadow-md shadow-indigo-950/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-all duration-300 hover:border-indigo-500/45 w-full min-w-0">
                      {/* Top ambient accent line */}
                      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-400/70 to-transparent pointer-events-none" />
                      
                      {/* Info and Quality badges */}
                      <div className="flex items-start sm:items-center gap-2.5 relative z-10 min-w-0 w-full sm:w-auto">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 ring-1 ring-white/15 shrink-0 mt-0.5 sm:mt-0">
                          <Layers className="w-4.5 h-4.5 drop-shadow-xs" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs sm:text-sm text-white tracking-tight flex items-center gap-1.5">
                              {isKm ? 'ទាញយកគ្រប់កម្រិតគុណភាពទាំងអស់' : 'Batch Download All Qualities'}
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shrink-0">
                              {availableQualities.length} {isKm ? 'កម្រិត' : 'Resolutions'}
                            </span>
                            {/* Estimated Total Time Badge */}
                            <span
                              id="batch-all-qualities-est-time-badge"
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 flex items-center gap-1.5 shadow-xs transition-all ${
                                isEstimatingBatchTime
                                  ? 'bg-amber-500/15 text-amber-300/90 border-amber-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              }`}
                              title={
                                isEstimatingBatchTime
                                  ? (isKm ? 'កំពុងគណនារយៈពេលទាញយកសរុប...' : 'Calculating estimated total download time...')
                                  : (isKm
                                      ? `រយៈពេលទាញយកសរុបប៉ាន់ស្មាន: ${batchDownloadEstimation.estimatedTimeFormatted} (${batchDownloadEstimation.totalSizeFormatted})`
                                      : `Estimated total download time: ${batchDownloadEstimation.estimatedTimeFormatted} (${batchDownloadEstimation.totalSizeFormatted})`)
                              }
                            >
                              {isEstimatingBatchTime ? (
                                <>
                                  <span className="w-2 h-2 rounded-full border border-amber-300/50 border-t-amber-300 animate-spin shrink-0" />
                                  <span className="text-amber-200/80 font-mono">{isKm ? 'កំពុងគណនា...' : 'Calculating...'}</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                                  <span>{isKm ? 'ពេលប៉ាន់ស្មានសរុប:' : 'Est. Total Time:'}</span>
                                  <span className="text-white font-extrabold">{batchDownloadEstimation.estimatedTimeFormatted}</span>
                                </>
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {availableQualities.map((q: VideoQualityOption) => (
                              <span
                                key={q.id}
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-0.5 transition-all ${
                                  selectedQuality === q.id
                                    ? 'bg-indigo-600/30 text-indigo-200 border-indigo-400/50'
                                    : 'bg-slate-800/80 text-slate-400 border-slate-700/50'
                                }`}
                              >
                                <span className={`w-1 h-1 rounded-full ${selectedQuality === q.id ? 'bg-indigo-400' : 'bg-slate-500'}`} />
                                {q.id.toUpperCase()}
                              </span>
                            ))}
                            <span className="text-[10px] text-slate-400 font-normal ml-0.5 hidden xs:inline">
                              {isKm ? '• គ្មាន Watermark' : '• No Watermark'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 3D Glass Master Action Button & Help Tooltip */}
                      <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
                        <button
                          id="download-all-available-qualities-btn"
                          type="button"
                          onClick={handleDownloadAllQualities}
                          disabled={isDownloadingAllQualities || isEstimatingBatchTime}
                          aria-busy={isEstimatingBatchTime}
                          title={
                            isEstimatingBatchTime
                              ? (isKm
                                  ? 'កំពុងគណនារយៈពេលសរុប... សូមរង់ចាំបន្តិចមុនពេលចាប់ផ្តើមទាញយក'
                                  : 'Calculating total batch time... Please wait before starting download')
                              : (isKm
                                  ? `ចុចដើម្បីទាញយកគ្រប់ ${availableQualities.length} កម្រិតគុណភាពជាបន្តបន្ទាប់ (រយៈពេលប៉ាន់ស្មានសរុប: ${batchDownloadEstimation.estimatedTimeFormatted}, ទំហំសរុប: ${batchDownloadEstimation.totalSizeFormatted})`
                                  : `Download all ${availableQualities.length} qualities sequentially (Estimated Total Time: ${batchDownloadEstimation.estimatedTimeFormatted}, Total Size: ${batchDownloadEstimation.totalSizeFormatted})`)
                          }
                          className={`btn-3d-glass btn-3d-glass-master relative overflow-hidden flex-1 sm:flex-initial w-full sm:w-auto px-4 sm:px-5 py-2 text-xs text-white gap-2.5 shrink-0 min-h-[44px] transition-all duration-300 ${
                            isDownloadingAllQualities
                              ? 'opacity-90 cursor-wait'
                              : isEstimatingBatchTime
                              ? 'opacity-90 cursor-wait ring-1 ring-amber-400/40 shadow-inner'
                              : ''
                          }`}
                        >
                          {isDownloadingAllQualities ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300 shrink-0" />
                              <div className="flex flex-col items-start text-left leading-tight">
                                <span className="text-xs font-bold text-white">
                                  {isKm ? 'កំពុងទាញយក' : 'Downloading'} ({downloadAllProgress?.current || 1}/{downloadAllProgress?.total || availableQualities.length})
                                </span>
                                <span className="text-[10px] font-semibold text-amber-200/90 uppercase">
                                  {downloadAllProgress?.currentQuality || ''}
                                </span>
                              </div>
                              {/* Live mini progress bar along bottom edge */}
                              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/40">
                                <div
                                  className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400 transition-all duration-300"
                                  style={{
                                    width: `${Math.round(((downloadAllProgress?.current || 1) / (downloadAllProgress?.total || availableQualities.length)) * 100)}%`
                                  }}
                                />
                              </div>
                            </>
                          ) : isEstimatingBatchTime ? (
                            <>
                              {/* Subtle sweep shimmer animation across button */}
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none animate-batch-shimmer" />

                              <div className="w-4 h-4 rounded-full border-2 border-amber-300/40 border-t-amber-300 animate-spin shrink-0 shadow-xs" />
                              <div className="flex flex-col items-start text-left min-w-0">
                                <span className="font-bold text-xs tracking-tight text-white/95 drop-shadow-xs">
                                  {isKm ? 'ទាញយកគ្រប់កម្រិតគុណភាពទាំងអស់' : 'Download All Qualities'}
                                </span>
                                <span className="text-[10px] text-amber-200/90 font-medium flex items-center gap-1.5 mt-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                                  <span>{isKm ? 'កំពុងគណនារយៈពេល...' : 'Calculating total time...'}</span>
                                </span>
                              </div>
                              <div className="flex flex-col items-end shrink-0 pl-1">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-400/20 backdrop-blur-xs border border-amber-400/30 text-amber-200 shadow-xs tracking-wider uppercase flex items-center gap-1 animate-pulse">
                                  <span className="w-1 h-1 rounded-full bg-amber-300 animate-ping" />
                                  CALC...
                                </span>
                                <span className="text-[9px] text-amber-200/60 font-mono mt-0.5">
                                  {batchDownloadEstimation.totalSizeFormatted}
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 fill-amber-300 text-amber-300 drop-shadow-xs shrink-0" />
                              <div className="flex flex-col items-start text-left min-w-0">
                                <span className="font-bold text-xs tracking-tight text-white drop-shadow-xs">
                                  {isKm ? 'ទាញយកគ្រប់កម្រិតគុណភាពទាំងអស់' : 'Download All Qualities'}
                                </span>
                                <span className="text-[10px] text-amber-200/95 font-medium flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3 text-amber-300 shrink-0" />
                                  <span>{isKm ? 'ពេលប៉ាន់ស្មាន:' : 'Est. Total Time:'}</span>
                                  <span className="text-white font-extrabold font-mono tracking-tight bg-black/25 px-1 py-0.2 rounded border border-white/10">
                                    {batchDownloadEstimation.estimatedTimeFormatted}
                                  </span>
                                </span>
                              </div>
                              <div className="flex flex-col items-end shrink-0 pl-1">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-white/20 backdrop-blur-xs border border-white/25 text-white shadow-xs tracking-wider uppercase">
                                  ALL • {availableQualities.length}
                                </span>
                                <span className="text-[9px] text-amber-200/80 font-mono mt-0.5">
                                  {batchDownloadEstimation.totalSizeFormatted}
                                </span>
                              </div>
                            </>
                          )}
                        </button>

                        {/* Info tooltip / '?' icon */}
                        <div className="relative group/all-qualities-tooltip inline-flex items-center shrink-0">
                          <button
                            type="button"
                            id="download-all-qualities-help-btn"
                            aria-label={isKm ? 'ពន្យល់អំពីការទាញយកគ្រប់កម្រិតគុណភាព' : 'Explain Download All Qualities'}
                            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-indigo-600/30 border border-slate-700 hover:border-indigo-400/50 flex items-center justify-center text-slate-400 hover:text-indigo-200 transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-400 shrink-0 shadow-xs"
                          >
                            <HelpCircle className="w-4 h-4" />
                          </button>

                          {/* Tooltip flyout */}
                          <div
                            role="tooltip"
                            className="absolute right-0 sm:right-0 bottom-full mb-2 w-72 p-3 bg-slate-900/95 text-slate-200 text-xs rounded-xl border border-slate-700 shadow-2xl backdrop-blur-md opacity-0 pointer-events-none group-hover/all-qualities-tooltip:opacity-100 group-hover/all-qualities-tooltip:pointer-events-auto group-focus-within/all-qualities-tooltip:opacity-100 group-focus-within/all-qualities-tooltip:pointer-events-auto transition-all duration-200 z-30 flex flex-col gap-2"
                          >
                            <div className="flex items-center justify-between font-bold text-indigo-300 text-[11px] border-b border-slate-800 pb-1.5">
                              <div className="flex items-center gap-1.5">
                                <HelpCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                <span>{isKm ? 'ទាញយកគ្រប់កម្រិតគុណភាព' : 'Sequential Download'}</span>
                              </div>
                              {isEstimatingBatchTime ? (
                                <span className="text-amber-300 text-[10px] font-mono flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full border border-amber-300/60 border-t-amber-300 animate-spin shrink-0" />
                                  <span>{isKm ? 'កំពុងគណនា...' : 'Calculating...'}</span>
                                </span>
                              ) : (
                                <span className="text-amber-300 text-[10px] font-mono font-bold">
                                  {batchDownloadEstimation.estimatedTimeFormatted}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-300 leading-relaxed">
                              {isKm
                                ? 'ចុចប៊ូតុងនេះនឹងដាក់ចូលជួរ និងទាញយកគ្រប់កម្រិតគុណភាពដែលមាន (ដូចជា 1080p, 720p, 480p...) ម្តងមួយៗជាបន្តបន្ទាប់ដោយស្វ័យប្រវត្តិ។'
                                : 'Clicking this button will queue and download every available resolution sequentially one by one without stopping.'}
                            </p>

                            {/* Detailed time & size breakdown */}
                            <div className="bg-slate-950/70 rounded-lg p-2 border border-slate-800 text-[10px] space-y-1">
                              <div className="flex justify-between items-center text-slate-300 font-medium">
                                <span className="flex items-center gap-1 text-amber-300">
                                  <Clock className="w-3 h-3" />
                                  {isKm ? 'រយៈពេលប៉ាន់ស្មានសរុប:' : 'Estimated Total Time:'}
                                </span>
                                <span className="font-bold text-white font-mono">{batchDownloadEstimation.estimatedTimeFormatted}</span>
                              </div>
                              <div className="flex justify-between items-center text-slate-400">
                                <span>{isKm ? 'ទំហំឯកសារសរុប:' : 'Total Batch Size:'}</span>
                                <span className="font-mono text-slate-200">{batchDownloadEstimation.totalSizeFormatted}</span>
                              </div>
                              <div className="flex justify-between items-center text-slate-400">
                                <span>{isKm ? 'ល្បឿនគណនា:' : 'Est. Network Speed:'}</span>
                                <span className="font-mono text-emerald-400">~{batchDownloadEstimation.estimatedSpeedMBs.toFixed(1)} MB/s ({settings.turboMode !== false ? 'Turbo 4x' : 'Standard'})</span>
                              </div>
                              <div className="border-t border-slate-800/80 pt-1 mt-1 grid grid-cols-2 gap-1 text-[9px] text-slate-400">
                                {batchDownloadEstimation.breakdown.map((item) => (
                                  <div key={item.id} className="flex justify-between items-center bg-slate-900/60 px-1.5 py-0.5 rounded">
                                    <span className="font-bold text-slate-300">{item.id.toUpperCase()}:</span>
                                    <span className="font-mono text-slate-400">{item.sizeFormatted} • ~{item.estSeconds}s</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="w-2 h-2 bg-slate-900 border-r border-b border-slate-700 transform rotate-45 absolute -bottom-1 right-3.5" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Multi-Quality Video Options */}
                    {availableQualities.map((q: VideoQualityOption) => {
                      const isSelected = selectedQuality === q.id;
                      const is4K = q.id === '4k';
                      const is1080p = q.id === '1080p';

                      return (
                        <div
                          key={q.id}
                          className={`border rounded-xl p-3 sm:p-3.5 transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 group w-full min-w-0 ${
                            isSelected
                              ? 'bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 border-indigo-500 shadow-md shadow-indigo-500/10'
                              : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-black text-xs shrink-0 ${
                              is4K
                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                : is1080p
                                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                                : 'bg-slate-800 border-slate-700 text-slate-300'
                            }`}>
                              {is4K ? '4K' : is1080p ? 'FHD' : q.id.toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-white truncate">
                                  {q.label}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                                  is4K
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                    : is1080p
                                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                    : 'bg-slate-800 text-slate-300 border-slate-700'
                                }`}>
                                  {q.badge}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <span className="font-medium text-slate-300">{q.resolution || q.resolutionText || q.id.toUpperCase()}</span>
                                <span className="text-slate-600">•</span>
                                <span className="text-slate-300 font-semibold">{q.estimatedSize || q.fileSizeFormatted || '~25 MB'}</span>
                                <span className="text-slate-600">•</span>
                                <span className="text-emerald-400 font-medium">{isKm ? 'គ្មានសញ្ញាទឹក' : 'No Watermark'}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                            <button
                              id={`download-${q.id}-btn`}
                              onClick={() => {
                                setSelectedQuality(q.id);
                                handleDownload('mp4', false, q.id, q.url);
                              }}
                              className={`btn-3d-glass flex-1 sm:flex-initial text-xs sm:text-sm px-5 py-2.5 gap-2 min-h-[42px] ${
                                is4K
                                  ? 'btn-3d-glass-amber text-slate-950'
                                  : is1080p
                                  ? 'btn-3d-glass-indigo text-white'
                                  : 'btn-3d-glass-teal text-slate-950'
                              }`}
                            >
                              <Zap className="w-4 h-4 shrink-0 fill-current" />
                              <span>{isKm ? `⚡ ទាញយក ${q.id.toUpperCase()}` : `⚡ Download ${q.id.toUpperCase()}`}</span>
                            </button>
                            <a
                              href={`/api/download?url=${encodeURIComponent(q.url || videoData.videoUrl)}&sourceUrl=${encodeURIComponent(videoData.sourceUrl || '')}&format=mp4&quality=${q.id}&filename=${encodeURIComponent(generateFilename(videoData, 'mp4', q.id).replace(/\.[^/.]+$/, ''))}`}
                              target="_blank"
                              rel="noreferrer"
                              title={isKm ? 'បើកតំណភ្ជាប់ទាញយកផ្ទាល់ក្នុងផ្ទាំងថ្មី' : 'Open direct download link in new tab'}
                              className="btn-3d-glass btn-3d-glass-slate p-2.5 text-slate-300 hover:text-white shrink-0 min-h-[42px] min-w-[42px]"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      );
                    })}

                    {/* MP3 Audio Extraction Option */}
                    <div className="bg-slate-950/80 border border-slate-800 hover:border-violet-500/50 rounded-xl p-3 sm:p-3.5 transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 group w-full min-w-0">
                      <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
                          <Music className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-white">
                              {isKm ? 'ទាញយកជាសំឡេង MP3 (Studio Master)' : 'Download MP3 Audio (Studio Master)'}
                            </span>
                            <span className="bg-violet-500/10 text-violet-400 text-[10px] font-bold px-2 py-0.5 rounded border border-violet-500/20 shrink-0">
                              {settings.audioBitrate}bps
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed break-words">
                            {isKm ? 'បម្លែងសំឡេងចម្រៀងពីវីដេអូ • សំឡេងពិរោះច្បាស់ល្អបំផុត' : 'Extract high-fidelity audio track • Crisp & pure sound'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                        <button
                          id="download-audio-mp3-btn"
                          onClick={() => handleDownload('mp3', false)}
                          className="btn-3d-glass btn-3d-glass-violet flex-1 sm:flex-initial text-white text-xs sm:text-sm px-5 py-2.5 gap-2 min-h-[42px]"
                        >
                          <Download className="w-4 h-4 shrink-0" />
                          <span>{isKm ? 'ទាញយក MP3' : 'Download MP3'}</span>
                        </button>
                        <a
                          href={`/api/download?url=${encodeURIComponent(videoData.videoUrl)}&sourceUrl=${encodeURIComponent(videoData.sourceUrl || '')}&format=mp3&filename=${encodeURIComponent(generateFilename(videoData, 'mp3').replace(/\.[^/.]+$/, ''))}&bitrate=${settings.audioBitrate}`}
                          target="_blank"
                          rel="noreferrer"
                          title={isKm ? 'បើកតំណភ្ជាប់ទាញយកសំឡេងផ្ទាល់ក្នុងផ្ទាំងថ្មី' : 'Open direct audio download link in new tab'}
                          className="btn-3d-glass btn-3d-glass-slate p-2.5 text-slate-300 hover:text-white shrink-0 min-h-[42px] min-w-[42px]"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>

                    {/* Option 3: Choose Custom Save Location with Smart Size (ដោយអាចជ្រើសរើសទីតាំងរក្សាទុកបានតាមចិត្ត & ទំហំឆ្លាតវ៉ៃ) */}
                    <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 border border-indigo-500/30 rounded-xl p-3.5 sm:p-4 flex flex-col gap-3 shadow-md w-full min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 mt-0.5 shadow-xs">
                            <FolderDown className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-white">
                                {isKm ? 'ជ្រើសរើសទីតាំងរក្សាទុកតាមចិត្ត (Save As...)' : 'Choose Custom Save Location (Save As...)'}
                              </span>
                              <span className="bg-sky-500/15 text-sky-300 text-[10px] font-bold px-2 py-0.5 rounded border border-sky-500/30 shrink-0">
                                {isKm ? 'ទំហំឆ្លាតវ៉ៃ' : 'Smart Size'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-1 leading-relaxed break-words">
                              {isKm
                                ? 'បើកផ្ទាំង Folder ជ្រើសរើសទីតាំងលើកុំព្យូទ័រ/ទូរស័ព្ទ (Desktop, Downloads, Drive D:...) មុនពេលរក្សាទុក'
                                : 'Open system directory dialog to pick any destination folder (Desktop, Downloads, External Drive) before saving.'}
                            </p>
                          </div>
                        </div>

                        {/* Quick Settings Shortcut */}
                        <button
                          type="button"
                          onClick={() => setSettingsModalOpen(true)}
                          className="btn-3d-glass btn-3d-glass-slate shrink-0 px-3 py-1.5 text-xs font-medium gap-1.5"
                          title={isKm ? 'កំណត់ទីតាំង & ទំហំផ្ទុកឆ្លាតវ៉ៃ' : 'Configure Save Location & Storage'}
                        >
                          <Settings className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="hidden sm:inline">{isKm ? 'កំណត់ទីតាំង' : 'Configure'}</span>
                        </button>
                      </div>

                      {/* Optimized Vertical Stack on Small Mobile Screens */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2.5 border-t border-slate-800/80 w-full">
                        <button
                          id="save-as-video-btn"
                          onClick={() => handleDownload('mp4', true, selectedQuality)}
                          className="btn-3d-glass btn-3d-glass-cyan w-full sm:flex-1 text-white text-xs sm:text-sm px-4 py-2.5 gap-2 min-h-[42px] justify-between sm:justify-center"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FolderCheck className="w-4 h-4 text-cyan-200 shrink-0" />
                            <span className="font-semibold truncate">{isKm ? `រក្សាទុក ${selectedQuality.toUpperCase()} ទៅ Folder...` : `Save ${selectedQuality.toUpperCase()} to Folder...`}</span>
                          </div>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/25 text-cyan-100 border border-white/20 shrink-0">
                            ~{videoData?.duration ? Math.max(1, Math.round((videoData.duration * (selectedQuality === '4k' ? 14.5 : selectedQuality === '1080p' ? 4.2 : selectedQuality === '720p' ? 1.8 : 0.9) * 1024 * 1024) / (8 * 1024 * 1024))) : (selectedQuality === '4k' ? 75 : selectedQuality === '1080p' ? 24 : selectedQuality === '720p' ? 12 : 6)} MB
                          </span>
                        </button>
                        <button
                          id="save-as-audio-btn"
                          onClick={() => handleDownload('mp3', true)}
                          className="btn-3d-glass btn-3d-glass-violet w-full sm:flex-1 text-white text-xs sm:text-sm px-4 py-2.5 gap-2 min-h-[42px] justify-between sm:justify-center"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FolderCheck className="w-4 h-4 text-violet-200 shrink-0" />
                            <span className="font-semibold truncate">{isKm ? 'រក្សាទុក MP3 ទៅ Folder...' : 'Save MP3 to Folder...'}</span>
                          </div>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/25 text-violet-100 border border-white/20 shrink-0">
                            ~{videoData?.duration ? Math.max(1, Math.round((videoData.duration * (settings.audioBitrate === '320k' ? 320 : settings.audioBitrate === '192k' ? 192 : 128) * 1000) / (8 * 1024 * 1024))) : 3.5} MB
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Helper / Info badge */}
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-slate-400 w-full min-w-0">
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{isKm ? 'ល្បឿនទាញយកលឿនបំផុតពី Cloud Server' : 'High-speed streaming from cloud server'}</span>
                  </span>
                  <button
                    onClick={() => setSettingsModalOpen(true)}
                    className="text-indigo-400 hover:text-indigo-300 underline font-medium cursor-pointer flex items-center gap-1 shrink-0 self-end sm:self-auto"
                  >
                    <span>{isKm ? 'ការកំណត់ទីតាំង & ទំហំឆ្លាតវ៉ៃ' : 'Storage & Location Settings'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Auto-Scanned Original Poster Card (ស្កេនរក រូបភាព Poster ដើម បង្ហាញ់ដោយស្វ័យប្រវត្តិ) */}
            <OriginalPosterCard
              video={videoData}
              isKm={isKm}
              onShowToast={showToast}
              onOpenThumbnailStudio={(info) => {
                setOpenThumbnailStudio(true);
                if (info) {
                  setAutoLinkedPoster(info);
                }
                setTimeout(() => {
                  document.getElementById('branded-custom-thumbnail-feature')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }}
            />

            {/* AI Branded Custom Thumbnail Image & Visual Watermark Generator for Shared Links */}
            <BrandedThumbnailGenerator
              video={videoData}
              isKm={isKm}
              onShowToast={showToast}
              defaultOpen={openThumbnailStudio}
              autoLinkedPoster={autoLinkedPoster}
            />

            {/* Display Images & Image Downloader (បង្ហាញ់រូបភាព និង ទាញយករូបភាព) */}
            <div id="image-gallery-section">
              <ImageGalleryViewer
                video={videoData}
                settings={settings}
                isKm={isKm}
                onShowToast={showToast}
              />
            </div>
          </section>
        )}

        {/* Douyin Creator Profile & Video Collection Section */}
        {douyinCreatorResult && douyinCreatorResult.creator && (
          <section id="douyin-creator-collection-card" className="bg-slate-900/90 border border-sky-500/30 rounded-2xl p-5 sm:p-6 shadow-xl shadow-sky-950/20 backdrop-blur-xl flex flex-col gap-5 animate-in fade-in duration-300">
            {/* Header / Creator Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  {douyinCreatorResult.creator.avatar ? (
                    <img
                      src={`/api/proxy-media?url=${encodeURIComponent(douyinCreatorResult.creator.avatar)}`}
                      alt={douyinCreatorResult.creator.nickname}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-sky-400 shadow-md"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-sky-600 flex items-center justify-center text-white text-xl font-bold">
                      {douyinCreatorResult.creator.nickname.substring(0, 1)}
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 bg-sky-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-md shadow uppercase tracking-wide">
                    Douyin
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      {douyinCreatorResult.creator.nickname}
                    </h3>
                    <span className="text-xs font-mono text-sky-400 font-semibold bg-sky-950/60 border border-sky-500/30 px-2 py-0.5 rounded-lg">
                      @{douyinCreatorResult.creator.username}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {douyinCreatorResult.creator.bio || 'Douyin Creator'}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-300">
                    <span><strong className="text-white">{douyinCreatorResult.creator.likesCount || 774}</strong> {isKm ? 'ការចូលចិត្ត (Likes)' : 'Likes'}</span>
                    <span className="text-slate-600">•</span>
                    <span><strong className="text-white">{douyinCreatorResult.videos.length}</strong> {isKm ? 'វីដេអូដែលបានរកឃើញ' : 'Videos found'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  id="douyin-send-to-batch-btn"
                  onClick={() => {
                    const urls = douyinCreatorResult.videos.map(v => v.videoUrl);
                    setBatchUrls(urls);
                    setActiveTab('batch');
                    showToast(isKm ? `បានបញ្ជូន ${urls.length} វីដេអូទៅកាន់ Batch Downloader!` : `Sent ${urls.length} videos to Batch Downloader!`);
                  }}
                  className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <ListPlus className="w-4 h-4" />
                  <span>{isKm ? 'ទាញយកទាំងអស់ក្នុង Batch' : 'Download All in Batch'}</span>
                </button>
              </div>
            </div>

            {/* Videos Grid */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-sky-400" />
                <span>{isKm ? 'បញ្ជីវីដេអូរបស់ Creator នេះ:' : 'Creator Videos:'}</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {douyinCreatorResult.videos.map((vid, idx) => (
                  <div
                    key={vid.id}
                    className="bg-slate-950/70 border border-slate-800 hover:border-sky-500/50 rounded-xl p-3.5 flex gap-3.5 transition-all group"
                  >
                    <div className="relative w-24 h-32 rounded-lg overflow-hidden bg-black shrink-0 border border-slate-800">
                      {vid.cover ? (
                        <img
                          src={`/api/proxy-media?url=${encodeURIComponent(vid.cover)}`}
                          alt={vid.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-600">
                          <Film className="w-6 h-6" />
                        </div>
                      )}
                      <span className="absolute bottom-1 right-1 bg-black/80 backdrop-blur-xs text-[10px] font-mono text-white px-1.5 py-0.5 rounded font-medium">
                        {vid.durationFormatted || 'HD'}
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30 px-1.5 py-0.5 rounded">
                            #{idx + 1}
                          </span>
                          {vid.publishDate && (
                            <span className="text-[11px] text-slate-500">
                              {vid.publishDate}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-200 line-clamp-2 font-medium leading-snug">
                          {vid.title}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-slate-800/80">
                        <button
                          onClick={() => {
                            setUrl(vid.videoUrl);
                            handleResolve(vid.videoUrl);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>{isKm ? 'មើល / Play' : 'Play'}</span>
                        </button>
                        <a
                          href={`/api/download?url=${encodeURIComponent(vid.videoUrl)}&format=mp4&filename=${encodeURIComponent(`Douyin_${vid.id}`)}`}
                          download
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
                        >
                          <Download className="w-3 h-3 text-indigo-400" />
                          <span>MP4</span>
                        </a>
                        <a
                          href={`/api/download?url=${encodeURIComponent(vid.videoUrl)}&format=mp3&filename=${encodeURIComponent(`Douyin_${vid.id}`)}&bitrate=${settings.audioBitrate}`}
                          download
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
                        >
                          <Music className="w-3 h-3 text-violet-400" />
                          <span>MP3</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Feature Highlights Bento */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-slate-200">
              {isKm ? 'ល្បឿនទាញយកលឿន' : 'Lightning Fast'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isKm ? 'ម៉ាស៊ីនបំប្លែងទិន្នន័យផ្ទាល់ មិនចាំបាច់រង់ចាំយូរ' : 'Direct stream parsing with ultra-low latency'}
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-slate-200">
              {isKm ? 'គ្មានសញ្ញាទឹក (No Watermark)' : '100% No Watermark'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isKm ? 'រក្សាទុករូបភាពវីដេអូស្អាតច្បាស់ គ្មានជាប់ Logo ឬឈ្មោះគណនី' : 'Crystal clear video without TikTok logo'}
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Music className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-slate-200">
              {isKm ? 'សំឡេង MP3 320kbps' : 'Studio Quality MP3'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isKm ? 'បម្លែងជាបទចម្រៀង MP3 កម្រិតសម្លេងខ្ពស់បំផុត' : 'High definition audio extraction for music lovers'}
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <FolderDown className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-slate-200">
              {isKm ? 'ជ្រើសរើស Folder តាមចិត្ត' : 'Custom Save Directory'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isKm ? 'អាចជ្រើសរើសទីតាំងទុកក្នុងម៉ាស៊ីនបានងាយស្រួល' : 'Select any local directory or disk drive'}
            </p>
          </div>
        </section>

        {/* History / Recent Downloads Section */}
        <AnimatePresence>
          {history.length > 0 && (
            <motion.section
              key="download-history-section"
              id="download-history-section"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16, transition: { duration: 0.25 } }}
              className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-bold text-sm text-slate-200">
                    {isKm ? 'ប្រវត្តិទាញយកថ្មីៗ (Recent Downloads)' : 'Recent Downloads History'}
                  </h3>
                  <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                    {history.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="history-auto-cleanup-shortcut-btn"
                    onClick={() => {
                      setSettingsInitialTab('storage');
                      setSettingsModalOpen(true);
                    }}
                    className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer border ${
                      settings.autoCleanupHistory
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                    title={isKm ? 'កំណត់ការសម្អាតប្រវត្តិស្វ័យប្រវត្តិ' : 'Configure Auto-Cleanup'}
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {settings.autoCleanupHistory
                        ? (isKm ? `Auto: ${settings.autoCleanupDays ?? 7} ថ្ងៃ` : `Auto: ${settings.autoCleanupDays ?? 7}d`)
                        : (isKm ? 'Auto-Cleanup' : 'Auto-Cleanup')}
                    </span>
                  </button>
                  <button
                    id="clear-history-btn"
                    onClick={() => setHistory([])}
                    className="text-xs text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer px-2 py-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isKm ? 'សម្អាតប្រវត្តិ' : 'Clear All'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <AnimatePresence mode="popLayout" initial={false}>
                  {history.map(item => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.93, y: 12 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{
                        opacity: 0,
                        scale: 0.88,
                        y: -8,
                        filter: 'blur(1px)',
                        transition: { duration: 0.22, ease: 'easeOut' }
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 420,
                        damping: 30,
                        mass: 0.8
                      }}
                      className="bg-slate-950/80 border border-slate-800/70 hover:border-slate-700 rounded-xl p-3 flex items-center gap-3 group transition-colors shadow-sm"
                    >
                      <div className="w-12 h-16 rounded-lg bg-slate-900 overflow-hidden shrink-0 border border-slate-800">
                        {item.cover ? (
                          <img
                            src={getSafeMediaUrl(item.cover)}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            onError={e => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <Film className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-slate-200 truncate" title={item.title}>
                              {item.title || 'TikTok Video'}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">@{item.author}</p>
                          </div>
                          <button
                            type="button"
                            id={`delete-history-icon-${item.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteSingleHistory(item.id, item.title);
                            }}
                            className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/15 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
                            title={isKm ? 'លុបរឿងនេះ (លុបម្តង១រឿង)' : 'Delete this drama (1 at a time)'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 mt-2 flex-wrap">
                          <button
                            onClick={() => {
                              setVideoData({
                                id: item.id,
                                title: item.title,
                                author: { username: item.author, name: item.author, avatar: item.avatar },
                                cover: item.cover,
                                videoUrl: item.videoUrl,
                                fileSize: 0,
                                fileSizeFormatted: item.fileSizeFormatted,
                                sourceUrl: `https://www.tiktok.com/@${item.author}/video/${item.id}`
                              });
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded transition-colors cursor-pointer"
                          >
                            {isKm ? 'មើល' : 'View'}
                          </button>

                          <button
                            onClick={() => {
                              const filename = `${item.title.slice(0, 30)}_${item.author}.mp4`;
                              const dlUrl = `/api/download?url=${encodeURIComponent(item.videoUrl)}&format=mp4&filename=${encodeURIComponent(filename)}`;
                              const a = document.createElement('a');
                              a.href = dlUrl;
                              a.download = filename;
                              a.click();
                            }}
                            className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>MP4</span>
                          </button>

                          <button
                            onClick={() => {
                              const filename = `${item.title.slice(0, 30)}_${item.author}.mp3`;
                              const dlUrl = `/api/download?url=${encodeURIComponent(item.videoUrl)}&format=mp3&filename=${encodeURIComponent(filename)}&bitrate=${settings.audioBitrate}`;
                              const a = document.createElement('a');
                              a.href = dlUrl;
                              a.download = filename;
                              a.click();
                            }}
                            className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Music className="w-3 h-3" />
                            <span>MP3</span>
                          </button>

                          <button
                            type="button"
                            id={`delete-single-history-btn-${item.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteSingleHistory(item.id, item.title);
                            }}
                            className="text-[11px] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 px-1.5 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer ml-auto border border-transparent hover:border-rose-500/20"
                            title={isKm ? 'លុបរឿងនេះ (លុបម្តង១រឿង)' : 'Delete this drama (1 at a time)'}
                          >
                            <Trash2 className="w-3 h-3 text-rose-400" />
                            <span>{isKm ? 'លុបរឿង' : 'Delete'}</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </>
    )}
  </main>

      {/* Smart Save Location & Storage Settings Dialog Modal */}
      <SaveLocationSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        onResetSettings={() => setSettings(DEFAULT_SETTINGS)}
        isKm={isKm}
        videoData={videoData}
        history={history}
        onCleanupHistory={handleCleanupHistory}
        initialTab={settingsInitialTab}
      />

      {/* Smart Title Search & Autocomplete Modal */}
      <SmartTitleSearchModal
        isOpen={isTitleSearchOpen}
        onClose={() => setIsTitleSearchOpen(false)}
        isKm={isKm}
        initialQuery={titleSearchInitialQuery || 'A'}
        onSelectTitle={(item, action) => handleSelectDramaTitle(item, action)}
        onSendToDownloader={(targetUrl) => {
          setUrl(targetUrl);
          handleResolve(targetUrl);
        }}
        showToast={showToast}
      />

      {/* Global Social Networks Multi-Country Search Modal */}
      <GlobalSocialSearchModal
        isOpen={isGlobalSocialSearchOpen}
        onClose={() => setIsGlobalSocialSearchOpen(false)}
        isKm={isKm}
        initialQuery={socialSearchInitialQuery || (url && !url.startsWith('http') ? url : '')}
        onSendToDownloader={(targetUrl) => {
          setUrl(targetUrl);
          handleResolve(targetUrl);
        }}
        showToast={showToast}
      />

      {/* YouTube Shorts Watch & Fast Download Modal */}
      <YouTubeWatchModal
        isOpen={isYouTubeWatchModalOpen}
        onClose={() => setIsYouTubeWatchModalOpen(false)}
        isKm={isKm}
        initialVideoId="bZlG2jzSxAw"
        onDownloadVideo={(downloadUrl) => {
          setUrl(downloadUrl);
          handleResolve(downloadUrl);
        }}
        showToast={showToast}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            {isKm ? 'កម្មវិធីទាញយកវីដេអូ TikTok គ្មានសញ្ញាទឹក & MP3 • លឿន រហ័ស និងសុវត្ថិភាព' : 'Fast Social Video Downloader • HD No Watermark & MP3 Extraction'}
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>TikTok Downloader</span>
            <span>•</span>
            <span>MP3 Audio</span>
            <span>•</span>
            <span>HD Quality</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
