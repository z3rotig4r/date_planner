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
    // 네이버 지도의 경우 우리가 직접 만든 Serverless Proxy를 사용 (CORS 및 방어벽 우회)
    const apiUrl = type === 'map' && (url.includes('naver') || url.includes('naver.me'))
      ? `/.netlify/functions/scrape-naver?url=${encodeURIComponent(url)}`
      : `https://api.microlink.io/?url=${encodeURIComponent(url)}`;

    const response = await fetch(apiUrl);
    const result = await response.json();

    if (result.status === 'success' && result.data) {
      const { data } = result;
      
      // Microlink와 자체 API의 응답 형식을 통일하여 처리
      const isCustomApi = apiUrl.includes('scrape-naver');
      
      return {
        type,
        url,
        title: data.title || '',
        description: data.description || '',
        thumbnail: isCustomApi ? data.image : (data.image?.url || data.logo?.url),
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
