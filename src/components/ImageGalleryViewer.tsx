import React, { useState } from 'react';
import {
  ImageIcon,
  Download,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  ExternalLink,
  Check,
  Loader2,
  Archive,
  Eye,
  User,
  Sparkles,
  Layers
} from 'lucide-react';
import JSZip from 'jszip';
import { VideoInfo, AppSettings } from '../types';

interface ImageGalleryViewerProps {
  video: VideoInfo;
  settings: AppSettings;
  isKm: boolean;
  onShowToast?: (msg: string) => void;
}

export default function ImageGalleryViewer({
  video,
  settings,
  isKm,
  onShowToast
}: ImageGalleryViewerProps) {
  // Collect all available images for this post
  const rawImages: string[] = [];

  if (video.images && Array.isArray(video.images) && video.images.length > 0) {
    for (const img of video.images) {
      if (img && !rawImages.includes(img)) {
        rawImages.push(img);
      }
    }
  }

  // Also include cover and originCover if distinct
  const coverUrl = video.originCover || video.cover;
  if (coverUrl && !rawImages.includes(coverUrl)) {
    // If no specific photo slides were found, use cover as the primary image
    if (rawImages.length === 0) {
      rawImages.push(coverUrl);
    }
  }

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState({ current: 0, total: 0 });
  const [downloadingSingle, setDownloadingSingle] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const totalImages = rawImages.length;
  const currentImage = rawImages[currentIndex] || coverUrl || '';

  const cleanTitle = (video.title || 'tiktok_photos')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 40);

  const authorName = (video.author?.username || 'creator').replace(/[\\/:*?"<>|]/g, '_');

  // Single Image Download
  const handleDownloadSingle = async (url: string, index: number, customLabel?: string) => {
    try {
      setDownloadingSingle(index);
      const filename = customLabel || `${cleanTitle}_${authorName}_photo_${index + 1}`;
      const downloadApi = `/api/download?url=${encodeURIComponent(url)}&sourceUrl=${encodeURIComponent(video.sourceUrl || '')}&format=jpg&filename=${encodeURIComponent(filename)}`;
      
      const link = document.createElement('a');
      link.href = downloadApi;
      link.download = `${filename}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (onShowToast) {
        onShowToast(isKm ? `បានទាញយករូបភាពទី ${index + 1}!` : `Downloaded photo #${index + 1}!`);
      }
    } catch {
      if (onShowToast) {
        onShowToast(isKm ? 'បរាជ័យក្នុងការទាញយករូបភាព' : 'Failed to download image');
      }
    } finally {
      setTimeout(() => setDownloadingSingle(null), 1000);
    }
  };

  // Batch Download all images as a .ZIP archive
  const handleDownloadAllZip = async () => {
    if (rawImages.length === 0) return;
    try {
      setDownloadingZip(true);
      setZipProgress({ current: 0, total: rawImages.length });

      const zip = new JSZip();
      const folder = zip.folder(`${cleanTitle}_images`) || zip;

      for (let i = 0; i < rawImages.length; i++) {
        setZipProgress({ current: i + 1, total: rawImages.length });
        const imgUrl = rawImages[i];
        const proxyUrl = `/api/proxy-media?url=${encodeURIComponent(imgUrl)}`;
        
        try {
          const res = await fetch(proxyUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
          folder.file(`${cleanTitle}_${authorName}_${i + 1}.${ext}`, blob);
        } catch {
          // fallback direct fetch or skip
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = zipUrl;
      a.download = `${cleanTitle}_${authorName}_All_Images.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(zipUrl);

      if (onShowToast) {
        onShowToast(isKm ? `បានទាញយករូបភាពទាំង ${rawImages.length} ក្នុងកញ្ចប់ ZIP រួចរាល់!` : `Downloaded all ${rawImages.length} images as ZIP!`);
      }
    } catch (err) {
      console.error('ZIP download error:', err);
      if (onShowToast) {
        onShowToast(isKm ? 'បរាជ័យក្នុងការបង្កើតកញ្ចប់ ZIP' : 'Failed to create ZIP package');
      }
    } finally {
      setDownloadingZip(false);
      setZipProgress({ current: 0, total: 0 });
    }
  };

  // Sequential browser downloads
  const handleDownloadAllOneByOne = async () => {
    for (let i = 0; i < rawImages.length; i++) {
      handleDownloadSingle(rawImages[i], i);
      await new Promise(r => setTimeout(r, 400));
    }
  };

  const handlePrev = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : totalImages - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev < totalImages - 1 ? prev + 1 : 0));
  };

  // If no images at all (even cover is missing)
  if (rawImages.length === 0 && !coverUrl && !video.author.avatar) {
    return null;
  }

  const hasMultiplePhotos = rawImages.length > 1;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 mt-5 shadow-xl relative overflow-hidden">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm sm:text-base text-white">
                {isKm ? 'វិចិត្រសាលរូបភាព & ផ្ទាំងរូប (Images & Photos)' : 'Images & Photo Slides'}
              </h4>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-950/80 border border-indigo-800/50 text-indigo-300">
                {totalImages > 0 ? `${totalImages} ${isKm ? 'រូបភាព' : 'Photos'}` : (isKm ? 'រូបភាពក្រប' : 'Cover')}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {hasMultiplePhotos
                ? (isKm ? 'វីដេអូ/ការបង្ហោះនេះមានរូបភាពច្រើនសន្លឹក (Photo Slideshow)' : 'This post contains multi-photo slides')
                : (isKm ? 'រូបភាពក្រប HD និងរូបភាពប្រវត្តិរូប (HD Cover & Profile Avatar)' : 'HD Cover and profile avatar')}
            </p>
          </div>
        </div>

        {/* Global actions: Batch ZIP & Sequential */}
        <div className="flex items-center gap-2 flex-wrap">
          {hasMultiplePhotos && (
            <button
              type="button"
              id="download-all-images-zip-btn"
              onClick={handleDownloadAllZip}
              disabled={downloadingZip}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-950/50 cursor-pointer disabled:cursor-not-allowed"
              title={isKm ? 'ទាញយករូបភាពទាំងអស់ជាកញ្ចប់ ZIP' : 'Download all images as ZIP package'}
            >
              {downloadingZip ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-200" />
                  <span>
                    {isKm
                      ? `កំពុងវេចខ្ចប់ (${zipProgress.current}/${zipProgress.total})...`
                      : `Packing (${zipProgress.current}/${zipProgress.total})...`}
                  </span>
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5" />
                  <span>{isKm ? 'ទាញយកទាំងអស់ (.ZIP)' : 'Download All (.ZIP)'}</span>
                </>
              )}
            </button>
          )}

          {/* Download HD Cover shortcut */}
          {coverUrl && (
            <button
              type="button"
              id="download-cover-image-btn"
              onClick={() => handleDownloadSingle(coverUrl, 0, `${cleanTitle}_${authorName}_HD_Cover`)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium border border-slate-700/60 flex items-center gap-1.5 transition-colors cursor-pointer"
              title={isKm ? 'ទាញយករូបភាពក្រប HD ដើម' : 'Download original HD Cover image'}
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isKm ? 'ទាញយកក្រប HD' : 'Cover HD'}</span>
            </button>
          )}

          {/* Download Avatar shortcut */}
          {video.author?.avatar && (
            <button
              type="button"
              id="download-avatar-image-btn"
              onClick={() => handleDownloadSingle(video.author.avatar, 999, `${authorName}_Avatar`)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium border border-slate-700/60 flex items-center gap-1.5 transition-colors cursor-pointer"
              title={isKm ? 'ទាញយករូបភាព Profile Avatar' : 'Download Profile Avatar image'}
            >
              <User className="w-3.5 h-3.5 text-sky-400" />
              <span>{isKm ? 'ទាញយក Avatar' : 'Avatar'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Image Slider Area */}
      {rawImages.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="relative w-full aspect-video sm:aspect-21/9 max-h-[420px] rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center group">
            {/* Image display */}
            <img
              src={`/api/proxy-media?url=${encodeURIComponent(currentImage)}`}
              alt={`${cleanTitle} - Slide ${currentIndex + 1}`}
              className="w-full h-full object-contain select-none"
              loading="lazy"
            />

            {/* Slider Overlays: Navigation Arrows */}
            {hasMultiplePhotos && (
              <>
                <button
                  type="button"
                  id="gallery-prev-btn"
                  onClick={handlePrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm border border-white/10 transition-all opacity-80 group-hover:opacity-100 hover:scale-105 cursor-pointer shadow-lg z-10"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  id="gallery-next-btn"
                  onClick={handleNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm border border-white/10 transition-all opacity-80 group-hover:opacity-100 hover:scale-105 cursor-pointer shadow-lg z-10"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Bottom Floating Bar on the image */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
              {/* Photo Index Badge */}
              <div className="pointer-events-auto bg-black/70 backdrop-blur-md border border-white/10 text-white text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-md">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  {isKm
                    ? `រូបភាពទី ${currentIndex + 1} នៃ ${totalImages}`
                    : `Image ${currentIndex + 1} of ${totalImages}`}
                </span>
              </div>

              {/* Action Buttons: Lightbox & Download Current */}
              <div className="pointer-events-auto flex items-center gap-1.5">
                <button
                  type="button"
                  id="open-image-lightbox-btn"
                  onClick={() => setIsLightboxOpen(true)}
                  className="p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 transition-all hover:scale-105 cursor-pointer"
                  title={isKm ? 'ពង្រីកមើលរូបភាពពេញអេក្រង់ (Fullscreen)' : 'View fullscreen'}
                >
                  <Maximize2 className="w-4 h-4 text-slate-200" />
                </button>

                <a
                  href={`/api/proxy-media?url=${encodeURIComponent(currentImage)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 transition-all hover:scale-105"
                  title={isKm ? 'បើករូបភាពក្នុងផ្ទាំងថ្មី' : 'Open in new tab'}
                >
                  <ExternalLink className="w-4 h-4 text-slate-200" />
                </a>

                <button
                  type="button"
                  id="download-current-slide-btn"
                  onClick={() => handleDownloadSingle(currentImage, currentIndex)}
                  disabled={downloadingSingle === currentIndex}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md transition-all shadow-md cursor-pointer disabled:bg-slate-700"
                >
                  {downloadingSingle === currentIndex ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>{isKm ? 'ទាញយករូបនេះ' : 'Download Photo'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Filmstrip Thumbnails if multiple images */}
          {hasMultiplePhotos && (
            <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
              {rawImages.map((img, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer bg-slate-950 ${
                      isActive
                        ? 'border-indigo-500 scale-105 shadow-md shadow-indigo-950'
                        : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'
                    }`}
                  >
                    <img
                      src={`/api/proxy-media?url=${encodeURIComponent(img)}`}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] font-mono text-white px-1 rounded">
                      {idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Lightbox / Fullscreen Modal */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col p-4 sm:p-6 animate-in fade-in duration-200">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-white">
              <ImageIcon className="w-5 h-5 text-indigo-400" />
              <span className="font-semibold text-sm sm:text-base">
                {isKm
                  ? `មើលរូបភាពទី ${currentIndex + 1} នៃ ${totalImages}`
                  : `Photo ${currentIndex + 1} of ${totalImages}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownloadSingle(currentImage, currentIndex)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{isKm ? 'ទាញយករូបភាពនេះ' : 'Download Photo'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title={isKm ? 'បិទ' : 'Close'}
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Fullscreen Image with arrows */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden">
            <img
              src={`/api/proxy-media?url=${encodeURIComponent(currentImage)}`}
              alt="Lightbox View"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />

            {hasMultiplePhotos && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer shadow-2xl"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer shadow-2xl"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
