import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  Terminal, 
  Layers, 
  Lock, 
  FileCode,
  Globe,
  Sliders
} from 'lucide-react';

const SAMPLE_SAML_XML = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="_resp_123" Version="2.0" IssueInstant="2026-09-23T12:00:00Z" Destination="https://sp.example.com/saml/acs">
  <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">https://idp.example.com</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="_assert_456" Version="2.0" IssueInstant="2026-09-23T12:00:00Z">
    <saml:Issuer>https://idp.example.com</saml:Issuer>
    <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
      <ds:SignedInfo>
        <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
        <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
        <ds:Reference URI="#_assert_456">
          <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
          <ds:DigestValue>ab12cd34ef56...</ds:DigestValue>
        </ds:Reference>
      </ds:SignedInfo>
      <ds:SignatureValue>MEYCIQC...</ds:SignatureValue>
    </ds:Signature>
    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">user@target.com</saml:NameID>
    </saml:Subject>
    <saml:Conditions NotBefore="2026-09-23T11:55:00Z" NotOnOrAfter="2026-09-23T12:05:00Z">
      <saml:AudienceRestriction>
        <saml:Audience>https://sp.example.com</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
  </saml:Assertion>
</samlp:Response>`;

const XSW_VARIANTS = [
  {
    id: 'XSW1',
    name: 'XSW 1: Asserção Clonada Após a Original Assinada',
    description: 'Adiciona uma cópia não assinada da Asserção após a original. O parser valida a assinatura da 1ª, mas o SP consome o Subject da 2ª.'
  },
  {
    id: 'XSW2',
    name: 'XSW 2: Asserção Falsificada Antes da Original Assinada',
    description: 'Adiciona uma asserção forjada antes da asserção original. Se o parser do SP iterar apenas sobre o primeiro nó de asserção, consome o usuário forjado.'
  },
  {
    id: 'XSW3',
    name: 'XSW 3: Cópia da Asserção em um Nó Não Relacionado',
    description: 'Move a asserção original assinada para dentro de um elemento samlp:Extensions e injeta uma nova asserção sem assinatura no corpo principal.'
  },
  {
    id: 'XSW8',
    name: 'XSW 8: Asserção Forjada Como Irmã com Referência Modificada',
    description: 'Explora parsers que verificam assinaturas pelo ID exato sem checar a árvore hierárquica completa do documento XML.'
  }
];

export const SamlSecurityWorkbench: React.FC = () => {
  const [samlXml, setSamlXml] = useState<string>(SAMPLE_SAML_XML);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Analysis of SAML XML
  const audit = useMemo(() => {
    const raw = samlXml;
    const hasSignature = raw.includes('Signature');
    const hasAudience = raw.includes('AudienceRestriction');
    const hasNameID = raw.includes('NameID');
    const hasConditions = raw.includes('Conditions');
    const hasSha1 = raw.includes('rsa-sha1') || raw.includes('sha1');

    const issues: string[] = [];
    if (!hasSignature) issues.push('Assinatura XML ausente em Response e Assertion (Crítico).');
    if (!hasAudience) issues.push('Falta validação de AudienceRestriction (Risco de token replay em outro SP).');
    if (hasSha1) issues.push('Uso de algoritmo obsoleto SHA-1 na assinatura digital.');
    if (!hasConditions) issues.push('Ausência de janela temporal NotBefore / NotOnOrAfter.');

    // NameID extraction
    const matchNameID = raw.match(/<saml:NameID[^>]*>(.*?)<\/saml:NameID>/);
    const nameId = matchNameID ? matchNameID[1] : 'Não identificado';

    return {
      isValid: hasNameID && hasConditions,
      nameId,
      hasSignature,
      issues,
      score: Math.max(0, 100 - (issues.length * 25))
    };
  }, [samlXml]);

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
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SAML 2.0 & XML Signature Workbench</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">Enterprise SSO & XSW Wrapping Attacks</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Bancada de Auditoria SAML 2.0 e XML Signature Wrapping (XSW)
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Inspecione respostas SAML de provedores corporativos (Okta, Azure AD, ADFS, Shibboleth). Identifique vulnerabilidades de XML Signature Wrapping (XSW 1 a 8), assinaturas fracas (SHA-1), ausência de AudienceRestriction e XXE.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 bg-[#161622] border border-[#262638] rounded-xl p-3.5">
            <div className="space-y-0.5">
              <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Score SAML</div>
              <div className="text-2xl font-black font-mono text-white flex items-baseline gap-1.5">
                <span className={audit.score >= 80 ? 'text-emerald-400' : 'text-rose-400'}>
                  {audit.score}
                </span>
                <span className="text-xs text-zinc-500 font-normal">/ 100</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* XML Editor */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1e1e28] pb-2 text-xs font-mono">
          <span className="text-zinc-300 font-bold flex items-center gap-1.5">
            <FileCode className="w-4 h-4 text-blue-400" />
            <span>Documento SAML Response (XML)</span>
          </span>
          <button
            type="button"
            onClick={() => handleCopy('saml-xml', samlXml)}
            className="text-zinc-400 hover:text-white flex items-center gap-1"
          >
            {copiedKey === 'saml-xml' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>Copiar XML</span>
          </button>
        </div>

        <textarea
          rows={8}
          value={samlXml}
          onChange={e => setSamlXml(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0c10] border border-[#232330] text-blue-300 font-mono text-xs focus:outline-none focus:border-blue-500/50 resize-none leading-relaxed"
        />

        <div className="bg-[#161622] p-3 rounded-xl border border-[#232333] flex items-center justify-between text-xs font-mono">
          <span className="text-zinc-400">Usuário Autenticado (NameID):</span>
          <span className="text-emerald-400 font-bold">{audit.nameId}</span>
        </div>
      </div>

      {/* XSW Reference Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#22222d] pb-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <span>Matriz de Variantes de XML Signature Wrapping (XSW 1 - XSW 8)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {XSW_VARIANTS.map(v => (
            <div key={v.id} className="bg-[#121218] border border-[#22222d] rounded-2xl p-4 space-y-2 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-mono">{v.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                  {v.id}
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">{v.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Remediation */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3 shadow-lg">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1e1e28] pb-2">
          <Lock className="w-4 h-4 text-emerald-400" />
          <span>Diretrizes de Defesa Estrita contra XSW</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="bg-[#161622] p-3 rounded-xl border border-[#232333] space-y-1">
            <span className="text-emerald-400 font-bold">1. Apenas Uma Asserção</span>
            <p className="text-zinc-300 text-[11px]">
              O Service Provider deve rejeitar mensagens SAML contendo mais de uma tag <code className="text-white">&lt;saml:Assertion&gt;</code>.
            </p>
          </div>
          <div className="bg-[#161622] p-3 rounded-xl border border-[#232333] space-y-1">
            <span className="text-emerald-400 font-bold">2. Validação Mútua</span>
            <p className="text-zinc-300 text-[11px]">
              Valide tanto a assinatura da raiz <code className="text-white">&lt;samlp:Response&gt;</code> quanto a da <code className="text-white">&lt;saml:Assertion&gt;</code>.
            </p>
          </div>
          <div className="bg-[#161622] p-3 rounded-xl border border-[#232333] space-y-1">
            <span className="text-emerald-400 font-bold">3. Desabilite Entidades Externas</span>
            <p className="text-zinc-300 text-[11px]">
              Configure o parser XML com <code className="text-white">disallow-doctype-decl=true</code> para neutralizar XXE.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
