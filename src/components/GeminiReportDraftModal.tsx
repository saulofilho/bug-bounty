import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Terminal,
  FileText,
  Copy,
  Check,
  Shield,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  FileCheck2,
  ExternalLink,
  Sliders,
  Send,
  Code2,
  Layers,
  Database
} from 'lucide-react';
import { GeneratedDraftReport, Severity, VulnerabilityReport, PlatformName } from '../types';
import { getSeverityBadgeColor } from '../utils/formatters';
import { showSuccessToast, showErrorToast } from '../utils/toastNotifications';

interface GeminiReportDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToForm: (draft: GeneratedDraftReport) => void;
  onSaveDirectly?: (draft: GeneratedDraftReport) => void;
  initialTarget?: string;
}

type InputMode = 'auto' | 'steps' | 'network_log';

const SAMPLE_INPUTS: Record<string, { label: string; mode: InputMode; target: string; content: string }> = {
  idor: {
    label: 'Log HTTP: IDOR / BOLA em API REST',
    mode: 'network_log',
    target: 'api.target.com',
    content: `GET /api/v2/users/84920/billing-details HTTP/1.1
Host: api.target.com
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMDAyNCIsImVtYWlsIjoidGVzdGVyQG1haWwuY29tIn0.sample_signature
Accept: application/json
Origin: https://app.target.com

HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 342
Access-Control-Allow-Origin: https://app.target.com
Access-Control-Allow-Credentials: true

{
  "status": "success",
  "data": {
    "userId": 84920,
    "fullName": "Mariana Santos Oliveira",
    "cpf": "123.456.789-00",
    "creditCard": {
      "brand": "Mastercard",
      "last4": "8841",
      "expiry": "11/28"
    },
    "billingAddress": "Av. Paulista 1000, Apto 42, Bela Vista, São Paulo - SP"
  }
}`
  },
  ssrf: {
    label: 'Passos: SSRF em Integração de Webhook',
    mode: 'steps',
    target: 'cloud.enterprise.io',
    content: `1. Autentique-se na plataforma cloud.enterprise.io com uma conta de nível Free / Standard.
2. Navegue até Configurações da Organização > Integrações > Webhooks de Eventos (https://cloud.enterprise.io/settings/webhooks).
3. No campo 'Webhook Endpoint URL', insira o endereço de metadados da AWS: http://169.254.169.254/latest/meta-data/iam/security-credentials/.
4. Clique no botão 'Testar Conexão do Webhook'.
5. O backend do cloud.enterprise.io dispara uma requisição HTTP GET interna diretamente para o IP 169.254.169.254 sem validação de endereço privado.
6. A resposta do teste exibe no corpo da prévia o nome da role IAM associada à instância EC2 (ex: 'production-ecs-cluster-role').
7. Reenviando para http://169.254.169.254/latest/meta-data/iam/security-credentials/production-ecs-cluster-role, são retornados AccessKeyId, SecretAccessKey e Token de sessão temporária da AWS.`
  },
  sqli: {
    label: 'Log HTTP: Injeção SQL em Busca com Erro',
    mode: 'network_log',
    target: 'ecommerce.alvo.com.br',
    content: `POST /api/catalog/search HTTP/1.1
Host: ecommerce.alvo.com.br
Content-Type: application/json
Authorization: Bearer [REDACTED_CLIENT_TOKEN]

{"category":"smartphones' UNION SELECT 1, @@version, user(), database(), 5, 6-- -","sort":"asc","limit":10}

HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "results": [
    {
      "id": 1,
      "title": "PostgreSQL 14.9 on x86_64-pc-linux-gnu",
      "category": "pg_app_user@db-internal-prod",
      "price": "ecommerce_production_master"
    }
  ]
}`
  },
  cors: {
    label: 'Log HTTP: CORS com Origin Refletido e Credentials',
    mode: 'network_log',
    target: 'portal.financas.com',
    content: `GET /api/v1/account/sensitive-profile HTTP/1.1
Host: portal.financas.com
Origin: https://attacker-controlled-site.com
Cookie: session_token=s%3A9Fj283kd92.a028dj2; auth_user_id=10928
Accept: application/json

HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://attacker-controlled-site.com
Access-Control-Allow-Credentials: true
Vary: Origin
Content-Type: application/json

{
  "accountNumber": "9921-0294",
  "balance": 154200.50,
  "ownerEmail": "diretor.executivo@empresa.com",
  "internalRoles": ["TREASURY_ADMIN", "SIGNER"]
}`
  }
};

export const GeminiReportDraftModal: React.FC<GeminiReportDraftModalProps> = ({
  isOpen,
  onClose,
  onApplyToForm,
  onSaveDirectly,
  initialTarget = ''
}) => {
  const [inputMode, setInputMode] = useState<InputMode>('auto');
  const [content, setContent] = useState('');
  const [targetHint, setTargetHint] = useState(initialTarget);
  const [titleHint, setTitleHint] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [generatedDraft, setGeneratedDraft] = useState<GeneratedDraftReport | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [engineSource, setEngineSource] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoadSample = (sampleKey: keyof typeof SAMPLE_INPUTS) => {
    const s = SAMPLE_INPUTS[sampleKey];
    if (s) {
      setContent(s.content);
      setInputMode(s.mode);
      setTargetHint(s.target);
      setError(null);
      setGeneratedDraft(null);
      showSuccessToast(`Amostra "${s.label}" carregada com sucesso.`);
    }
  };

  const handleGenerate = async () => {
    if (!content.trim()) {
      setError('Por favor, cole os passos para reprodução ou um log de rede para análise.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStep('Iniciando conexão com o assistente Gemini 3.8 Flash...');

    try {
      const stepTimer1 = setTimeout(() => {
        setLoadingStep('Analisando tráfego HTTP, parâmetros vulneráveis e contexto de segurança...');
      }, 700);

      const stepTimer2 = setTimeout(() => {
        setLoadingStep('Classificando categoria CWE, calculando CVSS v3.1 e refinando prova de conceito...');
      }, 1600);

      const response = await fetch('/api/gemini/generate-draft-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          inputType: inputMode,
          targetHint: targetHint.trim() || undefined,
          titleHint: titleHint.trim() || undefined
        })
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Falha ao processar o rascunho com a IA.');
      }

      setGeneratedDraft(resData.data);
      setEngineSource(resData.source || 'gemini-3.8-flash');
      showSuccessToast('Rascunho de relatório gerado com sucesso!');
    } catch (err: any) {
      console.error('Draft generation error:', err);
      const msg = err.message || 'Erro ao gerar rascunho com o Gemini.';
      setError(msg);
      showErrorToast(msg);
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleCopyText = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2500);
    showSuccessToast('Copiado para a área de transferência!');
  };

  const handleCopyMarkdown = () => {
    if (!generatedDraft) return;

    const md = `# ${generatedDraft.title}

## Detalhes da Vulnerabilidade
- **Alvo:** \`${generatedDraft.target}\`
- **Categoria:** ${generatedDraft.vulnerabilityType}
- **Severidade:** ${generatedDraft.severity} (CVSS 3.1: ${generatedDraft.cvssScore})
- **Vetor CVSS:** \`${generatedDraft.cvssVector}\`
- **CWE:** ${generatedDraft.cwe}
- **Tags:** ${(generatedDraft.suggestedTags || []).join(' ')}

## Resumo Executivo
${generatedDraft.summary}

## Passos para Reproduzir
${generatedDraft.stepsToReproduce.map((s, idx) => `${idx + 1}. ${s.replace(/^Passo\s*\d+:\s*/i, '')}`).join('\n')}

## Prova de Conceito (PoC)
\`\`\`http
${generatedDraft.proofOfConcept}
\`\`\`

## Impacto no Negócio & Dados
${generatedDraft.businessImpact}

## Recomendações de Mitigação
${generatedDraft.remediation}
`;

    handleCopyText(md, 'full_markdown');
  };

  const handleApply = () => {
    if (!generatedDraft) return;
    onApplyToForm(generatedDraft);
    onClose();
  };

  const handleDirectSave = () => {
    if (!generatedDraft || !onSaveDirectly) return;
    onSaveDirectly(generatedDraft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="relative bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-md shadow-cyan-500/20 text-white">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Gerador de Relatório com Gemini IA
                </h2>
                <span className="text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Transforme passos descritivos ou logs de rede HTTP/Burp Suite em um relatório de bug bounty pronto para triagem.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

          {/* Mode Switcher & Presets */}
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            {/* Input Mode Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setInputMode('auto')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  inputMode === 'auto'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Auto-Detectar
              </button>
              <button
                type="button"
                onClick={() => setInputMode('steps')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  inputMode === 'steps'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Passos para Reproduzir
              </button>
              <button
                type="button"
                onClick={() => setInputMode('network_log')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  inputMode === 'network_log'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                Log de Rede / HTTP / Burp
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mr-1">
                Amostras:
              </span>
              <button
                type="button"
                onClick={() => handleLoadSample('idor')}
                className="text-xs px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
              >
                IDOR / BOLA
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('ssrf')}
                className="text-xs px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
              >
                SSRF Cloud
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('sqli')}
                className="text-xs px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
              >
                SQL Injection
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('cors')}
                className="text-xs px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
              >
                CORS Origin
              </button>
            </div>
          </div>

          {/* Optional context hints */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Alvo / Domínio (opcional se constar no log):
              </label>
              <input
                type="text"
                value={targetHint}
                onChange={(e) => setTargetHint(e.target)}
                placeholder="Ex: api.target.com ou https://app.empresa.com"
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Dica de Título ou Categoria (opcional):
              </label>
              <input
                type="text"
                value={titleHint}
                onChange={(e) => setTitleHint(e.target)}
                placeholder="Ex: IDOR no endpoint de perfil ou SSRF via webhook"
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
              />
            </div>
          </div>

          {/* Content Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                {inputMode === 'network_log'
                  ? 'Cole o Log de Rede / Requisição HTTP Bruta / Tráfego Burp Suite:'
                  : inputMode === 'steps'
                  ? 'Cole os Passos para Reprodução (em texto ou lista ordenada):'
                  : 'Cole os Passos para Reprodução OU o Log de Rede:'}
              </label>
              <span className="text-[11px] text-slate-400">
                {content.length > 0 ? `${content.length} caracteres` : 'Suporta HTTP/1.1, cURL, Burp Suite, ou texto'}
              </span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              placeholder={
                inputMode === 'network_log'
                  ? "GET /api/v1/user/account HTTP/1.1\nHost: api.target.com\nAuthorization: Bearer [TOKEN]\n\nHTTP/1.1 200 OK\n{\"data\": \"...\"}"
                  : "1. Autentique-se como usuário A.\n2. Acesse a URL do recurso...\n3. Altere o ID para outro usuário e observe a resposta com dados de terceiros..."
              }
              className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors resize-y leading-relaxed"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 bg-red-950/40 border border-red-800/80 rounded-xl flex items-start gap-2.5 text-xs text-red-200 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-300">Falha ao gerar relatório:</p>
                <p className="mt-0.5 text-red-200/90">{error}</p>
              </div>
            </div>
          )}

          {/* Trigger Generate Button */}
          <div className="flex justify-between items-center pt-1">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Sanitização automática de tokens confidenciais e credenciais na PoC
            </span>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading || !content.trim()}
              className="px-5 py-2.5 bg-linear-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-md shadow-cyan-600/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Analisando com Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-200" />
                  <span>Gerar Rascunho com Gemini</span>
                </>
              )}
            </button>
          </div>

          {/* Loading status progress bar */}
          {isLoading && (
            <div className="p-4 bg-slate-950/80 border border-cyan-900/50 rounded-xl space-y-2 animate-pulse">
              <div className="flex items-center justify-between text-xs text-cyan-300">
                <span className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  {loadingStep || 'Processando inteligência de segurança...'}
                </span>
                <span className="text-slate-400 font-mono">Gemini 3.8 Flash</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-linear-to-r from-cyan-500 to-indigo-500 h-full rounded-full animate-progress" />
              </div>
            </div>
          )}

          {/* Generated Result Preview */}
          {generatedDraft && !isLoading && (
            <div className="mt-6 border border-cyan-800/60 bg-slate-950/90 rounded-2xl p-5 space-y-5 shadow-xl animate-fadeIn">
              
              {/* Draft Header Card */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <FileCheck2 className="w-3.5 h-3.5" />
                      Rascunho Pronto
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${getSeverityBadgeColor(generatedDraft.severity)}`}>
                      {generatedDraft.severity} ({generatedDraft.cvssScore.toFixed(1)})
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                      {generatedDraft.cwe.split(':')[0]}
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-cyan-950/60 text-cyan-300 border border-cyan-800/50">
                      {generatedDraft.target}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white tracking-tight mt-1">
                    {generatedDraft.title}
                  </h3>
                </div>

                {/* Engine Source Badge */}
                <div className="text-right">
                  <span className="text-[11px] text-slate-400">
                    Motor: <strong className="text-cyan-400">{engineSource}</strong>
                  </span>
                  {generatedDraft.detectedArtifacts?.httpMethod && (
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {generatedDraft.detectedArtifacts.httpMethod} {generatedDraft.detectedArtifacts.endpoint || ''}
                    </p>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  Resumo Executivo & Causa Raiz:
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/70 p-3 rounded-xl border border-slate-800/80">
                  {generatedDraft.summary}
                </p>
              </div>

              {/* Steps to Reproduce */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Passos para Reproduzir Estruturados ({generatedDraft.stepsToReproduce.length}):
                </h4>
                <div className="space-y-1.5 bg-slate-900/70 p-3.5 rounded-xl border border-slate-800/80">
                  {generatedDraft.stepsToReproduce.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-200">
                      <span className="px-1.5 py-0.5 rounded-md bg-cyan-950 text-cyan-300 font-mono text-[11px] font-bold shrink-0 mt-0.5 border border-cyan-800/50">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{step.replace(/^Passo\s*\d+:\s*/i, '')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Proof of Concept */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    Prova de Conceito (PoC Sanitizada):
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleCopyText(generatedDraft.proofOfConcept, 'poc')}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium cursor-pointer"
                  >
                    {copiedField === 'poc' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar PoC</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3.5 bg-slate-950 border border-slate-800/90 rounded-xl font-mono text-xs text-emerald-300 overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed">
                  {generatedDraft.proofOfConcept}
                </pre>
              </div>

              {/* Impact & Remediation in 2 Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 bg-slate-900/70 p-3.5 rounded-xl border border-slate-800/80">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    Impacto no Negócio & Dados:
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {generatedDraft.businessImpact}
                  </p>
                </div>
                <div className="space-y-1.5 bg-slate-900/70 p-3.5 rounded-xl border border-slate-800/80">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    Recomendação de Correção (Remediation):
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {generatedDraft.remediation}
                  </p>
                </div>
              </div>

              {/* Vector & Tags */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">Vetor CVSS 3.1:</span>
                  <code className="px-2 py-0.5 bg-slate-900 rounded-md border border-slate-800 text-slate-300 font-mono text-[11px]">
                    {generatedDraft.cvssVector}
                  </code>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {generatedDraft.suggestedTags?.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-800/80 text-cyan-300 rounded-md text-[11px] font-mono border border-slate-700/60">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions Footer inside Result */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer"
                >
                  {copiedField === 'full_markdown' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Markdown Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Relatório em Markdown</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {onSaveDirectly && (
                    <button
                      type="button"
                      onClick={handleDirectSave}
                      className="flex-1 sm:flex-none px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold rounded-xl border border-cyan-800/60 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Database className="w-3.5 h-3.5 text-cyan-400" />
                      Salvar como Rascunho
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleApply}
                    className="flex-1 sm:flex-none px-5 py-2 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Aplicar ao Formulário</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400">
          <span>
            Powered by Google GenAI SDK (@google/genai) • Server-Side Gemini 3.8 Flash
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
