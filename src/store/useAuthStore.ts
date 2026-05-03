import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import type { User, AuthError } from '@supabase/supabase-js';
import { handleSupabaseError } from '../utils/errorMasking';

interface Profile {
  id: string;
  nickname: string;
  invite_code: string;
  kakao_access_token?: string;
  kakao_refresh_token?: string;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  coupleId: string | null;
  loading: boolean;
  initialize: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signInWithKakao: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  connectWithPartner: (partnerCode: string) => Promise<{ error: string | null }>;
  devBypassLogin: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  coupleId: null,
  loading: true,

  initialize: async () => {
    set({ loading: true });
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) handleSupabaseError(sessionError, '세션을 불러오는데 실패했습니다.');
    
    const user = session?.user ?? null;
    
    const fetchProfileAndCouple = async (userId: string) => {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        let currentProfile = profile;

        if (profileError) {
          handleSupabaseError(profileError, '프로필 정보를 가져오는데 실패했습니다.');
        }

        if (!currentProfile && !profileError) {
          const newInviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          const { data: fallbackProfile, error: createError } = await supabase
            .from('profiles')
            .insert([{ 
              id: userId, 
              nickname: user?.user_metadata?.nickname || user?.email?.split('@')[0],
              invite_code: newInviteCode 
            }])
            .select()
            .maybeSingle();
          
          if (createError) {
            handleSupabaseError(createError, '프로필 생성 중 오류가 발생했습니다.');
          } else {
            currentProfile = fallbackProfile;
          }
        }

        const { data: couple, error: coupleError } = await supabase
          .from('couples')
          .select('id')
          .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
          .maybeSingle();
        
        if (coupleError) {
          handleSupabaseError(coupleError, '연결 정보를 가져오는데 실패했습니다.');
        }
        
        return { profile: currentProfile, coupleId: couple?.id ?? null };
      } catch (err) {
        handleSupabaseError(err as Error, '인증 데이터 처리 중 예기치 않은 오류가 발생했습니다.');
        return { profile: null, coupleId: null };
      }
    };

    if (user) {
      const { profile, coupleId } = await fetchProfileAndCouple(user.id);
      set({ user, profile, coupleId, loading: false });
    } else {
      set({ user: null, profile: null, coupleId: null, loading: false });
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user ?? null;
      
      // Kakao 토큰 캡처 (로그인 시 provider_token이 session에 포함됨)
      if (event === 'SIGNED_IN' && session?.provider_token && session.user.app_metadata.provider === 'kakao') {
        const { provider_token, provider_refresh_token } = session;
        
        await supabase
          .from('profiles')
          .update({
            kakao_access_token: provider_token,
            kakao_refresh_token: provider_refresh_token,
          })
          .eq('id', session.user.id);
      }

      if (user) {
        const { profile, coupleId } = await fetchProfileAndCouple(user.id);
        set({ user, profile, coupleId, loading: false });
      } else {
        set({ user: null, profile: null, coupleId: null, loading: false });
      }
    });
  },

  signInWithMagicLink: async (email) => {
    return await supabase.auth.signInWithOtp({ 
      email,
      options: {
        emailRedirectTo: window.location.origin,
      }
    });
  },

  signInWithGoogle: async () => {
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      }
    });
  },

  signInWithKakao: async () => {
    return await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          scope: 'talk_message friends'
        }
      }
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, coupleId: null });
  },

  connectWithPartner: async (partnerCode) => {
    const { user, profile } = get();
    if (!user || !profile) return { error: '로그인이 필요합니다.' };

    try {
      const { data: partnerProfile, error: findError } = await supabase
        .from('profiles')
        .select('id')
        .eq('invite_code', partnerCode.toUpperCase())
        .maybeSingle();

      if (findError) {
        handleSupabaseError(findError, '상대방 정보를 찾는 중 오류가 발생했습니다.');
        return { error: '상대방 정보를 찾는 중 오류가 발생했습니다.' };
      }
      
      if (!partnerProfile) {
        return { error: '유효하지 않은 코드입니다. 코드를 다시 확인해 주세요.' };
      }
      
      if (partnerProfile.id === user.id) {
        return { error: '본인의 코드는 입력할 수 없습니다.' };
      }

      const { data: existingCouple, error: checkError } = await supabase
        .from('couples')
        .select('id')
        .or(`and(user_a_id.eq.${user.id},user_b_id.eq.${partnerProfile.id}),and(user_a_id.eq.${partnerProfile.id},user_b_id.eq.${user.id})`)
        .maybeSingle();

      if (checkError) {
        handleSupabaseError(checkError, '기존 연결 확인 중 오류가 발생했습니다.');
        return { error: '연결 상태를 확인하는 중 오류가 발생했습니다.' };
      }

      if (existingCouple) {
        set({ coupleId: existingCouple.id });
        return { error: null };
      }

      const { data: newCouple, error: createError } = await supabase
        .from('couples')
        .insert([
          { user_a_id: user.id, user_b_id: partnerProfile.id }
        ])
        .select()
        .maybeSingle();

      if (createError) {
        handleSupabaseError(createError, '커플 연결에 실패했습니다.');
        return { error: '연결 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' };
      }

      if (!newCouple) {
        return { error: '연결을 생성할 수 없습니다. 이미 연결 요청이 진행 중일 수 있습니다.' };
      }

      set({ coupleId: newCouple.id });
      return { error: null };

    } catch (err) {
      console.error('[Connection] Unexpected error:', err);
      return { error: '예기치 않은 오류가 발생했습니다.' };
    }
  },

  devBypassLogin: async () => {
    set({ loading: true });
    
    const mockId = '00000000-0000-0000-0000-' + Math.random().toString(36).substring(2, 14).padEnd(12, '0');
    const mockUser: User = {
      id: mockId,
      email: `dev-${Math.random().toString(36).substring(2, 6)}@datesync.test`,
      app_metadata: {},
      user_metadata: { nickname: 'Dev Tester' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    const mockInviteCode = 'DEV' + Math.random().toString(36).substring(2, 5).toUpperCase();
    const mockProfile: Profile = {
      id: mockId,
      nickname: 'Dev Tester',
      invite_code: mockInviteCode,
    };

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert([mockProfile]);

    if (upsertError) {
      handleSupabaseError(upsertError, '데브 로그인 프로필 생성 실패');
      set({ loading: false });
      return;
    }

    set({ user: mockUser, profile: mockProfile, coupleId: null, loading: false });
  },
}));
