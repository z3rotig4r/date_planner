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
  devBypassLogin: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  coupleId: null,
  loading: true,

  // ... (initialize, signInWithMagicLink, signOut, connectWithPartner remain same)

  devBypassLogin: async () => {
    set({ loading: true });
    
    // 1. Create a fake user object
    const mockId = 'dev-user-' + Math.random().toString(36).substring(2, 8);
    const mockUser: User = {
      id: mockId,
      email: 'dev@datesync.test',
      app_metadata: {},
      user_metadata: { nickname: 'Dev Tester' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    // 2. Create/Fetch a profile for this mock user
    const mockInviteCode = 'DEV' + Math.random().toString(36).substring(2, 5).toUpperCase();
    const mockProfile: Profile = {
      id: mockId,
      nickname: 'Dev Tester',
      invite_code: mockInviteCode,
    };

    // We set the state directly bypassing Supabase
    set({ user: mockUser, profile: mockProfile, coupleId: null, loading: false });
    console.log('🚀 Dev Bypass Login Successful:', mockProfile);
  },
}));
