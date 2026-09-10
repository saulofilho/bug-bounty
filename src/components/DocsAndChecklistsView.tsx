import React, { useState } from 'react';
import { 
  BookOpen, 
  ListChecks, 
  FileCode, 
  Plus, 
  CheckSquare, 
  Square, 
  Copy, 
  Check, 
  Search, 
  Tag, 
  Calendar,
  Save,
  Trash2,
  Edit2
} from 'lucide-react';
import { TechnicalDoc } from '../types';

interface DocsAndChecklistsViewProps {
  docs: TechnicalDoc[];
  onSaveDoc: (doc: TechnicalDoc) => void;
  onDeleteDoc: (id: string) => void;
}

export const DocsAndChecklistsView: React.FC<DocsAndChecklistsViewProps> = ({
  docs,
  onSaveDoc,
  onDeleteDoc
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string>(docs[0]?.id || '');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit/New State
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<TechnicalDoc['category']>('Methodology');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');

  const selectedDoc = docs.find(d => d.id === selectedDocId) || docs[0];

  const filteredDocs = docs.filter(d => 
    categoryFilter === 'ALL' || d.category === categoryFilter
  );

  const handleToggleChecklistItem = (doc: TechnicalDoc, itemId: string) => {
    if (!doc.checklistItems) return;
    const updatedItems = doc.checklistItems.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    const updatedDoc: TechnicalDoc = {
      ...doc,
      checklistItems: updatedItems,
      updatedAt: new Date().toISOString().split('T')[0]
    };
    onSaveDoc(updatedDoc);
  };

  const handleStartEdit = (doc: TechnicalDoc) => {
    setEditTitle(doc.title);
    setEditCategory(doc.category);
    setEditContent(doc.content);
    setEditTags(doc.tags.join(', '));
    setIsEditing(true);
  };

  const handleStartNew = () => {
    const newId = `DOC-${Date.now()}`;
    setEditTitle('Novo Documento Técnico');
    setEditCategory('Methodology');
    setEditContent('### Resumo da Metodologia\n\nDescreva a técnica de teste ou anotação aqui...');
    setEditTags('Recon, API');
    setIsEditing(true);
    setSelectedDocId(newId);
  };

  const handleSaveEdit = () => {
    const updatedDoc: TechnicalDoc = {
      id: selectedDocId.startsWith('DOC-') ? selectedDocId : `DOC-${Date.now()}`,
      title: editTitle.trim() || 'Sem Título',
      category: editCategory,
      content: editContent,
      tags: editTags.split(',').map(s => s.trim()).filter(Boolean),
      updatedAt: new Date().toISOString().split('T')[0],
      isChecklist: selectedDoc?.isChecklist || false,
      checklistItems: selectedDoc?.checklistItems
    };

    onSaveDoc(updatedDoc);
    setIsEditing(false);
    setSelectedDocId(updatedDoc.id);
  };

  const categories = ['ALL', 'Methodology', 'Checklist', 'Payloads', 'Recon', 'Writeup'];

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-light uppercase tracking-tight text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <span>Documentação Técnica & Checklists</span>
          </h1>
          <p className="text-xs text-zinc-400">
            Centralize suas metodologias de teste, checklists interativos de reconhecimento e payloads de bypass
          </p>
        </div>

        <button
          onClick={handleStartNew}
          className="flex items-center gap-2 px-3.5 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Documento Técnico</span>
        </button>
      </div>

      {/* Main Workspace: Left index, Right reader/editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column: Directory */}
        <div className="lg:col-span-4 rounded-xl bg-[#0a0a0a] border border-[#262626] p-4 space-y-4">
          
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                  categoryFilter === cat
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#171717]'
                }`}
              >
                {cat === 'ALL' ? 'Todos' : cat}
              </button>
            ))}
          </div>

          {/* Docs list */}
          <div className="space-y-2">
            {filteredDocs.map(doc => {
              const isSelected = doc.id === selectedDoc?.id;
              const completedCount = doc.checklistItems?.filter(i => i.completed).length || 0;
              const totalItems = doc.checklistItems?.length || 0;

              return (
                <div
                  key={doc.id}
                  onClick={() => {
                    setSelectedDocId(doc.id);
                    setIsEditing(false);
                  }}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer space-y-1.5 ${
                    isSelected
                      ? 'bg-[#171717] border-emerald-500/40 shadow-sm'
                      : 'bg-[#0a0a0a] hover:bg-[#121212] border-[#262626]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#121212] text-zinc-300 border border-[#262626]">
                      {doc.category}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono">{doc.updatedAt}</span>
                  </div>

                  <h3 className={`text-xs font-semibold leading-snug ${isSelected ? 'text-emerald-400' : 'text-zinc-200'}`}>
                    {doc.title}
                  </h3>

                  {doc.isChecklist && totalItems > 0 && (
                    <div className="pt-1 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                        <span>Progresso Recon:</span>
                        <span>{completedCount}/{totalItems} ({Math.round((completedCount / totalItems) * 100)}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#262626] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${(completedCount / totalItems) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1 pt-1 font-mono">
                    {doc.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] text-zinc-500">#{tag}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Right column: Document Viewer / Editor */}
        <div className="lg:col-span-8 rounded-xl bg-[#0a0a0a] border border-[#262626] p-6 space-y-6">
          
          {isEditing ? (
            /* Editing Form */
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
                <span className="font-semibold text-zinc-200 text-sm uppercase tracking-wider">Editar Documentação Técnica</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 rounded bg-[#171717] hover:bg-[#262626] text-zinc-300 font-semibold border border-[#262626] uppercase tracking-wider"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-zinc-300 font-semibold">Título</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-[#121212] border border-[#262626] rounded p-2.5 text-zinc-200 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300 font-semibold">Categoria</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as any)}
                    className="w-full bg-[#121212] border border-[#262626] rounded p-2.5 text-zinc-200 text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Methodology">Methodology</option>
                    <option value="Checklist">Checklist</option>
                    <option value="Payloads">Payloads</option>
                    <option value="Recon">Recon</option>
                    <option value="Writeup">Writeup</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-semibold">Tags (separadas por vírgula)</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full bg-[#121212] border border-[#262626] rounded p-2.5 text-zinc-200 text-xs focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-semibold">Conteúdo Técnico (Markdown)</label>
                <textarea
                  rows={14}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-[#121212] border border-[#262626] rounded p-3 text-zinc-200 font-mono text-xs focus:border-emerald-500 focus:outline-none leading-relaxed"
                />
              </div>
            </div>
          ) : selectedDoc ? (
            /* Document Reader */
            <div className="space-y-6">
              
              {/* Document Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#262626]">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#121212] text-emerald-400 border border-[#262626]">
                      {selectedDoc.category}
                    </span>
                    <span className="text-xs text-zinc-400 flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5" />
                      Atualizado em {selectedDoc.updatedAt}
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-xl font-light text-zinc-100">
                    {selectedDoc.title}
                  </h2>

                  <div className="flex flex-wrap gap-1.5 font-mono">
                    {selectedDoc.tags.map(t => (
                      <span key={t} className="px-2 py-0.5 rounded bg-[#121212] text-zinc-400 text-xs border border-[#262626]">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedDoc.content);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#171717] hover:bg-[#262626] border border-[#262626] text-zinc-300 text-xs font-medium uppercase tracking-wider transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiado' : 'Copiar'}</span>
                  </button>

                  <button
                    onClick={() => handleStartEdit(selectedDoc)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#171717] hover:bg-[#262626] border border-[#262626] text-zinc-300 text-xs font-medium uppercase tracking-wider transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                </div>
              </div>

              {/* Interactive Checklist if applicable */}
              {selectedDoc.isChecklist && selectedDoc.checklistItems && (
                <div className="space-y-3 p-4 rounded-lg bg-[#121212] border border-[#262626]">
                  <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ListChecks className="w-4 h-4" />
                      <span>Checklist de Caça Interativo</span>
                    </h4>
                    <span className="text-xs font-mono text-zinc-400">
                      {selectedDoc.checklistItems.filter(i => i.completed).length} / {selectedDoc.checklistItems.length} concluídos
                    </span>
                  </div>

                  <div className="space-y-2">
                    {selectedDoc.checklistItems.map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleToggleChecklistItem(selectedDoc, item.id)}
                        className="flex items-start gap-3 p-2.5 rounded hover:bg-[#1a1a1a] cursor-pointer transition-colors"
                      >
                        {item.completed ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-0.5 text-xs">
                          <span className={item.completed ? 'line-through text-zinc-500' : 'text-zinc-200'}>
                            {item.text}
                          </span>
                          {item.category && (
                            <span className="block text-[10px] text-zinc-500 font-mono">[{item.category}]</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Markdown Content Display */}
              <div className="p-5 rounded-lg bg-[#121212] border border-[#262626] text-xs text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap">
                {selectedDoc.content}
              </div>

            </div>
          ) : (
            <div className="text-center py-12 text-zinc-500 text-xs font-mono">
              Selecione um documento técnico ou checklist à esquerda.
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
