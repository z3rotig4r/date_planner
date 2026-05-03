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
    // 1. Fetch the target URL (automatically follows redirects like naver.me)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
      },
    });

    const html = await response.text();

    // 2. Data Extraction via Regex (To avoid heavy dependencies in Lambda)
    const extractOg = (property: string) => {
      const regex = new RegExp(`<meta\\s+(?:property|name)=["']og:${property}["']\\s+content=["']([^"']+)["']`, 'i');
      const match = html.match(regex);
      return match ? match[1] : null;
    };

    let title = extractOg('title');
    let image = extractOg('image');
    let description = extractOg('description');

    // 3. Fallback: Parse Hydration State (window.__INITIAL_STATE__)
    // Naver Maps often hides data inside JSON strings in script tags
    if (!title || !image) {
      const stateRegex = /window\.__INITIAL_STATE__\s*=\s*({.+?});\s*<\/script>/i;
      const stateMatch = html.match(stateRegex);
      
      if (stateMatch) {
        try {
          const state = JSON.parse(stateMatch[1]);
          // Attempt to find place data in the complex state object
          // Note: Structure varies, this is a best-effort traversal
          const placeInfo = state.place?.detail || state.place || {};
          title = title || placeInfo.name || placeInfo.title;
          description = description || placeInfo.address || placeInfo.description;
          image = image || placeInfo.thumUrl || (placeInfo.images && placeInfo.images[0]?.url);
        } catch (e) {
          console.error('Failed to parse INITIAL_STATE JSON');
        }
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'success',
        data: {
          title: title || '네이버 지도 장소',
          image: image || null,
          description: description || '네이버 지도에서 상세 정보를 확인하세요.',
          publisher: 'Naver Map',
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
