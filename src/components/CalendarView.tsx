import { useState } from 'react';
import { usePlanStore } from '../store/usePlanStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval 
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

export const CalendarView = () => {
  const { selectedDate, setSelectedDate } = usePlanStore();
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));
  const [isExpanded, setIsExpanded] = useState(false);

  const onDateClick = (day: Date) => {
    setSelectedDate(format(day, 'yyyy-MM-dd'));
    if (isExpanded) setIsExpanded(false);
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-4 px-2">
      <div className="flex items-center gap-2">
        <CalendarIcon size={18} className="text-primary-coral" />
        <span className="text-lg font-black text-slate-800 dark:text-slate-100">
          {format(currentMonth, 'yyyy년 M월', { locale: ko })}
        </span>
      </div>
      <div className="flex gap-1">
        <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
          <ChevronLeft size={20} />
        </button>
        <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );

  const renderDays = () => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day, i) => (
          <div key={i} className={`text-center text-[10px] font-bold uppercase tracking-widest ${i === 0 ? 'text-rose-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'}`}>
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-7 gap-1">
        {allDays.map((d) => {
          const isSelected = isSameDay(d, new Date(selectedDate));
          const isCurrentMonth = isSameMonth(d, monthStart);
          const isToday = isSameDay(d, new Date());

          return (
            <button
              key={d.toString()}
              onClick={() => onDateClick(d)}
              className={`relative h-10 w-full flex items-center justify-center rounded-xl text-sm font-bold transition-all ${
                isSelected 
                  ? 'bg-gradient-to-br from-primary-coral to-primary-orange text-white shadow-md z-10 scale-105' 
                  : isCurrentMonth 
                    ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800' 
                    : 'text-slate-300 dark:text-slate-600 opacity-30'
              }`}
            >
              <span>{format(d, 'd')}</span>
              {isToday && !isSelected && (
                <div className="absolute bottom-1.5 w-1 h-1 bg-primary-coral rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    );
  };

  // Weekly View (Compact)
  const renderWeeklyView = () => {
    const start = startOfWeek(new Date(selectedDate), { weekStartsOn: 0 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(start, i));

    return (
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar px-1">
        {weekDays.map((d) => {
          const isSelected = isSameDay(d, new Date(selectedDate));
          const isToday = isSameDay(d, new Date());
          const dayName = format(d, 'E', { locale: ko });

          return (
            <button
              key={d.toString()}
              onClick={() => setSelectedDate(format(d, 'yyyy-MM-dd'))}
              className="flex-shrink-0 flex flex-col items-center gap-1.5 outline-none group"
            >
              <span className={`text-[10px] font-bold transition-colors ${
                isSelected ? 'text-primary-coral' : 'text-slate-400 group-hover:text-slate-600'
              }`}>
                {dayName}
              </span>
              <div className={`relative w-11 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                isSelected 
                  ? 'bg-gradient-to-br from-primary-coral to-primary-orange text-white shadow-lg scale-110' 
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700'
              }`}>
                <span className="text-base font-black">{format(d, 'd')}</span>
                {isToday && !isSelected && (
                  <div className="absolute bottom-1 w-1 h-1 bg-primary-coral rounded-full" />
                )}
              </div>
            </button>
          );
        })}
        <button 
          onClick={() => setIsExpanded(true)}
          className="flex-shrink-0 flex flex-col items-center justify-end gap-1.5"
        >
          <div className="w-11 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-primary-coral transition-colors">
            <CalendarIcon size={18} />
          </div>
        </button>
      </div>
    );
  };

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {isExpanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-4 rounded-[32px] overflow-hidden shadow-2xl"
          >
            {renderHeader()}
            {renderDays()}
            {renderCells()}
            <button 
              onClick={() => setIsExpanded(false)}
              className="w-full mt-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              접기
            </button>
          </motion.div>
        ) : (
          <motion.div key="compact" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-4 px-1">
               <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {format(new Date(selectedDate), 'yyyy년 M월', { locale: ko })}
               </h3>
               <button 
                onClick={() => setIsExpanded(true)}
                className="text-[11px] font-bold text-primary-coral hover:underline"
               >
                전체 달력 보기
               </button>
            </div>
            {renderWeeklyView()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
