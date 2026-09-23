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
  Lock,
  ShieldAlert,
  BellRing,
  Calculator,
  Terminal,
  Clock,
  MessageSquareCode,
  Sparkles,
  Sliders,
  Layers,
  Radio,
  Copy,
  EyeOff,
  DollarSign,
  Share2
} from 'lucide-react';

interface AboutHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetToSeedData?: () => void;
  onTestCriticalToast?: () => void;
}

export const AboutHelpModal: React.FC<AboutHelpModalProps> = ({
  isOpen,
  onClose,
  onResetToSeedData,
  onTestCriticalToast
}) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'guide' | 'tools' | 'storage'>('overview');
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
        <div className="flex border-b border-[#222] bg-[#0f0f0f] px-3 sm:px-5 gap-2 sm:gap-4 text-xs font-mono overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSection('overview')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap shrink-0 ${
              activeSection === 'overview'
                ? 'border-emerald-400 text-emerald-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Visão Geral</span>
          </button>
          <button
            onClick={() => setActiveSection('guide')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap shrink-0 ${
              activeSection === 'guide'
                ? 'border-emerald-400 text-emerald-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Guia Passo a Passo</span>
          </button>
          <button
            onClick={() => setActiveSection('tools')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap shrink-0 ${
              activeSection === 'tools'
                ? 'border-emerald-400 text-emerald-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Ferramentas AppSec</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
              10 Módulos
            </span>
          </button>
          <button
            onClick={() => setActiveSection('storage')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap shrink-0 ${
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

              {/* Critical Toast Alert Feature Banner */}
              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-600/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
                      <span>Alerta Prioritário de Severidade CRITICAL</span>
                      <span className="px-1.5 py-0.5 rounded bg-rose-600/30 text-rose-300 border border-rose-600/50 text-[9px]">
                        react-hot-toast
                      </span>
                    </h4>
                    <p className="text-zinc-400 text-[11px] leading-relaxed">
                      Sempre que um relatório de vulnerabilidade for inserido ou alterado com severidade <strong>CRITICAL</strong> (ou recalculado via CVSS v3.1 para o nível crítico), um alerta visual de alta prioridade é disparado instantaneamente no canto superior com atalho direto para inspeção.
                    </p>
                  </div>
                </div>

                {onTestCriticalToast && (
                  <button
                    type="button"
                    onClick={onTestCriticalToast}
                    className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 shrink-0 flex items-center gap-2 justify-center"
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    <span>Testar Notificação</span>
                  </button>
                )}
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

                {/* Step 6 */}
                <div className="p-3 rounded-lg bg-[#141414] border border-[#262626] flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">6</span>
                  <div className="space-y-1">
                    <h4 className="font-bold text-white uppercase flex items-center gap-1.5">
                      <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                      <span>Sanitize Segredos (DLP) & Gere PoCs em Código (AppSec)</span>
                    </h4>
                    <p className="text-zinc-400 font-sans text-xs">
                      Na aba <strong>AppSec</strong>, utilize o <em>DLP Sanitizer</em> para ofuscar chaves AWS e tokens confidenciais antes de submeter o achado, e o <em>PoC Builder</em> para gerar comandos cURL e scripts Python 100% reproduzíveis.
                    </p>
                  </div>
                </div>

                {/* Step 7 */}
                <div className="p-3 rounded-lg bg-[#141414] border border-[#262626] flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">7</span>
                  <div className="space-y-1">
                    <h4 className="font-bold text-white uppercase flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Acompanhe Threat Intel & Simule Riscos Financeiros (FAIR)</span>
                    </h4>
                    <p className="text-zinc-400 font-sans text-xs">
                      Consulte a aba <strong>Intel</strong> para monitorar ciberameaças ativas no mapa mundial e utilize os simuladores quantitativos de risco (FAIR e Violação de Dados) para quantificar o prejuízo financeiro evitado em dólares e reais.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* SECTION: APPSEC TOOLS (36 MÓDULOS) */}
          {activeSection === 'tools' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex items-start gap-3.5">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 font-mono flex items-center gap-2">
                    <span>Central de Ferramentas AppSec & DevSecOps — 36 Módulos Integrados</span>
                  </h3>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    A aba <strong>AppSec</strong> foi desenvolvida para unificar as tarefas essenciais de engenheiros de segurança e pesquisadores. Para o manual operacional passo a passo de todas as 36 ferramentas, consulte também o arquivo <code>TUTORIAL.md</code> na raiz do projeto.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 font-sans">
                
                {/* Tool 1 */}
                <div className="p-4 rounded-xl bg-[#121212] border border-[#242424] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-mono font-bold text-xs text-emerald-400">
                      <Calculator className="w-4 h-4" />
                      <span>1. Calculadora CVSS v4.0</span>
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      FIRST Official
                    </span>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Calcula a severidade segundo a nova especificação internacional CVSS v4.0. Separa o impacto no sistema vulnerável (VC/VI/VA) do impacto subsequente (SC/SI/SA).
                  </p>
                  <div className="text-[11px] text-zinc-400 font-mono bg-[#0a0a0a] p-2.5 rounded-lg border border-[#1f1f1f] space-y-1">
                    <span className="text-amber-400 font-bold block">Como usar:</span>
                    <span>1. Selecione o relatório para carregar o contexto.<br />2. Alterne as métricas Base, Threat e Environmental.<br />3. Copie o vetor gerado (ex: CVSS:4.0/AV:N/...).</span>
                  </div>
                </div>

                {/* Tool 2 */}
                <div className="p-4 rounded-xl bg-[#121212] border border-[#242424] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-mono font-bold text-xs text-sky-400">
                      <Layers className="w-4 h-4" />
                      <span>2. Mapeador CWE / OWASP</span>
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      Taxonomia
                    </span>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Mapeia as 25 vulnerabilidades mais críticas (Top CWEs 2023/2024) e as 10 categorias do OWASP Top 10 (2021) com snippets de código vulnerável e correção.
                  </p>
                  <div className="text-[11px] text-zinc-400 font-mono bg-[#0a0a0a] p-2.5 rounded-lg border border-[#1f1f1f] space-y-1">
                    <span className="text-amber-400 font-bold block">Como usar:</span>
                    <span>1. Filtre por palavra-chave (ex: SQLi, SSRF, XSS).<br />2. Inspecione o impacto técnico e recomendações.<br />3. Clique em vincular ao relatório ativo.</span>
                  </div>
                </div>

                {/* Tool 3 */}
                <div className="p-4 rounded-xl bg-[#121212] border border-[#242424] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-mono font-bold text-xs text-amber-400">
                      <Terminal className="w-4 h-4" />
                      <span>3. Construtor de PoC & HTTP</span>
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      cURL / Python
                    </span>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Gera instantaneamente scripts reproduzíveis em comando cURL, código Python (requests) e formato Raw HTTP/1.1 para colar no Burp Suite Repeater.
                  </p>
                  <div className="text-[11px] text-zinc-400 font-mono bg-[#0a0a0a] p-2.5 rounded-lg border border-[#1f1f1f] space-y-1">
                    <span className="text-amber-400 font-bold block">Como usar:</span>
                    <span>1. Digite a URL, método (GET/POST) e payload.<br />2. Adicione cabeçalhos de autenticação/cookies.<br />3. Copie o script pronto para seu PoC.</span>
                  </div>
                </div>

                {/* Tool 4 */}
                <div className="p-4 rounded-xl bg-[#121212] border border-[#242424] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-mono font-bold text-xs text-rose-400">
                      <Clock className="w-4 h-4" />
                      <span>4. Monitor de SLA de Triagem</span>
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      MTTA / MTTR
                    </span>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Acompanha o cumprimento de prazos de primeira resposta e remediação por criticidade (Crítico: 24h, Alto: 48h), emitindo alertas de estouro de SLA.
                  </p>
                  <div className="text-[11px] text-zinc-400 font-mono bg-[#0a0a0a] p-2.5 rounded-lg border border-[#1f1f1f] space-y-1">
                    <span className="text-amber-400 font-bold block">Como usar:</span>
                    <span>1. Monitore a lista de relatórios com contagem regressiva.<br />2. Identifique itens marcados em vermelho (*Breach*).<br />3. Priorize follow-up com a plataforma.</span>
                  </div>
                </div>

                {/* Tool 5 */}
                <div className="p-4 rounded-xl bg-[#121212] border border-[#242424] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-mono font-bold text-xs text-purple-400">
                      <MessageSquareCode className="w-4 h-4" />
                      <span>5. Macros de Resposta Rápida</span>
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Templates
                    </span>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Biblioteca de mensagens profissionais padrão (solicitação de detalhes, aviso de triagem, duplicatas) com preenchimento dinâmico de variáveis.
                  </p>
                  <div className="text-[11px] text-zinc-400 font-mono bg-[#0a0a0a] p-2.5 rounded-lg border border-[#1f1f1f] space-y-1">
                    <span className="text-amber-400 font-bold block">Como usar:</span>
                    <span>1. Escolha o template (ex: Pedido de PoC Adicional).<br />2. O sistema injeta o nome do hunter e título do bug.<br />3. Copie e envie para o analista ou pesquisador.</span>
                  </div>
                </div>

                {/* Tool 6 */}
                <div className="p-4 rounded-xl bg-[#121212] border border-[#242424] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-mono font-bold text-xs text-orange-400">
                      <Sliders className="w-4 h-4" />
                      <span>6. Detector de Duplicatas</span>
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      Similaridade
                    </span>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Calcula o índice de sobreposição textual e técnica (Jaccard + Levenshtein) para alertar se um novo achado já foi reportado anteriormente no mesmo endpoint.
                  </p>
                  <div className="text-[11px] text-zinc-400 font-mono bg-[#0a0a0a] p-2.5 rounded-lg border border-[#1f1f1f] space-y-1">
                    <span className="text-amber-400 font-bold block">Como usar:</span>
                    <span>1. Selecione o relatório a ser analisado.<br />2. Veja a barra de pontuação percentual de similaridade.<br />3. Revise as sobreposições para evitar duplicações.</span>
                  </div>
                </div>

                {/* Tool 7 */}
                <div className="p-4 rounded-xl bg-[#121212] border border-[#242424] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-mono font-bold text-xs text-emerald-400">
                      <DollarSign className="w-4 h-4" />
                      <span>7. Matriz de Bounties & Budget</span>
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Simulação
                    </span>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Calcula o valor sugerido de recompensa ponderando a Criticidade do Ativo (Tier 1 Core, Tier 2 API, Tier 3 Auxiliar) e o consumo do orçamento anual.
                  </p>
                  <div className="text-[11px] text-zinc-400 font-mono bg-[#0a0a0a] p-2.5 rounded-lg border border-[#1f1f1f] space-y-1">
                    <span className="text-amber-400 font-bold block">Como usar:</span>
                    <span>1. Ajuste a severidade do achado e o tier do alvo.<br />2. Veja a faixa recomendada de pagamento (USD).<br />3. Simule o impacto percentual na reserva financeira.</span>
                  </div>
                </div>

                {/* Tool 8 */}
                <div className="p-4 rounded-xl bg-[#121212] border border-[#242424] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-mono font-bold text-xs text-blue-400">
                      <Share2 className="w-4 h-4" />
                      <span>8. Exportador para Issue Trackers</span>
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Jira / GitHub
                    </span>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Converte relatórios de vulnerabilidade em chamados estruturados prontos para engenharia no Jira, GitHub Issues e GitLab com Markdown técnico.
                  </p>
                  <div className="text-[11px] text-zinc-400 font-mono bg-[#0a0a0a] p-2.5 rounded-lg border border-[#1f1f1f] space-y-1">
                    <span className="text-amber-400 font-bold block">Como usar:</span>
                    <span>1. Selecione o relatório e a plataforma de destino.<br />2. Revise o corpo do chamado com steps e remediação.<br />3. Copie para a área de transferência ou baixe o arquivo.</span>
                  </div>
                </div>

                {/* Tool 9 */}
                <div className="p-4 rounded-xl bg-[#121212] border border-[#242424] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-mono font-bold text-xs text-rose-400">
                      <EyeOff className="w-4 h-4" />
                      <span>9. Sanitizador DLP (Anti-Vazamento)</span>
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Segurança
                    </span>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Inspeciona o relatório antes da submissão para detectar e mascarar credenciais confidenciais: chaves AWS, tokens GitHub, JWTs, senhas e emails.
                  </p>
                  <div className="text-[11px] text-zinc-400 font-mono bg-[#0a0a0a] p-2.5 rounded-lg border border-[#1f1f1f] space-y-1">
                    <span className="text-amber-400 font-bold block">Como usar:</span>
                    <span>1. Cole seu rascunho de relatório ou PoC.<br />2. Veja os segredos em destaque no painel de alertas.<br />3. Clique em Sanitizar Texto para ofuscamento automático.</span>
                  </div>
                </div>

                {/* Tool 10 */}
                <div className="p-4 rounded-xl bg-[#121212] border border-[#242424] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-mono font-bold text-xs text-cyan-400">
                      <Radio className="w-4 h-4" />
                      <span>10. Simulador de Webhooks</span>
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Slack / Teams
                    </span>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Gera e dispara payloads formatados de notificação de segurança para canais do Slack, servidores do Discord e canais do Microsoft Teams.
                  </p>
                  <div className="text-[11px] text-zinc-400 font-mono bg-[#0a0a0a] p-2.5 rounded-lg border border-[#1f1f1f] space-y-1">
                    <span className="text-amber-400 font-bold block">Como usar:</span>
                    <span>1. Escolha a plataforma (Slack, Discord, Teams).<br />2. Insira o Webhook URL do seu canal de segurança.<br />3. Clique em Disparar Teste para validar o recebimento.</span>
                  </div>
                </div>

                {/* Tool 11 */}
                <div className="p-4 rounded-xl bg-[#121212] border border-[#242424] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-mono font-bold text-xs text-amber-400">
                      <Lock className="w-4 h-4" />
                      <span>11. Payload Obfuscator</span>
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      XOR / Pipeline
                    </span>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Cifra strings e exploits com chave XOR configurável e pipeline de múltiplas transformações (URL, Base64, Hex) para contornar assinaturas estáticas de WAFs.
                  </p>
                  <div className="text-[11px] text-zinc-400 font-mono bg-[#0a0a0a] p-2.5 rounded-lg border border-[#1f1f1f] space-y-1">
                    <span className="text-amber-400 font-bold block">Como usar:</span>
                    <span>1. Digite o payload e defina a chave secreta XOR.<br />2. Ative etapas no pipeline encadeado.<br />3. Copie o payload e os snippets em Python/Node.js.</span>
                  </div>
                </div>

                {/* Tool 12 */}
                <div className="p-4 rounded-xl bg-[#121212] border border-[#242424] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-mono font-bold text-xs text-sky-400">
                      <Key className="w-4 h-4" />
                      <span>12. OAuth 2.0 & OIDC Inspector</span>
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      SSO Security
                    </span>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Audita URLs de autorização contra falhas de State CSRF, uso do fluxo depreciado Implicit Grant, ausência de PKCE S256 e manipulação de redirect_uri.
                  </p>
                  <div className="text-[11px] text-zinc-400 font-mono bg-[#0a0a0a] p-2.5 rounded-lg border border-[#1f1f1f] space-y-1">
                    <span className="text-amber-400 font-bold block">Como usar:</span>
                    <span>1. Cole a URL de autorização do alvo.<br />2. Analise os alertas de entropia de state e PKCE.<br />3. Obtenha a nota de conformidade e guia de remediação.</span>
                  </div>
                </div>

                {/* Tool 13 */}
                <div className="p-4 rounded-xl bg-[#121212] border border-[#242424] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-mono font-bold text-xs text-rose-400">
                      <ShieldCheck className="w-4 h-4" />
                      <span>13. BOLA / IDOR Matrix</span>
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      OWASP API #1
                    </span>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Mapeador de autorização multi-inquilino (*cross-tenant / cross-user*) e scanner de previsibilidade e entropia de identificadores (sequenciais vs UUID v1 vs UUID v4).
                  </p>
                  <div className="text-[11px] text-zinc-400 font-mono bg-[#0a0a0a] p-2.5 rounded-lg border border-[#1f1f1f] space-y-1">
                    <span className="text-amber-400 font-bold block">Como usar:</span>
                    <span>1. Alterne entre perfis de teste (Usuário A vs B).<br />2. Cole um ID de recurso para auditar a entropia.<br />3. Copie o padrão seguro de consulta com ORM.</span>
                  </div>
                </div>

                {/* Tool 14 */}
                <div className="p-4 rounded-xl bg-[#121212] border border-[#242424] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-mono font-bold text-xs text-purple-400">
                      <Layers className="w-4 h-4" />
                      <span>14. Web Cache Poisoning & Deception</span>
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      CDN / Caching
                    </span>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Diagnóstico de envenenamento de cache via cabeçalhos não-chaveados (*unkeyed headers*) e Web Cache Deception através de extensões estáticas na CDN.
                  </p>
                  <div className="text-[11px] text-zinc-400 font-mono bg-[#0a0a0a] p-2.5 rounded-lg border border-[#1f1f1f] space-y-1">
                    <span className="text-amber-400 font-bold block">Como usar:</span>
                    <span>1. Configure o caminho testado e adicione extensões estáticas.<br />2. Teste unkeyed headers como X-Forwarded-Host.<br />3. Aplique as regras de Cache-Control recomendadas.</span>
                  </div>
                </div>

                {/* Tool 15 */}
                <div className="p-4 rounded-xl bg-[#121212] border border-[#242424] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-mono font-bold text-xs text-yellow-400">
                      <Terminal className="w-4 h-4" />
                      <span>15. Prototype Pollution & Gadgets</span>
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                      Node.js / DOM
                    </span>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Audita mutações em `Object.prototype` causadas por deep merge e mapeia cadeias de gadgets para escalonamento a DOM XSS e Node.js RCE (child_process/EJS).
                  </p>
                  <div className="text-[11px] text-zinc-400 font-mono bg-[#0a0a0a] p-2.5 rounded-lg border border-[#1f1f1f] space-y-1">
                    <span className="text-amber-400 font-bold block">Como usar:</span>
                    <span>1. Insira o JSON com chaves como __proto__.<br />2. Inspecione gadgets para RCE no Node.js.<br />3. Copie as proteções com Object.freeze e Object.create(null).</span>
                  </div>
                </div>

                {/* Tool 16 */}
                <div className="p-4 rounded-xl bg-[#121212] border border-[#242424] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-mono font-bold text-xs text-orange-400">
                      <Zap className="w-4 h-4" />
                      <span>16. Race Condition & Concurrency</span>
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      TOCTOU / Mutex
                    </span>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Simulador interativo de condições de corrida em transações financeiras (saques duplicados) e resgate de cupons, comparando bloqueios pessimistas e idempotência.
                  </p>
                  <div className="text-[11px] text-zinc-400 font-mono bg-[#0a0a0a] p-2.5 rounded-lg border border-[#1f1f1f] space-y-1">
                    <span className="text-amber-400 font-bold block">Como usar:</span>
                    <span>1. Ajuste saldo, valor do saque e número de threads.<br />2. Compare execução sem travas vs SELECT ... FOR UPDATE.<br />3. Teste chaves atômicas de idempotência com Redis.</span>
                  </div>
                </div>

                {/* Tool 17 */}
                <div className="p-4 rounded-xl bg-[#121212] border border-[#242424] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-mono font-bold text-xs text-emerald-400">
                      <Sliders className="w-4 h-4" />
                      <span>17. Mass Assignment & HPP Matrix</span>
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Over-Posting / HPP
                    </span>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Detecta injeção de atributos restritos em entidades de modelo e apresenta matriz de precedência de parâmetros HTTP repetidos entre diferentes frameworks web.
                  </p>
                  <div className="text-[11px] text-zinc-400 font-mono bg-[#0a0a0a] p-2.5 rounded-lg border border-[#1f1f1f] space-y-1">
                    <span className="text-amber-400 font-bold block">Como usar:</span>
                    <span>1. Cole o payload para auditar campos de admin/saldo.<br />2. Insira query params repetidos e compare Node vs PHP vs Flask.<br />3. Adote DTOs com validação estrita no backend.</span>
                  </div>
                </div>

                {/* Tool 18 */}
                <div className="p-4 rounded-xl bg-[#121212] border border-[#242424] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-mono font-bold text-xs text-indigo-400">
                      <FileText className="w-4 h-4" />
                      <span>18. SAML 2.0 & XML Workbench</span>
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      SSO / XSW
                    </span>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Auditoria de asserções SAML, integridade de assinaturas XML ds:Signature, detecção de SHA-1 obsoleto e catálogo detalhado das 8 variantes de XML Signature Wrapping.
                  </p>
                  <div className="text-[11px] text-zinc-400 font-mono bg-[#0a0a0a] p-2.5 rounded-lg border border-[#1f1f1f] space-y-1">
                    <span className="text-amber-400 font-bold block">Como usar:</span>
                    <span>1. Cole o XML da resposta SAML.<br />2. Revise assinaturas, Audience e NameID.<br />3. Consulte as mitigações contra variantes XSW 1-8 e XXE.</span>
                  </div>
                </div>

                {/* Tool 19 */}
                <div className="p-4 rounded-xl bg-[#121212] border border-[#242424] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-mono font-bold text-xs text-rose-400">
                      <ShieldAlert className="w-4 h-4" />
                      <span>19. AWS IAM Privilege Escalation</span>
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Cloud IAM
                    </span>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Audita políticas JSON da AWS contra os 21 vetores clássicos de escalonamento a Administrador (iam:CreatePolicyVersion, PassRole com EC2/Lambda, etc.).
                  </p>
                  <div className="text-[11px] text-zinc-400 font-mono bg-[#0a0a0a] p-2.5 rounded-lg border border-[#1f1f1f] space-y-1">
                    <span className="text-amber-400 font-bold block">Como usar:</span>
                    <span>1. Cole a política IAM JSON no editor.<br />2. Analise os métodos de escalonamento identificados.<br />3. Aplique Permission Boundaries e SCPs recomendados.</span>
                  </div>
                </div>

                {/* Tool 20 */}
                <div className="p-4 rounded-xl bg-[#121212] border border-[#242424] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-mono font-bold text-xs text-amber-400">
                      <Zap className="w-4 h-4" />
                      <span>20. Payload Fuzzer & Mutation Engine</span>
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Fuzzing / WAF Evasion
                    </span>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Permite definir uma string ou URL base com marcador <code>{`{FUZZ}`}</code> e selecionar técnicas de injeção comuns (SQLi, XSS, Path Traversal, CMDi, SSTI, SSRF, NoSQL) com transformações de mutação (URL encode, Double encode, quebras de whitespace, troca de caixa e evasões de aspas) para gerar listas de teste manual ou exportação para Burp Suite Intruder e ffuf.
                  </p>
                  <div className="text-[11px] text-zinc-400 font-mono bg-[#0a0a0a] p-2.5 rounded-lg border border-[#1f1f1f] space-y-1">
                    <span className="text-amber-400 font-bold block">Como usar:</span>
                    <span>1. Insira a URL ou payload com <code>{`{FUZZ}`}</code> (ou use um dos Presets rápidos).<br />2. Selecione as categorias de injeção (SQLi, XSS, Traversal, etc.) e mutações ativas.<br />3. Filtre os resultados e use <strong>Copiar Tudo (Wordlist)</strong> ou <strong>Exportar .TXT</strong> para seu fuzzer.</span>
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
