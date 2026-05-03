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
    console.log('[Scraper] Fetching URL:', url);

    // 1. Fetch with a real browser User-Agent
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      redirect: 'follow',
    });

    const finalUrl = response.url;
    const html = await response.text();
    console.log('[Scraper] Final Redirected URL:', finalUrl);

    // 2. Data Extraction helper
    const extractOg = (property: string) => {
      // Handles both property="og:title" and name="og:title"
      const regex = new RegExp(`<meta\\s+(?:property|name)=["']og:${property}["']\\s+content=["']([^"']+)["']`, 'i');
      const match = html.match(regex);
      return match ? match[1] : null;
    };

    let title = extractOg('title');
    let image = extractOg('image');
    let description = extractOg('description');

    // 3. Special Handling for Naver Map (Internal JSON State)
    // Naver Map results often don't have OG tags on the initial landing page if it's a dynamic redirect
    if (!title || title.includes('네이버 지도') || !image) {
      // Search for window.__INITIAL_STATE__ or similar JSON data
      const stateRegex = /window\.__INITIAL_STATE__\s*=\s*({.+?});\s*<\/script>/i;
      const stateMatch = html.match(stateRegex);
      
      if (stateMatch) {
        try {
          const state = JSON.parse(stateMatch[1]);
          console.log('[Scraper] Found INITIAL_STATE');
          
          // Naver Map Mobile/Desktop state traversal
          const place = state.place?.detail || state.place || {};
          title = place.name || place.title || title;
          image = place.thumUrl || (place.images && place.images[0]?.url) || image;
          description = place.address || place.roadAddress || description;
        } catch (e) {
          console.log('[Scraper] Failed to parse INITIAL_STATE');
        }
      }
    }

    // 4. Fallback for title (Remove " : 네이버 지도" suffix)
    if (title) {
      title = title.replace(/\s*:\s*네이버\s*지도/i, '').trim();
    }

    // 5. If it's a Naver Search URL instead of Map, try to extract from the query
    if (!title && finalUrl.includes('search.naver.com')) {
      const urlObj = new URL(finalUrl);
      title = urlObj.searchParams.get('query') || '네이버 검색';
    }

    console.log('[Scraper] Result:', { title, hasImage: !!image });

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
