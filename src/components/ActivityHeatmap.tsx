import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Flame, 
  Award, 
  TrendingUp, 
  Filter, 
  CheckCircle2, 
  ExternalLink, 
  Clock, 
  Sparkles,
  Info,
  ChevronRight,
  ShieldAlert,
  Plus,
  BarChart3,
  CalendarDays
} from 'lucide-react';
import { VulnerabilityReport, Severity } from '../types';
import { formatCurrency, getSeverityBadgeColor } from '../utils/formatters';

interface ActivityHeatmapProps {
  reports: VulnerabilityReport[];
  onSelectReport?: (report: VulnerabilityReport) => void;
  onNewReport?: () => void;
}

type TimeframeOption = 52 | 26 | 13;
type StatusFilter = 'ALL' | 'REWARDED' | 'TRIAGED' | 'DRAFT';

interface DayCellData {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 (Sun) - 6 (Sat)
  reports: VulnerabilityReport[];
  count: number;
  totalBounty: number;
  isToday: boolean;
  isFuture: boolean;
  intensityLevel: 0 | 1 | 2 | 3 | 4;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  reports,
  onSelectReport,
  onNewReport
}) => {
  const [totalWeeks, setTotalWeeks] = useState<TimeframeOption>(52);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectedDay, setSelectedDay] = useState<DayCellData | null>(null);
  const [hoveredDay, setHoveredDay] = useState<{ day: DayCellData; x: number; y: number } | null>(null);

  // Helper to extract clean YYYY-MM-DD submission date
  const getSubmissionDate = (report: VulnerabilityReport): string | null => {
    if (report.createdAt) {
      return report.createdAt.substring(0, 10);
    }
    const creationEvent = report.timeline?.find(t => t.type === 'creation');
    if (creationEvent?.date) {
      return creationEvent.date.substring(0, 10);
    }
    return null;
  };

  // Filter reports based on current selection
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (severityFilter !== 'ALL' && r.severity !== severityFilter) {
        return false;
      }
      if (statusFilter === 'REWARDED' && !(r.status === 'REWARDED' || (r.bountyAmount && r.bountyAmount > 0))) {
        return false;
      }
      if (statusFilter === 'TRIAGED' && r.status !== 'TRIAGED') {
        return false;
      }
      if (statusFilter === 'DRAFT' && r.status !== 'DRAFT') {
        return false;
      }
      return true;
    });
  }, [reports, severityFilter, statusFilter]);

  // Build calendar grid ending on the current week
  const { weeks, monthHeaders, kpis } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Align to Saturday of current week so columns represent Sunday-Saturday
    const currentDayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - currentDayOfWeek));
    endOfWeek.setHours(23, 59, 59, 999);

    // Calculate start date based on totalWeeks
    const startDate = new Date(endOfWeek);
    startDate.setDate(endOfWeek.getDate() - (totalWeeks * 7) + 1);
    startDate.setHours(0, 0, 0, 0);

    // Map reports by date string (YYYY-MM-DD)
    const reportsMap = new Map<string, VulnerabilityReport[]>();
    filteredReports.forEach(report => {
      const dateKey = getSubmissionDate(report);
      if (!dateKey) return;
      const list = reportsMap.get(dateKey) || [];
      list.push(report);
      reportsMap.set(dateKey, list);
    });

    // Populate the weeks grid (each week has 7 days: Sun to Sat)
    const weeksData: DayCellData[][] = [];
    let curDate = new Date(startDate);

    let activeDaysCount = 0;
    let totalSubmissionsInPeriod = 0;
    let totalBountyInPeriod = 0;
    let maxReportsInSingleDay = 0;
    let mostProductiveDateStr = '';
    const activeDateStrings = new Set<string>();

    for (let w = 0; w < totalWeeks; w++) {
      const currentWeek: DayCellData[] = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = curDate.toISOString().split('T')[0];
        const isFuture = curDate > today;
        const isToday = dateStr === todayStr;
        const dayReports = reportsMap.get(dateStr) || [];
        const count = isFuture ? 0 : dayReports.length;
        const bounty = isFuture ? 0 : dayReports.reduce((sum, r) => sum + (r.bountyAmount || 0), 0);

        // Assign visual intensity level (0 to 4)
        let intensityLevel: 0 | 1 | 2 | 3 | 4 = 0;
        if (count >= 4) intensityLevel = 4;
        else if (count === 3) intensityLevel = 3;
        else if (count === 2) intensityLevel = 2;
        else if (count === 1) intensityLevel = 1;

        if (count > 0 && !isFuture) {
          activeDaysCount++;
          totalSubmissionsInPeriod += count;
          totalBountyInPeriod += bounty;
          activeDateStrings.add(dateStr);
          if (count > maxReportsInSingleDay) {
            maxReportsInSingleDay = count;
            mostProductiveDateStr = dateStr;
          }
        }

        currentWeek.push({
          date: new Date(curDate),
          dateStr,
          dayOfWeek: d,
          reports: isFuture ? [] : dayReports,
          count,
          totalBounty: bounty,
          isToday,
          isFuture,
          intensityLevel
        });

        curDate.setDate(curDate.getDate() + 1);
      }
      weeksData.push(currentWeek);
    }

    // Month headers computation
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthHeadersList: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    weeksData.forEach((week, wIndex) => {
      const firstDay = week[0].date;
      const m = firstDay.getMonth();
      if (m !== lastMonth) {
        if (monthHeadersList.length === 0 || (wIndex - monthHeadersList[monthHeadersList.length - 1].weekIndex >= 3)) {
          monthHeadersList.push({
            label: monthNames[m],
            weekIndex: wIndex
          });
          lastMonth = m;
        }
      }
    });

    // Calculate Streaks
    let longestStreak = 0;
    let currentStreak = 0;
    let tempStreak = 0;

    // Scan backwards from today for current active streak
    const backDate = new Date(today);
    while (backDate >= startDate) {
      const key = backDate.toISOString().split('T')[0];
      if (activeDateStrings.has(key)) {
        currentStreak++;
      } else {
        if (key === todayStr && currentStreak === 0) {
          // If no report today yet, check if yesterday was active
          const yDate = new Date(today);
          yDate.setDate(yDate.getDate() - 1);
          const yKey = yDate.toISOString().split('T')[0];
          if (!activeDateStrings.has(yKey)) {
            break;
          }
        } else {
          break;
        }
      }
      backDate.setDate(backDate.getDate() - 1);
    }

    // Forward scan for longest streak
    const fDate = new Date(startDate);
    while (fDate <= today) {
      const key = fDate.toISOString().split('T')[0];
      if (activeDateStrings.has(key)) {
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }
      fDate.setDate(fDate.getDate() + 1);
    }

    return {
      weeks: weeksData,
      monthHeaders: monthHeadersList,
      kpis: {
        totalSubmissionsInPeriod,
        activeDaysCount,
        totalBountyInPeriod,
        longestStreak: Math.max(longestStreak, currentStreak),
        currentStreak,
        maxReportsInSingleDay,
        mostProductiveDateStr
      }
    };
  }, [filteredReports, totalWeeks]);

  // Color classes for intensity levels
  const getCellClasses = (day: DayCellData, isSelected: boolean) => {
    if (day.isFuture) {
      return 'bg-[#141414]/30 border border-[#1c1c1c] opacity-20 cursor-not-allowed';
    }

    let bgClass = '';
    switch (day.intensityLevel) {
      case 4:
        bgClass = 'bg-emerald-400 border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.45)] hover:ring-2 hover:ring-emerald-200';
        break;
      case 3:
        bgClass = 'bg-emerald-500 border-emerald-400/80 shadow-[0_0_6px_rgba(16,185,129,0.3)] hover:ring-2 hover:ring-emerald-300';
        break;
      case 2:
        bgClass = 'bg-emerald-600/90 border-emerald-500/50 hover:ring-2 hover:ring-emerald-400';
        break;
      case 1:
        bgClass = 'bg-emerald-800/80 border-emerald-700/60 hover:ring-1 hover:ring-emerald-400';
        break;
      default:
        bgClass = 'bg-[#161616] border-[#242424] hover:border-zinc-500 hover:bg-[#1f1f1f]';
        break;
    }

    if (isSelected) {
      return `${bgClass} ring-2 ring-white border-white scale-110 z-10`;
    }

    if (day.isToday) {
      return `${bgClass} ring-1 ring-emerald-400/80`;
    }

    return bgClass;
  };

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div id="calendar-activity-heatmap" className="bg-[#0a0a0a] border border-[#262626] rounded-xl overflow-hidden shadow-2xl transition-all">
      
      {/* Header Banner */}
      <div className="p-4 sm:p-5 border-b border-[#262626] bg-[#111111]/80 backdrop-blur-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white tracking-wide">
                  Mapa de Calor de Atividade (Calendar Heatmap)
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Frequência por Data de Submissão
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Visualização cronológica das datas de envio dos relatórios de vulnerabilidade, densidade de achados e sequências ativas.
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar: Timeframe Selector & Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Timeframe selector (52w / 26w / 13w) */}
          <div className="flex items-center bg-[#161616] p-0.5 rounded-lg border border-[#2a2a2a] text-xs font-mono">
            <button
              type="button"
              onClick={() => setTotalWeeks(52)}
              className={`px-2.5 py-1 rounded transition-all ${
                totalWeeks === 52
                  ? 'bg-[#262626] text-emerald-400 border border-emerald-500/30 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              12 Meses
            </button>
            <button
              type="button"
              onClick={() => setTotalWeeks(26)}
              className={`px-2.5 py-1 rounded transition-all ${
                totalWeeks === 26
                  ? 'bg-[#262626] text-emerald-400 border border-emerald-500/30 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              6 Meses
            </button>
            <button
              type="button"
              onClick={() => setTotalWeeks(13)}
              className={`px-2.5 py-1 rounded transition-all ${
                totalWeeks === 13
                  ? 'bg-[#262626] text-emerald-400 border border-emerald-500/30 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              3 Meses
            </button>
          </div>

          {/* Severity Filter Dropdown */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-[#161616] border border-[#2b2b2b] text-zinc-300 text-xs rounded px-2.5 py-1 font-mono focus:border-emerald-500 outline-none"
          >
            <option value="ALL">Todas Severidades</option>
            <option value="CRITICAL">Crítica</option>
            <option value="HIGH">Alta</option>
            <option value="MEDIUM">Média</option>
            <option value="LOW">Baixa</option>
          </select>

          {/* Status Filter Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="bg-[#161616] border border-[#2b2b2b] text-zinc-300 text-xs rounded px-2.5 py-1 font-mono focus:border-emerald-500 outline-none"
          >
            <option value="ALL">Todos Status</option>
            <option value="REWARDED">Apenas Premiados</option>
            <option value="TRIAGED">Em Triagem</option>
            <option value="DRAFT">Rascunhos</option>
          </select>

          {onNewReport && (
            <button
              type="button"
              onClick={onNewReport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs font-mono rounded-lg transition-colors shadow-sm"
              title="Registrar nova falha encontrada"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Relatório</span>
            </button>
          )}

        </div>

      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 p-4 bg-[#0d0d0d] border-b border-[#202020] text-xs font-mono">
        <div className="p-2.5 bg-[#141414] rounded-lg border border-[#242424]">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">Submissões no Período</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-light text-white font-mono">{kpis.totalSubmissionsInPeriod}</span>
            <span className="text-[10px] text-zinc-400">relatórios</span>
          </div>
        </div>

        <div className="p-2.5 bg-[#141414] rounded-lg border border-[#242424]">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">Dias Produtivos</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-light text-emerald-400 font-mono">{kpis.activeDaysCount}</span>
            <span className="text-[10px] text-zinc-400">dias com envio</span>
          </div>
        </div>

        <div className="p-2.5 bg-[#141414] rounded-lg border border-[#242424]">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">Maior Sequência</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-light text-amber-400 font-mono flex items-center gap-1">
              <Flame className="w-4 h-4 text-amber-400 inline" />
              {kpis.longestStreak}
            </span>
            <span className="text-[10px] text-zinc-400">dias seguidos</span>
          </div>
        </div>

        <div className="p-2.5 bg-[#141414] rounded-lg border border-[#242424]">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">Sequência Atual</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-light text-emerald-400 font-mono">{kpis.currentStreak}</span>
            <span className="text-[10px] text-zinc-400">dias</span>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-4 lg:col-span-1 p-2.5 bg-[#141414] rounded-lg border border-[#242424]">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1">Recompensas no Período</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-light text-emerald-400 font-mono font-bold">
              {formatCurrency(kpis.totalBountyInPeriod, 'USD')}
            </span>
          </div>
        </div>
      </div>

      {/* Main Heatmap Calendar Grid */}
      <div className="p-4 sm:p-6 overflow-x-auto relative select-none">
        <div className="min-w-[760px] flex flex-col">
          
          {/* Month Labels Header */}
          <div className="flex ml-8 mb-2 text-[10px] font-mono text-zinc-500 h-4 relative">
            {monthHeaders.map(header => (
              <span
                key={`${header.label}-${header.weekIndex}`}
                className="absolute transform -translate-x-1"
                style={{ left: `${(header.weekIndex / totalWeeks) * 100}%` }}
              >
                {header.label}
              </span>
            ))}
          </div>

          {/* Days Grid Rows & Weekdays Labels */}
          <div className="flex gap-2 items-start">
            
            {/* Weekday indicators column (Dom a Sáb) aligned with 7 cells */}
            <div className="flex flex-col gap-1 text-[9px] sm:text-[10px] font-mono text-zinc-500 pr-1 w-6 text-right select-none">
              <span className="h-3 sm:h-3.5 flex items-center justify-end leading-none text-transparent">Dom</span>
              <span className="h-3 sm:h-3.5 flex items-center justify-end leading-none">Seg</span>
              <span className="h-3 sm:h-3.5 flex items-center justify-end leading-none text-transparent">Ter</span>
              <span className="h-3 sm:h-3.5 flex items-center justify-end leading-none">Qua</span>
              <span className="h-3 sm:h-3.5 flex items-center justify-end leading-none text-transparent">Qui</span>
              <span className="h-3 sm:h-3.5 flex items-center justify-end leading-none">Sex</span>
              <span className="h-3 sm:h-3.5 flex items-center justify-end leading-none text-transparent">Sáb</span>
            </div>

            {/* Columns Grid (7 days per column) */}
            <div className="flex-1 flex gap-1 justify-between">
              {weeks.map((week, wIdx) => (
                <div key={`week-${wIdx}`} className="flex flex-col gap-1">
                  {week.map((day) => {
                    const isSelected = selectedDay?.dateStr === day.dateStr;
                    return (
                      <button
                        type="button"
                        key={day.dateStr}
                        onClick={() => setSelectedDay(isSelected ? null : day)}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredDay({
                            day,
                            x: rect.left + rect.width / 2,
                            y: rect.top - 8
                          });
                        }}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-[2.5px] transition-all duration-150 ${getCellClasses(
                          day,
                          isSelected
                        )}`}
                        aria-label={`${day.dateStr}: ${day.count} submissões`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

          </div>

          {/* Heatmap Legend and Guidance Footer */}
          <div className="mt-5 pt-3 border-t border-[#1e1e1e] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-zinc-500">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-zinc-500" />
              <span>
                {selectedDay 
                  ? `Dia selecionado: ${formatDateLabel(selectedDay.dateStr)} (${selectedDay.count} submissões)`
                  : 'Clique em qualquer célula para detalhar os relatórios submetidos naquela data'}
              </span>
              {selectedDay && (
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="text-zinc-400 hover:text-white underline ml-1 cursor-pointer"
                >
                  Limpar seleção
                </button>
              )}
            </div>

            {/* Scale Legend: Menos -> Mais */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 text-[10px]">Menos</span>
              <div className="w-3 h-3 rounded-[2.5px] bg-[#161616] border border-[#242424]" title="0 submissões" />
              <div className="w-3 h-3 rounded-[2.5px] bg-emerald-800/80 border border-emerald-700/60" title="1 submissão" />
              <div className="w-3 h-3 rounded-[2.5px] bg-emerald-600/90 border border-emerald-500/50" title="2 submissões" />
              <div className="w-3 h-3 rounded-[2.5px] bg-emerald-500 border border-emerald-400/80" title="3 submissões" />
              <div className="w-3 h-3 rounded-[2.5px] bg-emerald-400 border border-emerald-300 shadow-[0_0_6px_rgba(52,211,153,0.4)]" title="4+ submissões" />
              <span className="text-zinc-500 text-[10px]">Mais</span>
            </div>
          </div>

        </div>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredDay && !hoveredDay.day.isFuture && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full px-3 py-2 bg-[#121212]/95 border border-zinc-700 rounded-lg shadow-2xl backdrop-blur-md max-w-xs transition-opacity duration-150"
          style={{
            left: `${hoveredDay.x}px`,
            top: `${hoveredDay.y}px`
          }}
        >
          <div className="text-[11px] font-mono">
            <div className="font-semibold text-white border-b border-zinc-800 pb-1 mb-1">
              {formatDateLabel(hoveredDay.day.dateStr)}
            </div>
            <div className="flex items-center justify-between gap-3 text-zinc-300">
              <span>Relatórios submetidos:</span>
              <span className="font-bold text-emerald-400">{hoveredDay.day.count}</span>
            </div>
            {hoveredDay.day.totalBounty > 0 && (
              <div className="flex items-center justify-between gap-3 text-zinc-300 mt-0.5">
                <span>Bounties obtidos:</span>
                <span className="font-bold text-emerald-400">{formatCurrency(hoveredDay.day.totalBounty, 'USD')}</span>
              </div>
            )}
            {hoveredDay.day.reports.length > 0 && (
              <div className="mt-1.5 pt-1 border-t border-zinc-800/80 space-y-1">
                {hoveredDay.day.reports.slice(0, 3).map(r => (
                  <div key={r.id} className="text-[10px] text-zinc-400 truncate flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    <span className="truncate">{r.title}</span>
                  </div>
                ))}
                {hoveredDay.day.reports.length > 3 && (
                  <div className="text-[9px] text-zinc-500 italic">
                    +{hoveredDay.day.reports.length - 3} outros relatórios
                  </div>
                )}
              </div>
            )}
            {hoveredDay.day.count === 0 && (
              <div className="text-[10px] text-zinc-500 mt-1 italic">
                Nenhum relatório submetido neste dia.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Day Inspector Drawer */}
      {selectedDay && (
        <div className="border-t border-[#262626] bg-[#0d0d0d] p-4 sm:p-5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
                Atividade em {formatDateLabel(selectedDay.dateStr)}
              </h4>
              <span className="text-[11px] px-2 py-0.5 rounded bg-[#1c1c1c] border border-[#2a2a2a] text-zinc-300 font-mono font-bold">
                {selectedDay.count} {selectedDay.count === 1 ? 'relatório' : 'relatórios'}
              </span>
              {selectedDay.totalBounty > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold">
                  {formatCurrency(selectedDay.totalBounty, 'USD')}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-xs text-zinc-500 hover:text-zinc-300 font-mono cursor-pointer"
            >
              Fechar painel ✕
            </button>
          </div>

          {selectedDay.reports.length === 0 ? (
            <div className="p-4 rounded-lg bg-[#141414] border border-[#242424] text-center flex flex-col items-center justify-center gap-2">
              <p className="text-xs text-zinc-400 font-mono">
                Nenhum relatório de vulnerabilidade foi submetido nesta data ({selectedDay.dateStr}).
              </p>
              {onNewReport && (
                <button
                  type="button"
                  onClick={onNewReport}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs font-mono rounded transition-colors"
                >
                  + Criar Novo Relatório
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedDay.reports.map(report => {
                const sevBadge = getSeverityBadgeColor(report.severity);
                return (
                  <div
                    key={report.id}
                    className="p-3.5 rounded-lg bg-[#141414] border border-[#262626] hover:border-emerald-500/40 transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] border ${sevBadge.bg} ${sevBadge.text} ${sevBadge.border}`}>
                            {report.severity}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">{report.platform}</span>
                        </div>
                        {report.bountyAmount > 0 && (
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            {formatCurrency(report.bountyAmount, 'USD')}
                          </span>
                        )}
                      </div>

                      <h5 className="text-xs font-semibold text-zinc-100 group-hover:text-emerald-300 transition-colors line-clamp-2">
                        {report.title}
                      </h5>

                      <p className="text-[11px] font-mono text-zinc-400 mt-1 flex items-center gap-1.5">
                        <span className="text-zinc-500">Alvo:</span>
                        <span className="text-zinc-300">{report.target}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#202020] text-[10px] font-mono">
                      <span className="text-zinc-500">ID: {report.id}</span>
                      {onSelectReport && (
                        <button
                          type="button"
                          onClick={() => onSelectReport(report)}
                          className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold group-hover:translate-x-0.5 transition-transform cursor-pointer"
                        >
                          <span>Abrir Relatório Completo</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
