import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderGit2,
  RefreshCw,
  GitPullRequest,
  ExternalLink
} from 'lucide-react';
import { VulnerabilityReport, GitHubSyncStatus } from '../types';

export interface GitHubSyncIndicatorProps {
  report: VulnerabilityReport;
  variant?: 'badge' | 'pill' | 'detailed' | 'dot' | 'button-chip';
  showRepoName?: boolean;
  showIssueNumber?: boolean;
  onSyncClick?: (e: React.MouseEvent) => void;
  isSyncing?: boolean;
  className?: string;
}

export interface SyncStatusDetails {
  status: GitHubSyncStatus;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
  dotPulse: boolean;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

/**
 * Evaluates the precise synchronization state between a vulnerability report
 * and its associated GitHub issue.
 */
export function getGitHubSyncStatus(report: VulnerabilityReport): SyncStatusDetails {
  const integration = report.githubIntegration;

  // 1. Not linked
  if (!integration || !integration.repoOwner || !integration.repoName) {
    return {
      status: 'unlinked',
      label: 'GitHub: Não Vinculado',
      badgeBg: 'bg-zinc-800/40',
      badgeText: 'text-zinc-400',
      badgeBorder: 'border-zinc-700/50',
      dotColor: 'bg-zinc-500',
      dotPulse: false,
      icon: FolderGit2,
      description: 'Nenhum repositório GitHub vinculado a este relatório.'
    };
  }

  // 2. Explicit Error or last log was an error
  const lastLog = integration.syncLogs && integration.syncLogs.length > 0 ? integration.syncLogs[0] : null;
  const hasError = integration.syncStatus === 'error' || Boolean(integration.lastSyncError) || (lastLog && lastLog.success === false);

  if (hasError) {
    return {
      status: 'error',
      label: 'GitHub: Erro de Sync',
      badgeBg: 'bg-rose-500/15',
      badgeText: 'text-rose-400',
      badgeBorder: 'border-rose-500/40',
      dotColor: 'bg-rose-400',
      dotPulse: true,
      icon: AlertTriangle,
      description: integration.lastSyncError || (lastLog ? lastLog.details : 'Falha na comunicação ou sincronização com a API do GitHub.')
    };
  }

  // 3. Pending: Linked repo but no issue created yet
  if (!integration.issueNumber) {
    return {
      status: 'pending',
      label: 'GitHub: Issue Pendente',
      badgeBg: 'bg-amber-500/15',
      badgeText: 'text-amber-300',
      badgeBorder: 'border-amber-500/40',
      dotColor: 'bg-amber-400',
      dotPulse: true,
      icon: Clock,
      description: `Repositório ${integration.repoOwner}/${integration.repoName} vinculado, mas a issue ainda não foi criada.`
    };
  }

  // 4. Pending: State misalignment between Platform Report & GitHub Issue
  const reportIsResolved = report.status === 'RESOLVED';
  const issueIsClosed = integration.issueState === 'closed';

  if (reportIsResolved && !issueIsClosed) {
    return {
      status: 'pending',
      label: 'GitHub: Desalinhado (Pendente)',
      badgeBg: 'bg-amber-500/15',
      badgeText: 'text-amber-300',
      badgeBorder: 'border-amber-500/40',
      dotColor: 'bg-amber-400',
      dotPulse: true,
      icon: Clock,
      description: `Relatório marcado como RESOLVED, mas a Issue #${integration.issueNumber} continua aberta no GitHub.`
    };
  }

  if (!reportIsResolved && issueIsClosed) {
    return {
      status: 'pending',
      label: 'GitHub: Desalinhado (Pendente)',
      badgeBg: 'bg-amber-500/15',
      badgeText: 'text-amber-300',
      badgeBorder: 'border-amber-500/40',
      dotColor: 'bg-amber-400',
      dotPulse: true,
      icon: Clock,
      description: `Issue #${integration.issueNumber} fechada no GitHub, mas relatório ainda não marcado como RESOLVED.`
    };
  }

  // 5. If explicitly marked pending
  if (integration.syncStatus === 'pending') {
    return {
      status: 'pending',
      label: 'GitHub: Sincronização Pendente',
      badgeBg: 'bg-amber-500/15',
      badgeText: 'text-amber-300',
      badgeBorder: 'border-amber-500/40',
      dotColor: 'bg-amber-400',
      dotPulse: true,
      icon: Clock,
      description: 'Alterações recentes aguardando confirmação de sincronização com o GitHub.'
    };
  }

  // 6. Synced (States are aligned and healthy)
  const stateLabel = integration.issueState === 'closed' ? 'Fechada/Resolvida' : 'Aberta/Em Progresso';
  return {
    status: 'synced',
    label: 'GitHub: Sincronizado',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/35',
    dotColor: 'bg-emerald-400',
    dotPulse: false,
    icon: CheckCircle2,
    description: `Sincronizado com ${integration.repoOwner}/${integration.repoName} • Issue #${integration.issueNumber} (${stateLabel}).`
  };
}

export const GitHubSyncIndicator: React.FC<GitHubSyncIndicatorProps> = ({
  report,
  variant = 'badge',
  showRepoName = false,
  showIssueNumber = true,
  onSyncClick,
  isSyncing = false,
  className = ''
}) => {
  const syncInfo = getGitHubSyncStatus(report);
  const integration = report.githubIntegration;
  const IconComponent = syncInfo.icon;

  // Dot only variant
  if (variant === 'dot') {
    return (
      <span
        className={`relative inline-flex items-center justify-center ${className}`}
        title={`${syncInfo.label}: ${syncInfo.description}`}
      >
        <span
          className={`w-2 h-2 rounded-full ${syncInfo.dotColor} ${
            syncInfo.dotPulse ? 'animate-pulse' : ''
          }`}
        />
        {syncInfo.dotPulse && (
          <span
            className={`absolute w-3 h-3 rounded-full ${syncInfo.dotColor} opacity-40 animate-ping`}
          />
        )}
      </span>
    );
  }

  // Button chip variant (e.g. inside header action buttons)
  if (variant === 'button-chip') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${syncInfo.badgeBg} ${syncInfo.badgeText} ${syncInfo.badgeBorder} ${className}`}
        title={`${syncInfo.label} — ${syncInfo.description}`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${syncInfo.dotColor} ${
            syncInfo.dotPulse ? 'animate-pulse' : ''
          }`}
        />
        <span>
          {syncInfo.status === 'synced'
            ? 'SYNCED'
            : syncInfo.status === 'pending'
            ? 'PENDING'
            : syncInfo.status === 'error'
            ? 'ERROR'
            : 'UNLINKED'}
        </span>
      </span>
    );
  }

  // Pill variant
  if (variant === 'pill') {
    return (
      <div
        id="github-sync-indicator-pill"
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium border transition-colors ${syncInfo.badgeBg} ${syncInfo.badgeText} ${syncInfo.badgeBorder} ${className}`}
        title={syncInfo.description}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${syncInfo.dotColor} ${
            syncInfo.dotPulse ? 'animate-pulse' : ''
          }`}
        />
        <span className="font-semibold uppercase tracking-wider text-[10px]">
          {syncInfo.status === 'synced' ? 'Synced' : syncInfo.status === 'pending' ? 'Pending' : syncInfo.status === 'error' ? 'Error' : 'Not Linked'}
        </span>
        {showIssueNumber && integration?.issueNumber && (
          <span className="opacity-80 text-[10px] border-l border-current pl-1.5 ml-0.5">
            #{integration.issueNumber}
          </span>
        )}
      </div>
    );
  }

  // Detailed box variant
  if (variant === 'detailed') {
    return (
      <div
        id="github-sync-indicator-detailed"
        className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono transition-all ${syncInfo.badgeBg} ${syncInfo.badgeBorder} ${className}`}
      >
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-[#0c0e14] border border-[#1e2338] text-white shrink-0 relative">
            <IconComponent className={`w-4 h-4 ${syncInfo.badgeText}`} />
            {syncInfo.dotPulse && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>

          <div className="space-y-0.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`font-bold uppercase tracking-wider text-xs ${syncInfo.badgeText}`}>
                {syncInfo.label}
              </span>
              {integration?.issueNumber && (
                <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px] border border-purple-500/30">
                  Issue #{integration.issueNumber}
                </span>
              )}
              {integration?.issueState && (
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold border ${
                    integration.issueState === 'closed'
                      ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {integration.issueState === 'closed' ? 'Fechada' : 'Aberta'}
                </span>
              )}
            </div>

            <p className="text-[11px] text-zinc-300 leading-relaxed truncate max-w-xl">
              {syncInfo.description}
            </p>

            {integration?.lastSyncedAt && (
              <p className="text-[10px] text-zinc-500">
                Última checagem: {new Date(integration.lastSyncedAt).toLocaleTimeString()} ({new Date(integration.lastSyncedAt).toLocaleDateString()})
              </p>
            )}
          </div>
        </div>

        {onSyncClick && syncInfo.status !== 'unlinked' && (
          <button
            type="button"
            onClick={onSyncClick}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1a2032] text-zinc-200 hover:text-white border border-[#22283e] text-xs font-mono transition-colors shrink-0 flex items-center justify-center gap-1.5 disabled:opacity-50 self-start sm:self-auto"
            title="Verificar e sincronizar status com o GitHub agora"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>
        )}
      </div>
    );
  }

  // Default Standard Badge variant
  return (
    <div
      id="github-sync-indicator-badge"
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-mono font-medium border shadow-sm transition-all ${syncInfo.badgeBg} ${syncInfo.badgeText} ${syncInfo.badgeBorder} ${className}`}
      title={`${syncInfo.label} — ${syncInfo.description}`}
    >
      <div className="relative flex items-center justify-center">
        <IconComponent className="w-3.5 h-3.5 shrink-0" />
        {syncInfo.dotPulse && (
          <span className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${syncInfo.dotColor} animate-ping`} />
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="font-bold tracking-tight">
          {syncInfo.status === 'synced'
            ? 'GitHub: Sincronizado'
            : syncInfo.status === 'pending'
            ? 'GitHub: Pendente'
            : syncInfo.status === 'error'
            ? 'GitHub: Erro'
            : 'GitHub: Não Vinculado'}
        </span>

        {showIssueNumber && integration?.issueNumber && (
          <span className="text-[10px] px-1 py-0.2 rounded bg-[#090b10]/60 border border-current/30 text-white font-semibold">
            #{integration.issueNumber}
          </span>
        )}

        {showRepoName && integration?.repoOwner && integration?.repoName && (
          <span className="text-[10px] text-zinc-400 hidden sm:inline max-w-[120px] truncate">
            ({integration.repoOwner}/{integration.repoName})
          </span>
        )}
      </div>
    </div>
  );
};
