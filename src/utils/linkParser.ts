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

  switch (type) {
    case 'instagram':
      return {
        type,
        url,
        title: 'sapporo_traveler님의 게시물',
        description: '삿포로의 밤거리는 언제나 아름답네요... #삿포로 #스스키노 #여행',
        thumbnail: 'https://images.unsplash.com/photo-1542044896530-05d85be9b11a?auto=format&fit=crop&w=300&q=80',
        siteName: 'Instagram',
      };
    case 'map':
      return {
        type,
        url,
        title: url.includes('garaku') ? '스프카레 가라쿠 (Soup Curry Garaku)' : '삿포로 TV 타워',
        description: '홋카이도 삿포로시 주오구 미나미 2조 니시 2초메 6-1',
        thumbnail: url.includes('garaku') 
          ? 'https://images.unsplash.com/photo-1598514983318-2f64f8f4796c?auto=format&fit=crop&w=300&q=80'
          : 'https://images.unsplash.com/photo-1570160234854-dc211994ca4f?auto=format&fit=crop&w=300&q=80',
        siteName: url.includes('naver') ? 'Naver Map' : 'Google Maps',
      };
    case 'general':
      return {
        type,
        url,
        title: '신치토세 공항 공식 홈페이지',
        description: '홋카이도의 하늘길, 신치토세 공항에 오신 것을 환영합니다.',
        thumbnail: 'https://images.unsplash.com/photo-1436491865332-7a61a109c7d3?auto=format&fit=crop&w=300&q=80',
        siteName: 'New Chitose Airport',
      };
    default:
      return {
        type: 'unknown',
        url,
        title: url,
      };
  }
};
