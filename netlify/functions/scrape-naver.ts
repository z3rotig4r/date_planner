import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  const url = event.queryStringParameters?.url;
  const clientId = process.env.VITE_NAVER_CLIENT_ID;
  const clientSecret = process.env.VITE_NAVER_CLIENT_SECRET;

  if (!url) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'URL parameter is missing' }),
    };
  }

  try {
    console.log('[Scraper] URL:', url);

    // 1. Extract Pin ID
    const pinIdMatch = url.match(/(?:pinId|id|place\/)(\d+)/);
    const pinId = pinIdMatch ? pinIdMatch[1] : null;

    let title = '';
    let image = '';
    let description = '';

    // 2. Strategy: Try Scraping first
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        },
        redirect: 'follow',
      });
      const html = await response.text();
      
      const extractOg = (prop: string) => {
        const regex = new RegExp(`<meta\\s+(?:property|name)=["']og:${prop}["']\\s+content=["']([^"']+)["']`, 'i');
        const match = html.match(regex);
        return match ? match[1] : null;
      };

      title = extractOg('title') || '';
      image = extractOg('image') || '';
      description = extractOg('description') || '';

      // Clean up generic titles
      if (title.includes('네이버 지도') || title === '장소 정보') title = '';
      if (image.includes('og-map-400x200.png')) image = '';
    } catch (e) {
      console.log('[Scraper] Direct scrape failed');
    }

    // 3. Fallback: Use Naver Search API if we have a Pin ID but no data
    // This is much more reliable as it's an official API
    if (pinId && (!title || !image) && clientId && clientSecret) {
      console.log('[Scraper] Fallback to Search API for PinID:', pinId);
      
      // We can search by ID in some cases, but a keyword search with the original URL title 
      // or just fetching the place info via Search API is better.
      // Since we don't have the name yet, we'll try to find it in the HTML again or use the PinID
      
      // For now, let's try a trick: if title is still empty, try to get it from the page title tag
      // which is usually more reliable than OG tags on Naver Map
      if (!title) {
        // Find title via fetch again or regex
      }

      // If we still have nothing, we might need to search by the ID specifically if possible, 
      // but Naver Search API usually takes queries.
    }

    // 4. Ultimate Fallback: Re-fetch with specialized Place API URL
    if (pinId && (!title || !image)) {
      console.log('[Scraper] Trying specialized Place API endpoint');
      const apiResponse = await fetch(`https://map.naver.com/v5/api/sites/summary/${pinId}?lang=ko`);
      if (apiResponse.ok) {
        const data = await apiResponse.json();
        title = data.name || title;
        description = data.fullAddress || data.address || description;
        image = data.imageURL || (data.images && data.images[0]?.url) || image;
        console.log('[Scraper] Success via Place API:', title);
      }
    }

    // Clean title suffix
    title = title.replace(/\s*:\s*네이버\s*지도/i, '').trim();

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
          url: url
        },
      }),
    };
  } catch (error) {
    console.error('[Scraper] Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to extract information' }),
    };
  }
};
