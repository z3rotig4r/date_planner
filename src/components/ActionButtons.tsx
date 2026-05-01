import { Check, X, HelpCircle } from 'lucide-react';
import type { PlanStatus } from '../types/plan';

interface ActionButtonsProps {
  status: PlanStatus;
  onStatusChange: (status: PlanStatus) => void;
}

export const ActionButtons = ({ status, onStatusChange }: ActionButtonsProps) => {
  return (
    <div className="flex items-center gap-3 mt-4">
      <button
        onClick={() => onStatusChange('accepted')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all ${
          status === 'accepted'
            ? 'bg-emerald-500 text-white shadow-lg'
            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
        }`}
      >
        <Check size={16} />
        수락
      </button>
      
      <button
        onClick={() => onStatusChange('pending')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all ${
          status === 'pending'
            ? 'bg-amber-500 text-white shadow-lg'
            : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
        }`}
      >
        <HelpCircle size={16} />
        보류
      </button>

      <button
        onClick={() => onStatusChange('rejected')}
        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all"
      >
        <X size={16} />
        거절
      </button>
    </div>
  );
};
