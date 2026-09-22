import React, { useState, useEffect } from 'react';
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
  Monitor
} from 'lucide-react';
import { recordPlatformApiCall } from '../utils/apiRateLimiter';
import { useTheme, ThemeMode } from '../context/ThemeContext';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'github' | 'appearance' | 'general';
}

export const LOCAL_STORAGE_GITHUB_TOKEN_KEY = 'bbm_github_pat_token';
export const LOCAL_STORAGE_GITHUB_DEFAULT_REPO = 'bbm_github_default_repo';
export const LOCAL_STORAGE_GITHUB_DEFAULT_LABELS = 'bbm_github_default_labels';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'github'
}) => {
  const [activeTab, setActiveTab] = useState<'github' | 'appearance' | 'general'>(initialTab);
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  // GitHub Settings State
  const [githubToken, setGithubToken] = useState('');
  const [defaultRepo, setDefaultRepo] = useState('');
  const [defaultLabels, setDefaultLabels] = useState('security, vulnerability, bug-bounty');
  const [showToken, setShowToken] = useState(false);

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

  // Load saved settings on open
  useEffect(() => {
    if (isOpen) {
      try {
        const savedToken = localStorage.getItem(LOCAL_STORAGE_GITHUB_TOKEN_KEY) || '';
        const savedRepo = localStorage.getItem(LOCAL_STORAGE_GITHUB_DEFAULT_REPO) || '';
        const savedLabels = localStorage.getItem(LOCAL_STORAGE_GITHUB_DEFAULT_LABELS) || 'security, vulnerability, bug-bounty';
        
        setGithubToken(savedToken);
        setDefaultRepo(savedRepo);
        setDefaultLabels(savedLabels);
        setTestResult(null);
        setSaveSuccessMsg(null);
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    }
  }, [isOpen]);

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
      <div className="relative w-full max-w-2xl bg-[#0d1017] border border-[#1e2338] rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto font-sans">
        
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

          <button
            type="button"
            id="btn-close-settings-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
            title="Fechar configurações"
          >
            <X className="w-5 h-5" />
          </button>
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
            <div className="space-y-5">
              
              {/* Token Info Card */}
              <div className="p-4 rounded-xl bg-[#121624] border border-[#20273d] space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-200">
                  <Key className="w-4 h-4 text-purple-400" />
                  <span>GitHub Personal Access Token (PAT)</span>
                  {githubToken ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]">
                      CONFIGURADO
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px]">
                      NÃO CONFIGURADO
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Necessário para sincronizar relatórios diretamente como novas Issues em repositórios do GitHub através da API REST oficial. Seu token fica armazenado estritamente no armazenamento local do seu navegador (<code className="text-purple-300 font-mono">localStorage</code>).
                </p>
              </div>

              {/* Token Input Field */}
              <div className="space-y-2">
                <label className="flex items-center justify-between text-xs font-mono text-zinc-300 font-semibold">
                  <span>Token de Acesso Pessoal (PAT)</span>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=BugBountyManager"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-1 text-[11px] hover:underline"
                  >
                    <span>Gerar Token no GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </label>

                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    id="input-settings-github-token"
                    value={githubToken}
                    onChange={(e) => {
                      setGithubToken(e.target.value);
                      setTestResult(null);
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

                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                  <span>Escopo exigido: <code className="text-purple-300">repo</code> (ou <code className="text-purple-300">public_repo</code> para projetos públicos)</span>
                  <button
                    type="button"
                    id="btn-test-github-token"
                    onClick={handleTestToken}
                    disabled={isTestingToken || !githubToken.trim()}
                    className="text-purple-400 hover:text-purple-300 disabled:opacity-40 flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTestingToken ? 'animate-spin' : ''}`} />
                    <span>{isTestingToken ? 'Validando...' : 'Testar Conexão'}</span>
                  </button>
                </div>
              </div>

              {/* Token Test Result Feedback */}
              {testResult && (
                <div
                  id="settings-token-test-result"
                  className={`p-3.5 rounded-lg border text-xs font-mono space-y-1.5 animate-in fade-in duration-150 ${
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
                  {testResult.success && testResult.scopes && (
                    <div className="text-[11px] text-zinc-400 pl-6 space-y-0.5">
                      <div>Escopos detectados: <code className="text-emerald-300">{testResult.scopes}</code></div>
                      <div>Usuário verificado: <strong className="text-white">@{testResult.username}</strong></div>
                    </div>
                  )}
                </div>
              )}

              {/* Default Repository Field */}
              <div className="space-y-2 pt-2 border-t border-[#1e2338]">
                <label className="text-xs font-mono text-zinc-300 font-semibold flex items-center gap-2">
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
                  Sugerido automaticamente quando você clicar em "Sincronizar no GitHub" a partir de qualquer relatório.
                </p>
              </div>

              {/* Default Labels Field */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-zinc-300 font-semibold flex items-center gap-2">
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
                  Separadas por vírgula. A gravidade do relatório (ex: <code className="text-purple-300">severity:high</code>) é adicionada automaticamente.
                </p>
              </div>

              {/* Quick instructions box */}
              <div className="p-3.5 rounded-lg bg-[#090b10] border border-[#1e2338] text-[11px] text-zinc-400 space-y-1.5 font-mono">
                <div className="flex items-center gap-1.5 text-zinc-300 font-bold">
                  <Info className="w-3.5 h-3.5 text-purple-400" />
                  <span>Como gerar seu token no GitHub:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-zinc-400 pl-1">
                  <li>Acesse <strong className="text-zinc-200">github.com → Settings → Developer Settings</strong>.</li>
                  <li>Clique em <strong className="text-zinc-200">Personal access tokens → Tokens (classic)</strong>.</li>
                  <li>Gere um novo token selecionando a caixa de seleção <strong className="text-purple-300">repo</strong>.</li>
                  <li>Copie o código gerado e cole no campo acima para habilitar o envio direto de relatórios.</li>
                </ol>
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

            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-4 font-mono text-xs text-zinc-300">
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
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 bg-[#090b10] border-t border-[#1e2338] text-xs font-mono">
          <div className="text-[11px] text-zinc-500">
            {githubToken ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Token configurado
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Token ausente
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-cancel-settings"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1a2032] text-zinc-300 hover:text-white border border-[#20273d] transition-colors"
            >
              Fechar
            </button>
            <button
              type="button"
              id="btn-save-settings"
              onClick={handleSaveSettings}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-md shadow-purple-950/40 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Salvar Configurações</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
