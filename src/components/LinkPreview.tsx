import { useState, useEffect } from 'react';
import { Camera, MapPin, ExternalLink, Globe } from 'lucide-react';
import { getLinkType, mockFetchOpenGraph } from '../utils/linkParser';
import type { LinkMetadata } from '../utils/linkParser';

interface LinkPreviewProps {
  url: string;
}

export const LinkPreview = ({ url }: LinkPreviewProps) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LinkMetadata | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      setLoading(true);
      const type = getLinkType(url);
      const metadata = await mockFetchOpenGraph(url, type);
      setData(metadata);
      setLoading(false);
    };

    if (url) {
      fetchMetadata();
    }
  }, [url]);

  if (!url) return null;

  if (loading) {
    return (
      <div className="mt-4 p-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 animate-pulse flex gap-3">
        <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        <div className="flex-1 space-y-2 py-1">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!data || data.type === 'unknown') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
      >
        <ExternalLink size={12} />
        {url}
      </a>
    );
  }

  const renderContent = () => {
    switch (data.type) {
      case 'instagram':
        return (
          <div className="flex gap-3">
            <div className="relative">
              <img
                src={data.thumbnail}
                alt={data.title}
                className="w-20 h-20 object-cover rounded-xl shadow-sm"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800">
                <Camera size={12} className="text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Instagram</p>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">@sapporo_traveler</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{data.description}</p>
            </div>
          </div>
        );
      case 'map':
        return (
          <div className="flex gap-3">
            <img
              src={data.thumbnail}
              alt={data.title}
              className="w-20 h-20 object-cover rounded-xl shadow-sm"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-0.5">
                <MapPin size={10} className="text-primary-coral" />
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">{data.siteName}</p>
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{data.title}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 italic">{data.description}</p>
            </div>
          </div>
        );
      case 'general':
        return (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-400 flex-shrink-0">
              {data.thumbnail ? (
                <img src={data.thumbnail} className="w-full h-full object-cover rounded-lg" alt="" />
              ) : (
                <Globe size={20} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{data.title}</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{data.siteName || data.url}</p>
            </div>
            <ExternalLink size={14} className="text-slate-300 dark:text-slate-600" />
          </div>
        );
    }
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-4 block p-3 rounded-2xl bg-white/60 dark:bg-slate-800/40 border border-white dark:border-slate-700 shadow-sm hover:shadow-md hover:bg-white/80 dark:hover:bg-slate-800/60 transition-all group"
    >
      {renderContent()}
    </a>
  );
};
