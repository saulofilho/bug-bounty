import React, { useState, useMemo } from 'react';
import { 
  Package, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  Terminal, 
  Layers, 
  Sliders, 
  Lock, 
  FileCode,
  ArrowRight
} from 'lucide-react';

const SENSITIVE_FIELDS_LIST = [
  'role', 'is_admin', 'isAdmin', 'is_verified', 'isVerified',
  'permissions', 'balance', 'credit', 'subscription_tier', 'plan',
  'account_type', 'verified_email', 'status', 'superadmin', 'internal_notes'
];

interface FrameworkHppRule {
  framework: string;
  server: string;
  behavior: string;
  exampleOutput: string;
  vulnerabilityRisk: string;
}

const HPP_RULES: FrameworkHppRule[] = [
  {
    framework: 'Node.js / Express',
    server: 'V8 / Express req.query',
    behavior: 'Converte parâmetros repetidos em um Array',
    exampleOutput: 'req.query.id = ["1", "2"]',
    vulnerabilityRisk: 'Type Confusion: Se a aplicação espera string e faz id.trim(), gera crash 500 (DoS) ou bypass em checagens SQL.'
  },
  {
    framework: 'PHP',
    server: 'Apache / PHP-FPM $_GET',
    behavior: 'Prevalece o ÚLTIMO parâmetro informado',
    exampleOutput: '$_GET["id"] = "2"',
    vulnerabilityRisk: 'WAF Evasion: O WAF pode inspecionar o 1º parâmetro (limpo), enquanto o PHP processa o 2º (malicioso).'
  },
  {
    framework: 'Python / Flask',
    server: 'Werkzeug request.args.get()',
    behavior: 'Prevalece o PRIMEIRO parâmetro informado',
    exampleOutput: 'request.args.get("id") = "1"',
    vulnerabilityRisk: 'Bypass de validação reversa em microsserviços.'
  },
  {
    framework: 'ASP.NET',
    server: 'IIS / Request.QueryString',
    behavior: 'Concatena os valores separados por vírgula',
    exampleOutput: 'Request.QueryString["id"] = "1,2"',
    vulnerabilityRisk: 'Injeção de parâmetros em consultas SQL compostas IN (1,2).'
  }
];

export const MassAssignmentHppMatrix: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'MASS_ASSIGNMENT' | 'HPP'>('MASS_ASSIGNMENT');
  const [jsonPayload, setJsonPayload] = useState<string>(
    '{\n  "username": "attacker",\n  "email": "user@target.com",\n  "password": "Password123!",\n  "role": "admin",\n  "is_verified": true,\n  "subscription_tier": "enterprise"\n}'
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // HPP test query
  const [hppQuery, setHppQuery] = useState<string>('id=1&action=view&id=2');

  // Mass Assignment inspection
  const massAssignmentAudit = useMemo(() => {
    try {
      const parsed = JSON.parse(jsonPayload);
      const keys = Object.keys(parsed);
      const injectedSensitive = keys.filter(k => 
        SENSITIVE_FIELDS_LIST.some(sf => sf.toLowerCase() === k.toLowerCase())
      );

      return {
        validJson: true,
        totalFields: keys.length,
        sensitiveFound: injectedSensitive,
        isVulnerable: injectedSensitive.length > 0,
        risk: injectedSensitive.length > 0 ? 'CRÍTICO' : 'SEGURO'
      };
    } catch {
      return {
        validJson: false,
        totalFields: 0,
        sensitiveFound: [],
        isVulnerable: false,
        risk: 'JSON INVÁLIDO'
      };
    }
  }, [jsonPayload]);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                <span>Mass Assignment & Parameter Pollution Studio</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">Over-Posting & HTTP Parameter Precedence</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Matriz de Mass Assignment (Over-Posting) e Poluição de Parâmetros (HPP)
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Inspecione falhas de atribuição em massa onde campos restritos do modelo de dados são sobrescritos diretamente pelo cliente, e analise divergências de precedência entre frameworks (HPP) que permitem contornar WAFs.
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 pt-5 mt-5 border-t border-[#1e1e28]">
          <button
            type="button"
            onClick={() => setActiveTab('MASS_ASSIGNMENT')}
            className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'MASS_ASSIGNMENT' ? 'bg-indigo-500 text-white' : 'bg-[#181824] text-zinc-400'
            }`}
          >
            Mass Assignment / Over-Posting
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('HPP')}
            className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'HPP' ? 'bg-indigo-500 text-white' : 'bg-[#181824] text-zinc-400'
            }`}
          >
            Matriz de Precedência HPP
          </button>
        </div>
      </div>

      {/* SECTION 1: MASS ASSIGNMENT */}
      {activeTab === 'MASS_ASSIGNMENT' && (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#1e1e28] pb-2 text-xs font-mono">
              <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span>Payload de Entrada (POST / PUT / PATCH Body)</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopy('mass-payload', jsonPayload)}
                className="text-zinc-400 hover:text-white flex items-center gap-1"
              >
                {copiedKey === 'mass-payload' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copiar JSON</span>
              </button>
            </div>

            <textarea
              rows={7}
              value={jsonPayload}
              onChange={e => setJsonPayload(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0c10] border border-[#232330] text-indigo-300 font-mono text-xs focus:outline-none focus:border-indigo-500/50 resize-none leading-relaxed"
            />

            {/* Audit Status */}
            <div className={`p-4 rounded-xl border space-y-2 text-xs font-mono ${
              massAssignmentAudit.isVulnerable ? 'bg-rose-500/10 border-rose-500/40' : 'bg-emerald-500/10 border-emerald-500/40'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-zinc-300 font-bold">Diagnóstico de Campos Sensíveis Sobrepostos:</span>
                <span className={`px-2 py-0.5 rounded font-bold ${
                  massAssignmentAudit.isVulnerable ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {massAssignmentAudit.risk}
                </span>
              </div>

              {massAssignmentAudit.isVulnerable && (
                <div className="space-y-1">
                  <p className="text-rose-300">
                    Foram encontrados <strong>{massAssignmentAudit.sensitiveFound.length}</strong> campos de privilégio injetados pelo cliente:
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {massAssignmentAudit.sensitiveFound.map(f => (
                      <span key={f} className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                        {f}
                      </span>
                    ))}
                  </div>
                  <p className="text-zinc-400 text-[11px] pt-1">
                    Se o backend utilizar binding automático direto na entidade do banco (ex: <code>user.update(req.body)</code>), o atacante obterá status administrativo imediatamente.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Remediation Snippet */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3 shadow-lg">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1e1e28] pb-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Remediação via DTO e Allowlists Estritas (Node / Express / TypeScript)</span>
            </h3>

            <pre className="p-3.5 rounded-xl bg-[#0a0a0f] border border-[#1e1e2a] text-emerald-300 font-mono text-xs overflow-x-auto leading-relaxed">
{`// NUNCA passe req.body diretamente para o banco de dados!
// Crie um DTO com allowlist explícita de campos permitidos ao usuário:
const allowedFields = {
  username: req.body.username,
  email: req.body.email,
  passwordHash: await hashPassword(req.body.password)
};

// Campos como 'role', 'is_admin' ou 'tier' só podem ser modificados por rotas internas de admin
await prisma.user.update({
  where: { id: req.user.id },
  data: allowedFields
});`}
            </pre>
          </div>
        </div>
      )}

      {/* SECTION 2: HPP MATRIX */}
      {activeTab === 'HPP' && (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold text-zinc-300">Query String com Parâmetros Repetidos:</label>
              <input
                type="text"
                value={hppQuery}
                onChange={e => setHppQuery(e.target.value)}
                className="w-full bg-[#0c0c10] border border-[#232330] rounded-xl px-3 py-2 text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          {/* Precedence Table */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4 shadow-lg">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1e1e28] pb-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Comportamento de Precedência por Framework Backend</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {HPP_RULES.map((rule, idx) => (
                <div key={idx} className="bg-[#161622] p-4 rounded-xl border border-[#222232] space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold">{rule.framework}</span>
                    <span className="text-[10px] text-zinc-400">{rule.server}</span>
                  </div>

                  <div className="text-indigo-300 font-bold">{rule.behavior}</div>

                  <pre className="p-2 rounded bg-[#0a0a0f] text-emerald-300 text-[11px]">
                    {rule.exampleOutput}
                  </pre>

                  <p className="text-zinc-400 text-[11px] leading-relaxed pt-1">
                    <strong>Risco:</strong> {rule.vulnerabilityRisk}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
