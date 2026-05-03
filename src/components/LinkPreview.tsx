import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, MapPin, ExternalLink, Globe } from 'lucide-react';
import { getLinkType, fetchRealOpenGraph } from '../utils/linkParser';
import type { LinkMetadata } from '../utils/linkParser';

interface LinkPreviewProps {
  url: string;
  activityTitle?: string;
}

/**
 * Skeleton UI Component
 */
const LinkSkeleton = () => (
  <div className="mt-4 p-4 rounded-2xl bg-slate-900/40 border border-slate-800 backdrop-blur-md animate-pulse flex gap-4">
    <div className="w-20 h-20 bg-slate-800 rounded-xl shrink-0" />
    <div className="flex-1 space-y-3 py-1">
      <div className="h-4 bg-slate-800 rounded w-3/4" />
      <div className="h-3 bg-slate-800 rounded w-full" />
      <div className="h-3 bg-slate-800 rounded w-1/2" />
    </div>
  </div>
);

export const LinkPreview = ({ url, activityTitle }: LinkPreviewProps) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LinkMetadata | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchMetadata = async () => {
      setLoading(true);
      const metadata = await fetchRealOpenGraph(url);
      
      if (isMounted) {
        setData(metadata);
        setLoading(false);
      }
    };

    if (url) {
      fetchMetadata();
    }
    
    return () => { isMounted = false; };
  }, [url]);

  if (!url) return null;

  if (loading) return <LinkSkeleton />;

  // 에러 핸들링 및 Fallback (알약 형태의 링크 버튼)
  if (!data || (data.type === 'unknown' && !data.title)) {
    return (
      <motion.a
        href={url}
        target="_blank"
        rel="noreferrer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/60 border border-slate-700 text-slate-400 text-xs font-medium hover:bg-slate-700/80 hover:text-white transition-all shadow-sm"
      >
        <ExternalLink size={12} className="shrink-0" />
        <span className="truncate max-w-[200px]">{url}</span>
      </motion.a>
    );
  }

  const renderThumbnailFallback = (type: string) => {
    const isMap = type === 'map';
    return (
      <div className={`w-20 h-20 rounded-xl shadow-2xl flex items-center justify-center shrink-0 border border-slate-700/50 ${
        isMap 
          ? 'bg-gradient-to-br from-emerald-500/20 to-teal-700/40 text-emerald-400' 
          : 'bg-gradient-to-br from-slate-800 to-slate-900 text-slate-500'
      }`}>
        {isMap ? <MapPin size={28} className="drop-shadow-md" /> : <Globe size={28} />}
      </div>
    );
  };

  const renderVariantContent = () => {
    // 제목이 없거나 "네이버 지도" 처럼 무의미할 경우 Fallback 적용
    const displayTitle = (data.title && data.title !== '네이버 지도' && data.title !== 'Google Maps') 
      ? data.title 
      : (activityTitle || data.url);

    switch (data.type) {
      case 'instagram':
        return (
          <div className="flex gap-4">
            <div className="relative shrink-0">
              {data.thumbnail ? (
                <img
                  src={data.thumbnail}
                  alt={displayTitle}
                  className="w-20 h-20 object-cover rounded-xl shadow-2xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.appendChild(document.createElement('div'));
                  }}
                />
              ) : renderThumbnailFallback('instagram')}
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] rounded-full flex items-center justify-center border-2 border-slate-900">
                <Camera size={14} className="text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-black text-primary-coral uppercase tracking-tighter">Instagram</span>
              </div>
              <h4 className="text-sm font-bold text-slate-100 truncate">{displayTitle}</h4>
              <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                {data.description || '인스타그램에서 상세 내용을 확인해보세요.'}
              </p>
            </div>
          </div>
        );
        
      case 'map':
        return (
          <div className="flex gap-4">
            {data.thumbnail ? (
              <img
                src={data.thumbnail}
                alt={displayTitle}
                className="w-20 h-20 object-cover rounded-xl shadow-2xl brightness-75 group-hover:brightness-100 transition-all shrink-0"
              />
            ) : renderThumbnailFallback('map')}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter">{data.siteName || 'Map'}</span>
              </div>
              <h4 className="text-sm font-bold text-slate-100 truncate">{displayTitle}</h4>
              <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                {data.description || '지도를 클릭하여 상세 위치와 정보를 확인하세요.'}
              </p>
            </div>
          </div>
        );
        
      case 'general':
      default:
        return (
          <div className="flex items-center gap-4">
            {data.thumbnail ? (
              <img src={data.thumbnail} className="w-14 h-14 object-cover rounded-xl opacity-80 shrink-0 shadow-lg" alt="" />
            ) : (
              <div className="w-14 h-14 bg-slate-800/80 rounded-xl flex items-center justify-center text-slate-500 shrink-0 border border-slate-700">
                <Globe size={24} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-100 truncate">{displayTitle}</h4>
              <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tight font-bold">{data.siteName || 'Website'}</p>
              <p className="text-xs text-slate-400 truncate mt-0.5">{data.description}</p>
            </div>
            <ExternalLink size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
          </div>
        );
    }
  };

  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noreferrer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="mt-4 block p-4 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-md shadow-2xl hover:bg-slate-800/40 hover:border-slate-700 transition-all group overflow-hidden relative"
    >
      {/* Glassmorphism Highlight */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      
      {renderVariantContent()}
    </motion.a>
  );
};
