import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';
import {
  PieChart as PieChartIcon,
  ShieldAlert,
  AlertTriangle,
  Layers,
  DollarSign,
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  Info
} from 'lucide-react';
import { VulnerabilityReport, Severity } from '../types';
import { formatCurrency } from '../utils/formatters';

export interface SeverityDoughnutChartProps {
  reports: VulnerabilityReport[];
  onSeverityClick?: (severity: Severity) => void;
  onNewReport?: () => void;
}

interface SeverityConfigItem {
  label: string;
  color: string;
  lightColor: string;
  bgBadge: string;
  borderBadge: string;
  textBadge: string;
  cvssRange: string;
  description: string;
}

const SEVERITY_CONFIG: Record<Severity, SeverityConfigItem> = {
  CRITICAL: {
    label: 'Critical',
    color: '#ef4444',
    lightColor: '#f87171',
    bgBadge: 'bg-red-500/10',
    borderBadge: 'border-red-500/30',
    textBadge: 'text-red-400',
    cvssRange: '9.0 - 10.0',
    description: 'Impacto total ao sistema, RCE, autenticação burlada'
  },
  HIGH: {
    label: 'High',
    color: '#f97316',
    lightColor: '#fb923c',
    bgBadge: 'bg-orange-500/10',
    borderBadge: 'border-orange-500/30',
    textBadge: 'text-orange-400',
    cvssRange: '7.0 - 8.9',
    description: 'Elevação de privilégio, IDOR com dados sensíveis, SSRF'
  },
  MEDIUM: {
    label: 'Medium',
    color: '#eab308',
    lightColor: '#facc15',
    bgBadge: 'bg-yellow-500/10',
    borderBadge: 'border-yellow-500/30',
    textBadge: 'text-yellow-400',
    cvssRange: '4.0 - 6.9',
    description: 'XSS armazenado/refletido, manipulação de estado, CSRF'
  },
  LOW: {
    label: 'Low',
    color: '#3b82f6',
    lightColor: '#60a5fa',
    bgBadge: 'bg-blue-500/10',
    borderBadge: 'border-blue-500/30',
    textBadge: 'text-blue-400',
    cvssRange: '0.1 - 3.9',
    description: 'Divulgação de versão, headers permissivos, bugs informativos'
  },
  INFO: {
    label: 'Info',
    color: '#71717a',
    lightColor: '#a1a1aa',
    bgBadge: 'bg-zinc-500/10',
    borderBadge: 'border-zinc-500/30',
    textBadge: 'text-zinc-400',
    cvssRange: '0.0',
    description: 'Boas práticas e sugestões sem impacto direto comprovado'
  }
};

const ORDERED_SEVERITIES: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export const SeverityDoughnutChart: React.FC<SeverityDoughnutChartProps> = ({
  reports,
  onSeverityClick,
  onNewReport
}) => {
  const [metricMode, setMetricMode] = useState<'count' | 'bounty'>('count');
  const [hoveredSeverity, setHoveredSeverity] = useState<Severity | null>(null);

  const totalReports = reports.length;
  const totalBounty = useMemo(() => {
    return reports.reduce((acc, r) => acc + (r.bountyAmount || 0), 0);
  }, [reports]);

  // Aggregate stats per severity level (CRITICAL, HIGH, MEDIUM, LOW)
  const severityData = useMemo(() => {
    const hasInfo = reports.some((r) => r.severity === 'INFO');
    const severitiesToInclude = hasInfo
      ? [...ORDERED_SEVERITIES, 'INFO' as Severity]
      : ORDERED_SEVERITIES;

    return severitiesToInclude.map((sev) => {
      const matching = reports.filter((r) => r.severity === sev);
      const count = matching.length;
      const bounty = matching.reduce((acc, r) => acc + (r.bountyAmount || 0), 0);
      const countPercentage = totalReports > 0 ? (count / totalReports) * 100 : 0;
      const bountyPercentage = totalBounty > 0 ? (bounty / totalBounty) * 100 : 0;
      const avgCvss =
        count > 0
          ? (matching.reduce((acc, r) => acc + (r.cvssScore || 0), 0) / count).toFixed(1)
          : '0.0';

      const config = SEVERITY_CONFIG[sev];

      return {
        severity: sev,
        name: config.label,
        value: metricMode === 'count' ? count : bounty,
        count,
        bounty,
        countPercentage: Math.round(countPercentage),
        exactCountPercentage: countPercentage,
        bountyPercentage: Math.round(bountyPercentage),
        avgCvss,
        color: config.color,
        lightColor: config.lightColor,
        bgBadge: config.bgBadge,
        borderBadge: config.borderBadge,
        textBadge: config.textBadge,
        cvssRange: config.cvssRange,
        description: config.description
      };
    });
  }, [reports, totalReports, totalBounty, metricMode]);

  // Highlight metrics
  const criticalCount = useMemo(
    () => reports.filter((r) => r.severity === 'CRITICAL').length,
    [reports]
  );
  const highCount = useMemo(
    () => reports.filter((r) => r.severity === 'HIGH').length,
    [reports]
  );
  const mediumCount = useMemo(
    () => reports.filter((r) => r.severity === 'MEDIUM').length,
    [reports]
  );
  const lowCount = useMemo(
    () => reports.filter((r) => r.severity === 'LOW').length,
    [reports]
  );

  const criticalAndHighPct = totalReports > 0
    ? Math.round(((criticalCount + highCount) / totalReports) * 100)
    : 0;

  // Active hovered or leading severity info
  const activeStats = useMemo(() => {
    if (hoveredSeverity) {
      return severityData.find((s) => s.severity === hoveredSeverity);
    }
    // Default to critical if exists, else first non-zero, else highest severity
    const criticalItem = severityData.find((s) => s.severity === 'CRITICAL' && s.count > 0);
    if (criticalItem) return criticalItem;
    const firstNonZero = severityData.find((s) => s.count > 0);
    return firstNonZero || severityData[0];
  }, [hoveredSeverity, severityData]);

  // Custom Doughnut Tooltip
  const CustomDoughnutTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          id="doughnut-chart-tooltip"
          className="bg-[#12141f]/95 backdrop-blur-md border border-[#2d3450] p-3.5 rounded-xl shadow-2xl text-xs space-y-2 font-mono min-w-[210px] z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-[#252b45]">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full ring-2 ring-white/10"
                style={{ backgroundColor: data.color }}
              />
              <span className="font-bold text-white uppercase">{data.name}</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
              CVSS {data.cvssRange}
            </span>
          </div>

          <div className="space-y-1 text-zinc-300 pt-0.5">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Total de Relatórios:</span>
              <span className="font-bold text-white font-mono">
                {data.count} ({data.countPercentage}%)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Total em Bounties:</span>
              <span className="font-bold text-emerald-400 font-mono">
                {formatCurrency(data.bounty, 'USD')}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">CVSS Médio:</span>
              <span className="font-bold text-amber-300 font-mono">{data.avgCvss}</span>
            </div>
          </div>

          <p className="text-[10px] text-zinc-400 pt-1 border-t border-[#202538] italic leading-tight">
            {data.description}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <section
      id="vulnerability-severity-doughnut-chart-section"
      className="bg-[#0e1017] border border-[#202538] rounded-2xl overflow-hidden shadow-2xl mb-8"
    >
      {/* Header section with icon, title, tags and controls */}
      <div className="p-5 sm:p-6 border-b border-[#202538] bg-[#121524]/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
            <PieChartIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-white tracking-tight">
                Distribuição de Severidade (Doughnut Chart)
              </h3>
              <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-300 font-mono text-[10px] border border-red-500/30 font-bold uppercase">
                Recharts Doughnut
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              Distribuição proporcional dos níveis de severidade (CRITICAL, HIGH, MEDIUM, LOW) com anel doughnut interativo e detalhamento de impacto de risco.
            </p>
          </div>
        </div>

        {/* Metric Toggle: Reports vs Bounties */}
        <div className="flex items-center gap-2 bg-[#090b13] border border-[#22273d] p-1 rounded-lg">
          <button
            type="button"
            id="btn-doughnut-metric-count"
            onClick={() => setMetricMode('count')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-all cursor-pointer ${
              metricMode === 'count'
                ? 'bg-red-500/20 text-red-300 border border-red-500/30 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Qtd Falhas ({totalReports})</span>
          </button>
          <button
            type="button"
            id="btn-doughnut-metric-bounty"
            onClick={() => setMetricMode('bounty')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-all cursor-pointer ${
              metricMode === 'bounty'
                ? 'bg-red-500/20 text-red-300 border border-red-500/30 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Bounties ({formatCurrency(totalBounty, 'USD')})</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid: Doughnut Ring on left, Severity Breakdown Cards on right */}
      <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Doughnut Chart Canvas with Center Readout */}
        <div className="lg:col-span-6 relative flex flex-col items-center justify-center">
          <div className="w-full h-64 sm:h-72 relative" id="doughnut-chart-container">
            {totalReports > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={72}
                    outerRadius={104}
                    paddingAngle={4}
                    cornerRadius={6}
                    stroke="#0e1017"
                    strokeWidth={3}
                    onMouseEnter={(_, index) => {
                      if (severityData[index]) {
                        setHoveredSeverity(severityData[index].severity);
                      }
                    }}
                    onMouseLeave={() => setHoveredSeverity(null)}
                    onClick={(entry: any) => {
                      const sev = entry?.payload?.severity || entry?.severity;
                      if (sev && onSeverityClick) {
                        onSeverityClick(sev);
                      }
                    }}
                    cursor="pointer"
                  >
                    {severityData.map((entry) => {
                      const isHovered = hoveredSeverity === entry.severity;
                      return (
                        <Cell
                          key={`cell-${entry.severity}`}
                          fill={entry.color}
                          stroke={isHovered ? '#ffffff' : entry.color}
                          strokeWidth={isHovered ? 2 : 1}
                          className="transition-all duration-200 hover:opacity-90"
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip content={<CustomDoughnutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 font-mono text-xs">
                <AlertTriangle className="w-8 h-8 text-zinc-600 mb-2" />
                <span>Nenhuma vulnerabilidade registrada para exibir no doughnut.</span>
              </div>
            )}

            {/* Centered Donut Readout */}
            {totalReports > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                <span className="text-3xl font-bold font-mono text-white tracking-tight">
                  {hoveredSeverity && activeStats
                    ? activeStats.count
                    : totalReports}
                </span>
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 mt-0.5">
                  {hoveredSeverity && activeStats
                    ? activeStats.name
                    : 'Total Falhas'}
                </span>
                <span
                  className={`text-[10px] font-mono font-bold mt-1 px-2 py-0.5 rounded ${
                    hoveredSeverity && activeStats
                      ? `${activeStats.bgBadge} ${activeStats.textBadge}`
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}
                >
                  {hoveredSeverity && activeStats
                    ? `${activeStats.countPercentage}% do total`
                    : `${criticalAndHighPct}% Críticas/Altas`}
                </span>
              </div>
            )}
          </div>

          <div className="text-[11px] font-mono text-zinc-500 text-center mt-2 flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Passe o cursor sobre os anéis ou clique em um nível para filtrar</span>
          </div>
        </div>

        {/* Severity Metrics Breakdown Grid (CRITICAL, HIGH, MEDIUM, LOW) */}
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {severityData.map((item) => {
            const isHovered = hoveredSeverity === item.severity;
            return (
              <button
                type="button"
                key={item.severity}
                id={`btn-doughnut-severity-${item.severity.toLowerCase()}`}
                onClick={() => onSeverityClick && onSeverityClick(item.severity)}
                onMouseEnter={() => setHoveredSeverity(item.severity)}
                onMouseLeave={() => setHoveredSeverity(null)}
                className={`p-3.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                  isHovered
                    ? 'bg-[#181c30] border-zinc-400 shadow-lg scale-[1.02]'
                    : 'bg-[#121524] border-[#202538] hover:bg-[#15192c]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full ring-2 ring-white/10"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs font-bold font-mono text-white tracking-wide">
                      {item.name.toUpperCase()}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${item.bgBadge} ${item.borderBadge} ${item.textBadge}`}
                  >
                    CVSS {item.cvssRange}
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-2xl font-light font-mono text-white">
                    {item.count}
                    <span className="text-xs font-sans text-zinc-500 ml-1.5">
                      ({item.countPercentage}%)
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {formatCurrency(item.bounty, 'USD')}
                  </span>
                </div>

                {/* Severity Proportion Progress Bar */}
                <div className="w-full bg-[#1e2338] h-1.5 rounded-full overflow-hidden mt-3">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.countPercentage}%`,
                      backgroundColor: item.color
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono mt-2 pt-2 border-t border-[#1e2338]">
                  <span>Média CVSS: <strong className="text-zinc-300">{item.avgCvss}</strong></span>
                  <span className="text-zinc-400 group-hover:text-white flex items-center gap-0.5">
                    Filtrar <ArrowRight className="w-2.5 h-2.5 ml-0.5 inline" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary Risk Footer */}
      <div className="px-5 py-3.5 border-t border-[#202538] bg-[#0b0d17] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-zinc-400">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <span>
            Exposição de Alto Risco: <strong className="text-red-400">{criticalCount + highCount}</strong> falhas críticas/altas representam <strong className="text-zinc-200">{criticalAndHighPct}%</strong> do acervo total.
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-zinc-400">
          <span>Total Bounties: <strong className="text-emerald-400">{formatCurrency(totalBounty, 'USD')}</strong></span>
          {onNewReport && (
            <button
              type="button"
              id="btn-doughnut-new-report"
              onClick={onNewReport}
              className="text-xs font-sans text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Novo Relatório</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
