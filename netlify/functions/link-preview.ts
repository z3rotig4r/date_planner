import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export const handler: Handler = async (event) => {
  const url = event.queryStringParameters?.url;
  
  if (!url) {
    return { 
      statusCode: 400, 
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'URL is required' }) 
    };
  }

  try {
    // 1. Check Supabase Cache
    if (supabase) {
      const { data: cached } = await supabase
        .from('link_preview_cache')
        .select('*')
        .eq('url', url)
        .maybeSingle();

      const isGeneric = cached && (
        cached.title.includes('네이버지도') || 
        cached.title === '장소 정보' || 
        cached.title === '네이버 지도' ||
        cached.title === '상세 정보 보기'
      );

      if (cached && !isGeneric) {
        console.log('[Preview] Cache Hit (Valid):', url);
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ status: 'success', data: cached }),
        };
      }
    }

    let title = '';
    let image = '';
    let description = '';
    let siteName = '';

    // 2. Pre-extract Pin ID from URL (even before redirect)
    // Mobile links like naver.me/XXXX might not have it, but bridge links do.
    const extractPinId = (str: string) => {
      const match = str.match(/(?:pinId|id|place\/|placeId=)(\d+)/);
      return match ? match[1] : null;
    };

    let pinId = extractPinId(url);
    let isNaver = url.includes('naver.com') || url.includes('naver.me');

    // 3. Follow Redirect if no Pin ID or if it's a short link
    if (!pinId || url.includes('naver.me')) {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1' },
          redirect: 'follow',
        });
        const finalUrl = res.url;
        pinId = pinId || extractPinId(finalUrl);
        isNaver = isNaver || finalUrl.includes('naver.com');
      } catch (e) {
        console.error('[Preview] Redirect fetch failed');
      }
    }

    // 4. Specialized Logic for Naver Map
    if (isNaver && pinId) {
      console.log('[Preview] Attempting Naver Internal API for PinId:', pinId);
      try {
        const apiRes = await fetch(`https://map.naver.com/v5/api/sites/summary/${pinId}?lang=ko`, {
          headers: {
            'Referer': 'https://map.naver.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
          }
        });
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          title = apiData.name || '';
          description = apiData.fullAddress || apiData.address || apiData.category || '';
          image = apiData.imageURL || (apiData.images && apiData.images[0]?.url) || '';
          siteName = 'Naver Map';
        }
      } catch (e) {
        console.error('[Preview] Naver Internal API failed');
      }
    }

    // 5. Fallback: Microlink API (Limit to 5s to prevent Netlify timeout)
    if (!title || title.includes('네이버') || !image) {
      console.log('[Preview] Falling back to Microlink...');
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        
        const microRes = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, { signal: controller.signal });
        clearTimeout(timeout);
        
        const microData = await microRes.json();
        if (microData.status === 'success') {
          const d = microData.data;
          title = (!title || title.includes('네이버')) ? d.title : title;
          description = description || d.description;
          image = image || d.image?.url || d.logo?.url;
          siteName = siteName || d.publisher || d.author;
        }
      } catch (e) {
        console.error('[Preview] Microlink fallback failed or timed out');
      }
    }

    // Final cleanup
    if (title) {
      title = title.replace(/\s*:\s*네이버\s*지도/i, '').trim();
      title = title.replace(/장소\s*-\s*/i, '').trim();
    }

    const previewData = {
      url,
      title: (title && !title.includes('네이버 지도')) ? title : '상세 정보 보기',
      description: description || '링크를 클릭하여 상세 내용을 확인하세요.',
      image: image || null,
      site_name: siteName || (isNaver ? 'Naver Map' : '웹사이트'),
    };

    // Cache update
    if (supabase && previewData.title !== '상세 정보 보기' && !previewData.title.includes('네이버 지도')) {
      supabase.from('link_preview_cache').upsert([previewData]).then();
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ status: 'success', data: previewData }),
    };

  } catch (error) {
    console.error('[Preview] Global Error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch preview' }),
    };
  }
};
