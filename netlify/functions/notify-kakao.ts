import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID || '';

/**
 * 카카오 메시지 전송 (나에게 보내기)
 */
async function sendKakaoMe(token: string, text: string, link: string) {
  const res = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      template_object: JSON.stringify({
        object_type: 'text',
        text: text,
        link: { web_url: link, mobile_web_url: link },
        button_title: '앱에서 확인하기'
      })
    })
  });
  return res.ok;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { type, userId, payload } = JSON.parse(event.body || '{}');

  try {
    // 1. 사용자 프로필 및 카카오 토큰 조회
    const { data: profile } = await supabase
      .from('profiles')
      .select('kakao_access_token, nickname')
      .eq('id', userId)
      .single();

    if (!profile?.kakao_access_token) {
      return { statusCode: 200, body: JSON.stringify({ status: 'skipped', reason: 'No Kakao Token' }) };
    }

    let message = '';
    const appUrl = 'https://datesync-planner.netlify.app'; // 실제 URL로 변경 필요

    if (type === 'plan_created') {
      message = `[DateSync] 📅 새로운 데이트 계획이 등록되었습니다!\n활동: ${payload.activity}\n시간: ${payload.time}`;
    } else if (type === 'status_changed') {
      const statusKr = payload.status === 'accepted' ? '수락' : payload.status === 'rejected' ? '거절' : '보류';
      message = `[DateSync] 🔔 데이트 계획이 [${statusKr}] 상태로 변경되었습니다.\n활동: ${payload.activity}`;
    }

    // 2. 메시지 전송
    const success = await sendKakaoMe(profile.kakao_access_token, message, appUrl);

    return {
      statusCode: 200,
      body: JSON.stringify({ status: success ? 'success' : 'failed' })
    };

  } catch (error) {
    console.error('[Notify] Error:', error);
    return { statusCode: 500, body: 'Internal Error' };
  }
};
