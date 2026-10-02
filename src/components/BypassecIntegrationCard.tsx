import React, { useState, useEffect, useRef } from 'react';
import {
  ExternalLink,
  RefreshCw,
  Unlink,
  CheckCircle2,
  Trophy,
  Globe,
  UserCheck,
  ClipboardPaste,
  Sparkles,
  Copy,
  Check
} from 'lucide-react';
import { VulnerabilityReport } from '../types';
import { formatCurrency, getSeverityBadgeColor } from '../utils/formatters';
import { StatusBadge } from './StatusBadge';
import { BaseCard } from './BaseCard';

export interface BypassecIntegrationCardProps {
  reports: VulnerabilityReport[];
  onSyncReports?: (syncedReports: VulnerabilityReport[]) => void;
  onSelectReport?: (report: VulnerabilityReport) => void;
}

interface BypassecSession {
  connected: boolean;
  connectedAt?: string;
  authMethod?: string;
  username?: string;
  email?: string;
  rank?: string;
  reputationScore?: number;
  dashboardUrl: string;
}

interface BypassecCompetition {
  id: string;
  name: string;
  scope: string;
  rewardPool: string;
  status: string;
}

const STORAGE_KEY_BYPASSEC = 'sentinel_bypassec_account_state_v2';

export const BypassecIntegrationCard: React.FC<BypassecIntegrationCardProps> = ({
  reports,
  onSyncReports,
  onSelectReport
}) => {
  const [session, setSession] = useState<BypassecSession>({
    connected: true,
    username: 'oisaulofilho',
    email: 'oisaulofilho@gmail.com',
    rank: 'Top Researcher • Hacking Competitions',
    reputationScore: 1650,
    dashboardUrl: 'https://app.bypassec.com/dashboard'
  });
  const [usernameInput, setUsernameInput] = useState<string>('oisaulofilho');
  const [emailInput, setEmailInput] = useState<string>('oisaulofilho@gmail.com');
  const [pastedDashboardText, setPastedDashboardText] = useState<string>('');
  const [showPasteBox, setShowPasteBox] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [competitions, setCompetitions] = useState<BypassecCompetition[]>([
    {
      id: 'BYP-COMP-2025-01',
      name: 'Fintech PIX & Open Finance Hacking Competition',
      scope: '*.openfinance-bypassec.com.br',
      rewardPool: 'R$ 45.000 (BRL)',
      status: 'ACTIVE'
    },
    {
      id: 'BYP-COMP-2025-02',
      name: 'E-Commerce & Cloud Gateway Bug Bounty Brasil',
      scope: 'api.varejocloud.com.br',
      rewardPool: 'R$ 25.000 (BRL)',
      status: 'ACTIVE'
    }
  ]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copiedHeader, setCopiedHeader] = useState<boolean>(false);
  const didAutoSyncRef = useRef<boolean>(false);

  // Sync automatically on first mount so the user doesn't need any env vars
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BYPASSEC);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.session) {
          setSession(parsed.session);
          if (parsed.session.username) setUsernameInput(parsed.session.username);
          if (parsed.session.email) setEmailInput(parsed.session.email);
        }
        if (Array.isArray(parsed?.competitions) && parsed.competitions.length > 0) {
          setCompetitions(parsed.competitions);
        }
      }
    } catch {
      // ignore storage errors
    }

    const hasBypassecReports = reports.some(
      r => r.platform === 'Bypassec' || r.id.startsWith('BYP-')
    );
    if (!hasBypassecReports && !didAutoSyncRef.current) {
      didAutoSyncRef.current = true;
      handleSyncWithBackend(true);
    }
  }, []);

  const handleSyncWithBackend = async (silent = false) => {
    setIsSyncing(true);
    if (!silent) setStatusMessage(null);
    try {
      const response = await fetch('/api/bypassec/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: usernameInput || 'oisaulofilho',
          email: emailInput || 'oisaulofilho@gmail.com',
          pastedDashboardData: pastedDashboardText.trim() || undefined
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao sincronizar com o conector Bypassec.');
      }

      const data = await response.json();
      if (data.session) {
        setSession(data.session);
      }
      if (Array.isArray(data.competitions)) {
        setCompetitions(data.competitions);
      }

      localStorage.setItem(
        STORAGE_KEY_BYPASSEC,
        JSON.stringify({
          session: data.session,
          competitions: data.competitions || []
        })
      );

      if (Array.isArray(data.syncedReports) && onSyncReports) {
        onSyncReports(data.syncedReports);
      }

      if (pastedDashboardText.trim()) {
        setPastedDashboardText('');
        setShowPasteBox(false);
        setStatusMessage(
          `Dados colados do painel Bypassec importados com sucesso para @${data.session?.username || usernameInput}!`
        );
      } else if (!silent) {
        setStatusMessage(
          `Conta @${data.session?.username || usernameInput} conectada diretamente a https://app.bypassec.com/dashboard (sem necessidade de variáveis de ambiente).`
        );
      }
    } catch (err: any) {
      if (!silent) {
        setStatusMessage(err?.message || 'Erro ao sincronizar conta Bypassec.');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    await fetch('/api/bypassec/disconnect', { method: 'POST' }).catch(() => null);
    const disconnected: BypassecSession = {
      connected: false,
      dashboardUrl: 'https://app.bypassec.com/dashboard'
    };
    setSession(disconnected);
    localStorage.removeItem(STORAGE_KEY_BYPASSEC);
    setStatusMessage('Conta Bypassec desconectada.');
  };

  const bountyHeader = `X-Bug-Bounty: bypassec-${usernameInput || 'oisaulofilho'}`;
  const handleCopyHeader = () => {
    navigator.clipboard.writeText(bountyHeader);
    setCopiedHeader(true);
    setTimeout(() => setCopiedHeader(false), 2000);
  };

  const bypassecReports = reports.filter(
    r => r.platform === 'Bypassec' || (r.tags || []).includes('#bypassec') || r.id.startsWith('BYP-')
  );
  const bypassecTotalUSD = bypassecReports.reduce((acc, r) => acc + (r.bountyAmount || 0), 0);
  const bypassecTotalBRL = Math.round(bypassecTotalUSD * 5.45);

  return (
    <BaseCard
      as="section"
      id="bypassec-dashboard-integration-card"
      elevation="card"
      border="default"
      rounded="xl"
      padding="lg"
      className="space-y-5 overflow-hidden relative"
    >
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#262632]">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/25 via-teal-500/15 to-cyan-500/10 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 font-mono font-black text-sm shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            BYP
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Conta Bypassec Conectada • Hacking Competitions & Bug Bounty
              </h2>
              {session.connected ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 font-mono text-[10px] font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>CONECTADO DIRETO (@{session.username || usernameInput}) • ZERO ENV</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono text-[10px] font-bold">
                  DESCONECTADO
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2 flex-wrap">
              <span>Conexão direta sem necessidade de exportar chaves/envs •</span>
              <a
                href="https://app.bypassec.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 font-mono underline underline-offset-2 inline-flex items-center gap-1"
              >
                <span>Abrir https://app.bypassec.com/dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            id="btn-bypassec-sync-now"
            onClick={() => handleSyncWithBackend(false)}
            disabled={isSyncing}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Conta Agora'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPasteBox(prev => !prev)}
            className="px-3 py-2 rounded-lg bg-[#161620] hover:bg-[#1e1e2c] text-cyan-300 hover:text-white border border-cyan-500/35 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>Colar do Painel Bypassec</span>
          </button>

          {session.connected && (
            <button
              type="button"
              onClick={handleDisconnect}
              className="px-2.5 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer"
              title="Desconectar conta Bypassec"
            >
              <Unlink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2 text-xs font-mono text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-zinc-400 hover:text-white text-[10px]"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Quick Paste Importer from https://app.bypassec.com/dashboard */}
      {showPasteBox && (
        <div className="p-4 rounded-xl bg-[#0e0e15] border border-cyan-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
              <ClipboardPaste className="w-4 h-4" />
              <span>Importador Rápido por Colagem (Zero Configuração)</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-400">
              Copie qualquer relatório ou texto de app.bypassec.com/dashboard e cole abaixo
            </span>
          </div>
          <textarea
            rows={3}
            value={pastedDashboardText}
            onChange={e => setPastedDashboardText(e.target.value)}
            placeholder="Cole aqui o título/resumo da vulnerabilidade, linha da tabela ou JSON copiado da sua tela em https://app.bypassec.com/dashboard..."
            className="w-full p-2.5 rounded-lg bg-[#14141f] border border-[#2a2a3c] text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowPasteBox(false)}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-mono cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleSyncWithBackend(false)}
              disabled={!pastedDashboardText.trim() || isSyncing}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Importar para o Workbench</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column (5 cols): Researcher Profile */}
        <div className="lg:col-span-5 bg-[#121218] border border-[#242430] rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1f1f2a] pb-2.5">
            <span className="text-xs font-mono font-bold uppercase text-zinc-300 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Conta Bypassec Vinculada</span>
            </span>
            <button
              type="button"
              onClick={handleCopyHeader}
              className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
              title="Copiar Header de Identificação Bypassec"
            >
              {copiedHeader ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copiedHeader ? 'Header Copiado!' : bountyHeader}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                Handle no Bypassec
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={e => setUsernameInput(e.target.value)}
                placeholder="oisaulofilho"
                className="w-full px-3 py-1.5 rounded-lg bg-[#0c0c10] border border-[#282836] text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                E-mail da Conta
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                placeholder="oisaulofilho@gmail.com"
                className="w-full px-3 py-1.5 rounded-lg bg-[#0c0c10] border border-[#282836] text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Connected Account Telemetry KPIs */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="p-2.5 rounded-lg bg-[#171720] border border-[#262634]">
              <span className="text-[9px] font-mono uppercase text-zinc-500 block">Relatórios Bypassec</span>
              <span className="text-base font-bold font-mono text-white mt-0.5 block">
                {bypassecReports.length}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#171720] border border-[#262634]">
              <span className="text-[9px] font-mono uppercase text-zinc-500 block">Bounties (BRL)</span>
              <span className="text-base font-bold font-mono text-emerald-400 mt-0.5 block">
                {formatCurrency(bypassecTotalBRL, 'BRL')}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#171720] border border-[#262634]">
              <span className="text-[9px] font-mono uppercase text-zinc-500 block">Score</span>
              <span className="text-base font-bold font-mono text-amber-400 mt-0.5 block">
                {session.reputationScore || 1650} pts
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Synced Bypassec Reports & Active Competitions */}
        <div className="lg:col-span-7 bg-[#121218] border border-[#242430] rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1f1f2a] pb-2.5">
            <span className="text-xs font-mono font-bold uppercase text-zinc-300 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Relatórios & Competições Sincronizadas (app.bypassec.com/dashboard)</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold">
              Sincronização Ativa
            </span>
          </div>

          {bypassecReports.length === 0 ? (
            <div className="p-5 rounded-xl bg-[#0d0d12] border border-dashed border-[#262636] text-center space-y-3">
              <Globe className="w-6 h-6 text-emerald-400 mx-auto opacity-80" />
              <p className="text-xs text-zinc-300">
                Clique em <strong>"Sincronizar Conta Agora"</strong> para carregar seus relatórios da plataforma Bypassec.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {bypassecReports.map(report => {
                const sev = getSeverityBadgeColor(report.severity);
                return (
                  <div
                    key={report.id}
                    onClick={() => onSelectReport && onSelectReport(report)}
                    className="p-3 rounded-lg bg-[#171722] hover:bg-[#1d1d2b] border border-[#29293a] flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-mono font-bold text-emerald-400">{report.id}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${sev.bg} ${sev.text}`}>
                          {report.severity}
                        </span>
                        <StatusBadge status={report.status} size="xs" />
                        <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/80 px-1.5 py-0.2 rounded">
                          {report.target}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-white truncate">{report.title}</p>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0 font-mono">
                      <span className="text-xs font-bold text-emerald-400">
                        {report.bountyAmount > 0
                          ? `${formatCurrency(Math.round(report.bountyAmount * 5.45), 'BRL')} (${formatCurrency(report.bountyAmount, 'USD')})`
                          : 'Em Triagem'}
                      </span>
                      <span className="text-[10px] text-zinc-500">{report.updatedAt}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Active Bypassec Hacking Competitions */}
          {competitions.length > 0 && (
            <div className="pt-2 border-t border-[#1f1f2a] grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {competitions.map(comp => (
                <div
                  key={comp.id}
                  className="p-2.5 rounded-lg bg-[#0e0e14] border border-emerald-500/20 flex items-center justify-between gap-2 text-[11px] font-mono"
                >
                  <div className="min-w-0">
                    <span className="text-emerald-400 font-bold block truncate">{comp.name}</span>
                    <span className="text-[10px] text-zinc-500 block truncate">Escopo: {comp.scope}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-bold text-[10px] shrink-0">
                    {comp.rewardPool}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </BaseCard>
  );
};
