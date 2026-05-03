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

  console.log('[Preview] Processing:', url);

  try {
    // 1. Fast Cache Check
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
        cached.title === '상세 정보 보기' ||
        !cached.title
      );

      if (cached && !isGeneric) {
        console.log('[Preview] Cache Hit (Valid)');
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

    // 2. High-Speed Pin ID Extraction (No Redirect Wait)
    const extractPinId = (str: string) => {
      const decoded = decodeURIComponent(str);
      const match = decoded.match(/(?:pinId|id|place\/|placeId=)(\d+)/);
      return match ? match[1] : null;
    };

    let pinId = extractPinId(url);
    const isNaverMap = url.includes('naver.com') || url.includes('naver.me');

    // 3. Reliable Naver Map Extraction (Internal API First)
    if (isNaverMap && pinId) {
      console.log('[Preview] Naver Map detected, calling internal API for PinId:', pinId);
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

    // 4. Fallback for naver.me without Pin ID (Follow redirect ONLY if needed)
    if (isNaverMap && !title) {
      console.log('[Preview] Following redirect for Naver link...');
      try {
        const res = await fetch(url, {
          method: 'HEAD', // Faster than GET
          headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1' },
          redirect: 'follow',
        });
        const redirectedPinId = extractPinId(res.url);
        if (redirectedPinId && redirectedPinId !== pinId) {
          const apiRes = await fetch(`https://map.naver.com/v5/api/sites/summary/${redirectedPinId}?lang=ko`, {
            headers: { 'Referer': 'https://map.naver.com/' }
          });
          if (apiRes.ok) {
            const apiData = await apiRes.json();
            title = apiData.name || title;
            description = apiData.fullAddress || apiData.address || description;
            image = apiData.imageURL || image;
            siteName = 'Naver Map';
          }
        }
      } catch (e) {
        console.error('[Preview] Redirect flow failed');
      }
    }

    // 5. Microlink Fallback (Instagram / Others) - STRICT TIMEOUT
    if (!title) {
      console.log('[Preview] Calling Microlink...');
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 4000); // 4s strict timeout
        const microRes = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, { signal: controller.signal });
        clearTimeout(id);
        
        const microData = await microRes.json();
        if (microData.status === 'success') {
          title = microData.data.title || title;
          image = microData.data.image?.url || microData.data.logo?.url || image;
          description = microData.data.description || description;
          siteName = microData.data.publisher || siteName;
        }
      } catch (e) {
        console.log('[Preview] Microlink skipped (timeout or error)');
      }
    }

    // Final Post-Processing
    if (title) {
      title = title.replace(/\s*:\s*네이버\s*지도/i, '').trim();
      title = title.replace(/장소\s*-\s*/i, '').trim();
    }

    const finalData = {
      url,
      title: (title && !title.includes('네이버 지도')) ? title : '장소 상세 보기',
      description: description || '상세 정보를 확인하시려면 클릭하세요.',
      image: image || null,
      site_name: siteName || (isNaverMap ? 'Naver Map' : 'Link'),
    };

    // Async Cache Update
    if (supabase && finalData.title !== '장소 상세 보기') {
      supabase.from('link_preview_cache').upsert([finalData]).then();
    }

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600'
      },
      body: JSON.stringify({ status: 'success', data: finalData }),
    };

  } catch (error) {
    console.error('[Preview] Global Error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
