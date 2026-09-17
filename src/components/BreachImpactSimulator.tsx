import React, { useState, useMemo, useEffect } from 'react';
import {
  DollarSign,
  TrendingDown,
  ShieldAlert,
  AlertTriangle,
  Building2,
  Users,
  Scale,
  FileText,
  Sliders,
  Copy,
  Check,
  RotateCcw,
  HelpCircle,
  Info,
  ExternalLink,
  PieChart,
  BarChart3,
  Award,
  Sparkles,
  Clock,
  ArrowRight,
  Lock,
  ShieldCheck,
  ChevronDown,
  Activity,
  Calculator,
  Flame,
  Globe,
  Share2
} from 'lucide-react';
import { VulnerabilityReport, Severity } from '../types';
import { formatCurrency, getSeverityBadgeColor } from '../utils/formatters';

export interface BreachSimulationConfig {
  reportId: string;
  industry: 'healthcare' | 'financial' | 'technology' | 'retail' | 'energy' | 'public';
  companyScale: 'startup' | 'midmarket' | 'enterprise' | 'large_enterprise';
  annualRevenue: number;
  recordsExposed: number;
  dataType: 'pii' | 'pci' | 'phi' | 'ip' | 'credentials';
  dwellTimeDays: number; // Days to detect and contain (MTTI + MTTC)
  hasSecurityAi: boolean; // IBM: saves up to $1.8M
  hasTestedIrPlan: boolean; // IR plan tested: saves ~18%
  hasZeroTrust: boolean; // Zero trust / Encryption: saves ~12%
  publicExposure: 'private_api' | 'public_facing' | 'internal_network';
  bountyPaid: number;
}

interface BreachImpactSimulatorProps {
  reports: VulnerabilityReport[];
  initialReportId?: string;
  onSelectReport?: (report: VulnerabilityReport) => void;
  className?: string;
  compact?: boolean;
}

// Industry multipliers based on IBM Cost of a Data Breach Report
const INDUSTRY_DATA = {
  healthcare: { label: 'Saúde & Farmacêutica (HIPAA)', multiplier: 1.85, basePerRecord: 380, avgBreach: 10900000 },
  financial: { label: 'Serviços Financeiros & FinTech', multiplier: 1.45, basePerRecord: 260, avgBreach: 5900000 },
  technology: { label: 'Tecnologia, SaaS & Cloud', multiplier: 1.15, basePerRecord: 195, avgBreach: 4700000 },
  retail: { label: 'Varejo & E-Commerce', multiplier: 0.90, basePerRecord: 175, avgBreach: 3400000 },
  energy: { label: 'Energia & Infraestrutura Crítica', multiplier: 1.25, basePerRecord: 220, avgBreach: 4800000 },
  public: { label: 'Setor Público & Educação', multiplier: 0.85, basePerRecord: 145, avgBreach: 3200000 }
};

// Company scale defaults
const SCALE_DATA = {
  startup: { label: 'Startup / PME (< US$ 10M)', revenue: 5000000, scaleFactor: 0.35 },
  midmarket: { label: 'Médio Porte (US$ 10M - 100M)', revenue: 40000000, scaleFactor: 0.75 },
  enterprise: { label: 'Grande Empresa (US$ 100M - 1B)', revenue: 350000000, scaleFactor: 1.15 },
  large_enterprise: { label: 'Corporação Global (> US$ 1B)', revenue: 2500000000, scaleFactor: 1.65 }
};

// Data sensitivity definitions
const DATA_TYPE_INFO = {
  pii: { label: 'Dados Pessoais (PII / LGPD / GDPR)', baseCost: 183, penaltyFactor: 1.0 },
  pci: { label: 'Cartões & Dados Financeiros (PCI-DSS)', baseCost: 245, penaltyFactor: 1.25 },
  phi: { label: 'Dados Médicos & Saúde (PHI / HIPAA)', baseCost: 380, penaltyFactor: 1.65 },
  ip: { label: 'Propriedade Intelectual & Código-Fonte', baseCost: 215, penaltyFactor: 1.2 },
  credentials: { label: 'Credenciais & Tokens de Sessão Privilegiados', baseCost: 165, penaltyFactor: 1.1 }
};

export const BreachImpactSimulator: React.FC<BreachImpactSimulatorProps> = ({
  reports,
  initialReportId,
  onSelectReport,
  className = '',
  compact = false
}) => {
  // Selected Report
  const [selectedReportId, setSelectedReportId] = useState<string>(
    initialReportId || (reports.length > 0 ? reports[0].id : '')
  );

  const selectedReport = useMemo(() => {
    return reports.find((r) => r.id === selectedReportId) || reports[0] || null;
  }, [reports, selectedReportId]);

  // Update selectedReportId if prop changes
  useEffect(() => {
    if (initialReportId && initialReportId !== selectedReportId) {
      setSelectedReportId(initialReportId);
    }
  }, [initialReportId]);

  // Active View Tab inside Simulator
  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'regulatory' | 'reputation' | 'roi' | 'export'>('overview');

  // Simulation Configuration State
  const [industry, setIndustry] = useState<BreachSimulationConfig['industry']>('technology');
  const [companyScale, setCompanyScale] = useState<BreachSimulationConfig['companyScale']>('midmarket');
  const [customRevenue, setCustomRevenue] = useState<number>(40000000);
  const [recordsExposed, setRecordsExposed] = useState<number>(25000);
  const [dataType, setDataType] = useState<BreachSimulationConfig['dataType']>('pii');
  const [dwellTimeDays, setDwellTimeDays] = useState<number>(204); // Ponemon global average = 204 days
  const [hasSecurityAi, setHasSecurityAi] = useState<boolean>(false);
  const [hasTestedIrPlan, setHasTestedIrPlan] = useState<boolean>(true);
  const [hasZeroTrust, setHasZeroTrust] = useState<boolean>(false);
  const [publicExposure, setPublicExposure] = useState<BreachSimulationConfig['publicExposure']>('public_facing');
  const [customBountyPaid, setCustomBountyPaid] = useState<number>(selectedReport?.bountyAmount || 1500);

  const [copiedBrief, setCopiedBrief] = useState(false);
  const [showModelGuidance, setShowModelGuidance] = useState(false);

  // Auto-tune simulation parameters when user changes selected report
  useEffect(() => {
    if (!selectedReport) return;

    setCustomBountyPaid(selectedReport.bountyAmount || (
      selectedReport.severity === 'CRITICAL' ? 3500 :
      selectedReport.severity === 'HIGH' ? 1500 :
      selectedReport.severity === 'MEDIUM' ? 500 : 150
    ));

    // Guess data type based on CWE / title / type
    const lowTitle = (selectedReport.title + ' ' + selectedReport.vulnerabilityType + ' ' + selectedReport.cwe).toLowerCase();
    if (lowTitle.includes('sql') || lowTitle.includes('injection') || lowTitle.includes('database')) {
      setRecordsExposed(75000);
      setDataType('pii');
    } else if (lowTitle.includes('idor') || lowTitle.includes('bola') || lowTitle.includes('access control')) {
      setRecordsExposed(35000);
      setDataType('pii');
    } else if (lowTitle.includes('payment') || lowTitle.includes('cart') || lowTitle.includes('wallet') || lowTitle.includes('checkout')) {
      setRecordsExposed(12000);
      setDataType('pci');
    } else if (lowTitle.includes('auth') || lowTitle.includes('session') || lowTitle.includes('token') || lowTitle.includes('jwt') || lowTitle.includes('account takeover')) {
      setRecordsExposed(20000);
      setDataType('credentials');
    } else if (lowTitle.includes('rce') || lowTitle.includes('execution') || lowTitle.includes('deserialization')) {
      setRecordsExposed(150000);
      setDataType('ip');
    } else {
      setRecordsExposed(15000);
    }
  }, [selectedReport]);

  // Synchronize revenue when scale changes
  const handleScaleChange = (scale: BreachSimulationConfig['companyScale']) => {
    setCompanyScale(scale);
    setCustomRevenue(SCALE_DATA[scale].revenue);
  };

  // Run Quantitative Calculations based on Ponemon / IBM Cost of a Data Breach & FAIR Framework
  const simulationResults = useMemo(() => {
    const cvss = selectedReport?.cvssScore || 7.5;
    const severity = selectedReport?.severity || 'HIGH';

    // 1. Severity Multiplier
    const severityFactor = 
      severity === 'CRITICAL' ? 1.45 :
      severity === 'HIGH' ? 1.15 :
      severity === 'MEDIUM' ? 0.75 : 0.40;

    // 2. Exploitability & Public Exposure
    const exposureFactor = 
      publicExposure === 'public_facing' ? 1.25 :
      publicExposure === 'private_api' ? 1.0 : 0.70;

    // 3. Per Record Direct Calculation
    const perRecordBase = DATA_TYPE_INFO[dataType].baseCost;
    const industryMultiplier = INDUSTRY_DATA[industry].multiplier;
    const scaleFactor = SCALE_DATA[companyScale].scaleFactor;

    // Direct per-record cost
    const effectivePerRecord = perRecordBase * industryMultiplier;
    let baseDirectCost = recordsExposed * effectivePerRecord * (0.65 + 0.35 * (cvss / 10));

    // 4. Dwell Time (MTTI + MTTC) Impact:
    // IBM benchmark: breaches contained in < 200 days cost 23% less, > 200 days cost ~28% more
    let dwellTimeMultiplier = 1.0;
    if (dwellTimeDays < 100) {
      dwellTimeMultiplier = 0.77; // 23% savings
    } else if (dwellTimeDays < 200) {
      dwellTimeMultiplier = 0.90;
    } else if (dwellTimeDays > 270) {
      dwellTimeMultiplier = 1.28; // 28% penalty
    } else {
      dwellTimeMultiplier = 1.08;
    }

    // 5. Defenses & Mitigations (Savings)
    let mitigationMultiplier = 1.0;
    if (hasSecurityAi) mitigationMultiplier *= 0.74; // -26% average reduction (IBM)
    if (hasTestedIrPlan) mitigationMultiplier *= 0.82; // -18% average reduction
    if (hasZeroTrust) mitigationMultiplier *= 0.88; // -12% average reduction

    // Calculate Core Incident Cost
    let totalIncidentCost = baseDirectCost * severityFactor * exposureFactor * dwellTimeMultiplier * mitigationMultiplier * scaleFactor;

    // Floor and cap for realistic boundaries based on scale
    const minCostFloor = customRevenue * 0.005;
    const maxCostCap = customRevenue * 0.28;
    totalIncidentCost = Math.max(minCostFloor, Math.min(totalIncidentCost, maxCostCap));

    // IBM 4 Core Cost Pillars Decomposition:
    // 1. Detection & Escalation (~32%)
    // 2. Lost Business & Churn (~36%)
    // 3. Post-Breach Response (~22%)
    // 4. Notification (~10%)
    const detectionCost = Math.round(totalIncidentCost * 0.31);
    const lostBusinessCost = Math.round(totalIncidentCost * 0.37);
    const postResponseCost = Math.round(totalIncidentCost * 0.22);
    const notificationCost = Math.round(totalIncidentCost * 0.10);

    // Regulatory Exposure Calculation:
    // GDPR: up to 4% of revenue or €20M
    const gdprExposure = Math.min(customRevenue * (dataType === 'pii' || dataType === 'pci' ? 0.025 : 0.008), 21600000);
    // LGPD: up to 2% of turnover in Brazil, capped at R$ 50M (~$10M USD)
    const lgpdExposure = Math.min(customRevenue * 0.015, 10000000);
    // HIPAA (if healthcare or PHI): up to $1.9M statutory cap + litigation
    const hipaaExposure = (industry === 'healthcare' || dataType === 'phi') ? 1900000 : 0;
    // SEC / Regulatory Investigation & Legal Counsel
    const legalDefenseCost = Math.round(totalIncidentCost * 0.14);

    const estimatedTotalFines = Math.round(
      (dataType === 'phi' ? hipaaExposure * 0.6 : (gdprExposure * 0.35 + lgpdExposure * 0.25)) + legalDefenseCost * 0.5
    );

    // Total Grand Financial Impact (Incident + Regulatory Fines)
    const grandTotalImpact = Math.round(totalIncidentCost + estimatedTotalFines);

    // Confidence Interval (Min / Likely / Max)
    const minLikelyImpact = Math.round(grandTotalImpact * 0.65);
    const maxLikelyImpact = Math.round(grandTotalImpact * 1.55);

    // Reputational Impact Indices:
    // Churn Rate: 1.2% to 6.8% of active customer base
    const estimatedChurnPct = Number((
      (severity === 'CRITICAL' ? 4.8 : severity === 'HIGH' ? 3.2 : 1.6) * 
      (dataType === 'pci' || dataType === 'phi' ? 1.35 : 1.0) *
      (dwellTimeDays > 200 ? 1.25 : 0.9)
    ).toFixed(1));

    // Brand Trust Score Drop (0 - 100 point scale)
    const brandTrustErosion = Math.min(100, Math.round(
      (cvss * 6) + (recordsExposed > 50000 ? 25 : recordsExposed > 10000 ? 15 : 8) + (dwellTimeDays > 200 ? 15 : 0)
    ));

    // Public Equity / Valuation Shock (temporary 90-day dip for enterprise)
    const marketValuationShock = Number((
      Math.min(9.5, (severity === 'CRITICAL' ? 5.2 : 2.8) * (industryMultiplier * 0.8))
    ).toFixed(1));

    // Estimated PR & Recovery Timeline in Months
    const prRecoveryMonths = Math.max(2, Math.round(
      (dwellTimeDays / 45) + (severity === 'CRITICAL' ? 6 : 3) + (recordsExposed > 50000 ? 4 : 1)
    ));

    // Bug Bounty ROI Calculation:
    // Compares actual/projected bounty reward to the prevented breach loss
    const bountyCost = customBountyPaid > 0 ? customBountyPaid : 1500;
    const netSavings = grandTotalImpact - bountyCost;
    const roiPercentage = Math.round(((grandTotalImpact - bountyCost) / bountyCost) * 100);
    const defenseMultiplier = Math.round(grandTotalImpact / bountyCost);

    return {
      grandTotalImpact,
      minLikelyImpact,
      maxLikelyImpact,
      totalIncidentCost,
      estimatedTotalFines,
      pillars: {
        detectionCost,
        lostBusinessCost,
        postResponseCost,
        notificationCost,
        legalDefenseCost
      },
      regulatory: {
        gdprExposure: Math.round(gdprExposure),
        lgpdExposure: Math.round(lgpdExposure),
        hipaaExposure: Math.round(hipaaExposure),
        estimatedTotalFines
      },
      reputation: {
        estimatedChurnPct,
        brandTrustErosion,
        marketValuationShock,
        prRecoveryMonths
      },
      roi: {
        bountyCost,
        netSavings,
        roiPercentage,
        defenseMultiplier
      }
    };
  }, [
    selectedReport,
    industry,
    companyScale,
    customRevenue,
    recordsExposed,
    dataType,
    dwellTimeDays,
    hasSecurityAi,
    hasTestedIrPlan,
    hasZeroTrust,
    publicExposure,
    customBountyPaid
  ]);

  // Generate Executive Summary Markdown
  const executiveSummaryMarkdown = useMemo(() => {
    if (!selectedReport) return '';
    return `### RELATÓRIO EXECUTIVO: SIMULAÇÃO DE IMPACTO DE INCIDENTE (BREACH IMPACT)
**Data da Simulação:** ${new Date().toLocaleDateString('pt-BR')}  
**Vulnerabilidade Avaliada:** ${selectedReport.id} - ${selectedReport.title}  
**Classificação:** Severidade ${selectedReport.severity} | CVSS v3.1: ${selectedReport.cvssScore} (${selectedReport.cvssVector})  
**Alvo / Escopo:** ${selectedReport.target} (${selectedReport.platform})  

---

#### 1. IMPACTO FINANCEIRO ESTIMADO (MODELO IBM / PONEMON & FAIR)
- **Custo Total Estimado do Incidente:** ${formatCurrency(simulationResults.grandTotalImpact)}
- **Faixa de Exposição Provável:** ${formatCurrency(simulationResults.minLikelyImpact)} a ${formatCurrency(simulationResults.maxLikelyImpact)}
- **Volume de Registros Comprometidos:** ${recordsExposed.toLocaleString('pt-BR')} registros (${DATA_TYPE_INFO[dataType].label})
- **Segmento & Porte:** ${INDUSTRY_DATA[industry].label} | Faturamento Anual: ${formatCurrency(customRevenue)}

#### 2. DECOMPOSIÇÃO DOS CUSTOS DE RESPOSTA (4 PILARES)
- **Perda de Negócios & Churn de Clientes:** ${formatCurrency(simulationResults.pillars.lostBusinessCost)} (37%)
- **Detecção, Resposta Forense & Contenção:** ${formatCurrency(simulationResults.pillars.detectionCost)} (31%)
- **Resposta Pós-Incidente, Monitoramento & Call Center:** ${formatCurrency(simulationResults.pillars.postResponseCost)} (22%)
- **Notificação de Vítimas & Reguladores:** ${formatCurrency(simulationResults.pillars.notificationCost)} (10%)
- **Assessoria Jurídica & Perícia Especializada:** ${formatCurrency(simulationResults.pillars.legalDefenseCost)}

#### 3. RISCO REGULATÓRIO & MULTAS
- **Exposição GDPR (Art. 83 - até 4% receita):** até ${formatCurrency(simulationResults.regulatory.gdprExposure)}
- **Exposição LGPD (Art. 52 - até 2% receita):** até ${formatCurrency(simulationResults.regulatory.lgpdExposure)}
- **Provisão Estimada de Sanções:** ${formatCurrency(simulationResults.regulatory.estimatedTotalFines)}

#### 4. IMPACTO REPUTACIONAL & DE MERCADO
- **Taxa Estimada de Churn de Clientes:** ${simulationResults.reputation.estimatedChurnPct}%
- **Índice de Erosão da Confiança na Marca:** ${simulationResults.reputation.brandTrustErosion} / 100
- **Choque Estimado em Valor de Mercado:** -${simulationResults.reputation.marketValuationShock}% (curto prazo)
- **Tempo Estimado para Recuperação de Marca:** ~${simulationResults.reputation.prRecoveryMonths} meses

#### 5. RETORNO DO INVESTIMENTO EM BUG BOUNTY (RODI)
- **Recompensa Paga ao Pesquisador:** ${formatCurrency(simulationResults.roi.bountyCost)}
- **Economia Líquida de Custo Evitado:** ${formatCurrency(simulationResults.roi.netSavings)}
- **Multiplicador de Defesa:** ${simulationResults.roi.defenseMultiplier}x
- **Retorno sobre o Investimento Defensivo (ROI):** +${simulationResults.roi.roiPercentage.toLocaleString('pt-BR')}%

*Gerado automaticamente pelo Breach Impact Simulator via Bug Bounty Manager.*`;
  }, [selectedReport, simulationResults, recordsExposed, dataType, industry, customRevenue]);

  const handleCopyBrief = () => {
    navigator.clipboard.writeText(executiveSummaryMarkdown);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 2200);
  };

  const handleResetDefaults = () => {
    setIndustry('technology');
    setCompanyScale('midmarket');
    setCustomRevenue(40000000);
    setRecordsExposed(25000);
    setDataType('pii');
    setDwellTimeDays(204);
    setHasSecurityAi(false);
    setHasTestedIrPlan(true);
    setHasZeroTrust(false);
    setPublicExposure('public_facing');
    if (selectedReport) {
      setCustomBountyPaid(selectedReport.bountyAmount || 1500);
    }
  };

  const sevBadge = selectedReport ? getSeverityBadgeColor(selectedReport.severity) : { bg: '', text: '', border: '' };

  return (
    <div
      id="breach-impact-simulator-container"
      className={`rounded-2xl bg-[#0c0e14] border border-[#1e2338] shadow-xl overflow-hidden ${className}`}
    >
      {/* Header Banner */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-[#101422] via-[#0e121c] to-[#0c0e14] border-b border-[#1e2338]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 shadow-sm">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2 font-mono uppercase">
                <span>Simulador de Impacto de Vazamento</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-sans normal-case">
                  IBM / Ponemon & FAIR
                </span>
              </h2>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-3xl">
              Estime quantitativamente os custos financeiros diretos, multas regulatórias (GDPR/LGPD/HIPAA),
              erosão reputacional e o ROI de prevenção gerado pela correção proativa do relatório.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-breach-simulator-guidance"
              type="button"
              onClick={() => setShowModelGuidance(!showModelGuidance)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border flex items-center gap-1.5 ${
                showModelGuidance
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-[#141824] text-zinc-400 hover:text-white border-[#22283e]'
              }`}
              title="Entenda a metodologia e modelos utilizados"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Metodologia</span>
            </button>

            <button
              id="btn-breach-simulator-reset"
              type="button"
              onClick={handleResetDefaults}
              className="px-2.5 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1a2032] text-zinc-400 hover:text-zinc-200 border border-[#22283e] text-xs font-mono transition-all flex items-center gap-1"
              title="Restaurar parâmetros padrão"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Padrões</span>
            </button>

            <button
              id="btn-breach-simulator-copy-summary"
              type="button"
              onClick={handleCopyBrief}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border flex items-center gap-1.5 ${
                copiedBrief
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/30'
              }`}
              title="Copiar sumário executivo em Markdown para relatórios de diretoria"
            >
              {copiedBrief ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Brief</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Informational Guidance on Standard Models */}
        {showModelGuidance && (
          <div className="mt-4 p-4 rounded-xl bg-[#090b10] border border-emerald-500/30 text-xs text-zinc-300 space-y-3 font-sans animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400 font-mono flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Fundamentos dos Modelos Padrão da Indústria
              </span>
              <button
                type="button"
                onClick={() => setShowModelGuidance(false)}
                className="text-zinc-500 hover:text-zinc-300 text-[11px]"
              >
                Fechar
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] leading-relaxed">
              <div className="p-3 rounded-lg bg-[#101420] border border-[#1e2338] space-y-1">
                <strong className="text-zinc-100 block font-mono">1. IBM & Ponemon Report:</strong>
                <p className="text-zinc-400">
                  Modelo empírico baseado em dados de incidentes reais. Estrutura o custo em 4 pilares: Detecção & Resposta (31%), Perda de Clientes (37%), Notificação (10%) e Resposta pós-incidente (22%).
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[#101420] border border-[#1e2338] space-y-1">
                <strong className="text-zinc-100 block font-mono">2. Framework FAIR (ISO/IEC 27005):</strong>
                <p className="text-zinc-400">
                  Quantificação de risco em termos econômicos através da probabilidade de exploração (CVSS Sub-scores) versus magnitude provável da perda (Loss Magnitude).
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[#101420] border border-[#1e2338] space-y-1">
                <strong className="text-zinc-100 block font-mono">3. ROI de Defesa (Bug Bounty):</strong>
                <p className="text-zinc-400">
                  Compara a recompensa paga ao pesquisador ético em relação ao custo evitado de contenção, provisões de multas de conformidade e evasão de churn.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Report Selector Bar */}
        <div className="mt-5 p-3 rounded-xl bg-[#090b10] border border-[#1e2338] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-zinc-400 font-mono uppercase text-[11px] shrink-0">Relatório Vinculado:</span>
            {reports.length > 0 ? (
              <div className="relative flex-1 min-w-0">
                <select
                  id="breach-simulator-report-select"
                  value={selectedReportId}
                  onChange={(e) => {
                    setSelectedReportId(e.target.value);
                    const found = reports.find((r) => r.id === e.target.value);
                    if (found && onSelectReport) onSelectReport(found);
                  }}
                  className="w-full bg-[#121624] text-zinc-200 border border-[#22283e] rounded-lg px-3 py-1.5 pr-8 appearance-none focus:outline-none focus:border-rose-500/50 font-mono text-xs cursor-pointer truncate"
                >
                  {reports.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      [{rep.severity}] {rep.id} — {rep.title} ({rep.target})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ) : (
              <span className="text-zinc-500 italic">Nenhum relatório cadastrado — operando em modo de simulação genérica</span>
            )}
          </div>

          {selectedReport && (
            <div className="flex items-center gap-2 shrink-0">
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${sevBadge.bg} ${sevBadge.text} ${sevBadge.border}`}>
                {selectedReport.severity} ({selectedReport.cvssScore})
              </span>
              <span className="text-[11px] text-zinc-400 font-mono truncate max-w-[150px] sm:max-w-[200px]">
                {selectedReport.vulnerabilityType}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Interactive Workspace Grid: Controls on Left, Dynamic Visuals on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-[#1e2338]">
        
        {/* LEFT COLUMN: Simulation Parameters & Controls (5 cols) */}
        <div className="lg:col-span-5 p-5 sm:p-6 bg-[#090b10] border-b lg:border-b-0 lg:border-r border-[#1e2338] space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-[#1a1f30]">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-rose-400" />
              Parâmetros da Simulação
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">Sensibilidade Calibrada</span>
          </div>

          {/* Segment & Scale Selection */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                Setor de Atuação / Indústria:
              </label>
              <select
                id="breach-simulator-industry-select"
                value={industry}
                onChange={(e) => setIndustry(e.target.value as BreachSimulationConfig['industry'])}
                className="w-full bg-[#121624] text-zinc-200 border border-[#22283e] rounded-lg px-3 py-1.5 font-mono text-xs focus:outline-none focus:border-rose-500/50"
              >
                {Object.entries(INDUSTRY_DATA).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.label} (Multiplicador: {info.multiplier}x)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                Porte da Organização / Faturamento Anual:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(SCALE_DATA).map(([key, info]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleScaleChange(key as BreachSimulationConfig['companyScale'])}
                    className={`p-2 rounded-lg text-left text-[11px] font-mono transition-all border ${
                      companyScale === key
                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/40 font-bold shadow-sm'
                        : 'bg-[#121624] text-zinc-400 border-[#22283e] hover:text-white'
                    }`}
                  >
                    <span className="block truncate">{info.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-1">
                <span>Receita Anual Estimada:</span>
                <span className="text-zinc-200 font-bold">{formatCurrency(customRevenue)}</span>
              </div>
              <input
                type="range"
                min="1000000"
                max="1000000000"
                step="1000000"
                value={customRevenue}
                onChange={(e) => setCustomRevenue(Number(e.target.value))}
                className="w-full accent-rose-500 bg-[#1e2338] rounded-lg h-1.5 cursor-pointer"
              />
            </div>
          </div>

          {/* Records & Data Type Scope */}
          <div className="space-y-3 pt-3 border-t border-[#1a1f30]">
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                Tipo de Dados Críticos Comprometidos:
              </label>
              <select
                id="breach-simulator-data-type-select"
                value={dataType}
                onChange={(e) => setDataType(e.target.value as BreachSimulationConfig['dataType'])}
                className="w-full bg-[#121624] text-zinc-200 border border-[#22283e] rounded-lg px-3 py-1.5 font-mono text-xs focus:outline-none focus:border-rose-500/50"
              >
                {Object.entries(DATA_TYPE_INFO).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.label} (Base US$ {info.baseCost}/registro)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-1">
                <span>Volume de Registros em Risco:</span>
                <span className="text-rose-400 font-bold font-mono">
                  {recordsExposed.toLocaleString('pt-BR')} registros
                </span>
              </div>
              <input
                type="range"
                min="500"
                max="500000"
                step="500"
                value={recordsExposed}
                onChange={(e) => setRecordsExposed(Number(e.target.value))}
                className="w-full accent-rose-500 bg-[#1e2338] rounded-lg h-1.5 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-zinc-600 font-mono mt-1">
                <span>500 (Vazamento Local)</span>
                <span>50.000</span>
                <span>500.000+ (Vazamento Massivo)</span>
              </div>
            </div>
          </div>

          {/* Dwell Time & Detection Readiness */}
          <div className="space-y-3 pt-3 border-t border-[#1a1f30]">
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-1">
                <span>Tempo para Identificar & Conter (MTTI + MTTC):</span>
                <span className={`font-bold font-mono ${dwellTimeDays > 200 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {dwellTimeDays} dias
                </span>
              </div>
              <input
                type="range"
                min="15"
                max="365"
                step="5"
                value={dwellTimeDays}
                onChange={(e) => setDwellTimeDays(Number(e.target.value))}
                className="w-full accent-rose-500 bg-[#1e2338] rounded-lg h-1.5 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-zinc-500 font-mono mt-1">
                <span className="text-emerald-400">&lt; 100d (Rápido: -23% custo)</span>
                <span className="text-zinc-400">204d (Média IBM)</span>
                <span className="text-rose-400">&gt; 270d (+28% penalidade)</span>
              </div>
            </div>

            {/* Defensive Readiness Toggles */}
            <div className="space-y-2">
              <span className="block text-[11px] font-mono text-zinc-400">Medidas de Defesa Implementadas:</span>
              
              <label className="flex items-center justify-between p-2 rounded-lg bg-[#121624] border border-[#1e2338] cursor-pointer hover:border-zinc-700 transition-colors">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs text-zinc-300 font-mono">IA de Segurança & Automação Ativa</span>
                </div>
                <input
                  type="checkbox"
                  checked={hasSecurityAi}
                  onChange={(e) => setHasSecurityAi(e.target.checked)}
                  className="rounded border-[#22283e] text-rose-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg bg-[#121624] border border-[#1e2338] cursor-pointer hover:border-zinc-700 transition-colors">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-zinc-300 font-mono">Equipe de RI com Plano Testado</span>
                </div>
                <input
                  type="checkbox"
                  checked={hasTestedIrPlan}
                  onChange={(e) => setHasTestedIrPlan(e.target.checked)}
                  className="rounded border-[#22283e] text-rose-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg bg-[#121624] border border-[#1e2338] cursor-pointer hover:border-zinc-700 transition-colors">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs text-zinc-300 font-mono">Arquitetura Zero Trust & Criptografia</span>
                </div>
                <input
                  type="checkbox"
                  checked={hasZeroTrust}
                  onChange={(e) => setHasZeroTrust(e.target.checked)}
                  className="rounded border-[#22283e] text-rose-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </label>
            </div>

            {/* Bug Bounty Comparison Input */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-1">
                <span>Recompensa Paga ao Pesquisador (Bounty):</span>
                <span className="text-emerald-400 font-bold">{formatCurrency(customBountyPaid)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 font-mono">$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={customBountyPaid}
                  onChange={(e) => setCustomBountyPaid(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-[#121624] text-zinc-200 border border-[#22283e] rounded-lg px-3 py-1 font-mono text-xs focus:outline-none focus:border-emerald-500/50"
                  placeholder="Ex: 1500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Results Dashboard & Interactive Tabs (7 cols) */}
        <div className="lg:col-span-7 p-5 sm:p-6 bg-[#0c0e14] flex flex-col justify-between space-y-6">
          
          {/* Top KPI Cards (Estimated Breach Cost + ROI) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Total Estimated Cost */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-rose-950/30 to-[#120e14] border border-rose-500/30 space-y-1">
              <span className="text-[10px] uppercase font-mono text-rose-300/80 font-bold tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-rose-400" />
                Custo Total Estimado
              </span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-rose-400">
                {formatCurrency(simulationResults.grandTotalImpact)}
              </div>
              <div className="text-[10px] text-zinc-400 font-mono">
                Faixa: {formatCurrency(simulationResults.minLikelyImpact)} - {formatCurrency(simulationResults.maxLikelyImpact)}
              </div>
            </div>

            {/* Reputational Hit */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/20 to-[#14120e] border border-amber-500/30 space-y-1">
              <span className="text-[10px] uppercase font-mono text-amber-300/80 font-bold tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Dano Reputacional
              </span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400">
                {simulationResults.reputation.brandTrustErosion}
                <span className="text-xs font-normal text-zinc-500"> / 100</span>
              </div>
              <div className="text-[10px] text-zinc-400 font-mono">
                Churn Estimado: {simulationResults.reputation.estimatedChurnPct}% de clientes
              </div>
            </div>

            {/* Bug Bounty ROI */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/30 to-[#0e1410] border border-emerald-500/30 space-y-1">
              <span className="text-[10px] uppercase font-mono text-emerald-300/80 font-bold tracking-wider flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                ROI de Defesa
              </span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 truncate">
                {simulationResults.roi.defenseMultiplier}x
              </div>
              <div className="text-[10px] text-zinc-400 font-mono truncate">
                Economia: {formatCurrency(simulationResults.roi.netSavings)}
              </div>
            </div>
          </div>

          {/* Detail Tabs Bar */}
          <div className="flex items-center gap-1.5 border-b border-[#1e2338] pb-3 overflow-x-auto text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-[#141824]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Visão Geral</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('breakdown')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'breakdown'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-[#141824]'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Pilares IBM (4 Custo)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('regulatory')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'regulatory'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-[#141824]'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Regulatório & Multas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reputation')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'reputation'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-[#141824]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Reputação & Churn</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('roi')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'roi'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-[#141824]'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>ROI de Prevenção</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('export')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'export'
                  ? 'bg-[#1e2338] text-zinc-100 border border-[#2e3654] font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-[#141824]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Sumário Executivo</span>
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-[#090b10] border border-[#1e2338] space-y-3">
                <span className="font-bold text-zinc-200 uppercase text-[11px] block">
                  Resumo da Exposição de Risco do Incidente
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-[#121624] border border-[#1e2338]">
                    <span className="text-[10px] text-zinc-500 block uppercase">Custos Operacionais & Perda</span>
                    <span className="text-base font-bold text-zinc-200">
                      {formatCurrency(simulationResults.totalIncidentCost)}
                    </span>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Forense, recuperação, interrupção de sistemas e suporte a vítimas.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-[#121624] border border-[#1e2338]">
                    <span className="text-[10px] text-zinc-500 block uppercase">Provisão de Multas & Defesa Legal</span>
                    <span className="text-base font-bold text-rose-400">
                      {formatCurrency(simulationResults.estimatedTotalFines)}
                    </span>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Estimativa sob GDPR, LGPD, HIPAA e contratação de consultoria especializada.
                    </p>
                  </div>
                </div>

                {/* Progress Bar of Cost Composition */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>Composição dos Danos Financeiros</span>
                    <span className="text-zinc-200">{formatCurrency(simulationResults.grandTotalImpact)}</span>
                  </div>
                  <div className="h-3 rounded-full bg-[#1e2338] overflow-hidden flex">
                    <div
                      style={{ width: `${Math.round((simulationResults.pillars.lostBusinessCost / simulationResults.grandTotalImpact) * 100)}%` }}
                      className="bg-rose-500"
                      title="Perda de Negócios / Churn"
                    />
                    <div
                      style={{ width: `${Math.round((simulationResults.pillars.detectionCost / simulationResults.grandTotalImpact) * 100)}%` }}
                      className="bg-amber-500"
                      title="Detecção & Contenção"
                    />
                    <div
                      style={{ width: `${Math.round((simulationResults.pillars.postResponseCost / simulationResults.grandTotalImpact) * 100)}%` }}
                      className="bg-cyan-500"
                      title="Resposta Pós-Incidente"
                    />
                    <div
                      style={{ width: `${Math.round((simulationResults.regulatory.estimatedTotalFines / simulationResults.grandTotalImpact) * 100)}%` }}
                      className="bg-purple-500"
                      title="Multas & Jurídico"
                    />
                  </div>
                  <div className="flex flex-wrap gap-3 text-[10px] text-zinc-400 pt-1">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Perda de Negócios</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Detecção/Forense</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" /> Resposta/Call Center</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Sanções/Regulatório</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IBM 4 PILLARS BREAKDOWN */}
          {activeTab === 'breakdown' && (
            <div className="space-y-3 text-xs font-mono">
              <div className="p-4 rounded-xl bg-[#090b10] border border-[#1e2338] space-y-3">
                <span className="font-bold text-zinc-200 uppercase text-[11px] block">
                  Decomposição Detalhada pelos 4 Pilares da Metodologia Ponemon/IBM
                </span>

                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-lg bg-[#121624] border border-[#1e2338] flex items-center justify-between">
                    <div>
                      <span className="font-bold text-rose-300 block">1. Perda de Negócios & Churn Anormal (37%)</span>
                      <span className="text-[10px] text-zinc-400">Cancelamento de contratos, custo para reaver clientes e queda de conversão</span>
                    </div>
                    <span className="text-sm font-bold text-white">
                      {formatCurrency(simulationResults.pillars.lostBusinessCost)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#121624] border border-[#1e2338] flex items-center justify-between">
                    <div>
                      <span className="font-bold text-amber-300 block">2. Detecção & Investigação Forense (31%)</span>
                      <span className="text-[10px] text-zinc-400">Auditoria técnica externa, consultoria DFIR e isolamento de sistemas</span>
                    </div>
                    <span className="text-sm font-bold text-white">
                      {formatCurrency(simulationResults.pillars.detectionCost)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#121624] border border-[#1e2338] flex items-center justify-between">
                    <div>
                      <span className="font-bold text-cyan-300 block">3. Resposta Pós-Incidente & Suporte a Vítimas (22%)</span>
                      <span className="text-[10px] text-zinc-400">Monitoramento de crédito, assessoria de imprensa e hotline de suporte</span>
                    </div>
                    <span className="text-sm font-bold text-white">
                      {formatCurrency(simulationResults.pillars.postResponseCost)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#121624] border border-[#1e2338] flex items-center justify-between">
                    <div>
                      <span className="font-bold text-emerald-300 block">4. Notificação Formal & Divulgação Obrigatória (10%)</span>
                      <span className="text-[10px] text-zinc-400">Correspondência a titulares, comunicados formais à ANPD/DPA e assessoria</span>
                    </div>
                    <span className="text-sm font-bold text-white">
                      {formatCurrency(simulationResults.pillars.notificationCost)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REGULATORY EXPOSURE */}
          {activeTab === 'regulatory' && (
            <div className="space-y-3 text-xs font-mono">
              <div className="p-4 rounded-xl bg-[#090b10] border border-[#1e2338] space-y-3">
                <span className="font-bold text-zinc-200 uppercase text-[11px] block">
                  Exposição a Sanções Administrativas e Multas Regulatórias
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-[#121624] border border-[#1e2338] space-y-1">
                    <span className="text-[10px] text-cyan-400 font-bold uppercase block">GDPR (Europa / Global)</span>
                    <span className="text-sm font-bold text-zinc-200">
                      até {formatCurrency(simulationResults.regulatory.gdprExposure)}
                    </span>
                    <p className="text-[10px] text-zinc-400">
                      Teto estatutário de até 4% do faturamento global anual (Art. 83) para violações graves de integridade e confidencialidade.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-[#121624] border border-[#1e2338] space-y-1">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase block">LGPD (Brasil - ANPD)</span>
                    <span className="text-sm font-bold text-zinc-200">
                      até {formatCurrency(simulationResults.regulatory.lgpdExposure)}
                    </span>
                    <p className="text-[10px] text-zinc-400">
                      Sanção simples de até 2% do faturamento da empresa no Brasil, limitada a R$ 50.000.000 por infração (Art. 52).
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-[#121624] border border-[#1e2338] space-y-1">
                    <span className="text-[10px] text-amber-400 font-bold uppercase block">HIPAA / HITECH (Saúde / PHI)</span>
                    <span className="text-sm font-bold text-zinc-200">
                      {simulationResults.regulatory.hipaaExposure > 0 ? `até ${formatCurrency(simulationResults.regulatory.hipaaExposure)}` : 'Não Aplicável'}
                    </span>
                    <p className="text-[10px] text-zinc-400">
                      Penalidades escalonadas de até US$ 50.000 por violação com teto anual de US$ 1.9M por categoria de infração.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-[#121624] border border-[#1e2338] space-y-1">
                    <span className="text-[10px] text-purple-400 font-bold uppercase block">Assessoria Jurídica & Litígios</span>
                    <span className="text-sm font-bold text-zinc-200">
                      {formatCurrency(simulationResults.pillars.legalDefenseCost)}
                    </span>
                    <p className="text-[10px] text-zinc-400">
                      Contratação de advogados especializados em privacidade cibernética e custas para acordos judiciais coletivos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: REPUTATION & CHURN */}
          {activeTab === 'reputation' && (
            <div className="space-y-3 text-xs font-mono">
              <div className="p-4 rounded-xl bg-[#090b10] border border-[#1e2338] space-y-3">
                <span className="font-bold text-zinc-200 uppercase text-[11px] block">
                  Modelagem de Impacto na Confiança da Marca e Retenção de Clientes
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-lg bg-[#121624] border border-[#1e2338]">
                    <span className="text-[10px] text-zinc-500 block uppercase">Taxa de Churn</span>
                    <span className="text-base font-bold text-rose-400">
                      {simulationResults.reputation.estimatedChurnPct}%
                    </span>
                    <p className="text-[9px] text-zinc-500 mt-1">Evasão anormal de clientes</p>
                  </div>

                  <div className="p-3 rounded-lg bg-[#121624] border border-[#1e2338]">
                    <span className="text-[10px] text-zinc-500 block uppercase">Erosão de Confiança</span>
                    <span className="text-base font-bold text-amber-400">
                      {simulationResults.reputation.brandTrustErosion}/100
                    </span>
                    <p className="text-[9px] text-zinc-500 mt-1">Queda de Net Promoter</p>
                  </div>

                  <div className="p-3 rounded-lg bg-[#121624] border border-[#1e2338]">
                    <span className="text-[10px] text-zinc-500 block uppercase">Choque de Valuation</span>
                    <span className="text-base font-bold text-purple-400">
                      -{simulationResults.reputation.marketValuationShock}%
                    </span>
                    <p className="text-[9px] text-zinc-500 mt-1">Oscilação inicial 90 dias</p>
                  </div>

                  <div className="p-3 rounded-lg bg-[#121624] border border-[#1e2338]">
                    <span className="text-[10px] text-zinc-500 block uppercase">Tempo de Recuperação</span>
                    <span className="text-base font-bold text-cyan-400">
                      ~{simulationResults.reputation.prRecoveryMonths} meses
                    </span>
                    <p className="text-[9px] text-zinc-500 mt-1">Restauração de imagem</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#121624] border border-[#1e2338] text-[11px] text-zinc-400 leading-relaxed font-sans">
                  <strong className="text-zinc-200 font-mono block mb-1">Prevenção Proativa vs Resposta a Crise:</strong>
                  De acordo com estudos da Harvard Business Review e Ponemon, empresas que resolvem vulnerabilidades antes da exploração pública evitam até 88% do impacto negativo em churn de assinantes e custos emergenciais de aquisição de clientes (CAC).
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: BOUNTY ROI ANALYSIS */}
          {activeTab === 'roi' && (
            <div className="space-y-3 text-xs font-mono">
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/20 to-[#090b10] border border-emerald-500/30 space-y-3">
                <span className="font-bold text-emerald-400 uppercase text-[11px] block flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-400" />
                  Retorno sobre o Investimento em Segurança Defensiva (RODI)
                </span>

                <div className="p-4 rounded-lg bg-[#10171a] border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] text-emerald-400/80 uppercase font-mono block">Economia Líquida Estimada</span>
                    <span className="text-2xl font-bold text-emerald-400 font-mono">
                      {formatCurrency(simulationResults.roi.netSavings)}
                    </span>
                    <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                      Custo estimado de incidente evitado menos o valor pago em bug bounty ({formatCurrency(simulationResults.roi.bountyCost)}).
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-[10px] text-emerald-400/80 uppercase font-mono block">Multiplicador de Alavancagem</span>
                    <span className="text-2xl font-bold text-white font-mono">
                      {simulationResults.roi.defenseMultiplier} : 1
                    </span>
                    <p className="text-[11px] text-emerald-400 font-mono mt-0.5">
                      +{simulationResults.roi.roiPercentage.toLocaleString('pt-BR')}% ROI
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-lg bg-[#0e141a] border border-[#1e2338]">
                    <span className="text-[10px] text-zinc-500 uppercase block">Custo do Bug Bounty</span>
                    <span className="text-sm font-bold text-zinc-200">
                      {formatCurrency(simulationResults.roi.bountyCost)}
                    </span>
                    <p className="text-[10px] text-zinc-400 mt-1">Investimento direto no pesquisador que reportou a falha de forma ética.</p>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0e141a] border border-[#1e2338]">
                    <span className="text-[10px] text-zinc-500 uppercase block">Custo do Incidente Evitado</span>
                    <span className="text-sm font-bold text-rose-400">
                      {formatCurrency(simulationResults.grandTotalImpact)}
                    </span>
                    <p className="text-[10px] text-zinc-400 mt-1">Perdas operacionais, forenses, regulatórias e de reputação salvas.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: EXECUTIVE EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-3 text-xs font-mono">
              <div className="p-4 rounded-xl bg-[#090b10] border border-[#1e2338] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-200 uppercase text-[11px] block">
                    Sumário Executivo Formatado (Pronto para Diretoria / C-Level)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyBrief}
                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-[11px] transition-colors flex items-center gap-1"
                  >
                    {copiedBrief ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedBrief ? 'Copiado!' : 'Copiar Markdown'}</span>
                  </button>
                </div>

                <pre className="p-4 rounded-lg bg-[#06080d] border border-[#1e2338] text-[11px] text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-72 leading-relaxed">
                  {executiveSummaryMarkdown}
                </pre>
              </div>
            </div>
          )}

          {/* Footer note & disclaimer */}
          <div className="pt-4 border-t border-[#1e2338] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-zinc-500 font-mono">
            <span>Modelagem baseada em: IBM Security Cost of a Data Breach, Ponemon Institute & FAIR (ISO 27005).</span>
            <span className="text-zinc-400">Valores para apoio à decisão e priorização de remediação.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
