import React, { useState } from 'react';
import {
  X,
  FileDown,
  Printer,
  ShieldCheck,
  Check,
  FileText,
  Sliders,
  Eye,
  Lock,
  Sparkles,
  Download,
  AlertTriangle,
  Flame,
  User,
  Building2,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { VulnerabilityReport } from '../types';
import {
  PdfExportOptions,
  DEFAULT_PDF_OPTIONS,
  downloadPdfReport,
  generatePdfReport
} from '../utils/pdfReportGenerator';
import { formatCurrency, getSeverityBadgeColor, getStatusBadgeColor } from '../utils/formatters';
import { parseCvssVector } from '../utils/cvss';
import { useAuth } from '../context/AuthContext';

interface PdfExportModalProps {
  report: VulnerabilityReport | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  report,
  isOpen,
  onClose
}) => {
  const { user } = useAuth();

  const [options, setOptions] = useState<PdfExportOptions>({
    ...DEFAULT_PDF_OPTIONS,
    researcherName: user ? `${user.name} (${user.role === 'admin' ? 'Security Lead' : 'Security Researcher'})` : 'Alex Mercer (Security Researcher)',
    organization: 'BugSentinel Security Research',
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'settings'>('preview');

  if (!isOpen || !report) return null;

  const sevBadge = getSeverityBadgeColor(report.severity);
  const statusBadge = getStatusBadgeColor(report.status);
  const cvss = parseCvssVector(report.cvssVector);

  const handleDownloadPdf = () => {
    setIsGenerating(true);
    try {
      downloadPdfReport(report, options);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-fade-in overflow-y-auto">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-modal-title"
        className="relative w-full max-w-6xl bg-[#0d0d11] border border-[#272736] rounded-2xl shadow-2xl flex flex-col my-auto max-h-[95vh] overflow-hidden"
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#242433] bg-[#111117] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="pdf-modal-title" className="text-base font-semibold text-white tracking-wide">
                  Exportar Relatório Formal em PDF
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Estilo BugSentinel
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                {report.id} • {report.target} • {report.severity} {report.cvssScore}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Action: Download */}
            <button
              id="btn-download-pdf-header"
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold font-mono text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-950/40 disabled:opacity-50 cursor-pointer"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>PDF Baixado!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>{isGenerating ? 'Gerando...' : 'Baixar PDF (.pdf)'}</span>
                </>
              )}
            </button>

            <button
              id="btn-close-pdf-modal"
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1a1a24] transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Tab Toggle */}
        <div className="flex sm:hidden border-b border-[#242433] bg-[#0f0f14] text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 font-bold ${
              activeTab === 'preview' ? 'text-emerald-400 border-b-2 border-emerald-500 bg-[#161620]' : 'text-zinc-400'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Pré-visualização</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 font-bold ${
              activeTab === 'settings' ? 'text-emerald-400 border-b-2 border-emerald-500 bg-[#161620]' : 'text-zinc-400'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Opções & Metadados</span>
          </button>
        </div>

        {/* Modal Main Content (Split view) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          
          {/* LEFT COLUMN: Export Options & Metadata Customization */}
          <div className={`w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-[#242433] bg-[#0e0e13] p-5 overflow-y-auto space-y-6 ${
            activeTab === 'settings' ? 'block' : 'hidden md:block'
          }`}>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                <span>Configurações do Documento</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Ajuste os dados de entrega formal para envio a clientes, triagem de Bug Bounty ou arquivo.
              </p>
            </div>

            {/* Visual Theme Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-zinc-300 font-medium block">
                Estilo Visual do Documento:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="theme-dark-opt"
                  onClick={() => setOptions(prev => ({ ...prev, theme: 'dark' }))}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    options.theme === 'dark'
                      ? 'bg-[#181824] border-emerald-500/60 ring-1 ring-emerald-500/40 text-white'
                      : 'bg-[#121219] border-[#262638] text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="w-3.5 h-3.5 rounded-full bg-zinc-900 border border-emerald-400" />
                    {options.theme === 'dark' && <Check className="w-3 h-3 text-emerald-400" />}
                  </div>
                  <div className="text-xs font-bold font-mono">Cyber Dark</div>
                  <div className="text-[10px] text-zinc-400">Padrão BugSentinel</div>
                </button>

                <button
                  type="button"
                  id="theme-light-opt"
                  onClick={() => setOptions(prev => ({ ...prev, theme: 'light' }))}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    options.theme === 'light'
                      ? 'bg-[#181824] border-emerald-500/60 ring-1 ring-emerald-500/40 text-white'
                      : 'bg-[#121219] border-[#262638] text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="w-3.5 h-3.5 rounded-full bg-white border border-zinc-400" />
                    {options.theme === 'light' && <Check className="w-3 h-3 text-emerald-400" />}
                  </div>
                  <div className="text-xs font-bold font-mono">Clean White</div>
                  <div className="text-[10px] text-zinc-400">Impressão executiva</div>
                </button>
              </div>
            </div>

            {/* Document Classification */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-zinc-300 font-medium block">
                Classificação de Segurança (TLP):
              </label>
              <select
                value={options.classification}
                onChange={(e) => setOptions(prev => ({ ...prev, classification: e.target.value as any }))}
                className="w-full bg-[#14141c] border border-[#272736] text-zinc-200 text-xs rounded-lg px-3 py-2 font-mono outline-none focus:border-emerald-500"
              >
                <option value="TLP:AMBER">TLP:AMBER (Restrito à Organização)</option>
                <option value="TLP:RED">TLP:RED (Acesso Restrito / Estritamente Confidencial)</option>
                <option value="TLP:CLEAR">TLP:CLEAR (Divulgação Pública Autorizada)</option>
                <option value="CONFIDENCIAL">CONFIDENCIAL (Auditoria Interna)</option>
              </select>
            </div>

            {/* Researcher & Organization Inputs */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-mono text-zinc-300 font-medium flex items-center gap-1.5">
                  <User className="w-3 h-3 text-emerald-400" />
                  <span>Nome do Pesquisador / Autor:</span>
                </label>
                <input
                  type="text"
                  value={options.researcherName}
                  onChange={(e) => setOptions(prev => ({ ...prev, researcherName: e.target.value }))}
                  className="w-full bg-[#14141c] border border-[#272736] text-zinc-200 text-xs rounded-lg px-3 py-2 font-mono outline-none focus:border-emerald-500"
                  placeholder="Nome do Auditor ou Handle"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-zinc-300 font-medium flex items-center gap-1.5">
                  <Building2 className="w-3 h-3 text-emerald-400" />
                  <span>Organização / Destinatário:</span>
                </label>
                <input
                  type="text"
                  value={options.organization}
                  onChange={(e) => setOptions(prev => ({ ...prev, organization: e.target.value }))}
                  className="w-full bg-[#14141c] border border-[#272736] text-zinc-200 text-xs rounded-lg px-3 py-2 font-mono outline-none focus:border-emerald-500"
                  placeholder="Organização cliente ou programa"
                />
              </div>
            </div>

            {/* Sections Toggles */}
            <div className="space-y-2.5 pt-2 border-t border-[#222230]">
              <label className="text-xs font-mono text-zinc-300 font-medium block">
                Seções Inclusas no Documento:
              </label>

              <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={options.includePoc}
                  onChange={(e) => setOptions(prev => ({ ...prev, includePoc: e.target.checked }))}
                  className="rounded border-[#333] text-emerald-500 focus:ring-emerald-500/20 bg-[#161620]"
                />
                <span>Prova de Conceito (PoC) & Payloads</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={options.includeChecklist}
                  onChange={(e) => setOptions(prev => ({ ...prev, includeChecklist: e.target.checked }))}
                  className="rounded border-[#333] text-emerald-500 focus:ring-emerald-500/20 bg-[#161620]"
                />
                <span>Checklist de Validação & Conformidade</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={options.includeTimeline}
                  onChange={(e) => setOptions(prev => ({ ...prev, includeTimeline: e.target.checked }))}
                  className="rounded border-[#333] text-emerald-500 focus:ring-emerald-500/20 bg-[#161620]"
                />
                <span>Cronograma & Horas Investidas</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={options.includePgp}
                  onChange={(e) => setOptions(prev => ({ ...prev, includePgp: e.target.checked }))}
                  className="rounded border-[#333] text-emerald-500 focus:ring-emerald-500/20 bg-[#161620]"
                />
                <span>Assinatura Digital PGP (OpenPGP)</span>
              </label>
            </div>

            {/* Bottom Actions on Left Column */}
            <div className="pt-4 border-t border-[#222230] space-y-2">
              <button
                type="button"
                id="btn-download-pdf-panel"
                onClick={handleDownloadPdf}
                disabled={isGenerating}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.99] text-white font-bold font-mono text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer"
              >
                {downloadSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-200" />
                    <span>Download Realizado!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>{isGenerating ? 'Processando Documento...' : 'Gerar e Baixar PDF'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="btn-print-doc"
                onClick={handlePrint}
                className="w-full py-2 px-3 rounded-lg bg-[#15151f] hover:bg-[#1f1f2c] border border-[#272738] text-zinc-300 hover:text-white font-mono text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Imprimir / Salvar Navegador</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Live Document Sheet Preview */}
          <div className={`flex-1 p-4 sm:p-6 overflow-y-auto bg-[#07070a] flex flex-col items-center ${
            activeTab === 'preview' ? 'block' : 'hidden md:block'
          }`}>
            
            {/* Visual Indicator of A4 Paper */}
            <div className="w-full max-w-[780px] mb-3 flex items-center justify-between text-xs font-mono text-zinc-400 px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Pré-visualização do Documento (A4 Formal Delivery)</span>
              </div>
              <span className="text-[11px] text-zinc-500">
                Tema: <strong className="text-zinc-300">{options.theme === 'dark' ? 'Obsidian Cyber' : 'Clean White'}</strong>
              </span>
            </div>

            {/* Printable & Interactive Document Container */}
            <div 
              id="printable-pdf-document"
              className={`w-full max-w-[780px] rounded-xl shadow-2xl p-6 sm:p-10 border transition-all duration-200 space-y-6 ${
                options.theme === 'dark'
                  ? 'bg-[#0d0d10] border-[#252533] text-zinc-200'
                  : 'bg-white border-zinc-300 text-zinc-900 shadow-zinc-300'
              }`}
            >
              {/* Document Header Ribbon */}
              <div className={`flex flex-wrap items-center justify-between gap-3 pb-3 border-b ${
                options.theme === 'dark' ? 'border-[#222230]' : 'border-zinc-200'
              }`}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs font-mono">
                    BS
                  </div>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-500">
                    BUGSENTINEL SECURITY RESEARCH
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                    options.classification.includes('RED') 
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                      : options.classification.includes('AMBER')
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {options.classification}
                  </span>
                  <span className="text-zinc-500">|</span>
                  <span className="font-semibold">{report.id}</span>
                </div>
              </div>

              {/* Title & Severity Highlight */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                options.theme === 'dark'
                  ? 'bg-[#14141c] border-[#28283a]'
                  : 'bg-zinc-50 border-zinc-200'
              }`}>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${sevBadge.bg} ${sevBadge.text} ${sevBadge.border}`}>
                      {report.severity} {report.cvssScore}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-mono border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
                      {report.status}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                      options.theme === 'dark' ? 'bg-zinc-800/80 text-zinc-300' : 'bg-zinc-200 text-zinc-700'
                    }`}>
                      {report.platform}
                    </span>
                  </div>
                  <h1 className={`text-base sm:text-lg font-bold leading-snug ${
                    options.theme === 'dark' ? 'text-white' : 'text-zinc-900'
                  }`}>
                    {report.title}
                  </h1>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Recompensa / Bounty</div>
                  <div className="text-base font-bold font-mono text-emerald-500">
                    {report.bountyAmount > 0 ? formatCurrency(report.bountyAmount, report.currency) : 'Pendente / VDP'}
                  </div>
                </div>
              </div>

              {/* Two-column Metadata Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className={`p-3.5 rounded-lg border space-y-1.5 ${
                  options.theme === 'dark' ? 'bg-[#121219] border-[#222230]' : 'bg-zinc-50 border-zinc-200'
                }`}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Ativo & Escopo</div>
                  <div className="flex justify-between"><span className="text-zinc-500">Alvo:</span> <span className="font-bold">{report.target}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Vulnerabilidade:</span> <span>{report.vulnerabilityType}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">CWE / Classificação:</span> <span className="text-emerald-500 font-bold">{report.cwe}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Protocolo:</span> <span>{report.submissionId || 'N/A'}</span></div>
                </div>

                <div className={`p-3.5 rounded-lg border space-y-1.5 ${
                  options.theme === 'dark' ? 'bg-[#121219] border-[#222230]' : 'bg-zinc-50 border-zinc-200'
                }`}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Auditoria & Equipe</div>
                  <div className="flex justify-between"><span className="text-zinc-500">Pesquisador:</span> <span className="font-bold">{options.researcherName}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Organização:</span> <span>{options.organization}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Data:</span> <span>{new Date(report.createdAt).toLocaleDateString('pt-BR')}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Vetor CVSS:</span> <span className="truncate max-w-[140px]">{report.cvssVector}</span></div>
                </div>
              </div>

              {/* 1. Sumário Executivo */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                  <span>1. Sumário Executivo & Descrição</span>
                </h3>
                <div className={`p-3.5 rounded-lg border text-xs leading-relaxed ${
                  options.theme === 'dark' ? 'bg-[#111118] border-[#222230] text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                }`}>
                  {report.summary}
                </div>
              </div>

              {/* 2. Análise CVSS */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                  <span>2. Vetor de Severidade CVSS v3.1</span>
                </h3>
                <div className={`p-3.5 rounded-lg border space-y-2.5 ${
                  options.theme === 'dark' ? 'bg-[#111118] border-[#222230]' : 'bg-zinc-50 border-zinc-200'
                }`}>
                  <div className={`p-2 rounded font-mono text-[11px] font-bold ${
                    options.theme === 'dark' ? 'bg-[#181824] text-emerald-400' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}>
                    {report.cvssVector}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                    <div><span className="text-zinc-500">AV:</span> {cvss.av === 'N' ? 'Network' : cvss.av}</div>
                    <div><span className="text-zinc-500">AC:</span> {cvss.ac === 'L' ? 'Low' : 'High'}</div>
                    <div><span className="text-zinc-500">PR:</span> {cvss.pr === 'N' ? 'None' : cvss.pr}</div>
                    <div><span className="text-zinc-500">UI:</span> {cvss.ui === 'N' ? 'None' : 'Required'}</div>
                    <div><span className="text-zinc-500">Scope:</span> {cvss.s === 'U' ? 'Unchanged' : 'Changed'}</div>
                    <div><span className="text-zinc-500">Conf:</span> {cvss.c}</div>
                    <div><span className="text-zinc-500">Integ:</span> {cvss.i}</div>
                    <div><span className="text-zinc-500">Avail:</span> {cvss.a}</div>
                  </div>
                </div>
              </div>

              {/* 3. Passos para Reprodução */}
              {report.stepsToReproduce && report.stepsToReproduce.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-500">
                    3. Passos Determinísticos para Reprodução
                  </h3>
                  <div className="space-y-2">
                    {report.stepsToReproduce.map((step, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs ${
                          options.theme === 'dark' ? 'bg-[#121219] border-[#242434] text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. PoC Box */}
              {options.includePoc && report.proofOfConcept && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-500">
                    4. Prova de Conceito Técnica (PoC & Payload)
                  </h3>
                  <div className={`p-4 rounded-lg font-mono text-[11px] overflow-x-auto border ${
                    options.theme === 'dark'
                      ? 'bg-[#09090d] border-[#222230] text-emerald-300'
                      : 'bg-zinc-900 border-zinc-800 text-emerald-400'
                  }`}>
                    <pre className="whitespace-pre-wrap leading-relaxed">{report.proofOfConcept}</pre>
                  </div>
                </div>
              )}

              {/* 5. Impacto e Mitigação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className={`p-3.5 rounded-lg border space-y-1.5 ${
                  options.theme === 'dark' ? 'bg-[#121219] border-[#242434]' : 'bg-zinc-50 border-zinc-200'
                }`}>
                  <div className="font-mono font-bold text-red-500 uppercase tracking-wider text-[11px]">
                    Impacto no Negócio & Risco
                  </div>
                  <p className="text-zinc-400 leading-relaxed">{report.businessImpact}</p>
                </div>

                <div className={`p-3.5 rounded-lg border space-y-1.5 ${
                  options.theme === 'dark' ? 'bg-[#121219] border-[#242434]' : 'bg-zinc-50 border-zinc-200'
                }`}>
                  <div className="font-mono font-bold text-emerald-500 uppercase tracking-wider text-[11px]">
                    Recomendações de Correção
                  </div>
                  <p className="text-zinc-400 leading-relaxed">{report.remediation}</p>
                </div>
              </div>

              {/* 6. Checklist de Validação */}
              {options.includeChecklist && report.validationChecklist && report.validationChecklist.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-500">
                    6. Checklist de Conformidade Técnica
                  </h3>
                  <div className={`p-3 rounded-lg border space-y-1.5 ${
                    options.theme === 'dark' ? 'bg-[#111118] border-[#222230]' : 'bg-zinc-50 border-zinc-200'
                  }`}>
                    {report.validationChecklist.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-xs">
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] font-bold ${
                          item.completed ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          {item.completed ? '✓' : ''}
                        </span>
                        <span className={item.completed ? 'text-zinc-200 font-medium' : 'text-zinc-500'}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 7. PGP Signature */}
              {options.includePgp && report.pgpSignature && (
                <div className={`p-3 rounded-lg border space-y-1 font-mono text-[11px] ${
                  options.theme === 'dark' ? 'bg-[#0b0b0e] border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Assinatura Digital OpenPGP Válida</span>
                  </div>
                  <div className="text-[10px] opacity-80">Fingerprint: {report.pgpSignature.keyFingerprint}</div>
                </div>
              )}

              {/* Formal Document Footer */}
              <div className={`pt-4 border-t text-[10px] font-mono text-zinc-500 flex flex-wrap items-center justify-between gap-2 ${
                options.theme === 'dark' ? 'border-[#222230]' : 'border-zinc-200'
              }`}>
                <span>BUGSENTINEL • PLATAFORMA DE AUDITORIA & PESQUISA DE SEGURANÇA</span>
                <span>Página 1 de 1 • Formal Delivery Document</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
