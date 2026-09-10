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
  DollarSign,
  Layers,
  ArrowRight,
  HelpCircle,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { VulnerabilityReport, Severity } from '../types';
import { formatCurrency } from '../utils/formatters';

export interface SeverityPieChartProps {
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
    description: 'Impacto total ao sistema, RCE, bypass de autenticação'
  },
  HIGH: {
    label: 'High',
    color: '#f97316',
    lightColor: '#fb923c',
    bgBadge: 'bg-orange-500/10',
    borderBadge: 'border-orange-500/30',
    textBadge: 'text-orange-400',
    cvssRange: '7.0 - 8.9',
    description: 'Elevação de privilégio, IDOR com PII, CSRF crítico'
  },
  MEDIUM: {
    label: 'Medium',
    color: '#eab308',
    lightColor: '#facc15',
    bgBadge: 'bg-yellow-500/10',
    borderBadge: 'border-yellow-500/30',
    textBadge: 'text-yellow-400',
    cvssRange: '4.0 - 6.9',
    description: 'Manipulação de estado, XSS armazenado/refletido'
  },
  LOW: {
    label: 'Low',
    color: '#3b82f6',
    lightColor: '#60a5fa',
    bgBadge: 'bg-blue-500/10',
    borderBadge: 'border-blue-500/30',
    textBadge: 'text-blue-400',
    cvssRange: '0.1 - 3.9',
    description: 'Divulgação de versão, CORS aberto sem credenciais'
  },
  INFO: {
    label: 'Info',
    color: '#71717a',
    lightColor: '#a1a1aa',
    bgBadge: 'bg-zinc-500/10',
    borderBadge: 'border-zinc-500/30',
    textBadge: 'text-zinc-400',
    cvssRange: '0.0',
    description: 'Hardening sugerido ou boas práticas informativas'
  }
};

const ORDERED_SEVERITIES: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const RADIAN = Math.PI / 180;

export const SeverityPieChart: React.FC<SeverityPieChartProps> = ({
  reports,
  onSeverityClick,
  onNewReport
}) => {
  const [metricMode, setMetricMode] = useState<'count' | 'bounty'>('count');
  const [chartStyle, setChartStyle] = useState<'pie' | 'donut'>('pie');
  const [hoveredSeverity, setHoveredSeverity] = useState<Severity | null>(null);
  const [showLabels, setShowLabels] = useState<boolean>(true);

  const totalReports = reports.length;
  const totalBounty = useMemo(() => {
    return reports.reduce((acc, r) => acc + (r.bountyAmount || 0), 0);
  }, [reports]);

  // Include INFO only if there are reports with INFO severity
  const activeSeverities = useMemo(() => {
    const hasInfo = reports.some(r => r.severity === 'INFO');
    return hasInfo ? [...ORDERED_SEVERITIES, 'INFO' as Severity] : ORDERED_SEVERITIES;
  }, [reports]);

  // Aggregate statistics per severity level
  const severityStats = useMemo(() => {
    return activeSeverities.map(sev => {
      const matching = reports.filter(r => r.severity === sev);
      const count = matching.length;
      const earned = matching.reduce((acc, r) => acc + (r.bountyAmount || 0), 0);
      const countPercentage = totalReports > 0 ? (count / totalReports) * 100 : 0;
      const bountyPercentage = totalBounty > 0 ? (earned / totalBounty) * 100 : 0;
      const avgCvss = count > 0
        ? (matching.reduce((acc, r) => acc + (r.cvssScore || 0), 0) / count).toFixed(1)
        : '0.0';

      const config = SEVERITY_CONFIG[sev];

      return {
        severity: sev,
        name: config.label,
        count,
        earned,
        countPercentage: Math.round(countPercentage),
        exactCountPercentage: countPercentage,
        bountyPercentage: Math.round(bountyPercentage),
        exactBountyPercentage: bountyPercentage,
        avgCvss,
        cvssRange: config.cvssRange,
        color: config.color,
        lightColor: config.lightColor,
        bgBadge: config.bgBadge,
        borderBadge: config.borderBadge,
        textBadge: config.textBadge,
        description: config.description,
        value: metricMode === 'count' ? count : earned
      };
    });
  }, [reports, totalReports, totalBounty, activeSeverities, metricMode]);

  // Filter out slices with value 0 for Recharts Pie rendering
  const pieData = useMemo(() => {
    return severityStats.filter(d => d.value > 0);
  }, [severityStats]);

  // Active hover item info
  const activeItem = useMemo(() => {
    if (hoveredSeverity) {
      return severityStats.find(s => s.severity === hoveredSeverity) || null;
    }
    return null;
  }, [hoveredSeverity, severityStats]);

  // Critical + High ratio
  const highCriticalStats = useMemo(() => {
    const highCritCount = reports.filter(r => r.severity === 'CRITICAL' || r.severity === 'HIGH').length;
    const percent = totalReports > 0 ? Math.round((highCritCount / totalReports) * 100) : 0;
    return { count: highCritCount, percent };
  }, [reports, totalReports]);

  // Most prevalent severity
  const prevalentSeverity = useMemo(() => {
    if (totalReports === 0) return null;
    const sorted = [...severityStats].sort((a, b) => b.count - a.count);
    return sorted[0];
  }, [severityStats, totalReports]);

  // Custom label on Pie slices
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent
  }: any) => {
    if (percent < 0.06) return null; // Don't crowd tiny slices
    const radius = innerRadius + (outerRadius - innerRadius) * (chartStyle === 'donut' ? 0.5 : 0.65);
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-[11px] font-mono font-bold pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] select-none"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Custom tooltip for Pie Chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#121212]/95 backdrop-blur-md border border-[#333] p-3.5 rounded-xl shadow-2xl text-xs space-y-2 font-mono min-w-[220px] z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#262626]">
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
              <span className="text-zinc-400">Recompensas Pagas:</span>
              <span className="font-bold text-emerald-400 font-mono">
                {formatCurrency(data.earned, 'USD')}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">CVSS Médio:</span>
              <span className="font-bold text-amber-300 font-mono">{data.avgCvss}</span>
            </div>
          </div>

          <p className="text-[10px] text-zinc-400 pt-1 border-t border-[#222] italic leading-tight">
            {data.description}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      id="severity-pie-chart-section"
      className="bg-[#0a0a0a] border border-[#262626] rounded-xl flex flex-col overflow-hidden shadow-2xl"
    >
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-[#262626] bg-[#111] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
            <PieChartIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold uppercase text-zinc-100 tracking-wider">
                Distribuição de Vulnerabilidades por Severidade
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold">
                RECHARTS PIE
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Proporção dos achados classificados em Critical, High, Medium e Low
            </p>
          </div>
        </div>

        {/* Controls: Metric Mode, Chart Style, and Labels */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Style: Solid Pie vs Donut */}
          <div className="flex items-center bg-[#181818] p-0.5 rounded-lg border border-[#2a2a2a]">
            <button
              type="button"
              id="btn-pie-type-solid"
              onClick={() => setChartStyle('pie')}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                chartStyle === 'pie'
                  ? 'bg-[#262626] text-emerald-400 border border-emerald-500/30 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Gráfico de Pizza Sólido"
            >
              Pizza
            </button>
            <button
              type="button"
              id="btn-pie-type-donut"
              onClick={() => setChartStyle('donut')}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                chartStyle === 'donut'
                  ? 'bg-[#262626] text-emerald-400 border border-emerald-500/30 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Gráfico Donut com centro informativo"
            >
              Donut
            </button>
          </div>

          {/* Metric Toggle: Reports vs Bounties */}
          <div className="flex items-center bg-[#181818] p-0.5 rounded-lg border border-[#2a2a2a]">
            <button
              type="button"
              id="btn-pie-metric-count"
              onClick={() => setMetricMode('count')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-all ${
                metricMode === 'count'
                  ? 'bg-[#262626] text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Distribuir pela contagem de relatórios"
            >
              <Layers className="w-3 h-3" />
              <span>Contagem ({totalReports})</span>
            </button>
            <button
              type="button"
              id="btn-pie-metric-bounty"
              onClick={() => setMetricMode('bounty')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-all ${
                metricMode === 'bounty'
                  ? 'bg-[#262626] text-emerald-400 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Distribuir pelo valor de bounties pagos"
            >
              <DollarSign className="w-3 h-3" />
              <span>Bounties ({formatCurrency(totalBounty, 'USD')})</span>
            </button>
          </div>

          {/* Labels Toggle */}
          <button
            type="button"
            id="btn-pie-toggle-labels"
            onClick={() => setShowLabels(!showLabels)}
            className={`px-2.5 py-1 rounded text-xs font-mono border transition-all ${
              showLabels
                ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                : 'bg-[#181818] text-zinc-500 border-[#2a2a2a] hover:text-zinc-400'
            }`}
            title="Exibir ou ocultar percentuais sobre as fatias"
          >
            % Rótulos
          </button>
        </div>
      </div>

      {/* Top Indicators Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#222] border-b border-[#222] bg-[#0d0d0d] text-xs font-mono">
        <div className="p-3 px-4 flex items-center justify-between">
          <span className="text-zinc-500">Total Analisado</span>
          <span className="text-white font-bold">{totalReports} relatórios</span>
        </div>
        <div className="p-3 px-4 flex items-center justify-between">
          <span className="text-zinc-500">Crítico + Alto</span>
          <span className="text-red-400 font-bold">
            {highCriticalStats.count} ({highCriticalStats.percent}%)
          </span>
        </div>
        <div className="p-3 px-4 flex items-center justify-between">
          <span className="text-zinc-500">Severidade Mais Comum</span>
          <span className="text-amber-400 font-bold">
            {prevalentSeverity ? `${prevalentSeverity.name} (${prevalentSeverity.count})` : '-'}
          </span>
        </div>
        <div className="p-3 px-4 flex items-center justify-between">
          <span className="text-zinc-500">Total Recompensas</span>
          <span className="text-emerald-400 font-bold">{formatCurrency(totalBounty, 'USD')}</span>
        </div>
      </div>

      {/* Chart & Breakdown Content */}
      <div className="p-4 sm:p-6">
        {totalReports === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h5 className="text-sm font-semibold text-zinc-300">Nenhum achado cadastrado</h5>
              <p className="text-xs text-zinc-500">
                Cadastre seus primeiros relatórios para visualizar a distribuição gráfica por níveis de severidade (Critical, High, Medium, Low).
              </p>
            </div>
            {onNewReport && (
              <button
                type="button"
                onClick={onNewReport}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Relatório</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* Left Column: Recharts Pie Chart */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center relative min-h-[300px]">
              
              {/* Dynamic Status / Active readout above chart */}
              <div className="w-full flex items-center justify-between mb-1 px-1 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">Fatia Ativa:</span>
                  {activeItem ? (
                    <span className="font-bold flex items-center gap-1.5" style={{ color: activeItem.color }}>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeItem.color }} />
                      {activeItem.name}: {metricMode === 'count' ? `${activeItem.count} relatórios (${activeItem.countPercentage}%)` : formatCurrency(activeItem.earned, 'USD')}
                    </span>
                  ) : (
                    <span className="text-zinc-400">
                      {metricMode === 'count' ? `${totalReports} relatórios (todos)` : formatCurrency(totalBounty, 'USD')}
                    </span>
                  )}
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/80 border border-[#2e2e2e] text-zinc-400">
                  {chartStyle === 'pie' ? 'Pizza Sólida' : 'Donut'}
                </span>
              </div>

              {/* Pie Chart Canvas */}
              <div id="severity-pie-chart" className="w-full h-64 sm:h-72 relative flex items-center justify-center">
                
                {/* Decorative background dashed ring */}
                <div className="absolute w-52 h-52 rounded-full border border-dashed border-zinc-800/60 pointer-events-none" />

                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={showLabels ? renderCustomizedLabel : undefined}
                      outerRadius={105}
                      innerRadius={chartStyle === 'donut' ? 62 : 0}
                      paddingAngle={chartStyle === 'donut' ? 3 : 2}
                      stroke="#0a0a0a"
                      strokeWidth={2.5}
                      isAnimationActive={true}
                      animationDuration={700}
                      onMouseEnter={(_, index) => {
                        const item = pieData[index];
                        if (item) setHoveredSeverity(item.severity);
                      }}
                      onMouseLeave={() => setHoveredSeverity(null)}
                      onClick={(entry: any) => {
                        const sev = entry?.severity || entry?.payload?.severity;
                        if (sev && onSeverityClick) onSeverityClick(sev);
                      }}
                      className="cursor-pointer outline-none"
                    >
                      {pieData.map((entry) => {
                        const isSelected = hoveredSeverity === entry.severity;
                        const hasHover = hoveredSeverity !== null;
                        return (
                          <Cell
                            key={`pie-cell-${entry.severity}`}
                            id={`pie-slice-${entry.severity.toLowerCase()}`}
                            fill={entry.color}
                            opacity={hasHover ? (isSelected ? 1 : 0.35) : 0.95}
                            style={{
                              filter: isSelected ? `drop-shadow(0 0 12px ${entry.color}99)` : 'none',
                              transition: 'opacity 0.2s ease, filter 0.2s ease'
                            }}
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Donut Center Readout (only when Donut mode is active) */}
                {chartStyle === 'donut' && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4"
                    aria-live="polite"
                  >
                    {activeItem ? (
                      <div className="animate-in fade-in zoom-in-95 duration-150 flex flex-col items-center">
                        <span
                          className="text-[11px] font-bold uppercase tracking-widest font-mono"
                          style={{ color: activeItem.color }}
                        >
                          {activeItem.name}
                        </span>
                        <span className="text-2xl sm:text-3xl font-light font-mono text-white mt-0.5">
                          {metricMode === 'count' ? activeItem.count : formatCurrency(activeItem.earned, 'USD')}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400 mt-0.5">
                          {metricMode === 'count'
                            ? `${activeItem.countPercentage}% do total`
                            : `${activeItem.bountyPercentage}% dos bounties`}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">
                          {metricMode === 'count' ? 'TOTAL ACHADOS' : 'TOTAL RECOMPENSAS'}
                        </span>
                        <span className="text-2xl sm:text-3xl font-light font-mono text-white tracking-tight mt-0.5">
                          {metricMode === 'count' ? totalReports : formatCurrency(totalBounty, 'USD')}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400/90 mt-0.5 flex items-center gap-1">
                          <span>Passe o mouse</span>
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Interactive Legend Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                {severityStats.map((item) => {
                  const isHovered = hoveredSeverity === item.severity;
                  return (
                    <button
                      key={`legend-${item.severity}`}
                      id={`legend-pill-${item.severity.toLowerCase()}`}
                      type="button"
                      onMouseEnter={() => setHoveredSeverity(item.severity)}
                      onMouseLeave={() => setHoveredSeverity(null)}
                      onClick={() => onSeverityClick && onSeverityClick(item.severity)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono transition-all border select-none cursor-pointer ${
                        isHovered
                          ? 'bg-[#222] text-white border-zinc-400 shadow-sm scale-105'
                          : 'bg-[#121212] text-zinc-400 border-[#262626] hover:text-zinc-200'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-semibold">{item.name}:</span>
                      <span className="text-zinc-200 font-bold">{item.count}</span>
                      <span className="text-zinc-500 text-[10px]">({item.countPercentage}%)</span>
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-zinc-500 font-mono text-center flex items-center gap-1.5 mt-2">
                <HelpCircle className="w-3 h-3 text-zinc-600" />
                <span>Clique em uma fatia ou legenda para filtrar relatórios por severidade</span>
              </p>
            </div>

            {/* Right Column: Severity Distribution Cards */}
            <div className="lg:col-span-6 flex flex-col gap-2.5">
              {severityStats.map((item) => {
                const isHovered = hoveredSeverity === item.severity;

                return (
                  <div
                    key={`card-${item.severity}`}
                    id={`severity-pie-card-${item.severity.toLowerCase()}`}
                    onMouseEnter={() => setHoveredSeverity(item.severity)}
                    onMouseLeave={() => setHoveredSeverity(null)}
                    onClick={() => onSeverityClick && onSeverityClick(item.severity)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none group ${
                      isHovered
                        ? 'bg-[#161616] border-zinc-500 shadow-lg translate-x-1'
                        : 'bg-[#111111] border-[#242424] hover:border-[#383838]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      {/* Left: Severity Name + CVSS Range Badge */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 transition-transform group-hover:scale-125"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                          {item.name}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800/80 border border-[#2a2a2a] text-zinc-400">
                          CVSS {item.cvssRange}
                        </span>
                      </div>

                      {/* Right: Count and Bounty Value */}
                      <div className="flex items-center gap-3 shrink-0 font-mono">
                        <div className="text-right">
                          <span className="text-xs font-bold text-white">
                            {item.count} {item.count === 1 ? 'relatório' : 'relatórios'}
                          </span>
                          <span className="text-[11px] text-zinc-500 ml-1.5">
                            ({item.countPercentage}%)
                          </span>
                        </div>
                        <div className="text-right pl-2 border-l border-[#262626] min-w-[70px]">
                          <span className="text-xs font-bold text-emerald-400">
                            {item.earned > 0 ? formatCurrency(item.earned, 'USD') : '$0'}
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>

                    {/* Proportional Progress Bar */}
                    <div className="w-full bg-[#1c1c1c] h-1.5 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.countPercentage}%`,
                          backgroundColor: item.color
                        }}
                      />
                    </div>

                    {/* Subtitle / Description */}
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                      <span className="truncate">{item.description}</span>
                      <span className="shrink-0 text-zinc-400 ml-2">
                        CVSS médio: <strong className="text-zinc-200">{item.avgCvss}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}
      </div>

      {/* Footer bar */}
      <div className="px-4 sm:px-6 py-3 border-t border-[#1e1e1e] bg-[#0c0c0c] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-500 font-mono">
        <span>
          Distribuição baseada na classificação padrão FIRST CVSS v3.1
        </span>
        {onSeverityClick && (
          <button
            type="button"
            id="btn-filter-critical-from-pie"
            onClick={() => onSeverityClick('CRITICAL')}
            className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold transition-colors cursor-pointer"
          >
            <span>Ver relatórios críticos ({severityStats.find(s => s.severity === 'CRITICAL')?.count || 0})</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
