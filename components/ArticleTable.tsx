
import React from 'react';
import { parseToLocalISO } from '../App';

interface ArticleTableProps {
  articles: any[];
  headers: string[];
  onEdit: (article: any) => void;
  onDelete: (id: string) => void;
  onToggleLinkedIn: (id: string) => void;
}

const ArticleTable: React.FC<ArticleTableProps> = ({ articles, headers, onEdit, onDelete, onToggleLinkedIn }) => {
  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-48 text-slate-400 font-sans">
        <p className="text-sm font-bold text-slate-900 uppercase tracking-widest">No articles found</p>
      </div>
    );
  }

  const safeHeaders = Array.isArray(headers) ? headers : [];
  const keys = {
    title: safeHeaders.find(h => h && (h.toLowerCase() === 'document title' || h.toLowerCase() === 'title')) || 'Document Title',
    linkEN: safeHeaders.find(h => h && (h.toLowerCase() === 'link (en)' || h.toLowerCase() === 'source url' || h.toLowerCase() === 'link')) || 'Link (EN)',
    desc: safeHeaders.find(h => h && (h.toLowerCase() === 'article summary' || h.toLowerCase() === 'description')) || 'Article Summary',
    mainCat: safeHeaders.find(h => h && (h.toLowerCase() === 'main category' || h.toLowerCase() === 'category')) || 'Main Category',
    subCat: safeHeaders.find(h => h && (h.toLowerCase() === 'sub category' || h.toLowerCase() === 'sub hierarchy')) || 'Sub Category',
    date: safeHeaders.find(h => h && (h.toLowerCase() === 'date' || h.toLowerCase() === 'publish date')) || 'Date',
    tags: safeHeaders.find(h => h && (h.toLowerCase() === 'hashtags')) || 'Hashtags',
    linkedin: safeHeaders.find(h => h && (h.toLowerCase() === 'linkedin posted')) || 'LinkedIn Posted',
    cTitle: safeHeaders.find(h => h && (h.toLowerCase() === 'chinese title' || h.toLowerCase().includes('chinese title'))) || 'Chinese Title',
    linkZH: safeHeaders.find(h => h && (h.toLowerCase() === 'link (zh)' || h.toLowerCase().includes('chinese link'))) || 'Link (ZH)'
  };

  const formatDateValue = (val: any) => {
    if (!val || val === '-') return '-';
    const localIso = parseToLocalISO(val);
    return localIso.replace(/-/g, '/');
  };

  const BG_SECTION_1 = "bg-[#f8fafc]";
  const BG_SECTION_2 = "bg-[#f1f5f9]";
  const BG_SECTION_3 = "bg-white";

  const parseTags = (tagVal: any) => {
    if (!tagVal) return [];
    return String(tagVal).split(/[;| ,]/).map(t => t.trim()).filter(t => t && t !== 'null' && t !== 'undefined');
  };

  return (
    <table className="w-full text-left border-collapse min-w-[1400px] font-opensans table-fixed">
      <thead className="sticky top-0 z-30">
        <tr>
          <th className={`px-8 py-6 text-[14px] font-black text-slate-600 uppercase tracking-widest w-[450px] border-b-2 border-slate-200 ${BG_SECTION_1}`}>ARTICLE (EN/ZH)</th>
          <th className={`px-8 py-6 text-[14px] font-black text-slate-600 uppercase tracking-widest w-[200px] border-b-2 border-slate-200 ${BG_SECTION_2}`}>Category</th>
          <th className={`px-8 py-6 text-[14px] font-black text-slate-600 uppercase tracking-widest w-[350px] border-b-2 border-slate-200 ${BG_SECTION_3}`}>Article Summary</th>
          <th className={`px-8 py-6 text-[14px] font-black text-slate-600 uppercase tracking-widest w-[180px] border-b-2 border-slate-200 ${BG_SECTION_3}`}>Tags</th>
          <th className={`px-8 py-6 text-[14px] font-black text-slate-600 uppercase tracking-widest w-[120px] text-center border-b-2 border-slate-200 ${BG_SECTION_3}`}>LinkedIn</th>
          <th className={`px-8 py-6 text-[14px] font-black text-slate-600 uppercase tracking-widest w-[150px] text-right border-b-2 border-slate-200 ${BG_SECTION_3}`}>Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {articles.map((article, idx) => {
          if (!article) return null;
          return (
            <tr key={article.id || idx} className="hover:bg-slate-50/50 transition-colors">
              <td className={`px-8 py-8 ${BG_SECTION_1}`}>
                <div className="flex items-start gap-4">
                  <span className="text-[12px] font-black text-slate-950 mt-1">{(article.rowNumber || idx + 1).toString().padStart(2, '0')}</span>
                  <div className="flex-1 overflow-hidden">
                    <a 
                      href={article[keys.linkEN] || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[16px] font-black text-slate-950 hover:text-[#005C84] leading-tight block mb-1.5 transition-colors whitespace-normal"
                    >
                      {article[keys.title] || 'Untitled Article'}
                    </a>
                    {article[keys.cTitle] && article[keys.cTitle] !== '-' && (
                      <a 
                        href={article[keys.linkZH] || '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[14px] font-bold text-[#005C84] hover:underline block opacity-90 whitespace-normal"
                      >
                        {article[keys.cTitle]}
                      </a>
                    )}
                  </div>
                </div>
              </td>
              <td className={`px-8 py-8 ${BG_SECTION_2}`}>
                <div className="space-y-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-white bg-[#005C84] px-2.5 py-1 rounded-lg uppercase tracking-wider inline-block w-fit truncate max-w-full">
                      {article[keys.mainCat] || 'General'}
                    </span>
                    {article[keys.subCat] && article[keys.subCat] !== '-' && (
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mt-0.5 ml-1 italic truncate">
                        {article[keys.subCat]}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-black text-slate-950 mt-2 ml-1">
                    {formatDateValue(article[keys.date])}
                  </p>
                </div>
              </td>
              <td className={`px-8 py-8 ${BG_SECTION_3}`}>
                <p className="text-[13px] text-slate-600 font-bold line-clamp-3 leading-relaxed">
                  {article[keys.desc] || <span className="text-slate-200 italic">No summary provided</span>}
                </p>
              </td>
              <td className={`px-8 py-8 ${BG_SECTION_3}`}>
                <div className="flex flex-wrap gap-1.5">
                  {parseTags(article[keys.tags]).map(t => (
                    <span key={t} className="text-[10px] font-black text-[#005C84] bg-blue-50/50 px-1.5 py-0.5 rounded">#{t.replace('#','')}</span>
                  ))}
                </div>
              </td>
              <td className={`px-8 py-8 text-center ${BG_SECTION_3}`}>
                <button 
                  onClick={() => onToggleLinkedIn(article.id)} 
                  className={`mx-auto w-10 h-10 rounded-xl flex items-center justify-center transition-all ${ (String(article[keys.linkedin] || '').toLowerCase() === 'yes') ? 'bg-[#0077b5] text-white shadow-lg' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </button>
              </td>
              <td className={`px-8 py-8 text-right ${BG_SECTION_3}`}>
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => onEdit(article)} 
                    className={`w-11 h-11 flex items-center justify-center text-slate-900 bg-white border-2 border-slate-900 rounded-full hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-90`}
                    title="Update Article"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => onDelete(article.id)} 
                    className={`w-11 h-11 flex items-center justify-center text-slate-900 bg-white border-2 border-slate-900 rounded-full hover:bg-red-600 hover:border-red-600 hover:text-white transition-all shadow-sm active:scale-90`}
                    title="Remove Article"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default ArticleTable;
