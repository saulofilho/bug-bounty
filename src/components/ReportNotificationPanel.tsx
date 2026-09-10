import React, { useState, useMemo } from 'react';
import { 
  Bell, 
  BellRing, 
  AlertTriangle, 
  Clock, 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  ShieldAlert, 
  ChevronDown, 
  ChevronUp, 
  EyeOff, 
  RotateCcw,
  Sparkles,
  DollarSign,
  Send,
  HelpCircle
} from 'lucide-react';
import { VulnerabilityReport, Severity, ReportStatus } from '../types';
import { formatCurrency, getSeverityBadgeColor } from '../utils/formatters';

export interface NotificationItem {
  id: string;
  reportId: string;
  report: VulnerabilityReport;
  type: 'draft_pending' | 'triage_pending' | 'triaged_bounty' | 'recent_status_change' | 'sla_warning' | 'unsigned_critical';
  category: 'drafts' | 'triage' | 'milestones' | 'sla';
  title: string;
  description: string;
  urgency: 'high' | 'medium' | 'low';
  daysAgo: number;
  badgeLabel: string;
  badgeColor: string;
  metricInfo?: string;
  actionText: string;
}

interface ReportNotificationPanelProps {
  reports: VulnerabilityReport[];
  onSelectReport: (report: VulnerabilityReport) => void;
  onNewReport?: () => void;
}

export const ReportNotificationPanel: React.FC<ReportNotificationPanelProps> = ({
  reports,
  onSelectReport,
  onNewReport
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'drafts' | 'triage' | 'milestones' | 'sla'>('ALL');
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('bugsentinel_dismissed_alerts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Calculate notifications based on status changes, time elapsed, and milestones
  const allNotifications = useMemo<NotificationItem[]>(() => {
    const now = new Date();
    const items: NotificationItem[] = [];

    reports.forEach(report => {
      const createdDate = new Date(report.createdAt);
      const updatedDate = new Date(report.updatedAt);
      const daysSinceCreated = Math.max(0, Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));
      const daysSinceUpdated = Math.max(0, Math.floor((now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24)));

      // 1. DRAFTS PENDING COMPLETION
      if (report.status === 'DRAFT') {
        const isOldDraft = daysSinceUpdated >= 2;
        items.push({
          id: `draft-${report.id}`,
          reportId: report.id,
          report,
          type: isOldDraft ? 'sla_warning' : 'draft_pending',
          category: 'drafts',
          title: `Rascunho pendente de conclusão: ${report.title}`,
          description: isOldDraft 
            ? `Este rascunho está inativo há ${daysSinceUpdated} dias. Finalize os passos de reprodução e o PoC para evitar submissões duplicadas por outros hunters.`
            : `Rascunho em aberto criado há ${daysSinceCreated} dias. Complete o relatório com CVSS v3.1 e envie para a plataforma ${report.platform}.`,
          urgency: isOldDraft ? 'high' : 'medium',
          daysAgo: daysSinceUpdated,
          badgeLabel: isOldDraft ? 'Rascunho Estagnado (>48h)' : 'Rascunho Aberto',
          badgeColor: isOldDraft ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          metricInfo: `Alvo: ${report.target} • CVSS ${report.cvssScore.toFixed(1)}`,
          actionText: 'Concluir Rascunho'
        });
      }

      // 2. REPORTS PENDING TRIAGE
      if (report.status === 'SUBMITTED') {
        const isSlaApproaching = daysSinceUpdated >= 4;
        items.push({
          id: `triage-${report.id}`,
          reportId: report.id,
          report,
          type: isSlaApproaching ? 'sla_warning' : 'triage_pending',
          category: 'triage',
          title: `Aguardando triagem na plataforma: ${report.title}`,
          description: isSlaApproaching
            ? `Submetido há ${daysSinceUpdated} dias em ${report.platform}. O prazo médio de triagem (SLA de 72-96h) foi atingido. Considere solicitar um update educado no thread da plataforma.`
            : `Submetido há ${daysSinceUpdated} dias. Relatório em fila de triagem pela equipe de segurança de ${report.target}.`,
          urgency: isSlaApproaching ? 'high' : 'medium',
          daysAgo: daysSinceUpdated,
          badgeLabel: isSlaApproaching ? 'SLA de Triagem Excedido' : 'Fila de Triagem',
          badgeColor: isSlaApproaching ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' : 'bg-sky-500/15 text-sky-400 border-sky-500/30',
          metricInfo: `${report.platform} • Severidade ${report.severity}`,
          actionText: 'Verificar Submissão'
        });
      }

      // 3. TRIAGED - AWAITING REWARD OR RESOLUTION
      if (report.status === 'TRIAGED') {
        const hasEstimatedReward = report.bountyAmount > 0;
        items.push({
          id: `triaged-${report.id}`,
          reportId: report.id,
          report,
          type: 'triaged_bounty',
          category: 'milestones',
          title: `Triado com sucesso — Aguardando recompensa/correção: ${report.title}`,
          description: `Vulnerabilidade confirmada pela equipe de segurança. ${hasEstimatedReward ? `Recompensa estimada em ${formatCurrency(report.bountyAmount, report.currency)}.` : 'Aguardando definição da recompensa final ou validação do patch.'}`,
          urgency: 'low',
          daysAgo: daysSinceUpdated,
          badgeLabel: 'Validado / Triado',
          badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          metricInfo: hasEstimatedReward ? `Expectativa: ${formatCurrency(report.bountyAmount, report.currency)}` : `Impacto: ${report.severity}`,
          actionText: 'Acompanhar Recompensa'
        });
      }

      // 4. RECENT STATUS CHANGE OR RECENT BOUNTY (last 7 days)
      if (daysSinceUpdated <= 7 && (report.status === 'REWARDED' || report.status === 'RESOLVED')) {
        items.push({
          id: `recent-${report.id}`,
          reportId: report.id,
          report,
          type: 'recent_status_change',
          category: 'milestones',
          title: report.status === 'REWARDED' 
            ? `Recompensa Concedida: ${report.title}`
            : `Correção Confirmada: ${report.title}`,
          description: report.status === 'REWARDED'
            ? `Bounty de ${formatCurrency(report.bountyAmount, report.currency)} registrado com sucesso para ${report.target}. Parabéns pelo achado!`
            : `A vulnerabilidade foi resolvida pela equipe de AppSec. Verifique se há direito a divulgação pública (Disclosure).`,
          urgency: 'low',
          daysAgo: daysSinceUpdated,
          badgeLabel: report.status === 'REWARDED' ? 'Bounty Pago' : 'Resolvido',
          badgeColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
          metricInfo: report.status === 'REWARDED' ? `+${formatCurrency(report.bountyAmount, report.currency)}` : 'Fix Validação',
          actionText: 'Ver Detalhes'
        });
      }

      // 5. CRITICAL OR HIGH SEVERITY MISSING PGP SIGNATURE
      if ((report.severity === 'CRITICAL' || report.severity === 'HIGH') && !report.pgpSignature && report.status !== 'RESOLVED' && report.status !== 'REWARDED') {
        items.push({
          id: `unsigned-${report.id}`,
          reportId: report.id,
          report,
          type: 'unsigned_critical',
          category: 'sla',
          title: `PoC Crítico/Alto sem Assinatura PGP: ${report.title}`,
          description: `Relatórios de alto impacto devem ser assinados criptograficamente com PGP antes do envio para comprovar integridade e autoria responsável.`,
          urgency: 'medium',
          daysAgo: daysSinceCreated,
          badgeLabel: 'Sem Assinatura PGP',
          badgeColor: 'bg-zinc-800 text-zinc-300 border-zinc-700',
          metricInfo: `CVSS ${report.cvssScore.toFixed(1)} • ${report.severity}`,
          actionText: 'Assinar com PGP'
        });
      }
    });

    // Sort by urgency (high > medium > low) and then by most recent daysAgo
    return items.sort((a, b) => {
      const urgencyScore = { high: 3, medium: 2, low: 1 };
      if (urgencyScore[b.urgency] !== urgencyScore[a.urgency]) {
        return urgencyScore[b.urgency] - urgencyScore[a.urgency];
      }
      return a.daysAgo - b.daysAgo;
    });
  }, [reports]);

  // Active un-dismissed notifications
  const activeNotifications = useMemo(() => {
    return allNotifications.filter(item => !dismissedAlertIds.includes(item.id));
  }, [allNotifications, dismissedAlertIds]);

  // Filtered by selected tab
  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'ALL') return activeNotifications;
    return activeNotifications.filter(item => item.category === activeFilter);
  }, [activeNotifications, activeFilter]);

  // Summary counts
  const counts = useMemo(() => {
    const drafts = activeNotifications.filter(n => n.category === 'drafts').length;
    const triage = activeNotifications.filter(n => n.category === 'triage').length;
    const milestones = activeNotifications.filter(n => n.category === 'milestones').length;
    const sla = activeNotifications.filter(n => n.category === 'sla' || n.urgency === 'high').length;
    return { all: activeNotifications.length, drafts, triage, milestones, sla };
  }, [activeNotifications]);

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = [...dismissedAlertIds, id];
    setDismissedAlertIds(updated);
    try {
      localStorage.setItem('bugsentinel_dismissed_alerts', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleResetDismissed = () => {
    setDismissedAlertIds([]);
    try {
      localStorage.removeItem('bugsentinel_dismissed_alerts');
    } catch {
      // ignore
    }
  };

  const handleDismissAll = () => {
    const allIds = allNotifications.map(n => n.id);
    setDismissedAlertIds(allIds);
    try {
      localStorage.setItem('bugsentinel_dismissed_alerts', JSON.stringify(allIds));
    } catch {
      // ignore
    }
  };

  // If no notifications at all, return minimal reassurance banner
  if (allNotifications.length === 0) {
    return (
      <div className="bg-[#0e0e0e] border border-[#222] rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Tudo em Dia</h4>
            <p className="text-[11px] text-zinc-400">Nenhum rascunho pendente ou SLA de triagem atrasado no momento.</p>
          </div>
        </div>
        {onNewReport && (
          <button
            onClick={onNewReport}
            className="text-xs px-3 py-1.5 rounded bg-[#161616] hover:bg-[#202020] text-emerald-400 border border-emerald-500/30 font-medium transition-colors"
          >
            + Novo Relatório
          </button>
        )}
      </div>
    );
  }

  return (
    <section 
      id="dashboard-notification-panel" 
      aria-label="Painel de Notificações e Acompanhamento de Relatórios"
      className="rounded-xl bg-[#0a0a0a] border border-[#262626] overflow-hidden shadow-2xl transition-all"
    >
      {/* Header Bar */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#121212] via-[#0f0f0f] to-[#141414] border-b border-[#222] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all ${
            counts.sla > 0 
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse' 
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}>
            {counts.all > 0 ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4 text-zinc-500" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
                Central de Atenção & Milestones
              </h2>
              {counts.all > 0 ? (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  counts.sla > 0 
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {counts.all} {counts.all === 1 ? 'pendência' : 'pendências'}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Todas tratadas
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Acompanhe rascunhos inacabados, SLAs de triagem nas plataformas e marcos de liberação de recompensas.
            </p>
          </div>
        </div>

        {/* Quick Actions / Controls */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {dismissedAlertIds.length > 0 && (
            <button
              onClick={handleResetDismissed}
              className="text-[11px] px-2.5 py-1 rounded bg-[#161616] hover:bg-[#202020] text-zinc-400 hover:text-white border border-[#2b2b2b] flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Restaurar alertas dispensados"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restaurar ({dismissedAlertIds.length})</span>
            </button>
          )}

          {counts.all > 0 && (
            <button
              onClick={handleDismissAll}
              className="text-[11px] px-2.5 py-1 rounded bg-[#161616] hover:bg-[#202020] text-zinc-400 hover:text-white border border-[#2b2b2b] flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Dispensar todos os alertas desta sessão"
            >
              <EyeOff className="w-3 h-3" />
              <span className="hidden sm:inline">Dispensar Todos</span>
            </button>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded bg-[#161616] hover:bg-[#202020] text-zinc-400 hover:text-white border border-[#2b2b2b] transition-colors cursor-pointer"
            aria-label={isCollapsed ? 'Expandir painel' : 'Recolher painel'}
            title={isCollapsed ? 'Expandir painel de notificações' : 'Recolher painel de notificações'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {!isCollapsed && (
        <div className="p-4 sm:p-5 space-y-4">
          
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[#1f1f1f] pb-3">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`text-xs px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeFilter === 'ALL'
                  ? 'bg-zinc-100 text-black font-semibold'
                  : 'bg-[#141414] text-zinc-400 hover:text-white hover:bg-[#1e1e1e] border border-[#262626]'
              }`}
            >
              <span>Todos</span>
              <span className="text-[10px] font-mono px-1 rounded bg-black/20 text-current">{counts.all}</span>
            </button>

            <button
              onClick={() => setActiveFilter('drafts')}
              className={`text-xs px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeFilter === 'drafts'
                  ? 'bg-amber-400 text-black font-semibold'
                  : 'bg-[#141414] text-zinc-400 hover:text-white hover:bg-[#1e1e1e] border border-[#262626]'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>Rascunhos Pendentes</span>
              <span className="text-[10px] font-mono px-1 rounded bg-black/20 text-current">{counts.drafts}</span>
            </button>

            <button
              onClick={() => setActiveFilter('triage')}
              className={`text-xs px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeFilter === 'triage'
                  ? 'bg-sky-400 text-black font-semibold'
                  : 'bg-[#141414] text-zinc-400 hover:text-white hover:bg-[#1e1e1e] border border-[#262626]'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Aguardando Triagem</span>
              <span className="text-[10px] font-mono px-1 rounded bg-black/20 text-current">{counts.triage}</span>
            </button>

            <button
              onClick={() => setActiveFilter('milestones')}
              className={`text-xs px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeFilter === 'milestones'
                  ? 'bg-emerald-400 text-black font-semibold'
                  : 'bg-[#141414] text-zinc-400 hover:text-white hover:bg-[#1e1e1e] border border-[#262626]'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Marcos & Recompensas</span>
              <span className="text-[10px] font-mono px-1 rounded bg-black/20 text-current">{counts.milestones}</span>
            </button>

            <button
              onClick={() => setActiveFilter('sla')}
              className={`text-xs px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeFilter === 'sla'
                  ? 'bg-rose-500 text-white font-semibold'
                  : 'bg-[#141414] text-zinc-400 hover:text-white hover:bg-[#1e1e1e] border border-[#262626]'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>SLA & Segurança</span>
              <span className="text-[10px] font-mono px-1 rounded bg-black/20 text-current">{counts.sla}</span>
            </button>
          </div>

          {/* Alert Cards List */}
          {filteredNotifications.length === 0 ? (
            <div className="py-8 text-center bg-[#0d0d0d] border border-dashed border-[#222] rounded-lg">
              <CheckCircle2 className="w-7 h-7 text-emerald-500/60 mx-auto mb-2" />
              <p className="text-xs text-zinc-300 font-medium">Nenhum alerta pendente nesta categoria.</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Todos os itens filtrados foram concluídos ou dispensados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredNotifications.map(item => (
                <div
                  key={item.id}
                  onClick={() => onSelectReport(item.report)}
                  className="group relative bg-[#111111] hover:bg-[#171717] border border-[#242424] hover:border-[#383838] p-4 rounded-lg transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-md"
                >
                  <div>
                    {/* Top Row: Badges & Dismiss */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${item.badgeColor}`}>
                          {item.badgeLabel}
                        </span>
                        {(() => {
                          const sevColor = getSeverityBadgeColor(item.report.severity);
                          return (
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${sevColor.bg} ${sevColor.text} ${sevColor.border}`}>
                              {item.report.severity}
                            </span>
                          );
                        })()}
                        {item.report.status === 'DRAFT' && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            DRAFT
                          </span>
                        )}
                        {item.report.status === 'SUBMITTED' && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                            SUBMITTED
                          </span>
                        )}
                      </div>

                      <button
                        onClick={(e) => handleDismiss(item.id, e)}
                        className="text-zinc-600 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800 transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                        title="Dispensar alerta"
                        aria-label="Dispensar alerta"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Report Title */}
                    <h3 className="text-xs sm:text-sm font-medium text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                      {item.title}
                    </h3>

                    {/* Description */}
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  {/* Card Footer: Metadata & Action CTA */}
                  <div className="pt-2.5 border-t border-[#1e1e1e] flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-zinc-500 font-mono truncate text-[10px]">
                      {item.metricInfo}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectReport(item.report);
                      }}
                      className="inline-flex items-center gap-1 font-semibold text-emerald-400 hover:text-emerald-300 text-[11px] group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>{item.actionText}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Metrics Footer Bar */}
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-[11px] text-zinc-400">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>{counts.drafts} Rascunhos em aberto</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                <span>{counts.triage} Submissões em triagem</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>{counts.milestones} Marcos confirmados</span>
              </span>
            </div>

            {onNewReport && (
              <button
                type="button"
                onClick={onNewReport}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>+ Criar novo achado para pesquisa</span>
              </button>
            )}
          </div>

        </div>
      )}
    </section>
  );
};
