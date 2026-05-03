import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  console.log('[NaverSearch] Function triggered');
  const query = event.queryStringParameters?.query;

  // Netlify environments use process.env
  const clientId = process.env.VITE_NAVER_CLIENT_ID;
  const clientSecret = process.env.VITE_NAVER_CLIENT_SECRET;

  console.log('[NaverSearch] Query:', query);
  console.log('[NaverSearch] API Key presence:', { 
    clientId: !!clientId, 
    clientSecret: !!clientSecret 
  });

  if (!query) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Query is required' }) };
  }

  if (!clientId || !clientSecret) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'Naver API keys are missing in server environment' }) 
    };
  }

  try {
    // 1. 지역 검색 API (Place Info)
    const localRes = await fetch(
      `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=1`,
      {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
      }
    );
    const localData = await localRes.json();
    const place = localData.items?.[0];

    // 2. 이미지 검색 API (Thumbnail)
    const imageRes = await fetch(
      `https://openapi.naver.com/v1/search/image?query=${encodeURIComponent(query)}&display=1&sort=sim`,
      {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
      }
    );
    const imageData = await imageRes.json();
    const image = imageData.items?.[0]?.link;

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'success',
        data: {
          title: place?.title?.replace(/<[^>]*>?/gm, '') || query,
          address: place?.address || place?.roadAddress || '',
          category: place?.category || '장소',
          imageUrl: image || null,
          publisher: 'Naver Search',
        },
      }),
    };
  } catch (error) {
    console.error('[NaverSearch] Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch from Naver API' }),
    };
  }
};
