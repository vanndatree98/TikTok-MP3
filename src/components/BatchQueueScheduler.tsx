import React, { useState, useEffect } from 'react';
import {
  Clock,
  Play,
  X,
  Check,
  Timer,
  Bell,
  Sparkles,
  Plus,
  AlertCircle,
  Calendar,
  Moon,
  Sun,
  Zap,
  Volume2
} from 'lucide-react';

interface BatchQueueSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (delayMs: number, targetTimestamp: number) => void;
  isKm: boolean;
  queueCount: number;
}

interface BatchQueueSchedulerBannerProps {
  scheduledStartTime: number;
  scheduledDurationMs: number;
  onStartNow: () => void;
  onCancelSchedule: () => void;
  onAddMinutes: (mins: number) => void;
  onEditSchedule?: () => void;
  isKm: boolean;
  queueCount: number;
}

// Quick presets in minutes
const PRESETS = [
  { mins: 2, labelKm: '2 នាទី', labelEn: '2 mins' },
  { mins: 5, labelKm: '5 នាទី', labelEn: '5 mins' },
  { mins: 15, labelKm: '15 នាទី', labelEn: '15 mins' },
  { mins: 30, labelKm: '30 នាទី', labelEn: '30 mins' },
  { mins: 60, labelKm: '1 ម៉ោង', labelEn: '1 hour' },
  { mins: 120, labelKm: '2 ម៉ោង', labelEn: '2 hours' },
  { mins: 240, labelKm: '4 ម៉ោង (យប់)', labelEn: '4 hrs (Off-peak)' }
];

export function formatRemainingTime(ms: number): { hours: number; minutes: number; seconds: number; text: string } {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const text = hours > 0
    ? `${hours}h ${pad(minutes)}m ${pad(seconds)}s`
    : `${pad(minutes)}m ${pad(seconds)}s`;

  return { hours, minutes, seconds, text };
}

export function formatTargetClockTime(timestamp: number, isKm: boolean): string {
  const d = new Date(timestamp);
  const now = new Date();
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? (isKm ? 'ល្ងាច/យប់' : 'PM') : (isKm ? 'ព្រឹក' : 'AM');
  const hours12 = hours % 12 || 12;
  const timeStr = `${hours12}:${minutes} ${ampm}`;

  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  if (isToday) {
    return isKm ? `ថ្ងៃនេះ ម៉ោង ${timeStr}` : `Today at ${timeStr}`;
  } else if (isTomorrow) {
    return isKm ? `ថ្ងៃស្អែក ម៉ោង ${timeStr}` : `Tomorrow at ${timeStr}`;
  } else {
    const dateFormatted = d.toLocaleDateString(isKm ? 'km-KH' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    return `${dateFormatted}, ${timeStr}`;
  }
}

export function playSchedulerStartChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Dual pleasant chime
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.15); // A5
    gain2.gain.setValueAtTime(0.18, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.7);
  } catch (e) {
    console.debug('Audio chime error:', e);
  }
}

/**
 * Modal to configure download scheduler for a specific time or delay
 */
export function BatchQueueSchedulerModal({
  isOpen,
  onClose,
  onSchedule,
  isKm,
  queueCount
}: BatchQueueSchedulerModalProps) {
  // Default to 'clock' (specific time) as requested by user
  const [mode, setMode] = useState<'clock' | 'preset' | 'custom'>('clock');
  const [dayChoice, setDayChoice] = useState<'today' | 'tomorrow' | 'custom'>('today');
  const [customDate, setCustomDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [specificTime, setSpecificTime] = useState<string>(() => {
    // Default to 30 minutes from now formatted as HH:mm
    const now = new Date(Date.now() + 30 * 60 * 1000);
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
  });
  const [selectedMinutes, setSelectedMinutes] = useState<number>(15);
  const [customMinutes, setCustomMinutes] = useState<string>('20');
  const [enableChime, setEnableChime] = useState<boolean>(true);
  const [enableDesktopNotify, setEnableDesktopNotify] = useState<boolean>(() => {
    return typeof Notification !== 'undefined' && Notification.permission === 'granted';
  });

  if (!isOpen) return null;

  // Compute calculated target timestamp
  let computedDelayMs = 0;
  let computedTargetTime = Date.now();

  if (mode === 'clock') {
    const [hh, mm] = specificTime.split(':').map(Number);
    let target = new Date();
    if (dayChoice === 'today') {
      target.setHours(hh || 0, mm || 0, 0, 0);
      // If targeted time is earlier than right now today, automatically advance to tomorrow
      if (target.getTime() <= Date.now()) {
        target.setDate(target.getDate() + 1);
      }
    } else if (dayChoice === 'tomorrow') {
      target.setDate(target.getDate() + 1);
      target.setHours(hh || 0, mm || 0, 0, 0);
    } else if (dayChoice === 'custom') {
      const [year, month, day] = customDate.split('-').map(Number);
      target = new Date(year, (month || 1) - 1, day || 1, hh || 0, mm || 0, 0, 0);
      if (target.getTime() <= Date.now()) {
        target = new Date(Date.now() + 60 * 1000); // 1 minute in future minimum
      }
    }
    computedTargetTime = target.getTime();
    computedDelayMs = Math.max(1000, computedTargetTime - Date.now());
  } else if (mode === 'preset') {
    computedDelayMs = selectedMinutes * 60 * 1000;
    computedTargetTime = Date.now() + computedDelayMs;
  } else if (mode === 'custom') {
    const mins = Math.max(1, parseInt(customMinutes, 10) || 1);
    computedDelayMs = mins * 60 * 1000;
    computedTargetTime = Date.now() + computedDelayMs;
  }

  const applyClockPreset = (hours: number, minutes: number) => {
    const hh = hours.toString().padStart(2, '0');
    const mm = minutes.toString().padStart(2, '0');
    setSpecificTime(`${hh}:${mm}`);

    const now = new Date();
    const testTarget = new Date();
    testTarget.setHours(hours, minutes, 0, 0);

    if (testTarget.getTime() > now.getTime()) {
      setDayChoice('today');
    } else {
      setDayChoice('tomorrow');
    }
  };

  const handleRequestNotify = async () => {
    if (typeof Notification !== 'undefined') {
      try {
        const perm = await Notification.requestPermission();
        setEnableDesktopNotify(perm === 'granted');
      } catch {}
    }
  };

  const handleConfirm = () => {
    if (enableChime) {
      // Test audio context initialization
      playSchedulerStartChime();
    }
    onSchedule(computedDelayMs, computedTargetTime);
    onClose();
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div
      id="batch-scheduler-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-5 text-slate-100 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>{isKm ? 'កំណត់កាលវិភាគទាញយក (Download Scheduler)' : 'Schedule Batch Download'}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {isKm
                  ? `កំណត់ម៉ោងជាក់លាក់ដើម្បីចាប់ផ្តើមទាញយក ${queueCount} វីដេអូដោយស្វ័យប្រវត្តិ`
                  : `Set a specific time for when the bulk download process should begin (${queueCount} items)`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title={isKm ? 'បិទ' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('clock')}
            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'clock'
                ? 'bg-indigo-600 text-white shadow font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{isKm ? 'ម៉ោងជាក់លាក់ (Specific Time)' : 'Specific Time'}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('preset')}
            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'preset'
                ? 'bg-indigo-600 text-white shadow font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            <span>{isKm ? 'ជម្រើសកំណត់ស្រាប់' : 'Quick Presets'}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('custom')}
            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'custom'
                ? 'bg-indigo-600 text-white shadow font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isKm ? 'នាទីផ្ទាល់ខ្លួន' : 'Custom Delay'}</span>
          </button>
        </div>

        {/* Mode 1: Specific Clock & Date Picker (Core Feature) */}
        {mode === 'clock' && (
          <div className="flex flex-col gap-4">
            {/* Day Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isKm ? 'ជ្រើសរើសថ្ងៃចាប់ផ្តើម:' : 'Select start date:'}</span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDayChoice('today')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    dayChoice === 'today'
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500/50 shadow'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                  }`}
                >
                  {isKm ? 'ថ្ងៃនេះ (Today)' : 'Today'}
                </button>
                <button
                  type="button"
                  onClick={() => setDayChoice('tomorrow')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    dayChoice === 'tomorrow'
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500/50 shadow'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                  }`}
                >
                  {isKm ? 'ថ្ងៃស្អែក (Tomorrow)' : 'Tomorrow'}
                </button>
                <button
                  type="button"
                  onClick={() => setDayChoice('custom')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    dayChoice === 'custom'
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500/50 shadow'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                  }`}
                >
                  {isKm ? 'ជ្រើសរើសកាលបរិច្ឆេទ' : 'Custom Date'}
                </button>
              </div>

              {dayChoice === 'custom' && (
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="date"
                    min={todayStr}
                    value={customDate}
                    onChange={e => setCustomDate(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-400">
                    {isKm ? 'ជ្រើសរើសថ្ងៃជាក់លាក់' : 'Specify exact day'}
                  </span>
                </div>
              )}
            </div>

            {/* Time of Day Input */}
            <div className="flex flex-col gap-2 p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isKm ? 'ម៉ោងជាក់លាក់ដែលត្រូវចាប់ផ្តើម:' : 'Specific start time (HH:MM):'}</span>
                </span>
                <span className="text-[11px] text-indigo-400 font-mono">
                  {formatTargetClockTime(computedTargetTime, isKm)}
                </span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  id="batch-scheduler-clock-input"
                  value={specificTime}
                  onChange={e => setSpecificTime(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-base font-mono text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                />
                <span className="text-xs text-slate-400 leading-relaxed">
                  {dayChoice === 'today' && computedTargetTime <= Date.now()
                    ? (isKm ? '(ម៉ោងនេះបានកន្លងផុតថ្ងៃនេះហើយ ដូច្នេះវានឹងកំណត់ទៅថ្ងៃស្អែក)' : '(This time has passed today, will start tomorrow)')
                    : (isKm ? 'ទាញយកដោយស្វ័យប្រវត្តិតាមម៉ោងនេះ' : 'Bulk queue will start automatically at this time')}
                </span>
              </div>
            </div>

            {/* Smart Off-Peak & Night Presets */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>{isKm ? 'ម៉ោងពេញនិយម (Smart Off-Peak Presets):' : 'Popular Off-Peak Times:'}</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  {isKm ? 'ល្បឿនអ៊ីនធឺណិតលឿនពេលយប់' : 'Best internet speed & bandwidth'}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {[
                  { label: '11:00 PM', h: 23, m: 0, icon: Moon, desc: 'Night' },
                  { label: '12:00 AM', h: 0, m: 0, icon: Moon, desc: 'Midnight' },
                  { label: '02:00 AM', h: 2, m: 0, icon: Zap, desc: 'Fastest' },
                  { label: '04:00 AM', h: 4, m: 0, icon: Moon, desc: 'Quiet' },
                  { label: '06:00 AM', h: 6, m: 0, icon: Sun, desc: 'Dawn' },
                  { label: '08:00 AM', h: 8, m: 0, icon: Sun, desc: 'Morning' }
                ].map(slot => (
                  <button
                    key={slot.label}
                    type="button"
                    onClick={() => applyClockPreset(slot.h, slot.m)}
                    className="p-1.5 rounded-xl border border-slate-800 bg-slate-950/80 hover:bg-slate-800 hover:border-indigo-500/50 text-slate-300 hover:text-white text-xs flex flex-col items-center justify-center transition-all cursor-pointer gap-0.5"
                    title={`Schedule for ${slot.label} (${slot.desc})`}
                  >
                    <slot.icon className="w-3 h-3 text-indigo-400" />
                    <span className="font-mono text-[11px] font-bold">{slot.label}</span>
                    <span className="text-[9px] text-slate-500">{slot.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mode 2: Quick Delay Presets */}
        {mode === 'preset' && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-300">
              {isKm ? 'ជ្រើសរើសពេលវេលាពន្យារពេល:' : 'Select delayed start offset:'}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESETS.map(p => {
                const isSelected = selectedMinutes === p.mins;
                return (
                  <button
                    key={p.mins}
                    type="button"
                    onClick={() => setSelectedMinutes(p.mins)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/25 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500/50 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Timer className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span>{isKm ? p.labelKm : p.labelEn}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Mode 3: Custom Delay Minutes */}
        {mode === 'custom' && (
          <div className="flex flex-col gap-3 p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>{isKm ? 'បញ្ចូលចំនួននាទីពន្យារពេល (Delay in minutes):' : 'Enter delay duration (minutes):'}</span>
              <span className="text-[11px] text-indigo-400 font-mono">1 - 1440 mins</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="1440"
                value={customMinutes}
                onChange={e => setCustomMinutes(e.target.value)}
                className="w-32 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white text-center focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <span className="text-xs text-slate-400 font-medium">
                {isKm ? 'នាទីពីពេលនេះទៅ' : 'minutes from right now'}
              </span>
            </div>
            {/* Quick adjust pills */}
            <div className="flex items-center gap-2 pt-1">
              {[10, 20, 45, 90, 180].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setCustomMinutes(m.toString())}
                  className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors cursor-pointer"
                >
                  +{m}m
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notifications & Chime Toggles */}
        <div className="flex items-center justify-between text-xs text-slate-300 pt-1 border-t border-slate-800/80">
          <label className="flex items-center gap-2 cursor-pointer hover:text-white select-none">
            <input
              type="checkbox"
              checked={enableChime}
              onChange={e => setEnableChime(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
            />
            <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isKm ? 'បន្លឺសំឡេងកណ្តឹងពេលដល់ម៉ោង' : 'Play audio chime on start'}</span>
          </label>

          <button
            type="button"
            onClick={handleRequestNotify}
            className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer"
          >
            <Bell className={`w-3.5 h-3.5 ${enableDesktopNotify ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span>
              {enableDesktopNotify
                ? (isKm ? 'បានបើកការជូនដំណឹង' : 'Notifications enabled')
                : (isKm ? 'បើកការជូនដំណឹង Browser' : 'Enable browser alerts')}
            </span>
          </button>
        </div>

        {/* Live Calculation Preview Banner */}
        <div className="p-3.5 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/40 border border-indigo-500/40 rounded-xl flex items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 animate-pulse" />
            <div className="text-xs">
              <p className="font-bold text-white flex items-center gap-1.5">
                <span>{isKm ? 'នឹងចាប់ផ្តើមនៅ៖' : 'Will start at:'}</span>
                <span className="text-indigo-300 font-mono">
                  {formatTargetClockTime(computedTargetTime, isKm)}
                </span>
              </p>
              <p className="text-slate-400 text-[11px] mt-0.5 flex items-center gap-1">
                <span>{isKm ? 'រាប់ថយក្រោយ៖' : 'Countdown timer:'}</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {formatRemainingTime(computedDelayMs).text}
                </span>
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
            {queueCount} {isKm ? 'វីដេអូ' : 'videos'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            {isKm ? 'បោះបង់' : 'Cancel'}
          </button>
          <button
            type="button"
            id="batch-scheduler-confirm-btn"
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Clock className="w-4 h-4" />
            <span>{isKm ? 'កំណត់កាលវិភាគឥឡូវនេះ' : 'Confirm & Schedule'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Sticky/Highlighted Countdown Banner displayed when a scheduled batch is active
 */
export function BatchQueueSchedulerBanner({
  scheduledStartTime,
  scheduledDurationMs,
  onStartNow,
  onCancelSchedule,
  onAddMinutes,
  onEditSchedule,
  isKm,
  queueCount
}: BatchQueueSchedulerBannerProps) {
  const [remainingMs, setRemainingMs] = useState<number>(() =>
    Math.max(0, scheduledStartTime - Date.now())
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const rem = Math.max(0, scheduledStartTime - Date.now());
      setRemainingMs(rem);
    }, 500);

    return () => clearInterval(timer);
  }, [scheduledStartTime]);

  const { text } = formatRemainingTime(remainingMs);
  const targetFormatted = formatTargetClockTime(scheduledStartTime, isKm);

  // Compute progress of the countdown (0% when scheduled, 100% when elapsed)
  const elapsedMs = Math.max(0, (scheduledDurationMs || 1) - remainingMs);
  const percentElapsed = Math.min(100, Math.max(0, Math.round((elapsedMs / (scheduledDurationMs || 1)) * 100)));

  return (
    <div
      id="batch-queue-scheduler-active-banner"
      className="p-4 bg-gradient-to-r from-indigo-950/90 via-slate-900 to-indigo-950/80 border border-indigo-500/50 rounded-2xl shadow-xl backdrop-blur-md flex flex-col gap-3 animate-in fade-in duration-300 ring-1 ring-indigo-500/20"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Indicator, Clock, Target time */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center shrink-0">
            <Timer className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{isKm ? 'កាលវិភាគទាញយកកំពុងរង់ចាំ' : 'Scheduled Queue Active'}</span>
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                {targetFormatted}
              </span>
            </div>

            <p className="text-xs text-slate-300 mt-0.5">
              {isKm
                ? `នឹងចាប់ផ្តើមទាញយក ${queueCount} វីដេអូដោយស្វ័យប្រវត្តិ នៅពេលរាប់ដល់សូន្យ`
                : `Will automatically start downloading ${queueCount} items when timer expires`}
            </p>
          </div>
        </div>

        {/* Right: Big Live Countdown Badge & Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Big Countdown pill */}
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-indigo-500/40 font-mono text-sm font-bold text-indigo-300 shadow-inner flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>{text}</span>
          </div>

          {/* Edit / Change Time Button */}
          {onEditSchedule && (
            <button
              type="button"
              id="batch-scheduler-edit-btn"
              onClick={onEditSchedule}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
              title={isKm ? 'ផ្លាស់ប្តូរម៉ោងកាលវិភាគ' : 'Change scheduled start time'}
            >
              <Clock className="w-3 h-3 text-indigo-400" />
              <span>{isKm ? 'ប្តូរម៉ោង' : 'Change Time'}</span>
            </button>
          )}

          {/* Quick extend buttons */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-xl border border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => onAddMinutes(5)}
              className="px-2 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={isKm ? 'បន្ថែម 5 នាទី' : 'Add 5 minutes'}
            >
              +5m
            </button>
            <button
              type="button"
              onClick={() => onAddMinutes(15)}
              className="px-2 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={isKm ? 'បន្ថែម 15 នាទី' : 'Add 15 minutes'}
            >
              +15m
            </button>
          </div>

          {/* Immediate Start Button */}
          <button
            type="button"
            id="batch-scheduler-start-now-btn"
            onClick={onStartNow}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{isKm ? 'ចាប់ផ្តើមភ្លាមៗ' : 'Start Now'}</span>
          </button>

          {/* Cancel Schedule Button */}
          <button
            type="button"
            id="batch-scheduler-cancel-btn"
            onClick={onCancelSchedule}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
            title={isKm ? 'បោះបង់កាលវិភាគ' : 'Cancel Schedule'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar of Scheduled Wait */}
      <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 transition-all duration-500"
          style={{ width: `${percentElapsed}%` }}
        />
      </div>
    </div>
  );
}

