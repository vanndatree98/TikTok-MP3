/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Scissors,
  Play,
  Pause,
  RotateCcw,
  Download,
  Clock,
  Sliders,
  ChevronDown,
  ChevronUp,
  Music,
  CheckCircle2,
  Sparkles,
  Zap
} from 'lucide-react';
import { VideoInfo } from '../types';

interface VideoTrimmerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoData: VideoInfo;
  selectedQuality: '4k' | '1080p' | '720p' | '480p';
  isKm?: boolean;
  onDownloadTrimmed: (
    format: 'mp4' | 'mp3',
    trimStart: number,
    trimEnd: number,
    quality: '4k' | '1080p' | '720p' | '480p'
  ) => Promise<void>;
  showToast?: (msg: string) => void;
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function parseTimeToSeconds(str: string): number | null {
  const cleaned = str.trim();
  if (!cleaned) return null;
  const parts = cleaned.split(':');
  if (parts.length === 1) {
    const val = parseFloat(parts[0]);
    return isNaN(val) ? null : val;
  }
  if (parts.length === 2) {
    const m = parseFloat(parts[0]);
    const s = parseFloat(parts[1]);
    if (isNaN(m) || isNaN(s)) return null;
    return m * 60 + s;
  }
  if (parts.length === 3) {
    const h = parseFloat(parts[0]);
    const m = parseFloat(parts[1]);
    const s = parseFloat(parts[2]);
    if (isNaN(h) || isNaN(m) || isNaN(s)) return null;
    return h * 3600 + m * 60 + s;
  }
  return null;
}

export const VideoTrimmer: React.FC<VideoTrimmerProps> = ({
  videoRef,
  videoData,
  selectedQuality,
  isKm = false,
  onDownloadTrimmed,
  showToast,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [duration, setDuration] = useState<number>(() => {
    return videoData.duration && videoData.duration > 0 ? videoData.duration : 60;
  });
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(() => {
    return videoData.duration && videoData.duration > 0 ? videoData.duration : 60;
  });
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlayingTrim, setIsPlayingTrim] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'mp4' | 'mp3'>('mp4');

  // Manual input state strings
  const [startInputStr, setStartInputStr] = useState('00:00');
  const [endInputStr, setEndInputStr] = useState('01:00');

  // Detect and update duration from video element
  const syncDuration = useCallback(() => {
    const video = videoRef.current;
    if (video && !isNaN(video.duration) && video.duration > 0) {
      const dur = Math.round(video.duration * 10) / 10;
      setDuration(dur);
      setEndTime(prev => {
        // If endTime was default or exceeds duration, clamp it
        if (prev === 60 || prev > dur || prev === 0) {
          setEndInputStr(formatTime(dur));
          return dur;
        }
        return prev;
      });
    }
  }, [videoRef]);

  useEffect(() => {
    syncDuration();
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      syncDuration();
    };

    const handleTimeUpdate = () => {
      const cur = video.currentTime;
      setCurrentTime(cur);

      // If trim preview playback is running and passed endTime
      if (isPlayingTrim) {
        if (cur >= endTime) {
          video.pause();
          setIsPlayingTrim(false);
          video.currentTime = startTime;
        }
      }
    };

    const handlePause = () => {
      if (isPlayingTrim) {
        setIsPlayingTrim(false);
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('durationchange', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('durationchange', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('pause', handlePause);
    };
  }, [videoRef, isPlayingTrim, startTime, endTime, syncDuration]);

  // Sync inputs when start or end change
  useEffect(() => {
    setStartInputStr(formatTime(startTime));
  }, [startTime]);

  useEffect(() => {
    setEndInputStr(formatTime(endTime));
  }, [endTime]);

  // Handle start time slider change
  const handleStartChange = (val: number) => {
    const clamped = Math.max(0, Math.min(val, endTime - 0.5));
    setStartTime(clamped);
    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
    }
  };

  // Handle end time slider change
  const handleEndChange = (val: number) => {
    const clamped = Math.min(duration, Math.max(val, startTime + 0.5));
    setEndTime(clamped);
    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
    }
  };

  // Set Start to current video time
  const handleSetStartToCurrent = () => {
    if (!videoRef.current) return;
    const cur = Math.round(videoRef.current.currentTime * 10) / 10;
    const newStart = Math.max(0, Math.min(cur, endTime - 0.5));
    setStartTime(newStart);
    showToast?.(
      isKm
        ? `កំណត់ចំណុចចាប់ផ្តើម: ${formatTime(newStart)}`
        : `Start time set to ${formatTime(newStart)}`
    );
  };

  // Set End to current video time
  const handleSetEndToCurrent = () => {
    if (!videoRef.current) return;
    const cur = Math.round(videoRef.current.currentTime * 10) / 10;
    const newEnd = Math.min(duration, Math.max(cur, startTime + 0.5));
    setEndTime(newEnd);
    showToast?.(
      isKm
        ? `កំណត់ចំណុចបញ្ចប់: ${formatTime(newEnd)}`
        : `End time set to ${formatTime(newEnd)}`
    );
  };

  // Jump video preview to start
  const handleJumpToStart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = startTime;
    }
  };

  // Jump video preview to end
  const handleJumpToEnd = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = endTime;
    }
  };

  // Toggle Preview Trim Playback
  const handleTogglePreviewTrim = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlayingTrim) {
      video.pause();
      setIsPlayingTrim(false);
    } else {
      video.currentTime = startTime;
      video.play().then(() => {
        setIsPlayingTrim(true);
      }).catch(err => {
        console.warn('Auto-play failed:', err);
      });
    }
  };

  // Quick Preset Handlers
  const handlePresetFirst15 = () => {
    setStartTime(0);
    const end = Math.min(duration, 15);
    setEndTime(end);
    if (videoRef.current) videoRef.current.currentTime = 0;
  };

  const handlePresetFirst30 = () => {
    setStartTime(0);
    const end = Math.min(duration, 30);
    setEndTime(end);
    if (videoRef.current) videoRef.current.currentTime = 0;
  };

  const handlePresetLast30 = () => {
    const start = Math.max(0, duration - 30);
    setStartTime(start);
    setEndTime(duration);
    if (videoRef.current) videoRef.current.currentTime = start;
  };

  const handleResetFull = () => {
    setStartTime(0);
    setEndTime(duration);
    if (videoRef.current) videoRef.current.currentTime = 0;
    showToast?.(isKm ? 'បានកំណត់វីដេអូពេញឡើងវិញ' : 'Reset to full video');
  };

  // Manual input commit
  const handleCommitStartInput = () => {
    const parsed = parseTimeToSeconds(startInputStr);
    if (parsed !== null) {
      handleStartChange(parsed);
    } else {
      setStartInputStr(formatTime(startTime));
    }
  };

  const handleCommitEndInput = () => {
    const parsed = parseTimeToSeconds(endInputStr);
    if (parsed !== null) {
      handleEndChange(parsed);
    } else {
      setEndInputStr(formatTime(endTime));
    }
  };

  // Download trimmed clip handler
  const handleDownloadClick = async (fmt: 'mp4' | 'mp3') => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadFormat(fmt);
    try {
      await onDownloadTrimmed(fmt, startTime, endTime, selectedQuality);
    } catch (err) {
      console.error('Trim download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const trimDuration = Math.max(0.1, Math.round((endTime - startTime) * 10) / 10);
  const startPercent = duration > 0 ? (startTime / duration) * 100 : 0;
  const endPercent = duration > 0 ? (endTime / duration) * 100 : 100;
  const currentPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isTrimModified = startTime > 0 || endTime < duration - 0.5;

  return (
    <div
      id="video-trim-section"
      className="rounded-xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/40 to-slate-900/60 p-3 shadow-md backdrop-blur-sm transition-all text-slate-100"
    >
      {/* Header Bar / Collapsible Toggle */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          id="toggle-video-trim-btn"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-left cursor-pointer group flex-1 min-w-0"
        >
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 group-hover:text-indigo-300 group-hover:scale-105 transition-all shrink-0">
            <Scissors className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-slate-200 group-hover:text-white transition-colors">
                {isKm ? '✂️ កាត់តវីដេអូ (Trim Video)' : '✂️ Trim Video'}
              </span>
              {isTrimModified ? (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-1.5 py-0.2 rounded flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  {formatTime(startTime)} - {formatTime(endTime)} ({Math.round(trimDuration)}s)
                </span>
              ) : (
                <span className="bg-slate-800 text-slate-400 text-[10px] font-medium px-1.5 py-0.2 rounded border border-slate-700/60">
                  {isKm ? 'វីដេអូពេញ' : 'Full length'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {isKm
                ? 'ជ្រើសរើសចំណុចចាប់ផ្តើម និងបញ្ចប់មុនពេលទាញយក'
                : 'Select start & end times before downloading'}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {isTrimModified && (
            <button
              type="button"
              onClick={handleResetFull}
              title={isKm ? 'កំណត់វីដេអូពេញឡើងវិញ' : 'Reset to full video'}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors text-xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors cursor-pointer"
            aria-label="Toggle trim details"
          >
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Trim Controls */}
      {isOpen && (
        <div className="mt-3 pt-3 border-t border-indigo-500/20 flex flex-col gap-3">
          {/* Visual Timeline Bar */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <span>{isKm ? 'ចាប់ផ្តើម:' : 'Start:'}</span>
                <strong className="text-slate-200">{formatTime(startTime)}</strong>
              </span>
              <span className="text-indigo-300 font-bold bg-indigo-500/20 px-1.5 py-0.5 rounded text-[10px] border border-indigo-500/30">
                {isKm ? 'រយៈពេល:' : 'Duration:'} {trimDuration.toFixed(1)}s
              </span>
              <span className="flex items-center gap-1 text-rose-400 font-medium">
                <span>{isKm ? 'បញ្ចប់:' : 'End:'}</span>
                <strong className="text-slate-200">{formatTime(endTime)}</strong>
              </span>
            </div>

            {/* Visual Timeline Track */}
            <div
              className="relative h-6 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 cursor-pointer select-none"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                const targetTime = Math.round(ratio * duration * 10) / 10;
                if (videoRef.current) {
                  videoRef.current.currentTime = targetTime;
                }
              }}
            >
              {/* Highlighted Trim Range */}
              <div
                className="absolute top-0 bottom-0 bg-gradient-to-r from-emerald-500/40 via-indigo-500/40 to-cyan-500/40 border-l-2 border-r-2 border-emerald-400"
                style={{
                  left: `${startPercent}%`,
                  width: `${Math.max(2, endPercent - startPercent)}%`
                }}
              />

              {/* Start Marker Line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 z-10"
                style={{ left: `${startPercent}%` }}
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 -translate-x-[3px] -translate-y-0.5 shadow-sm shadow-emerald-500" />
              </div>

              {/* End Marker Line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-rose-400 z-10"
                style={{ left: `${Math.min(99.5, endPercent)}%` }}
              >
                <div className="w-2 h-2 rounded-full bg-rose-400 -translate-x-[3px] translate-y-3.5 shadow-sm shadow-rose-500" />
              </div>

              {/* Live Playhead Indicator */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-amber-400 z-20 shadow-md shadow-amber-500/50 pointer-events-none transition-all duration-75"
                style={{ left: `${Math.min(99.5, Math.max(0, currentPercent))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 px-0.5">
              <span>00:00</span>
              <span className="text-amber-400/90 font-mono">
                {isKm ? 'ពេលបច្ចុប្បន្ន:' : 'Current:'} {formatTime(currentTime)}
              </span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Dual Sliders: Start & End Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Start Time Slider & Controls */}
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <span>🟢</span>
                  <span>{isKm ? 'ចំណុចចាប់ផ្តើម (Start)' : 'Start Point'}</span>
                </span>
                <button
                  type="button"
                  onClick={handleSetStartToCurrent}
                  title={isKm ? 'កំណត់តាមពេលកំពុងចាក់' : 'Set to current video time'}
                  className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 transition-colors cursor-pointer"
                >
                  📍 {isKm ? 'ពេលបច្ចុប្បន្ន' : 'Current Time'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, duration - 0.5)}
                  step={0.1}
                  value={startTime}
                  onChange={(e) => handleStartChange(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  aria-label="Trim start slider"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="text"
                    value={startInputStr}
                    onChange={(e) => setStartInputStr(e.target.value)}
                    onBlur={handleCommitStartInput}
                    onKeyDown={(e) => e.key === 'Enter' && handleCommitStartInput()}
                    className="w-14 text-center font-mono text-xs py-1 px-1 rounded bg-slate-950 border border-slate-700 text-slate-100 focus:border-emerald-500 focus:outline-none"
                    placeholder="00:00"
                  />
                  <button
                    type="button"
                    onClick={handleJumpToStart}
                    title={isKm ? 'លោតទៅចំណុចចាប់ផ្តើម' : 'Jump video to start'}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
                  >
                    ⏮️
                  </button>
                </div>
              </div>
            </div>

            {/* End Time Slider & Controls */}
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-rose-400 flex items-center gap-1">
                  <span>🔴</span>
                  <span>{isKm ? 'ចំណុចបញ្ចប់ (End)' : 'End Point'}</span>
                </span>
                <button
                  type="button"
                  onClick={handleSetEndToCurrent}
                  title={isKm ? 'កំណត់តាមពេលកំពុងចាក់' : 'Set to current video time'}
                  className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold border border-rose-500/30 transition-colors cursor-pointer"
                >
                  📍 {isKm ? 'ពេលបច្ចុប្បន្ន' : 'Current Time'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0.5}
                  max={duration}
                  step={0.1}
                  value={endTime}
                  onChange={(e) => handleEndChange(parseFloat(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  aria-label="Trim end slider"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="text"
                    value={endInputStr}
                    onChange={(e) => setEndInputStr(e.target.value)}
                    onBlur={handleCommitEndInput}
                    onKeyDown={(e) => e.key === 'Enter' && handleCommitEndInput()}
                    className="w-14 text-center font-mono text-xs py-1 px-1 rounded bg-slate-950 border border-slate-700 text-slate-100 focus:border-rose-500 focus:outline-none"
                    placeholder="00:30"
                  />
                  <button
                    type="button"
                    onClick={handleJumpToEnd}
                    title={isKm ? 'លោតទៅចំណុចបញ្ចប់' : 'Jump video to end'}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
                  >
                    ⏭️
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Presets & Preview Button */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
            {/* Presets Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 mr-0.5">
                {isKm ? 'កំណត់រហ័ស:' : 'Presets:'}
              </span>
              <button
                type="button"
                onClick={handlePresetFirst15}
                className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-[10px] font-medium text-slate-300 border border-slate-700/60 cursor-pointer transition-colors"
              >
                15s ដំបូង
              </button>
              <button
                type="button"
                onClick={handlePresetFirst30}
                className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-[10px] font-medium text-slate-300 border border-slate-700/60 cursor-pointer transition-colors"
              >
                30s ដំបូង
              </button>
              <button
                type="button"
                onClick={handlePresetLast30}
                className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-[10px] font-medium text-slate-300 border border-slate-700/60 cursor-pointer transition-colors"
              >
                30s ចុងក្រោយ
              </button>
            </div>

            {/* Preview Trim Play Button */}
            <button
              type="button"
              id="preview-trim-btn"
              onClick={handleTogglePreviewTrim}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                isPlayingTrim
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
              }`}
            >
              {isPlayingTrim ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>{isKm ? 'បញ្ឈប់ការមើល' : 'Pause Preview'}</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isKm ? 'មើលវីដេអូកាត់' : 'Preview Trim'}</span>
                </>
              )}
            </button>
          </div>

          {/* Download Trimmed Video Actions */}
          <div className="pt-2 border-t border-indigo-500/20 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              type="button"
              id="download-trimmed-video-btn"
              disabled={isDownloading}
              onClick={() => handleDownloadClick('mp4')}
              className={`flex-1 font-bold text-xs sm:text-sm py-2 px-3 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isDownloading && downloadFormat === 'mp4'
                  ? 'bg-gradient-to-r from-emerald-700 to-indigo-800 opacity-90 cursor-wait'
                  : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white shadow-emerald-600/25 hover:shadow-emerald-500/40 active:scale-[0.99]'
              }`}
            >
              <Download className={`w-4 h-4 ${isDownloading && downloadFormat === 'mp4' ? 'animate-bounce' : ''}`} />
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                <span>
                  {isDownloading && downloadFormat === 'mp4'
                    ? isKm
                      ? '⚡ កំពុងកាត់ត និងទាញយក...'
                      : '⚡ Trimming & Downloading...'
                    : isKm
                    ? `ទាញយកវីដេអូកាត់ [${selectedQuality.toUpperCase()}]`
                    : `Download Trimmed [${selectedQuality.toUpperCase()}]`}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/20 text-white font-mono">
                  {Math.round(trimDuration)}s
                </span>
              </div>
            </button>

            {/* Optional Trimmed MP3 Audio Button */}
            <button
              type="button"
              id="download-trimmed-audio-btn"
              disabled={isDownloading}
              onClick={() => handleDownloadClick('mp3')}
              title={isKm ? 'ទាញយកតែសំឡេងកាត់ជា MP3' : 'Download trimmed MP3 audio'}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Music className="w-3.5 h-3.5 text-violet-400" />
              <span>{isKm ? 'សំឡេង MP3' : 'Trimmed MP3'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
