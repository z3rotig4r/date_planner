import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import { User } from '@supabase/supabase-js';

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
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      const { data: couple } = await supabase
        .from('couples')
        .select('id')
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
        .single();
      
      set({ user, profile, coupleId: couple?.id ?? null, loading: false });
    } else {
      set({ user: null, profile: null, coupleId: null, loading: false });
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        const { data: couple } = await supabase.from('couples').select('id').or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`).single();
        set({ user, profile, coupleId: couple?.id ?? null });
      } else {
        set({ user: null, profile: null, coupleId: null });
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
