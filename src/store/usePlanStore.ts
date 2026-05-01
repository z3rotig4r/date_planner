import { create } from 'zustand';
import { Plan, PlanStatus } from '../types/plan';
import { supabase } from '../services/supabaseClient';
import { useAuthStore } from './useAuthStore';

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

    if (!error && data) {
      set({ plans: data as PlanWithDate[] });
    }
    set({ loading: false });
  },

  updatePlanStatus: async (id, status) => {
    // Optimistic Update
    const previousPlans = get().plans;
    set((state) => ({
      plans: state.plans.map((p) => (p.id === id ? { ...p, status } : p)),
    }));

    const { error } = await supabase
      .from('plans')
      .update({ status })
      .eq('id', id);

    if (error) {
      set({ plans: previousPlans });
      console.error('Failed to update status:', error);
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
      console.error('Failed to remove plan:', error);
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
      console.error('Failed to add plan:', error);
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
