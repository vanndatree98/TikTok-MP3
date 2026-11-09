import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  Play,
  Pause,
  Square,
  Sparkles,
  Eye,
  Download,
  ListPlus,
  Tv,
  Trash2,
  ArrowRight,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Layers,
  Zap,
  Check
} from 'lucide-react';
import { CreatorDramaInfo, CreatorDramaScanResult, DisplayEpisode, ShortDramaResult } from './ShortDramaConverter';
import { TIKTOK_DRAMA_CHANNELS, DramaChannel } from '../data/dramaChannels';

export interface AutoCycleWorkflowProps {
  isKm: boolean;
  activeDrama: CreatorDramaInfo | null;
  creatorResult: CreatorDramaScanResult | null;
  singleDramaResult: ShortDramaResult | null;
  episodesData: { drama: CreatorDramaInfo; episodes: DisplayEpisode[] } | null;
  cachedDramaEpisodes: Record<string, DisplayEpisode[]>;
  filteredVideos: DisplayEpisode[];
  onViewEpisodesAndImages: () => void;
  onDownloadPoster: () => void;
  onQueue30Episodes: () => string[];
  onStartDownload: (urlsToQueue?: string[]) => void;
  onScan20SmartChannels: (targetChannelIndex?: number) => void;
  onClearDrama: () => void;
  currentChannelIndex: number;
  totalChannels?: number;
  showToast: (msg: string) => void;
  className?: string;
}

export default function AutoCycleWorkflowController({
  isKm,
  activeDrama,
  creatorResult,
  singleDramaResult,
  episodesData,
  cachedDramaEpisodes,
  filteredVideos,
  onViewEpisodesAndImages,
  onDownloadPoster,
  onQueue30Episodes,
  onStartDownload,
  onScan20SmartChannels,
  onClearDrama,
  currentChannelIndex,
  totalChannels = 20,
  showToast,
  className = ''
}: AutoCycleWorkflowProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isRunningAutoLoop, setIsRunningAutoLoop] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentActiveStep, setCurrentActiveStep] = useState<number>(0); // 1 to 6, 0 = idle
  const [stepIntervalSeconds, setStepIntervalSeconds] = useState<number>(3);
  const [countdownRemaining, setCountdownRemaining] = useState<number>(0);
  const [completedCyclesCount, setCompletedCyclesCount] = useState<number>(0);
  const [selectedChannelIdx, setSelectedChannelIdx] = useState<number>(currentChannelIndex);

  // References for timers
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync selectedChannelIdx when external changes
  useEffect(() => {
    setSelectedChannelIdx(currentChannelIndex);
  }, [currentChannelIndex]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Execution functions for each of the 6 steps
  const handleStep1 = () => {
    setCurrentActiveStep(1);
    onViewEpisodesAndImages();
  };

  const handleStep2 = () => {
    setCurrentActiveStep(2);
    onDownloadPoster();
  };

  const handleStep3 = () => {
    setCurrentActiveStep(3);
    const urls = onQueue30Episodes();
    return urls;
  };

  const handleStep4 = (preQueuedUrls?: string[]) => {
    setCurrentActiveStep(4);
    onStartDownload(preQueuedUrls);
  };

  const handleStep5 = (channelIdx?: number) => {
    setCurrentActiveStep(5);
    const nextIdx = typeof channelIdx === 'number' ? channelIdx : (selectedChannelIdx + 1) % totalChannels;
    setSelectedChannelIdx(nextIdx);
    onScan20SmartChannels(nextIdx);
  };

  const handleStep6 = () => {
    setCurrentActiveStep(6);
    onClearDrama();
  };

  // Automated Sequence Runner
  const runStepSequence = (stepNumber: number) => {
    if (!isRunningAutoLoop) return;

    setCurrentActiveStep(stepNumber);
    setCountdownRemaining(stepIntervalSeconds);

    // Execute current step
    try {
      if (stepNumber === 1) {
        handleStep1();
      } else if (stepNumber === 2) {
        handleStep2();
      } else if (stepNumber === 3) {
        handleStep3();
      } else if (stepNumber === 4) {
        handleStep4();
      } else if (stepNumber === 5) {
        handleStep5();
      } else if (stepNumber === 6) {
        handleStep6();
      }
    } catch {
      // ignore
    }

    // Schedule next step countdown
    let secondsLeft = stepIntervalSeconds;
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      secondsLeft -= 1;
      setCountdownRemaining(secondsLeft);
      if (secondsLeft <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      }
    }, 1000);

    // Schedule next step execution
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!isRunningAutoLoop) return;

      if (stepNumber < 6) {
        runStepSequence(stepNumber + 1);
      } else {
        // Completed full cycle! Increment count and loop back to step 1
        setCompletedCyclesCount(prev => prev + 1);
        showToast(
          isKm
            ? `បានបញ្ចប់វិលជុំទី #${completedCyclesCount + 1}! កំពុងចាប់ផ្តើមជុំបន្ត...`
            : `Completed cycle #${completedCyclesCount + 1}! Starting next round...`
        );
        runStepSequence(1);
      }
    }, stepIntervalSeconds * 1000);
  };

  // Start loop
  const handleStartLoop = () => {
    setIsRunningAutoLoop(true);
    setIsPaused(false);
    showToast(isKm ? 'បានចាប់ផ្តើមដំណើរការចុចវិលជុំ ដោយស្វ័យប្រវត្តិ (៦ ជំហាន)!' : 'Started 6-step Auto-Cycle Workflow Loop!');
    runStepSequence(1);
  };

  // Pause loop
  const handlePauseLoop = () => {
    setIsPaused(true);
    setIsRunningAutoLoop(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    showToast(isKm ? 'បានផ្អាកដំណើរការវិលជុំស្វ័យប្រវត្តិ' : 'Paused Auto-Cycle loop');
  };

  // Stop loop
  const handleStopLoop = () => {
    setIsRunningAutoLoop(false);
    setIsPaused(false);
    setCurrentActiveStep(0);
    setCountdownRemaining(0);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    showToast(isKm ? 'បានបញ្ឈប់ដំណើរការវិលជុំស្វ័យប្រវត្តិ' : 'Stopped Auto-Cycle loop');
  };

  // Get current active drama name or fallback
  const currentDramaName =
    activeDrama?.dramaName ||
    singleDramaResult?.seriesName ||
    creatorResult?.dramaList?.[0]?.dramaName ||
    (isKm ? 'រឿងភាគ Short Drama ត្រៀមរួចរាល់' : 'Ready Short Drama');

  const smartChannels = TIKTOK_DRAMA_CHANNELS.slice(0, 20);
  const currentChannel = smartChannels[selectedChannelIdx % smartChannels.length];

  return (
    <div
      id="auto-cycle-control-panel"
      className={`bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border-2 ${
        isRunningAutoLoop
          ? 'border-amber-400 shadow-2xl shadow-amber-500/20'
          : 'border-amber-500/30 hover:border-amber-500/60 shadow-xl'
      } rounded-2xl p-4 sm:p-5 transition-all backdrop-blur-xl ${className}`}
    >
      {/* Header Bar with Main Toggle Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Master Trigger Button: ប៊ូតុងចុចវិលជុំ ដោយស្វ័យប្រវត្តិ */}
          <button
            id="auto-cycle-workflow-btn"
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            className="group btn-3d-glass btn-3d-glass-master px-3.5 py-2 text-xs sm:text-sm font-bold text-white flex items-center gap-2 rounded-xl shadow-lg border border-amber-400/60 hover:scale-102 active:scale-98 transition-all cursor-pointer"
            title={
              isKm
                ? 'ចុចដើម្បីបើក/បិទ ផ្ទាំងបញ្ជាចុចវិលជុំ ដោយស្វ័យប្រវត្តិ (៦ ជំហាន)'
                : 'Click to toggle 6-Step Auto-Cycle Workflow Controller'
            }
          >
            <RotateCcw
              className={`w-4 h-4 text-amber-300 transition-transform duration-700 ${
                isRunningAutoLoop ? 'animate-spin' : 'group-hover:rotate-180'
              }`}
            />
            <span className="bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-transparent font-extrabold tracking-wide">
              {isKm ? 'ចុចវិលជុំ ដោយស្វ័យប្រវត្តិ' : 'Auto-Cycle Workflow'}
            </span>
            <span className="text-[10px] bg-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded-full font-mono border border-amber-400/40 font-bold">
              ៦ ជំហាន
            </span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-amber-300 ml-1" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-amber-300 ml-1" />
            )}
          </button>

          {/* Running State Badge */}
          {isRunningAutoLoop && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>{isKm ? `កំពុងវិលជុំ: ជំហានទី ${currentActiveStep}/៦` : `Cycling: Step ${currentActiveStep}/6`}</span>
              {countdownRemaining > 0 && (
                <span className="font-mono text-[11px] bg-emerald-950/60 px-1.5 py-0.2 rounded text-emerald-200">
                  {countdownRemaining}s
                </span>
              )}
            </div>
          )}

          {completedCyclesCount > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
              {isKm ? `ជុំទី #${completedCyclesCount}` : `Cycle #${completedCyclesCount}`}
            </span>
          )}
        </div>

        {/* Quick Play/Pause/Stop Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {!isRunningAutoLoop ? (
            <button
              id="start-auto-cycle-loop-btn"
              type="button"
              onClick={handleStartLoop}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer border border-emerald-400/40"
              title={isKm ? 'ចាប់ផ្តើមដំណើរការវិលជុំស្វ័យប្រវត្តិទាំង ៦ ជំហាន' : 'Start 6-step Auto-Cycle workflow'}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isKm ? 'ចាប់ផ្តើមវិលជុំ' : 'Start Auto-Cycle'}</span>
            </button>
          ) : (
            <>
              <button
                id="pause-auto-cycle-btn"
                type="button"
                onClick={handlePauseLoop}
                className="px-2.5 py-1.5 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                title={isKm ? 'ផ្អាកដំណើរការ' : 'Pause'}
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>{isKm ? 'ផ្អាក' : 'Pause'}</span>
              </button>
              <button
                id="stop-auto-cycle-btn"
                type="button"
                onClick={handleStopLoop}
                className="px-2.5 py-1.5 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                title={isKm ? 'បញ្ឈប់' : 'Stop'}
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>{isKm ? 'បញ្ឈប់' : 'Stop'}</span>
              </button>
            </>
          )}

          {/* Delay Interval Selector */}
          <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800 text-[11px] text-slate-300">
            <Clock className="w-3 h-3 text-slate-400" />
            <select
              value={stepIntervalSeconds}
              onChange={e => setStepIntervalSeconds(Number(e.target.value))}
              className="bg-transparent text-amber-300 font-mono outline-none cursor-pointer"
              title={isKm ? 'គម្លាតពេលវេលាជំហាននីមួយៗ' : 'Step interval'}
            >
              <option value={1} className="bg-slate-900 text-slate-200">1s</option>
              <option value={2} className="bg-slate-900 text-slate-200">2s</option>
              <option value={3} className="bg-slate-900 text-slate-200">3s</option>
              <option value={5} className="bg-slate-900 text-slate-200">5s</option>
            </select>
          </div>
        </div>
      </div>

      {/* Collapsible 6 Steps Grid & Interactive Triggers */}
      {isExpanded && (
        <div className="flex flex-col gap-3 pt-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{isKm ? 'លំដាប់លំហូរការងារវិលជុំស្វ័យប្រវត្តិ (ចុចដើម្បីដំណើរការជំហាននីមួយៗ):' : 'Automated 6-Step Workflow Sequence (Click any step to execute):'}</span>
            </span>
            <span className="text-[11px] text-amber-300/90 font-mono">
              {currentDramaName}
            </span>
          </div>

          {/* The 6 Step Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
            {/* Step 1: ទី១ មើលភាគ & រូបភាព */}
            <button
              id="auto-cycle-step-1-btn"
              type="button"
              onClick={handleStep1}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer group ${
                currentActiveStep === 1
                  ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/40'
                  : 'bg-slate-950/70 hover:bg-slate-850 border-slate-800 hover:border-amber-500/40'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  currentActiveStep === 1 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-amber-300'
                }`}>
                  {isKm ? 'ទី១' : 'Step 1'}
                </span>
                <Eye className={`w-4 h-4 ${currentActiveStep === 1 ? 'text-amber-300 animate-bounce' : 'text-slate-400 group-hover:text-amber-400'}`} />
              </div>
              <div>
                <h5 className="font-bold text-xs text-slate-100 group-hover:text-amber-200">
                  {isKm ? 'មើលភាគ & រូបភាព' : 'View Ep & Images'}
                </h5>
                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                  {isKm ? 'បង្ហាញ Poster & រូបភាពដើម 100%' : '100% Uncropped HD View'}
                </p>
              </div>
            </button>

            {/* Step 2: ទី២ Download Poster */}
            <button
              id="auto-cycle-step-2-btn"
              type="button"
              onClick={handleStep2}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer group ${
                currentActiveStep === 2
                  ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/40'
                  : 'bg-slate-950/70 hover:bg-slate-850 border-slate-800 hover:border-amber-500/40'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  currentActiveStep === 2 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-amber-300'
                }`}>
                  {isKm ? 'ទី២' : 'Step 2'}
                </span>
                <Download className={`w-4 h-4 ${currentActiveStep === 2 ? 'text-amber-300 animate-bounce' : 'text-slate-400 group-hover:text-amber-400'}`} />
              </div>
              <div>
                <h5 className="font-bold text-xs text-slate-100 group-hover:text-amber-200">
                  {isKm ? 'Download Poster' : 'Download Poster'}
                </h5>
                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                  {isKm ? 'ទាញយក Poster HD រូបភាពដើម' : 'Save Original Poster'}
                </p>
              </div>
            </button>

            {/* Step 3: ទី៣ ទាញយកគ្រប់ 30 ភាគក្នុង Batch Queue */}
            <button
              id="auto-cycle-step-3-btn"
              type="button"
              onClick={() => handleStep3()}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer group ${
                currentActiveStep === 3
                  ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/40'
                  : 'bg-slate-950/70 hover:bg-slate-850 border-slate-800 hover:border-amber-500/40'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  currentActiveStep === 3 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-amber-300'
                }`}>
                  {isKm ? 'ទី៣' : 'Step 3'}
                </span>
                <ListPlus className={`w-4 h-4 ${currentActiveStep === 3 ? 'text-amber-300 animate-bounce' : 'text-slate-400 group-hover:text-amber-400'}`} />
              </div>
              <div>
                <h5 className="font-bold text-xs text-slate-100 group-hover:text-amber-200">
                  {isKm ? 'គ្រប់ 30 ភាគ → Batch' : 'Queue 30 Episodes'}
                </h5>
                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                  {isKm ? 'បញ្ជូនគ្រប់ 30 ភាគចូល Batch Queue' : 'Queue 30 ep to Batch'}
                </p>
              </div>
            </button>

            {/* Step 4: ទី៤ ចាប់ផ្តើមទាញយក */}
            <button
              id="auto-cycle-step-4-btn"
              type="button"
              onClick={() => handleStep4()}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer group ${
                currentActiveStep === 4
                  ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/40'
                  : 'bg-slate-950/70 hover:bg-slate-850 border-slate-800 hover:border-amber-500/40'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  currentActiveStep === 4 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-amber-300'
                }`}>
                  {isKm ? 'ទី៤' : 'Step 4'}
                </span>
                <Play className={`w-4 h-4 ${currentActiveStep === 4 ? 'text-emerald-400 fill-current animate-pulse' : 'text-slate-400 group-hover:text-emerald-400 fill-current'}`} />
              </div>
              <div>
                <h5 className="font-bold text-xs text-slate-100 group-hover:text-emerald-300">
                  {isKm ? 'ចាប់ផ្តើមទាញយក' : 'Start Download'}
                </h5>
                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                  {isKm ? 'ដំណើរការ Batch ស្វ័យប្រវត្តិ' : 'Auto Start Batch Queue'}
                </p>
              </div>
            </button>

            {/* Step 5: ទី៥ ចុចប៊ូតុង ស្កេន Short Dramas ២០ ប៉ុស្តិ៍ឆ្លាតវៃ */}
            <button
              id="auto-cycle-step-5-btn"
              type="button"
              onClick={() => handleStep5()}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer group ${
                currentActiveStep === 5
                  ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/40'
                  : 'bg-slate-950/70 hover:bg-slate-850 border-slate-800 hover:border-amber-500/40'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  currentActiveStep === 5 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-amber-300'
                }`}>
                  {isKm ? 'ទី៥' : 'Step 5'}
                </span>
                <Tv className={`w-4 h-4 ${currentActiveStep === 5 ? 'text-amber-300 animate-bounce' : 'text-slate-400 group-hover:text-amber-400'}`} />
              </div>
              <div>
                <h5 className="font-bold text-xs text-slate-100 group-hover:text-amber-200 flex items-center gap-1">
                  <span>{isKm ? 'ស្កេន ២០ ប៉ុស្តិ៍' : 'Scan 20 Channels'}</span>
                  <span className="text-[9px] bg-amber-500/30 text-amber-200 px-1 rounded font-mono">
                    {selectedChannelIdx + 1}/20
                  </span>
                </h5>
                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                  {currentChannel ? `${currentChannel.handle}` : (isKm ? 'ប្តូរទៅប៉ុស្តិ៍ឆ្លាតវៃបន្ទាប់' : 'Next smart channel')}
                </p>
              </div>
            </button>

            {/* Step 6: ទី៦ លុបរឿង */}
            <button
              id="auto-cycle-step-6-btn"
              type="button"
              onClick={handleStep6}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer group ${
                currentActiveStep === 6
                  ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/40'
                  : 'bg-slate-950/70 hover:bg-slate-850 border-slate-800 hover:border-rose-500/40'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  currentActiveStep === 6 ? 'bg-rose-400 text-slate-950' : 'bg-slate-800 text-rose-300'
                }`}>
                  {isKm ? 'ទី៦' : 'Step 6'}
                </span>
                <Trash2 className={`w-4 h-4 ${currentActiveStep === 6 ? 'text-rose-300 animate-bounce' : 'text-slate-400 group-hover:text-rose-400'}`} />
              </div>
              <div>
                <h5 className="font-bold text-xs text-slate-100 group-hover:text-rose-200">
                  {isKm ? 'លុបរឿង' : 'Clear Drama'}
                </h5>
                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                  {isKm ? 'សម្អាតទិន្នន័យចាស់ & ត្រៀមវិលជុំ' : 'Reset & Loop back to Step 1'}
                </p>
              </div>
            </button>
          </div>

          {/* Quick Channel Selector for 20 Smart Channels in Step 5 */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex-wrap">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Tv className="w-3.5 h-3.5 text-amber-400" />
              <span>{isKm ? 'ប៉ុស្តិ៍គោលដៅសម្រាប់ជំហានទី៥ (ស្កេន ២០ ប៉ុស្តិ៍ឆ្លាតវៃ):' : 'Target channel for Step 5 (20 Smart Channels):'}</span>
            </span>

            <div className="flex items-center gap-1.5 flex-wrap">
              {smartChannels.slice(0, 6).map((ch, idx) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => {
                    setSelectedChannelIdx(idx);
                    handleStep5(idx);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer border ${
                    selectedChannelIdx === idx
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                      : 'bg-slate-950 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
                  }`}
                  title={`${ch.displayName} (${ch.handle})`}
                >
                  {ch.handle}
                </button>
              ))}
              {smartChannels.length > 6 && (
                <button
                  type="button"
                  onClick={() => handleStep5()}
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-amber-300 border border-slate-800 hover:border-amber-400 flex items-center gap-1 cursor-pointer"
                  title="Next channel in 20 smart channels"
                >
                  <span>{isKm ? 'ប៉ុស្តិ៍បន្ទាប់...' : 'Next Channel...'}</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
