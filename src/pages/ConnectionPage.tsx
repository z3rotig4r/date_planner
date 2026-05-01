import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Link2, LogOut, Check, RefreshCw, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export const ConnectionPage = () => {
  const [partnerCode, setPartnerCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const { profile, loading: authLoading, initialize, connectWithPartner, signOut } = useAuthStore();

  const handleCopy = () => {
    if (profile?.invite_code) {
      navigator.clipboard.writeText(profile.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerCode) return;

    setLoading(true);
    const { error } = await connectWithPartner(partnerCode);
    setLoading(false);

    if (error) {
      alert(error);
    }
  };

  return (
    <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center p-6 text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg space-y-8"
      >
        <div className="text-center">
          <h1 className="text-4xl font-black mb-2 tracking-tight">커플 연결하기</h1>
          <p className="text-slate-400">함께 데이트를 계획할 상대방을 찾아보세요.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* My Code Section */}
          <div className="glass-card p-8 rounded-[32px] flex flex-col items-center text-center">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">내 초대 코드</p>
            
            {authLoading ? (
              <div className="h-20 flex flex-col items-center justify-center gap-2">
                <div className="w-32 h-10 bg-slate-800 rounded-xl animate-pulse" />
                <p className="text-[10px] text-slate-500 animate-pulse">코드 발급 중...</p>
              </div>
            ) : profile?.invite_code ? (
              <>
                <div className="text-3xl font-black tracking-widest text-primary-coral mb-6">
                  {profile.invite_code}
                </div>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${
                    copied ? 'bg-emerald-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  {copied ? '복사됨!' : '코드 복사'}
                </button>
              </>
            ) : (
              <div className="h-20 flex flex-col items-center justify-center gap-4">
                <p className="text-xs text-rose-400">코드를 불러오지 못했습니다.</p>
                <button 
                  onClick={() => initialize()}
                  className="flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white"
                >
                  <RefreshCw size={16} /> 재시도
                </button>
              </div>
            )}
          </div>

          {/* Connect Section */}
          <div className="glass-card p-8 rounded-[32px]">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 text-center">상대방 코드 입력</p>
            <form onSubmit={handleConnect} className="space-y-4">
              <input
                placeholder="코드 6자리"
                maxLength={6}
                value={partnerCode}
                onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-800/50 border-none rounded-2xl py-4 px-4 text-center text-xl font-black tracking-widest text-white focus:ring-2 focus:ring-primary-coral outline-none transition-all placeholder:text-slate-700"
              />
              <button
                type="submit"
                disabled={loading || authLoading || !profile}
                className="w-full py-4 bg-gradient-to-r from-primary-coral to-primary-orange text-white font-bold rounded-2xl shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Link2 size={18} />}
                {loading ? '연결 중...' : '연결하기'}
              </button>
            </form>
          </div>
        </div>

        <button
          onClick={signOut}
          className="mx-auto flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm font-medium"
        >
          <LogOut size={16} />
          다른 계정으로 로그인하기
        </button>
      </motion.div>
    </div>
  );
};
