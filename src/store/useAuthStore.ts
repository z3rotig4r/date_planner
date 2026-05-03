import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import type { User, AuthError } from '@supabase/supabase-js';
import { handleSupabaseError } from '../utils/errorMasking';

interface Profile {
  id: string;
  nickname: string;
  invite_code: string;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  coupleId: string | null;
  loading: boolean;
  initialize: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
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

    supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
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

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, coupleId: null });
  },

  connectWithPartner: async (partnerCode) => {
    const { user, profile } = get();
    if (!user || !profile) return { error: '로그인이 필요합니다.' };

    const { data: partnerProfile, error: findError } = await supabase
      .from('profiles')
      .select('id')
      .eq('invite_code', partnerCode.toUpperCase())
      .maybeSingle();

    if (findError || !partnerProfile) {
      handleSupabaseError(findError, '유효하지 않은 코드입니다.');
      return { error: '유효하지 않은 코드입니다.' };
    }
    
    if (partnerProfile.id === user.id) return { error: '본인의 코드는 입력할 수 없습니다.' };

    const { data: newCouple, error: createError } = await supabase
      .from('couples')
      .insert([
        { user_a_id: user.id, user_b_id: partnerProfile.id }
      ])
      .select()
      .maybeSingle();

    if (createError) {
      handleSupabaseError(createError, '커플 연결에 실패했습니다.');
      return { error: '이미 연결되었거나 오류가 발생했습니다.' };
    }

    set({ coupleId: newCouple.id });
    return { error: null };
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
