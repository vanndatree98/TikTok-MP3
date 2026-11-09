import React, { useState } from 'react';
import { X, Play, Download, ExternalLink, Copy, Check, Sparkles, Music, Film, CheckCircle2 } from 'lucide-react';

interface YouTubeShortItem {
  id: string;
  titleKm: string;
  titleEn: string;
  originalTitle: string;
  duration: string;
  resolution: string;
}

const SHORTS_PLAYLIST: YouTubeShortItem[] = [
  {
    id: 'bZlG2jzSxAw',
    titleKm: 'ផ្លែរ៉ាសបឺរីសរីរាង្គ (Raspberry Organic) 🍓 អត្ថប្រយោជន៍ និងការថែទាំ',
    titleEn: 'Organic Raspberry 🍓 Nutritious & Care Guide',
    originalTitle: 'ราสเบอร์รี่ออร์แกนิก 🍓 ประโยชน์ล้นแก้วแต่ดูแลยาก! คุ้มไหมที่จะจ่ายแพง 💸✨',
    duration: '0:58',
    resolution: '1440p 2K'
  },
  {
    id: 'pYaxMgW_aVQ',
    titleKm: 'ការរួមផ្សំផ្លែឈើចម្រុះច្រើនមុខ 🍎🍓 ផ្អែមឆ្ងាញ់ មានសុខភាពល្អ',
    titleEn: 'Mixed Healthy Fruits Guide 🍎🍓 Delicious & Nutritious',
    originalTitle: 'รวมพลังผลไม้หลากชนิด! หวานฉ่ำ มีประโยชน์ แต่ต้องทานให้เป็นเพื่อสุขภาพที่ดี 🍎🍓✨',
    duration: '0:59',
    resolution: '1440p 2K'
  },
  {
    id: 'jW3p2Nw7lEo',
    titleKm: 'ផ្លែមៈប្រាងផ្អែមពណ៌មាស 🥭✨ វីតាមីន C ខ្ពស់បំផុត',
    titleEn: 'Sweet Golden Marian Plum 🥭✨ Rich Vitamin C & Benefits',
    originalTitle: 'มะปรางหวาน! ผลไม้สีทอง วิตามินซีพุ่งปรี๊ด 🥭✨ กินยังไงให้ได้ประโยชน์ ไม่โทษร่างกาย',
    duration: '0:56',
    resolution: '1440p 2K'
  }
];

interface YouTubeWatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  isKm: boolean;
  initialVideoId?: string;
  onDownloadVideo: (url: string) => void;
  showToast: (msg: string) => void;
}

export default function YouTubeWatchModal({
  isOpen,
  onClose,
  isKm,
  initialVideoId = 'bZlG2jzSxAw',
  onDownloadVideo,
  showToast
}: YouTubeWatchModalProps) {
  const [selectedVideoId, setSelectedVideoId] = useState(initialVideoId);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentShort = SHORTS_PLAYLIST.find(s => s.id === selectedVideoId) || SHORTS_PLAYLIST[0];
  const shortUrl = `https://www.youtube.com/shorts/${currentShort.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      showToast(isKm ? 'បានចម្លងតំណភ្ជាប់ YouTube Shorts រួចរាល់!' : 'Copied YouTube Shorts link!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast(shortUrl);
    }
  };

  const handleTriggerDownload = () => {
    onDownloadVideo(shortUrl);
    onClose();
  };

  return (
    <div
      id="youtube-watch-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] bg-slate-900/95 border border-red-500/30 rounded-2xl shadow-2xl shadow-red-950/50 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-red-600/20 border border-red-500/40 px-2.5 py-1 rounded-xl">
              <img
                src="/logos/youtube.svg"
                alt="YouTube"
                className="w-4 h-4 object-contain"
                referrerPolicy="no-referrer"
              />
              <span className="text-xs font-black text-white tracking-wide uppercase">YouTube Shorts</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>1X</span>
                <span className="text-xs font-normal text-red-400">(@000-01-t)</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-red-400 inline" />
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={isKm ? 'បិទផ្ទាំង' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Two Column Responsive Layout */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: 9:16 Shorts Embedded Player */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative w-full max-w-[300px] aspect-[9/16] rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-xl ring-1 ring-red-500/30">
              <iframe
                src={`https://www.youtube.com/embed/${selectedVideoId}?autoplay=1&enablejsapi=1&rel=0`}
                title={currentShort.titleEn}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 text-center flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-red-400" />
              <span>{isKm ? 'ចាក់វីដេអូកម្រិតច្បាស់ 1440p 2K QHD ដោយស្វ័យប្រវត្តិ' : 'Plays automatically in crisp 1440p 2K QHD'}</span>
            </p>
          </div>

          {/* Right Column: Video Details, Action Buttons, and Channel Playlist */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Title & Metadata Box */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black px-2 py-0.5 rounded bg-red-500 text-white shadow-xs">
                  {currentShort.resolution}
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  ⏱️ {currentShort.duration}
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {isKm ? '✓ គ្មានសញ្ញាទឹក' : '✓ Clean MP4'}
                </span>
              </div>

              <h2 className="text-base font-bold text-white leading-snug">
                {isKm ? currentShort.titleKm : currentShort.titleEn}
              </h2>
              <p className="text-xs text-slate-400 font-thai leading-relaxed">
                {currentShort.originalTitle}
              </p>
            </div>

            {/* Quick Action Buttons: Download & Open in YouTube */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                id="modal-download-youtube-btn"
                onClick={handleTriggerDownload}
                className="btn-3d-glass btn-3d-glass-amber py-2.5 px-4 text-xs font-bold text-slate-950 flex items-center justify-center gap-2 shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>{isKm ? 'ទាញយកវីដេអូ MP4 (1440p 2K)' : 'Download MP4 (1440p 2K)'}</span>
              </button>

              <button
                type="button"
                id="modal-copy-youtube-link-btn"
                onClick={handleCopyLink}
                className="btn-3d-glass btn-3d-glass-slate py-2.5 px-4 text-xs font-semibold text-slate-200 hover:text-white flex items-center justify-center gap-2 border border-slate-700"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? (isKm ? 'បានចម្លងតំណភ្ជាប់!' : 'Copied Link!') : (isKm ? 'ចម្លងតំណភ្ជាប់' : 'Copy Link')}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-3d-glass btn-3d-glass-slate py-2 px-3 text-xs text-red-300 hover:text-white flex items-center justify-center gap-1.5 border border-red-500/30 w-full"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{isKm ? 'បើកមើលលើ YouTube ផ្លូវការ' : 'Open on Official YouTube'}</span>
              </a>

              <a
                href="https://www.youtube.com/@000-01-t/shorts"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-3d-glass btn-3d-glass-slate py-2 px-3 text-xs text-slate-300 hover:text-white flex items-center justify-center gap-1.5 border border-slate-700 w-full"
              >
                <Film className="w-3.5 h-3.5" />
                <span>{isKm ? 'ប៉ុស្តិ៍ @000-01-t' : 'Channel Shorts'}</span>
              </a>
            </div>

            {/* Shorts from this channel Playlist Selector */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 fill-red-400 text-red-400" />
                <span>{isKm ? 'ជ្រើសរើសវីដេអូ Shorts ផ្សេងទៀតក្នុងប៉ុស្តិ៍ @000-01-t:' : 'Other Shorts from Channel @000-01-t:'}</span>
              </span>

              <div className="flex flex-col gap-2">
                {SHORTS_PLAYLIST.map((item, idx) => {
                  const isSelected = item.id === selectedVideoId;
                  return (
                    <div
                      key={item.id}
                      id={`playlist-item-${item.id}`}
                      onClick={() => setSelectedVideoId(item.id)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? 'bg-red-500/15 border-red-500/60 ring-1 ring-red-500/40 text-white'
                          : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="relative w-12 h-16 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-700">
                        <img
                          src={`https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`}
                          alt={item.titleEn}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <Play className={`w-3.5 h-3.5 ${isSelected ? 'fill-red-400 text-red-400' : 'text-white'}`} />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                            #{idx + 1}
                          </span>
                          <span className="text-[10px] font-semibold text-red-400">
                            {item.resolution}
                          </span>
                        </div>
                        <p className="text-xs font-semibold truncate text-white mt-0.5">
                          {isKm ? item.titleKm : item.titleEn}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {item.originalTitle}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownloadVideo(`https://www.youtube.com/shorts/${item.id}`);
                            onClose();
                          }}
                          className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 transition-colors"
                          title={isKm ? 'ទាញយកវីដេអូនេះ' : 'Download this video'}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
