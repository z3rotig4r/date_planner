import { AnimatePresence, motion } from 'framer-motion';
import { usePlanStore } from '../store/usePlanStore';
import { PlanCard } from './PlanCard';
import type { PlanStatus } from '../types/plan';

export const TimelineBoard = () => {
  const { plans, selectedDate, updatePlanStatus, removePlan } = usePlanStore();

  const filteredPlans = plans.filter((p) => p.date === selectedDate);

  const handleStatusChange = (id: string, status: PlanStatus) => {
    if (status === 'rejected') {
      removePlan(id);
    } else {
      updatePlanStatus(id, status);
    }
  };

  return (
    <div className="relative pl-8 space-y-8 min-h-[400px]">
      {/* Timeline Tracking Line */}
      <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary-coral/40 via-primary-orange/40 to-transparent rounded-full" />

      <AnimatePresence mode="popLayout">
        {filteredPlans.length > 0 ? (
          filteredPlans.map((plan) => (
            <div key={plan.id} className="relative">
              {/* Timeline Dot */}
              <div className={`absolute -left-[25px] top-6 w-4 h-4 rounded-full border-4 border-white shadow-sm z-10 transition-colors duration-300 ${
                plan.status === 'accepted' ? 'bg-emerald-500 scale-125' : 
                plan.status === 'pending' ? 'bg-amber-400' : 'bg-slate-300'
              }`} />
              
              <PlanCard 
                plan={plan} 
                onStatusChange={(status) => handleStatusChange(plan.id, status)} 
              />
            </div>
          ))
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-dashed border-slate-200 dark:border-slate-700">
               <p className="text-3xl">📅</p>
            </div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">아직 데이트 계획이 없어요.</h3>
            <p className="text-slate-400 text-sm mt-1">첫 계획을 세워볼까요?</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
