import React, { useState } from 'react';
import {
  Copy,
  Check,
  FileVideo,
  Edit3,
  RotateCcw,
  Sparkles,
  Tag,
  Calendar,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { AppSettings, VideoInfo } from '../types';
import { generateLiveFilename, getFormattedDate } from '../utils/filenameHelper';

interface DownloadCardFilenamePreviewProps {
  video: VideoInfo;
  settings: AppSettings;
  onChangeSettings: (updater: (prev: AppSettings) => AppSettings) => void;
  selectedQuality: '4k' | '1080p' | '720p' | '480p';
  customFilenameOverride: string;
  setCustomFilenameOverride: (name: string) => void;
  isKm: boolean;
}

export default function DownloadCardFilenamePreview({
  video,
  settings,
  onChangeSettings,
  selectedQuality,
  customFilenameOverride,
  setCustomFilenameOverride,
  isKm
}: DownloadCardFilenamePreviewProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isDateAppended = settings.appendDateToFilename ?? (settings.antiOverwriteMode === 'date' || settings.antiOverwriteMode === 'both');
  const isResolutionAppended = settings.appendResolutionToFilename ?? (settings.antiOverwriteMode === 'resolution' || settings.antiOverwriteMode === 'both' || true);

  // Compute live preview filename
  const liveFilenameMp4 = generateLiveFilename({
    video,
    pattern: settings.namingPattern,
    customPattern: settings.customPattern,
    format: 'mp4',
    quality: selectedQuality,
    customOverride: customFilenameOverride,
    appendDate: isDateAppended,
    appendResolution: isResolutionAppended,
    dateFormat: settings.dateFormat || 'YYYY-MM-DD',
    resolutionFormat: settings.resolutionFormat || 'tag'
  });

  const liveFilenameMp3 = generateLiveFilename({
    video,
    pattern: settings.namingPattern,
    customPattern: settings.customPattern,
    format: 'mp3',
    customOverride: customFilenameOverride,
    appendDate: isDateAppended,
    dateFormat: settings.dateFormat || 'YYYY-MM-DD'
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleDate = () => {
    onChangeSettings(s => {
      const nextDate = !isDateAppended;
      return {
        ...s,
        appendDateToFilename: nextDate,
        antiOverwriteMode: nextDate
          ? (isResolutionAppended ? 'both' : 'date')
          : (isResolutionAppended ? 'resolution' : 'none')
      };
    });
  };

  const handleToggleResolution = () => {
    onChangeSettings(s => {
      const nextRes = !isResolutionAppended;
      return {
        ...s,
        appendResolutionToFilename: nextRes,
        antiOverwriteMode: nextRes
          ? (isDateAppended ? 'both' : 'resolution')
          : (isDateAppended ? 'date' : 'none')
      };
    });
  };

  const patterns = [
    { id: 'title_author' as const, label: isKm ? 'ចំណងជើង - អ្នកបង្កើត' : 'Title - Author' },
    { id: 'author_title' as const, label: isKm ? 'អ្នកបង្កើត - ចំណងជើង' : 'Author - Title' },
    { id: 'author_id' as const, label: isKm ? 'TikTok_អ្នកបង្កើត_ID' : 'TikTok_Author_ID' },
    { id: 'title_only' as const, label: isKm ? 'ចំណងជើងតែប៉ុណ្ណោះ' : 'Title Only' }
  ];

  return (
    <div
      id="download-card-filename-box"
      className="bg-slate-950/80 border border-indigo-500/30 rounded-xl p-3.5 flex flex-col gap-3 shadow-inner"
    >
      {/* Header with real-time status and quick pattern switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Tag className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-white">
                {isKm ? 'ឈ្មោះឯកសារទាញយក (Live Filename Preview)' : 'Output Filename (Live Preview)'}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Live</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isKm
                ? 'ឈ្មោះឯកសារដែលនឹងរក្សាទុកដោយស្វ័យប្រវត្តិតាមទម្រង់ដែលបានជ្រើសរើស'
                : 'Exact filename that will be saved when clicking download'}
            </p>
          </div>
        </div>

        {/* Pattern Quick Pills & Anti-Overwrite Toggles */}
        <div className="flex flex-wrap items-center gap-1">
          {patterns.map(p => (
            <button
              key={p.id}
              type="button"
              id={`pattern-pill-${p.id}`}
              onClick={() => {
                setCustomFilenameOverride('');
                onChangeSettings(s => ({ ...s, namingPattern: p.id }));
              }}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                settings.namingPattern === p.id && !customFilenameOverride
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}

          <button
            type="button"
            id="toggle-custom-filename-btn"
            onClick={() => setIsEditing(!isEditing)}
            className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
              isEditing || customFilenameOverride
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Edit3 className="w-3 h-3" />
            <span>{isKm ? 'កែឈ្មោះផ្ទាល់' : 'Edit Name'}</span>
          </button>
        </div>
      </div>

      {/* Anti-Overwrite Quick Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-900/60 border border-slate-800/80 rounded-lg text-xs">
        <div className="flex items-center gap-1.5 text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[11px] font-semibold">
            {isKm ? 'ការពារកុំឱ្យជាន់ឯកសារ (Anti-Overwrite):' : 'Anti-Overwrite for Folders:'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Toggle Current Date */}
          <button
            type="button"
            id="quick-toggle-date-btn"
            onClick={handleToggleDate}
            className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
              isDateAppended
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
            title={isKm ? 'បន្ថែមថ្ងៃខែបច្ចុប្បន្នលើឈ្មោះឯកសារ' : 'Append current date to filename'}
          >
            <Calendar className="w-3 h-3 text-sky-400" />
            <span>+Date ({getFormattedDate(settings.dateFormat || 'YYYY-MM-DD')})</span>
            {isDateAppended && <Check className="w-3 h-3 text-sky-400" />}
          </button>

          {/* Toggle Resolution String */}
          <button
            type="button"
            id="quick-toggle-res-btn"
            onClick={handleToggleResolution}
            className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
              isResolutionAppended
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
            title={isKm ? 'បន្ថែមកម្រិតរូបភាពលើឈ្មោះឯកសារ' : 'Append resolution tag to filename'}
          >
            <Layers className="w-3 h-3 text-amber-400" />
            <span>+Res ({selectedQuality.toUpperCase()})</span>
            {isResolutionAppended && <Check className="w-3 h-3 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* Dynamic Text Input for direct filename customization */}
      {(isEditing || customFilenameOverride) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 bg-slate-900/90 border border-amber-500/30 rounded-lg animate-in fade-in duration-200">
          <label className="text-[11px] font-medium text-amber-300 shrink-0 flex items-center gap-1">
            <Edit3 className="w-3 h-3" />
            <span>{isKm ? 'កែឈ្មោះឯកសារ:' : 'Custom Name:'}</span>
          </label>
          <input
            id="custom-filename-override-input"
            type="text"
            value={customFilenameOverride}
            onChange={e => setCustomFilenameOverride(e.target.value)}
            placeholder={liveFilenameMp4.replace(/\.[^/.]+$/, '')}
            className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs font-mono text-slate-100 outline-none focus:border-amber-400"
          />
          {customFilenameOverride && (
            <button
              type="button"
              onClick={() => setCustomFilenameOverride('')}
              className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 flex items-center gap-1 shrink-0 cursor-pointer"
              title={isKm ? 'ត្រឡប់ទៅទម្រង់ឈ្មោះដើម' : 'Reset to pattern'}
            >
              <RotateCcw className="w-3 h-3" />
              <span>{isKm ? 'កំណត់ឡើងវិញ' : 'Reset'}</span>
            </button>
          )}
        </div>
      )}

      {/* Real-time Filename Preview Display Box */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 bg-slate-900/90 border border-slate-800/90 rounded-lg">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <FileVideo className="w-4 h-4 text-indigo-400 shrink-0" />
          <div className="flex flex-col min-w-0 flex-1">
            <span
              id="download-card-live-filename-text"
              className="font-mono text-xs sm:text-sm text-emerald-400 font-semibold truncate select-all tracking-tight"
              title={liveFilenameMp4}
            >
              {liveFilenameMp4}
            </span>
            <span className="text-[10px] text-slate-400">
              {isKm ? 'MP3 អូឌីយ៉ូ:' : 'MP3 Audio:'} <span className="font-mono text-violet-300">{liveFilenameMp3}</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          id="copy-download-filename-btn"
          onClick={() => handleCopy(liveFilenameMp4)}
          title={isKm ? 'ចម្លងឈ្មោះឯកសារ MP4' : 'Copy MP4 filename'}
          className="self-end sm:self-auto px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">{isKm ? 'បានចម្លង!' : 'Copied!'}</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>{isKm ? 'ចម្លងឈ្មោះ' : 'Copy'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
