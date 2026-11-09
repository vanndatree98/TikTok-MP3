import React, { useState } from 'react';
import {
  Copy,
  Check,
  FileVideo,
  Music,
  Sparkles,
  Tag,
  Type,
  Calendar,
  Layers,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { AppSettings, VideoInfo, AntiOverwriteMode, DateFormatOption, ResolutionFormatOption } from '../types';
import { generateLiveFilename, DEFAULT_SAMPLE_DATA, getFormattedDate } from '../utils/filenameHelper';

interface FilenameSettingsPreviewProps {
  settings: AppSettings;
  onChangeSettings: (updater: (prev: AppSettings) => AppSettings) => void;
  isKm: boolean;
  videoData?: VideoInfo | null;
}

export default function FilenameSettingsPreview({
  settings,
  onChangeSettings,
  isKm,
  videoData
}: FilenameSettingsPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [previewFormat, setPreviewFormat] = useState<'mp4' | 'mp3'>('mp4');
  const [previewQuality, setPreviewQuality] = useState<'4k' | '1080p' | '720p' | '480p'>('1080p');

  // Dynamic test inputs for live simulation
  const [sampleTitle, setSampleTitle] = useState(videoData?.title || DEFAULT_SAMPLE_DATA.title);
  const [sampleAuthor, setSampleAuthor] = useState(videoData?.author?.username || videoData?.author?.name || DEFAULT_SAMPLE_DATA.author);

  const isCustom = settings.namingPattern === 'custom';
  const customPatternValue = settings.customPattern || '{title} - {author}';

  const isDateAppended = settings.appendDateToFilename ?? (settings.antiOverwriteMode === 'date' || settings.antiOverwriteMode === 'both');
  const isResolutionAppended = settings.appendResolutionToFilename ?? (settings.antiOverwriteMode === 'resolution' || settings.antiOverwriteMode === 'both' || true);

  const liveFilename = generateLiveFilename({
    video: videoData,
    pattern: settings.namingPattern,
    customPattern: customPatternValue,
    format: previewFormat,
    quality: previewFormat === 'mp4' ? previewQuality : undefined,
    sampleTitle,
    sampleAuthor,
    appendDate: isDateAppended,
    appendResolution: isResolutionAppended,
    dateFormat: settings.dateFormat || 'YYYY-MM-DD',
    resolutionFormat: settings.resolutionFormat || 'tag'
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(liveFilename);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const insertVariable = (variable: string) => {
    const current = settings.customPattern || '{title} - {author}';
    onChangeSettings(s => ({
      ...s,
      customPattern: `${current}${current ? '_' : ''}${variable}`
    }));
  };

  const handleSetAntiOverwritePreset = (mode: AntiOverwriteMode) => {
    onChangeSettings(s => {
      let appendDate = false;
      let appendResolution = false;
      if (mode === 'date') {
        appendDate = true;
      } else if (mode === 'resolution') {
        appendResolution = true;
      } else if (mode === 'both') {
        appendDate = true;
        appendResolution = true;
      }
      return {
        ...s,
        antiOverwriteMode: mode,
        appendDateToFilename: appendDate,
        appendResolutionToFilename: appendResolution
      };
    });
  };

  return (
    <div className="flex flex-col gap-3.5 p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
      {/* Pattern Selector */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="font-semibold text-xs sm:text-sm text-slate-200 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isKm ? 'ទម្រង់ឈ្មោះឯកសារ (Naming Pattern)' : 'Filename Pattern'}</span>
          </label>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {isKm ? 'ផ្លាស់ប្តូរភ្លាមៗ' : 'Live Sync'}
          </span>
        </div>

        <select
          id="settings-naming-pattern-select"
          value={settings.namingPattern}
          onChange={e => onChangeSettings(s => ({ ...s, namingPattern: e.target.value as any }))}
          className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 outline-none focus:border-indigo-500 transition-colors cursor-pointer"
        >
          <option value="title_author">
            {isKm ? '[ចំណងជើងវីដេអូ] - [ឈ្មោះអ្នកបង្កើត] (Standard)' : '[Title] - [Author] (Standard)'}
          </option>
          <option value="author_title">
            {isKm ? '[ឈ្មោះអ្នកបង្កើត] - [ចំណងជើងវីដេអូ]' : '[Author] - [Title]'}
          </option>
          <option value="author_id">
            {isKm ? 'TikTok_[ឈ្មោះអ្នកបង្កើត]_[លេខសម្គាល់ ID]' : 'TikTok_[Author]_[ID]'}
          </option>
          <option value="title_only">
            {isKm ? '[ចំណងជើងវីដេអូតែប៉ុណ្ណោះ]' : '[Title Only]'}
          </option>
          <option value="custom">
            {isKm ? '⚡ ទម្រង់កំណត់តាមចិត្ត (Custom Template)' : '⚡ Custom Template'}
          </option>
        </select>
      </div>

      {/* If Custom Template is selected */}
      {isCustom && (
        <div className="flex flex-col gap-2 p-3 bg-slate-900/90 border border-indigo-500/30 rounded-xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-300">
              {isKm ? 'បញ្ចូលទម្រង់កំណត់ដោយផ្ទាល់:' : 'Custom Template String:'}
            </span>
            <span className="text-[10px] text-slate-400">
              {isKm ? 'ចុចលើ Tag ដើម្បីបញ្ចូល' : 'Click tags to insert'}
            </span>
          </div>

          <input
            id="custom-naming-pattern-input"
            type="text"
            value={customPatternValue}
            onChange={e => onChangeSettings(s => ({ ...s, customPattern: e.target.value }))}
            placeholder="{title} - {author}_{resolution}_{date}"
            className="bg-slate-950 border border-indigo-500/40 rounded-lg px-3 py-2 text-xs font-mono text-indigo-200 outline-none focus:border-indigo-400"
          />

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { tag: '{title}', label: isKm ? 'ចំណងជើង' : 'Title' },
              { tag: '{author}', label: isKm ? 'អ្នកបង្កើត' : 'Author' },
              { tag: '{id}', label: 'ID' },
              { tag: '{resolution}', label: isKm ? 'កម្រិតរូបភាព' : 'Resolution' },
              { tag: '{quality}', label: isKm ? 'គុណភាព' : 'Quality' },
              { tag: '{date}', label: isKm ? 'កាលបរិច្ឆេទ' : 'Date' }
            ].map(item => (
              <button
                key={item.tag}
                type="button"
                onClick={() => insertVariable(item.tag)}
                className="text-[11px] font-mono font-medium px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              >
                +{item.tag} <span className="text-[10px] text-slate-400">({item.label})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Anti-Overwrite Protection for Folders Section */}
      <div className="flex flex-col gap-2.5 p-3 sm:p-3.5 bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 border border-indigo-500/30 rounded-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                {isKm ? 'ការពារកុំឱ្យជាន់ឯកសារចាស់ (Anti-Overwrite Protection)' : 'Folder Anti-Overwrite Protection'}
              </span>
              <p className="text-[10px] text-slate-400">
                {isKm
                  ? 'ស្វ័យប្រវត្តិកំណត់បន្ថែមថ្ងៃខែ ឬកម្រិតរូបភាព ជៀសវាងការបាត់បង់ឯកសារពេល Save ចូល Folder'
                  : 'Automatically append date or resolution to avoid file overwrites when saving to folders'}
              </p>
            </div>
          </div>

          {(isDateAppended || isResolutionAppended) && (
            <span className="hidden xs:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3" />
              <span>{isKm ? 'បានបើក' : 'Active'}</span>
            </span>
          )}
        </div>

        {/* Quick Presets */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
          {[
            {
              id: 'none' as AntiOverwriteMode,
              label: isKm ? 'គ្មាន' : 'None',
              sub: isKm ? 'ឈ្មោះស្តង់ដារ' : 'Standard'
            },
            {
              id: 'date' as AntiOverwriteMode,
              label: isKm ? '+ កាលបរិច្ឆេទ' : '+ Current Date',
              sub: getFormattedDate(settings.dateFormat || 'YYYY-MM-DD')
            },
            {
              id: 'resolution' as AntiOverwriteMode,
              label: isKm ? '+ កម្រិតរូបភាព' : '+ Resolution',
              sub: '_1080p_FHD'
            },
            {
              id: 'both' as AntiOverwriteMode,
              label: isKm ? '+ ទាំងពីរ' : '+ Date & Res',
              sub: isKm ? 'សុវត្ថិភាពខ្ពស់' : 'Maximum Safety'
            }
          ].map(preset => {
            const isSelected =
              (preset.id === 'none' && !isDateAppended && !isResolutionAppended) ||
              (preset.id === 'date' && isDateAppended && !isResolutionAppended) ||
              (preset.id === 'resolution' && !isDateAppended && isResolutionAppended) ||
              (preset.id === 'both' && isDateAppended && isResolutionAppended);

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSetAntiOverwritePreset(preset.id)}
                className={`px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-center ${
                  isSelected
                    ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200 shadow-sm'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <span className="text-xs font-bold leading-tight truncate">{preset.label}</span>
                <span className="text-[9px] opacity-75 font-mono truncate">{preset.sub}</span>
              </button>
            );
          })}
        </div>

        {/* Granular Auto-Append Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
          {/* Toggle 1: Append Current Date */}
          <div className="flex flex-col gap-1.5 p-2 bg-slate-950/80 rounded-lg border border-slate-800/90">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  id="append-date-checkbox"
                  checked={isDateAppended}
                  onChange={e => {
                    const checked = e.target.checked;
                    onChangeSettings(s => ({
                      ...s,
                      appendDateToFilename: checked,
                      antiOverwriteMode: checked
                        ? (isResolutionAppended ? 'both' : 'date')
                        : (isResolutionAppended ? 'resolution' : 'none')
                    }));
                  }}
                  className="w-3.5 h-3.5 accent-indigo-500 rounded cursor-pointer"
                />
                <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>{isKm ? 'បន្ថែមថ្ងៃខែ (Current Date)' : 'Append Current Date'}</span>
              </label>

              {isDateAppended && (
                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  _{getFormattedDate(settings.dateFormat || 'YYYY-MM-DD')}
                </span>
              )}
            </div>

            {/* Date format selection */}
            {isDateAppended && (
              <div className="flex items-center gap-1 text-[11px] pt-1">
                <span className="text-slate-400 text-[10px]">{isKm ? 'ទម្រង់ថ្ងៃ:' : 'Format:'}</span>
                <select
                  id="date-format-select"
                  value={settings.dateFormat || 'YYYY-MM-DD'}
                  onChange={e => onChangeSettings(s => ({ ...s, dateFormat: e.target.value as DateFormatOption }))}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-200 outline-none cursor-pointer"
                >
                  <option value="YYYY-MM-DD">YYYY-MM-DD ({getFormattedDate('YYYY-MM-DD')})</option>
                  <option value="YYYYMMDD">YYYYMMDD ({getFormattedDate('YYYYMMDD')})</option>
                  <option value="YYYY-MM-DD_HHmm">YYYY-MM-DD_HHmm ({getFormattedDate('YYYY-MM-DD_HHmm')})</option>
                </select>
              </div>
            )}
          </div>

          {/* Toggle 2: Append Resolution String */}
          <div className="flex flex-col gap-1.5 p-2 bg-slate-950/80 rounded-lg border border-slate-800/90">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  id="append-resolution-checkbox"
                  checked={isResolutionAppended}
                  onChange={e => {
                    const checked = e.target.checked;
                    onChangeSettings(s => ({
                      ...s,
                      appendResolutionToFilename: checked,
                      antiOverwriteMode: checked
                        ? (isDateAppended ? 'both' : 'resolution')
                        : (isDateAppended ? 'date' : 'none')
                    }));
                  }}
                  className="w-3.5 h-3.5 accent-indigo-500 rounded cursor-pointer"
                />
                <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{isKm ? 'បន្ថែមកម្រិតរូបភាព (Resolution)' : 'Append Resolution'}</span>
              </label>

              {isResolutionAppended && (
                <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  _{previewFormat === 'mp4' ? (settings.resolutionFormat === 'dimension' ? '1920x1080' : settings.resolutionFormat === 'short' ? '1080p' : '1080p_FHD') : 'Audio'}
                </span>
              )}
            </div>

            {/* Resolution format selection */}
            {isResolutionAppended && (
              <div className="flex items-center gap-1 text-[11px] pt-1">
                <span className="text-slate-400 text-[10px]">{isKm ? 'ទម្រង់:' : 'Format:'}</span>
                <select
                  id="resolution-format-select"
                  value={settings.resolutionFormat || 'tag'}
                  onChange={e => onChangeSettings(s => ({ ...s, resolutionFormat: e.target.value as ResolutionFormatOption }))}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-200 outline-none cursor-pointer"
                >
                  <option value="tag">Badge Tag (e.g. _1080p_FHD, _4K_UHD)</option>
                  <option value="dimension">Dimension (e.g. _1920x1080, _3840x2160)</option>
                  <option value="short">Short (e.g. _1080p, _4K)</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Live Filename Preview Box */}
      <div className="flex flex-col gap-2 p-3 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isKm ? 'មើលឈ្មោះឯកសារជាមុន (Live Preview):' : 'Real-Time Filename Preview:'}</span>
          </div>

          {/* Quick Format preview switches */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPreviewFormat('mp4')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                previewFormat === 'mp4'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              MP4
            </button>
            <button
              type="button"
              onClick={() => setPreviewFormat('mp3')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                previewFormat === 'mp3'
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              MP3
            </button>
            {previewFormat === 'mp4' && (
              <select
                value={previewQuality}
                onChange={e => setPreviewQuality(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-200 outline-none"
              >
                <option value="4k">4K</option>
                <option value="1080p">1080p</option>
                <option value="720p">720p</option>
                <option value="480p">480p</option>
              </select>
            )}
          </div>
        </div>

        {/* Live dynamic filename box */}
        <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-950 rounded-lg border border-indigo-500/30 group">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {previewFormat === 'mp3' ? (
              <Music className="w-4 h-4 text-violet-400 shrink-0" />
            ) : (
              <FileVideo className="w-4 h-4 text-indigo-400 shrink-0" />
            )}
            <span
              id="live-filename-preview-label"
              className="font-mono text-xs text-emerald-400 font-semibold break-all select-all tracking-tight"
            >
              {liveFilename}
            </span>
          </div>

          <button
            type="button"
            id="copy-preview-filename-btn"
            onClick={handleCopy}
            title={isKm ? 'ចម្លងឈ្មោះឯកសារ' : 'Copy filename'}
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors shrink-0 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Dynamic Interactive Test Input (to simulate real-time typing of title/author) */}
        <details className="mt-1 group/details">
          <summary className="text-[11px] text-slate-400 hover:text-indigo-300 cursor-pointer select-none flex items-center gap-1 transition-colors">
            <Type className="w-3 h-3 text-slate-500" />
            <span>{isKm ? '⚙️ សាកល្បងបញ្ចូលទិន្នន័យតេស្ត (Test Simulation)' : '⚙️ Simulate with Custom Text'}</span>
          </summary>
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-slate-500 block mb-1">
                {isKm ? 'ចំណងជើងសាកល្បង (Sample Title):' : 'Sample Title:'}
              </label>
              <input
                type="text"
                value={sampleTitle}
                onChange={e => setSampleTitle(e.target.value)}
                placeholder="Video title"
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 outline-none focus:border-slate-600"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-slate-500 block mb-1">
                {isKm ? 'ឈ្មោះអ្នកបង្កើត (Sample Author):' : 'Sample Author:'}
              </label>
              <input
                type="text"
                value={sampleAuthor}
                onChange={e => setSampleAuthor(e.target.value)}
                placeholder="Author username"
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 outline-none focus:border-slate-600"
              />
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
