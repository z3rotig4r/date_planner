import { motion } from 'framer-motion';
import { MapPin, Clock, MessageCircleQuestion } from 'lucide-react';
import { Plan, PlanStatus } from '../types/plan';
import { ActionButtons } from './ActionButtons';
import { LinkPreview } from './LinkPreview';

interface PlanCardProps {
  plan: Plan;
  onStatusChange: (status: PlanStatus) => void;
}

export const PlanCard = ({ plan, onStatusChange }: PlanCardProps) => {
  const isAccepted = plan.status === 'accepted';
  const isPending = plan.status === 'pending';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        scale: isAccepted ? 1.02 : 1,
      }}
      exit={{ opacity: 0, scale: 0.8, x: -50 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`relative p-5 rounded-3xl glass-card transition-all duration-500 overflow-hidden ${
        isAccepted 
          ? 'ring-2 ring-emerald-500 bg-emerald-50/30 dark:bg-emerald-500/10' : 
        isPending 
          ? 'ring-2 ring-amber-400 bg-amber-50/30 dark:bg-amber-500/10' : ''
      }`}
    >
      {/* Pending Badge */}
      {isPending && (
        <div className="absolute top-4 right-4 flex items-center gap-1 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse shadow-md z-20">
          <MessageCircleQuestion size={12} />
          논의 필요
        </div>
      )}

      {/* Accepted Indicator */}
      {isAccepted && (
        <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-[100px] flex items-start justify-end p-3">
          <div className="bg-emerald-500 p-1 rounded-full text-white shadow-sm">
            <Clock size={12} />
          </div>
        </div>
      )}

      {/* Time & Activity */}
      <div className="flex items-start gap-4">
        <div className={`mt-1 p-2 rounded-2xl flex flex-col items-center justify-center min-w-[50px] ${
          isAccepted 
            ? 'bg-emerald-500 text-white' 
            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
        }`}>
          <span className="text-[10px] uppercase font-bold tracking-wider">Time</span>
          <span className="text-sm font-black">{plan.time}</span>
        </div>

        <div className="flex-1">
          <h3 className={`text-lg font-bold transition-colors ${
            isAccepted 
              ? 'text-emerald-900 dark:text-emerald-400' 
              : 'text-slate-800 dark:text-slate-100'
          }`}>
            {plan.activity}
          </h3>
          
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-sm">
              <MapPin size={14} />
              <span>{plan.location}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rich Link Preview */}
      {plan.link && <LinkPreview url={plan.link} />}

      <ActionButtons status={plan.status} onStatusChange={onStatusChange} />
      
      {/* Background Decor */}
      <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full blur-3xl opacity-20 ${
        isAccepted ? 'bg-emerald-500' : isPending ? 'bg-amber-500' : 'bg-slate-500 dark:bg-slate-700'
      }`} />
    </motion.div>
  );
};
