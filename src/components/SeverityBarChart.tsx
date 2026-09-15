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
  LabelList
} from 'recharts';
import {
  BarChart3,
  ShieldAlert,
  DollarSign,
  Layers,
  ArrowRight,
  Filter,
  ArrowUpDown,
  HelpCircle,
  Plus,
  AlertTriangle,
  Info,
  TrendingUp
} from 'lucide-react';
import { VulnerabilityReport, Severity } from '../types';
import { formatCurrency } from '../utils/formatters';

export interface SeverityBarChartProps {
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
  examples: string;
}

const SEVERITY_CONFIG: Record<Severity, SeverityConfigItem> = {
  LOW: {
    label: 'Low',
    color: '#3b82f6', // Tailwind blue-500
    lightColor: '#60a5fa',
    bgBadge: 'bg-blue-500/10',
    borderBadge: 'border-blue-500/30',
    textBadge: 'text-blue-400',
    cvssRange: '0.1 - 3.9',
    description: 'Impacto limitado na confidencialidade ou integridade.',
    examples: 'Divulgação de versão, banners de software, CORS sem cookies de autenticação'
  },
  MEDIUM: {
    label: 'Medium',
    color: '#eab308', // Tailwind yellow-500
    lightColor: '#facc15',
    bgBadge: 'bg-yellow-500/10',
    borderBadge: 'border-yellow-500/30',
    textBadge: 'text-yellow-400',
    cvssRange: '4.0 - 6.9',
    description: 'Acesso parcial ou manipulação com pré-requisitos.',
    examples: 'XSS Refletido/Armazenado, CSRF comum, enumeração de usuários, bypass de rate-limit'
  },
  HIGH: {
    label: 'High',
    color: '#f97316', // Tailwind orange-500
    lightColor: '#fb923c',
    bgBadge: 'bg-orange-500/10',
    borderBadge: 'border-orange-500/30',
    textBadge: 'text-orange-400',
    cvssRange: '7.0 - 8.9',
    description: 'Comprometimento significativo de dados sensíveis ou escalonamento.',
    examples: 'IDOR com dados PII, SSRF interno, bypass de 2FA, injeção SQL sem privilégios DBA'
  },
  CRITICAL: {
    label: 'Critical',
    color: '#ef4444', // Tailwind red-500
    lightColor: '#f87171',
    bgBadge: 'bg-red-500/10',
    borderBadge: 'border-red-500/30',
    textBadge: 'text-red-400',
    cvssRange: '9.0 - 10.0',
    description: 'Execução remota de código, bypass total de autenticação ou vazamento de banco.',
    examples: 'Remote Code Execution (RCE), SQLi massivo, deserialização insegura, Auth Bypass administrativo'
  },
  INFO: {
    label: 'Info',
    color: '#71717a', // Tailwind zinc-500
    lightColor: '#a1a1aa',
    bgBadge: 'bg-zinc-500/10',
    borderBadge: 'border-zinc-500/30',
    textBadge: 'text-zinc-400',
    cvssRange: '0.0',
    description: 'Apontamentos informativos e recomendações de hardening.',
    examples: 'Header de segurança ausente, cookie sem SameSite, boas práticas recomendadas'
  }
};

export const SeverityBarChart: React.FC<SeverityBarChartProps> = ({
  reports,
  onSeverityClick,
  onNewReport
}) => {
  // Default ordered by severity: Low, Medium, High, Critical
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // asc = Low -> Critical, desc = Critical -> Low
  const [metricMode, setMetricMode] = useState<'count' | 'bounty'>('count');
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  const [hoveredSeverity, setHoveredSeverity] = useState<Severity | null>(null);

  const totalReports = reports.length;
  const totalBounties = useMemo(() => {
    return reports.reduce((acc, r) => acc + (r.bountyAmount || 0), 0);
  }, [reports]);

  // The 4 primary requested severity levels: Low, Medium, High, Critical
  const baseOrder: Severity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  // Check if any reports have INFO severity
  const hasInfoReports = useMemo(() => {
    return reports.some(r => r.severity === 'INFO');
  }, [reports]);

  const activeSeverities = useMemo(() => {
    const list = hasInfoReports ? ['INFO' as Severity, ...baseOrder] : baseOrder;
    return sortOrder === 'asc' ? list : [...list].reverse();
  }, [hasInfoReports, sortOrder]);

  // Aggregate stats per severity for Recharts BarChart
  const chartData = useMemo(() => {
    return activeSeverities.map(sev => {
      const matching = reports.filter(r => r.severity === sev);
      const count = matching.length;
      const bounty = matching.reduce((acc, r) => acc + (r.bountyAmount || 0), 0);
      const countPercentage = totalReports > 0 ? (count / totalReports) * 100 : 0;
      const bountyPercentage = totalBounties > 0 ? (bounty / totalBounties) * 100 : 0;

      const avgCvss = count > 0
        ? (matching.reduce((acc, r) => acc + (r.cvssScore || 0), 0) / count).toFixed(1)
        : '0.0';

      const config = SEVERITY_CONFIG[sev];

      return {
        severity: sev,
        name: config.label,
        count,
        bounty,
        countPercentage: Math.round(countPercentage),
        exactCountPercentage: countPercentage,
        bountyPercentage: Math.round(bountyPercentage),
        avgCvss,
        cvssRange: config.cvssRange,
        color: config.color,
        lightColor: config.lightColor,
        bgBadge: config.bgBadge,
        borderBadge: config.borderBadge,
        textBadge: config.textBadge,
        description: config.description,
        examples: config.examples,
        // The numeric value plotted by Recharts Bar
        value: metricMode === 'count' ? count : bounty,
        displayLabel: metricMode === 'count' ? `${count}` : formatCurrency(bounty, 'USD')
      };
    });
  }, [reports, totalReports, totalBounties, activeSeverities, metricMode]);

  // Severity metrics summary
  const criticalCount = reports.filter(r => r.severity === 'CRITICAL').length;
  const highCount = reports.filter(r => r.severity === 'HIGH').length;
  const mediumCount = reports.filter(r => r.severity === 'MEDIUM').length;
  const lowCount = reports.filter(r => r.severity === 'LOW').length;

  const highCriticalTotal = criticalCount + highCount;
  const highCriticalPercent = totalReports > 0 ? Math.round((highCriticalTotal / totalReports) * 100) : 0;

  // Maximum value plotted (for scale headroom)
  const maxPlottedValue = useMemo(() => {
    const max = Math.max(...chartData.map(d => d.value), 1);
    return max;
  }, [chartData]);

  // Custom Tooltip for Recharts BarChart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#101014]/95 backdrop-blur-md border border-[#2b2b35] p-3.5 rounded-xl shadow-2xl text-xs space-y-2 font-mono min-w-[240px] z-50">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#262630]">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full ring-2 ring-white/10"
                style={{ backgroundColor: data.color }}
              />
              <span className="font-bold text-white uppercase text-sm">{data.name}</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${data.bgBadge} ${data.borderBadge} ${data.textBadge}`}>
              CVSS {data.cvssRange}
            </span>
          </div>

          <div className="space-y-1 text-zinc-300 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Total de Relatórios:</span>
              <span className="font-bold text-white font-mono">
                {data.count} ({data.countPercentage}% do total)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Bounties Pagos:</span>
              <span className="font-bold text-emerald-400 font-mono">
                {formatCurrency(data.bounty, 'USD')} ({data.bountyPercentage}%)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Score CVSS Médio:</span>
              <span className="font-bold text-amber-400 font-mono">{data.avgCvss} / 10.0</span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#262630] space-y-1">
            <p className="text-[11px] text-zinc-400 italic leading-snug">
              {data.description}
            </p>
            <p className="text-[10px] text-zinc-500 leading-tight">
              <strong className="text-zinc-400 not-italic">Exemplos: </strong>{data.examples}
            </p>
          </div>

          <div className="pt-1 text-[10px] text-emerald-400/80 font-sans flex items-center justify-end gap-1">
            <span>Clique para filtrar na lista</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl flex flex-col overflow-hidden shadow-2xl">
      {/* Card Header with Title, Badges and Controls */}
      <div className="p-4 sm:p-5 border-b border-[#262626] bg-[#111113] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-bold uppercase text-zinc-100 tracking-wider">
                Distribuição de Relatórios por Gravidade
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800/80 border border-[#2e2e2e] text-zinc-300 font-mono">
                Recharts Bar Chart
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
                Low • Medium • High • Critical
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Análise quantitativa de vulnerabilidades classificadas segundo o padrão CVSS v3.1
            </p>
          </div>
        </div>

        {/* Action Controls: Metric toggle, Sort order, Orientation */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Mode: Report Count vs Bounty Amount */}
          <div className="flex items-center bg-[#17171a] p-0.5 rounded-lg border border-[#2c2c36]">
            <button
              type="button"
              id="btn-sev-bar-metric-count"
              onClick={() => setMetricMode('count')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all ${
                metricMode === 'count'
                  ? 'bg-[#282832] text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Exibir quantidade de relatórios em cada severidade"
            >
              <Layers className="w-3 h-3" />
              <span>Contagem ({totalReports})</span>
            </button>
            <button
              type="button"
              id="btn-sev-bar-metric-bounty"
              onClick={() => setMetricMode('bounty')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all ${
                metricMode === 'bounty'
                  ? 'bg-[#282832] text-emerald-400 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Exibir montante total de bounties ($) por severidade"
            >
              <DollarSign className="w-3 h-3" />
              <span>Bounties ({formatCurrency(totalBounties, 'USD')})</span>
            </button>
          </div>

          {/* Sort Order Toggle */}
          <button
            type="button"
            id="btn-sev-bar-sort-order"
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#17171a] hover:bg-[#202026] text-zinc-300 hover:text-white border border-[#2c2c36] text-xs font-mono transition-all"
            title={sortOrder === 'asc' ? 'Ordenação: Low → Critical (clique para inverter)' : 'Ordenação: Critical → Low (clique para inverter)'}
          >
            <ArrowUpDown className="w-3 h-3 text-zinc-400" />
            <span>{sortOrder === 'asc' ? 'Low → Critical' : 'Critical → Low'}</span>
          </button>

          {/* Orientation Toggle: Vertical vs Horizontal */}
          <div className="flex items-center bg-[#17171a] p-0.5 rounded-lg border border-[#2c2c36]">
            <button
              type="button"
              id="btn-sev-bar-orient-vertical"
              onClick={() => setOrientation('vertical')}
              className={`px-2 py-1 rounded text-xs font-mono transition-all ${
                orientation === 'vertical'
                  ? 'bg-[#282832] text-emerald-400 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Visualização em Colunas Verticais"
            >
              Colunas
            </button>
            <button
              type="button"
              id="btn-sev-bar-orient-horizontal"
              onClick={() => setOrientation('horizontal')}
              className={`px-2 py-1 rounded text-xs font-mono transition-all ${
                orientation === 'horizontal'
                  ? 'bg-[#282832] text-emerald-400 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Visualização em Barras Horizontais"
            >
              Barras
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Highlights Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#222] border-b border-[#222] bg-[#0d0d10] text-xs font-mono">
        <div className="p-3 px-4 flex items-center justify-between">
          <span className="text-zinc-500">Total Analisado</span>
          <span className="text-white font-bold">{totalReports} relatórios</span>
        </div>
        <div className="p-3 px-4 flex items-center justify-between">
          <span className="text-zinc-500">Alto & Crítico</span>
          <span className="text-red-400 font-bold">
            {highCriticalTotal} ({highCriticalPercent}%)
          </span>
        </div>
        <div className="p-3 px-4 flex items-center justify-between">
          <span className="text-zinc-500">Médio & Baixo</span>
          <span className="text-yellow-400 font-bold">
            {mediumCount + lowCount} ({totalReports > 0 ? Math.round(((mediumCount + lowCount) / totalReports) * 100) : 0}%)
          </span>
        </div>
        <div className="p-3 px-4 flex items-center justify-between">
          <span className="text-zinc-500">Volume Pago</span>
          <span className="text-emerald-400 font-bold">{formatCurrency(totalBounties, 'USD')}</span>
        </div>
      </div>

      {/* Main Chart Canvas Area */}
      <div className="p-4 sm:p-6">
        {totalReports === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h5 className="text-sm font-semibold text-zinc-300">Nenhum relatório cadastrado</h5>
              <p className="text-xs text-zinc-500">
                Cadastre suas primeiras vulnerabilidades para visualizar o gráfico de barras por severidade (Low, Medium, High, Critical).
              </p>
            </div>
            {onNewReport && (
              <button
                type="button"
                onClick={onNewReport}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Submissão +</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Top Interactive Indicator */}
            <div className="flex items-center justify-between text-xs font-mono px-1">
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">Foco Ativo:</span>
                {hoveredSeverity ? (
                  (() => {
                    const active = chartData.find(d => d.severity === hoveredSeverity);
                    if (!active) return null;
                    return (
                      <span className="font-bold flex items-center gap-1.5" style={{ color: active.color }}>
                        <span className="w-2.5 h-2.5 rounded-full ring-1 ring-white/20" style={{ backgroundColor: active.color }} />
                        {active.name} ({active.cvssRange}): {metricMode === 'count' ? `${active.count} relatórios (${active.countPercentage}%)` : formatCurrency(active.bounty, 'USD')}
                      </span>
                    );
                  })()
                ) : (
                  <span className="text-zinc-400">
                    Passe o cursor sobre uma barra ou clique para filtrar relatórios
                  </span>
                )}
              </div>
              <div className="text-[11px] text-zinc-500 hidden sm:flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                <span>Escala CVSS v3.1 oficial FIRST</span>
              </div>
            </div>

            {/* Recharts Bar Chart Container */}
            <div className={`w-full ${orientation === 'vertical' ? 'h-72 sm:h-80' : 'h-72 sm:h-80'} relative`}>
              <ResponsiveContainer width="100%" height="100%">
                {orientation === 'vertical' ? (
                  <BarChart
                    data={chartData}
                    margin={{ top: 25, right: 20, left: -10, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f25" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#52525b"
                      tick={{ fill: '#e4e4e7', fontSize: 12, fontFamily: 'monospace', fontWeight: 600 }}
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
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }} />
                    <Bar
                      dataKey="value"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={64}
                      isAnimationActive={true}
                      animationDuration={650}
                      onClick={(entry: any) => {
                        const sev = entry?.severity || entry?.payload?.severity;
                        if (sev && onSeverityClick) onSeverityClick(sev);
                      }}
                      className="cursor-pointer outline-none"
                    >
                      {/* Top direct value labels above each bar */}
                      <LabelList
                        dataKey="displayLabel"
                        position="top"
                        fill="#a1a1aa"
                        fontSize={11}
                        fontFamily="monospace"
                        fontWeight={600}
                        offset={8}
                      />
                      {chartData.map((entry) => {
                        const isHovered = hoveredSeverity === entry.severity;
                        const hasHover = hoveredSeverity !== null;
                        return (
                          <Cell
                            key={`vertical-bar-${entry.severity}`}
                            fill={entry.color}
                            opacity={hasHover ? (isHovered ? 1 : 0.35) : 0.9}
                            style={{
                              filter: isHovered ? `drop-shadow(0 0 14px ${entry.color}aa)` : 'none',
                              transition: 'opacity 0.2s ease, filter 0.2s ease'
                            }}
                            onMouseEnter={() => setHoveredSeverity(entry.severity)}
                            onMouseLeave={() => setHoveredSeverity(null)}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                ) : (
                  <BarChart
                    layout="vertical"
                    data={chartData}
                    margin={{ top: 15, right: 40, left: 15, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f25" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="#52525b"
                      tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                      tickLine={{ stroke: '#27272a' }}
                      axisLine={{ stroke: '#27272a' }}
                      allowDecimals={false}
                      tickFormatter={(val) => metricMode === 'count' ? `${val}` : `$${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#52525b"
                      tick={{ fill: '#e4e4e7', fontSize: 12, fontFamily: 'monospace', fontWeight: 600 }}
                      tickLine={{ stroke: '#27272a' }}
                      axisLine={{ stroke: '#27272a' }}
                      width={80}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }} />
                    <Bar
                      dataKey="value"
                      radius={[0, 8, 8, 0]}
                      maxBarSize={32}
                      isAnimationActive={true}
                      animationDuration={650}
                      onClick={(entry: any) => {
                        const sev = entry?.severity || entry?.payload?.severity;
                        if (sev && onSeverityClick) onSeverityClick(sev);
                      }}
                      className="cursor-pointer outline-none"
                    >
                      <LabelList
                        dataKey="displayLabel"
                        position="right"
                        fill="#a1a1aa"
                        fontSize={11}
                        fontFamily="monospace"
                        fontWeight={600}
                        offset={10}
                      />
                      {chartData.map((entry) => {
                        const isHovered = hoveredSeverity === entry.severity;
                        const hasHover = hoveredSeverity !== null;
                        return (
                          <Cell
                            key={`horizontal-bar-${entry.severity}`}
                            fill={entry.color}
                            opacity={hasHover ? (isHovered ? 1 : 0.35) : 0.9}
                            style={{
                              filter: isHovered ? `drop-shadow(0 0 14px ${entry.color}aa)` : 'none',
                              transition: 'opacity 0.2s ease, filter 0.2s ease'
                            }}
                            onMouseEnter={() => setHoveredSeverity(entry.severity)}
                            onMouseLeave={() => setHoveredSeverity(null)}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Interactive Severity Cards Breakdown Below Bar Chart */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {chartData.map((item) => {
                const isHovered = hoveredSeverity === item.severity;
                return (
                  <div
                    key={item.severity}
                    id={`severity-card-${item.severity.toLowerCase()}`}
                    onClick={() => {
                      if (onSeverityClick) onSeverityClick(item.severity);
                    }}
                    onMouseEnter={() => setHoveredSeverity(item.severity)}
                    onMouseLeave={() => setHoveredSeverity(null)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                      isHovered
                        ? 'bg-[#18181f] border-zinc-500 shadow-lg scale-[1.02]'
                        : 'bg-[#111115] border-[#25252d] hover:border-zinc-600 hover:bg-[#15151a]'
                    }`}
                  >
                    {/* Top colored accent indicator bar */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{ backgroundColor: item.color }}
                    />

                    <div className="flex items-center justify-between mt-1 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-bold text-sm text-zinc-100 font-mono">
                          {item.name}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${item.bgBadge} ${item.borderBadge} ${item.textBadge}`}>
                        CVSS {item.cvssRange}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs font-mono">
                      <div className="flex items-baseline justify-between">
                        <span className="text-zinc-400">Achados:</span>
                        <span className="font-bold text-white text-sm">
                          {item.count}{' '}
                          <span className="text-[11px] font-normal text-zinc-500">
                            ({item.countPercentage}%)
                          </span>
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between">
                        <span className="text-zinc-400">Total Pago:</span>
                        <span className="font-bold text-emerald-400">
                          {formatCurrency(item.bounty, 'USD')}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between">
                        <span className="text-zinc-400">CVSS Médio:</span>
                        <span className="font-bold text-amber-400">{item.avgCvss}</span>
                      </div>
                    </div>

                    {/* Footer with action prompt */}
                    <div className="mt-3 pt-2 border-t border-[#25252d] flex items-center justify-between text-[10px] text-zinc-500 group-hover:text-zinc-300 transition-colors">
                      <span className="truncate pr-1">Ver relatórios</span>
                      <ArrowRight className="w-3 h-3 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Explanatory Context Footer */}
            <div className="p-3 bg-[#111115] border border-[#23232b] rounded-lg text-xs text-zinc-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Dica de Triagem:</strong> Relatórios <strong>Critical</strong> e <strong>High</strong> representam {highCriticalPercent}% dos seus achados e geram o maior retorno médio por hora investida.
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] shrink-0">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> Low (0.1-3.9)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" /> Medium (4.0-6.9)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-orange-500" /> High (7.0-8.9)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" /> Critical (9.0-10.0)
                </span>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
