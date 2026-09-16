import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Copy, 
  CheckCircle2, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  X, 
  ShieldAlert, 
  Info, 
  Sparkles,
  GitCompare,
  ArrowRight,
  Clock,
  DollarSign
} from 'lucide-react';
import { VulnerabilityReport } from '../types';
import { DuplicateAnalysisSummary, DuplicateDetectionResult } from '../utils/duplicateDetector';
import { StatusBadge } from './StatusBadge';
import { getSeverityBadgeColor, formatCurrency } from '../utils/formatters';

interface DuplicateReportDetectorCardProps {
  summary: DuplicateAnalysisSummary;
  candidateTarget: string;
  candidateVulnType: string;
  candidateTitle: string;
  onSelectCompareReport?: (report: VulnerabilityReport) => void;
}

export const DuplicateReportDetectorCard: React.FC<DuplicateReportDetectorCardProps> = ({
  summary,
  candidateTarget,
  candidateVulnType,
  candidateTitle,
  onSelectCompareReport
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedReportForPreview, setSelectedReportForPreview] = useState<VulnerabilityReport | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  // If user dismissed this alert in current session, only show minimal toggle button
  if (isDismissed) {
    return (
      <div className="mx-6 mt-3 flex items-center justify-between px-3 py-1.5 rounded bg-[#141418] border border-[#27272f] text-[11px] font-mono text-zinc-400">
        <div className="flex items-center gap-2">
          <Copy className="w-3.5 h-3.5 text-amber-400" />
          <span>Alerta de duplicata oculto ({summary.matches.length} similaridade(s) registrada(s))</span>
        </div>
        <button
          type="button"
          onClick={() => setIsDismissed(false)}
          className="text-amber-400 hover:text-amber-300 underline text-[10px] font-medium"
        >
          Reexibir alerta
        </button>
      </div>
    );
  }

  // When no duplicates are found
  if (!summary.hasPotentialDuplicates || summary.matches.length === 0) {
    return (
      <div 
        id="duplicate-detector-clean-card"
        className="mx-6 mt-3 px-3 py-2 rounded-lg bg-[#0e1713] border border-emerald-900/40 text-[11px] font-mono text-emerald-300/90 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            <strong>Detector de Duplicatas Ativo:</strong> Nenhuma colisão encontrada para <code className="text-emerald-200 bg-emerald-950/40 px-1 py-0.5 rounded">{candidateTarget || 'alvo especificado'}</code> ({summary.scannedCount} relatórios verificados).
          </span>
        </div>
        <span className="text-[10px] text-emerald-500/80 font-mono">0% Risco</span>
      </div>
    );
  }

  const topMatch = summary.matches[0];
  const isHighRisk = summary.highestRiskLevel === 'HIGH';
  const isMediumRisk = summary.highestRiskLevel === 'MEDIUM';

  const riskColorConfig = isHighRisk 
    ? {
        border: 'border-rose-500/50',
        bg: 'bg-gradient-to-r from-rose-950/30 via-[#191014] to-[#121216]',
        badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        icon: <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />,
        titleText: 'Alto Risco de Duplicata Detectado',
        accentText: 'text-rose-400'
      }
    : isMediumRisk
    ? {
        border: 'border-amber-500/50',
        bg: 'bg-gradient-to-r from-amber-950/25 via-[#1a1410] to-[#121216]',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
        titleText: 'Similaridade Relevante Encontrada',
        accentText: 'text-amber-400'
      }
    : {
        border: 'border-sky-500/40',
        bg: 'bg-gradient-to-r from-sky-950/20 via-[#10141a] to-[#121216]',
        badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        icon: <Info className="w-4 h-4 text-sky-400 shrink-0" />,
        titleText: 'Potencial Sobreposição de Escopo',
        accentText: 'text-sky-400'
      };

  return (
    <div 
      id="duplicate-report-detector-card"
      className={`mx-6 mt-3 rounded-xl border ${riskColorConfig.border} ${riskColorConfig.bg} shadow-lg transition-all duration-200 overflow-hidden`}
    >
      {/* Header Bar */}
      <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-[#23232c]/80">
        <div className="flex items-center gap-2.5 min-w-0">
          {riskColorConfig.icon}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-white tracking-wide">
                {riskColorConfig.titleText}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${riskColorConfig.badgeBg}`}>
                {summary.highestScore}% Similaridade
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                ({summary.matches.length} {summary.matches.length === 1 ? 'relatório correspondente' : 'relatórios correspondentes'})
              </span>
            </div>
            <p className="text-[11px] text-zinc-300 mt-0.5 truncate max-w-xl">
              Alvo <strong>{candidateTarget}</strong> coincide com relatórios já catalogados no repositório.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            id="btn-toggle-duplicate-details"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2 py-1 rounded bg-[#20202a] hover:bg-[#282836] text-zinc-300 text-[10px] font-mono flex items-center gap-1 transition-colors"
            title={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
          >
            <span>{isExpanded ? 'Recolher' : 'Ver Detalhes'}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <button
            type="button"
            id="btn-dismiss-duplicate-alert"
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Ignorar aviso temporariamente"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded Match Content */}
      {isExpanded && (
        <div className="p-4 space-y-3 bg-[#0d0e12]/60">
          {/* Matches List */}
          <div className="space-y-2.5">
            {summary.matches.map((match, idx) => {
              const rep = match.report;
              const sevBadge = getSeverityBadgeColor(rep.severity);

              return (
                <div 
                  key={rep.id}
                  className="p-3 rounded-lg bg-[#14151b] border border-[#272836] hover:border-zinc-500/40 transition-colors text-xs font-mono"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-zinc-500 font-bold">{rep.id}</span>
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]">
                        {rep.platform}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${sevBadge.bg} ${sevBadge.text} ${sevBadge.border}`}>
                        {rep.severity}
                      </span>
                      <StatusBadge status={rep.status} />
                      {rep.bountyAmount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950/50 text-emerald-300 text-[10px] border border-emerald-800/40 flex items-center gap-1">
                          <DollarSign className="w-2.5 h-2.5" />
                          {formatCurrency(rep.bountyAmount, rep.currency)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold ${match.overallScore >= 75 ? 'text-rose-400' : 'text-amber-400'}`}>
                        Score: {match.overallScore}%
                      </span>
                      <button
                        type="button"
                        id={`btn-inspect-dup-${rep.id}`}
                        onClick={() => setSelectedReportForPreview(rep)}
                        className="px-2 py-1 rounded bg-[#20222d] hover:bg-emerald-900/30 hover:text-emerald-300 text-zinc-300 border border-zinc-700 text-[10px] flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspecionar PoC</span>
                      </button>
                    </div>
                  </div>

                  {/* Title & Target */}
                  <div className="mt-2 text-zinc-200 font-sans font-medium text-xs">
                    {rep.title}
                  </div>

                  <div className="mt-1 flex items-center gap-4 text-[11px] text-zinc-400">
                    <div>
                      Alvo: <span className="text-zinc-200 font-mono">{rep.target}</span>
                    </div>
                    <div>
                      Tipo: <span className="text-zinc-200 font-mono">{rep.vulnerabilityType}</span>
                    </div>
                    {rep.cwe && (
                      <div className="hidden md:block truncate max-w-xs">
                        CWE: <span className="text-zinc-300">{rep.cwe.split(':')[0]}</span>
                      </div>
                    )}
                  </div>

                  {/* Reasons Badges */}
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {match.matchReasons.map((reason, rIdx) => (
                      <span 
                        key={rIdx}
                        className="px-2 py-0.5 rounded bg-[#1c1d28] border border-[#303248] text-zinc-300 text-[10px] flex items-center gap-1"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        {reason}
                      </span>
                    ))}
                  </div>

                  {/* Tips for differentiation */}
                  {match.differentiationTips.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-[#222330] text-[10px] text-zinc-400 flex items-start gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-zinc-300 font-semibold">Como evitar fechamento como DUPLICATE: </strong>
                        {match.differentiationTips[0]}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Educational Guidance Footer */}
          <div className="p-2.5 rounded-lg bg-[#121319] border border-[#222432] flex items-start gap-2 text-[10px] font-mono text-zinc-400">
            <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Política Anti-Duplicata de Bug Bounty:</strong> Plataformas como HackerOne e Bugcrowd penalizam a pontuação de reputação (Signal/Reputation) quando submissões são duplicadas de outros pesquisadores ou de vulnerabilidades conhecidas. Certifique-se de que seu achado atinge um vetor de ataque ou impacto de privilégio distinto antes de submeter.
            </p>
          </div>
        </div>
      )}

      {/* Embedded Quick Preview Modal for the Existing Report */}
      {selectedReportForPreview && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedReportForPreview(null)}
        >
          <div 
            className="bg-[#121216] border border-zinc-700 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 bg-[#181922] border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Comparação de Relatório Existente: {selectedReportForPreview.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReportForPreview(null)}
                className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div>
                <div className="text-[10px] text-zinc-500 uppercase font-bold">Título Cadastrado</div>
                <div className="text-zinc-100 font-sans font-medium text-sm mt-0.5">
                  {selectedReportForPreview.title}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-[#181922] border border-[#272836]">
                <div>
                  <div className="text-[10px] text-zinc-500">Alvo / Host</div>
                  <div className="text-zinc-200 font-bold mt-0.5 truncate">{selectedReportForPreview.target}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500">Tipo Vuln</div>
                  <div className="text-zinc-200 font-bold mt-0.5 truncate">{selectedReportForPreview.vulnerabilityType}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500">Severidade</div>
                  <div className="text-zinc-200 font-bold mt-0.5">{selectedReportForPreview.severity} (CVSS {selectedReportForPreview.cvssScore})</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500">Status</div>
                  <div className="mt-0.5"><StatusBadge status={selectedReportForPreview.status} /></div>
                </div>
              </div>

              {selectedReportForPreview.cwe && (
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-bold">CWE Classificação</div>
                  <div className="text-zinc-300 mt-0.5">{selectedReportForPreview.cwe}</div>
                </div>
              )}

              {selectedReportForPreview.summary && (
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-bold">Resumo do Achado</div>
                  <div className="text-zinc-300 font-sans mt-0.5 leading-relaxed bg-[#15161e] p-3 rounded border border-zinc-800">
                    {selectedReportForPreview.summary}
                  </div>
                </div>
              )}

              {selectedReportForPreview.proofOfConcept && (
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-bold">Proof of Concept (PoC) Registrado</div>
                  <pre className="mt-1 p-3 rounded bg-[#0a0b0e] border border-zinc-800 text-[11px] text-emerald-400 overflow-x-auto font-mono whitespace-pre-wrap max-h-48">
                    {selectedReportForPreview.proofOfConcept}
                  </pre>
                </div>
              )}

              {selectedReportForPreview.stepsToReproduce && selectedReportForPreview.stepsToReproduce.length > 0 && (
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-bold">Passos para Reprodução</div>
                  <ol className="mt-1 space-y-1 pl-4 list-decimal text-zinc-300 text-[11px] font-sans">
                    {selectedReportForPreview.stepsToReproduce.map((step, sIdx) => (
                      <li key={sIdx}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#181922] border-t border-zinc-800 flex items-center justify-between">
              <div className="text-[11px] text-zinc-400">
                Submetido em: {selectedReportForPreview.createdAt}
              </div>
              <button
                type="button"
                onClick={() => setSelectedReportForPreview(null)}
                className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
              >
                Fechar Comparação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
