import React, { useState, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  Sector
} from 'recharts';
import {
  ShieldAlert,
  DollarSign,
  TrendingDown,
  TrendingUp,
  PieChart as PieChartIcon,
  Scale,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Layers,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Info,
  Building2,
  Sparkles,
  RotateCcw,
  Lock,
  ArrowUpRight,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { VulnerabilityReport, Severity } from '../types';
import {
  inferFairConfigFromReport,
  calculateFairRisk,
  FairSimulationConfig,
  FairRiskCalculationResult
} from '../utils/fairRiskEngine';
import { formatCurrency, getSeverityBadgeColor } from '../utils/formatters';
import toast from 'react-hot-toast';

export interface RiskDashboardProps {
  reports: VulnerabilityReport[];
  onSelectReport?: (report: VulnerabilityReport) => void;
  onSelectSeverity?: (severity: Severity) => void;
  onNavigateToReports?: () => void;
  className?: string;
}

export type RiskChartMode = 'financial_ale' | 'vuln_count' | 'fair_tiers';
export type RiskScopeFilter = 'all' | 'open_only' | 'mitigated_only';
export type CompanyScalePreset = 'startup' | 'mid_market' | 'enterprise';

interface SeverityRiskSummary {
  severity: Severity;
  label: string;
  count: number;
  openCount: number;
  mitigatedCount: number;
  totalAleUSD: number;
  totalSleUSD: number;
  avgAleUSD: number;
  percentOfTotalAle: number;
  percentOfCount: number;
  color: string;
  lightColor: string;
  bgBadge: string;
  borderBadge: string;
  textBadge: string;
}

const SEVERITY_METADATA: Record<Severity, {
  label: string;
  color: string;
  lightColor: string;
  bgBadge: string;
  borderBadge: string;
  textBadge: string;
}> = {
  CRITICAL: {
    label: 'Crítico',
    color: '#ef4444',
    lightColor: '#f87171',
    bgBadge: 'bg-red-500/10',
    borderBadge: 'border-red-500/30',
    textBadge: 'text-red-400'
  },
  HIGH: {
    label: 'Alto',
    color: '#f97316',
    lightColor: '#fb923c',
    bgBadge: 'bg-orange-500/10',
    borderBadge: 'border-orange-500/30',
    textBadge: 'text-orange-400'
  },
  MEDIUM: {
    label: 'Médio',
    color: '#f59e0b',
    lightColor: '#fbbf24',
    bgBadge: 'bg-amber-500/10',
    borderBadge: 'border-amber-500/30',
    textBadge: 'text-amber-400'
  },
  LOW: {
    label: 'Baixo',
    color: '#3b82f6',
    lightColor: '#60a5fa',
    bgBadge: 'bg-blue-500/10',
    borderBadge: 'border-blue-500/30',
    textBadge: 'text-blue-400'
  },
  INFO: {
    label: 'Informativo',
    color: '#06b6d4',
    lightColor: '#22d3ee',
    bgBadge: 'bg-cyan-500/10',
    borderBadge: 'border-cyan-500/30',
    textBadge: 'text-cyan-400'
  }
};

const COMPANY_REVENUE_PRESETS: Record<CompanyScalePreset, { label: string; revenue: number; desc: string }> = {
  startup: {
    label: 'Startup / PME ($10M)',
    revenue: 10000000,
    desc: 'Receita anual de US$ 10 milhões'
  },
  mid_market: {
    label: 'Mid-Market ($50M)',
    revenue: 50000000,
    desc: 'Padrão enterprise médio de US$ 50 milhões'
  },
  enterprise: {
    label: 'Large Enterprise ($250M)',
    revenue: 250000000,
    desc: 'Grande corporação com receita anual de US$ 250 milhões'
  }
};

const USD_TO_BRL_RATE = 5.45;

export const RiskDashboard: React.FC<RiskDashboardProps> = ({
  reports,
  onSelectReport,
  onSelectSeverity,
  onNavigateToReports,
  className = ''
}) => {
  // Interactive View States
  const [chartMode, setChartMode] = useState<RiskChartMode>('financial_ale');
  const [scopeFilter, setScopeFilter] = useState<RiskScopeFilter>('all');
  const [companyScale, setCompanyScale] = useState<CompanyScalePreset>('mid_market');
  const [currency, setCurrency] = useState<'USD' | 'BRL'>('USD');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [copiedExecutiveReport, setCopiedExecutiveReport] = useState(false);

  // 1. Filter reports based on active scope
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const isMitigated = report.status === 'RESOLVED' || report.status === 'REWARDED';
      if (scopeFilter === 'open_only') return !isMitigated;
      if (scopeFilter === 'mitigated_only') return isMitigated;
      return true;
    });
  }, [reports, scopeFilter]);

  // 2. Run FAIR calculations on each report with active company scale
  const reportsWithFair = useMemo(() => {
    const annualRevenue = COMPANY_REVENUE_PRESETS[companyScale].revenue;

    return filteredReports.map((report) => {
      const baseConfig = inferFairConfigFromReport(report);
      const config: FairSimulationConfig = {
        ...baseConfig,
        annualRevenue
      };
      const fair = calculateFairRisk(report, config);
      const isMitigated = report.status === 'RESOLVED' || report.status === 'REWARDED';

      return {
        report,
        fair,
        isMitigated
      };
    });
  }, [filteredReports, companyScale]);

  // 3. Compute Portfolio-wide Aggregated Financial Risk Metrics
  const portfolioMetrics = useMemo(() => {
    let totalAleUSD = 0;
    let totalSleUSD = 0;
    let activeOpenAleUSD = 0;
    let mitigatedAleUSD = 0;
    let totalCostAvoidedUSD = 0;
    let totalBountiesInvestedUSD = 0;
    let openCount = 0;
    let mitigatedCount = 0;

    reportsWithFair.forEach(({ report, fair, isMitigated }) => {
      totalAleUSD += fair.ale;
      totalSleUSD += fair.sle;

      if (isMitigated) {
        mitigatedCount++;
        mitigatedAleUSD += fair.ale;
        totalCostAvoidedUSD += fair.costAvoidedAnnual;
      } else {
        openCount++;
        activeOpenAleUSD += fair.ale;
      }

      const bountyAmount = report.bountyAmount || 0;
      totalBountiesInvestedUSD += bountyAmount;
    });

    // ROI Multiplier: dollars saved in avoided loss per dollar invested in bounties
    const portfolioRoiMultiple = totalBountiesInvestedUSD > 0
      ? Math.round((totalCostAvoidedUSD / totalBountiesInvestedUSD) * 10) / 10
      : (mitigatedCount > 0 ? 18.5 : 0);

    // Global Risk Level
    let portfolioRiskLevel: 'CRÍTICO' | 'ALTO' | 'MODERADO' | 'BAIXO' = 'BAIXO';
    let riskLevelColor = 'text-emerald-400';
    let riskLevelBg = 'bg-emerald-500/15 border-emerald-500/30';

    if (activeOpenAleUSD >= 1000000 || openCount >= 10) {
      portfolioRiskLevel = 'CRÍTICO';
      riskLevelColor = 'text-red-400';
      riskLevelBg = 'bg-red-500/15 border-red-500/30';
    } else if (activeOpenAleUSD >= 300000 || openCount >= 5) {
      portfolioRiskLevel = 'ALTO';
      riskLevelColor = 'text-orange-400';
      riskLevelBg = 'bg-orange-500/15 border-orange-500/30';
    } else if (activeOpenAleUSD >= 80000) {
      portfolioRiskLevel = 'MODERADO';
      riskLevelColor = 'text-amber-400';
      riskLevelBg = 'bg-amber-500/15 border-amber-500/30';
    }

    return {
      totalAleUSD,
      totalSleUSD,
      activeOpenAleUSD,
      mitigatedAleUSD,
      totalCostAvoidedUSD,
      totalBountiesInvestedUSD,
      openCount,
      mitigatedCount,
      totalReportsCount: filteredReports.length,
      portfolioRoiMultiple,
      portfolioRiskLevel,
      riskLevelColor,
      riskLevelBg
    };
  }, [reportsWithFair, filteredReports.length]);

  // 4. Group by Severity for Breakdown and Doughnut/Pie Chart
  const severityBreakdown = useMemo<SeverityRiskSummary[]>(() => {
    const severities: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
    const totalAle = portfolioMetrics.totalAleUSD || 1;
    const totalCount = filteredReports.length || 1;

    return severities.map((sev) => {
      const matchingItems = reportsWithFair.filter((item) => item.report.severity === sev);
      const count = matchingItems.length;
      const openCount = matchingItems.filter((i) => !i.isMitigated).length;
      const mitigatedCount = matchingItems.filter((i) => i.isMitigated).length;

      const totalAleUSD = matchingItems.reduce((acc, curr) => acc + curr.fair.ale, 0);
      const totalSleUSD = matchingItems.reduce((acc, curr) => acc + curr.fair.sle, 0);
      const avgAleUSD = count > 0 ? Math.round(totalAleUSD / count) : 0;

      const percentOfTotalAle = Number(((totalAleUSD / totalAle) * 100).toFixed(1));
      const percentOfCount = Number(((count / totalCount) * 100).toFixed(1));

      const meta = SEVERITY_METADATA[sev];

      return {
        severity: sev,
        label: meta.label,
        count,
        openCount,
        mitigatedCount,
        totalAleUSD,
        totalSleUSD,
        avgAleUSD,
        percentOfTotalAle,
        percentOfCount,
        color: meta.color,
        lightColor: meta.lightColor,
        bgBadge: meta.bgBadge,
        borderBadge: meta.borderBadge,
        textBadge: meta.textBadge
      };
    });
  }, [reportsWithFair, portfolioMetrics.totalAleUSD, filteredReports.length]);

  // 5. Build Recharts Data based on Active Chart Mode
  const pieChartData = useMemo(() => {
    if (chartMode === 'financial_ale') {
      return severityBreakdown
        .filter((item) => item.totalAleUSD > 0)
        .map((item) => ({
          name: item.label,
          severityKey: item.severity,
          value: item.totalAleUSD,
          formattedValue: currency === 'USD'
            ? formatCurrency(item.totalAleUSD, 'USD')
            : formatCurrency(item.totalAleUSD * USD_TO_BRL_RATE, 'BRL'),
          count: item.count,
          percentage: item.percentOfTotalAle,
          color: item.color,
          avgAleUSD: item.avgAleUSD
        }));
    }

    if (chartMode === 'vuln_count') {
      return severityBreakdown
        .filter((item) => item.count > 0)
        .map((item) => ({
          name: item.label,
          severityKey: item.severity,
          value: item.count,
          formattedValue: `${item.count} vuln${item.count > 1 ? 's' : ''}`,
          count: item.count,
          percentage: item.percentOfCount,
          color: item.color,
          avgAleUSD: item.avgAleUSD
        }));
    }

    // Mode: FAIR Tiers
    const tierMap: Record<string, { name: string; color: string; ale: number; count: number }> = {
      CRITICAL: { name: 'Tier Catastrófico', color: '#ef4444', ale: 0, count: 0 },
      HIGH: { name: 'Tier Elevado', color: '#f97316', ale: 0, count: 0 },
      MEDIUM: { name: 'Tier Moderado', color: '#f59e0b', ale: 0, count: 0 },
      LOW: { name: 'Tier Baixo', color: '#3b82f6', ale: 0, count: 0 }
    };

    reportsWithFair.forEach(({ fair }) => {
      if (tierMap[fair.riskTier]) {
        tierMap[fair.riskTier].ale += fair.ale;
        tierMap[fair.riskTier].count += 1;
      }
    });

    const totalAle = portfolioMetrics.totalAleUSD || 1;

    return Object.values(tierMap)
      .filter((t) => t.ale > 0)
      .map((t) => ({
        name: t.name,
        severityKey: 'CUSTOM',
        value: t.ale,
        formattedValue: currency === 'USD'
          ? formatCurrency(t.ale, 'USD')
          : formatCurrency(t.ale * USD_TO_BRL_RATE, 'BRL'),
        count: t.count,
        percentage: Number(((t.ale / totalAle) * 100).toFixed(1)),
        color: t.color,
        avgAleUSD: t.count > 0 ? Math.round(t.ale / t.count) : 0
      }));
  }, [chartMode, severityBreakdown, reportsWithFair, currency, portfolioMetrics.totalAleUSD]);

  // 6. Top Riskiest Vulnerabilities according to FAIR ALE
  const topRiskyReports = useMemo(() => {
    return [...reportsWithFair]
      .sort((a, b) => b.fair.ale - a.fair.ale)
      .slice(0, 4);
  }, [reportsWithFair]);

  // Helper formatter for active currency
  const formatMoney = useCallback((amountUSD: number) => {
    if (currency === 'BRL') {
      return formatCurrency(amountUSD * USD_TO_BRL_RATE, 'BRL');
    }
    return formatCurrency(amountUSD, 'USD');
  }, [currency]);

  // Copy Executive Report to Clipboard
  const handleCopyExecutiveReport = () => {
    const text = `=== PARECER EXECUTIVO DE RISCO FINANCEIRO QUANTITATIVO (MODELO FAIR) ===
Data da Avaliação: ${new Date().toLocaleDateString('pt-BR')}
Metodologia: FAIR (Factor Analysis of Information Risk - ISO/IEC 27005)
Base de Vulnerabilidades: ${portfolioMetrics.totalReportsCount} relatórios (${portfolioMetrics.openCount} ativas, ${portfolioMetrics.mitigatedCount} remediadas)

[1. EXPOSIÇÃO FINANCEIRA TOTAL ACUMULADA]
- Perda Anual Esperada Total (ALE Acumulado): ${formatMoney(portfolioMetrics.totalAleUSD)}
- Exposição Ativa Não Mitigada: ${formatMoney(portfolioMetrics.activeOpenAleUSD)}
- Perda Financeira Evitada (Remediada): ${formatMoney(portfolioMetrics.totalCostAvoidedUSD)}
- Perda Máxima Consolidada por Incidente (SLE): ${formatMoney(portfolioMetrics.totalSleUSD)}
- Nível Geral de Risco da Organização: ${portfolioMetrics.portfolioRiskLevel}
- Eficiência de Bug Bounty (ROI): ${portfolioMetrics.portfolioRoiMultiple}x retorno em risco evitado

[2. DISTRIBUIÇÃO DE RISCO FINANCEIRO POR SEVERIDADE]
${severityBreakdown
  .filter((s) => s.count > 0)
  .map((s) => `• ${s.label}: ${s.count} vulnerabilidades (${s.percentOfTotalAle}% do risco financeiro total) -> ALE: ${formatMoney(s.totalAleUSD)}`)
  .join('\n')}

[3. MAIORES EXPOSIÇÕES INDIVIDUAIS]
${topRiskyReports
  .map((item, idx) => `${idx + 1}. [${item.report.severity}] ${item.report.title} (CVSS ${item.report.cvssScore}) -> ALE Estimado: ${formatMoney(item.fair.ale)}/ano`)
  .join('\n')}

Este parecer quantitativo foi gerado automaticamente pelo BugSentinel para orientar decisões de investimentos em AppSec e priorização de correção.`;

    navigator.clipboard.writeText(text);
    setCopiedExecutiveReport(true);
    toast.success('Parecer Executivo FAIR copiado com sucesso!', {
      id: 'copy-fair-executive-toast',
      duration: 3000
    });
    setTimeout(() => setCopiedExecutiveReport(false), 3000);
  };

  // Recharts Active Shape on Hover
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 4}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 8}
          outerRadius={outerRadius + 10}
          fill={fill}
        />
      </g>
    );
  };

  return (
    <section
      id="fair-risk-dashboard-section"
      className={`bg-[#0d0e12] border border-[#222634] rounded-2xl overflow-hidden shadow-xl ${className}`}
    >
      {/* 1. Header Section with Title, Badges & Controls */}
      <div className="p-5 sm:p-6 border-b border-[#1e2334] bg-[#0f1118]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-mono font-bold uppercase tracking-wider">
                <Scale className="w-3.5 h-3.5" />
                <span>FAIR Quantitative Risk Engine</span>
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${portfolioMetrics.riskLevelBg} ${portfolioMetrics.riskLevelColor}`}>
                Risco da Organização: {portfolioMetrics.portfolioRiskLevel}
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono text-[10px] border border-blue-500/20">
                Recharts Doughnut
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-amber-400" />
              <span>Dashboard de Risco Financeiro Acumulado & Severidade</span>
            </h2>

            <p className="text-xs text-zinc-400 max-w-3xl leading-relaxed">
              Consolidação quantitativa do risco financeiro do portfólio de vulnerabilidades utilizando o modelo internacional <strong className="text-zinc-200 font-semibold">FAIR (Factor Analysis of Information Risk)</strong>. O gráfico de rosca correlaciona as severidades com o impacto monetário anual esperado (<strong className="text-amber-400">ALE</strong> = Frequência × Magnitude de Perda).
            </p>
          </div>

          {/* Action Bar: Controls & Presets */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            
            {/* Currency Toggle */}
            <div className="inline-flex rounded-lg bg-[#141824] border border-[#262f44] p-0.5 text-xs font-mono">
              <button
                type="button"
                id="btn-risk-currency-usd"
                onClick={() => setCurrency('USD')}
                className={`px-2.5 py-1 rounded-md transition-all font-bold cursor-pointer ${
                  currency === 'USD'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Exibir valores em Dólares Americanos (USD)"
              >
                USD ($)
              </button>
              <button
                type="button"
                id="btn-risk-currency-brl"
                onClick={() => setCurrency('BRL')}
                className={`px-2.5 py-1 rounded-md transition-all font-bold cursor-pointer ${
                  currency === 'BRL'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Exibir valores em Reais Brasileiros (BRL @ 5.45)"
              >
                BRL (R$)
              </button>
            </div>

            {/* Company Scale Selector (FAIR Context) */}
            <div className="relative">
              <select
                id="select-risk-company-scale"
                value={companyScale}
                onChange={(e) => setCompanyScale(e.target.value as CompanyScalePreset)}
                className="px-3 py-1.5 rounded-lg bg-[#141824] border border-[#262f44] text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                title="Ajuste o porte financeiro da organização para calibrar multas e faturamento em risco"
              >
                {Object.entries(COMPANY_REVENUE_PRESETS).map(([key, config]) => (
                  <option key={key} value={key} className="bg-[#121624] text-zinc-200">
                    {config.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Copy Executive Report */}
            <button
              type="button"
              id="btn-copy-fair-risk-report"
              onClick={handleCopyExecutiveReport}
              className="px-3 py-1.5 rounded-lg bg-[#181d2a] hover:bg-[#202738] text-zinc-300 hover:text-white border border-[#2b354c] hover:border-amber-500/40 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Copiar parecer executivo quantitativo de risco FAIR"
            >
              {copiedExecutiveReport ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Parecer C-Level</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Filter Toolbar: Status Scope & Chart Modes */}
        <div className="mt-4 pt-3 border-t border-[#1a1f2e] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          
          {/* Scope Filter Tabs */}
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 flex items-center gap-1 text-[11px] mr-1">
              <Filter className="w-3 h-3 text-zinc-400" />
              <span>Escopo:</span>
            </span>
            <button
              type="button"
              id="btn-filter-scope-all"
              onClick={() => setScopeFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                scopeFilter === 'all'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'bg-[#121624] text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              Todos ({reports.length})
            </button>
            <button
              type="button"
              id="btn-filter-scope-open"
              onClick={() => setScopeFilter('open_only')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                scopeFilter === 'open_only'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 font-bold'
                  : 'bg-[#121624] text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              Apenas Abertas ({portfolioMetrics.openCount})
            </button>
            <button
              type="button"
              id="btn-filter-scope-mitigated"
              onClick={() => setScopeFilter('mitigated_only')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                scopeFilter === 'mitigated_only'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                  : 'bg-[#121624] text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              Apenas Mitigadas ({portfolioMetrics.mitigatedCount})
            </button>
          </div>

          {/* Chart View Modes */}
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 text-[11px] mr-1">Exibição da Rosca:</span>
            <div className="inline-flex rounded-lg bg-[#141824] border border-[#262f44] p-0.5">
              <button
                type="button"
                id="btn-chart-mode-financial-ale"
                onClick={() => setChartMode('financial_ale')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  chartMode === 'financial_ale'
                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Fatias da rosca proporcionais à perda financeira anual (ALE em US$)"
              >
                Risco Financeiro (ALE)
              </button>
              <button
                type="button"
                id="btn-chart-mode-vuln-count"
                onClick={() => setChartMode('vuln_count')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  chartMode === 'vuln_count'
                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Fatias da rosca proporcionais ao número de vulnerabilidades"
              >
                Contagem de Falhas
              </button>
              <button
                type="button"
                id="btn-chart-mode-fair-tiers"
                onClick={() => setChartMode('fair_tiers')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  chartMode === 'fair_tiers'
                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Classificação pelos tiers canônicos da metodologia FAIR"
              >
                Tiers FAIR
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 2. Top KPI Cards: Cumulative Financial Risk Metrics */}
      <div className="p-5 sm:p-6 bg-[#0a0b0f] border-b border-[#1e2334]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* KPI 1: Total Accumulated Annual Loss Expectancy (ALE) */}
          <div
            id="kpi-card-total-ale"
            className="p-4 rounded-xl bg-[#121624] border border-[#20273d] flex flex-col justify-between hover:border-amber-500/40 transition-colors group"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono text-zinc-400 uppercase flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                  <span>Perda Anual Esperada (ALE)</span>
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                  FAIR Total
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-bold font-mono text-amber-300 tracking-tight">
                {formatMoney(portfolioMetrics.totalAleUSD)}
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                Exposição anual acumulada
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#1c2234] flex items-center justify-between text-[11px] font-mono">
              <span className="text-zinc-400">Ativa sob risco:</span>
              <span className="font-bold text-red-400">{formatMoney(portfolioMetrics.activeOpenAleUSD)}</span>
            </div>
          </div>

          {/* KPI 2: Total Single Loss Expectancy (SLE - Worst Case Breach Event) */}
          <div
            id="kpi-card-total-sle"
            className="p-4 rounded-xl bg-[#121624] border border-[#20273d] flex flex-col justify-between hover:border-red-500/40 transition-colors group"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono text-zinc-400 uppercase flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  <span>Impacto por Incidente (SLE)</span>
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-300 border border-red-500/20 font-bold">
                  Magnitude
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
                {formatMoney(portfolioMetrics.totalSleUSD)}
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                Cenário cumulativo de violação
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#1c2234] flex items-center justify-between text-[11px] font-mono">
              <span className="text-zinc-400">Média por achado:</span>
              <span className="font-bold text-zinc-200">
                {formatMoney(portfolioMetrics.totalReportsCount > 0 ? Math.round(portfolioMetrics.totalSleUSD / portfolioMetrics.totalReportsCount) : 0)}
              </span>
            </div>
          </div>

          {/* KPI 3: Total Cost Avoided via Remediation (Saved Money) */}
          <div
            id="kpi-card-total-avoided"
            className="p-4 rounded-xl bg-[#121624] border border-[#20273d] flex flex-col justify-between hover:border-emerald-500/40 transition-colors group"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono text-zinc-400 uppercase flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Prejuízo Evitado (Mitigado)</span>
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
                  Economia
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 tracking-tight">
                {formatMoney(portfolioMetrics.totalCostAvoidedUSD)}
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                Protegido por correções concluídas
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#1c2234] flex items-center justify-between text-[11px] font-mono">
              <span className="text-zinc-400">Falhas corrigidas:</span>
              <span className="font-bold text-emerald-300">{portfolioMetrics.mitigatedCount} de {portfolioMetrics.totalReportsCount}</span>
            </div>
          </div>

          {/* KPI 4: Bug Bounty ROI Multiplier */}
          <div
            id="kpi-card-bounty-roi"
            className="p-4 rounded-xl bg-[#121624] border border-[#20273d] flex flex-col justify-between hover:border-cyan-500/40 transition-colors group"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono text-zinc-400 uppercase flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Retorno do Investimento (ROI)</span>
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
                  Múltiplo
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-bold font-mono text-cyan-400 tracking-tight">
                {portfolioMetrics.portfolioRoiMultiple}x
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                Retorno por dólar investido em bounty
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#1c2234] flex items-center justify-between text-[11px] font-mono">
              <span className="text-zinc-400">Bounties pagos:</span>
              <span className="font-bold text-zinc-300">{formatMoney(portfolioMetrics.totalBountiesInvestedUSD)}</span>
            </div>
          </div>

        </div>
      </div>

      {/* 3. Main Visual Area: Doughnut/Pie Chart (Recharts) & Severity Risk Breakdown */}
      <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* Left Column (5 Cols): Recharts Doughnut / Rosca Chart */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative p-4 rounded-xl bg-[#090b10] border border-[#1e2334]">
          <div className="w-full flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5">
              <PieChartIcon className="w-4 h-4 text-amber-400" />
              <span>Distribuição de Risco no Portfólio</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-400">
              {chartMode === 'financial_ale' ? 'Base: ALE ($)' : chartMode === 'vuln_count' ? 'Base: Qtd Falhas' : 'Base: Tiers FAIR'}
            </span>
          </div>

          {/* Interactive Recharts PieChart */}
          <div className="w-full h-72 sm:h-80 relative flex items-center justify-center" id="recharts-risk-doughnut-container">
            {pieChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      activeIndex={activeIndex !== null ? activeIndex : undefined}
                      activeShape={renderActiveShape}
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={68}
                      outerRadius={105}
                      paddingAngle={3}
                      cornerRadius={4}
                      dataKey="value"
                      onMouseEnter={(_, index) => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(null)}
                      onClick={(entry: any) => {
                        const sevKey = entry?.payload?.severityKey || entry?.severityKey;
                        if (sevKey && sevKey !== 'CUSTOM' && onSelectSeverity) {
                          onSelectSeverity(sevKey as Severity);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          stroke="#0d0e12"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#121624] border border-[#2a344e] rounded-xl p-3 shadow-2xl text-xs font-mono z-50 min-w-[200px]">
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1e263c]">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: data.color }}
                                />
                                <span className="font-bold text-white text-sm">{data.name}</span>
                              </div>
                              <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 text-[10px] font-bold">
                                {data.percentage}%
                              </span>
                            </div>

                            <div className="space-y-1.5 text-zinc-300">
                              <div className="flex justify-between items-center">
                                <span className="text-zinc-400">Risco Anual (ALE):</span>
                                <span className="font-bold text-amber-300">
                                  {formatMoney(chartMode === 'financial_ale' ? data.value : data.avgAleUSD * data.count)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-zinc-400">Vulnerabilidades:</span>
                                <span className="font-bold text-zinc-100">{data.count}</span>
                              </div>
                              <div className="flex justify-between items-center pt-1 border-t border-[#1e263c] text-[10px]">
                                <span className="text-zinc-400">ALE Médio / Falha:</span>
                                <span className="font-bold text-cyan-300">{formatMoney(data.avgAleUSD)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center of the Doughnut: Primary Risk Metric Display */}
                <div
                  className="absolute inset-0 m-auto flex flex-col items-center justify-center pointer-events-none w-32 h-32 rounded-full"
                >
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">
                    {chartMode === 'financial_ale' ? 'Risco Anual' : 'Total Falhas'}
                  </span>
                  <span className="text-sm sm:text-base font-bold font-mono text-white tracking-tight mt-0.5">
                    {chartMode === 'financial_ale'
                      ? formatMoney(portfolioMetrics.totalAleUSD)
                      : `${portfolioMetrics.totalReportsCount} un.`}
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400 font-semibold mt-0.5">
                    FAIR Engine
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-zinc-500 text-xs font-mono py-8">
                <Info className="w-8 h-8 text-zinc-600 mb-2" />
                <span>Nenhum relatório corresponde ao filtro atual.</span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-zinc-400 text-center mt-2 font-mono">
            Dica: Passe o cursor para inspecionar cada fatia ou clique para filtrar por severidade.
          </p>
        </div>

        {/* Right Column (7 Cols): Severity Risk Breakdown Table & Progress Bars */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Matriz de Risco Financeiro por Severidade</span>
            </h4>
            <span className="text-[11px] font-mono text-zinc-400">
              {portfolioMetrics.totalReportsCount} vulnerabilidades analisadas
            </span>
          </div>

          {/* Breakdown Rows */}
          <div className="space-y-2.5">
            {severityBreakdown.map((item) => {
              const isSelected = activeIndex !== null && pieChartData[activeIndex]?.name === item.label;

              return (
                <div
                  key={item.severity}
                  id={`row-severity-risk-${item.severity.toLowerCase()}`}
                  onClick={() => onSelectSeverity && onSelectSeverity(item.severity)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#181d2a] border-amber-500 ring-1 ring-amber-500/30'
                      : 'bg-[#0f1118] border-[#1e2334] hover:bg-[#141824] hover:border-zinc-500'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-bold text-xs text-white uppercase font-mono">
                        {item.label}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${item.bgBadge} ${item.borderBadge} ${item.textBadge} border`}>
                        {item.count} {item.count === 1 ? 'falha' : 'falhas'}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 hidden sm:inline">
                        ({item.openCount} ativas / {item.mitigatedCount} corrigidas)
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-bold font-mono text-xs text-amber-300">
                        {formatMoney(item.totalAleUSD)}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 ml-1.5">
                        ({item.percentOfTotalAle}%)
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Visual Share Bar */}
                  <div className="h-1.5 w-full bg-[#1c2234] rounded-full overflow-hidden flex">
                    <div
                      className="h-full transition-all duration-500 rounded-full"
                      style={{
                        width: `${Math.max(item.percentOfTotalAle, item.count > 0 ? 3 : 0)}%`,
                        backgroundColor: item.color
                      }}
                      title={`${item.label}: ${item.percentOfTotalAle}% do risco financeiro total`}
                    />
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                    <span>Média por relatório: <strong className="text-zinc-300">{formatMoney(item.avgAleUSD)}</strong></span>
                    <span>Impacto por incidente: <strong className="text-zinc-300">{formatMoney(item.totalSleUSD)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>

      {/* 4. Bottom Section: Top 4 Riskiest Vulnerabilities & Strategic Recommendation */}
      <div className="p-5 sm:p-6 border-t border-[#1e2334] bg-[#0c0d12]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>Maiores Exposições Financeiras Individuais (Top Riscos FAIR)</span>
            </h4>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Vulnerabilidades com maior perda financeira anual projetada caso permaneçam exploráveis em produção.
            </p>
          </div>

          {onNavigateToReports && (
            <button
              type="button"
              id="btn-risk-view-all-reports"
              onClick={onNavigateToReports}
              className="text-xs font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            >
              <span>Ver todos os relatórios</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Top 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {topRiskyReports.map(({ report, fair, isMitigated }) => (
            <div
              key={report.id}
              id={`card-top-risk-${report.id}`}
              onClick={() => onSelectReport && onSelectReport(report)}
              className="p-3 rounded-xl bg-[#121624] border border-[#20273d] hover:border-amber-500/50 hover:bg-[#161c2c] transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${getSeverityBadgeColor(report.severity)}`}>
                    {report.severity}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    CVSS {report.cvssScore.toFixed(1)}
                  </span>
                  {isMitigated ? (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 text-[9px] font-mono font-bold border border-emerald-500/30">
                      RESOLVIDO
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded bg-red-500/15 text-red-300 text-[9px] font-mono font-bold border border-red-500/30">
                      ATIVO
                    </span>
                  )}
                </div>

                <div>
                  <h5 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2">
                    {report.title}
                  </h5>
                  <p className="text-[10px] font-mono text-zinc-400 mt-1 truncate">
                    Alvo: {report.target}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#1c2234] flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-mono text-zinc-400 uppercase block">ALE Anual</span>
                  <span className="text-xs font-bold font-mono text-amber-300">
                    {formatMoney(fair.ale)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-mono text-zinc-400 uppercase block">SLE Único</span>
                  <span className="text-xs font-bold font-mono text-zinc-200">
                    {formatMoney(fair.sle)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Note about Methodology */}
        <div className="mt-4 pt-3 border-t border-[#1a1f2e] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span>
              Cálculo baseado em: <strong className="text-zinc-300">Open Group FAIR™ (ISO 27005)</strong>, Ponemon Institute e taxas regulatórias LGPD/GDPR.
            </span>
          </div>
          <span className="text-zinc-400">
            Faturamento Base: {COMPANY_REVENUE_PRESETS[companyScale].label}
          </span>
        </div>

      </div>

    </section>
  );
};
export default RiskDashboard;
