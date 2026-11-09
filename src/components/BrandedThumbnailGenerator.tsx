import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Download,
  Copy,
  Check,
  RefreshCw,
  Share2,
  Maximize2,
  X,
  Layers,
  Palette,
  ShieldCheck,
  Play,
  Sliders,
  Type,
  ExternalLink,
  ChevronDown,
  Info
} from 'lucide-react';
import { VideoInfo, ThumbnailAspectRatio, WatermarkPosition, WatermarkBadgeStyle, AiThumbnailDesign } from '../types';

export interface PosterAutoLinkInfo {
  posterUrl: string;
  posterType: 'static' | 'dynamic';
  downloaded?: boolean;
  timestamp?: number;
}

interface BrandedThumbnailGeneratorProps {
  video: VideoInfo;
  isKm: boolean;
  onShowToast: (msg: string) => void;
  defaultOpen?: boolean;
  autoLinkedPoster?: PosterAutoLinkInfo | null;
}

/**
 * Cleanly unwrap /api/proxy-media?url= to prevent recursive proxy wrapping
 */
function cleanMediaUrl(raw: string): string {
  if (!raw) return '';
  let url = raw.trim();
  while (url.includes('/api/proxy-media') || url.includes('proxy-media?url=')) {
    try {
      const parts = url.split(/url=/i);
      if (parts.length > 1) {
        url = decodeURIComponent(parts.slice(1).join('url=')).trim();
      } else {
        break;
      }
    } catch {
      break;
    }
  }
  if (url.startsWith('//')) {
    url = 'https:' + url;
  }
  return url;
}

/**
 * Safely load a single image without unhandled promise rejections
 */
function tryLoadSingleImage(src: string, crossOrigin: 'anonymous' | null, timeoutMs = 7000): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    if (crossOrigin) {
      img.crossOrigin = crossOrigin;
    }
    let done = false;

    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        img.onload = null;
        img.onerror = null;
        resolve(null);
      }
    }, timeoutMs);

    img.onload = () => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        resolve(img);
      }
    };

    img.onerror = () => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        resolve(null);
      }
    };

    img.src = src;
  });
}

/**
 * Try loading the best image from multiple candidate sources (proxy & direct)
 * Never throws an error — resolves to null if all sources fail.
 */
async function loadPosterImage(candidates: string[]): Promise<HTMLImageElement | null> {
  const cleanList: string[] = [];
  for (const c of candidates) {
    if (!c || typeof c !== 'string') continue;
    const clean = cleanMediaUrl(c);
    if (clean && !cleanList.includes(clean)) {
      cleanList.push(clean);
    }
    const trimmed = c.trim();
    if (trimmed && !cleanList.includes(trimmed)) {
      cleanList.push(trimmed);
    }
  }

  for (const candidate of cleanList) {
    // If base64 data URL or blob URL, load directly without proxy
    if (candidate.startsWith('data:') || candidate.startsWith('blob:')) {
      const img = await tryLoadSingleImage(candidate, null);
      if (img && img.naturalWidth > 0) return img;
      continue;
    }

    // Try via server proxy with CORS anonymous
    const proxyUrl = candidate.startsWith('/api/')
      ? candidate
      : `/api/proxy-media?url=${encodeURIComponent(candidate)}`;
    const imgFromProxy = await tryLoadSingleImage(proxyUrl, 'anonymous');
    if (imgFromProxy && imgFromProxy.naturalWidth > 0) return imgFromProxy;

    // Try direct with CORS anonymous
    if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
      const imgDirect = await tryLoadSingleImage(candidate, 'anonymous');
      if (imgDirect && imgDirect.naturalWidth > 0) return imgDirect;
    }
  }

  return null;
}

export default function BrandedThumbnailGenerator({
  video,
  isKm,
  onShowToast,
  defaultOpen = false,
  autoLinkedPoster = null,
}: BrandedThumbnailGeneratorProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activePosterSource, setActivePosterSource] = useState<'origin' | 'cover' | 'dynamic'>('origin');
  const [isDownloadingRawPoster, setIsDownloadingRawPoster] = useState(false);
  const [autoLinkNotice, setAutoLinkNotice] = useState<string | null>(null);

  useEffect(() => {
    if (defaultOpen) {
      setIsOpen(true);
    }
  }, [defaultOpen]);

  // Sync when autoLinkedPoster changes
  useEffect(() => {
    if (autoLinkedPoster) {
      setIsOpen(true);
      if (autoLinkedPoster.posterType === 'dynamic') {
        setActivePosterSource('dynamic');
      } else {
        setActivePosterSource('origin');
      }
      setAutoLinkNotice(
        isKm
          ? `រូបភាព Poster ដើម (${autoLinkedPoster.posterType === 'dynamic' ? 'មានចលនា Dynamic' : 'កម្រិតច្បាស់ HD'}) ត្រូវបានភ្ជាប់មកកាន់ស្ទូឌីយោដោយស្វ័យប្រវត្តិ!`
          : `Original ${autoLinkedPoster.posterType === 'dynamic' ? 'Dynamic' : 'HD'} Poster automatically connected to AI Studio!`
      );
    }
  }, [autoLinkedPoster, isKm]);

  const [aspectRatio, setAspectRatio] = useState<ThumbnailAspectRatio>('16:9');
  const [stylePreset, setStylePreset] = useState<'modern' | 'cinematic' | 'cyber' | 'gold' | 'minimalist'>('modern');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  // Customization states
  const [headline, setHeadline] = useState(() => (video.title ? video.title.slice(0, 55) : 'Exclusive HD Video'));
  const [subtitle, setSubtitle] = useState(() => `@${video.author?.name || video.author?.username || 'Creator'}`);
  const [showHeadline, setShowHeadline] = useState(true);
  
  // Watermark configurations
  const [watermarkText, setWatermarkText] = useState('Remix Social');
  const [watermarkSubtext, setWatermarkSubtext] = useState('TikTok HD • No Watermark');
  const [watermarkPos, setWatermarkPos] = useState<WatermarkPosition>('bottom-right');
  const [watermarkStyle, setWatermarkStyle] = useState<WatermarkBadgeStyle>('glassmorphism');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(90);
  const [watermarkScale, setWatermarkScale] = useState<number>(100);

  // Visual Badges
  const [showPlayIcon, setShowPlayIcon] = useState(true);
  const [showVerifiedBadge, setShowVerifiedBadge] = useState(true);
  const [showPlatformBadge, setShowPlatformBadge] = useState(true);
  const [qualityBadge, setQualityBadge] = useState('4K ULTRA HD');
  const [accentColor, setAccentColor] = useState('#6366f1');

  // Preview & Export states
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Determine effective poster URL based on active source or auto-link
  const effectivePosterUrl = (() => {
    if (activePosterSource === 'dynamic' && video.dynamicCover) {
      return video.dynamicCover;
    }
    if (activePosterSource === 'cover' && video.cover) {
      return video.cover;
    }
    if (autoLinkedPoster?.posterUrl && activePosterSource === (autoLinkedPoster.posterType === 'dynamic' ? 'dynamic' : 'origin')) {
      return autoLinkedPoster.posterUrl;
    }
    return video.originCover || video.cover || '';
  })();

  // Download raw clean original poster from within studio
  const handleDownloadRawPoster = async () => {
    if (!effectivePosterUrl) return;
    try {
      setIsDownloadingRawPoster(true);
      const cleanTitle = (video.title || 'original_poster')
        .replace(/[\\/:*?"<>|]/g, '_')
        .replace(/\s+/g, '_')
        .slice(0, 45);
      const isDynamic = activePosterSource === 'dynamic';
      const ext = isDynamic ? 'webp' : 'jpg';
      const filename = `${cleanTitle}_Original_Poster.${ext}`;

      const rawPoster = cleanMediaUrl(effectivePosterUrl);
      const downloadApi = `/api/download?url=${encodeURIComponent(rawPoster)}&sourceUrl=${encodeURIComponent(
        video.sourceUrl || ''
      )}&format=${ext}&filename=${encodeURIComponent(filename)}`;

      const link = document.createElement('a');
      link.href = downloadApi;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onShowToast(
        isKm
          ? 'បានទាញយករូបភាព Poster ដើម (Original Poster) រួចរាល់!'
          : 'Downloaded clean original poster successfully!'
      );
    } catch {
      onShowToast(isKm ? 'បរាជ័យក្នុងការទាញយក Poster ដើម' : 'Failed to download original poster');
    } finally {
      setTimeout(() => setIsDownloadingRawPoster(false), 800);
    }
  };

  // AI Generation Handler
  const handleGenerateWithAi = async () => {
    setIsGeneratingAi(true);
    setAiNotice(null);

    try {
      const res = await fetch('/api/ai/branded-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          posterUrl: effectivePosterUrl,
          title: video.title,
          author: video.author?.name || video.author?.username,
          platform: (video.sourceUrl && video.sourceUrl.includes('douyin')) ? 'douyin' : 'tiktok',
          brandName: watermarkText || 'Remix Social',
          aspectRatio,
          style: stylePreset,
          language: isKm ? 'km' : 'en'
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      if (data.design) {
        const d: AiThumbnailDesign = data.design;
        if (d.catchyHeadline) setHeadline(d.catchyHeadline);
        if (d.subtitle) setSubtitle(d.subtitle);
        if (d.watermark?.text) setWatermarkText(d.watermark.text);
        if (d.watermark?.subtext) setWatermarkSubtext(d.watermark.subtext);
        if (d.watermark?.recommendedPosition) setWatermarkPos(d.watermark.recommendedPosition);
        if (d.watermark?.badgeStyle) setWatermarkStyle(d.watermark.badgeStyle);
        if (d.colorPalette?.primaryAccent) setAccentColor(d.colorPalette.primaryAccent);
        if (d.visualElements?.qualityBadgeText) setQualityBadge(d.visualElements.qualityBadgeText);
        if (d.visualElements?.showPlayBadge !== undefined) setShowPlayIcon(d.visualElements.showPlayBadge);
        if (d.visualElements?.showVerifiedBadge !== undefined) setShowVerifiedBadge(d.visualElements.showVerifiedBadge);
        if (d.visualElements?.showPlatformLogo !== undefined) setShowPlatformBadge(d.visualElements.showPlatformLogo);

        if (d.creativeTip) {
          setAiNotice(d.creativeTip);
        }

        onShowToast(
          isKm
            ? '✨ AI បានបង្កើត និងរៀបចំម៉ូត Thumbnail & Watermark ដោយជោគជ័យ!'
            : '✨ AI has generated custom branded thumbnail design & watermark!'
        );
      }
    } catch (err: any) {
      console.error('AI thumbnail generation error:', err);
      onShowToast(isKm ? 'បរាជ័យក្នុងការទាញយកការរចនាពី AI' : 'Failed to generate AI thumbnail design');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Render composite canvas
  const renderThumbnail = useCallback(async () => {
    setIsRendering(true);

    try {
      // Dimensions based on aspect ratio (standard high-res)
      let width = 1920;
      let height = 1080;
      if (aspectRatio === '1:1') {
        width = 1080;
        height = 1080;
      } else if (aspectRatio === '9:16') {
        width = 1080;
        height = 1920;
      } else if (aspectRatio === '4:3') {
        width = 1440;
        height = 1080;
      }

      // Create or get canvas
      let canvas = canvasRef.current;
      if (!canvas) {
        canvas = document.createElement('canvas');
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Candidate list for poster image (order of priority)
      const candidates: string[] = [
        effectivePosterUrl,
        autoLinkedPoster?.posterUrl,
        video.originCover,
        video.dynamicCover,
        video.cover
      ].filter(Boolean) as string[];

      // Gracefully load poster image without throwing unhandled exceptions
      const img = await loadPosterImage(candidates);

      // 1. Draw Background:
      if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, width, height);

        // Draw blurred ambient background to fill borders nicely
        try {
          ctx.save();
          ctx.filter = 'blur(40px) brightness(0.4)';
          ctx.drawImage(img, -width * 0.1, -height * 0.1, width * 1.2, height * 1.2);
          ctx.restore();
        } catch {
          // If browser doesn't support filter or security restrictions
        }

        // Draw Main Poster centered with cover/contain logic
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const targetAspect = width / height;

        let drawW = width;
        let drawH = height;
        let drawX = 0;
        let drawY = 0;

        if (imgAspect > targetAspect) {
          drawW = height * imgAspect;
          drawX = (width - drawW) / 2;
        } else {
          drawH = width / imgAspect;
          drawY = (height - drawH) / 2;
        }

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
      } else {
        // Fallback Stylized Poster Art when external image CDN is unreachable
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, '#0f172a');
        bgGrad.addColorStop(0.4, '#1e1b4b');
        bgGrad.addColorStop(1, '#020617');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        const glowGrad = ctx.createRadialGradient(width * 0.5, height * 0.42, 20, width * 0.5, height * 0.42, width * 0.45);
        glowGrad.addColorStop(0, `${accentColor}44`);
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.strokeStyle = `${accentColor}33`;
        ctx.lineWidth = 3;
        ctx.strokeRect(width * 0.05, height * 0.05, width * 0.9, height * 0.9);
        ctx.restore();
      }

      // 2. Cinematic Lighting & Gradients:
      // Top gradient for badges
      const topGrad = ctx.createLinearGradient(0, 0, 0, height * 0.28);
      topGrad.addColorStop(0, 'rgba(3, 7, 18, 0.85)');
      topGrad.addColorStop(1, 'rgba(3, 7, 18, 0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, width, height * 0.28);

      // Bottom gradient for headline and watermark
      const bottomGrad = ctx.createLinearGradient(0, height * 0.45, 0, height);
      bottomGrad.addColorStop(0, 'rgba(3, 7, 18, 0)');
      bottomGrad.addColorStop(0.5, 'rgba(3, 7, 18, 0.65)');
      bottomGrad.addColorStop(1, 'rgba(3, 7, 18, 0.95)');
      ctx.fillStyle = bottomGrad;
      ctx.fillRect(0, height * 0.45, width, height * 0.55);

      // Subtle border accent frame
      ctx.save();
      ctx.strokeStyle = `${accentColor}55`;
      ctx.lineWidth = Math.max(4, Math.round(width * 0.005));
      ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, width - ctx.lineWidth, height - ctx.lineWidth);
      ctx.restore();

      // 3. Top Badges: Platform + Quality + Verified
      const topPadding = Math.round(height * 0.04);
      const sidePadding = Math.round(width * 0.04);

      // Platform & Verified Badge (Top Left)
      let currentTopLeftX = sidePadding;
      if (showPlatformBadge) {
        const isDouyin = video.sourceUrl && video.sourceUrl.includes('douyin');
        const badgeLabel = isDouyin ? 'DOUYIN' : 'TIKTOK';
        const badgeBg = isDouyin ? '#0284c7' : '#000000';

        ctx.save();
        ctx.font = `bold ${Math.round(height * 0.024)}px sans-serif`;
        const textMetrics = ctx.measureText(badgeLabel);
        const pWidth = textMetrics.width + 36;
        const pHeight = Math.round(height * 0.046);

        ctx.fillStyle = badgeBg;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(currentTopLeftX, topPadding, pWidth, pHeight, 8);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(badgeLabel, currentTopLeftX + 18, topPadding + pHeight * 0.68);
        ctx.restore();

        currentTopLeftX += pWidth + 12;
      }

      // Quality Badge (e.g. 4K ULTRA HD)
      if (qualityBadge) {
        ctx.save();
        ctx.font = `bold ${Math.round(height * 0.022)}px sans-serif`;
        const qMetrics = ctx.measureText(qualityBadge);
        const qWidth = qMetrics.width + 24;
        const qHeight = Math.round(height * 0.046);

        // Gold/Amber gradient badge for 4K
        const qGrad = ctx.createLinearGradient(currentTopLeftX, topPadding, currentTopLeftX + qWidth, topPadding + qHeight);
        qGrad.addColorStop(0, '#f59e0b');
        qGrad.addColorStop(1, '#d97706');
        ctx.fillStyle = qGrad;

        ctx.beginPath();
        ctx.roundRect(currentTopLeftX, topPadding, qWidth, qHeight, 8);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.fillText(qualityBadge, currentTopLeftX + 12, topPadding + qHeight * 0.68);
        ctx.restore();
      }

      // Center Play Button Simulation (Draws attention to video on social link share preview)
      if (showPlayIcon) {
        const centerX = width / 2;
        const centerY = height * 0.44;
        const radius = Math.round(Math.min(width, height) * 0.08);

        ctx.save();
        // Glowing halo
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 28;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `${accentColor}dd`;
        ctx.lineWidth = Math.max(3, radius * 0.06);
        ctx.stroke();

        // Triangle
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        const triSize = radius * 0.55;
        ctx.moveTo(centerX - triSize * 0.4, centerY - triSize);
        ctx.lineTo(centerX + triSize * 0.8, centerY);
        ctx.lineTo(centerX - triSize * 0.4, centerY + triSize);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // 4. Headline & Subtitle Text (Bottom Left Area)
      if (showHeadline && headline) {
        ctx.save();
        const maxTextWidth = width * 0.64;
        const fontSize = Math.round(height * 0.048);
        ctx.font = `bold ${fontSize}px "Kantumruy Pro", "Plus Jakarta Sans", sans-serif`;

        // Wrap text
        const words = headline.split(' ');
        let line = '';
        const lines: string[] = [];

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxTextWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line);

        // Keep maximum 2 lines
        const displayLines = lines.slice(0, 2);
        const startY = height - (sidePadding + displayLines.length * (fontSize * 1.25) + 30);

        displayLines.forEach((l, idx) => {
          // Strong text shadow for high readability
          ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
          ctx.shadowBlur = 12;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(l.trim(), sidePadding, startY + idx * (fontSize * 1.25));
        });

        // Subtitle / Creator Attribution
        if (subtitle) {
          ctx.font = `600 ${Math.round(fontSize * 0.55)}px "Kantumruy Pro", "Plus Jakarta Sans", sans-serif`;
          ctx.fillStyle = `${accentColor}ee`;
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 8;
          ctx.fillText(subtitle, sidePadding, startY + displayLines.length * (fontSize * 1.25));
        }
        ctx.restore();
      }

      // 5. Visual Watermark Rendering
      if (watermarkText) {
        ctx.save();
        ctx.globalAlpha = Math.max(0.1, watermarkOpacity / 100);

        const baseWatermarkScale = (watermarkScale / 100);
        const wmFontSize = Math.round(height * 0.032 * baseWatermarkScale);
        const wmSubFontSize = Math.round(height * 0.02 * baseWatermarkScale);

        ctx.font = `bold ${wmFontSize}px "Plus Jakarta Sans", sans-serif`;
        const textW = ctx.measureText(watermarkText).width;
        ctx.font = `normal ${wmSubFontSize}px "Plus Jakarta Sans", sans-serif`;
        const subW = ctx.measureText(watermarkSubtext || '').width;

        const contentW = Math.max(textW, subW);
        const pillWidth = contentW + Math.round(60 * baseWatermarkScale);
        const pillHeight = Math.round((watermarkSubtext ? 70 : 48) * baseWatermarkScale);

        // Calculate Position
        let wmX = width - sidePadding - pillWidth;
        let wmY = height - sidePadding - pillHeight;

        if (watermarkPos === 'bottom-left') {
          wmX = sidePadding;
          wmY = height - sidePadding - pillHeight;
        } else if (watermarkPos === 'top-right') {
          wmX = width - sidePadding - pillWidth;
          wmY = topPadding;
        } else if (watermarkPos === 'top-left') {
          wmX = sidePadding;
          wmY = topPadding;
        } else if (watermarkPos === 'bottom-center') {
          wmX = (width - pillWidth) / 2;
          wmY = height - sidePadding - pillHeight;
        } else if (watermarkPos === 'center') {
          wmX = (width - pillWidth) / 2;
          wmY = (height - pillHeight) / 2;
        }

        // Draw Watermark according to chosen style
        if (watermarkStyle === 'diagonal-pattern') {
          // Repeated semi-transparent watermark pattern across canvas for copyright
          ctx.restore();
          ctx.save();
          ctx.globalAlpha = (watermarkOpacity / 100) * 0.25;
          ctx.font = `bold ${Math.round(height * 0.038)}px sans-serif`;
          ctx.fillStyle = '#FFFFFF';
          ctx.rotate(-25 * Math.PI / 180);

          const stepX = 400;
          const stepY = 220;
          for (let py = -height * 1.5; py < height * 2; py += stepY) {
            for (let px = -width * 1.5; px < width * 2; px += stepX) {
              ctx.fillText(`⚡ ${watermarkText}`, px, py);
            }
          }
          ctx.restore();
        } else if (watermarkStyle === 'cyber-glow') {
          // Cyber Neon Glow style
          ctx.shadowColor = accentColor;
          ctx.shadowBlur = 18;
          ctx.fillStyle = 'rgba(10, 15, 29, 0.88)';
          ctx.beginPath();
          ctx.roundRect(wmX, wmY, pillWidth, pillHeight, 12);
          ctx.fill();

          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Brand text
          ctx.fillStyle = '#FFFFFF';
          ctx.font = `bold ${wmFontSize}px "Plus Jakarta Sans", sans-serif`;
          ctx.fillText(`✦ ${watermarkText}`, wmX + 18, wmY + wmFontSize + (watermarkSubtext ? 8 : 12));

          if (watermarkSubtext) {
            ctx.fillStyle = accentColor;
            ctx.font = `bold ${wmSubFontSize}px "Plus Jakarta Sans", sans-serif`;
            ctx.fillText(watermarkSubtext, wmX + 18, wmY + wmFontSize + wmSubFontSize + 16);
          }
          ctx.restore();
        } else if (watermarkStyle === 'gold-emboss') {
          // Luxury Gold Emboss
          const goldGrad = ctx.createLinearGradient(wmX, wmY, wmX + pillWidth, wmY + pillHeight);
          goldGrad.addColorStop(0, 'rgba(234, 179, 8, 0.95)');
          goldGrad.addColorStop(1, 'rgba(161, 98, 7, 0.95)');

          ctx.fillStyle = goldGrad;
          ctx.shadowColor = 'rgba(0,0,0,0.6)';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.roundRect(wmX, wmY, pillWidth, pillHeight, 10);
          ctx.fill();

          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#0f172a';
          ctx.font = `bold ${wmFontSize}px "Plus Jakarta Sans", sans-serif`;
          ctx.fillText(`★ ${watermarkText}`, wmX + 18, wmY + wmFontSize + (watermarkSubtext ? 8 : 12));

          if (watermarkSubtext) {
            ctx.fillStyle = '#422006';
            ctx.font = `bold ${wmSubFontSize}px "Plus Jakarta Sans", sans-serif`;
            ctx.fillText(watermarkSubtext, wmX + 18, wmY + wmFontSize + wmSubFontSize + 16);
          }
          ctx.restore();
        } else {
          // Default: Glassmorphism Pill
          ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.roundRect(wmX, wmY, pillWidth, pillHeight, Math.round(pillHeight / 2));
          ctx.fill();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Brand icon dot
          ctx.fillStyle = accentColor;
          ctx.beginPath();
          ctx.arc(wmX + 22, wmY + (pillHeight / 2), Math.round(6 * baseWatermarkScale), 0, Math.PI * 2);
          ctx.fill();

          // Brand text
          ctx.fillStyle = '#FFFFFF';
          ctx.font = `bold ${wmFontSize}px "Plus Jakarta Sans", sans-serif`;
          const textOffsetX = wmX + Math.round(36 * baseWatermarkScale);
          ctx.fillText(watermarkText, textOffsetX, wmY + wmFontSize + (watermarkSubtext ? 8 : 12));

          if (watermarkSubtext) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = `500 ${wmSubFontSize}px "Plus Jakarta Sans", sans-serif`;
            ctx.fillText(watermarkSubtext, textOffsetX, wmY + wmFontSize + wmSubFontSize + 16);
          }
          ctx.restore();
        }
      }

      // Convert to DataURL for live preview
      try {
        const dataUrl = canvas.toDataURL('image/png', 0.95);
        setPreviewDataUrl(dataUrl);
      } catch (exportErr) {
        console.warn('Direct toDataURL caught export error, creating safe vector fallback:', exportErr);
        // Fallback: draw safe gradient without tainted image elements
        const safeCanvas = document.createElement('canvas');
        safeCanvas.width = width;
        safeCanvas.height = height;
        const safeCtx = safeCanvas.getContext('2d');
        if (safeCtx) {
          const bgGrad = safeCtx.createLinearGradient(0, 0, width, height);
          bgGrad.addColorStop(0, '#0f172a');
          bgGrad.addColorStop(0.5, '#1e1b4b');
          bgGrad.addColorStop(1, '#020617');
          safeCtx.fillStyle = bgGrad;
          safeCtx.fillRect(0, 0, width, height);
          try {
            setPreviewDataUrl(safeCanvas.toDataURL('image/png', 0.95));
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Canvas render caught warning:', err);
    } finally {
      setIsRendering(false);
    }
  }, [
    effectivePosterUrl,
    aspectRatio,
    headline,
    subtitle,
    showHeadline,
    watermarkText,
    watermarkSubtext,
    watermarkPos,
    watermarkStyle,
    watermarkOpacity,
    watermarkScale,
    showPlayIcon,
    showVerifiedBadge,
    showPlatformBadge,
    qualityBadge,
    accentColor,
    video
  ]);

  // Re-render when dependencies change
  useEffect(() => {
    if (isOpen) {
      renderThumbnail();
    }
  }, [isOpen, renderThumbnail]);

  // Download Thumbnail Action
  const handleDownloadThumbnail = () => {
    if (!previewDataUrl) return;
    const cleanTitle = (video.title || 'video').replace(/[/\\?%*:|"<>]/g, '-').slice(0, 40);
    const filename = `[Branded-Thumbnail]-${cleanTitle}-${aspectRatio.replace(':', 'x')}.png`;

    const a = document.createElement('a');
    a.href = previewDataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    onShowToast(
      isKm
        ? `បានទាញយករូបភាព Branded Thumbnail [${aspectRatio}] ជោគជ័យ!`
        : `Downloaded custom branded thumbnail [${aspectRatio}] successfully!`
    );
  };

  // Copy Image directly to Clipboard (Ctrl+V into Telegram/Facebook/WhatsApp)
  const handleCopyImage = async () => {
    if (!canvasRef.current && !previewDataUrl) return;

    try {
      if (canvasRef.current && navigator.clipboard && (window as any).ClipboardItem) {
        canvasRef.current.toBlob(async (blob) => {
          if (blob) {
            try {
              await navigator.clipboard.write([
                new (window as any).ClipboardItem({ 'image/png': blob })
              ]);
              setCopiedImage(true);
              onShowToast(
                isKm
                  ? 'បានចម្លងរូបភាព Thumbnail ចូល Clipboard រួចរាល់! អ្នកអាចចុច Ctrl+V ដើម្បីបិទភ្ជាប់ក្នុង Telegram ឬ Facebook'
                  : 'Copied branded thumbnail to clipboard! Ready to paste into Telegram or Facebook.'
              );
              setTimeout(() => setCopiedImage(false), 3000);
            } catch (clipErr) {
              console.warn('ClipboardItem write error:', clipErr);
              handleDownloadThumbnail();
            }
          }
        }, 'image/png');
      } else {
        handleDownloadThumbnail();
      }
    } catch (err) {
      console.error('Copy image error:', err);
      handleDownloadThumbnail();
    }
  };

  // Copy Shared Link with formatted text
  const handleCopyShareLink = async () => {
    const linkText = `${headline}\n${video.sourceUrl || video.videoUrl}\n⚡ ${watermarkText} • ${qualityBadge}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(linkText);
      }
      setCopiedShareLink(true);
      onShowToast(
        isKm
          ? 'បានចម្លងតំណភ្ជាប់ចែករំលែក (Shared Link + Title + Watermark) រួចរាល់!'
          : 'Copied shared link with thumbnail title and watermark info!'
      );
      setTimeout(() => setCopiedShareLink(false), 2500);
    } catch {
      onShowToast(isKm ? 'បរាជ័យក្នុងការចម្លង' : 'Failed to copy link');
    }
  };

  return (
    <div
      id="branded-custom-thumbnail-feature"
      className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-4 sm:p-6 shadow-xl shadow-indigo-950/20 backdrop-blur-xl mt-4"
    >
      {/* Header & Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-white">
                {isKm ? 'បង្កើតរូប Thumbnail & Watermark ដោយ AI (Shared Links)' : 'AI Branded Thumbnail & Visual Watermark'}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wide">
                AI Powered
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isKm
                ? 'បង្កើតរូបភាព Thumbnail ប្លែកភ្នែក សម្រាប់ចែករំលែកតំណភ្ជាប់ (Facebook, Telegram, WhatsApp) ជាមួយសញ្ញាទឹក និងម៉ូតស្អាតៗ'
                : 'Generate branded high-CTR custom thumbnails with visual watermark for shared social links'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            id="toggle-branded-thumbnail-studio-btn"
            onClick={() => setIsOpen(!isOpen)}
            className={`text-xs font-semibold px-3.5 py-2 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
              isOpen
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
            }`}
          >
            <Sliders className="w-4 h-4 text-indigo-300" />
            <span>{isOpen ? (isKm ? 'បង្រួមផ្ទាំង' : 'Close Studio') : (isKm ? 'បើកផ្ទាំងរចនា Thumbnail' : 'Open Thumbnail Studio')}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Hidden Canvas for High-DPI Rendering */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Collapsible Studio Workspace */}
      {isOpen && (
        <div className="pt-5 flex flex-col gap-5 animate-in fade-in duration-300">
          {/* Auto-Linked Original Poster Source & Quick Action Header */}
          <div className="bg-gradient-to-r from-amber-950/40 via-indigo-950/40 to-slate-950 border border-amber-500/40 rounded-2xl p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-amber-500/40 shrink-0 shadow">
                {effectivePosterUrl ? (
                  <img
                    src={
                      effectivePosterUrl.startsWith('data:') || effectivePosterUrl.startsWith('blob:')
                        ? effectivePosterUrl
                        : `/api/proxy-media?url=${encodeURIComponent(cleanMediaUrl(effectivePosterUrl))}`
                    }
                    alt="Original Poster"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-amber-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                )}
                <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <span>{isKm ? 'រូបភាព Poster ដើម ភ្ជាប់ដោយស្វ័យប្រវត្តិ' : 'Original Poster Auto-Linked to AI Studio'}</span>
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{isKm ? 'បានភ្ជាប់ (Active)' : 'Connected'}</span>
                  </span>
                  <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                    {activePosterSource === 'dynamic' ? 'WebP Dynamic' : 'HD Original JPG'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {isKm
                    ? 'រូបភាព Poster គុណភាពដើមពីម៉ាស៊ីនបម្រើ ត្រូវភ្ជាប់ជាផ្ទាំងខាងក្រោយសម្រាប់រចនា Thumbnail & Watermark សម្រាប់ Shared Links'
                    : 'High-res original poster is automatically bound as canvas background for branded shared links'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
              {/* Poster Source Selectors */}
              <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  id="studio-select-origin-poster-btn"
                  onClick={() => setActivePosterSource('origin')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                    activePosterSource === 'origin'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={isKm ? 'ប្រើប្រាស់ Poster ដើម HD' : 'Use Original HD Poster'}
                >
                  {isKm ? 'Poster ដើម' : 'HD Poster'}
                </button>
                {video.dynamicCover && (
                  <button
                    type="button"
                    id="studio-select-dynamic-poster-btn"
                    onClick={() => setActivePosterSource('dynamic')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                      activePosterSource === 'dynamic'
                        ? 'bg-indigo-600 text-white font-bold shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title={isKm ? 'ប្រើប្រាស់ Poster មានចលនា' : 'Use Dynamic Poster'}
                  >
                    {isKm ? 'មានចលនា' : 'Dynamic'}
                  </button>
                )}
                {video.cover && video.originCover && video.cover !== video.originCover && (
                  <button
                    type="button"
                    id="studio-select-cover-poster-btn"
                    onClick={() => setActivePosterSource('cover')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                      activePosterSource === 'cover'
                        ? 'bg-slate-700 text-white font-bold shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title={isKm ? 'ប្រើប្រាស់ Cover ធម្មតា' : 'Use Standard Cover'}
                  >
                    {isKm ? 'Cover វីដេអូ' : 'Cover'}
                  </button>
                )}
              </div>

              {/* Direct Download Raw Original Poster Button */}
              <button
                type="button"
                id="studio-download-raw-poster-btn"
                onClick={handleDownloadRawPoster}
                disabled={isDownloadingRawPoster}
                className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                title={isKm ? 'ទាញយករូបភាព Poster ដើមផ្ទាល់ គ្មាន Watermark' : 'Download clean original poster file'}
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {isDownloadingRawPoster
                    ? isKm ? 'កំពុងទាញយក...' : 'Downloading...'
                    : isKm ? 'ទាញយក Poster ដើម' : 'Download Original Poster'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Column: Live Interactive Canvas Preview */}
            <div className="flex-1 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  {isKm ? 'ទិដ្ឋភាពជាក់ស្តែង (Live Preview)' : 'Live Preview'}
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
                  {aspectRatio}
                </span>
              </div>

              {/* Quick Aspect Ratio Switcher */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['16:9', '1:1', '9:16', '4:3'] as ThumbnailAspectRatio[]).map(ratio => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      aspectRatio === ratio
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Thumbnail Canvas Frame */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex items-center justify-center min-h-[300px] max-h-[460px] group">
              {previewDataUrl ? (
                <img
                  src={previewDataUrl}
                  alt="Branded Thumbnail Preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain max-h-[460px] transition-transform duration-300"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-slate-500 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                  <span className="text-xs">{isKm ? 'កំពុងគូររូបភាព...' : 'Rendering thumbnail...'}</span>
                </div>
              )}

              {/* Action Floating Overlay */}
              <div className="absolute top-3 right-3 flex items-center gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-900 text-white border border-slate-700 shadow-lg backdrop-blur-md cursor-pointer transition-colors"
                  title={isKm ? 'មើលទំហំធំ (Fullscreen)' : 'View Fullscreen'}
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>

              {/* Rendering indicator */}
              {isRendering && (
                <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700 text-[10px] text-slate-300 flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                  <span>{isKm ? 'កំពុងកែប្រែផ្ទាល់...' : 'Updating preview...'}</span>
                </div>
              )}
            </div>

            {/* AI Recommendation tip banner if provided */}
            {aiNotice && (
              <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-indigo-200">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white font-semibold">AI Design Insight: </strong>
                  {aiNotice}
                </div>
              </div>
            )}

            {/* Bottom Action Bar: Download, Copy Image, Share Link */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {/* Download Thumbnail */}
              <button
                type="button"
                id="download-branded-thumbnail-btn"
                onClick={handleDownloadThumbnail}
                disabled={!previewDataUrl}
                className="flex-1 min-w-[150px] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isKm ? 'ទាញយករូបភាព Thumbnail' : 'Download Thumbnail'}</span>
              </button>

              {/* Copy Image to Clipboard */}
              <button
                type="button"
                id="copy-branded-thumbnail-image-btn"
                onClick={handleCopyImage}
                disabled={!previewDataUrl}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-100 font-semibold text-xs sm:text-sm border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                title={isKm ? 'ចម្លងរូបភាពផ្ទាល់ (អាចបិទភ្ជាប់ Ctrl+V ក្នុង Telegram/Facebook)' : 'Copy image directly to clipboard'}
              >
                {copiedImage ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">{isKm ? 'បានចម្លងរូបភាព!' : 'Image Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-indigo-400" />
                    <span>{isKm ? 'ចម្លងរូបភាព (Copy)' : 'Copy Image'}</span>
                  </>
                )}
              </button>

              {/* Copy Share Link */}
              <button
                type="button"
                id="copy-share-link-with-card-btn"
                onClick={handleCopyShareLink}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold text-xs border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                title={isKm ? 'ចម្លង Link ចែករំលែក ជាមួយចំណងជើង' : 'Copy shared link with thumbnail text'}
              >
                {copiedShareLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">{isKm ? 'បានចម្លង Link!' : 'Link Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-pink-400" />
                    <span>{isKm ? 'ចែករំលែក Link' : 'Share Link'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: AI Tool & Visual Watermark Customizer */}
          <div className="w-full lg:w-80 flex flex-col gap-4 bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
            {/* AI Generator Button Banner */}
            <div className="bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border border-indigo-500/40 rounded-xl p-3.5 flex flex-col gap-2.5 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  {isKm ? 'ម៉ាស៊ីន AI រចនាដោយស្វ័យប្រវត្តិ' : 'AI Design Assistant'}
                </span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-1.5 py-0.5 rounded border border-indigo-500/30">
                  Gemini
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                {isKm
                  ? 'AI នឹងវិភាគរូបភាព Poster ដើម ស្វែងរកទីតាំងសញ្ញាទឹកល្អបំផុត និងបង្កើតចំណងជើងទាក់ទាញ'
                  : 'AI analyzes the video poster, picks optimal watermark placement, and drafts high-CTR titles.'}
              </p>

              <button
                type="button"
                id="ai-generate-branded-thumbnail-btn"
                onClick={handleGenerateWithAi}
                disabled={isGeneratingAi}
                className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                <span>{isGeneratingAi ? (isKm ? 'AI កំពុងបង្កើត...' : 'AI Generating...') : (isKm ? '✨ បង្កើតដោយ AI (AI Generate)' : '✨ Generate with AI')}</span>
              </button>
            </div>

            {/* Style Preset Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                {isKm ? 'ម៉ូតស្ទីលរចនា (Style Preset)' : 'Design Style Preset'}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'modern', label: 'Modern' },
                  { id: 'cinematic', label: 'Cinematic' },
                  { id: 'cyber', label: 'Cyber' },
                  { id: 'gold', label: 'Luxury' },
                  { id: 'minimalist', label: 'Clean' },
                ].map(st => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      setStylePreset(st.id as any);
                      if (st.id === 'cinematic') setAccentColor('#f59e0b');
                      else if (st.id === 'cyber') setAccentColor('#06b6d4');
                      else if (st.id === 'gold') setAccentColor('#eab308');
                      else if (st.id === 'minimalist') setAccentColor('#ffffff');
                      else setAccentColor('#6366f1');
                    }}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      stylePreset === st.id
                        ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Watermark Controls */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                {isKm ? 'សញ្ញាទឹក (Visual Watermark)' : 'Visual Watermark'}
              </span>

              {/* Watermark Primary Text */}
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">
                  {isKm ? 'អក្សរសញ្ញាទឹក (Brand Name)' : 'Watermark Brand Text'}
                </label>
                <input
                  type="text"
                  id="watermark-text-input"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="e.g. Remix Social"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Watermark Subtext */}
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">
                  {isKm ? 'អក្សរបន្ថែម (Subtext)' : 'Watermark Subtitle'}
                </label>
                <input
                  type="text"
                  id="watermark-subtext-input"
                  value={watermarkSubtext}
                  onChange={(e) => setWatermarkSubtext(e.target.value)}
                  placeholder="e.g. TikTok HD • No Watermark"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Watermark Position Selector */}
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">
                  {isKm ? 'ទីតាំងសញ្ញាទឹក (Placement)' : 'Watermark Placement'}
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'top-left', label: 'Top L' },
                    { id: 'top-right', label: 'Top R' },
                    { id: 'bottom-left', label: 'Bot L' },
                    { id: 'bottom-center', label: 'Bot Ctr' },
                    { id: 'bottom-right', label: 'Bot R' },
                    { id: 'center', label: 'Center' },
                  ].map(pos => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => setWatermarkPos(pos.id as WatermarkPosition)}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-all cursor-pointer ${
                        watermarkPos === pos.id
                          ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Watermark Badge Style */}
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">
                  {isKm ? 'ម៉ូតសញ្ញាទឹក (Badge Style)' : 'Badge Style'}
                </label>
                <select
                  value={watermarkStyle}
                  onChange={(e) => setWatermarkStyle(e.target.value as WatermarkBadgeStyle)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="glassmorphism">{isKm ? 'Glassmorphism (កញ្ចក់ថ្លា)' : 'Glassmorphism Pill'}</option>
                  <option value="cyber-glow">{isKm ? 'Cyber Glow (ពន្លឺណេអុង)' : 'Cyber Neon Glow'}</option>
                  <option value="gold-emboss">{isKm ? 'Gold Luxury (ពណ៌មាសប្រណិត)' : 'Gold Luxury Stamp'}</option>
                  <option value="diagonal-pattern">{isKm ? 'Diagonal Pattern (ការពារការចម្លង)' : 'Diagonal Protection Grid'}</option>
                </select>
              </div>

              {/* Watermark Opacity & Scale Sliders */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>{isKm ? 'កម្រិតព្រាល' : 'Opacity'}</span>
                    <span>{watermarkOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>{isKm ? 'ទំហំ' : 'Scale'}</span>
                    <span>{watermarkScale}%</span>
                  </div>
                  <input
                    type="range"
                    min="70"
                    max="140"
                    value={watermarkScale}
                    onChange={(e) => setWatermarkScale(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Overlay Headline & Badges */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-purple-400" />
                  {isKm ? 'ចំណងជើង & ស្លាកសញ្ញា' : 'Headline & Badges'}
                </span>
                <label className="flex items-center gap-1 text-[11px] text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showHeadline}
                    onChange={(e) => setShowHeadline(e.target.checked)}
                    className="rounded accent-indigo-500"
                  />
                  <span>{isKm ? 'បង្ហាញ' : 'Enable'}</span>
                </label>
              </div>

              {showHeadline && (
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">
                    {isKm ? 'ចំណងជើងសង្ខេប (Catchy Headline)' : 'Share Card Headline'}
                  </label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Headline overlay"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {/* Toggles for Badges */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPlayIcon(!showPlayIcon)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1 transition-all cursor-pointer ${
                    showPlayIcon
                      ? 'bg-indigo-900/40 border-indigo-500/60 text-indigo-300'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  <Play className="w-3 h-3" />
                  <span>Play Icon</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPlatformBadge(!showPlatformBadge)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1 transition-all cursor-pointer ${
                    showPlatformBadge
                      ? 'bg-indigo-900/40 border-indigo-500/60 text-indigo-300'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  <span>Platform Tag</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Lightbox Modal */}
      {isLightboxOpen && previewDataUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between text-white pb-2">
              <span className="font-bold text-sm">
                {isKm ? 'រូបភាព Branded Thumbnail ពេញអេក្រង់' : 'Branded Thumbnail Lightbox'} ({aspectRatio})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadThumbnail}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isKm ? 'ទាញយក' : 'Download'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <img
              src={previewDataUrl}
              alt="Fullscreen Thumbnail"
              referrerPolicy="no-referrer"
              className="max-h-[80vh] max-w-full rounded-xl object-contain border border-slate-800 shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
