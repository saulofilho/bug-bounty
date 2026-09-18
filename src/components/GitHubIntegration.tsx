import React, { useState, useMemo, useEffect } from 'react';
import {
  GitPullRequest,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  Send,
  FileCode,
  Tag,
  ShieldAlert,
  Clock,
  Trash2,
  Copy,
  Check,
  Eye,
  Key,
  FolderGit2,
  Lock,
  Unlock,
  MessageSquare,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Layers
} from 'lucide-react';
import { VulnerabilityReport, ReportStatus, TimelineEvent, GitHubIntegrationData, GitHubSyncLog } from '../types';
import { GitHubSyncIndicator } from './GitHubSyncIndicator';

interface GitHubIntegrationProps {
  report: VulnerabilityReport;
  onUpdateReport?: (updatedReport: VulnerabilityReport) => void;
  onUpdateStatus?: (id: string, newStatus: ReportStatus, bountyAmount?: number) => void;
  onAddTimelineEvent?: (id: string, event: Omit<TimelineEvent, 'id'>) => void;
  className?: string;
  onForceSync?: () => void;
  isForceSyncing?: boolean;
}

const LOCAL_STORAGE_GITHUB_TOKEN_KEY = 'bbm_github_pat_token';
const LOCAL_STORAGE_GITHUB_DEFAULT_REPO = 'bbm_github_default_repo';

const DEFAULT_LABELS = [
  'security',
  'vulnerability',
  'bug-bounty',
  'needs-triage',
  'patch-pending'
];

export const GitHubIntegration: React.FC<GitHubIntegrationProps> = ({
  report,
  onUpdateReport,
  onUpdateStatus,
  onAddTimelineEvent,
  className = '',
  onForceSync,
  isForceSyncing
}) => {
  // Saved Token from localStorage (optional for real API calls)
  const [token, setToken] = useState<string>(() => {
    try {
      return localStorage.getItem(LOCAL_STORAGE_GITHUB_TOKEN_KEY) || '';
    } catch {
      return '';
    }
  });
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [savedTokenSuccess, setSavedTokenSuccess] = useState(false);

  // Repository configuration
  const initialOwner = report.githubIntegration?.repoOwner || '';
  const initialRepo = report.githubIntegration?.repoName || '';

  const [repoInput, setRepoInput] = useState(() => {
    if (initialOwner && initialRepo) return `${initialOwner}/${initialRepo}`;
    try {
      return localStorage.getItem(LOCAL_STORAGE_GITHUB_DEFAULT_REPO) || '';
    } catch {
      return '';
    }
  });

  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMsg, setConnectionMsg] = useState('');

  // Issue Creation Form state
  const [issueTitle, setIssueTitle] = useState(() => {
    return report.githubIntegration?.issueTitle || `[SECURITY] ${report.vulnerabilityType}: ${report.title} (CVSS ${report.cvssScore})`;
  });
  const [selectedLabels, setSelectedLabels] = useState<string[]>(() => {
    const sevLabel = `severity:${report.severity.toLowerCase()}`;
    return report.githubIntegration?.selectedLabels || ['security', 'vulnerability', sevLabel];
  });
  const [customLabelInput, setCustomLabelInput] = useState('');
  const [previewMarkdown, setPreviewMarkdown] = useState(false);
  const [isCreatingIssue, setIsCreatingIssue] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // New Comment state
  const [commentText, setCommentText] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);

  // Integration state from report or local fallback
  const integration: GitHubIntegrationData | undefined = report.githubIntegration;
  const isLinked = Boolean(integration?.repoOwner && integration?.repoName);
  const hasIssue = Boolean(integration?.issueNumber);

  // Save Token Handler
  const handleSaveToken = (newToken: string) => {
    setToken(newToken.trim());
    try {
      localStorage.setItem(LOCAL_STORAGE_GITHUB_TOKEN_KEY, newToken.trim());
      setSavedTokenSuccess(true);
      setTimeout(() => setSavedTokenSuccess(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  // Generate Issue Markdown template
  const generatedIssueMarkdown = useMemo(() => {
    const stepsFormatted = (report.stepsToReproduce && report.stepsToReproduce.length > 0)
      ? report.stepsToReproduce.map((step, idx) => `${idx + 1}. ${step}`).join('\n')
      : '1. Ver detalhes anexados no relatório.';

    return `## 🛡️ Vulnerability Disclosure

**Report ID:** \`${report.id}\`  
**Platform:** ${report.platform}  
**Target:** \`${report.target}\`  
**Severity:** **${report.severity}** (CVSS v3.1: **${report.cvssScore}** - \`${report.cvssVector || 'N/A'}\`)  
**CWE:** ${report.cwe || 'CWE Não especificada'}  
${report.cveIds && report.cveIds.length > 0 ? `**CVEs:** ${report.cveIds.join(', ')}  ` : ''}

---

### 📋 Vulnerability Summary
${report.summary || 'Nenhum resumo fornecido.'}

---

### 🔬 Steps to Reproduce
${stepsFormatted}

---

### 💥 Proof of Concept (PoC)
\`\`\`http
${report.proofOfConcept || '# Nenhuma PoC textual inserida'}
\`\`\`

---

### 🏢 Business Impact Assessment
${report.businessImpact || 'Impacto a ser avaliado pelo time de segurança.'}

---

### 🛠️ Recommended Remediation
${report.remediation || 'Aplicar validação rigorosa de entrada e atualizar dependências.'}

---

*Disclosed via Bug Bounty Manager & Vulnerability Tracker. Respecting Responsible Disclosure guidelines.*`;
  }, [report]);

  // Link Repository to Report
  const handleLinkRepository = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    const cleanInput = repoInput.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
    const parts = cleanInput.split('/');

    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      setConnectionStatus('error');
      setConnectionMsg('Formato inválido. Use "proprietário/repositório" (ex: "acme-corp/api-gateway").');
      return;
    }

    const [owner, repo] = parts;
    setIsConnecting(true);

    try {
      // If token provided, try fetching repo metadata
      if (token) {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json'
          }
        });

        if (!res.ok) {
          throw new Error(`Repositório não encontrado ou sem permissão (HTTP ${res.status}).`);
        }
      }

      // Successful link
      const updatedData: GitHubIntegrationData = {
        repoOwner: owner,
        repoName: repo,
        issueNumber: integration?.issueNumber,
        issueId: integration?.issueId,
        issueUrl: integration?.issueUrl,
        issueTitle: integration?.issueTitle || issueTitle,
        issueState: integration?.issueState || 'open',
        linkedAt: integration?.linkedAt || new Date().toISOString(),
        lastSyncedAt: new Date().toISOString(),
        syncStatus: integration?.issueNumber ? 'synced' : 'pending',
        lastSyncError: undefined,
        autoSyncStatus: integration?.autoSyncStatus ?? true,
        selectedLabels: selectedLabels,
        syncLogs: [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            action: 'Repositório Vinculado',
            details: `Repositório github.com/${owner}/${repo} vinculado com sucesso.`,
            success: true
          },
          ...(integration?.syncLogs || [])
        ]
      };

      try {
        localStorage.setItem(LOCAL_STORAGE_GITHUB_DEFAULT_REPO, `${owner}/${repo}`);
      } catch {}

      if (onUpdateReport) {
        onUpdateReport({
          ...report,
          githubIntegration: updatedData
        });
      }

      if (onAddTimelineEvent) {
        onAddTimelineEvent(report.id, {
          date: new Date().toISOString().split('T')[0],
          title: `Repositório GitHub Vinculado: ${owner}/${repo}`,
          notes: `Vínculo estabelecido com o repositório oficial para acompanhamento de patch.`,
          type: 'status_change',
          authorRole: 'reporter'
        });
      }

      setConnectionStatus('success');
      setConnectionMsg(`Conectado com sucesso a ${owner}/${repo}`);
      setActionSuccessMsg(`Repositório ${owner}/${repo} vinculado ao relatório.`);
    } catch (err: any) {
      setConnectionStatus('error');
      setConnectionMsg(err.message || 'Falha ao conectar com o GitHub.');
      setActionErrorMsg(err.message || 'Erro de conexão.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Unlink Repository
  const handleUnlinkRepository = () => {
    if (!window.confirm('Deseja desvincular o repositório GitHub deste relatório?')) return;

    if (onUpdateReport) {
      onUpdateReport({
        ...report,
        githubIntegration: undefined
      });
    }

    if (onAddTimelineEvent) {
      onAddTimelineEvent(report.id, {
        date: new Date().toISOString().split('T')[0],
        title: `Desvinculado do GitHub`,
        notes: `Vínculo com ${integration?.repoOwner}/${integration?.repoName} removido.`,
        type: 'status_change',
        authorRole: 'reporter'
      });
    }

    setConnectionStatus('idle');
    setConnectionMsg('');
    setActionSuccessMsg('Vínculo com o repositório GitHub removido.');
  };

  // Create GitHub Issue
  const handleCreateIssue = async () => {
    if (!integration?.repoOwner || !integration?.repoName) {
      setActionErrorMsg('Vincule um repositório GitHub antes de criar uma Issue.');
      return;
    }

    setIsCreatingIssue(true);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    const { repoOwner, repoName } = integration;

    try {
      let createdIssueNumber: number;
      let createdIssueUrl: string;
      let createdIssueId: number;

      if (token) {
        // Real GitHub REST API call
        const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: issueTitle,
            body: generatedIssueMarkdown,
            labels: selectedLabels
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Erro ao criar issue no GitHub (HTTP ${response.status}).`);
        }

        const data = await response.json();
        createdIssueNumber = data.number;
        createdIssueUrl = data.html_url;
        createdIssueId = data.id;
      } else {
        // Deterministic Simulation Mode (quando token não é configurado pelo usuário)
        await new Promise((r) => setTimeout(r, 600));
        createdIssueNumber = Math.floor(Math.random() * 80) + 12;
        createdIssueUrl = `https://github.com/${repoOwner}/${repoName}/issues/${createdIssueNumber}`;
        createdIssueId = Date.now();
      }

      const newLog: GitHubSyncLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        action: 'Issue Criada',
        details: `Issue #${createdIssueNumber} criada com sucesso em ${repoOwner}/${repoName}.`,
        success: true
      };

      const updatedIntegration: GitHubIntegrationData = {
        ...integration,
        issueNumber: createdIssueNumber,
        issueId: createdIssueId,
        issueUrl: createdIssueUrl,
        issueTitle: issueTitle,
        issueState: 'open',
        lastSyncedAt: new Date().toISOString(),
        syncStatus: 'synced',
        lastSyncError: undefined,
        selectedLabels: selectedLabels,
        syncLogs: [newLog, ...(integration.syncLogs || [])]
      };

      // Also ensure platform status is at least SUBMITTED or TRIAGED
      const newReportStatus: ReportStatus = report.status === 'DRAFT' ? 'SUBMITTED' : report.status;

      if (onUpdateReport) {
        onUpdateReport({
          ...report,
          status: newReportStatus,
          githubIntegration: updatedIntegration
        });
      }

      if (onAddTimelineEvent) {
        onAddTimelineEvent(report.id, {
          date: new Date().toISOString().split('T')[0],
          title: `GitHub Issue #${createdIssueNumber} Criada`,
          notes: `Issue registrada em ${repoOwner}/${repoName}: ${createdIssueUrl}. Labels: ${selectedLabels.join(', ')}.`,
          type: 'dispatch',
          authorRole: 'reporter'
        });
      }

      setActionSuccessMsg(`Issue #${createdIssueNumber} criada com sucesso no GitHub!`);
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Falha ao criar Issue no GitHub.');
    } finally {
      setIsCreatingIssue(false);
    }
  };

  // Sync Status between Platform & GitHub
  const handleSyncStatus = async () => {
    if (!integration?.repoOwner || !integration?.repoName || !integration?.issueNumber) {
      setActionErrorMsg('Nenhuma Issue do GitHub associada para sincronizar.');
      return;
    }

    setIsSyncing(true);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    const { repoOwner, repoName, issueNumber } = integration;

    try {
      let currentIssueState: 'open' | 'closed' = integration.issueState || 'open';

      if (token) {
        const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json'
          }
        });

        if (!response.ok) {
          throw new Error(`Não foi possível consultar a issue no GitHub (HTTP ${response.status}).`);
        }

        const data = await response.json();
        currentIssueState = data.state === 'closed' ? 'closed' : 'open';
      } else {
        // Local Sync Simulation: align based on current platform status or toggle
        await new Promise((r) => setTimeout(r, 450));
        if (report.status === 'RESOLVED') {
          currentIssueState = 'closed';
        }
      }

      // Determine aligned platform status
      let targetReportStatus = report.status;
      let syncNote = '';

      if (currentIssueState === 'closed' && report.status !== 'RESOLVED') {
        targetReportStatus = 'RESOLVED';
        syncNote = `Issue #${issueNumber} foi fechada no GitHub. Status do relatório atualizado para RESOLVED.`;
        if (onUpdateStatus) {
          onUpdateStatus(report.id, 'RESOLVED');
        }
      } else if (currentIssueState === 'open' && report.status === 'RESOLVED') {
        syncNote = `Aviso: Issue #${issueNumber} permanece aberta no GitHub enquanto o relatório está RESOLVED.`;
      } else {
        syncNote = `Status em sincronia: GitHub Issue #${issueNumber} está ${currentIssueState.toUpperCase()}.`;
      }

      const newLog: GitHubSyncLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        action: 'Sincronização de Status',
        details: syncNote,
        success: true
      };

      const updatedIntegration: GitHubIntegrationData = {
        ...integration,
        issueState: currentIssueState,
        lastSyncedAt: new Date().toISOString(),
        syncStatus: 'synced',
        lastSyncError: undefined,
        syncLogs: [newLog, ...(integration.syncLogs || [])]
      };

      if (onUpdateReport) {
        onUpdateReport({
          ...report,
          status: targetReportStatus,
          githubIntegration: updatedIntegration
        });
      }

      if (onAddTimelineEvent) {
        onAddTimelineEvent(report.id, {
          date: new Date().toISOString().split('T')[0],
          title: `Sincronização GitHub: Issue #${issueNumber}`,
          notes: syncNote,
          type: 'status_change',
          authorRole: 'system'
        });
      }

      setActionSuccessMsg(`Sincronização concluída! Issue #${issueNumber} está ${currentIssueState.toUpperCase()}.`);
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao sincronizar status com o GitHub.';
      const errorLog: GitHubSyncLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        action: 'Erro de Sincronização',
        details: errorMsg,
        success: false
      };

      if (onUpdateReport && integration) {
        onUpdateReport({
          ...report,
          githubIntegration: {
            ...integration,
            syncStatus: 'error',
            lastSyncError: errorMsg,
            syncLogs: [errorLog, ...(integration.syncLogs || [])]
          }
        });
      }

      setActionErrorMsg(errorMsg);
    } finally {
      setIsSyncing(false);
    }
  };

  // Toggle GitHub Issue State (Close / Reopen from Platform)
  const handleToggleIssueState = async (newState: 'open' | 'closed') => {
    if (!integration?.repoOwner || !integration?.repoName || !integration?.issueNumber) return;

    setIsSyncing(true);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    const { repoOwner, repoName, issueNumber } = integration;

    try {
      if (token) {
        const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ state: newState })
        });

        if (!response.ok) {
          throw new Error(`Falha ao alterar estado da issue (HTTP ${response.status}).`);
        }
      } else {
        await new Promise((r) => setTimeout(r, 400));
      }

      const actionText = newState === 'closed' ? 'Fechada' : 'Reaberta';
      const newLog: GitHubSyncLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        action: `Issue ${actionText}`,
        details: `Issue #${issueNumber} foi ${actionText.toLowerCase()} diretamente pela plataforma.`,
        success: true
      };

      const updatedIntegration: GitHubIntegrationData = {
        ...integration,
        issueState: newState,
        lastSyncedAt: new Date().toISOString(),
        syncStatus: 'synced',
        lastSyncError: undefined,
        syncLogs: [newLog, ...(integration.syncLogs || [])]
      };

      // If closing issue, also align report status to RESOLVED
      const newReportStatus = newState === 'closed' ? 'RESOLVED' : (report.status === 'RESOLVED' ? 'TRIAGED' : report.status);

      if (onUpdateReport) {
        onUpdateReport({
          ...report,
          status: newReportStatus,
          githubIntegration: updatedIntegration
        });
      }

      if (onAddTimelineEvent) {
        onAddTimelineEvent(report.id, {
          date: new Date().toISOString().split('T')[0],
          title: `GitHub Issue #${issueNumber} ${actionText}`,
          notes: `Estado da issue alterado para ${newState}. Relatório sincronizado para ${newReportStatus}.`,
          type: 'status_change',
          authorRole: 'reporter'
        });
      }

      setActionSuccessMsg(`Issue #${issueNumber} foi ${actionText.toLowerCase()} com sucesso!`);
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Erro ao alterar estado da issue.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Add Comment to Issue
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !integration?.repoOwner || !integration?.repoName || !integration?.issueNumber) return;

    setIsSendingComment(true);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    const { repoOwner, repoName, issueNumber } = integration;

    try {
      if (token) {
        const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}/comments`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ body: commentText.trim() })
        });

        if (!response.ok) {
          throw new Error(`Erro ao enviar comentário (HTTP ${response.status}).`);
        }
      } else {
        await new Promise((r) => setTimeout(r, 400));
      }

      const newLog: GitHubSyncLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        action: 'Comentário Enviado',
        details: `Comentário postado na Issue #${issueNumber}: "${commentText.slice(0, 60)}..."`,
        success: true
      };

      const updatedIntegration: GitHubIntegrationData = {
        ...integration,
        lastSyncedAt: new Date().toISOString(),
        syncLogs: [newLog, ...(integration.syncLogs || [])]
      };

      if (onUpdateReport) {
        onUpdateReport({
          ...report,
          githubIntegration: updatedIntegration
        });
      }

      setCommentText('');
      setActionSuccessMsg('Comentário publicado na Issue do GitHub!');
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Falha ao enviar comentário.');
    } finally {
      setIsSendingComment(false);
    }
  };

  // Label toggle
  const toggleLabel = (lbl: string) => {
    setSelectedLabels((prev) =>
      prev.includes(lbl) ? prev.filter((l) => l !== lbl) : [...prev, lbl]
    );
  };

  const handleAddCustomLabel = () => {
    if (!customLabelInput.trim()) return;
    const clean = customLabelInput.trim().toLowerCase();
    if (!selectedLabels.includes(clean)) {
      setSelectedLabels((prev) => [...prev, clean]);
    }
    setCustomLabelInput('');
  };

  const handleCopyIssueUrl = () => {
    if (!integration?.issueUrl) return;
    navigator.clipboard.writeText(integration.issueUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div
      id="github-integration-component"
      className={`rounded-2xl bg-[#0c0e14] border border-[#1e2338] shadow-2xl overflow-hidden font-sans ${className}`}
    >
      {/* Header Banner */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-[#101422] via-[#0d101c] to-[#0a0d16] border-b border-[#1e2338]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0 shadow-sm">
                <FolderGit2 className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white font-mono uppercase tracking-wide flex items-center gap-2">
                <span>Integração GitHub</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 normal-case font-sans">
                  Issues & Sincronização
                </span>
              </h2>
            </div>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              Vincule este relatório de vulnerabilidade a um repositório no GitHub para criar Issues automaticamente,
              acompanhar o status de remediação do time de engenharia e manter o ciclo de vida sincronizado.
            </p>
          </div>

          {/* Quick Actions & Token Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowTokenInput(!showTokenInput)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border flex items-center gap-1.5 ${
                token
                  ? 'bg-[#141824] text-emerald-400 border-emerald-500/30 hover:bg-[#1a2032]'
                  : 'bg-[#141824] text-zinc-400 border-[#22283e] hover:text-zinc-200'
              }`}
              title="Configurar GitHub Personal Access Token (PAT)"
            >
              <Key className="w-3.5 h-3.5 text-purple-400" />
              <span>{token ? 'PAT Configurado' : 'Configurar Token'}</span>
            </button>

            {isLinked && (
              <button
                type="button"
                onClick={handleUnlinkRepository}
                className="px-2.5 py-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 border border-rose-800/40 text-xs font-mono transition-all flex items-center gap-1"
                title="Desvincular repositório"
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden md:inline">Desvincular</span>
              </button>
            )}
          </div>
        </div>

        {/* GitHub PAT Token Configuration Drawer */}
        {showTokenInput && (
          <div className="mt-4 p-4 rounded-xl bg-[#090b10] border border-[#22283e] space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-purple-400" />
                GitHub Personal Access Token (PAT)
              </span>
              <span className="text-[11px] text-zinc-500">Escopo necessário: <code className="text-purple-300">repo</code></span>
            </div>

            <div className="flex gap-2">
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="flex-1 bg-[#141824] text-zinc-200 border border-[#22283e] rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-purple-500/50 placeholder-zinc-600"
              />
              <button
                type="button"
                onClick={() => handleSaveToken(token)}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5"
              >
                {savedTokenSuccess ? <Check className="w-3.5 h-3.5" /> : null}
                <span>{savedTokenSuccess ? 'Salvo!' : 'Salvar Token'}</span>
              </button>
            </div>
            <p className="text-[11px] text-zinc-400">
              O token é armazenado com segurança apenas no seu navegador (<code className="text-zinc-300">localStorage</code>). Se não fornecer um token, a integração funcionará em <strong>Modo Simulado</strong> completo.
            </p>
          </div>
        )}
      </div>

      {/* Action Messages (Alerts) */}
      {actionSuccessMsg && (
        <div className="px-6 py-2.5 bg-emerald-950/30 border-b border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {actionSuccessMsg}
          </span>
          <button type="button" onClick={() => setActionSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-300">✕</button>
        </div>
      )}

      {actionErrorMsg && (
        <div className="px-6 py-2.5 bg-rose-950/30 border-b border-rose-500/30 text-rose-300 text-xs font-mono flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            {actionErrorMsg}
          </span>
          <button type="button" onClick={() => setActionErrorMsg(null)} className="text-rose-500 hover:text-rose-300">✕</button>
        </div>
      )}

      {/* Main Body Grid */}
      <div className="p-5 sm:p-6 space-y-6">

        {/* Real-time GitHub Sync Status Overview */}
        <GitHubSyncIndicator
          report={report}
          variant="detailed"
          onSyncClick={onForceSync || (isLinked && integration?.issueNumber ? handleSyncStatus : undefined)}
          isSyncing={isForceSyncing ?? isSyncing}
        />

        {/* STEP 1: Repository Linking Form */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#090b10] border border-[#1e2338] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wider flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-purple-400" />
              1. Repositório de Destino
            </span>
            {isLinked && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                VINCULADO
              </span>
            )}
          </div>

          <form onSubmit={handleLinkRepository} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 text-xs font-mono">
                github.com/
              </div>
              <input
                type="text"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="ex: organizacao/repositorio-alvo"
                className="w-full bg-[#141824] text-zinc-200 border border-[#22283e] rounded-lg pl-28 pr-3 py-2 text-xs font-mono focus:outline-none focus:border-purple-500/50"
              />
            </div>

            <button
              type="submit"
              disabled={isConnecting || !repoInput.trim()}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-mono text-xs font-bold transition-colors shrink-0 flex items-center justify-center gap-2"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Conectando...</span>
                </>
              ) : (
                <>
                  <FolderGit2 className="w-3.5 h-3.5" />
                  <span>{isLinked ? 'Atualizar Vínculo' : 'Vincular Repositório'}</span>
                </>
              )}
            </button>
          </form>

          {connectionMsg && (
            <div className={`text-[11px] font-mono flex items-center gap-1.5 ${
              connectionStatus === 'success' ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {connectionStatus === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              <span>{connectionMsg}</span>
            </div>
          )}
        </div>

        {/* STEP 2: Issue Status & Syncing Bar (If Linked) */}
        {isLinked && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Left Box: Issue State Card */}
            <div className="md:col-span-6 p-4 sm:p-5 rounded-xl bg-[#090b10] border border-[#1e2338] space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#1e2338]">
                  <span className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wider flex items-center gap-2">
                    <GitPullRequest className="w-4 h-4 text-cyan-400" />
                    Status da Issue
                  </span>
                  {hasIssue && (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                        integration?.issueState === 'closed'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {integration?.issueState === 'closed' ? 'FECHADA (RESOLVIDA)' : 'ABERTA (EM PROGRESSO)'}
                    </span>
                  )}
                </div>

                {hasIssue ? (
                  <div className="pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <a
                        href={integration?.issueUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-bold font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 truncate max-w-[280px]"
                        title="Abrir issue no GitHub"
                      >
                        <span>Issue #{integration?.issueNumber}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>
                      <button
                        type="button"
                        onClick={handleCopyIssueUrl}
                        className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1 p-1 rounded bg-[#141824] border border-[#22283e]"
                      >
                        {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedUrl ? 'Copiado' : 'Link'}</span>
                      </button>
                    </div>

                    <p className="text-xs text-zinc-300 line-clamp-2">
                      {integration?.issueTitle || issueTitle}
                    </p>

                    <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-2 pt-1">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      <span>Última sincronização: {integration?.lastSyncedAt ? new Date(integration.lastSyncedAt).toLocaleTimeString() : 'Nunca'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 text-xs text-zinc-400 space-y-1">
                    <p>Nenhuma issue foi criada ainda para este relatório no repositório <strong className="text-zinc-200">{integration?.repoOwner}/{integration?.repoName}</strong>.</p>
                    <p className="text-[11px] text-zinc-500">Configure os parâmetros abaixo e clique em &quot;Criar Issue no GitHub&quot;.</p>
                  </div>
                )}
              </div>

              {/* Status Actions */}
              {hasIssue && (
                <div className="pt-3 border-t border-[#1e2338] flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onForceSync || handleSyncStatus}
                    disabled={isForceSyncing || isSyncing}
                    className="px-3.5 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 hover:text-white border border-purple-500/40 text-xs font-mono font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm cursor-pointer"
                    title="Forçar re-sincronização imediata de detalhes e reconciliar status com o GitHub"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${(isForceSyncing || isSyncing) ? 'animate-spin' : ''}`} />
                    <span>{(isForceSyncing || isSyncing) ? 'Sincronizando...' : 'Forçar Sync'}</span>
                  </button>

                  {integration?.issueState === 'open' ? (
                    <button
                      type="button"
                      onClick={() => handleToggleIssueState('closed')}
                      disabled={isSyncing}
                      className="px-3 py-1.5 rounded-lg bg-purple-950/30 hover:bg-purple-900/40 text-purple-300 border border-purple-800/40 text-xs font-mono transition-all flex items-center gap-1.5"
                      title="Fechar issue no GitHub e marcar relatório como RESOLVED"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                      <span>Fechar Issue (Patch Aplicado)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleIssueState('open')}
                      disabled={isSyncing}
                      className="px-3 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1a2032] text-zinc-300 border border-[#22283e] text-xs font-mono transition-all flex items-center gap-1.5"
                      title="Reabrir issue no GitHub"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Reabrir Issue</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right Box: Status Mapping Guide */}
            <div className="md:col-span-6 p-4 sm:p-5 rounded-xl bg-[#090b10] border border-[#1e2338] space-y-3">
              <span className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wider block">
                Mapeamento de Ciclo de Vida
              </span>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0e121c] border border-[#181d2f]">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[10px] font-bold">SUBMITTED / TRIAGED</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">GitHub Issue: OPEN</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0e121c] border border-[#181d2f]">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">RESOLVED</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 text-[10px] font-bold">GitHub Issue: CLOSED</span>
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0d101a] border border-[#181d2f] text-[11px] text-zinc-400 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <p>
                  Quando os desenvolvedores fecharem a Issue no GitHub após o merge do pull request, clique em <strong>Sincronizar Agora</strong> para atualizar o relatório automaticamente para <strong>RESOLVED</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Create Issue Section (If Linked and no issue yet, or updating) */}
        {isLinked && !hasIssue && (
          <div className="p-4 sm:p-5 rounded-xl bg-[#090b10] border border-[#1e2338] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2338]">
              <span className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                2. Criar Issue no Repositório
              </span>
              <button
                type="button"
                onClick={() => setPreviewMarkdown(!previewMarkdown)}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{previewMarkdown ? 'Editar Campos' : 'Pré-visualizar Markdown'}</span>
              </button>
            </div>

            {previewMarkdown ? (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-[#06080e] border border-[#161b2c] text-xs font-mono text-zinc-300 whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed">
                  {generatedIssueMarkdown}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setPreviewMarkdown(false)}
                    className="px-3 py-1.5 rounded-lg bg-[#141824] text-zinc-300 text-xs font-mono hover:text-white"
                  >
                    Voltar à Edição
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-zinc-400 mb-1 text-xs font-mono">Título da Issue:</label>
                  <input
                    type="text"
                    value={issueTitle}
                    onChange={(e) => setIssueTitle(e.target.value)}
                    className="w-full bg-[#141824] text-zinc-200 border border-[#22283e] rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-purple-500/50"
                  />
                </div>

                {/* Labels Selector */}
                <div>
                  <label className="block text-zinc-400 mb-1 text-xs font-mono">Labels / Tags do GitHub:</label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {DEFAULT_LABELS.map((lbl) => {
                      const isSelected = selectedLabels.includes(lbl);
                      return (
                        <button
                          key={lbl}
                          type="button"
                          onClick={() => toggleLabel(lbl)}
                          className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all border ${
                            isSelected
                              ? 'bg-purple-600 text-white border-purple-500'
                              : 'bg-[#141824] text-zinc-400 border-[#22283e] hover:text-zinc-200'
                          }`}
                        >
                          {lbl}
                        </button>
                      );
                    })}

                    {/* Custom label input */}
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={customLabelInput}
                        onChange={(e) => setCustomLabelInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomLabel();
                          }
                        }}
                        placeholder="+ Nova label"
                        className="w-24 bg-[#141824] text-zinc-200 border border-[#22283e] rounded-md px-2 py-1 text-xs font-mono focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Create Button */}
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-zinc-500">
                    A issue conterá CVSS ({report.cvssScore}), passos de reprodução, PoC e instruções de correção.
                  </span>

                  <button
                    type="button"
                    onClick={handleCreateIssue}
                    disabled={isCreatingIssue}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono text-xs font-bold transition-colors flex items-center gap-2"
                  >
                    {isCreatingIssue ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Publicando Issue...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Criar Issue no GitHub</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Send Comment to Issue (If Issue Exists) */}
        {hasIssue && (
          <div className="p-4 sm:p-5 rounded-xl bg-[#090b10] border border-[#1e2338] space-y-3">
            <span className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              Adicionar Comentário na Issue #{integration?.issueNumber}
            </span>

            <form onSubmit={handleAddComment} className="space-y-3">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Ex: Reteste concluído no ambiente de staging: a falha foi devidamente mitigada."
                rows={2}
                className="w-full bg-[#141824] text-zinc-200 border border-[#22283e] rounded-lg p-3 text-xs font-mono focus:outline-none focus:border-purple-500/50 placeholder-zinc-600"
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSendingComment || !commentText.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-mono text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  {isSendingComment ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Enviar Comentário</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 5: Sync Logs / Audit Trail */}
        {integration?.syncLogs && integration.syncLogs.length > 0 && (
          <div className="p-4 sm:p-5 rounded-xl bg-[#090b10] border border-[#1e2338] space-y-3">
            <span className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Histórico de Sincronizações com o GitHub
            </span>

            <div className="space-y-2 max-h-48 overflow-y-auto font-mono text-xs">
              {integration.syncLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-lg bg-[#05070a] border border-[#161b2c] flex items-center justify-between text-zinc-400"
                >
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">{log.action}</span>
                      <span className="text-[10px] text-zinc-500">[{log.timestamp}]</span>
                    </div>
                    <p className="text-[11px] text-zinc-300 truncate">{log.details}</p>
                  </div>

                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    Sucesso
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
