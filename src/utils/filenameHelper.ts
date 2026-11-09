import { VideoInfo, AppSettings, DateFormatOption, ResolutionFormatOption } from '../types';

export interface FilenameOptions {
  video?: Partial<VideoInfo> | null;
  pattern: AppSettings['namingPattern'];
  customPattern?: string;
  format: 'mp4' | 'mp3';
  quality?: '4k' | '1080p' | '720p' | '480p';
  customOverride?: string;
  sampleTitle?: string;
  sampleAuthor?: string;
  sampleId?: string;
  // Anti-overwrite options for saving to folders
  appendDate?: boolean;
  appendResolution?: boolean;
  dateFormat?: DateFormatOption;
  resolutionFormat?: ResolutionFormatOption;
  resolutionDimension?: string;
}

export const DEFAULT_SAMPLE_DATA = {
  title: 'Stardust Drama Episode 16 Full HD',
  author: 'stardustdrama_mx',
  id: '7683292586500492565'
};

export function cleanFilenameString(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns formatted date string according to chosen DateFormatOption.
 * Default format: 'YYYY-MM-DD' (e.g. 2026-09-20)
 */
export function getFormattedDate(format: DateFormatOption = 'YYYY-MM-DD', date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');

  switch (format) {
    case 'YYYYMMDD':
      return `${yyyy}${mm}${dd}`;
    case 'YYYY-MM-DD_HHmm':
      return `${yyyy}-${mm}-${dd}_${hh}${min}`;
    case 'YYYY-MM-DD':
    default:
      return `${yyyy}-${mm}-${dd}`;
  }
}

/**
 * Returns clean resolution string based on quality and format.
 */
export function getResolutionTag(
  quality?: '4k' | '1080p' | '720p' | '480p',
  resFormat: ResolutionFormatOption = 'tag',
  dimension?: string
): string {
  if (!quality) return '';

  if (resFormat === 'dimension') {
    if (dimension) return dimension;
    switch (quality) {
      case '4k': return '3840x2160';
      case '1080p': return '1920x1080';
      case '720p': return '1280x720';
      case '480p': return '854x480';
      default: return quality;
    }
  }

  if (resFormat === 'short') {
    switch (quality) {
      case '4k': return '4K';
      case '1080p': return '1080p';
      case '720p': return '720p';
      case '480p': return '480p';
      default: return quality;
    }
  }

  // Default 'tag' format
  switch (quality) {
    case '4k':
      return '4K_UHD';
    case '1080p':
      return '1080p_FHD';
    case '720p':
      return '720p_HD';
    case '480p':
      return '480p_SD';
    default:
      return quality;
  }
}

export function getQualityTag(quality?: '4k' | '1080p' | '720p' | '480p'): string {
  if (!quality) return '';
  const tag = getResolutionTag(quality, 'tag');
  return `_${tag}`;
}

/**
 * Generates the clean filename with real-time live preview and anti-overwrite protection.
 */
export function generateLiveFilename(options: FilenameOptions): string {
  const {
    video,
    pattern,
    customPattern = '{title} - {author}',
    format,
    quality,
    customOverride,
    sampleTitle,
    sampleAuthor,
    sampleId,
    appendDate = false,
    appendResolution = false,
    dateFormat = 'YYYY-MM-DD',
    resolutionFormat = 'tag',
    resolutionDimension
  } = options;

  const dateStr = getFormattedDate(dateFormat);
  const resTag = quality ? getResolutionTag(quality, resolutionFormat, resolutionDimension || video?.qualities?.find(q => q.id === quality)?.resolution) : '';

  // If user provided a direct custom override name (e.g. edited in download card)
  if (customOverride && customOverride.trim()) {
    let sanitized = cleanFilenameString(customOverride);
    const extSuffix = `.${format}`;
    if (sanitized.toLowerCase().endsWith(extSuffix)) {
      sanitized = sanitized.slice(0, -extSuffix.length);
    }

    // Auto-append anti-overwrite date if requested and not yet present
    if (appendDate && !sanitized.includes(dateStr)) {
      sanitized = `${sanitized}_${dateStr}`;
    }

    // Auto-append anti-overwrite resolution if requested and not yet present
    if (appendResolution && resTag && format === 'mp4' && !sanitized.toLowerCase().includes(resTag.toLowerCase())) {
      sanitized = `${sanitized}_${resTag}`;
    }

    return `${sanitized}.${format}`;
  }

  // Resolve title, author, id from video data or fallback to sample
  const rawTitle = video?.title || sampleTitle || DEFAULT_SAMPLE_DATA.title;
  const rawAuthor = video?.author?.username || video?.author?.name || sampleAuthor || DEFAULT_SAMPLE_DATA.author;
  const rawId = video?.id || sampleId || DEFAULT_SAMPLE_DATA.id;

  const cleanTitle = cleanFilenameString(rawTitle).slice(0, 65) || 'TikTok_Video';
  const cleanAuthor = cleanFilenameString(rawAuthor) || 'creator';
  const cleanId = cleanFilenameString(rawId) || 'id';

  let base = '';

  switch (pattern) {
    case 'title_author':
      base = `${cleanTitle} - ${cleanAuthor}`;
      break;
    case 'author_title':
      base = `${cleanAuthor} - ${cleanTitle}`;
      break;
    case 'author_id':
      base = `TikTok_${cleanAuthor}_${cleanId}`;
      break;
    case 'title_only':
      base = cleanTitle;
      break;
    case 'custom': {
      const template = customPattern || '{title} - {author}';
      
      base = template
        .replace(/\{title\}/gi, cleanTitle)
        .replace(/\{author\}/gi, cleanAuthor)
        .replace(/\{id\}/gi, cleanId)
        .replace(/\{date\}/gi, dateStr)
        .replace(/\{resolution\}/gi, resTag || (quality ? quality.toUpperCase() : ''))
        .replace(/\{quality\}/gi, resTag || (quality ? quality.toUpperCase() : ''))
        .replace(/\{ext\}/gi, format);
      base = cleanFilenameString(base);
      if (!base) {
        base = `${cleanTitle} - ${cleanAuthor}`;
      }
      break;
    }
    default:
      base = `${cleanTitle} - ${cleanAuthor}`;
      break;
  }

  // Anti-overwrite feature: Auto append Current Date
  if (appendDate && !base.includes(dateStr)) {
    base = `${base}_${dateStr}`;
  }

  // Anti-overwrite feature: Auto append Resolution String (for videos)
  if (format === 'mp4' && quality && (appendResolution || getQualityTag(quality))) {
    const targetTag = resTag || getResolutionTag(quality, 'tag');
    const lowerBase = base.toLowerCase();
    const lowerQuality = quality.toLowerCase();
    const lowerTag = targetTag.toLowerCase();

    // Check if resolution or quality is already inside base
    const alreadyHasRes = lowerBase.includes(lowerTag) || lowerBase.includes(lowerQuality);

    if (!alreadyHasRes) {
      base = `${base}_${targetTag}`;
    }
  }

  const ext = `.${format}`;
  return `${base}${ext}`;
}
