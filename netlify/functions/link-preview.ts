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

  // SSRF Protection
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Blocked URL' }) };
  }

  try {
    // 1. Cache Check
    if (supabase) {
      const { data: cached } = await supabase
        .from('link_previews')
        .select('*')
        .eq('url', url)
        .maybeSingle();

      if (cached && cached.title && cached.title !== '상세 정보 보기') {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ status: 'success', data: cached }),
        };
      }
    }

    let result = {
      url,
      title: '',
      description: '',
      image: '',
      site_name: '',
      type: 'og',
      raw: {}
    };

    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // 2. Domain-Specific Routing
    
    // 2-A. YouTube
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      const videoId = hostname.includes('youtu.be') 
        ? urlObj.pathname.substring(1) 
        : urlObj.searchParams.get('v');
      
      if (videoId) {
        result.type = 'youtube';
        result.title = 'YouTube 비디오';
        result.image = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        result.site_name = 'YouTube';
      }
    }

    // 2-B. Naver Map
    if (hostname.includes('naver.com') || hostname.includes('naver.me')) {
      const pinIdMatch = url.match(/(?:pinId|id|place\/|placeId=)(\d+)/);
      let pinId = pinIdMatch ? pinIdMatch[1] : null;

      if (!pinId && hostname.includes('naver.me')) {
        // Short URL redirect for PinId
        try {
          const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
          const redirectedPinIdMatch = res.url.match(/(?:pinId|id|place\/|placeId=)(\d+)/);
          pinId = redirectedPinIdMatch ? redirectedPinIdMatch[1] : null;
        } catch (e) {}
      }

      if (pinId) {
        try {
          const apiRes = await fetch(`https://map.naver.com/v5/api/sites/summary/${pinId}?lang=ko`, {
            headers: { 'Referer': 'https://map.naver.com/' }
          });
          if (apiRes.ok) {
            const apiData = await apiRes.json();
            result.type = 'naver';
            result.title = apiData.name || '';
            result.description = apiData.fullAddress || apiData.address || '';
            result.image = apiData.imageURL || (apiData.images && apiData.images[0]?.url) || '';
            result.site_name = 'Naver Map';
            result.raw = apiData;
          }
        } catch (e) {}
      }
    }

    // 3. General OG Parsing Fallback
    if (!result.title || !result.image) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const microRes = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, { signal: controller.signal });
        clearTimeout(timeout);
        
        const microData = await microRes.json();
        if (microData.status === 'success') {
          const d = microData.data;
          result.title = result.title || d.title || '';
          result.description = result.description || d.description || '';
          result.image = result.image || d.image?.url || d.logo?.url || '';
          result.site_name = result.site_name || d.publisher || '';
          result.type = 'og';
          result.raw = d;
        }
      } catch (e) {
        console.error('[Preview] Microlink failed');
      }
    }

    // 4. Ultimate Fallback
    if (!result.title) {
      result.title = hostname;
      result.description = url;
      result.image = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
      result.type = 'fallback';
    }

    // Post-Cleanup
    result.title = result.title.replace(/\s*:\s*네이버\s*지도/i, '').trim();
    result.title = result.title.replace(/장소\s*-\s*/i, '').trim();

    // 5. Save to Cache
    if (supabase && result.title && result.type !== 'fallback') {
      supabase.from('link_previews').upsert([result]).then();
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ status: 'success', data: result }),
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
