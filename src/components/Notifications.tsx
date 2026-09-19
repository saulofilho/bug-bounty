import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bell, 
  Mail, 
  ShieldAlert, 
  DollarSign, 
  RefreshCw, 
  CheckCheck, 
  Trash2, 
  ExternalLink, 
  Copy, 
  Check, 
  Send, 
  Settings, 
  ChevronRight, 
  ArrowRight, 
  Filter, 
  Search, 
  X, 
  Sparkles, 
  Inbox, 
  Flame, 
  Eye, 
  EyeOff, 
  Code, 
  FileText, 
  ShieldCheck,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { VulnerabilityReport, Severity, ReportStatus, MockEmailNotification, NotificationTriggerType } from '../types';
import { formatCurrency, getSeverityBadgeColor, getStatusBadgeColor } from '../utils/formatters';
import { 
  getStoredMockEmails, 
  saveStoredMockEmails, 
  getNotificationSettings, 
  saveNotificationSettings, 
  NotificationSettings, 
  dispatchMockEmailNotification,
  getInitialMockEmails 
} from '../utils/notificationEngine';
import { showSuccessToast, showInfoToast } from '../utils/toastNotifications';

interface NotificationsProps {
  reports: VulnerabilityReport[];
  onSelectReport?: (report: VulnerabilityReport) => void;
  onUpdateReport?: (updatedReport: VulnerabilityReport) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const Notifications: React.FC<NotificationsProps> = ({
  reports,
  onSelectReport,
  onUpdateReport,
  onClose,
  isModal = false
}) => {
  const [emails, setEmails] = useState<MockEmailNotification[]>(() => getStoredMockEmails());
  const [selectedEmail, setSelectedEmail] = useState<MockEmailNotification | null>(() => {
    const list = getStoredMockEmails();
    return list.length > 0 ? list[0] : null;
  });
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'critical' | 'bounty' | 'status' | 'unread'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [emailViewMode, setEmailViewMode] = useState<'rendered' | 'html' | 'plaintext'>('rendered');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  
  // Settings & Preferences
  const [settings, setSettings] = useState<NotificationSettings>(() => getNotificationSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempOwnerEmail, setTempOwnerEmail] = useState(settings.ownerEmail);
  const [tempOwnerName, setTempOwnerName] = useState(settings.ownerName);

  // Sync emails from storage on mount
  useEffect(() => {
    const stored = getStoredMockEmails();
    setEmails(stored);
    if (!selectedEmail && stored.length > 0) {
      setSelectedEmail(stored[0]);
    }
  }, []);

  // Update selected email if it's updated in the list
  useEffect(() => {
    if (selectedEmail) {
      const match = emails.find(e => e.id === selectedEmail.id);
      if (match && (match.read !== selectedEmail.read)) {
        setSelectedEmail(match);
      }
    }
  }, [emails]);

  // Filtered emails
  const filteredEmails = useMemo(() => {
    return emails.filter(email => {
      // Type Filter
      if (activeFilter === 'critical' && email.type !== 'critical_validated') return false;
      if (activeFilter === 'bounty' && email.type !== 'bounty_updated') return false;
      if (activeFilter === 'status' && email.type !== 'status_change') return false;
      if (activeFilter === 'unread' && email.read) return false;

      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inSubject = email.subject.toLowerCase().includes(q);
        const inRecipient = email.recipientEmail.toLowerCase().includes(q);
        const inTarget = email.reportTarget.toLowerCase().includes(q);
        const inId = email.reportId.toLowerCase().includes(q);
        const inPreview = email.previewText.toLowerCase().includes(q);
        return inSubject || inRecipient || inTarget || inId || inPreview;
      }

      return true;
    });
  }, [emails, activeFilter, searchQuery]);

  // Metrics
  const stats = useMemo(() => {
    const unreadCount = emails.filter(e => !e.read).length;
    const criticalCount = emails.filter(e => e.type === 'critical_validated').length;
    const bountyCount = emails.filter(e => e.type === 'bounty_updated').length;
    const totalBountiesNotified = emails.reduce((acc, curr) => acc + (curr.bountyNew || 0), 0);

    return {
      total: emails.length,
      unreadCount,
      criticalCount,
      bountyCount,
      totalBountiesNotified
    };
  }, [emails]);

  // Actions
  const handleSelectEmail = (email: MockEmailNotification) => {
    setSelectedEmail(email);
    if (!email.read) {
      const updated = emails.map(e => e.id === email.id ? { ...e, read: true } : e);
      setEmails(updated);
      saveStoredMockEmails(updated);
    }
  };

  const handleToggleRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = emails.map(item => {
      if (item.id === id) {
        return { ...item, read: !item.read };
      }
      return item;
    });
    setEmails(updated);
    saveStoredMockEmails(updated);
    if (selectedEmail?.id === id) {
      setSelectedEmail(prev => prev ? { ...prev, read: !prev.read } : null);
    }
  };

  const handleDeleteEmail = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = emails.filter(item => item.id !== id);
    setEmails(updated);
    saveStoredMockEmails(updated);
    if (selectedEmail?.id === id) {
      setSelectedEmail(updated.length > 0 ? updated[0] : null);
    }
    showInfoToast('Notificação removida.');
  };

  const handleMarkAllAsRead = () => {
    const updated = emails.map(e => ({ ...e, read: true }));
    setEmails(updated);
    saveStoredMockEmails(updated);
    showSuccessToast('Todas as notificações foram marcadas como lidas.');
  };

  const handleClearAll = () => {
    if (window.confirm('Tem certeza de que deseja limpar todo o histórico de e-mails mock?')) {
      setEmails([]);
      saveStoredMockEmails([]);
      setSelectedEmail(null);
      showInfoToast('Histórico de notificações limpo.');
    }
  };

  const handleRestoreSamples = () => {
    const samples = getInitialMockEmails();
    setEmails(samples);
    saveStoredMockEmails(samples);
    setSelectedEmail(samples[0]);
    showSuccessToast('Exemplos de notificações e e-mails mock restaurados!');
  };

  const handleCopyText = (content: string, type: string) => {
    navigator.clipboard.writeText(content);
    setCopiedType(type);
    showSuccessToast(`${type} copiado para a área de transferência!`);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleSaveSettings = () => {
    const updated = {
      ...settings,
      ownerEmail: tempOwnerEmail.trim() || 'oisaulofilho@gmail.com',
      ownerName: tempOwnerName.trim() || 'Saulo Filho'
    };
    setSettings(updated);
    saveNotificationSettings(updated);
    setIsSettingsOpen(false);
    showSuccessToast('Preferências de notificação salvas com sucesso.');
  };

  // Simulate Actions
  const handleSimulateCriticalValidation = () => {
    // Find an existing critical report or use the first available report
    let targetReport = reports.find(r => r.severity === 'CRITICAL' && r.status !== 'TRIAGED');
    if (!targetReport) {
      targetReport = reports.find(r => r.severity === 'CRITICAL') || reports[0];
    }

    if (!targetReport) {
      showInfoToast('Nenhum relatório encontrado para simular.');
      return;
    }

    const previousStatus = targetReport.status;
    const newStatus: ReportStatus = 'TRIAGED';

    // Update report status if callback provided
    if (onUpdateReport) {
      onUpdateReport({
        ...targetReport,
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    }

    // Dispatch mock email
    const dispatched = dispatchMockEmailNotification({
      report: { ...targetReport, status: newStatus },
      triggerType: 'critical_validated',
      statusFrom: previousStatus,
      statusTo: newStatus,
      customRecipientEmail: settings.ownerEmail,
      customRecipientName: settings.ownerName
    });

    const updated = [dispatched, ...emails];
    setEmails(updated);
    setSelectedEmail(dispatched);
    showSuccessToast(`🚨 E-mail mock enviado para ${settings.ownerEmail}: Achado Crítico Validado!`);
  };

  const handleSimulateBountyUpdate = () => {
    // Pick report to award bounty
    const targetReport = reports.find(r => r.bountyAmount > 0) || reports[0];
    if (!targetReport) {
      showInfoToast('Nenhum relatório encontrado para simular bounty.');
      return;
    }

    const oldBounty = targetReport.bountyAmount || 0;
    const newBounty = oldBounty > 0 ? oldBounty + 1000 : 2500;

    if (onUpdateReport) {
      onUpdateReport({
        ...targetReport,
        bountyAmount: newBounty,
        status: 'REWARDED',
        updatedAt: new Date().toISOString()
      });
    }

    const dispatched = dispatchMockEmailNotification({
      report: { ...targetReport, bountyAmount: newBounty, status: 'REWARDED' },
      triggerType: 'bounty_updated',
      statusFrom: targetReport.status,
      statusTo: 'REWARDED',
      bountyOld: oldBounty,
      bountyNew: newBounty,
      customRecipientEmail: settings.ownerEmail,
      customRecipientName: settings.ownerName
    });

    const updated = [dispatched, ...emails];
    setEmails(updated);
    setSelectedEmail(dispatched);
    showSuccessToast(`💰 E-mail mock enviado para ${settings.ownerEmail}: Bounty de ${formatCurrency(newBounty, targetReport.currency)} Atualizado!`);
  };

  const handleSimulateTestEmail = () => {
    const sample = reports[0] || {
      id: 'REP-DEMO-001',
      title: 'Remote Code Execution em API de Autenticação',
      target: 'auth.target-system.sec',
      platform: 'HackerOne',
      vulnerabilityType: 'Remote Code Execution',
      severity: 'CRITICAL',
      status: 'TRIAGED',
      cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
      cvssScore: 10.0,
      cwe: 'CWE-94',
      cveIds: [],
      summary: 'Teste de disparo manual do motor de notificações.',
      stepsToReproduce: [],
      proofOfConcept: '',
      businessImpact: 'Impacto total',
      remediation: 'Remediação imediata',
      bountyAmount: 5000,
      currency: 'USD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeline: []
    } as VulnerabilityReport;

    const dispatched = dispatchMockEmailNotification({
      report: sample,
      triggerType: 'critical_validated',
      statusFrom: 'SUBMITTED',
      statusTo: 'TRIAGED',
      bountyOld: 0,
      bountyNew: sample.bountyAmount,
      customRecipientEmail: settings.ownerEmail,
      customRecipientName: settings.ownerName
    });

    const updated = [dispatched, ...emails];
    setEmails(updated);
    setSelectedEmail(dispatched);
    showSuccessToast(`✉️ E-mail mock de teste disparado com sucesso para ${settings.ownerEmail}!`);
  };

  const handleOpenAssociatedReport = () => {
    if (!selectedEmail || !onSelectReport) return;
    const found = reports.find(r => r.id === selectedEmail.reportId);
    if (found) {
      if (onClose) onClose();
      onSelectReport(found);
    } else {
      showInfoToast(`Relatório ${selectedEmail.reportId} arquivado ou não encontrado na sessão atual.`);
    }
  };

  return (
    <div className={`flex flex-col bg-[#0a0b10] border border-[#1f2333] rounded-xl text-zinc-100 shadow-2xl overflow-hidden font-sans ${isModal ? 'max-h-[92vh] h-[850px]' : 'min-h-[720px]'}`}>
      
      {/* Top Header & Stat Ribbon */}
      <div className="border-b border-[#1e2235] bg-[#0e1017] p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-rose-600 p-0.5 shadow-lg shadow-purple-950/40 flex items-center justify-center">
              <div className="w-full h-full bg-[#0a0b10] rounded-[10px] flex items-center justify-center">
                <Bell className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  Central de Notificações & E-mails Mock
                </h2>
                {stats.unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs font-mono font-bold animate-pulse">
                    {stats.unreadCount} novo{stats.unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                Monitora transições de status e dispara e-mails simulados para o proprietário do relatório quando achados críticos são validados ou recompensas são atualizadas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-notif-settings-toggle"
              type="button"
              onClick={() => setIsSettingsOpen(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all border cursor-pointer ${
                isSettingsOpen 
                  ? 'bg-purple-950/60 text-purple-300 border-purple-500/50' 
                  : 'bg-[#151824] hover:bg-[#1c2030] text-zinc-300 border-[#2b3047]'
              }`}
              title="Configurações de Destinatário & Regras de Disparo"
            >
              <Settings className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Preferências</span>
            </button>

            {onClose && (
              <button
                id="btn-close-notifications-modal"
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="bg-[#12141f] border border-[#21263b] rounded-lg p-2.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-zinc-500 uppercase">Total de Notificações</div>
              <div className="text-base font-bold font-mono text-zinc-100">{stats.total}</div>
            </div>
            <div className="p-2 rounded-md bg-zinc-800/50 text-zinc-400">
              <Mail className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-[#12141f] border border-rose-500/20 rounded-lg p-2.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-rose-400 uppercase">Críticos Validados</div>
              <div className="text-base font-bold font-mono text-rose-300">{stats.criticalCount}</div>
            </div>
            <div className="p-2 rounded-md bg-rose-500/10 text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-[#12141f] border border-emerald-500/20 rounded-lg p-2.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-emerald-400 uppercase">Bounties Atualizados</div>
              <div className="text-base font-bold font-mono text-emerald-300">{stats.bountyCount}</div>
            </div>
            <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-[#12141f] border border-purple-500/20 rounded-lg p-2.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-purple-400 uppercase">Volume em Bounties</div>
              <div className="text-base font-bold font-mono text-purple-300">{formatCurrency(stats.totalBountiesNotified, 'USD')}</div>
            </div>
            <div className="p-2 rounded-md bg-purple-500/10 text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Collapsible Settings Panel */}
        {isSettingsOpen && (
          <div className="p-4 bg-[#141624] border border-purple-500/30 rounded-xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider font-mono">
                  Configurações do Proprietário do Relatório (Destinatário)
                </h4>
              </div>
              <span className="text-[11px] text-zinc-400">Simulação de Inbox</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1 font-mono">E-mail do Proprietário (Report Owner):</label>
                <input
                  type="email"
                  value={tempOwnerEmail}
                  onChange={(e) => setTempOwnerEmail(e.target.value)}
                  placeholder="ex: oisaulofilho@gmail.com"
                  className="w-full px-3 py-1.5 bg-[#0a0b10] border border-[#2b3047] focus:border-purple-500 rounded text-xs text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1 font-mono">Nome do Pesquisador:</label>
                <input
                  type="text"
                  value={tempOwnerName}
                  onChange={(e) => setTempOwnerName(e.target.value)}
                  placeholder="ex: Saulo Filho"
                  className="w-full px-3 py-1.5 bg-[#0a0b10] border border-[#2b3047] focus:border-purple-500 rounded text-xs text-white font-mono focus:outline-none"
                />
              </div>
            </div>

            {/* Auto Dispatches Toggles */}
            <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-[#23273c] text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                <input
                  type="checkbox"
                  checked={settings.autoEmailOnCritical}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoEmailOnCritical: e.target.checked }))}
                  className="rounded border-[#3b4260] bg-[#0c0d15] text-purple-600 focus:ring-0"
                />
                <span>Auto-disparar ao validar vulnerabilidade crítica</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                <input
                  type="checkbox"
                  checked={settings.autoEmailOnBounty}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoEmailOnBounty: e.target.checked }))}
                  className="rounded border-[#3b4260] bg-[#0c0d15] text-purple-600 focus:ring-0"
                />
                <span>Auto-disparar quando bounty for creditado ou alterado</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                <input
                  type="checkbox"
                  checked={settings.autoEmailOnStatusChange}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoEmailOnStatusChange: e.target.checked }))}
                  className="rounded border-[#3b4260] bg-[#0c0d15] text-purple-600 focus:ring-0"
                />
                <span>Notificar outras mudanças de status</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-3 py-1.5 rounded text-xs text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-4 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider"
              >
                Salvar Preferências
              </button>
            </div>
          </div>
        )}

        {/* Simulation Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-400 font-mono flex items-center gap-1.5 mr-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Simuladores de Eventos:</span>
            </span>

            <button
              id="btn-simulate-critical-val"
              type="button"
              onClick={handleSimulateCriticalValidation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-mono font-semibold transition-all hover:border-rose-400 cursor-pointer shadow-sm shadow-rose-950/30"
              title="Simula validação de achado com severidade CRITICAL pelo triador e dispara e-mail mock"
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Validar Crítico</span>
            </button>

            <button
              id="btn-simulate-bounty-payout"
              type="button"
              onClick={handleSimulateBountyUpdate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-semibold transition-all hover:border-emerald-400 cursor-pointer shadow-sm shadow-emerald-950/30"
              title="Simula concessão ou atualização de recompensa financeira e dispara e-mail mock"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Atualizar Bounty</span>
            </button>

            <button
              id="btn-simulate-test-email"
              type="button"
              onClick={handleSimulateTestEmail}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-mono font-semibold transition-all hover:border-indigo-400 cursor-pointer shadow-sm"
              title="Dispara e-mail de teste para o e-mail do proprietário"
            >
              <Send className="w-3.5 h-3.5 text-indigo-400" />
              <span>Disparar E-mail Teste</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-mono text-zinc-400 hover:text-white hover:bg-[#181c2b] transition-colors"
              title="Marcar todas como lidas"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Marcar Lidas</span>
            </button>

            <button
              type="button"
              onClick={handleRestoreSamples}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-mono text-zinc-400 hover:text-white hover:bg-[#181c2b] transition-colors"
              title="Restaurar notificações exemplo"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Restaurar Exemplos</span>
            </button>

            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-mono text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
              title="Limpar histórico"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Limpar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="px-4 py-2.5 border-b border-[#1b1e2e] bg-[#0c0d14] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => setActiveFilter('ALL')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors shrink-0 ${
              activeFilter === 'ALL'
                ? 'bg-zinc-200 text-black font-bold'
                : 'bg-[#141622] text-zinc-400 hover:text-white hover:bg-[#1c2032]'
            }`}
          >
            Todas ({emails.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('critical')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors shrink-0 ${
              activeFilter === 'critical'
                ? 'bg-rose-600 text-white font-bold'
                : 'bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 border border-rose-500/20'
            }`}
          >
            <ShieldAlert className="w-3 h-3" />
            <span>Críticos Validados ({stats.criticalCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('bounty')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors shrink-0 ${
              activeFilter === 'bounty'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40 border border-emerald-500/20'
            }`}
          >
            <DollarSign className="w-3 h-3" />
            <span>Bounties Atualizados ({stats.bountyCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('status')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors shrink-0 ${
              activeFilter === 'status'
                ? 'bg-indigo-600 text-white font-bold'
                : 'bg-indigo-950/30 text-indigo-300 hover:bg-indigo-900/40 border border-indigo-500/20'
            }`}
          >
            <RefreshCw className="w-3 h-3" />
            <span>Mudanças de Status</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('unread')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors shrink-0 ${
              activeFilter === 'unread'
                ? 'bg-purple-600 text-white font-bold'
                : 'bg-purple-950/30 text-purple-300 hover:bg-purple-900/40 border border-purple-500/20'
            }`}
          >
            <Mail className="w-3 h-3" />
            <span>Não Lidos ({stats.unreadCount})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar por assunto, alvo, ID..."
            className="w-full pl-8 pr-3 py-1 bg-[#131622] border border-[#23273c] focus:border-indigo-500 rounded-md text-xs text-zinc-200 placeholder-zinc-500 font-mono focus:outline-none"
          />
        </div>
      </div>

      {/* Main Split Body: Inbox List + Email Reader */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-0">
        
        {/* Left List Pane (5 cols) */}
        <div className="lg:col-span-5 border-r border-[#1b1e2e] flex flex-col bg-[#0b0c13] overflow-y-auto max-h-[600px] lg:max-h-none">
          {filteredEmails.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
              <Inbox className="w-10 h-10 mb-3 text-zinc-600 opacity-60" />
              <p className="text-sm font-medium text-zinc-400">Nenhuma notificação encontrada</p>
              <p className="text-xs text-zinc-600 max-w-xs mt-1">
                Tente ajustar os filtros ou use os botões de simulação acima para gerar novas notificações e e-mails mock.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#181a28]">
              {filteredEmails.map(email => {
                const isSelected = selectedEmail?.id === email.id;
                const isCritical = email.type === 'critical_validated';
                const isBounty = email.type === 'bounty_updated';

                return (
                  <div
                    key={email.id}
                    onClick={() => handleSelectEmail(email)}
                    className={`p-3.5 cursor-pointer transition-all relative ${
                      isSelected 
                        ? 'bg-[#151827] border-l-4 border-indigo-500' 
                        : 'hover:bg-[#10121d] border-l-4 border-transparent'
                    } ${!email.read ? 'bg-[#0f111c]' : ''}`}
                  >
                    {/* Top Row: Unread Dot + Badges + Date */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {!email.read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0" title="Não lido" />
                        )}

                        {isCritical ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-mono font-bold uppercase tracking-wider shrink-0 flex items-center gap-1">
                            <ShieldAlert className="w-2.5 h-2.5 text-rose-400" />
                            <span>Crítico</span>
                          </span>
                        ) : isBounty ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono font-bold uppercase tracking-wider shrink-0 flex items-center gap-1">
                            <DollarSign className="w-2.5 h-2.5 text-emerald-400" />
                            <span>Bounty</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-mono font-bold uppercase tracking-wider shrink-0">
                            Status
                          </span>
                        )}

                        <span className="text-[10px] font-mono text-zinc-400 truncate">
                          {email.reportId} • {email.reportTarget}
                        </span>
                      </div>

                      <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                        {new Date(email.sentAt).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Subject */}
                    <h3 className={`text-xs font-semibold leading-snug line-clamp-1 mb-1 ${!email.read ? 'text-white' : 'text-zinc-300'}`}>
                      {email.subject}
                    </h3>

                    {/* Snippet */}
                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {email.previewText}
                    </p>

                    {/* Footer Info & Actions */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1a1c2b] text-[10px] font-mono text-zinc-500">
                      <div className="flex items-center gap-2">
                        {email.statusFrom && email.statusTo && (
                          <span className="text-zinc-400">
                            {email.statusFrom} &rarr; <strong className="text-emerald-400">{email.statusTo}</strong>
                          </span>
                        )}
                        {email.bountyNew && email.bountyNew > 0 ? (
                          <span className="text-emerald-400 font-bold">
                            +{formatCurrency(email.bountyNew, email.currency || 'USD')}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleToggleRead(email.id, e)}
                          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
                          title={email.read ? 'Marcar como não lido' : 'Marcar como lido'}
                        >
                          {email.read ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteEmail(email.id, e)}
                          className="p-1 rounded hover:bg-rose-950/40 text-zinc-500 hover:text-rose-400"
                          title="Excluir notificação"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Reader Pane (7 cols) */}
        <div className="lg:col-span-7 flex flex-col bg-[#0e1017] overflow-hidden">
          {selectedEmail ? (
            <div className="flex flex-col h-full overflow-hidden">
              
              {/* Reader Top Action Bar */}
              <div className="p-3 sm:p-4 border-b border-[#1f2333] bg-[#12141e] flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex items-center gap-1 bg-[#1a1d2c] p-0.5 rounded-lg border border-[#2b3046]">
                    <button
                      type="button"
                      onClick={() => setEmailViewMode('rendered')}
                      className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1.5 ${
                        emailViewMode === 'rendered' 
                          ? 'bg-indigo-600 text-white font-bold' 
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      <span>E-mail Formatado</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEmailViewMode('html')}
                      className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1.5 ${
                        emailViewMode === 'html' 
                          ? 'bg-indigo-600 text-white font-bold' 
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Code className="w-3 h-3" />
                      <span>Código HTML</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEmailViewMode('plaintext')}
                      className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1.5 ${
                        emailViewMode === 'plaintext' 
                          ? 'bg-indigo-600 text-white font-bold' 
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      <span>Texto Puro</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onSelectReport && (
                    <button
                      type="button"
                      onClick={handleOpenAssociatedReport}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-semibold transition-all hover:border-emerald-400 cursor-pointer shadow-sm"
                      title="Abrir o relatório correspondente no sistema"
                    >
                      <span>Abrir Relatório</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCopyText(
                      emailViewMode === 'html' ? selectedEmail.emailHtml : selectedEmail.emailPlaintext,
                      emailViewMode === 'html' ? 'Código HTML' : 'Texto do E-mail'
                    )}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1c1f2e] hover:bg-[#252a3e] text-zinc-300 hover:text-white border border-[#2e344d] text-xs font-mono transition-colors"
                    title="Copiar conteúdo"
                  >
                    {copiedType ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span className="hidden sm:inline">{copiedType ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Envelope Metadata Card */}
              <div className="p-3 sm:p-4 bg-[#0a0b10] border-b border-[#1e2233] space-y-2 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
                    {selectedEmail.subject}
                  </h2>
                  <span className="text-[11px] font-mono text-zinc-500">
                    {new Date(selectedEmail.sentAt).toLocaleString('pt-BR')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="flex items-center gap-2 text-zinc-400 truncate">
                    <span className="text-zinc-500 uppercase text-[10px]">De:</span>
                    <span className="text-zinc-200 truncate">{selectedEmail.sender}</span>
                  </div>

                  <div className="flex items-center gap-2 text-zinc-400 truncate">
                    <span className="text-zinc-500 uppercase text-[10px]">Para:</span>
                    <span className="text-emerald-400 font-bold truncate">
                      {selectedEmail.recipientName} &lt;{selectedEmail.recipientEmail}&gt;
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>SPF: PASS // DKIM: PASS // TLS 1.3</span>
                  </span>

                  <span className="px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 text-[10px] font-mono">
                    REF: {selectedEmail.reportId}
                  </span>
                </div>
              </div>

              {/* View Content Area */}
              <div className="flex-1 overflow-y-auto p-4 bg-[#08090d]">
                {emailViewMode === 'rendered' && (
                  <div className="w-full flex justify-center">
                    <div 
                      className="w-full max-w-2xl bg-[#0c0d12] rounded-xl border border-[#232738] overflow-hidden shadow-2xl p-0"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.emailHtml }}
                    />
                  </div>
                )}

                {emailViewMode === 'html' && (
                  <div className="relative">
                    <pre className="p-4 bg-[#0a0b10] border border-[#232738] rounded-lg text-xs font-mono text-purple-300 overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
                      {selectedEmail.emailHtml}
                    </pre>
                  </div>
                )}

                {emailViewMode === 'plaintext' && (
                  <div className="relative">
                    <pre className="p-4 bg-[#0a0b10] border border-[#232738] rounded-lg text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
                      {selectedEmail.emailPlaintext}
                    </pre>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
              <Mail className="w-12 h-12 mb-3 text-zinc-700" />
              <p className="text-sm font-semibold text-zinc-400">Nenhum e-mail selecionado</p>
              <p className="text-xs text-zinc-600 mt-1 max-w-xs">
                Selecione uma notificação na lista à esquerda para visualizar os detalhes completos do e-mail mock enviado ao proprietário do relatório.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default Notifications;
