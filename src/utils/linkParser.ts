export type LinkType = 'instagram' | 'map' | 'general' | 'unknown';

export interface LinkMetadata {
  type: LinkType;
  title: string;
  description?: string;
  thumbnail?: string;
  siteName?: string;
  url: string;
}

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
 * Microlink API를 사용하여 실제 OpenGraph 데이터를 페칭합니다.
 * 클라이언트 사이드 CORS 에러를 우회하는 무료 프록시 서비스입니다.
 */
export const fetchRealOpenGraph = async (url: string): Promise<LinkMetadata> => {
  const type = getLinkType(url);
  
  try {
    const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
    const result = await response.json();

    if (result.status === 'success' && result.data) {
      const { data } = result;
      return {
        type,
        url,
        title: data.title || '',
        description: data.description || '',
        thumbnail: data.image?.url || data.logo?.url || undefined,
        siteName: data.publisher || data.author || undefined,
      };
    }
  } catch (error) {
    console.error('[LinkParser] Failed to fetch metadata:', error);
  }

  // 실패 시 기본값 반환
  return {
    type,
    url,
    title: '',
  };
};
