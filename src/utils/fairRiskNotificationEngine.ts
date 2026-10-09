import { VulnerabilityReport, Severity } from '../types';
import { notifyFairAleBreach } from './toastNotifications';

export type FairNotificationChannel = 'toast' | 'internal_log' | 'both';
export type FairSeverityTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type FairAutomatedActionType = 
  | 'routine_backlog'        // Esteira de rotina / backlog
  | 'standard_sla_30d'       // SLA padrão (30 dias)
  | 'priority_sprint_7d'     // Priorização elevada na sprint atual (7 dias)
  | 'emergency_war_room_24h' // Escalação emergencial & War Room (< 24h)
  | 'custom_action';

export interface FairSeverityThresholdRule {
  severity: FairSeverityTier;
  label: string;
  thresholdUSD: number;
  channel: FairNotificationChannel;
  autoActionEnabled: boolean;
  actionType: FairAutomatedActionType;
  actionTitle: string;
  actionDescription: string;
  escalationRole: string;
  slaTargetHours: number;
  tagToApply: string;
}

export interface FairSeverityThresholdsConfig {
  enabled: boolean;
  tiers: Record<FairSeverityTier, FairSeverityThresholdRule>;
  updatedAt: string;
}

export const FAIR_ALERT_PREFS_STORAGE_KEY = 'fair_simulator_alert_preferences';
export const FAIR_INTERNAL_LOGS_STORAGE_KEY = 'fair_simulator_internal_audit_logs';
export const FAIR_INTERNAL_LOGS_EVENT = 'fair-internal-logs-updated';
export const FAIR_SEVERITY_THRESHOLDS_STORAGE_KEY = 'fair_simulator_severity_thresholds_config';
export const FAIR_SEVERITY_THRESHOLDS_EVENT = 'fair-severity-thresholds-updated';

export const DEFAULT_FAIR_SEVERITY_TIERS: Record<FairSeverityTier, FairSeverityThresholdRule> = {
  LOW: {
    severity: 'LOW',
    label: 'Baixo (CVSS 0.1 - 3.9)',
    thresholdUSD: 30000, // US$ 30,000 / ano
    channel: 'internal_log',
    autoActionEnabled: true,
    actionType: 'routine_backlog',
    actionTitle: 'Esteira de Manutenção de Rotina',
    actionDescription: 'Registrar achado no backlog para ciclo regular de correções de manutenção.',
    escalationRole: 'Equipe de Desenvolvimento & Manutenção',
    slaTargetHours: 720, // 30 dias
    tagToApply: 'FAIR-BACKLOG-ROUTINE'
  },
  MEDIUM: {
    severity: 'MEDIUM',
    label: 'Médio (CVSS 4.0 - 6.9)',
    thresholdUSD: 80000, // US$ 80,000 / ano
    channel: 'both',
    autoActionEnabled: true,
    actionType: 'standard_sla_30d',
    actionTitle: 'Remediação em SLA Padrão (30 Dias)',
    actionDescription: 'Avaliar controles compensatórios (WAF/ACLs) e agendar patch na próxima sprint.',
    escalationRole: 'Analista de AppSec & Tech Lead',
    slaTargetHours: 360, // 15 dias
    tagToApply: 'FAIR-MED-PRIORITY'
  },
  HIGH: {
    severity: 'HIGH',
    label: 'Alto (CVSS 7.0 - 8.9)',
    thresholdUSD: 200000, // US$ 200,000 / ano
    channel: 'both',
    autoActionEnabled: true,
    actionType: 'priority_sprint_7d',
    actionTitle: 'Priorização Elevada na Sprint Atual (7 Dias)',
    actionDescription: 'Mitigação rápida em até 7 dias, bloqueio de rota exposta e revisão arquitetural.',
    escalationRole: 'AppSec Lead & Engenheiro Sênior',
    slaTargetHours: 72, // 3 dias
    tagToApply: 'FAIR-HIGH-BREACH'
  },
  CRITICAL: {
    severity: 'CRITICAL',
    label: 'Crítico (CVSS 9.0 - 10.0)',
    thresholdUSD: 450000, // US$ 450,000 / ano
    channel: 'both',
    autoActionEnabled: true,
    actionType: 'emergency_war_room_24h',
    actionTitle: 'War Room Emergencial & Escalação Imediata (< 24h)',
    actionDescription: 'Abertura imediata de War Room emergencial com alerta ao CISO/Board e deploy prioritário de hotfix.',
    escalationRole: 'CISO, Incident Response & Core Tech Lead',
    slaTargetHours: 24, // 24 horas
    tagToApply: 'FAIR-CRIT-EMERGENCY'
  }
};

export const DEFAULT_FAIR_SEVERITY_THRESHOLDS_CONFIG: FairSeverityThresholdsConfig = {
  enabled: true,
  tiers: DEFAULT_FAIR_SEVERITY_TIERS,
  updatedAt: new Date().toISOString()
};

export interface FairRiskInternalLog {
  id: string;
  timestamp: string;
  reportId: string;
  reportTitle: string;
  target: string;
  severity: Severity;
  cvss: number;
  aro: number;
  sleUSD: number;
  aleUSD: number;
  thresholdUSD: number;
  exceededPercent: number;
  channelUsed: FairNotificationChannel;
  remediationRecommendation: string;
  status: 'UNREAD' | 'ACKNOWLEDGED';
  severityTier?: FairSeverityTier;
  actionTitle?: string;
  actionType?: FairAutomatedActionType;
  escalationRole?: string;
  slaTargetHours?: number;
  tagApplied?: string;
}

export interface FairRiskAlertPreferences {
  thresholdUSD: number;
  warningThresholdUSD?: number;
  alertsEnabled: boolean;
  channel: FairNotificationChannel; // 'toast' | 'internal_log' | 'both'
  autoDispatchOnBreach: boolean;
  corporatePreset?: 'conservative' | 'balanced' | 'high_tolerance' | 'custom';
  useSeverityThresholds?: boolean;
}

export const DEFAULT_FAIR_ALERT_PREFERENCES: FairRiskAlertPreferences = {
  thresholdUSD: 250000, // US$ 250,000 standard
  warningThresholdUSD: 100000, // US$ 100,000 warning
  alertsEnabled: true,
  channel: 'both', // Both Toast and Internal Log by default
  autoDispatchOnBreach: true,
  corporatePreset: 'balanced'
};

/**
 * Loads FAIR alert preferences from localStorage
 */
export function getFairRiskAlertPreferences(): FairRiskAlertPreferences {
  try {
    const raw = localStorage.getItem(FAIR_ALERT_PREFS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_FAIR_ALERT_PREFERENCES,
        ...parsed
      };
    }
    // Backward compatibility with previous keys
    const legacyThreshold = localStorage.getItem('fair_simulator_ale_alert_threshold');
    const legacyEnabled = localStorage.getItem('fair_simulator_ale_alerts_enabled');
    return {
      ...DEFAULT_FAIR_ALERT_PREFERENCES,
      thresholdUSD: legacyThreshold ? Number(legacyThreshold) : DEFAULT_FAIR_ALERT_PREFERENCES.thresholdUSD,
      alertsEnabled: legacyEnabled !== null ? legacyEnabled === 'true' : DEFAULT_FAIR_ALERT_PREFERENCES.alertsEnabled
    };
  } catch (err) {
    console.error('Error reading FAIR alert preferences:', err);
    return DEFAULT_FAIR_ALERT_PREFERENCES;
  }
}

/**
 * Saves FAIR alert preferences to localStorage
 */
export function saveFairRiskAlertPreferences(prefs: FairRiskAlertPreferences): void {
  try {
    localStorage.setItem(FAIR_ALERT_PREFS_STORAGE_KEY, JSON.stringify(prefs));
    // Sync legacy keys
    localStorage.setItem('fair_simulator_ale_alert_threshold', String(prefs.thresholdUSD));
    localStorage.setItem('fair_simulator_ale_alerts_enabled', String(prefs.alertsEnabled));
  } catch (err) {
    console.error('Error saving FAIR alert preferences:', err);
  }
}

/**
 * Loads internal FAIR risk logs from localStorage
 */
export function getFairRiskInternalLogs(): FairRiskInternalLog[] {
  try {
    const raw = localStorage.getItem(FAIR_INTERNAL_LOGS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading FAIR internal logs:', err);
  }
  return [];
}

/**
 * Saves internal FAIR risk logs to localStorage and emits an update event
 */
export function saveFairRiskInternalLogs(logs: FairRiskInternalLog[]): void {
  try {
    localStorage.setItem(FAIR_INTERNAL_LOGS_STORAGE_KEY, JSON.stringify(logs));
    window.dispatchEvent(new CustomEvent(FAIR_INTERNAL_LOGS_EVENT, { detail: logs }));
  } catch (err) {
    console.error('Error saving FAIR internal logs:', err);
  }
}

/**
 * Adds a new entry to the internal FAIR risk audit log
 */
export function addFairRiskInternalLog(
  log: Omit<FairRiskInternalLog, 'id' | 'timestamp' | 'status'>
): FairRiskInternalLog {
  const currentLogs = getFairRiskInternalLogs();
  const newEntry: FairRiskInternalLog = {
    ...log,
    id: `fair-log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    status: 'UNREAD'
  };

  // Keep up to 100 most recent logs
  const updatedLogs = [newEntry, ...currentLogs].slice(0, 100);
  saveFairRiskInternalLogs(updatedLogs);
  return newEntry;
}

/**
 * Updates status of an internal log entry (e.g. marked as ACKNOWLEDGED)
 */
export function acknowledgeFairRiskLog(id: string): void {
  const currentLogs = getFairRiskInternalLogs();
  const updated = currentLogs.map(log => log.id === id ? { ...log, status: 'ACKNOWLEDGED' as const } : log);
  saveFairRiskInternalLogs(updated);
}

/**
 * Clears all internal FAIR logs
 */
export function clearFairRiskInternalLogs(): void {
  saveFairRiskInternalLogs([]);
}

/**
 * Removes a specific internal log entry
 */
export function deleteFairRiskInternalLog(id: string): void {
  const currentLogs = getFairRiskInternalLogs();
  const updated = currentLogs.filter(log => log.id !== id);
  saveFairRiskInternalLogs(updated);
}

/**
 * Loads FAIR Severity Thresholds Config from localStorage
 */
export function getFairSeverityThresholdsConfig(): FairSeverityThresholdsConfig {
  try {
    const raw = localStorage.getItem(FAIR_SEVERITY_THRESHOLDS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_FAIR_SEVERITY_THRESHOLDS_CONFIG,
        ...parsed,
        tiers: {
          ...DEFAULT_FAIR_SEVERITY_TIERS,
          ...(parsed.tiers || {})
        }
      };
    }
  } catch (err) {
    console.error('Error reading FAIR severity thresholds config:', err);
  }
  return DEFAULT_FAIR_SEVERITY_THRESHOLDS_CONFIG;
}

/**
 * Saves FAIR Severity Thresholds Config to localStorage and emits an update event
 */
export function saveFairSeverityThresholdsConfig(config: FairSeverityThresholdsConfig): void {
  try {
    const toSave: FairSeverityThresholdsConfig = {
      ...config,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(FAIR_SEVERITY_THRESHOLDS_STORAGE_KEY, JSON.stringify(toSave));
    window.dispatchEvent(new CustomEvent(FAIR_SEVERITY_THRESHOLDS_EVENT, { detail: toSave }));
  } catch (err) {
    console.error('Error saving FAIR severity thresholds config:', err);
  }
}

/**
 * Maps report severity to FAIR severity tier (handling INFO as LOW)
 */
export function mapReportSeverityToTier(severity: Severity): FairSeverityTier {
  switch (severity) {
    case 'CRITICAL':
      return 'CRITICAL';
    case 'HIGH':
      return 'HIGH';
    case 'MEDIUM':
      return 'MEDIUM';
    case 'LOW':
    case 'INFO':
    default:
      return 'LOW';
  }
}

/**
 * Retrieves the effective rule for a given report severity
 */
export function getEffectiveSeverityRule(
  severity: Severity,
  config: FairSeverityThresholdsConfig = getFairSeverityThresholdsConfig()
): FairSeverityThresholdRule {
  const tier = mapReportSeverityToTier(severity);
  return config.tiers[tier] || DEFAULT_FAIR_SEVERITY_TIERS[tier];
}

export interface DispatchFairRiskAlertParams {
  report: VulnerabilityReport;
  aleUSD: number;
  aro: number;
  sleUSD: number;
  cvss: number;
  currency?: 'USD' | 'BRL';
  currencyMultiplier?: number;
  preferences: FairRiskAlertPreferences;
  severityConfig?: FairSeverityThresholdsConfig;
  onOpenReport?: (report: VulnerabilityReport) => void;
  forceManual?: boolean;
}

/**
 * Dispatches a FAIR Risk Breach Alert according to user configured preferences,
 * supporting multi-tier severity thresholds and differentiated automated actions:
 * - via Toast (if preference is 'toast' or 'both')
 * - via Internal Log (if preference is 'internal_log' or 'both')
 */
export function dispatchFairRiskAlert({
  report,
  aleUSD,
  aro,
  sleUSD,
  cvss,
  currency = 'USD',
  currencyMultiplier = 1,
  preferences,
  severityConfig = getFairSeverityThresholdsConfig(),
  onOpenReport,
  forceManual = false
}: DispatchFairRiskAlertParams): { dispatchedToast: boolean; dispatchedLog: boolean } {
  const { alertsEnabled } = preferences;

  if (!alertsEnabled && !forceManual) {
    return { dispatchedToast: false, dispatchedLog: false };
  }

  // Determine whether to use severity-specific rule or global threshold
  const useSeverityRule = severityConfig.enabled && (preferences.useSeverityThresholds !== false);
  const severityTier = mapReportSeverityToTier(report.severity);
  const severityRule = useSeverityRule ? (severityConfig.tiers[severityTier] || DEFAULT_FAIR_SEVERITY_TIERS[severityTier]) : null;

  const effectiveThresholdUSD = severityRule ? severityRule.thresholdUSD : preferences.thresholdUSD;
  const effectiveChannel = severityRule ? severityRule.channel : preferences.channel;

  const isBreached = aleUSD > effectiveThresholdUSD;
  if (!isBreached && !forceManual) {
    return { dispatchedToast: false, dispatchedLog: false };
  }

  const exceededPercent = Math.max(0, Math.round(((aleUSD - effectiveThresholdUSD) / effectiveThresholdUSD) * 100));

  // Build differentiated automated action recommendation
  const currencySymbol = currency === 'BRL' ? 'R$' : 'US$';
  const formattedAle = `${currencySymbol} ${Math.round(aleUSD * currencyMultiplier).toLocaleString()}`;
  const formattedThreshold = `${currencySymbol} ${Math.round(effectiveThresholdUSD * currencyMultiplier).toLocaleString()}`;

  let remediationRecommendation = '';
  if (severityRule && severityRule.autoActionEnabled) {
    remediationRecommendation = `[AÇÃO AUTOMÁTICA ${severityTier}] ${severityRule.actionTitle}: ${severityRule.actionDescription} | Responsável: ${severityRule.escalationRole} | SLA Alvo: ${severityRule.slaTargetHours}h | Tag: [${severityRule.tagToApply}]. O risco anualizado (${formattedAle}) excedeu o limiar da faixa ${severityTier} (${formattedThreshold}) em +${exceededPercent}%.`;
  } else {
    remediationRecommendation = `Priorizar imediata remediação e implantação de patch para o achado [${report.id}] (${report.title}). O risco anualizado (${formattedAle}) excede a tolerância máxima definida (${formattedThreshold}). Mitigar este vetor evitará até 95% do risco residual.`;
  }

  let dispatchedToast = false;
  let dispatchedLog = false;

  // 1. Toast Notification Channel
  if (effectiveChannel === 'toast' || effectiveChannel === 'both') {
    notifyFairAleBreach({
      reportTitle: report.title,
      reportId: report.id,
      ale: aleUSD * currencyMultiplier,
      threshold: effectiveThresholdUSD * currencyMultiplier,
      currency,
      cvss,
      aro,
      sle: sleUSD * currencyMultiplier,
      onOpenReport: () => {
        if (onOpenReport) onOpenReport(report);
      }
    });
    dispatchedToast = true;
  }

  // 2. Internal Log Audit Channel
  if (effectiveChannel === 'internal_log' || effectiveChannel === 'both') {
    addFairRiskInternalLog({
      reportId: report.id,
      reportTitle: report.title,
      target: report.target,
      severity: report.severity,
      cvss,
      aro,
      sleUSD,
      aleUSD,
      thresholdUSD: effectiveThresholdUSD,
      exceededPercent,
      channelUsed: effectiveChannel,
      remediationRecommendation,
      severityTier,
      actionTitle: severityRule?.actionTitle,
      actionType: severityRule?.actionType,
      escalationRole: severityRule?.escalationRole,
      slaTargetHours: severityRule?.slaTargetHours,
      tagApplied: severityRule?.tagToApply
    });
    dispatchedLog = true;
  }

  return { dispatchedToast, dispatchedLog };
}
