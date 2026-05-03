import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import type { User, AuthError } from '@supabase/supabase-js';

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
    
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    
    const fetchProfileAndCouple = async (userId: string) => {
      try {
        const { data: initialProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        let profile = initialProfile;

        if (profileError && profileError.code === 'PGRST116') {
          const newInviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          const { data: fallbackProfile, error: createError } = await supabase
            .from('profiles')
            .insert([{ 
              id: userId, 
              nickname: user?.user_metadata?.nickname || user?.email?.split('@')[0],
              invite_code: newInviteCode 
            }])
            .select()
            .single();
          
          if (!createError) profile = fallbackProfile;
        }

        const { data: couple } = await supabase
          .from('couples')
          .select('id')
          .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
          .single();
        
        return { profile, coupleId: couple?.id ?? null };
      } catch (err) {
        console.error('Error fetching auth data:', err);
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
      .single();

    if (findError || !partnerProfile) return { error: '유효하지 않은 코드입니다.' };
    if (partnerProfile.id === user.id) return { error: '본인의 코드는 입력할 수 없습니다.' };

    const { data: newCouple, error: createError } = await supabase
      .from('couples')
      .insert([
        { user_a_id: user.id, user_b_id: partnerProfile.id }
      ])
      .select()
      .single();

    if (createError) return { error: '이미 연결되었거나 오류가 발생했습니다.' };

    set({ coupleId: newCouple.id });
    return { error: null };
  },

  devBypassLogin: async () => {
    set({ loading: true });
    
    // 1. Create a consistent mock UUID for DB search
    const mockId = '00000000-0000-0000-0000-' + Math.random().toString(36).substring(2, 14).padEnd(12, '0');
    const mockUser: User = {
      id: mockId,
      email: `dev-${Math.random().toString(36).substring(2, 6)}@datesync.test`,
      app_metadata: {},
      user_metadata: { nickname: 'Dev Tester' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    // 2. Generate a valid 6-char code
    const mockInviteCode = 'DEV' + Math.random().toString(36).substring(2, 5).toUpperCase();
    const mockProfile: Profile = {
      id: mockId,
      nickname: 'Dev Tester',
      invite_code: mockInviteCode,
    };

    // 3. Actually UPSERT to Supabase so it's searchable by other browser window
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert([mockProfile]);

    if (upsertError) {
      console.error('❌ Failed to upsert mock profile:', upsertError);
      alert('DB 제약 조건(FK)이 해제되지 않았을 수 있습니다. SQL Editor에서 "ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;"를 실행해 주세요.');
      set({ loading: false });
      return;
    }

    set({ user: mockUser, profile: mockProfile, coupleId: null, loading: false });
    console.log('🚀 Dev Bypass (DB Integrated) Successful:', mockProfile);
  },
}));
