import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  const url = event.queryStringParameters?.url;

  if (!url) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'URL parameter is missing' }),
    };
  }

  try {
    console.log('[Scraper] Original URL:', url);

    // 1. Detect Pin ID and convert to a scrape-friendly URL
    // Many mobile links lead to "bridge" pages (appLink.naver) which lack metadata.
    let targetUrl = url;
    const pinIdMatch = url.match(/(?:pinId|id)=(\d+)/);
    const isMobileBridge = url.includes('m.map.naver.com') || url.includes('appLink.naver');

    if (pinIdMatch && isMobileBridge) {
      const pinId = pinIdMatch[1];
      // PC place pages are much richer in metadata (OG tags + INITIAL_STATE)
      targetUrl = `https://pcmap.place.naver.com/place/${pinId}/home`;
      console.log('[Scraper] Detected PinID, switching to PC URL:', targetUrl);
    }

    // 2. Fetch the target URL
    const response = await fetch(targetUrl, {
      headers: {
        // Using a Desktop User-Agent for the PC place page to get better OG tags
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      redirect: 'follow',
    });

    const finalUrl = response.url;
    const html = await response.text();
    console.log('[Scraper] Final Fetched URL:', finalUrl);

    // 3. Data Extraction (OG Tags)
    const extractOg = (property: string) => {
      const regex = new RegExp(`<meta\\s+(?:property|name)=["']og:${property}["']\\s+content=["']([^"']+)["']`, 'i');
      const match = html.match(regex);
      return match ? match[1] : null;
    };

    let title = extractOg('title');
    let image = extractOg('image');
    let description = extractOg('description');

    // 4. Advanced Extraction: window.__INITIAL_STATE__
    // This is where Naver hides high-res photos and specific place names
    if (!title || title === '네이버 지도' || !image || image.includes('og-map-400x200.png')) {
      const stateRegex = /window\.__INITIAL_STATE__\s*=\s*({.+?});\s*<\/script>/i;
      const stateMatch = html.match(stateRegex);
      
      if (stateMatch) {
        try {
          const state = JSON.parse(stateMatch[1]);
          console.log('[Scraper] Found INITIAL_STATE JSON');
          
          // Structure varies between types, but 'base' usually contains the core info
          const base = state.place?.base || state.place?.detail || state.place || {};
          title = base.name || base.title || title;
          description = base.address || base.roadAddress || base.category || description;
          
          // Image fallback hierarchy
          image = base.thumUrl || (base.images && base.images[0]?.url) || (base.image && base.image[0]?.url) || image;
        } catch (e) {
          console.log('[Scraper] Failed to parse INITIAL_STATE');
        }
      }
    }

    // 5. Cleanup and Fallbacks
    if (title) {
      // Remove annoying " : 네이버 지도" suffix often present in OG tags
      title = title.replace(/\s*:\s*네이버\s*지도/i, '').trim();
    }

    // Filter out the generic Naver Map placeholder image
    if (image && image.includes('og-map-400x200.png')) {
      image = null;
    }

    console.log('[Scraper] Success:', { title, hasImage: !!image });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'success',
        data: {
          title: title || '장소 정보',
          image: image || null,
          description: description || '네이버 지도에서 상세 정보를 확인하세요.',
          publisher: 'Naver Map',
          url: finalUrl
        },
      }),
    };
  } catch (error) {
    console.error('[Scraper] Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to scrape the URL' }),
    };
  }
};
