import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, MapPin, ExternalLink, Globe } from 'lucide-react';
import { fetchRealOpenGraph } from '../utils/linkParser';
import type { LinkMetadata } from '../utils/linkParser';

interface LinkPreviewProps {
  url: string;
  activityTitle?: string;
}

/**
 * Skeleton UI - Terminal Blue Aesthetic
 */
const LinkSkeleton = () => (
  <div className="mt-4 p-4 rounded-3xl bg-[#0F172A]/40 border border-slate-800 backdrop-blur-md animate-pulse flex gap-4">
    <div className="w-20 h-20 bg-slate-800/50 rounded-2xl shrink-0" />
    <div className="flex-1 space-y-3 py-1">
      <div className="h-4 bg-slate-800/50 rounded w-3/4" />
      <div className="h-3 bg-slate-800/50 rounded w-full" />
      <div className="h-3 bg-slate-800/50 rounded w-1/2" />
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
      const metadata = await fetchRealOpenGraph(url, activityTitle);
      if (isMounted) {
        setData(metadata);
        setLoading(false);
      }
    };
    if (url) fetchMetadata();
    return () => { isMounted = false; };
  }, [url, activityTitle]);

  if (!url) return null;
  if (loading) return <LinkSkeleton />;

  // 1. Fallback: Simple Pill for unknown/broken links
  if (!data || (!data.title && !data.thumbnail)) {
    return (
      <motion.a
        href={url}
        target="_blank"
        rel="noreferrer"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0F172A]/60 border border-slate-800 text-slate-400 text-xs font-bold hover:text-white transition-all shadow-lg"
      >
        <ExternalLink size={14} className="shrink-0" />
        <span className="truncate max-w-[200px]">{url}</span>
      </motion.a>
    );
  }

  // 2. Thumbnail Fallback UI (Terminal Blue + Coral Gradient)
  const renderThumbnail = () => {
    if (data.thumbnail) {
      return (
        <img
          src={data.thumbnail}
          alt={data.title}
          className="w-20 h-20 object-cover rounded-2xl shadow-2xl transition-transform duration-500 group-hover:scale-110"
        />
      );
    }

    return (
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] border border-slate-800 flex items-center justify-center relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary-coral/10 to-transparent" />
        {data.type === 'map' ? (
          <MapPin size={32} className="text-primary-coral drop-shadow-[0_0_8px_rgba(255,107,107,0.4)]" />
        ) : data.type === 'instagram' ? (
          <Camera size={32} className="text-primary-coral" />
        ) : (
          <Globe size={32} className="text-slate-600" />
        )}
      </div>
    );
  };

  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noreferrer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="mt-4 block p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-md hover:shadow-xl hover:border-primary-coral/20 transition-all group overflow-hidden cursor-pointer relative"
    >
      <div className="flex gap-4 items-center">
        <div className="shrink-0 relative overflow-hidden rounded-xl">
          {renderThumbnail()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
              {data.siteName || (data.type === 'map' ? 'Naver Map' : 'Link')}
            </span>
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate mb-1 leading-snug">
            {data.title || activityTitle || '상세 정보 보기'}
          </h4>
          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
            {data.description || '네이버 지도에서 상세 정보를 확인하세요.'}
          </p>
          <p className="text-[9px] text-primary-coral font-medium mt-1 opacity-70 group-hover:opacity-100 transition-opacity">
            {new URL(url).hostname}
          </p>
        </div>

        <div className="shrink-0 ml-1">
          <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-300 group-hover:text-primary-coral group-hover:bg-primary-coral/5 transition-all">
            <ExternalLink size={14} />
          </div>
        </div>
      </div>
    </motion.a>
  );
};
