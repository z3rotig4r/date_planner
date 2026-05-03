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
    // 1. Check Supabase Cache (and filter out bad/generic data)
    if (supabase) {
      const { data: cached } = await supabase
        .from('link_preview_cache')
        .select('*')
        .eq('url', url)
        .maybeSingle();

      // Only use cache if it has a meaningful title (not "네이버지도", "장소 정보" etc.)
      const isGeneric = cached && (
        cached.title.includes('네이버지도') || 
        cached.title === '장소 정보' || 
        cached.title === '네이버 지도'
      );

      if (cached && !isGeneric) {
        console.log('[Preview] Cache Hit (Valid):', url);
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ status: 'success', data: cached }),
        };
      }
      if (isGeneric) {
        console.log('[Preview] Cache contains generic data, re-fetching...');
      }
    }

    let title = '';
    let image = '';
    let description = '';
    let siteName = '';
    let finalUrl = url;

    // 2. Fetch and follow redirects
    const initialRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
      },
      redirect: 'follow',
    });
    finalUrl = initialRes.url;
    
    const isNaverMap = finalUrl.includes('naver.com') || finalUrl.includes('naver.me');

    // 3. Specialized Logic for Naver Map (Internal API)
    if (isNaverMap) {
      const pinIdMatch = finalUrl.match(/(?:pinId|id|place\/)(\d+)/);
      const pinId = pinIdMatch ? pinIdMatch[1] : null;

      if (pinId) {
        console.log('[Preview] Attempting Naver Internal API for PinId:', pinId);
        try {
          // Try a more direct API endpoint that often has less protection
          const apiRes = await fetch(`https://map.naver.com/v5/api/sites/summary/${pinId}?lang=ko`, {
            headers: {
              'Referer': 'https://map.naver.com/',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
              'Accept': 'application/json, text/plain, */*'
            }
          });
          
          if (apiRes.ok) {
            const apiData = await apiRes.json();
            title = apiData.name || '';
            description = apiData.fullAddress || apiData.address || apiData.category || '';
            image = apiData.imageURL || (apiData.images && apiData.images[0]?.url) || '';
            siteName = 'Naver Map';
            console.log('[Preview] Naver Internal API success:', title);
          } else {
            console.log('[Preview] Naver Internal API returned status:', apiRes.status);
          }
        } catch (e) {
          console.error('[Preview] Naver Internal API failed:', e);
        }
      }
    }

    // 4. Fallback: Use Microlink API
    if (!title || title.includes('네이버') || !image) {
      console.log('[Preview] Falling back to Microlink for:', finalUrl);
      try {
        const microRes = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(finalUrl)}`);
        const microData = await microRes.json();
        
        if (microData.status === 'success') {
          const d = microData.data;
          // Only update if we don't have better data or if current data is generic
          if (!title || title.includes('네이버')) title = d.title || title;
          description = description || d.description || '';
          image = image || d.image?.url || d.logo?.url || '';
          siteName = siteName || d.publisher || d.author || '';
        }
      } catch (e) {
        console.error('[Preview] Microlink error:', e);
      }
    }

    // Clean up
    if (title) {
      title = title.replace(/\s*:\s*네이버\s*지도/i, '').trim();
      title = title.replace(/장소\s*-\s*/i, '').trim();
    }

    const previewData = {
      url,
      title: (title && title !== '네이버 지도' && title !== '네이버지도') ? title : '상세 정보 보기',
      description: description || '링크를 클릭하여 상세 내용을 확인하세요.',
      image: image || null,
      site_name: siteName || (isNaverMap ? 'Naver Map' : '웹사이트'),
    };

    // 5. Cache update (ONLY if we found a real title)
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
