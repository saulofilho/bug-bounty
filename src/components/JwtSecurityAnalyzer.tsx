import React, { useState, useMemo } from 'react';
import { 
  KeyRound, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Copy, 
  Check, 
  FileCode, 
  Sparkles, 
  RefreshCw, 
  ExternalLink,
  Lock,
  Unlock,
  Eye,
  Info
} from 'lucide-react';
import { parseAndAuditJwt, forgeModifiedJwt, SAMPLE_JWTS, JwtHeader, JwtPayload } from '../utils/jwtSecurityEngine';

interface JwtSecurityAnalyzerProps {
  reportId?: string;
  reportTitle?: string;
}

export const JwtSecurityAnalyzer: React.FC<JwtSecurityAnalyzerProps> = ({
  reportId,
  reportTitle
}) => {
  const [tokenInput, setTokenInput] = useState<string>(SAMPLE_JWTS[0].token);
  const [activeSegment, setActiveSegment] = useState<'HEADER' | 'PAYLOAD' | 'SIGNATURE'>('PAYLOAD');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [forgedSignMode, setForgedSignMode] = useState<'NONE' | 'KEEP_SIGNATURE'>('NONE');

  const auditResult = useMemo(() => {
    return parseAndAuditJwt(tokenInput);
  }, [tokenInput]);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleApplySample = (sampleToken: string) => {
    setTokenInput(sampleToken);
  };

  // Generate modified PoC token
  const forgedToken = useMemo(() => {
    if (!auditResult.isValidFormat) return '';
    return forgeModifiedJwt(auditResult.header, auditResult.payload, forgedSignMode);
  }, [auditResult, forgedSignMode]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-60 h-60 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                <span>JWT Security Analyzer</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">100% Client-Side Inspection</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Auditoria e Superfície de Ataque JWT</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Decodificação e inspeção de vulnerabilidades críticas em JSON Web Tokens: algoritmo <code className="text-amber-300">none</code>, injeções em cabeçalho (<code className="text-amber-300">jku/jwk/kid</code>), validade temporal (<code className="text-amber-300">exp/nbf</code>) e vazamento de dados sensíveis.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap md:flex-col gap-1.5 shrink-0">
            <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">Cenários Prontos:</span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_JWTS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  id={`btn-sample-jwt-${idx}`}
                  onClick={() => handleApplySample(sample.token)}
                  className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#232336] border border-[#2c2c3e] text-zinc-300 text-[11px] font-mono transition-colors"
                  title={sample.description}
                >
                  {sample.name.split(':')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Input + Visual Segments + Audit Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6 Cols: Token Input & Interactive Decoded Segments */}
        <div className="lg:col-span-7 space-y-5">
          {/* Raw Token Input */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="jwt-raw-input" className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Token JWT Codificado:</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy('raw-jwt', tokenInput)}
                  className="px-2.5 py-1 rounded-lg bg-[#1c1c28] hover:bg-[#28283a] text-zinc-300 text-xs font-mono flex items-center gap-1 border border-[#2a2a3c] transition-colors"
                >
                  {copiedKey === 'raw-jwt' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTokenInput('')}
                  className="px-2.5 py-1 rounded-lg bg-[#1c1c28] hover:bg-[#28283a] text-zinc-400 hover:text-zinc-200 text-xs font-mono transition-colors"
                >
                  Limpar
                </button>
              </div>
            </div>

            <textarea
              id="jwt-raw-input"
              rows={3}
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              placeholder="Cole seu token JWT aqui (ex: eyJhbGciOi...)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0c10] border border-[#232330] text-amber-300/90 font-mono text-xs focus:outline-none focus:border-amber-500/50 resize-none break-all"
            />

            {/* Error banner if invalid */}
            {!auditResult.isValidFormat && auditResult.error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{auditResult.error}</span>
              </div>
            )}
          </div>

          {/* Decoded Interactive View: Header, Payload, Signature */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e1e28] pb-3">
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSegment('HEADER')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    activeSegment === 'HEADER' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Header (Cabeçalho)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSegment('PAYLOAD')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    activeSegment === 'PAYLOAD' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Payload (Claims)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSegment('SIGNATURE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    activeSegment === 'SIGNATURE' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Assinatura
                </button>
              </div>

              <span className="text-[11px] font-mono text-zinc-500">
                {activeSegment === 'HEADER' && (auditResult.header.alg || 'N/A')}
                {activeSegment === 'PAYLOAD' && `${Object.keys(auditResult.payload).length} claims`}
                {activeSegment === 'SIGNATURE' && (auditResult.signature ? 'Assinatura presente' : 'Sem assinatura')}
              </span>
            </div>

            {/* Segment Content Display */}
            {activeSegment === 'HEADER' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Algoritmo & Parâmetros Criptográficos</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('header-json', JSON.stringify(auditResult.header, null, 2))}
                    className="text-xs font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copiar JSON</span>
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-[#0d0d12] border border-[#20202c] text-red-300 font-mono text-xs overflow-x-auto">
                  {JSON.stringify(auditResult.header, null, 2)}
                </pre>
              </div>
            )}

            {activeSegment === 'PAYLOAD' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Dados do Usuário e Privilégios (Claims)</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('payload-json', JSON.stringify(auditResult.payload, null, 2))}
                    className="text-xs font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copiar JSON</span>
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-[#0d0d12] border border-[#20202c] text-purple-300 font-mono text-xs overflow-x-auto">
                  {JSON.stringify(auditResult.payload, null, 2)}
                </pre>

                {/* Expiration Summary Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-2.5 rounded-xl bg-[#161622] border border-[#242436] flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400">Expiração (exp):</span>
                    <span className={auditResult.expirationStatus === 'EXPIRED' ? 'text-rose-400 font-bold' : auditResult.expirationStatus === 'NO_EXP' ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                      {auditResult.expirationFormatted || 'Ausente'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#161622] border border-[#242436] flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400">Emitido em (iat):</span>
                    <span className="text-zinc-300 font-mono">
                      {auditResult.issuedAtFormatted || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeSegment === 'SIGNATURE' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Hash de Verificação da Assinatura</span>
                  <span className="text-[11px] font-mono text-zinc-500">
                    {auditResult.signature.length} caracteres
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-[#0d0d12] border border-[#20202c] text-cyan-300 font-mono text-xs break-all">
                  {auditResult.signature || '<Nenhuma assinatura (Token sem proteção criptográfica)>'}
                </div>
              </div>
            )}
          </div>

          {/* PoC Forger Generator for Authorized Bug Bounty Testing */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Gerador de PoC: Token Forjado (Testes de Falha de Validação)</h3>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setForgedSignMode('NONE')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${forgedSignMode === 'NONE' ? 'bg-amber-500 text-black font-bold' : 'bg-[#1a1a24] text-zinc-400'}`}
                >
                  alg: "none"
                </button>
                <button
                  type="button"
                  onClick={() => setForgedSignMode('KEEP_SIGNATURE')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${forgedSignMode === 'KEEP_SIGNATURE' ? 'bg-amber-500 text-black font-bold' : 'bg-[#1a1a24] text-zinc-400'}`}
                >
                  Manter Assinatura
                </button>
              </div>
            </div>

            <p className="text-xs text-zinc-400">
              Gera uma variante do token contendo modificações no cabeçalho ou no payload para demonstrar falhas de verificação no endpoint avaliado.
            </p>

            <div className="bg-[#0c0c10] border border-[#232332] rounded-xl p-3 flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-300 truncate max-w-[450px]" title={forgedToken}>
                {forgedToken || 'Carregue um token válido acima'}
              </span>
              <button
                type="button"
                onClick={() => handleCopy('forged-token', forgedToken)}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {copiedKey === 'forged-token' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar PoC</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Security Score & Vulnerability Findings */}
        <div className="lg:col-span-5 space-y-5">
          {/* Security Score Meter */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-6 text-center space-y-3">
            <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">Índice de Postura JWT</span>
            <div className="flex items-baseline justify-center gap-2">
              <span className={`text-6xl font-black font-mono ${
                auditResult.securityScore >= 80 ? 'text-emerald-400' : auditResult.securityScore >= 50 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {auditResult.securityScore}
              </span>
              <span className="text-xl font-mono text-zinc-500">/ 100</span>
            </div>

            <div className="inline-block">
              <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                auditResult.securityScore >= 80 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                auditResult.securityScore >= 50 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                'bg-rose-500/20 text-rose-300 border-rose-500/30'
              }`}>
                {auditResult.securityScore >= 80 ? 'Postura Segura' : auditResult.securityScore >= 50 ? 'Atenção Necessária' : 'Vulnerabilidades Críticas Detectadas'}
              </span>
            </div>
          </div>

          {/* Audit Findings List */}
          <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e1e28] pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Achados de Segurança ({auditResult.findings.length})</h3>
              </div>
              <span className="text-xs font-mono text-zinc-500">Regras OWASP / RFC 7519</span>
            </div>

            {auditResult.findings.length === 0 ? (
              <div className="p-5 text-center text-zinc-400 space-y-2">
                <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-xs">Nenhuma vulnerabilidade ou anomalia evidente identificada no token.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {auditResult.findings.map(finding => (
                  <div
                    key={finding.id}
                    className={`p-3.5 rounded-xl border space-y-2 ${
                      finding.severity === 'CRITICAL' ? 'bg-rose-500/10 border-rose-500/30' :
                      finding.severity === 'HIGH' ? 'bg-amber-500/10 border-amber-500/30' :
                      finding.severity === 'MEDIUM' ? 'bg-yellow-500/10 border-yellow-500/30' :
                      'bg-[#171722] border-[#252538]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        {finding.severity === 'CRITICAL' && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                        {finding.title}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        finding.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' :
                        finding.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-300' :
                        finding.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-zinc-500/20 text-zinc-300'
                      }`}>
                        {finding.severity}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {finding.description}
                    </p>

                    <div className="p-2 rounded-lg bg-[#0c0c10]/70 border border-[#20202e] text-[11px] text-zinc-300 space-y-1">
                      <div className="text-[10px] font-mono font-bold text-amber-400 uppercase">Remediação Recomendada:</div>
                      <div>{finding.remediation}</div>
                      {finding.cwe && <div className="text-[10px] text-zinc-500 font-mono">{finding.cwe}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
