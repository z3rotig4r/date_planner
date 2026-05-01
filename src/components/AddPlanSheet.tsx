import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, MapPin, Link as LinkIcon, Send } from 'lucide-react';
import { usePlanStore } from '../store/usePlanStore';

interface AddPlanSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddPlanSheet = ({ isOpen, onClose }: AddPlanSheetProps) => {
  const addPlan = usePlanStore((state) => state.addPlan);
  const [formData, setFormData] = useState({
    time: '12:00',
    activity: '',
    location: '',
    link: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.activity) return;
    
    addPlan(formData);
    setFormData({ time: '12:00', activity: '', location: '', link: '' });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[40px] shadow-2xl z-[101] px-6 pt-2 pb-10 max-w-md mx-auto"
          >
            {/* Handle */}
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto my-4" />
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">새로운 계획 제안하기</h3>
              <button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1 space-y-2">
                  <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
                    <Clock size={12} /> TIME
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl p-3 text-sm font-bold focus:ring-2 focus:ring-primary-coral outline-none"
                  />
                </div>
                <div className="col-span-3 space-y-2">
                  <label className="text-xs font-bold text-slate-400">ACTIVITY</label>
                  <input
                    autoFocus
                    placeholder="무엇을 할까요?"
                    value={formData.activity}
                    onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl p-3 text-sm font-medium focus:ring-2 focus:ring-primary-coral outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <MapPin size={12} /> LOCATION
                </label>
                <input
                  placeholder="장소나 식당 이름"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full bg-slate-50 border-none rounded-2xl p-3 text-sm font-medium focus:ring-2 focus:ring-primary-coral outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <LinkIcon size={12} /> LINK (Instagram, Map, etc.)
                </label>
                <input
                  placeholder="참고할 수 있는 URL"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className="w-full bg-slate-50 border-none rounded-2xl p-3 text-sm font-medium focus:ring-2 focus:ring-primary-coral outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 mt-4 bg-gradient-to-r from-primary-coral to-primary-orange text-white font-bold rounded-2xl shadow-lg shadow-primary-coral/20 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Send size={18} />
                제안 보내기
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
