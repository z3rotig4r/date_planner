import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Supabase client for caching
// Note: Netlify functions have access to all environment variables.
// We use VITE_ prefix as they are already set in the environment.
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export const handler: Handler = async (event) => {
  const url = event.queryStringParameters?.url;
  
  if (!url) {
    return { 
      statusCode: 400, 
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'URL is required' }) 
    };
  }

  // SSRF Protection
  if (url.includes('localhost') || url.includes('127.0.0.1') || url.startsWith('192.168.') || url.startsWith('10.')) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Invalid URL' }) };
  }

  try {
    // 1. Check Supabase Cache first
    try {
      const { data: cached } = await supabase
        .from('link_preview_cache')
        .select('*')
        .eq('url', url)
        .maybeSingle();

      if (cached) {
        console.log('[Preview] Cache Hit:', url);
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ status: 'success', data: cached }),
        };
      }
    } catch (cacheErr) {
      console.error('[Preview] Cache lookup error:', cacheErr);
    }

    let title = '';
    let image = '';
    let description = '';
    let siteName = '';
    let finalUrl = url;

    // 2. Follow redirects and identify service
    const initialRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
      },
      redirect: 'follow',
    });
    finalUrl = initialRes.url;
    const isNaverMap = finalUrl.includes('naver.com') || finalUrl.includes('naver.me');

    // 3. Specialized Logic for Naver Map
    if (isNaverMap) {
      const pinIdMatch = finalUrl.match(/(?:pinId|id|place\/)(\d+)/);
      const pinId = pinIdMatch ? pinIdMatch[1] : null;

      if (pinId) {
        try {
          const apiRes = await fetch(`https://map.naver.com/v5/api/sites/summary/${pinId}?lang=ko`, {
            headers: { 'Referer': 'https://map.naver.com/' }
          });
          if (apiRes.ok) {
            const apiData = await apiRes.json();
            title = apiData.name || '';
            description = apiData.fullAddress || apiData.address || '';
            image = apiData.imageURL || (apiData.images && apiData.images[0]?.url) || '';
            siteName = 'Naver Map';
          }
        } catch (e) {
          console.error('[Preview] Naver API error:', e);
        }
      }
    }

    // 4. Fallback: Use Microlink API (Highly reliable for Instagram and others)
    if (!title || !image) {
      console.log('[Preview] Using Microlink fallback for:', finalUrl);
      try {
        const microRes = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(finalUrl)}`);
        const microData = await microRes.json();
        
        if (microData.status === 'success') {
          const d = microData.data;
          title = title || d.title || '';
          description = description || d.description || '';
          image = image || d.image?.url || d.logo?.url || '';
          siteName = siteName || d.publisher || d.author || '';
        }
      } catch (e) {
        console.error('[Preview] Microlink error:', e);
      }
    }

    // 5. Last Resort: Simple Regex on initial fetch result (if not done yet)
    if (!title) {
      const html = await initialRes.text();
      const extractMeta = (pattern: string) => {
        const regex = new RegExp(`<meta\\s+(?:property|name)=["']${pattern}["']\\s+content=["']([^"']+)["']`, 'i');
        const match = html.match(regex);
        return match ? match[1] : null;
      };
      title = extractMeta('og:title') || '';
      if (!title) {
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        title = titleMatch ? titleMatch[1] : '';
      }
      image = image || extractMeta('og:image') || '';
      description = description || extractMeta('og:description') || '';
    }

    // Clean up
    if (title.includes('네이버 지도')) title = title.replace(/\s*:\s*네이버\s*지도/i, '').trim();
    if (image.includes('og-map-400x200.png')) image = '';

    const previewData = {
      url,
      title: title || '상세 정보 보기',
      description: description || '링크를 클릭하여 상세 내용을 확인하세요.',
      image: image || null,
      site_name: siteName || (isNaverMap ? 'Naver Map' : '웹사이트'),
    };

    // 6. Async Cache update
    if (title && title !== '상세 정보 보기') {
      supabase.from('link_preview_cache').upsert([previewData]).then(({ error }) => {
        if (error) console.error('[Preview] Cache upsert error:', error);
      });
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
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to fetch preview' }),
    };
  }
};
