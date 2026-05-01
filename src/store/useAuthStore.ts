import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import type { User } from '@supabase/supabase-js';

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
  signInWithMagicLink: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  connectWithPartner: (partnerCode: string) => Promise<{ error: string | null }>;
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
        // 1. Fetch Profile with Retry/Fallback
        let { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        // Fallback: If profile doesn't exist (race condition with trigger)
        if (profileError && profileError.code === 'PGRST116') {
          console.warn('Profile not found, attempting to create fallback profile...');
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

        // 2. Fetch Couple Info
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

    // 1. Find partner profile
    const { data: partnerProfile, error: findError } = await supabase
      .from('profiles')
      .select('id')
      .eq('invite_code', partnerCode.toUpperCase())
      .single();

    if (findError || !partnerProfile) return { error: '유효하지 않은 코드입니다.' };
    if (partnerProfile.id === user.id) return { error: '본인의 코드는 입력할 수 없습니다.' };

    // 2. Create couple
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
}));
