export interface Author {
  username: string;
  name: string;
  avatar: string;
}

export interface VideoQualityOption {
  id: '4k' | '1080p' | '720p' | '480p';
  label: string; // e.g. '4K UHD' | '1080p FHD' | '720p HD' | '480p SD'
  resolutionText: string; // e.g. '2160p' | '1080p' | '720p' | '480p'
  resolution?: string; // e.g. '3840x2160'
  url: string;
  badge: string; // 'Ultra HD' | 'Full HD' | 'HD' | 'Fast'
  fileSize?: number;
  fileSizeFormatted?: string;
  estimatedSize?: string;
  isBest?: boolean;
}

export interface VideoInfo {
  id: string;
  title: string;
  author: Author;
  cover: string;
  originCover?: string;
  dynamicCover?: string;
  images?: string[];
  videoUrl: string;
  fileSize: number;
  fileSizeFormatted: string;
  sourceUrl: string;
  duration?: number;
  quality?: string;
  qualities?: VideoQualityOption[];
  platform?: 'tiktok' | 'douyin' | 'bilibili' | 'kuaishou' | 'youtube';
  youtubeId?: string;
  embedUrl?: string;
}

export interface HistoryItem {
  id: string;
  title: string;
  author: string;
  avatar: string;
  cover: string;
  videoUrl: string;
  timestamp: number;
  fileSizeFormatted: string;
}

import { ThemePresetId } from './utils/themePresets';

export type AntiOverwriteMode = 'none' | 'date' | 'resolution' | 'both';
export type DateFormatOption = 'YYYY-MM-DD' | 'YYYYMMDD' | 'YYYY-MM-DD_HHmm';
export type ResolutionFormatOption = 'tag' | 'dimension' | 'short';

export interface AppSettings {
  promptLocation: boolean;
  namingPattern: 'title_author' | 'author_id' | 'title_only' | 'author_title' | 'custom';
  customPattern?: string;
  audioBitrate: '320k' | '192k' | '128k';
  language: 'km' | 'en';
  autoRetryFailed?: boolean;
  maxRetryAttempts?: number;
  defaultQuality?: '4k' | '1080p' | '720p' | '480p';
  turboMode?: boolean;
  theme?: ThemePresetId;
  // Anti-overwrite settings when saving to folders
  antiOverwriteMode?: AntiOverwriteMode;
  appendDateToFilename?: boolean;
  appendResolutionToFilename?: boolean;
  dateFormat?: DateFormatOption;
  resolutionFormat?: ResolutionFormatOption;
  // Auto-Cleanup history settings
  autoCleanupHistory?: boolean;
  autoCleanupDays?: number;
  // Download Notification settings & Completion Sound Effects
  downloadNotificationsEnabled?: boolean;
  downloadNotificationMinSizeMB?: number; // default 50
  downloadNotificationSound?: boolean;
  downloadSoundStyle?: 'chime' | 'success' | 'bell';
  notifyOnlyWhenTabHidden?: boolean;
}

export type QueueItemStatus = 'pending' | 'resolving' | 'ready' | 'downloading' | 'completed' | 'error' | 'retrying' | 'paused';

export interface QueueItem {
  id: string;
  rawUrl: string;
  status: QueueItemStatus;
  progress: number;
  error?: string;
  data?: VideoInfo;
  format: 'mp4' | 'mp3';
  downloadedAt?: number;
  retryCount?: number;
  retryCountdown?: number;
  isSkipped?: boolean;
}

export interface DouyinCreatorVideo {
  id: string;
  title: string;
  videoUrl: string;
  shareUrl: string;
  cover: string;
  duration: number;
  durationFormatted: string;
  publishDate?: string;
}

export interface DouyinCreatorScanResult {
  success: boolean;
  creator: {
    username: string;
    nickname: string;
    secUid: string;
    avatar: string;
    profileUrl: string;
    followersCount?: number;
    likesCount?: number;
    bio?: string;
  };
  videos: DouyinCreatorVideo[];
}

export interface ShortDramaEpisode {
  episodeNumber: number;
  videoId: string;
  videoUrl: string;
  title: string;
  cover: string;
  originCover?: string;
  dynamicCover?: string;
  duration?: number;
  isPaid?: boolean;
  author: {
    username: string;
    nickname: string;
    avatar: string;
  };
}

export interface CreatorDramaInfo {
  dramaID: string;
  dramaName: string;
  title?: string;
  description: string;
  numVideos: number;
  numWatched: string | number;
  isLimitedFree?: boolean;
  totalDuration?: string | number;
  coverUrl?: string;
  originCover?: string;
  themes?: { tagKey: string; tagVal: string }[];
  episodes?: ShortDramaEpisode[];
}

export interface CreatorDramaScanResult {
  success: boolean;
  creator: {
    id: string;
    username: string;
    nickname: string;
    avatar: string;
    signature: string;
    followerCount: number | string;
    heartCount: number | string;
    secUid: string;
  };
  totalDramas: number;
  dramaList: CreatorDramaInfo[];
}

export interface ShortDramaResult {
  success: boolean;
  seriesId: string;
  seriesName: string;
  seriesCover?: string;
  totalEpisodeCount: number | string;
  requestedEpisode: number;
  convertedUrl: string;
  currentEpisode: ShortDramaEpisode;
  episodes: ShortDramaEpisode[];
  isPaid?: boolean;
  creatorScan?: CreatorDramaScanResult;
}

export type ThumbnailAspectRatio = '16:9' | '1:1' | '9:16' | '4:3';
export type WatermarkPosition = 'bottom-right' | 'top-right' | 'bottom-left' | 'bottom-center' | 'top-left' | 'center';
export type WatermarkBadgeStyle = 'glassmorphism' | 'minimal-stamp' | 'cyber-glow' | 'gold-emboss' | 'solid-pill' | 'diagonal-pattern';

export interface AiThumbnailDesign {
  catchyHeadline: string;
  subtitle: string;
  watermark: {
    text: string;
    subtext: string;
    recommendedPosition: WatermarkPosition;
    badgeStyle: WatermarkBadgeStyle;
  };
  colorPalette: {
    primaryAccent: string;
    secondaryAccent: string;
    textColor: string;
    glowColor: string;
    vignetteIntensity: number;
  };
  visualElements: {
    showPlayBadge: boolean;
    showVerifiedBadge: boolean;
    showPlatformLogo: boolean;
    borderAccent: boolean;
    qualityBadgeText: string;
  };
  creativeTip?: string;
  source: 'ai_gemini' | 'heuristic_engine';
}

