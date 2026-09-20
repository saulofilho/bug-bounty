import React from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  PlayCircle, 
  Trash2, 
  Layers, 
  GitBranch, 
  Calculator, 
  FileText, 
  Target, 
  CheckCircle2, 
  ArrowRight, 
  X,
  HelpCircle,
  Database,
  Terminal,
  Radio
} from 'lucide-react';

interface WelcomePlatformModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExploreWithMock: () => void;
  onClearMockAndStartFresh: () => void;
  isMockActive: boolean;
  reportsCount: number;
  targetsCount: number;
}

export const WelcomePlatformModal: React.FC<WelcomePlatformModalProps> = ({
  isOpen,
  onClose,
  onExploreWithMock,
  onClearMockAndStartFresh,
  isMockActive,
  reportsCount,
  targetsCount
}) => {
  if (!isOpen) return null;

  return (
    <div 
      id="welcome-platform-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        id="welcome-platform-modal"
        className="relative w-full max-w-4xl bg-[#0d0e15] border border-[#222538] rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-[#121422] via-[#10121d] to-[#0d0e15] border-b border-[#222538] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Bem-vindo ao BugSentinel
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  v2.4.0
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Plataforma de Gestão de Vulnerabilidades, Bug Bounty & AppSec Intelligence
              </p>
            </div>
          </div>

          <button
            id="btn-close-welcome-modal"
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Fechar modal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-zinc-300 custom-scrollbar">
          
          {/* Explanation Banner */}
          <div className="p-4 rounded-xl bg-[#131625]/90 border border-[#262c4a] relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0 mt-0.5">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div className="space-y-2 text-xs leading-relaxed">
                <h3 className="font-semibold text-zinc-100 text-sm">
                  O que é esta plataforma?
                </h3>
                <p className="text-zinc-300">
                  O <strong className="text-white">BugSentinel</strong> é um centro de operações para pesquisadores de segurança e hackers éticos organizarem seu trabalho de forma profissional. Ele centraliza achados de segurança, calcula métricas padronizadas de gravidade, gera relatórios formais para plataformas de Bug Bounty e mantém histórico de remediação.
                </p>
              </div>
            </div>

            {/* Quick Feature Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-[#1f243b]">
              <div className="p-2.5 rounded-lg bg-[#0c0e18] border border-[#1d2238] space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] font-semibold">
                  <Calculator className="w-3.5 h-3.5" />
                  <span>CVSS v4.0 & v3.1</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-tight">
                  Calculadoras oficiais (FIRST.org) e correlação completa com CWE e OWASP Top 10.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0c0e18] border border-[#1d2238] space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400 font-mono text-[11px] font-semibold">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Suíte AppSec (10 Módulos)</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-tight">
                  PoC Builder (cURL/Python), DLP Sanitizer, SLA Tracker, Macros e Detector de Duplicatas.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0c0e18] border border-[#1d2238] space-y-1">
                <div className="flex items-center gap-1.5 text-rose-400 font-mono text-[11px] font-semibold">
                  <Radio className="w-3.5 h-3.5" />
                  <span>Threat Intel Global</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-tight">
                  Feed de ciberameaças em tempo real, mapa mundi de incidentes e análise FAIR.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0c0e18] border border-[#1d2238] space-y-1">
                <div className="flex items-center gap-1.5 text-purple-400 font-mono text-[11px] font-semibold">
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>GitHub Sync & Exporter</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-tight">
                  Vínculo com repositórios e exportação de chamados prontos para Jira, GitHub e GitLab.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0c0e18] border border-[#1d2238] space-y-1">
                <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[11px] font-semibold">
                  <Target className="w-3.5 h-3.5" />
                  <span>Alvos & 14 Plataformas</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-tight">
                  Gestão de escopos in-scope/out-of-scope e diretório de 14 plataformas com tutoriais.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0c0e18] border border-[#1d2238] space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] font-semibold">
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF Executivo & PGP</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-tight">
                  Relatórios formais para auditoria, assinatura criptográfica e integridade local.
                </p>
              </div>
            </div>
          </div>

          {/* Decision Section Header */}
          <div className="space-y-1 pt-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <span>Como você deseja acessar a plataforma?</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Escolha entre explorar o sistema completo com dados simulados ou começar imediatamente com o ambiente 100% zerado:
            </p>
          </div>

          {/* Two Distinct Choice Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* OPTION 1: Explore with Mock */}
            <div 
              id="card-option-mock"
              className={`p-5 rounded-xl border transition-all flex flex-col justify-between relative overflow-hidden ${
                isMockActive
                  ? 'bg-gradient-to-b from-[#141b2c] to-[#0e121d] border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.12)] ring-1 ring-cyan-500/30'
                  : 'bg-[#10121d] border-[#222538] hover:border-cyan-500/30'
              }`}
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>Recomendado para Primeira Visita</span>
                  </span>
                  {isMockActive && (
                    <span className="text-[10px] font-mono text-cyan-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Ativo agora
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>Explorar com Dados de Mock</span>
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                    Acesse a plataforma com <strong className="text-zinc-200">{reportsCount > 0 ? reportsCount : 6} relatórios demonstrativos</strong>, <strong className="text-zinc-200">{targetsCount > 0 ? targetsCount : 4} programas alvo</strong>, gráficos analíticos preenchidos e métricas simuladas de Bug Bounty.
                  </p>
                </div>

                <ul className="space-y-2 text-xs text-zinc-300 pt-1 border-t border-[#1c2238]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Veja como ficam os dashboards, gráficos e SLAs preenchidos.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Teste a exportação em PDF, Force Sync GitHub e filtros.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Possibilidade de zerar a qualquer momento no rodapé ou menu.</span>
                  </li>
                </ul>
              </div>

              <div className="pt-5 mt-4">
                <button
                  id="btn-welcome-explore-mock"
                  type="button"
                  onClick={onExploreWithMock}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/40 active:scale-[0.98] cursor-pointer"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>Acessar com Mock (Ver Demonstração)</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            </div>

            {/* OPTION 2: Clear Mock and Start Clean */}
            <div 
              id="card-option-clean"
              className={`p-5 rounded-xl border transition-all flex flex-col justify-between relative overflow-hidden ${
                !isMockActive
                  ? 'bg-gradient-to-b from-[#1c141d] to-[#120e14] border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.12)] ring-1 ring-emerald-500/30'
                  : 'bg-[#10121d] border-[#222538] hover:border-emerald-500/30'
              }`}
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <Database className="w-3 h-3 text-emerald-400" />
                    <span>Ambiente Limpo / Produção</span>
                  </span>
                  {!isMockActive && (
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Ativo agora
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-emerald-400" />
                    <span>Limpar Mock & Começar do Zero</span>
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                    Remove todos os dados simulados e inicia o BugSentinel <strong className="text-zinc-200">totalmente zerado (0 relatórios e 0 alvos)</strong>, pronto para cadastrar suas vulnerabilidades e programas reais.
                  </p>
                </div>

                <ul className="space-y-2 text-xs text-zinc-300 pt-1 border-t border-[#1c2238]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Base 100% limpa sem registros ou métricas fictícias.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Cadastre seus próprios alvos e achados confidenciais.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Recupere os dados de exemplo quando quiser com 1 clique.</span>
                  </li>
                </ul>
              </div>

              <div className="pt-5 mt-4">
                <button
                  id="btn-welcome-clear-zero"
                  type="button"
                  onClick={onClearMockAndStartFresh}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#161c20] hover:bg-emerald-950/80 text-emerald-300 hover:text-white border border-emerald-500/40 hover:border-emerald-400 font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/40 active:scale-[0.98] cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-emerald-400" />
                  <span>Limpar Mock & Começar Zerado</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Bottom Action Bar */}
        <div className="px-6 py-3.5 bg-[#090a10] border-t border-[#1d2030] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <span className="text-zinc-500 text-[11px] font-mono">
            * Seus dados são armazenados localmente no navegador via LocalStorage auditado.
          </span>

          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 transition-colors underline underline-offset-4 text-xs font-mono"
          >
            Manter estado atual e fechar
          </button>
        </div>

      </div>
    </div>
  );
};
