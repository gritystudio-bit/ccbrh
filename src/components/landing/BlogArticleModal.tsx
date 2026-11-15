import React from 'react';
import { Briefcase, X } from 'lucide-react';
import { BlogArticle } from './landingContent';

interface BlogArticleModalProps {
  article: BlogArticle | null;
  onClose: () => void;
}

export const BlogArticleModal: React.FC<BlogArticleModalProps> = ({ article, onClose }) => {
  if (!article) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <img
          src={article.img}
          alt={article.title}
          className="w-full h-52 object-cover shrink-0"
          referrerPolicy="no-referrer"
        />
        <div className="p-6 overflow-y-auto">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-[#9F8548]">{article.date}</span>
              <span aria-hidden="true">·</span>
              <span>{article.readTime}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <h3 className="text-2xl font-bold text-[#03416A] mb-4">{article.title}</h3>
          <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
            {article.content.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <a
              href="#contato"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#082175] hover:text-[#9F8548]"
            >
              <Briefcase className="w-4 h-4" />
              <span>Falar com uma especialista CCB</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-[#E0F4F7] text-[#03416A] text-xs font-semibold hover:bg-[#c8e8ed] cursor-pointer"
            >
              Fechar artigo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
