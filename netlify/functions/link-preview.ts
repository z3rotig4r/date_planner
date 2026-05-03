import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Supabase client for caching
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export const handler: Handler = async (event) => {
  const url = event.queryStringParameters?.url;
  
  if (!url) {
    return { statusCode: 400, body: JSON.stringify({ error: 'URL is required' }) };
  }

  // 0. Security: Block local/internal IPs (SSRF Protection)
  if (url.includes('localhost') || url.includes('127.0.0.1') || url.startsWith('192.168.') || url.startsWith('10.')) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Invalid URL' }) };
  }

  try {
    // 1. Check Supabase Cache first
    const { data: cached } = await supabase
      .from('link_preview_cache')
      .select('*')
      .eq('url', url)
      .single();

    if (cached) {
      console.log('[Preview] Cache Hit:', url);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ status: 'success', data: cached }),
      };
    }

    console.log('[Preview] Cache Miss, fetching:', url);

    // 2. Specialized Logic for Naver Map
    const isNaverMap = url.includes('naver.com') || url.includes('naver.me');
    const pinIdMatch = url.match(/(?:pinId|id|place\/)(\d+)/);
    const pinId = pinIdMatch ? pinIdMatch[1] : null;

    let title = '';
    let image = '';
    let description = '';
    let siteName = '';

    if (isNaverMap && pinId) {
      // Use internal API for Naver Map
      try {
        const apiRes = await fetch(`https://map.naver.com/v5/api/sites/summary/${pinId}?lang=ko`);
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          title = apiData.name || '';
          description = apiData.fullAddress || apiData.address || '';
          image = apiData.imageURL || (apiData.images && apiData.images[0]?.url) || '';
          siteName = 'Naver Map';
        }
      } catch (e) {
        console.error('[Preview] Naver API Fallback failed');
      }
    }

    // 3. General OG Parsing (if Naver logic didn't return enough or for other sites)
    if (!title || !image) {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        redirect: 'follow',
      });

      const html = await response.text();
      
      const extractMeta = (pattern: string) => {
        const regex = new RegExp(`<meta\\s+(?:property|name)=["']${pattern}["']\\s+content=["']([^"']+)["']`, 'i');
        const match = html.match(regex);
        return match ? match[1] : null;
      };

      title = title || extractMeta('og:title') || '';
      description = description || extractMeta('og:description') || '';
      image = image || extractMeta('og:image') || '';
      siteName = siteName || extractMeta('og:site_name') || '';

      // Fallback to <title> tag
      if (!title) {
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        title = titleMatch ? titleMatch[1] : '';
      }

      // Filter out generic placeholders
      if (image.includes('og-map-400x200.png')) image = '';
      if (title.includes('네이버 지도')) title = title.replace(/\s*:\s*네이버\s*지도/i, '').trim();
    }

    const previewData = {
      url,
      title: title || '상세 정보 보기',
      description: description || '링크를 클릭하여 상세 내용을 확인하세요.',
      image: image || null,
      site_name: siteName || '웹사이트',
    };

    // 4. Save to Cache (Fire and forget, don't wait for response)
    if (title) {
      supabase.from('link_preview_cache').insert([previewData]).then();
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
      body: JSON.stringify({ error: 'Failed to fetch preview' }),
    };
  }
};
