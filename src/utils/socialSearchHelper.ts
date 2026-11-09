export interface SocialNetworkPlatform {
  id: string;
  name: string;
  nativeName?: string;
  countryCode: 'global' | 'kh' | 'cn' | 'us' | 'th' | 'vn' | 'jp' | 'kr' | 'id' | 'mx' | 'dramabox';
  countryNameKm: string;
  countryNameEn: string;
  countryFlag: string;
  category: 'shortvideo' | 'drama' | 'social' | 'community';
  colorBadge: string;
  textColor: string;
  bgGradient: string;
  descriptionKm: string;
  descriptionEn: string;
  getSearchUrl: (query: string) => string;
  isDownloadSupportedInApp?: boolean;
}

export interface CountryOption {
  code: string;
  nameKm: string;
  nameEn: string;
  flag: string;
  popularPlatforms: string[];
}

export const SUPPORTED_COUNTRIES: CountryOption[] = [
  { code: 'all', nameKm: 'គ្រប់ប្រទេសទាំងអស់', nameEn: 'All Countries', flag: '🌐', popularPlatforms: ['tiktok', 'douyin', 'kuaishou', 'youtube'] },
  { code: 'global', nameKm: 'សកលលោក', nameEn: 'Global / Worldwide', flag: '🌍', popularPlatforms: ['tiktok', 'youtube', 'facebook', 'instagram'] },
  { code: 'cn', nameKm: 'ប្រទេសចិន', nameEn: 'China', flag: '🇨🇳', popularPlatforms: ['douyin', 'kuaishou', 'bilibili', 'xiaohongshu', 'weibo'] },
  { code: 'kh', nameKm: 'ប្រទេសកម្ពុជា', nameEn: 'Cambodia', flag: '🇰🇭', popularPlatforms: ['tiktok_kh', 'youtube_kh', 'facebook_kh', 'telegram_kh'] },
  { code: 'us', nameKm: 'សហរដ្ឋអាមេរិក', nameEn: 'United States', flag: '🇺🇸', popularPlatforms: ['tiktok_us', 'youtube_us', 'instagram_us', 'x_twitter'] },
  { code: 'th', nameKm: 'ប្រទេសថៃ', nameEn: 'Thailand', flag: '🇹🇭', popularPlatforms: ['tiktok_th', 'youtube_th', 'facebook_th'] },
  { code: 'vn', nameKm: 'ប្រទេសវៀតណាម', nameEn: 'Vietnam', flag: '🇻🇳', popularPlatforms: ['tiktok_vn', 'youtube_vn', 'facebook_vn'] },
  { code: 'jp', nameKm: 'ប្រទេសជប៉ុន', nameEn: 'Japan', flag: '🇯🇵', popularPlatforms: ['tiktok_jp', 'youtube_jp', 'x_jp', 'niconico'] },
  { code: 'kr', nameKm: 'កូរ៉េខាងត្បូង', nameEn: 'South Korea', flag: '🇰🇷', popularPlatforms: ['tiktok_kr', 'youtube_kr', 'naver_tv'] },
  { code: 'mx', nameKm: 'ម៉ិកស៊ិក / ឡាទីន', nameEn: 'LatAm / Mexico', flag: '🇲🇽', popularPlatforms: ['kwai_latam', 'tiktok_latam', 'youtube_mx'] },
  { code: 'id', nameKm: 'ឥណ្ឌូនេស៊ី', nameEn: 'Indonesia', flag: '🇮🇩', popularPlatforms: ['tiktok_id', 'snackvideo_id', 'youtube_id'] },
  { code: 'dramabox', nameKm: 'កម្មវិធីរឿងភាគ Short Drama', nameEn: 'Short Drama Apps', flag: '🎬', popularPlatforms: ['reelshort', 'dramabox', 'shortmax', 'sereal'] },
];

export const GLOBAL_SOCIAL_NETWORKS: SocialNetworkPlatform[] = [
  // GLOBAL
  {
    id: 'tiktok',
    name: 'TikTok',
    nativeName: 'TikTok Global',
    countryCode: 'global',
    countryNameKm: 'សកលលោក',
    countryNameEn: 'Global',
    countryFlag: '🌐',
    category: 'shortvideo',
    colorBadge: 'border-pink-500/30 bg-pink-500/20 text-pink-300',
    textColor: 'text-pink-400',
    bgGradient: 'from-pink-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរកវីដេអូខ្លី TikTok គ្មាន watermark ទូទាំងពិភពលោក',
    descriptionEn: 'Search TikTok videos & viral clips worldwide',
    getSearchUrl: (q) => `https://www.tiktok.com/search?q=${encodeURIComponent(q)}`,
    isDownloadSupportedInApp: true
  },
  {
    id: 'youtube_shorts',
    name: 'YouTube Shorts',
    nativeName: 'YouTube Shorts / Videos',
    countryCode: 'global',
    countryNameKm: 'សកលលោក',
    countryNameEn: 'Global',
    countryFlag: '🌐',
    category: 'shortvideo',
    colorBadge: 'border-red-500/30 bg-red-500/20 text-red-300',
    textColor: 'text-red-400',
    bgGradient: 'from-red-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរក YouTube Shorts & វីដេអូពេញ HD គ្រប់ប្រទេស',
    descriptionEn: 'Search YouTube Shorts & long videos globally',
    getSearchUrl: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}+shorts`,
    isDownloadSupportedInApp: true
  },
  {
    id: 'facebook_reels',
    name: 'Facebook Reels / Watch',
    nativeName: 'Meta Facebook',
    countryCode: 'global',
    countryNameKm: 'សកលលោក',
    countryNameEn: 'Global',
    countryFlag: '🌐',
    category: 'social',
    colorBadge: 'border-blue-500/30 bg-blue-500/20 text-blue-300',
    textColor: 'text-blue-400',
    bgGradient: 'from-blue-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរក Reel និងវីដេអូ Facebook Watch',
    descriptionEn: 'Search Facebook Reels & Watch videos',
    getSearchUrl: (q) => `https://www.facebook.com/watch/search/?q=${encodeURIComponent(q)}`,
    isDownloadSupportedInApp: true
  },
  {
    id: 'instagram_reels',
    name: 'Instagram Reels',
    nativeName: 'Instagram',
    countryCode: 'global',
    countryNameKm: 'សកលលោក',
    countryNameEn: 'Global',
    countryFlag: '🌐',
    category: 'shortvideo',
    colorBadge: 'border-fuchsia-500/30 bg-fuchsia-500/20 text-fuchsia-300',
    textColor: 'text-fuchsia-400',
    bgGradient: 'from-fuchsia-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរក Hashtags និង Reels លើ Instagram',
    descriptionEn: 'Search Instagram Reels & trending tags',
    getSearchUrl: (q) => `https://www.instagram.com/explore/tags/${encodeURIComponent(q.replace(/\s+/g, ''))}/`,
    isDownloadSupportedInApp: true
  },
  {
    id: 'x_twitter',
    name: 'X (Twitter)',
    nativeName: 'X Corp',
    countryCode: 'global',
    countryNameKm: 'សកលលោក',
    countryNameEn: 'Global',
    countryFlag: '🌐',
    category: 'community',
    colorBadge: 'border-slate-500/30 bg-slate-700/30 text-slate-300',
    textColor: 'text-slate-300',
    bgGradient: 'from-slate-800/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរកការសន្ទនា វីដេអូ និងការពិភាក្សា trending',
    descriptionEn: 'Search live conversations & viral videos',
    getSearchUrl: (q) => `https://twitter.com/search?q=${encodeURIComponent(q)}&f=live`,
    isDownloadSupportedInApp: false
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    nativeName: 'Pinterest Poster & Art',
    countryCode: 'global',
    countryNameKm: 'សកលលោក',
    countryNameEn: 'Global',
    countryFlag: '🌐',
    category: 'community',
    colorBadge: 'border-rose-500/30 bg-rose-500/20 text-rose-300',
    textColor: 'text-rose-400',
    bgGradient: 'from-rose-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរករូបភាព Poster ដើម HD និង Wallpaper រឿងភាគ',
    descriptionEn: 'Search original HD posters & wallpaper art',
    getSearchUrl: (q) => `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(q)}+drama+poster`,
    isDownloadSupportedInApp: false
  },

  // CHINA (🇨🇳)
  {
    id: 'douyin',
    name: '抖音 Douyin',
    nativeName: 'Douyin China (TikTok CN)',
    countryCode: 'cn',
    countryNameKm: 'ប្រទេសចិន',
    countryNameEn: 'China',
    countryFlag: '🇨🇳',
    category: 'shortvideo',
    colorBadge: 'border-sky-500/30 bg-sky-500/20 text-sky-300',
    textColor: 'text-sky-400',
    bgGradient: 'from-sky-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរកវីដេអូដើមលើ Douyin ចិន (គ្មាន watermark)',
    descriptionEn: 'Search original China Douyin videos & creators',
    getSearchUrl: (q) => `https://www.douyin.com/search/${encodeURIComponent(q)}`,
    isDownloadSupportedInApp: true
  },
  {
    id: 'kuaishou',
    name: '快手 Kuaishou',
    nativeName: '快手短剧 (Kuaishou Drama)',
    countryCode: 'cn',
    countryNameKm: 'ប្រទេសចិន',
    countryNameEn: 'China',
    countryFlag: '🇨🇳',
    category: 'drama',
    colorBadge: 'border-orange-500/30 bg-orange-500/20 text-orange-300',
    textColor: 'text-orange-400',
    bgGradient: 'from-orange-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'មជ្ឈមណ្ឌលរឿងភាគ Short Drama ធំជាងគេនៅចិន',
    descriptionEn: 'Largest Chinese short drama & serials hub',
    getSearchUrl: (q) => `https://www.kuaishou.com/search/video?searchKey=${encodeURIComponent(q)}`,
    isDownloadSupportedInApp: true
  },
  {
    id: 'bilibili',
    name: '哔哩哔哩 Bilibili',
    nativeName: 'Bilibili Anime & Drama',
    countryCode: 'cn',
    countryNameKm: 'ប្រទេសចិន',
    countryNameEn: 'China',
    countryFlag: '🇨🇳',
    category: 'drama',
    colorBadge: 'border-cyan-500/30 bg-cyan-500/20 text-cyan-300',
    textColor: 'text-cyan-400',
    bgGradient: 'from-cyan-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរកភាគពេញ វីដេអូគុណភាពខ្ពស់ 1080p/4K Bilibili',
    descriptionEn: 'Search Bilibili full episodes, AMVs & clips',
    getSearchUrl: (q) => `https://search.bilibili.com/all?keyword=${encodeURIComponent(q)}`,
    isDownloadSupportedInApp: true
  },
  {
    id: 'xiaohongshu',
    name: '小红书 Xiaohongshu (RED)',
    nativeName: 'RED Book',
    countryCode: 'cn',
    countryNameKm: 'ប្រទេសចិន',
    countryNameEn: 'China',
    countryFlag: '🇨🇳',
    category: 'social',
    colorBadge: 'border-red-500/30 bg-red-500/20 text-red-300',
    textColor: 'text-red-400',
    bgGradient: 'from-red-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរកការសង្ខេបសាច់រឿង និងការណែនាំរឿងល្អៗ',
    descriptionEn: 'Search drama reviews, actor profiles & clips',
    getSearchUrl: (q) => `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(q)}`,
    isDownloadSupportedInApp: false
  },
  {
    id: 'weibo',
    name: '微博 Weibo',
    nativeName: 'Sina Weibo',
    countryCode: 'cn',
    countryNameKm: 'ប្រទេសចិន',
    countryNameEn: 'China',
    countryFlag: '🇨🇳',
    category: 'community',
    colorBadge: 'border-amber-500/30 bg-amber-500/20 text-amber-300',
    textColor: 'text-amber-400',
    bgGradient: 'from-amber-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរកប្រធានបទ Hot Trending របស់តារាសម្ដែងចិន',
    descriptionEn: 'Search Weibo hot topics, cast & trailers',
    getSearchUrl: (q) => `https://s.weibo.com/weibo?q=${encodeURIComponent(q)}`,
    isDownloadSupportedInApp: false
  },

  // CAMBODIA (🇰🇭)
  {
    id: 'tiktok_kh',
    name: 'TikTok Cambodia',
    nativeName: 'TikTok កម្ពុជា',
    countryCode: 'kh',
    countryNameKm: 'ប្រទេសកម្ពុជា',
    countryNameEn: 'Cambodia',
    countryFlag: '🇰🇭',
    category: 'shortvideo',
    colorBadge: 'border-teal-500/30 bg-teal-500/20 text-teal-300',
    textColor: 'text-teal-400',
    bgGradient: 'from-teal-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរកវីដេអូ TikTok ភាសាខ្មែរ រឿងភាគបកប្រែជាភាសាខ្មែរ',
    descriptionEn: 'Search Khmer TikTok dubs, recaps & viral clips',
    getSearchUrl: (q) => `https://www.tiktok.com/search?q=${encodeURIComponent(q)}+khmer`,
    isDownloadSupportedInApp: true
  },
  {
    id: 'youtube_kh',
    name: 'YouTube Cambodia',
    nativeName: 'YouTube KH / ខ្មែរ',
    countryCode: 'kh',
    countryNameKm: 'ប្រទេសកម្ពុជា',
    countryNameEn: 'Cambodia',
    countryFlag: '🇰🇭',
    category: 'shortvideo',
    colorBadge: 'border-red-500/30 bg-red-500/20 text-red-300',
    textColor: 'text-red-400',
    bgGradient: 'from-red-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរកវីដេអូ YouTube រឿងភាគនិយាយខ្មែរ 1080p',
    descriptionEn: 'Search Khmer dubbed series & movies on YouTube',
    getSearchUrl: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}+និយាយខ្មែរ`,
    isDownloadSupportedInApp: true
  },
  {
    id: 'facebook_kh',
    name: 'Facebook Watch Cambodia',
    nativeName: 'FB Watch កម្ពុជា',
    countryCode: 'kh',
    countryNameKm: 'ប្រទេសកម្ពុជា',
    countryNameEn: 'Cambodia',
    countryFlag: '🇰🇭',
    category: 'social',
    colorBadge: 'border-blue-500/30 bg-blue-500/20 text-blue-300',
    textColor: 'text-blue-400',
    bgGradient: 'from-blue-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរកផេកសម្រាយរឿង និងរឿងភាគខ្លីលើ Facebook ខ្មែរ',
    descriptionEn: 'Search Khmer movie recap pages & reels',
    getSearchUrl: (q) => `https://www.facebook.com/watch/search/?q=${encodeURIComponent(q)}+សម្រាយរឿង`,
    isDownloadSupportedInApp: true
  },

  // USA (🇺🇸)
  {
    id: 'tiktok_us',
    name: 'TikTok USA',
    nativeName: 'TikTok US Edition',
    countryCode: 'us',
    countryNameKm: 'សហរដ្ឋអាមេរិក',
    countryNameEn: 'USA',
    countryFlag: '🇺🇸',
    category: 'shortvideo',
    colorBadge: 'border-indigo-500/30 bg-indigo-500/20 text-indigo-300',
    textColor: 'text-indigo-400',
    bgGradient: 'from-indigo-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរកវីដេអូ TikTok ពេញនិយមនៅសហរដ្ឋអាមេរិក',
    descriptionEn: 'Search trending TikTok USA content & creators',
    getSearchUrl: (q) => `https://www.tiktok.com/search?q=${encodeURIComponent(q)}+english`,
    isDownloadSupportedInApp: true
  },
  {
    id: 'youtube_us',
    name: 'YouTube USA',
    nativeName: 'YouTube North America',
    countryCode: 'us',
    countryNameKm: 'សហរដ្ឋអាមេរិក',
    countryNameEn: 'USA',
    countryFlag: '🇺🇸',
    category: 'shortvideo',
    colorBadge: 'border-red-500/30 bg-red-500/20 text-red-300',
    textColor: 'text-red-400',
    bgGradient: 'from-red-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរកវីដេអូកម្រិតខ្ពស់ HD/4K និង Trailers នៅ US',
    descriptionEn: 'Search top US trailers, reviews & clips',
    getSearchUrl: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}+full+movie`,
    isDownloadSupportedInApp: true
  },

  // THAILAND (🇹🇭)
  {
    id: 'tiktok_th',
    name: 'TikTok Thailand',
    nativeName: 'TikTok ประเทศไทย',
    countryCode: 'th',
    countryNameKm: 'ប្រទេសថៃ',
    countryNameEn: 'Thailand',
    countryFlag: '🇹🇭',
    category: 'shortvideo',
    colorBadge: 'border-amber-500/30 bg-amber-500/20 text-amber-300',
    textColor: 'text-amber-400',
    bgGradient: 'from-amber-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរកវីដេអូរឿងភាគ និងតារាថៃល្បីៗលើ TikTok',
    descriptionEn: 'Search Thai drama series, BL & trending clips',
    getSearchUrl: (q) => `https://www.tiktok.com/search?q=${encodeURIComponent(q)}+ซีรีส์`,
    isDownloadSupportedInApp: true
  },
  {
    id: 'youtube_th',
    name: 'YouTube Thailand',
    nativeName: 'YouTube TH ซีรีส์',
    countryCode: 'th',
    countryNameKm: 'ប្រទេសថៃ',
    countryNameEn: 'Thailand',
    countryFlag: '🇹🇭',
    category: 'drama',
    colorBadge: 'border-rose-500/30 bg-rose-500/20 text-rose-300',
    textColor: 'text-rose-400',
    bgGradient: 'from-rose-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរករឿងភាគថៃ (Lakorn) ពេញភាគលើ YouTube',
    descriptionEn: 'Search Thai Lakorn series & episodes',
    getSearchUrl: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}+ละครไทย`,
    isDownloadSupportedInApp: true
  },

  // VIETNAM (🇻🇳)
  {
    id: 'tiktok_vn',
    name: 'TikTok Vietnam',
    nativeName: 'TikTok Việt Nam',
    countryCode: 'vn',
    countryNameKm: 'ប្រទេសវៀតណាម',
    countryNameEn: 'Vietnam',
    countryFlag: '🇻🇳',
    category: 'shortvideo',
    colorBadge: 'border-yellow-500/30 bg-yellow-500/20 text-yellow-300',
    textColor: 'text-yellow-400',
    bgGradient: 'from-yellow-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរករឿងភាគខ្លី Phim Ngắn លើ TikTok វៀតណាម',
    descriptionEn: 'Search Vietnamese short drama & Phim Nhanh',
    getSearchUrl: (q) => `https://www.tiktok.com/search?q=${encodeURIComponent(q)}+phim+ngắn`,
    isDownloadSupportedInApp: true
  },
  {
    id: 'youtube_vn',
    name: 'YouTube Vietnam',
    nativeName: 'YouTube Phim VN',
    countryCode: 'vn',
    countryNameKm: 'ប្រទេសវៀតណាម',
    countryNameEn: 'Vietnam',
    countryFlag: '🇻🇳',
    category: 'drama',
    colorBadge: 'border-red-500/30 bg-red-500/20 text-red-300',
    textColor: 'text-red-400',
    bgGradient: 'from-red-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរករឿងភាគវៀតណាម និងរឿងភាគចិនសម្រាយជាភាសាវៀតណាម',
    descriptionEn: 'Search Vietnamese dubbed dramas & series',
    getSearchUrl: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}+thuyết+minh`,
    isDownloadSupportedInApp: true
  },

  // JAPAN (🇯🇵)
  {
    id: 'tiktok_jp',
    name: 'TikTok Japan',
    nativeName: 'TikTok 日本',
    countryCode: 'jp',
    countryNameKm: 'ប្រទេសជប៉ុន',
    countryNameEn: 'Japan',
    countryFlag: '🇯🇵',
    category: 'shortvideo',
    colorBadge: 'border-pink-500/30 bg-pink-500/20 text-pink-300',
    textColor: 'text-pink-400',
    bgGradient: 'from-pink-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរករឿងភាគខ្លី និង Anime ជប៉ុនលើ TikTok',
    descriptionEn: 'Search Japanese short drama & anime on TikTok',
    getSearchUrl: (q) => `https://www.tiktok.com/search?q=${encodeURIComponent(q)}+ショートドラマ`,
    isDownloadSupportedInApp: true
  },
  {
    id: 'youtube_jp',
    name: 'YouTube Japan',
    nativeName: 'YouTube ドラマ',
    countryCode: 'jp',
    countryNameKm: 'ប្រទេសជប៉ុន',
    countryNameEn: 'Japan',
    countryFlag: '🇯🇵',
    category: 'drama',
    colorBadge: 'border-red-500/30 bg-red-500/20 text-red-300',
    textColor: 'text-red-400',
    bgGradient: 'from-red-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរករឿងភាគជប៉ុន (J-Drama) លើ YouTube',
    descriptionEn: 'Search Japanese JDrama & trailers',
    getSearchUrl: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}+ドラマ`,
    isDownloadSupportedInApp: true
  },

  // KOREA (🇰🇷)
  {
    id: 'tiktok_kr',
    name: 'TikTok Korea',
    nativeName: 'TikTok 한국 숏드라마',
    countryCode: 'kr',
    countryNameKm: 'កូរ៉េខាងត្បូង',
    countryNameEn: 'South Korea',
    countryFlag: '🇰🇷',
    category: 'shortvideo',
    colorBadge: 'border-blue-500/30 bg-blue-500/20 text-blue-300',
    textColor: 'text-blue-400',
    bgGradient: 'from-blue-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរករឿង K-Drama ខ្លី និង Web Drama កូរ៉េលើ TikTok',
    descriptionEn: 'Search Korean K-Drama clips & short dramas',
    getSearchUrl: (q) => `https://www.tiktok.com/search?q=${encodeURIComponent(q)}+웹드라마`,
    isDownloadSupportedInApp: true
  },
  {
    id: 'youtube_kr',
    name: 'YouTube Korea',
    nativeName: 'YouTube K-Drama',
    countryCode: 'kr',
    countryNameKm: 'កូរ៉េខាងត្បូង',
    countryNameEn: 'South Korea',
    countryFlag: '🇰🇷',
    category: 'drama',
    colorBadge: 'border-red-500/30 bg-red-500/20 text-red-300',
    textColor: 'text-red-400',
    bgGradient: 'from-red-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរក Trailer និងវគ្គពិសេស K-Drama លើ YouTube',
    descriptionEn: 'Search Korean drama highlights & OSTs',
    getSearchUrl: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}+드라마+하이라이트`,
    isDownloadSupportedInApp: true
  },

  // LATIN AMERICA / MEXICO (🇲🇽)
  {
    id: 'kwai_latam',
    name: 'Kwai (Kuaishou LatAm)',
    nativeName: 'Kwai América Latina',
    countryCode: 'mx',
    countryNameKm: 'ម៉ិកស៊ិក / ឡាទីន',
    countryNameEn: 'LatAm / Mexico',
    countryFlag: '🇲🇽',
    category: 'shortvideo',
    colorBadge: 'border-orange-500/30 bg-orange-500/20 text-orange-300',
    textColor: 'text-orange-400',
    bgGradient: 'from-orange-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'បណ្ដាញវីដេអូខ្លី Kwai ពេញនិយមនៅអាមេរិកឡាទីន',
    descriptionEn: 'Search Kwai short telenovelas & serials',
    getSearchUrl: (q) => `https://www.kwai.com/search/${encodeURIComponent(q)}`,
    isDownloadSupportedInApp: false
  },
  {
    id: 'tiktok_latam',
    name: 'TikTok Español',
    nativeName: 'TikTok Novelas',
    countryCode: 'mx',
    countryNameKm: 'ម៉ិកស៊ិក / ឡាទីន',
    countryNameEn: 'LatAm / Mexico',
    countryFlag: '🇲🇽',
    category: 'shortvideo',
    colorBadge: 'border-pink-500/30 bg-pink-500/20 text-pink-300',
    textColor: 'text-pink-400',
    bgGradient: 'from-pink-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរករឿងខ្លី Telenovelas ជាភាសាអេស្ប៉ាញ',
    descriptionEn: 'Search Spanish mini-series & novelas',
    getSearchUrl: (q) => `https://www.tiktok.com/search?q=${encodeURIComponent(q)}+novela`,
    isDownloadSupportedInApp: true
  },

  // INDONESIA (🇮🇩)
  {
    id: 'tiktok_id',
    name: 'TikTok Indonesia',
    nativeName: 'TikTok Drama ID',
    countryCode: 'id',
    countryNameKm: 'ឥណ្ឌូនេស៊ី',
    countryNameEn: 'Indonesia',
    countryFlag: '🇮🇩',
    category: 'shortvideo',
    colorBadge: 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300',
    textColor: 'text-emerald-400',
    bgGradient: 'from-emerald-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរករឿងភាគខ្លី និង Sinetron លើ TikTok ឥណ្ឌូនេស៊ី',
    descriptionEn: 'Search Indonesian viral drama clips & Sinetron',
    getSearchUrl: (q) => `https://www.tiktok.com/search?q=${encodeURIComponent(q)}+drama+series`,
    isDownloadSupportedInApp: true
  },

  // SHORT DRAMA APPS (🎬)
  {
    id: 'reelshort',
    name: 'ReelShort',
    nativeName: 'ReelShort Stream',
    countryCode: 'dramabox',
    countryNameKm: 'កម្មវិធី Short Drama',
    countryNameEn: 'Short Drama Apps',
    countryFlag: '🎬',
    category: 'drama',
    colorBadge: 'border-purple-500/30 bg-purple-500/20 text-purple-300',
    textColor: 'text-purple-400',
    bgGradient: 'from-purple-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរករឿងភាគខ្នាតខ្លី ReelShort ល្បីៗ',
    descriptionEn: 'Search ReelShort original hit mini-series',
    getSearchUrl: (q) => `https://www.google.com/search?q=site:reelshort.com+${encodeURIComponent(q)}`,
    isDownloadSupportedInApp: false
  },
  {
    id: 'dramabox',
    name: 'DramaBox',
    nativeName: 'DramaBox App',
    countryCode: 'dramabox',
    countryNameKm: 'កម្មវិធី Short Drama',
    countryNameEn: 'Short Drama Apps',
    countryFlag: '🎬',
    category: 'drama',
    colorBadge: 'border-amber-500/30 bg-amber-500/20 text-amber-300',
    textColor: 'text-amber-400',
    bgGradient: 'from-amber-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរករឿងភាគ DramaBox មហាសេដ្ឋី និងស្នេហា',
    descriptionEn: 'Search DramaBox romance & billionaire series',
    getSearchUrl: (q) => `https://www.google.com/search?q=site:dramabox.com+${encodeURIComponent(q)}`,
    isDownloadSupportedInApp: false
  },
  {
    id: 'shortmax',
    name: 'ShortMax',
    nativeName: 'ShortMax Drama',
    countryCode: 'dramabox',
    countryNameKm: 'កម្មវិធី Short Drama',
    countryNameEn: 'Short Drama Apps',
    countryFlag: '🎬',
    category: 'drama',
    colorBadge: 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300',
    textColor: 'text-emerald-400',
    bgGradient: 'from-emerald-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរករឿង ShortMax ពេញនិយមទូទាំងពិភពលោក',
    descriptionEn: 'Search ShortMax global mini-drama episodes',
    getSearchUrl: (q) => `https://www.google.com/search?q=site:shortmax.com+${encodeURIComponent(q)}`,
    isDownloadSupportedInApp: false
  },
  {
    id: 'google_video',
    name: 'Google Videos',
    nativeName: 'Google Search Videos',
    countryCode: 'global',
    countryNameKm: 'សកលលោក',
    countryNameEn: 'Global',
    countryFlag: '🌐',
    category: 'community',
    colorBadge: 'border-blue-500/30 bg-blue-500/20 text-blue-300',
    textColor: 'text-blue-400',
    bgGradient: 'from-blue-950/40 via-slate-900 to-slate-950',
    descriptionKm: 'ស្វែងរកវីដេអូគ្រប់វេបសាយលើពិភពលោកតាមរយៈ Google',
    descriptionEn: 'Search all websites & video indexes across Google',
    getSearchUrl: (q) => `https://www.google.com/search?tbm=vid&q=${encodeURIComponent(q)}`,
    isDownloadSupportedInApp: false
  }
];

export function getSocialPlatformsByCountry(countryCode: string): SocialNetworkPlatform[] {
  if (!countryCode || countryCode === 'all') {
    return GLOBAL_SOCIAL_NETWORKS;
  }
  return GLOBAL_SOCIAL_NETWORKS.filter(p => p.countryCode === countryCode);
}
