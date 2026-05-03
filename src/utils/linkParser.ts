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
  const naverMapRegex = /(https?:\/\/)?(map\.naver\.com|naver\.me)\/.+/i;
  const googleMapRegex = /(https?:\/\/)?(www\.)?(google\.com\/maps|goo\.gl\/maps)\/.+/i;

  if (instagramRegex.test(url)) return 'instagram';
  if (naverMapRegex.test(url) || googleMapRegex.test(url)) return 'map';
  if (url.startsWith('http')) return 'general';
  
  return 'unknown';
};

/**
 * CORS 에러를 회피하기 위해 클라이언트 사이드에서 도메인별 Mock 데이터를 반환
 * 실제 환경에서는 서버 사이드 Proxy(Vercel Functions, Supabase Edge Functions 등)를 통해 
 * 실제 OG 데이터를 크롤링해오는 로직으로 교체 가능합니다.
 */
export const mockFetchOpenGraph = async (url: string, type: LinkType): Promise<LinkMetadata> => {
  // 네트워크 지연 시뮬레이션 (Skeleton UI 확인용)
  await new Promise((resolve) => setTimeout(resolve, 1200));

  let hostname = '';
  try {
    hostname = new URL(url).hostname.replace('www.', '');
  } catch (e) {
    hostname = 'Link';
  }

  switch (type) {
    case 'instagram':
      const handle = url.split('instagram.com/')[1]?.split('/')[0] || 'insta_user';
      return {
        type,
        url,
        title: `@${handle} 님의 포스트`,
        description: '요즘 가장 핫한 데이트 명소를 인스타그램 게시물에서 확인해보세요.',
        thumbnail: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=300&q=80',
        siteName: 'Instagram',
      };
      
    case 'map':
      const isNaver = url.includes('naver');
      return {
        type,
        url,
        title: isNaver ? '네이버 지도 장소 정보' : 'Google 지도 위치 정보',
        description: '지도를 클릭하여 상세 위치와 가는 길, 방문자 리뷰를 확인하세요.',
        thumbnail: isNaver 
          ? 'https://images.unsplash.com/photo-1570160234854-dc211994ca4f?auto=format&fit=crop&w=300&q=80'
          : 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=300&q=80',
        siteName: isNaver ? 'Naver Map' : 'Google Maps',
      };
      
    case 'general':
      return {
        type,
        url,
        title: hostname,
        description: '공유된 웹사이트 링크입니다. 클릭하여 상세 내용을 확인하세요.',
        thumbnail: 'https://images.unsplash.com/photo-1436491865332-7a61a109c7d3?auto=format&fit=crop&w=300&q=80',
        siteName: hostname,
      };
      
    default:
      return {
        type: 'unknown',
        url,
        title: url,
      };
  }
};
