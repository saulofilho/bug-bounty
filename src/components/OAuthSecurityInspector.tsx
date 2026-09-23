import React, { useState, useMemo } from 'react';
import { 
  KeyRound, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  ExternalLink, 
  Terminal, 
  RefreshCw, 
  Lock, 
  Globe,
  Sliders
} from 'lucide-react';

interface OAuthIssue {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  description: string;
  remediation: string;
}

export const OAuthSecurityInspector: React.FC = () => {
  const [authUrl, setAuthUrl] = useState<string>(
    'https://idp.example.com/oauth/authorize?client_id=web-client-123&response_type=code&redirect_uri=https://app.example.com/oauth/callback&scope=openid%20profile%20email&state=s3cr3t_ant1_csrf_token_897123&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256'
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Parsed params
  const parsed = useMemo(() => {
    try {
      const url = new URL(authUrl);
      const params = Object.fromEntries(url.searchParams.entries());
      return {
        valid: true,
        host: url.hostname,
        protocol: url.protocol,
        pathname: url.pathname,
        params
      };
    } catch {
      return { valid: false, host: '', protocol: '', pathname: '', params: {} };
    }
  }, [authUrl]);

  // Security Audit Evaluation
  const auditResults = useMemo(() => {
    const issues: OAuthIssue[] = [];
    if (!parsed.valid) {
      issues.push({
        severity: 'CRITICAL',
        title: 'URL de Autorização Inválida',
        description: 'A URL fornecida não segue um formato de URI RFC 3986 válido.',
        remediation: 'Forneça uma URL completa iniciando com https://'
      });
      return { score: 0, issues };
    }

    const p = parsed.params;

    // 1. Check Protocol (HTTPS)
    if (parsed.protocol !== 'https:') {
      issues.push({
        severity: 'CRITICAL',
        title: 'Transmissão em Texto Claro (HTTP não seguro)',
        description: 'O fluxo de autorização está trafegando sobre HTTP inseguro, suscetível a interceptação MiTM de authorization codes e credenciais.',
        remediation: 'Exija estritamente HTTPS (TLS 1.3) para endpoints do Authorization Server e Client.'
      });
    }

    // 2. Check State parameter (CSRF protection)
    if (!p.state) {
      issues.push({
        severity: 'CRITICAL',
        title: 'Parâmetro `state` Ausente (Risco de Account Takeover via CSRF)',
        description: 'Sem o parâmetro state criptograficamente imprevisível vinculado à sessão do navegador, atacantes podem forçar a associação da conta da vítima à conta do atacante.',
        remediation: 'Gere um token state com alta entropia (ex: 128+ bits pseudoaleatórios) armazenado em cookie seguro com flag SameSite=Lax/Strict.'
      });
    } else if (p.state.length < 8) {
      issues.push({
        severity: 'MEDIUM',
        title: 'Parâmetro `state` de Baixa Entropia',
        description: 'O valor do parâmetro state é muito curto ou parece estático, permitindo adivinhação ou ataques de replay.',
        remediation: 'Utilize geradores criptograficamente seguros (ex: crypto.randomUUID ou secure random bytes).'
      });
    }

    // 3. Check Response Type & Flow
    const respType = p.response_type || '';
    if (respType.includes('token') && !respType.includes('code')) {
      issues.push({
        severity: 'HIGH',
        title: 'Uso de Implicit Grant Flow (`response_type=token`) Descontinuado',
        description: 'O fluxo implícito retorna access_tokens diretamente no fragmento de URL (#), ficando exposto em logs de navegador, histórico e cabeçalhos Referer (RFC 8252).',
        remediation: 'Migre imediatamente para Authorization Code Flow com PKCE (RFC 7636).'
      });
    }

    // 4. Check PKCE (code_challenge & code_challenge_method)
    if (!p.code_challenge) {
      issues.push({
        severity: 'HIGH',
        title: 'PKCE (Proof Key for Code Exchange) Não Implementado',
        description: 'Sem PKCE, o código de autorização pode ser interceptado por aplicativos maliciosos no mesmo dispositivo ou via vazamento de referrer.',
        remediation: 'Exija code_challenge e code_challenge_method=S256 para clientes públicos e SPAs (RFC 7636).'
      });
    } else if (p.code_challenge_method !== 'S256') {
      issues.push({
        severity: 'MEDIUM',
        title: 'Método de Code Challenge Inseguro (`plain`)',
        description: 'O método "plain" não protege contra espionagem da troca do código se a conexão não for totalmente protegida.',
        remediation: 'Utilize exclusivamente code_challenge_method=S256 com hash SHA-256.'
      });
    }

    // 5. Check Redirect URI
    if (!p.redirect_uri) {
      issues.push({
        severity: 'HIGH',
        title: 'Parâmetro `redirect_uri` Ausente na Requisição',
        description: 'Se o Authorization Server usar redirecionamento padrão não estrito, pode haver vazamento do código para URLs não autorizadas.',
        remediation: 'Envie sempre o redirect_uri explícito e valide com correspondência exata de string no backend.'
      });
    } else {
      const red = p.redirect_uri.toLowerCase();
      if (red.includes('localhost') || red.includes('127.0.0.1')) {
        issues.push({
          severity: 'INFO',
          title: 'Redirecionamento para Localhost Detectado',
          description: 'Útil para desenvolvimento local, mas deve ser rejeitado em ambientes de produção.',
          remediation: 'Restrinja domínios de desenvolvimento a ambientes de staging/homologação.'
        });
      }
      if (red.includes('*') || red.includes('..') || red.includes('%2e%2e')) {
        issues.push({
          severity: 'CRITICAL',
          title: 'Possível Traversal ou Wildcard no `redirect_uri`',
          description: 'A URL de redirecionamento contém curingas ou tentativas de path traversal, podendo vazar o token para subdomínios ou servidores externos.',
          remediation: 'Proíba curingas e validação por regex frouxa. Utilize lista estrita de URLs exatas cadastradas no IDP.'
        });
      }
    }

    // Calculate score (100 base, deductions)
    let score = 100;
    for (const is of issues) {
      if (is.severity === 'CRITICAL') score -= 35;
      else if (is.severity === 'HIGH') score -= 20;
      else if (is.severity === 'MEDIUM') score -= 10;
      else if (is.severity === 'LOW') score -= 5;
    }

    return {
      score: Math.max(0, score),
      issues
    };
  }, [parsed]);

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
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                <span>OAuth 2.0 & OIDC Security Inspector</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">Auditoria de Fluxos SSO & Redirecionamentos</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Analisador de Segurança em Fluxos OAuth 2.0 / OpenID Connect
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Inspecione parâmetros de autorização contra vulnerabilidades de Account Takeover via CSRF, vazamento de códigos de autorização em Implicit Flows, falta de PKCE (RFC 7636) e validação fraca de <code className="text-amber-300 font-mono">redirect_uri</code>.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 bg-[#161622] border border-[#262638] rounded-xl p-3.5">
            <div className="space-y-0.5">
              <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Score de Postura OAuth</div>
              <div className="text-2xl font-black font-mono text-white flex items-baseline gap-1.5">
                <span className={auditResults.score >= 80 ? 'text-emerald-400' : auditResults.score >= 50 ? 'text-amber-400' : 'text-rose-400'}>
                  {auditResults.score}
                </span>
                <span className="text-xs text-zinc-500 font-normal">/ 100</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* URL Input Box */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1e1e28] pb-2 text-xs font-mono">
          <span className="text-zinc-300 font-bold flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>URL de Autorização (Authorization Request URL)</span>
          </span>
          <button
            type="button"
            onClick={() => handleCopy('auth-url', authUrl)}
            className="text-zinc-400 hover:text-white flex items-center gap-1"
          >
            {copiedKey === 'auth-url' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>Copiar</span>
          </button>
        </div>

        <textarea
          rows={3}
          value={authUrl}
          onChange={e => setAuthUrl(e.target.value)}
          placeholder="Cole aqui a URL de autorização OAuth 2.0 (ex: https://auth.provider.com/authorize?...)"
          className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0c10] border border-[#232330] text-amber-300 font-mono text-xs focus:outline-none focus:border-amber-500/50 resize-none leading-relaxed"
        />

        {/* Quick Test Presets */}
        <div className="pt-1 flex items-center gap-2 overflow-x-auto scrollbar-none text-[11px] font-mono">
          <span className="text-zinc-500 text-[10px] uppercase font-bold shrink-0">Cenários Prontos:</span>
          <button
            type="button"
            onClick={() => setAuthUrl('https://idp.example.com/oauth/authorize?client_id=my-app&response_type=token&redirect_uri=https://app.example.com/callback')}
            className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#202030] text-rose-300 border border-rose-500/30 whitespace-nowrap"
          >
            Implicit Flow Vulnerável (Sem State/PKCE)
          </button>
          <button
            type="button"
            onClick={() => setAuthUrl('https://idp.example.com/oauth/authorize?client_id=my-app&response_type=code&redirect_uri=https://app.example.com/../../attacker.com/cb&state=valid123&code_challenge=xyz&code_challenge_method=plain')}
            className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#202030] text-amber-300 border border-amber-500/30 whitespace-nowrap"
          >
            Redirect URI Traversal & PKCE Plain
          </button>
          <button
            type="button"
            onClick={() => setAuthUrl('https://idp.example.com/oauth/authorize?client_id=enterprise-app&response_type=code&redirect_uri=https://app.example.com/oauth/callback&scope=openid%20profile%20email&state=7f91a8c2b5d4e6f1a8c2b5d4e6f1a8c2&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256')}
            className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#202030] text-emerald-300 border border-emerald-500/30 whitespace-nowrap"
          >
            Padrão Seguro (Auth Code + S256 + State)
          </button>
        </div>
      </div>

      {/* Dissected Parameters & Audit Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 1/3: Dissected Parameters */}
        <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-4 shadow-lg">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1e1e28] pb-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Parâmetros Decodificados</span>
          </h3>

          <div className="space-y-2 text-xs font-mono">
            {Object.entries(parsed.params).map(([key, value]) => (
              <div key={key} className="bg-[#161622] p-2.5 rounded-xl border border-[#222232] space-y-0.5">
                <div className="text-zinc-400 font-bold">{key}</div>
                <div className="text-amber-300 break-all text-[11px]">{value}</div>
              </div>
            ))}
            {Object.keys(parsed.params).length === 0 && (
              <div className="text-zinc-500 text-center py-4">Nenhum parâmetro detectado.</div>
            )}
          </div>
        </div>

        {/* Right 2/3: Security Audit Findings */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-[#22222d]">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Achados de Auditoria & Riscos Identificados ({auditResults.issues.length})</span>
            </h3>
          </div>

          <div className="space-y-3">
            {auditResults.issues.map((issue, idx) => (
              <div key={idx} className="bg-[#121218] border border-[#22222d] rounded-2xl p-4 space-y-2 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      issue.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                      issue.severity === 'HIGH' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                      issue.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                      'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    }`}>
                      {issue.severity}
                    </span>
                    <span className="text-xs font-bold text-white">{issue.title}</span>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">{issue.description}</p>

                <div className="bg-[#161622] p-2.5 rounded-xl border border-[#232333] text-[11px] font-mono space-y-1">
                  <span className="text-emerald-400 font-bold">Remediação Recomendada:</span>
                  <p className="text-zinc-300">{issue.remediation}</p>
                </div>
              </div>
            ))}

            {auditResults.issues.length === 0 && (
              <div className="bg-[#121218] border border-emerald-500/30 rounded-2xl p-6 text-center text-emerald-400 font-mono text-xs flex flex-col items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <span>Nenhuma vulnerabilidade crítica ou má configuração detectada no fluxo de autorização analisado!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
