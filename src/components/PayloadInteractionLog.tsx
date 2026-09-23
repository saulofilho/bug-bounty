import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Radio, 
  Terminal, 
  Copy, 
  Check, 
  Download, 
  RefreshCw, 
  Search, 
  ShieldAlert, 
  Globe, 
  Filter, 
  Trash2, 
  Play, 
  Pause, 
  ExternalLink, 
  Eye, 
  Code2, 
  Server, 
  Database, 
  Cloud, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  Activity, 
  Zap, 
  Layers, 
  Lock, 
  Mail, 
  X, 
  Share2,
  Sliders,
  ChevronDown
} from 'lucide-react';
import { 
  OobInteraction, 
  getOobInteractions, 
  deleteOobInteraction, 
  clearOobInteractions, 
  resetOobInteractions, 
  subscribeToOobInteractions, 
  simulateOobHit 
} from '../services/oobInteractionStore';

interface PayloadInteractionLogProps {
  onNavigateToPoc?: (url: string, payload?: string) => void;
  onNavigateToCollaborator?: () => void;
}

export const PayloadInteractionLog: React.FC<PayloadInteractionLogProps> = ({
  onNavigateToPoc,
  onNavigateToCollaborator
}) => {
  // Interactions state synced via central store
  const [interactions, setInteractions] = useState<OobInteraction[]>(() => getOobInteractions());
  const [isLiveListening, setIsLiveListening] = useState<boolean>(true);
  const [autoSimulate, setAutoSimulate] = useState<boolean>(false);
  const [selectedInteraction, setSelectedInteraction] = useState<OobInteraction | null>(null);
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [protocolFilter, setProtocolFilter] = useState<'ALL' | 'DNS' | 'HTTP' | 'HTTPS' | 'LDAP' | 'SMTP'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'exfiltrated' | 'verified' | 'blind_hit'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // UI state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [simulatingType, setSimulatingType] = useState<string | null>(null);
  const [latestHitId, setLatestHitId] = useState<string | null>(null);
  const autoSimulateTimerRef = useRef<number | null>(null);

  // Subscribe to real-time events across windows/tools
  useEffect(() => {
    const unsubscribe = subscribeToOobInteractions((updated) => {
      if (isLiveListening) {
        setInteractions(updated);
        if (updated.length > 0) {
          setLatestHitId(updated[0].id);
        }
      }
    });
    return () => {
      unsubscribe();
    };
  }, [isLiveListening]);

  // Handle periodic auto-simulation for demo/testing
  useEffect(() => {
    if (autoSimulate && isLiveListening) {
      autoSimulateTimerRef.current = window.setInterval(() => {
        const types: Array<'DNS' | 'HTTP_GET' | 'HTTP_POST' | 'LDAP'> = ['DNS', 'HTTP_GET', 'HTTP_POST', 'LDAP'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        const tags = ['recon-rce', 'ssrf-api', 'log4j-probe', 'blind-xss', 'auth-bypass'];
        const randomTag = tags[Math.floor(Math.random() * tags.length)];
        const newHit = simulateOobHit(randomType, 'oob.bugsentinel.internal', randomTag);
        setLatestHitId(newHit.id);
      }, 12000);
    } else {
      if (autoSimulateTimerRef.current) {
        clearInterval(autoSimulateTimerRef.current);
        autoSimulateTimerRef.current = null;
      }
    }
    return () => {
      if (autoSimulateTimerRef.current) {
        clearInterval(autoSimulateTimerRef.current);
      }
    };
  }, [autoSimulate, isLiveListening]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSimulate = (type: 'DNS' | 'HTTP_GET' | 'HTTP_POST' | 'LDAP' | 'SMTP') => {
    setSimulatingType(type);
    const newHit = simulateOobHit(type, 'oob.bugsentinel.internal', 'recon-live');
    setLatestHitId(newHit.id);
    setTimeout(() => setSimulatingType(null), 800);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteOobInteraction(id);
    if (selectedInteraction?.id === id) {
      setSelectedInteraction(null);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all recorded payload interactions from the log?')) {
      clearOobInteractions();
      setSelectedInteraction(null);
    }
  };

  const handleResetSeed = () => {
    resetOobInteractions();
  };

  // Filtered & sorted interactions
  const filteredInteractions = useMemo(() => {
    return interactions
      .filter((item) => {
        // Protocol filter
        if (protocolFilter !== 'ALL' && item.protocol !== protocolFilter) {
          return false;
        }
        // Status filter
        if (statusFilter !== 'ALL') {
          if (statusFilter === 'exfiltrated' && !item.dataExfiltrated) return false;
          if (statusFilter === 'verified' && item.status !== 'verified' && item.status !== 'exfiltrated') return false;
          if (statusFilter === 'blind_hit' && item.status !== 'blind_hit' && item.status !== 'pingback') return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchIp = item.sourceIp.toLowerCase().includes(q);
          const matchSub = item.subdomainOrPath.toLowerCase().includes(q);
          const matchTag = item.correlatedTag?.toLowerCase().includes(q) || false;
          const matchData = item.dataExfiltrated?.toLowerCase().includes(q) || false;
          const matchDecoded = item.decodedData?.toLowerCase().includes(q) || false;
          const matchPayloadType = item.payloadType?.toLowerCase().includes(q) || false;
          const matchReverseDns = item.sourceReverseDns?.toLowerCase().includes(q) || false;
          const matchGeo = item.geoEstimate?.toLowerCase().includes(q) || false;
          if (!matchIp && !matchSub && !matchTag && !matchData && !matchDecoded && !matchPayloadType && !matchReverseDns && !matchGeo) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return b.id.localeCompare(a.id);
        } else {
          return a.id.localeCompare(b.id);
        }
      });
  }, [interactions, protocolFilter, statusFilter, searchQuery, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    const total = interactions.length;
    const uniqueIps = new Set(interactions.map(i => i.sourceIp)).size;
    const exfiltratedCount = interactions.filter(i => !!i.dataExfiltrated).length;
    const verifiedCount = interactions.filter(i => i.status === 'verified' || i.status === 'exfiltrated').length;
    const dnsCount = interactions.filter(i => i.protocol === 'DNS').length;
    const httpCount = interactions.filter(i => i.protocol === 'HTTP' || i.protocol === 'HTTPS').length;
    const ldapCount = interactions.filter(i => i.protocol === 'LDAP').length;
    return {
      total,
      uniqueIps,
      exfiltratedCount,
      verifiedCount,
      dnsCount,
      httpCount,
      ldapCount
    };
  }, [interactions]);

  // Export functions
  const exportAsJson = () => {
    const blob = new Blob([JSON.stringify(interactions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payload-interactions-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsCsv = () => {
    const headers = ['ID', 'Timestamp', 'Protocol', 'Source IP', 'Reverse DNS', 'Geo Location', 'Subdomain / Path', 'HTTP Method', 'Exfiltrated Data', 'Decoded Data', 'Correlated Tag', 'Status'];
    const rows = interactions.map(i => [
      i.id,
      `"${i.timestamp}"`,
      i.protocol,
      i.sourceIp,
      `"${i.sourceReverseDns || ''}"`,
      `"${i.geoEstimate || ''}"`,
      `"${i.subdomainOrPath}"`,
      i.httpMethod || 'N/A',
      `"${(i.dataExfiltrated || '').replace(/"/g, '""')}"`,
      `"${(i.decodedData || '').replace(/"/g, '""')}"`,
      i.correlatedTag || '',
      i.status || ''
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payload-interactions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateMarkdownEvidence = (item: OobInteraction): string => {
    return `### [Vulnerability Verification Evidence - Out-of-Band Callback]
- **Interaction ID**: \`${item.id}\`
- **Timestamp**: ${item.timestamp}
- **Protocol**: ${item.protocol} ${item.httpMethod ? `(${item.httpMethod})` : ''}
- **Callback Target**: \`${item.subdomainOrPath}\`
- **Source Origin**: \`${item.sourceIp}\` ${item.sourceReverseDns ? `(${item.sourceReverseDns})` : ''}
- **Geo / Cloud Origin**: ${item.geoEstimate || 'N/A'}
- **Correlated Tag**: \`${item.correlatedTag || 'unlabeled'}\`
- **Verification Status**: ${item.status?.toUpperCase() || 'VERIFIED'}
${item.dataExfiltrated ? `\n#### Exfiltrated Data Captured:\n- **Raw Data**: \`${item.dataExfiltrated}\`\n- **Decoded Result**: **${item.decodedData || item.dataExfiltrated}**\n` : ''}
${item.headers ? `\n#### Raw Request Headers:\n\`\`\`http\n${Object.entries(item.headers).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\`\`\`\n` : ''}
${item.requestBody ? `\n#### Request Body:\n\`\`\`json\n${item.requestBody}\n\`\`\`\n` : ''}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Telemetry Bar */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#0f1117] border border-[#1f2433] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Radio className="w-5 h-5 animate-pulse" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Payload Interaction Log
              </h2>
              <span className="px-2.5 py-0.5 text-[11px] font-mono font-semibold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Real-Time OOB Callback Feed
              </span>
              {isLiveListening ? (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  LISTENING ACTIVE
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono rounded-full bg-zinc-700/40 text-zinc-400 border border-zinc-600/40">
                  <Pause className="w-3 h-3" />
                  FEED PAUSED
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-300 max-w-3xl leading-relaxed">
              Captura e armazena o histórico em tempo real de requisições externas e resoluções DNS disparadas pelos payloads do <strong>OOB Collaborator</strong>. Fornece prova irrefutável de exploração para vulnerabilidades cegas (Blind SSRF, Blind XXE, Blind RCE, Log4j e Blind XSS).
            </p>
          </div>

          {/* Quick Controls */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={() => setIsLiveListening(!isLiveListening)}
              className={`px-3 py-2 text-xs font-mono font-semibold rounded-xl border flex items-center gap-1.5 transition-all ${
                isLiveListening
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
              }`}
              title={isLiveListening ? 'Pausar recepção de novos eventos' : 'Retomar escuta de eventos'}
            >
              {isLiveListening ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isLiveListening ? 'Pausar Escuta' : 'Retomar Escuta'}</span>
            </button>

            <button
              onClick={() => setAutoSimulate(!autoSimulate)}
              className={`px-3 py-2 text-xs font-mono font-semibold rounded-xl border flex items-center gap-1.5 transition-all ${
                autoSimulate
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-200'
                  : 'bg-[#161a23] border-[#293245] text-zinc-300 hover:text-white hover:border-[#3d4b68]'
              }`}
              title="Gera requisições externas simuladas a cada 12 segundos para testes"
            >
              <Activity className={`w-3.5 h-3.5 ${autoSimulate ? 'text-purple-400 animate-spin' : 'text-zinc-400'}`} />
              <span>{autoSimulate ? 'Auto-Simulador [ON]' : 'Auto-Simular [OFF]'}</span>
            </button>

            {onNavigateToCollaborator && (
              <button
                onClick={onNavigateToCollaborator}
                className="px-3 py-2 text-xs font-mono font-semibold rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 flex items-center gap-1.5 transition-all"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Gerador de Payloads OOB</span>
              </button>
            )}
          </div>
        </div>

        {/* Telemetry Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-5 mt-5 border-t border-[#1f2433]">
          <div className="p-3 rounded-xl bg-[#131722] border border-[#23293a]">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Total Interações</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono text-white">{stats.total}</span>
              <span className="text-[10px] text-cyan-400 font-mono">eventos</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#131722] border border-[#23293a]">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">IPs de Origem Únicos</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono text-emerald-400">{stats.uniqueIps}</span>
              <span className="text-[10px] text-emerald-500/80 font-mono">hosts</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#131722] border border-[#23293a]">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Dados Exfiltrados</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono text-amber-400">{stats.exfiltratedCount}</span>
              <span className="text-[10px] text-amber-500/80 font-mono">capturas</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#131722] border border-[#23293a]">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Callbacks Verificados</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono text-cyan-400">{stats.verifiedCount}</span>
              <span className="text-[10px] text-cyan-500/80 font-mono">comprovados</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#131722] border border-[#23293a]">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">DNS / HTTP(S)</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono text-indigo-400">{stats.dnsCount}</span>
              <span className="text-[10px] text-zinc-400 font-mono">/ {stats.httpCount}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#131722] border border-[#23293a]">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">JNDI / LDAP</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono text-purple-400">{stats.ldapCount}</span>
              <span className="text-[10px] text-purple-400/80 font-mono">log4j</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar: Filters, Search, Simulation Triggers & Exports */}
      <div className="p-4 rounded-xl bg-[#11131a] border border-[#1e2330] space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar por IP de origem, hostname, caminho, dados exfiltrados ou tag..."
              className="w-full pl-9 pr-8 py-2 bg-[#090a0f] border border-[#222838] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Simulation Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-mono text-zinc-400 mr-1 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              Simular Hit:
            </span>
            <button
              onClick={() => handleSimulate('DNS')}
              disabled={simulatingType === 'DNS'}
              className="px-2.5 py-1.5 text-[11px] font-mono font-semibold rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 transition-all flex items-center gap-1"
            >
              <span>+ DNS</span>
            </button>
            <button
              onClick={() => handleSimulate('HTTP_GET')}
              disabled={simulatingType === 'HTTP_GET'}
              className="px-2.5 py-1.5 text-[11px] font-mono font-semibold rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 transition-all flex items-center gap-1"
            >
              <span>+ HTTP GET</span>
            </button>
            <button
              onClick={() => handleSimulate('HTTP_POST')}
              disabled={simulatingType === 'HTTP_POST'}
              className="px-2.5 py-1.5 text-[11px] font-mono font-semibold rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-all flex items-center gap-1"
            >
              <span>+ HTTPS POST</span>
            </button>
            <button
              onClick={() => handleSimulate('LDAP')}
              disabled={simulatingType === 'LDAP'}
              className="px-2.5 py-1.5 text-[11px] font-mono font-semibold rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 transition-all flex items-center gap-1"
            >
              <span>+ LDAP</span>
            </button>
          </div>
        </div>

        {/* Filter Pills & Secondary Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#1e2330]">
          {/* Protocol Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-mono text-zinc-400 mr-1">Protocolo:</span>
            {(['ALL', 'DNS', 'HTTP', 'HTTPS', 'LDAP', 'SMTP'] as const).map(proto => (
              <button
                key={proto}
                onClick={() => setProtocolFilter(proto)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold border transition-all ${
                  protocolFilter === proto
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                    : 'bg-[#090a0f] border-[#222838] text-zinc-400 hover:text-white'
                }`}
              >
                {proto}
              </button>
            ))}
          </div>

          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-mono text-zinc-400 mr-1">Status:</span>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-zinc-700/50 border-zinc-500 text-white'
                  : 'bg-[#090a0f] border-[#222838] text-zinc-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('exfiltrated')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border transition-all ${
                statusFilter === 'exfiltrated'
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-[#090a0f] border-[#222838] text-zinc-400 hover:text-white'
              }`}
            >
              Dados Capturados
            </button>
            <button
              onClick={() => setStatusFilter('verified')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border transition-all ${
                statusFilter === 'verified'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-[#090a0f] border-[#222838] text-zinc-400 hover:text-white'
              }`}
            >
              Verificados
            </button>
          </div>

          {/* Action buttons (Export, Clear, Reset) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={exportAsJson}
              className="p-1.5 rounded-lg bg-[#161a23] border border-[#283042] text-zinc-300 hover:text-white hover:border-[#3e4a66] transition-all"
              title="Exportar registros como JSON"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={exportAsCsv}
              className="px-2 py-1 rounded-lg bg-[#161a23] border border-[#283042] text-zinc-300 hover:text-white hover:border-[#3e4a66] text-[10px] font-mono transition-all"
              title="Exportar histórico como CSV"
            >
              CSV
            </button>
            <button
              onClick={handleResetSeed}
              className="p-1.5 rounded-lg bg-[#161a23] border border-[#283042] text-zinc-300 hover:text-white hover:border-[#3e4a66] transition-all"
              title="Restaurar eventos demonstrativos de exemplo"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleClearAll}
              className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-all"
              title="Limpar todos os registros da tabela"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Interaction Stream Table */}
      <div className="rounded-2xl bg-[#0f1117] border border-[#1f2433] shadow-xl overflow-hidden">
        <div className="p-4 border-b border-[#1f2433] flex items-center justify-between flex-wrap gap-2 bg-[#131620]">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Histórico de Requisições Externas Recebidas ({filteredInteractions.length})
            </h3>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
            <span>Ordem:</span>
            <button
              onClick={() => setSortBy(sortBy === 'newest' ? 'oldest' : 'newest')}
              className="px-2 py-0.5 rounded bg-[#1c2230] border border-[#283042] text-zinc-200 hover:text-white"
            >
              {sortBy === 'newest' ? 'Mais Recentes Primeiro' : 'Mais Antigos Primeiro'}
            </button>
          </div>
        </div>

        {filteredInteractions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Radio className="w-10 h-10 mx-auto text-zinc-600 animate-pulse" />
            <div className="text-sm font-semibold text-zinc-300">Nenhuma interação externa registrada no filtro</div>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Dispare um dos botões de simulação acima (+DNS, +HTTP, +HTTPS, +LDAP) ou utilize payloads do OOB Collaborator em seu alvo para registrar callbacks externos reais.
            </p>
            <div className="pt-2">
              <button
                onClick={() => handleSimulate('DNS')}
                className="px-3 py-1.5 text-xs font-mono rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 transition-all"
              >
                Gerar Interação DNS de Teste
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-[#1f2433] bg-[#0c0e14] text-[10px] text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp & Protocolo</th>
                  <th className="py-3 px-4">Alvo / Subdomínio / Caminho</th>
                  <th className="py-3 px-4">Origem (IP & DNS Reverso)</th>
                  <th className="py-3 px-4">Payload & Tag</th>
                  <th className="py-3 px-4">Dados Exfiltrados / Decodificados</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#181d2a]">
                {filteredInteractions.map((item) => {
                  const isLatest = item.id === latestHitId;
                  const isSelected = selectedInteraction?.id === item.id;
                  
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedInteraction(item)}
                      className={`hover:bg-[#161a26] cursor-pointer transition-all ${
                        isSelected ? 'bg-cyan-500/10 border-l-4 border-l-cyan-400' : ''
                      } ${isLatest ? 'animate-pulse bg-emerald-500/5' : ''}`}
                    >
                      {/* Timestamp & Protocol */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              item.protocol === 'DNS'
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                                : item.protocol === 'HTTP'
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                : item.protocol === 'HTTPS'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : item.protocol === 'LDAP'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {item.protocol}
                          </span>
                          <span className="text-zinc-300 text-[11px]">{item.timestamp}</span>
                        </div>
                        {item.payloadType && (
                          <span className="text-[10px] text-zinc-400 block mt-0.5">
                            {item.payloadType}
                          </span>
                        )}
                      </td>

                      {/* Subdomain or Path */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 max-w-xs">
                          {item.httpMethod && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#1e2333] text-zinc-300 border border-[#2d3448]">
                              {item.httpMethod}
                            </span>
                          )}
                          <span className="text-white font-medium truncate" title={item.subdomainOrPath}>
                            {item.subdomainOrPath}
                          </span>
                        </div>
                      </td>

                      {/* Source Origin */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="text-emerald-400 font-bold">{item.sourceIp}</span>
                        </div>
                        {item.geoEstimate && (
                          <span className="text-[10px] text-zinc-400 block mt-0.5 truncate max-w-xs">
                            {item.geoEstimate}
                          </span>
                        )}
                        {item.sourceReverseDns && (
                          <span className="text-[10px] text-zinc-400 block truncate max-w-xs font-mono">
                            {item.sourceReverseDns}
                          </span>
                        )}
                      </td>

                      {/* Correlated Tag */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-[#1a1f2e] border border-[#2a324b] text-cyan-300 font-bold">
                          {item.correlatedTag || 'default'}
                        </span>
                        {item.status && (
                          <span className={`ml-1.5 text-[9px] px-1.5 py-0.2 rounded uppercase font-bold ${
                            item.status === 'exfiltrated'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : item.status === 'verified'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-zinc-700/40 text-zinc-400'
                          }`}>
                            {item.status}
                          </span>
                        )}
                      </td>

                      {/* Data Exfiltrated / Decoded Preview */}
                      <td className="py-3 px-4">
                        {item.decodedData || item.dataExfiltrated ? (
                          <div className="max-w-xs">
                            <span className="text-amber-300 font-medium text-[11px] block truncate" title={item.decodedData || item.dataExfiltrated}>
                              {item.decodedData || item.dataExfiltrated}
                            </span>
                            {item.dataExfiltrated && item.decodedData && (
                              <span className="text-[10px] text-zinc-400 block truncate font-mono">
                                Raw: {item.dataExfiltrated}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-400 text-[10px] italic">Sem payload adicional</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedInteraction(item)}
                            className="p-1.5 rounded-lg bg-[#161a23] border border-[#283042] text-zinc-300 hover:text-white hover:border-cyan-500/40 transition-all"
                            title="Inspecionar detalhes da requisição"
                          >
                            <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          </button>

                          <button
                            onClick={() => copyToClipboard(generateMarkdownEvidence(item), `ev-${item.id}`)}
                            className="p-1.5 rounded-lg bg-[#161a23] border border-[#283042] text-zinc-300 hover:text-white hover:border-amber-500/40 transition-all"
                            title="Copiar bloco de evidência em Markdown"
                          >
                            {copiedKey === `ev-${item.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-zinc-400" />
                            )}
                          </button>

                          {onNavigateToPoc && item.subdomainOrPath && (
                            <button
                              onClick={() => {
                                const url = item.subdomainOrPath.startsWith('http')
                                  ? item.subdomainOrPath
                                  : `https://${item.subdomainOrPath}`;
                                onNavigateToPoc(url, item.requestBody || item.dataExfiltrated);
                              }}
                              className="p-1.5 rounded-lg bg-[#161a23] border border-[#283042] text-zinc-300 hover:text-white hover:border-blue-500/40 transition-all"
                              title="Enviar endpoint para o PoC Request Builder"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                            </button>
                          )}

                          <button
                            onClick={(e) => handleDelete(item.id, e)}
                            className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all"
                            title="Remover este registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deep Callback Inspector Drawer / Modal */}
      {selectedInteraction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-3xl rounded-2xl bg-[#0f1118] border border-[#252b3d] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#252b3d] flex items-center justify-between bg-[#141722]">
              <div className="flex items-center gap-2.5">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${
                    selectedInteraction.protocol === 'DNS'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                      : selectedInteraction.protocol === 'HTTP'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      : selectedInteraction.protocol === 'HTTPS'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : selectedInteraction.protocol === 'LDAP'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {selectedInteraction.protocol}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                    <span>Callback Inspector: {selectedInteraction.id}</span>
                  </h3>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    Recebido em: {selectedInteraction.timestamp}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedInteraction(null)}
                className="p-1.5 rounded-lg bg-[#1c2233] text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
              {/* Origin Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-[#141724] border border-[#23293e] space-y-1">
                  <span className="text-[10px] text-zinc-400 uppercase">IP de Origem</span>
                  <div className="text-emerald-400 font-bold text-sm">{selectedInteraction.sourceIp}</div>
                  <div className="text-[10px] text-zinc-400 truncate">{selectedInteraction.sourceReverseDns || 'Sem PTR reverso'}</div>
                </div>

                <div className="p-3 rounded-xl bg-[#141724] border border-[#23293e] space-y-1">
                  <span className="text-[10px] text-zinc-400 uppercase">Localização / ASN</span>
                  <div className="text-cyan-300 font-bold text-sm truncate">{selectedInteraction.geoEstimate || 'Global Edge'}</div>
                  <div className="text-[10px] text-zinc-400">Origem da requisição externa</div>
                </div>

                <div className="p-3 rounded-xl bg-[#141724] border border-[#23293e] space-y-1">
                  <span className="text-[10px] text-zinc-400 uppercase">Tag / Status</span>
                  <div className="text-purple-300 font-bold text-sm truncate">{selectedInteraction.correlatedTag || 'N/A'}</div>
                  <div className="text-[10px] text-emerald-400 uppercase">{selectedInteraction.status || 'Verified'}</div>
                </div>
              </div>

              {/* Endpoint or Subdomain */}
              <div className="p-3.5 rounded-xl bg-[#141724] border border-[#23293e] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold">Endpoint / Hostname Acessado</span>
                  <button
                    onClick={() => copyToClipboard(selectedInteraction.subdomainOrPath, 'endpoint-modal')}
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    {copiedKey === 'endpoint-modal' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0a0c12] border border-[#1e2333] text-emerald-300 break-all select-all font-mono text-xs">
                  {selectedInteraction.subdomainOrPath}
                </div>
              </div>

              {/* Exfiltrated Data section if available */}
              {(selectedInteraction.dataExfiltrated || selectedInteraction.decodedData) && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-bold">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Dados Exfiltrados Capturados</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div className="p-2.5 rounded-lg bg-[#0a0c12] border border-[#1e2333]">
                      <span className="text-[10px] text-zinc-400 block uppercase">Payload Bruto (Raw)</span>
                      <span className="text-white font-mono break-all">{selectedInteraction.dataExfiltrated || 'N/A'}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#0a0c12] border border-[#1e2333]">
                      <span className="text-[10px] text-zinc-400 block uppercase">Decodificação Automática</span>
                      <span className="text-emerald-400 font-bold font-mono break-all">{selectedInteraction.decodedData || selectedInteraction.dataExfiltrated}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Query Parameters if available */}
              {selectedInteraction.queryParameters && Object.keys(selectedInteraction.queryParameters).length > 0 && (
                <div className="p-3.5 rounded-xl bg-[#141724] border border-[#23293e] space-y-2">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold">Parâmetros de Consulta (Query String)</span>
                  <div className="p-2.5 rounded-lg bg-[#0a0c12] border border-[#1e2333] space-y-1">
                    {Object.entries(selectedInteraction.queryParameters).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between border-b border-[#181d2a] pb-1 last:border-0 last:pb-0">
                        <span className="text-cyan-400">{k}</span>
                        <span className="text-zinc-200 break-all">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Headers if available */}
              {selectedInteraction.headers && Object.keys(selectedInteraction.headers).length > 0 && (
                <div className="p-3.5 rounded-xl bg-[#141724] border border-[#23293e] space-y-2">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold">Cabeçalhos HTTP Brutos</span>
                  <div className="p-2.5 rounded-lg bg-[#0a0c12] border border-[#1e2333] text-zinc-300 font-mono text-[11px] leading-relaxed max-h-44 overflow-y-auto">
                    {Object.entries(selectedInteraction.headers).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <span className="text-cyan-400 font-bold shrink-0">{k}:</span>
                        <span className="text-zinc-200 break-all">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Request Body if available */}
              {selectedInteraction.requestBody && (
                <div className="p-3.5 rounded-xl bg-[#141724] border border-[#23293e] space-y-2">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold">Corpo da Requisição POST</span>
                  <pre className="p-2.5 rounded-lg bg-[#0a0c12] border border-[#1e2333] text-emerald-300 font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
                    {selectedInteraction.requestBody}
                  </pre>
                </div>
              )}

              {/* Markdown Triage Evidence Box */}
              <div className="p-3.5 rounded-xl bg-[#141724] border border-[#23293e] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Bloco de Evidência Formatado para Relatório (Markdown)</span>
                  </span>
                  <button
                    onClick={() => copyToClipboard(generateMarkdownEvidence(selectedInteraction), 'md-block')}
                    className="text-[11px] text-amber-300 hover:underline flex items-center gap-1"
                  >
                    {copiedKey === 'md-block' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar Markdown</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-[#0a0c12] border border-[#1e2333] text-zinc-300 font-mono text-[10px] leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
                  {generateMarkdownEvidence(selectedInteraction)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#252b3d] flex items-center justify-between flex-wrap gap-2 bg-[#141722]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSearchQuery(selectedInteraction.sourceIp)}
                  className="px-3 py-1.5 rounded-lg bg-[#1c2233] border border-[#2d364f] text-zinc-300 hover:text-white text-xs font-mono flex items-center gap-1.5"
                >
                  <Filter className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Filtrar por este IP</span>
                </button>

                {onNavigateToPoc && (
                  <button
                    onClick={() => {
                      const url = selectedInteraction.subdomainOrPath.startsWith('http')
                        ? selectedInteraction.subdomainOrPath
                        : `https://${selectedInteraction.subdomainOrPath}`;
                      onNavigateToPoc(url, selectedInteraction.requestBody || selectedInteraction.dataExfiltrated);
                      setSelectedInteraction(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-300 hover:bg-blue-500/30 text-xs font-mono flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Enviar para PoC Builder</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(generateMarkdownEvidence(selectedInteraction), 'md-copy-footer')}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 text-xs font-mono font-semibold flex items-center gap-1.5"
                >
                  {copiedKey === 'md-copy-footer' ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>Copiar Evidência Completa</span>
                </button>
                <button
                  onClick={() => setSelectedInteraction(null)}
                  className="px-3 py-1.5 rounded-lg bg-[#1e2333] border border-[#2d364f] text-zinc-300 hover:text-white text-xs font-mono"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
