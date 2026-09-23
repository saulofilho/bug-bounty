import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  Calculator, 
  Terminal, 
  Clock, 
  MessageSquareCode, 
  Copy, 
  Check, 
  DollarSign, 
  Share2, 
  EyeOff, 
  Bell, 
  Search, 
  ExternalLink, 
  Sparkles, 
  ArrowRight, 
  FileText, 
  RotateCcw, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Key, 
  Lock, 
  Sliders, 
  Layers, 
  Code2, 
  Download,
  Filter,
  Flame,
  CheckSquare,
  TrendingUp,
  Package,
  KeyRound,
  Binary,
  ShieldCheck,
  Crosshair,
  Globe,
  Shield,
  Network,
  Cpu,
  Cloud,
  Split,
  Radio,
  Users,
  Zap
} from 'lucide-react';
import { VulnerabilityReport, Severity, ReportStatus } from '../types';
import { formatCurrency, getSeverityBadgeColor, getStatusBadgeColor } from '../utils/formatters';
import { 
  CvssV4Metrics, 
  DEFAULT_CVSS_V4, 
  calculateCvssV4Score, 
  generateCvssV4Vector, 
  parseCvssV4Vector 
} from '../utils/cvssV4';
import { calculateCvssScore, DEFAULT_CVSS } from '../utils/cvss';
import { TOP_CWES, OWASP_TOP_10_2021, CweEntry, OwaspCategory } from '../utils/cweOwaspData';
import { 
  PocBuilderInput, 
  generateCurlCommand, 
  generatePythonScript, 
  generateRawHttp, 
  generateJiraIssue, 
  generateGitHubIssue, 
  generateGitLabIssue 
} from '../utils/issueTrackerExporter';
import { computeSlaOverview, ReportSlaStatus } from '../utils/slaTrackerEngine';
import { DEFAULT_TRIAGE_MACROS, renderMacroTemplate, TriageMacro } from '../utils/triageMacros';
import { computeBountyBudgetSimulation, ASSET_TIERS } from '../utils/bountyMatrixEngine';
import { sanitizeText, DetectedSecret } from '../utils/dlpSanitizer';
import { StatusBadge } from './StatusBadge';
import { SecretRemediationGuide } from './SecretRemediationGuide';
import { ProgramRoiCalculator } from './ProgramRoiCalculator';
import { CvssV4ComponentCalculator } from './CvssV4ComponentCalculator';
import { JwtSecurityAnalyzer } from './JwtSecurityAnalyzer';
import { CspStudio } from './CspStudio';
import { CvssEpssMatrix } from './CvssEpssMatrix';
import { CsrfPocStudio } from './CsrfPocStudio';
import { PayloadEncoderDecoder } from './PayloadEncoderDecoder';
import { SecurityHeadersAuditor } from './SecurityHeadersAuditor';
import { AttackGraphStudio } from './AttackGraphStudio';
import { ThreatVisualizer } from './ThreatVisualizer';
import { SubdomainTakeoverAnalyzer } from './SubdomainTakeoverAnalyzer';
import { ReDoSStudio } from './ReDoSStudio';
import { SsrfCloudOrchestrator } from './SsrfCloudOrchestrator';
import { GraphQLSecurityAuditor } from './GraphQLSecurityAuditor';
import { CorsStudio } from './CorsStudio';
import { HttpRequestSmuggler } from './HttpRequestSmuggler';
import { OobInteractionStudio } from './OobInteractionStudio';
import { PayloadObfuscatorStudio } from './PayloadObfuscatorStudio';
import { OAuthSecurityInspector } from './OAuthSecurityInspector';
import { IdorBolaMatrix } from './IdorBolaMatrix';
import { WebCacheSecurityStudio } from './WebCacheSecurityStudio';
import { PrototypePollutionStudio } from './PrototypePollutionStudio';
import { RaceConditionStudio } from './RaceConditionStudio';
import { MassAssignmentHppMatrix } from './MassAssignmentHppMatrix';
import { SamlSecurityWorkbench } from './SamlSecurityWorkbench';
import { CloudIamEscalationAuditor } from './CloudIamEscalationAuditor';
import { PayloadFuzzerStudio } from './PayloadFuzzerStudio';

export type ToolSubTab = 
  | 'cvss-v4' 
  | 'cvss-component'
  | 'attack-graph'
  | 'threat-visualizer'
  | 'cors-studio'
  | 'request-smuggler'
  | 'oob-collaborator'
  | 'subdomain-takeover'
  | 'redos-studio'
  | 'ssrf-cloud'
  | 'graphql-auditor'
  | 'jwt-analyzer'
  | 'csp-studio'
  | 'epss-prioritizer'
  | 'csrf-poc-studio'
  | 'payload-fuzzer'
  | 'payload-encoder'
  | 'payload-obfuscator'
  | 'oauth-inspector'
  | 'idor-bola'
  | 'cache-security'
  | 'proto-pollution'
  | 'race-condition'
  | 'mass-assignment'
  | 'saml-workbench'
  | 'iam-escalation'
  | 'security-headers'
  | 'cwe-owasp' 
  | 'poc-builder' 
  | 'sla-tracker' 
  | 'triage-macros' 
  | 'duplicate-detector' 
  | 'bounty-matrix' 
  | 'program-roi'
  | 'issue-exporter' 
  | 'dlp-sanitizer' 
  | 'secret-remediation'
  | 'webhooks';

interface AppSecSuiteViewProps {
  reports: VulnerabilityReport[];
  onSelectReport?: (report: VulnerabilityReport) => void;
  onUpdateStatus?: (id: string, newStatus: ReportStatus, bountyAmount?: number) => void;
  onUpdateReport?: (report: VulnerabilityReport) => void;
}

export const AppSecSuiteView: React.FC<AppSecSuiteViewProps> = ({
  reports,
  onSelectReport,
  onUpdateStatus,
  onUpdateReport
}) => {
  const [activeTab, setActiveTab] = useState<ToolSubTab>('cvss-v4');
  const [selectedReportId, setSelectedReportId] = useState<string>(reports[0]?.id || '');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const selectedReport = useMemo(() => {
    return reports.find(r => r.id === selectedReportId) || reports[0];
  }, [reports, selectedReportId]);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // --- 1. CVSS v4.0 State ---
  const [v4Metrics, setV4Metrics] = useState<CvssV4Metrics>({ ...DEFAULT_CVSS_V4 });
  const v4Result = useMemo(() => calculateCvssV4Score(v4Metrics), [v4Metrics]);
  const v3Comparison = useMemo(() => calculateCvssScore(DEFAULT_CVSS), []);

  // --- 2. CWE / OWASP State ---
  const [cweSearch, setCweSearch] = useState('');
  const [selectedOwaspId, setSelectedOwaspId] = useState<string>('ALL');
  const filteredCwes = useMemo(() => {
    return TOP_CWES.filter(cwe => {
      const matchSearch = cwe.name.toLowerCase().includes(cweSearch.toLowerCase()) || 
                          cwe.id.toLowerCase().includes(cweSearch.toLowerCase()) ||
                          cwe.category.toLowerCase().includes(cweSearch.toLowerCase());
      const matchOwasp = selectedOwaspId === 'ALL' || cwe.owaspCategory.startsWith(selectedOwaspId);
      return matchSearch && matchOwasp;
    });
  }, [cweSearch, selectedOwaspId]);

  // --- 3. PoC Generator State ---
  const [pocTarget, setPocTarget] = useState('https://api.empresa.com/v1/user/profile');
  const [pocMethod, setPocMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('POST');
  const [pocHeaderKey, setPocHeaderKey] = useState('Authorization');
  const [pocHeaderVal, setPocHeaderVal] = useState('Bearer eyJhbGciOi...[TOKEN]');
  const [pocBody, setPocBody] = useState('{"role": "admin", "privileges": ["root"]}');
  const [pocFormat, setPocFormat] = useState<'curl' | 'python' | 'raw'>('curl');

  // Payload encoders
  const [encoderInput, setEncoderInput] = useState('<script>alert(1)</script>');
  const encodedUrl = useMemo(() => encodeURIComponent(encoderInput), [encoderInput]);
  const encodedBase64 = useMemo(() => {
    try { return btoa(encoderInput); } catch { return 'Invalid input'; }
  }, [encoderInput]);
  const encodedHex = useMemo(() => {
    return encoderInput.split('').map((c) => '\\x' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  }, [encoderInput]);

  const generatedPocCode = useMemo(() => {
    const input: PocBuilderInput = {
      targetUrl: pocTarget,
      method: pocMethod,
      headers: { [pocHeaderKey]: pocHeaderVal },
      bodyPayload: pocMethod !== 'GET' ? pocBody : undefined,
      bodyType: 'json'
    };
    if (pocFormat === 'curl') return generateCurlCommand(input);
    if (pocFormat === 'python') return generatePythonScript(input);
    return generateRawHttp(input);
  }, [pocTarget, pocMethod, pocHeaderKey, pocHeaderVal, pocBody, pocFormat]);

  // --- 4. SLA Tracker State ---
  const slaOverview = useMemo(() => computeSlaOverview(reports), [reports]);

  // --- 5. Triage Macros State ---
  const [selectedMacroId, setSelectedMacroId] = useState<string>(DEFAULT_TRIAGE_MACROS[0].id);
  const activeMacro = useMemo(() => {
    return DEFAULT_TRIAGE_MACROS.find(m => m.id === selectedMacroId) || DEFAULT_TRIAGE_MACROS[0];
  }, [selectedMacroId]);
  const renderedMacroText = useMemo(() => {
    return renderMacroTemplate(activeMacro.template, {
      reportId: selectedReport?.id || '#REP-001',
      researcher: selectedReport?.reporterUsername || 'security_hacker',
      target: selectedReport?.target || 'alvo.com',
      severity: selectedReport?.severity || 'HIGH',
      bounty: selectedReport?.bountyAmount ? formatCurrency(selectedReport.bountyAmount, 'USD') : '$1,500 USD',
      cvss: selectedReport?.cvssVector || 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N (7.5)'
    });
  }, [activeMacro, selectedReport]);

  // --- 6. Duplicate Analyzer State ---
  const [duplicateTargetQuery, setDuplicateTargetQuery] = useState(selectedReport?.target || '');
  const [duplicateTypeQuery, setDuplicateTypeQuery] = useState(selectedReport?.title || '');
  const duplicateResults = useMemo(() => {
    if (!selectedReport) return [];
    return reports
      .filter(r => r.id !== selectedReport.id)
      .map(r => {
        let score = 0;
        if (r.target.toLowerCase() === duplicateTargetQuery.toLowerCase()) score += 45;
        else if (r.target.toLowerCase().includes(duplicateTargetQuery.toLowerCase())) score += 25;

        if (r.severity === selectedReport.severity) score += 15;
        if (r.platform === selectedReport.platform) score += 15;

        // Title token overlap
        const wordsA = duplicateTypeQuery.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const wordsB = r.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const commonWords = wordsA.filter(w => wordsB.includes(w));
        score += Math.min(25, commonWords.length * 10);

        return {
          report: r,
          matchScore: Math.min(98, score)
        };
      })
      .filter(m => m.matchScore > 20)
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [reports, selectedReport, duplicateTargetQuery, duplicateTypeQuery]);

  // --- 7. Bounty Matrix State ---
  const [annualBudget, setAnnualBudget] = useState<number>(80000);
  const budgetSimulation = useMemo(() => computeBountyBudgetSimulation(reports, annualBudget), [reports, annualBudget]);

  // --- 8. Issue Tracker Exporter State ---
  const [exportPlatform, setExportPlatform] = useState<'jira' | 'github' | 'gitlab'>('jira');
  const issueData = useMemo(() => {
    if (!selectedReport) return { title: '', body: '', labels: [] };
    if (exportPlatform === 'jira') return generateJiraIssue(selectedReport);
    if (exportPlatform === 'github') return generateGitHubIssue(selectedReport);
    return generateGitLabIssue(selectedReport);
  }, [selectedReport, exportPlatform]);

  // --- 9. DLP Sanitizer State ---
  const [dlpInputText, setDlpInputText] = useState(() => {
    // Chave simulada para teste DLP montada dinamicamente para evitar falso positivo em scanners de segredos (GitHub Secret Scanning)
    const mockOpenAiDemoKey = ['sk', 'proj', 'DEMO_MOCK_KEY_TEST_TOKEN_FOR_DLP_PURPOSES_ONLY'].join('-');
    return (
      `Relatório de Investigação Inicial:\n` +
      `Descobrimos chave da OpenAI ativa no arquivo de configuração do frontend:\n` +
      `API_KEY = "${mockOpenAiDemoKey}"\n` +
      `Bearer token de admin obtido via cabeçalho:\n` +
      `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c\n` +
      `Chave AWS de produção: AKIAIOSFODNN7EXAMPLE\n` +
      `Contato do analista afetado: maria.silva@seguranca-corp.com (CPF 123.456.789-00)`
    );
  });
  const dlpResult = useMemo(() => sanitizeText(dlpInputText), [dlpInputText]);

  // --- 10. Webhook Dispatcher State ---
  const [webhookService, setWebhookService] = useState<'slack' | 'discord' | 'teams' | 'siem'>('slack');
  const [webhookUrl, setWebhookUrl] = useState('https://hooks.slack.com/services/T000/B000/XXXX');
  const [webhookTriggerEvent, setWebhookTriggerEvent] = useState<'CRITICAL_REPORT' | 'STATUS_TRIAGED' | 'BOUNTY_PAID'>('CRITICAL_REPORT');
  const [webhookLogs, setWebhookLogs] = useState<Array<{ id: string; time: string; event: string; status: number; payload: string }>>([
    {
      id: 'log-1',
      time: '10:14:22',
      event: 'REPORT_CREATED (#REP-001 - CRITICAL)',
      status: 200,
      payload: '{"event":"report.created","id":"REP-001","severity":"CRITICAL","channel":"#security-alerts"}'
    }
  ]);
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);

  const handleTestWebhook = () => {
    setIsSendingWebhook(true);
    setTimeout(() => {
      setIsSendingWebhook(false);
      const newLog = {
        id: `log-${Date.now()}`,
        time: new Date().toLocaleTimeString(),
        event: `${webhookTriggerEvent} (${selectedReport?.id || '#REP-001'}) -> ${webhookService.toUpperCase()}`,
        status: 200,
        payload: JSON.stringify({
          service: webhookService,
          targetUrl: webhookUrl,
          event: webhookTriggerEvent,
          reportId: selectedReport?.id,
          severity: selectedReport?.severity,
          title: selectedReport?.title,
          deliveredAt: new Date().toISOString()
        }, null, 2)
      };
      setWebhookLogs(prev => [newLog, ...prev.slice(0, 9)]);
    }, 600);
  };

  const navTabs: Array<{ id: ToolSubTab; label: string; icon: any; badge?: string; badgeColor?: string }> = [
    { id: 'cvss-v4', label: 'CVSS v4.0 Engine', icon: Calculator, badge: 'v4.0', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    { id: 'cvss-component', label: 'CVSS v4 Component Calculator', icon: Package, badge: 'Supply Chain / SCA', badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
    { id: 'attack-graph', label: 'Attack Graph & Lateral Movement', icon: Network, badge: 'D3.js Force / CVEs & Domínios', badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
    { id: 'threat-visualizer', label: 'Threat Visualizer', icon: Crosshair, badge: 'D3.js / CVE & Reports', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
    { id: 'cors-studio', label: 'CORS Misconfiguration Studio', icon: Globe, badge: 'ACAC / Exploit HTML', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
    { id: 'request-smuggler', label: 'HTTP Request Smuggling & Desync', icon: Split, badge: 'CL.TE / H2.TE', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    { id: 'oob-collaborator', label: 'OOB (Out-of-Band) Collaborator', icon: Radio, badge: 'DNS / HTTP Logs', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    { id: 'subdomain-takeover', label: 'Subdomain Takeover Analyzer', icon: Globe, badge: 'DNS / CNAME', badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30' },
    { id: 'redos-studio', label: 'ReDoS & Regex Complexity', icon: Cpu, badge: 'Catastrophic O(2ⁿ)', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    { id: 'ssrf-cloud', label: 'Cloud SSRF & Metadata Suite', icon: Cloud, badge: 'AWS / GCP / K8s', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    { id: 'graphql-auditor', label: 'GraphQL Security Studio', icon: Layers, badge: 'Introspection / DoS', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    { id: 'jwt-analyzer', label: 'JWT Security Analyzer', icon: KeyRound, badge: 'OWASP / None', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    { id: 'csp-studio', label: 'CSP Studio & Evaluator', icon: ShieldCheck, badge: 'Level 3 / XSS', badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
    { id: 'epss-prioritizer', label: 'CVSS v4 + EPSS Matrix', icon: Crosshair, badge: 'FIRST EPSS', badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30' },
    { id: 'csrf-poc-studio', label: 'CSRF PoC Studio', icon: Globe, badge: 'SameSite Matrix', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    { id: 'payload-fuzzer', label: 'Payload Fuzzer & Mutation Engine', icon: Zap, badge: 'Fuzz / WAF', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    { id: 'payload-encoder', label: 'Base64, URL & Hex Encoder', icon: Binary, badge: 'Real-Time WAF', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    { id: 'payload-obfuscator', label: 'Payload Obfuscator', icon: Lock, badge: 'XOR / B64 / URL', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    { id: 'oauth-inspector', label: 'OAuth 2.0 & OIDC Inspector', icon: KeyRound, badge: 'CSRF / PKCE', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    { id: 'idor-bola', label: 'BOLA / IDOR Matrix', icon: Users, badge: 'OWASP API #1', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
    { id: 'cache-security', label: 'Web Cache Poisoning & Deception', icon: Globe, badge: 'RFC 7234', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    { id: 'proto-pollution', label: 'Prototype Pollution & Gadgets', icon: Cpu, badge: 'Client/RCE', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    { id: 'race-condition', label: 'Race Condition & Concurrency', icon: Zap, badge: 'TOCTOU / Locks', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    { id: 'mass-assignment', label: 'Mass Assignment & HPP Matrix', icon: Package, badge: 'Over-Posting', badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
    { id: 'saml-workbench', label: 'SAML 2.0 & XML Workbench', icon: ShieldCheck, badge: 'XSW 1-8', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    { id: 'iam-escalation', label: 'AWS IAM Privilege Escalation', icon: Cloud, badge: 'Admin Esc', badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30' },
    { id: 'security-headers', label: 'Security Headers Auditor', icon: Shield, badge: 'HSTS / CSP / MIME', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    { id: 'cwe-owasp', label: 'CWE & OWASP Top 10', icon: Layers, badge: 'A01-A10', badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
    { id: 'poc-builder', label: 'PoC Request & Encoders', icon: Terminal, badge: 'cURL / Py', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    { id: 'sla-tracker', label: 'SLA & MTTR/MTTT', icon: Clock, badge: `${slaOverview.overallComplianceRatePct}%`, badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    { id: 'triage-macros', label: 'Triage Macros', icon: MessageSquareCode, badge: `${DEFAULT_TRIAGE_MACROS.length}`, badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    { id: 'duplicate-detector', label: 'Duplicate Cross-Matcher', icon: Copy, badge: 'AI/Token', badgeColor: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30' },
    { id: 'bounty-matrix', label: 'Bounty Matrix & Budget', icon: DollarSign, badge: `${budgetSimulation.programRoiRatio}x ROI`, badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    { id: 'program-roi', label: 'Program ROI & Yield Prioritizer', icon: TrendingUp, badge: 'Hunter Yield', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    { id: 'issue-exporter', label: 'Issue Tracker Export', icon: Share2, badge: 'Jira/GH', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    { id: 'dlp-sanitizer', label: 'DLP & Token Redactor', icon: EyeOff, badge: '100% Client', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
    { id: 'secret-remediation', label: 'Secret Remediation Guide', icon: Key, badge: 'Batch & SOP', badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30' },
    { id: 'webhooks', label: 'Webhooks & SIEM', icon: Bell, badge: 'Simulador', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner Header */}
      <div className="bg-[#121216] border border-[#22222b] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>DevSecOps & AppSec Suite</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">37 Ferramentas Integradas</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Central de Engenharia & AppSec</span>
            </h1>
            <p className="text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Automação de triagem, fuzzer de payloads com mutações e bypass de WAF, cálculo CVSS v4.0 e supply chain SCA, grafo de ataque interativo D3.js (Kill Chain & MITRE ATT&CK), auditoria de CORS e gerador de exploit PoC HTML, inspector de HTTP Request Smuggling (CL.TE/H2.TE), central OOB Collaborator para vulnerabilidades cegas (Blind SSRF/XXE/RCE), auditor de subdomínios órfãos e CNAME takeover, laboratório ReDoS com detecção de backtracking catastrófico, orquestrador de SSRF em nuvem (AWS/GCP/Azure/K8s), auditor de GraphQL, auditoria JWT, gerador de CSP, matriz EPSS, PoC CSRF, encoders WAF, auditor de headers, SLA, ROI de bug bounty, DLP e integradores.
            </p>
          </div>

          {/* Quick Report Selector Context */}
          <div className="bg-[#17171f] border border-[#2a2a38] rounded-xl p-3 shrink-0 flex flex-col gap-1.5 min-w-[260px]">
            <label className="text-[11px] font-mono font-bold text-zinc-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Relatório Ativo em Contexto:</span>
            </label>
            <select
              id="select-active-report-suite"
              value={selectedReportId}
              onChange={(e) => {
                setSelectedReportId(e.target.value);
                const rep = reports.find(r => r.id === e.target.value);
                if (rep) {
                  setDuplicateTargetQuery(rep.target);
                  setDuplicateTypeQuery(rep.title);
                  setPocTarget(`https://${rep.target}/api/v1/vuln`);
                }
              }}
              className="w-full bg-[#101016] border border-[#2b2b3b] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
            >
              {reports.map(r => (
                <option key={r.id} value={r.id}>
                  {r.id} - [{r.severity}] {r.title.slice(0, 32)}...
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-[#22222b]">
        {navTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-btn-${tab.id}`}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                  : 'bg-[#14141c] text-zinc-400 border border-[#23232f] hover:text-zinc-200 hover:bg-[#1a1a24]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded border font-bold ${tab.badgeColor || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CVSS v4.0 Engine */}
      {/* ========================================================================= */}
      {activeTab === 'cvss-v4' && (
        <div className="space-y-6">
          {/* Quick Switch Banner to Supply Chain Component Calculator */}
          <div className="bg-gradient-to-r from-[#131726] via-[#101422] to-[#0c0f1a] border border-[#232d4b] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                  <span>Avaliando vulnerabilidade em biblioteca ou componente de terceiros (SCA)?</span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold border border-indigo-500/30">
                    CVSS v4.0 Supply Chain
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Estime o sub-score de explorabilidade real com análise de camada de dependência, alcançabilidade de call-graph e requisitos de ambiente (AT:P).
                </p>
              </div>
            </div>
            <button
              type="button"
              id="btn-open-cvss-component-calc"
              onClick={() => setActiveTab('cvss-component')}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 shadow-md shadow-indigo-950/50"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Abrir Component Calculator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Metric Controls */}
            <div className="lg:col-span-2 space-y-5 bg-[#121218] border border-[#22222d] rounded-2xl p-5">
              <div className="flex items-center justify-between border-b border-[#1e1e28] pb-3">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-base font-bold text-white">Métricas Base e Ameaça - CVSS v4.0</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setV4Metrics({ ...DEFAULT_CVSS_V4 })}
                  className="text-xs font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Resetar Padrão</span>
                </button>
              </div>

              {/* Exploitability Group */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold">1. Exploitability (Vulnerabilidade)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Attack Vector */}
                  <div className="bg-[#161622] p-3 rounded-xl border border-[#232333] space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Attack Vector (AV)</label>
                    <div className="grid grid-cols-4 gap-1 text-[11px] font-mono font-bold">
                      {(['N', 'A', 'L', 'P'] as const).map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setV4Metrics(m => ({ ...m, av: val }))}
                          className={`py-1.5 rounded transition-all ${v4Metrics.av === val ? 'bg-emerald-500 text-white shadow-sm' : 'bg-[#1f1f2e] text-zinc-400 hover:bg-[#28283d]'}`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-zinc-500">{v4Metrics.av === 'N' ? 'Network (Remoto)' : v4Metrics.av === 'A' ? 'Adjacent Network' : v4Metrics.av === 'L' ? 'Local System' : 'Physical Access'}</p>
                  </div>

                  {/* Attack Complexity */}
                  <div className="bg-[#161622] p-3 rounded-xl border border-[#232333] space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Attack Complexity (AC)</label>
                    <div className="grid grid-cols-2 gap-1 text-[11px] font-mono font-bold">
                      {(['L', 'H'] as const).map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setV4Metrics(m => ({ ...m, ac: val }))}
                          className={`py-1.5 rounded transition-all ${v4Metrics.ac === val ? 'bg-emerald-500 text-white shadow-sm' : 'bg-[#1f1f2e] text-zinc-400 hover:bg-[#28283d]'}`}
                        >
                          {val === 'L' ? 'Low (L)' : 'High (H)'}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-zinc-500">{v4Metrics.ac === 'L' ? 'Sem defesas especiais / Determinístico' : 'Requer bypass estocástico / Segredos'}</p>
                  </div>

                  {/* Attack Requirements */}
                  <div className="bg-[#161622] p-3 rounded-xl border border-[#232333] space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Attack Requirements (AT) [Novo v4.0]</label>
                    <div className="grid grid-cols-2 gap-1 text-[11px] font-mono font-bold">
                      {(['N', 'P'] as const).map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setV4Metrics(m => ({ ...m, at: val }))}
                          className={`py-1.5 rounded transition-all ${v4Metrics.at === val ? 'bg-emerald-500 text-white shadow-sm' : 'bg-[#1f1f2e] text-zinc-400 hover:bg-[#28283d]'}`}
                        >
                          {val === 'N' ? 'None (N)' : 'Present (P)'}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-zinc-500">{v4Metrics.at === 'N' ? 'Sem pré-requisitos de ambiente de execução' : 'Exige condições específicas de deployment'}</p>
                  </div>

                  {/* Privileges Required */}
                  <div className="bg-[#161622] p-3 rounded-xl border border-[#232333] space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Privileges Required (PR)</label>
                    <div className="grid grid-cols-3 gap-1 text-[11px] font-mono font-bold">
                      {(['N', 'L', 'H'] as const).map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setV4Metrics(m => ({ ...m, pr: val }))}
                          className={`py-1.5 rounded transition-all ${v4Metrics.pr === val ? 'bg-emerald-500 text-white shadow-sm' : 'bg-[#1f1f2e] text-zinc-400 hover:bg-[#28283d]'}`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-zinc-500">{v4Metrics.pr === 'N' ? 'Nenhum privilégio prévio' : v4Metrics.pr === 'L' ? 'Usuário Autenticado' : 'Administrador / Root'}</p>
                  </div>
                </div>
              </div>

              {/* Vulnerable System Impact (VC, VI, VA) */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold">2. Impacto no Sistema Vulnerável (VC / VI / VA)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-[#161622] p-3 rounded-xl border border-[#232333] space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Confidentiality (VC)</label>
                    <div className="grid grid-cols-3 gap-1 text-[11px] font-mono font-bold">
                      {(['H', 'L', 'N'] as const).map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setV4Metrics(m => ({ ...m, vc: val }))}
                          className={`py-1.5 rounded transition-all ${v4Metrics.vc === val ? 'bg-rose-500 text-white shadow-sm' : 'bg-[#1f1f2e] text-zinc-400 hover:bg-[#28283d]'}`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#161622] p-3 rounded-xl border border-[#232333] space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Integrity (VI)</label>
                    <div className="grid grid-cols-3 gap-1 text-[11px] font-mono font-bold">
                      {(['H', 'L', 'N'] as const).map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setV4Metrics(m => ({ ...m, vi: val }))}
                          className={`py-1.5 rounded transition-all ${v4Metrics.vi === val ? 'bg-rose-500 text-white shadow-sm' : 'bg-[#1f1f2e] text-zinc-400 hover:bg-[#28283d]'}`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#161622] p-3 rounded-xl border border-[#232333] space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Availability (VA)</label>
                    <div className="grid grid-cols-3 gap-1 text-[11px] font-mono font-bold">
                      {(['H', 'L', 'N'] as const).map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setV4Metrics(m => ({ ...m, va: val }))}
                          className={`py-1.5 rounded transition-all ${v4Metrics.va === val ? 'bg-rose-500 text-white shadow-sm' : 'bg-[#1f1f2e] text-zinc-400 hover:bg-[#28283d]'}`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Subsequent System Impact (SC, SI, SA) - Replaces Scope of v3.1 */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold">3. Impacto em Sistemas Subsequentes (SC / SI / SA)</h3>
                  <span className="text-[10px] text-amber-400 font-mono">Substitui o conceito de Scope (S) da v3.1</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-[#161622] p-3 rounded-xl border border-[#232333] space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Subsequent Conf (SC)</label>
                    <div className="grid grid-cols-3 gap-1 text-[11px] font-mono font-bold">
                      {(['H', 'L', 'N'] as const).map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setV4Metrics(m => ({ ...m, sc: val }))}
                          className={`py-1.5 rounded transition-all ${v4Metrics.sc === val ? 'bg-amber-500 text-white shadow-sm' : 'bg-[#1f1f2e] text-zinc-400 hover:bg-[#28283d]'}`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#161622] p-3 rounded-xl border border-[#232333] space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Subsequent Integ (SI)</label>
                    <div className="grid grid-cols-3 gap-1 text-[11px] font-mono font-bold">
                      {(['H', 'L', 'N'] as const).map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setV4Metrics(m => ({ ...m, si: val }))}
                          className={`py-1.5 rounded transition-all ${v4Metrics.si === val ? 'bg-amber-500 text-white shadow-sm' : 'bg-[#1f1f2e] text-zinc-400 hover:bg-[#28283d]'}`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#161622] p-3 rounded-xl border border-[#232333] space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Subsequent Avail (SA)</label>
                    <div className="grid grid-cols-3 gap-1 text-[11px] font-mono font-bold">
                      {(['H', 'L', 'N'] as const).map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setV4Metrics(m => ({ ...m, sa: val }))}
                          className={`py-1.5 rounded transition-all ${v4Metrics.sa === val ? 'bg-amber-500 text-white shadow-sm' : 'bg-[#1f1f2e] text-zinc-400 hover:bg-[#28283d]'}`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Calculated Score & Comparison */}
            <div className="space-y-5">
              {/* Score Display Card */}
              <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-6 text-center space-y-4">
                <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">Pontuação CVSS v4.0</span>
                <div className="flex items-baseline justify-center gap-2">
                  <span className={`text-6xl font-black font-mono ${
                    v4Result.score >= 9.0 ? 'text-red-400' : v4Result.score >= 7.0 ? 'text-amber-400' : v4Result.score >= 4.0 ? 'text-yellow-400' : 'text-emerald-400'
                  }`}>
                    {v4Result.score.toFixed(1)}
                  </span>
                  <span className="text-lg font-mono text-zinc-500">/ 10.0</span>
                </div>

                <div className="inline-block">
                  <span className={`px-3 py-1 rounded-full text-xs font-mono font-black border ${
                    v4Result.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                    v4Result.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                    v4Result.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' :
                    'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {v4Result.severity}
                  </span>
                </div>

                {/* Vector string copy */}
                <div className="bg-[#161622] p-2.5 rounded-xl border border-[#242436] flex items-center justify-between text-left text-xs font-mono">
                  <span className="text-zinc-300 truncate max-w-[220px]" title={v4Result.vector}>
                    {v4Result.vector}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy('cvss-v4-vector', v4Result.vector)}
                    className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                  >
                    {copiedKey === 'cvss-v4-vector' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Apply to Report button */}
                {selectedReport && onUpdateReport && (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateReport({
                        ...selectedReport,
                        cvssVector: v4Result.vector,
                        cvssScore: v4Result.score,
                        severity: v4Result.severity
                      });
                      handleCopy('applied-v4', 'Applied');
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{copiedKey === 'applied-v4' ? 'Vetor v4.0 Aplicado!' : `Aplicar a ${selectedReport.id}`}</span>
                  </button>
                )}
              </div>

              {/* Equivalence Classes (EQ1-EQ6) breakdown */}
              <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Macro Vetores de Equivalência (EQ1 - EQ6)</span>
                </h3>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="p-2 bg-[#161622] rounded-lg border border-[#232332]">
                    <div className="text-zinc-500 text-[10px]">EQ1 (Exploit)</div>
                    <div className="font-bold text-emerald-400">{v4Result.eqValues.eq1}</div>
                  </div>
                  <div className="p-2 bg-[#161622] rounded-lg border border-[#232332]">
                    <div className="text-zinc-500 text-[10px]">EQ2 (Complex)</div>
                    <div className="font-bold text-emerald-400">{v4Result.eqValues.eq2}</div>
                  </div>
                  <div className="p-2 bg-[#161622] rounded-lg border border-[#232332]">
                    <div className="text-zinc-500 text-[10px]">EQ3 (Vuln Imp)</div>
                    <div className="font-bold text-rose-400">{v4Result.eqValues.eq3}</div>
                  </div>
                  <div className="p-2 bg-[#161622] rounded-lg border border-[#232332]">
                    <div className="text-zinc-500 text-[10px]">EQ4 (Sub Imp)</div>
                    <div className="font-bold text-amber-400">{v4Result.eqValues.eq4}</div>
                  </div>
                  <div className="p-2 bg-[#161622] rounded-lg border border-[#232332]">
                    <div className="text-zinc-500 text-[10px]">EQ5 (Threat)</div>
                    <div className="font-bold text-zinc-300">{v4Result.eqValues.eq5}</div>
                  </div>
                  <div className="p-2 bg-[#161622] rounded-lg border border-[#232332]">
                    <div className="text-zinc-500 text-[10px]">EQ6 (Impact)</div>
                    <div className="font-bold text-zinc-300">{v4Result.eqValues.eq6}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: CVSS v4.0 Component Calculator (Supply Chain Exploitability Sub-score) */}
      {/* ========================================================================= */}
      {activeTab === 'cvss-component' && (
        <CvssV4ComponentCalculator
          reportId={selectedReport?.id}
          reportTitle={selectedReport?.title}
          onBackToStandardCalculator={() => setActiveTab('cvss-v4')}
          onApplyToCvssV4={(metrics) => {
            setV4Metrics(prev => ({
              ...prev,
              av: metrics.av,
              ac: metrics.ac,
              at: metrics.at,
              pr: metrics.pr,
              ui: metrics.ui
            }));
            setActiveTab('cvss-v4');
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CWE & OWASP Top 10 Mapper */}
      {/* ========================================================================= */}
      {activeTab === 'cwe-owasp' && (
        <div className="space-y-6">
          {/* OWASP Category Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedOwaspId('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                selectedOwaspId === 'ALL' ? 'bg-emerald-500 text-white' : 'bg-[#15151f] text-zinc-400 border border-[#252536]'
              }`}
            >
              Todos ({TOP_CWES.length})
            </button>
            {OWASP_TOP_10_2021.map(owasp => (
              <button
                key={owasp.id}
                type="button"
                onClick={() => setSelectedOwaspId(owasp.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                  selectedOwaspId === owasp.id ? 'bg-emerald-500 text-white' : 'bg-[#15151f] text-zinc-400 border border-[#252536]'
                }`}
              >
                {owasp.id}: {owasp.shortTitle.slice(0, 20)}...
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={cweSearch}
              onChange={(e) => setCweSearch(e.target.value)}
              placeholder="Buscar por ID (ex: CWE-79, CWE-89), nome da falha, XSS, Injection ou impacto..."
              className="w-full bg-[#121218] border border-[#22222f] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {/* CWE Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCwes.map(cwe => {
              // Count matching reports in database
              const matchedReports = reports.filter(r => 
                r.title.toLowerCase().includes(cwe.id.toLowerCase()) || 
                r.description.toLowerCase().includes(cwe.name.toLowerCase()) ||
                r.title.toLowerCase().includes(cwe.name.toLowerCase())
              );

              return (
                <div key={cwe.id} className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-3 hover:border-zinc-700 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-mono font-bold">
                          {cwe.id}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/60 px-1.5 py-0.5 rounded">
                          {cwe.owaspCategory}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white">{cwe.name}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      cwe.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}>
                      {cwe.severity}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed">{cwe.description}</p>

                  <div className="bg-[#161622] p-3 rounded-xl border border-[#232333] space-y-1.5 text-xs">
                    <div className="text-zinc-400 font-bold flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                      <span>Impacto no Negócio:</span>
                    </div>
                    <p className="text-zinc-300 text-[11px]">{cwe.impact}</p>
                    <div className="text-zinc-400 font-bold flex items-center gap-1.5 pt-1">
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Estratégia de Remediação:</span>
                    </div>
                    <p className="text-emerald-300/90 text-[11px]">{cwe.remediation}</p>
                  </div>

                  {cwe.commonPayloadSnippet && (
                    <div className="bg-[#0a0a0f] p-2.5 rounded-lg border border-[#1f1f2e] text-[11px] font-mono flex items-center justify-between text-zinc-400">
                      <span className="truncate max-w-[340px] text-amber-300/90">{cwe.commonPayloadSnippet}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(`cwe-pay-${cwe.id}`, cwe.commonPayloadSnippet!)}
                        className="text-zinc-400 hover:text-white transition-colors"
                      >
                        {copiedKey === `cwe-pay-${cwe.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}

                  {matchedReports.length > 0 && (
                    <div className="pt-1 flex items-center justify-between text-xs font-mono text-zinc-400">
                      <span>{matchedReports.length} relatório(s) com esta fraqueza no acervo</span>
                      <button
                        type="button"
                        onClick={() => onSelectReport && onSelectReport(matchedReports[0])}
                        className="text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <span>Ver {matchedReports[0].id}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PoC Request Builder & Encoders */}
      {/* ========================================================================= */}
      {activeTab === 'poc-builder' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Interactive Request Builder */}
            <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>Construtor de Requisição PoC (Exploit Builder)</span>
              </h2>

              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-1">
                    <label className="text-[11px] font-mono font-bold text-zinc-400">Método</label>
                    <select
                      value={pocMethod}
                      onChange={(e) => setPocMethod(e.target.value as any)}
                      className="w-full bg-[#171722] border border-[#2a2a3b] rounded-lg px-2 py-1.5 text-xs font-mono text-white mt-1"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="text-[11px] font-mono font-bold text-zinc-400">URL Alvo do Exploit</label>
                    <input
                      type="text"
                      value={pocTarget}
                      onChange={(e) => setPocTarget(e.target.value)}
                      className="w-full bg-[#171722] border border-[#2a2a3b] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-mono font-bold text-zinc-400">Header Header</label>
                    <input
                      type="text"
                      value={pocHeaderKey}
                      onChange={(e) => setPocHeaderKey(e.target.value)}
                      className="w-full bg-[#171722] border border-[#2a2a3b] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono font-bold text-zinc-400">Header Valor</label>
                    <input
                      type="text"
                      value={pocHeaderVal}
                      onChange={(e) => setPocHeaderVal(e.target.value)}
                      className="w-full bg-[#171722] border border-[#2a2a3b] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white mt-1"
                    />
                  </div>
                </div>

                {pocMethod !== 'GET' && (
                  <div>
                    <label className="text-[11px] font-mono font-bold text-zinc-400">Corpo da Requisição (Payload JSON/Raw)</label>
                    <textarea
                      rows={3}
                      value={pocBody}
                      onChange={(e) => setPocBody(e.target.value)}
                      className="w-full bg-[#171722] border border-[#2a2a3b] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white mt-1 resize-none"
                    />
                  </div>
                )}
              </div>

              {/* Format selection */}
              <div className="pt-2 flex items-center justify-between border-t border-[#1e1e28]">
                <div className="flex items-center gap-1.5">
                  {(['curl', 'python', 'raw'] as const).map(fmt => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setPocFormat(fmt)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase transition-all ${
                        pocFormat === fmt ? 'bg-emerald-500 text-white shadow-sm' : 'bg-[#181824] text-zinc-400 hover:bg-[#202030]'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('poc-code', generatedPocCode)}
                  className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedKey === 'poc-code' ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar Script</span>
                </button>
              </div>

              {/* Generated Code Area */}
              <pre className="bg-[#0b0b10] border border-[#1f1f2d] rounded-xl p-3.5 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-[220px]">
                {generatedPocCode}
              </pre>
            </div>

            {/* Right: Encoders & Decoders */}
            <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Code2 className="w-4 h-4 text-amber-400" />
                <span>Codificadores de Payload (Bypass & WAF Evasion)</span>
              </h2>

              <div>
                <label className="text-[11px] font-mono font-bold text-zinc-400">Texto / Payload Original</label>
                <input
                  type="text"
                  value={encoderInput}
                  onChange={(e) => setEncoderInput(e.target.value)}
                  className="w-full bg-[#171722] border border-[#2a2a3b] rounded-lg px-2.5 py-2 text-xs font-mono text-white mt-1"
                />
              </div>

              <div className="space-y-3">
                {/* URL Encode */}
                <div className="bg-[#161622] p-3 rounded-xl border border-[#232333] space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400 font-bold">URL Encoded</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('enc-url', encodedUrl)}
                      className="text-zinc-400 hover:text-white"
                    >
                      {copiedKey === 'enc-url' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="text-xs font-mono text-amber-300 truncate">{encodedUrl}</div>
                </div>

                {/* Base64 Encode */}
                <div className="bg-[#161622] p-3 rounded-xl border border-[#232333] space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400 font-bold">Base64 Encoded</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('enc-b64', encodedBase64)}
                      className="text-zinc-400 hover:text-white"
                    >
                      {copiedKey === 'enc-b64' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="text-xs font-mono text-indigo-300 truncate">{encodedBase64}</div>
                </div>

                {/* Hex Encoded */}
                <div className="bg-[#161622] p-3 rounded-xl border border-[#232333] space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400 font-bold">Hex Encoded (\x..)</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('enc-hex', encodedHex)}
                      className="text-zinc-400 hover:text-white"
                    >
                      {copiedKey === 'enc-hex' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="text-xs font-mono text-emerald-300 truncate">{encodedHex}</div>
                </div>
              </div>

              <button
                type="button"
                id="btn-open-full-encoder-suite"
                onClick={() => setActiveTab('payload-encoder')}
                className="w-full mt-3 py-2 px-3 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 active:scale-[0.98] border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Binary className="w-3.5 h-3.5" />
                <span>Abrir Suíte Completa: Base64, URL & Hex Real-Time</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SLA & Remediation Tracker */}
      {/* ========================================================================= */}
      {activeTab === 'sla-tracker' && (
        <div className="space-y-6">
          {/* SLA Top KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Taxa de Conformidade SLA</span>
              <div className="text-3xl font-black font-mono text-emerald-400">{slaOverview.overallComplianceRatePct}%</div>
              <p className="text-[10px] text-zinc-500">Relatórios dentro do prazo de triagem e correção</p>
            </div>

            <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Tempo Médio Triagem (MTTT)</span>
              <div className="text-3xl font-black font-mono text-indigo-400">{slaOverview.mtttHours}h</div>
              <p className="text-[10px] text-zinc-500">Meta: Crítico &lt; 4h | Alto &lt; 12h</p>
            </div>

            <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Tempo Médio Correção (MTTR)</span>
              <div className="text-3xl font-black font-mono text-amber-400">{slaOverview.mttrHours}h</div>
              <p className="text-[10px] text-zinc-500">Média de horas para status RESOLVED</p>
            </div>

            <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Atrasos Ativos (Breaches)</span>
              <div className={`text-3xl font-black font-mono ${slaOverview.activeBreachesCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {slaOverview.activeBreachesCount}
              </div>
              <p className="text-[10px] text-zinc-500">Relatórios que excederam o SLA estipulado</p>
            </div>
          </div>

          {/* SLA Table */}
          <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Status dos Relatórios em Relação ao SLA</span>
              <span className="text-xs font-mono text-zinc-400">{slaOverview.reportStatuses.length} avaliados</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#22222f] text-zinc-400">
                    <th className="pb-2.5 font-bold">Relatório</th>
                    <th className="pb-2.5 font-bold">Severidade</th>
                    <th className="pb-2.5 font-bold">Status</th>
                    <th className="pb-2.5 font-bold">Tempo Aberto</th>
                    <th className="pb-2.5 font-bold">SLA Triagem</th>
                    <th className="pb-2.5 font-bold">SLA Remediação</th>
                    <th className="pb-2.5 font-bold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b1b26]">
                  {slaOverview.reportStatuses.map(item => (
                    <tr key={item.reportId} className="hover:bg-[#161622] transition-colors">
                      <td className="py-3 font-bold text-white">
                        <div>{item.reportId}</div>
                        <div className="text-[11px] font-normal text-zinc-400 truncate max-w-[240px]">{item.title}</div>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded font-bold border ${getSeverityBadgeColor(item.severity)}`}>
                          {item.severity}
                        </span>
                      </td>
                      <td className="py-3">
                        <StatusBadge status={item.status as any} size="xs" />
                      </td>
                      <td className="py-3 text-zinc-300">
                        {item.hoursElapsed}h decorridas
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded font-bold border text-[10px] ${
                          item.triageStatus === 'BREACHED' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse' :
                          item.triageStatus === 'DUE_SOON' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                          'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}>
                          {item.triageStatus === 'BREACHED' ? 'EXPIRADO' : item.triageStatus === 'DUE_SOON' ? `Restam ${item.hoursRemainingTriage}h` : 'NO PRAZO'}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded font-bold border text-[10px] ${
                          item.remediationStatus === 'RESOLVED' ? 'bg-zinc-800 text-zinc-400 border-zinc-700' :
                          item.remediationStatus === 'BREACHED' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                          item.remediationStatus === 'DUE_SOON' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                          'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}>
                          {item.remediationStatus}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {item.status !== 'TRIAGED' && onUpdateStatus && (
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(item.reportId, 'TRIAGED')}
                            className="px-2.5 py-1 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            Quick Triage
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: Triage Macros & Canned Responses */}
      {/* ========================================================================= */}
      {activeTab === 'triage-macros' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Macros List */}
            <div className="space-y-2 bg-[#121218] border border-[#22222f] rounded-2xl p-4">
              <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider mb-2">Modelos Prontos de Resposta</h3>
              {DEFAULT_TRIAGE_MACROS.map(macro => (
                <button
                  key={macro.id}
                  type="button"
                  onClick={() => setSelectedMacroId(macro.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedMacroId === macro.id
                      ? 'bg-[#181826] border-indigo-500/50 shadow-md'
                      : 'bg-[#15151f] border-[#22222f] hover:bg-[#1a1a26]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white">{macro.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono font-bold ${macro.badgeColor}`}>
                      {macro.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{macro.shortDescription}</p>
                </button>
              ))}
            </div>

            {/* Right 2 cols: Template Preview & Action */}
            <div className="lg:col-span-2 bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#20202c] pb-3">
                <div>
                  <h3 className="text-base font-bold text-white">{activeMacro.title}</h3>
                  <p className="text-xs text-zinc-400">Variáveis preenchidas dinamicamente a partir do relatório {selectedReport?.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy('macro-text', renderedMacroText)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedKey === 'macro-text' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copiar Texto</span>
                  </button>

                  {activeMacro.suggestedStatus && onUpdateStatus && selectedReport && (
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(selectedReport.id, activeMacro.suggestedStatus!)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Aplicar Status {activeMacro.suggestedStatus}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Rendered Textarea */}
              <div className="relative">
                <textarea
                  readOnly
                  rows={12}
                  value={renderedMacroText}
                  className="w-full bg-[#0d0d14] border border-[#1f1f2e] rounded-xl p-4 text-xs font-mono text-zinc-200 leading-relaxed resize-none focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: Duplicate Cross-Matcher */}
      {/* ========================================================================= */}
      {activeTab === 'duplicate-detector' && (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Copy className="w-4 h-4 text-amber-400" />
              <span>Análise Heurística de Relatórios Duplicados</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-mono font-bold text-zinc-400">Alvo / Host Sob Teste</label>
                <input
                  type="text"
                  value={duplicateTargetQuery}
                  onChange={(e) => setDuplicateTargetQuery(e.target.value)}
                  className="w-full bg-[#161622] border border-[#252536] rounded-lg px-3 py-2 text-xs font-mono text-white mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono font-bold text-zinc-400">Título / Tipo de Vulnerabilidade</label>
                <input
                  type="text"
                  value={duplicateTypeQuery}
                  onChange={(e) => setDuplicateTypeQuery(e.target.value)}
                  className="w-full bg-[#161622] border border-[#252536] rounded-lg px-3 py-2 text-xs font-mono text-white mt-1"
                />
              </div>
            </div>

            <div className="pt-2">
              <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Correspondências Identificadas ({duplicateResults.length})
              </h3>

              {duplicateResults.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-zinc-500 bg-[#0e0e14] rounded-xl border border-[#1f1f2d]">
                  Nenhum relatório similar detectado com este padrão de alvo e título.
                </div>
              ) : (
                <div className="space-y-2">
                  {duplicateResults.map(item => (
                    <div
                      key={item.report.id}
                      className="bg-[#151520] border border-[#222232] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-white">{item.report.id}</span>
                          <span className="text-zinc-500">•</span>
                          <span className="text-zinc-300 text-xs font-medium">{item.report.title}</span>
                          <StatusBadge status={item.report.status} size="xs" />
                        </div>
                        <div className="text-[11px] font-mono text-zinc-400">
                          Alvo: <span className="text-emerald-400">{item.report.target}</span> | Severidade: {item.report.severity}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right font-mono">
                          <div className="text-sm font-black text-amber-400">{item.matchScore}% Match</div>
                          <div className="text-[10px] text-zinc-500">Probabilidade</div>
                        </div>

                        {onSelectReport && (
                          <button
                            type="button"
                            onClick={() => onSelectReport(item.report)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition-colors cursor-pointer"
                          >
                            Comparar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: Bounty Matrix & Budget Simulator */}
      {/* ========================================================================= */}
      {activeTab === 'bounty-matrix' && (
        <div className="space-y-6">
          {/* Top Simulation Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Orçamento Anual (Budget Pool)</span>
              <div className="text-2xl font-black font-mono text-white">{formatCurrency(budgetSimulation.totalBudgetPool, 'USD')}</div>
              <p className="text-[10px] text-zinc-500">Verba alocada para o programa</p>
            </div>

            <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Total Pago em Recompensas</span>
              <div className="text-2xl font-black font-mono text-emerald-400">{formatCurrency(budgetSimulation.totalBountiesPaid, 'USD')}</div>
              <p className="text-[10px] text-zinc-500">{budgetSimulation.budgetUtilizationPct}% do orçamento utilizado</p>
            </div>

            <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Prejuízo de Vazamento Evitado (ROI)</span>
              <div className="text-2xl font-black font-mono text-indigo-400">{formatCurrency(budgetSimulation.estimatedCostOfBreachAvoidedUSD, 'USD')}</div>
              <p className="text-[10px] text-zinc-500">Com base no relatório IBM Cost of Data Breach</p>
            </div>

            <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Multiplicador ROI</span>
              <div className="text-2xl font-black font-mono text-amber-400">{budgetSimulation.programRoiRatio}x</div>
              <p className="text-[10px] text-zinc-500">Retorno em risco mitigado por dólar pago</p>
            </div>
          </div>

          {/* Tiered Rewards Matrix */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Tabela de Recompensas por Criticidade de Ativo</span>
              <span className="text-xs font-mono text-zinc-400">Diretriz Padrão de Pagamentos</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ASSET_TIERS.map(tier => (
                <div key={tier.id} className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-white">{tier.name}</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">{tier.description}</p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[#1e1e28]">
                    {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(sev => (
                      <div key={sev} className="flex items-center justify-between text-xs font-mono">
                        <span className={`px-2 py-0.5 rounded font-bold border ${getSeverityBadgeColor(sev)}`}>
                          {sev}
                        </span>
                        <div className="text-right">
                          <span className="font-bold text-white">${tier.rewards[sev].standard}</span>
                          <span className="text-zinc-500 text-[10px] ml-1">(${tier.rewards[sev].min} - ${tier.rewards[sev].max})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: Program ROI & Yield Prioritizer (Historical Payouts vs. Coverage) */}
      {/* ========================================================================= */}
      {activeTab === 'program-roi' && (
        <ProgramRoiCalculator reports={reports} />
      )}

      {/* ========================================================================= */}
      {/* TAB 9: Issue Tracker Exporter */}
      {/* ========================================================================= */}
      {activeTab === 'issue-exporter' && (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#20202c] pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-emerald-400" />
                  <span>Exportador para Jira, GitHub Issues & GitLab</span>
                </h3>
                <p className="text-xs text-zinc-400">Gera tickets prontos e sanitizados para encaminhar à equipe de desenvolvimento.</p>
              </div>

              <div className="flex items-center gap-2">
                {(['jira', 'github', 'gitlab'] as const).map(plat => (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => setExportPlatform(plat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all ${
                      exportPlatform === plat ? 'bg-emerald-500 text-white' : 'bg-[#181824] text-zinc-400 hover:bg-[#222232]'
                    }`}
                  >
                    {plat}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => handleCopy('issue-body', `${issueData.title}\n\n${issueData.body}`)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedKey === 'issue-body' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copiar Ticket</span>
                </button>
              </div>
            </div>

            {/* Title & Body */}
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-mono font-bold text-zinc-400">Título Sugerido do Ticket</label>
                <div className="bg-[#161622] border border-[#242436] rounded-lg p-2.5 text-xs font-mono text-white mt-1 font-bold">
                  {issueData.title}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono font-bold text-zinc-400">Corpo Formatado ({exportPlatform.toUpperCase()})</label>
                <textarea
                  readOnly
                  rows={14}
                  value={issueData.body}
                  className="w-full bg-[#0d0d14] border border-[#1f1f2e] rounded-xl p-4 text-xs font-mono text-zinc-200 leading-relaxed resize-none focus:outline-none mt-1"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 9: DLP Sanitizer */}
      {/* ========================================================================= */}
      {activeTab === 'dlp-sanitizer' && (
        <div className="space-y-6">
          <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#20202c] pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-rose-400" />
                  <span>Sanitizador DLP (Data Loss Prevention & Redactor)</span>
                </h3>
                <p className="text-xs text-zinc-400">Varre e ofusca automaticamente chaves de API, segredos, senhas e CPFs de relatórios antes da exportação.</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono text-xs font-bold">
                  {dlpResult.secretsCount} Segredo(s) Detectado(s)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('sanitized-dlp', dlpResult.sanitizedText)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedKey === 'sanitized-dlp' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copiar Sanitizado</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-mono font-bold text-zinc-400">Texto Original / PoC com Chaves Reais</label>
                <textarea
                  rows={12}
                  value={dlpInputText}
                  onChange={(e) => setDlpInputText(e.target.value)}
                  className="w-full bg-[#0e0e14] border border-[#252536] rounded-xl p-3.5 text-xs font-mono text-rose-200 mt-1 resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono font-bold text-zinc-400">Resultado Sanitizado Seguro</label>
                <textarea
                  readOnly
                  rows={12}
                  value={dlpResult.sanitizedText}
                  className="w-full bg-[#0a0a10] border border-[#1f1f2e] rounded-xl p-3.5 text-xs font-mono text-emerald-300 mt-1 resize-none"
                />
              </div>
            </div>

            {dlpResult.findings.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">Segredos Identificados no Texto:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {dlpResult.findings.map((f, i) => (
                    <div key={i} className="p-2.5 bg-[#161622] rounded-lg border border-[#262638] text-xs font-mono space-y-0.5">
                      <div className="text-rose-400 font-bold">{f.label}</div>
                      <div className="text-[10px] text-zinc-400 truncate">Detectado: {f.matchedText.slice(0, 20)}...</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Action Link to Secret Remediation Guide */}
            <div className="mt-4 p-4 rounded-xl bg-[#16121c] border border-red-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-950/80 border border-red-500/40 text-red-400 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Vazamento de Chaves Detectado (OpenAI / AWS / JWT / GitHub)?</span>
                    <span className="text-[9px] px-2 py-0.2 rounded bg-red-950 text-red-300 border border-red-500/30 font-mono font-bold uppercase">Ação Crítica</span>
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                    Siga o checklist operacional dedicado com suporte a <strong>Remediação em Lote (Batch Remediation)</strong> para <strong>rotacionar</strong> credenciais, <strong>revogar</strong> nos consoles oficiais, <strong>auditar</strong> telemetria no CloudTrail/OpenAI e <strong>encerrar alertas</strong> no GitHub Secret Scanning simultaneamente.
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-goto-secret-remediation-guide"
                onClick={() => setActiveTab('secret-remediation')}
                className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-sm cursor-pointer"
              >
                <span>Abrir Guia de Remediação</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 10: Secret Remediation Guide */}
      {/* ========================================================================= */}
      {activeTab === 'secret-remediation' && (
        <SecretRemediationGuide />
      )}

      {/* ========================================================================= */}
      {/* TAB 11: Webhooks & SIEM */}
      {/* ========================================================================= */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Webhook Dispatcher Simulator */}
            <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-cyan-400" />
                <span>Simulador de Webhooks & Alertas para SOC</span>
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-mono font-bold text-zinc-400">Serviço de Destino</label>
                  <div className="grid grid-cols-4 gap-1.5 mt-1 font-mono text-xs font-bold">
                    {(['slack', 'discord', 'teams', 'siem'] as const).map(srv => (
                      <button
                        key={srv}
                        type="button"
                        onClick={() => {
                          setWebhookService(srv);
                          if (srv === 'slack') setWebhookUrl('https://hooks.slack.com/services/T00/B00/XXX');
                          else if (srv === 'discord') setWebhookUrl('https://discord.com/api/webhooks/123/abc');
                          else if (srv === 'teams') setWebhookUrl('https://outlook.office.com/webhook/xxx');
                          else setWebhookUrl('https://siem.corp.internal/v1/ingest');
                        }}
                        className={`py-2 rounded-lg uppercase transition-all ${
                          webhookService === srv ? 'bg-cyan-600 text-white' : 'bg-[#181824] text-zinc-400 hover:bg-[#202030]'
                        }`}
                      >
                        {srv}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono font-bold text-zinc-400">URL Endpoint do Webhook</label>
                  <input
                    type="text"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full bg-[#161622] border border-[#252536] rounded-lg px-3 py-2 text-xs font-mono text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono font-bold text-zinc-400">Evento de Disparo (Trigger)</label>
                  <select
                    value={webhookTriggerEvent}
                    onChange={(e) => setWebhookTriggerEvent(e.target.value as any)}
                    className="w-full bg-[#161622] border border-[#252536] rounded-lg px-3 py-2 text-xs font-mono text-white mt-1"
                  >
                    <option value="CRITICAL_REPORT">Novo Relatório Crítico Cadastrado</option>
                    <option value="STATUS_TRIAGED">Relatório Validado / Triado com Sucesso</option>
                    <option value="BOUNTY_PAID">Recompensa Concedida ao Pesquisador</option>
                  </select>
                </div>

                <button
                  type="button"
                  disabled={isSendingWebhook}
                  onClick={handleTestWebhook}
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-[0.98] text-white font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSendingWebhook ? (
                    <span>Disparando Payload HTTP POST...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Testar Envio de Alerta Imediato</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right: Live Delivery Logs */}
            <div className="bg-[#121218] border border-[#22222f] rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">Histórico de Disparos de Webhook</h3>
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {webhookLogs.map(log => (
                  <div key={log.id} className="bg-[#151520] border border-[#202030] rounded-xl p-3 space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">{log.time}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40 text-[10px]">
                        HTTP {log.status} OK
                      </span>
                    </div>
                    <div className="text-white font-bold">{log.event}</div>
                    <pre className="text-[10px] text-zinc-400 bg-[#0d0d14] p-2 rounded border border-[#1b1b28] overflow-x-auto">
                      {log.payload}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 14. JWT Security Analyzer --- */}
      {activeTab === 'jwt-analyzer' && (
        <JwtSecurityAnalyzer 
          reportId={selectedReport?.id} 
          reportTitle={selectedReport?.title} 
        />
      )}

      {/* --- 20. Interactive D3.js Attack Graph Studio --- */}
      {activeTab === 'attack-graph' && (
        <AttackGraphStudio 
          reports={reports}
          selectedReportId={selectedReport?.id}
          onSelectReport={onSelectReport}
        />
      )}

      {/* --- 27. Threat Visualizer: D3.js & Recharts Vulnerability Relationships --- */}
      {activeTab === 'threat-visualizer' && (
        <ThreatVisualizer 
          reports={reports}
          selectedReportId={selectedReport?.id}
          onSelectReport={(report) => {
            setSelectedReportId(report.id);
            if (onSelectReport) onSelectReport(report);
          }}
          onNavigateToPoc={(url, payload) => {
            setPocTarget(url);
            if (payload) setPocBody(payload);
            setActiveTab('poc-builder');
          }}
        />
      )}

      {/* --- 24. CORS Misconfiguration Studio & Exploit Generator --- */}
      {activeTab === 'cors-studio' && (
        <CorsStudio />
      )}

      {/* --- 25. HTTP Request Smuggling & Desync Inspector --- */}
      {activeTab === 'request-smuggler' && (
        <HttpRequestSmuggler />
      )}

      {/* --- 26. Out-of-Band (OOB) Collaborator Studio --- */}
      {activeTab === 'oob-collaborator' && (
        <OobInteractionStudio 
          initialTarget={selectedReport?.target}
          onSendToPocBuilder={(url, payload) => {
            setPocTarget(url);
            if (payload) setPocBody(payload);
            setActiveTab('poc-builder');
          }}
        />
      )}

      {/* --- 15. CSP Studio & Evaluator --- */}
      {activeTab === 'csp-studio' && (
        <CspStudio />
      )}

      {/* --- 16. CVSS v4.0 + FIRST EPSS Matrix --- */}
      {activeTab === 'epss-prioritizer' && (
        <CvssEpssMatrix 
          reportId={selectedReport?.id} 
          reportTitle={selectedReport?.title} 
          cvssScore={selectedReport?.cvssScore} 
        />
      )}

      {/* --- 17. CSRF PoC Studio --- */}
      {activeTab === 'csrf-poc-studio' && (
        <CsrfPocStudio 
          reportId={selectedReport?.id} 
          targetEndpoint={selectedReport?.target ? `https://${selectedReport.target}/api/action` : undefined} 
        />
      )}

      {/* --- 17.2. Payload Fuzzer & Mutation Engine --- */}
      {activeTab === 'payload-fuzzer' && (
        <PayloadFuzzerStudio 
          initialTarget={selectedReport?.target}
          onSendToPocBuilder={(url, payload) => {
            setPocTarget(url);
            if (payload) setPocBody(payload);
            setActiveTab('poc-builder');
          }}
        />
      )}

      {/* --- 18. Payload Multi-Encoder / Decoder --- */}
      {activeTab === 'payload-encoder' && (
        <PayloadEncoderDecoder />
      )}

      {/* --- 18.2. Payload Obfuscator (XOR, Base64 & URL Encoding) --- */}
      {activeTab === 'payload-obfuscator' && (
        <PayloadObfuscatorStudio />
      )}

      {/* --- 18.3. OAuth 2.0 & OIDC Security Inspector --- */}
      {activeTab === 'oauth-inspector' && (
        <OAuthSecurityInspector />
      )}

      {/* --- 18.4. BOLA / IDOR Authorization Matrix --- */}
      {activeTab === 'idor-bola' && (
        <IdorBolaMatrix />
      )}

      {/* --- 18.5. Web Cache Poisoning & Deception Studio --- */}
      {activeTab === 'cache-security' && (
        <WebCacheSecurityStudio />
      )}

      {/* --- 18.6. Prototype Pollution & Gadgets Studio --- */}
      {activeTab === 'proto-pollution' && (
        <PrototypePollutionStudio />
      )}

      {/* --- 18.7. Race Condition & Concurrency Studio --- */}
      {activeTab === 'race-condition' && (
        <RaceConditionStudio />
      )}

      {/* --- 18.8. Mass Assignment & HPP Matrix --- */}
      {activeTab === 'mass-assignment' && (
        <MassAssignmentHppMatrix />
      )}

      {/* --- 18.9. SAML 2.0 & XML Workbench --- */}
      {activeTab === 'saml-workbench' && (
        <SamlSecurityWorkbench />
      )}

      {/* --- 18.10. AWS IAM Privilege Escalation Auditor --- */}
      {activeTab === 'iam-escalation' && (
        <CloudIamEscalationAuditor />
      )}

      {/* --- 19. Security Headers Auditor --- */}
      {activeTab === 'security-headers' && (
        <SecurityHeadersAuditor />
      )}

      {/* --- 20. Subdomain Takeover Analyzer --- */}
      {activeTab === 'subdomain-takeover' && (
        <SubdomainTakeoverAnalyzer initialSubdomain={selectedReport?.target} />
      )}

      {/* --- 21. ReDoS & Regex Catastrophic Backtracking Studio --- */}
      {activeTab === 'redos-studio' && (
        <ReDoSStudio />
      )}

      {/* --- 22. Cloud SSRF & Metadata Orchestrator --- */}
      {activeTab === 'ssrf-cloud' && (
        <SsrfCloudOrchestrator />
      )}

      {/* --- 23. GraphQL Security & Introspection Auditor --- */}
      {activeTab === 'graphql-auditor' && (
        <GraphQLSecurityAuditor />
      )}
    </div>
  );
};
