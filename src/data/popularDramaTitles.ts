export interface DramaTitleItem {
  id: string;
  title: string;
  titleKm: string;
  originalTitle?: string;
  category: 'drama' | 'anime' | 'ceo' | 'werewolf' | 'revenge' | 'rebirth' | 'historical' | 'channel';
  categoryLabelKm: string;
  platform: 'tiktok' | 'kuaishou' | 'douyin' | 'bilibili';
  platformLabel: string;
  url: string;
  posterUrl: string;
  episodeCount?: number;
  viewCount?: string;
  tags: string[];
  channelHandle?: string;
  channelName?: string;
  descriptionKm: string;
  isPopular?: boolean;
}

export const POPULAR_DRAMA_TITLES: DramaTitleItem[] = [
  // --- Titles starting with "A" ---
  {
    id: 'dt_after_divorce',
    title: 'After Divorce, My Ex-Wife Regretted It',
    titleKm: 'លែងលះរួច អតីតភរិយាស្តាយក្រោយ',
    originalTitle: '离婚后前妻后悔莫及',
    category: 'revenge',
    categoryLabelKm: '🔥 សងសឹក / Revenge',
    platform: 'tiktok',
    platformLabel: 'TikTok Drama',
    url: 'https://www.tiktok.com/shortdrama/episode/7683292072136512532/1',
    posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    episodeCount: 88,
    viewCount: '24.5M Views',
    tags: ['After Divorce', 'Ex-Wife', 'Revenge', 'Billionaire', 'Romance', 'A'],
    channelHandle: '@17kseriesid',
    channelName: '17K Series ID',
    descriptionKm: 'រឿងភាគខ្លីកំពូលពេញនិយម: បន្ទាប់ពីការលែងលះ នាងបានដឹងថាស្វាមីរបស់នាងគឺជាមហាសេដ្ឋីពិតប្រាកដ',
    isPopular: true
  },
  {
    id: 'dt_alpha_king_mate',
    title: "Alpha King's Secret Mate",
    titleKm: 'គូស្នេហ៍សម្ងាត់របស់ស្តេច Alpha',
    originalTitle: "Alpha King's Secret Mate",
    category: 'werewolf',
    categoryLabelKm: '🐺 Alpha / Werewolf',
    platform: 'tiktok',
    platformLabel: 'TikTok Drama',
    url: 'https://www.tiktok.com/@17kseriesid',
    posterUrl: 'https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?w=600&auto=format&fit=crop&q=80',
    episodeCount: 75,
    viewCount: '38.2M Views',
    tags: ['Alpha King', 'Secret Mate', 'Werewolf', 'Romance', 'Supernatural', 'A'],
    channelHandle: '@17kseriesid',
    channelName: '17K Series ID',
    descriptionKm: 'រឿងភាគខ្លីបែប Werewolf & Fantasy ដ៏ល្បីល្បាញលើ TikTok ស្នេហាសម្ងាត់ជាមួយស្តេច Alpha',
    isPopular: true
  },
  {
    id: 'dt_accidental_bride',
    title: 'Accidental Bride to the Billionaire',
    titleKm: 'កូនក្រមុំចៃដន្យរបស់មហាសេដ្ឋី',
    originalTitle: 'The Accidental Bride',
    category: 'ceo',
    categoryLabelKm: '💎 មហាសេដ្ឋី / CEO',
    platform: 'tiktok',
    platformLabel: 'TikTok Drama',
    url: 'https://www.tiktok.com/@peachmochi_ca',
    posterUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&auto=format&fit=crop&q=80',
    episodeCount: 82,
    viewCount: '19.8M Views',
    tags: ['Accidental Bride', 'Billionaire', 'CEO', 'Contract Marriage', 'Romance', 'A'],
    channelHandle: '@peachmochi_ca',
    channelName: 'Peach Mochi CA',
    descriptionKm: 'ការរៀបការដោយចៃដន្យជាមួយលោកប្រធានមហាសេដ្ឋីត្រជាក់ស្រេប ប៉ុន្តែពោរពេញដោយភាពផ្អែមល្ហែម',
    isPopular: true
  },
  {
    id: 'dt_an_heir_revenge',
    title: "An Heir's Revenge: Return of the Dragon",
    titleKm: 'ការសងសឹករបស់អ្នកស្នងមរតក: នាគវិលត្រឡប់',
    originalTitle: '继承人之龙王归来',
    category: 'revenge',
    categoryLabelKm: '⚔️ ក្បាច់គុន / Action',
    platform: 'kuaishou',
    platformLabel: 'Kuaishou / ចិន',
    url: 'https://www.kuaishou.com',
    posterUrl: 'https://images.unsplash.com/photo-1533488765986-dfa2a9939acd?w=600&auto=format&fit=crop&q=80',
    episodeCount: 95,
    viewCount: '48.6M Views',
    tags: ['An Heir', 'Revenge', 'Dragon King', 'Urban Hero', 'Action', 'A'],
    channelHandle: '@快手短剧',
    channelName: '快手短剧 (Kuaishou Drama)',
    descriptionKm: 'អ្នកស្នងមរតកលាក់មុខត្រឡប់មកវិញដើម្បីសងសឹក និងការពារគ្រួសាររបស់ខ្លួន',
    isPopular: true
  },
  {
    id: 'dt_a_sweet_little_wife',
    title: 'A Sweet Little Wife of the Cold CEO',
    titleKm: 'ភរិយាតូចដ៏ផ្អែមល្ហែមរបស់ CEO ត្រជាក់ស្រេប',
    originalTitle: '冷面总裁的甜心小娇妻',
    category: 'ceo',
    categoryLabelKm: '💎 មហាសេដ្ឋី / CEO',
    platform: 'tiktok',
    platformLabel: 'TikTok Drama',
    url: 'https://www.tiktok.com/@17kseriesid',
    posterUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    episodeCount: 64,
    viewCount: '15.4M Views',
    tags: ['A Sweet Little Wife', 'Cold CEO', 'Romance', 'Cute', 'A'],
    channelHandle: '@17kseriesid',
    channelName: '17K Series ID',
    descriptionKm: 'រឿងភាគស្នេហាលោកប្រធានមុខស្មើ និងភរិយាតូចគួរឱ្យស្រឡាញ់ដែលធ្វើឱ្យបេះដូងរលាយ',
    isPopular: true
  },
  {
    id: 'dt_all_because_of_love',
    title: 'All Because of Love',
    titleKm: 'ព្រោះតែសេចក្តីស្រឡាញ់ទាំងអស់',
    originalTitle: 'All Because of Love',
    category: 'drama',
    categoryLabelKm: '💖 ស្នេហា / Romance',
    platform: 'tiktok',
    platformLabel: 'TikTok Drama',
    url: 'https://www.tiktok.com/@lovetale_clip_id',
    posterUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&auto=format&fit=crop&q=80',
    episodeCount: 50,
    viewCount: '12.1M Views',
    tags: ['All Because of Love', 'Romance', 'Emotional', 'Love Story', 'A'],
    channelHandle: '@lovetale_clip_id',
    channelName: 'Love Tale Clip ID',
    descriptionKm: 'សាច់រឿងស្នេហាកម្សត់ រំជួលចិត្ត និងការលះបង់ដើម្បីមនុស្សជាទីស្រឡាញ់',
    isPopular: true
  },
  {
    id: 'dt_alpha_unwanted_bride',
    title: "Alpha's Unwanted Bride",
    titleKm: 'កូនក្រមុំដែល Alpha មិនចង់បាន',
    originalTitle: "Alpha's Unwanted Bride",
    category: 'werewolf',
    categoryLabelKm: '🐺 Alpha / Werewolf',
    platform: 'tiktok',
    platformLabel: 'TikTok Drama',
    url: 'https://www.tiktok.com/@elitedramatales',
    posterUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80',
    episodeCount: 70,
    viewCount: '29.3M Views',
    tags: ['Alpha', 'Unwanted Bride', 'Werewolf', 'Fantasy', 'Romance', 'A'],
    channelHandle: '@elitedramatales',
    channelName: 'Elite Drama Tales',
    descriptionKm: 'នាងត្រូវគេបង្ខំឱ្យរៀបការជាមួយ Alpha ប៉ុន្តែក្រោយមកនាងបានបង្ហាញថាមពលដ៏ពិតប្រាកដ',
    isPopular: true
  },
  {
    id: 'dt_a_second_chance',
    title: 'A Second Chance with My Ex-Husband',
    titleKm: 'ឱកាសទីពីរជាមួយអតីតស្វាមី',
    originalTitle: '前夫的二次机会',
    category: 'romance' as any,
    categoryLabelKm: '💖 ស្នេហា / Romance',
    platform: 'tiktok',
    platformLabel: 'TikTok Drama',
    url: 'https://www.tiktok.com/@soledadelrio889',
    posterUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80',
    episodeCount: 60,
    viewCount: '18.7M Views',
    tags: ['A Second Chance', 'Ex-Husband', 'Rebirth', 'Drama', 'A'],
    channelHandle: '@soledadelrio889',
    channelName: 'Soledad El Rio',
    descriptionKm: 'ឱកាសទីពីរនៃការកែប្រែកំហុសអតីតកាល និងកសាងសុភមង្គលសាជាថ្មី',
    isPopular: true
  },
  {
    id: 'dt_as_the_moon_falls',
    title: 'As The Moon Falls',
    titleKm: 'ពេលដែលព្រះចន្ទធ្លាក់ចុះ',
    originalTitle: '月落星沉',
    category: 'historical',
    categoryLabelKm: '👑 បុរាណ / Historical',
    platform: 'kuaishou',
    platformLabel: 'Kuaishou / ចិន',
    url: 'https://www.kuaishou.com',
    posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    episodeCount: 36,
    viewCount: '42.0M Views',
    tags: ['As The Moon Falls', 'Historical', 'Costume Drama', 'Romance', 'A'],
    channelHandle: '@快手小剧场',
    channelName: '快手小剧场 (Kuaishou Theatre)',
    descriptionKm: 'រឿងភាគបុរាណចិនសោភ័ណភាពខ្ពស់ ព្រិលធ្លាក់ ស្នេហានិងកលល្បិចរាជវង្ស',
    isPopular: true
  },
  {
    id: 'dt_awakening_dragon',
    title: 'Awakening of the Dragon King: Reborn',
    titleKm: 'ការភ្ញាក់ដឹងខ្លួនរបស់ស្តេចនាគ',
    originalTitle: '龙王觉醒：重生都市',
    category: 'rebirth',
    categoryLabelKm: '⚡ កើតឡើងវិញ / Reborn',
    platform: 'kuaishou',
    platformLabel: 'Kuaishou / ចិន',
    url: 'https://www.kuaishou.com',
    posterUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    episodeCount: 100,
    viewCount: '62.4M Views',
    tags: ['Awakening', 'Dragon King', 'Reborn', 'Urban Fantasy', 'Action', 'A'],
    channelHandle: '@快手短剧',
    channelName: '快手短剧',
    descriptionKm: 'ការភ្ញាក់ដឹងខ្លួនឡើងវិញក្នុងសម័យទំនើបជាមួយនឹងអំណាចក្បាច់គុនកំពូល',
    isPopular: true
  },
  {
    id: 'dt_a_billionaires_double_life',
    title: "A Billionaire's Double Life",
    titleKm: 'ជីវិតពីរមុខរបស់មហាសេដ្ឋី',
    originalTitle: 'Billionaire Double Life',
    category: 'ceo',
    categoryLabelKm: '💎 មហាសេដ្ឋី / CEO',
    platform: 'tiktok',
    platformLabel: 'TikTok Drama',
    url: 'https://www.tiktok.com/@plotflash_studio_mx',
    posterUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
    episodeCount: 80,
    viewCount: '21.0M Views',
    tags: ['A Billionaire', 'Double Life', 'Undercover Boss', 'Drama', 'A'],
    channelHandle: '@plotflash_studio_mx',
    channelName: 'PlotFlash Studio MX',
    descriptionKm: 'មហាសេដ្ឋីដែលបន្លំខ្លួនធ្វើជាមនុស្សសាមញ្ញ ដើម្បីស្វែងរកមនុស្សស្មោះត្រង់ពិតប្រាកដ',
    isPopular: false
  },
  {
    id: 'dt_against_all_odds',
    title: 'Against All Odds: From Poor Boy to Tycoon',
    titleKm: 'ជំនះរាល់ឧបសគ្គ: ពីក្មេងក្រីក្រក្លាយជាមហាសេដ្ឋី',
    originalTitle: '逆风翻盘：穷小子的商业帝国',
    category: 'revenge',
    categoryLabelKm: '🔥 សងសឹក / Revenge',
    platform: 'tiktok',
    platformLabel: 'TikTok Drama',
    url: 'https://www.tiktok.com/@hnrgtk188_ca',
    posterUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80',
    episodeCount: 92,
    viewCount: '17.3M Views',
    tags: ['Against All Odds', 'Poor Boy', 'Tycoon', 'Inspirational', 'A'],
    channelHandle: '@hnrgtk188_ca',
    channelName: 'HNRGTK 188 CA',
    descriptionKm: 'ដំណើរជីវិតជំនះការប្រមាថមើលងាយរហូតកសាងអាណាចក្រពាណិជ្ជកម្មពាន់លានដុល្លារ',
    isPopular: false
  },
  {
    id: 'dt_anime_shanzha',
    title: 'Anime Shanzha Series - 山楂动漫 (Bilibili)',
    titleKm: 'រឿងគំនូរជីវចល Shanzha Anime - 爆款短剧',
    originalTitle: '山楂动漫 爆款小说动漫系列',
    category: 'anime',
    categoryLabelKm: '🎨 គំនូរជីវចល / Anime',
    platform: 'bilibili',
    platformLabel: 'Bilibili / ចិន',
    url: 'https://space.bilibili.com/3546928642001147?spm_id_from=333.788.upinfo.detail.click',
    posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    episodeCount: 416,
    viewCount: '14.0K Likes',
    tags: ['Anime', 'Shanzha', 'Bilibili', 'Animation', 'Novel Adaptation', 'A'],
    channelHandle: '@山楂动漫',
    channelName: '山楂动漫 (Shanzha Anime)',
    descriptionKm: 'ប៉ុស្តិ៍គំនូរជីវចល Bilibili ឆ្លាតវៃ 416+ វីដេអូភាគរឿងគំនូរជីវចល និងប្រលោមលោកពេញនិយម',
    isPopular: true
  },
  {
    id: 'dt_amor_prohibido',
    title: 'Amor Prohibido: LatAm Drama Tales',
    titleKm: 'ស្នេហាហាមឃាត់: រឿងភាគអេស្ប៉ាញ Soledad',
    originalTitle: 'Amor Prohibido',
    category: 'drama',
    categoryLabelKm: '🇲🇽 LatAm / អេស្ប៉ាញ',
    platform: 'tiktok',
    platformLabel: 'TikTok LatAm',
    url: 'https://www.tiktok.com/@soledadelrio889',
    posterUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80',
    episodeCount: 55,
    viewCount: '11.8M Views',
    tags: ['Amor Prohibido', 'Spanish', 'LatAm', 'Romance', 'A'],
    channelHandle: '@soledadelrio889',
    channelName: 'Soledad El Rio',
    descriptionKm: 'រឿងភាគខ្លីភាសាអេស្ប៉ាញពេញនិយមនៅម៉ិកស៊ិក និងអាមេរិកឡាទីន',
    isPopular: false
  },
  {
    id: 'dt_a_contract_devil_ceo',
    title: 'A Contract with the Devil CEO',
    titleKm: 'កិច្ចសន្យាជាមួយ CEO បិសាច',
    originalTitle: '恶魔总裁的契约娇妻',
    category: 'ceo',
    categoryLabelKm: '💎 មហាសេដ្ឋី / CEO',
    platform: 'tiktok',
    platformLabel: 'TikTok Drama',
    url: 'https://www.tiktok.com/@bell.yn.01',
    posterUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=80',
    episodeCount: 78,
    viewCount: '22.9M Views',
    tags: ['A Contract', 'Devil CEO', 'Romance', 'Billionaire', 'A'],
    channelHandle: '@bell.yn.01',
    channelName: 'Bell YN 01',
    descriptionKm: 'កិច្ចសន្យាសម្ងាត់ជាមួយលោកប្រធានដ៏មានឥទ្ធិពល និងការប្រែក្លាយទៅជាស្នេហាពិត',
    isPopular: true
  },
  {
    id: 'dt_after_heartbreak_richest',
    title: 'After the Heartbreak: Becoming the Richest Woman',
    titleKm: 'ក្រោយពេលបាក់ទឹកចិត្ត: ក្លាយជាស្ត្រីមានបំផុត',
    originalTitle: '心碎后成为世界首富千金',
    category: 'revenge',
    categoryLabelKm: '🔥 សងសឹក / Revenge',
    platform: 'tiktok',
    platformLabel: 'TikTok Drama',
    url: 'https://www.tiktok.com/@cce1rthkk2',
    posterUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80',
    episodeCount: 85,
    viewCount: '31.2M Views',
    tags: ['After Heartbreak', 'Richest Woman', 'Revenge', 'Heiress', 'A'],
    channelHandle: '@cce1rthkk2',
    channelName: 'CCE1 RTH KK2',
    descriptionKm: 'បន្ទាប់ពីត្រូវគេក្បត់ នាងបានត្រឡប់ទៅគ្រួសារមហាសេដ្ឋីពិភពលោក និងក្លាយជាអ្នកស្នងមរតកធំបំផុត',
    isPopular: true
  },

  // --- Other Popular Hit Titles (B, C, D, E, S, T, M, W, Z, etc.) ---
  {
    id: 'dt_billionaire_secret_baby',
    title: "Billionaire's Secret Baby",
    titleKm: 'កូនសម្ងាត់របស់មហាសេដ្ឋី',
    originalTitle: "Billionaire's Secret Baby",
    category: 'ceo',
    categoryLabelKm: '💎 មហាសេដ្ឋី / CEO',
    platform: 'tiktok',
    platformLabel: 'TikTok Drama',
    url: 'https://www.tiktok.com/@17kseriesid',
    posterUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=600&auto=format&fit=crop&q=80',
    episodeCount: 90,
    viewCount: '34.0M Views',
    tags: ['Billionaire', 'Secret Baby', 'CEO', 'Romance', 'B'],
    channelHandle: '@17kseriesid',
    channelName: '17K Series ID',
    descriptionKm: 'ការជួបគ្នាឡើងវិញរវាងមហាសេដ្ឋី និងម្តាយកូនដែលគាត់មិនដែលបានដឹងពីមុនមក',
    isPopular: true
  },
  {
    id: 'dt_born_to_be_king',
    title: 'Born to Be King: Dragon Son-in-Law',
    titleKm: 'កូនប្រសារនាគ កើតមកជាស្តេច',
    originalTitle: '天生为王：龙婿无双',
    category: 'revenge',
    categoryLabelKm: '⚔️ ក្បាច់គុន / Action',
    platform: 'kuaishou',
    platformLabel: 'Kuaishou / ចិន',
    url: 'https://www.kuaishou.com',
    posterUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&auto=format&fit=crop&q=80',
    episodeCount: 98,
    viewCount: '55.3M Views',
    tags: ['Born to Be King', 'Dragon Son-in-Law', 'Urban', 'Action', 'B'],
    channelHandle: '@快手短剧',
    channelName: '快手短剧',
    descriptionKm: 'កូនប្រសារដែលគ្រួសារខាងស្រីមើលងាយ បង្ហាញអត្តសញ្ញាណស្តេចពិតប្រាកដ',
    isPopular: true
  },
  {
    id: 'dt_donglanxue',
    title: 'Dong Lan Xue: 《东栏雪》 快手星芒短剧',
    titleKm: '《东栏雪》 ព្រិលធ្លាក់របងខាងកើត (Dong Lan Xue)',
    originalTitle: '东栏雪 快手星芒独播短剧',
    category: 'historical',
    categoryLabelKm: '👑 បុរាណ / Historical',
    platform: 'kuaishou',
    platformLabel: 'Kuaishou / ចិន',
    url: 'https://www.kuaishou.com',
    posterUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&auto=format&fit=crop&q=80',
    episodeCount: 28,
    viewCount: '520M Views (5.2亿)',
    tags: ['Dong Lan Xue', '东栏雪', 'Kuaishou', 'Historical', 'Romance', 'D'],
    channelHandle: '@快手短剧',
    channelName: '快手短剧 (Kuaishou Official)',
    descriptionKm: 'រឿងភាគខ្លីកំពូលតារាង Kuaishou 星芒短剧 រឿងស្នេហានិងកលល្បិចរាជវង្សដែលទទួលបាន 5.2 亿 Views',
    isPopular: true
  },
  {
    id: 'dt_changgongzhu',
    title: 'The Princess Behind The Scenery: 《长公主在上》',
    titleKm: '《长公主在上》 រាជបុត្រីកំពូលកលល្បិច',
    originalTitle: '长公主在上',
    category: 'historical',
    categoryLabelKm: '👑 បុរាណ / Historical',
    platform: 'kuaishou',
    platformLabel: 'Kuaishou / ចិន',
    url: 'https://www.kuaishou.com',
    posterUrl: 'https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?w=600&auto=format&fit=crop&q=80',
    episodeCount: 26,
    viewCount: '410M Views (4.1亿)',
    tags: ['The Princess', '长公主在上', 'Kuaishou', 'Historical', 'Intrigue', 'P'],
    channelHandle: '@快手短剧',
    channelName: '快手短剧',
    descriptionKm: 'រឿងភាគខ្លីលំដាប់ជាតិចិន រាជបុត្រីមានអំណាច និងមន្ត្រីស៊ើបការណ៍ក្បែរព្រះកាយ',
    isPopular: true
  },
  {
    id: 'dt_suwuming',
    title: 'Detective Su Wuming: 《大唐来的苏无名》',
    titleKm: '《大唐来的苏无名》 អ្នកស៊ើបអង្កេតមកពីរាជវង្សថាង',
    originalTitle: '大唐来的苏无名',
    category: 'historical',
    categoryLabelKm: '🔍 ស៊ើបអង្កេត / Mystery',
    platform: 'kuaishou',
    platformLabel: 'Kuaishou / ចិន',
    url: 'https://www.kuaishou.com',
    posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    episodeCount: 25,
    viewCount: '290M Views (2.9亿)',
    tags: ['Detective Su', '大唐来的苏无名', 'Mystery', 'Time Travel', 'D'],
    channelHandle: '@快手短剧',
    channelName: '快手短剧',
    descriptionKm: 'ការឆ្លងភពពីសម័យបុរាណមកបំបែកក្តីអាថ៌កំបាំងក្នុងសម័យទំនើប',
    isPopular: true
  },
  {
    id: 'dt_longwang_chuyu',
    title: 'Dragon King Urban Drama: 《豪门神婿：龙王出狱》',
    titleKm: '《豪门神婿：龙王出狱》 ស្តេចនាគចេញពីពន្ធនាគារ',
    originalTitle: '豪门神婿：龙王出狱',
    category: 'revenge',
    categoryLabelKm: '⚔️ ក្បាច់គុន / Action',
    platform: 'kuaishou',
    platformLabel: 'Kuaishou / ចិន',
    url: 'https://www.kuaishou.com',
    posterUrl: 'https://images.unsplash.com/photo-1533488765986-dfa2a9939acd?w=600&auto=format&fit=crop&q=80',
    episodeCount: 35,
    viewCount: '480M Views (4.8亿)',
    tags: ['Dragon King', '龙王出狱', 'Urban', 'Martial Arts', 'Revenge', 'D'],
    channelHandle: '@快手短剧',
    channelName: '快手短剧',
    descriptionKm: 'រឿងភាគខ្លីក្តៅគគុក: ក្រោយចេញពីពន្ធនាគារ គាត់បង្ហាញឥទ្ធិពលគ្របដណ្តប់ទីក្រុងទាំងមូល',
    isPopular: true
  },
  {
    id: 'dt_wanfeng_anime',
    title: 'Wanfeng Anime Series: 《挽风动漫》 (Douyin 抖音)',
    titleKm: '《挽风动漫》 រឿងគំនូរជីវចល Douyin ដ៏ល្បីល្បាញ',
    originalTitle: '挽风动漫 精彩二次元新番',
    category: 'anime',
    categoryLabelKm: '🎨 គំនូរជីវចល / Anime',
    platform: 'douyin',
    platformLabel: 'Douyin / 抖音',
    url: 'https://www.douyin.com/user/MS4wLjABAAAAFS_D2tP-FWSjrp3F1t8loMySV_XY1_sF5iyW1pYv57xOxG96s-Ju3WsKnSHlJ4eW',
    posterUrl: 'https://p3-sign.douyinpic.com/tos-cn-i-dy/06e53904a7df4f8eb4e8e3ee17ad724a~c5_300x400.jpeg?lk3s=138a59ce&x-expires=1790906400&x-signature=73YqOmM4HeefPsCBi0a0A24Dx3I%3D&from=327834062_large&s=PackSourceEnum_AWEME_DETAIL&se=false&sc=cover&biz_tag=aweme_video&l=202609181034113468334FC2ECE51203F1',
    episodeCount: 45,
    viewCount: '774 Likes • 1.2M Views',
    tags: ['Wanfeng Anime', '挽风动漫', 'Douyin', '二次元', 'W'],
    channelHandle: '@挽风动漫',
    channelName: '挽风动漫 (Wanfeng Anime)',
    descriptionKm: 'ប៉ុស្តិ៍គំនូរជីវចល Douyin ផ្សាយវីដេអូកាត់តពិសេសៗ គ្មានសញ្ញាទឹក',
    isPopular: true
  },
  {
    id: 'dt_ziwen_hungry',
    title: 'Ziwen is Hungry: 《子文又饿了》 (Bilibili VIP)',
    titleKm: '《子文又饿了》 រឿងភាគម្ហូបអាហារ និងដំណើរផ្សងព្រេង Bilibili',
    originalTitle: '子文又饿了 1.28M Fans',
    category: 'channel',
    categoryLabelKm: '📺 ប៉ុស្តិ៍ល្បី / Creator',
    platform: 'bilibili',
    platformLabel: 'Bilibili / ចិន',
    url: 'https://space.bilibili.com/8894411?spm_id_from=333.788.upinfo.detail.click',
    posterUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80',
    episodeCount: 399,
    viewCount: '1.28M Fans • 9.1M Likes',
    tags: ['Ziwen', '子文又饿了', 'Bilibili', 'Food Series', 'Travel', 'Z'],
    channelHandle: '@子文又饿了',
    channelName: '子文又饿了 (Ziwen)',
    descriptionKm: 'Creator Bilibili ដ៏ល្បីល្បាញមាន 1.28M+ Fans វីដេអូគុណភាពច្បាស់ 1080p',
    isPopular: true
  },
  {
    id: 'dt_douyin_jingxuan',
    title: 'Douyin Jingxuan Featured Feed: 《抖音精选》',
    titleKm: '《抖音精选》 វីដេអូពិសេសប្រចាំថ្ងៃ Douyin Featured',
    originalTitle: '抖音精选 官方热门视频',
    category: 'channel',
    categoryLabelKm: '✨ Douyin 精选 / ពេញនិយម',
    platform: 'douyin',
    platformLabel: 'Douyin / 抖音',
    url: 'https://www.douyin.com/jingxuan?redirect_from=iesdouyin',
    posterUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    episodeCount: 150,
    viewCount: '5.8M Likes',
    tags: ['Douyin', 'Jingxuan', '精选', 'Trending', 'D'],
    channelHandle: '@douyin_jingxuan',
    channelName: '抖音精选 (Douyin Featured)',
    descriptionKm: 'កម្រងវីដេអូពេញនិយមបំផុតប្រចាំប្រទេសចិន លើកម្មវិធី Douyin',
    isPopular: true
  }
];

/**
 * Smart Search function:
 * Accepts any query string (e.g. "A", "a", "after", "alpha", "លែងលះ", "dong", "东", etc.)
 * Returns matching titles sorted with exact prefix matches (e.g. starting with "A") first,
 * followed by substring matches and keyword matches.
 */
export function searchDramaTitles(query: string): DramaTitleItem[] {
  const q = (query || '').trim().toLowerCase();
  if (!q) {
    // If empty, return popular ones first
    return POPULAR_DRAMA_TITLES;
  }

  const results = POPULAR_DRAMA_TITLES.filter(item => {
    const tEn = item.title.toLowerCase();
    const tKm = item.titleKm.toLowerCase();
    const tOrig = (item.originalTitle || '').toLowerCase();
    const cHandle = (item.channelHandle || '').toLowerCase();
    const cName = (item.channelName || '').toLowerCase();
    const desc = item.descriptionKm.toLowerCase();
    const tags = item.tags.map(t => t.toLowerCase());

    // Match if starts with or includes query
    return (
      tEn.includes(q) ||
      tKm.includes(q) ||
      tOrig.includes(q) ||
      cHandle.includes(q) ||
      cName.includes(q) ||
      desc.includes(q) ||
      tags.some(tag => tag.includes(q))
    );
  });

  // Sort: Items whose English title or original title starts with the query come first!
  results.sort((a, b) => {
    const aStarts = a.title.toLowerCase().startsWith(q) || (a.originalTitle && a.originalTitle.toLowerCase().startsWith(q));
    const bStarts = b.title.toLowerCase().startsWith(q) || (b.originalTitle && b.originalTitle.toLowerCase().startsWith(q));

    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;

    // Then sort by popularity
    if (a.isPopular && !b.isPopular) return -1;
    if (!a.isPopular && b.isPopular) return 1;

    return a.title.localeCompare(b.title);
  });

  return results;
}
