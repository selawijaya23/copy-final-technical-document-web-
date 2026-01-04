import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CATEGORY_STRUCTURE } from '../types';
import { generateAutoSummary } from '../services/geminiService';
import { parseToLocalISO } from '../App';

interface ArticleFormProps {
  article?: any;
  articles: any[];
  headers: string[];
  dynamicCategories: { main: string[], sub: string[] };
  hashtagLibrary: string[];
  onUpdateLibraryTags: (tags: string[]) => void;
  onSubmit: (article: any) => void;
  onCancel: () => void;
}

const ArticleForm: React.FC<ArticleFormProps> = ({ 
  article, 
  articles,
  headers, 
  dynamicCategories,
  hashtagLibrary, 
  onUpdateLibraryTags, 
  onSubmit, 
  onCancel 
}) => {
  const [formData, setFormData] = useState<any>({});
  const [showChinese, setShowChinese] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  
  const [isAddingNewMainCat, setIsAddingNewMainCat] = useState(false);
  const [isAddingNewSubCat, setIsAddingNewSubCat] = useState(false);

  const dateInputRef = useRef<HTMLInputElement>(null);

  const coreKeys = useMemo(() => {
    const safeHeaders = Array.isArray(headers) ? headers : [];
    const detectedDateKey = safeHeaders.find(h => h && (h.toLowerCase() === 'date' || h.toLowerCase() === 'publish date')) || 'Date';
    
    return {
      title: safeHeaders.find(h => h && (h.toLowerCase() === 'document title' || h.toLowerCase() === 'title')) || 'Document Title',
      linkEN: safeHeaders.find(h => h && (h.toLowerCase() === 'link (en)' || h.toLowerCase() === 'source url' || h.toLowerCase() === 'link')) || 'Link (EN)',
      slugEN: safeHeaders.find(h => h && (h.toLowerCase() === 'slug (en)')) || 'Slug (EN)',
      mainCat: safeHeaders.find(h => h && (h.toLowerCase() === 'main category' || h.toLowerCase() === 'category')) || 'Main Category',
      subCat: safeHeaders.find(h => h && (h.toLowerCase() === 'sub category' || h.toLowerCase() === 'sub hierarchy')) || 'Sub Category',
      desc: safeHeaders.find(h => h && (h.toLowerCase() === 'article summary' || h.toLowerCase() === 'description')) || 'Article Summary',
      author: safeHeaders.find(h => h && (h.toLowerCase() === 'author')) || 'Author',
      linkedin: safeHeaders.find(h => h && (h.toLowerCase() === 'linkedin' || h.toLowerCase() === 'linkedin posted')) || 'LinkedIn',
      hashtags: safeHeaders.find(h => h && (h.toLowerCase() === 'hashtags')) || 'Hashtags',
      date: detectedDateKey,
      cTitle: safeHeaders.find(h => h && (h.toLowerCase() === 'chinese title' || h.toLowerCase().includes('chinese title'))) || 'Chinese Title',
      linkZH: safeHeaders.find(h => h && (h.toLowerCase() === 'link (zh)' || h.toLowerCase().includes('chinese link'))) || 'Link (ZH)',
      slugZH: safeHeaders.find(h => h && (h.toLowerCase() === 'slug (zh)')) || 'Slug (ZH)'
    };
  }, [headers]);

  useEffect(() => {
    const initialData: any = {};
    const safeHeaders = Array.isArray(headers) ? headers : [];
    
    if (article) {
      if (article.rowNumber) initialData.rowNumber = article.rowNumber;
      if (article.id) initialData.id = article.id;
      Object.keys(article).forEach(k => { if (!initialData.hasOwnProperty(k)) initialData[k] = article[k]; });
    }

    safeHeaders.forEach(h => {
      const val = article ? article[h] : '';
      if (h.toLowerCase() === 'date' || h.toLowerCase() === 'publish date') {
        initialData[h] = parseToLocalISO(val);
      } else {
        initialData[h] = (val === undefined || val === null || val === '-') ? '' : val;
      }
    });
    
    if (coreKeys.linkedin) {
      const val = String(initialData[coreKeys.linkedin]).toLowerCase();
      initialData[coreKeys.linkedin] = (val === 'yes' || val === 'true') ? 'Yes' : 'No';
    }

    if (!article && coreKeys.mainCat && !initialData[coreKeys.mainCat]) {
      initialData[coreKeys.mainCat] = Object.keys(CATEGORY_STRUCTURE)[0];
    }
    
    if (article && ((coreKeys.cTitle && article[coreKeys.cTitle]) || (coreKeys.linkZH && article[coreKeys.linkZH]))) {
      setShowChinese(true);
    }
    setFormData(initialData);
  }, [article, headers, coreKeys]);

  useEffect(() => {
    const currentTitle = String(formData[coreKeys.title] || '').trim().toLowerCase();
    const currentLink = String(formData[coreKeys.linkEN] || '').trim().toLowerCase();
    const currentSlug = String(formData[coreKeys.slugEN] || '').trim().toLowerCase();
    if (!currentTitle && !currentLink && !currentSlug) { setDuplicateError(null); return; }

    const isDuplicate = articles.some(a => {
      if (article && (a.id === article.id || (article.rowNumber && a.rowNumber === article.rowNumber))) return false;
      const titleMatch = currentTitle && String(a[coreKeys.title] || '').trim().toLowerCase() === currentTitle;
      const linkMatch = currentLink && String(a[coreKeys.linkEN] || '').trim().toLowerCase() === currentLink;
      const slugMatch = currentSlug && String(a[coreKeys.slugEN] || '').trim().toLowerCase() === currentSlug;
      return titleMatch || linkMatch || slugMatch;
    });
    if (isDuplicate) setDuplicateError("Duplicate Entry Detected: Title, Link, or Slug already exists.");
    else setDuplicateError(null);
  }, [formData[coreKeys.title], formData[coreKeys.linkEN], formData[coreKeys.slugEN], articles, article, coreKeys]);

  const handleLinkBlur = async () => {
    const link = formData[coreKeys.linkEN];
    if (link && link.startsWith('http') && !formData[coreKeys.desc]) {
      setIsGeneratingSummary(true);
      try {
        const summary = await generateAutoSummary(link);
        if (summary) setFormData(prev => ({ ...prev, [coreKeys.desc]: summary }));
      } catch (err) {} finally { setIsGeneratingSummary(false); }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev: any) => ({ ...prev, [name]: checked ? 'Yes' : 'No' }));
    } else {
      setFormData((prev: any) => {
        const next = { ...prev, [name]: value };
        if (name === coreKeys.mainCat) {
          next[coreKeys.subCat] = '';
        }
        return next;
      });
    }
  };

  const toggleNewMainCat = () => {
    const newValue = !isAddingNewMainCat;
    setIsAddingNewMainCat(newValue);
    if (newValue) setFormData((prev: any) => ({ ...prev, [coreKeys.mainCat]: '' }));
  };

  const toggleNewSubCat = () => {
    const newValue = !isAddingNewSubCat;
    setIsAddingNewSubCat(newValue);
    if (newValue) setFormData((prev: any) => ({ ...prev, [coreKeys.subCat]: '' }));
  };

  const addTag = (tag: string) => {
    const cleanTag = tag.trim().startsWith('#') ? tag.trim() : `#${tag.trim()}`;
    if (!cleanTag || cleanTag === '#') return;
    const tagKey = coreKeys.hashtags || 'Hashtags';
    const currentArray = String(formData[tagKey] || '').split(/[;,]/).map(t => t.trim()).filter(Boolean);
    if (!currentArray.includes(cleanTag)) {
      const newTagsArr = [...currentArray, cleanTag];
      setFormData({ ...formData, [tagKey]: newTagsArr.join(', ') });
    }
    if (!hashtagLibrary.includes(cleanTag)) {
      onUpdateLibraryTags([...hashtagLibrary, cleanTag].sort());
    }
    setTagInput('');
  };

  const toggleTagSelection = (tag: string) => {
    const tagKey = coreKeys.hashtags || 'Hashtags';
    const currentArray = String(formData[tagKey] || '').split(/[;,]/).map(t => t.trim()).filter(Boolean);
    if (currentArray.includes(tag)) {
      const newTagsArr = currentArray.filter(t => t !== tag);
      setFormData({ ...formData, [tagKey]: newTagsArr.join(', ') });
    } else {
      const newTagsArr = [...currentArray, tag];
      setFormData({ ...formData, [tagKey]: newTagsArr.join(', ') });
    }
  };

  const deleteFromLibrary = (tag: string) => {
    const newLibrary = hashtagLibrary.filter(t => t !== tag);
    onUpdateLibraryTags(newLibrary);
    removeTag(tag);
  };

  const removeTag = (tag: string) => {
    const tagKey = coreKeys.hashtags || 'Hashtags';
    const newTagsArr = String(formData[tagKey] || '').split(/[;,]/).map(t => t.trim()).filter(t => t && t !== tag);
    setFormData({ ...formData, [tagKey]: newTagsArr.join(', ') });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (duplicateError) return;
    const finalData = { ...formData };
    if (finalData[coreKeys.date]) finalData[coreKeys.date] = parseToLocalISO(finalData[coreKeys.date]);
    onSubmit(finalData);
  };

  const inputClasses = "w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#005C84]/10 transition-all";
  const labelClasses = "text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block";
  const currentTags = String(formData[coreKeys.hashtags] || '').split(/[;,]/).map(t => t.trim()).filter(Boolean);
  
  const subCategories = useMemo(() => {
    const main = formData[coreKeys.mainCat] as keyof typeof CATEGORY_STRUCTURE;
    if (!main) return [];
    return CATEGORY_STRUCTURE[main] || [];
  }, [formData[coreKeys.mainCat], coreKeys.mainCat]);

  const isLinkedInChecked = formData[coreKeys.linkedin] === 'Yes';

  return (
    <form onSubmit={handleFormSubmit} className="bg-white rounded-[2.5rem] shadow-2xl border-4 border-white flex flex-col max-h-[90vh] overflow-hidden">
      <div className="p-8 border-b border-slate-50 flex justify-between items-center shrink-0">
        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">{article ? 'UPDATE ARTICLE' : 'ADD NEW ARTICLE'}</h2>
      </div>
      <div className="p-10 overflow-y-auto custom-scrollbar space-y-8 flex-1">
        {duplicateError && (
          <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            <p className="text-xs font-black text-amber-700 uppercase tracking-tight">{duplicateError}</p>
          </div>
        )}
        <div className="space-y-2">
          <label className={labelClasses}>Article Title</label>
          <input name={coreKeys.title} value={formData[coreKeys.title] || ''} onChange={handleChange} className={inputClasses + " font-black"} required placeholder="Article Title..." />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className={labelClasses}>Link (EN)</label>
            <input type="url" name={coreKeys.linkEN} value={formData[coreKeys.linkEN] || ''} onChange={handleChange} onBlur={handleLinkBlur} className={inputClasses} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <label className={labelClasses}>Slug (EN)</label>
            <input type="text" name={coreKeys.slugEN} value={formData[coreKeys.slugEN] || ''} onChange={handleChange} className={inputClasses} placeholder="/article-path" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <div className="flex justify-between items-center"><label className={labelClasses}>Main Category</label>
              <button type="button" onClick={toggleNewMainCat} className={`text-[9px] font-black px-2 py-0.5 border rounded uppercase ${isAddingNewMainCat ? 'bg-red-50 border-red-200 text-red-600' : 'border-slate-900 text-slate-900'}`}>{isAddingNewMainCat ? 'CANCEL' : '+ NEW'}</button>
            </div>
            {isAddingNewMainCat ? (
              <input name={coreKeys.mainCat} value={formData[coreKeys.mainCat] || ''} onChange={handleChange} className={inputClasses + " border-slate-900 font-black"} autoFocus placeholder="Enter Category..." />
            ) : (
              <select name={coreKeys.mainCat} value={formData[coreKeys.mainCat] || ''} onChange={handleChange} className={inputClasses + " font-black"}>
                {Object.keys(CATEGORY_STRUCTURE).map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center"><label className={labelClasses}>Sub Category</label>
              <button type="button" onClick={toggleNewSubCat} className={`text-[9px] font-black px-2 py-0.5 border rounded uppercase ${isAddingNewSubCat ? 'bg-red-50 border-red-200 text-red-600' : 'border-slate-900 text-slate-900'}`}>{isAddingNewSubCat ? 'CANCEL' : '+ NEW'}</button>
            </div>
            {isAddingNewSubCat ? (
              <input name={coreKeys.subCat} value={formData[coreKeys.subCat] || ''} onChange={handleChange} className={inputClasses + " border-slate-900 font-black"} autoFocus placeholder="Enter Subcat..." />
            ) : (
              <select name={coreKeys.subCat} value={formData[coreKeys.subCat] || ''} onChange={handleChange} className={inputClasses + " font-black"} disabled={subCategories.length === 0 && !isAddingNewSubCat}>
                <option value="">- Select Sub -</option>
                {subCategories.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </div>
          <div className="space-y-2">
            <label className={labelClasses}>Publish Date</label>
            <div className="relative flex items-center bg-white border-2 border-slate-900 rounded-xl px-4 py-3 group cursor-pointer" onClick={() => dateInputRef.current?.showPicker()}>
              <p className="text-sm font-black text-slate-900 flex-1">{(formData[coreKeys.date] || 'YYYY/MM/DD').replace(/-/g, '/')}</p>
              <input ref={dateInputRef} type="date" name={coreKeys.date} value={formData[coreKeys.date] || ''} onChange={handleChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2 relative">
            <label className={labelClasses}>Summary</label>
            <div className="relative">
              {isGeneratingSummary && <div className="absolute right-4 top-4 flex items-center gap-2 z-10 bg-white/90 px-3 py-1 rounded-full border border-slate-200 animate-pulse"><span className="text-[10px] font-black text-[#005C84] uppercase">AI Thinking...</span></div>}
              <textarea name={coreKeys.desc} value={formData[coreKeys.desc] || ''} onChange={handleChange} className={inputClasses + " h-24 resize-none font-bold"} placeholder="Article summary..." />
            </div>
          </div>
          <div className="space-y-2">
            <label className={labelClasses}>LinkedIn</label>
            <div className="flex items-center gap-4 bg-white p-5 border-2 border-slate-900 rounded-xl">
               <input 
                type="checkbox" 
                id="li-check" 
                name={coreKeys.linkedin} 
                checked={isLinkedInChecked} 
                onChange={handleChange} 
                className="w-6 h-6 rounded-md border-2 border-slate-900 bg-white appearance-none cursor-pointer checked:bg-[#0077b5] checked:border-[#0077b5] relative checked:after:content-['✓'] checked:after:absolute checked:after:text-white checked:after:text-sm checked:after:font-bold checked:after:left-1 checked:after:top-[-2px] transition-colors" 
               />
               <label htmlFor="li-check" className="flex items-center gap-2 text-sm font-black text-slate-900 uppercase cursor-pointer">
                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={isLinkedInChecked ? "#0077b5" : "#000000"}><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                 PUBLISH
               </label>
            </div>
          </div>
        </div>
        <div className="space-y-4 pt-4 border-t border-slate-50">
           {!showChinese ? (
             <button type="button" onClick={() => setShowChinese(true)} className="text-[11px] font-black text-[#005C84] uppercase tracking-widest hover:underline">+ ADD CHINESE VERSION</button>
           ) : (
             <div className="space-y-6">
                <div className="flex justify-between items-center"><h4 className="text-[10px] font-black text-slate-400 uppercase">Chinese Variant</h4><button type="button" onClick={() => setShowChinese(false)} className="text-[9px] font-bold text-slate-300">Hide</button></div>
                <div className="space-y-2"><label className={labelClasses}>Chinese Title</label><input name={coreKeys.cTitle} value={formData[coreKeys.cTitle] || ''} onChange={handleChange} className={inputClasses + " font-bold"} placeholder="Chinese Title..." /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2"><label className={labelClasses}>Link (ZH)</label><input type="url" name={coreKeys.linkZH} value={formData[coreKeys.linkZH] || ''} onChange={handleChange} className={inputClasses} placeholder="https://..." /></div>
                  <div className="space-y-2"><label className={labelClasses}>Slug (ZH)</label><input type="text" name={coreKeys.slugZH} value={formData[coreKeys.slugZH] || ''} onChange={handleChange} className={inputClasses} placeholder="/slug-zh" /></div>
                </div>
             </div>
           )}
        </div>
        <div className="space-y-8 pt-8 border-t border-slate-100">
          <label className={labelClasses}>Hashtag Management</label>
          
          <div className="space-y-6">
             <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Quick Mark Library</p>
                <div className="flex flex-wrap gap-2">
                   {hashtagLibrary.map(tag => {
                     const isSelected = currentTags.includes(tag);
                     return (
                       <div key={tag} className="relative group">
                          <button
                            type="button"
                            onClick={() => toggleTagSelection(tag)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all border-2 ${isSelected ? 'bg-[#005C84] text-white border-[#005C84]' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300 shadow-sm'}`}
                          >
                            {tag}
                          </button>
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); deleteFromLibrary(tag); }} 
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] font-black shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 active:scale-90 z-20"
                            title="Delete from Library"
                          >
                            ×
                          </button>
                       </div>
                     );
                   })}
                </div>
             </div>

             <div className="bg-white p-4 rounded-3xl border-2 border-dashed border-slate-200">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Active Tags</p>
                <div className="flex flex-wrap gap-2 min-h-[30px]">
                   {currentTags.map(tag => (
                     <div key={tag} className="relative group flex items-center px-3 py-1 bg-[#005C84]/5 border border-[#005C84]/10 rounded-lg text-[#005C84] text-[9px] font-black transition-all">
                        {tag}
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); removeTag(tag); }} 
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-slate-900 text-white rounded-full flex items-center justify-center text-[11px] font-black shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 z-10"
                        >
                          ×
                        </button>
                     </div>
                   ))}
                   {currentTags.length === 0 && <p className="text-[9px] font-bold text-slate-300 italic self-center">No active tags</p>}
                </div>
             </div>
          </div>

          <div className="flex gap-4">
             <input 
              value={tagInput} 
              onChange={(e) => setTagInput(e.target.value)} 
              onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }} 
              className={inputClasses} 
              placeholder="Enter custom tag..." 
             />
             <button type="button" onClick={() => addTag(tagInput)} className="px-8 bg-[#005C84] text-white rounded-xl text-[11px] font-black uppercase shadow-sm hover:brightness-110 active:scale-95 transition-all">Add & Save</button>
          </div>
        </div>
      </div>
      <div className="p-8 border-t border-slate-100 flex justify-end gap-5 bg-white shrink-0">
        <button type="button" onClick={onCancel} className="px-8 py-4 text-slate-400 font-bold text-xs uppercase hover:text-slate-600 transition-colors">Discard</button>
        <button type="submit" disabled={!!duplicateError} className={`px-20 py-4 rounded-2xl font-black text-xs uppercase shadow-xl transition-all active:scale-95 ${duplicateError ? 'bg-slate-200 text-slate-400' : 'bg-[#82BC41] text-white hover:brightness-105'}`}>
          {article ? 'Update Article' : 'Create New Article'}
        </button>
      </div>
    </form>
  );
};

export default ArticleForm;
