import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Mail, Send, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signInWithMagicLink, devBypassLogin } = useAuthStore();

  const isDev = import.meta.env.DEV;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    const { error } = await signInWithMagicLink(email);
    setLoading(false);

    if (!error) {
      setIsSent(true);
    } else {
      alert('오류가 발생했습니다: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-background-dark flex items-center justify-center p-6 relative overflow-hidden">
      {/* Dev Bypass Button - Moved to bottom and made more visible */}
      {isDev && (
        <button
          onClick={() => devBypassLogin()}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 border-2 border-primary-orange text-xs font-black text-primary-orange hover:bg-primary-orange hover:text-white transition-all z-[200] shadow-2xl shadow-primary-orange/20"
        >
          <ShieldAlert size={14} />
          DEBUG: FORCE LOGIN (DEV ONLY)
        </button>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass-card p-10 rounded-[40px] text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-coral to-primary-orange flex items-center justify-center shadow-lg mx-auto mb-6">
          <Heart className="text-white w-10 h-10 fill-current" />
        </div>
        
        <h1 className="text-3xl font-black text-white mb-2 tracking-tighter">DateSync</h1>
        <p className="text-slate-400 mb-10">연인과 함께하는 특별한 데이트 플래너</p>

        {isSent ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-col items-center gap-4 text-emerald-400">
              <CheckCircle2 size={48} />
              <p className="font-bold text-lg">매직 링크가 발송되었습니다!</p>
            </div>
            <p className="text-slate-500 text-sm">
              {email} 주소로 전송된 링크를 클릭하여<br />로그인을 완료해주세요.
            </p>
            <button 
              onClick={() => setIsSent(false)}
              className="text-slate-400 text-sm underline underline-offset-4"
            >
              이메일 다시 입력하기
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input
                type="email"
                placeholder="이메일 주소를 입력하세요"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800/50 border-none rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-primary-coral outline-none transition-all"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-primary-coral to-primary-orange text-white font-bold rounded-2xl shadow-xl shadow-primary-coral/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? '발송 중...' : (
                <>
                  <Send size={18} />
                  매직 링크 보내기
                </>
              )}
            </button>

            <div className="pt-4 flex flex-col gap-3">
               <button type="button" className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-2xl flex items-center justify-center gap-3 hover:bg-white/10 transition-colors">
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="" />
                  Google로 계속하기
               </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};
