import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  Check, 
  AlertTriangle, 
  AlertCircle, 
  Layers, 
  FileText, 
  Table, 
  DollarSign, 
  ShieldAlert, 
  Sparkles, 
  ArrowRight, 
  RefreshCw,
  Eye,
  SlidersHorizontal,
  CheckCircle2
} from 'lucide-react';
import { VulnerabilityReport, Severity, ReportStatus } from '../types';
import { 
  parseVulnerabilityReportsFromCsv, 
  downloadSampleCsvTemplate,
  CsvParseResult 
} from '../utils/csvReportParser';
import { formatCurrency, getSeverityBadgeColor, getStatusBadgeColor } from '../utils/formatters';
import { StatusBadge } from './StatusBadge';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportReports: (importedReports: VulnerabilityReport[], mode: 'append' | 'replace') => void;
  existingCount: number;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImportReports,
  existingCount
}) => {
  const [activeInputMethod, setActiveInputMethod] = useState<'file' | 'paste'>('file');
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [searchPreview, setSearchPreview] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessCsv = (content: string, name?: string, sizeStr?: string) => {
    setIsProcessing(true);
    setSuccessMessage(null);
    try {
      const result = parseVulnerabilityReportsFromCsv(content);
      setParseResult(result);
      if (name) setFileName(name);
      if (sizeStr) setFileSize(sizeStr);
    } catch (err: any) {
      setParseResult({
        reports: [],
        warnings: [],
        errors: [err.message || 'Falha crítica ao processar a estrutura CSV.'],
        totalRowsParsed: 0
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeInKb = (file.size / 1024).toFixed(1) + ' KB';
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawText(text);
      handleProcessCsv(text, file.name, sizeInKb);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      alert('Por favor, selecione um arquivo válido com extensão .csv.');
      return;
    }

    const sizeInKb = (file.size / 1024).toFixed(1) + ' KB';
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawText(text);
      handleProcessCsv(text, file.name, sizeInKb);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handlePasteChange = (text: string) => {
    setRawText(text);
    if (text.trim().length > 10) {
      handleProcessCsv(text, 'Texto CSV Colado', `${(text.length / 1024).toFixed(1)} KB`);
    } else {
      setParseResult(null);
    }
  };

  const handleExecuteImport = () => {
    if (!parseResult || parseResult.reports.length === 0) return;

    onImportReports(parseResult.reports, importMode);
    setSuccessMessage(`${parseResult.reports.length} relatórios importados com sucesso!`);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleReset = () => {
    setParseResult(null);
    setFileName(null);
    setFileSize(null);
    setRawText('');
    setSuccessMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Severity metrics calculation for preview
  const severityCounts = parseResult?.reports.reduce((acc, r) => {
    acc[r.severity] = (acc[r.severity] || 0) + 1;
    return acc;
  }, {} as Record<Severity, number>) || ({} as Record<Severity, number>);

  const totalRewardsImport = parseResult?.reports.reduce((sum, r) => sum + (r.bountyAmount || 0), 0) || 0;

  const filteredPreviewReports = (parseResult?.reports || []).filter(r => {
    if (!searchPreview.trim()) return true;
    const q = searchPreview.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.target.toLowerCase().includes(q) ||
      r.platform.toLowerCase().includes(q) ||
      r.vulnerabilityType.toLowerCase().includes(q) ||
      r.severity.toLowerCase().includes(q)
    );
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl bg-[#0e0e12] border border-[#262638] rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#20202e] bg-[#0a0a0f]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Importação de Relatórios via CSV
                </h3>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
                  Migração de Plataformas
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Importe relatórios exportados do HackerOne, Bugcrowd, Intigriti ou planilhas customizadas
              </p>
            </div>
          </div>

          <button
            id="btn-close-csv-import-modal"
            onClick={onClose}
            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-[#1a1a24] transition-colors"
            title="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Success banner if imported */}
          {successMessage && (
            <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-3 text-emerald-300 text-xs font-mono animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{successMessage} Fechando janela...</span>
            </div>
          )}

          {/* Method Tabs & Sample Download Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-[#1c1c28]">
            <div className="flex items-center gap-2 bg-[#12121c] p-1 rounded-lg border border-[#262636] text-xs font-mono">
              <button
                type="button"
                id="tab-csv-file-upload"
                onClick={() => setActiveInputMethod('file')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all ${
                  activeInputMethod === 'file'
                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#181824]'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Arquivo .CSV</span>
              </button>

              <button
                type="button"
                id="tab-csv-paste-text"
                onClick={() => setActiveInputMethod('paste')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all ${
                  activeInputMethod === 'paste'
                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#181824]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Colar Texto CSV</span>
              </button>
            </div>

            <button
              type="button"
              id="btn-download-sample-csv"
              onClick={downloadSampleCsvTemplate}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-[#14141e] hover:bg-[#1e1e2c] border border-[#2b2b3d] hover:border-emerald-500/40 text-zinc-300 hover:text-white text-xs font-mono transition-all"
              title="Baixar arquivo modelo com colunas prontas para preenchimento"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Baixar Modelo CSV Exemplo</span>
            </button>
          </div>

          {/* File Upload Zone (Drag & Drop + Click) */}
          {activeInputMethod === 'file' && (
            <div className="space-y-2">
              <div
                id="csv-dropzone"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                  isDragging 
                    ? 'border-emerald-400 bg-emerald-950/20 scale-[1.01]' 
                    : fileName 
                    ? 'border-emerald-500/50 bg-[#12121c]' 
                    : 'border-[#2d2d40] hover:border-emerald-500/40 bg-[#101017] hover:bg-[#13131c]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-file-input"
                />

                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 shadow-inner">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>

                {fileName ? (
                  <div className="text-center space-y-1">
                    <p className="text-xs font-mono font-bold text-white flex items-center justify-center gap-2">
                      <span>{fileName}</span>
                      {fileSize && <span className="text-[10px] text-zinc-400 font-normal">({fileSize})</span>}
                    </p>
                    <p className="text-[11px] text-emerald-400 font-mono">
                      Arquivo carregado com sucesso. Clique ou arraste outro para substituir.
                    </p>
                  </div>
                ) : (
                  <div className="text-center space-y-1.5">
                    <p className="text-xs font-mono text-zinc-200">
                      <strong className="text-emerald-400">Clique para selecionar</strong> ou arraste seu arquivo CSV aqui
                    </p>
                    <p className="text-[11px] text-zinc-500 font-mono">
                      Compatível com exports de HackerOne, Bugcrowd, Intigriti e planilhas RFC 4180
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Paste Raw CSV Mode */}
          {activeInputMethod === 'paste' && (
            <div className="space-y-2">
              <label className="text-xs font-mono text-zinc-400 flex items-center justify-between">
                <span>Cole as linhas do CSV aqui (incluindo o cabeçalho):</span>
                {rawText && <span className="text-[10px] text-zinc-500">{rawText.split('\n').length} linhas</span>}
              </label>
              <textarea
                id="textarea-csv-raw-content"
                rows={6}
                value={rawText}
                onChange={(e) => handlePasteChange(e.target.value)}
                placeholder={'title,target,platform,severity,status,bounty_amount,cvss_score,summary\n"IDOR em endpoint de perfil","api.target.com","HackerOne","HIGH","REWARDED",1500,8.6,"Permite acesso indevido"'}
                className="w-full p-3 bg-[#101017] border border-[#28283a] rounded-lg text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="p-4 rounded-lg bg-[#141420] border border-[#28283a] flex items-center justify-center gap-2 text-xs font-mono text-zinc-300">
              <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
              <span>Analisando e validando linhas do CSV...</span>
            </div>
          )}

          {/* Errors and Warnings */}
          {parseResult && parseResult.errors.length > 0 && (
            <div className="p-4 rounded-lg bg-red-950/30 border border-red-500/40 text-red-300 space-y-1.5 text-xs font-mono">
              <div className="flex items-center gap-2 font-bold text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Erros ao analisar CSV</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-[11px] text-red-300">
                {parseResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {parseResult && parseResult.warnings.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30 text-amber-300 space-y-1 text-xs font-mono">
              <div className="flex items-center gap-1.5 font-bold text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Avisos de formatação</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                {parseResult.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Valid Parse Result & Analytics Preview */}
          {parseResult && parseResult.reports.length > 0 && (
            <div className="space-y-4 pt-1 border-t border-[#1c1c28]">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-[#12121c] border border-[#252536]">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 block">
                    Relatórios Válidos
                  </span>
                  <span className="text-xl font-mono font-bold text-emerald-400">
                    {parseResult.reports.length}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#12121c] border border-[#252536]">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 block">
                    Total Recompensas
                  </span>
                  <span className="text-xl font-mono font-bold text-zinc-100">
                    {formatCurrency(totalRewardsImport, 'USD')}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#12121c] border border-[#252536]">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 block">
                    Críticos / Altos
                  </span>
                  <span className="text-xl font-mono font-bold text-rose-400">
                    {(severityCounts['CRITICAL'] || 0) + (severityCounts['HIGH'] || 0)}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#12121c] border border-[#252536]">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 block">
                    Médios / Baixos
                  </span>
                  <span className="text-xl font-mono font-bold text-amber-400">
                    {(severityCounts['MEDIUM'] || 0) + (severityCounts['LOW'] || 0) + (severityCounts['INFO'] || 0)}
                  </span>
                </div>
              </div>

              {/* Import Mode Options */}
              <div className="p-4 rounded-xl bg-[#12121c] border border-[#252536] space-y-2.5">
                <label className="text-xs font-mono font-bold text-zinc-200 block uppercase tracking-wider">
                  Modo de Importação para a Base de Dados
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label 
                    onClick={() => setImportMode('append')}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      importMode === 'append'
                        ? 'border-emerald-500/50 bg-emerald-950/20 text-white shadow-sm'
                        : 'border-[#262638] bg-[#0f0f18] text-zinc-400 hover:bg-[#141420]'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="importMode" 
                      checked={importMode === 'append'} 
                      onChange={() => setImportMode('append')}
                      className="mt-0.5 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-xs font-mono font-bold block text-zinc-200">
                        Mesclar / Adicionar (Recomendado)
                      </span>
                      <span className="text-[11px] text-zinc-400 block leading-relaxed">
                        Preserva os {existingCount} relatórios atuais e adiciona os {parseResult.reports.length} novos.
                      </span>
                    </div>
                  </label>

                  <label 
                    onClick={() => setImportMode('replace')}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      importMode === 'replace'
                        ? 'border-rose-500/50 bg-rose-950/20 text-white shadow-sm'
                        : 'border-[#262638] bg-[#0f0f18] text-zinc-400 hover:bg-[#141420]'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="importMode" 
                      checked={importMode === 'replace'} 
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5 text-rose-500 focus:ring-rose-500"
                    />
                    <div>
                      <span className="text-xs font-mono font-bold block text-zinc-200">
                        Substituir Base de Dados
                      </span>
                      <span className="text-[11px] text-rose-300/80 block leading-relaxed">
                        Remove os relatórios existentes e inicializa a plataforma apenas com os importados.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Interactive Preview Table */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Table className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Pré-Visualização dos Registros ({filteredPreviewReports.length})</span>
                  </span>

                  <input
                    type="text"
                    id="input-filter-preview-csv"
                    placeholder="Filtrar registros da prévia..."
                    value={searchPreview}
                    onChange={(e) => setSearchPreview(e.target.value)}
                    className="px-2.5 py-1 bg-[#101018] border border-[#262638] rounded text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 max-w-xs"
                  />
                </div>

                <div className="border border-[#20202e] rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead className="bg-[#141420] text-[10px] uppercase tracking-wider text-zinc-400 sticky top-0 border-b border-[#222232]">
                      <tr>
                        <th className="py-2 px-3">Severidade</th>
                        <th className="py-2 px-3">Título da Vulnerabilidade</th>
                        <th className="py-2 px-3">Alvo / Target</th>
                        <th className="py-2 px-3">Plataforma</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3 text-right">Recompensa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#181826] bg-[#0c0c12]">
                      {filteredPreviewReports.map((rep, idx) => (
                        <tr key={idx} className="hover:bg-[#141420]/60 transition-colors">
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadgeColor(rep.severity)}`}>
                              {rep.severity}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-zinc-200 font-medium max-w-xs truncate" title={rep.title}>
                            {rep.title}
                          </td>
                          <td className="py-2 px-3 text-zinc-400 whitespace-nowrap">
                            {rep.target}
                          </td>
                          <td className="py-2 px-3 text-zinc-400 whitespace-nowrap">
                            {rep.platform}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <StatusBadge status={rep.status} size="sm" />
                          </td>
                          <td className="py-2 px-3 text-right text-emerald-400 font-bold whitespace-nowrap">
                            {rep.bountyAmount ? formatCurrency(rep.bountyAmount, rep.currency) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[#20202e] bg-[#0a0a0f]">
          <button
            type="button"
            id="btn-reset-csv-import"
            onClick={handleReset}
            className="px-3 py-1.5 rounded text-xs font-mono text-zinc-400 hover:text-white hover:bg-[#1a1a24] transition-colors"
          >
            Limpar
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              id="btn-cancel-csv-import"
              onClick={onClose}
              className="px-3.5 py-2 rounded bg-[#161622] hover:bg-[#202030] text-zinc-300 hover:text-white border border-[#2b2b3d] text-xs font-mono transition-all"
            >
              Cancelar
            </button>

            <button
              type="button"
              id="btn-confirm-import-csv"
              disabled={!parseResult || parseResult.reports.length === 0}
              onClick={handleExecuteImport}
              className={`flex items-center gap-2 px-4 py-2 rounded text-xs uppercase font-mono font-bold tracking-wider transition-all shadow-md ${
                parseResult && parseResult.reports.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 shadow-emerald-950/40 cursor-pointer'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>
                {parseResult && parseResult.reports.length > 0 
                  ? `Importar ${parseResult.reports.length} Relatórios` 
                  : 'Importar Relatórios'}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
