export type LinkType = 'instagram' | 'map' | 'youtube' | 'general' | 'unknown';

export interface LinkMetadata {
  type: LinkType;
  url: string;
  title: string;
  description?: string;
  thumbnail?: string;
  siteName?: string;
  category?: string;
}

// Simple in-memory cache to save API quota
const apiCache = new Map<string, LinkMetadata>();

/**
 * 도메인을 분석하여 링크 타입을 식별하는 정규식 기반 유틸리티
 */
export const getLinkType = (url: string): LinkType => {
  if (!url) return 'unknown';
  
  const instagramRegex = /(https?:\/\/)?(www\.)?instagram\.com\/.+/i;
  const naverMapRegex = /(https?:\/\/)?(map\.naver\.com|naver\.me|n\.news\.naver\.com)\/.+/i;
  const googleMapRegex = /(https?:\/\/)?(www\.)?(google\.com\/maps|goo\.gl\/maps)\/.+/i;
  const youtubeRegex = /(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i;

  if (instagramRegex.test(url)) return 'instagram';
  if (naverMapRegex.test(url) || googleMapRegex.test(url)) return 'map';
  if (youtubeRegex.test(url)) return 'youtube';
  if (url.startsWith('http')) return 'general';
  
  return 'unknown';
};

/**
 * Microlink API 또는 Naver Search API를 사용하여 실제 데이터를 페칭합니다.
 * @param url 원본 링크 URL
 * @param activityTitle 장소명 (네이버 검색 쿼리로 사용)
 */
export const fetchRealOpenGraph = async (url: string, activityTitle?: string): Promise<LinkMetadata> => {
  const type = getLinkType(url);
  const cacheKey = `${type}:${url}:${activityTitle || ''}`;

  // 1. In-memory Cache check
  if (apiCache.has(cacheKey)) {
    return apiCache.get(cacheKey)!;
  }

  try {
    // 2. Use unified production preview endpoint (Netlify Function)
    const response = await fetch(`/.netlify/functions/link-preview?url=${encodeURIComponent(url)}`);
    const result = await response.json();

    if (result.status === 'success' && result.data) {
      const { data } = result;
      const resultData: LinkMetadata = {
        type,
        url,
        title: data.title || activityTitle || '',
        description: data.description,
        thumbnail: data.image,
        siteName: data.site_name,
      };

      apiCache.set(cacheKey, resultData);
      return resultData;
    }
  } catch (error) {
    console.error('[LinkParser] Failed to fetch metadata:', error);
  }

  // Fallback
  return { type, url, title: activityTitle || '' };
};
