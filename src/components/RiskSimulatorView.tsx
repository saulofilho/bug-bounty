import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import {
  ShieldAlert,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  ExternalLink,
  Search,
  Sliders,
  DollarSign,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  Copy,
  Check,
  Zap,
  Building2,
  Scale,
  FileText,
  Percent,
  Layers,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Activity,
  Award,
  Lock,
  Radio,
  ArrowRight,
  PieChart as PieIcon,
  HelpCircle,
  BarChart3
} from 'lucide-react';
import { VulnerabilityReport, Severity, ReportStatus } from '../types';
import { formatCurrency, getSeverityBadgeColor, getStatusBadgeColor } from '../utils/formatters';
import { parseCvssVector } from '../utils/cvss';

export interface RiskSimulatorViewProps {
  reports: VulnerabilityReport[];
  initialReportId?: string;
  onSelectReport?: (report: VulnerabilityReport) => void;
  onNavigateToReports?: () => void;
  className?: string;
}

// Preset scenarios for rapid FAIR testing
export interface FairScenarioPreset {
  id: string;
  name: string;
  tag: string;
  description: string;
  tef: number;
  exploitProb: number;
  downtimeHours: number;
  hourlyDowntimeCost: number;
  incidentResponseCost: number;
  assetLoss: number;
  recordsAtRisk: number;
  costPerRecord: number;
  regulatoryFines: number;
  churnLoss: number;
  legalDefense: number;
}

const FAIR_PRESETS: FairScenarioPreset[] = [
  {
    id: 'rce_catastrophic',
    name: 'RCE / Compromisso Crítico de Infraestrutura',
    tag: 'Crítico',
    description: 'Execução Remota de Código com tomada do servidor de produção, ransomware potencial e indisponibilidade severa.',
    tef: 60,
    exploitProb: 65,
    downtimeHours: 18,
    hourlyDowntimeCost: 25000,
    incidentResponseCost: 120000,
    assetLoss: 85000,
    recordsAtRisk: 150000,
    costPerRecord: 8,
    regulatoryFines: 450000,
    churnLoss: 380000,
    legalDefense: 190000
  },
  {
    id: 'mass_pii_leak',
    name: 'Vazamento Massivo de Dados PII (LGPD / GDPR)',
    tag: 'Privacidade',
    description: 'IDOR ou SQLi expondo tabela corporativa de usuários com CPFs, e-mails, endereços e históricos de compras.',
    tef: 40,
    exploitProb: 45,
    downtimeHours: 4,
    hourlyDowntimeCost: 15000,
    incidentResponseCost: 80000,
    assetLoss: 25000,
    recordsAtRisk: 450000,
    costPerRecord: 6,
    regulatoryFines: 850000,
    churnLoss: 520000,
    legalDefense: 310000
  },
  {
    id: 'fintech_logic_abuse',
    name: 'Abuso de Lógica / Fraude em Checkout & Saldo',
    tag: 'Financeiro',
    description: 'Race condition ou manipulação de parâmetros permitindo saques indevidos, cupons infinitos ou estorno fraudulento.',
    tef: 90,
    exploitProb: 50,
    downtimeHours: 6,
    hourlyDowntimeCost: 35000,
    incidentResponseCost: 65000,
    assetLoss: 280000,
    recordsAtRisk: 12000,
    costPerRecord: 12,
    regulatoryFines: 180000,
    churnLoss: 290000,
    legalDefense: 120000
  },
  {
    id: 'dos_api_blackfriday',
    name: 'Denial of Service / Queda de API de Alta Demanda',
    tag: 'Disponibilidade',
    description: 'ReDoS ou exaustão de conexões derrubando endpoints transacionais durante pico de tráfego operacional.',
    tef: 120,
    exploitProb: 30,
    downtimeHours: 12,
    hourlyDowntimeCost: 45000,
    incidentResponseCost: 40000,
    assetLoss: 15000,
    recordsAtRisk: 0,
    costPerRecord: 0,
    regulatoryFines: 50000,
    churnLoss: 220000,
    legalDefense: 40000
  },
  {
    id: 'low_impact_hardening',
    name: 'Achado de Configuração / Informativo & Hardening',
    tag: 'Baixo Impacto',
    description: 'Headers HTTP permissivos, CORS amplo em rota estática ou falta de rate-limit sem vazamento direto de ativos sensíveis.',
    tef: 15,
    exploitProb: 8,
    downtimeHours: 0,
    hourlyDowntimeCost: 0,
    incidentResponseCost: 5000,
    assetLoss: 0,
    recordsAtRisk: 0,
    costPerRecord: 0,
    regulatoryFines: 0,
    churnLoss: 5000,
    legalDefense: 0
  }
];

export const RiskSimulatorView: React.FC<RiskSimulatorViewProps> = ({
  reports,
  initialReportId,
  onSelectReport,
  onNavigateToReports,
  className = ''
}) => {
  // 1. Report Selection
  const [selectedReportId, setSelectedReportId] = useState<string>(
    initialReportId || (reports.length > 0 ? reports[0].id : '')
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'BRL'>('USD');
  const [activeSubTab, setActiveSubTab] = useState<'simulation' | 'matrix' | 'executive'>('simulation');
  const [copiedBoardBriefing, setCopiedBoardBriefing] = useState(false);
  const [isAdvancedLossExpanded, setIsAdvancedLossExpanded] = useState(false);

  // Exchange rate USD -> BRL
  const currencyMultiplier = currency === 'BRL' ? 5.45 : 1;
  const formatMoney = (valUSD: number) => formatCurrency(valUSD * currencyMultiplier, currency);

  // Active Report
  const selectedReport = useMemo(() => {
    return reports.find((r) => r.id === selectedReportId) || reports[0] || null;
  }, [reports, selectedReportId]);

  // 2. FAIR Loss Event Frequency (LEF) Parameters State
  const [tef, setTef] = useState<number>(30); // Threat Event Frequency (attempts/year)
  const [exploitProb, setExploitProb] = useState<number>(35); // Vulnerability / Exploitability (0-100%)
  const [threatActorTier, setThreatActorTier] = useState<'opportunistic' | 'skilled' | 'organized' | 'apt'>('skilled');
  const [controlsStrength, setControlsStrength] = useState<'none' | 'basic' | 'robust' | 'zerotrust'>('basic');

  // 3. FAIR Loss Magnitude (LM) Parameters State
  // Primary Losses
  const [downtimeHours, setDowntimeHours] = useState<number>(6);
  const [hourlyDowntimeCost, setHourlyDowntimeCost] = useState<number>(15000);
  const [incidentResponseCost, setIncidentResponseCost] = useState<number>(45000);
  const [assetLoss, setAssetLoss] = useState<number>(20000);
  const [directTheftOrFraud, setDirectTheftOrFraud] = useState<number>(0);

  // Secondary Losses
  const [recordsAtRisk, setRecordsAtRisk] = useState<number>(25000);
  const [costPerRecord, setCostPerRecord] = useState<number>(5);
  const [regulatoryFines, setRegulatoryFines] = useState<number>(120000);
  const [churnLoss, setChurnLoss] = useState<number>(95000);
  const [legalDefense, setLegalDefense] = useState<number>(40000);

  // Custom Bounty Override
  const [bountyOverride, setBountyOverride] = useState<number | null>(null);

  /**
   * Helper function: Calibrate parameters automatically based on selected report
   */
  const calibrateFromReport = (rep: VulnerabilityReport) => {
    const cvss = rep.cvssScore || 5.0;
    const text = `${rep.title} ${rep.summary || ''} ${rep.businessImpact || ''} ${rep.vulnerabilityType || ''}`.toLowerCase();
    const vector = parseCvssVector(rep.cvssVector || '');

    // 1. Calculate TEF (Threat Event Frequency)
    let newTef = 20;
    if (vector.av === 'N') newTef += 30;
    if (vector.ac === 'L') newTef += 20;
    if (cvss >= 9.0) newTef += 30;
    else if (cvss >= 7.0) newTef += 15;
    if (/admin|rce|api|public|internet/i.test(text)) newTef += 15;
    newTef = Math.min(250, Math.max(5, newTef));

    // 2. Exploit Probability (%)
    let newExploit = Math.round(cvss * 8.5);
    if (vector.pr === 'N') newExploit += 10;
    if (vector.ui === 'N') newExploit += 10;
    if (rep.severity === 'CRITICAL') newExploit = Math.max(65, newExploit);
    newExploit = Math.min(95, Math.max(5, newExploit));

    // Threat Actor Tier
    let newThreatTier: 'opportunistic' | 'skilled' | 'organized' | 'apt' = 'skilled';
    if (rep.severity === 'CRITICAL' || /zero-day|rce|auth bypass/i.test(text)) {
      newThreatTier = 'organized';
    } else if (rep.severity === 'LOW') {
      newThreatTier = 'opportunistic';
    }

    // Controls
    const newControls: 'none' | 'basic' | 'robust' | 'zerotrust' = 'basic';

    // 3. Loss Magnitude Primary
    let newDowntime = 0;
    let newHourlyDowntime = 10000;
    if (vector.a === 'H' || /dos|crash|indispon|down|trav/i.test(text)) {
      newDowntime = 12;
      newHourlyDowntime = 25000;
    } else if (rep.severity === 'CRITICAL') {
      newDowntime = 6;
    } else if (rep.severity === 'HIGH') {
      newDowntime = 2;
    }

    let newIR = 25000;
    if (rep.severity === 'CRITICAL') newIR = 85000;
    else if (rep.severity === 'HIGH') newIR = 45000;

    let newAsset = 10000;
    let newFraud = 0;
    if (/fraude|saldo|pagamento|payment|carteira|transa/i.test(text)) {
      newFraud = 150000;
      newAsset = 40000;
    }

    // 4. Secondary Losses (Records, Fines, Churn)
    let newRecords = 5000;
    let newRecordCost = 4;
    let newFines = 25000;
    let newChurn = 30000;
    let newLegal = 20000;

    if (vector.c === 'H' || /pii|cpf|dump|vazamento|banco de dados|cliente/i.test(text)) {
      newRecords = rep.severity === 'CRITICAL' ? 120000 : 35000;
      newRecordCost = 6;
      newFines = rep.severity === 'CRITICAL' ? 350000 : 120000;
      newChurn = rep.severity === 'CRITICAL' ? 250000 : 80000;
      newLegal = rep.severity === 'CRITICAL' ? 140000 : 45000;
    }

    setTef(newTef);
    setExploitProb(newExploit);
    setThreatActorTier(newThreatTier);
    setControlsStrength(newControls);

    setDowntimeHours(newDowntime);
    setHourlyDowntimeCost(newHourlyDowntime);
    setIncidentResponseCost(newIR);
    setAssetLoss(newAsset);
    setDirectTheftOrFraud(newFraud);

    setRecordsAtRisk(newRecords);
    setCostPerRecord(newRecordCost);
    setRegulatoryFines(newFines);
    setChurnLoss(newChurn);
    setLegalDefense(newLegal);
    setBountyOverride(null);
  };

  // Sync initial parameters when selectedReport changes
  useEffect(() => {
    if (selectedReport) {
      calibrateFromReport(selectedReport);
    }
  }, [selectedReportId]);

  // Apply a preset
  const applyPreset = (preset: FairScenarioPreset) => {
    setTef(preset.tef);
    setExploitProb(preset.exploitProb);
    setDowntimeHours(preset.downtimeHours);
    setHourlyDowntimeCost(preset.hourlyDowntimeCost);
    setIncidentResponseCost(preset.incidentResponseCost);
    setAssetLoss(preset.assetLoss);
    setRecordsAtRisk(preset.recordsAtRisk);
    setCostPerRecord(preset.costPerRecord);
    setRegulatoryFines(preset.regulatoryFines);
    setChurnLoss(preset.churnLoss);
    setLegalDefense(preset.legalDefense);
  };

  // 4. FAIR Mathematical Model Computations
  const fairCalculations = useMemo(() => {
    // Loss Event Frequency (LEF) = TEF * Exploit Probability
    const lef = Math.max(0.01, (tef * (exploitProb / 100)));

    // Threat actor modifier & control resistance modifier
    const actorModifier =
      threatActorTier === 'apt'
        ? 1.35
        : threatActorTier === 'organized'
        ? 1.15
        : threatActorTier === 'skilled'
        ? 1.0
        : 0.75;

    const controlModifier =
      controlsStrength === 'zerotrust'
        ? 0.4
        : controlsStrength === 'robust'
        ? 0.7
        : controlsStrength === 'basic'
        ? 1.0
        : 1.4;

    const adjustedLef = Number((lef * actorModifier * controlModifier).toFixed(2));

    // Primary Loss
    const downtimeTotal = downtimeHours * hourlyDowntimeCost;
    const primaryTotal = downtimeTotal + incidentResponseCost + assetLoss + directTheftOrFraud;

    // Secondary Loss
    const recordNotificationTotal = recordsAtRisk * costPerRecord;
    const secondaryTotal = recordNotificationTotal + regulatoryFines + churnLoss + legalDefense;

    // Single Loss Expectancy (SLE / Loss Magnitude)
    const sle = primaryTotal + secondaryTotal;

    // Pert / Tri-point distribution estimates for SLE
    const sleMin = Math.round(sle * 0.45); // Fast detection / containment
    const sleLikely = Math.round(sle); // Most likely mode
    const sleMax = Math.round(sle * 2.4); // Uncontained, maximum collateral damage

    // Annual Loss Expectancy (ALE = LEF * SLE)
    const ale = Math.round(adjustedLef * sleLikely);
    const aleMin = Math.round(Math.max(0.1, adjustedLef * 0.5) * sleMin);
    const aleMax = Math.round((adjustedLef * 1.6) * sleMax);

    // Value at Risk (VaR 95% Confidence)
    const var95 = Math.round(ale * 1.85);

    // Post-Fix Residual Risk (95% reduction upon patch)
    const residualAle = Math.round(ale * 0.05);
    const costAvoided = Math.max(0, ale - residualAle);

    // Bounty Payout & ROI
    const actualBounty =
      bountyOverride !== null
        ? bountyOverride
        : selectedReport?.bountyAmount && selectedReport.bountyAmount > 0
        ? selectedReport.bountyAmount
        : selectedReport?.severity === 'CRITICAL'
        ? 3500
        : selectedReport?.severity === 'HIGH'
        ? 1500
        : selectedReport?.severity === 'MEDIUM'
        ? 600
        : 200;

    const bountyRoiPercent = Math.round(((costAvoided - actualBounty) / Math.max(1, actualBounty)) * 100);
    const savingsMultiple = Number((costAvoided / Math.max(1, actualBounty)).toFixed(1));

    // FAIR Risk Tiering
    let riskTier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    let riskColor = 'text-blue-400';
    let riskBg = 'bg-blue-950/40 border-blue-500/40';

    if (ale >= 500000 || (adjustedLef >= 2 && sleLikely >= 200000)) {
      riskTier = 'CRITICAL';
      riskColor = 'text-rose-400';
      riskBg = 'bg-rose-950/40 border-rose-500/40';
    } else if (ale >= 150000 || (adjustedLef >= 1 && sleLikely >= 80000)) {
      riskTier = 'HIGH';
      riskColor = 'text-orange-400';
      riskBg = 'bg-orange-950/40 border-orange-500/40';
    } else if (ale >= 40000) {
      riskTier = 'MEDIUM';
      riskColor = 'text-amber-400';
      riskBg = 'bg-amber-950/40 border-amber-500/40';
    }

    return {
      lef: adjustedLef,
      rawLef: lef,
      actorModifier,
      controlModifier,
      primary: {
        downtimeTotal,
        incidentResponseCost,
        assetLoss,
        directTheftOrFraud,
        total: primaryTotal
      },
      secondary: {
        recordNotificationTotal,
        regulatoryFines,
        churnLoss,
        legalDefense,
        total: secondaryTotal
      },
      sle,
      sleMin,
      sleLikely,
      sleMax,
      ale,
      aleMin,
      aleMax,
      var95,
      residualAle,
      costAvoided,
      actualBounty,
      bountyRoiPercent,
      savingsMultiple,
      riskTier,
      riskColor,
      riskBg
    };
  }, [
    tef,
    exploitProb,
    threatActorTier,
    controlsStrength,
    downtimeHours,
    hourlyDowntimeCost,
    incidentResponseCost,
    assetLoss,
    directTheftOrFraud,
    recordsAtRisk,
    costPerRecord,
    regulatoryFines,
    churnLoss,
    legalDefense,
    bountyOverride,
    selectedReport
  ]);

  // Chart 1: Loss Magnitude Breakdown Data
  const lossBreakdownData = useMemo(() => {
    return [
      {
        name: 'Downtime & Indisponibilidade',
        category: 'Primária',
        amount: fairCalculations.primary.downtimeTotal * currencyMultiplier,
        fill: '#f59e0b'
      },
      {
        name: 'Resposta ao Incidente (IR)',
        category: 'Primária',
        amount: fairCalculations.primary.incidentResponseCost * currencyMultiplier,
        fill: '#3b82f6'
      },
      {
        name: 'Ativos & Fraude Direta',
        category: 'Primária',
        amount: (fairCalculations.primary.assetLoss + fairCalculations.primary.directTheftOrFraud) * currencyMultiplier,
        fill: '#8b5cf6'
      },
      {
        name: 'Notificação de Registros',
        category: 'Secundária',
        amount: fairCalculations.secondary.recordNotificationTotal * currencyMultiplier,
        fill: '#10b981'
      },
      {
        name: 'Multas Regulatórias (LGPD/GDPR)',
        category: 'Secundária',
        amount: fairCalculations.secondary.regulatoryFines * currencyMultiplier,
        fill: '#ef4444'
      },
      {
        name: 'Churn de Clientes & Reputação',
        category: 'Secundária',
        amount: fairCalculations.secondary.churnLoss * currencyMultiplier,
        fill: '#ec4899'
      },
      {
        name: 'Custos Jurídicos & Acordos',
        category: 'Secundária',
        amount: fairCalculations.secondary.legalDefense * currencyMultiplier,
        fill: '#6366f1'
      }
    ].filter((item) => item.amount > 0);
  }, [fairCalculations, currencyMultiplier]);

  // Chart 2: ALE Range & Scenarios
  const aleScenariosData = useMemo(() => {
    return [
      {
        name: 'Otimista (10%)',
        amount: fairCalculations.aleMin * currencyMultiplier,
        fill: '#3b82f6',
        desc: 'Contenção rápida e mínimo impacto de terceiros'
      },
      {
        name: 'Esperado (ALE)',
        amount: fairCalculations.ale * currencyMultiplier,
        fill:
          fairCalculations.riskTier === 'CRITICAL'
            ? '#ef4444'
            : fairCalculations.riskTier === 'HIGH'
            ? '#f97316'
            : fairCalculations.riskTier === 'MEDIUM'
            ? '#f59e0b'
            : '#10b981',
        desc: 'Cenário quantitativo mais provável no modelo FAIR'
      },
      {
        name: 'Pior Caso (90%)',
        amount: fairCalculations.aleMax * currencyMultiplier,
        fill: '#b91c1c',
        desc: 'Exfiltração sem contenção e multas máximas'
      },
      {
        name: 'Risco Residual',
        amount: fairCalculations.residualAle * currencyMultiplier,
        fill: '#10b981',
        desc: 'Exposição anual remanescente após o patch'
      },
      {
        name: 'Custo Bounty',
        amount: fairCalculations.actualBounty * currencyMultiplier,
        fill: '#a855f7',
        desc: 'Investimento na recompensa do pesquisador'
      }
    ];
  }, [fairCalculations, currencyMultiplier]);

  // Copy Executive Board Briefing
  const handleCopyBoardBriefing = () => {
    if (!selectedReport) return;
    const text = `=== PARECER QUANTITATIVO DE RISCO DA VULNERABILIDADE (MODELO FAIR) ===
Relatório: ${selectedReport.title} [${selectedReport.id}]
Alvo Afetado: ${selectedReport.target}
Severidade Técnica: ${selectedReport.severity} (CVSS ${selectedReport.cvssScore.toFixed(1)})
Classificação de Risco FAIR: NÍVEL ${fairCalculations.riskTier}

1. FREQUÊNCIA DE PERDA (LOSS EVENT FREQUENCY - LEF):
- Frequência de Tentativas de Ameaça (TEF): ${tef} tentativas/ano
- Probabilidade de Exploração Bem-Sucedida: ${exploitProb}%
- Capacidade do Atacante: ${threatActorTier.toUpperCase()}
- Força dos Controles Atuais: ${controlsStrength.toUpperCase()}
- Frequência Anual de Perda Projetada (LEF): ${fairCalculations.lef} eventos/ano

2. MAGNITUDE DE PERDA POR INCIDENTE (LOSS MAGNITUDE - SLE):
- Perda Primária Estimada: ${formatMoney(fairCalculations.primary.total)}
  * Indisponibilidade (${downtimeHours}h a ${formatMoney(hourlyDowntimeCost)}/h): ${formatMoney(fairCalculations.primary.downtimeTotal)}
  * Resposta ao Incidente & Forense: ${formatMoney(fairCalculations.primary.incidentResponseCost)}
  * Ativos & Fraude: ${formatMoney(fairCalculations.primary.assetLoss + fairCalculations.primary.directTheftOrFraud)}
- Perda Secundária Estimada: ${formatMoney(fairCalculations.secondary.total)}
  * Notificação de ${recordsAtRisk.toLocaleString()} Registros: ${formatMoney(fairCalculations.secondary.recordNotificationTotal)}
  * Multas Regulatórias (LGPD / GDPR): ${formatMoney(fairCalculations.secondary.regulatoryFines)}
  * Churn & Evasão de Contratos: ${formatMoney(fairCalculations.secondary.churnLoss)}
  * Assessoria Jurídica & Acordos: ${formatMoney(fairCalculations.secondary.legalDefense)}
- Perda Única por Evento (Single Loss Expectancy - SLE): ${formatMoney(fairCalculations.sleLikely)}
  * Faixa: ${formatMoney(fairCalculations.sleMin)} (Otimista) a ${formatMoney(fairCalculations.sleMax)} (Pior Caso)

3. EXPOSIÇÃO FINANCEIRA ANUALIZADA (ANNUAL LOSS EXPECTANCY - ALE):
- Exposição Inerente Anual (ALE = LEF × SLE): ${formatMoney(fairCalculations.ale)} / ano
- Valor em Risco (VaR 95% Confiança): ${formatMoney(fairCalculations.var95)}
- Risco Residual Pós-Correção (Mitigação ~95%): ${formatMoney(fairCalculations.residualAle)} / ano
- Prejuízo Financeiro Evitado: ${formatMoney(fairCalculations.costAvoided)} / ano

4. RETORNO SOBRE O PROGRAMA DE BUG BOUNTY:
- Recompensa Paga ao Pesquisador: ${formatMoney(fairCalculations.actualBounty)}
- Múltiplo de Economia de Capital: ${fairCalculations.savingsMultiple}x
- ROI Financeiro do Achado: ${fairCalculations.bountyRoiPercent}% de retorno sobre o gasto defensivo

RECOMENDAÇÃO: Priorizar remediação imediata para garantir a retenção de ${formatMoney(fairCalculations.costAvoided)} em valor econômico corporativo.
================================================================================`;

    navigator.clipboard.writeText(text);
    setCopiedBoardBriefing(true);
    setTimeout(() => setCopiedBoardBriefing(false), 2500);
  };

  return (
    <section
      id="fair-risk-simulator-view"
      className={`bg-[#0d101b] border border-[#1e233d] rounded-2xl overflow-hidden shadow-2xl transition-all ${className}`}
    >
      {/* Header Bar */}
      <div className="p-5 sm:p-6 border-b border-[#1e233d] bg-gradient-to-r from-[#111528] via-[#0f1222] to-[#0a0c16] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 via-sky-500/20 to-indigo-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-950/40">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  FAIR Risk Simulator
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold">
                  Loss Frequency × Magnitude
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/30 font-bold">
                  ALE = ARO × SLE
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30 font-bold">
                  Bug Bounty ROI
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                Simulação financeira de risco quantitativo baseada no padrão global <strong>FAIR (Factor Analysis of Information Risk)</strong>. Ajuste a frequência de perda e a magnitude do impacto para quantificar a exposição monetária anual por vulnerabilidade.
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls & Currency Switch */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Sub-view switcher */}
          <div className="flex items-center bg-[#090b14] border border-[#20273d] p-1 rounded-lg text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveSubTab('simulation')}
              className={`px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'simulation'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Simulação Interativa</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('matrix')}
              className={`px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'matrix'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Matriz FAIR (2D)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('executive')}
              className={`px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'executive'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Parecer Executivo</span>
            </button>
          </div>

          {/* Currency Switcher */}
          <div className="flex items-center bg-[#090b14] border border-[#20273d] p-1 rounded-lg text-xs font-mono">
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                currency === 'USD'
                  ? 'bg-[#1a2138] text-emerald-400 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              USD ($)
            </button>
            <button
              type="button"
              onClick={() => setCurrency('BRL')}
              className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                currency === 'BRL'
                  ? 'bg-[#1a2138] text-emerald-400 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              BRL (R$)
            </button>
          </div>
        </div>
      </div>

      {/* Vulnerability Selector & Preset Bar */}
      <div className="px-5 py-4 border-b border-[#1e233d] bg-[#0a0c16] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Vulnerability Dropdown / Quick Select */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="text-xs font-mono text-zinc-400 shrink-0 font-bold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <span>Vulnerabilidade Alvo:</span>
          </span>

          <div className="relative flex-1 max-w-md">
            <select
              value={selectedReportId}
              onChange={(e) => setSelectedReportId(e.target.value)}
              className="w-full bg-[#121626] border border-[#242b44] text-white text-xs rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-emerald-500 transition-colors font-mono cursor-pointer"
            >
              {reports.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  [{rep.severity}] {rep.title} ({rep.target}) - CVSS {rep.cvssScore?.toFixed(1) || '0.0'}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          {selectedReport && (
            <button
              type="button"
              onClick={() => calibrateFromReport(selectedReport)}
              title="Recalcular parâmetros a partir do CVSS e contexto da falha"
              className="px-2.5 py-2 rounded-xl text-xs font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Auto-Calibrar</span>
            </button>
          )}
        </div>

        {/* Quick Scenario Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 shrink-0">
          <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mr-1 shrink-0">
            Cenários Rápidos:
          </span>
          {FAIR_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              title={preset.description}
              className="px-2.5 py-1 rounded-lg text-[11px] font-mono border border-[#22283e] bg-[#121626] text-zinc-300 hover:text-white hover:border-emerald-500/40 hover:bg-emerald-950/20 transition-all shrink-0 cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>{preset.tag}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Report Snapshot Strip */}
      {selectedReport && (
        <div className="px-5 py-3 bg-[#0f1322]/80 border-b border-[#1b2036] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadgeColor(
                selectedReport.severity
              )}`}
            >
              {selectedReport.severity}
            </span>
            <span className="text-zinc-300 font-bold font-sans line-clamp-1 max-w-md">
              {selectedReport.title}
            </span>
            <span className="text-zinc-500">|</span>
            <span className="text-emerald-400">{selectedReport.target}</span>
            <span className="text-zinc-500">|</span>
            <span className="text-zinc-400">CVSS: <strong className="text-white">{selectedReport.cvssScore?.toFixed(1) || 'N/A'}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-zinc-400 text-[11px]">
              Recompensa de Bounty:{' '}
              <strong className="text-emerald-400">
                {selectedReport.bountyAmount > 0
                  ? formatMoney(selectedReport.bountyAmount)
                  : formatMoney(fairCalculations.actualBounty)}
              </strong>
            </div>
            {onSelectReport && (
              <button
                type="button"
                onClick={() => onSelectReport(selectedReport)}
                className="text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Ver Detalhes</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Level Summary Cards (ALE, SLE, LEF, ROI) */}
      <div className="p-4 sm:p-6 border-b border-[#1e233d] bg-[#0a0c16] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Annual Loss Expectancy (ALE) */}
        <div className={`p-4 rounded-xl border transition-all ${fairCalculations.riskBg}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-rose-400" />
              <span>Perda Anual Esperada (ALE)</span>
            </span>
            <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase border ${fairCalculations.riskBg} ${fairCalculations.riskColor}`}>
              Risco {fairCalculations.riskTier}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-2 tracking-tight">
            {formatMoney(fairCalculations.ale)}
            <span className="text-xs font-normal text-zinc-400 ml-1">/ano</span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mt-2 pt-2 border-t border-white/10">
            <span>Otimista: {formatMoney(fairCalculations.aleMin)}</span>
            <span>Pior Caso: {formatMoney(fairCalculations.aleMax)}</span>
          </div>
        </div>

        {/* Card 2: Single Loss Expectancy (SLE) */}
        <div className="p-4 rounded-xl border border-[#20273d] bg-[#121626] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Perda por Evento (SLE)</span>
            </span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-amber-950/40 text-amber-300 border border-amber-500/30">
              Magnitude
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-2 tracking-tight">
            {formatMoney(fairCalculations.sleLikely)}
            <span className="text-xs font-normal text-zinc-400 ml-1">/incidente</span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mt-2 pt-2 border-t border-[#1e2338]">
            <span className="text-amber-300">Primária: {formatMoney(fairCalculations.primary.total)}</span>
            <span className="text-rose-300">Secundária: {formatMoney(fairCalculations.secondary.total)}</span>
          </div>
        </div>

        {/* Card 3: Loss Event Frequency (LEF) */}
        <div className="p-4 rounded-xl border border-[#20273d] bg-[#121626] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              <span>Frequência Anual (LEF)</span>
            </span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-sky-950/40 text-sky-300 border border-sky-500/30">
              Taxa (ARO)
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-2 tracking-tight">
            {fairCalculations.lef}
            <span className="text-xs font-normal text-zinc-400 ml-1.5">eventos/ano</span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mt-2 pt-2 border-t border-[#1e2338]">
            <span>{tef} tentativas/ano</span>
            <span className="text-sky-300 font-bold">{exploitProb}% exploração</span>
          </div>
        </div>

        {/* Card 4: Bug Bounty ROI & Capital Preservation */}
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>Retorno do Bug Bounty</span>
            </span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-emerald-950/60 text-emerald-300 border border-emerald-500/40">
              {fairCalculations.savingsMultiple}x ROI
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-300 mt-2 tracking-tight">
            {formatMoney(fairCalculations.costAvoided)}
            <span className="text-xs font-normal text-emerald-400/80 ml-1">evitados</span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mt-2 pt-2 border-t border-emerald-500/20">
            <span>Bounty: {formatMoney(fairCalculations.actualBounty)}</span>
            <span className="text-emerald-400 font-bold">+{fairCalculations.bountyRoiPercent}% ROI</span>
          </div>
        </div>
      </div>

      {/* Main Content Area based on sub-tab */}
      {activeSubTab === 'simulation' && (
        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#0a0c16]">
          {/* Left Column (5 cols): Interactive FAIR Parameter Sliders */}
          <div className="lg:col-span-5 space-y-5">
            {/* Box 1: Loss Event Frequency (LEF) Input Module */}
            <div className="bg-[#101424] border border-[#20273d] rounded-2xl p-4 sm:p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#1e2338]">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-sky-400" />
                  <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                    1. Frequência de Perda (LEF)
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-sky-300 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-500/30">
                  LEF = {fairCalculations.lef} / ano
                </span>
              </div>

              <div className="space-y-4 mt-4">
                {/* TEF Slider */}
                <div>
                  <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                    <span className="text-zinc-300 flex items-center gap-1">
                      <span>Frequência de Ameaça (TEF)</span>
                      <span title="Número estimado de tentativas de exploração realizadas por agentes de ameaça por ano" className="text-zinc-500 cursor-help">ⓘ</span>
                    </span>
                    <span className="text-sky-400 font-bold">{tef} tentativas/ano</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="200"
                    step="1"
                    value={tef}
                    onChange={(e) => setTef(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#1a2136] rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-zinc-500 mt-1">
                    <span>1 (Raro)</span>
                    <span>50 (Padrão Web)</span>
                    <span>200+ (Visado)</span>
                  </div>
                </div>

                {/* Exploitability Probability Slider */}
                <div>
                  <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                    <span className="text-zinc-300 flex items-center gap-1">
                      <span>Probabilidade de Exploração</span>
                      <span title="Chance de um ataque ter sucesso considerando a ausência de mitigação" className="text-zinc-500 cursor-help">ⓘ</span>
                    </span>
                    <span className="text-sky-400 font-bold">{exploitProb}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="99"
                    step="1"
                    value={exploitProb}
                    onChange={(e) => setExploitProb(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#1a2136] rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-zinc-500 mt-1">
                    <span>5% (Complexo)</span>
                    <span>50% (Médio)</span>
                    <span>99% (Trivial / 1-Click)</span>
                  </div>
                </div>

                {/* Threat Actor & Controls Selection */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 block mb-1">
                      Perfil do Atacante:
                    </label>
                    <select
                      value={threatActorTier}
                      onChange={(e) => setThreatActorTier(e.target.value as any)}
                      className="w-full bg-[#161a2e] border border-[#242c48] text-zinc-200 text-xs rounded-lg px-2 py-1.5 font-mono focus:outline-none focus:border-sky-500"
                    >
                      <option value="opportunistic">Oportunista (Script Kiddie)</option>
                      <option value="skilled">Especializado (Researcher/Hacker)</option>
                      <option value="organized">Crime Organizado / Ransomware</option>
                      <option value="apt">Estado-Nação / APT</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 block mb-1">
                      Força dos Controles:
                    </label>
                    <select
                      value={controlsStrength}
                      onChange={(e) => setControlsStrength(e.target.value as any)}
                      className="w-full bg-[#161a2e] border border-[#242c48] text-zinc-200 text-xs rounded-lg px-2 py-1.5 font-mono focus:outline-none focus:border-sky-500"
                    >
                      <option value="none">Nenhum / Sem Defesa</option>
                      <option value="basic">Básico (WAF / Firewall Padrão)</option>
                      <option value="robust">Robusto (Defense-in-Depth)</option>
                      <option value="zerotrust">Zero Trust & EDR Ativo</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 2: Loss Magnitude (LM / SLE) Input Module */}
            <div className="bg-[#101424] border border-[#20273d] rounded-2xl p-4 sm:p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#1e2338]">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                    2. Magnitude de Perda (SLE)
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                  SLE = {formatMoney(fairCalculations.sleLikely)}
                </span>
              </div>

              {/* Primary Losses Inputs */}
              <div className="space-y-3.5 mt-4">
                <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center justify-between">
                  <span>Perdas Primárias (Diretas)</span>
                  <span>{formatMoney(fairCalculations.primary.total)}</span>
                </div>

                {/* Downtime Hours */}
                <div>
                  <div className="flex justify-between items-center text-xs font-mono mb-1">
                    <span className="text-zinc-300">Tempo de Indisponibilidade</span>
                    <span className="text-amber-400 font-bold">{downtimeHours} horas</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="48"
                    step="1"
                    value={downtimeHours}
                    onChange={(e) => setDowntimeHours(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#1a2136] rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                {/* Hourly Downtime Cost */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 block mb-1">
                      Custo/Hora de Queda:
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={hourlyDowntimeCost}
                      onChange={(e) => setHourlyDowntimeCost(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-[#161a2e] border border-[#242c48] text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 block mb-1">
                      Resposta & Forense (DFIR):
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="5000"
                      value={incidentResponseCost}
                      onChange={(e) => setIncidentResponseCost(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-[#161a2e] border border-[#242c48] text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Secondary Losses Inputs */}
                <div className="pt-3 border-t border-[#1e2338]">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold flex items-center justify-between mb-2">
                    <span>Perdas Secundárias (Impacto a Terceiros & Multas)</span>
                    <span>{formatMoney(fairCalculations.secondary.total)}</span>
                  </div>

                  <div className="space-y-3">
                    {/* Records at Risk */}
                    <div>
                      <div className="flex justify-between items-center text-xs font-mono mb-1">
                        <span className="text-zinc-300">Registros Sensíveis Expostos</span>
                        <span className="text-rose-400 font-bold">{recordsAtRisk.toLocaleString()} registros</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="500000"
                        step="5000"
                        value={recordsAtRisk}
                        onChange={(e) => setRecordsAtRisk(Number(e.target.value))}
                        className="w-full h-1.5 bg-[#1a2136] rounded-lg appearance-none cursor-pointer accent-rose-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-mono text-zinc-400 block mb-1">
                          Multas Regulatórias:
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="10000"
                          value={regulatoryFines}
                          onChange={(e) => setRegulatoryFines(Math.max(0, Number(e.target.value)))}
                          className="w-full bg-[#161a2e] border border-[#242c48] text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-rose-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-zinc-400 block mb-1">
                          Churn & Reputação:
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="10000"
                          value={churnLoss}
                          onChange={(e) => setChurnLoss(Math.max(0, Number(e.target.value)))}
                          className="w-full bg-[#161a2e] border border-[#242c48] text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-rose-500"
                        />
                      </div>
                    </div>

                    {/* Expandable Advanced Loss Options */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setIsAdvancedLossExpanded(!isAdvancedLossExpanded)}
                        className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer mt-1"
                      >
                        <span>{isAdvancedLossExpanded ? 'Ocultar' : 'Ajustes Adicionais'} (Jurídico, Ativos, Fraude)</span>
                        {isAdvancedLossExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {isAdvancedLossExpanded && (
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#1c2236] animate-in fade-in">
                          <div>
                            <label className="text-[10px] font-mono text-zinc-400 block mb-1">
                              Custos Jurídicos & Defesa:
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="5000"
                              value={legalDefense}
                              onChange={(e) => setLegalDefense(Math.max(0, Number(e.target.value)))}
                              className="w-full bg-[#161a2e] border border-[#242c48] text-zinc-200 text-xs rounded-lg px-2 py-1 font-mono focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-mono text-zinc-400 block mb-1">
                              Fraude Direta / Embezzlement:
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="5000"
                              value={directTheftOrFraud}
                              onChange={(e) => setDirectTheftOrFraud(Math.max(0, Number(e.target.value)))}
                              className="w-full bg-[#161a2e] border border-[#242c48] text-zinc-200 text-xs rounded-lg px-2 py-1 font-mono focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (7 cols): Charts, Visual Breakdowns, and Action Bar */}
          <div className="lg:col-span-7 space-y-5 flex flex-col justify-between">
            {/* Chart 1: Loss Magnitude Breakdown (Horizontal Bar Chart) */}
            <div className="bg-[#101424] border border-[#20273d] rounded-2xl p-4 sm:p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#1e2338]">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                    Composição da Magnitude de Perda por Incidente (SLE)
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  Total: <strong className="text-white">{formatMoney(fairCalculations.sleLikely)}</strong>
                </span>
              </div>

              <div className="h-56 mt-4 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={lossBreakdownData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1c2236" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="#4b5563"
                      tickFormatter={(val) => formatCurrency(val, currency)}
                      tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#4b5563"
                      width={120}
                      tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'monospace' }}
                    />
                    <Tooltip
                      formatter={(val: any) => [formatCurrency(Number(val), currency), 'Impacto']}
                      contentStyle={{
                        backgroundColor: '#0c0e18',
                        borderColor: '#242b44',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontFamily: 'monospace'
                      }}
                    />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                      {lossBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Annual Loss Expectancy (ALE) Comparison & Risk Reduction */}
            <div className="bg-[#101424] border border-[#20273d] rounded-2xl p-4 sm:p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#1e2338]">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                  <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                    Cenários de Risco Anual (ALE) vs. Custo do Bug Bounty
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  {fairCalculations.savingsMultiple}x Economia
                </span>
              </div>

              <div className="h-56 mt-4 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={aleScenariosData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1c2236" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#4b5563"
                      tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'monospace' }}
                    />
                    <YAxis
                      stroke="#4b5563"
                      tickFormatter={(val) => formatCurrency(val, currency)}
                      tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
                    />
                    <Tooltip
                      formatter={(val: any) => [formatCurrency(Number(val), currency), 'Valor']}
                      contentStyle={{
                        backgroundColor: '#0c0e18',
                        borderColor: '#242b44',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontFamily: 'monospace'
                      }}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {aleScenariosData.map((entry, index) => (
                        <Cell key={`ale-cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 pt-3 border-t border-[#1e2338] flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Exposição Inerente: <strong className="text-white">{formatMoney(fairCalculations.ale)}/ano</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Risco Residual: <strong className="text-emerald-300">{formatMoney(fairCalculations.residualAle)}/ano</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span>Bounty: <strong className="text-purple-300">{formatMoney(fairCalculations.actualBounty)}</strong></span>
                </div>
              </div>
            </div>

            {/* Action Bar Footer */}
            <div className="p-4 bg-[#121626] border border-[#20273d] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs font-mono text-zinc-300">
                <span>Parecer FAIR pronto para apresentação ao C-Level & Board.</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyBoardBriefing}
                  className="px-4 py-2 rounded-xl text-xs font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/40"
                >
                  {copiedBoardBriefing ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedBoardBriefing ? 'Parecer Copiado!' : 'Copiar Parecer C-Level'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2: FAIR 2D Matrix (Loss Event Frequency vs. Loss Magnitude) */}
      {activeSubTab === 'matrix' && (
        <div className="p-4 sm:p-6 bg-[#0a0c16]">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center max-w-xl mx-auto">
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                Matriz Canônica FAIR: Frequência de Perda × Magnitude
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Visualização do enquadramento do achado de segurança no quadrante de risco corporativo.
              </p>
            </div>

            {/* 2D Matrix Canvas */}
            <div className="relative w-full h-[380px] bg-[#0c0e18] border border-[#20273d] rounded-2xl p-6 pl-14 pb-12 overflow-hidden select-none">
              {/* Y-Axis (Loss Magnitude) */}
              <div className="absolute left-2 top-6 bottom-12 w-10 flex flex-col justify-between items-end text-[10px] font-mono text-zinc-500 pr-2">
                <span className="text-rose-400 font-bold">&gt;$1M</span>
                <span>$500k</span>
                <span className="text-amber-400 font-bold">$100k</span>
                <span>$25k</span>
                <span>$0</span>
              </div>
              <div className="absolute -left-16 top-1/2 -rotate-90 origin-center text-[9px] font-mono text-zinc-400 uppercase tracking-wider">
                Magnitude de Perda (SLE)
              </div>

              {/* X-Axis (Loss Frequency) */}
              <div className="absolute left-14 right-6 bottom-2 h-8 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span>0.1x/ano</span>
                <span>1x/ano</span>
                <span className="text-sky-400 font-bold">5x/ano</span>
                <span>20x/ano</span>
                <span className="text-rose-400 font-bold">50x+/ano</span>
              </div>
              <div className="absolute bottom-2 right-8 text-[9px] font-mono text-zinc-400 uppercase tracking-wider">
                Frequência Anual (LEF)
              </div>

              {/* Matrix Quadrants */}
              <div className="relative w-full h-full border border-[#1e2338]">
                {/* Top-Right: Critical Risk */}
                <div className="absolute left-1/2 top-0 right-0 bottom-1/2 bg-rose-950/20 border-l border-b border-rose-500/30 p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-rose-300">
                    CRÍTICO (Alta Freq / Alto Dano)
                  </span>
                  <span className="text-[9px] font-mono text-rose-400">ALE &gt; $500k/ano</span>
                </div>

                {/* Top-Left: High Impact / Low Frequency (Catastrophic Outlier) */}
                <div className="absolute left-0 top-0 right-1/2 bottom-1/2 bg-orange-950/20 border-r border-b border-orange-500/30 p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-orange-300">
                    ALTO IMPACTO (Baixa Freq / Dano Severo)
                  </span>
                  <span className="text-[9px] font-mono text-orange-400">Risco Catastrófico</span>
                </div>

                {/* Bottom-Right: High Frequency / Low Impact (Nuisance / Death by 1000 cuts) */}
                <div className="absolute left-1/2 top-1/2 right-0 bottom-0 bg-amber-950/20 border-l border-t border-amber-500/30 p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-amber-300">
                    FREQUENTE (Alto Volume / Baixo Dano)
                  </span>
                  <span className="text-[9px] font-mono text-amber-400">Fadiga Operacional</span>
                </div>

                {/* Bottom-Left: Low Risk (Routine Backlog) */}
                <div className="absolute left-0 top-1/2 right-1/2 bottom-0 bg-blue-950/20 border-r border-t border-blue-500/30 p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-blue-300">
                    BAIXO (Informativo / Baixa Freq)
                  </span>
                  <span className="text-[9px] font-mono text-blue-400">ALE &lt; $40k/ano</span>
                </div>

                {/* Plotted Position of Current Selected Finding */}
                {(() => {
                  // Map LEF (0.1 to 50) to X percentage (0% to 100%)
                  const xPercent = Math.min(95, Math.max(5, (Math.log10(Math.max(0.1, fairCalculations.lef) / 0.1) / Math.log10(500)) * 100));
                  // Map SLE (0 to 1,000,000) to Y percentage inverted (0% = top, 100% = bottom)
                  const yPercent = Math.min(95, Math.max(5, 100 - (Math.min(1000000, fairCalculations.sleLikely) / 1000000) * 100));

                  return (
                    <div
                      style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-30"
                    >
                      <div className="relative group">
                        <div className="w-5 h-5 rounded-full bg-rose-500 border-2 border-white shadow-lg shadow-rose-500/80 animate-pulse flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                        {/* Hover tool badge */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 rounded-lg bg-[#14182b] border border-[#262e4c] text-[10px] font-mono shadow-2xl text-center">
                          <div className="font-bold text-white truncate">{selectedReport?.title}</div>
                          <div className="text-emerald-400 font-bold mt-0.5">ALE: {formatMoney(fairCalculations.ale)}</div>
                          <div className="text-zinc-400 text-[9px]">LEF: {fairCalculations.lef}x | SLE: {formatMoney(fairCalculations.sleLikely)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="p-4 bg-[#121626] border border-[#20273d] rounded-xl flex items-center justify-between text-xs font-mono text-zinc-300">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span>Ponto destacado representa a vulnerabilidade ativa: <strong className="text-white">{selectedReport?.title}</strong></span>
              </div>
              <span className={`px-2 py-0.5 rounded font-bold uppercase ${fairCalculations.riskBg} ${fairCalculations.riskColor}`}>
                Classificação: {fairCalculations.riskTier}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 3: Formal Executive Board Briefing */}
      {activeSubTab === 'executive' && (
        <div className="p-4 sm:p-6 bg-[#0a0c16]">
          <div className="max-w-4xl mx-auto bg-[#0d101b] border border-[#20273d] rounded-2xl p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#1e2338]">
              <div>
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Parecer Executivo de Risco Financeiro (CISO / Board Briefing)</span>
                </h3>
                <span className="text-xs text-zinc-400 font-mono">
                  Pronto para exportação, auditoria interna e justificativa de ROI defensivo
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyBoardBriefing}
                className="px-3.5 py-1.5 rounded-xl text-xs font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {copiedBoardBriefing ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedBoardBriefing ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-[#090b14] border border-[#1b2034] font-mono text-xs text-zinc-300 space-y-3 leading-relaxed whitespace-pre-wrap">
              {`=== PARECER QUANTITATIVO DE RISCO DA VULNERABILIDADE (MODELO FAIR) ===
Relatório: ${selectedReport?.title} [${selectedReport?.id}]
Alvo Afetado: ${selectedReport?.target}
Severidade Técnica: ${selectedReport?.severity} (CVSS ${selectedReport?.cvssScore?.toFixed(1) || '0.0'})
Classificação de Risco FAIR: NÍVEL ${fairCalculations.riskTier}

1. FREQUÊNCIA DE PERDA (LOSS EVENT FREQUENCY - LEF):
- Frequência de Tentativas de Ameaça (TEF): ${tef} tentativas/ano
- Probabilidade de Exploração Bem-Sucedida: ${exploitProb}%
- Capacidade do Atacante: ${threatActorTier.toUpperCase()}
- Força dos Controles Atuais: ${controlsStrength.toUpperCase()}
- Frequência Anual de Perda Projetada (LEF): ${fairCalculations.lef} eventos/ano

2. MAGNITUDE DE PERDA POR INCIDENTE (LOSS MAGNITUDE - SLE):
- Perda Primária Estimada: ${formatMoney(fairCalculations.primary.total)}
  * Indisponibilidade (${downtimeHours}h a ${formatMoney(hourlyDowntimeCost)}/h): ${formatMoney(fairCalculations.primary.downtimeTotal)}
  * Resposta ao Incidente & Forense: ${formatMoney(fairCalculations.primary.incidentResponseCost)}
  * Ativos & Fraude: ${formatMoney(fairCalculations.primary.assetLoss + fairCalculations.primary.directTheftOrFraud)}
- Perda Secundária Estimada: ${formatMoney(fairCalculations.secondary.total)}
  * Notificação de ${recordsAtRisk.toLocaleString()} Registros: ${formatMoney(fairCalculations.secondary.recordNotificationTotal)}
  * Multas Regulatórias (LGPD / GDPR): ${formatMoney(fairCalculations.secondary.regulatoryFines)}
  * Churn & Evasão de Contratos: ${formatMoney(fairCalculations.secondary.churnLoss)}
  * Assessoria Jurídica & Acordos: ${formatMoney(fairCalculations.secondary.legalDefense)}
- Perda Única por Evento (Single Loss Expectancy - SLE): ${formatMoney(fairCalculations.sleLikely)}
  * Faixa: ${formatMoney(fairCalculations.sleMin)} (Otimista) a ${formatMoney(fairCalculations.sleMax)} (Pior Caso)

3. EXPOSIÇÃO FINANCEIRA ANUALIZADA (ANNUAL LOSS EXPECTANCY - ALE):
- Exposição Inerente Anual (ALE = LEF × SLE): ${formatMoney(fairCalculations.ale)} / ano
- Valor em Risco (VaR 95% Confiança): ${formatMoney(fairCalculations.var95)}
- Risco Residual Pós-Correção (Mitigação ~95%): ${formatMoney(fairCalculations.residualAle)} / ano
- Prejuízo Financeiro Evitado: ${formatMoney(fairCalculations.costAvoided)} / ano

4. RETORNO SOBRE O PROGRAMA DE BUG BOUNTY:
- Recompensa Paga ao Pesquisador: ${formatMoney(fairCalculations.actualBounty)}
- Múltiplo de Economia de Capital: ${fairCalculations.savingsMultiple}x
- ROI Financeiro do Achado: ${fairCalculations.bountyRoiPercent}% de retorno sobre o gasto defensivo

RECOMENDAÇÃO: Priorizar remediação imediata para garantir a retenção de ${formatMoney(fairCalculations.costAvoided)} em valor econômico corporativo.`}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
