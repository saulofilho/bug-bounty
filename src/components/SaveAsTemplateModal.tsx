import React, { useState } from 'react';
import { BookmarkPlus, X, Check, Shield, Layers, Tag, HelpCircle } from 'lucide-react';
import { ReportTemplate, Severity } from '../types';
import { saveCustomTemplate } from '../utils/reportTemplatesEngine';
import { showSuccessToast, showErrorToast } from '../utils/toastNotifications';

interface SaveAsTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFormData: {
    title: string;
    vulnerabilityType: string;
    cwe: string;
    cvssVector: string;
    cvssScore: number;
    severity: Severity;
    summary: string;
    stepsToReproduce: string[];
    proofOfConcept: string;
    businessImpact: string;
    remediation: string;
    tags: string[];
    target?: string;
  };
  onTemplateSaved?: (newTemplate: ReportTemplate) => void;
}

export const SaveAsTemplateModal: React.FC<SaveAsTemplateModalProps> = ({
  isOpen,
  onClose,
  currentFormData,
  onTemplateSaved
}) => {
  const [templateName, setTemplateName] = useState(
    currentFormData.vulnerabilityType 
      ? `Template de ${currentFormData.vulnerabilityType}` 
      : 'Meu Template Personalizado'
  );
  const [description, setDescription] = useState(
    `Esqueleto padrão para relatórios de ${currentFormData.vulnerabilityType || 'segurança'} com etapas e PoC pré-formatadas.`
  );
  const [category, setCategory] = useState<ReportTemplate['category']>('Web / OWASP');
  const [titlePattern, setTitlePattern] = useState(
    currentFormData.title
      ? currentFormData.title.replace(new RegExp(currentFormData.target || '', 'gi'), '{target}')
      : `[${currentFormData.vulnerabilityType || 'VULN'}] em {endpoint}`
  );

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) {
      showErrorToast('Por favor dê um nome ao seu template.');
      return;
    }

    try {
      const newTpl = saveCustomTemplate({
        name: templateName.trim(),
        description: description.trim(),
        category,
        vulnerabilityType: currentFormData.vulnerabilityType || 'Personalizado',
        cwe: currentFormData.cwe || 'CWE-20',
        cvssVector: currentFormData.cvssVector,
        cvssScore: currentFormData.cvssScore,
        severity: currentFormData.severity,
        titlePattern: titlePattern.trim() || templateName.trim(),
        summary: currentFormData.summary,
        stepsToReproduce: currentFormData.stepsToReproduce,
        proofOfConcept: currentFormData.proofOfConcept,
        businessImpact: currentFormData.businessImpact,
        remediation: currentFormData.remediation,
        tags: currentFormData.tags
      });

      showSuccessToast(`Template "${newTpl.name}" salvo na sua biblioteca com sucesso!`);
      if (onTemplateSaved) onTemplateSaved(newTpl);
      onClose();
    } catch (err: any) {
      showErrorToast(err.message || 'Erro ao salvar template.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-[#0d0f1a] border border-[#262c42] rounded-xl shadow-2xl overflow-hidden font-mono text-xs">
        
        {/* Header */}
        <div className="p-4 border-b border-[#262c42] bg-[#090b14] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <BookmarkPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Salvar Rascunho como Template
              </h3>
              <p className="text-[11px] text-zinc-400 font-sans">
                Salve este esqueleto para reutilizar em futuros relatórios da mesma classe
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
              Nome do Template *
            </label>
            <input
              type="text"
              required
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="ex: Template Padrão XSS Refletido"
              className="w-full bg-[#121524] border border-[#282f49] rounded-lg p-2.5 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-[#121524] border border-[#282f49] rounded-lg p-2.5 text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="Web / OWASP">Web / OWASP</option>
                <option value="API Security">API Security</option>
                <option value="Cloud & Infra">Cloud & Infra</option>
                <option value="Auth & Session">Auth & Session</option>
                <option value="Mobile">Mobile</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
                Classe / Tipo
              </label>
              <input
                type="text"
                disabled
                value={currentFormData.vulnerabilityType || 'Geral'}
                className="w-full bg-[#0a0b12] border border-[#1e2335] rounded-lg p-2.5 text-zinc-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
              Padrão de Título
            </label>
            <input
              type="text"
              value={titlePattern}
              onChange={(e) => setTitlePattern(e.target.value)}
              placeholder="ex: [{vuln}] no endpoint {endpoint}"
              className="w-full bg-[#121524] border border-[#282f49] rounded-lg p-2.5 text-white focus:border-cyan-500 focus:outline-none"
            />
            <span className="text-[10px] text-zinc-500 font-sans block">
              Dica: Use marcadores como {'{target}'}, {'{endpoint}'} ou {'{param}'} para substituição automática ao aplicar.
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
              Descrição do Esqueleto
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva quando utilizar este template..."
              className="w-full bg-[#121524] border border-[#282f49] rounded-lg p-2.5 text-white focus:border-cyan-500 focus:outline-none font-sans"
            />
          </div>

          {/* Included Fields Preview Strip */}
          <div className="bg-[#090b14] border border-[#1f253a] rounded-lg p-3 space-y-1.5 text-[11px] text-zinc-400 font-sans">
            <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase block">
              Campos capturados do rascunho:
            </span>
            <div className="grid grid-cols-2 gap-2 text-zinc-300">
              <div>• CWE: <span className="font-mono text-zinc-400 truncate">{currentFormData.cwe || 'Não definido'}</span></div>
              <div>• CVSS 3.1: <span className="font-mono text-zinc-400">{currentFormData.cvssScore} ({currentFormData.severity})</span></div>
              <div>• Passos de Reprodução: <span className="font-mono text-zinc-400">{currentFormData.stepsToReproduce.length} passos</span></div>
              <div>• PoC / Payload HTTP: <span className="font-mono text-zinc-400">{currentFormData.proofOfConcept ? 'Sim' : 'Não'}</span></div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-md transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Template</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
