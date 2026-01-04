import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ArticleForm from './components/ArticleForm';
import ArticleTable from './components/ArticleTable';
import Overview from './components/Overview';
import { CATEGORY_STRUCTURE, DEFAULT_HASHTAGS } from './types';

const SYNC_CONFIG_KEY = 'tm_robot_sync_config_v1';
const HASHTAG_LIBRARY_KEY = 'tm_robot_hashtag_library_v1';
// Replace your old hard-coded link with this:
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

// Then your fetch function uses it like this:
const response = await fetch(APPS_SCRIPT_URL, {
  method: 'POST',
  body: JSON.stringify(data)
});

const TM_BLUE = '#005C84'; 
const TM_GREEN = '#82BC41'; 

const generateId = () => `art-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

/**
 * Robust date parsing for Taipei Timezone (Local Browser Time).
 */
export const parseToLocalISO = (raw: any): string => {
  if (!raw || raw === '-') return '';
  if (typeof raw === 'string' && /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(raw.trim())) {
    return raw.trim().replace(/\//g, '-').split('-').map((v, i) => i > 0 ? v.padStart(2, '0') : v).join('-');
  }
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'library'>('overview');
  const [articles, setArticles] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [libraryHashtags, setLibraryHashtags] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [syncUrl] = useState<string>(localStorage.getItem(SYNC_CONFIG_KEY) || APPS_SCRIPT_URL);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [mainCategoryFilter, setMainCategoryFilter] = useState<string>('All');
  const [linkedInFilter, setLinkedInFilter] = useState<'All' | 'Yes' | 'No'>('All');
  const [publishDateRange, setPublishDateRange] = useState({ start: '', end: '' });
  const [topXCount, setTopXCount] = useState<number>(5); 

  const startPickerRef = useRef<HTMLInputElement>(null);
  const endPickerRef = useRef<HTMLInputElement>(null);

  /**
   * Deduplication logic: Ensures UI shows only unique records based on stable keys.
   * Removed auto-delete logic to prevent unexpected changes to source data.
   */
  const processSyncedData = useCallback((data: any[]) => {
    if (!Array.isArray(data)) return [];
    
    const uniqueMap = new Map<string, any>();
    
    data.forEach((item) => {
      if (!item) return;
      // Use rowNumber as the primary stable unique key, fall back to Title+Link if missing
      const rowNum = item.rowNumber || item.RowNumber || item['Row Number'];
      const title = String(item['Document Title'] || item['title'] || '').trim().toLowerCase();
      const link = String(item['Link (EN)'] || item['link'] || item['source url'] || '').trim().toLowerCase();
      
      const key = rowNum ? `row-${rowNum}` : `${title}|${link}`;
      
      // If we see a duplicate Row Number, we only keep the first one found
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, {
          ...item,
          id: key, // Use the stable key as the React ID to prevent duplicate renders
          rowNumber: rowNum
        });
      }
    });

    return Array.from(uniqueMap.values());
  }, []);

  const syncExcelToWeb = useCallback(async () => {
    if (!syncUrl) return;
    setSyncStatus('syncing');
    try {
      const response = await fetch(`${syncUrl}?t=${Date.now()}`, { method: 'GET' });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const rawData = await response.json();
      
      if (Array.isArray(rawData)) {
        const uniqueData = processSyncedData(rawData);
        const detectedHeaders = new Set<string>();
        uniqueData.forEach(item => {
          if (item && typeof item === 'object') {
            Object.keys(item).forEach(key => {
              if (key && !['id', 'createdAt', 'views', 'Views', 'rowNumber'].includes(key)) {
                detectedHeaders.add(key);
              }
            });
          }
        });

        const cleanedData = uniqueData
          .filter((item: any) => item && (item['Document Title'] || item['title']))
          .map((item: any) => {
            const dateKey = Object.keys(item).find(k => k.toLowerCase() === 'date' || k.toLowerCase() === 'publish date') || 'Date';
            const linkedinKey = Object.keys(item).find(k => k.toLowerCase().includes('linkedin')) || 'LinkedIn';
            const formattedDate = parseToLocalISO(item[dateKey]);
            return {
              ...item,
              [dateKey]: formattedDate,
              displayDate: formattedDate, 
              createdAt: item.createdAt || Date.now(),
              [linkedinKey]: (String(item[linkedinKey] || '').toLowerCase() === 'yes') ? 'Yes' : 'No',
              views: Number(item.views || 0)
            };
          });

        // Alphabetical sort by Main Category then Sub Category
        const sortedData = [...cleanedData].sort((a, b) => {
          const catA = String(a['Main Category'] || a['Category'] || '').toLowerCase();
          const catB = String(b['Main Category'] || b['Category'] || '').toLowerCase();
          if (catA < catB) return -1;
          if (catA > catB) return 1;
          
          const subA = String(a['Sub Category'] || a['Sub Hierarchy'] || '').toLowerCase();
          const subB = String(b['Sub Category'] || b['Sub Hierarchy'] || '').toLowerCase();
          if (subA < subB) return -1;
          if (subA > subB) return 1;
          return 0;
        });

        setHeaders(Array.from(detectedHeaders));
        setArticles(sortedData);
        setSyncStatus('success');
        
        const allTags = new Set<string>(DEFAULT_HASHTAGS);
        const savedTagsRaw = localStorage.getItem(HASHTAG_LIBRARY_KEY);
        if (savedTagsRaw) {
          try {
            const savedTags = JSON.parse(savedTagsRaw);
            if (Array.isArray(savedTags)) savedTags.forEach((t: string) => t && allTags.add(t));
          } catch (e) {}
        }
        cleanedData.forEach((art: any) => {
          const artTags = String(art['Hashtags'] || '').split(/[;,]/).map(t => t.trim()).filter(t => t && t.startsWith('#'));
          artTags.forEach(t => allTags.add(t));
        });
        const finalTags = Array.from(allTags).sort();
        setLibraryHashtags(finalTags);
        localStorage.setItem(HASHTAG_LIBRARY_KEY, JSON.stringify(finalTags));

        setTimeout(() => setSyncStatus('idle'), 1000);
      } else {
        setSyncStatus('error');
      }
    } catch (error) {
      console.error("Sync Error:", error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  }, [syncUrl, processSyncedData]);

  useEffect(() => {
    syncExcelToWeb();
  }, [syncExcelToWeb]);

  const handleSyncToDatabase = async (formData: any) => {
    setSyncStatus('syncing');
    try {
      const isUpdate = !!formData.rowNumber;
      const { id, displayDate, createdAt, ...payloadData } = formData;
      const payload = { ...payloadData, action: isUpdate ? 'UPDATE' : 'CREATE' };
      
      await fetch(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      
      await syncExcelToWeb();
      setIsAdding(false);
      setEditingArticle(null);
    } catch (error) {
      console.error("Database Sync Error:", error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 1500);
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    const item = articles.find(a => a.id === deleteConfirmId);
    if (item && item.rowNumber) {
      setSyncStatus('syncing');
      try {
        await fetch(syncUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ rowNumber: item.rowNumber, action: 'DELETE' })
        });
        await syncExcelToWeb();
      } catch (error) {
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 1500);
      }
    }
    setDeleteConfirmId(null);
  };

  const dynamicCategories = useMemo(() => {
    const mains = new Set<string>(Object.keys(CATEGORY_STRUCTURE));
    const subs = new Set<string>();
    Object.values(CATEGORY_STRUCTURE).flat().forEach(s => subs.add(s));
    articles.forEach(a => {
      const m = a['Main Category'] || a['Category'];
      const s = a['Sub Category'] || a['Sub Hierarchy'];
      if (m && m !== '-') mains.add(m);
      if (s && s !== '-') subs.add(s);
    });
    return { main: Array.from(mains).sort(), sub: Array.from(subs).sort() };
  }, [articles]);

  const filteredArticles = useMemo(() => {
    return articles.filter(a => {
      const content = Object.values(a).join(' ').toLowerCase();
      const matchesSearch = content.includes(searchTerm.toLowerCase());
      const catVal = a['Main Category'] || a['Category'] || 'Other';
      const matchesMain = mainCategoryFilter === 'All' || String(catVal) === mainCategoryFilter;
      const linkedinKey = headers.find(h => h && h.toLowerCase().includes('linkedin')) || 'LinkedIn';
      const lnVal = a[linkedinKey] || 'No';
      const matchesLinkedIn = linkedInFilter === 'All' || String(lnVal) === linkedInFilter;
      
      let matchesDate = true;
      if (publishDateRange.start || publishDateRange.end) {
        const dateKey = headers.find(h => h && (h.toLowerCase() === 'date' || h.toLowerCase() === 'publish date')) || 'Date';
        const artDateValue = a[dateKey];
        if (!artDateValue || artDateValue === '-') {
          matchesDate = false;
        } else {
          const artDateStr = parseToLocalISO(artDateValue);
          if (publishDateRange.start && artDateStr < publishDateRange.start) matchesDate = false;
          if (publishDateRange.end && artDateStr > publishDateRange.end) matchesDate = false;
        }
      }
      return matchesSearch && matchesMain && matchesLinkedIn && matchesDate;
    });
  }, [articles, searchTerm, mainCategoryFilter, linkedInFilter, publishDateRange, headers]);

  const exportToExcel = () => {
    if (filteredArticles.length === 0) return;
    const csvHeaders = headers.join(',');
    const rows = filteredArticles.map(art => {
      return headers.map(header => {
        let val = art[header] || '';
        val = String(val).replace(/"/g, '""');
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          val = `"${val}"`;
        }
        return val;
      }).join(',');
    });
    const csvContent = "\ufeff" + [csvHeaders, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `TM_Articles_Filtered_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr || dateStr === '-') return 'YYYY/MM/DD';
    return dateStr.replace(/-/g, '/');
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {syncStatus === 'syncing' && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100]">
          <div className="text-center">
             <div className="w-20 h-20 border-4 border-t-white border-white/20 rounded-full animate-spin mx-auto mb-6"></div>
             <h2 className="text-white text-2xl font-bold uppercase tracking-tighter">Syncing Database...</h2>
          </div>
        </div>
      )}

      {(isAdding || editingArticle) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="max-w-4xl w-full my-8">
            <ArticleForm 
              article={editingArticle || undefined}
              articles={articles}
              headers={headers}
              dynamicCategories={dynamicCategories}
              hashtagLibrary={libraryHashtags}
              onUpdateLibraryTags={(tags) => { setLibraryHashtags(tags); localStorage.setItem(HASHTAG_LIBRARY_KEY, JSON.stringify(tags)); }}
              onSubmit={handleSyncToDatabase}
              onCancel={() => { setIsAdding(false); setEditingArticle(null); }}
            />
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-3xl p-10 max-w-sm w-full shadow-2xl text-center">
            <h3 className="text-xl font-bold mb-4 uppercase text-red-600 tracking-tight">Confirm Deletion</h3>
            <p className="text-sm text-slate-500 mb-8 font-semibold">Are you sure you want to permanently remove this document?</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase tracking-widest text-xs">Cancel</button>
              <button onClick={executeDelete} className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg">Delete</button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-slate-200 shrink-0 h-24 flex items-center px-10 shadow-sm z-20">
        <div className="max-w-[1600px] w-full mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-4">
                <div className="flex items-center bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                  <svg viewBox="0 0 100 100" className="w-12 h-12">
                      <rect x="35" y="80" width="30" height="10" rx="2" fill={TM_BLUE} />
                      <circle cx="50" cy="75" r="8" fill="#cbd5e1" />
                      <rect x="46" y="50" width="8" height="25" rx="4" fill="#64748b" transform="rotate(-15 50 75)" />
                      <circle cx="56" cy="48" r="6" fill="#94a3b8" />
                      <rect x="52" y="25" width="8" height="25" rx="4" fill="#475569" transform="rotate(25 56 48)" />
                      <circle cx="42" cy="22" r="5" fill={TM_GREEN} />
                  </svg>
                </div>
                <div className="border-l border-slate-200 pl-4">
                  <h1 className="text-[14px] font-black text-[#005C84] uppercase tracking-[0.2em] leading-tight">ARTICLE SOURCE</h1>
                </div>
             </div>
             <nav className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-100 ml-4">
                <button 
                  onClick={() => setActiveTab('overview')}
                  className={`px-8 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-white text-[#005C84] shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Overview
                </button>
                <button 
                  onClick={() => setActiveTab('library')}
                  className={`px-8 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'library' ? 'bg-white text-[#005C84] shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Document Library
                </button>
             </nav>
          </div>
          <button onClick={syncExcelToWeb} className="px-6 py-2.5 bg-white text-xs font-bold uppercase tracking-widest text-[#005C84] rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2">Refresh Data</button>
        </div>
      </header>

      <main className="max-w-[1600px] w-full mx-auto p-10 flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeTab === 'overview' ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <Overview 
              articles={articles} 
              topXCount={topXCount} 
              setTopXCount={setTopXCount}
              colors={{ primary: TM_BLUE, success: TM_GREEN }}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-10 min-h-0 animate-in fade-in duration-500">
            <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col gap-6 shrink-0">
               <div className="flex flex-wrap gap-4 items-center">
                 <div className="relative flex-1 min-w-[300px]">
                   <input 
                    type="text" 
                    placeholder="search article" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#005C84]/10 transition-all shadow-inner" 
                   />
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                 </div>
                 <div className="flex gap-3">
                   <select value={mainCategoryFilter} onChange={(e) => setMainCategoryFilter(e.target.value)} className="px-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold uppercase tracking-widest outline-none text-slate-600 shadow-sm">
                      <option value="All">All Categories</option>
                      {dynamicCategories.main.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                   </select>
                   <select value={linkedInFilter} onChange={(e) => setLinkedInFilter(e.target.value as any)} className="px-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold uppercase tracking-widest outline-none text-slate-600 shadow-sm">
                      <option value="All">LinkedIn: All</option>
                      <option value="Yes">Posted</option>
                      <option value="No">Not Posted</option>
                   </select>
                   <div className="flex gap-2">
                    <button onClick={exportToExcel} className="px-6 py-3.5 bg-white text-[#005C84] border-2 border-[#005C84] rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-blue-50 transition-all active:scale-95 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Export Data
                    </button>
                    <button onClick={() => setIsAdding(true)} className="px-8 py-3.5 bg-[#82BC41] text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:brightness-105 shadow-lg shadow-green-100 transition-all active:scale-95">Add New Article</button>
                   </div>
                 </div>
               </div>
               
               <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter by Publish Date:</span>
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center bg-white border-2 border-slate-900 rounded-xl px-4 py-2 min-w-[180px] group transition-all hover:bg-slate-50 cursor-pointer" onClick={() => startPickerRef.current?.showPicker()}>
                      <div className="flex-1 pointer-events-none">
                        <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">From</p>
                        <p className="text-xs font-black text-slate-900 uppercase">{formatDateDisplay(publishDateRange.start)}</p>
                      </div>
                      <div className="ml-2 text-slate-900 flex items-center justify-center p-1 pointer-events-none">
                        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <input ref={startPickerRef} type="date" value={publishDateRange.start} onChange={(e) => { e.stopPropagation(); setPublishDateRange(p => ({...p, start: e.target.value})); }} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" />
                    </div>
                    <span className="text-slate-400 text-xs font-bold uppercase">To</span>
                    <div className="relative flex items-center bg-white border-2 border-slate-900 rounded-xl px-4 py-2 min-w-[180px] group transition-all hover:bg-slate-50 cursor-pointer" onClick={() => endPickerRef.current?.showPicker()}>
                      <div className="flex-1 pointer-events-none">
                        <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">To</p>
                        <p className="text-xs font-black text-slate-900 uppercase">{formatDateDisplay(publishDateRange.end)}</p>
                      </div>
                      <div className="ml-2 text-slate-900 flex items-center justify-center p-1 pointer-events-none">
                        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <input ref={endPickerRef} type="date" value={publishDateRange.end} onChange={(e) => { e.stopPropagation(); setPublishDateRange(p => ({...p, end: e.target.value})); }} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" />
                    </div>
                    {(publishDateRange.start || publishDateRange.end) && (
                      <button onClick={() => setPublishDateRange({start: '', end: ''})} className="text-red-500 hover:text-red-700 font-bold text-xs p-2 uppercase tracking-tighter transition-colors">Clear Filter</button>
                    )}
                  </div>
               </div>
            </section>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-auto custom-scrollbar">
                <ArticleTable 
                  articles={filteredArticles} 
                  headers={headers}
                  onEdit={setEditingArticle} 
                  onDelete={(id) => setDeleteConfirmId(id)} 
                  onToggleLinkedIn={(id) => {
                    const item = articles.find(a => a.id === id);
                    if (item) {
                      const key = headers.find(h => h && h.toLowerCase().includes('linkedin')) || 'LinkedIn';
                      const newVal = (String(item[key] || '').toLowerCase() === 'yes') ? 'No' : 'Yes';
                      handleSyncToDatabase({ ...item, [key]: newVal });
                    }
                  }} 
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
