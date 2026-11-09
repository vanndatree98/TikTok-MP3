import React, { useState, useRef, useEffect } from 'react';
import {
  ListPlus,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Film,
  Music,
  Download,
  Trash2,
  Copy,
  ExternalLink,
  Layers,
  Sparkles,
  Zap,
  ArrowRight,
  Check,
  RefreshCw,
  X,
  Eye,
  Filter,
  SkipForward,
  ArrowDownToLine,
  Tv,
  Clock,
  Timer,
  Bell,
  CheckSquare,
  Square,
  MinusSquare,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { VideoInfo, HistoryItem, AppSettings, QueueItem, QueueItemStatus } from '../types';
import { TIKTOK_DRAMA_CHANNELS } from '../data/dramaChannels';
import VideoVolumeControl from './VideoVolumeControl';
import {
  BatchQueueSchedulerModal,
  BatchQueueSchedulerBanner,
  playSchedulerStartChime
} from './BatchQueueScheduler';
import { notifyLargeDownloadComplete, playDownloadCompleteSound } from '../utils/notificationHelper';

interface Props {
  isKm: boolean;
  settings: AppSettings;
  onAddToHistory: (item: HistoryItem) => void;
  showToast: (msg: string) => void;
  generateFilename: (video: VideoInfo, format: 'mp4' | 'mp3', targetQuality?: '4k' | '1080p' | '720p' | '480p') => string;
  initialUrls?: string[];
  autoStart?: boolean;
}

const SAMPLE_BATCH_URLS = [
  'https://www.tiktok.com/@stardustdrama_mx/video/7683292586500492565',
  'https://www.tiktok.com/@stardustdrama_mx/video/7683292610777091349',
  'https://www.tiktok.com/@stardustdrama_mx/video/7683292631589342485'
];

export default function BatchDownloader({
  isKm,
  settings,
  onAddToHistory,
  showToast,
  generateFilename,
  initialUrls = [],
  autoStart = false
}: Props) {
  const [inputText, setInputText] = useState(() => initialUrls.join('\n'));
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [defaultFormat, setDefaultFormat] = useState<'mp4' | 'mp3'>('mp4');
  const [previewVideo, setPreviewVideo] = useState<VideoInfo | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'paused' | 'error'>('all');
  const [copiedAllUrls, setCopiedAllUrls] = useState(false);
  const [copiedSelectedUrls, setCopiedSelectedUrls] = useState(false);

  // Delayed Start Scheduler State
  const [isSchedulerModalOpen, setIsSchedulerModalOpen] = useState(false);
  const [scheduledStartTime, setScheduledStartTime] = useState<number | null>(null);
  const [scheduledDurationMs, setScheduledDurationMs] = useState<number>(0);

  // Auto retry failed episode until success settings
  const [autoRetry, setAutoRetry] = useState(() => settings.autoRetryFailed ?? true);
  const [maxRetries, setMaxRetries] = useState(() => settings.maxRetryAttempts ?? 0);

  useEffect(() => {
    if (settings.autoRetryFailed !== undefined) {
      setAutoRetry(settings.autoRetryFailed);
    }
    if (settings.maxRetryAttempts !== undefined) {
      setMaxRetries(settings.maxRetryAttempts);
    }
  }, [settings.autoRetryFailed, settings.maxRetryAttempts]);

  const handleToggleAutoRetry = () => {
    setAutoRetry(prev => {
      const next = !prev;
      try {
        const saved = localStorage.getItem('svd_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          localStorage.setItem('svd_settings', JSON.stringify({ ...parsed, autoRetryFailed: next }));
        }
      } catch {}
      return next;
    });
  };

  const handleSelectMaxRetries = (count: number) => {
    setMaxRetries(count);
    try {
      const saved = localStorage.getItem('svd_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        localStorage.setItem('svd_settings', JSON.stringify({ ...parsed, maxRetryAttempts: count }));
      }
    } catch {}
    showToast(
      count === 0
        ? (isKm ? 'បានជ្រើសរើស៖ ព្យាយាមឡើងវិញមិនកំណត់ ជាចម្បង (រហូតបានជោគជ័យ)' : 'Selected: Unlimited retries as primary choice (until success)')
        : (isKm ? `បានកំណត់ព្យាយាមឡើងវិញអតិបរមា ${count} ដង` : `Set max retry attempts: ${count}`)
    );
  };

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const isProcessingRef = useRef(isProcessing);
  isProcessingRef.current = isProcessing;

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentItemAbortControllerRef = useRef<{ id: string; controller: AbortController } | null>(null);
  const startQueueExecutionRef = useRef<() => Promise<void>>();
  const batchPreviewVideoRef = useRef<HTMLVideoElement | null>(null);

  // Restore persisted scheduler if in future
  useEffect(() => {
    try {
      const saved = localStorage.getItem('svd_batch_schedule');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.scheduledStartTime && parsed.scheduledStartTime > Date.now()) {
          setScheduledStartTime(parsed.scheduledStartTime);
          setScheduledDurationMs(
            parsed.scheduledDurationMs || Math.max(1000, parsed.scheduledStartTime - Date.now())
          );
        } else {
          localStorage.removeItem('svd_batch_schedule');
        }
      }
    } catch {}
  }, []);

  // Save schedule state whenever it changes
  useEffect(() => {
    try {
      if (scheduledStartTime && scheduledStartTime > Date.now()) {
        localStorage.setItem(
          'svd_batch_schedule',
          JSON.stringify({ scheduledStartTime, scheduledDurationMs })
        );
      } else if (!scheduledStartTime) {
        localStorage.removeItem('svd_batch_schedule');
      }
    } catch {}
  }, [scheduledStartTime, scheduledDurationMs]);

  // Scheduled timer tick
  useEffect(() => {
    if (!scheduledStartTime) return;

    const checkInterval = setInterval(() => {
      const now = Date.now();
      if (now >= scheduledStartTime) {
        clearInterval(checkInterval);
        setScheduledStartTime(null);
        try {
          localStorage.removeItem('svd_batch_schedule');
        } catch {}
        playSchedulerStartChime();
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification(isKm ? 'កាលវិភាគទាញយកបានចាប់ផ្តើម' : 'Batch Download Started', {
              body: isKm
                ? 'ដល់ម៉ោងកាលវិភាគហើយ! កំពុងចាប់ផ្តើមទាញយកវីដេអូទាំងអស់...'
                : 'Scheduled time reached! Starting batch download process...',
              icon: '/favicon.ico'
            });
          } catch {}
        }
        showToast(
          isKm
            ? '⏰ ដល់ម៉ោងកាលវិភាគហើយ! កំពុងចាប់ផ្តើមទាញយក Batch Queue...'
            : '⏰ Scheduled time reached! Starting batch downloads...'
        );
        startQueueExecutionRef.current?.();
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [scheduledStartTime, isKm]);

  const handleSchedule = (delayMs: number, targetTimestamp: number) => {
    setScheduledStartTime(targetTimestamp);
    setScheduledDurationMs(delayMs);
    const d = new Date(targetTimestamp);
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    showToast(
      isKm
        ? `បានកំណត់កាលវិភាគទាញយកនៅម៉ោង ${timeStr}`
        : `Scheduled batch downloads to start at ${timeStr}`
    );
  };

  const handleCancelSchedule = () => {
    setScheduledStartTime(null);
    try {
      localStorage.removeItem('svd_batch_schedule');
    } catch {}
    showToast(isKm ? 'បានបោះបង់កាលវិភាគទាញយក' : 'Cancelled scheduled download');
  };

  const handleAddScheduleMinutes = (mins: number) => {
    if (!scheduledStartTime) return;
    const nextTarget = scheduledStartTime + mins * 60 * 1000;
    const nextDuration = (scheduledDurationMs || 0) + mins * 60 * 1000;
    setScheduledStartTime(nextTarget);
    setScheduledDurationMs(nextDuration);
    showToast(isKm ? `បានបន្ថែម ${mins} នាទីលើកាលវិភាគ` : `Added ${mins} minutes to schedule`);
  };

  const handleStartScheduledNow = () => {
    setScheduledStartTime(null);
    try {
      localStorage.removeItem('svd_batch_schedule');
    } catch {}
    showToast(isKm ? 'ចាប់ផ្តើមទាញយកឥឡូវនេះ...' : 'Starting queue now...');
    startQueueExecutionRef.current?.();
  };

  const handleScheduleFromInput = () => {
    if (queue.length === 0 && detectedUrls.length > 0) {
      handleAddToQueue(true, selectedInputUrls.size > 0 && selectedInputUrls.size < detectedUrls.length);
    }
    setIsSchedulerModalOpen(true);
  };

  const handlePauseItem = (id: string) => {
    if (currentItemAbortControllerRef.current?.id === id) {
      try {
        currentItemAbortControllerRef.current.controller.abort();
      } catch {}
    }
    updateItem(id, {
      status: 'paused',
      retryCountdown: undefined
    });
    showToast(isKm ? 'បានផ្អាកការទាញយកភាគនេះ' : 'Paused this episode');
  };

  const handleResumeItem = (id: string) => {
    setQueue(prev =>
      prev.map(item => {
        if (item.id === id) {
          return {
            ...item,
            status: item.data ? 'ready' : 'pending',
            error: undefined,
            isSkipped: false
          };
        }
        return item;
      })
    );
    showToast(isKm ? 'បានបន្តការទាញយកភាគនេះ' : 'Resumed this episode');
    if (!isProcessingRef.current) {
      setTimeout(() => {
        startQueueExecutionRef.current?.();
      }, 50);
    }
  };

  // If initialUrls were passed, populate exact queue without extra links
  useEffect(() => {
    if (initialUrls && initialUrls.length > 0) {
      const cleanUrls = initialUrls.map(u => u.trim()).filter(Boolean);
      const items: QueueItem[] = cleanUrls.map((url, idx) => ({
        id: `queue-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        rawUrl: url,
        status: 'pending' as QueueItemStatus,
        progress: 0,
        format: defaultFormat
      }));
      setQueue(items);
      setInputText(cleanUrls.join('\n'));

      if (autoStart) {
        setTimeout(() => {
          if (!isProcessingRef.current) {
            startQueueExecutionRef.current?.();
          }
        }, 400);
      }
    }
  }, [initialUrls, autoStart]);

  const [isExpandingCreator, setIsExpandingCreator] = useState(false);
  const [isCheckingAll, setIsCheckingAll] = useState(false);

  // Parse lines to get clean valid URLs (1 URL per line, exact count without extra links)
  const parseLinesToUrls = (text: string): string[] => {
    const rawLines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const parsedUrls: string[] = [];
    const seen = new Set<string>();

    for (const line of rawLines) {
      const urlMatch = line.match(/https?:\/\/[^\s]+/i);
      let cleanUrl = urlMatch ? urlMatch[0].replace(/[)\]}>,;]+$/, '') : line;
      cleanUrl = cleanUrl.replace(/^@+(https?:\/\/)/i, '$1');

      if (
        cleanUrl.includes('tiktok.com') ||
        cleanUrl.includes('douyin') ||
        cleanUrl.includes('挽风') ||
        cleanUrl.includes('wanfeng') ||
        cleanUrl.startsWith('http') ||
        cleanUrl.startsWith('@')
      ) {
        if (!seen.has(cleanUrl)) {
          seen.add(cleanUrl);
          parsedUrls.push(cleanUrl);
        }
      }
    }
    return parsedUrls;
  };

  const detectedUrls = parseLinesToUrls(inputText);

  // Input URLs Select All / Deselect All State for managing large lists of pasted URLs
  const [selectedInputUrls, setSelectedInputUrls] = useState<Set<string>>(() => new Set(detectedUrls));
  const [isUrlManagerOpen, setIsUrlManagerOpen] = useState(false);
  const selectAllInputCheckboxRef = useRef<HTMLInputElement | null>(null);

  // Sync selectedInputUrls when detectedUrls change
  useEffect(() => {
    setSelectedInputUrls(prev => {
      const next = new Set<string>();
      let retainedCount = 0;
      detectedUrls.forEach(url => {
        if (prev.has(url)) {
          next.add(url);
          retainedCount++;
        }
      });
      // Default to selecting all detected URLs if newly pasted or fresh input
      if (retainedCount === 0 && detectedUrls.length > 0) {
        return new Set(detectedUrls);
      }
      return next;
    });
  }, [inputText]);

  const isAllInputSelected = detectedUrls.length > 0 && detectedUrls.every(u => selectedInputUrls.has(u));
  const isSomeInputSelected = detectedUrls.some(u => selectedInputUrls.has(u)) && !isAllInputSelected;

  useEffect(() => {
    if (selectAllInputCheckboxRef.current) {
      selectAllInputCheckboxRef.current.indeterminate = isSomeInputSelected;
    }
  }, [isSomeInputSelected]);

  const handleToggleSelectAllInputUrls = () => {
    if (isAllInputSelected) {
      setSelectedInputUrls(new Set());
      showToast(isKm ? 'បានដោះការជ្រើសរើស URL ទាំងអស់ (Deselected All)' : 'Deselected all URLs');
    } else {
      setSelectedInputUrls(new Set(detectedUrls));
      showToast(isKm ? `បានជ្រើសរើស URL ទាំងអស់ (${detectedUrls.length})` : `Selected all ${detectedUrls.length} URLs`);
    }
  };

  const handleSelectAllInputUrls = () => {
    setSelectedInputUrls(new Set(detectedUrls));
    showToast(isKm ? `បានជ្រើសរើស URL ទាំងអស់ (${detectedUrls.length})` : `Selected all ${detectedUrls.length} URLs`);
  };

  const handleDeselectAllInputUrls = () => {
    setSelectedInputUrls(new Set());
    showToast(isKm ? 'បានដោះការជ្រើសរើស URL ទាំងអស់ (Deselected All)' : 'Deselected all URLs');
  };

  const handleToggleSelectInputUrl = (url: string) => {
    setSelectedInputUrls(prev => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  const handleInvertInputSelection = () => {
    setSelectedInputUrls(prev => {
      const next = new Set<string>();
      detectedUrls.forEach(u => {
        if (!prev.has(u)) next.add(u);
      });
      return next;
    });
    showToast(isKm ? 'បានផ្លាស់ប្តូរការជ្រើសរើសបញ្ច្រាស' : 'Inverted URL selection');
  };

  const handleRemoveDeselectedFromInput = () => {
    const remaining = detectedUrls.filter(u => selectedInputUrls.has(u));
    setInputText(remaining.join('\n'));
    showToast(
      isKm
        ? `បានដកចេញ ${detectedUrls.length - remaining.length} URL ដែលមិនបានជ្រើសរើស`
        : `Removed ${detectedUrls.length - remaining.length} unselected URLs`
    );
  };

  const handleRemoveSingleInputUrl = (urlToRemove: string) => {
    const remaining = detectedUrls.filter(u => u !== urlToRemove);
    setInputText(remaining.join('\n'));
  };

  // Check if inputText contains any Creator Profile or Short Drama link without /video/ or /photo/
  const creatorOrDramaLinks = detectedUrls.filter(
    u => !u.includes('/video/') && !u.includes('/photo/') && (
      u.includes('/@') ||
      u.startsWith('@') ||
      u.includes('shortdrama') ||
      u.includes('/series/') ||
      u.includes('douyin') ||
      u.includes('挽风') ||
      u.includes('wanfeng')
    )
  );

  const handleExpandCreatorDramas = async () => {
    if (creatorOrDramaLinks.length === 0) return;
    setIsExpandingCreator(true);
    showToast(isKm ? 'កំពុងស្កេនរកភាគរឿងពី Creator Profile...' : 'Scanning creator dramas & episodes...');

    try {
      const allExtractedUrls: string[] = [];

      for (const targetUrl of creatorOrDramaLinks) {
        if (targetUrl.includes('douyin') || targetUrl.includes('挽风') || targetUrl.includes('wanfeng')) {
          const scanRes = await fetch(`/api/scan-douyin-creator?query=${encodeURIComponent(targetUrl)}`);
          const scanData = await scanRes.json();
          if (scanData.success && scanData.videos && scanData.videos.length > 0) {
            allExtractedUrls.push(...scanData.videos.map((v: any) => v.videoUrl));
          }
        } else if (targetUrl.includes('/@') && !targetUrl.includes('shortdrama') && !targetUrl.includes('/series/')) {
          const scanRes = await fetch(`/api/scan-creator-dramas?url=${encodeURIComponent(targetUrl)}`);
          const scanData = await scanRes.json();
          if (scanData.success && scanData.dramaList && scanData.dramaList.length > 0) {
            const topDrama = scanData.dramaList[0];
            const epRes = await fetch(`/api/drama-episodes?dramaId=${topDrama.dramaID}&fetchAll=true`);
            const epData = await epRes.json();
            if (epData.success && epData.episodes) {
              allExtractedUrls.push(...epData.episodes.map((e: any) => e.videoUrl));
            }
          }
        } else {
          const dramaRes = await fetch('/api/convert-shortdrama', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: targetUrl })
          });
          const dramaData = await dramaRes.json();
          if (dramaData.success && dramaData.episodes) {
            allExtractedUrls.push(...dramaData.episodes.map((e: any) => e.videoUrl));
          }
        }
      }

      if (allExtractedUrls.length > 0) {
        const regularUrls = detectedUrls.filter(u => u.includes('/video/'));
        const mergedUrls = [...new Set([...regularUrls, ...allExtractedUrls])];
        setInputText(mergedUrls.join('\n'));
        showToast(
          isKm
            ? `បានពង្រីកជោគជ័យចំនួន ${allExtractedUrls.length} វីដេអូ/ភាគរឿងចូលក្នុងប្រអប់!`
            : `Expanded ${allExtractedUrls.length} videos/episodes into the input box!`
        );
      } else {
        showToast(isKm ? 'មិនមានភាគរឿងដើម្បីពង្រីកទេ' : 'No episodes found to expand');
      }
    } catch (e: any) {
      console.error(e);
      showToast(isKm ? 'មានបញ្ហាក្នុងការស្កេនភាគរឿង' : 'Error scanning episodes');
    } finally {
      setIsExpandingCreator(false);
    }
  };

  // Handle dropping URLs from textarea into the Queue (Exact count: strictly no extra links)
  const handleAddToQueue = (replace = true, onlySelected = false) => {
    const targetUrls = onlySelected
      ? detectedUrls.filter(u => selectedInputUrls.has(u))
      : detectedUrls;

    if (targetUrls.length === 0) {
      showToast(
        isKm
          ? (onlySelected ? 'សូមជ្រើសរើស URL យ៉ាងហោចណាស់ 1 តាមរយៈ Checkbox' : 'សូមបញ្ចូលតំណភ្ជាប់វីដេអូយ៉ាងហោចណាស់ 1 (1 Link ក្នុងមួយជួរ)')
          : (onlySelected ? 'Please select at least 1 URL with checkbox' : 'Please enter at least 1 valid video URL (1 per line)')
      );
      return;
    }

    const newItems: QueueItem[] = targetUrls.map((rawUrl, idx) => ({
      id: `queue-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      rawUrl,
      status: 'pending',
      progress: 0,
      format: defaultFormat
    }));

    if (replace) {
      setQueue(newItems);
      showToast(
        isKm
          ? `បានទម្លាក់ ${newItems.length} វីដេអូទៅផ្ទាំងទាញយកត្រឹមត្រូវ (គ្មាន link បន្ថែម)!`
          : `Dropped exactly ${newItems.length} videos to download queue (no extra links)!`
      );
    } else {
      setQueue(prev => [...prev, ...newItems]);
      showToast(
        isKm
          ? `បានបន្ថែម ${newItems.length} តំណភ្ជាប់ថ្មីចូលក្នុងជួរទាញយក!`
          : `Added ${newItems.length} links to download queue!`
      );
    }

    // Auto-trigger instant turbo pre-check for the first items in background
    setTimeout(() => {
      newItems.slice(0, 4).forEach(it => {
        fastPreResolveItem(it.id, it.rawUrl);
      });
    }, 100);

    // Smooth scroll down to batch queue dashboard
    setTimeout(() => {
      document.getElementById('batch-queue-dashboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText(prev => (prev ? `${prev}\n${text.trim()}` : text.trim()));
        showToast(isKm ? 'បានបិទភ្ជាប់តំណភ្ជាប់ពី Clipboard' : 'Pasted links from clipboard');
      }
    } catch {
      showToast(isKm ? 'សូមបិទភ្ជាប់ (Ctrl+V / Cmd+V) ដោយផ្ទាល់ក្នុងប្រអប់' : 'Please paste directly into the box');
    }
  };

  const handleLoadSampleBatch = () => {
    setInputText(SAMPLE_BATCH_URLS.join('\n'));
    showToast(isKm ? 'បានបញ្ចូលតំណភ្ជាប់គំរូចំនួន 3' : 'Loaded 3 sample TikTok video links');
  };

  const handleLoadDramaChannelsBatch = () => {
    const urls = TIKTOK_DRAMA_CHANNELS.map(c => c.url);
    setInputText(urls.join('\n'));
    showToast(
      isKm
        ? 'បានបញ្ចូលតំណភ្ជាប់ប៉ុស្តិ៍រឿងភាគទាំង ២០ ទៅក្នុង Batch Queue!'
        : 'Loaded all 20 Drama Channel URLs into Batch Queue!'
    );
  };

  const updateItem = (id: string, updates: Partial<QueueItem>) => {
    setQueue(prev =>
      prev.map(item => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const getLatestItem = (id: string): Promise<QueueItem | undefined> => {
    return new Promise(resolve => {
      setQueue(prev => {
        const found = prev.find(item => item.id === id);
        resolve(found);
        return prev;
      });
    });
  };

  const handleSkipItem = (id: string) => {
    updateItem(id, {
      isSkipped: true,
      status: 'error',
      error: isKm ? 'បានរំលងភាគនេះដោយអ្នកប្រើប្រាស់' : 'Skipped by user',
      retryCountdown: undefined
    });
    showToast(isKm ? 'បានរំលងភាគនេះ ទៅទាញយកភាគបន្ទាប់' : 'Skipped this episode, proceeding to next');
  };

  const handleRemoveItem = (id: string) => {
    const targetId = String(id || '').trim();
    if (currentItemAbortControllerRef.current?.id === targetId) {
      try {
        currentItemAbortControllerRef.current.controller.abort();
      } catch {}
    }
    setQueue(prev => prev.filter(item => String(item.id).trim() !== targetId));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      next.delete(targetId);
      return next;
    });
    showToast(isKm ? 'បានលុបចេញពីជួរជោគជ័យ' : 'Removed item from queue');
  };

  const handleClearQueue = () => {
    if (isProcessing) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsProcessing(false);
      setIsPaused(false);
    }
    setScheduledStartTime(null);
    setQueue([]);
    showToast(isKm ? 'បានសម្អាតជួរទាញយកទាំងអស់' : 'Cleared download queue');
  };

  const handleClearCompleted = () => {
    setQueue(prev => prev.filter(item => item.status !== 'completed'));
    showToast(isKm ? 'បានលុបវីដេអូដែលបានទាញយករួចចេញពីជួរ' : 'Cleared completed downloads');
  };

  // Copy all URLs currently in the queue into a single newline-separated text block
  const handleCopyAllUrls = async () => {
    if (queue.length === 0) {
      showToast(isKm ? 'មិនមាន URL នៅក្នុងជួរដើម្បីចម្លងទេ' : 'No URLs currently in queue to copy');
      return;
    }

    // Aggregate every URL currently in the queue into a single newline-separated text block
    const allUrlsText = queue.map(item => item.url).filter(Boolean).join('\n');

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(allUrlsText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = allUrlsText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedAllUrls(true);
      showToast(
        isKm
          ? `បានចម្លង URL ទាំង ${queue.length} ក្នុងជួរ (Newline-separated) ចូល Clipboard រួចរាល់!`
          : `Copied all ${queue.length} URLs in queue to clipboard!`
      );
      setTimeout(() => setCopiedAllUrls(false), 2500);
    } catch (err) {
      console.error('Failed to copy all URLs:', err);
      showToast(isKm ? 'បរាជ័យក្នុងការចម្លង URL ទៅកាន់ Clipboard' : 'Failed to copy URLs to clipboard');
    }
  };

  // Copy selected URLs in the queue
  const handleCopySelectedUrls = async () => {
    const selectedItems = queue.filter(item => selectedIds.has(item.id));
    if (selectedItems.length === 0) return;

    const selectedUrlsText = selectedItems.map(item => item.url).filter(Boolean).join('\n');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(selectedUrlsText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = selectedUrlsText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedSelectedUrls(true);
      showToast(
        isKm
          ? `បានចម្លង ${selectedItems.length} URL ដែលបានជ្រើសរើសរួចរាល់!`
          : `Copied ${selectedItems.length} selected URLs to clipboard!`
      );
      setTimeout(() => setCopiedSelectedUrls(false), 2500);
    } catch (err) {
      console.error('Failed to copy selected URLs:', err);
      showToast(isKm ? 'បរាជ័យក្នុងការចម្លង URL' : 'Failed to copy URLs');
    }
  };

  const handleSetAllFormat = (fmt: 'mp4' | 'mp3') => {
    setDefaultFormat(fmt);
    setQueue(prev =>
      prev.map(item =>
        item.status === 'completed' || item.status === 'downloading'
          ? item
          : { ...item, format: fmt }
      )
    );
    showToast(isKm ? `បានប្តូរគ្រប់វីដេអូក្នុងជួរទៅជា ${fmt.toUpperCase()}` : `Changed all queue items to ${fmt.toUpperCase()}`);
  };

  // Fast pre-resolve helper for individual queue items
  const fastPreResolveItem = async (itemId: string, rawUrl: string) => {
    try {
      let targetQueryUrl = rawUrl.trim();
      if (
        !targetQueryUrl.includes('/video/') &&
        !targetQueryUrl.includes('/photo/') &&
        (targetQueryUrl.includes('/@') || targetQueryUrl.includes('shortdrama') || targetQueryUrl.includes('/series/'))
      ) {
        try {
          const convRes = await fetch('/api/convert-shortdrama', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: targetQueryUrl })
          });
          const convJson = await convRes.json();
          if (convJson.success && convJson.convertedUrl) {
            targetQueryUrl = convJson.convertedUrl;
            updateItem(itemId, { rawUrl: targetQueryUrl });
          }
        } catch {}
      }

      const res = await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetQueryUrl })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        updateItem(itemId, { data: json, status: 'ready', progress: 0, error: undefined });
      }
    } catch {
      // background resolve will be retried when downloaded
    }
  };

  // Helper to download single item
  const processSingleQueueItem = async (item: QueueItem, signal: AbortSignal) => {
    // 1. Resolve video if not yet resolved
    let videoData = item.data;
    if (!videoData) {
      updateItem(item.id, { status: 'resolving', progress: 10, error: undefined });

      let targetQueryUrl = item.rawUrl.trim();

      // If URL is a creator profile or short drama link without /video/, convert it first
      if (
        !targetQueryUrl.includes('/video/') &&
        !targetQueryUrl.includes('/photo/') &&
        (targetQueryUrl.includes('/@') || targetQueryUrl.includes('shortdrama') || targetQueryUrl.includes('/series/'))
      ) {
        try {
          const convRes = await fetch('/api/convert-shortdrama', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: targetQueryUrl }),
            signal
          });
          const convJson = await convRes.json();
          if (convJson.success && convJson.convertedUrl) {
            targetQueryUrl = convJson.convertedUrl;
            updateItem(item.id, { rawUrl: targetQueryUrl });
          }
        } catch (e) {
          console.warn('Queue auto-convert fallback:', e);
        }
      }

      const res = await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetQueryUrl }),
        signal
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || (isKm ? 'មិនអាចទាញយកព័ត៌មានវីដេអូបានទេ' : 'Failed to fetch video data'));
      }
      videoData = json;
      updateItem(item.id, { data: videoData, progress: 30, status: 'ready' });
    }

    // 2. Download binary stream
    updateItem(item.id, { status: 'downloading', progress: 35 });
    const chosenQuality = settings.defaultQuality || '1080p';
    const qualityOption = videoData.qualities?.find(q => q.id === chosenQuality);
    const streamUrl = qualityOption?.url || videoData.videoUrl;

    const baseFilename = generateFilename(videoData, item.format, item.format === 'mp4' ? chosenQuality : undefined);
    let filename = baseFilename;
    if (item.format === 'mp4' && chosenQuality) {
      const ext = '.mp4';
      const nameWithoutExt = baseFilename.replace(/\.[^/.]+$/, '');
      const qualityTag = chosenQuality === '4k' ? '_4K_UHD' : chosenQuality === '1080p' ? '_1080p_FHD' : chosenQuality === '720p' ? '_720p_HD' : '_480p_SD';
      if (!nameWithoutExt.toLowerCase().includes(chosenQuality.toLowerCase()) && !nameWithoutExt.toLowerCase().includes(qualityTag.toLowerCase())) {
        filename = `${nameWithoutExt}${qualityTag}${ext}`;
      }
    }

    const downloadUrl = `/api/download?url=${encodeURIComponent(streamUrl)}&sourceUrl=${encodeURIComponent(videoData.sourceUrl || '')}&format=${item.format}&quality=${chosenQuality}&filename=${encodeURIComponent(filename.replace(/\.[^/.]+$/, ''))}&bitrate=${settings.audioBitrate}`;

    const response = await fetch(downloadUrl, { signal });
    if (!response.ok) {
      throw new Error(isKm ? 'ការទាញយកពី Server បរាជ័យ' : 'Download request failed');
    }

    const contentLength = +(response.headers.get('content-length') || 0);
    const reader = response.body?.getReader();

    if (reader) {
      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        if (signal.aborted) {
          reader.cancel();
          throw new Error('Download aborted');
        }
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          if (contentLength > 0) {
            const pct = Math.min(99, 35 + Math.round((received / contentLength) * 60));
            updateItem(item.id, { progress: pct });
          }
        }
      }

      const mimeType = item.format === 'mp3' ? 'audio/mpeg' : 'video/mp4';
      const blob = new Blob(chunks, { type: mimeType });
      const completedSize = blob.size;
      chunks.length = 0; // Release RAM immediately for large files (50MB+)
      const blobUrl = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

      // Trigger 50MB+ download notification
      const isLarge = (completedSize || videoData.fileSize || 0) >= (settings.downloadNotificationMinSizeMB ?? 50) * 1024 * 1024;
      if (isLarge) {
        notifyLargeDownloadComplete({
          title: videoData.title,
          filename,
          fileSizeBytes: completedSize || videoData.fileSize || 0,
          format: item.format,
          quality: chosenQuality,
          isKm,
          minSizeMB: settings.downloadNotificationMinSizeMB ?? 50,
          enabled: settings.downloadNotificationsEnabled ?? true,
          playSound: settings.downloadNotificationSound ?? true,
          soundStyle: settings.downloadSoundStyle || 'chime',
          onlyWhenHidden: settings.notifyOnlyWhenTabHidden ?? false
        });
      } else {
        // Trigger sound effect for standard-sized downloads
        playDownloadCompleteSound({
          enabled: settings.downloadNotificationSound !== false,
          style: settings.downloadSoundStyle || 'chime'
        });
      }
    } else {
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      // Trigger 50MB+ download notification
      if (videoData.fileSize && videoData.fileSize >= (settings.downloadNotificationMinSizeMB ?? 50) * 1024 * 1024) {
        notifyLargeDownloadComplete({
          title: videoData.title,
          filename,
          fileSizeBytes: videoData.fileSize,
          format: item.format,
          quality: chosenQuality,
          isKm,
          minSizeMB: settings.downloadNotificationMinSizeMB ?? 50,
          enabled: settings.downloadNotificationsEnabled ?? true,
          playSound: settings.downloadNotificationSound ?? true,
          soundStyle: settings.downloadSoundStyle || 'chime',
          onlyWhenHidden: settings.notifyOnlyWhenTabHidden ?? false
        });
      } else {
        // Trigger sound effect for standard-sized downloads
        playDownloadCompleteSound({
          enabled: settings.downloadNotificationSound !== false,
          style: settings.downloadSoundStyle || 'chime'
        });
      }
    }

    // Add to history
    onAddToHistory({
      id: videoData.id,
      title: videoData.title,
      author: videoData.author.name || videoData.author.username,
      avatar: videoData.author.avatar,
      cover: videoData.cover,
      videoUrl: videoData.videoUrl,
      timestamp: Date.now(),
      fileSizeFormatted: videoData.fileSizeFormatted
    });

    updateItem(item.id, {
      status: 'completed',
      progress: 100,
      downloadedAt: Date.now()
    });
  };

  // Start processing the entire queue sequentially
  const startQueueExecution = async () => {
    if (isProcessingRef.current && !isPausedRef.current) return;

    if (isPausedRef.current) {
      setIsPaused(false);
      return;
    }

    // Clear any pending scheduled start if started
    if (scheduledStartTime) {
      setScheduledStartTime(null);
    }

    setIsProcessing(true);
    setIsPaused(false);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Find all items that are not completed
      while (true) {
        if (controller.signal.aborted) break;

        // Check pause state
        if (isPausedRef.current) {
          await new Promise(r => setTimeout(r, 400));
          continue;
        }

        // Find the next episode/item that is pending, ready, or retrying and not skipped, and not paused
        const currentSnapshot = await new Promise<QueueItem | undefined>(resolve => {
          setQueue(q => {
            const found = q.find(
              it =>
                (it.status === 'pending' || it.status === 'ready' || it.status === 'retrying') &&
                !it.isSkipped &&
                it.status !== 'paused'
            );
            resolve(found);
            return q;
          });
        });

        if (!currentSnapshot) {
          // No more items to process
          break;
        }

        // Retry loop for THIS SPECIFIC EPISODE until success or user skip/pause
        let episodeSuccess = false;
        let attempt = currentSnapshot.retryCount || 0;
        let activeItem: QueueItem = { ...currentSnapshot };

        while (!episodeSuccess && !controller.signal.aborted) {
          if (isPausedRef.current) {
            await new Promise(r => setTimeout(r, 400));
            continue;
          }

          // Check if item was skipped or paused by user
          const latestCheck = await getLatestItem(activeItem.id);
          if (latestCheck?.isSkipped) {
            updateItem(activeItem.id, {
              status: 'error',
              error: isKm ? 'បានរំលងភាគនេះដោយអ្នកប្រើប្រាស់' : 'Skipped by user',
              retryCountdown: undefined
            });
            break;
          }
          if (latestCheck?.status === 'paused') {
            break;
          }

          try {
            if (attempt > 0) {
              updateItem(activeItem.id, {
                status: 'retrying',
                retryCount: attempt,
                retryCountdown: undefined,
                error: isKm
                  ? maxRetries === 0
                    ? `កំពុងព្យាយាមទាញយកម្តងទៀតលើកទី ${attempt} (មិនកំណត់រហូតជោគជ័យ)...`
                    : `កំពុងព្យាយាមទាញយកម្តងទៀតលើកទី ${attempt}/${maxRetries}...`
                  : maxRetries === 0
                    ? `Retrying download (Attempt #${attempt} - unlimited until success)...`
                    : `Retrying download (Attempt #${attempt}/${maxRetries})...`
              });
              // Clear data to ensure fresh resolve on retry with new CDN link
              activeItem = { ...activeItem, data: undefined };
            }

            // Concurrently pre-resolve next upcoming pending item in background so it is ready immediately
            setQueue(q => {
              const nextPending = q.find(
                it =>
                  it.id !== activeItem.id &&
                  (!it.data || it.status === 'pending') &&
                  !it.isSkipped &&
                  it.status !== 'completed' &&
                  it.status !== 'error' &&
                  it.status !== 'paused'
              );
              if (nextPending && !nextPending.data) {
                fastPreResolveItem(nextPending.id, nextPending.rawUrl);
              }
              return q;
            });

            const itemController = new AbortController();
            currentItemAbortControllerRef.current = { id: activeItem.id, controller: itemController };
            const onMainAbort = () => itemController.abort();
            controller.signal.addEventListener('abort', onMainAbort, { once: true });

            try {
              await processSingleQueueItem(activeItem, itemController.signal);
              episodeSuccess = true;
            } finally {
              controller.signal.removeEventListener('abort', onMainAbort);
              if (currentItemAbortControllerRef.current?.id === activeItem.id) {
                currentItemAbortControllerRef.current = null;
              }
            }

            updateItem(activeItem.id, {
              status: 'completed',
              retryCount: undefined,
              retryCountdown: undefined,
              error: undefined,
              isSkipped: false
            });

            // Fast inter-episode delay (250ms instead of 1000ms)
            await new Promise(r => setTimeout(r, 250));
          } catch (err: any) {
            if (controller.signal.aborted) break;

            // Check if item was paused by user mid-download
            const pausedCheck = await getLatestItem(activeItem.id);
            if (pausedCheck?.status === 'paused') {
              break;
            }

            attempt++;
            console.warn(`Episode ${activeItem.id} failed (attempt #${attempt}):`, err);

            // If error is a TikTok Paid Series or private video, retrying will never work
            const isNonRetryable =
              err?.message?.includes('TikTok Paid Series') ||
              err?.message?.includes('កញ្ចប់បង់ប្រាក់') ||
              err?.message?.includes('Private Video') ||
              err?.message?.includes('deleted from TikTok');

            if (isNonRetryable) {
              updateItem(activeItem.id, {
                status: 'error',
                error: err.message || (isKm ? 'ភាគនេះស្ថិតក្នុងកញ្ចប់បង់ប្រាក់ ឬឯកជន' : 'Locked or private episode'),
                progress: 0,
                retryCountdown: undefined
              });
              await new Promise(r => setTimeout(r, 600));
              break;
            }

            // If auto-retry is disabled by user
            if (!autoRetry) {
              updateItem(activeItem.id, {
                status: 'error',
                error: err.message || (isKm ? 'បរាជ័យក្នុងការទាញយក' : 'Download failed'),
                progress: 0,
                retryCountdown: undefined
              });
              await new Promise(r => setTimeout(r, 1000));
              break;
            }

            // Check if user set a max retry limit (0 means unlimited / until success)
            if (maxRetries > 0 && attempt >= maxRetries) {
              updateItem(activeItem.id, {
                status: 'error',
                retryCount: attempt,
                retryCountdown: undefined,
                error: isKm
                  ? `បានព្យាយាម ${attempt} ដងរួចហើយ។ សូមចុច "សាកល្បងម្តងទៀត" ឬ "រំលង" ដើម្បីបន្ត`
                  : `Reached ${attempt} attempts. Click "Retry" or "Skip" to proceed.`
              });
              showToast(
                isKm
                  ? `ភាគនេះបានព្យាយាម ${attempt} ដងមិនទាន់ជោគជ័យ។ បានផ្អាកជួរដើម្បីឱ្យអ្នកជ្រើសរើស!`
                  : `Episode failed after ${attempt} attempts. Queue paused.`
              );
              setIsPaused(true);
              break;
            }

            // Progressive backoff countdown: 2s, 3s, 4s, up to 6s
            const cooldownSec = Math.min(6, 1 + attempt);
            for (let c = cooldownSec; c > 0; c--) {
              if (controller.signal.aborted || isPausedRef.current) break;
              const chk = await getLatestItem(activeItem.id);
              if (chk?.isSkipped) break;

              updateItem(activeItem.id, {
                status: 'retrying',
                retryCount: attempt,
                retryCountdown: c,
                error: isKm
                  ? maxRetries === 0
                    ? `ទាញយកមិនទាន់បាន! កំពុងព្យាយាមឡើងវិញលើកទី ${attempt} (មិនកំណត់រហូតជោគជ័យ) ក្នុងរយៈពេល ${c}វិនាទី...`
                    : `ទាញយកបរាជ័យ! កំពុងព្យាយាមម្តងទៀតលើកទី ${attempt}/${maxRetries} ក្នុងរយៈពេល ${c}វិនាទី...`
                  : maxRetries === 0
                    ? `Retrying attempt #${attempt} (unlimited until success) in ${c}s...`
                    : `Retrying attempt #${attempt}/${maxRetries} in ${c}s...`
              });
              await new Promise(r => setTimeout(r, 1000));
            }
          }
        }
      }

      showToast(isKm ? 'ការទាញយកជួរ (Batch Queue) បានបញ្ចប់រួចរាល់!' : 'Batch queue download finished!');
      
      // Trigger notification for finished batch queue
      notifyLargeDownloadComplete({
        title: isKm ? 'ការទាញយកជួរ Batch បានបញ្ចប់!' : 'Batch Queue Completed!',
        filename: `${queue.filter(i => i.status === 'completed').length} Videos`,
        fileSizeBytes: 55 * 1024 * 1024, // Qualifies as large batch task
        format: 'mp4',
        quality: 'Batch HD',
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
    } catch (err: any) {
      console.error('Batch queue error:', err);
    } finally {
      setIsProcessing(false);
      setIsPaused(false);
      abortControllerRef.current = null;
    }
  };

  startQueueExecutionRef.current = startQueueExecution;

  const handlePauseQueue = () => {
    setIsPaused(true);
    showToast(isKm ? 'បានផ្អាកជួរទាញយកជាបណ្តោះអាសន្ន' : 'Paused batch queue');
  };

  const handleResumeQueue = () => {
    setIsPaused(false);
    if (!isProcessing) {
      startQueueExecution();
    }
    showToast(isKm ? 'បន្តការទាញយកជួរ...' : 'Resuming batch queue...');
  };

  const handleRetryItem = async (item: QueueItem) => {
    updateItem(item.id, {
      status: 'pending',
      error: undefined,
      progress: 0,
      isSkipped: false,
      retryCount: 0,
      retryCountdown: undefined,
      data: undefined
    });
    showToast(isKm ? 'បានដាក់ចូលជួរទាញយកឡើងវិញ' : 'Re-queued for download');
    if (!isProcessingRef.current) {
      setTimeout(() => {
        startQueueExecution();
      }, 50);
    }
  };

  const handleRetryAllFailed = () => {
    setQueue(prev =>
      prev.map(item =>
        item.status === 'error'
          ? {
              ...item,
              status: 'pending',
              error: undefined,
              progress: 0,
              isSkipped: false,
              retryCount: 0,
              retryCountdown: undefined,
              data: undefined
            }
          : item
      )
    );
    setTimeout(() => {
      startQueueExecution();
    }, 100);
  };

  // Fast check all unresolved queue items in parallel batches
  const handleFastCheckAll = async () => {
    if (isCheckingAll) return;
    const itemsToCheck = queue.filter(it => !it.data && it.status !== 'completed');
    if (itemsToCheck.length === 0) {
      showToast(isKm ? 'វីដេអូទាំងអស់ត្រូវបានពិនិត្យរួចរាល់ហើយ' : 'All videos are already checked');
      return;
    }

    setIsCheckingAll(true);
    showToast(isKm ? `កំពុងពិនិត្យ ${itemsToCheck.length} វីដេអូលឿនបំផុត...` : `Turbo checking ${itemsToCheck.length} videos...`);

    // Set status to resolving
    setQueue(prev =>
      prev.map(it =>
        !it.data && it.status !== 'completed' ? { ...it, status: 'resolving', error: undefined } : it
      )
    );

    // Concurrently resolve in parallel chunks of 4
    const concurrency = 4;
    for (let i = 0; i < itemsToCheck.length; i += concurrency) {
      const chunk = itemsToCheck.slice(i, i + concurrency);
      await Promise.all(
        chunk.map(async (item) => {
          try {
            let targetQueryUrl = item.rawUrl.trim();
            if (
              !targetQueryUrl.includes('/video/') &&
              !targetQueryUrl.includes('/photo/') &&
              (targetQueryUrl.includes('/@') || targetQueryUrl.includes('shortdrama') || targetQueryUrl.includes('/series/'))
            ) {
              try {
                const convRes = await fetch('/api/convert-shortdrama', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url: targetQueryUrl })
                });
                const convJson = await convRes.json();
                if (convJson.success && convJson.convertedUrl) {
                  targetQueryUrl = convJson.convertedUrl;
                  updateItem(item.id, { rawUrl: targetQueryUrl });
                }
              } catch {}
            }

            const res = await fetch('/api/resolve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: targetQueryUrl })
            });
            const json = await res.json();
            if (res.ok && json.success) {
              updateItem(item.id, {
                status: 'ready',
                data: json,
                error: undefined
              });
            } else {
              updateItem(item.id, {
                status: 'error',
                error: json.error || (isKm ? 'មិនអាចពិនិត្យវីដេអូបានទេ' : 'Check failed')
              });
            }
          } catch (e: any) {
            updateItem(item.id, {
              status: 'error',
              error: e?.message || (isKm ? 'បរាជ័យក្នុងការពិនិត្យ' : 'Failed to check')
            });
          }
        })
      );
    }

    setIsCheckingAll(false);
    showToast(isKm ? 'បានពិនិត្យវីដេអូទាំងអស់រួចរាល់!' : 'All videos checked successfully!');
  };

  const handleFastCheckSingleItem = async (item: QueueItem) => {
    updateItem(item.id, { status: 'resolving', error: undefined });
    await fastPreResolveItem(item.id, item.rawUrl);
  };

  // Metrics
  const totalCount = queue.length;
  const completedCount = queue.filter(q => q.status === 'completed').length;
  const errorCount = queue.filter(q => q.status === 'error').length;
  const pausedCount = queue.filter(q => q.status === 'paused').length;
  const pendingCount = queue.filter(
    q =>
      (q.status === 'pending' || q.status === 'resolving' || q.status === 'downloading' || q.status === 'ready') &&
      q.status !== 'paused'
  ).length;
  const unresolvedCount = queue.filter(
    q => !q.data && q.status !== 'completed' && q.status !== 'error'
  ).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const filteredQueue = queue.filter(item => {
    if (filter === 'completed') return item.status === 'completed';
    if (filter === 'error') return item.status === 'error';
    if (filter === 'paused') return item.status === 'paused';
    if (filter === 'pending') return item.status !== 'completed' && item.status !== 'error' && item.status !== 'paused';
    return true;
  });

  // Bulk Selection State & Handlers
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null);

  // Sync selectedIds with existing queue items
  useEffect(() => {
    setSelectedIds(prev => {
      const queueIds = new Set(queue.map(q => q.id));
      let changed = false;
      const next = new Set<string>();
      prev.forEach(id => {
        if (queueIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [queue]);

  const isAllSelected = filteredQueue.length > 0 && filteredQueue.every(item => selectedIds.has(item.id));
  const isSomeSelected = filteredQueue.some(item => selectedIds.has(item.id)) && !isAllSelected;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isSomeSelected;
    }
  }, [isSomeSelected]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredQueue.forEach(item => next.delete(item.id));
        return next;
      });
      showToast(isKm ? 'បានដោះការជ្រើសរើសទាំងអស់ (Deselected All)' : 'Deselected all items');
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredQueue.forEach(item => next.add(item.id));
        return next;
      });
      showToast(isKm ? `បានជ្រើសរើសទាំងអស់ (${filteredQueue.length} វីដេអូ)` : `Selected all ${filteredQueue.length} items`);
    }
  };

  const handleSelectAllQueue = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredQueue.forEach(item => next.add(item.id));
      return next;
    });
    showToast(isKm ? `បានជ្រើសរើសទាំងអស់ (${filteredQueue.length} វីដេអូ)` : `Selected all ${filteredQueue.length} items`);
  };

  const handleDeselectAllQueue = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredQueue.forEach(item => next.delete(item.id));
      return next;
    });
    showToast(isKm ? 'បានដោះការជ្រើសរើសទាំងអស់ (Deselected All)' : 'Deselected all items');
  };

  const handleInvertQueueSelection = () => {
    setSelectedIds(prev => {
      const next = new Set<string>();
      filteredQueue.forEach(item => {
        if (!prev.has(item.id)) {
          next.add(item.id);
        }
      });
      return next;
    });
    showToast(isKm ? 'បានផ្លាស់ប្តូរការជ្រើសរើសបញ្ច្រាស' : 'Inverted queue selection');
  };

  const handleToggleSelectItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedErrorCount = queue.filter(
    item => selectedIds.has(item.id) && (item.status === 'error' || item.status === 'retrying')
  ).length;

  const handleStartSelected = () => {
    if (selectedIds.size === 0 || isProcessing) return;

    setQueue(prev =>
      prev.map(item => {
        if (selectedIds.has(item.id)) {
          if (item.status === 'completed' || item.status === 'error') {
            return {
              ...item,
              status: 'pending',
              progress: 0,
              error: undefined,
              isSkipped: false,
              retryCount: 0,
              retryCountdown: undefined
            };
          }
        }
        return item;
      })
    );

    showToast(
      isKm
        ? `ចាប់ផ្តើមទាញយកធាតុដែលបានជ្រើសរើស (${selectedIds.size})...`
        : `Starting download for ${selectedIds.size} selected items...`
    );

    setTimeout(() => {
      startQueueExecution();
    }, 100);
  };

  const handleBulkSetFormat = (format: 'mp4' | 'mp3') => {
    setQueue(prev =>
      prev.map(item =>
        selectedIds.has(item.id) && item.status !== 'downloading' && item.status !== 'completed'
          ? { ...item, format }
          : item
      )
    );
    showToast(
      isKm
        ? `បានប្តូរទម្រង់ធាតុដែលបានជ្រើសរើសទៅជា ${format.toUpperCase()}`
        : `Changed format of ${selectedIds.size} selected items to ${format.toUpperCase()}`
    );
  };

  const handleBulkRetry = () => {
    setQueue(prev =>
      prev.map(item =>
        selectedIds.has(item.id) && (item.status === 'error' || item.status === 'retrying')
          ? {
              ...item,
              status: 'pending',
              error: undefined,
              progress: 0,
              isSkipped: false,
              retryCount: 0,
              retryCountdown: undefined,
              data: undefined
            }
          : item
      )
    );
    showToast(
      isKm
        ? `បានដាក់ធាតុដែលបានជ្រើសរើសចូលជួរទាញយកឡើងវិញ`
        : `Re-queued selected failed items for retry`
    );
    if (!isProcessingRef.current) {
      setTimeout(() => {
        startQueueExecution();
      }, 100);
    }
  };

  const handleBulkPause = () => {
    if (selectedIds.size === 0) return;
    selectedIds.forEach(id => {
      if (currentItemAbortControllerRef.current?.id === id) {
        try {
          currentItemAbortControllerRef.current.controller.abort();
        } catch {}
      }
    });
    setQueue(prev =>
      prev.map(item =>
        selectedIds.has(item.id) && item.status !== 'completed'
          ? { ...item, status: 'paused', retryCountdown: undefined }
          : item
      )
    );
    showToast(isKm ? `បានផ្អាក ${selectedIds.size} ធាតុដែលបានជ្រើសរើស` : `Paused ${selectedIds.size} selected items`);
  };

  const handleBulkResume = () => {
    if (selectedIds.size === 0) return;
    setQueue(prev =>
      prev.map(item =>
        selectedIds.has(item.id) && item.status === 'paused'
          ? { ...item, status: item.data ? 'ready' : 'pending', error: undefined, isSkipped: false }
          : item
      )
    );
    showToast(isKm ? `បានបន្ត ${selectedIds.size} ធាតុដែលបានជ្រើសរើស` : `Resumed ${selectedIds.size} selected items`);
    if (!isProcessingRef.current) {
      setTimeout(() => {
        startQueueExecutionRef.current?.();
      }, 50);
    }
  };

  const handleBulkRemove = () => {
    const count = selectedIds.size;
    setQueue(prev => prev.filter(item => !selectedIds.has(item.id)));
    setSelectedIds(new Set());
    showToast(
      isKm
        ? `បានលុប ${count} ធាតុចេញពីជួរ`
        : `Removed ${count} selected items from queue`
    );
  };

  return (
    <div id="batch-downloader-root" className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
      {/* Description Header */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-emerald-400 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white">
                {isKm ? 'ទាញយកវីដេអូច្រើនក្នុងពេលតែមួយ (Batch Queue Downloader)' : 'Batch Queue Downloader (Multiple URLs)'}
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                Multi-Link
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              {isKm
                ? 'បញ្ចូលតំណភ្ជាប់វីដេអូ TikTok ច្រើនដោយខណ្ឌដោយបន្ទាត់ថ្មី (Newline/Enter) ដើម្បីទាញយកវីដេអូ HD គ្មានសញ្ញាទឹក ឬ MP3 ជាបន្តបន្ទាប់ដោយស្វ័យប្រវត្តិ!'
                : 'Input multiple TikTok URLs separated by newlines to automatically queue and download clean watermark-free HD videos or MP3 audio tracks!'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
          <button
            id="batch-load-20channels-btn"
            onClick={handleLoadDramaChannelsBatch}
            className="text-xs font-semibold px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-rose-500/20 hover:from-amber-500/30 hover:to-rose-500/30 text-amber-300 hover:text-white border border-amber-500/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-amber-500/10"
            title={isKm ? 'ផ្ទុកប៉ុស្តិ៍រឿងភាគទាំង ២០ ចូលក្នុងជួរ' : 'Load all 20 drama channels into queue'}
          >
            <Tv className="w-3.5 h-3.5 text-amber-400" />
            <span>{isKm ? 'ប៉ុស្តិ៍រឿងភាគទាំង ២០ (20 Channels)' : '20 Drama Channels'}</span>
          </button>
          <button
            id="batch-load-sample-btn"
            onClick={handleLoadSampleBatch}
            className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-indigo-300 hover:text-white border border-indigo-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isKm ? 'បញ្ចូល 3 Links គំរូ' : 'Load Sample Links'}</span>
          </button>
          <button
            id="batch-load-wanfeng-btn"
            onClick={() => {
              setInputText('@挽风动漫');
              showToast(isKm ? 'បានបញ្ចូល @挽风动漫 (Douyin Creator)!' : 'Loaded @挽风动漫 (Douyin Creator)!');
            }}
            className="text-xs font-semibold px-3 py-2 rounded-xl bg-sky-950/80 hover:bg-sky-900 text-sky-300 hover:text-white border border-sky-500/40 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-sky-400" />
            <span>@挽风动漫 (Douyin)</span>
          </button>
        </div>
      </div>

      {/* Multiline Input Card */}
      <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl shadow-slate-950/70 backdrop-blur-xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center gap-2">
            <ListPlus className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              {isKm
                ? 'បញ្ចូលតំណភ្ជាប់ TikTok (1 URL ក្នុងមួយជួរ / Newline): មានវីដេអូចំនួនប៉ុន្មាន ទំលាក់ទៅផ្ទាំងទាញយកប៉ុន្នោះ កុំបន្ថែមlink'
                : 'Enter TikTok URLs (1 URL per line): Send only entered videos to download queue, no extra links'}
            </span>
          </label>

          <div className="flex items-center gap-2">
            <span
              id="detected-urls-counter"
              className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full border ${
                detectedUrls.length > 0
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {isKm
                ? `បានរកឃើញ ${detectedUrls.length} វីដេអូ (1:1 គ្មានបន្ថែម)`
                : `${detectedUrls.length} URLs (Exact 1:1)`}
            </span>

            <button
              id="batch-paste-btn"
              onClick={handlePasteClipboard}
              className="text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              title={isKm ? 'បិទភ្ជាប់ពី Clipboard' : 'Paste from clipboard'}
            >
              <Copy className="w-3 h-3" />
              <span>{isKm ? 'បិទភ្ជាប់' : 'Paste'}</span>
            </button>

            {inputText && (
              <button
                id="batch-clear-input-btn"
                onClick={() => setInputText('')}
                className="text-xs font-medium text-slate-400 hover:text-red-300 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                title={isKm ? 'សម្អាត' : 'Clear'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Creator / Short Drama Auto-Expand Banner */}
        {creatorOrDramaLinks.length > 0 && (
          <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
            <div className="flex items-start sm:items-center gap-2.5 text-amber-200">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
              <span>
                {isKm
                  ? `បានរកឃើញ ${creatorOrDramaLinks.length} តំណភ្ជាប់ Creator Profile / Short Drama! ចុចដើម្បីពង្រីកគ្រប់ភាគរឿងទាំងអស់ចូលក្នុង Queue:`
                  : `Detected ${creatorOrDramaLinks.length} Creator Profile / Short Drama links! Click to scan & expand all episodes into this queue:`}
              </span>
            </div>
            <button
              type="button"
              onClick={handleExpandCreatorDramas}
              disabled={isExpandingCreator}
              className="bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0 self-end sm:self-auto shadow-md disabled:opacity-50"
            >
              {isExpandingCreator ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{isKm ? 'កំពុងស្កេន...' : 'Scanning...'}</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isKm ? 'ពង្រីកគ្រប់ភាគរឿងទាំងអស់' : 'Expand All Episodes'}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Textarea */}
        <div className="relative">
          <textarea
            id="batch-urls-textarea"
            rows={5}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={
              isKm
                ? 'https://www.tiktok.com/@creator/video/7683292586500492565\nhttps://www.tiktok.com/@creator/video/7683292610777091349\nhttps://www.tiktok.com/@creator/video/7683292631589342485\n(ចុច Enter/Return ដើម្បីចុះបន្ទាត់ថ្មី)'
                : 'https://www.tiktok.com/@creator/video/7683292586500492565\nhttps://www.tiktok.com/@creator/video/7683292610777091349\nhttps://www.tiktok.com/@creator/video/7683292631589342485\n(Paste or type 1 URL per line)'
            }
            className="w-full bg-slate-950/90 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-100 placeholder-slate-500 rounded-xl p-3.5 text-xs sm:text-sm font-mono leading-relaxed outline-none transition-all resize-y"
          />
        </div>

        {/* Large List URL Manager & Selector (when 2 or more URLs are pasted) */}
        {detectedUrls.length >= 2 && (
          <div
            id="batch-input-urls-manager"
            className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3 flex flex-col gap-2.5 transition-all"
          >
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Checkbox and Select All / Deselect All Controls */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <label
                  htmlFor="batch-input-select-all-checkbox"
                  className="flex items-center gap-2 text-xs font-semibold text-slate-200 hover:text-white cursor-pointer select-none transition-colors"
                  title={
                    isAllInputSelected
                      ? (isKm ? 'ដោះការជ្រើសរើសទាំងអស់ (Deselect All)' : 'Deselect All')
                      : (isKm ? 'ជ្រើសរើសទាំងអស់ (Select All)' : 'Select All')
                  }
                >
                  <input
                    type="checkbox"
                    id="batch-input-select-all-checkbox"
                    ref={selectAllInputCheckboxRef}
                    checked={isAllInputSelected}
                    onChange={handleToggleSelectAllInputUrls}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer accent-indigo-600"
                    aria-label={isAllInputSelected ? (isKm ? 'ដោះការជ្រើសរើសទាំងអស់' : 'Deselect All') : (isKm ? 'ជ្រើសរើសទាំងអស់' : 'Select All')}
                  />
                  <span>
                    {isAllInputSelected
                      ? (isKm ? 'ដោះការជ្រើសរើសទាំងអស់ (Deselect All)' : 'Deselect All')
                      : (isKm ? 'ជ្រើសរើសទាំងអស់ (Select All)' : 'Select All')}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    ({selectedInputUrls.size}/{detectedUrls.length})
                  </span>
                </label>

                <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
                  <button
                    type="button"
                    id="batch-input-select-all-btn"
                    onClick={handleSelectAllInputUrls}
                    disabled={isAllInputSelected}
                    className="px-2 py-1 text-[11px] font-medium bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 hover:text-white border border-slate-700/80 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    title={isKm ? 'ជ្រើសរើស URL ទាំងអស់' : 'Select All URLs'}
                  >
                    <CheckSquare className="w-3 h-3 text-indigo-400" />
                    <span>{isKm ? 'ជ្រើសរើសទាំងអស់' : 'Select All'}</span>
                  </button>

                  <button
                    type="button"
                    id="batch-input-deselect-all-btn"
                    onClick={handleDeselectAllInputUrls}
                    disabled={selectedInputUrls.size === 0}
                    className="px-2 py-1 text-[11px] font-medium bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 hover:text-white border border-slate-700/80 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    title={isKm ? 'ដោះការជ្រើសរើស URL ទាំងអស់' : 'Deselect All URLs'}
                  >
                    <Square className="w-3 h-3 text-slate-400" />
                    <span>{isKm ? 'ដោះការជ្រើសរើស' : 'Deselect All'}</span>
                  </button>

                  <button
                    type="button"
                    id="batch-input-invert-btn"
                    onClick={handleInvertInputSelection}
                    className="px-2 py-1 text-[11px] font-medium bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg transition-colors cursor-pointer"
                    title={isKm ? 'ជ្រើសរើសបញ្ច្រាស' : 'Invert selection'}
                  >
                    <span>{isKm ? 'បញ្ច្រាស' : 'Invert'}</span>
                  </button>
                </div>
              </div>

              {/* Right side: View/Hide details list toggle */}
              <div className="flex items-center gap-2">
                {selectedInputUrls.size < detectedUrls.length && (
                  <button
                    type="button"
                    id="batch-input-remove-unselected-btn"
                    onClick={handleRemoveDeselectedFromInput}
                    className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 cursor-pointer"
                    title={isKm ? 'លុបតំណភ្ជាប់ដែលមិនបានជ្រើសរើសចេញពីប្រអប់បញ្ចូល' : 'Remove unselected URLs from input box'}
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>
                      {isKm
                        ? `លុប URL មិនជ្រើស (${detectedUrls.length - selectedInputUrls.size})`
                        : `Remove Unselected (${detectedUrls.length - selectedInputUrls.size})`}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  id="batch-toggle-url-list-btn"
                  onClick={() => setIsUrlManagerOpen(prev => !prev)}
                  className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>{isUrlManagerOpen ? (isKm ? 'លាក់បញ្ជី URL' : 'Hide URL List') : (isKm ? 'ពិនិត្យមើលបញ្ជី URL' : 'Inspect URLs')}</span>
                  {isUrlManagerOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Expandable detailed URL items list with checkboxes */}
            {isUrlManagerOpen && (
              <div
                id="batch-input-urls-expanded-list"
                className="mt-1 max-h-48 overflow-y-auto pr-1 flex flex-col gap-1.5 scrollbar-thin border-t border-slate-800/80 pt-2.5"
              >
                {detectedUrls.map((url, idx) => {
                  const isChecked = selectedInputUrls.has(url);
                  const isTikTok = url.includes('tiktok.com');
                  const isDouyin = url.includes('douyin.com');
                  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
                  const isKuaishou = url.includes('kuaishou.com') || url.includes('kwai');
                  const platformTag = isTikTok ? 'TikTok' : isDouyin ? 'Douyin' : isYouTube ? 'YouTube' : isKuaishou ? 'Kuaishou' : 'Video';

                  return (
                    <div
                      key={`input-url-${idx}-${url}`}
                      className={`flex items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-lg border transition-all text-xs ${
                        isChecked
                          ? 'bg-indigo-950/25 border-indigo-500/40 text-slate-200'
                          : 'bg-slate-900/50 border-slate-800/60 text-slate-400 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          id={`batch-input-url-checkbox-${idx}`}
                          checked={isChecked}
                          onChange={() => handleToggleSelectInputUrl(url)}
                          className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer accent-indigo-600 shrink-0"
                          aria-label={`Select URL #${idx + 1}`}
                        />
                        <span className="font-mono text-[10px] text-slate-500 w-5 shrink-0">#{idx + 1}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 bg-slate-800 text-slate-300 border border-slate-700/60">
                          {platformTag}
                        </span>
                        <span className="truncate font-mono text-[11px] text-slate-300 select-all" title={url}>
                          {url}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(url);
                            showToast(isKm ? 'បានចម្លង URL!' : 'Copied URL!');
                          }}
                          className="p-1 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                          title={isKm ? 'ចម្លង URL នេះ' : 'Copy this URL'}
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSingleInputUrl(url)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                          title={isKm ? 'លុប URL នេះចេញ' : 'Remove this URL'}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Actions under textarea */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-medium text-slate-500">{isKm ? 'ទម្រង់ទាញយកលំនាំដើម:' : 'Default format:'}</span>
            <div className="inline-flex rounded-lg bg-slate-950 border border-slate-800 p-0.5">
              <button
                type="button"
                onClick={() => handleSetAllFormat('mp4')}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  defaultFormat === 'mp4'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Film className="w-3 h-3" />
                <span>MP4 HD</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetAllFormat('mp3')}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  defaultFormat === 'mp3'
                    ? 'bg-violet-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Music className="w-3 h-3" />
                <span>MP3 ({settings.audioBitrate})</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct Schedule button from input */}
            <button
              id="batch-input-schedule-btn"
              type="button"
              onClick={handleScheduleFromInput}
              disabled={detectedUrls.length === 0 && queue.length === 0}
              className={`btn-3d-glass text-xs sm:text-sm px-4 py-2.5 gap-2 disabled:opacity-50 ${
                scheduledStartTime
                  ? 'btn-3d-glass-indigo text-white shadow-lg ring-1 ring-indigo-400/50'
                  : 'btn-3d-glass-slate text-slate-200 hover:text-white'
              }`}
              title={isKm ? 'កំណត់កាលវិភាគម៉ោងទាញយកជាក់លាក់' : 'Schedule bulk download for a specific time'}
            >
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>
                {scheduledStartTime
                  ? (isKm ? 'កាលវិភាគសកម្ម' : 'Scheduled')
                  : (isKm ? 'កំណត់ពេលទាញយក' : 'Schedule Download')}
              </span>
              {scheduledStartTime && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>

            <button
              id="batch-queue-drop-btn"
              onClick={() => handleAddToQueue(true, selectedInputUrls.size > 0 && selectedInputUrls.size < detectedUrls.length)}
              disabled={detectedUrls.length === 0 || selectedInputUrls.size === 0}
              className="btn-3d-glass btn-3d-glass-emerald text-slate-950 font-bold text-xs sm:text-sm px-5 py-2.5 gap-2 disabled:opacity-50"
            >
              <ArrowDownToLine className="w-4 h-4 text-slate-950" />
              <span>
                {detectedUrls.length > 0 && selectedInputUrls.size > 0 && selectedInputUrls.size < detectedUrls.length
                  ? (isKm ? `ទម្លាក់ ${selectedInputUrls.size} វីដេអូដែលបានជ្រើសរើស` : `Drop ${selectedInputUrls.size} Selected Videos`)
                  : (isKm
                    ? `ទម្លាក់ទៅផ្ទាំងទាញយក${detectedUrls.length > 0 ? ` (${detectedUrls.length} វីដេអូ)` : ''}`
                    : `Drop to Download Panel${detectedUrls.length > 0 ? ` (${detectedUrls.length} videos)` : ''}`)}
              </span>
            </button>

            {queue.length > 0 && (
              <button
                id="batch-queue-append-btn"
                onClick={() => handleAddToQueue(false, selectedInputUrls.size > 0 && selectedInputUrls.size < detectedUrls.length)}
                disabled={detectedUrls.length === 0 || selectedInputUrls.size === 0}
                className="btn-3d-glass btn-3d-glass-slate text-xs font-semibold px-3 py-2 text-slate-300 hover:text-white disabled:opacity-50 gap-1.5"
                title={isKm ? 'បន្ថែមលើតំណភ្ជាប់ដែលមានស្រាប់ក្នុងជួរ' : 'Append to existing queue'}
              >
                <ListPlus className="w-3.5 h-3.5" />
                <span>
                  {selectedInputUrls.size > 0 && selectedInputUrls.size < detectedUrls.length
                    ? (isKm ? `+ បន្ថែម ${selectedInputUrls.size} ដែលបានជ្រើស` : `+ Append ${selectedInputUrls.size} Selected`)
                    : (isKm ? `+ បន្ថែមលើជួរចាស់` : `+ Append to Queue`)}
                </span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Queue Progress & Status Dashboard */}
      {totalCount > 0 && (
        <section id="batch-queue-dashboard" className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-xl flex flex-col gap-5 animate-in fade-in duration-200">
          {/* Dashboard Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
                {completedCount}/{totalCount}
              </div>
              <div>
                <h4 className="font-bold text-base text-white flex items-center gap-2 flex-wrap">
                  <span>{isKm ? 'ផ្ទាំងទាញយកវីដេអូ' : 'Batch Download Panel'}</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {isKm ? `សរុប ${totalCount} វីដេអូ (ត្រឹមត្រូវ គ្មាន link បន្ថែម)` : `Total ${totalCount} videos (Exact, no extra links)`}
                  </span>
                  {isProcessing && !isPaused && (
                    <span className="flex items-center gap-1.5 text-xs text-indigo-300 font-normal bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                      <RefreshCw className="w-3.5 h-3 animate-spin text-indigo-400" />
                      {isKm ? 'កំពុងដំណើរការ...' : 'Processing...'}
                    </span>
                  )}
                  {isPaused && (
                    <span className="text-xs text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      {isKm ? 'បានផ្អាក' : 'Paused'}
                    </span>
                  )}
                </h4>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                  <span className="text-emerald-400 font-medium">
                    {completedCount} {isKm ? 'បានជោគជ័យ' : 'completed'}
                  </span>
                  <span>•</span>
                  <span className="text-slate-300">
                    {pendingCount} {isKm ? 'នៅសល់' : 'pending'}
                  </span>
                  {pausedCount > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-amber-400 font-medium">
                        {pausedCount} {isKm ? 'បានផ្អាក' : 'paused'}
                      </span>
                    </>
                  )}
                  {errorCount > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-rose-400 font-medium">
                        {errorCount} {isKm ? 'មានកំហុស' : 'failed'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Auto-retry indicator & Main Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs">
                <RotateCcw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-amber-200 font-medium">
                  {isKm ? 'ព្យាយាមឡើងវិញរហូតជោគជ័យ:' : 'Retry until success:'}
                </span>

                <button
                  id="batch-toggle-auto-retry-btn"
                  type="button"
                  onClick={handleToggleAutoRetry}
                  className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition-colors cursor-pointer ${
                    autoRetry
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title={isKm ? 'ចុចដើម្បីបើក/បិទការព្យាយាមទាញយកឡើងវិញរហូតបានជោគជ័យ' : 'Toggle auto-retry failed items until success'}
                >
                  {autoRetry ? (isKm ? 'បើក (ON)' : 'ON') : (isKm ? 'បិទ (OFF)' : 'OFF')}
                </button>

                {autoRetry && (
                  <div className="flex items-center gap-1 border-l border-amber-500/30 pl-2 ml-1">
                    {[
                      { val: 0, label: isKm ? 'មិនកំណត់ (ចម្បង)' : 'Unlimited (Default)' },
                      { val: 3, label: '3x' },
                      { val: 5, label: '5x' },
                      { val: 10, label: '10x' }
                    ].map(opt => (
                      <button
                        key={opt.val}
                        id={`batch-retry-opt-${opt.val}`}
                        type="button"
                        onClick={() => handleSelectMaxRetries(opt.val)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                          maxRetries === opt.val
                            ? 'bg-amber-400 text-slate-950 font-bold shadow-sm ring-1 ring-amber-300/60'
                            : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                        title={
                          opt.val === 0
                            ? (isKm ? 'ព្យាយាមទាញយកឡើងវិញមិនកំណត់ រហូតទាល់តែបានជោគជ័យ (ជ្រើសរើសជាចម្បង)' : 'Retry infinitely until download succeeds (Primary choice)')
                            : (isKm ? `ព្យាយាមឡើងវិញអតិបរមា ${opt.val} ដង` : `Retry maximum ${opt.val} times`)
                        }
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Schedule Delayed Start Button */}
              <button
                id="batch-open-scheduler-btn"
                type="button"
                onClick={handleScheduleFromInput}
                disabled={queue.length === 0 && detectedUrls.length === 0}
                className={`btn-3d-glass text-xs sm:text-sm px-3.5 py-2.5 gap-2 disabled:opacity-50 ${
                  scheduledStartTime
                    ? 'btn-3d-glass-indigo text-white shadow'
                    : 'btn-3d-glass-slate text-slate-200 hover:text-white'
                }`}
                title={isKm ? 'កំណត់កាលវិភាគម៉ោងជាក់លាក់ទាញយក' : 'Set a specific time for when bulk download process begins'}
              >
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>{isKm ? 'កំណត់កាលវិភាគ' : 'Schedule Time'}</span>
                {scheduledStartTime && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>

              {isProcessing ? (
                isPaused ? (
                  <button
                    id="batch-resume-btn"
                    onClick={handleResumeQueue}
                    className="btn-3d-glass btn-3d-glass-emerald text-slate-950 font-bold text-xs sm:text-sm px-4 py-2.5 gap-1.5"
                  >
                    <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
                    <span>{isKm ? 'បន្តការទាញយក' : 'Resume Queue'}</span>
                  </button>
                ) : (
                  <button
                    id="batch-pause-btn"
                    onClick={handlePauseQueue}
                    className="btn-3d-glass btn-3d-glass-amber text-slate-950 font-bold text-xs sm:text-sm px-4 py-2.5 gap-1.5"
                  >
                    <Pause className="w-4 h-4 fill-slate-950 text-slate-950" />
                    <span>{isKm ? 'ផ្អាកជួរ' : 'Pause Queue'}</span>
                  </button>
                )
              ) : (
                <div className="flex items-center gap-2">
                  {/* Turbo Fast Check All Button */}
                  {unresolvedCount > 0 && (
                    <button
                      id="batch-fast-check-all-btn"
                      type="button"
                      onClick={handleFastCheckAll}
                      disabled={isCheckingAll || isProcessing}
                      className="btn-3d-glass btn-3d-glass-cyan text-slate-950 font-bold text-xs sm:text-sm px-4 py-2.5 gap-2 disabled:opacity-50"
                      title={isKm ? 'ពិនិត្យវីដេអូទាំងអស់ក្នុងជួរឱ្យលឿនបំផុត' : 'Fast check all videos in queue'}
                    >
                      {isCheckingAll ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                          <span>{isKm ? 'កំពុងពិនិត្យ...' : 'Checking...'}</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
                          <span>{isKm ? `ពិនិត្យលឿន (${unresolvedCount})` : `Fast Check (${unresolvedCount})`}</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    id="batch-start-queue-btn"
                    onClick={startQueueExecution}
                    className="btn-3d-glass btn-3d-glass-emerald text-slate-950 font-bold text-xs sm:text-sm px-5 py-2.5 gap-2"
                  >
                    <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
                    <span>
                      {isKm
                        ? pendingCount > 0
                          ? `ចាប់ផ្តើមទាញយក (${pendingCount})`
                          : 'ទាញយកម្តងទៀតទាំងអស់'
                        : pendingCount > 0
                          ? `Start Queue (${pendingCount})`
                          : 'Download All Again'}
                    </span>
                  </button>
                </div>
              )}

              {errorCount > 0 && !isProcessing && (
                <button
                  id="batch-retry-failed-btn"
                  onClick={handleRetryAllFailed}
                  className="bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-semibold px-3 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isKm ? `សាកល្បង ${errorCount} ឡើងវិញ` : `Retry ${errorCount} Failed`}</span>
                </button>
              )}

              {/* Copy all URLs currently in queue button */}
              <button
                id="batch-copy-all-urls-btn"
                type="button"
                onClick={handleCopyAllUrls}
                disabled={queue.length === 0}
                className={`text-xs font-semibold px-3.5 py-2.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  copiedAllUrls
                    ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 shadow-md shadow-emerald-950/40'
                    : 'bg-slate-800 hover:bg-slate-750 hover:text-white border-slate-700 hover:border-slate-600 text-slate-200 shadow-sm'
                }`}
                title={isKm ? 'ចម្លង URL ទាំងអស់ក្នុងជួរ (បំបែកដោយបន្ទាត់ថ្មី - Newline-separated)' : 'Copy all URLs currently in queue (Newline-separated text)'}
              >
                {copiedAllUrls ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{isKm ? 'បានចម្លងរួចរាល់!' : 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>{isKm ? 'ចម្លង URL ទាំងអស់' : 'Copy all URLs'}</span>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-md font-mono font-bold">
                      {queue.length}
                    </span>
                  </>
                )}
              </button>

              <button
                id="batch-clear-all-btn"
                onClick={handleClearQueue}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-400 p-2.5 rounded-xl transition-colors cursor-pointer"
                title={isKm ? 'សម្អាតជួរទាំងអស់' : 'Clear Queue'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Scheduled Timer Banner */}
          {scheduledStartTime && (
            <BatchQueueSchedulerBanner
              scheduledStartTime={scheduledStartTime}
              scheduledDurationMs={scheduledDurationMs}
              onStartNow={handleStartScheduledNow}
              onCancelSchedule={handleCancelSchedule}
              onAddMinutes={handleAddScheduleMinutes}
              onEditSchedule={() => setIsSchedulerModalOpen(true)}
              isKm={isKm}
              queueCount={totalCount}
            />
          )}

          {/* Overall Queue Progress Bar */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
              <span>{isKm ? 'ដំណើរការរួម:' : 'Overall Progress:'}</span>
              <span className="font-mono text-indigo-300 font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800 p-0.5">
              <div
                className="bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Filter and Format Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  filter === 'all'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isKm ? 'ទាំងអស់' : 'All'} ({totalCount})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  filter === 'pending'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isKm ? 'រង់ចាំ' : 'Pending'} ({pendingCount})
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  filter === 'completed'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isKm ? 'ជោគជ័យ' : 'Done'} ({completedCount})
              </button>
              {pausedCount > 0 && (
                <button
                  id="batch-filter-paused-btn"
                  onClick={() => setFilter('paused')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    filter === 'paused'
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                      : 'text-amber-400/70 hover:text-amber-300'
                  }`}
                >
                  {isKm ? 'បានផ្អាក' : 'Paused'} ({pausedCount})
                </button>
              )}
              {errorCount > 0 && (
                <button
                  onClick={() => setFilter('error')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    filter === 'error'
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                      : 'text-rose-400/70 hover:text-rose-300'
                  }`}
                >
                  {isKm ? 'កំហុស' : 'Failed'} ({errorCount})
                </button>
              )}
            </div>

            {completedCount > 0 && (
              <button
                onClick={handleClearCompleted}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                {isKm ? 'លុបធាតុដែលបានទាញយករួច' : 'Clear completed items'}
              </button>
            )}
          </div>

          {/* Select All / Deselect All Checkbox Header & Bulk Actions */}
          <div
            id="batch-select-all-header"
            className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 bg-slate-950/90 border border-slate-800/90 rounded-xl"
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <label
                htmlFor="batch-select-all-checkbox"
                className="flex items-center gap-2 text-xs font-semibold text-slate-200 hover:text-white cursor-pointer select-none transition-colors"
                title={
                  isAllSelected
                    ? (isKm ? 'ដោះការជ្រើសរើសទាំងអស់ (Deselect All)' : 'Deselect All')
                    : (isKm ? 'ជ្រើសរើសទាំងអស់ (Select All)' : 'Select All')
                }
              >
                <input
                  type="checkbox"
                  id="batch-select-all-checkbox"
                  ref={selectAllCheckboxRef}
                  checked={isAllSelected}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer accent-indigo-600"
                  aria-label={isAllSelected ? (isKm ? 'ដោះការជ្រើសរើសទាំងអស់' : 'Deselect All') : (isKm ? 'ជ្រើសរើសទាំងអស់' : 'Select All')}
                />
                <span>
                  {isAllSelected
                    ? (isKm ? 'ដោះការជ្រើសរើសទាំងអស់ (Deselect All)' : 'Deselect All')
                    : (isKm ? 'ជ្រើសរើសទាំងអស់ (Select All)' : 'Select All')}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  ({selectedIds.size}/{filteredQueue.length})
                </span>
              </label>

              {/* Explicit Select All and Deselect All Action Buttons */}
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
                <button
                  type="button"
                  id="batch-select-all-btn"
                  onClick={handleSelectAllQueue}
                  disabled={isAllSelected || filteredQueue.length === 0}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 text-slate-200 hover:text-white border border-slate-700/80 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  title={isKm ? 'ជ្រើសរើសវីដេអូទាំងអស់ក្នុងជួរ' : 'Select all items in queue'}
                >
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isKm ? 'ជ្រើសរើសទាំងអស់' : 'Select All'}</span>
                </button>

                <button
                  type="button"
                  id="batch-deselect-all-btn"
                  onClick={handleDeselectAllQueue}
                  disabled={selectedIds.size === 0}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-700/80 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  title={isKm ? 'ដោះការជ្រើសរើសវីដេអូទាំងអស់' : 'Deselect all items'}
                >
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isKm ? 'ដោះការជ្រើសរើស' : 'Deselect All'}</span>
                </button>

                <button
                  type="button"
                  id="batch-invert-selection-btn"
                  onClick={handleInvertQueueSelection}
                  disabled={filteredQueue.length === 0}
                  className="px-2 py-1 text-xs font-medium bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg transition-colors cursor-pointer"
                  title={isKm ? 'ជ្រើសរើសបញ្ច្រាស' : 'Invert selection'}
                >
                  <span>{isKm ? 'បញ្ច្រាស' : 'Invert'}</span>
                </button>
              </div>

              {selectedIds.size > 0 && (
                <span className="text-[11px] font-medium text-indigo-300 bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 rounded-md">
                  {selectedIds.size} {isKm ? 'បានជ្រើសរើស' : 'selected'}
                </span>
              )}
            </div>

            {/* Bulk Action Controls */}
            {selectedIds.size > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 animate-in fade-in duration-200">
                {/* Bulk Download / Start Selected */}
                <button
                  type="button"
                  id="batch-download-selected-btn"
                  onClick={handleStartSelected}
                  disabled={isProcessing}
                  className="px-2.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  title={isKm ? 'ទាញយកធាតុដែលបានជ្រើសរើស' : 'Download Selected Items'}
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>{isKm ? `ទាញយក (${selectedIds.size})` : `Download (${selectedIds.size})`}</span>
                </button>

                {/* Bulk Pause */}
                <button
                  type="button"
                  id="batch-bulk-pause-btn"
                  onClick={handleBulkPause}
                  className="px-2.5 py-1 text-xs font-semibold bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-500/40 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  title={isKm ? 'ផ្អាកធាតុដែលបានជ្រើសរើស' : 'Pause selected items'}
                >
                  <Pause className="w-3 h-3 text-amber-400" />
                  <span>{isKm ? `ផ្អាក (${selectedIds.size})` : `Pause (${selectedIds.size})`}</span>
                </button>

                {/* Bulk Resume */}
                {queue.some(item => selectedIds.has(item.id) && item.status === 'paused') && (
                  <button
                    type="button"
                    id="batch-bulk-resume-btn"
                    onClick={handleBulkResume}
                    className="px-2.5 py-1 text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    title={isKm ? 'បន្តធាតុដែលបានជ្រើសរើស' : 'Resume selected items'}
                  >
                    <Play className="w-3 h-3 fill-emerald-300 text-emerald-300" />
                    <span>{isKm ? 'បន្ត' : 'Resume'}</span>
                  </button>
                )}

                {/* Bulk Format Setters */}
                <button
                  type="button"
                  id="batch-bulk-mp4-btn"
                  onClick={() => handleBulkSetFormat('mp4')}
                  className="px-2 py-1 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 rounded-lg transition-colors cursor-pointer"
                  title={isKm ? 'ប្តូរទៅ MP4' : 'Set to MP4'}
                >
                  MP4
                </button>
                <button
                  type="button"
                  id="batch-bulk-mp3-btn"
                  onClick={() => handleBulkSetFormat('mp3')}
                  className="px-2 py-1 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-violet-300 border border-violet-500/30 rounded-lg transition-colors cursor-pointer"
                  title={isKm ? 'ប្តូរទៅ MP3' : 'Set to MP3'}
                >
                  MP3
                </button>

                {/* Bulk Copy Selected URLs */}
                <button
                  type="button"
                  id="batch-copy-selected-urls-btn"
                  onClick={handleCopySelectedUrls}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  title={isKm ? 'ចម្លង URL ដែលបានជ្រើសរើស' : 'Copy selected URLs'}
                >
                  {copiedSelectedUrls ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-300">{isKm ? 'បានចម្លង!' : 'Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-indigo-400" />
                      <span>{isKm ? `ចម្លង (${selectedIds.size})` : `Copy (${selectedIds.size})`}</span>
                    </>
                  )}
                </button>

                {/* Bulk Retry Failed */}
                {selectedErrorCount > 0 && (
                  <button
                    type="button"
                    id="batch-retry-selected-btn"
                    onClick={handleBulkRetry}
                    className="px-2.5 py-1 text-xs font-semibold bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    title={isKm ? 'សាកល្បងធាតុដែលមានកំហុសឡើងវិញ' : 'Retry selected failed'}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{isKm ? `សាកល្បង (${selectedErrorCount})` : `Retry (${selectedErrorCount})`}</span>
                  </button>
                )}

                {/* Bulk Remove */}
                <button
                  type="button"
                  id="batch-remove-selected-btn"
                  onClick={handleBulkRemove}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-900 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-500/40 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  title={isKm ? 'លុបធាតុដែលបានជ្រើសរើសចេញពីជួរ' : 'Remove selected from queue'}
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{isKm ? `លុប (${selectedIds.size})` : `Remove (${selectedIds.size})`}</span>
                </button>

                {/* Clear Selection */}
                <button
                  type="button"
                  id="batch-clear-selection-btn"
                  onClick={() => setSelectedIds(new Set())}
                  className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {isKm ? 'បោះបង់' : 'Clear selection'}
                </button>
              </div>
            )}

            {/* Quick Copy All URLs action when no items are individually selected */}
            {selectedIds.size === 0 && queue.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="batch-copy-all-urls-sub-btn"
                  onClick={handleCopyAllUrls}
                  className="px-2.5 py-1 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  title={isKm ? 'ចម្លង URL ទាំងអស់ក្នុងជួរ (បំបែកដោយបន្ទាត់ថ្មី)' : 'Copy all URLs currently in queue (Newline-separated)'}
                >
                  {copiedAllUrls ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-300">{isKm ? 'បានចម្លង!' : 'Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-indigo-400" />
                      <span>{isKm ? 'ចម្លង URL ទាំងអស់' : 'Copy all URLs'}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Queue Items List */}
          <div className="flex flex-col gap-2.5 max-h-[580px] overflow-y-auto pr-1 scrollbar-thin">
            {filteredQueue.map((item, index) => {
              const originalIndex = queue.findIndex(q => q.id === item.id) + 1;
              const isItemSelected = selectedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  id={`queue-item-${item.id}`}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isItemSelected
                      ? 'ring-1 ring-indigo-500 border-indigo-500/80 bg-indigo-950/20 shadow-md shadow-indigo-950/30'
                      : item.status === 'completed'
                      ? 'bg-slate-950/60 border-emerald-500/20'
                      : item.status === 'downloading' || item.status === 'resolving'
                      ? 'bg-indigo-950/30 border-indigo-500/50 shadow-md shadow-indigo-950/40'
                      : item.status === 'retrying'
                      ? 'bg-amber-950/25 border-amber-500/50 shadow-md shadow-amber-950/40'
                      : item.status === 'error'
                      ? 'bg-rose-950/30 border-rose-500/40'
                      : 'bg-slate-950/80 border-slate-800/80'
                  }`}
                >
                  {/* Left Side: Checkbox, Number, Thumbnail, Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      id={`batch-item-checkbox-${item.id}`}
                      checked={isItemSelected}
                      onChange={() => handleToggleSelectItem(item.id)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer accent-indigo-600 shrink-0"
                      aria-label={`Select item #${originalIndex}`}
                    />
                    <span className="w-6 text-center font-mono text-xs text-slate-500 font-bold shrink-0">
                      #{originalIndex}
                    </span>

                    {/* Thumbnail if resolved */}
                    <div className="w-12 h-16 rounded-lg bg-slate-900 overflow-hidden shrink-0 border border-slate-800 flex items-center justify-center relative">
                      {item.data?.cover ? (
                        <img
                          src={item.data.cover}
                          alt={item.data.title}
                          className="w-full h-full object-cover"
                          onError={e => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Film className="w-5 h-5 text-slate-600" />
                      )}

                      {/* Small preview eye button if ready */}
                      {item.data && (
                        <button
                          onClick={() => setPreviewVideo(item.data!)}
                          className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                          title={isKm ? 'មើលវីដេអូ' : 'Preview'}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Title and details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-2">
                        <p className="text-xs sm:text-sm font-semibold text-slate-100 truncate" title={item.data?.title || item.rawUrl}>
                          {item.data?.title || item.rawUrl}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-400">
                        {item.data?.author && (
                          <span className="text-slate-300 font-medium">
                            @{item.data.author.username}
                          </span>
                        )}
                        {item.data?.fileSizeFormatted && (
                          <>
                            <span>•</span>
                            <span className="text-slate-400">{item.data.fileSizeFormatted}</span>
                          </>
                        )}
                        {item.error && (
                          <span
                            className={`${
                              item.status === 'retrying' ? 'text-amber-300 font-medium' : 'text-rose-400 font-medium'
                            } truncate max-w-xs sm:max-w-md`}
                            title={item.error}
                          >
                            • {item.error}
                          </span>
                        )}
                      </div>

                      {/* Progress bar if downloading or retrying */}
                      {(item.status === 'downloading' || item.status === 'resolving' || item.status === 'retrying') && (
                        <div className="w-full bg-slate-900 rounded-full h-1.5 mt-2 overflow-hidden border border-indigo-500/20">
                          <div
                            className={`h-full rounded-full transition-all duration-200 ${
                              item.status === 'retrying'
                                ? 'bg-gradient-to-r from-amber-500 to-orange-400 animate-pulse'
                                : 'bg-gradient-to-r from-indigo-500 to-violet-400'
                            }`}
                            style={{ width: `${item.status === 'retrying' ? 100 : item.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Format, Status Badge, Item Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                    {/* Format Toggle per item */}
                    <button
                      type="button"
                      disabled={item.status === 'downloading' || item.status === 'completed'}
                      onClick={() =>
                        updateItem(item.id, {
                          format: item.format === 'mp4' ? 'mp3' : 'mp4'
                        })
                      }
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        item.format === 'mp4'
                          ? 'bg-indigo-950 text-indigo-300 border-indigo-500/40 hover:bg-indigo-900/50'
                          : 'bg-violet-950 text-violet-300 border-violet-500/40 hover:bg-violet-900/50'
                      } disabled:opacity-50`}
                      title={isKm ? 'ចុចដើម្បីប្តូរទម្រង់ MP4/MP3' : 'Click to toggle format MP4/MP3'}
                    >
                      {item.format.toUpperCase()}
                    </button>

                    {/* Status Badge */}
                    <div className="flex items-center">
                      {item.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isKm ? 'បានទាញយក' : 'Downloaded'}</span>
                        </span>
                      )}

                      {item.status === 'downloading' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2.5 py-1 rounded-lg">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                          <span>{item.progress}%</span>
                        </span>
                      )}

                      {item.status === 'resolving' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-sky-500/20 text-sky-200 border border-sky-500/40 px-2.5 py-1 rounded-lg animate-pulse shadow-sm shadow-sky-500/10">
                          <Zap className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
                          <span>{isKm ? 'កំពុងពិនិត្យ...' : 'Resolving...'}</span>
                        </span>
                      )}

                      {item.status === 'retrying' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg animate-pulse">
                          <RotateCcw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                          <span>
                            {isKm ? `ព្យាយាមឡើងវិញ #${item.retryCount || 1}` : `Retrying #${item.retryCount || 1}`}
                            {item.retryCountdown !== undefined ? ` (${item.retryCountdown}s)` : ''}
                          </span>
                        </span>
                      )}

                      {item.status === 'ready' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/30 px-2.5 py-1 rounded-lg">
                          <Check className="w-3.5 h-3.5 text-teal-400" />
                          <span>{isKm ? 'ពិនិត្យរួចរាល់' : 'Ready'}</span>
                        </span>
                      )}

                      {item.status === 'pending' && (
                        <span className="text-xs font-medium bg-slate-900 text-slate-400 border border-slate-800 px-2.5 py-1 rounded-lg">
                          {isKm ? 'ក្នុងជួរ' : 'In Queue'}
                        </span>
                      )}

                      {item.status === 'paused' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg">
                          <Pause className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isKm ? 'បានផ្អាក' : 'Paused'}</span>
                        </span>
                      )}

                      {item.status === 'error' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded-lg">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{isKm ? 'បរាជ័យ' : 'Failed'}</span>
                        </span>
                      )}
                    </div>

                    {/* Quick Row Buttons */}
                    <div className="flex items-center gap-1">
                      {/* Resume button for paused item */}
                      {item.status === 'paused' && (
                        <button
                          type="button"
                          onClick={() => handleResumeItem(item.id)}
                          className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                          title={isKm ? 'បន្តការទាញយកភាគនេះ' : 'Resume download for this episode'}
                        >
                          <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                          <span>{isKm ? 'បន្ត' : 'Resume'}</span>
                        </button>
                      )}

                      {/* Pause button for active downloading/resolving/retrying item */}
                      {(item.status === 'downloading' || item.status === 'resolving' || item.status === 'retrying') && (
                        <button
                          type="button"
                          onClick={() => handlePauseItem(item.id)}
                          className="px-2 py-1.5 text-xs font-medium text-amber-300 hover:text-white bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/40 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          title={isKm ? 'ផ្អាកការទាញយកភាគនេះ' : 'Pause this episode'}
                        >
                          <Pause className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isKm ? 'ផ្អាក' : 'Pause'}</span>
                        </button>
                      )}

                      {/* Quick pause button for pending or ready item */}
                      {(item.status === 'pending' || item.status === 'ready') && (
                        <button
                          type="button"
                          onClick={() => handlePauseItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title={isKm ? 'ផ្អាកភាគនេះក្នុងជួរ' : 'Pause this item in queue'}
                        >
                          <Pause className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Skip Episode Button when retrying or error */}
                      {(item.status === 'retrying' || item.status === 'error') && (
                        <button
                          type="button"
                          onClick={() => handleSkipItem(item.id)}
                          className="px-2 py-1.5 text-xs font-medium text-amber-300 hover:text-white bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/30 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          title={isKm ? 'រំលងភាគនេះដើម្បីទាញយកភាគបន្ទាប់' : 'Skip this episode, proceed to next'}
                        >
                          <SkipForward className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isKm ? 'រំលង' : 'Skip'}</span>
                        </button>
                      )}

                      {(item.status === 'error' || item.status === 'retrying') && (
                        <button
                          onClick={() => handleRetryItem(item)}
                          className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                          title={isKm ? 'សាកល្បងឡើងវិញភ្លាមៗ' : 'Retry Now'}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Individual quick check button for pending items */}
                      {item.status === 'pending' && !item.data && (
                        <button
                          type="button"
                          onClick={() => handleFastCheckSingleItem(item)}
                          className="p-1.5 text-sky-400 hover:text-white bg-sky-950/40 hover:bg-sky-900/50 border border-sky-500/30 rounded-lg transition-colors cursor-pointer"
                          title={isKm ? 'ពិនិត្យវីដេអូនេះភ្លាមៗ' : 'Check this video now'}
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                        </button>
                      )}

                      {item.status !== 'downloading' && item.status !== 'retrying' && item.status !== 'paused' && (
                        <button
                          onClick={() => handleRetryItem(item)}
                          className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title={isKm ? 'ទាញយកភ្លាមៗ' : 'Download Now'}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <a
                        href={item.rawUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title={isKm ? 'បើកមើលលើ TikTok' : 'Open in TikTok'}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={item.status === 'downloading'}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                        title={isKm ? 'លុបចេញពីជួរ' : 'Remove from queue'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Select All / Deselect All Toolbar for long lists */}
          {filteredQueue.length >= 4 && (
            <div
              id="batch-queue-footer-selection"
              className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/90 border border-slate-800/90 rounded-xl text-xs"
            >
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  id="batch-footer-select-all-btn"
                  onClick={handleSelectAllQueue}
                  disabled={isAllSelected}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-200 hover:text-white border border-slate-700/80 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  title={isKm ? 'ជ្រើសរើសវីដេអូទាំងអស់ (Select All)' : 'Select all items in queue'}
                >
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isKm ? 'ជ្រើសរើសទាំងអស់ (Select All)' : 'Select All'}</span>
                </button>

                <button
                  type="button"
                  id="batch-footer-deselect-all-btn"
                  onClick={handleDeselectAllQueue}
                  disabled={selectedIds.size === 0}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 hover:text-white border border-slate-700/80 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  title={isKm ? 'ដោះការជ្រើសរើសទាំងអស់ (Deselect All)' : 'Deselect all items'}
                >
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isKm ? 'ដោះការជ្រើសរើស (Deselect All)' : 'Deselect All'}</span>
                </button>

                <span className="text-[11px] text-slate-400 font-mono">
                  ({selectedIds.size}/{filteredQueue.length} {isKm ? 'បានជ្រើសរើស' : 'selected'})
                </span>
              </div>

              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleStartSelected}
                    disabled={isProcessing}
                    className="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>{isKm ? `ទាញយក (${selectedIds.size})` : `Download (${selectedIds.size})`}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBulkRemove}
                    disabled={isProcessing}
                    className="px-2.5 py-1.5 text-xs font-semibold bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/30 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    title={isKm ? 'លុបធាតុដែលបានជ្រើស' : 'Remove selected'}
                  >
                    <Trash2 className="w-3 h-3 text-rose-400" />
                    <span>{isKm ? 'លុប' : 'Remove'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Video Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4 text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-indigo-400" />
                <h4 className="font-bold text-sm truncate max-w-[280px]">
                  {previewVideo.title || 'Video Preview'}
                </h4>
              </div>
              <button
                onClick={() => setPreviewVideo(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-[420px] flex items-center justify-center">
              <video
                ref={batchPreviewVideoRef}
                src={`/api/stream?url=${encodeURIComponent(previewVideo.videoUrl)}&sourceUrl=${encodeURIComponent(previewVideo.sourceUrl || '')}`}
                poster={previewVideo.cover}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            </div>

            <VideoVolumeControl
              videoRef={batchPreviewVideoRef}
              isKm={isKm}
              variant="compact"
            />

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400 font-mono">
                @{previewVideo.author.username} • {previewVideo.fileSizeFormatted}
              </span>
              <button
                onClick={() => setPreviewVideo(null)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer"
              >
                {isKm ? 'បិទ' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Queue Delayed Scheduler Modal */}
      <BatchQueueSchedulerModal
        isOpen={isSchedulerModalOpen}
        onClose={() => setIsSchedulerModalOpen(false)}
        onSchedule={handleSchedule}
        isKm={isKm}
        queueCount={totalCount > 0 ? totalCount : detectedUrls.length}
      />
    </div>
  );
}
