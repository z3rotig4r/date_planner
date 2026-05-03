export type LinkType = 'instagram' | 'map' | 'general' | 'unknown';

export interface LinkMetadata {
  type: LinkType;
  title: string;
  description?: string;
  thumbnail?: string;
  siteName?: string;
  url: string;
}

export const getLinkType = (url: string): LinkType => {
  if (!url) return 'unknown';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('naver.com') && (url.includes('map') || url.includes('naver.me'))) return 'map';
  if (url.includes('google.com/maps') || url.includes('goo.gl/maps')) return 'map';
  if (url.startsWith('http')) return 'general';
  return 'unknown';
};

export const mockFetchOpenGraph = async (url: string, type: LinkType): Promise<LinkMetadata> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch (e) {
    hostname = url;
  }

  switch (type) {
    case 'instagram':
      const username = url.split('instagram.com/')[1]?.split('/')[0] || '데이트코스';
      return {
        type,
        url,
        title: `@${username} 님의 게시물`,
        description: '인스타그램에서 핫플 정보를 확인해보세요. #데이트코스 #맛집추천 #럽스타그램',
        thumbnail: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=300&q=80',
        siteName: 'Instagram',
      };
    case 'map':
      const isNaver = url.includes('naver');
      return {
        type,
        url,
        title: url.includes('garaku') ? '스프카레 가라쿠 (Soup Curry Garaku)' : '지도에서 장소 보기',
        description: '상세 위치와 방문객 리뷰를 확인해보세요.',
        // Use a more reliable travel-themed placeholder if it's a generic map link
        thumbnail: url.includes('garaku') 
          ? 'https://images.unsplash.com/photo-1598514983318-2f64f8f4796c?auto=format&fit=crop&w=300&q=80'
          : 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=300&q=80',
        siteName: isNaver ? 'Naver Map' : 'Google Maps',
      };
    case 'general':
      return {
        type,
        url,
        title: hostname,
        description: '이 링크의 상세 내용을 웹사이트에서 직접 확인해보세요.',
        thumbnail: 'https://images.unsplash.com/photo-1436491865332-7a61a109c7d3?auto=format&fit=crop&w=300&q=80',
        siteName: hostname,
      };
    default:
      return {
        type: 'unknown',
        url,
        title: hostname || url,
      };
  }
};
