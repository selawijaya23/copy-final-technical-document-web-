
import React, { useMemo, useState, useRef } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis,
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  CartesianGrid
} from 'recharts';
import { parseToLocalISO } from '../App';

interface OverviewProps {
  articles: any[];
  topXCount: number;
  setTopXCount: (count: number) => void;
  colors: { primary: string, success: string };
}

const GlobalDatePicker = ({ start, end, onStartChange, onEndChange }: any) => {
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);

  const formatDateText = (dateStr: string) => {
    if (!dateStr || dateStr === '-') return 'YYYY/MM/DD';
    return dateStr.replace(/-/g, '/');
  };

  return (
    <div className="flex items-center gap-3">
      <div 
        className="relative flex items-center bg-white border-2 border-slate-900 rounded-xl px-3 py-2 min-w-[160px] group transition-all hover:bg-slate-50 cursor-pointer overflow-hidden"
        onClick={() => startRef.current?.showPicker()}
      >
        <div className="flex-1 pointer-events-none">
          <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">From</p>
          <p className="text-[11px] font-black text-slate-900 uppercase">{formatDateText(start)}</p>
        </div>
        <div className="ml-2 text-slate-900 flex items-center justify-center p-1 pointer-events-none">
           <svg width="10" height="6" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <input 
          ref={startRef} 
          type="date" 
          value={start || ''} 
          onChange={(e) => { e.stopPropagation(); onStartChange(e.target.value); }} 
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" 
        />
      </div>

      <span className="text-[10px] font-black text-slate-400 uppercase">To</span>

      <div 
        className="relative flex items-center bg-white border-2 border-slate-900 rounded-xl px-3 py-2 min-w-[160px] group transition-all hover:bg-slate-50 cursor-pointer overflow-hidden"
        onClick={() => endRef.current?.showPicker()}
      >
        <div className="flex-1 pointer-events-none">
          <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">To</p>
          <p className="text-[11px] font-black text-slate-900 uppercase">{formatDateText(end)}</p>
        </div>
        <div className="ml-2 text-slate-900 flex items-center justify-center p-1 pointer-events-none">
           <svg width="10" height="6" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <input 
          ref={endRef} 
          type="date" 
          value={end || ''} 
          onChange={(e) => { e.stopPropagation(); onEndChange(e.target.value); }} 
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" 
        />
      </div>
    </div>
  );
};

const Overview: React.FC<OverviewProps> = ({ 
  articles, 
  topXCount, 
  setTopXCount,
  colors 
}) => {
  const [trendingDateRange, setTrendingDateRange] = useState({ start: '', end: '' });
  const [engagementDateRange, setEngagementDateRange] = useState({ start: '', end: '' });

  const safeArticles = useMemo(() => Array.isArray(articles) ? articles : [], [articles]);

  const statsByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    safeArticles.forEach(a => { 
      const cat = a['Main Category'] || a['Category'] || 'Other';
      if (cat && cat !== '-') counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [safeArticles]);

  const topArticles = useMemo(() => {
    return [...safeArticles]
      .filter(a => {
        const artDateValue = a['Date'] || a['Publish Date'];
        if (!artDateValue || artDateValue === '-') return true;
        const artDateStr = parseToLocalISO(artDateValue);
        
        if (trendingDateRange.start && artDateStr < trendingDateRange.start) return false;
        if (trendingDateRange.end && artDateStr > trendingDateRange.end) return false;
        return true;
      })
      .sort((a, b) => Number(b.views || 0) - Number(a.views || 0))
      .slice(0, Math.max(0, topXCount));
  }, [safeArticles, topXCount, trendingDateRange]);

  const totalViewsFiltered = useMemo(() => {
    return safeArticles
      .filter(a => {
        const artDateValue = a['Date'] || a['Publish Date'];
        if (!artDateValue || artDateValue === '-') return true;
        const artDateStr = parseToLocalISO(artDateValue);
        
        if (engagementDateRange.start && artDateStr < engagementDateRange.start) return false;
        if (engagementDateRange.end && artDateStr > engagementDateRange.end) return false;
        return true;
      })
      .reduce((acc, a) => acc + Number(a.views || 0), 0);
  }, [safeArticles, engagementDateRange]);

  const cardClasses = "bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-shadow hover:shadow-md";
  const labelClasses = "text-[11px] font-black text-slate-400 uppercase tracking-widest block";

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className={labelClasses + " mb-2"}>Total Articles</p>
          <p className="text-7xl font-black text-slate-950 tracking-tighter">{safeArticles.length}</p>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <p className={labelClasses}>Total Engagements</p>
            <GlobalDatePicker 
               start={engagementDateRange.start} 
               end={engagementDateRange.end}
               onStartChange={(v: any) => setEngagementDateRange(p => ({...p, start: v}))}
               onEndChange={(v: any) => setEngagementDateRange(p => ({...p, end: v}))}
            />
          </div>
          <p className="text-7xl font-black text-[#82BC41] tracking-tighter">{totalViewsFiltered.toLocaleString()}</p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`${cardClasses} lg:col-span-2`}>
           <div className="flex justify-between items-center mb-10">
              <h3 className="text-[14px] font-black uppercase tracking-widest text-slate-800">Article Distributions</h3>
              <div className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-[#005C84]"></span>
                 <span className="text-[9px] font-black text-slate-300 uppercase">Documents per Category</span>
              </div>
           </div>
           <div className="h-[500px]"> 
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={statsByCategory} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#1e293b'}} />
                 <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                 <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 800}} />
                 <Bar dataKey="count" radius={[12, 12, 0, 0]} barSize={40}>
                   {statsByCategory.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? colors.primary : colors.success} />)}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className={`${cardClasses}`}>
           <div className="mb-10 flex flex-col gap-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-[14px] font-black uppercase tracking-widest text-slate-900">MOST TRENDING</h3>
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg">
                   <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">Top:</span>
                   <input 
                    type="number" 
                    value={topXCount} 
                    onChange={(e) => setTopXCount(Math.max(1, parseInt(e.target.value) || 0))} 
                    className="w-12 bg-transparent text-[12px] font-black text-[#005C84] outline-none text-center" 
                   />
                </div>
              </div>
              <GlobalDatePicker 
                start={trendingDateRange.start} 
                end={trendingDateRange.end} 
                onStartChange={(v: any) => setTrendingDateRange(p => ({...p, start: v}))} 
                onEndChange={(v: any) => setTrendingDateRange(p => ({...p, end: v}))} 
              />
           </div>

           <div className="space-y-6 overflow-y-auto max-h-[700px] custom-scrollbar pr-2">
              {topArticles.map((art, i) => (
                <div key={art.id} className="relative pl-10 flex items-start group">
                   <span className="absolute left-0 top-0 text-[20px] font-black text-slate-950 italic leading-none transition-colors group-hover:text-slate-400">{(i+1).toString().padStart(2, '0')}</span>
                   <div className="w-full">
                     <a 
                      href={art['link (en)'] || art['link'] || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[13px] font-black text-slate-950 hover:text-[#005C84] block transition-colors leading-relaxed whitespace-normal"
                     >
                       {art['Document Title'] || art['title'] || 'Untitled'}
                     </a>
                     <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                        <span className="text-[10px] font-black text-[#82BC41] bg-green-50 px-2 py-0.5 rounded-md">{(art.views || 0).toLocaleString()} views</span>
                        <span className="text-[10px] font-black text-white bg-[#005C84] px-2.5 py-1 rounded-lg uppercase tracking-wider">{art['Main Category'] || 'General'}</span>
                     </div>
                   </div>
                </div>
              ))}
              {topArticles.length === 0 && (
                <div className="py-20 text-center">
                   <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">No Trending Data Found</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
