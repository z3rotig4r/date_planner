import { usePlanStore } from '../store/usePlanStore';
import { motion } from 'framer-motion';

export const CalendarView = () => {
  const { selectedDate, setSelectedDate } = usePlanStore();

  // Generate 7 days starting from 2026-07-13 (Monday of that week)
  const baseDate = new Date('2026-07-13');
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    return {
      full: d.toISOString().split('T')[0],
      dayName: ['일', '월', '화', '수', '목', '금', '토'][d.getDay()],
      dateNum: d.getDate(),
    };
  });

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar px-2">
      {weekDays.map((day) => {
        const isSelected = day.full === selectedDate;
        return (
          <button
            key={day.full}
            onClick={() => setSelectedDate(day.full)}
            className="flex-shrink-0 flex flex-col items-center gap-2 group outline-none"
          >
            <span className={`text-[11px] font-bold tracking-tighter uppercase transition-colors ${
              isSelected ? 'text-primary-coral' : 'text-slate-400 group-hover:text-slate-600'
            }`}>
              {day.dayName}
            </span>
            <div className={`relative w-12 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
              isSelected 
                ? 'bg-gradient-to-br from-primary-coral to-primary-orange text-white shadow-lg scale-110' 
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700'
            }`}>
              <span className="text-lg font-black">{day.dateNum}</span>
              {isSelected && (
                <motion.div 
                  layoutId="active-pill"
                  className="absolute -bottom-1 w-1.5 h-1.5 bg-white rounded-full"
                />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};
