import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import {
  DollarSign,
  TrendingDown,
  ShieldAlert,
  AlertTriangle,
  Sliders,
  Copy,
  Check,
  RotateCcw,
  ExternalLink,
  Award,
  Zap,
  Building2,
  Scale,
  FileText,
  ChevronDown,
  ChevronUp,
  Percent,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import { VulnerabilityReport, Severity } from '../types';
import { formatCurrency, getSeverityBadgeColor } from '../utils/formatters';
import {
  FairSimulationConfig,
  FairRiskCalculationResult,
  FairExposureLevel,
  FairDataSensitivity,
  FairOperationalDependency,
  FairControlsStrength,
  inferFairConfigFromReport,
  calculateFairRisk
} from '../utils/fairRiskEngine';

interface FairImpactSimulatorProps {
  reports: VulnerabilityReport[];
  initialReportId?: string;
  onSelectReport?: (report: VulnerabilityReport) => void;
  className?: string;
}

export const FairImpactSimulator: React.FC<FairImpactSimulatorProps> = ({
  reports,
  initialReportId,
  onSelectReport,
  className = ''
}) => {
  // 1. State: Selected Report
  const [selectedReportId, setSelectedReportId] = useState<string>(
    initialReportId || (reports.length > 0 ? reports[0].id : '')
  );

  const selectedReport = useMemo(() => {
    return reports.find(r => r.id === selectedReportId) || reports[0] || null;
  }, [reports, selectedReportId]);

  // Currency toggle (USD / BRL, fixed 5.45)
  const [currency, setCurrency] = useState<'USD' | 'BRL'>('USD');
  const currencyMultiplier = currency === 'BRL' ? 5.45 : 1;

  const formatMoney = (valUSD: number) => {
    return formatCurrency(valUSD * currencyMultiplier, currency);
  };

  // 2. State: Simulation Parameters
  const [config, setConfig] = useState<FairSimulationConfig>(() => {
    if (selectedReport) {
      return inferFairConfigFromReport(selectedReport);
    }
    return {
      reportId: '',
      exposure: 'public_internet',
      annualRevenue: 50000000,
      recordCount: 10000,
      dataSensitivity: 'pii',
      operationalDependency: 'moderate',
      controlsStrength: 'basic'
    };
  });

  // Re-infer defaults when user switches reports
  useEffect(() => {
    if (selectedReport) {
      setConfig(inferFairConfigFromReport(selectedReport));
    }
  }, [selectedReport]);

  // Expandable parameter customization panel
  const [isConfigExpanded, setIsConfigExpanded] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // 3. Execution: Run FAIR Calculation
  const fairResult: FairRiskCalculationResult | null = useMemo(() => {
    if (!selectedReport) return null;
    return calculateFairRisk(selectedReport, config);
  }, [selectedReport, config]);

  // Copy Executive Report to Clipboard
  const handleCopySummary = () => {
    if (!fairResult || !selectedReport) return;
    const text = `=== BRIEFING EXECUTIVO DE RISCO QUANTITATIVO (FAIR) ===
Relatório: ${selectedReport.title} (${selectedReport.id})
Target: ${selectedReport.target} | Severidade: ${selectedReport.severity} (CVSS ${selectedReport.cvssScore.toFixed(1)})
Classificação de Risco FAIR: ${fairResult.riskLabel} (Score ${fairResult.riskScore}/100)

1. MÉTRICAS FINANCEIRAS PRINCIPAIS:
- Perda Anual Esperada (ALE - Annual Loss Expectancy): ${formatMoney(fairResult.ale)} / ano
  * Faixa de Confiança: ${formatMoney(fairResult.aleMin)} (10th%) até ${formatMoney(fairResult.aleMax)} (90th%)
- Perda por Incidente (SLE - Single Loss Expectancy): ${formatMoney(fairResult.sle)}
- Taxa Anual de Ocorrência (ARO): ${fairResult.aro}x / ano (~${fairResult.tef} tentativas de ataque/ano)

2. DECOMPOSIÇÃO DE PERDAS POR EVENTO (SLE):
- Perda Primária: ${formatMoney(fairResult.primaryLoss.totalPrimary)}
  * Ativos & Registros: ${formatMoney(fairResult.primaryLoss.assetLoss)}
  * Indisponibilidade & Downtime: ${formatMoney(fairResult.primaryLoss.productivityDowntime)}
  * Resposta ao Incidente & Forense: ${formatMoney(fairResult.primaryLoss.incidentResponse)}
- Perda Secundária: ${formatMoney(fairResult.secondaryLoss.totalSecondary)}
  * Multas Regulatórias (LGPD/GDPR): ${formatMoney(fairResult.secondaryLoss.regulatoryFines)}
  * Evasão de Clientes & Marca: ${formatMoney(fairResult.secondaryLoss.reputationChurn)}
  * Jurídico & Comunicação: ${formatMoney(fairResult.secondaryLoss.legalAndNotification)}

3. RETORNO SOBRE O INVESTIMENTO (BUG BOUNTY ROI):
- Custo da Recompensa: ${formatMoney(fairResult.bountyPaid)}
- Risco Anual Evitado: ${formatMoney(fairResult.costAvoidedAnnual)}
- Múltiplo de Economia: ${fairResult.savingsMultiple}x de ROI financeiro evitado

${fairResult.executiveSummary}
=====================================================`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handleResetToInferred = () => {
    if (selectedReport) {
      setConfig(inferFairConfigFromReport(selectedReport));
    }
  };

  if (!selectedReport || !fairResult) {
    return null;
  }

  const cvssBadge = getSeverityBadgeColor(selectedReport.severity);

  // Prepare data for ALE Comparison Chart
  const aleComparisonData = [
    {
      scenario: 'Otimista (10%)',
      amount: fairResult.aleMin * currencyMultiplier,
      fill: '#3b82f6',
      description: 'Menor impacto em cenário com contenção ágil'
    },
    {
      scenario: 'Esperado (ALE)',
      amount: fairResult.ale * currencyMultiplier,
      fill: fairResult.riskTier === 'CRITICAL' ? '#ef4444' : fairResult.riskTier === 'HIGH' ? '#f97316' : '#10b981',
      description: 'Cenário base mais provável segundo o FAIR'
    },
    {
      scenario: 'Pior Caso (90%)',
      amount: fairResult.aleMax * currencyMultiplier,
      fill: '#dc2626',
      description: 'Exposição catastrófica com multas e churn máximo'
    },
    {
      scenario: 'ALE Residual',
      amount: fairResult.residualAle * currencyMultiplier,
      fill: '#10b981',
      description: 'Risco residual após implementação da correção'
    },
    {
      scenario: 'Custo Bounty',
      amount: fairResult.bountyPaid * currencyMultiplier,
      fill: '#a855f7',
      description: 'Investimento na recompensa do bug bounty'
    }
  ];

  // Colors for loss breakdown bars
  const categoryColors = [
    '#3b82f6', // Assets
    '#f59e0b', // Downtime
    '#8b5cf6', // IR
    '#ef4444', // Fines
    '#ec4899', // Churn
    '#06b6d4'  // Legal
  ];

  return (
    <section
      id="fair-impact-simulator-section"
      className={`p-5 sm:p-6 rounded-xl bg-[#0a0a0d] border border-[#222228] space-y-6 shadow-2xl ${className}`}
    >
      {/* 1. Header & Navigation Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1e1e24]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2 font-mono">
                <span>FairImpactSimulator</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/25 font-semibold">
                  FAIR™ ISO/IEC 27005
                </span>
              </h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                fairResult.riskTier === 'CRITICAL'
                  ? 'bg-red-500/15 text-red-400 border-red-500/30'
                  : fairResult.riskTier === 'HIGH'
                  ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              }`}>
                {fairResult.riskLabel}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              Modelagem quantitativa de risco financeiro com a metodologia <strong className="text-zinc-200">FAIR (Factor Analysis of Information Risk)</strong>. Calcula a Perda Anual Esperada (<strong className="text-amber-400">ALE</strong> = ARO × SLE) a partir do CVSS v3.1, frequência de ameaça e impacto de negócio.
            </p>
          </div>
        </div>

        {/* Global Controls: Currency + Copy Briefing */}
        <div className="flex items-center gap-2 self-start lg:self-center flex-wrap">
          {/* Currency Toggle */}
          <div className="flex items-center bg-[#141418] border border-[#26262e] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
                currency === 'USD'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              USD ($)
            </button>
            <button
              type="button"
              onClick={() => setCurrency('BRL')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
                currency === 'BRL'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              BRL (R$)
            </button>
          </div>

          {/* Copy Executive Summary */}
          <button
            type="button"
            id="btn-copy-fair-summary"
            onClick={handleCopySummary}
            className="px-3 py-1.5 rounded-lg bg-[#141418] hover:bg-[#1a1a22] border border-[#2a2a34] hover:border-amber-500/40 text-xs text-zinc-300 hover:text-white font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Copiar relatório executivo para apresentação ao C-level/Board"
          >
            {copiedSummary ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>Briefing Executivo</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Report Selector & Quick Meta Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-[#101014] p-3.5 rounded-xl border border-[#1e1e24]">
        <div className="md:col-span-8 flex flex-col sm:flex-row sm:items-center gap-2.5">
          <label htmlFor="fair-report-select" className="text-xs font-mono uppercase text-zinc-400 flex items-center gap-1 shrink-0">
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Relatório Analisado:</span>
          </label>
          <div className="relative flex-1">
            <select
              id="fair-report-select"
              value={selectedReportId}
              onChange={(e) => {
                setSelectedReportId(e.target.value);
              }}
              className="w-full bg-[#18181e] text-zinc-100 text-xs font-mono rounded-lg px-3 py-2 border border-[#2a2a36] focus:border-amber-500 focus:outline-none transition-colors cursor-pointer appearance-none pr-8 truncate"
            >
              {reports.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  [{rep.id}] {rep.severity} (CVSS {rep.cvssScore.toFixed(1)}) - {rep.title} ({rep.target})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="md:col-span-4 flex items-center justify-between md:justify-end gap-2">
          <div className="flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${cvssBadge.bg} ${cvssBadge.text} ${cvssBadge.border}`}>
              {selectedReport.severity}
            </span>
            <span className="font-mono text-xs font-bold text-white px-2 py-0.5 rounded bg-[#18181e] border border-[#2a2a34]">
              CVSS {selectedReport.cvssScore.toFixed(1)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsConfigExpanded(!isConfigExpanded)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
              isConfigExpanded
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-[#18181e] border-[#2a2a36] text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Calibrar Parâmetros</span>
            {isConfigExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 3. Parameter Customization Drawer (Accordion) */}
      {isConfigExpanded && (
        <div className="p-4 sm:p-5 rounded-xl bg-[#121217] border border-[#2a2a36] space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-[#22222c]">
            <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              <span>Calibração dos Parâmetros de Entrada FAIR</span>
            </span>
            <button
              type="button"
              onClick={handleResetToInferred}
              className="text-[11px] font-mono text-zinc-400 hover:text-amber-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Redefinir pelos dados do Relatório</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            {/* Exposure */}
            <div className="space-y-1.5">
              <label className="text-zinc-400 block">Exposição da Aplicação (TEF):</label>
              <select
                value={config.exposure}
                onChange={(e) => setConfig({ ...config, exposure: e.target.value as FairExposureLevel })}
                className="w-full bg-[#181820] text-zinc-200 rounded px-2.5 py-1.5 border border-[#30303c] focus:border-amber-500 focus:outline-none"
              >
                <option value="public_internet">Internet Pública (Ataques Constantes)</option>
                <option value="partner_api">API de Parceiros / B2B (Média Frequência)</option>
                <option value="internal_network">Rede Interna / Intranet (Baixa Frequência)</option>
              </select>
            </div>

            {/* Data Sensitivity */}
            <div className="space-y-1.5">
              <label className="text-zinc-400 block">Classificação dos Dados em Risco:</label>
              <select
                value={config.dataSensitivity}
                onChange={(e) => setConfig({ ...config, dataSensitivity: e.target.value as FairDataSensitivity })}
                className="w-full bg-[#181820] text-zinc-200 rounded px-2.5 py-1.5 border border-[#30303c] focus:border-amber-500 focus:outline-none"
              >
                <option value="financial">Financeiro / Cartões (PCI-DSS) - Alto Custo</option>
                <option value="health_phi">Saúde / PHI (HIPAA) - Custo Extremo</option>
                <option value="pii">Dados Pessoais (LGPD / GDPR) - Médio/Alto</option>
                <option value="intellectual_property">Propriedade Intelectual / Código-Fonte</option>
                <option value="low_sensitivity">Baixa Sensibilidade / Logs Públicos</option>
              </select>
            </div>

            {/* Records at Risk */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-zinc-400">
                <span>Registros Expostos:</span>
                <span className="text-amber-400 font-bold">{config.recordCount.toLocaleString()}</span>
              </div>
              <select
                value={config.recordCount}
                onChange={(e) => setConfig({ ...config, recordCount: Number(e.target.value) })}
                className="w-full bg-[#181820] text-zinc-200 rounded px-2.5 py-1.5 border border-[#30303c] focus:border-amber-500 focus:outline-none"
              >
                <option value={500}>500 registros (Incidente Contido)</option>
                <option value={5000}>5.000 registros (Vazamento Médio)</option>
                <option value={25000}>25.000 registros (Base Corporativa)</option>
                <option value={100000}>100.000 registros (Vazamento Amplo)</option>
                <option value={500000}>500.000 registros (Vazamento Massivo)</option>
              </select>
            </div>

            {/* Controls Strength */}
            <div className="space-y-1.5">
              <label className="text-zinc-400 block">Eficácia das Defesas Existentes:</label>
              <select
                value={config.controlsStrength}
                onChange={(e) => setConfig({ ...config, controlsStrength: e.target.value as FairControlsStrength })}
                className="w-full bg-[#181820] text-zinc-200 rounded px-2.5 py-1.5 border border-[#30303c] focus:border-amber-500 focus:outline-none"
              >
                <option value="none">Sem Controles Específicos (Exploit Direto)</option>
                <option value="basic">Defesas Básicas (Firewall & WAF Padrão)</option>
                <option value="advanced_zerotrust">Defesas Avançadas (Zero Trust + SIEM + EDR)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 4. Primary 4-KPI Row: ALE, SLE, ARO, ROI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Annual Loss Expectancy (ALE) */}
        <div className="p-4 rounded-xl bg-[#111116] border border-[#242430] relative overflow-hidden flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              <span>ALE (Perda Anual Esperada)</span>
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25 font-semibold">
              ARO × SLE
            </span>
          </div>

          <div className="my-2">
            <h3 className="text-3xl font-light text-white font-mono tracking-tight">
              {formatMoney(fairResult.ale)}
            </h3>
            <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 mt-1">
              <span>Faixa (10%-90%):</span>
              <span className="text-zinc-300 font-semibold">
                {formatMoney(fairResult.aleMin)} - {formatMoney(fairResult.aleMax)}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#1e1e26] text-[10px] font-mono flex items-center justify-between text-zinc-400">
            <span>Risco pós-correção:</span>
            <span className="text-emerald-400 font-semibold">{formatMoney(fairResult.residualAle)}/ano</span>
          </div>
        </div>

        {/* KPI 2: Single Loss Expectancy (SLE) */}
        <div className="p-4 rounded-xl bg-[#111116] border border-[#242430] flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>SLE (Custo por Incidente)</span>
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/25 font-semibold">
              Loss Magnitude
            </span>
          </div>

          <div className="my-2">
            <h3 className="text-3xl font-light text-white font-mono tracking-tight">
              {formatMoney(fairResult.sle)}
            </h3>
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mt-1">
              <span>Primário: <strong className="text-blue-400">{formatMoney(fairResult.primaryLoss.totalPrimary)}</strong></span>
              <span>Secundário: <strong className="text-pink-400">{formatMoney(fairResult.secondaryLoss.totalSecondary)}</strong></span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#1e1e26] text-[10px] font-mono flex items-center justify-between text-zinc-400">
            <span>Impacto em Negócio:</span>
            <span className="text-zinc-200 truncate max-w-[130px]" title={selectedReport.businessImpact || 'Severo'}>
              {selectedReport.severity}
            </span>
          </div>
        </div>

        {/* KPI 3: Annualized Rate of Occurrence (ARO) */}
        <div className="p-4 rounded-xl bg-[#111116] border border-[#242430] flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span>ARO (Frequência Anual)</span>
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/25 font-semibold">
              TEF × P(V)
            </span>
          </div>

          <div className="my-2">
            <h3 className="text-3xl font-light text-white font-mono tracking-tight">
              {fairResult.aro}x <span className="text-sm font-normal text-zinc-400">/ ano</span>
            </h3>
            <p className="text-[10px] font-mono text-zinc-400 mt-1">
              {fairResult.aro >= 1
                ? `Estimativa de ~${Math.round(fairResult.aro)} violação(ões) por ano sem patch`
                : `1 incidente provável a cada ${(1 / fairResult.aro).toFixed(1)} anos`}
            </p>
          </div>

          <div className="pt-2 border-t border-[#1e1e26] text-[10px] font-mono flex items-center justify-between text-zinc-400">
            <span>Tentativas (TEF):</span>
            <span className="text-zinc-200 font-semibold">{fairResult.tef} scans/ano</span>
          </div>
        </div>

        {/* KPI 4: Bug Bounty Financial ROI */}
        <div className="p-4 rounded-xl bg-[#111116] border border-emerald-500/30 flex flex-col justify-between shadow-md bg-gradient-to-b from-emerald-500/5 to-transparent">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1 font-semibold">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bug Bounty ROI</span>
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
              Cost Avoidance
            </span>
          </div>

          <div className="my-2">
            <h3 className="text-3xl font-light text-emerald-400 font-mono tracking-tight flex items-baseline gap-1">
              <span>{fairResult.savingsMultiple}x</span>
              <span className="text-xs font-normal text-zinc-400 font-sans">retorno</span>
            </h3>
            <p className="text-[10px] font-mono text-zinc-300 mt-1">
              Economia anual de <strong className="text-emerald-400">{formatMoney(fairResult.costAvoidedAnnual)}</strong>
            </p>
          </div>

          <div className="pt-2 border-t border-[#1e1e26] text-[10px] font-mono flex items-center justify-between text-zinc-400">
            <span>Bounty Pago:</span>
            <span className="text-white font-bold">{formatMoney(fairResult.bountyPaid)}</span>
          </div>
        </div>
      </div>

      {/* 5. Visual Charts Grid: ALE Comparison & Loss Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Chart: FAIR ALE Confidence & Scenario Comparison (7 Cols) */}
        <div className="lg:col-span-7 p-4 sm:p-5 rounded-xl bg-[#111116] border border-[#22222a] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1e1e26]">
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-200 font-semibold flex items-center gap-1.5">
                <BarChart className="w-4 h-4 text-amber-400" />
                <span>Distribuição de Perda Anual (ALE) vs Custos</span>
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Cenários estatísticos de perda anual segundo a distribuição Log-Normal FAIR.
              </p>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">
              Valores em {currency}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={aleComparisonData}
                margin={{ top: 15, right: 15, left: 0, bottom: 25 }}
              >
                <XAxis
                  dataKey="scenario"
                  stroke="#52525b"
                  tick={{ fill: '#a1a1aa', fontSize: 10, fontFamily: 'monospace' }}
                  tickLine={false}
                  interval={0}
                  angle={-12}
                  textAnchor="end"
                />
                <YAxis
                  stroke="#52525b"
                  tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                  tickLine={false}
                  axisLine={{ stroke: '#27272a' }}
                  tickFormatter={(val) => {
                    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                    return `${val}`;
                  }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#18181f] border border-amber-500/40 rounded-lg p-2.5 text-xs shadow-xl font-mono max-w-xs z-50">
                          <p className="text-white font-bold">{data.scenario}</p>
                          <p className="text-amber-400 font-bold text-sm my-1">
                            {formatCurrency(data.amount, currency)}
                          </p>
                          <p className="text-zinc-400 text-[10px] font-sans">
                            {data.description}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {aleComparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Chart: Decomposição das Perdas (Loss Magnitude SLE Breakdown) (5 Cols) */}
        <div className="lg:col-span-5 p-4 sm:p-5 rounded-xl bg-[#111116] border border-[#22222a] space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-[#1e1e26]">
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-200 font-semibold flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>Decomposição do Custo por Incidente (SLE)</span>
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Categorias de perda primária e secundária.
              </p>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 font-bold">
              Total: {formatMoney(fairResult.sle)}
            </span>
          </div>

          {/* Structured Stacked Bars */}
          <div className="space-y-2.5 my-auto">
            {fairResult.lossComponents.map((comp, idx) => {
              const color = categoryColors[idx % categoryColors.length];
              return (
                <div key={comp.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-300 truncate max-w-[190px]" title={comp.name}>
                      {comp.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400 text-[11px]">({comp.percent}%)</span>
                      <span className="font-bold text-white whitespace-nowrap">
                        {formatMoney(comp.amountUSD)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(3, comp.percent))}%`,
                        backgroundColor: color
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-[#1e1e26] text-[10px] font-mono text-zinc-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              <span>Primário: {formatMoney(fairResult.primaryLoss.totalPrimary)}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-pink-500 inline-block" />
              <span>Secundário: {formatMoney(fairResult.secondaryLoss.totalSecondary)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 6. Executive Narrative & Impact Statement */}
      <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-[#121218] via-[#101016] to-[#121218] border border-[#2a2a38] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-mono uppercase tracking-wider text-white font-bold">
              Parecer Executivo para C-Level & Auditoria FAIR
            </h4>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed font-sans">
            {fairResult.executiveSummary}
          </p>
        </div>

        {onSelectReport && (
          <button
            type="button"
            onClick={() => onSelectReport(selectedReport)}
            className="px-3.5 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-xs font-mono font-semibold transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-sm"
          >
            <span>Ver Relatório Completo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </section>
  );
};
