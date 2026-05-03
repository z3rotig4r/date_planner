export type LinkType = 'instagram' | 'map' | 'general' | 'unknown';

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

  if (instagramRegex.test(url)) return 'instagram';
  if (naverMapRegex.test(url) || googleMapRegex.test(url)) return 'map';
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

  // 1. 캐시 확인
  if (apiCache.has(cacheKey)) {
    return apiCache.get(cacheKey)!;
  }
  
  try {
    let resultData: LinkMetadata | null = null;

    // 2. 네이버/구글 지도의 경우 자체 네이버 검색 API 사용 (Hybrid Static Rendering)
    if (type === 'map' && activityTitle) {
      const response = await fetch(`/.netlify/functions/naver-search?query=${encodeURIComponent(activityTitle)}`);
      const result = await response.json();
      
      if (result.status === 'success' && result.data) {
        resultData = {
          type,
          url,
          title: result.data.title,
          description: result.data.address || '상세 위치 정보를 확인하세요.',
          thumbnail: result.data.imageUrl,
          siteName: result.data.publisher,
          category: result.data.category,
        };
      }
    } 
    
    // 3. 인스타그램 및 일반 링크는 Microlink API 사용
    if (!resultData) {
      const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
      const result = await response.json();

      if (result.status === 'success' && result.data) {
        const { data } = result;
        resultData = {
          type,
          url,
          title: data.title || '',
          description: data.description || '',
          thumbnail: data.image?.url || data.logo?.url || undefined,
          siteName: data.publisher || data.author || undefined,
        };
      }
    }

    if (resultData) {
      apiCache.set(cacheKey, resultData);
      return resultData;
    }
  } catch (error) {
    console.error('[LinkParser] Failed to fetch metadata:', error);
  }

  // 실패 시 기본값
  return { type, url, title: '' };
};
