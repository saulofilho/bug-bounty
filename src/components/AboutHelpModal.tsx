import React, { useState } from 'react';
import { 
  HelpCircle, 
  X, 
  Database, 
  HardDrive, 
  ShieldCheck, 
  FileText, 
  Target, 
  BookOpen, 
  Key, 
  RotateCcw, 
  CheckCircle2, 
  Info,
  ExternalLink,
  Zap,
  Lock
} from 'lucide-react';

interface AboutHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetToSeedData?: () => void;
}

export const AboutHelpModal: React.FC<AboutHelpModalProps> = ({
  isOpen,
  onClose,
  onResetToSeedData
}) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'guide' | 'storage'>('overview');
  const [resetConfirmed, setResetConfirmed] = useState(false);

  if (!isOpen) return null;

  const handleResetClick = () => {
    if (window.confirm('Tem certeza que deseja restaurar os dados iniciais de demonstração? Isso substituirá seus relatórios locais pelo seed original.')) {
      if (onResetToSeedData) {
        onResetToSeedData();
        setResetConfirmed(true);
        setTimeout(() => setResetConfirmed(false), 3000);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="p-5 border-b border-[#222] bg-[#121212] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <span>Central de Ajuda & Guia do Sistema</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  v2.0 • Local Storage
                </span>
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                BugSentinel.io — Bug Bounty Command & Intelligence Terminal
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-[#222] bg-[#0f0f0f] px-5 gap-4 text-xs font-mono">
          <button
            onClick={() => setActiveSection('overview')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all ${
              activeSection === 'overview'
                ? 'border-emerald-400 text-emerald-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Dados Mock & Persistência</span>
          </button>
          <button
            onClick={() => setActiveSection('guide')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all ${
              activeSection === 'guide'
                ? 'border-emerald-400 text-emerald-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Como Usar o Sistema</span>
          </button>
          <button
            onClick={() => setActiveSection('storage')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all ${
              activeSection === 'storage'
                ? 'border-emerald-400 text-emerald-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Armazenamento Local</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-zinc-300 leading-relaxed font-sans">
          
          {/* SECTION 1: OVERVIEW & MOCK DATA EXPLANATION */}
          {activeSection === 'overview' && (
            <div className="space-y-5">
              
              {/* Highlight Banner: Mock Data Explanation */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex gap-3.5">
                <Database className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 font-mono">
                    Aviso de Demonstração: Dados Mock com Persistência Real no Navegador
                  </h3>
                  <p className="text-zinc-300 leading-relaxed text-xs">
                    Sim! Os relatórios, valores de recompensas e alvos que você vê inicialmente são <strong>dados de demonstração (mock/seed data)</strong> criados para exemplificar cenários reais de Bug Bounty (IDOR, SSRF em Cloud, OAuth Account Takeover, Subdomain Takeover, etc.).
                  </p>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Entretanto, o sistema <strong>não é uma simulação estática</strong>: todas as criações, edições, mudanças de status, tags e assinaturas digitais que você fizer são salvas <strong>em tempo real no <code className="text-amber-300 font-mono bg-amber-950/40 px-1 py-0.5 rounded">localStorage</code> do seu próprio navegador</strong>.
                  </p>
                </div>
              </div>

              {/* Key Highlights Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                
                <div className="p-3.5 rounded-xl bg-[#121212] border border-[#242424] space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-mono font-semibold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Totalmente Interativo</span>
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Você pode criar novos relatórios reais, calcular CVSS v3.1, anexar PoCs, cadastrar novos domínios e criar suas próprias notas metodológicas.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#121212] border border-[#242424] space-y-2">
                  <div className="flex items-center gap-2 text-sky-400 font-mono font-semibold text-xs">
                    <Lock className="w-4 h-4" />
                    <span>Privacidade Local (Zero Backend)</span>
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Seus dados confidenciais de vulnerabilidades e chaves PGP não são enviados para nenhum servidor externo; tudo reside na sandbox de armazenamento do seu navegador.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#121212] border border-[#242424] space-y-2">
                  <div className="flex items-center gap-2 text-purple-400 font-mono font-semibold text-xs">
                    <HardDrive className="w-4 h-4" />
                    <span>Chaves no LocalStorage</span>
                  </div>
                  <p className="text-zinc-400 text-[11px] font-mono">
                    • <span className="text-zinc-300">bounty_reports_v2</span> (achados)<br />
                    • <span className="text-zinc-300">bounty_targets_v2</span> (programas)<br />
                    • <span className="text-zinc-300">bounty_docs_v2</span> (biblioteca técnica)
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#121212] border border-[#242424] space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-mono font-semibold text-xs">
                    <RotateCcw className="w-4 h-4" />
                    <span>Restauração Rápida</span>
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Deseja voltar ao catálogo original de exemplos a qualquer momento? Use o botão de restauração na aba de Armazenamento.
                  </p>
                </div>

              </div>

            </div>
          )}

          {/* SECTION 2: HOW TO USE THE SYSTEM (GUIA COMPLETO) */}
          {activeSection === 'guide' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                Fluxo de Trabalho do Bug Hunter no Sentinel
              </h3>

              <div className="space-y-3 font-mono text-[11px]">
                
                {/* Step 1 */}
                <div className="p-3 rounded-lg bg-[#141414] border border-[#262626] flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">1</span>
                  <div className="space-y-1">
                    <h4 className="font-bold text-white uppercase flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Cadastre o Alvo & Escopo (Programs)</span>
                    </h4>
                    <p className="text-zinc-400 font-sans text-xs">
                      Na aba <strong>Programs</strong>, registre a plataforma (HackerOne, Bugcrowd, Intigriti, Direct VDP) e a lista de domínios <em>in-scope</em> e <em>out-of-scope</em> para nunca reportar fora das regras.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-3 rounded-lg bg-[#141414] border border-[#262626] flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">2</span>
                  <div className="space-y-1">
                    <h4 className="font-bold text-white uppercase flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-sky-400" />
                      <span>Redija o Relatório de Vulnerabilidade (New Submission)</span>
                    </h4>
                    <p className="text-zinc-400 font-sans text-xs">
                      Clique em <strong>New Submission +</strong> para documentar seu achado. O sistema conta com:
                    </p>
                    <ul className="text-zinc-400 font-sans text-xs list-disc list-inside space-y-0.5 ml-1 pt-1">
                      <li><strong>Calculadora CVSS v3.1 interativa</strong> que gera o vetor e o score exato (AV, AC, PR, UI, S, C, I, A).</li>
                      <li><strong>Tagging Engine Inteligente</strong> com sugestões automáticas por taxonomia CWE e CVE.</li>
                      <li><strong>Passos de reprodução e PoC Markdown</strong> estruturados para facilitar a triagem rápida.</li>
                    </ul>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-3 rounded-lg bg-[#141414] border border-[#262626] flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">3</span>
                  <div className="space-y-1">
                    <h4 className="font-bold text-white uppercase flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-blue-400" />
                      <span>Correlacione com CVEs Conhecidas (CVE-DB)</span>
                    </h4>
                    <p className="text-zinc-400 font-sans text-xs">
                      Na aba <strong>CVE-DB</strong>, consulte vulnerabilidades conhecidas (Log4Shell, Outlook Moniker RCE, Spring4Shell) e clique em <em>Criar Rascunho</em> para importar a descrição e remediação automaticamente.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-3 rounded-lg bg-[#141414] border border-[#262626] flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">4</span>
                  <div className="space-y-1">
                    <h4 className="font-bold text-white uppercase flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span>Assine Digitalmente com PGP (PGP Signer)</span>
                    </h4>
                    <p className="text-zinc-400 font-sans text-xs">
                      Use a ferramenta <strong>PGP Signer</strong> no topo da tela para assinar o relatório criptograficamente via OpenPGP.js, garantindo autenticidade e não-repúdio na submissão ao time de segurança.
                    </p>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="p-3 rounded-lg bg-[#141414] border border-[#262626] flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">5</span>
                  <div className="space-y-1">
                    <h4 className="font-bold text-white uppercase flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Acompanhe o Ciclo de Vida & Recompensas (Dashboard)</span>
                    </h4>
                    <p className="text-zinc-400 font-sans text-xs">
                      No <strong>Dashboard</strong>, atualize o status dos relatórios para <em>TRIAGED</em>, <em>RESOLVED</em> ou <em>REWARDED</em> (inserindo o valor do bounty em USD/BRL). O gráfico visual Recharts e o painel de <strong>Recent Activity</strong> atualizam automaticamente!
                    </p>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* SECTION 3: LOCAL STORAGE MANAGEMENT */}
          {activeSection === 'storage' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#121212] border border-[#242424] space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-mono font-semibold text-xs">
                  <HardDrive className="w-4 h-4" />
                  <span>Gerenciamento do Estado Local (`localStorage`)</span>
                </div>
                <p className="text-zinc-300 text-xs leading-relaxed">
                  Todos os dados que você manipula nesta aplicação residem no armazenamento do seu navegador sob as seguintes chaves de armazenamento:
                </p>

                <div className="space-y-2 font-mono text-[11px]">
                  <div className="p-2 bg-black/40 rounded border border-[#222] flex justify-between items-center">
                    <span className="text-zinc-400">bounty_reports_v2</span>
                    <span className="text-emerald-400">Lista completa de relatórios e timelines</span>
                  </div>
                  <div className="p-2 bg-black/40 rounded border border-[#222] flex justify-between items-center">
                    <span className="text-zinc-400">bounty_targets_v2</span>
                    <span className="text-emerald-400">Alvos, programas e escopos de segurança</span>
                  </div>
                  <div className="p-2 bg-black/40 rounded border border-[#222] flex justify-between items-center">
                    <span className="text-zinc-400">bounty_docs_v2</span>
                    <span className="text-emerald-400">Checklists e documentação metodológica</span>
                  </div>
                </div>
              </div>

              {/* Reset Section */}
              <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/30 space-y-3">
                <div className="flex items-center gap-2 text-red-400 font-mono font-semibold text-xs">
                  <RotateCcw className="w-4 h-4" />
                  <span>Restaurar Dados de Exemplo (Reset)</span>
                </div>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Caso queira recarregar os dados de demonstração originais ou limpar testes feitos, você pode restaurar o estado padrão do sistema.
                </p>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={handleResetClick}
                    className="px-3.5 py-1.5 rounded bg-red-600/80 hover:bg-red-500 text-white font-mono text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restaurar Seed Original</span>
                  </button>
                  {resetConfirmed && (
                    <span className="text-emerald-400 font-mono text-xs animate-in fade-in">
                      ✓ Dados restaurados com sucesso!
                    </span>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#222] bg-[#121212] flex items-center justify-between">
          <span className="text-[11px] font-mono text-zinc-500">
            Pressione Esc ou clique em Fechar para continuar.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono uppercase tracking-wider transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
