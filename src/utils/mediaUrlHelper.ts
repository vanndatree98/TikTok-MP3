/**
 * Safely format and proxy media URLs (covers, posters, avatars) to prevent
 * CORS / hotlink protection 403 Forbidden errors from TikTok, Douyin, Bilibili, and Kuaishou CDNs.
 */
export function getSafeMediaUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Already proxied, data URI, or local asset
  if (
    trimmed.startsWith('/api/') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('/logos/') ||
    trimmed.startsWith('/assets/') ||
    trimmed.startsWith('/')
  ) {
    return trimmed;
  }

  // Remote URLs: proxy through /api/proxy-media so server bypasses hotlink protection with official Referer
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return `/api/proxy-media?url=${encodeURIComponent(trimmed)}`;
  }

  return trimmed;
}
