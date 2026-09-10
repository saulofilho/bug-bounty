import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  ShieldAlert, 
  DollarSign, 
  Layers, 
  ArrowRight, 
  HelpCircle,
  ExternalLink,
  Plus,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import { VulnerabilityReport, Severity } from '../types';
import { formatCurrency } from '../utils/formatters';

interface SeverityBreakdownChartProps {
  reports: VulnerabilityReport[];
  onSeverityClick?: (severity: Severity) => void;
  onNewReport?: () => void;
}

interface SeverityConfigItem {
  label: string;
  color: string;
  lightColor: string;
  bgColor: string;
  borderColor: string;
  cvssRange: string;
  description: string;
}

const SEVERITY_CONFIG: Record<Severity, SeverityConfigItem> = {
  CRITICAL: {
    label: 'Critical',
    color: '#ef4444',
    lightColor: '#f87171',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    cvssRange: '9.0 - 10.0',
    description: 'Impacto total ao sistema, RCE ou Bypass de autenticação'
  },
  HIGH: {
    label: 'High',
    color: '#f97316',
    lightColor: '#fb923c',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    cvssRange: '7.0 - 8.9',
    description: 'Elevação de privilégio, IDOR com PII ou CSRF crítico'
  },
  MEDIUM: {
    label: 'Medium',
    color: '#eab308',
    lightColor: '#facc15',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    cvssRange: '4.0 - 6.9',
    description: 'Manipulação de estado, XSS refletido ou rate limit'
  },
  LOW: {
    label: 'Low',
    color: '#3b82f6',
    lightColor: '#60a5fa',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    cvssRange: '0.1 - 3.9',
    description: 'Vazamento de versão, CORS aberto sem credenciais'
  },
  INFO: {
    label: 'Info',
    color: '#71717a',
    lightColor: '#a1a1aa',
    bgColor: 'bg-zinc-500/10',
    borderColor: 'border-zinc-500/30',
    cvssRange: '0.0',
    description: 'Hardening sugerido ou boas práticas informativas'
  }
};

const ORDERED_SEVERITIES: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export const SeverityBreakdownChart: React.FC<SeverityBreakdownChartProps> = ({
  reports,
  onSeverityClick,
  onNewReport
}) => {
  const [chartType, setChartType] = useState<'bar' | 'donut'>('bar');
  const [metricMode, setMetricMode] = useState<'count' | 'bounty'>('count');
  const [hoveredSeverity, setHoveredSeverity] = useState<Severity | null>(null);

  const totalReports = reports.length;
  const totalBounty = useMemo(() => {
    return reports.reduce((acc, r) => acc + (r.bountyAmount || 0), 0);
  }, [reports]);

  // Include INFO only if there are actually reports with INFO
  const activeSeverities = useMemo(() => {
    const hasInfo = reports.some(r => r.severity === 'INFO');
    return hasInfo ? [...ORDERED_SEVERITIES, 'INFO' as Severity] : ORDERED_SEVERITIES;
  }, [reports]);

  // Aggregate stats per severity
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
        avgCvss,
        cvssRange: config.cvssRange,
        color: config.color,
        lightColor: config.lightColor,
        bgColor: config.bgColor,
        borderColor: config.borderColor,
        description: config.description,
        value: metricMode === 'count' ? count : earned
      };
    });
  }, [reports, totalReports, totalBounty, activeSeverities, metricMode]);

  // Slices for the Recharts Donut (only positive values to avoid rendering empty segments)
  const donutData = useMemo(() => {
    return severityStats.filter(d => d.value > 0);
  }, [severityStats]);

  // Active item info for center readout in Donut
  const activeItem = useMemo(() => {
    if (hoveredSeverity) {
      return severityStats.find(s => s.severity === hoveredSeverity) || null;
    }
    return null;
  }, [hoveredSeverity, severityStats]);

  // Critical + High ratio
  const highCriticalCount = useMemo(() => {
    return reports.filter(r => r.severity === 'CRITICAL' || r.severity === 'HIGH').length;
  }, [reports]);

  const highCriticalPercent = totalReports > 0 ? Math.round((highCriticalCount / totalReports) * 100) : 0;

  // Average fleet CVSS
  const fleetAvgCvss = useMemo(() => {
    if (totalReports === 0) return '0.0';
    const sum = reports.reduce((acc, r) => acc + (r.cvssScore || 0), 0);
    return (sum / totalReports).toFixed(1);
  }, [reports, totalReports]);

  // Custom Tooltip for the Recharts Donut
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#121212]/95 backdrop-blur-md border border-[#333] p-3.5 rounded-xl shadow-2xl text-xs space-y-1.5 font-mono min-w-[200px] z-50">
          <div className="flex items-center justify-between pb-1 border-b border-[#262626]">
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

          <div className="flex items-center justify-between text-zinc-300 pt-1">
            <span className="text-zinc-400">Total de Achados:</span>
            <span className="font-bold text-white font-mono">
              {data.count} ({data.countPercentage}%)
            </span>
          </div>

          <div className="flex items-center justify-between text-zinc-300">
            <span className="text-zinc-400">Bounties Pagos:</span>
            <span className="font-bold text-emerald-400 font-mono">
              {formatCurrency(data.earned, 'USD')}
            </span>
          </div>

          <div className="flex items-center justify-between text-zinc-300">
            <span className="text-zinc-400">CVSS Médio:</span>
            <span className="font-bold text-amber-300 font-mono">{data.avgCvss}</span>
          </div>

          <p className="text-[10px] text-zinc-500 pt-1 italic leading-tight">
            {data.description}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl flex flex-col overflow-hidden shadow-2xl">
      
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-[#262626] bg-[#111] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0 shadow-inner">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold uppercase text-zinc-100 tracking-wider">
                Vulnerability Severity Distribution
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 border border-[#2e2e2e] text-zinc-300 font-mono">
                CVSS v3.1
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Distribuição dos relatórios por faixas de risco (Critical, High, Medium, Low)
            </p>
          </div>
        </div>

        {/* Action Controls: Chart Type Toggle & Metric Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Type: Bar Chart (default) vs Donut */}
          <div className="flex items-center bg-[#181818] p-0.5 rounded-lg border border-[#2a2a2a]">
            <button
              type="button"
              id="btn-severity-chart-bar"
              onClick={() => setChartType('bar')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all ${
                chartType === 'bar'
                  ? 'bg-[#262626] text-emerald-400 border border-emerald-500/30 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Visualizar Gráfico de Barras Recharts"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Barras</span>
            </button>
            <button
              type="button"
              id="btn-severity-chart-donut"
              onClick={() => setChartType('donut')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all ${
                chartType === 'donut'
                  ? 'bg-[#262626] text-emerald-400 border border-emerald-500/30 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Visualizar Gráfico Donut Recharts"
            >
              <PieChartIcon className="w-3.5 h-3.5" />
              <span>Donut</span>
            </button>
          </div>

          {/* Metric Mode Toggle */}
          <div className="flex items-center bg-[#181818] p-0.5 rounded-lg border border-[#2a2a2a]">
            <button
              type="button"
              id="btn-severity-donut-count"
              onClick={() => setMetricMode('count')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-all ${
                metricMode === 'count'
                  ? 'bg-[#262626] text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Relatórios ({totalReports})</span>
            </button>
            <button
              type="button"
              id="btn-severity-donut-bounty"
              onClick={() => setMetricMode('bounty')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-all ${
                metricMode === 'bounty'
                  ? 'bg-[#262626] text-emerald-400 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <DollarSign className="w-3 h-3" />
              <span>Bounties ({formatCurrency(totalBounty, 'USD')})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Macro Indicators Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#222] border-b border-[#222] bg-[#0d0d0d] text-xs font-mono">
        <div className="p-3 px-4 flex items-center justify-between">
          <span className="text-zinc-500">Total Analisado</span>
          <span className="text-white font-bold">{totalReports} relatórios</span>
        </div>
        <div className="p-3 px-4 flex items-center justify-between">
          <span className="text-zinc-500">Crítico + Alto</span>
          <span className="text-red-400 font-bold">
            {highCriticalCount} ({highCriticalPercent}%)
          </span>
        </div>
        <div className="p-3 px-4 flex items-center justify-between">
          <span className="text-zinc-500">CVSS Médio Geral</span>
          <span className="text-amber-400 font-bold">{fleetAvgCvss} / 10.0</span>
        </div>
        <div className="p-3 px-4 flex items-center justify-between">
          <span className="text-zinc-500">Total Bounties</span>
          <span className="text-emerald-400 font-bold">{formatCurrency(totalBounty, 'USD')}</span>
        </div>
      </div>

      {/* Main Body: Side-by-side Donut Chart and Interactive Severity Cards */}
      <div className="p-4 sm:p-6">
        {totalReports === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h5 className="text-sm font-semibold text-zinc-300">Nenhum relatório encontrado</h5>
              <p className="text-xs text-zinc-500">
                Cadastre seus primeiros achados para visualizar o gráfico de distribuição por severidade (Critical, High, Medium, Low).
              </p>
            </div>
            {onNewReport && (
              <button
                type="button"
                onClick={onNewReport}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Relatório</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* Left Column: Recharts Bar Chart or Donut Chart */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center relative min-h-[300px]">
              
              {chartType === 'bar' ? (
                <div className="w-full flex flex-col items-center">
                  {/* Active Readout bar above Bar Chart */}
                  <div className="w-full flex items-center justify-between mb-2 px-1 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500">Distribuição:</span>
                      {activeItem ? (
                        <span className="font-bold flex items-center gap-1.5" style={{ color: activeItem.color }}>
                          <span className="w-2 h-2 rounded-full ring-1 ring-white/20" style={{ backgroundColor: activeItem.color }} />
                          {activeItem.name}: {metricMode === 'count' ? `${activeItem.count} relatórios (${activeItem.countPercentage}%)` : formatCurrency(activeItem.earned, 'USD')}
                        </span>
                      ) : (
                        <span className="text-zinc-300">
                          {metricMode === 'count' 
                            ? `${totalReports} relatórios (todos os níveis)` 
                            : formatCurrency(totalBounty, 'USD')}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/80 border border-[#2e2e2e] text-zinc-400">
                      {metricMode === 'count' ? 'Contagem' : 'Valor Pago'}
                    </span>
                  </div>

                  {/* Recharts Bar Chart Container */}
                  <div className="w-full h-64 sm:h-72 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={severityStats}
                        margin={{ top: 18, right: 16, left: -18, bottom: 6 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#202020" vertical={false} />
                        <XAxis
                          dataKey="name"
                          stroke="#52525b"
                          tick={{ fill: '#e4e4e7', fontSize: 11, fontFamily: 'monospace' }}
                          tickLine={{ stroke: '#27272a' }}
                          axisLine={{ stroke: '#27272a' }}
                        />
                        <YAxis
                          stroke="#52525b"
                          tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                          tickLine={{ stroke: '#27272a' }}
                          axisLine={{ stroke: '#27272a' }}
                          allowDecimals={false}
                          tickFormatter={(val) => metricMode === 'count' ? `${val}` : `$${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} />
                        <Bar
                          dataKey="value"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={52}
                          isAnimationActive={true}
                          animationDuration={600}
                          onClick={(entry: any) => {
                            const sev = entry?.severity || entry?.payload?.severity;
                            if (sev && onSeverityClick) onSeverityClick(sev);
                          }}
                          className="cursor-pointer outline-none"
                        >
                          {severityStats.map((entry) => {
                            const isSelected = hoveredSeverity === entry.severity;
                            const hasHover = hoveredSeverity !== null;
                            return (
                              <Cell
                                key={entry.severity}
                                fill={entry.color}
                                opacity={hasHover ? (isSelected ? 1 : 0.35) : 0.9}
                                style={{
                                  filter: isSelected ? `drop-shadow(0 0 12px ${entry.color}99)` : 'none',
                                  transition: 'opacity 0.2s ease, filter 0.2s ease'
                                }}
                                onMouseEnter={() => setHoveredSeverity(entry.severity)}
                                onMouseLeave={() => setHoveredSeverity(null)}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Helper text under Bar Chart */}
                  <p className="text-[11px] text-zinc-500 font-mono text-center flex items-center gap-1.5 mt-1">
                    <HelpCircle className="w-3 h-3 text-zinc-600" />
                    <span>Clique em uma barra para filtrar relatórios por severidade</span>
                  </p>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center">
                  {/* Chart Container */}
                  <div className="w-full h-64 sm:h-72 relative flex items-center justify-center">
                    
                    {/* Decorative background pulse ring */}
                    <div className="absolute w-44 h-44 rounded-full border border-dashed border-zinc-800/80 pointer-events-none" />

                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={68}
                          outerRadius={102}
                          paddingAngle={3}
                          cornerRadius={4}
                          stroke="#0a0a0a"
                          strokeWidth={3}
                          isAnimationActive={true}
                          animationDuration={700}
                          onMouseEnter={(_, index) => {
                            const item = donutData[index];
                            if (item) setHoveredSeverity(item.severity);
                          }}
                          onMouseLeave={() => setHoveredSeverity(null)}
                          onClick={(entry: any) => {
                            const sev = entry?.severity || entry?.payload?.severity;
                            if (sev && onSeverityClick) onSeverityClick(sev);
                          }}
                          className="cursor-pointer outline-none"
                        >
                          {donutData.map((entry) => {
                            const isSelected = hoveredSeverity === entry.severity;
                            const hasHover = hoveredSeverity !== null;
                            return (
                              <Cell
                                key={entry.severity}
                                fill={entry.color}
                                opacity={hasHover ? (isSelected ? 1 : 0.35) : 0.95}
                                style={{
                                  filter: isSelected ? `drop-shadow(0 0 10px ${entry.color}88)` : 'none',
                                  transition: 'opacity 0.2s ease, filter 0.2s ease'
                                }}
                              />
                            );
                          })}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Donut Center Readout */}
                    <div 
                      className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4"
                      aria-live="polite"
                    >
                      {activeItem ? (
                        <div className="animate-in fade-in zoom-in-95 duration-150 flex flex-col items-center">
                          <span 
                            className="text-xs font-bold uppercase tracking-widest font-mono"
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

                  </div>

                  {/* Helper text under Donut */}
                  <p className="text-[11px] text-zinc-500 font-mono text-center flex items-center gap-1.5 mt-1">
                    <HelpCircle className="w-3 h-3 text-zinc-600" />
                    <span>Clique em uma fatia para filtrar na aba Relatórios</span>
                  </p>
                </div>
              )}
            </div>

            {/* Right Column: Severity Cards (Critical / High / Medium / Low) */}
            <div className="lg:col-span-6 flex flex-col gap-2.5">
              {severityStats.map((item) => {
                const isHovered = hoveredSeverity === item.severity;
                const isZero = item.count === 0;

                return (
                  <div
                    key={item.severity}
                    id={`severity-card-${item.severity.toLowerCase()}`}
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
                            {item.count} {item.count === 1 ? 'achado' : 'achados'}
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
            id="btn-view-all-reports-from-donut"
            onClick={() => onSeverityClick('CRITICAL')}
            className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
          >
            <span>Ver relatórios críticos</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

    </div>
  );
};
