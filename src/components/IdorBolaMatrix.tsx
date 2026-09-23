import React, { useState, useMemo } from 'react';
import { 
  Users, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  Terminal, 
  Layers, 
  Key, 
  Lock, 
  ArrowRight,
  Database,
  Code2
} from 'lucide-react';

interface EndpointConfig {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  idType: 'NUMERIC' | 'UUID_V1' | 'UUID_V4' | 'HASH_MD5';
  userAAllowed: boolean;
  userBTarget: boolean;
  tenantEnforced: boolean;
  objectOwnerCheck: boolean;
}

const DEFAULT_ENDPOINTS: EndpointConfig[] = [
  {
    id: 'ep-1',
    name: 'Obter Dados Cadastrais e PII',
    method: 'GET',
    path: '/api/v1/users/{user_id}/profile',
    idType: 'NUMERIC',
    userAAllowed: false,
    userBTarget: true,
    tenantEnforced: false,
    objectOwnerCheck: false
  },
  {
    id: 'ep-2',
    name: 'Download de Fatura Financeira',
    method: 'GET',
    path: '/api/v1/invoices/{invoice_uuid}/pdf',
    idType: 'UUID_V1',
    userAAllowed: false,
    userBTarget: true,
    tenantEnforced: true,
    objectOwnerCheck: false
  },
  {
    id: 'ep-3',
    name: 'Alterar Senha de Outro Usuário',
    method: 'PUT',
    path: '/api/v1/accounts/{account_id}/credentials',
    idType: 'NUMERIC',
    userAAllowed: false,
    userBTarget: true,
    tenantEnforced: false,
    objectOwnerCheck: false
  },
  {
    id: 'ep-4',
    name: 'Consulta de Logs de Auditoria Segura',
    method: 'GET',
    path: '/api/v1/tenants/{tenant_id}/audit-logs/{log_id}',
    idType: 'UUID_V4',
    userAAllowed: false,
    userBTarget: true,
    tenantEnforced: true,
    objectOwnerCheck: true
  }
];

export const IdorBolaMatrix: React.FC = () => {
  const [endpoints, setEndpoints] = useState<EndpointConfig[]>(DEFAULT_ENDPOINTS);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>(DEFAULT_ENDPOINTS[0].id);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Predictability test input
  const [testId, setTestId] = useState<string>('550e8400-e29b-11d4-a716-446655440000');

  const selectedEndpoint = useMemo(() => {
    return endpoints.find(e => e.id === selectedEndpointId) || endpoints[0];
  }, [endpoints, selectedEndpointId]);

  // ID Predictability Analysis
  const idAnalysis = useMemo(() => {
    const trimmed = testId.trim();
    if (/^\d+$/.test(trimmed)) {
      return {
        type: 'Sequencial Numérico / Autoincrement',
        risk: 'CRÍTICO',
        details: 'Facilmente enumerável em lote por atacantes (1001, 1002, 1003). Permite raspagem completa do banco de dados.',
        suggestion: 'Migre para UUID v4 criptográfico ou utilize IDs ofuscados (Hashids / Sqids).'
      };
    }
    // UUID v1 detection (time-based)
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)) {
      return {
        type: 'UUID v1 (Baseado em Timestamp e MAC Address)',
        risk: 'ALTO',
        details: 'Vaza o endereço físico de rede do servidor e a hora exata da criação. Permite prever UUIDs gerados em sequência temporal próxima.',
        suggestion: 'Substitua por UUID v4 (RFC 4122) gerado por CSPRNG.'
      };
    }
    // UUID v4 detection
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)) {
      return {
        type: 'UUID v4 (Pseudoaleatório Criptográfico)',
        risk: 'BAIXO',
        details: '122 bits de entropia. Praticamente impossível de adivinhar ou enumerar por força bruta.',
        suggestion: 'Mantenha o uso de UUID v4, mas nunca confie na imprevisibilidade como substituto de autorização.'
      };
    }
    if (/^[0-9a-f]{32}$/i.test(trimmed)) {
      return {
        type: 'Possível Hash MD5 de Chave Numérica ou Email',
        risk: 'MÉDIO',
        details: 'Se for MD5 de um ID sequencial (ex: md5("1001")), pode ser revertido rapidamente via rainbow tables.',
        suggestion: 'Evite expor hashes previsíveis de chaves primárias.'
      };
    }
    return {
      type: 'Formato Alfanumérico Genérico',
      risk: 'MÉDIO',
      details: 'Necessário analisar se a entropia é suficiente contra enumeração automatizada.',
      suggestion: 'Garanta comprimento mínimo de 16 caracteres com alta entropia.'
    };
  }, [testId]);

  const toggleEndpointField = (id: string, field: 'tenantEnforced' | 'objectOwnerCheck') => {
    setEndpoints(prev => prev.map(e => e.id === id ? { ...e, [field]: !e[field] } : e));
  };

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>BOLA / IDOR Authorization Matrix</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">OWASP API Security Top 10 #1</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Matriz de Controle de Acesso a Objetos (BOLA / IDOR)
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Avalie falhas onde a autorização falha em validar se o usuário autenticado é o legítimo proprietário do objeto requisitado. Simule permissões entre contas, avalie previsibilidade de identificadores e implemente defesas robustas.
            </p>
          </div>
        </div>
      </div>

      {/* Cross-User Matrix Table */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1e1e28] pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-rose-400" />
            <span>Matriz de Autorização Multi-Tenant e Propriedade de Objeto</span>
          </h3>
          <span className="text-xs text-zinc-400 font-mono">Clique nos toggles para auditar impactos</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#222232] text-zinc-400">
                <th className="py-2.5 px-3">Método & Rota Alvo</th>
                <th className="py-2.5 px-3">Tipo de ID</th>
                <th className="py-2.5 px-3 text-center">Filtro de Tenant ID</th>
                <th className="py-2.5 px-3 text-center">Validação de Dono (Owner Check)</th>
                <th className="py-2.5 px-3 text-center">Diagnóstico BOLA / IDOR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c1c28]">
              {endpoints.map(ep => {
                const isVulnerable = !ep.objectOwnerCheck;
                return (
                  <tr key={ep.id} className="hover:bg-[#151520] transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ep.method === 'GET' ? 'bg-cyan-500/20 text-cyan-300' :
                          ep.method === 'PUT' ? 'bg-amber-500/20 text-amber-300' :
                          ep.method === 'DELETE' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {ep.method}
                        </span>
                        <span className="text-zinc-200 font-bold">{ep.path}</span>
                      </div>
                      <div className="text-[11px] text-zinc-500 pt-0.5">{ep.name}</div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]">
                        {ep.idType}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleEndpointField(ep.id, 'tenantEnforced')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          ep.tenantEnforced ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {ep.tenantEnforced ? 'SIM (Tenant Seguro)' : 'NÃO (Vazamento Cross-Org)'}
                      </button>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleEndpointField(ep.id, 'objectOwnerCheck')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          ep.objectOwnerCheck ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {ep.objectOwnerCheck ? 'VALIDADO (userId == owner)' : 'AUSENTE (Vulnerável a IDOR)'}
                      </button>
                    </td>

                    <td className="py-3 px-3 text-center">
                      {isVulnerable ? (
                        <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold flex items-center justify-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          <span>BOLA CRÍTICA</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>AUTORIZADO</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ID Predictability & Entropy Analyzer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4 shadow-lg">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1e1e28] pb-2">
            <Key className="w-4 h-4 text-amber-400" />
            <span>Auditor de Previsibilidade de Identificadores (ID Entropia)</span>
          </h3>

          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-zinc-300">Identificador Amostra para Análise:</label>
            <input
              type="text"
              value={testId}
              onChange={e => setTestId(e.target.value)}
              placeholder="Digite um número, UUID ou hash..."
              className="w-full bg-[#0c0c10] border border-[#232330] rounded-xl px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="bg-[#161622] p-4 rounded-xl border border-[#232333] space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Classificação:</span>
              <span className="text-white font-bold">{idAnalysis.type}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Risco de Enumeração:</span>
              <span className={`px-2 py-0.5 rounded font-bold ${
                idAnalysis.risk === 'CRÍTICO' ? 'bg-rose-500/20 text-rose-300' :
                idAnalysis.risk === 'ALTO' ? 'bg-red-500/20 text-red-300' :
                idAnalysis.risk === 'MÉDIO' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {idAnalysis.risk}
              </span>
            </div>
            <p className="text-zinc-300 text-[11px] leading-relaxed pt-1">{idAnalysis.details}</p>
            <div className="pt-1 text-emerald-400 text-[11px]">
              <strong>Recomendação:</strong> {idAnalysis.suggestion}
            </div>
          </div>
        </div>

        {/* Defense Snippet */}
        <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#1e1e28] pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span>Remediação Segura no Backend (Exemplo Node.js / Prisma)</span>
            </h3>
            <button
              type="button"
              onClick={() => handleCopy('prisma-fix', `// Consulta segura com amarração obrigatória de Tenant e User Owner
const invoice = await prisma.invoice.findFirst({
  where: {
    id: invoiceId,
    tenantId: req.user.tenantId, // Impede acesso cross-tenant
    userId: req.user.id          // Impede acesso entre usuários da mesma organização
  }
});

if (!invoice) {
  return res.status(404).json({ error: "Recurso não encontrado" });
}`)}
              className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1"
            >
              {copiedKey === 'prisma-fix' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>Copiar</span>
            </button>
          </div>

          <pre className="p-3.5 rounded-xl bg-[#0a0a0f] border border-[#1e1e2a] text-emerald-300 font-mono text-xs overflow-x-auto leading-relaxed">
{`// Consulta segura com amarração obrigatória de Tenant e User Owner
const invoice = await prisma.invoice.findFirst({
  where: {
    id: invoiceId,
    tenantId: req.user.tenantId, // Impede acesso cross-tenant
    userId: req.user.id          // Impede acesso entre usuários
  }
});

if (!invoice) {
  // Retorna 404 para não vazar a existência do ID alheio
  return res.status(404).json({ error: "Recurso não encontrado" });
}`}
          </pre>
        </div>
      </div>
    </div>
  );
};
