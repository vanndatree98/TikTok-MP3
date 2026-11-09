import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export type SupportedLanguageCode = 'km' | 'en' | 'zh' | 'th' | 'ko' | 'tl';

export const LANGUAGE_NAMES: Record<SupportedLanguageCode, { km: string; en: string; flag: string }> = {
  km: { km: 'ភាសាខ្មែរ', en: 'Khmer', flag: '🇰🇭' },
  en: { km: 'ភាសាអង់គ្លេស', en: 'English', flag: '🇬🇧' },
  zh: { km: 'ភាសាចិន', en: 'Chinese', flag: '🇨🇳' },
  th: { km: 'ភាសាថៃ', en: 'Thai', flag: '🇹🇭' },
  ko: { km: 'ភាសាកូរ៉េ', en: 'Korean', flag: '🇰🇷' },
  tl: { km: 'ភាសាហ្វីលីពីន (Tagalog)', en: 'Filipino', flag: '🇵🇭' },
};

// Fallback dictionary for common drama terms and words if external service is unavailable
const DICTIONARY_MAP: Record<string, Partial<Record<SupportedLanguageCode, string>>> = {
  '短剧': { km: 'រឿងខ្លី', en: 'Short Drama', zh: '短剧', th: 'ละครสั้น', ko: '숏드라마', tl: 'Maikling Drama' },
  '剧集': { km: 'ភាគរឿង', en: 'Series', zh: '剧集', th: 'ซีรีส์', ko: '시리즈', tl: 'Serye' },
  '第': { km: 'ភាគទី', en: 'Ep', zh: '第', th: 'ตอนที่', ko: '제', tl: 'Kabanata' },
  '集': { km: 'ភាគ', en: 'Ep', zh: '集', th: 'ตอน', ko: '화', tl: 'Kabanata' },
  '全集': { km: 'គ្រប់ភាគទាំងអស់', en: 'Full Episodes', zh: '全集', th: 'จบครบทุกตอน', ko: '전편', tl: 'Buong Serye' },
  '霸道总裁': { km: 'មហាសេដ្ឋីផ្តាច់ការ', en: 'Dominant CEO', zh: '霸道总裁', th: 'ซีอีโอจอมเผด็จการ', ko: '패도총재', tl: 'Makapangyarihang CEO' },
  '逆袭': { km: 'ការវាយបកផ្លាស់ប្តូរជីវិត', en: 'Comeback / Counterattack', zh: '逆袭', th: 'การกลับมาทวงคืน', ko: '역습', tl: 'Paghihiganti / Pagbangon' },
  '重生': { km: 'ចាប់កំណើតសារជាថ្មី', en: 'Rebirth', zh: '重生', th: 'การเกิดใหม่', ko: '환생', tl: 'Muling Pagsilang' },
  '甜宠': { km: 'ស្នេហាផ្អែមល្ហែម', en: 'Sweet Romance', zh: '甜宠', th: 'รักหวานแหวว', ko: '달콤한 로맨스', tl: 'Matamis na Pag-ibig' },
  '战神': { km: 'ស្តេចសឹក / ទេពចម្បាំង', en: 'God of War', zh: '战神', th: 'เทพสงคราม', ko: '전신', tl: 'Diyos ng Digmaan' },
};

export async function handleTranslateRequest(req: Request, res: Response) {
  try {
    const { text, targetLang = 'km' } = req.body as { text?: string; targetLang?: SupportedLanguageCode };

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text to translate is required' });
    }

    const cleanText = text.trim();
    const target = (targetLang && LANGUAGE_NAMES[targetLang] ? targetLang : 'km') as SupportedLanguageCode;

    // 1. Try Gemini API with candidate models ('gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite')
    const ai = getGenAI();
    if (ai) {
      const langPromptName = {
        km: 'Khmer (ភាសាខ្មែរ)',
        en: 'English',
        zh: 'Simplified Chinese (简体中文)',
        th: 'Thai (ภาษาไทย)',
        ko: 'Korean (한국어)',
        tl: 'Filipino / Tagalog (Wikang Filipino)',
      }[target];

      const prompt = `You are a professional film, movie, and short drama title localization translator.
Translate the following short drama / video title into ${langPromptName}.
Rules:
- Translate faithfully and naturally for dramatic entertainment titles.
- Preserve proper nouns, numbers, episode markers accurately.
- Return ONLY the final translated title string without quotation marks, markdown, explanations, or notes.

Title to translate:
"${cleanText}"`;

      const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];

      for (const modelName of candidateModels) {
        try {
          const aiPromise = ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              temperature: 0.2,
              maxOutputTokens: 120,
            },
          });

          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 4500)
          );

          const response = await Promise.race([aiPromise, timeoutPromise]);
          const translatedText = response && response.text ? response.text.trim().replace(/^["']|["']$/g, '') : '';
          if (translatedText) {
            return res.status(200).json({
              originalText: cleanText,
              translatedText,
              targetLang: target,
              targetLangName: LANGUAGE_NAMES[target],
              provider: 'gemini',
            });
          }
        } catch {
          // Model busy (e.g. 503 spike in demand) or timed out - silently try next candidate
          continue;
        }
      }
    }

    // 2. Fallback to Google Translate public endpoints via fetch
    const gLangMap: Record<SupportedLanguageCode, string> = {
      km: 'km',
      en: 'en',
      zh: 'zh-CN',
      th: 'th',
      ko: 'ko',
      tl: 'tl',
    };
    const gTarget = gLangMap[target] || 'km';

    // Primary GT endpoint
    try {
      const gtUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
        gTarget
      )}&dt=t&q=${encodeURIComponent(cleanText)}`;

      const response = await fetch(gtUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && Array.isArray(data[0])) {
          const translatedParts = data[0].map((item: any) => (item && item[0] ? item[0] : '')).join('');
          if (translatedParts && translatedParts.trim()) {
            return res.status(200).json({
              originalText: cleanText,
              translatedText: translatedParts.trim(),
              targetLang: target,
              targetLangName: LANGUAGE_NAMES[target],
              provider: 'google-translate',
            });
          }
        }
      }
    } catch {
      // Continue to secondary endpoint or dictionary
    }

    // Secondary GT endpoint
    try {
      const secondaryUrl = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=${encodeURIComponent(
        gTarget
      )}&q=${encodeURIComponent(cleanText)}`;

      const response = await fetch(secondaryUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const textResult = Array.isArray(data) ? (typeof data[0] === 'string' ? data[0] : data[0]?.[0]) : (typeof data === 'string' ? data : '');
        if (textResult && typeof textResult === 'string' && textResult.trim()) {
          return res.status(200).json({
            originalText: cleanText,
            translatedText: textResult.trim(),
            targetLang: target,
            targetLangName: LANGUAGE_NAMES[target],
            provider: 'fast-translate',
          });
        }
      }
    } catch {
      // Continue to dictionary fallback
    }

    // 3. Dictionary-based rule fallback
    let fallbackText = cleanText;
    for (const [key, translations] of Object.entries(DICTIONARY_MAP)) {
      if (cleanText.includes(key) && translations[target]) {
        fallbackText = fallbackText.replace(new RegExp(key, 'g'), translations[target]!);
      }
    }

    return res.status(200).json({
      originalText: cleanText,
      translatedText: fallbackText || cleanText,
      targetLang: target,
      targetLangName: LANGUAGE_NAMES[target],
      provider: 'dictionary-fallback',
    });
  } catch {
    // Ultimate fallback ensuring 200 response
    const textFallback = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const targetLang = req.body?.targetLang || 'km';
    return res.status(200).json({
      originalText: textFallback,
      translatedText: textFallback,
      targetLang,
      targetLangName: LANGUAGE_NAMES[targetLang as SupportedLanguageCode] || { km: 'ភាសាខ្មែរ', en: 'Khmer', flag: '🇰🇭' },
      provider: 'direct-fallback',
    });
  }
}
