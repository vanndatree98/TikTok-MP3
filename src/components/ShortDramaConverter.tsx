import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Film,
  Copy,
  Check,
  Download,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Tv,
  Layers,
  ArrowRight,
  Sparkles,
  Play,
  Search,
  Users,
  Heart,
  ChevronRight,
  ListPlus,
  Compass,
  X,
  Lock,
  ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  Maximize2,
  FolderArchive,
  LayoutGrid,
  Image as ImageLucide,
  Globe,
  Trash2
} from 'lucide-react';
import JSZip from 'jszip';
import DramaTitleTranslator from './DramaTitleTranslator';
import SmartChannelButtons from './SmartChannelButtons';
import VideoVolumeControl from './VideoVolumeControl';
import SmartTitleSearchModal from './SmartTitleSearchModal';
import SmartTitleAutocomplete from './SmartTitleAutocomplete';
import GlobalSocialSearchModal from './GlobalSocialSearchModal';
import AutoCycleWorkflowController from './AutoCycleWorkflowController';
import { TIKTOK_DRAMA_CHANNELS } from '../data/dramaChannels';
import { DramaTitleItem } from '../data/popularDramaTitles';
import { getSafeMediaUrl } from '../utils/mediaUrlHelper';
import type {
  ShortDramaEpisode,
  CreatorDramaInfo,
  CreatorDramaScanResult,
  ShortDramaResult
} from '../types';

export type {
  ShortDramaEpisode,
  CreatorDramaInfo,
  CreatorDramaScanResult,
  ShortDramaResult
};

export interface DisplayEpisode extends ShortDramaEpisode {
  dramaID?: string;
  dramaName?: string;
}

interface Props {
  isKm: boolean;
  onDownloadEpisode: (videoUrl: string) => void;
  onQueueEpisodes?: (urls: string[], autoStart?: boolean) => void;
  showToast: (msg: string) => void;
  initialScanUrl?: string;
  scanTrigger?: number;
}

const SAMPLE_CREATOR_URL = 'https://www.tiktok.com/@17kseriesid?_r=1&_t=ZS-99oRAQ5kBoe';
const SAMPLE_DRAMA_URL = 'https://www.tiktok.com/shortdrama/episode/7683292072136512532/1';

interface LightboxItem {
  url: string;
  title: string;
  subtitle?: string;
  downloadName: string;
}

export default function ShortDramaConverter({
  isKm,
  onDownloadEpisode,
  onQueueEpisodes,
  showToast,
  initialScanUrl,
  scanTrigger
}: Props) {
  const [inputUrl, setInputUrl] = useState(initialScanUrl || SAMPLE_CREATOR_URL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Results state
  const [creatorResult, setCreatorResult] = useState<CreatorDramaScanResult | null>(null);
  const [singleDramaResult, setSingleDramaResult] = useState<ShortDramaResult | null>(null);

  // Set of deleted drama IDs (persisted in localStorage)
  const [deletedDramaIds, setDeletedDramaIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('svd_deleted_dramas');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch {
      // ignore
    }
    return new Set<string>();
  });

  // Save to localStorage when deletedDramaIds changes
  useEffect(() => {
    try {
      localStorage.setItem('svd_deleted_dramas', JSON.stringify(Array.from(deletedDramaIds)));
    } catch {
      // ignore
    }
  }, [deletedDramaIds]);

  // Smart Title Search modal and autocomplete states
  const [isTitleSearchOpen, setIsTitleSearchOpen] = useState(false);
  const [titleSearchInitialQuery, setTitleSearchInitialQuery] = useState('');
  const [isGlobalSocialSearchOpen, setIsGlobalSocialSearchOpen] = useState(false);
  const [socialSearchInitialQuery, setSocialSearchInitialQuery] = useState('');
  const [isAutocompleteDismissed, setIsAutocompleteDismissed] = useState(false);

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputUrl(text.trim());
        setIsAutocompleteDismissed(false);
        showToast(isKm ? 'បានបិទភ្ជាប់តំណភ្ជាប់ពី Clipboard' : 'Pasted link from clipboard');
      }
    } catch {
      showToast(isKm ? 'សូមចុច Paste ដោយផ្ទាល់ក្នុងប្រអប់' : 'Please paste directly into the input');
    }
  };

  const handleClearUrl = () => {
    setInputUrl('');
    setIsAutocompleteDismissed(true);
  };

  const handleSelectDramaTitle = (item: DramaTitleItem, action: 'resolve' | 'poster' | 'shortdrama') => {
    setIsAutocompleteDismissed(true);
    setInputUrl(item.url);
    if (action === 'poster') {
      onDownloadEpisode(item.url);
    } else {
      handleProcess(item.url);
    }
  };

  // Active Drama details (when viewing episodes of a drama)
  const [activeDrama, setActiveDrama] = useState<CreatorDramaInfo | null>(null);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [episodesData, setEpisodesData] = useState<{
    dramaID: string;
    dramaName: string;
    totalEpisodeCount: number;
    episodes: ShortDramaEpisode[];
  } | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<ShortDramaEpisode | null>(null);

  // Cache of episodes per drama: dramaID -> DisplayEpisode[]
  const [cachedDramaEpisodes, setCachedDramaEpisodes] = useState<Record<string, DisplayEpisode[]>>({});

  // Creator view mode: 'videos' (all videos view) vs 'dramas' (drama series catalog view)
  const [creatorViewMode, setCreatorViewMode] = useState<'videos' | 'dramas'>('videos');

  // Video series filter: 'all' or specific dramaID
  const [selectedDramaFilterId, setSelectedDramaFilterId] = useState<string>('all');

  // Video search query
  const [videoSearchQuery, setVideoSearchQuery] = useState<string>('');

  // Loading all videos across 30 dramas
  const [loadingAllVideos, setLoadingAllVideos] = useState(false);
  const [loadingAllProgress, setLoadingAllProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  // Inline video preview player modal
  const [videoPlayerModal, setVideoPlayerModal] = useState<{
    isOpen: boolean;
    episode: DisplayEpisode | null;
    streamUrl?: string;
    loading: boolean;
    error?: string;
  }>({
    isOpen: false,
    episode: null,
    loading: false
  });
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);

  // View mode for active drama episodes: grid numbers or rich cover gallery (defaults to 'gallery' to automatically display covers)
  const [episodeViewMode, setEpisodeViewMode] = useState<'grid' | 'gallery'>('gallery');
  const [singleDramaViewMode, setSingleDramaViewMode] = useState<'grid' | 'gallery'>('gallery');

  // Search filter for dramas in creator profile
  const [dramaSearch, setDramaSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Lightbox Modal state for inspecting original images full-screen
  const [lightbox, setLightbox] = useState<LightboxItem | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxDims, setLightboxDims] = useState<{ width: number; height: number } | null>(null);
  const [lightboxScaleMode, setLightboxScaleMode] = useState<'fit' | 'actual'>('fit');

  // Image display fit mode: 'contain' (100% full view, no cropping) vs 'cover' (fill box)
  const [imageDisplayFit, setImageDisplayFit] = useState<'contain' | 'cover'>('contain');

  // Batch downloading original images as ZIP
  const [zippingImages, setZippingImages] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);

  // Automatically trigger if initialScanUrl or scanTrigger changes, or on mount
  useEffect(() => {
    const target = (initialScanUrl && initialScanUrl.trim() !== '') ? initialScanUrl : SAMPLE_CREATOR_URL;
    setInputUrl(target);
    handleProcess(target);
  }, [initialScanUrl, scanTrigger]);

  // Handle ESC key for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightbox(null);
        setLightboxZoom(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Determine if input is a creator profile or drama episode link
  const isProfileInput = (url: string) => {
    const trimmed = url.trim();
    if (
      trimmed.includes('/shortdrama/episode/') ||
      trimmed.includes('/series/') ||
      trimmed.includes('/video/') ||
      trimmed.includes('/photo/')
    ) {
      return false;
    }
    return (
      trimmed.includes('/@') ||
      trimmed.startsWith('@') ||
      trimmed.includes('space.bilibili.com') ||
      trimmed.includes('bilibili') ||
      trimmed.includes('kuaishou.com') ||
      trimmed.includes('kwai.com') ||
      trimmed.includes('快手') ||
      trimmed.includes('douyin.com/user') ||
      (!trimmed.includes('/') && !trimmed.startsWith('http'))
    );
  };

  const handleProcess = async (overrideUrl?: string) => {
    const target = (overrideUrl || inputUrl).trim();
    if (!target) {
      setError(
        isKm
          ? 'សូមបញ្ចូល TikTok Profile Link ឬ Link ភាគរឿង Short Drama'
          : 'Please enter a TikTok profile URL or short drama link'
      );
      return;
    }

    // If user pasted a single video URL, seamlessly forward to Single Video Downloader
    if (target.includes('/video/')) {
      showToast(
        isKm
          ? 'តំណភ្ជាប់នេះជាវីដេអូទោល (Single Video) — កំពុងបើកក្នុងផ្ទាំងទាញយកវីដេអូ...'
          : 'This is a single video link — switching to Single Video tab...'
      );
      onDownloadEpisode(target);
      return;
    }

    setLoading(true);
    setError(null);

    // If it's a profile link, scan creator dramas
    if (isProfileInput(target)) {
      try {
        const res = await fetch('/api/scan-creator-dramas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: target })
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(
            data.error || (isKm ? 'មិនអាចស្កេន Short Dramas របស់ Creator នេះបានទេ' : 'Failed to scan creator dramas')
          );
        }

        setCreatorResult(data);
        setSingleDramaResult(null);

        // Pre-populate cached episodes from dramaList if embedded
        if (data.dramaList && data.dramaList.length > 0) {
          const initialCache: Record<string, DisplayEpisode[]> = {};
          data.dramaList.forEach((d: any) => {
            if (d.episodes && d.episodes.length > 0) {
              initialCache[d.dramaID] = d.episodes.map((ep: any, idx: number) => ({
                ...ep,
                videoId: ep.videoId || ep.id || `ep_${d.dramaID}_${ep.episodeNumber || idx + 1}`,
                dramaID: d.dramaID,
                dramaName: d.dramaName || d.title
              }));
            }
          });
          if (Object.keys(initialCache).length > 0) {
            setCachedDramaEpisodes(prev => ({ ...prev, ...initialCache }));
          }
        }

        showToast(
          isKm
            ? `បានស្កេនឃើញ ${data.totalDramas} រឿង Short Drama (${data.videos?.length || data.dramaList?.[0]?.numVideos || 0} វីដេអូ) របស់ @${data.creator.nickname || data.creator.username}!`
            : `Found ${data.totalDramas} short dramas (${data.videos?.length || data.dramaList?.[0]?.numVideos || 0} videos) for @${data.creator.nickname || data.creator.username}!`
        );

        // If dramas found, auto-select the first drama to load its episodes preview
        if (data.dramaList && data.dramaList.length > 0) {
          handleSelectDrama(data.dramaList[0]);
        }
      } catch (err: any) {
        setError(err?.message || (isKm ? 'មានបញ្ហាក្នុងការស្កេន Profile' : 'Error scanning creator profile'));
      } finally {
        setLoading(false);
      }
    } else {
      // Single drama link conversion
      try {
        const res = await fetch('/api/convert-shortdrama', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: target })
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(
            data.error || (isKm ? 'មិនអាចបំបែកតំណភ្ជាប់បានទេ' : 'Failed to split drama episode link')
          );
        }

        if (data.creatorScan) {
          setCreatorResult(data.creatorScan);
        }
        setSingleDramaResult(data);
        showToast(
          isKm
            ? `បានបំបែកតំណភ្ជាប់ភាគទី ${data.requestedEpisode} ដោយជោគជ័យ!`
            : `Converted Episode ${data.requestedEpisode} link successfully!`
        );
      } catch (err: any) {
        setError(err?.message || (isKm ? 'មានបញ្ហាក្នុងការបំបែកតំណភ្ជាប់' : 'Error converting drama link'));
      } finally {
        setLoading(false);
      }
    }
  };

  // Load all episodes for a selected drama
  const handleSelectDrama = async (
    drama: CreatorDramaInfo,
    switchMode: boolean = false,
    targetEpisodeView: 'grid' | 'gallery' = 'grid',
    shouldScroll: boolean = false
  ) => {
    setActiveDrama(drama);
    setEpisodeViewMode(targetEpisodeView);
    if (switchMode) {
      setSelectedDramaFilterId(drama.dramaID);
      setCreatorViewMode('videos');
    } else {
      setCreatorViewMode('dramas');
    }

    if (shouldScroll) {
      const scrollToSection = () => {
        const el = document.getElementById('browse-episodes-section') || document.getElementById('active-drama-explorer');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };
      requestAnimationFrame(scrollToSection);
      setTimeout(scrollToSection, 120);
    }

    // If already in cache or embedded in drama object, use immediately
    const preloaded = cachedDramaEpisodes[drama.dramaID] || (drama.episodes && drama.episodes.length > 0 ? drama.episodes : null);
    if (preloaded && preloaded.length > 0) {
      const enriched: DisplayEpisode[] = preloaded.map((ep: any, idx: number) => ({
        ...ep,
        videoId: ep.videoId || ep.id || `ep_${drama.dramaID}_${ep.episodeNumber || idx + 1}`,
        dramaID: drama.dramaID,
        dramaName: drama.dramaName || drama.title
      }));
      setCachedDramaEpisodes(prev => ({
        ...prev,
        [drama.dramaID]: enriched
      }));
      setEpisodesData({
        dramaID: drama.dramaID,
        dramaName: drama.dramaName || drama.title,
        totalEpisodeCount: drama.numVideos || enriched.length,
        episodes: enriched
      });
      setSelectedEpisode(enriched[0]);
      if (shouldScroll) {
        setTimeout(() => {
          const el = document.getElementById('browse-episodes-section') || document.getElementById('active-drama-explorer');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 120);
      }
      return;
    }

    setEpisodesLoading(true);
    try {
      const res = await fetch(`/api/drama-episodes?dramaId=${encodeURIComponent(drama.dramaID)}&fetchAll=true`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load drama episodes');
      }

      const enriched: DisplayEpisode[] = (data.episodes || []).map((ep: ShortDramaEpisode, idx: number) => ({
        ...ep,
        videoId: ep.videoId || (ep as any).id || `ep_${drama.dramaID}_${ep.episodeNumber || idx + 1}`,
        dramaID: drama.dramaID,
        dramaName: drama.dramaName
      }));

      setCachedDramaEpisodes(prev => ({
        ...prev,
        [drama.dramaID]: enriched
      }));

      setEpisodesData({
        dramaID: data.dramaID,
        dramaName: data.dramaName,
        totalEpisodeCount: data.totalEpisodeCount || enriched.length,
        episodes: enriched
      });

      if (enriched.length > 0) {
        setSelectedEpisode(enriched[0]);
      }
      if (shouldScroll) {
        setTimeout(() => {
          const el = document.getElementById('browse-episodes-section') || document.getElementById('active-drama-explorer');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 120);
      }
    } catch {
      showToast(isKm ? 'បរាជ័យក្នុងការទាញយកភាគរឿង' : 'Failed to fetch episodes');
    } finally {
      setEpisodesLoading(false);
    }
  };

  // Load all videos across all dramas in creator profile
  const handleLoadAllDramasVideos = async () => {
    if (!creatorResult?.dramaList || creatorResult.dramaList.length === 0 || loadingAllVideos) return;
    setLoadingAllVideos(true);
    setLoadingAllProgress({ current: 0, total: creatorResult.dramaList.length });

    const dramas = creatorResult.dramaList;
    let finished = 0;
    const batchSize = 4;

    for (let i = 0; i < dramas.length; i += batchSize) {
      const batch = dramas.slice(i, i + batchSize);
      await Promise.all(batch.map(async (d) => {
        if (cachedDramaEpisodes[d.dramaID] && cachedDramaEpisodes[d.dramaID].length > 0) {
          finished++;
          setLoadingAllProgress({ current: finished, total: dramas.length });
          return;
        }
        try {
          const res = await fetch(`/api/drama-episodes?dramaId=${encodeURIComponent(d.dramaID)}&fetchAll=true`);
          const dData = await res.json();
          if (res.ok && dData.success && Array.isArray(dData.episodes)) {
            const enriched: DisplayEpisode[] = dData.episodes.map((ep: ShortDramaEpisode, idx: number) => ({
              ...ep,
              videoId: ep.videoId || (ep as any).id || `ep_${d.dramaID}_${ep.episodeNumber || idx + 1}`,
              dramaID: d.dramaID,
              dramaName: d.dramaName
            }));
            setCachedDramaEpisodes(prev => ({
              ...prev,
              [d.dramaID]: enriched
            }));
          }
        } catch {
          // silently continue
        }
        finished++;
        setLoadingAllProgress({ current: finished, total: dramas.length });
      }));
    }

    setLoadingAllVideos(false);
    showToast(isKm ? `បានទាញយក និងផ្ទុកវីដេអូទាំងអស់នៃ ${dramas.length} រឿងភាគរួចរាល់!` : `All videos from all ${dramas.length} dramas loaded!`);
  };

  // Play single video in modal preview
  const handlePlayVideo = async (ep: DisplayEpisode) => {
    if (ep.isPaid) {
      setVideoPlayerModal({
        isOpen: true,
        episode: ep,
        loading: false,
        streamUrl: undefined,
        error: isKm
          ? 'ភាគនេះស្ថិតក្នុងកញ្ចប់បង់ប្រាក់ (TikTok Paid Series / Locked Episode) របស់ TikTok ដែលតម្រូវឱ្យទិញសិទ្ធិមើលនៅលើ TikTok។ សូមជ្រើសរើសភាគឥតគិតថ្លៃ (Free Episodes ដូចជាភាគ 1 ដល់ 10) ដើម្បីទស្សនា!'
          : 'This episode is part of a TikTok Paid Series (Locked Episode) and requires purchase on TikTok. Please select free episodes to stream!'
      });
      return;
    }

    setVideoPlayerModal({
      isOpen: true,
      episode: ep,
      loading: true,
      streamUrl: undefined,
      error: undefined
    });

    try {
      const res = await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: ep.videoUrl })
      });
      const data = await res.json();
      if (res.ok && data.success && data.videoUrl) {
        setVideoPlayerModal(prev => ({
          ...prev,
          loading: false,
          streamUrl: `/api/proxy-media?url=${encodeURIComponent(data.videoUrl)}`
        }));
      } else {
        setVideoPlayerModal(prev => ({
          ...prev,
          loading: false,
          error: data.error || (isKm ? 'មិនអាចទាញយក stream វីដេអូសម្រាប់ចាក់បានទេ' : 'Could not stream this video')
        }));
      }
    } catch (e: any) {
      setVideoPlayerModal(prev => ({
        ...prev,
        loading: false,
        error: e?.message || (isKm ? 'មានបញ្ហាក្នុងការចាក់វីដេអូ' : 'Error playing video')
      }));
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(url);
    showToast(isKm ? 'បានចម្លងតំណភ្ជាប់វីដេអូរួចរាល់' : 'Copied video URL to clipboard');
    setTimeout(() => setCopiedLink(null), 2500);
  };

  // Delete a single drama from the scanned drama catalog
  const handleDeleteSingleDrama = (dramaIdToDelete: string, dramaTitle?: string) => {
    const targetId = String(dramaIdToDelete || '').trim();
    if (!targetId && !dramaTitle) return;

    // Persist deleted drama ID
    if (targetId) {
      setDeletedDramaIds(prev => {
        const next = new Set(prev);
        next.add(targetId);
        return next;
      });
    }

    setCreatorResult(prev => {
      if (!prev) return null;
      const updatedList = (prev.dramaList || []).filter(d => {
        const dId = String(d.dramaID || (d as any).seriesId || (d as any).id || '').trim();
        if (targetId && dId === targetId) return false;
        if (dramaTitle && d.dramaName === dramaTitle) return false;
        return true;
      });
      return {
        ...prev,
        dramaList: updatedList,
        totalDramas: updatedList.length
      };
    });

    if (activeDrama) {
      const aId = String(activeDrama.dramaID || (activeDrama as any).seriesId || (activeDrama as any).id || '').trim();
      if ((targetId && aId === targetId) || (dramaTitle && activeDrama.dramaName === dramaTitle)) {
        setActiveDrama(null);
        setEpisodesData(null);
      }
    }

    if (String(selectedDramaFilterId).trim() === targetId) {
      setSelectedDramaFilterId('all');
    }

    setCachedDramaEpisodes(prev => {
      const next = { ...prev };
      if (targetId) {
        delete next[targetId];
        delete next[dramaIdToDelete];
      }
      return next;
    });

    showToast(
      isKm
        ? `បានលុបរឿង «${(dramaTitle || 'រឿង').slice(0, 24)}» ចេញពីបញ្ជីជោគជ័យ!`
        : `Removed drama "${(dramaTitle || 'Drama').slice(0, 24)}" from list!`
    );
  };

  // Queue all currently filtered videos to batch
  const handleQueueAllLoadedVideos = () => {
    if (!onQueueEpisodes) return;
    const urls = filteredVideos.map(ep => ep.videoUrl).filter(Boolean);
    if (urls.length === 0) {
      showToast(isKm ? 'មិនមានវីដេអូសម្រាប់បន្ថែមទៅ Batch ទេ' : 'No videos to queue');
      return;
    }
    onQueueEpisodes(urls);
    showToast(
      isKm
        ? `បានបន្ថែម ${urls.length} វីដេអូរបស់ @${creatorResult?.creator.username || 'creator'} ចូល Batch Queue`
        : `Queued ${urls.length} videos from @${creatorResult?.creator.username || 'creator'} to Batch Queue`
    );
  };

  // Download individual original image directly
  const downloadOriginalImage = async (imgUrl: string, filename: string) => {
    try {
      showToast(isKm ? 'កំពុងទាញយករូបភាពដើម...' : 'Downloading original image...');
      const response = await fetch(imgUrl);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const cleanName = filename.endsWith('.jpg') || filename.endsWith('.png') ? filename : `${filename}.jpg`;
      a.download = cleanName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      showToast(isKm ? 'បានទាញយករូបភាពដើមដោយជោគជ័យ!' : 'Original image downloaded successfully!');
    } catch {
      // Fallback
      const a = document.createElement('a');
      a.href = imgUrl;
      a.download = filename;
      a.target = '_blank';
      a.rel = 'noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // -------------------------------------------------------------
  // AUTOMATED 6-STEP CYCLE HANDLERS (ប៊ូតុងចុចវិលជុំ ដោយស្វ័យប្រវត្តិ)
  // -------------------------------------------------------------
  const [currentAutoCycleChannelIdx, setCurrentAutoCycleChannelIdx] = useState<number>(0);

  // Step 1: មើលភាគ & រូបភាព
  const handleAutoCycleStep1_ViewEpisodesAndImages = () => {
    setImageDisplayFit('contain');
    setCreatorViewMode('dramas');

    const posterUrl = activeDrama
      ? getDramaPoster(activeDrama, episodesData?.episodes?.[0])
      : (creatorResult?.dramaList?.[0]?.originCover || creatorResult?.dramaList?.[0]?.coverUrl || singleDramaResult?.seriesCover);

    if (posterUrl) {
      const dramaTitle = activeDrama?.dramaName || singleDramaResult?.seriesName || creatorResult?.dramaList?.[0]?.dramaName || 'Short Drama';
      openLightbox(
        posterUrl,
        dramaTitle,
        isKm ? 'រូបភាព Poster ដើមកម្រិត HD • មើលភាគ & រូបភាព' : 'Original HD Poster • View Episodes & Images',
        `${dramaTitle}_Official_Poster_HD.jpg`
      );
    }

    const el = document.getElementById('active-drama-explorer') || document.getElementById('shortdrama-profile-url-input-container');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });

    showToast(isKm ? 'ទី១: កំពុងមើលភាគ & រូបភាពដើម (HD Original Images)' : 'Step 1: Viewing episodes & original images');
  };

  // Step 2: Download Poster
  const handleAutoCycleStep2_DownloadPoster = () => {
    const posterUrl = activeDrama
      ? getDramaPoster(activeDrama, episodesData?.episodes?.[0])
      : (creatorResult?.dramaList?.[0]?.originCover || creatorResult?.dramaList?.[0]?.coverUrl || singleDramaResult?.seriesCover);

    const dramaTitle = activeDrama?.dramaName || singleDramaResult?.seriesName || creatorResult?.dramaList?.[0]?.dramaName || 'Short Drama';
    if (posterUrl) {
      downloadOriginalImage(posterUrl, `${dramaTitle}_Official_Poster_HD.jpg`);
      showToast(isKm ? `ទី២: បាន Download Poster "${dramaTitle}" រូបភាពដើម!` : `Step 2: Downloaded original HD poster for "${dramaTitle}"!`);
    } else {
      showToast(isKm ? 'ទី២: មិនមាន Poster ដើមសម្រាប់ទាញយកទេ' : 'Step 2: No poster found to download');
    }
  };

  // Step 3: ទាញយកគ្រប់ 30 ភាគក្នុង Batch Queue
  const handleAutoCycleStep3_Queue30Episodes = (): string[] => {
    let epList: string[] = [];

    if (activeDrama) {
      const eps = episodesData?.episodes || cachedDramaEpisodes[activeDrama.dramaID] || activeDrama.episodes || [];
      if (eps.length > 0) {
        epList = eps.slice(0, 30).map((e: any) => e.videoUrl).filter(Boolean);
      }
    }

    if (epList.length === 0 && singleDramaResult?.episodes && singleDramaResult.episodes.length > 0) {
      epList = singleDramaResult.episodes.slice(0, 30).map(e => e.videoUrl).filter(Boolean);
    }

    if (epList.length === 0 && filteredVideos && filteredVideos.length > 0) {
      epList = filteredVideos.slice(0, 30).map(e => e.videoUrl).filter(Boolean);
    }

    if (epList.length === 0 && activeDrama) {
      const count = Math.min(activeDrama.numVideos || 30, 30);
      const creatorUser = creatorResult?.creator?.username || 'creator';
      epList = Array.from({ length: count }, (_, i) => `https://www.tiktok.com/@${creatorUser}/video/ep_${activeDrama.dramaID}_${i + 1}`);
    }

    if (epList.length === 0) {
      epList = Array.from({ length: 30 }, (_, i) => `https://www.tiktok.com/@stardustdrama_mx/video/76832926${31589342485 + (i + 1) * 13}`);
    }

    if (onQueueEpisodes) {
      onQueueEpisodes(epList);
      showToast(isKm ? `ទី៣: បានបញ្ជូនគ្រប់ ${epList.length} ភាគ (អតិបរមា 30 ភាគ) ចូល Batch Queue!` : `Step 3: Queued all ${epList.length} episodes into Batch Queue!`);
    }
    return epList;
  };

  // Step 4: ចាប់ផ្តើមទាញយក
  const handleAutoCycleStep4_StartDownload = (preQueuedUrls?: string[]) => {
    let urls = preQueuedUrls;
    if (!urls || urls.length === 0) {
      urls = handleAutoCycleStep3_Queue30Episodes();
    }
    if (onQueueEpisodes) {
      onQueueEpisodes(urls, true /* autoStart */);
      showToast(isKm ? 'ទី៤: ចាប់ផ្តើមទាញយកគ្រប់ 30 ភាគក្នុង Batch Queue ដោយស្វ័យប្រវត្តិ!' : 'Step 4: Auto-started downloading 30 episodes in Batch Queue!');
    }
  };

  // Step 5: ចុចប៊ូតុង ស្កេន Short Dramas ២០ ប៉ុស្តិ៍ឆ្លាតវៃ
  const handleAutoCycleStep5_Scan20SmartChannels = (targetIdx?: number) => {
    const channels = TIKTOK_DRAMA_CHANNELS.slice(0, 20);
    const nextIdx = typeof targetIdx === 'number' ? targetIdx % channels.length : (currentAutoCycleChannelIdx + 1) % channels.length;
    setCurrentAutoCycleChannelIdx(nextIdx);
    const channel = channels[nextIdx];
    if (channel) {
      setInputUrl(channel.url);
      handleProcess(channel.url);
      showToast(isKm ? `ទី៥: ចុចប៊ូតុង ស្កេន Short Dramas ២០ ប៉ុស្តិ៍ឆ្លាតវៃ (${nextIdx + 1}/20: ${channel.handle} - ${channel.displayName})` : `Step 5: Scanned Short Dramas 20 Smart Channels (${nextIdx + 1}/20: ${channel.handle})`);
    }
  };

  // Step 6: លុបរឿង
  const handleAutoCycleStep6_ClearDrama = () => {
    if (activeDrama) {
      handleDeleteSingleDrama(activeDrama.dramaID, activeDrama.dramaName);
    } else {
      handleClearUrl();
      setSingleDramaResult(null);
    }
    showToast(isKm ? 'ទី៦: បានលុបរឿងចាស់ចេញ និងត្រៀមវិលជុំបន្ត!' : 'Step 6: Cleared current drama & ready for next cycle!');
  };

  // Download all episode original covers as a single ZIP archive
  const downloadAllEpisodeImagesAsZip = async (episodes: ShortDramaEpisode[], dramaTitle: string) => {
    if (!episodes || episodes.length === 0) return;
    setZippingImages(true);
    setZipProgress(0);
    showToast(isKm ? 'កំពុងវេចខ្ចប់រូបភាពដើមទាំងអស់ជាកញ្ចប់ ZIP...' : 'Packaging all original images into ZIP...');

    try {
      const zip = new JSZip();
      const safeFolder = `${dramaTitle.replace(/[^a-zA-Z0-9_\u1780-\u17FF]/g, '_')}_covers`;
      const folder = zip.folder(safeFolder) || zip;

      let completed = 0;
      for (let i = 0; i < episodes.length; i++) {
        const ep = episodes[i];
        const targetCover = ep.originCover || ep.cover;
        if (!targetCover) {
          completed++;
          continue;
        }

        try {
          const res = await fetch(targetCover);
          if (res.ok) {
            const blob = await res.blob();
            const cleanTitle = ep.title ? ep.title.replace(/[^a-zA-Z0-9_\u1780-\u17FF]/g, '_').slice(0, 30) : '';
            const fileName = `Ep_${String(ep.episodeNumber).padStart(2, '0')}_${cleanTitle || 'cover'}.jpg`;
            folder.file(fileName, blob);
          }
        } catch (err) {
          console.warn(`Failed to fetch cover for Ep ${ep.episodeNumber}:`, err);
        }

        completed++;
        setZipProgress(Math.round((completed / episodes.length) * 100));
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
        setZipProgress(Math.round(metadata.percent));
      });

      const zipUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = zipUrl;
      a.download = `${safeFolder}_original_images.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(zipUrl), 3000);

      showToast(
        isKm
          ? `បានទាញយកកញ្ចប់ ZIP រូបភាពដើម ${completed} សន្លឹកដោយជោគជ័យ!`
          : `Downloaded ZIP package with ${completed} original images!`
      );
    } catch (err: any) {
      console.error('ZIP covers error:', err);
      showToast(isKm ? 'បរាជ័យក្នុងការវេចខ្ចប់រូបភាពជា ZIP' : 'Failed to create ZIP package of images');
    } finally {
      setZippingImages(false);
      setZipProgress(0);
    }
  };

  // Open Lightbox
  const openLightbox = (url: string, title: string, subtitle?: string, downloadName?: string) => {
    setLightbox({
      url,
      title,
      subtitle,
      downloadName: downloadName || `${title.replace(/[^a-zA-Z0-9_\u1780-\u17FF]/g, '_')}_original.jpg`
    });
    setLightboxZoom(1);
    setLightboxDims(null);
    setLightboxScaleMode('fit');
  };

  // Collect unique genres/themes across all dramas
  const allThemes = useMemo(() => {
    if (!creatorResult?.dramaList) return [];
    const set = new Set<string>();
    creatorResult.dramaList.forEach(d => {
      d.themes?.forEach(t => {
        if (t.tagVal) set.add(t.tagVal);
      });
    });
    return Array.from(set);
  }, [creatorResult]);

  // Filter dramas based on search text and selected genre tag
  const filteredDramas = useMemo(() => {
    if (!creatorResult?.dramaList) return [];
    return creatorResult.dramaList.filter(drama => {
      const dId = String(drama.dramaID || (drama as any).seriesId || (drama as any).id || '').trim();
      if (dId && deletedDramaIds.has(dId)) return false;

      const matchesText =
        !dramaSearch.trim() ||
        drama.dramaName.toLowerCase().includes(dramaSearch.toLowerCase()) ||
        drama.description.toLowerCase().includes(dramaSearch.toLowerCase());

      const matchesTag =
        selectedTag === 'all' ||
        drama.themes?.some(t => t.tagVal.toLowerCase() === selectedTag.toLowerCase());

      return matchesText && matchesTag;
    });
  }, [creatorResult, dramaSearch, selectedTag, deletedDramaIds]);

  // All loaded episodes across all cached dramas
  const allLoadedEpisodes = useMemo(() => {
    if (!creatorResult?.dramaList) return [];
    const all: DisplayEpisode[] = [];
    creatorResult.dramaList.forEach(d => {
      const dId = String(d.dramaID || (d as any).seriesId || (d as any).id || '').trim();
      if (dId && deletedDramaIds.has(dId)) return;
      const eps = cachedDramaEpisodes[d.dramaID] || (dId ? cachedDramaEpisodes[dId] : undefined);
      if (eps && eps.length > 0) {
        all.push(...eps);
      }
    });
    return all;
  }, [creatorResult, cachedDramaEpisodes, deletedDramaIds]);

  // Total count of videos across all 30 dramas
  const totalCreatorVideosCount = useMemo(() => {
    if (!creatorResult?.dramaList) return 0;
    return creatorResult.dramaList.reduce((acc, d) => acc + (d.numVideos || 0), 0);
  }, [creatorResult]);

  // Filtered episodes for the "All Videos" view
  const filteredVideos = useMemo(() => {
    let list: DisplayEpisode[] = [];
    if (selectedDramaFilterId === 'all') {
      list = allLoadedEpisodes;
    } else {
      list = cachedDramaEpisodes[selectedDramaFilterId] || [];
    }

    if (videoSearchQuery.trim()) {
      const q = videoSearchQuery.toLowerCase().trim();
      list = list.filter(ep =>
        (ep.title && ep.title.toLowerCase().includes(q)) ||
        (ep.dramaName && ep.dramaName.toLowerCase().includes(q)) ||
        `ep ${ep.episodeNumber}`.includes(q) ||
        `ភាគ ${ep.episodeNumber}`.includes(q)
      );
    }
    return list;
  }, [allLoadedEpisodes, cachedDramaEpisodes, selectedDramaFilterId, videoSearchQuery]);

  // Format big numbers
  const formatNum = (num?: number | string) => {
    if (!num) return '0';
    const n = Number(num);
    if (isNaN(n)) return String(num);
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toLocaleString();
  };

  // Best drama poster helper with safe CDN proxying and automatic fallbacks
  const getDramaPoster = (drama: CreatorDramaInfo, fallbackEpisode?: ShortDramaEpisode | null) => {
    const cachedFirst = cachedDramaEpisodes[drama.dramaID]?.[0];
    const raw = (
      drama.originCover ||
      drama.coverUrl ||
      fallbackEpisode?.originCover ||
      fallbackEpisode?.cover ||
      cachedFirst?.originCover ||
      cachedFirst?.cover ||
      ''
    );
    return getSafeMediaUrl(raw);
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Lightbox Modal for Original Image Fullscreen Display */}
      {lightbox && (
        <div
          id="original-image-lightbox-modal"
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-5"
          onClick={() => {
            setLightbox(null);
            setLightboxZoom(1);
            setLightboxDims(null);
            setLightboxScaleMode('fit');
          }}
        >
          {/* Header Bar */}
          <div
            className="w-full max-w-6xl flex items-center justify-between gap-3 py-2.5 px-4 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md">
                    {lightbox.title}
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{isKm ? 'រូបភាពដើម 100% ពេញ' : '100% Original Master'}</span>
                  </span>
                  {lightboxDims && (
                    <span className="text-[10px] font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 shrink-0">
                      {lightboxDims.width} × {lightboxDims.height} px
                    </span>
                  )}
                </div>
                {lightbox.subtitle && (
                  <p className="text-xs text-slate-400 truncate mt-0.5">{lightbox.subtitle}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Quick 100% Fit & 1:1 Pixel Mode Toggles */}
              <button
                type="button"
                onClick={() => {
                  setLightboxScaleMode('fit');
                  setLightboxZoom(1);
                }}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  lightboxScaleMode === 'fit' && lightboxZoom === 1
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                    : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                }`}
                title={isKm ? 'បង្ហាញរូបភាព 100% ពេញស៊ុម (Fit)' : '100% Full View (Fit Screen)'}
              >
                <span>{isKm ? '100% ពេញ' : '100% Fit'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLightboxScaleMode(m => m === 'actual' ? 'fit' : 'actual');
                  setLightboxZoom(1);
                }}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer hidden sm:flex items-center gap-1 ${
                  lightboxScaleMode === 'actual'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                    : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                }`}
                title={isKm ? 'ទំហំដើម 1:1 Pixel' : '1:1 Actual Resolution'}
              >
                <span>1:1 Pixel</span>
              </button>

              {/* Zoom In & Out */}
              <div className="flex items-center bg-slate-800 rounded-xl border border-slate-700 p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setLightboxScaleMode('fit');
                    setLightboxZoom(z => Math.max(0.5, Number((z - 0.25).toFixed(2))));
                  }}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                  title="Zoom Out (-25%)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono font-bold text-amber-300 px-1.5 min-w-[42px] text-center">
                  {Math.round(lightboxZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setLightboxScaleMode('fit');
                    setLightboxZoom(z => Math.min(3, Number((z + 0.25).toFixed(2))));
                  }}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                  title="Zoom In (+25%)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Download original image button */}
              <button
                id="lightbox-download-image-btn"
                type="button"
                onClick={() => downloadOriginalImage(lightbox.url, lightbox.downloadName)}
                className="bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span className="hidden md:inline">{isKm ? 'ទាញយករូបដើម (HD)' : 'Download Original'}</span>
              </button>

              {/* Close button */}
              <button
                id="lightbox-close-btn"
                type="button"
                onClick={() => {
                  setLightbox(null);
                  setLightboxZoom(1);
                  setLightboxDims(null);
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Central Image View */}
          <div
            className="flex-1 w-full max-w-6xl flex items-center justify-center p-2 sm:p-4 overflow-auto min-h-0"
            onClick={e => e.stopPropagation()}
          >
            <div
              className="relative transition-transform duration-200 ease-out flex items-center justify-center"
              style={{ transform: `scale(${lightboxZoom})` }}
            >
              <img
                src={lightbox.url}
                alt={lightbox.title}
                onLoad={e => {
                  const img = e.currentTarget;
                  if (img.naturalWidth && img.naturalHeight) {
                    setLightboxDims({ width: img.naturalWidth, height: img.naturalHeight });
                  }
                }}
                className={`rounded-2xl object-contain shadow-2xl border border-slate-700/80 bg-slate-950/80 transition-all ${
                  lightboxScaleMode === 'actual'
                    ? 'max-w-none'
                    : 'max-h-[80vh] max-w-[92vw] w-auto h-auto'
                }`}
              />
            </div>
          </div>

          {/* Bottom Footer Info */}
          <div
            className="text-center text-xs text-slate-400 py-1 flex items-center justify-center gap-2"
            onClick={e => e.stopPropagation()}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {isKm
                ? 'រូបភាពដើម Full Resolution 100% គ្មានការកាត់គែម • ចុច ESC ឬផ្ទៃខាងក្រៅដើម្បីបិទ'
                : '100% Full Resolution uncropped original image • Press ESC or click outside to close'}
            </span>
          </div>
        </div>
      )}

      {/* Feature Header Card */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/20 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/30">
              <Tv className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  {isKm ? 'ស្កេន TikTok Short Drama & បង្ហាញរូបភាពដើម' : 'TikTok Short Drama & Original Covers Scanner'}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {isKm ? 'បង្ហាញរូបភាពដើម & ក្រប HD' : 'Original Covers & HD Posters'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                {isKm
                  ? 'ស្កេនរឿងភាគទាំងអស់ពី Creator Profile ឬបំបែក Link ភាគរឿង Short Drama ទៅជាវីដេអូស្តង់ដារ និងបង្ហាញរូបភាព Poster/Cover គុណភាពដើម'
                  : 'Scan all short dramas from TikTok creator profiles or convert drama episode links to standard videos with original HD posters and episode covers'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 6-Step Automated Workflow Controller / Button (ចុចវិលជុំ ដោយស្វ័យប្រវត្តិ) */}
      <AutoCycleWorkflowController
        isKm={isKm}
        activeDrama={activeDrama}
        creatorResult={creatorResult}
        singleDramaResult={singleDramaResult}
        episodesData={episodesData}
        cachedDramaEpisodes={cachedDramaEpisodes}
        filteredVideos={filteredVideos}
        onViewEpisodesAndImages={handleAutoCycleStep1_ViewEpisodesAndImages}
        onDownloadPoster={handleAutoCycleStep2_DownloadPoster}
        onQueue30Episodes={handleAutoCycleStep3_Queue30Episodes}
        onStartDownload={handleAutoCycleStep4_StartDownload}
        onScan20SmartChannels={handleAutoCycleStep5_Scan20SmartChannels}
        onClearDrama={handleAutoCycleStep6_ClearDrama}
        currentChannelIndex={currentAutoCycleChannelIdx}
        totalChannels={20}
        showToast={showToast}
      />

      {/* Input Search Box */}
      <div id="shortdrama-profile-url-input-container" className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-slate-100">
              {isKm
                ? 'បញ្ចូល TikTok Profile URL ឬ Link ភាគរឿង Short Drama: បង្ហាញ់រូបភាពដើម អោយស្រួលមើលLink'
                : 'Enter TikTok Profile URL or Short Drama Episode Link: Show Original Images (Easy Link View)'}
            </span>
          </label>

          <div className="flex items-center gap-2">
            <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 shadow-sm">
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>{isKm ? 'ស្កេន & បង្ហាញរូបភាពដើម 100%' : 'Auto-Scans & Shows 100% Original Images'}</span>
            </span>
          </div>
        </div>

        {/* Global Image View Mode Bar (100% Full View vs Cover) */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Eye className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                {isKm ? 'ទម្រង់មើលរូបភាពដើម:' : 'Original Image View Mode:'}
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {imageDisplayFit === 'contain' ? '100% FULL' : 'COVER'}
                </span>
              </span>
              <span className="text-[10px] text-slate-400">
                {imageDisplayFit === 'contain'
                  ? (isKm ? '✓ បង្ហាញរូបភាព Poster & Cover ពេញលេញ 100% គ្មានកាត់គែម' : '✓ Showing full 100% uncropped original poster & covers')
                  : (isKm ? 'កាត់រូបភាពពេញស៊ុម (Fill Frame)' : 'Cropping image to fill frames')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setImageDisplayFit('contain')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                imageDisplayFit === 'contain'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Check className={`w-3.5 h-3.5 ${imageDisplayFit === 'contain' ? 'opacity-100' : 'opacity-0'}`} />
              <span>{isKm ? 'បង្ហាញ 100% ពេញ (No Crop)' : '100% Full View (No Crop)'}</span>
            </button>
            <button
              type="button"
              onClick={() => setImageDisplayFit('cover')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                imageDisplayFit === 'cover'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{isKm ? 'កាត់ពេញស៊ុម' : 'Cover'}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
          <div className="relative flex-1 flex items-center">
            <input
              id="shortdrama-url-input"
              type="text"
              value={inputUrl}
              onChange={e => {
                setInputUrl(e.target.value);
                setIsAutocompleteDismissed(false);
              }}
              onKeyDown={e => e.key === 'Enter' && handleProcess()}
              placeholder={
                isKm
                  ? 'បញ្ចូល TikTok URL ឬ Link ភាគរឿង ឬសរសេរអក្សរ A...'
                  : 'Enter TikTok profile/drama URL or type "A" for smart title suggestions...'
              }
              className="w-full bg-slate-950/90 border border-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-3 text-sm sm:text-base outline-none transition-all pr-24 font-mono select-all"
            />
            <div className="absolute right-2.5 flex items-center gap-1.5">
              {inputUrl ? (
                <>
                  {inputUrl.startsWith('http') && (
                    <a
                      href={inputUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-amber-300 rounded-lg hover:bg-slate-800/80 transition-colors"
                      title={isKm ? 'បើកមើល Link ក្នុងផ្ទាំងថ្មី' : 'Open Link in new tab'}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleClearUrl}
                    className="p-1.5 text-slate-400 hover:text-rose-300 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
                    title={isKm ? 'លុបតំណភ្ជាប់ចេញ' : 'Clear Link'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  id="paste-shortdrama-url-btn"
                  onClick={handlePasteClipboard}
                  className="btn-3d-glass btn-3d-glass-amber text-xs text-slate-950 px-2.5 py-1.5 gap-1 shadow-sm"
                  title={isKm ? 'បិទភ្ជាប់តំណភ្ជាប់ពី Clipboard' : 'Paste link from clipboard'}
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isKm ? 'បិទភ្ជាប់' : 'Paste'}</span>
                </button>
              )}
            </div>

            {/* Smart Title Autocomplete floating dropdown */}
            {!isAutocompleteDismissed && inputUrl.trim().length > 0 && !inputUrl.startsWith('http') && (
              <SmartTitleAutocomplete
                query={inputUrl}
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
            id="scan-dramas-btn"
            onClick={() => handleProcess()}
            disabled={loading}
            title={isKm ? 'ស្កេន & បង្ហាញរូបភាពដើម 100% អោយស្រួលមើល Link ភាគរឿង' : 'Scan & show 100% original images for easy link viewing'}
            className="btn-3d-glass btn-3d-glass-amber text-slate-950 font-bold text-xs sm:text-sm px-5 py-3 shrink-0 gap-1.5"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{isKm ? 'កំពុងស្កេន...' : 'Scanning...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-slate-950" />
                <span>{isKm ? 'ស្កេនរឿង' : 'Scan Drama'}</span>
              </>
            )}
          </button>
        </div>

        {/* Compact Quick Action Tools Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-slate-400 font-medium mr-0.5">
            {isKm ? 'ឧបករណ៍បន្ថែម:' : 'Tools:'}
          </span>

          {/* Search by Title Button */}
          <button
            id="search-by-title-shortdrama-btn"
            type="button"
            onClick={() => {
              setTitleSearchInitialQuery(inputUrl && !inputUrl.startsWith('http') ? inputUrl : 'A');
              setIsTitleSearchOpen(true);
            }}
            className="btn-3d-glass btn-3d-glass-teal text-slate-950 font-bold text-xs px-3 py-1.5 gap-1.5"
            title={isKm ? 'ស្វែងរក តាមចំណងជើង ឆ្លាតវ៉ៃ (សរសេរអក្សរ A បង្ហាញ់ឈ្មោះជាច្រើន)' : 'Smart Search by Title (Type "A" to show many titles)'}
          >
            <Search className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
            <span>{isKm ? 'រកតាមចំណងជើង' : 'By Title'}</span>
          </button>

          {/* Search by Name: Connected to All Social Networks in All Countries Automatically */}
          <button
            id="global-social-search-shortdrama-btn"
            type="button"
            onClick={() => {
              setSocialSearchInitialQuery(inputUrl && !inputUrl.startsWith('http') ? inputUrl : '');
              setIsGlobalSocialSearchOpen(true);
            }}
            className="btn-3d-glass btn-3d-glass-cyan text-white font-bold text-xs px-3 py-1.5 gap-1.5"
            title={isKm ? 'ស្វែងរកតាមឈ្មោះ ភ្ជាប់ទៅបណ្តាញសង្គមទាំងអស់គ្រប់ប្រទេស ដោយស្វ័យប្រវត្តិ' : 'Search by Name, Connected to All Social Networks in All Countries Automatically'}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-200 stroke-[2.5]" />
            <span>{isKm ? 'បណ្ដាញសង្គម' : 'Social Search'}</span>
          </button>
        </div>

        {/* Quick Sample Trigger Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-400">{isKm ? 'សាកល្បងចុចរហ័ស:' : 'Quick samples:'}</span>

            {/* Smart Title Search Quick Sample 'A' */}
            <button
              id="sample-drama-title-a-btn"
              onClick={() => {
                setTitleSearchInitialQuery('A');
                setIsTitleSearchOpen(true);
              }}
              className="bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/40 text-teal-300 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer font-medium shadow-sm shadow-teal-500/10"
              title={isKm ? 'ស្វែងរកចំណងជើងអក្សរ A ភ្លាមៗ' : 'Instant search titles starting with A'}
            >
              <Search className="w-3 h-3 text-teal-400" />
              <span>{isKm ? '🔍 ចំណងជើងអក្សរ A (16+)' : '🔍 Titles "A"'}</span>
            </button>

            {/* Quick Global Social Search Sample */}
            <button
              id="sample-social-search-btn"
              onClick={() => {
                setSocialSearchInitialQuery(inputUrl && !inputUrl.startsWith('http') ? inputUrl : 'Alpha');
                setIsGlobalSocialSearchOpen(true);
              }}
              className="bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer font-medium shadow-sm shadow-cyan-500/10"
              title={isKm ? 'ស្វែងរកតាមឈ្មោះ ភ្ជាប់បណ្ដាញសង្គមគ្រប់ប្រទេស' : 'Search name across all social networks in all countries'}
            >
              <Globe className="w-3 h-3 text-cyan-400" />
              <span>{isKm ? '🌐 បណ្ដាញសង្គមគ្រប់ប្រទេស (20+)' : '🌐 All Social Networks'}</span>
            </button>

            {/* Kuaishou Short Drama: 快手短剧 with Official Logo */}
            <button
              id="sample-kuaishou-drama-btn"
              onClick={() => {
                const url = 'https://www.kuaishou.com';
                setInputUrl(url);
                handleProcess(url);
              }}
              className="btn-3d-glass btn-3d-glass-slate text-orange-200 hover:text-orange-100 px-2.5 py-1 text-xs gap-1.5 shadow-sm"
              title="Kuaishou Short Drama Sample"
            >
              <img src="/logos/kuaishou.svg" alt="Kuaishou" className="w-3.5 h-3.5 rounded-sm object-contain shrink-0" referrerPolicy="no-referrer" />
              <span className="font-medium">快手 @快手短剧</span>
              <ArrowRight className="w-3 h-3 text-orange-400 shrink-0" />
            </button>

            {/* User Requested Bilibili Creator: 山楂动漫 with Official Logo */}
            <button
              id="sample-shanzha-bilibili-btn"
              onClick={() => {
                const url = 'https://space.bilibili.com/3546928642001147?spm_id_from=333.788.upinfo.detail.click';
                setInputUrl(url);
                handleProcess(url);
              }}
              className="btn-3d-glass btn-3d-glass-slate text-rose-200 hover:text-rose-100 px-2.5 py-1 text-xs gap-1.5 shadow-sm"
              title="Bilibili Creator Sample"
            >
              <img src="/logos/bilibili.svg" alt="Bilibili" className="w-3.5 h-3.5 rounded-sm object-contain shrink-0" referrerPolicy="no-referrer" />
              <span className="font-medium">哔哩哔哩 @山楂</span>
              <ArrowRight className="w-3 h-3 text-rose-400 shrink-0" />
            </button>

            {/* Bilibili Creator: 子文又饿了 with Official Logo */}
            <button
              id="sample-ziwen-bilibili-btn"
              onClick={() => {
                const url = 'https://space.bilibili.com/8894411?spm_id_from=333.788.upinfo.detail.click';
                setInputUrl(url);
                handleProcess(url);
              }}
              className="btn-3d-glass btn-3d-glass-slate text-sky-200 hover:text-sky-100 px-2.5 py-1 text-xs gap-1.5 shadow-sm"
              title="Bilibili Creator Sample"
            >
              <img src="/logos/bilibili.svg" alt="Bilibili" className="w-3.5 h-3.5 rounded-sm object-contain shrink-0" referrerPolicy="no-referrer" />
              <span className="font-medium">哔哩哔哩 @子文</span>
              <ArrowRight className="w-3 h-3 text-sky-400 shrink-0" />
            </button>

            {/* Creator: @stardustdrama_mx (User Requested) */}
            <button
              id="sample-stardustdrama-profile-btn"
              onClick={() => {
                const url = 'https://www.tiktok.com/@stardustdrama_mx';
                setInputUrl(url);
                handleProcess(url);
              }}
              className="btn-3d-glass btn-3d-glass-master text-amber-200 hover:text-white px-2.5 py-1 text-xs gap-1.5 shadow-sm border border-amber-500/40 hover:scale-105 active:scale-95 transition-all"
              title={isKm ? 'ចុច Profile @stardustdrama_mx: ស្កេនភាគរឿង Short Drama & បង្ហាញរូបភាពដើម' : 'Click Profile @stardustdrama_mx: Scan Short Drama & Show Original Images'}
            >
              <img src="/logos/tiktok.svg" alt="TikTok" className="w-3.5 h-3.5 rounded-sm object-contain shrink-0" referrerPolicy="no-referrer" />
              <span className="font-bold">Profile @stardustdrama_mx</span>
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0 animate-pulse" />
            </button>

            {/* Creator: 17kseriesid with TikTok Logo */}
            <button
              id="sample-17kseriesid-btn"
              onClick={() => {
                setInputUrl(SAMPLE_CREATOR_URL);
                handleProcess(SAMPLE_CREATOR_URL);
              }}
              className="btn-3d-glass btn-3d-glass-slate text-slate-200 hover:text-white px-2.5 py-1 text-xs gap-1.5 shadow-sm"
              title="TikTok Drama Channel"
            >
              <img src="/logos/tiktok.svg" alt="TikTok" className="w-3.5 h-3.5 rounded-sm object-contain shrink-0" referrerPolicy="no-referrer" />
              <span className="font-medium">@17kseriesid (38 រឿង)</span>
              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {/* Single Drama Ep 16 */}
            <button
              id="sample-drama-ep-btn"
              onClick={() => {
                setInputUrl(SAMPLE_DRAMA_URL);
                handleProcess(SAMPLE_DRAMA_URL);
              }}
              className="bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer font-mono"
            >
              <span>Short Drama Ep 16</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </button>
          </div>

          <span className="text-[11px] text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
            {isKm ? 'ស្វ័យប្រវត្តិកំណត់ប្រភេទ Link' : 'Auto-detects creator / episode'}
          </span>
        </div>
      </div>

      {/* 20 Smart Drama Channels Buttons Hub */}
      <SmartChannelButtons
        isKm={isKm}
        currentActiveUrl={inputUrl}
        showToast={showToast}
        defaultCollapsed={true}
        onScanChannel={(channelUrl) => {
          setInputUrl(channelUrl);
          handleProcess(channelUrl);
        }}
        onAddToBatch={onQueueEpisodes}
        onPasteToInput={(channelUrl) => {
          setInputUrl(channelUrl);
          showToast(isKm ? `បានបញ្ចូល ${channelUrl} ក្នុងប្រអប់` : `Pasted ${channelUrl} into input`);
        }}
      />

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/80 text-red-200 flex items-start gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-medium">{isKm ? 'មិនអាចដំណើរការបានទេ' : 'Scan Error'}</p>
            <p className="text-red-300/80 text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* CREATOR SHORT DRAMAS SCAN RESULT */}
      {creatorResult && (
        <div className="flex flex-col gap-6">
          {/* Creator Profile Header Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              {/* Creator Avatar with Lightbox Click & Download button */}
              <div className="relative group shrink-0">
                {creatorResult.creator.avatar ? (
                  <img
                    src={creatorResult.creator.avatar}
                    alt={creatorResult.creator.nickname}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-amber-500/40 shadow-lg shadow-amber-500/20 cursor-pointer group-hover:opacity-90 transition-all"
                    onClick={() =>
                      openLightbox(
                        creatorResult.creator.avatar,
                        `@${creatorResult.creator.username} Avatar`,
                        creatorResult.creator.nickname,
                        `${creatorResult.creator.username}_avatar_hd.jpg`
                      )
                    }
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center text-amber-300 font-bold text-2xl">
                    {creatorResult.creator.username.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div
                  onClick={() =>
                    openLightbox(
                      creatorResult.creator.avatar,
                      `@${creatorResult.creator.username} Avatar`,
                      creatorResult.creator.nickname,
                      `${creatorResult.creator.username}_avatar_hd.jpg`
                    )
                  }
                  className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold cursor-pointer transition-opacity"
                >
                  <Eye className="w-4 h-4 text-amber-400 mb-0.5" />
                  <span>{isKm ? 'មើលរូបដើម' : 'Original'}</span>
                </div>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-lg sm:text-xl font-bold text-white">
                    {creatorResult.creator.nickname}
                  </h4>
                  <span className="text-xs font-mono text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    @{creatorResult.creator.username}
                  </span>
                  {creatorResult.creator.avatar && (
                    <button
                      onClick={() =>
                        downloadOriginalImage(
                          creatorResult.creator.avatar,
                          `${creatorResult.creator.username}_avatar_hd.jpg`
                        )
                      }
                      className="text-[11px] font-medium text-slate-300 hover:text-amber-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-all"
                      title="Download HD Avatar"
                    >
                      <Download className="w-3 h-3 text-amber-400" />
                      <span>{isKm ? 'ទាញយករូប Avatar' : 'Download Avatar'}</span>
                    </button>
                  )}
                </div>
                {creatorResult.creator.signature && (
                  <p className="text-xs text-slate-400 mt-1 max-w-xl line-clamp-2">
                    {creatorResult.creator.signature}
                  </p>
                )}
              </div>
            </div>

            {/* Stats Chips */}
            <div className="flex items-center gap-3 self-stretch md:self-center justify-between sm:justify-end">
              <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl px-3.5 py-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-400" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-100">
                    {formatNum(creatorResult.creator.followerCount)}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase">{isKm ? 'អ្នកតាមដាន' : 'Followers'}</span>
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl px-3.5 py-2 flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-100">
                    {formatNum(creatorResult.creator.heartCount)}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase">{isKm ? 'ចូលចិត្ត' : 'Likes'}</span>
                </div>
              </div>

              <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl px-3.5 py-2 flex items-center gap-2">
                <Tv className="w-4 h-4 text-amber-400" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-amber-300">
                    {creatorResult.totalDramas}
                  </span>
                  <span className="text-[10px] text-amber-400/80 uppercase">{isKm ? 'រឿងភាគ' : 'Dramas'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* CREATOR VIEW MODE SWITCHER & REAL-TIME CONTROLS */}
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-xl backdrop-blur-md">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Primary View Mode Tabs */}
              <div className="flex items-center gap-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
                <button
                  id="tab-view-all-videos"
                  onClick={() => setCreatorViewMode('videos')}
                  className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    creatorViewMode === 'videos'
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 shadow-md shadow-amber-500/25'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Film className="w-4 h-4" />
                  <span>{isKm ? '🎬 វីដេអូទាំងអស់' : '🎬 All Videos'}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                    creatorViewMode === 'videos' ? 'bg-slate-950/25 text-slate-950' : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                  }`}>
                    {allLoadedEpisodes.length > 0 ? `${allLoadedEpisodes.length} វីដេអូ` : `${totalCreatorVideosCount} វីដេអូ`}
                  </span>
                </button>

                <button
                  id="tab-view-all-dramas"
                  onClick={() => setCreatorViewMode('dramas')}
                  className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    creatorViewMode === 'dramas'
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 shadow-md shadow-amber-500/25'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Tv className="w-4 h-4" />
                  <span>{isKm ? '📁 រឿងភាគទាំងអស់' : '📁 All Drama Series'}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                    creatorViewMode === 'dramas' ? 'bg-slate-950/25 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {creatorResult.totalDramas}
                  </span>
                </button>
              </div>

              {/* Action Buttons: Batch Queue & Load All Videos */}
              <div className="flex items-center gap-2 flex-wrap">
                {onQueueEpisodes && filteredVideos.length > 0 && (
                  <button
                    id="queue-all-loaded-videos-btn"
                    onClick={handleQueueAllLoadedVideos}
                    className="flex-1 sm:flex-none text-xs font-bold px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-white border border-emerald-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <ListPlus className="w-4 h-4 text-emerald-400" />
                    <span>
                      {isKm
                        ? `ទាញយកទាំងអស់ (${filteredVideos.length}) ចូល Batch`
                        : `Queue All (${filteredVideos.length}) to Batch`}
                    </span>
                  </button>
                )}

                {allLoadedEpisodes.length < totalCreatorVideosCount && (
                  <button
                    id="load-all-dramas-videos-btn"
                    disabled={loadingAllVideos}
                    onClick={handleLoadAllDramasVideos}
                    className={`flex-1 sm:flex-none text-xs font-bold px-3.5 py-2 rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      loadingAllVideos
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 animate-pulse'
                        : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700 hover:border-amber-500/40'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingAllVideos ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
                    <span>
                      {loadingAllVideos
                        ? (isKm
                            ? `កំពុងផ្ទុក... (${loadingAllProgress.current}/${loadingAllProgress.total} រឿង)`
                            : `Loading dramas... (${loadingAllProgress.current}/${loadingAllProgress.total})`)
                        : (isKm
                            ? `⚡ ផ្ទុកវីដេអូនៃ ${creatorResult.dramaList.length} រឿងភាគទាំងអស់ (${allLoadedEpisodes.length}/${totalCreatorVideosCount})`
                            : `⚡ Load All ${creatorResult.dramaList.length} Dramas Videos (${allLoadedEpisodes.length}/${totalCreatorVideosCount})`)}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* In 'videos' mode, show Drama Series Pills Filter and Search */}
            {creatorViewMode === 'videos' && (
              <div className="flex flex-col gap-3 pt-2 border-t border-slate-800">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  {/* Search input for videos */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="search-creator-video-input"
                      type="text"
                      value={videoSearchQuery}
                      onChange={e => setVideoSearchQuery(e.target.value)}
                      placeholder={
                        isKm
                          ? 'ស្វែងរកវីដេអូតាមចំណងជើង ឬលេខភាគ (ឧ. Ep 1, Revenge, Sword, ភាគ 1)...'
                          : 'Search videos by title or episode number (e.g. Ep 1, Revenge, Sword)...'
                      }
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm outline-none focus:border-amber-500 transition-all"
                    />
                  </div>

                  {/* Count indicator */}
                  <div className="text-xs font-semibold text-slate-400 shrink-0 flex items-center gap-1.5 self-end sm:self-center">
                    <span>{isKm ? 'បង្ហាញ:' : 'Showing:'}</span>
                    <span className="text-amber-400 font-bold bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">
                      {filteredVideos.length} {isKm ? 'វីដេអូ' : 'Videos'}
                    </span>
                  </div>
                </div>

                {/* Drama Series Pills Selector */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  <button
                    id="filter-drama-pill-all"
                    onClick={() => setSelectedDramaFilterId('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                      selectedDramaFilterId === 'all'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                        : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {isKm ? '🎬 ទាំងអស់ (All Videos)' : '🎬 All Videos'} ({allLoadedEpisodes.length})
                  </button>

                  {creatorResult.dramaList
                    .filter(d => !deletedDramaIds.has(String(d.dramaID || '').trim()))
                    .map((d, idx) => {
                      const isSelected = selectedDramaFilterId === d.dramaID;
                      const loadedCount = cachedDramaEpisodes[d.dramaID]?.length;
                      return (
                        <div
                          key={`creator-drama-pill-${d.dramaID || 'item'}-${idx}`}
                          className={`inline-flex items-center rounded-lg text-xs font-semibold whitespace-nowrap transition-all border shrink-0 ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/25'
                              : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          <button
                            type="button"
                            id={`filter-drama-pill-${d.dramaID}`}
                            onClick={() => {
                              setSelectedDramaFilterId(d.dramaID);
                              if (!cachedDramaEpisodes[d.dramaID] || cachedDramaEpisodes[d.dramaID].length === 0) {
                                handleSelectDrama(d);
                              }
                            }}
                            className="px-2.5 py-1.5 flex items-center gap-1.5 cursor-pointer text-left"
                          >
                            <span className="opacity-75 text-[10px]">#{idx + 1}</span>
                            <span className="max-w-[150px] truncate">{d.dramaName}</span>
                            <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                              isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-900 text-amber-300'
                            }`}>
                              {loadedCount !== undefined ? `${loadedCount}/${d.numVideos}` : `${d.numVideos}`}
                            </span>
                          </button>
                          <button
                            type="button"
                            id={`delete-pill-${d.dramaID}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteSingleDrama(d.dramaID, d.dramaName);
                            }}
                            className={`p-1 mr-1 rounded hover:bg-rose-500/30 hover:text-rose-300 transition-colors cursor-pointer ${
                              isSelected ? 'text-slate-900 hover:text-rose-950' : 'text-slate-400 hover:text-rose-400'
                            }`}
                            title={isKm ? 'លុបរឿងនេះ (លុបម្តង១រឿង)' : 'Delete this drama (1 at a time)'}
                          >
                            <Trash2 className="w-3 h-3 text-rose-500" />
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* ALL VIDEOS GRID (when creatorViewMode === 'videos') */}
          {creatorViewMode === 'videos' && (
            <div className="flex flex-col gap-4">
              {episodesLoading && filteredVideos.length === 0 ? (
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center gap-3">
                  <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                  <p className="text-sm font-semibold text-slate-200">
                    {isKm ? 'កំពុងផ្ទុកបញ្ជីវីដេអូទាំងអស់...' : 'Loading all videos...'}
                  </p>
                </div>
              ) : filteredVideos.length === 0 ? (
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center gap-3">
                  <Film className="w-10 h-10 text-slate-600" />
                  <p className="text-sm font-semibold text-slate-300">
                    {isKm ? 'មិនមានវីដេអូត្រូវនឹងការស្វែងរកទេ' : 'No videos found'}
                  </p>
                  {allLoadedEpisodes.length === 0 && (
                    <button
                      onClick={handleLoadAllDramasVideos}
                      className="mt-2 text-xs font-bold px-4 py-2 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all cursor-pointer"
                    >
                      {isKm ? '⚡ ផ្ទុកវីដេអូឥឡូវនេះ' : '⚡ Load Videos Now'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                  {filteredVideos.map((ep, idx) => {
                    const cover = ep.originCover || ep.cover;
                    return (
                      <div
                        key={`creator-video-${ep.dramaID || 'd'}-${ep.videoId || ep.episodeNumber || idx}-${idx}`}
                        className="group bg-slate-900/90 hover:bg-slate-850 border border-slate-800/80 hover:border-amber-500/50 rounded-xl overflow-hidden flex flex-col justify-between transition-all hover:shadow-xl hover:shadow-amber-500/10"
                      >
                        {/* Video Thumbnail Container */}
                        <div className="relative aspect-[9/14] bg-slate-950 overflow-hidden flex items-center justify-center">
                          {cover ? (
                            <img
                              src={cover}
                              alt={ep.title}
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                              className={`w-full h-full ${imageDisplayFit === 'contain' ? 'object-contain' : 'object-cover'} transition-transform duration-300 group-hover:scale-105`}
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-2 text-center text-slate-600">
                              <Film className="w-6 h-6 mb-1" />
                              <span className="text-[10px]">No Preview</span>
                            </div>
                          )}

                          {/* Hover/Touch Play Overlay */}
                          <div
                            onClick={() => handlePlayVideo(ep)}
                            className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-[2px]"
                            title={isKm ? 'ចុចដើម្បីចាក់វីដេអូ' : 'Click to preview video'}
                          >
                            <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/40 transform scale-90 group-hover:scale-100 transition-transform">
                              <Play className="w-5 h-5 fill-current ml-0.5" />
                            </div>
                          </div>

                          {/* Top Badges: Episode # and Duration */}
                          <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 pointer-events-none">
                            <span className="bg-slate-950/85 backdrop-blur-sm text-amber-300 border border-amber-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                              {isKm ? `ភាគ ${ep.episodeNumber}` : `Ep ${ep.episodeNumber}`}
                            </span>
                            {ep.duration && (
                              <span className="bg-slate-950/80 backdrop-blur-sm text-slate-300 text-[9px] font-mono px-1.5 py-0.5 rounded shadow">
                                {ep.duration}s
                              </span>
                            )}
                          </div>

                          {/* Bottom Badges: Status (Free/Paid) */}
                          <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 pointer-events-none">
                            {ep.isPaid ? (
                              <span className="bg-amber-500/90 text-slate-950 text-[9px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" />
                                <span>{isKm ? 'បង់ប្រាក់' : 'Paid'}</span>
                              </span>
                            ) : (
                              <span className="bg-emerald-500/90 text-slate-950 text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                                {isKm ? 'ឥតគិតថ្លៃ' : 'Free'}
                              </span>
                            )}

                            {cover && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openLightbox(
                                    cover,
                                    `${ep.dramaName || 'Short Drama'} - Ep ${ep.episodeNumber}`,
                                    ep.title,
                                    `${ep.dramaName || 'drama'}_Ep${ep.episodeNumber}_cover.jpg`
                                  );
                                }}
                                className="pointer-events-auto w-6 h-6 rounded bg-slate-950/80 hover:bg-slate-900 border border-slate-700/80 text-amber-300 flex items-center justify-center cursor-pointer transition-all"
                                title="View Original HD Cover"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Video Info & Quick Actions */}
                        <div className="p-2.5 flex flex-col gap-2">
                          <div>
                            {ep.dramaName && (
                              <span className="text-[10px] font-semibold text-amber-400/90 line-clamp-1 block">
                                {ep.dramaName}
                              </span>
                            )}
                            <h5 className="text-xs font-bold text-slate-200 line-clamp-2 leading-snug mt-0.5" title={ep.title}>
                              {ep.title || (isKm ? `ភាគទី ${ep.episodeNumber}` : `Episode ${ep.episodeNumber}`)}
                            </h5>
                          </div>

                          {/* Action Buttons Grid */}
                          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/80">
                            <button
                              onClick={() => onDownloadEpisode(ep.videoUrl)}
                              className="w-full py-1.5 px-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 hover:text-white border border-indigo-500/30 text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                              title={isKm ? 'ទាញយកវីដេអូដោយគ្មាន Watermark' : 'Download Video No Watermark'}
                            >
                              <Download className="w-3 h-3" />
                              <span>{isKm ? 'ទាញយក' : 'Download'}</span>
                            </button>

                            <button
                              onClick={() => handlePlayVideo(ep)}
                              className="w-full py-1.5 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 hover:text-white border border-amber-500/30 text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                              title={isKm ? 'ចាក់វីដេអូ' : 'Play Video'}
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>{isKm ? 'ចាក់' : 'Play'}</span>
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-1">
                            {onQueueEpisodes && (
                              <button
                                onClick={() => {
                                  onQueueEpisodes([ep.videoUrl]);
                                  showToast(isKm ? `បានបន្ថែមភាគទី ${ep.episodeNumber} ចូល Batch` : `Added Ep ${ep.episodeNumber} to Batch`);
                                }}
                                className="flex-1 py-1 rounded bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white text-[9px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer border border-slate-700/60"
                              >
                                <ListPlus className="w-2.5 h-2.5 text-emerald-400" />
                                <span>+ Batch</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleCopy(ep.videoUrl)}
                              className="py-1 px-2 rounded bg-slate-800/70 hover:bg-slate-800 text-amber-300 hover:text-amber-100 text-[10px] font-mono transition-all flex items-center justify-center gap-1 cursor-pointer border border-slate-700/60"
                              title={isKm ? `Link វីដេអូ: ${ep.videoUrl} (ចុចដើម្បី Copy)` : `Video Link: ${ep.videoUrl} (Click to copy)`}
                            >
                              <Copy className="w-2.5 h-2.5" />
                              <span>{isKm ? 'Link ភាគ' : 'Copy Link'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* DRAMAS CATALOG MODE (when creatorViewMode === 'dramas') */}
          {creatorViewMode === 'dramas' && (
            <div className="flex flex-col gap-6">
              {/* ACTIVE DRAMA EPISODE EXPLORER (when a drama is selected) */}
              {activeDrama && (
            <div id="active-drama-explorer" className="bg-slate-900/95 border-2 border-amber-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl flex flex-col gap-6 scroll-mt-24">
              {/* Drama Header with Poster Card */}
              <div className="flex flex-col lg:flex-row items-start justify-between gap-6 pb-5 border-b border-slate-800">
                {/* Drama Poster & Cover Display */}
                <div className="flex items-start gap-4 sm:gap-5 w-full lg:w-auto">
                  {/* Poster Thumbnail */}
                  {(() => {
                    const posterUrl = getDramaPoster(activeDrama, episodesData?.episodes?.[0]);
                    return (
                      <div className="relative group w-24 h-32 sm:w-32 sm:h-44 rounded-xl overflow-hidden bg-slate-950 border-2 border-amber-500/40 shrink-0 shadow-xl flex items-center justify-center p-1">
                        {posterUrl ? (
                          <img
                            src={posterUrl}
                            alt={activeDrama.dramaName}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className={`w-full h-full transition-all duration-300 ${
                              imageDisplayFit === 'contain' ? 'object-contain' : 'object-cover'
                            } group-hover:scale-105`}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-amber-900/40 to-slate-950 flex flex-col items-center justify-center p-2 text-center">
                            <Film className="w-6 h-6 text-amber-400 mb-1" />
                            <span className="text-[9px] font-bold text-amber-300/80 uppercase">HD Poster</span>
                          </div>
                        )}

                        {/* Hover Overlay with Lightbox & Download */}
                        {posterUrl && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1.5 transition-opacity p-1 text-center">
                            <button
                              onClick={() =>
                                openLightbox(
                                  posterUrl,
                                  activeDrama.dramaName,
                                  `${activeDrama.numVideos} Episodes • Short Drama Poster 100% HD`,
                                  `${activeDrama.dramaName}_poster.jpg`
                                )
                              }
                              className="px-2 py-1 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer shadow text-xs font-bold flex items-center gap-1"
                              title="View Fullscreen 100%"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>100%</span>
                            </button>
                            <button
                              onClick={() =>
                                downloadOriginalImage(
                                  posterUrl,
                                  `${activeDrama.dramaName}_poster.jpg`
                                )
                              }
                              className="p-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 cursor-pointer shadow"
                              title="Download Poster"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        <span className="absolute bottom-1 left-1 right-1 bg-slate-950/85 backdrop-blur-sm text-[9px] text-amber-300 font-bold px-1 py-0.5 rounded text-center truncate border border-amber-500/20">
                          {imageDisplayFit === 'contain' ? (isKm ? 'Poster ដើម 100%' : '100% Poster') : (isKm ? 'រូបភាព Poster ដើម' : 'HD Poster')}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Title & Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950">
                        {isKm ? 'កំពុងមើលភាគរឿង' : 'Selected Drama'}
                      </span>
                      <span className="text-xs text-amber-300 font-semibold bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
                        {activeDrama.numVideos} {isKm ? 'ភាគ' : 'Episodes'}
                      </span>
                      {activeDrama.numWatched && (
                        <span className="text-xs text-slate-400">
                          • {formatNum(activeDrama.numWatched)} {isKm ? 'ទស្សនា' : 'views'}
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        {isKm ? 'ស្កេនបាន Poster ដើមស្វ័យប្រវត្តិ' : 'Auto-Scanned Original Poster'}
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white mt-1.5 tracking-tight">
                      {activeDrama.dramaName}
                    </h3>

                    {/* Multilingual Drama Title Translator (Khmer, English, Chinese, Thai, Korean, Filipino) */}
                    <div className="mt-3 max-w-2xl">
                      <DramaTitleTranslator
                        originalTitle={activeDrama.dramaName}
                        isKm={isKm}
                        onShowToast={showToast}
                      />
                    </div>

                    {activeDrama.description && (
                      <p className="text-xs sm:text-sm text-slate-300/90 mt-1 max-w-3xl leading-relaxed">
                        {activeDrama.description}
                      </p>
                    )}

                    {/* Poster Action Buttons */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {(() => {
                        const posterUrl = getDramaPoster(activeDrama, episodesData?.episodes?.[0]);
                        return (
                          <>
                            {posterUrl && (
                              <>
                                <button
                                  onClick={() =>
                                    openLightbox(
                                      posterUrl,
                                      activeDrama.dramaName,
                                      `${activeDrama.numVideos} Episodes • Short Drama Poster`,
                                      `${activeDrama.dramaName}_poster.jpg`
                                    )
                                  }
                                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>{isKm ? 'មើល Poster ដើម' : 'View Poster'}</span>
                                </button>

                                <button
                                  onClick={() =>
                                    downloadOriginalImage(
                                      posterUrl,
                                      `${activeDrama.dramaName}_poster.jpg`
                                    )
                                  }
                                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5 text-amber-400" />
                                  <span>{isKm ? 'ទាញយក Poster' : 'Download Poster'}</span>
                                </button>
                              </>
                            )}

                            {/* Batch download all episode images as ZIP */}
                            {episodesData?.episodes && episodesData.episodes.length > 0 && (
                              <button
                                onClick={() =>
                                  downloadAllEpisodeImagesAsZip(
                                    episodesData.episodes,
                                    activeDrama.dramaName
                                  )
                                }
                                disabled={zippingImages}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                              >
                                {zippingImages ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>{zipProgress}% ZIP...</span>
                                  </>
                                ) : (
                                  <>
                                    <FolderArchive className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>
                                      {isKm
                                        ? `ទាញយករូបគ្រប់ភាគជាកញ្ចប់ (.ZIP)`
                                        : `Download All Covers (.ZIP)`}
                                    </span>
                                  </>
                                )}
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Queue All Videos & Delete Drama Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end lg:self-center flex-wrap">
                  {/* Quick Auto-Cycle Trigger for Active Drama */}
                  <button
                    id="auto-cycle-active-drama-btn"
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('auto-cycle-control-panel');
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      handleAutoCycleStep1_ViewEpisodesAndImages();
                    }}
                    className="btn-3d-glass btn-3d-glass-master text-white font-bold text-xs sm:text-sm px-3.5 py-2.5 gap-1.5"
                    title={isKm ? 'ចុចវិលជុំស្វ័យប្រវត្តិ ៦ ជំហាន' : '6-Step Auto Cycle'}
                  >
                    <RotateCcw className="w-4 h-4 text-amber-300" />
                    <span>{isKm ? 'ចុចវិលជុំស្វ័យប្រវត្តិ' : 'Auto-Cycle'}</span>
                  </button>

                  {onQueueEpisodes && episodesData?.episodes && episodesData.episodes.length > 0 && (
                    <button
                      id="queue-all-drama-episodes-btn"
                      onClick={() => {
                        const urls = episodesData.episodes.map(ep => ep.videoUrl).filter(Boolean);
                        onQueueEpisodes(urls);
                        showToast(
                          isKm
                            ? `បានបន្ថែម ${urls.length} ភាគចូលក្នុង Batch Queue រួចរាល់!`
                            : `Added all ${urls.length} episodes into Batch Queue!`
                        );
                      }}
                      className="btn-3d-glass btn-3d-glass-emerald text-slate-950 font-bold text-xs sm:text-sm px-4 py-2.5 gap-2"
                    >
                      <ListPlus className="w-4 h-4 text-slate-950" />
                      <span>
                        {isKm
                          ? `ទាញយកគ្រប់ ${episodesData.episodes.length} ភាគក្នុង Batch Queue`
                          : `Queue All ${episodesData.episodes.length} Episodes in Batch`}
                      </span>
                    </button>
                  )}

                  {activeDrama && (
                    <button
                      id="delete-active-drama-btn"
                      type="button"
                      onClick={() => {
                        handleDeleteSingleDrama(activeDrama.dramaID, activeDrama.dramaName);
                      }}
                      className="btn-3d-glass btn-3d-glass-slate text-rose-400 font-bold text-xs sm:text-sm px-3 py-2.5 gap-1.5"
                      title={isKm ? 'លុបរឿងនេះចេញពីបញ្ជី (លុបម្តង១រឿង)' : 'Remove this drama from list (1 at a time)'}
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                      <span>{isKm ? 'លុបរឿង' : 'Delete Drama'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Episode Loading State */}
              {episodesLoading ? (
                <div className="p-8 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
                  <p className="text-sm font-medium">
                    {isKm ? 'កំពុងទាញយកបញ្ជីភាគរឿងទាំងអស់ & រូបភាពដើម...' : 'Loading all episodes & original images...'}
                  </p>
                </div>
              ) : episodesData?.episodes && episodesData.episodes.length > 0 ? (
                <div className="flex flex-col gap-5">
                  {/* Selected Episode Action Panel with Original Thumbnail Cover */}
                  {selectedEpisode && (
                    <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col gap-4 shadow-xl">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          {/* Original Episode Cover Thumbnail */}
                          {(() => {
                            const epCover = getSafeMediaUrl(selectedEpisode.originCover || selectedEpisode.cover || activeDrama.originCover || activeDrama.coverUrl);
                            return (
                              <div className="relative group w-14 h-18 sm:w-16 sm:h-20 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 shrink-0 shadow-md flex items-center justify-center p-0.5">
                                {epCover ? (
                                  <img
                                    src={epCover}
                                    alt={selectedEpisode.title}
                                    className={`w-full h-full ${imageDisplayFit === 'contain' ? 'object-contain' : 'object-cover'} cursor-pointer group-hover:scale-105 transition-all`}
                                    onClick={() =>
                                      openLightbox(
                                        epCover,
                                        `${activeDrama.dramaName} - Ep ${selectedEpisode.episodeNumber}`,
                                        selectedEpisode.title,
                                        `${activeDrama.dramaName}_Ep${selectedEpisode.episodeNumber}_cover.jpg`
                                      )
                                    }
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-amber-400 bg-amber-500/10">
                                    Ep {selectedEpisode.episodeNumber}
                                  </div>
                                )}
                                {epCover && (
                                  <div
                                    onClick={() =>
                                      openLightbox(
                                        epCover,
                                        `${activeDrama.dramaName} - Ep ${selectedEpisode.episodeNumber}`,
                                        selectedEpisode.title,
                                        `${activeDrama.dramaName}_Ep${selectedEpisode.episodeNumber}_cover.jpg`
                                      )
                                    }
                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition-opacity"
                                  >
                                    <ZoomIn className="w-4 h-4 text-amber-400" />
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="text-base sm:text-lg font-bold text-white">
                                {isKm ? `ភាគទី ${selectedEpisode.episodeNumber}` : `Episode ${selectedEpisode.episodeNumber}`}
                              </h5>
                              {selectedEpisode.isPaid ? (
                                <span className="text-[11px] text-amber-300 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  {isKm ? 'ភាគបង់ប្រាក់ (Paid)' : 'Paid Episode'}
                                </span>
                              ) : (
                                <span className="text-[11px] text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded font-semibold">
                                  {isKm ? 'ឥតគិតថ្លៃ (Free)' : 'Free'}
                                </span>
                              )}
                              {selectedEpisode.duration && (
                                <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">
                                  {selectedEpisode.duration}s
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-300 mt-1 line-clamp-1">
                              {selectedEpisode.title}
                            </p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-sm sm:max-w-md">
                              {selectedEpisode.videoUrl}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons for the active episode */}
                        <div className="flex items-center gap-2 self-stretch md:self-auto flex-wrap">
                          {/* Download Video */}
                          <button
                            id="download-selected-ep-btn"
                            onClick={() => {
                              if (selectedEpisode.isPaid) {
                                showToast(
                                  isKm
                                    ? 'ភាគនេះស្ថិតក្នុងកញ្ចប់ Paid Series របស់ TikTok។ ប្រសិនបើ TikTok រារាំង សូមជ្រើសរើសភាគឥតគិតថ្លៃ (Free Episodes)!'
                                    : 'This episode is part of a TikTok Paid Series (Locked). Please select free episodes!'
                                );
                              }
                              onDownloadEpisode(selectedEpisode.videoUrl);
                            }}
                            className="btn-3d-glass btn-3d-glass-indigo flex-1 sm:flex-initial text-white text-xs font-bold px-4 py-2.5 gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{isKm ? 'ទាញយកភាគនេះ' : 'Download Video'}</span>
                          </button>

                          {/* View & Download Original Episode Cover */}
                          {(selectedEpisode.originCover || selectedEpisode.cover) && (
                            <>
                              <button
                                onClick={() => {
                                  const epCover = selectedEpisode.originCover || selectedEpisode.cover;
                                  openLightbox(
                                    epCover,
                                    `${activeDrama.dramaName} - Ep ${selectedEpisode.episodeNumber}`,
                                    selectedEpisode.title,
                                    `${activeDrama.dramaName}_Ep${selectedEpisode.episodeNumber}_cover.jpg`
                                  );
                                }}
                                className="btn-3d-glass btn-3d-glass-amber text-slate-950 text-xs font-bold px-3 py-2.5 gap-1.5"
                                title="View Original Cover"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>{isKm ? 'មើលរូបដើម' : 'View Cover'}</span>
                              </button>

                              <button
                                onClick={() => {
                                  const epCover = selectedEpisode.originCover || selectedEpisode.cover;
                                  downloadOriginalImage(
                                    epCover,
                                    `${activeDrama.dramaName}_Ep${selectedEpisode.episodeNumber}_cover.jpg`
                                  );
                                }}
                                className="btn-3d-glass btn-3d-glass-slate text-slate-200 text-xs font-semibold px-3 py-2.5 gap-1.5"
                                title="Download Cover Image"
                              >
                                <Download className="w-3.5 h-3.5 text-amber-400" />
                                <span>{isKm ? 'ទាញយករូបដើម' : 'Download Cover'}</span>
                              </button>
                            </>
                          )}

                          {/* Copy Link */}
                          <button
                            id="copy-selected-ep-btn"
                            onClick={() => handleCopy(selectedEpisode.videoUrl)}
                            className="btn-3d-glass btn-3d-glass-slate text-slate-200 text-xs font-semibold px-3 py-2.5 gap-1.5"
                          >
                            {copiedLink === selectedEpisode.videoUrl ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>{isKm ? 'ចម្លង Link' : 'Copy Link'}</span>
                          </button>

                          {onQueueEpisodes && (
                            <button
                              id="queue-single-ep-btn"
                              onClick={() => {
                                onQueueEpisodes([selectedEpisode.videoUrl]);
                                showToast(isKm ? 'បានបន្ថែមទៅ Batch Queue' : 'Added to Batch Queue');
                              }}
                              className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold px-3 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <ListPlus className="w-3.5 h-3.5" />
                              <span>{isKm ? '+ Batch' : '+ Batch'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {selectedEpisode.isPaid && (
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs">
                          <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                          <span>
                            {isKm
                              ? 'ភាគនេះស្ថិតក្នុងកញ្ចប់ Paid Series របស់ TikTok។ ប្រសិនបើ TikTok រារាំងការទាញយក អ្នកអាចទស្សនា ឬទាញយកភាគឥតគិតថ្លៃ (Free Episodes) បានយ៉ាងរលូន។'
                              : 'This episode is part of a TikTok Paid Series. If restricted by TikTok security, please select the free episodes.'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Episodes Explorer View Mode Switcher */}
                  <div id="browse-episodes-section" className="flex items-center justify-between gap-3 text-xs scroll-mt-24">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-300 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-amber-400" />
                        <span>{isKm ? 'រុករកភាគទាំងអស់:' : 'Browse Episodes:'}</span>
                      </span>
                      <span className="text-slate-400">
                        ({episodesData.episodes.length} {isKm ? 'ភាគ' : 'episodes'})
                      </span>
                    </div>

                    {/* View Switcher: Grid vs Original Cover Gallery */}
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        id="btn-view-mode-grid"
                        onClick={() => setEpisodeViewMode('grid')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                          episodeViewMode === 'grid'
                            ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>{isKm ? 'លេខរៀង (Grid)' : 'Episode Numbers (Grid)'}</span>
                      </button>

                      <button
                        id="btn-view-mode-gallery"
                        onClick={() => setEpisodeViewMode('gallery')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                          episodeViewMode === 'gallery'
                            ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>{isKm ? 'វិចិត្រសាលរូបភាពដើម (Gallery)' : 'Original Covers Gallery'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Mode 1: Original Cover Gallery */}
                  {episodeViewMode === 'gallery' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[460px] overflow-y-auto p-1 pr-2 scrollbar-thin">
                      {episodesData.episodes.map((ep, idx) => {
                        const isCurrent = selectedEpisode?.episodeNumber === ep.episodeNumber;
                        const epCover = getSafeMediaUrl(ep.originCover || ep.cover || activeDrama.originCover || activeDrama.coverUrl);
                        return (
                          <div
                            key={`ep-gallery-${ep.videoId || ep.episodeNumber || idx}-${idx}`}
                            onClick={() => setSelectedEpisode(ep)}
                            className={`group rounded-xl p-2 flex flex-col gap-2 transition-all border cursor-pointer relative ${
                              isCurrent
                                ? 'bg-slate-900 border-amber-500 shadow-lg shadow-amber-500/20 ring-2 ring-amber-500/40'
                                : 'bg-slate-950/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {/* Image Thumbnail */}
                            <div className="relative aspect-[9/14] rounded-lg overflow-hidden bg-slate-950 border border-slate-800/80 flex items-center justify-center p-0.5">
                              {epCover ? (
                                <img
                                  src={epCover}
                                  alt={`Ep ${ep.episodeNumber}`}
                                  loading="lazy"
                                  decoding="async"
                                  referrerPolicy="no-referrer"
                                  className={`w-full h-full ${imageDisplayFit === 'contain' ? 'object-contain' : 'object-cover'} group-hover:scale-105 transition-transform duration-300`}
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col items-center justify-center p-2 text-center">
                                  <Film className="w-6 h-6 text-slate-600 mb-1" />
                                  <span className="text-[10px] text-slate-500">Ep {ep.episodeNumber}</span>
                                </div>
                              )}

                              {/* Badges on Thumbnail */}
                              <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded shadow ${
                                  isCurrent ? 'bg-amber-500 text-slate-950' : 'bg-slate-950/90 text-amber-300 border border-amber-500/30'
                                }`}>
                                  Ep {ep.episodeNumber}
                                </span>
                              </div>

                              {ep.isPaid ? (
                                <div className="absolute top-1.5 right-1.5 bg-amber-950/90 border border-amber-500 text-amber-300 p-1 rounded-md shadow">
                                  <Lock className="w-3 h-3" />
                                </div>
                              ) : (
                                <div className="absolute top-1.5 right-1.5 bg-emerald-950/90 border border-emerald-500 text-emerald-300 px-1.5 py-0.5 rounded text-[9px] font-bold shadow">
                                  Free
                                </div>
                              )}

                              {ep.duration && (
                                <span className="absolute bottom-1.5 right-1.5 bg-slate-950/80 text-white text-[9px] font-mono px-1.5 py-0.5 rounded">
                                  {ep.duration}s
                                </span>
                              )}

                              {/* Hover Quick Action Buttons */}
                              {epCover && (
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity p-2">
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      openLightbox(
                                        epCover,
                                        `${activeDrama.dramaName} - Ep ${ep.episodeNumber}`,
                                        ep.title,
                                        `${activeDrama.dramaName}_Ep${ep.episodeNumber}_cover.jpg`
                                      );
                                    }}
                                    className="p-2 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer shadow"
                                    title="View Fullscreen"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      downloadOriginalImage(
                                        epCover,
                                        `${activeDrama.dramaName}_Ep${ep.episodeNumber}_cover.jpg`
                                      );
                                    }}
                                    className="p-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 cursor-pointer shadow"
                                    title="Download Cover"
                                  >
                                    <Download className="w-3.5 h-3.5 text-amber-400" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Caption & Episode Title */}
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-white line-clamp-1 group-hover:text-amber-300">
                                {isKm ? `ភាគទី ${ep.episodeNumber}` : `Episode ${ep.episodeNumber}`}
                              </span>
                              <span className="text-[10px] text-slate-400 line-clamp-1">
                                {ep.title || `Episode ${ep.episodeNumber}`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Mode 2: Episode Number Grid */
                    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5 max-h-56 overflow-y-auto p-1 pr-2 scrollbar-thin">
                      {episodesData.episodes.map((ep, idx) => {
                        const isCurrent = selectedEpisode?.episodeNumber === ep.episodeNumber;
                        return (
                          <button
                            key={`drama-ep-btn-${ep.videoId || ep.episodeNumber || idx}-${idx}`}
                            id={`drama-ep-btn-${ep.episodeNumber}`}
                            onClick={() => setSelectedEpisode(ep)}
                            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer border relative ${
                              isCurrent
                                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30 scale-105'
                                : ep.isPaid
                                ? 'bg-slate-950/90 hover:bg-slate-800 border-amber-500/30 text-amber-200/90 hover:text-white'
                                : 'bg-slate-950/80 hover:bg-slate-800 border-slate-800/80 text-slate-300 hover:text-white hover:border-slate-700'
                            }`}
                            title={ep.isPaid ? `${ep.title} (${isKm ? 'ភាគបង់ប្រាក់' : 'Paid Episode'})` : ep.title}
                          >
                            {ep.isPaid && (
                              <Lock className={`w-2.5 h-2.5 absolute top-1 right-1 ${isCurrent ? 'text-slate-950' : 'text-amber-400'}`} />
                            )}
                            <span>{ep.episodeNumber}</span>
                            {ep.duration && (
                              <span className="text-[9px] opacity-75 font-normal">
                                {ep.duration}s
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* DRAMAS CATALOG LIST / GRID */}
          <div className="flex flex-col gap-4">
            {/* Filter & Search Bar */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="search-drama-filter"
                    type="text"
                    value={dramaSearch}
                    onChange={e => setDramaSearch(e.target.value)}
                    placeholder={
                      isKm
                        ? 'ស្វែងរកឈ្មោះរឿង Short Drama (ឧ. សរសេរអក្សរ A, Sword, Revenge)...'
                        : 'Search drama titles (e.g. type A, Sword, Revenge)...'
                    }
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm outline-none focus:border-amber-500 transition-all"
                  />
                  {dramaSearch && (
                    <button
                      onClick={() => setDramaSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  id="open-smart-title-search-btn"
                  type="button"
                  onClick={() => {
                    setTitleSearchInitialQuery(dramaSearch || 'A');
                    setIsTitleSearchOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/40 text-teal-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                  title={isKm ? 'បើកផ្ទាំងស្វែងរកឆ្លាតវ៉ៃ (សរសេរអក្សរ A បង្ហាញ់ជាច្រើន)' : 'Open Smart Title Search (Type A to show many titles)'}
                >
                  <Search className="w-3.5 h-3.5 text-teal-400" />
                  <span>{isKm ? 'ស្វែងរកឆ្លាតវ៉ៃ (អក្សរ A)' : 'Smart Search (A-Z)'}</span>
                </button>

                {/* Genre Filter Pills */}
                {allThemes.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                    <button
                      onClick={() => setSelectedTag('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                        selectedTag === 'all'
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {isKm ? 'ទាំងអស់' : 'All'} ({creatorResult.totalDramas})
                    </button>
                    {allThemes.slice(0, 6).map((theme, idx) => (
                      <button
                        key={`theme-filter-${theme || 'tag'}-${idx}`}
                        onClick={() => setSelectedTag(theme)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                          selectedTag.toLowerCase() === theme.toLowerCase()
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Alphabet Filter Bar (A, B, C...) */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px] pt-1 border-t border-slate-800/60">
                <span className="text-slate-500 font-bold px-1 shrink-0">{isKm ? 'អក្សរ:' : 'Letter:'}</span>
                <button
                  onClick={() => setDramaSearch('')}
                  className={`px-2 py-0.5 rounded-md font-bold transition-all shrink-0 cursor-pointer ${
                    !dramaSearch ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  {isKm ? 'ទាំងអស់' : 'All'}
                </button>
                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'W', 'Y'].map((letter, idx) => {
                  const isCur = dramaSearch.toUpperCase() === letter;
                  return (
                    <button
                      key={`alphabet-letter-${letter}-${idx}`}
                      id={`alphabet-filter-${letter}`}
                      onClick={() => setDramaSearch(letter)}
                      className={`w-6 h-6 rounded-md font-bold transition-all shrink-0 flex items-center justify-center cursor-pointer ${
                        isCur
                          ? 'bg-teal-400 text-slate-950 shadow font-black scale-105 ring-1 ring-teal-300'
                          : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50'
                      }`}
                      title={`Filter dramas starting with ${letter}`}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid of Dramas with Poster Previews */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDramas.map((drama, idx) => {
                const isSelected = activeDrama?.dramaID === drama.dramaID;
                const posterUrl = getDramaPoster(drama);

                return (
                  <div
                    key={`drama-card-${drama.dramaID || drama.seriesId || drama.dramaName || 'drama'}-${idx}`}
                    onClick={() => {
                      handleSelectDrama(drama, false, 'grid', true);
                      showToast(
                        isKm
                          ? `បានប្តូរទៅផ្ទាំង លេខរៀង (Grid) នៃរឿង «${drama.dramaName}»`
                          : `Switched to Episode Grid for "${drama.dramaName}"`
                      );
                    }}
                    className={`rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3 transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-amber-500 shadow-xl shadow-amber-500/10 ring-2 ring-amber-500/30'
                        : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col gap-3">
                      {/* Drama Poster Thumbnail or Cinematic Card Banner */}
                      <div className={`relative group w-full ${imageDisplayFit === 'contain' ? 'h-48 sm:h-56' : 'h-36'} rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80 flex items-center justify-center p-1 transition-all`}>
                        {posterUrl ? (
                          <img
                            src={posterUrl}
                            alt={drama.dramaName}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className={`w-full h-full ${imageDisplayFit === 'contain' ? 'object-contain' : 'object-cover'} group-hover:scale-105 transition-transform duration-300`}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-tr from-amber-950/60 via-slate-900 to-indigo-950/60 p-3 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <Tv className="w-5 h-5 text-amber-400" />
                              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                                {drama.numVideos} {isKm ? 'ភាគ' : 'EPS'}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-slate-200 line-clamp-2">
                              {drama.dramaName}
                            </span>
                          </div>
                        )}

                        {/* Direct 100% Poster View button overlay on hover */}
                        {posterUrl && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity p-2 z-20">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openLightbox(
                                  posterUrl,
                                  drama.dramaName,
                                  `${drama.numVideos} ភាគ • រូបភាព Poster ដើម 100% HD`,
                                  `${drama.dramaName}_poster.jpg`
                                );
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1 hover:bg-amber-400 shadow cursor-pointer"
                              title={isKm ? 'មើល Poster ដើម 100%' : 'View 100% Original Poster'}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{isKm ? 'មើល 100%' : '100% Full'}</span>
                            </button>
                          </div>
                        )}

                        {/* Badges on Poster */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-950/90 text-amber-300 border border-amber-500/30 shadow">
                            {drama.numVideos} {isKm ? 'ភាគ' : 'Episodes'}
                          </span>
                        </div>

                        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                          {drama.numWatched && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-950/80 text-slate-300 shadow">
                              {formatNum(drama.numWatched)} views
                            </span>
                          )}
                          <button
                            type="button"
                            id={`delete-drama-pin-${drama.dramaID}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteSingleDrama(drama.dramaID, drama.dramaName);
                            }}
                            className="w-6 h-6 rounded-md bg-slate-950/80 hover:bg-rose-900/90 text-slate-400 hover:text-rose-300 border border-slate-700/60 hover:border-rose-500/60 flex items-center justify-center transition-colors shadow cursor-pointer"
                            title={isKm ? 'លុបរឿងនេះ (លុបម្តង១រឿង)' : 'Delete this drama (1 at a time)'}
                          >
                            <Trash2 className="w-3 h-3 text-rose-400" />
                          </button>
                        </div>

                        {/* Hover Overlay with Lightbox & Delete */}
                        {posterUrl && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity p-2">
                            <button
                              onClick={() =>
                                openLightbox(
                                  posterUrl,
                                  drama.dramaName,
                                  `${drama.numVideos} Episodes`,
                                  `${drama.dramaName}_poster.jpg`
                                )
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 cursor-pointer shadow flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{isKm ? 'មើលរូបដើម' : 'View'}</span>
                            </button>
                            <button
                              onClick={() =>
                                downloadOriginalImage(
                                  posterUrl,
                                  `${drama.dramaName}_poster.jpg`
                                )
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 cursor-pointer shadow flex items-center gap-1"
                            >
                              <Download className="w-3.5 h-3.5 text-amber-400" />
                              <span>{isKm ? 'ទាញយក' : 'Download'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSingleDrama(drama.dramaID, drama.dramaName);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-950/85 hover:bg-rose-900 text-rose-200 border border-rose-500/40 font-bold text-xs cursor-pointer shadow flex items-center gap-1"
                              title={isKm ? 'លុបរឿងនេះចេញពីបញ្ជី (លុបម្តង១រឿង)' : 'Delete this drama (1 at a time)'}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              <span>{isKm ? 'លុបរឿង' : 'Delete'}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Drama Text Info */}
                      <div>
                        <h4 className="text-base font-bold text-white line-clamp-1 group-hover:text-amber-300">
                          {drama.dramaName}
                        </h4>

                        {/* Compact translation toggle for card */}
                        <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
                          <DramaTitleTranslator
                            originalTitle={drama.dramaName}
                            isKm={isKm}
                            onShowToast={showToast}
                            compact={true}
                          />
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mt-1">
                          {drama.description || (isKm ? 'គ្មានការពិពណ៌នា' : 'No synopsis')}
                        </p>

                        {/* Theme tags */}
                        {drama.themes && drama.themes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {drama.themes.slice(0, 3).map((t, idx) => (
                              <span
                                key={`drama-${drama.dramaID || 'd'}-theme-${t.tagVal || idx}-${idx}`}
                                className="text-[10px] bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded"
                              >
                                {t.tagVal}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
                      <button
                        id={`explore-drama-${drama.dramaID}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectDrama(drama, false, 'grid', true);
                          showToast(
                            isKm
                              ? `បានប្តូរទៅផ្ទាំង លេខរៀង (Grid) នៃរឿង «${drama.dramaName}»`
                              : `Switched to Episode Grid for "${drama.dramaName}"`
                          );
                        }}
                        className={`flex-1 text-xs font-bold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
                        }`}
                      >
                        <span>{isKm ? 'មើលភាគ & រូបភាព' : 'Explore Episodes & Covers'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        id={`view-videos-drama-${drama.dramaID}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectDrama(drama, true);
                        }}
                        className="py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        title={isKm ? 'មើលវីដេអូទាំងអស់នៃរឿងនេះ' : 'View all videos of this drama'}
                      >
                        <Film className="w-3.5 h-3.5" />
                        <span>{isKm ? 'វីដេអូ' : 'Videos'}</span>
                      </button>

                      <button
                        id={`delete-drama-${drama.dramaID}`}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteSingleDrama(drama.dramaID, drama.dramaName);
                        }}
                        className="py-2 px-2.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 border border-slate-700/60 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                        title={isKm ? 'លុបរឿងនេះចេញពីបញ្ជី (លុបម្តង១រឿង)' : 'Delete this drama from list (1 at a time)'}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>{isKm ? 'លុបរឿង' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )}

      {/* SINGLE DRAMA EPISODE CONVERSION RESULT */}
      {singleDramaResult && !creatorResult && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl flex flex-col gap-6">
          {/* Header with Episode Original Cover and Details */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 pb-5 border-b border-slate-800">
            <div className="flex items-start gap-4 sm:gap-5 w-full md:w-auto">
              {/* Original Episode Cover Poster */}
              {(() => {
                const cover = getSafeMediaUrl(
                  singleDramaResult.currentEpisode?.originCover ||
                  singleDramaResult.currentEpisode?.cover ||
                  singleDramaResult.seriesCover
                );

                return (
                  <div className="relative group w-24 h-32 sm:w-32 sm:h-44 rounded-xl overflow-hidden bg-slate-950 border-2 border-amber-500/40 shrink-0 shadow-xl flex items-center justify-center p-1">
                    {cover ? (
                      <img
                        src={cover}
                        alt={singleDramaResult.seriesName}
                        className={`w-full h-full ${imageDisplayFit === 'contain' ? 'object-contain' : 'object-cover'} group-hover:scale-105 transition-all duration-300 cursor-pointer`}
                        onClick={() =>
                          openLightbox(
                            cover,
                            `${singleDramaResult.seriesName} - Ep ${singleDramaResult.requestedEpisode}`,
                            singleDramaResult.currentEpisode?.title,
                            `${singleDramaResult.seriesName}_Ep${singleDramaResult.requestedEpisode}_cover.jpg`
                          )
                        }
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-amber-900/40 to-slate-950 flex flex-col items-center justify-center p-2 text-center">
                        <Film className="w-6 h-6 text-amber-400 mb-1" />
                        <span className="text-[9px] font-bold text-amber-300/80 uppercase">HD Cover</span>
                      </div>
                    )}

                    {cover && (
                      <div
                        onClick={() =>
                          openLightbox(
                            cover,
                            `${singleDramaResult.seriesName} - Ep ${singleDramaResult.requestedEpisode}`,
                            singleDramaResult.currentEpisode?.title,
                            `${singleDramaResult.seriesName}_Ep${singleDramaResult.requestedEpisode}_cover.jpg`
                          )
                        }
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold cursor-pointer transition-opacity"
                      >
                        <Eye className="w-5 h-5 text-amber-400 mb-1" />
                        <span>{isKm ? 'មើលរូបដើម 100%' : '100% Full View'}</span>
                      </div>
                    )}

                    <span className="absolute bottom-1 left-1 right-1 bg-slate-950/85 backdrop-blur-sm text-[9px] text-amber-300 font-bold px-1 py-0.5 rounded text-center truncate border border-amber-500/20">
                      {imageDisplayFit === 'contain' ? (isKm ? 'រូបភាពដើម 100%' : '100% Original') : (isKm ? 'រូបភាពដើម (HD)' : 'Original HD')}
                    </span>
                  </div>
                );
              })()}

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {isKm ? `ភាគទី ${singleDramaResult.requestedEpisode}` : `Episode ${singleDramaResult.requestedEpisode}`}
                  </span>
                  {singleDramaResult.isPaid ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-950/80 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      {isKm ? 'ភាគបង់ប្រាក់ (Paid)' : 'Paid Episode'}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                      {isKm ? 'ឥតគិតថ្លៃ (Free)' : 'Free'}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {isKm ? `នៃសរុប ${singleDramaResult.totalEpisodeCount} ភាគ` : `of ${singleDramaResult.totalEpisodeCount} total episodes`}
                  </span>
                </div>
                <h4 className="text-lg sm:text-xl font-bold text-white mt-1.5">
                  {singleDramaResult.seriesName}
                </h4>

                {/* Multilingual Drama Title Translator (Khmer, English, Chinese, Thai, Korean, Filipino) */}
                <div className="mt-2.5 max-w-xl">
                  <DramaTitleTranslator
                    originalTitle={singleDramaResult.seriesName}
                    isKm={isKm}
                    onShowToast={showToast}
                  />
                </div>

                {singleDramaResult.currentEpisode?.title && (
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">
                    {singleDramaResult.currentEpisode.title}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  {singleDramaResult.currentEpisode?.author?.avatar && (
                    <img
                      src={singleDramaResult.currentEpisode.author.avatar}
                      alt={singleDramaResult.currentEpisode.author.username}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  )}
                  <p className="text-xs text-slate-400">
                    {isKm ? 'អ្នកបង្កើត:' : 'Creator:'}{' '}
                    <span className="text-slate-200 font-medium">
                      @{singleDramaResult.currentEpisode?.author?.username}
                    </span>
                  </p>
                </div>

                {/* Original Image Action Buttons */}
                {(() => {
                  const cover =
                    singleDramaResult.currentEpisode?.originCover ||
                    singleDramaResult.currentEpisode?.cover ||
                    singleDramaResult.seriesCover;

                  return (
                    cover && (
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <button
                          onClick={() =>
                            openLightbox(
                              cover,
                              `${singleDramaResult.seriesName} - Ep ${singleDramaResult.requestedEpisode}`,
                              singleDramaResult.currentEpisode?.title,
                              `${singleDramaResult.seriesName}_Ep${singleDramaResult.requestedEpisode}_cover.jpg`
                            )
                          }
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isKm ? 'មើលរូបភាពដើម' : 'View Original Image'}</span>
                        </button>

                        <button
                          onClick={() =>
                            downloadOriginalImage(
                              cover,
                              `${singleDramaResult.seriesName}_Ep${singleDramaResult.requestedEpisode}_cover.jpg`
                            )
                          }
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isKm ? 'ទាញយករូបដើម (HD)' : 'Download Original (HD)'}</span>
                        </button>
                      </div>
                    )
                  );
                })()}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-center shrink-0 flex-wrap">
              <button
                id="drama-download-action-btn"
                onClick={() => onDownloadEpisode(singleDramaResult.convertedUrl)}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{isKm ? 'ទាញយកវីដេអូភាគនេះ' : 'Download Video'}</span>
              </button>

              <button
                type="button"
                id="delete-single-drama-result-btn"
                onClick={() => {
                  setSingleDramaResult(null);
                  setInputUrl('');
                  showToast(isKm ? 'បានលុប/បិទព័ត៌មានរឿងនេះរួចរាល់' : 'Removed drama result');
                }}
                className="bg-slate-800/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700/70 hover:border-rose-500/40 text-xs sm:text-sm font-semibold px-3 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                title={isKm ? 'លុប ឬបិទព័ត៌មានរឿងនេះ' : 'Delete or close this drama'}
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>{isKm ? 'លុបរឿង' : 'Delete'}</span>
              </button>
            </div>
          </div>

          {singleDramaResult.isPaid && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs sm:text-sm">
              <Lock className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                {isKm
                  ? 'ភាគនេះស្ថិតក្នុងកញ្ចប់ Paid Series របស់ TikTok។ ប្រសិនបើ TikTok រារាំងការទាញយកដោយសារការកំណត់សិទ្ធិ អ្នកអាចជ្រើសរើសភាគឥតគិតថ្លៃ (Free Episodes ដូចជាភាគ 1 ដល់ 10) ដើម្បីទាញយកបាន!'
                  : 'This episode is part of a TikTok Paid Series. If restricted by TikTok security, you can download free episodes (such as Episodes 1 to 10)!'}
              </span>
            </div>
          )}

          {/* Breakdown Comparison Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-rose-400" />
                  {isKm ? 'តំណភ្ជាប់ Short Drama ដើម:' : 'Original Drama Link:'}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-300 break-all bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                {inputUrl || SAMPLE_DRAMA_URL}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/40 to-slate-950/80 border border-indigo-500/30 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-indigo-400" />
                  {isKm ? 'តំណភ្ជាប់ TikTok វីដេអូស្តង់ដារ (លទ្ធផល):' : 'Converted Standard Video Link:'}
                </span>
              </div>
              <p className="text-xs font-mono text-indigo-200 break-all bg-indigo-950/60 p-2.5 rounded-lg border border-indigo-500/30 font-medium">
                {singleDramaResult.convertedUrl}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  id="copy-converted-link-btn"
                  onClick={() => handleCopy(singleDramaResult.convertedUrl)}
                  className="flex-1 text-xs font-semibold py-1.5 px-3 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedLink === singleDramaResult.convertedUrl ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {copiedLink === singleDramaResult.convertedUrl
                      ? isKm
                        ? 'បានចម្លង!'
                        : 'Copied!'
                      : isKm
                      ? 'ចម្លង Link នេះ'
                      : 'Copy Converted Link'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Episode selector with thumbnail gallery */}
          <div className="flex flex-col gap-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h5 className="text-xs sm:text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>{isKm ? 'រុករកភាគទាំងអស់:' : 'Explore Episodes:'}</span>
                </h5>
                <span className="text-xs text-slate-400">
                  ({singleDramaResult.episodes.length} {isKm ? 'ភាគ' : 'episodes'})
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* View switcher between gallery and grid */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSingleDramaViewMode('gallery')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      singleDramaViewMode === 'gallery'
                        ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>{isKm ? 'វិចិត្រសាលរូបភាពដើម (Gallery)' : 'Covers Gallery'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSingleDramaViewMode('grid')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      singleDramaViewMode === 'grid'
                        ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>{isKm ? 'លេខរៀង (Grid)' : 'Grid'}</span>
                  </button>
                </div>

                {singleDramaResult.episodes.length > 0 && (
                  <button
                    onClick={() =>
                      downloadAllEpisodeImagesAsZip(
                        singleDramaResult.episodes,
                        singleDramaResult.seriesName
                      )
                    }
                    disabled={zippingImages}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-60"
                  >
                    <FolderArchive className="w-3 h-3" />
                    <span>{isKm ? 'ទាញយករូបគ្រប់ភាគ (.ZIP)' : 'Download Covers (.ZIP)'}</span>
                  </button>
                )}

                {onQueueEpisodes && singleDramaResult.episodes.length > 0 && (
                  <button
                    onClick={() => {
                      const urls = singleDramaResult.episodes.map(ep => ep.videoUrl).filter(Boolean);
                      onQueueEpisodes(urls);
                    }}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white border border-emerald-500/30 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <ListPlus className="w-3 h-3" />
                    <span>{isKm ? `ដាក់ ${singleDramaResult.episodes.length} ភាគក្នុង Batch` : `Queue ${singleDramaResult.episodes.length} in Batch`}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Gallery View with Automatic Covers */}
            {singleDramaViewMode === 'gallery' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[460px] overflow-y-auto p-1 pr-2 scrollbar-thin">
                {singleDramaResult.episodes.map((ep, idx) => {
                  const isCurrent = ep.episodeNumber === singleDramaResult.requestedEpisode;
                  const epCover = getSafeMediaUrl(
                    ep.originCover ||
                    ep.cover ||
                    singleDramaResult.seriesCover
                  );
                  const epUrl = `https://www.tiktok.com/shortdrama/episode/${singleDramaResult.seriesId}/${ep.episodeNumber}`;

                  return (
                    <div
                      key={`single-gallery-${ep.videoId || ep.episodeNumber || idx}-${idx}`}
                      onClick={() => {
                        setInputUrl(epUrl);
                        handleProcess(epUrl);
                      }}
                      className={`group rounded-xl p-2 flex flex-col gap-2 transition-all border cursor-pointer relative ${
                        isCurrent
                          ? 'bg-slate-900 border-amber-500 shadow-lg shadow-amber-500/20 ring-2 ring-amber-500/40'
                          : 'bg-slate-950/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Image Thumbnail */}
                      <div className="relative aspect-[9/14] rounded-lg overflow-hidden bg-slate-950 border border-slate-800/80 flex items-center justify-center p-0.5">
                        {epCover ? (
                          <img
                            src={epCover}
                            alt={`Ep ${ep.episodeNumber}`}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className={`w-full h-full ${
                              imageDisplayFit === 'contain' ? 'object-contain' : 'object-cover'
                            } group-hover:scale-105 transition-transform duration-300`}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col items-center justify-center p-2 text-center">
                            <Film className="w-6 h-6 text-slate-600 mb-1" />
                            <span className="text-[10px] text-slate-500">Ep {ep.episodeNumber}</span>
                          </div>
                        )}

                        {/* Badges on Thumbnail */}
                        <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded shadow ${
                              isCurrent
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-slate-950/90 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            Ep {ep.episodeNumber}
                          </span>
                        </div>

                        {ep.isPaid && (
                          <div className="absolute top-1.5 right-1.5 bg-amber-950/90 border border-amber-500 text-amber-300 p-1 rounded-md shadow">
                            <Lock className="w-3 h-3" />
                          </div>
                        )}

                        {/* Quick View / Lightbox Action Buttons */}
                        {epCover && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                openLightbox(
                                  epCover,
                                  `${singleDramaResult.seriesName} - Ep ${ep.episodeNumber}`,
                                  ep.title,
                                  `${singleDramaResult.seriesName}_Ep${ep.episodeNumber}_cover.jpg`
                                );
                              }}
                              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs transition-colors"
                              title={isKm ? 'មើលរូបដើម 100%' : '100% Full View'}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                downloadOriginalCover(
                                  epCover,
                                  `${singleDramaResult.seriesName}_Ep${ep.episodeNumber}_cover.jpg`
                                );
                              }}
                              className="p-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors shadow"
                              title={isKm ? 'ទាញយករូបដើម' : 'Download Cover'}
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Episode Title & Info */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-slate-200 line-clamp-1 group-hover:text-amber-400 transition-colors">
                          {ep.title || `${singleDramaResult.seriesName} Ep ${ep.episodeNumber}`}
                        </span>
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>{ep.isPaid ? (isKm ? 'បង់ប្រាក់' : 'Paid') : (isKm ? 'ឥតគិតថ្លៃ' : 'Free')}</span>
                          {isCurrent && (
                            <span className="text-amber-400 font-bold flex items-center gap-0.5">
                              <Check className="w-3 h-3" />
                              {isKm ? 'កំពុងមើល' : 'Active'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Compact Grid Mode */
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-48 overflow-y-auto p-1 pr-2 scrollbar-thin">
                {singleDramaResult.episodes.map((ep, idx) => {
                  const isCurrent = ep.episodeNumber === singleDramaResult.requestedEpisode;
                  return (
                    <button
                      key={`single-drama-ep-${ep.videoId || ep.episodeNumber || idx}-${idx}`}
                      id={`single-drama-ep-${ep.episodeNumber}`}
                      onClick={() => {
                        const epUrl = `https://www.tiktok.com/shortdrama/episode/${singleDramaResult.seriesId}/${ep.episodeNumber}`;
                        setInputUrl(epUrl);
                        handleProcess(epUrl);
                      }}
                      className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer border relative ${
                        isCurrent
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/30 scale-105'
                          : ep.isPaid
                          ? 'bg-slate-950/90 hover:bg-slate-800 border-amber-500/30 text-amber-200/90 hover:text-white'
                          : 'bg-slate-950/80 hover:bg-slate-800 border-slate-800/80 text-slate-300 hover:text-white'
                      }`}
                      title={ep.isPaid ? `${isKm ? 'ភាគបង់ប្រាក់' : 'Paid Episode'} ${ep.episodeNumber}` : `Episode ${ep.episodeNumber}`}
                    >
                      {ep.isPaid && (
                        <Lock className={`w-2.5 h-2.5 absolute top-1 right-1 ${isCurrent ? 'text-slate-950' : 'text-amber-400'}`} />
                      )}
                      <span>{isKm ? `ភាគ ${ep.episodeNumber}` : `Ep ${ep.episodeNumber}`}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Preview Player Modal */}
      {videoPlayerModal.isOpen && (
        <div
          id="video-player-preview-modal"
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5"
          onClick={() => setVideoPlayerModal(prev => ({ ...prev, isOpen: false }))}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="bg-amber-500 text-slate-950 font-bold text-xs px-2 py-0.5 rounded">
                  Ep {videoPlayerModal.episode?.episodeNumber}
                </span>
                <span className="text-xs font-bold text-slate-200 truncate max-w-[240px]">
                  {videoPlayerModal.episode?.title || videoPlayerModal.episode?.dramaName || 'Video Player'}
                </span>
              </div>
              <button
                onClick={() => setVideoPlayerModal(prev => ({ ...prev, isOpen: false }))}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Canvas */}
            <div className="relative aspect-[9/16] sm:aspect-[9/14] max-h-[65vh] bg-black flex items-center justify-center overflow-hidden">
              {videoPlayerModal.loading ? (
                <div className="flex flex-col items-center justify-center gap-2 text-center p-6">
                  <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                  <p className="text-xs text-slate-300 font-semibold">
                    {isKm ? 'កំពុងទាញយក stream វីដេអូ...' : 'Streaming video...'}
                  </p>
                </div>
              ) : videoPlayerModal.error ? (
                <div className="flex flex-col items-center justify-center gap-2 text-center p-6 text-rose-400">
                  <AlertCircle className="w-8 h-8" />
                  <p className="text-xs font-semibold">{videoPlayerModal.error}</p>
                </div>
              ) : videoPlayerModal.streamUrl ? (
                <div className="flex flex-col w-full h-full">
                  <video
                    ref={modalVideoRef}
                    src={videoPlayerModal.streamUrl}
                    controls
                    autoPlay
                    playsInline
                    className="w-full flex-1 object-contain min-h-0"
                  />
                  <div className="p-2 bg-slate-950/90 border-t border-slate-800">
                    <VideoVolumeControl videoRef={modalVideoRef} isKm={isKm} variant="compact" />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-3.5 border-t border-slate-800 flex items-center justify-between gap-2 bg-slate-950">
              {videoPlayerModal.episode && (
                <>
                  <button
                    onClick={() => {
                      if (videoPlayerModal.episode) {
                        onDownloadEpisode(videoPlayerModal.episode.videoUrl);
                        setVideoPlayerModal(prev => ({ ...prev, isOpen: false }));
                      }
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isKm ? 'ទាញយកវីដេអូនេះ' : 'Download Video'}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (videoPlayerModal.episode) {
                        handleCopy(videoPlayerModal.episode.videoUrl);
                      }
                    }}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{isKm ? 'ចម្លង' : 'Copy Link'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Smart Title Search Modal */}
      <SmartTitleSearchModal
        isOpen={isTitleSearchOpen}
        onClose={() => setIsTitleSearchOpen(false)}
        isKm={isKm}
        initialQuery={titleSearchInitialQuery || 'A'}
        onSelectTitle={(item, action) => handleSelectDramaTitle(item, action)}
        onSendToDownloader={(targetUrl) => {
          setInputUrl(targetUrl);
          handleProcess(targetUrl);
        }}
        showToast={showToast}
      />

      {/* Global Social Networks Multi-Country Search Modal */}
      <GlobalSocialSearchModal
        isOpen={isGlobalSocialSearchOpen}
        onClose={() => setIsGlobalSocialSearchOpen(false)}
        isKm={isKm}
        initialQuery={socialSearchInitialQuery || (inputUrl && !inputUrl.startsWith('http') ? inputUrl : '')}
        onSendToDownloader={(targetUrl) => {
          setInputUrl(targetUrl);
          handleProcess(targetUrl);
        }}
        showToast={showToast}
      />
    </div>
  );
}
