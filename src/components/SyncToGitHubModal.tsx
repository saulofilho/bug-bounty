import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderGit2,
  X,
  Key,
  Check,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Tag,
  FileText,
  Settings,
  ArrowRight,
  Shield,
  Eye,
  EyeOff,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { VulnerabilityReport, GitHubIntegrationData, GitHubSyncLog } from '../types';
import {
  LOCAL_STORAGE_GITHUB_TOKEN_KEY,
  LOCAL_STORAGE_GITHUB_DEFAULT_REPO,
  LOCAL_STORAGE_GITHUB_DEFAULT_LABELS
} from './SettingsModal';
import { recordPlatformApiCall } from '../utils/apiRateLimiter';

export interface SyncToGitHubModalProps {
  report: VulnerabilityReport;
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onUpdateReport?: (report: VulnerabilityReport) => void;
  onAddTimelineEvent?: (reportId: string, event: any) => void;
}

export const SyncToGitHubModal: React.FC<SyncToGitHubModalProps> = ({
  report,
  isOpen,
  onClose,
  onOpenSettings,
  onUpdateReport,
  onAddTimelineEvent
}) => {
  // Token state from settings
  const [token, setToken] = useState<string>('');
  const [hasToken, setHasToken] = useState<boolean>(false);

  // Quick inline token entry if user wants to set it right here
  const [inlineTokenInput, setInlineTokenInput] = useState('');
  const [showInlineToken, setShowInlineToken] = useState(false);
  const [inlineSaveSuccess, setInlineSaveSuccess] = useState(false);

  // Target Repository State
  const [repoInput, setRepoInput] = useState('');
  const [repoError, setRepoError] = useState<string | null>(null);

  // Issue customization state
  const [issueTitle, setIssueTitle] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [newLabelInput, setNewLabelInput] = useState('');
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);

  // API Execution State
  const [isSyncing, setIsSyncing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [syncSuccessResult, setSyncSuccessResult] = useState<{
    issueNumber: number;
    issueUrl: string;
    issueTitle: string;
    repo: string;
  } | null>(null);

  // Load token and initialize values on open
  useEffect(() => {
    if (isOpen) {
      try {
        const savedToken = localStorage.getItem(LOCAL_STORAGE_GITHUB_TOKEN_KEY) || '';
        setToken(savedToken.trim());
        setHasToken(Boolean(savedToken.trim()));
        setInlineTokenInput(savedToken.trim());

        // Prioritize:
        // 1. Report's linked GitHub integration
        // 2. Settings default repo
        // 3. Report target if it resembles owner/repo
        let initialRepo = '';
        if (report.githubIntegration?.repoOwner && report.githubIntegration?.repoName) {
          initialRepo = `${report.githubIntegration.repoOwner}/${report.githubIntegration.repoName}`;
        } else {
          const defaultRepo = localStorage.getItem(LOCAL_STORAGE_GITHUB_DEFAULT_REPO) || '';
          if (defaultRepo) {
            initialRepo = defaultRepo;
          } else if (report.target && report.target.includes('/') && !report.target.includes(' ')) {
            initialRepo = report.target.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
          }
        }
        setRepoInput(initialRepo);

        // Default Title
        const defaultTitle = report.githubIntegration?.issueTitle ||
          `[SECURITY] ${report.vulnerabilityType}: ${report.title} (CVSS ${report.cvssScore})`;
        setIssueTitle(defaultTitle);

        // Labels
        const savedDefaultLabels = localStorage.getItem(LOCAL_STORAGE_GITHUB_DEFAULT_LABELS) || 'security, vulnerability, bug-bounty';
        const parsedLabels = savedDefaultLabels.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        const sevLabel = `severity:${report.severity.toLowerCase()}`;
        if (!parsedLabels.includes(sevLabel)) parsedLabels.push(sevLabel);
        
        setSelectedLabels(report.githubIntegration?.selectedLabels || parsedLabels);

        // Reset error / success
        setApiError(null);
        setRepoError(null);
        setSyncSuccessResult(null);
        setShowMarkdownPreview(false);
      } catch (err) {
        console.error('Error initializing SyncToGitHubModal:', err);
      }
    }
  }, [isOpen, report]);

  // Generate Issue Markdown
  const issueMarkdown = useMemo(() => {
    const stepsFormatted = (report.stepsToReproduce && report.stepsToReproduce.length > 0)
      ? report.stepsToReproduce.map((step, idx) => `${idx + 1}. ${step}`).join('\n')
      : '1. Ver detalhes anexados no relatório original.';

    return `## 🛡️ Vulnerability Disclosure Report

**Report ID:** \`${report.id}\`  
**Platform:** ${report.platform}  
**Target:** \`${report.target}\`  
**Severity:** **${report.severity}** (CVSS v3.1: **${report.cvssScore}** - \`${report.cvssVector || 'N/A'}\`)  
**Vulnerability Type:** ${report.vulnerabilityType}  
**CWE:** ${report.cwe || 'CWE Não especificada'}  
${report.cveIds && report.cveIds.length > 0 ? `**CVEs:** ${report.cveIds.join(', ')}  ` : ''}

---

### 📋 Summary
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
${report.businessImpact || 'Impacto a ser avaliado pelo time de segurança e engenharia.'}

---

### 🛠️ Recommended Remediation
${report.remediation || 'Aplicar validação rigorosa de entrada, princípio de menor privilégio e atualização de dependências afetadas.'}

---

*Disclosed via Bug Bounty Manager & Vulnerability Tracker. Respecting Responsible Disclosure guidelines.*`;
  }, [report]);

  if (!isOpen) return null;

  // Handle saving token inline directly in this modal
  const handleSaveInlineToken = () => {
    const clean = inlineTokenInput.trim();
    if (!clean) {
      setApiError('Por favor, digite ou cole um token válido.');
      return;
    }

    try {
      localStorage.setItem(LOCAL_STORAGE_GITHUB_TOKEN_KEY, clean);
      setToken(clean);
      setHasToken(true);
      setApiError(null);
      setInlineSaveSuccess(true);
      setTimeout(() => setInlineSaveSuccess(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  // Add Label
  const handleAddLabel = () => {
    const clean = newLabelInput.trim().toLowerCase();
    if (clean && !selectedLabels.includes(clean)) {
      setSelectedLabels(prev => [...prev, clean]);
      setNewLabelInput('');
    }
  };

  // Remove Label
  const handleRemoveLabel = (lbl: string) => {
    setSelectedLabels(prev => prev.filter(l => l !== lbl));
  };

  // Perform Real GitHub API Issue Creation
  const handleExecuteSync = async () => {
    setApiError(null);
    setRepoError(null);

    // 1. Verify token
    const currentToken = token.trim();
    if (!currentToken) {
      setApiError('Configuração de Token obrigatória: configure seu Personal Access Token nas configurações para prosseguir com a sincronização via GitHub API.');
      return;
    }

    // 2. Validate repository format: owner/repo
    const cleanRepo = repoInput.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
    const parts = cleanRepo.split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      setRepoError('Formato de repositório inválido. Use o padrão "proprietario/repositorio" (ex: "acme-corp/api-gateway").');
      return;
    }

    const [owner, repo] = parts;

    // 3. Validate title
    if (!issueTitle.trim()) {
      setApiError('O título da Issue não pode estar vazio.');
      return;
    }

    setIsSyncing(true);
    const requestStartTime = performance.now();

    try {
      // POST https://api.github.com/repos/{owner}/{repo}/issues
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${currentToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: issueTitle.trim(),
          body: issueMarkdown,
          labels: selectedLabels
        })
      });

      const latencyMs = Math.round(performance.now() - requestStartTime);

      recordPlatformApiCall({
        serviceId: 'github',
        serviceName: 'GitHub REST API',
        endpoint: `/repos/${owner}/${repo}/issues`,
        method: 'POST',
        status: response.status,
        latencyMs,
        cost: 1,
        responseSummary: response.ok
          ? `Issue criada no repositório ${owner}/${repo}`
          : `Erro HTTP ${response.status} ao criar issue em ${owner}/${repo}`,
        isError: !response.ok,
        isThrottled: response.status === 429
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('Falha de Autenticação (401 Bad Credentials): O token configurado nas definições é inválido ou expirou. Por favor, reconfigure seu token.');
        } else if (response.status === 404) {
          throw new Error(`Repositório não encontrado (404 Not Found): Verifique se "${owner}/${repo}" existe e se o token possui permissão de leitura/escrita no escopo "repo".`);
        } else if (response.status === 403) {
          throw new Error(`Acesso Negado (403 Forbidden): Limite de requisições excedido ou escopo insuficiente no token. Mensagem: ${errorData.message || 'Sem permissão'}.`);
        } else {
          throw new Error(errorData.message || `Erro da API do GitHub (HTTP ${response.status}).`);
        }
      }

      const data = await response.json();

      // Create sync log
      const newLog: GitHubSyncLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        action: 'Issue Criada via API',
        details: `Issue #${data.number} criada com sucesso em ${owner}/${repo} via GitHub REST API.`,
        success: true
      };

      // Build updated GitHub integration
      const updatedIntegration: GitHubIntegrationData = {
        repoOwner: owner,
        repoName: repo,
        issueNumber: data.number,
        issueId: data.id,
        issueUrl: data.html_url,
        issueTitle: issueTitle.trim(),
        issueState: 'open',
        linkedAt: report.githubIntegration?.linkedAt || new Date().toISOString(),
        lastSyncedAt: new Date().toISOString(),
        syncStatus: 'synced',
        lastSyncError: undefined,
        autoSyncStatus: true,
        selectedLabels: selectedLabels,
        syncLogs: [newLog, ...(report.githubIntegration?.syncLogs || [])]
      };

      // Save repository as default for convenience
      try {
        localStorage.setItem(LOCAL_STORAGE_GITHUB_DEFAULT_REPO, `${owner}/${repo}`);
      } catch {}

      // Update Report in parent state
      if (onUpdateReport) {
        onUpdateReport({
          ...report,
          status: report.status === 'DRAFT' ? 'SUBMITTED' : report.status,
          githubIntegration: updatedIntegration
        });
      }

      // Add timeline event
      if (onAddTimelineEvent) {
        onAddTimelineEvent(report.id, {
          date: new Date().toISOString().split('T')[0],
          title: `Sincronizado no GitHub: Issue #${data.number}`,
          notes: `Relatório sincronizado via GitHub API no repositório ${owner}/${repo}. URL: ${data.html_url}`,
          type: 'dispatch',
          authorRole: 'system'
        });
      }

      setSyncSuccessResult({
        issueNumber: data.number,
        issueUrl: data.html_url,
        issueTitle: data.title || issueTitle,
        repo: `${owner}/${repo}`
      });
    } catch (err: any) {
      console.error('GitHub API Sync Error:', err);
      setApiError(err.message || 'Falha ao sincronizar relatório com o GitHub via API.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto font-sans">
      <div className="relative w-full max-w-2xl bg-[#0c0e14] border border-[#1e2338] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#101422] via-[#0d101c] to-[#0a0d16] border-b border-[#1e2338]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0 shadow-sm">
                <FolderGit2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white font-mono uppercase tracking-wide flex items-center gap-2">
                  <span>Sincronizar no GitHub</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 normal-case font-sans">
                    GitHub REST API
                  </span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Crie uma nova Issue técnica diretamente no repositório de engenharia com todas as informações deste achado.
                </p>
              </div>
            </div>

            <button
              type="button"
              id="btn-close-sync-github-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
              title="Fechar janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          
          {/* SUCCESS VIEW */}
          {syncSuccessResult ? (
            <div className="space-y-5 py-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/40">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white font-mono">
                  Relatório Sincronizado com Sucesso!
                </h3>
                <p className="text-xs text-zinc-300 max-w-md mx-auto leading-relaxed">
                  A nova Issue <strong className="text-emerald-400 font-mono">#{syncSuccessResult.issueNumber}</strong> foi registrada no repositório <strong className="text-white font-mono">{syncSuccessResult.repo}</strong> através da GitHub API.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#090b10] border border-[#1e2338] text-left space-y-2 max-w-md mx-auto text-xs font-mono">
                <div className="text-zinc-400 text-[11px]">Detalhes da Issue Criada:</div>
                <div className="text-white font-semibold line-clamp-2">{syncSuccessResult.issueTitle}</div>
                <div className="text-zinc-400 text-[11px] pt-1 border-t border-[#1a1f30] flex items-center justify-between">
                  <span>Status: <strong className="text-emerald-400">OPEN</strong></span>
                  <span>Sincronização: <strong className="text-purple-300">100% ATIVA</strong></span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <a
                  href={syncSuccessResult.issueUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  id="btn-open-created-github-issue"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-all shadow-md shadow-purple-950/50"
                >
                  <span>Abrir Issue #{syncSuccessResult.issueNumber} no GitHub</span>
                  <ExternalLink className="w-4 h-4" />
                </a>

                <button
                  type="button"
                  id="btn-dismiss-success-sync"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#141824] hover:bg-[#1a2032] text-zinc-300 hover:text-white border border-[#20273d] text-xs font-mono transition-colors"
                >
                  Concluir e Fechar
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* REQUIREMENT CHECK: TOKEN CONFIGURATION */}
              {!hasToken ? (
                <div
                  id="card-token-required-warning"
                  className="p-4 sm:p-5 rounded-xl bg-amber-950/20 border border-amber-500/40 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                      <Key className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs sm:text-sm font-bold text-amber-200 font-mono flex items-center gap-2">
                        <span>Configuração de Token Obrigatória</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                          GitHub API
                        </span>
                      </h4>
                      <p className="text-xs text-amber-200/80 leading-relaxed">
                        Para sincronizar este relatório diretamente como uma nova Issue no GitHub utilizando a GitHub API, é necessário configurar seu Personal Access Token (PAT) nas configurações.
                      </p>
                    </div>
                  </div>

                  {/* Inline Token Quick-Entry Form */}
                  <div className="p-3.5 rounded-lg bg-[#090b10] border border-[#23283c] space-y-2 mt-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                      <span>Inserir PAT agora para salvar nas configurações:</span>
                      <button
                        type="button"
                        id="btn-open-full-settings-from-sync"
                        onClick={() => {
                          onOpenSettings();
                        }}
                        className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-1 font-semibold"
                      >
                        <Settings className="w-3 h-3" />
                        <span>Abrir Configurações Completas</span>
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showInlineToken ? 'text' : 'password'}
                          id="input-inline-sync-token"
                          value={inlineTokenInput}
                          onChange={(e) => setInlineTokenInput(e.target.value)}
                          placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          className="w-full bg-[#121624] text-zinc-100 border border-[#22283e] focus:border-purple-500/70 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none placeholder-zinc-600 pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowInlineToken(!showInlineToken)}
                          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-zinc-500 hover:text-zinc-200"
                          title={showInlineToken ? 'Ocultar' : 'Mostrar'}
                        >
                          {showInlineToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <button
                        type="button"
                        id="btn-save-inline-token"
                        onClick={handleSaveInlineToken}
                        disabled={!inlineTokenInput.trim()}
                        className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-all disabled:opacity-40 shrink-0 flex items-center gap-1.5"
                      >
                        {inlineSaveSuccess ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : null}
                        <span>{inlineSaveSuccess ? 'Salvo!' : 'Salvar Token'}</span>
                      </button>
                    </div>

                    <p className="text-[10px] text-zinc-500 font-mono">
                      O token requer a permissão com escopo <code className="text-purple-300">repo</code> e será salvo de forma segura no seu navegador.
                    </p>
                  </div>
                </div>
              ) : (
                /* Token is active badge */
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#090b10] border border-[#1e2338] text-xs font-mono">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <Key className="w-3.5 h-3.5 text-purple-400" />
                    <span>Token do GitHub: <strong className="text-emerald-400">Configurado nas Configurações</strong></span>
                  </div>
                  <button
                    type="button"
                    id="btn-change-token-settings"
                    onClick={onOpenSettings}
                    className="text-purple-400 hover:text-purple-300 text-[11px] flex items-center gap-1 hover:underline"
                  >
                    <Settings className="w-3 h-3" />
                    <span>Gerenciar nas Configurações</span>
                  </button>
                </div>
              )}

              {/* Alert Error Banner */}
              {apiError && (
                <div
                  id="sync-api-error-alert"
                  className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs font-mono space-y-2 animate-in fade-in"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-semibold">{apiError}</span>
                      {apiError.includes('401') && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={onOpenSettings}
                            className="px-2 py-1 rounded bg-rose-900/40 hover:bg-rose-900/60 text-rose-200 border border-rose-700/50 text-[11px] font-bold flex items-center gap-1"
                          >
                            <Settings className="w-3 h-3" />
                            <span>Abrir Configurações para Corrigir Token</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Target Repository Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-zinc-300 font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FolderGit2 className="w-3.5 h-3.5 text-purple-400" />
                    Repositório de Destino
                  </span>
                  <span className="text-[11px] text-zinc-500">Padrão: <code>proprietário/repositório</code></span>
                </label>
                <input
                  type="text"
                  id="input-sync-github-repo"
                  value={repoInput}
                  onChange={(e) => {
                    setRepoInput(e.target.value);
                    setRepoError(null);
                  }}
                  placeholder="ex: acme-corp/api-gateway"
                  className={`w-full bg-[#090b10] text-zinc-100 border ${
                    repoError ? 'border-rose-500/60' : 'border-[#20273d]'
                  } focus:border-purple-500/70 rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-purple-500/40 placeholder-zinc-600`}
                />
                {repoError && (
                  <p className="text-[11px] text-rose-400 font-mono">{repoError}</p>
                )}
              </div>

              {/* Issue Title Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-zinc-300 font-semibold flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  Título da Issue
                </label>
                <input
                  type="text"
                  id="input-sync-github-issue-title"
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  placeholder="[SECURITY] Tipo da Vulnerabilidade: Título do Relatório"
                  className="w-full bg-[#090b10] text-zinc-100 border border-[#20273d] focus:border-purple-500/70 rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                />
              </div>

              {/* Labels Selector */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-zinc-300 font-semibold flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-purple-400" />
                  Labels da Issue
                </label>

                <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-lg bg-[#090b10] border border-[#20273d]">
                  {selectedLabels.map((lbl) => (
                    <span
                      key={lbl}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-purple-500/15 text-purple-300 border border-purple-500/30"
                    >
                      <span>{lbl}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLabel(lbl)}
                        className="text-purple-400 hover:text-white"
                        title="Remover label"
                      >
                        ×
                      </button>
                    </span>
                  ))}

                  <div className="inline-flex items-center gap-1">
                    <input
                      type="text"
                      value={newLabelInput}
                      onChange={(e) => setNewLabelInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddLabel();
                        }
                      }}
                      placeholder="+ label..."
                      className="bg-transparent text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none px-1 w-24 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Markdown Preview Accordion */}
              <div className="border border-[#1e2338] rounded-xl overflow-hidden">
                <button
                  type="button"
                  id="btn-toggle-markdown-preview-sync"
                  onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
                  className="w-full flex items-center justify-between p-3 bg-[#090b10] hover:bg-[#0e111a] text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-purple-400" />
                    <span>Pré-visualizar Corpo da Issue em Markdown ({issueMarkdown.length} caracteres)</span>
                  </span>
                  {showMarkdownPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showMarkdownPreview && (
                  <div className="p-3 bg-[#07080d] border-t border-[#1e2338]">
                    <pre className="text-[11px] font-mono text-zinc-300 overflow-x-auto whitespace-pre leading-relaxed max-h-48">
                      {issueMarkdown}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}

        </div>

        {/* Modal Footer */}
        {!syncSuccessResult && (
          <div className="flex items-center justify-between p-4 bg-[#090b10] border-t border-[#1e2338] text-xs font-mono">
            <button
              type="button"
              id="btn-cancel-github-sync"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1a2032] text-zinc-300 hover:text-white border border-[#20273d] transition-colors"
            >
              Cancelar
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-sync-issue-action"
                onClick={handleExecuteSync}
                disabled={isSyncing || !hasToken || !repoInput.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-purple-950/50 cursor-pointer"
                title={!hasToken ? 'Configure o token de acesso pessoal antes de sincronizar' : undefined}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Criando Issue no GitHub...' : 'Criar Issue via GitHub API'}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
