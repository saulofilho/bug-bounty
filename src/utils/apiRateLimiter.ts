/**
 * Platform Outbound API Rate Limiting & Usage Monitor
 * Tracks and visualizes external service API requests performed by the platform
 * (GitHub, Gemini AI, NIST NVD/CVE, HackerOne, Bugcrowd, Shodan, VirusTotal, Slack, Jira)
 */

export type ApiServiceId =
  | 'github'
  | 'gemini'
  | 'nvd_nist'
  | 'hackerone'
  | 'bugcrowd'
  | 'shodan'
  | 'virustotal'
  | 'slack'
  | 'jira';

export type ServiceCategory =
  | 'VCS & Issue Tracker'
  | 'AI Intelligence'
  | 'Vulnerability Catalog'
  | 'Bounty Platforms'
  | 'Recon & Threat Intel'
  | 'Integrations & Webhooks';

export interface ApiRateLimitHeaders {
  limit?: number;
  remaining?: number;
  reset?: number; // unix timestamp in seconds
  used?: number;
  resource?: string;
}

export interface ApiServiceQuota {
  id: ApiServiceId;
  name: string;
  category: ServiceCategory;
  description: string;
  docsUrl: string;
  limit: number;
  used: number;
  remaining: number;
  windowType: 'hour' | 'minute' | 'day' | '30s';
  windowSeconds: number;
  resetTimestamp: number; // unix timestamp ms
  authenticated: boolean;
  authType: string;
  rateLimitStatus: 'optimal' | 'moderate' | 'warning' | 'critical' | 'throttled';
  lastCallTimestamp?: string;
  totalCallsToday: number;
  totalCallsSession: number;
  averageLatencyMs: number;
  errorCount429: number;
  burstLimitPerSecond?: number;
  headers?: ApiRateLimitHeaders;
}

export interface ApiRequestLog {
  id: string;
  serviceId: ApiServiceId;
  serviceName: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  status: number;
  latencyMs: number;
  timestamp: string; // ISO string
  cost: number;
  responseSummary: string;
  isError: boolean;
  isThrottled: boolean;
}

const STORAGE_KEY_QUOTAS = 'bbm_platform_api_quotas_v1';
const STORAGE_KEY_LOGS = 'bbm_platform_api_logs_v1';
const STORAGE_KEY_SETTINGS = 'bbm_platform_api_settings_v1';

export const DEFAULT_SERVICE_QUOTAS: ApiServiceQuota[] = [
  {
    id: 'github',
    name: 'GitHub REST & GraphQL API',
    category: 'VCS & Issue Tracker',
    description: 'Sincronização de relatórios de vulnerabilidade como GitHub Issues, comentários, verificação de repositórios e status de pull requests.',
    docsUrl: 'https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting',
    limit: 5000,
    used: 148,
    remaining: 4852,
    windowType: 'hour',
    windowSeconds: 3600,
    resetTimestamp: Date.now() + 38 * 60 * 1000,
    authenticated: true,
    authType: 'Personal Access Token (PAT)',
    rateLimitStatus: 'optimal',
    lastCallTimestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    totalCallsToday: 326,
    totalCallsSession: 148,
    averageLatencyMs: 245,
    errorCount429: 0,
    burstLimitPerSecond: 10,
    headers: {
      limit: 5000,
      remaining: 4852,
      reset: Math.floor((Date.now() + 38 * 60 * 1000) / 1000),
      used: 148,
      resource: 'core'
    }
  },
  {
    id: 'gemini',
    name: 'Google Gemini AI (API v1beta)',
    category: 'AI Intelligence',
    description: 'Enriquecimento de relatórios de bug bounty, análise automática de vetores CVSS v3.1, geração de resumos executivos e inteligência de alvo.',
    docsUrl: 'https://ai.google.dev/pricing',
    limit: 360,
    used: 42,
    remaining: 318,
    windowType: 'minute',
    windowSeconds: 60,
    resetTimestamp: Date.now() + 42 * 1000,
    authenticated: true,
    authType: 'Gemini Server API Key (Tier Pay-As-You-Go / 360 RPM)',
    rateLimitStatus: 'optimal',
    lastCallTimestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    totalCallsToday: 184,
    totalCallsSession: 42,
    averageLatencyMs: 680,
    errorCount429: 0,
    burstLimitPerSecond: 6
  },
  {
    id: 'nvd_nist',
    name: 'NIST NVD / CVE Dictionary API',
    category: 'Vulnerability Catalog',
    description: 'Consulta em tempo real de vulnerabilidades no National Vulnerability Database, pontuações CVSS, EPSS e catálogo CISA KEV.',
    docsUrl: 'https://nvd.nist.gov/developers/start-here',
    limit: 50,
    used: 19,
    remaining: 31,
    windowType: '30s',
    windowSeconds: 30,
    resetTimestamp: Date.now() + 18 * 1000,
    authenticated: true,
    authType: 'NVD API Key (50 req/30s rolling window)',
    rateLimitStatus: 'moderate',
    lastCallTimestamp: new Date(Date.now() - 15 * 1000).toISOString(),
    totalCallsToday: 215,
    totalCallsSession: 19,
    averageLatencyMs: 410,
    errorCount429: 0,
    burstLimitPerSecond: 2
  },
  {
    id: 'hackerone',
    name: 'HackerOne Hacker Platform API',
    category: 'Bounty Platforms',
    description: 'Despacho de submissões de relatórios de vulnerabilidade, sincronização de status de triagem, pagamentos de recompensa e escopo de ativos.',
    docsUrl: 'https://api.hackerone.com/core-resources/#rate-limits',
    limit: 600,
    used: 64,
    remaining: 536,
    windowType: 'minute',
    windowSeconds: 60,
    resetTimestamp: Date.now() + 52 * 1000,
    authenticated: true,
    authType: 'HackerOne API Token & Identifier',
    rateLimitStatus: 'optimal',
    lastCallTimestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    totalCallsToday: 112,
    totalCallsSession: 64,
    averageLatencyMs: 380,
    errorCount429: 0,
    burstLimitPerSecond: 10
  },
  {
    id: 'bugcrowd',
    name: 'Bugcrowd Crowdcontrol API',
    category: 'Bounty Platforms',
    description: 'Submissão de vulnerabilidades a programas privados do Bugcrowd, consultas de recompensas e estatísticas de aceitação de relatórios.',
    docsUrl: 'https://docs.bugcrowd.com/api',
    limit: 300,
    used: 28,
    remaining: 272,
    windowType: 'minute',
    windowSeconds: 60,
    resetTimestamp: Date.now() + 35 * 1000,
    authenticated: true,
    authType: 'Bugcrowd Researcher Bearer Token',
    rateLimitStatus: 'optimal',
    lastCallTimestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    totalCallsToday: 58,
    totalCallsSession: 28,
    averageLatencyMs: 320,
    errorCount429: 0,
    burstLimitPerSecond: 5
  },
  {
    id: 'shodan',
    name: 'Shodan Recon & Host Inspection API',
    category: 'Recon & Threat Intel',
    description: 'Inspeção de portas abertas, banners de serviço, banners TLS e vulnerabilidades conhecidas em ativos sob teste de escopo.',
    docsUrl: 'https://developer.shodan.io/api/requirements',
    limit: 60,
    used: 22,
    remaining: 38,
    windowType: 'minute',
    windowSeconds: 60,
    resetTimestamp: Date.now() + 29 * 1000,
    authenticated: true,
    authType: 'Shodan API Key (1 req/sec cadence)',
    rateLimitStatus: 'moderate',
    lastCallTimestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    totalCallsToday: 95,
    totalCallsSession: 22,
    averageLatencyMs: 510,
    errorCount429: 0,
    burstLimitPerSecond: 1
  },
  {
    id: 'virustotal',
    name: 'VirusTotal Threat Intelligence API',
    category: 'Recon & Threat Intel',
    description: 'Validação de hashes de binários maliciosos em PoCs, reputação de domínios maliciosos e análise estática de anexos.',
    docsUrl: 'https://developers.virustotal.com/reference/rate-limits',
    limit: 240, // 4 req/min, 240 req/hour
    used: 18,
    remaining: 222,
    windowType: 'hour',
    windowSeconds: 3600,
    resetTimestamp: Date.now() + 45 * 60 * 1000,
    authenticated: true,
    authType: 'VirusTotal Public API Key (4 req/min, 500 req/day)',
    rateLimitStatus: 'optimal',
    lastCallTimestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    totalCallsToday: 35,
    totalCallsSession: 18,
    averageLatencyMs: 440,
    errorCount429: 0,
    burstLimitPerSecond: 1
  },
  {
    id: 'slack',
    name: 'Slack / Discord Triage Webhooks',
    category: 'Integrations & Webhooks',
    description: 'Disparo de alertas em tempo real de novas vulnerabilidades críticas, atualizações de status de triagem e notificações de payout.',
    docsUrl: 'https://api.slack.com/docs/rate-limits',
    limit: 60,
    used: 8,
    remaining: 52,
    windowType: 'minute',
    windowSeconds: 60,
    resetTimestamp: Date.now() + 15 * 1000,
    authenticated: true,
    authType: 'Incoming Webhook URL (1 req/sec)',
    rateLimitStatus: 'optimal',
    lastCallTimestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    totalCallsToday: 24,
    totalCallsSession: 8,
    averageLatencyMs: 180,
    errorCount429: 0,
    burstLimitPerSecond: 1
  },
  {
    id: 'jira',
    name: 'Atlassian Jira Enterprise API',
    category: 'VCS & Issue Tracker',
    description: 'Criação de tickets de segurança de engenharia (SEC-Bug), acompanhamento de SLA de remediação e sincronização bidirecional de status.',
    docsUrl: 'https://developer.atlassian.com/cloud/jira/platform/rate-limiting/',
    limit: 100,
    used: 14,
    remaining: 86,
    windowType: 'minute',
    windowSeconds: 60,
    resetTimestamp: Date.now() + 33 * 1000,
    authenticated: true,
    authType: 'Atlassian API Token + Scoped User',
    rateLimitStatus: 'optimal',
    lastCallTimestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    totalCallsToday: 41,
    totalCallsSession: 14,
    averageLatencyMs: 290,
    errorCount429: 0,
    burstLimitPerSecond: 5
  }
];

export const INITIAL_SAMPLE_LOGS: ApiRequestLog[] = [
  {
    id: 'log-gh-1',
    serviceId: 'github',
    serviceName: 'GitHub REST API',
    endpoint: '/repos/finpay-global/billing-api/issues',
    method: 'POST',
    status: 201,
    latencyMs: 238,
    timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    cost: 1,
    responseSummary: 'Issue #89 criada com sucesso com labels [security, critical]',
    isError: false,
    isThrottled: false
  },
  {
    id: 'log-gem-1',
    serviceId: 'gemini',
    serviceName: 'Google Gemini AI',
    endpoint: '/api/gemini/analyze-cvss',
    method: 'POST',
    status: 200,
    latencyMs: 640,
    timestamp: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
    cost: 1,
    responseSummary: 'Cálculo de vetor CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H (Score: 9.8)',
    isError: false,
    isThrottled: false
  },
  {
    id: 'log-nvd-1',
    serviceId: 'nvd_nist',
    serviceName: 'NIST NVD / CVE API',
    endpoint: '/api/cve/search?q=CVE-2024-21413',
    method: 'GET',
    status: 200,
    latencyMs: 395,
    timestamp: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    cost: 1,
    responseSummary: 'CVE-2024-21413 recuperado do catálogo NVD (CVSS: 9.8)',
    isError: false,
    isThrottled: false
  },
  {
    id: 'log-gh-2',
    serviceId: 'github',
    serviceName: 'GitHub REST API',
    endpoint: '/rate_limit',
    method: 'GET',
    status: 200,
    latencyMs: 142,
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    cost: 0, // rate_limit endpoint does not consume quota
    responseSummary: 'Verificação de limites: 4852 de 5000 requisições disponíveis no core',
    isError: false,
    isThrottled: false
  },
  {
    id: 'log-h1-1',
    serviceId: 'hackerone',
    serviceName: 'HackerOne API',
    endpoint: '/v1/hackers/reports/2189034',
    method: 'GET',
    status: 200,
    latencyMs: 310,
    timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    cost: 1,
    responseSummary: 'Status sincronizado: Triaged (Recompensa de $3,500 atribuída)',
    isError: false,
    isThrottled: false
  },
  {
    id: 'log-shod-1',
    serviceId: 'shodan',
    serviceName: 'Shodan Recon API',
    endpoint: '/shodan/host/198.51.100.24',
    method: 'GET',
    status: 200,
    latencyMs: 520,
    timestamp: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    cost: 1,
    responseSummary: 'Portas abertas identificadas: 80, 443, 8080 (Apache Tomcat 9.0.45)',
    isError: false,
    isThrottled: false
  },
  {
    id: 'log-slack-1',
    serviceId: 'slack',
    serviceName: 'Slack Webhook',
    endpoint: '/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
    method: 'POST',
    status: 200,
    latencyMs: 175,
    timestamp: new Date(Date.now() - 34 * 60 * 1000).toISOString(),
    cost: 1,
    responseSummary: 'Alerta de vulnerabilidade CRITICAL enviado para o canal #security-ops',
    isError: false,
    isThrottled: false
  },
  {
    id: 'log-gem-2',
    serviceId: 'gemini',
    serviceName: 'Google Gemini AI',
    endpoint: '/api/gemini/enhance-report',
    method: 'POST',
    status: 200,
    latencyMs: 720,
    timestamp: new Date(Date.now() - 41 * 60 * 1000).toISOString(),
    cost: 1,
    responseSummary: 'Relatório enriquecido com passos de reprodução e remediação',
    isError: false,
    isThrottled: false
  },
  {
    id: 'log-gh-3',
    serviceId: 'github',
    serviceName: 'GitHub REST API',
    endpoint: '/user',
    method: 'GET',
    status: 200,
    latencyMs: 220,
    timestamp: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    cost: 1,
    responseSummary: 'Token autenticado como usuário GitHub com escopos [repo, read:org]',
    isError: false,
    isThrottled: false
  }
];

/**
 * Load stored API quotas from localStorage with fallback
 */
export function getStoredServiceQuotas(): ApiServiceQuota[] {
  if (typeof window === 'undefined') return DEFAULT_SERVICE_QUOTAS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUOTAS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_QUOTAS, JSON.stringify(DEFAULT_SERVICE_QUOTAS));
      return DEFAULT_SERVICE_QUOTAS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Merge with default to ensure all service IDs exist
      const existingIds = new Set(parsed.map((p: any) => p.id));
      const merged = [...parsed];
      for (const def of DEFAULT_SERVICE_QUOTAS) {
        if (!existingIds.has(def.id)) {
          merged.push(def);
        }
      }
      return merged;
    }
    return DEFAULT_SERVICE_QUOTAS;
  } catch (err) {
    console.error('Failed reading api quotas from localStorage:', err);
    return DEFAULT_SERVICE_QUOTAS;
  }
}

/**
 * Save updated API quotas to localStorage
 */
export function saveServiceQuotas(quotas: ApiServiceQuota[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_QUOTAS, JSON.stringify(quotas));
  } catch (err) {
    console.error('Failed saving api quotas to localStorage:', err);
  }
}

/**
 * Load stored request logs from localStorage with fallback
 */
export function getStoredRequestLogs(): ApiRequestLog[] {
  if (typeof window === 'undefined') return INITIAL_SAMPLE_LOGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(INITIAL_SAMPLE_LOGS));
      return INITIAL_SAMPLE_LOGS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_SAMPLE_LOGS;
  } catch (err) {
    console.error('Failed reading api logs from localStorage:', err);
    return INITIAL_SAMPLE_LOGS;
  }
}

/**
 * Save request logs to localStorage (caps at 150 items for storage efficiency)
 */
export function saveRequestLogs(logs: ApiRequestLog[]): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = logs.slice(0, 150);
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed saving api logs to localStorage:', err);
  }
}

/**
 * Record a platform outbound API request
 */
export function recordPlatformApiCall(
  call: Omit<ApiRequestLog, 'id' | 'timestamp'>
): ApiRequestLog {
  const newLog: ApiRequestLog = {
    ...call,
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString()
  };

  if (typeof window !== 'undefined') {
    try {
      // 1. Update Logs
      const existingLogs = getStoredRequestLogs();
      const updatedLogs = [newLog, ...existingLogs].slice(0, 150);
      saveRequestLogs(updatedLogs);

      // 2. Update Quota for this service
      const quotas = getStoredServiceQuotas();
      const updatedQuotas = quotas.map((quota) => {
        if (quota.id === call.serviceId) {
          const used = quota.used + (call.cost || 1);
          const remaining = Math.max(0, quota.limit - used);
          const percentUsed = (used / quota.limit) * 100;

          let status: ApiServiceQuota['rateLimitStatus'] = 'optimal';
          if (call.status === 429 || remaining <= 0) {
            status = 'throttled';
          } else if (percentUsed >= 95) {
            status = 'critical';
          } else if (percentUsed >= 80) {
            status = 'warning';
          } else if (percentUsed >= 50) {
            status = 'moderate';
          }

          return {
            ...quota,
            used,
            remaining,
            rateLimitStatus: status,
            lastCallTimestamp: newLog.timestamp,
            totalCallsToday: quota.totalCallsToday + (call.cost || 1),
            totalCallsSession: quota.totalCallsSession + (call.cost || 1),
            errorCount429: call.status === 429 ? quota.errorCount429 + 1 : quota.errorCount429,
            averageLatencyMs: Math.round((quota.averageLatencyMs * 4 + call.latencyMs) / 5)
          };
        }
        return quota;
      });

      saveServiceQuotas(updatedQuotas);

      // Dispatch custom window event so any listening UI updates in real time
      window.dispatchEvent(
        new CustomEvent('platform-api-call-recorded', {
          detail: { log: newLog, quotas: updatedQuotas }
        })
      );
    } catch (err) {
      console.error('Error recording API call:', err);
    }
  }

  return newLog;
}

/**
 * Fetch live GitHub Rate Limit info from GitHub's official endpoint:
 * GET https://api.github.com/rate_limit
 * This endpoint NEVER consumes rate limit quota.
 */
export async function fetchLiveGitHubRateLimit(token?: string): Promise<{
  success: boolean;
  limit?: number;
  remaining?: number;
  reset?: number; // unix timestamp
  used?: number;
  resource?: string;
  authenticated?: boolean;
  message?: string;
}> {
  const authToken =
    token ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('bbm_github_pat_token') || ''
      : '');

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json'
  };

  if (authToken.trim()) {
    headers.Authorization = `Bearer ${authToken.trim()}`;
  }

  try {
    const startTime = performance.now();
    const res = await fetch('https://api.github.com/rate_limit', { headers });
    const latency = Math.round(performance.now() - startTime);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        message: err.message || `HTTP ${res.status}: Falha ao consultar rate limit do GitHub`
      };
    }

    const data = await res.json();
    const core = data.resources?.core || data.rate;

    // Log the check (cost: 0)
    recordPlatformApiCall({
      serviceId: 'github',
      serviceName: 'GitHub REST API',
      endpoint: '/rate_limit',
      method: 'GET',
      status: res.status,
      latencyMs: latency,
      cost: 0,
      responseSummary: `Live Rate Limit verificado: ${core.remaining} de ${core.limit} restantes (Reset em ${new Date(core.reset * 1000).toLocaleTimeString()})`,
      isError: false,
      isThrottled: false
    });

    return {
      success: true,
      limit: core.limit,
      remaining: core.remaining,
      reset: core.reset,
      used: core.used !== undefined ? core.used : core.limit - core.remaining,
      resource: 'core',
      authenticated: Boolean(authToken.trim()),
      message: 'Taxa obtida diretamente dos servidores do GitHub.'
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Erro de rede ao conectar à API do GitHub.'
    };
  }
}
