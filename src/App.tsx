import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Plus, Moon, Sun, Loader2, LogOut } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { TimelineBoard } from './components/TimelineBoard';
import { CalendarView } from './components/CalendarView';
import { AddPlanSheet } from './components/AddPlanSheet';
import { useThemeStore } from './store/useThemeStore';
import { useAuthStore } from './store/useAuthStore';
import { usePlanStore } from './store/usePlanStore';
import { AuthPage } from './pages/AuthPage';
import { ConnectionPage } from './pages/ConnectionPage';

function MainBoard() {
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const { isDarkMode, toggleTheme } = useThemeStore();
  const { user, signOut } = useAuthStore();
  const { fetchPlans, subscribeToPlans } = usePlanStore();

  useEffect(() => {
    fetchPlans();
    const unsubscribe = subscribeToPlans();
    return () => unsubscribe();
  }, [fetchPlans, subscribeToPlans]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-background-light dark:bg-background-dark pb-24 transition-colors duration-300"
    >
      <header className="sticky top-0 z-50 glass-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-coral to-primary-orange flex items-center justify-center shadow-lg">
            <Heart className="text-white w-6 h-6 fill-current" />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-coral to-primary-orange">
            DateSync
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:scale-110 transition-transform"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          <button 
            onClick={signOut}
            className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold border border-white dark:border-slate-600 group"
          >
            <span className="group-hover:hidden">{user?.email?.[0].toUpperCase()}</span>
            <LogOut size={14} className="hidden group-hover:block" />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-8">
        <div className="mb-10">
          <CalendarView />
        </div>
        <div className="mb-8">
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mb-1">오늘의 데이트 코스</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">파트너가 제안한 계획을 확인하고 응답해주세요.</p>
        </div>
        <TimelineBoard />
      </main>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsAddSheetOpen(true)}
        className="fixed bottom-8 right-6 w-16 h-16 rounded-full bg-gradient-to-br from-primary-coral to-primary-orange text-white shadow-2xl flex items-center justify-center z-[90]"
      >
        <Plus size={32} strokeWidth={3} />
      </motion.button>

      <AddPlanSheet isOpen={isAddSheetOpen} onClose={() => setIsAddSheetOpen(false)} />
    </motion.div>
  );
}

function App() {
  const { user, coupleId, loading, initialize } = useAuthStore();
  const { isDarkMode } = useThemeStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-coral w-10 h-10" />
      </div>
    );
  }

  return (
    <>
      <Toaster 
        toastOptions={{
          className: 'dark:bg-slate-800 dark:text-white dark:border dark:border-slate-700',
          style: {
            borderRadius: '16px',
            fontSize: '14px',
            fontWeight: '600',
          }
        }}
      />
      <AnimatePresence mode="wait">
        {!user ? (
          <AuthPage key="auth" />
        ) : !coupleId ? (
          <ConnectionPage key="connection" />
        ) : (
          <MainBoard key="main" />
        )}
      </AnimatePresence>
    </>
  );
}

export default App;
