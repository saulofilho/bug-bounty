import React, { useState, useEffect, useMemo } from 'react';
import {
  Settings,
  X,
  Key,
  FolderGit2,
  Check,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Shield,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Tag,
  Sliders,
  Info,
  Palette,
  Sun,
  Moon,
  Monitor,
  Globe,
  Languages,
  RotateCcw,
  Image as ImageIcon,
  Send,
  UploadCloud,
  ChevronDown,
  ChevronUp,
  FileText,
  UserCheck,
  Link2,
  Unlink,
  GitPullRequest,
  Copy,
  Clock,
  Code,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { VulnerabilityReport, Severity } from '../types';
import { recordPlatformApiCall } from '../utils/apiRateLimiter';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import {
  useLanguage,
  SUPPORTED_LANGUAGES,
  DEFAULT_APP_ICON_URL
} from '../context/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'github' | 'appearance' | 'general' | 'i18n';
  reports?: VulnerabilityReport[];
  onUpdateReport?: (report: VulnerabilityReport) => void;
  onAddTimelineEvent?: (reportId: string, event: any) => void;
}

export const LOCAL_STORAGE_GITHUB_TOKEN_KEY = 'bbm_github_pat_token';
export const LOCAL_STORAGE_GITHUB_DEFAULT_REPO = 'bbm_github_default_repo';
export const LOCAL_STORAGE_GITHUB_DEFAULT_LABELS = 'bbm_github_default_labels';
export const LOCAL_STORAGE_GITHUB_LINKED_ACCOUNT = 'bbm_github_linked_account';
export const LOCAL_STORAGE_GITHUB_CACHED_REPOS = 'bbm_github_cached_repos';

export interface LinkedGitHubAccount {
  login: string;
  name: string;
  avatarUrl: string;
  htmlUrl: string;
  bio?: string;
  publicRepos: number;
  totalPrivateRepos?: number;
  scopes: string;
  rateLimitRemaining?: number;
  rateLimitTotal?: number;
  linkedAt: string;
}

export interface GitHubRepoItem {
  id: number;
  fullName: string;
  name: string;
  owner: string;
  private: boolean;
  description?: string;
  htmlUrl: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'github',
  reports = [],
  onUpdateReport,
  onAddTimelineEvent
}) => {
  const {
    t,
    language,
    setLanguage,
    forceRerender,
    isI18nEnabled,
    setIsI18nEnabled,
    toggleI18n,
    rerenderVersion,
    appIconUrl,
    setAppIconUrl
  } = useLanguage();
  const [activeTab, setActiveTab] = useState<'github' | 'appearance' | 'general' | 'i18n'>(initialTab);
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  const currentLang = SUPPORTED_LANGUAGES.find(item => item.code === language) || SUPPORTED_LANGUAGES[0];

  // GitHub Settings State
  const [githubToken, setGithubToken] = useState('');
  const [defaultRepo, setDefaultRepo] = useState('');
  const [defaultLabels, setDefaultLabels] = useState('security, vulnerability, bug-bounty');
  const [showToken, setShowToken] = useState(false);

  // Linked GitHub Account State
  const [linkedAccount, setLinkedAccount] = useState<LinkedGitHubAccount | null>(null);
  const [isLinkingAccount, setIsLinkingAccount] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [cachedRepos, setCachedRepos] = useState<GitHubRepoItem[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);

  // Reports state (from props or localStorage fallback)
  const [allReports, setAllReports] = useState<VulnerabilityReport[]>([]);

  // Push Issue Form State
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [targetRepoInput, setTargetRepoInput] = useState<string>('');
  const [issueTitleInput, setIssueTitleInput] = useState<string>('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [newLabelInput, setNewLabelInput] = useState<string>('');
  const [showMarkdownPreview, setShowMarkdownPreview] = useState<boolean>(false);
  const [isPushingIssue, setIsPushingIssue] = useState<boolean>(false);
  const [pushSuccessResult, setPushSuccessResult] = useState<{
    issueNumber: number;
    issueUrl: string;
    issueTitle: string;
    repo: string;
    reportId: string;
  } | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);
  const [useCustomRepo, setUseCustomRepo] = useState<boolean>(false);

  // Token testing state
  const [isTestingToken, setIsTestingToken] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    username?: string;
    avatarUrl?: string;
    scopes?: string;
  } | null>(null);

  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Load saved settings, linked account and reports on open
  useEffect(() => {
    if (isOpen) {
      try {
        const savedToken = localStorage.getItem(LOCAL_STORAGE_GITHUB_TOKEN_KEY) || '';
        const savedRepo = localStorage.getItem(LOCAL_STORAGE_GITHUB_DEFAULT_REPO) || '';
        const savedLabels = localStorage.getItem(LOCAL_STORAGE_GITHUB_DEFAULT_LABELS) || 'security, vulnerability, bug-bounty';
        const savedAccount = localStorage.getItem(LOCAL_STORAGE_GITHUB_LINKED_ACCOUNT);
        const savedRepos = localStorage.getItem(LOCAL_STORAGE_GITHUB_CACHED_REPOS);
        
        setGithubToken(savedToken);
        setDefaultRepo(savedRepo);
        setDefaultLabels(savedLabels);
        setTestResult(null);
        setSaveSuccessMsg(null);
        setPushSuccessResult(null);
        setPushError(null);
        setLinkError(null);

        if (savedAccount) {
          try {
            setLinkedAccount(JSON.parse(savedAccount));
          } catch (e) {
            console.error('Failed to parse saved linked account', e);
          }
        } else {
          setLinkedAccount(null);
        }

        if (savedRepos) {
          try {
            setCachedRepos(JSON.parse(savedRepos));
          } catch (e) {
            console.error('Failed to parse cached repos', e);
          }
        }

        // Resolve reports
        let currentReportsList: VulnerabilityReport[] = [];
        if (reports && reports.length > 0) {
          currentReportsList = reports;
        } else {
          const stored = localStorage.getItem('bounty_reports_v2');
          if (stored) {
            try {
              currentReportsList = JSON.parse(stored);
            } catch (e) {
              console.error('Failed to parse bounty_reports_v2', e);
            }
          }
        }
        setAllReports(currentReportsList);

        if (currentReportsList.length > 0 && !selectedReportId) {
          setSelectedReportId(currentReportsList[0].id);
        }

        if (savedRepo) {
          setTargetRepoInput(savedRepo);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    }
  }, [isOpen, reports]);

  // Keep target repo updated if defaultRepo or cachedRepos change
  useEffect(() => {
    if (!targetRepoInput) {
      if (defaultRepo) {
        setTargetRepoInput(defaultRepo);
      } else if (cachedRepos.length > 0) {
        setTargetRepoInput(cachedRepos[0].fullName);
      }
    }
  }, [defaultRepo, cachedRepos, targetRepoInput]);

  // Currently selected report object
  const selectedReport = useMemo(() => {
    if (allReports.length === 0) return null;
    return allReports.find(r => r.id === selectedReportId) || allReports[0];
  }, [allReports, selectedReportId]);

  // When selected report changes, update default issue title, target repo and labels
  useEffect(() => {
    if (selectedReport) {
      const defaultTitle = selectedReport.githubIntegration?.issueTitle ||
        `[SECURITY] ${selectedReport.vulnerabilityType}: ${selectedReport.title} (CVSS ${selectedReport.cvssScore})`;
      setIssueTitleInput(defaultTitle);

      if (selectedReport.githubIntegration?.repoOwner && selectedReport.githubIntegration?.repoName) {
        setTargetRepoInput(`${selectedReport.githubIntegration.repoOwner}/${selectedReport.githubIntegration.repoName}`);
      } else if (defaultRepo) {
        setTargetRepoInput(defaultRepo);
      } else if (cachedRepos.length > 0) {
        setTargetRepoInput(cachedRepos[0].fullName);
      }

      const defaultLabelsList = (defaultLabels || 'security, vulnerability, bug-bounty')
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);
      const sevLabel = `severity:${selectedReport.severity.toLowerCase()}`;
      if (!defaultLabelsList.includes(sevLabel)) {
        defaultLabelsList.push(sevLabel);
      }
      setSelectedLabels(selectedReport.githubIntegration?.selectedLabels || defaultLabelsList);
      setPushSuccessResult(null);
      setPushError(null);
    }
  }, [selectedReport, defaultRepo, defaultLabels, cachedRepos]);

  // Markdown Issue Body Generator
  const issueMarkdownBody = useMemo(() => {
    if (!selectedReport) return '';
    const stepsFormatted = (selectedReport.stepsToReproduce && selectedReport.stepsToReproduce.length > 0)
      ? selectedReport.stepsToReproduce.map((step, idx) => `${idx + 1}. ${step}`).join('\n')
      : '1. Ver detalhes anexados no relatório original.';

    return `## 🛡️ Vulnerability Disclosure Report: ${selectedReport.title}

**Report ID:** \`${selectedReport.id}\`  
**Target:** \`${selectedReport.target}\`  
**Platform:** ${selectedReport.platform}  
**Severity:** **${selectedReport.severity}** (CVSS v3.1: **${selectedReport.cvssScore}** - \`${selectedReport.cvssVector || 'N/A'}\`)  
**Vulnerability Type:** ${selectedReport.vulnerabilityType}  
**CWE:** ${selectedReport.cwe || 'CWE Não especificada'}  
${selectedReport.cveIds && selectedReport.cveIds.length > 0 ? `**CVEs:** ${selectedReport.cveIds.join(', ')}  ` : ''}

---

### 📋 Executive Summary
${selectedReport.summary || 'Nenhum resumo executivo fornecido.'}

---

### 🔬 Steps to Reproduce
${stepsFormatted}

---

### 💥 Proof of Concept (PoC)
\`\`\`http
${selectedReport.proofOfConcept || '# Nenhuma PoC textual inserida no relatório'}
\`\`\`

---

### 🏢 Business Impact Assessment
${selectedReport.businessImpact || 'Impacto a ser avaliado pela equipe técnica e de segurança da aplicação.'}

---

### 🛠️ Recommended Remediation
${selectedReport.remediation || 'Aplicar validação rigorosa de entrada, restrição de acesso por privilégio mínimo e sanitização de dados.'}

---

*Disclosed via Bug Bounty Manager & Vulnerability Tracker. Respecting Responsible Disclosure guidelines.*`;
  }, [selectedReport]);

  if (!isOpen) return null;

  // Validate Token with GitHub REST API
  const handleTestToken = async () => {
    const cleanToken = githubToken.trim();
    if (!cleanToken) {
      setTestResult({
        success: false,
        message: 'Por favor, insira um token antes de testar.'
      });
      return;
    }

    setIsTestingToken(true);
    setTestResult(null);
    const requestStartTime = performance.now();

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: 'application/vnd.github+json'
        }
      });

      const latencyMs = Math.round(performance.now() - requestStartTime);
      const scopesHeader = response.headers.get('x-oauth-scopes') || 'Nenhum escopo especificado';

      recordPlatformApiCall({
        serviceId: 'github',
        serviceName: 'GitHub REST API',
        endpoint: '/user',
        method: 'GET',
        status: response.status,
        latencyMs,
        cost: 1,
        responseSummary: response.ok
          ? 'Autenticação de token PAT validada com sucesso via /user'
          : `Falha de autenticação (HTTP ${response.status}) ao testar token`,
        isError: !response.ok,
        isThrottled: response.status === 429
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Token inválido ou expirado (401 Unauthorized). Verifique o segredo.');
        } else {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Erro de autenticação na API do GitHub (${response.status}).`);
        }
      }

      const userData = await response.json();
      setTestResult({
        success: true,
        message: `Autenticado com sucesso como @${userData.login}!`,
        username: userData.login,
        avatarUrl: userData.avatar_url,
        scopes: scopesHeader
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Falha ao conectar com o GitHub API.'
      });
    } finally {
      setIsTestingToken(false);
    }
  };

  // Link GitHub Account with live user profile & repositories
  const handleLinkAccount = async (overrideToken?: string) => {
    const cleanToken = (overrideToken || githubToken).trim();
    if (!cleanToken) {
      setLinkError('Por favor, informe um Personal Access Token (PAT) do GitHub.');
      return;
    }

    setIsLinkingAccount(true);
    setLinkError(null);
    const requestStartTime = performance.now();

    try {
      // 1. Fetch user data
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: 'application/vnd.github+json'
        }
      });

      const latencyMs = Math.round(performance.now() - requestStartTime);
      const scopesHeader = userRes.headers.get('x-oauth-scopes') || '';
      const remainingHeader = userRes.headers.get('x-ratelimit-remaining');
      const limitHeader = userRes.headers.get('x-ratelimit-limit');

      recordPlatformApiCall({
        serviceId: 'github',
        serviceName: 'GitHub REST API',
        endpoint: '/user',
        method: 'GET',
        status: userRes.status,
        latencyMs,
        cost: 1,
        responseSummary: userRes.ok
          ? 'Vinculação de conta GitHub efetuada com sucesso via /user'
          : `Falha na autenticação (HTTP ${userRes.status}) ao vincular conta GitHub`,
        isError: !userRes.ok,
        isThrottled: userRes.status === 429
      });

      if (!userRes.ok) {
        if (userRes.status === 401) {
          throw new Error('Token do GitHub inválido ou expirado (401 Unauthorized). Verifique o token fornecido.');
        } else {
          const errData = await userRes.json().catch(() => ({}));
          throw new Error(errData.message || `Erro ao consultar a API do GitHub (HTTP ${userRes.status}).`);
        }
      }

      const userData = await userRes.json();
      const account: LinkedGitHubAccount = {
        login: userData.login,
        name: userData.name || userData.login,
        avatarUrl: userData.avatar_url,
        htmlUrl: userData.html_url,
        bio: userData.bio,
        publicRepos: userData.public_repos || 0,
        totalPrivateRepos: userData.total_private_repos || 0,
        scopes: scopesHeader || 'repo',
        rateLimitRemaining: remainingHeader ? parseInt(remainingHeader, 10) : undefined,
        rateLimitTotal: limitHeader ? parseInt(limitHeader, 10) : undefined,
        linkedAt: new Date().toISOString()
      };

      setLinkedAccount(account);
      localStorage.setItem(LOCAL_STORAGE_GITHUB_LINKED_ACCOUNT, JSON.stringify(account));
      localStorage.setItem(LOCAL_STORAGE_GITHUB_TOKEN_KEY, cleanToken);
      setGithubToken(cleanToken);

      // 2. Fetch User Repositories
      setIsLoadingRepos(true);
      try {
        const reposRes = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator', {
          headers: {
            Authorization: `Bearer ${cleanToken}`,
            Accept: 'application/vnd.github+json'
          }
        });

        if (reposRes.ok) {
          const reposData = await reposRes.json();
          const parsedRepos: GitHubRepoItem[] = reposData.map((r: any) => ({
            id: r.id,
            fullName: r.full_name,
            name: r.name,
            owner: r.owner?.login || userData.login,
            private: r.private,
            description: r.description,
            htmlUrl: r.html_url
          }));

          setCachedRepos(parsedRepos);
          localStorage.setItem(LOCAL_STORAGE_GITHUB_CACHED_REPOS, JSON.stringify(parsedRepos));

          if (!defaultRepo && parsedRepos.length > 0) {
            setDefaultRepo(parsedRepos[0].fullName);
            localStorage.setItem(LOCAL_STORAGE_GITHUB_DEFAULT_REPO, parsedRepos[0].fullName);
            setTargetRepoInput(parsedRepos[0].fullName);
          }
        }
      } catch (repoErr) {
        console.warn('Erro ao carregar lista de repositórios do GitHub:', repoErr);
      } finally {
        setIsLoadingRepos(false);
      }

      setSaveSuccessMsg(`Conta @${userData.login} vinculada com sucesso!`);
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (err: any) {
      setLinkError(err.message || 'Falha ao vincular conta GitHub.');
    } finally {
      setIsLinkingAccount(false);
    }
  };

  // Unlink GitHub Account
  const handleUnlinkAccount = () => {
    setLinkedAccount(null);
    setCachedRepos([]);
    setGithubToken('');
    setTestResult(null);
    setPushSuccessResult(null);
    setPushError(null);
    setLinkError(null);
    try {
      localStorage.removeItem(LOCAL_STORAGE_GITHUB_TOKEN_KEY);
      localStorage.removeItem(LOCAL_STORAGE_GITHUB_LINKED_ACCOUNT);
      localStorage.removeItem(LOCAL_STORAGE_GITHUB_CACHED_REPOS);
      setSaveSuccessMsg('Conta GitHub desvinculada com sucesso.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // Push Vulnerability Report as GitHub Issue
  const handlePushReportAsIssue = async () => {
    setPushError(null);
    setPushSuccessResult(null);

    const cleanToken = githubToken.trim();
    if (!cleanToken) {
      setPushError('É necessário vincular uma conta do GitHub com token válido antes de publicar.');
      return;
    }

    if (!selectedReport) {
      setPushError('Nenhum relatório selecionado para envio.');
      return;
    }

    const cleanRepo = targetRepoInput.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
    const parts = cleanRepo.split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      setPushError('Formato de repositório inválido. Utilize o formato "proprietario/repositorio" (ex: "empresa/repo-sec").');
      return;
    }

    const [owner, repo] = parts;

    if (!issueTitleInput.trim()) {
      setPushError('O título da Issue não pode estar em branco.');
      return;
    }

    setIsPushingIssue(true);
    const requestStartTime = performance.now();

    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: issueTitleInput.trim(),
          body: issueMarkdownBody,
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
          ? `GitHub Issue #${selectedReport.title.slice(0, 25)} publicada com sucesso`
          : `Falha (HTTP ${response.status}) ao criar Issue em ${owner}/${repo}`,
        isError: !response.ok,
        isThrottled: response.status === 429
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Token inválido ou sem autorização (401 Unauthorized). Verifique o segredo.');
        } else if (response.status === 404) {
          throw new Error(`Repositório "${owner}/${repo}" não encontrado (404) ou o token não possui permissão de escrita nele.`);
        } else if (response.status === 403) {
          throw new Error('Permissão negada (403 Forbidden). Verifique se o token tem o escopo "repo" ou se o limite de requisições foi atingido.');
        } else if (response.status === 422) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || 'Erro de validação (422 Unprocessable Entity). Verifique se as issues estão ativadas no repositório.');
        } else {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Erro da API do GitHub (${response.status}).`);
        }
      }

      const issueData = await response.json();

      // Build updated report object
      const updatedReport: VulnerabilityReport = {
        ...selectedReport,
        githubIntegration: {
          repoOwner: owner,
          repoName: repo,
          issueNumber: issueData.number,
          issueId: issueData.id,
          issueUrl: issueData.html_url,
          issueTitle: issueData.title,
          issueState: 'open',
          linkedAt: selectedReport.githubIntegration?.linkedAt || new Date().toISOString(),
          lastSyncedAt: new Date().toISOString(),
          selectedLabels: selectedLabels,
          syncStatus: 'synced',
          syncLogs: [
            ...(selectedReport.githubIntegration?.syncLogs || []),
            {
              id: `log-${Date.now()}`,
              timestamp: new Date().toISOString(),
              action: 'issue_created_from_settings',
              details: `Issue #${issueData.number} criada com sucesso em ${owner}/${repo}`,
              success: true
            }
          ]
        }
      };

      // Update state
      setAllReports(prev => prev.map(r => r.id === updatedReport.id ? updatedReport : r));

      // Persist to localStorage
      try {
        const stored = JSON.parse(localStorage.getItem('bounty_reports_v2') || '[]');
        const updatedList = stored.map((r: any) => r.id === updatedReport.id ? updatedReport : r);
        localStorage.setItem('bounty_reports_v2', JSON.stringify(updatedList));
      } catch (err) {
        console.error('Failed to update localStorage with synced report:', err);
      }

      // Propagate callbacks
      onUpdateReport?.(updatedReport);
      onAddTimelineEvent?.(selectedReport.id, {
        date: new Date().toISOString().split('T')[0],
        title: `Issue GitHub #${issueData.number} Criada`,
        notes: `Relatório exportado para o GitHub Issues em ${owner}/${repo} com status 'open'.`,
        type: 'status_change'
      });

      setPushSuccessResult({
        issueNumber: issueData.number,
        issueUrl: issueData.html_url,
        issueTitle: issueData.title,
        repo: `${owner}/${repo}`,
        reportId: selectedReport.id
      });

      setSaveSuccessMsg(`Issue #${issueData.number} criada com sucesso no GitHub!`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      setPushError(err.message || 'Falha ao publicar Issue no GitHub.');
    } finally {
      setIsPushingIssue(false);
    }
  };

  // Add Label Tag
  const handleAddLabel = () => {
    const clean = newLabelInput.trim().toLowerCase();
    if (clean && !selectedLabels.includes(clean)) {
      setSelectedLabels(prev => [...prev, clean]);
      setNewLabelInput('');
    }
  };

  // Remove Label Tag
  const handleRemoveLabel = (lbl: string) => {
    setSelectedLabels(prev => prev.filter(l => l !== lbl));
  };

  // Save Settings
  const handleSaveSettings = () => {
    try {
      const cleanToken = githubToken.trim();
      const cleanRepo = defaultRepo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
      const cleanLabels = defaultLabels.trim();

      if (cleanToken) {
        localStorage.setItem(LOCAL_STORAGE_GITHUB_TOKEN_KEY, cleanToken);
      } else {
        localStorage.removeItem(LOCAL_STORAGE_GITHUB_TOKEN_KEY);
      }

      if (cleanRepo) {
        localStorage.setItem(LOCAL_STORAGE_GITHUB_DEFAULT_REPO, cleanRepo);
      } else {
        localStorage.removeItem(LOCAL_STORAGE_GITHUB_DEFAULT_REPO);
      }

      localStorage.setItem(LOCAL_STORAGE_GITHUB_DEFAULT_LABELS, cleanLabels);

      setSaveSuccessMsg('Configurações salvas com sucesso no navegador!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  // Clear Token
  const handleClearToken = () => {
    setGithubToken('');
    setTestResult(null);
    try {
      localStorage.removeItem(LOCAL_STORAGE_GITHUB_TOKEN_KEY);
      setSaveSuccessMsg('Token do GitHub removido com sucesso.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl sm:max-w-4xl bg-[#0d1017] border border-[#1e2338] rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto font-sans">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1e2338] bg-[#090b10]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0 shadow-sm">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-mono uppercase tracking-wide flex items-center gap-2">
                <span>Configurações do Sistema</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-sans border border-purple-500/30 font-medium">
                  Integrações & API
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Gerencie credenciais de API, tokens do GitHub e preferências de sincronização.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Global 'i18n' Quick Segmented Toggle */}
            <div 
              id="settings-modal-header-i18n-toggle" 
              className="flex items-center gap-1 bg-[#101424] border border-[#202942] rounded-lg p-1 shadow-inner"
              title={t('i18n.toggleLabel', 'Alternador Global de Idioma (i18n)')}
            >
              <div className="flex items-center gap-1 px-1.5 text-[10px] font-mono font-bold text-cyan-400">
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">i18n</span>
              </div>
              {SUPPORTED_LANGUAGES.map(opt => {
                const isSelected = opt.code === language;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    id={`btn-settings-header-i18n-${opt.code}`}
                    onClick={() => forceRerender(opt.code)}
                    className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-cyan-500 text-black shadow-sm font-extrabold'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80'
                    }`}
                    title={`${opt.name} (${opt.code}) - Clique para alternar locale e forçar re-renderização da UI`}
                  >
                    <span>{opt.flag}</span>
                    <span className="text-[10px]">{opt.shortLabel}</span>
                  </button>
                );
              })}
              <button
                type="button"
                id="btn-settings-header-force-rerender"
                onClick={() => forceRerender()}
                className="p-1 rounded text-zinc-400 hover:text-cyan-300 hover:bg-cyan-950/40 transition-colors cursor-pointer"
                title={t('i18n.forceBtn', 'Forçar Re-renderização da UI')}
              >
                <RefreshCw className="w-3 h-3 hover:rotate-180 transition-transform duration-500" />
              </button>
            </div>

            <button
              type="button"
              id="btn-close-settings-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
              title={t('common.close', 'Fechar configurações')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#1e2338] bg-[#0c0e14] px-5">
          <button
            type="button"
            id="tab-settings-github"
            onClick={() => setActiveTab('github')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-mono font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'github'
                ? 'border-purple-500 text-purple-300 bg-purple-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FolderGit2 className="w-4 h-4 text-purple-400" />
            <span>GitHub API & Issues</span>
            {githubToken ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Token Ativo" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400" title="Token Ausente" />
            )}
          </button>

          <button
            type="button"
            id="tab-settings-appearance"
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-mono font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'appearance'
                ? 'border-amber-500 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Palette className="w-4 h-4 text-amber-400" />
            <span>Aparência & Tema</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 uppercase font-bold">
              {resolvedTheme === 'dark' ? 'Escuro' : 'Claro'}
            </span>
          </button>

          <button
            type="button"
            id="tab-settings-general"
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-mono font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Geral & Segurança</span>
          </button>

          <button
            type="button"
            id="tab-settings-i18n"
            onClick={() => setActiveTab('i18n')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-mono font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'i18n'
                ? 'border-cyan-500 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>i18n & Idiomas</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-cyan-300 uppercase font-bold flex items-center gap-1">
              <span>{currentLang.flag}</span>
              <span>{currentLang.shortLabel}</span>
            </span>
          </button>
        </div>

        {/* Notification Banner */}
        {saveSuccessMsg && (
          <div className="px-5 py-2.5 bg-emerald-950/40 border-b border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between animate-in fade-in">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              {saveSuccessMsg}
            </span>
            <button
              type="button"
              onClick={() => setSaveSuccessMsg(null)}
              className="text-emerald-400 hover:text-emerald-200 text-xs px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {activeTab === 'github' && (
            <div className="space-y-6">
              
              {/* SECTION 1: GITHUB ACCOUNT LINKING & AUTH STATUS */}
              <div className="p-4 sm:p-5 rounded-xl bg-[#121624] border border-[#20273d] space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e263d]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                      <FolderGit2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-white font-mono flex items-center gap-2">
                        <span>Vinculação de Conta GitHub</span>
                        {linkedAccount ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-sans font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            CONTA VINCULADA
                          </span>
                        ) : githubToken ? (
                          <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-sans font-bold">
                            TOKEN ATIVO
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-sans font-bold">
                            NÃO VINCULADO
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                        Conecte sua conta do GitHub via Personal Access Token (PAT) com escopo <code className="text-purple-300">repo</code> para sincronizar relatórios como Issues diretamente pela API REST.
                      </p>
                    </div>
                  </div>

                  {linkedAccount && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        id="btn-refresh-github-account"
                        onClick={() => handleLinkAccount()}
                        disabled={isLinkingAccount || isLoadingRepos}
                        className="px-2.5 py-1.5 rounded-lg bg-[#181d30] hover:bg-[#202742] text-zinc-300 hover:text-white border border-[#2a3454] text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        title="Atualizar dados do perfil e repositórios"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLinkingAccount || isLoadingRepos ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Atualizar</span>
                      </button>
                      <button
                        type="button"
                        id="btn-unlink-github-account"
                        onClick={handleUnlinkAccount}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Desvincular conta e remover token local"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        <span>Desvincular</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Linked Account Profile View */}
                {linkedAccount ? (
                  <div className="p-3.5 rounded-lg bg-[#090b10] border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                    <div className="flex items-center gap-3">
                      <img
                        src={linkedAccount.avatarUrl || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'}
                        alt={linkedAccount.login}
                        className="w-11 h-11 rounded-full border-2 border-emerald-500/50 object-cover shadow-sm bg-zinc-800 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-white truncate">{linkedAccount.name}</h4>
                          <a
                            href={linkedAccount.htmlUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-purple-400 hover:text-purple-300 text-xs font-mono inline-flex items-center gap-1 hover:underline shrink-0"
                          >
                            @{linkedAccount.login}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        {linkedAccount.bio && (
                          <p className="text-[11px] text-zinc-400 truncate max-w-md mt-0.5">{linkedAccount.bio}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px] font-mono text-zinc-400">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                            Escopos: <strong className="text-emerald-300">{linkedAccount.scopes || 'repo'}</strong>
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                            Repositórios: <strong className="text-white">{cachedRepos.length || linkedAccount.publicRepos}</strong>
                          </span>
                          {linkedAccount.rateLimitRemaining !== undefined && (
                            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                              Rate Limit: <strong className="text-cyan-300">{linkedAccount.rateLimitRemaining}/{linkedAccount.rateLimitTotal || 5000}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Token Input & Link Action */
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono text-zinc-300 font-semibold">
                        <label htmlFor="input-settings-github-token" className="flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-purple-400" />
                          <span>Personal Access Token (PAT)</span>
                        </label>
                        <a
                          href="https://github.com/settings/tokens/new?scopes=repo&description=BugBountyManager"
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-1 text-[11px] hover:underline"
                        >
                          <span>Gerar Token com Escopo repo ↗</span>
                        </a>
                      </div>

                      <div className="relative">
                        <input
                          type={showToken ? 'text' : 'password'}
                          id="input-settings-github-token"
                          value={githubToken}
                          onChange={(e) => {
                            setGithubToken(e.target.value);
                            setTestResult(null);
                            setLinkError(null);
                          }}
                          placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx ou github_pat_..."
                          className="w-full bg-[#0a0c12] text-zinc-100 border border-[#20273d] focus:border-purple-500/70 rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-purple-500/40 placeholder-zinc-600 pr-20"
                        />
                        <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
                          <button
                            type="button"
                            id="btn-toggle-token-visibility"
                            onClick={() => setShowToken(!showToken)}
                            className="p-1 rounded text-zinc-500 hover:text-zinc-200 transition-colors"
                            title={showToken ? 'Ocultar token' : 'Exibir token'}
                          >
                            {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          {githubToken && (
                            <button
                              type="button"
                              id="btn-clear-settings-token"
                              onClick={handleClearToken}
                              className="p-1 rounded text-zinc-500 hover:text-rose-400 transition-colors"
                              title="Limpar token"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] font-mono text-zinc-500">
                        O token permanece armazenado localmente em seu navegador (<code className="text-purple-300">localStorage</code>).
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          id="btn-test-github-token"
                          onClick={handleTestToken}
                          disabled={isTestingToken || !githubToken.trim()}
                          className="px-3 py-1.5 rounded-lg bg-[#181d30] hover:bg-[#202742] text-zinc-300 hover:text-white border border-[#2a3454] text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isTestingToken ? 'animate-spin' : ''}`} />
                          <span>{isTestingToken ? 'Testando...' : 'Testar Conexão'}</span>
                        </button>
                        <button
                          type="button"
                          id="btn-link-github-account"
                          onClick={() => handleLinkAccount()}
                          disabled={isLinkingAccount || !githubToken.trim()}
                          className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs font-mono flex items-center gap-1.5 transition-all shadow-md shadow-purple-950/40 cursor-pointer disabled:opacity-50"
                        >
                          <Link2 className={`w-3.5 h-3.5 ${isLinkingAccount ? 'animate-spin' : ''}`} />
                          <span>{isLinkingAccount ? 'Vinculando...' : 'Vincular Conta GitHub'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {linkError && (
                  <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{linkError}</span>
                  </div>
                )}

                {/* Token Test Result Feedback */}
                {testResult && !linkedAccount && (
                  <div
                    id="settings-token-test-result"
                    className={`p-3 rounded-lg border text-xs font-mono space-y-1 animate-in fade-in duration-150 ${
                      testResult.success
                        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span className="font-semibold">{testResult.message}</span>
                    </div>
                    {testResult.success && (
                      <div className="text-[11px] text-zinc-400 pl-6">
                        <div>Escopos detectados: <code className="text-emerald-300">{testResult.scopes}</code></div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION 2: PUSH VULNERABILITY REPORT AS GITHUB ISSUE */}
              <div className="p-4 sm:p-5 rounded-xl bg-[#0e121e] border-2 border-purple-500/40 space-y-4 shadow-lg shadow-purple-950/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1e263d]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center shrink-0">
                      <Send className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-white font-mono flex items-center gap-2">
                        <span>Publicar Relatório como GitHub Issue</span>
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-sans font-bold">
                          GitHub API v3
                        </span>
                      </h3>
                      <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                        Selecione um relatório de vulnerabilidade e envie diretamente como uma nova Issue no repositório de destino.
                      </p>
                    </div>
                  </div>
                </div>

                {allReports.length === 0 ? (
                  <div className="p-4 rounded-lg bg-[#090b10] border border-[#1e2338] text-center text-xs font-mono text-zinc-400 space-y-1">
                    <AlertCircle className="w-5 h-5 text-amber-400 mx-auto" />
                    <p className="font-semibold text-zinc-300">Nenhum relatório cadastrado no sistema</p>
                    <p className="text-[11px] text-zinc-500">Crie ou carregue um relatório para habilitar o envio direto ao GitHub Issues.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    
                    {/* 1. Report Selector */}
                    <div className="space-y-1.5">
                      <label htmlFor="select-report-to-push" className="text-xs font-mono text-zinc-300 font-semibold flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-purple-400" />
                          <span>Selecione o Relatório de Vulnerabilidade:</span>
                        </span>
                        <span className="text-[11px] text-zinc-500 font-normal">
                          {allReports.length} {allReports.length === 1 ? 'relatório disponível' : 'relatórios disponíveis'}
                        </span>
                      </label>
                      <select
                        id="select-report-to-push"
                        value={selectedReportId}
                        onChange={(e) => setSelectedReportId(e.target.value)}
                        className="w-full bg-[#0a0c12] text-zinc-100 border border-[#20273d] focus:border-purple-500/70 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                      >
                        {allReports.map((rep) => {
                          const isSynced = Boolean(rep.githubIntegration?.issueNumber);
                          return (
                            <option key={rep.id} value={rep.id}>
                              [{rep.severity}] {rep.title.slice(0, 45)}... • {rep.target} (CVSS {rep.cvssScore}) {isSynced ? `✓ [Issue #${rep.githubIntegration?.issueNumber}]` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Selected Report Preview Pill */}
                    {selectedReport && (
                      <div className="p-3 rounded-lg bg-[#090b10] border border-[#1e2338] text-xs font-mono space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              selectedReport.severity === 'CRITICAL'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : selectedReport.severity === 'HIGH'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : selectedReport.severity === 'MEDIUM'
                                ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                                : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            }`}>
                              {selectedReport.severity} ({selectedReport.cvssScore})
                            </span>
                            <span className="text-zinc-200 font-semibold truncate max-w-sm">
                              {selectedReport.title}
                            </span>
                          </div>

                          {selectedReport.githubIntegration?.issueNumber ? (
                            <a
                              href={selectedReport.githubIntegration.issueUrl || `https://github.com/${selectedReport.githubIntegration.repoOwner}/${selectedReport.githubIntegration.repoName}/issues/${selectedReport.githubIntegration.issueNumber}`}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 hover:underline"
                            >
                              <Check className="w-3 h-3 text-emerald-400" />
                              Issue #{selectedReport.githubIntegration.issueNumber} no GitHub ↗
                            </a>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px]">
                              Pendente de sincronização
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-zinc-400 flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 border-t border-zinc-800/80">
                          <span>Alvo: <strong className="text-zinc-200">{selectedReport.target}</strong></span>
                          <span>Tipo: <strong className="text-zinc-200">{selectedReport.vulnerabilityType}</strong></span>
                          <span>CWE: <strong className="text-zinc-200">{selectedReport.cwe || 'N/A'}</strong></span>
                          <span>Plataforma: <strong className="text-zinc-200">{selectedReport.platform}</strong></span>
                        </div>
                      </div>
                    )}

                    {/* 2. Target Repository Selection */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono text-zinc-300 font-semibold">
                        <label htmlFor="input-target-repo" className="flex items-center gap-1.5">
                          <FolderGit2 className="w-3.5 h-3.5 text-purple-400" />
                          <span>Repositório de Destino (owner/repo):</span>
                        </label>
                        {cachedRepos.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setUseCustomRepo(!useCustomRepo)}
                            className="text-purple-400 hover:text-purple-300 text-[11px] underline cursor-pointer"
                          >
                            {useCustomRepo ? 'Selecionar da minha lista' : 'Digitar outro repositório'}
                          </button>
                        )}
                      </div>

                      {cachedRepos.length > 0 && !useCustomRepo ? (
                        <select
                          id="select-cached-target-repo"
                          value={targetRepoInput}
                          onChange={(e) => setTargetRepoInput(e.target.value)}
                          className="w-full bg-[#0a0c12] text-zinc-100 border border-[#20273d] focus:border-purple-500/70 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                        >
                          <option value="">Selecione um repositório...</option>
                          {cachedRepos.map((r) => (
                            <option key={r.id} value={r.fullName}>
                              {r.fullName} {r.private ? '🔒 (Privado)' : '🌐 (Público)'}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          id="input-target-repo"
                          value={targetRepoInput}
                          onChange={(e) => setTargetRepoInput(e.target.value)}
                          placeholder="proprietario/repositorio (ex: acme-corp/api-gateway)"
                          className="w-full bg-[#0a0c12] text-zinc-100 border border-[#20273d] focus:border-purple-500/70 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-purple-500/40 placeholder-zinc-600"
                        />
                      )}
                    </div>

                    {/* 3. Issue Title Input */}
                    <div className="space-y-1.5">
                      <label htmlFor="input-issue-title" className="text-xs font-mono text-zinc-300 font-semibold flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-purple-400" />
                        <span>Título da Issue:</span>
                      </label>
                      <input
                        type="text"
                        id="input-issue-title"
                        value={issueTitleInput}
                        onChange={(e) => setIssueTitleInput(e.target.value)}
                        placeholder="[SECURITY] Tipo da falha: Resumo técnico (CVSS X.X)"
                        className="w-full bg-[#0a0c12] text-zinc-100 border border-[#20273d] focus:border-purple-500/70 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-purple-500/40 placeholder-zinc-600"
                      />
                    </div>

                    {/* 4. Labels Manager */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono text-zinc-300 font-semibold flex items-center justify-between">
                        <span>Labels Aplicadas:</span>
                        <span className="text-[10px] text-zinc-500">Pressione Enter ou clique em + para adicionar</span>
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#090b10] border border-[#1e2338] rounded-lg min-h-[40px]">
                        {selectedLabels.map((lbl) => (
                          <span
                            key={lbl}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-mono"
                          >
                            <span>{lbl}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveLabel(lbl)}
                              className="hover:text-rose-300 text-zinc-400 ml-0.5 cursor-pointer"
                              title="Remover label"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                        <div className="flex items-center gap-1 ml-auto">
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
                            placeholder="Nova label..."
                            className="bg-transparent border border-zinc-700 rounded px-2 py-0.5 text-[11px] font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-400 w-28"
                          />
                          <button
                            type="button"
                            onClick={handleAddLabel}
                            className="px-2 py-0.5 rounded bg-purple-700 hover:bg-purple-600 text-white text-[11px] font-mono font-bold cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 5. Markdown Preview Toggle */}
                    <div className="pt-1">
                      <button
                        type="button"
                        id="btn-toggle-markdown-preview"
                        onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
                        className="text-xs font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1.5 cursor-pointer py-1"
                      >
                        <Code className="w-3.5 h-3.5" />
                        <span>{showMarkdownPreview ? 'Ocultar Prévia do Markdown' : 'Visualizar Prévia do Relatório Técnico (Markdown)'}</span>
                        {showMarkdownPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {showMarkdownPreview && (
                        <div className="mt-2 p-3 bg-[#07090e] border border-[#1e2338] rounded-lg max-h-56 overflow-y-auto text-[11px] font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
                          {issueMarkdownBody}
                        </div>
                      )}
                    </div>

                    {/* Feedback Messages */}
                    {pushError && (
                      <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs font-mono flex items-center gap-2 animate-in fade-in">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span className="font-semibold">{pushError}</span>
                      </div>
                    )}

                    {pushSuccessResult && (
                      <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-xs font-mono space-y-1.5 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Issue #{pushSuccessResult.issueNumber} publicada com sucesso no GitHub!</span>
                          </div>
                          <a
                            href={pushSuccessResult.issueUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shadow-sm"
                          >
                            <span>Abrir no GitHub</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          Repositório: <strong className="text-white">{pushSuccessResult.repo}</strong> • Título: <strong className="text-white">{pushSuccessResult.issueTitle}</strong>
                        </div>
                      </div>
                    )}

                    {/* Push Submit Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        id="btn-push-vulnerability-issue"
                        onClick={handlePushReportAsIssue}
                        disabled={isPushingIssue || !githubToken.trim() || !targetRepoInput.trim()}
                        className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white text-xs font-mono font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-950/40 transition-all cursor-pointer"
                      >
                        <Send className={`w-4 h-4 ${isPushingIssue ? 'animate-bounce' : ''}`} />
                        <span>{isPushingIssue ? 'Publicando Issue via GitHub API...' : '🚀 Publicar Relatório como Issue no GitHub'}</span>
                      </button>
                    </div>

                  </div>
                )}
              </div>

              {/* SECTION 3: SYNCHRONIZED REPORTS HISTORY */}
              <div className="p-4 rounded-xl bg-[#121624] border border-[#20273d] space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-200 font-bold">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-purple-400" />
                    <span>Relatórios Sincronizados no GitHub</span>
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    {allReports.filter(r => r.githubIntegration?.issueNumber).length} sincronizados
                  </span>
                </div>

                {allReports.filter(r => r.githubIntegration?.issueNumber).length === 0 ? (
                  <p className="text-xs text-zinc-500 font-mono py-2 text-center">
                    Nenhum relatório foi publicado no GitHub ainda.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {allReports
                      .filter(r => r.githubIntegration?.issueNumber)
                      .map((rep) => (
                        <div
                          key={rep.id}
                          className="p-2.5 rounded-lg bg-[#090b10] border border-[#1e2338] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                                rep.severity === 'CRITICAL'
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                  : rep.severity === 'HIGH'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                              }`}>
                                {rep.severity}
                              </span>
                              <span className="text-zinc-200 font-semibold truncate">{rep.title}</span>
                            </div>
                            <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                              Repo: <span className="text-purple-300">{rep.githubIntegration?.repoOwner}/{rep.githubIntegration?.repoName}</span> • Alvo: {rep.target}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <a
                              href={rep.githubIntegration?.issueUrl || `https://github.com/${rep.githubIntegration?.repoOwner}/${rep.githubIntegration?.repoName}/issues/${rep.githubIntegration?.issueNumber}`}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="px-2.5 py-1 rounded bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-[11px] flex items-center gap-1 font-bold transition-colors"
                            >
                              <span>Issue #{rep.githubIntegration?.issueNumber}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* SECTION 4: DEFAULT CONFIGURATION & INSTRUCTIONS */}
              <div className="p-4 rounded-xl bg-[#090b10] border border-[#1e2338] space-y-4">
                <div className="text-xs font-mono font-bold text-zinc-200 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  <span>Preferências Padrão de Sincronização</span>
                </div>

                {/* Default Repository Field */}
                <div className="space-y-1.5">
                  <label htmlFor="input-settings-default-repo" className="text-xs font-mono text-zinc-300 font-semibold flex items-center gap-2">
                    <FolderGit2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>Repositório Padrão de Destino</span>
                  </label>
                  <input
                    type="text"
                    id="input-settings-default-repo"
                    value={defaultRepo}
                    onChange={(e) => setDefaultRepo(e.target.value)}
                    placeholder="proprietario/repositorio (ex: acme-sec/vulnerabilities)"
                    className="w-full bg-[#0a0c12] text-zinc-100 border border-[#20273d] focus:border-purple-500/70 rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-purple-500/40 placeholder-zinc-600"
                  />
                  <p className="text-[11px] text-zinc-500 font-mono">
                    Sugerido automaticamente nos modais de envio de vulnerabilidade.
                  </p>
                </div>

                {/* Default Labels Field */}
                <div className="space-y-1.5">
                  <label htmlFor="input-settings-default-labels" className="text-xs font-mono text-zinc-300 font-semibold flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-purple-400" />
                    <span>Labels Padrão para Issues Criadas</span>
                  </label>
                  <input
                    type="text"
                    id="input-settings-default-labels"
                    value={defaultLabels}
                    onChange={(e) => setDefaultLabels(e.target.value)}
                    placeholder="security, vulnerability, bug-bounty"
                    className="w-full bg-[#0a0c12] text-zinc-100 border border-[#20273d] focus:border-purple-500/70 rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-purple-500/40 placeholder-zinc-600"
                  />
                  <p className="text-[11px] text-zinc-500 font-mono">
                    Separadas por vírgula. A gravidade do relatório (ex: <code className="text-purple-300">severity:high</code>) é anexada automaticamente.
                  </p>
                </div>

                {/* Quick instructions box */}
                <div className="p-3.5 rounded-lg bg-[#0d1017] border border-[#1e2338] text-[11px] text-zinc-400 space-y-1.5 font-mono">
                  <div className="flex items-center gap-1.5 text-zinc-300 font-bold">
                    <Info className="w-3.5 h-3.5 text-purple-400" />
                    <span>Como obter seu Personal Access Token no GitHub:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-zinc-400 pl-1">
                    <li>Acesse <strong className="text-zinc-200">github.com → Settings → Developer Settings</strong>.</li>
                    <li>Clique em <strong className="text-zinc-200">Personal access tokens → Tokens (classic)</strong>.</li>
                    <li>Gere um novo token marcando a permissão <strong className="text-purple-300">repo</strong> (ou <strong className="text-purple-300">public_repo</strong>).</li>
                    <li>Cole o token acima e clique em <strong className="text-white">Vincular Conta GitHub</strong> para habilitar o envio direto de relatórios.</li>
                  </ol>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6 font-mono text-xs">
              
              {/* Header explanation */}
              <div className="p-4 rounded-xl bg-[#121624] border border-[#20273d] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Palette className="w-4 h-4 text-amber-400" />
                    <span>Personalização Visual & Tema do BugSentinel</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                    resolvedTheme === 'dark' 
                      ? 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40' 
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    Ativo: {resolvedTheme === 'dark' ? '🌙 Escuro' : '☀️ Claro'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  Alterne entre a estética cyber dark de caçador de recompensas e o tema claro corporativo com alto contraste para leitura, relatórios e auditorias diurnas.
                </p>
              </div>

              {/* Theme Selection Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                
                {/* Dark Theme Card */}
                <button
                  type="button"
                  id="btn-select-theme-dark"
                  onClick={() => setTheme('dark')}
                  className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between group cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-[#0f111a] border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-black/40'
                      : 'bg-[#0a0c12] border-[#20273d] hover:border-zinc-500 hover:bg-[#121522]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-[#181924] border border-[#2a2d42] flex items-center justify-center text-indigo-400">
                        <Moon className="w-4 h-4" />
                      </div>
                      {theme === 'dark' && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                          SELECIONADO
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Cyber Dark</h4>
                      <p className="text-[11px] text-zinc-400 font-sans mt-1">
                        Estética hacker terminal com fundo preto (#050505) e alto contraste neon.
                      </p>
                    </div>
                  </div>

                  {/* Visual Preview Swatch */}
                  <div className="mt-4 p-2 rounded-lg bg-[#050505] border border-[#222228] flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                    </div>
                    <span className="text-[9px] text-zinc-400">#050505</span>
                  </div>
                </button>

                {/* Light Theme Card */}
                <button
                  type="button"
                  id="btn-select-theme-light"
                  onClick={() => setTheme('light')}
                  className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between group cursor-pointer ${
                    theme === 'light'
                      ? 'bg-[#181c28] border-amber-500 ring-2 ring-amber-500/30 shadow-lg shadow-black/40'
                      : 'bg-[#0a0c12] border-[#20273d] hover:border-zinc-500 hover:bg-[#121522]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <Sun className="w-4 h-4" />
                      </div>
                      {theme === 'light' && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                          SELECIONADO
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Clean Light</h4>
                      <p className="text-[11px] text-zinc-400 font-sans mt-1">
                        Layout suave (#f8fafc), texto escuro e bordas nítidas para ambientes claros.
                      </p>
                    </div>
                  </div>

                  {/* Visual Preview Swatch */}
                  <div className="mt-4 p-2 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    </div>
                    <span className="text-[9px] text-slate-700">#F8FAFC</span>
                  </div>
                </button>

                {/* System Auto Card */}
                <button
                  type="button"
                  id="btn-select-theme-system"
                  onClick={() => setTheme('system')}
                  className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between group cursor-pointer ${
                    theme === 'system'
                      ? 'bg-[#181c28] border-cyan-500 ring-2 ring-cyan-500/30 shadow-lg shadow-black/40'
                      : 'bg-[#0a0c12] border-[#20273d] hover:border-zinc-500 hover:bg-[#121522]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                        <Monitor className="w-4 h-4" />
                      </div>
                      {theme === 'system' && (
                        <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/30">
                          SELECIONADO
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Automático (Sistema)</h4>
                      <p className="text-[11px] text-zinc-400 font-sans mt-1">
                        Segue as preferências de cor do SO (prefers-color-scheme).
                      </p>
                    </div>
                  </div>

                  {/* Visual Preview Swatch */}
                  <div className="mt-4 p-2 rounded-lg bg-gradient-to-r from-zinc-900 to-slate-200 border border-[#333] flex items-center justify-between">
                    <span className="text-[9px] text-white pl-1">Auto</span>
                    <span className="text-[9px] text-zinc-800 pr-1">OS</span>
                  </div>
                </button>

              </div>

              {/* Quick Toggle Button & Shortcuts */}
              <div className="p-4 rounded-xl bg-[#0a0c12] border border-[#20273d] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h4 className="font-bold text-zinc-200 flex items-center gap-2">
                    <span>Atalho Global de Alternância</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-[#1c2234] border border-[#28324e] text-[10px] text-purple-300">
                      Ctrl + Shift + L
                    </kbd>
                    <span className="text-zinc-500 text-[11px]">ou</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-[#1c2234] border border-[#28324e] text-[10px] text-purple-300">
                      Alt + Shift + T
                    </kbd>
                  </h4>
                  <p className="text-[11px] text-zinc-400 font-sans">
                    Alterne instantaneamente o tema a partir de qualquer tela ou formulário sem precisar abrir configurações.
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-settings-toggle-theme-now"
                  onClick={toggleTheme}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-2 justify-center transition-all shrink-0 cursor-pointer shadow-md"
                >
                  {resolvedTheme === 'dark' ? (
                    <>
                      <Sun className="w-4 h-4" />
                      <span>Ativar Modo Claro</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4" />
                      <span>Ativar Modo Escuro</span>
                    </>
                  )}
                </button>
              </div>

              <LanguageSwitcher variant="panel" />

            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-4 font-mono text-xs text-zinc-300">
              <LanguageSwitcher variant="panel" />

              <div className="p-4 rounded-xl bg-[#121624] border border-[#20273d] space-y-2">
                <div className="flex items-center gap-2 font-bold text-white">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Segurança e Persistência de Dados</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  Todas as chaves de API e tokens configurados na aplicação são manipulados localmente e criptografados nos padrões do navegador via Web Storage. Nenhuma chave privada é transmitida para servidores de telemetria de terceiros.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-[#0a0c12] border border-[#20273d] space-y-3">
                <h4 className="font-bold text-zinc-200 uppercase tracking-wider text-[11px]">
                  Parâmetros de Sincronização
                </h4>
                <div className="space-y-2 text-[11px] text-zinc-400">
                  <div className="flex items-center justify-between py-1 border-b border-[#1c2234]">
                    <span>Provedor de Versionamento:</span>
                    <span className="text-white font-bold">GitHub REST API v3 / v4</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#1c2234]">
                    <span>Método de Criação:</span>
                    <span className="text-emerald-400 font-bold">POST /repos/{'{owner}'}/{'{repo}'}/issues</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#1c2234]">
                    <span>Formato do Payload:</span>
                    <span className="text-white font-bold">RFC 8259 JSON (Markdown UTF-8)</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span>Fallback Sem Token:</span>
                    <span className="text-amber-400 font-bold">Modo Simulado / Alerta de Token</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'i18n' && (
            <div className="space-y-6 font-mono text-xs text-zinc-300">
              
              {/* Header Explanation Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#101828] via-[#0c1422] to-[#080d16] border border-[#1e2e4a] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 font-bold text-white text-sm">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <span>{t('i18n.title', 'Internacionalização & Tradução Global (i18n)')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      isI18nEnabled 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                        : 'bg-zinc-700/30 text-zinc-400 border-zinc-600/40'
                    }`}>
                      {isI18nEnabled ? t('i18n.engineActive', 'MOTOR I18N ATIVO') : 'MOTOR PAUSADO'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold font-mono">
                      {currentLang.flag} {currentLang.name}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold font-mono">
                      v{rerenderVersion}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  {t('i18n.description', 'Alterne o idioma global do aplicativo para reconstruir síncronamente toda a interface e recarregar os pacotes de recursos de texto correspondentes ao locale selecionado.')}
                </p>
              </div>

              {/* Master i18n Engine Toggle Switch Card */}
              <div className="p-4 rounded-xl bg-[#0a0c12] border border-[#20273d] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <span>{t('i18n.masterToggle', 'Ativar Tradução Global i18n')}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans max-w-lg">
                    {t('i18n.masterToggleDesc', 'Mantém o motor de internacionalização ativo em tempo real para sincronizar strings e nós do DOM.')}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    id="btn-settings-master-i18n-toggle"
                    role="switch"
                    aria-checked={isI18nEnabled}
                    onClick={() => setIsI18nEnabled(!isI18nEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isI18nEnabled ? 'bg-cyan-500 shadow-md shadow-cyan-950/50' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isI18nEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-[11px] font-bold uppercase tracking-wider font-mono text-zinc-300 min-w-[50px]">
                    {isI18nEnabled ? 'LIGADO' : 'DESLIGADO'}
                  </span>
                </div>
              </div>

              {/* Global i18n Quick Toggle Bar with Force Re-render */}
              <div className="p-4 rounded-xl bg-[#0a0c12] border border-[#20273d] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1c2234] pb-3">
                  <div>
                    <h4 className="font-bold text-white flex items-center gap-2 text-xs">
                      <Languages className="w-4 h-4 text-cyan-400" />
                      <span>{t('i18n.toggleLabel', 'Alternador Global de Idioma (i18n)')}</span>
                    </h4>
                    <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                      {t('i18n.toggleDesc', 'Selecione abaixo o locale desejado para forçar a re-renderização de todos os componentes da UI com os recursos de texto correspondentes.')}
                    </p>
                  </div>

                  {/* Force Re-render Button */}
                  <button
                    type="button"
                    id="btn-settings-force-rerender-all"
                    onClick={() => forceRerender()}
                    className="px-3.5 py-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 hover:text-white border border-cyan-500/40 flex items-center gap-2 font-bold transition-all shadow-sm cursor-pointer shrink-0"
                    title="Forçar re-renderização de toda a árvore de componentes da aplicação"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t('i18n.forceBtn', 'Forçar Re-renderização da UI')}</span>
                  </button>
                </div>

                {/* Locale Selector Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {SUPPORTED_LANGUAGES.map((opt) => {
                    const isSelected = opt.code === language;
                    return (
                      <button
                        key={opt.code}
                        type="button"
                        id={`btn-i18n-locale-card-${opt.code}`}
                        onClick={() => {
                          forceRerender(opt.code);
                        }}
                        className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between group cursor-pointer ${
                          isSelected
                            ? 'bg-[#10192e] border-cyan-500 ring-2 ring-cyan-500/40 shadow-lg shadow-cyan-950/40 text-white'
                            : 'bg-[#0a0c12] border-[#20273d] hover:border-zinc-500 hover:bg-[#121522] text-zinc-300'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-2xl">{opt.flag}</span>
                            {isSelected ? (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40">
                                <Check className="w-3 h-3 text-emerald-400" />
                                ATIVO
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-[#181c28] text-zinc-400 text-[10px] border border-[#262c3e] group-hover:border-cyan-500/40 group-hover:text-cyan-300">
                                SELECIONAR & RE-RENDER
                              </span>
                            )}
                          </div>

                          <div>
                            <h4 className="font-bold text-sm text-white flex items-center gap-2">
                              <span>{opt.name}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                                {opt.code}
                              </span>
                            </h4>
                            <p className="text-[11px] text-zinc-400 font-sans mt-1">
                              {opt.code === 'pt-BR' && 'Português do Brasil: terminologia completa, documentação técnica e relatórios.'}
                              {opt.code === 'en-US' && 'English (US): global cybersecurity nomenclature, CVSS metrics and standard headers.'}
                              {opt.code === 'es-ES' && 'Español (ES): traducción completa para gestión de hallazgos, programas y auditorías.'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-[#1c2234] flex items-center justify-between text-[10px] text-zinc-400">
                          <span>{opt.shortLabel} Locale Bundle</span>
                          <span className="text-cyan-400 font-bold">{isSelected ? 'Carregado & Renderizado' : 'Clique p/ Ativar'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Real-time Text Resources Verification Preview Sandbox */}
              <div className="p-4 rounded-xl bg-[#090c14] border border-[#1e263d] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#182033] pb-2">
                  <div className="flex items-center gap-2 font-bold text-white text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{t('i18n.previewTitle', 'Verificação de Recursos de Texto em Tempo Real')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-zinc-400">{t('i18n.activeLocale', 'Locale Ativo')}:</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                      {currentLang.flag} {currentLang.name} ({currentLang.code})
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-400 font-sans">
                  {t('i18n.previewDesc', 'Amostra ao vivo de strings da interface renderizadas dinamicamente com o locale selecionado:')}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-[#111524] border border-[#20273d] space-y-1">
                    <span className="text-[9px] uppercase font-bold text-zinc-500">Navegação Dashboard</span>
                    <p className="text-white font-bold">{t('nav.dashboard')}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#111524] border border-[#20273d] space-y-1">
                    <span className="text-[9px] uppercase font-bold text-zinc-500">Navegação Relatórios</span>
                    <p className="text-white font-bold">{t('nav.reports')}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#111524] border border-[#20273d] space-y-1">
                    <span className="text-[9px] uppercase font-bold text-zinc-500">Navegação Programas</span>
                    <p className="text-white font-bold">{t('nav.targets')}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#111524] border border-[#20273d] space-y-1">
                    <span className="text-[9px] uppercase font-bold text-zinc-500">Navegação Biblioteca</span>
                    <p className="text-white font-bold">{t('nav.docs')}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#111524] border border-[#20273d] space-y-1">
                    <span className="text-[9px] uppercase font-bold text-zinc-500">KPI Total em Bounties</span>
                    <p className="text-emerald-400 font-bold">{t('kpi.totalBounties')}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#111524] border border-[#20273d] space-y-1">
                    <span className="text-[9px] uppercase font-bold text-zinc-500">KPI Achados Críticos</span>
                    <p className="text-red-400 font-bold">{t('kpi.criticalFindings')}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#111524] border border-[#20273d] space-y-1">
                    <span className="text-[9px] uppercase font-bold text-zinc-500">Botão Novo Relatório</span>
                    <p className="text-cyan-300 font-bold">{t('header.newReport')}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#111524] border border-[#20273d] space-y-1">
                    <span className="text-[9px] uppercase font-bold text-zinc-500">Saldo de Bounties</span>
                    <p className="text-amber-400 font-bold">{t('header.bountyBalance')}</p>
                  </div>
                </div>
              </div>

              {/* Application Icon URL Path Configuration */}
              <div className="p-4 rounded-xl bg-[#0a0c12] border border-[#20273d] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
                    <ImageIcon className="w-4 h-4 text-cyan-400" />
                    <span>{t('icon.label', 'Caminho da URL do Ícone (Icon URL Path)')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAppIconUrl(DEFAULT_APP_ICON_URL);
                    }}
                    className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset (/icon.svg)</span>
                  </button>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#141824] border border-[#262e45] flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={appIconUrl || DEFAULT_APP_ICON_URL}
                      alt="App Icon Preview"
                      className="w-6 h-6 object-contain"
                      onError={e => {
                        (e.currentTarget as HTMLImageElement).src = DEFAULT_APP_ICON_URL;
                      }}
                    />
                  </div>
                  <input
                    type="text"
                    id="input-settings-modal-icon-url"
                    value={appIconUrl}
                    onChange={e => setAppIconUrl(e.target.value)}
                    placeholder="/icon.svg ou https://..."
                    className="flex-1 bg-[#121520] border border-[#242a40] focus:border-cyan-500 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* System Coverage Diagnostic List */}
              <div className="p-4 rounded-xl bg-[#0c101c] border border-[#1e263d] space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-200">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{t('i18n.coverageTitle', 'Módulos da Aplicação com Tradução Ativa')}</span>
                  </span>
                  <span className="text-[10px] text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                    10/10 Módulos 100%
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 text-[10px] text-zinc-300">
                  <div className="p-2 rounded bg-[#101424] border border-[#1e263d] flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Dashboard & KPIs</span>
                  </div>
                  <div className="p-2 rounded bg-[#101424] border border-[#1e263d] flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Relatórios de Bug</span>
                  </div>
                  <div className="p-2 rounded bg-[#101424] border border-[#1e263d] flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Base CVE & Exploits</span>
                  </div>
                  <div className="p-2 rounded bg-[#101424] border border-[#1e263d] flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Alvos & Programas</span>
                  </div>
                  <div className="p-2 rounded bg-[#101424] border border-[#1e263d] flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Ferramentas AppSec</span>
                  </div>
                  <div className="p-2 rounded bg-[#101424] border border-[#1e263d] flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Threat Intel Live</span>
                  </div>
                  <div className="p-2 rounded bg-[#101424] border border-[#1e263d] flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Notificações & Hub</span>
                  </div>
                  <div className="p-2 rounded bg-[#101424] border border-[#1e263d] flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Sites & Ganhos</span>
                  </div>
                  <div className="p-2 rounded bg-[#101424] border border-[#1e263d] flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Biblioteca & Guias</span>
                  </div>
                  <div className="p-2 rounded bg-[#101424] border border-[#1e263d] flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Modais & Formulários</span>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 bg-[#090b10] border-t border-[#1e2338] text-xs font-mono">
          <div className="flex items-center gap-3 text-[11px] text-zinc-500">
            {githubToken ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Token configurado
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Token ausente
              </span>
            )}
            <span className="text-zinc-600 hidden sm:inline">•</span>
            <button
              type="button"
              id="btn-settings-footer-i18n-toggle"
              onClick={() => toggleI18n()}
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline cursor-pointer"
              title="Alternar para o próximo locale e forçar re-renderização global"
            >
              <Globe className="w-3 h-3" />
              <span>{currentLang.flag} {currentLang.shortLabel} (v{rerenderVersion})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-cancel-settings"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1a2032] text-zinc-300 hover:text-white border border-[#20273d] transition-colors cursor-pointer"
            >
              {t('common.close', 'Fechar')}
            </button>
            <button
              type="button"
              id="btn-save-settings"
              onClick={handleSaveSettings}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-md shadow-purple-950/40 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t('common.save', 'Salvar Configurações')}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
