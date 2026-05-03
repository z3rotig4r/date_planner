import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Netlify Functions environment variable check
// VITE_ is typically for client-side, Netlify UI usually sets them without prefix or as provided.
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export const handler: Handler = async (event) => {
  const url = event.queryStringParameters?.url;
  
  console.log('[Preview] Request received for URL:', url);
  console.log('[Preview] Supabase Client Status:', !!supabase);

  if (!url) {
    return { 
      statusCode: 400, 
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'URL is required' }) 
    };
  }

  // SSRF Protection
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Invalid URL' }) };
  }

  try {
    // 1. Check Supabase Cache first
    if (supabase) {
      try {
        const { data: cached, error: cacheErr } = await supabase
          .from('link_preview_cache')
          .select('*')
          .eq('url', url)
          .maybeSingle();

        if (cacheErr) console.error('[Preview] Cache error:', cacheErr.message);
        
        if (cached) {
          console.log('[Preview] Cache Hit:', url);
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ status: 'success', data: cached }),
          };
        }
      } catch (e) {
        console.error('[Preview] Cache lookup exception:', e);
      }
    }

    let title = '';
    let image = '';
    let description = '';
    let siteName = '';
    let finalUrl = url;

    // 2. Fetch and follow redirects
    console.log('[Preview] Fetching original URL...');
    const initialRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
      },
      redirect: 'follow',
    });
    
    finalUrl = initialRes.url;
    console.log('[Preview] Final URL after redirects:', finalUrl);
    
    const isNaverMap = finalUrl.includes('naver.com') || finalUrl.includes('naver.me');

    // 3. Specialized Logic for Naver Map
    if (isNaverMap) {
      const pinIdMatch = finalUrl.match(/(?:pinId|id|place\/)(\d+)/);
      const pinId = pinIdMatch ? pinIdMatch[1] : null;

      if (pinId) {
        console.log('[Preview] Naver PinId detected:', pinId);
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
            console.log('[Preview] Naver API success:', title);
          }
        } catch (e) {
          console.error('[Preview] Naver API error:', e);
        }
      }
    }

    // 4. Fallback: Use Microlink API
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
          console.log('[Preview] Microlink success:', title);
        }
      } catch (e) {
        console.error('[Preview] Microlink error:', e);
      }
    }

    // 5. Final Fallback: Direct HTML parsing (if Microlink failed)
    if (!title) {
      console.log('[Preview] Last resort: Parsing HTML directly');
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
    if (title && title.includes('네이버 지도')) title = title.replace(/\s*:\s*네이버\s*지도/i, '').trim();
    if (image && image.includes('og-map-400x200.png')) image = '';

    const previewData = {
      url, // Original URL as key
      title: title || '상세 정보 보기',
      description: description || '링크를 클릭하여 상세 내용을 확인하세요.',
      image: image || null,
      site_name: siteName || (isNaverMap ? 'Naver Map' : '웹사이트'),
    };

    // 6. Async Cache update
    if (supabase && title && title !== '상세 정보 보기') {
      supabase.from('link_preview_cache').upsert([previewData]).then(({ error }) => {
        if (error) console.error('[Preview] Cache upsert error:', error.message);
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
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch preview', details: error instanceof Error ? error.message : String(error) }),
    };
  }
};
