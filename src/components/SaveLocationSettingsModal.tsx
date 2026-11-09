import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  FolderCheck,
  Download,
  Zap,
  RotateCcw,
  Sparkles,
  Check,
  Trash2,
  Sliders,
  Database,
  Smartphone,
  Layers,
  FileVideo,
  Music,
  CheckCircle2,
  FolderDown,
  Info,
  Clock,
  Calendar,
  History,
  Bell,
  Volume2,
  VolumeX,
  AlertCircle,
  ExternalLink,
  Palette
} from 'lucide-react';
import { AppSettings, VideoInfo, HistoryItem } from '../types';
import FilenameSettingsPreview from './FilenameSettingsPreview';
import { THEME_PRESETS, ThemePresetId, applyTheme } from '../utils/themePresets';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  testDownloadNotification,
  playNotificationChime,
  DownloadSoundStyle,
  playDownloadCompleteSound
} from '../utils/notificationHelper';

interface SaveLocationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (updater: (prev: AppSettings) => AppSettings) => void;
  onResetSettings: () => void;
  isKm: boolean;
  videoData?: VideoInfo | null;
  history?: HistoryItem[];
  onCleanupHistory?: (days: number) => number;
  initialTab?: 'location' | 'storage' | 'quality' | 'notifications' | 'appearance';
}

interface StorageEstimateData {
  quota: number; // in bytes
  usage: number; // in bytes
  available: number; // in bytes
  percentUsed: number;
}

export default function SaveLocationSettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetSettings,
  isKm,
  videoData,
  history = [],
  onCleanupHistory,
  initialTab
}: SaveLocationSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'location' | 'storage' | 'quality' | 'notifications' | 'appearance'>(initialTab || 'location');
  const [storageData, setStorageData] = useState<StorageEstimateData | null>(null);
  const [storageLoading, setStorageLoading] = useState(true);
  const [clearedNotice, setClearedNotice] = useState(false);
  const [manualCleanNotice, setManualCleanNotice] = useState<number | null>(null);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(getNotificationPermission());
  const [isTestingNotif, setIsTestingNotif] = useState(false);
  const [playingSoundStyle, setPlayingSoundStyle] = useState<string | null>(null);

  const handlePreviewSound = (style: DownloadSoundStyle) => {
    setPlayingSoundStyle(style);
    playNotificationChime(style);
    setTimeout(() => setPlayingSoundStyle(null), 1000);
  };

  useEffect(() => {
    if (isOpen) {
      setNotifPerm(getNotificationPermission());
      if (initialTab) {
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, initialTab]);

  const autoDays = settings.autoCleanupDays ?? 7;
  const cutoffTime = Date.now() - autoDays * 24 * 60 * 60 * 1000;
  const expiredCount = (history || []).filter(item => (item.timestamp || 0) < cutoffTime).length;

  const handleTriggerManualCleanup = () => {
    if (onCleanupHistory) {
      const removed = onCleanupHistory(autoDays);
      setManualCleanNotice(removed);
      setTimeout(() => setManualCleanNotice(null), 3000);
    }
  };

  // Fetch actual browser device storage estimate
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function checkStorage() {
      try {
        if (navigator.storage && navigator.storage.estimate) {
          const estimate = await navigator.storage.estimate();
          if (isMounted && estimate.quota && estimate.quota > 0) {
            const quota = estimate.quota;
            const usage = estimate.usage || 0;
            const available = Math.max(0, quota - usage);
            const percentUsed = Math.min(100, Math.round((usage / quota) * 100));
            setStorageData({ quota, usage, available, percentUsed });
          }
        }
      } catch (err) {
        console.warn('Storage estimate unavailable:', err);
      } finally {
        if (isMounted) setStorageLoading(false);
      }
    }

    checkStorage();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Format bytes helper
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Calculate smart size estimates based on duration
  const durationSec = videoData?.duration && videoData.duration > 0 ? videoData.duration : 60;
  
  // Approximate bitrates: 4k ~ 15Mbps, 1080p ~ 4.5Mbps, 720p ~ 2Mbps, 480p ~ 1Mbps, mp3 ~ 320kbps
  const calcSizeMB = (mbps: number) => {
    const totalBytes = (durationSec * (mbps * 1024 * 1024)) / 8;
    return Math.max(1, Math.round(totalBytes / (1024 * 1024)));
  };

  const estimatedSizes = {
    '4k': calcSizeMB(14.5),
    '1080p': calcSizeMB(4.2),
    '720p': calcSizeMB(1.8),
    '480p': calcSizeMB(0.9),
    mp3: Math.max(1, Math.round((durationSec * 320 * 1000) / (8 * 1024 * 1024)))
  };

  const handleClearCache = () => {
    try {
      if (typeof window !== 'undefined') {
        // Clear session storage & temporary blob records
        sessionStorage.clear();
      }
      setClearedNotice(true);
      setTimeout(() => setClearedNotice(false), 3000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      {/* Smart Adaptive Card Container */}
      <div
        id="settings-modal-card"
        className="bg-slate-900/98 border border-slate-800/90 rounded-2xl w-full max-w-2xl max-h-[92vh] sm:max-h-[86vh] shadow-2xl flex flex-col overflow-hidden text-slate-100 ring-1 ring-white/10"
      >
        {/* Top Gradient Accent Line */}
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-sky-400 to-pink-500 shrink-0" />

        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-800/90 flex items-center justify-between gap-3 shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/25 to-purple-500/25 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white truncate">
                  {isKm ? 'ការកំណត់ទីតាំងរក្សាទុក & ទំហំឆ្លាតវ៉ៃ' : 'Save Location & Smart Storage'}
                </h3>
                <span className="hidden xs:inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  <Sparkles className="w-2.5 h-2.5" />
                  {isKm ? 'ឆ្លាតវ៉ៃ (Smart)' : 'Smart Size'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {isKm
                  ? 'គ្រប់គ្រង Folder រក្សាទុក ឈ្មោះឯកសារ និងទំហំផ្ទុកទូរស័ព្ទ/កុំព្យូទ័រ'
                  : 'Manage save directory, naming scheme, and storage capacity'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {storageData && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300">
                <Database className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-medium">
                  {isKm ? 'ទំនេរ' : 'Free'}: <strong className="text-emerald-400">{formatBytes(storageData.available)}</strong>
                </span>
              </div>
            )}
            <button
              id="close-settings-modal-btn"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Smart Navigation Tabs */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-slate-800/70 bg-slate-950/40 shrink-0 flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('location')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'location'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
            }`}
          >
            <FolderCheck className="w-3.5 h-3.5" />
            <span>{isKm ? 'ទីតាំង & ឈ្មោះឯកសារ' : 'Folder & Naming'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('storage')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'storage'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30 border border-sky-400/40'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{isKm ? 'ទំហំផ្ទុកឆ្លាតវ៉ៃ' : 'Smart Storage'}</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/20 font-bold">
              {estimatedSizes['1080p']}MB
            </span>
            {settings.autoCleanupHistory && (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-200 font-bold border border-amber-400/40">
                Auto: {autoDays}d
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quality')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'quality'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 border border-purple-400/40'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isKm ? 'គុណភាព & ល្បឿន' : 'Quality & Speed'}</span>
          </button>

          <button
            type="button"
            id="modal-tab-notifications-btn"
            onClick={() => setActiveTab('notifications')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 border border-emerald-400/40'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
            }`}
          >
            {settings.downloadNotificationSound !== false ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{isKm ? 'ការជូនដំណឹង & សំឡេង' : 'Alerts & Sound'}</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold border ${
              settings.downloadNotificationSound !== false
                ? 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30'
                : 'bg-slate-750 text-slate-400 border-slate-650'
            }`}>
              {settings.downloadNotificationSound !== false ? (isKm ? 'សំឡេង ON' : 'Sound ON') : (isKm ? 'បិទ' : 'Muted')}
            </span>
          </button>

          <button
            type="button"
            id="modal-tab-appearance-btn"
            onClick={() => setActiveTab('appearance')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'appearance'
                ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30 border border-pink-400/40'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>{isKm ? 'រចនាបថពណ៌ (Themes)' : 'Themes & Aesthetics'}</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/20 font-bold">
              {THEME_PRESETS.length}
            </span>
          </button>
        </div>

        {/* Scrollable Modal Content with Smart Proportions */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-sm custom-scrollbar">
          {/* TAB 1: LOCATION & FILENAMES */}
          {activeTab === 'location' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Option 1: Choose Location behavior */}
              <div className="flex flex-col gap-2">
                <label className="font-semibold text-slate-200 flex items-center justify-between text-xs sm:text-sm">
                  <span className="flex items-center gap-1.5">
                    <FolderDown className="w-4 h-4 text-indigo-400" />
                    {isKm ? 'វិធីរក្សាទុកឯកសារ (Save Location Behavior)' : 'Save Location Behavior'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {settings.promptLocation
                      ? (isKm ? 'សួររក Folder' : 'Prompt active')
                      : (isKm ? 'ស្វ័យប្រវត្តិ' : 'Auto downloads')}
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => onUpdateSettings(s => ({ ...s, promptLocation: true }))}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      settings.promptLocation
                        ? 'bg-indigo-950/50 border-indigo-500/80 text-white shadow-md shadow-indigo-950/40 ring-1 ring-indigo-500/30'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <FolderCheck className={`w-5 h-5 mt-0.5 shrink-0 ${settings.promptLocation ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <div className="min-w-0">
                      <p className="font-semibold text-xs sm:text-sm text-white">
                        {isKm ? 'សួររក Folder រាល់ពេល (Save As...)' : 'Prompt for Folder (Save As...)'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {isKm
                          ? 'បើកផ្ទាំង File Dialog ជ្រើសរើសទីតាំង (Desktop, Downloads, Drive D:) និងប្តូរឈ្មោះបានតាមចិត្ត'
                          : 'Pops up system file dialog to pick any folder and customize name before saving'}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateSettings(s => ({ ...s, promptLocation: false }))}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      !settings.promptLocation
                        ? 'bg-indigo-950/50 border-indigo-500/80 text-white shadow-md shadow-indigo-950/40 ring-1 ring-indigo-500/30'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <Download className={`w-5 h-5 mt-0.5 shrink-0 ${!settings.promptLocation ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <div className="min-w-0">
                      <p className="font-semibold text-xs sm:text-sm text-white">
                        {isKm ? 'ទាញយកភ្លាមៗចូល Downloads (Quick Save)' : 'Direct Quick Save (Downloads)'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {isKm
                          ? 'ទាញយកភ្លាមៗដោយចុចតែម្តងចូល Folder លំនាំដើមរបស់ Browser ដោយមិនចាំបាច់រង់ចាំ'
                          : 'Immediate 1-click download directly into default browser folder without interruption'}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Option 2: Filename pattern preview */}
              <FilenameSettingsPreview
                settings={settings}
                onChangeSettings={onUpdateSettings}
                isKm={isKm}
                videoData={videoData}
              />

              {/* Browser Directory Guide */}
              <div className="bg-slate-950/60 rounded-xl p-3 sm:p-3.5 border border-slate-800/80 text-xs text-slate-400 flex flex-col gap-1.5">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-sky-400" />
                  {isKm ? 'របៀបកំណត់ Folder ទាញយកក្នុង Browser (Chrome, Edge, Safari):' : 'Browser Download Directory Settings:'}
                </span>
                <p className="leading-relaxed text-[11px]">
                  {isKm
                    ? '• Chrome / Edge: ចូល Settings > Downloads > កំណត់ "Location" ឬបើក "Ask where to save each file before downloading" ប្រសិនបើអ្នកចង់ជ្រើសរើស Folder គ្រប់ពេល។'
                    : '• Chrome / Edge: Go to Settings > Downloads > Set your desired folder or toggle "Ask where to save each file before downloading".'}
                </p>
                <p className="leading-relaxed text-[11px]">
                  {isKm
                    ? '• ទូរស័ព្ទ Android / iOS: ឯកសារនឹងរក្សាទុកក្នុងកម្មវិធី Files ឬ Downloads Folder ដោយស្វ័យប្រវត្តិ។'
                    : '• Mobile (Android/iOS): Files will automatically download to your device Files / Downloads album.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: SMART STORAGE & CAPACITY (ទំហំផ្ទុកឆ្លាតវ៉ៃ) */}
          {activeTab === 'storage' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Real Device Storage Gauge */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/30 border border-slate-800 shadow-md flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-sky-400" />
                    <span className="font-bold text-xs sm:text-sm text-white">
                      {isKm ? 'ស្ថានភាពទំហំផ្ទុកឧបករណ៍ (Device Storage Health)' : 'Device Storage Status'}
                    </span>
                  </div>
                  {storageData ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      {isKm ? 'ទំហំទំនេរច្រើន' : 'Healthy Quota'}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">
                      {storageLoading ? (isKm ? 'កំពុងពិនិត្យ...' : 'Checking...') : (isKm ? 'គាំទ្រស្វ័យប្រវត្តិ' : 'Supported')}
                    </span>
                  )}
                </div>

                {storageData ? (
                  <div className="space-y-1.5">
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 transition-all duration-500"
                        style={{ width: `${Math.max(4, storageData.percentUsed)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{isKm ? 'បានប្រើប្រាស់' : 'Used'}: <strong className="text-slate-200">{formatBytes(storageData.usage)}</strong></span>
                      <span>{isKm ? 'ទំហំទំនេរ' : 'Free Space'}: <strong className="text-emerald-400">{formatBytes(storageData.available)}</strong></span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    {isKm
                      ? 'ឧបករណ៍របស់អ្នកមានទំហំផ្ទុកគ្រប់គ្រាន់សម្រាប់ទាញយកវីដេអូកម្រិត 4K និង 1080p ដោយរលូន។'
                      : 'Your device storage allows seamless downloads for high-resolution 4K and 1080p media.'}
                  </p>
                )}
              </div>

              {/* Smart File Size Estimator for Current Video */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-200 text-xs sm:text-sm flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <span>{isKm ? 'ការគណនាទំហំឆ្លាតវ៉ៃតាមកម្រិតគុណភាព (Smart Sizing Calculator)' : 'Smart Resolution Sizing Calculator'}</span>
                  </label>
                  <span className="text-[11px] text-indigo-300 font-medium">
                    ⏱️ {Math.floor(durationSec / 60)}:{(durationSec % 60).toString().padStart(2, '0')} ({durationSec}s)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* 4K */}
                  <button
                    type="button"
                    onClick={() => onUpdateSettings(s => ({ ...s, defaultQuality: '4k' }))}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      settings.defaultQuality === '4k'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300 ring-1 ring-amber-500/30'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs">4K UHD</span>
                      <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-black">2160p</span>
                    </div>
                    <span className="text-base font-black text-white">~{estimatedSizes['4k']} MB</span>
                    <span className="text-[10px] text-slate-400 leading-tight">
                      {isKm ? 'ច្បាស់ឥតខ្ចោះលើ TV/Monitor' : 'Ultra Clarity for Big Screens'}
                    </span>
                  </button>

                  {/* 1080p */}
                  <button
                    type="button"
                    onClick={() => onUpdateSettings(s => ({ ...s, defaultQuality: '1080p' }))}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      (settings.defaultQuality || '1080p') === '1080p'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500/30'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs">1080p FHD</span>
                      <span className="text-[9px] px-1 rounded bg-indigo-500/20 text-indigo-300 font-bold">Best</span>
                    </div>
                    <span className="text-base font-black text-white">~{estimatedSizes['1080p']} MB</span>
                    <span className="text-[10px] text-emerald-400 font-medium leading-tight">
                      {isKm ? '★ សន្សំទំហំ 65%' : '★ Saves 65% space'}
                    </span>
                  </button>

                  {/* 720p */}
                  <button
                    type="button"
                    onClick={() => onUpdateSettings(s => ({ ...s, defaultQuality: '720p' }))}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      settings.defaultQuality === '720p'
                        ? 'bg-sky-600/20 border-sky-500 text-sky-200 ring-1 ring-sky-500/30'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs">720p HD</span>
                      <span className="text-[9px] px-1 rounded bg-sky-500/20 text-sky-300 font-bold">Fast</span>
                    </div>
                    <span className="text-base font-black text-white">~{estimatedSizes['720p']} MB</span>
                    <span className="text-[10px] text-emerald-400 font-medium leading-tight">
                      {isKm ? '★ សន្សំទំហំ 82%' : '★ Saves 82% space'}
                    </span>
                  </button>

                  {/* 480p */}
                  <button
                    type="button"
                    onClick={() => onUpdateSettings(s => ({ ...s, defaultQuality: '480p' }))}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      settings.defaultQuality === '480p'
                        ? 'bg-violet-600/20 border-violet-500 text-violet-200 ring-1 ring-violet-500/30'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs">480p SD</span>
                      <span className="text-[9px] px-1 rounded bg-violet-500/20 text-violet-300 font-bold">Light</span>
                    </div>
                    <span className="text-base font-black text-white">~{estimatedSizes['480p']} MB</span>
                    <span className="text-[10px] text-emerald-400 font-medium leading-tight">
                      {isKm ? '★ សន្សំទំហំ 92%' : '★ Saves 92% space'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Smart Space Saver Strategy */}
              <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-indigo-200">
                    {isKm ? 'គន្លឹះគ្រប់គ្រងទំហំផ្ទុកឆ្លាតវ៉ៃ (Smart Storage Tip)' : 'Smart Storage Optimization Advice'}
                  </p>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    {isKm
                      ? 'សម្រាប់ទូរស័ព្ទដៃ ឬការចែករំលែកតាម Telegram/Messenger ការជ្រើសរើសគុណភាព 1080p FHD ឬ 720p HD ផ្តល់ភាពច្បាស់ល្អឥតខ្ចោះ និងសន្សំទំហំអង្គចងចាំបានរហូតដល់ 70% ធៀបនឹង 4K UHD!'
                      : 'For mobile screens or quick sharing over messaging apps, 1080p FHD or 720p HD delivers crisp visual quality while freeing up to 70% device memory compared to 4K UHD.'}
                  </p>
                </div>
              </div>

              {/* Auto-Cleanup Download History Section */}
              <div
                id="auto-cleanup-settings-section"
                className={`p-4 rounded-xl transition-all border ${
                  settings.autoCleanupHistory
                    ? 'bg-gradient-to-br from-amber-950/20 via-slate-950 to-slate-900 border-amber-500/30 ring-1 ring-amber-500/20 shadow-md shadow-amber-950/30'
                    : 'bg-slate-950/70 border-slate-800'
                } flex flex-col gap-3.5`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                        settings.autoCleanupHistory
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-slate-100">
                          {isKm ? 'សម្អាតប្រវត្តិទាញយកស្វ័យប្រវត្តិ (Auto-Cleanup History)' : 'Auto-Cleanup Download History'}
                        </span>
                        {settings.autoCleanupHistory && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {autoDays} {isKm ? 'ថ្ងៃ' : 'Days'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                        {isKm
                          ? 'លុបប្រវត្តិទាញយកចាស់ៗចេញពី Browser ដោយស្វ័យប្រវត្តិតាមចំនួនថ្ងៃដែលអ្នកបានកំណត់។'
                          : 'Automatically clear local download history records older than your chosen number of days.'}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2 mt-0.5" title={isKm ? 'បើក/បិទ ការសម្អាតស្វ័យប្រវត្តិ' : 'Toggle Auto-Cleanup'}>
                    <input
                      id="auto-cleanup-history-toggle"
                      type="checkbox"
                      checked={settings.autoCleanupHistory ?? false}
                      onChange={e => {
                        const enabled = e.target.checked;
                        onUpdateSettings(s => ({
                          ...s,
                          autoCleanupHistory: enabled,
                          autoCleanupDays: s.autoCleanupDays || 7
                        }));
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {settings.autoCleanupHistory && (
                  <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-3 animate-in fade-in duration-150">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          {isKm ? 'កំណត់ចំនួនថ្ងៃសម្អាត (Clear History Older Than):' : 'Clear History Older Than:'}
                        </span>
                        <span className="text-[11px] text-amber-300 font-bold">
                          {autoDays} {isKm ? 'ថ្ងៃ' : 'days'}
                        </span>
                      </label>

                      {/* Day Preset Options */}
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                        {[
                          { days: 1, labelKm: '១ ថ្ងៃ', labelEn: '1 Day' },
                          { days: 3, labelKm: '៣ ថ្ងៃ', labelEn: '3 Days' },
                          { days: 7, labelKm: '៧ ថ្ងៃ', labelEn: '7 Days', badge: isKm ? 'ណែនាំ' : 'Rec.' },
                          { days: 14, labelKm: '១៤ ថ្ងៃ', labelEn: '14 Days' },
                          { days: 30, labelKm: '៣០ ថ្ងៃ', labelEn: '30 Days' }
                        ].map(opt => {
                          const isSelected = autoDays === opt.days;
                          return (
                            <button
                              key={opt.days}
                              type="button"
                              id={`auto-cleanup-preset-${opt.days}`}
                              onClick={() => onUpdateSettings(s => ({ ...s, autoCleanupDays: opt.days }))}
                              className={`py-1.5 px-2 rounded-lg border text-xs font-medium text-center transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-sm shadow-amber-500/30'
                                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white'
                              }`}
                            >
                              <span>{isKm ? opt.labelKm : opt.labelEn}</span>
                              {opt.badge && (
                                <span className={`block text-[9px] ${isSelected ? 'text-slate-950 font-black' : 'text-amber-400 font-semibold'}`}>
                                  {opt.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom Days Input */}
                      <div className="flex items-center gap-2 mt-1 pt-2 border-t border-slate-800/60 text-xs">
                        <span className="text-slate-400 text-[11px] whitespace-nowrap">
                          {isKm ? 'ឬបញ្ចូលចំនួនថ្ងៃជាក់លាក់:' : 'Or enter custom days:'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input
                            id="auto-cleanup-custom-days-input"
                            type="number"
                            min={1}
                            max={365}
                            value={autoDays}
                            onChange={e => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val) && val >= 1 && val <= 365) {
                                onUpdateSettings(s => ({ ...s, autoCleanupDays: val }));
                              }
                            }}
                            className="w-16 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs text-center focus:outline-none focus:border-amber-400"
                          />
                          <span className="text-slate-400 text-[11px]">{isKm ? 'ថ្ងៃ' : 'days'}</span>
                        </div>
                      </div>
                    </div>

                    {/* History Status & Immediate Action */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 text-xs">
                      <div className="flex items-center gap-2 text-slate-300 text-[11px] flex-wrap">
                        <History className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {isKm ? 'ប្រវត្តិបច្ចុប្បន្ន:' : 'Current History:'}{' '}
                          <strong className="text-white">{history.length}</strong>{' '}
                          {isKm ? 'វីដេអូ' : 'items'}
                        </span>
                        {expiredCount > 0 ? (
                          <span className="text-amber-300 font-semibold">
                            • {expiredCount} {isKm ? 'ចាស់ជាង' : 'older than'} {autoDays} {isKm ? 'ថ្ងៃ' : 'days'}
                          </span>
                        ) : (
                          <span className="text-emerald-400 text-[10px]">
                            • ({isKm ? 'គ្មានប្រវត្តិចាស់ហួសកាលកំណត់ទេ' : 'no expired items'})
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        id="clean-expired-history-now-btn"
                        onClick={handleTriggerManualCleanup}
                        disabled={expiredCount === 0}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all justify-center ${
                          expiredCount > 0
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm cursor-pointer'
                            : 'bg-slate-800/50 text-slate-500 border border-slate-800 cursor-not-allowed'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>
                          {manualCleanNotice !== null
                            ? (isKm ? `បានសម្អាត ${manualCleanNotice}!` : `Cleaned ${manualCleanNotice}!`)
                            : (isKm ? `សម្អាតដែលហួស (${expiredCount})` : `Clean Expired (${expiredCount})`)}
                        </span>
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-400 italic">
                      {isKm
                        ? '💡 ចំណាំ: វីដេអូដែលអ្នកបានទាញយកចូលក្នុងកុំព្យូទ័រ/ទូរស័ព្ទរួចហើយនឹងមិនបាត់បង់ទេ គឺលុបតែបញ្ជីប្រវត្តិកត់ត្រាក្នុង Browser នេះប៉ុណ្ណោះ។'
                        : '💡 Note: Files already saved to your device disk are untouched; this only purges the in-browser record list.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Clear Temporary Cache Action */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <div>
                    <p className="font-semibold text-xs text-slate-200">
                      {isKm ? 'សម្អាតទំហំ Cache បណ្តោះអាសន្ន' : 'Clear Temporary Blob Memory'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {isKm ? 'ដោះលែងអង្គចងចាំ RAM និងទិន្នន័យបណ្តោះអាសន្នក្នុង Browser' : 'Frees up browser memory and temporary session cache'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClearCache}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                >
                  {clearedNotice ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      {isKm ? 'បានសម្អាត!' : 'Cleared!'}
                    </span>
                  ) : (
                    isKm ? 'សម្អាតឥឡូវនេះ' : 'Clear Now'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: QUALITY & SPEED */}
          {activeTab === 'quality' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Default Quality Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-200 flex items-center justify-between text-xs sm:text-sm">
                  <span>{isKm ? 'គុណភាពវីដេអូលំនាំដើម (Default Quality)' : 'Default Video Quality'}</span>
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                    {settings.defaultQuality?.toUpperCase() || '1080P'} SELECTED
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: '4k', label: '4K UHD', sub: '2160p Ultra HD' },
                    { id: '1080p', label: '1080p FHD', sub: 'Full HD 60fps' },
                    { id: '720p', label: '720p HD', sub: 'Standard HD' },
                    { id: '480p', label: '480p SD', sub: 'Data Saver' }
                  ].map(q => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => onUpdateSettings(s => ({ ...s, defaultQuality: q.id as any }))}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                        (settings.defaultQuality || '1080p') === q.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm shadow-amber-500/20 ring-1 ring-amber-500/30'
                          : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      <span className="font-bold text-xs">{q.label}</span>
                      <span className="text-[10px] opacity-75">{q.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio MP3 Bitrate */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-200 text-xs sm:text-sm flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-violet-400" />
                  <span>{isKm ? 'គុណភាពសំឡេង MP3 (Audio Bitrate)' : 'Audio Bitrate (MP3)'}</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['320k', '192k', '128k'] as const).map(b => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => onUpdateSettings(s => ({ ...s, audioBitrate: b }))}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition-all cursor-pointer ${
                        settings.audioBitrate === b
                          ? 'bg-violet-600 border-violet-500 text-white shadow-sm shadow-violet-600/30'
                          : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      {b === '320k' ? '320 kbps (ល្អបំផុត)' : b === '192k' ? '192 kbps (ស្តង់ដារ)' : '128 kbps (ទំហំតូច)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Turbo 4x Parallel Streams */}
              <div className="flex flex-col gap-2 p-3 bg-gradient-to-r from-amber-950/30 to-slate-950 rounded-xl border border-amber-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                      <Zap className="w-4 h-4 fill-amber-400" />
                    </div>
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-amber-300">
                        {isKm ? '⚡ ម៉ាស៊ីនទាញយកល្បឿនរន្ទះ (Lightning Turbo 4x Streams)' : '⚡ Lightning Turbo Accelerator (4x Streams)'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {isKm
                          ? 'ពុះចែកការទាញយកជា 4 Streams ស្របគ្នា ផ្តល់ល្បឿនលឿនបំផុត'
                          : 'Splits files into 4 concurrent range streams for maximum download speeds'}
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.turboMode ?? true}
                    onChange={e => onUpdateSettings(s => ({ ...s, turboMode: e.target.checked }))}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer shrink-0 ml-2"
                  />
                </div>
              </div>

              {/* Auto-Retry Failed Episodes */}
              <div className="flex flex-col gap-2 p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                    <div>
                      <p className="font-semibold text-xs sm:text-sm text-slate-200">
                        {isKm ? 'ព្យាយាមទាញយកឡើងវិញរហូតបានជោគជ័យ' : 'Auto-retry failed episodes until successful'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {isKm
                          ? 'នៅពេលភាគណាមួយទាញយកបរាជ័យ ប្រព័ន្ធនឹងព្យាយាមទាញយកម្តងទៀតដោយស្វ័យប្រវត្តិ'
                          : 'When an item fails, automatically retry downloading it before proceeding'}
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoRetryFailed ?? true}
                    onChange={e => onUpdateSettings(s => ({ ...s, autoRetryFailed: e.target.checked }))}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>

                {settings.autoRetryFailed !== false && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                    <span className="text-slate-400">
                      {isKm ? 'ចំនួនលើកព្យាយាមអតិបរមា:' : 'Max retry attempts:'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {[
                        { val: 0, label: isKm ? 'មិនកំណត់ (ជាចម្បង)' : 'Unlimited (Primary)' },
                        { val: 3, label: '3' },
                        { val: 5, label: '5' },
                        { val: 10, label: '10' }
                      ].map(opt => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => onUpdateSettings(s => ({ ...s, maxRetryAttempts: opt.val }))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                            (settings.maxRetryAttempts ?? 0) === opt.val
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: DOWNLOAD NOTIFICATIONS & SOUND EFFECTS */}
          {activeTab === 'notifications' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* PRIMARY FEATURE: DOWNLOAD COMPLETION SOUND EFFECT */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-500/30 shadow-lg space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                      {settings.downloadNotificationSound !== false ? (
                        <Volume2 className="w-5 h-5 text-indigo-400" />
                      ) : (
                        <VolumeX className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-100 text-sm">
                          {isKm ? 'សំឡេងជូនដំណឹងពេលទាញយកចប់ (Completion Sound Effect)' : 'Download Completion Sound Effect'}
                        </h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          settings.downloadNotificationSound !== false
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {settings.downloadNotificationSound !== false
                            ? (isKm ? '🔊 បើកសំឡេង' : '🔊 Enabled')
                            : (isKm ? '🔇 បិទសំឡេង' : '🔇 Muted')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {isKm
                          ? 'បន្លឺសំឡេងភ្លាមៗនៅពេលវីដេអូនីមួយៗ ការទាញយក MP3 ឬការទាញយកជាបាច់ត្រូវបានបញ្ចប់ ១០០%។'
                          : 'Plays an audible tone immediately whenever any video, audio, or batch queue finishes downloading.'}
                      </p>
                    </div>
                  </div>

                  {/* Master Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      type="checkbox"
                      id="toggle-master-download-sound"
                      checked={settings.downloadNotificationSound !== false}
                      onChange={e => onUpdateSettings(s => ({ ...s, downloadNotificationSound: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 border border-slate-700"></div>
                  </label>
                </div>

                {/* Sound Preset Style Selector */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">
                      {isKm ? 'ជ្រើសរើសប្រភេទសំឡេង (Sound Tone Style):' : 'Select Sound Tone Style:'}
                    </span>
                    <span className="text-[11px] text-indigo-300 font-medium">
                      {settings.downloadNotificationSound === false
                        ? (isKm ? 'បិទសំឡេង (Muted)' : 'Currently Muted')
                        : (isKm ? 'ចុចស្តាប់សាកល្បង' : 'Click to preview')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Style 1: Chime */}
                    <div
                      className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                        (settings.downloadSoundStyle || 'chime') === 'chime'
                          ? 'bg-indigo-900/30 border-indigo-500/50 text-indigo-200 ring-1 ring-indigo-500/30'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            <span>✨ {isKm ? 'Crystal Chime' : 'Crystal Chime'}</span>
                            {(settings.downloadSoundStyle || 'chime') === 'chime' && (
                              <Check className="w-3.5 h-3.5 text-indigo-400" />
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {isKm ? 'សំនៀងកណ្តឹងថ្លាស្រទន់' : 'Shimmering triple bell'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateSettings(s => ({ ...s, downloadSoundStyle: 'chime' }));
                            handlePreviewSound('chime');
                          }}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            (settings.downloadSoundStyle || 'chime') === 'chime'
                              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                              : 'bg-slate-800 hover:bg-slate-750 text-slate-200'
                          }`}
                        >
                          <Volume2 className={`w-3.5 h-3.5 ${playingSoundStyle === 'chime' ? 'animate-bounce text-amber-300' : ''}`} />
                          <span>{playingSoundStyle === 'chime' ? (isKm ? 'កំពុងបន្លឺ...' : 'Playing...') : (isKm ? 'ជ្រើស & ស្តាប់' : 'Select & Play')}</span>
                        </button>
                      </div>
                    </div>

                    {/* Style 2: Success */}
                    <div
                      className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                        settings.downloadSoundStyle === 'success'
                          ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-200 ring-1 ring-emerald-500/30'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            <span>🎉 {isKm ? 'Success Fanfare' : 'Success Fanfare'}</span>
                            {settings.downloadSoundStyle === 'success' && (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {isKm ? 'សំនៀងជោគជ័យ ៤ បន្ទរ' : 'Upbeat 4-note chord'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateSettings(s => ({ ...s, downloadSoundStyle: 'success' }));
                            handlePreviewSound('success');
                          }}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            settings.downloadSoundStyle === 'success'
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-slate-800 hover:bg-slate-750 text-slate-200'
                          }`}
                        >
                          <Volume2 className={`w-3.5 h-3.5 ${playingSoundStyle === 'success' ? 'animate-bounce text-amber-300' : ''}`} />
                          <span>{playingSoundStyle === 'success' ? (isKm ? 'កំពុងបន្លឺ...' : 'Playing...') : (isKm ? 'ជ្រើស & ស្តាប់' : 'Select & Play')}</span>
                        </button>
                      </div>
                    </div>

                    {/* Style 3: Bell */}
                    <div
                      className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                        settings.downloadSoundStyle === 'bell'
                          ? 'bg-amber-900/30 border-amber-500/50 text-amber-200 ring-1 ring-amber-500/30'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            <span>🔔 {isKm ? 'Acoustic Bell' : 'Acoustic Bell'}</span>
                            {settings.downloadSoundStyle === 'bell' && (
                              <Check className="w-3.5 h-3.5 text-amber-400" />
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {isKm ? 'សំនៀងកណ្តឹងបន្ទរធ្ងន់' : 'Warm resonant dual ring'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateSettings(s => ({ ...s, downloadSoundStyle: 'bell' }));
                            handlePreviewSound('bell');
                          }}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            settings.downloadSoundStyle === 'bell'
                              ? 'bg-amber-600 hover:bg-amber-500 text-white'
                              : 'bg-slate-800 hover:bg-slate-750 text-slate-200'
                          }`}
                        >
                          <Volume2 className={`w-3.5 h-3.5 ${playingSoundStyle === 'bell' ? 'animate-bounce text-white' : ''}`} />
                          <span>{playingSoundStyle === 'bell' ? (isKm ? 'កំពុងបន្លឺ...' : 'Playing...') : (isKm ? 'ជ្រើស & ស្តាប់' : 'Select & Play')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Browser Notifications Card */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100 text-xs sm:text-sm flex items-center gap-2">
                      <span>{isKm ? 'ការជូនដំណឹងលើកញ្ចក់អេក្រង់ (Desktop / Tab Alerts)' : 'Desktop & Background Tab Alerts'}</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      {isKm
                        ? 'បង្ហាញការជូនដំណឹង Pop-up លើកុំព្យូទ័រ និងព្រិចចំណងជើង Tab នៅពេលទាញយកឯកសារធំៗចប់។'
                        : 'Displays native browser notifications and tab title alerts when switching away.'}
                    </p>
                  </div>
                </div>

                {/* Browser Permission & Test Action */}
                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-300">
                      {isKm ? 'សិទ្ធិ Browser:' : 'Browser Permission:'}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                        notifPerm === 'granted'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : notifPerm === 'denied'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {notifPerm === 'granted' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>{isKm ? 'អនុញ្ញាតរួចរាល់' : 'Granted'}</span>
                        </>
                      ) : notifPerm === 'denied' ? (
                        <>
                          <AlertCircle className="w-3 h-3 text-rose-400" />
                          <span>{isKm ? 'បានបិទ' : 'Blocked'}</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>{isKm ? 'រង់ចាំស្នើសុំ' : 'Prompt'}</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {notifPerm !== 'granted' && (
                      <button
                        type="button"
                        id="request-notification-permission-btn"
                        onClick={async () => {
                          const res = await requestNotificationPermission();
                          setNotifPerm(res);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>{isKm ? 'ស្នើសុំសិទ្ធិ' : 'Allow'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      id="test-notification-alert-btn"
                      disabled={isTestingNotif}
                      onClick={async () => {
                        setIsTestingNotif(true);
                        const res = await testDownloadNotification(
                          isKm,
                          settings.downloadNotificationSound !== false,
                          settings.downloadSoundStyle || 'chime'
                        );
                        setNotifPerm(res);
                        setTimeout(() => setIsTestingNotif(false), 1500);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isTestingNotif ? (isKm ? 'កំពុងតេស្ត...' : 'Testing...') : (isKm ? 'តេស្តការជូនដំណឹង' : 'Test Full Alert')}</span>
                    </button>
                  </div>
                </div>

                {/* Master Desktop Notification Toggle & Conditions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        {isKm ? 'Desktop Notification' : 'Desktop Notification'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {isKm ? 'លោតផ្ទាំងជូនដំណឹងលើកុំព្យូទ័រ' : 'Native OS system popup'}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      id="toggle-download-notifications"
                      checked={settings.downloadNotificationsEnabled ?? true}
                      onChange={e => onUpdateSettings(s => ({ ...s, downloadNotificationsEnabled: e.target.checked }))}
                      className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        {isKm ? 'ពេលប្តូរ Tab / Minimize' : 'When Tab is Hidden'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {settings.notifyOnlyWhenTabHidden
                          ? (isKm ? 'ជូនដំណឹងតែពេលប្តូរ Tab' : 'Only in background')
                          : (isKm ? 'ជូនដំណឹងគ្រប់ពេល' : 'Always notify')}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      id="toggle-notify-only-hidden"
                      checked={settings.notifyOnlyWhenTabHidden ?? false}
                      onChange={e => onUpdateSettings(s => ({ ...s, notifyOnlyWhenTabHidden: e.target.checked }))}
                      className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* Minimum Threshold Selector */}
                <div className="pt-2 border-t border-slate-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isKm ? 'កម្រិតទំហំសម្រាប់ Desktop Alert (Size Filter)' : 'Desktop Alert Size Threshold'}</span>
                    </label>
                    <span className="text-xs text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                      {settings.downloadNotificationMinSizeMB ?? 50} MB+
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { val: 50, label: '50MB+', sub: isKm ? 'ស្តង់ដារ' : 'Standard' },
                      { val: 25, label: '25MB+', sub: isKm ? 'មធ្យម' : 'Medium' },
                      { val: 100, label: '100MB+', sub: isKm ? 'ធំខ្លាំង' : 'Heavy' },
                      { val: 1, label: 'All', sub: isKm ? 'គ្រប់ទំហំ' : 'All Sizes' }
                    ].map(item => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => onUpdateSettings(s => ({ ...s, downloadNotificationMinSizeMB: item.val }))}
                        className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                          (settings.downloadNotificationMinSizeMB ?? 50) === item.val
                            ? 'bg-emerald-600/20 border-emerald-500 text-slate-100 shadow-sm'
                            : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold text-xs flex items-center justify-between">
                          <span>{item.label}</span>
                          {(settings.downloadNotificationMinSizeMB ?? 50) === item.val && (
                            <Check className="w-3 h-3 text-emerald-400" />
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{item.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: THEMES & AESTHETIC PRESETS */}
          {activeTab === 'appearance' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-pink-400" />
                    <h3 className="font-semibold text-slate-200 text-xs sm:text-sm">
                      {isKm ? 'ជ្រើសរើសរចនាបថពណ៌ Theme (Aesthetic Presets)' : 'Select Aesthetic Theme Preset'}
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded-full">
                    {isKm ? 'ផ្លាស់ប្តូរភ្លាមៗ' : 'Instant Live Preview'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {isKm
                    ? 'ជ្រើសរើស Preset ដើម្បីផ្លាស់ប្តូរពណ៌ Background, Glows, Glass Buttons, និង Gradients នៃកម្មវិធីទាំងមូល៖'
                    : 'Choose a preset to update global background meshes, glowing accents, 3D glass buttons, and UI gradients:'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {THEME_PRESETS.map((preset) => {
                    const isSelected = (settings.theme || 'midnight-blue') === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          applyTheme(preset.id);
                          onUpdateSettings(s => ({ ...s, theme: preset.id }));
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-2.5 relative group ${
                          isSelected
                            ? 'bg-slate-900/90 border-indigo-400/90 shadow-lg shadow-indigo-950/60 ring-2 ring-indigo-500/30'
                            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70'
                        }`}
                      >
                        {/* Gradient Preview Header */}
                        <div
                          className="w-full h-9 rounded-lg shadow-inner relative overflow-hidden flex items-center justify-between px-3 border border-white/20"
                          style={{ background: preset.previewGradient }}
                        >
                          <div className="flex items-center gap-1.5">
                            {preset.dotColors.map((col, idx) => (
                              <span
                                key={idx}
                                className="w-2.5 h-2.5 rounded-full border border-black/30 shadow-xs"
                                style={{ backgroundColor: col }}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] font-bold text-white bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-xs border border-white/20">
                            {preset.badge}
                          </span>
                        </div>

                        {/* Title & Tagline */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-white flex items-center gap-1.5">
                              <span>{isKm ? preset.nameKm : preset.name}</span>
                            </h4>
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {isKm ? preset.taglineKm : preset.tagline}
                            </p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center border transition-colors ${
                              isSelected
                                ? 'bg-indigo-500 border-indigo-400 text-white shadow-sm shadow-indigo-500/50'
                                : 'border-slate-700 bg-slate-800/80 text-transparent'
                            }`}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 leading-relaxed flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-pink-400 shrink-0 mt-0.5" />
                <span>
                  {isKm
                    ? 'ព័ត៌មានបន្ថែម៖ Theme Preset នីមួយៗផ្លាស់ប្តូរអថេរ CSS Variables (--theme-bg-base, --theme-gradient-bg, --theme-primary, --theme-glow) ដោយស្វ័យប្រវត្តិ ធានាថាកម្រិត Contrast និងអក្សរច្បាស់ត្រជាក់ភ្នែកជានិច្ច!'
                    : 'Note: Each Theme Preset dynamically alters global CSS Variables (--theme-bg-base, --theme-gradient-bg, --theme-primary, --theme-glow), ensuring high accessibility, contrast, and visual polish across all viewports.'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Sticky Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-800/90 bg-slate-900/95 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onResetSettings}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer py-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isKm ? 'កំណត់លំនាំដើមឡើងវិញ' : 'Reset to Default'}</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="hidden xs:flex items-center gap-1 text-[11px] text-slate-400">
              <span>{settings.promptLocation ? (isKm ? 'Save As...' : 'Save As') : (isKm ? 'Quick Save' : 'Direct')}</span>
              <span>•</span>
              <span className="text-amber-400 font-bold">{settings.defaultQuality?.toUpperCase() || '1080P'}</span>
            </div>

            <button
              id="save-settings-modal-btn"
              type="button"
              onClick={onClose}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm px-5 py-2 rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isKm ? 'រួចរាល់' : 'Done'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
