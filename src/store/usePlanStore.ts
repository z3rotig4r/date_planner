import { create } from 'zustand';
import type { Plan, PlanStatus } from '../types/plan';
import { supabase } from '../services/supabaseClient';
import { useAuthStore } from './useAuthStore';
import { handleSupabaseError } from '../utils/errorMasking';

interface PlanWithDate extends Plan {
  date: string;
}

interface PlanState {
  plans: PlanWithDate[];
  selectedDate: string;
  loading: boolean;
  
  // Actions
  setSelectedDate: (date: string) => void;
  fetchPlans: () => Promise<void>;
  updatePlanStatus: (id: string, status: PlanStatus) => Promise<void>;
  removePlan: (id: string) => Promise<void>;
  addPlan: (plan: Omit<Plan, 'id' | 'status'>) => Promise<void>;
  notifyPartner: (type: 'plan_created' | 'status_changed', payload: any) => Promise<void>;
  subscribeToPlans: () => () => void;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  plans: [],
  selectedDate: new Date().toISOString().split('T')[0],
  loading: false,

  setSelectedDate: (date) => set({ selectedDate: date }),

  fetchPlans: async () => {
    const coupleId = useAuthStore.getState().coupleId;
    if (!coupleId) return;

    set({ loading: true });
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('couple_id', coupleId)
      .order('time', { ascending: true });

    if (error) {
      handleSupabaseError(error, '계획 리스트를 가져오는데 실패했습니다.');
    } else if (data) {
      set({ plans: data as PlanWithDate[] });
    }
    set({ loading: false });
  },

  notifyPartner: async (type, payload) => {
    const { user, coupleId } = useAuthStore.getState();
    if (!coupleId || !user) return;

    // 1. Find partner ID
    const { data: couple } = await supabase
      .from('couples')
      .select('user_a_id, user_b_id')
      .eq('id', coupleId)
      .single();

    if (!couple) return;
    const partnerId = couple.user_a_id === user.id ? couple.user_b_id : couple.user_a_id;

    if (!partnerId) return;

    // 2. Trigger Notification Function
    await fetch('/.netlify/functions/notify-kakao', {
      method: 'POST',
      body: JSON.stringify({ type, userId: partnerId, payload }),
    }).catch(err => console.error('[Notify] Error:', err));
  },

  updatePlanStatus: async (id, status) => {
    // Optimistic Update
    const previousPlans = get().plans;
    const planToUpdate = previousPlans.find(p => p.id === id);
    
    set((state) => ({
      plans: state.plans.map((p) => (p.id === id ? { ...p, status } : p)),
    }));

    const { error } = await supabase
      .from('plans')
      .update({ status })
      .eq('id', id);

    if (error) {
      set({ plans: previousPlans });
      handleSupabaseError(error, '상태 변경에 실패했습니다.');
    } else if (planToUpdate) {
      // 알림 전송
      get().notifyPartner('status_changed', { 
        status, 
        activity: planToUpdate.activity 
      });
    }
  },

  removePlan: async (id) => {
    const previousPlans = get().plans;
    set((state) => ({
      plans: state.plans.filter((p) => p.id !== id),
    }));

    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', id);

    if (error) {
      set({ plans: previousPlans });
      handleSupabaseError(error, '계획 삭제에 실패했습니다.');
    }
  },

  addPlan: async (newPlan) => {
    const auth = useAuthStore.getState();
    if (!auth.user || !auth.coupleId) return;

    const planToAdd = {
      ...newPlan,
      couple_id: auth.coupleId,
      creator_id: auth.user.id,
      date: get().selectedDate,
      status: 'idle' as PlanStatus,
    };

    const { error } = await supabase
      .from('plans')
      .insert([planToAdd]);

    if (error) {
      handleSupabaseError(error, '계획 추가에 실패했습니다.');
    } else {
      // 알림 전송
      get().notifyPartner('plan_created', { 
        activity: newPlan.activity,
        time: newPlan.time
      });
    }
  },

  subscribeToPlans: () => {
    const coupleId = useAuthStore.getState().coupleId;
    if (!coupleId) return () => {};

    const channel = supabase
      .channel(`plans:couple_id=eq.${coupleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'plans', filter: `couple_id=eq.${coupleId}` },
        () => {
          get().fetchPlans(); // Simple sync: refetch all on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
