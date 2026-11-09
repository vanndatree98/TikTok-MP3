/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Volume2, Volume1, VolumeX, Volume } from 'lucide-react';

interface VideoVolumeControlProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isKm?: boolean;
  className?: string;
  variant?: 'compact' | 'full';
}

export const VideoVolumeControl: React.FC<VideoVolumeControlProps> = ({
  videoRef,
  isKm = false,
  className = '',
  variant = 'full',
}) => {
  // Volume: 0 to 100
  const [volume, setVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('svd_preview_volume');
      return saved !== null ? Math.min(100, Math.max(0, Number(saved))) : 80;
    } catch {
      return 80;
    }
  });

  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('svd_preview_muted') === 'true';
    } catch {
      return false;
    }
  });

  const [previousVolume, setPreviousVolume] = useState<number>(80);

  // Apply volume and muted to video element
  const applyAudioSettings = useCallback(
    (volVal: number, mutedVal: boolean) => {
      const video = videoRef.current;
      if (!video) return;

      const normVol = Math.max(0, Math.min(1, volVal / 100));
      if (Math.abs(video.volume - normVol) > 0.01) {
        video.volume = normVol;
      }
      if (video.muted !== mutedVal) {
        video.muted = mutedVal;
      }
    },
    [videoRef]
  );

  // Sync with video element events and initial mount
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Apply saved preferences on load/change
    const normVol = Math.max(0, Math.min(1, volume / 100));
    video.volume = normVol;
    video.muted = isMuted;

    const handleVolumeChange = () => {
      const currentNorm = video.volume;
      const currentMuted = video.muted;
      const currentPercent = Math.round(currentNorm * 100);

      setVolume(currentPercent);
      setIsMuted(currentMuted || currentPercent === 0);

      try {
        localStorage.setItem('svd_preview_volume', String(currentPercent));
        localStorage.setItem('svd_preview_muted', String(currentMuted || currentPercent === 0));
      } catch {}
    };

    video.addEventListener('volumechange', handleVolumeChange);
    // Also re-apply when video loads new metadata
    video.addEventListener('loadedmetadata', handleVolumeChange);

    return () => {
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('loadedmetadata', handleVolumeChange);
    };
  }, [videoRef, volume, isMuted]);

  // Handle slider adjustment
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = Number(e.target.value);
    setVolume(newVol);

    if (newVol > 0 && isMuted) {
      setIsMuted(false);
      applyAudioSettings(newVol, false);
      try {
        localStorage.setItem('svd_preview_muted', 'false');
      } catch {}
    } else if (newVol === 0) {
      setIsMuted(true);
      applyAudioSettings(0, true);
      try {
        localStorage.setItem('svd_preview_muted', 'true');
      } catch {}
    } else {
      applyAudioSettings(newVol, isMuted);
    }

    try {
      localStorage.setItem('svd_preview_volume', String(newVol));
    } catch {}
  };

  // Toggle mute / unmute
  const handleToggleMute = () => {
    if (isMuted || volume === 0) {
      // Unmute: restore previous volume or 80%
      const target = volume === 0 ? (previousVolume > 0 ? previousVolume : 80) : volume;
      setIsMuted(false);
      setVolume(target);
      applyAudioSettings(target, false);
      try {
        localStorage.setItem('svd_preview_muted', 'false');
        localStorage.setItem('svd_preview_volume', String(target));
      } catch {}
    } else {
      // Mute: save current volume
      setPreviousVolume(volume);
      setIsMuted(true);
      applyAudioSettings(volume, true);
      try {
        localStorage.setItem('svd_preview_muted', 'true');
      } catch {}
    }
  };

  // Quick preset buttons
  const setPresetVolume = (preset: number) => {
    if (preset === 0) {
      setPreviousVolume(volume > 0 ? volume : 80);
      setIsMuted(true);
      setVolume(0);
      applyAudioSettings(0, true);
      try {
        localStorage.setItem('svd_preview_muted', 'true');
        localStorage.setItem('svd_preview_volume', '0');
      } catch {}
    } else {
      setIsMuted(false);
      setVolume(preset);
      applyAudioSettings(preset, false);
      try {
        localStorage.setItem('svd_preview_muted', 'false');
        localStorage.setItem('svd_preview_volume', String(preset));
      } catch {}
    }
  };

  // Select appropriate volume icon
  const renderVolumeIcon = () => {
    if (isMuted || volume === 0) {
      return <VolumeX className="w-4 h-4 text-rose-400 shrink-0" />;
    }
    if (volume < 35) {
      return <Volume className="w-4 h-4 text-amber-400 shrink-0" />;
    }
    if (volume < 70) {
      return <Volume1 className="w-4 h-4 text-amber-400 shrink-0" />;
    }
    return <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />;
  };

  const effectiveDisplayVolume = isMuted ? 0 : volume;

  if (variant === 'compact') {
    return (
      <div
        id="video-volume-control-compact"
        className={`flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-2.5 py-1.5 rounded-lg ${className}`}
      >
        <button
          id="btn-toggle-video-mute-compact"
          type="button"
          onClick={handleToggleMute}
          title={isMuted ? (isKm ? 'បើកសំឡេង' : 'Unmute') : (isKm ? 'បិទសំឡេង' : 'Mute')}
          className="p-1 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          {renderVolumeIcon()}
        </button>
        <input
          id="video-volume-slider-compact"
          type="range"
          min="0"
          max="100"
          step="1"
          value={effectiveDisplayVolume}
          onChange={handleSliderChange}
          aria-label={isKm ? 'កម្រិតសំឡេងវីដេអូ' : 'Video Volume'}
          className="w-20 sm:w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400 focus:outline-none"
        />
        <span className="text-[11px] font-mono font-medium text-slate-400 min-w-[2.2rem] text-right">
          {isMuted ? (isKm ? 'ស្ងាត់' : 'Mute') : `${effectiveDisplayVolume}%`}
        </span>
      </div>
    );
  }

  return (
    <div
      id="video-volume-control-container"
      className={`bg-slate-900/80 border border-slate-800/90 rounded-xl p-2.5 shadow-sm flex flex-col gap-2 ${className}`}
    >
      {/* Top row: Mute button, Slider track, and Percentage */}
      <div className="flex items-center gap-2.5">
        {/* Mute/Unmute Toggle Button */}
        <button
          id="btn-toggle-video-mute"
          type="button"
          onClick={handleToggleMute}
          title={isMuted ? (isKm ? 'បើកសំឡេង (Unmute)' : 'Unmute Audio') : (isKm ? 'បិទសំឡេង (Mute)' : 'Mute Audio')}
          className={`p-2 rounded-lg transition-all flex items-center justify-center cursor-pointer border ${
            isMuted
              ? 'bg-rose-950/60 border-rose-800/50 hover:bg-rose-900/60 text-rose-300'
              : 'bg-slate-800/90 border-slate-700/60 hover:bg-slate-700 text-slate-200 hover:text-white'
          }`}
        >
          {renderVolumeIcon()}
        </button>

        {/* Custom Volume Range Slider */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <span>{isKm ? 'កម្រិតសំឡេងវីដេអូ' : 'Video Volume'}</span>
              {/* Sound visual indicator dots */}
              <span className="flex items-end gap-0.5 h-3">
                <span
                  className={`w-0.5 rounded-full transition-all ${
                    effectiveDisplayVolume > 5 ? 'h-1.5 bg-amber-400' : 'h-1 bg-slate-700'
                  }`}
                />
                <span
                  className={`w-0.5 rounded-full transition-all ${
                    effectiveDisplayVolume > 35 ? 'h-2 bg-amber-400' : 'h-1 bg-slate-700'
                  }`}
                />
                <span
                  className={`w-0.5 rounded-full transition-all ${
                    effectiveDisplayVolume > 65 ? 'h-3 bg-amber-400' : 'h-1 bg-slate-700'
                  }`}
                />
                <span
                  className={`w-0.5 rounded-full transition-all ${
                    effectiveDisplayVolume > 85 ? 'h-3 bg-amber-300' : 'h-1 bg-slate-700'
                  }`}
                />
              </span>
            </span>

            {/* Percentage Badge */}
            <span
              className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                isMuted
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-800/40'
                  : 'bg-slate-800 text-amber-300 border border-slate-700/60'
              }`}
            >
              {isMuted ? (isKm ? 'ស្ងាត់ (Muted)' : 'Muted') : `${effectiveDisplayVolume}%`}
            </span>
          </div>

          <input
            id="video-preview-volume-slider"
            type="range"
            min="0"
            max="100"
            step="1"
            value={effectiveDisplayVolume}
            onChange={handleSliderChange}
            aria-label={isKm ? 'កម្រិតសំឡេងវីដេអូ' : 'Video Volume Slider'}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>
      </div>

      {/* Bottom row: Quick Presets */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-[10px] mr-0.5">
            {isKm ? 'កម្រិតរហ័ស:' : 'Presets:'}
          </span>
          <button
            id="btn-volume-preset-mute"
            type="button"
            onClick={() => setPresetVolume(0)}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer border ${
              isMuted || volume === 0
                ? 'bg-rose-900/60 text-rose-200 border-rose-700/50'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border-slate-700/50 hover:bg-slate-700/70'
            }`}
          >
            {isKm ? 'ស្ងាត់ (0%)' : 'Mute (0%)'}
          </button>
          <button
            id="btn-volume-preset-50"
            type="button"
            onClick={() => setPresetVolume(50)}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer border ${
              !isMuted && volume === 50
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border-slate-700/50 hover:bg-slate-700/70'
            }`}
          >
            50%
          </button>
          <button
            id="btn-volume-preset-100"
            type="button"
            onClick={() => setPresetVolume(100)}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer border ${
              !isMuted && volume === 100
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border-slate-700/50 hover:bg-slate-700/70'
            }`}
          >
            {isKm ? 'អតិបរមា (100%)' : '100%'}
          </button>
        </div>

        <span className="text-[10px] text-slate-500 hidden sm:inline-block">
          {isKm ? 'ចងចាំកម្រិតសំឡេងដោយស្វ័យប្រវត្តិ' : 'Remembers volume'}
        </span>
      </div>
    </div>
  );
};

export default VideoVolumeControl;
