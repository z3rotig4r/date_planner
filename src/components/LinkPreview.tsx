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

  // 2. Thumbnail Fallback UI (Horizontal Layout)
  const renderThumbnail = () => {
    if (data.thumbnail) {
      return (
        <img
          src={data.thumbnail}
          alt={data.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      );
    }

    return (
      <div className="w-full h-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        {data.type === 'map' ? (
          <MapPin size={24} className="text-slate-300" />
        ) : data.type === 'instagram' ? (
          <Camera size={24} className="text-slate-300" />
        ) : data.type === 'youtube' ? (
          <div className="text-rose-500 opacity-40">
            <Globe size={24} />
          </div>
        ) : (
          <Globe size={24} className="text-slate-200" />
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
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="mt-3 flex items-stretch rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group overflow-hidden cursor-pointer"
    >
      {/* Horizontal Image (Left) */}
      <div className="w-24 min-h-[90px] shrink-0 bg-slate-50 dark:bg-slate-900 flex items-center justify-center relative overflow-hidden border-r border-slate-50 dark:border-slate-700">
        {renderThumbnail()}
      </div>

      {/* Content Area (Right) */}
      <div className="flex-1 min-w-0 p-3 flex flex-col justify-center">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
            {data.siteName || (data.type === 'map' ? 'Naver Map' : 'Link')}
          </span>
        </div>
        
        <h4 className="text-[13px] font-bold text-slate-800 dark:text-slate-100 leading-tight mb-1 line-clamp-2">
          {data.title || activityTitle || '상세 정보 보기'}
        </h4>
        
        <p className="text-[10px] text-slate-500 line-clamp-1 opacity-80">
          {data.description || '클릭하여 상세 정보를 확인하세요.'}
        </p>

        <div className="mt-1 flex items-center gap-1">
          <Globe size={8} className="text-slate-300" />
          <span className="text-[8px] text-slate-400 font-medium truncate">
            {new URL(url).hostname}
          </span>
        </div>
      </div>

      {/* Right Arrow Icon */}
      <div className="w-8 shrink-0 flex items-center justify-center text-slate-200 group-hover:text-primary-coral transition-colors">
        <ExternalLink size={12} />
      </div>
    </motion.a>
  );
};
