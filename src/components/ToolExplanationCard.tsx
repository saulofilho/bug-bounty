import React from 'react';
import { 
  HelpCircle, 
  X, 
  BookOpen, 
  CheckCircle2, 
  ShieldAlert, 
  FileCode, 
  Sparkles, 
  ArrowRight, 
  Lock, 
  Eye, 
  Check, 
  Layers
} from 'lucide-react';

interface ToolExplanationCardProps {
  onClose?: () => void;
  onActivateFocusMode?: () => void;
  isFocusModeActive?: boolean;
}

export const ToolExplanationCard: React.FC<ToolExplanationCardProps> = ({
  onClose,
  onActivateFocusMode,
  isFocusModeActive = false
}) => {
  return (
    <div className="rounded-xl bg-[#0e0e0e] border border-emerald-500/30 p-5 shadow-2xl space-y-4 text-xs font-sans text-zinc-200">
      
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-[#262626] pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 font-mono">
              <span>Como Funciona o Workbench & Modo de Leitura Focada</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                Guia Técnico
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400">
              Entenda como auditar, validar e revisar relatórios de vulnerabilidade com máxima clareza e aprovação em triagem.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Fechar explicação"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Grid: 3 Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        
        {/* Pillar 1: Leitura Focada */}
        <div className="p-3.5 rounded-lg bg-[#141414] border border-[#262626] space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-mono font-semibold text-xs">
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>1. Modo Leitura Focada</span>
          </div>
          <p className="text-[11px] text-zinc-300 leading-relaxed">
            Elimina barras de abas, formulários de recompensa e logs secundários. Amplia a tipografia do <strong>Sumário Executivo</strong> e dos <strong>Passos de Reprodução</strong> para proporcionar revisão confortável e sem distrações.
          </p>
          <div className="text-[10px] text-zinc-400 font-mono bg-[#0c0c0c] p-2 rounded border border-[#222]">
            Ideal para analistas de segurança, triadores de programas e clientes finais.
          </div>
        </div>

        {/* Pillar 2: Reprodução Determinística */}
        <div className="p-3.5 rounded-lg bg-[#141414] border border-[#262626] space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-mono font-semibold text-xs">
            <FileCode className="w-4 h-4 shrink-0" />
            <span>2. Passos & PoC Limpa</span>
          </div>
          <p className="text-[11px] text-zinc-300 leading-relaxed">
            Estrutura as etapas de reprodução numeradas em ordem estrita (1, 2, 3...) e exibe a requisição HTTP sanitizada com parâmetros vulneráveis destacados.
          </p>
          <div className="text-[10px] text-zinc-400 font-mono bg-[#0c0c0c] p-2 rounded border border-[#222]">
            Evita pedidos de esclarecimento e acelera a validação por triadores.
          </div>
        </div>

        {/* Pillar 3: Validação & Despacho */}
        <div className="p-3.5 rounded-lg bg-[#141414] border border-[#262626] space-y-2">
          <div className="flex items-center gap-2 text-blue-400 font-mono font-semibold text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>3. Métricas CVSS & PGP</span>
          </div>
          <p className="text-[11px] text-zinc-300 leading-relaxed">
            Calcula o vetor CVSS v3.1 oficial, vincula CWEs e CVEs reconhecidas e permite assinar digitalmente o achado com chave PGP para comprovar integridade.
          </p>
          <div className="text-[10px] text-zinc-400 font-mono bg-[#0c0c0c] p-2 rounded border border-[#222]">
            Exporta nos formatos oficiais do HackerOne, Bugcrowd e Intigriti.
          </div>
        </div>

      </div>

      {/* Practical Checklist Checklist Tips */}
      <div className="p-3 rounded-lg bg-[#121212] border border-[#262626] space-y-2">
        <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Boas Práticas para um Relatório Aprovado:</span>
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-400">
          <div className="flex items-start gap-1.5">
            <span className="text-emerald-400 font-mono font-bold">•</span>
            <span><strong>Título Padrão:</strong> [Tipo de Falha] em [Alvo/Endpoint] expõe [Impacto].</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-emerald-400 font-mono font-bold">•</span>
            <span><strong>Dados Sanitizados:</strong> Substitua tokens reais por <code className="text-zinc-300 font-mono">[TOKEN_A]</code>.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-emerald-400 font-mono font-bold">•</span>
            <span><strong>Impacto Real:</strong> Demonstre prejuízo concreto ao negócio ou vazamento de PII.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-emerald-400 font-mono font-bold">•</span>
            <span><strong>CVSS v3.1 Justificado:</strong> Métricas alinhadas à complexidade real de exploração.</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      {!isFocusModeActive && onActivateFocusMode && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-zinc-400">
            Deseja revisar este achado agora com maior legibilidade?
          </span>
          <button
            type="button"
            onClick={onActivateFocusMode}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-semibold text-xs transition-colors shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Ativar Leitura Focada</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
};
