// Central Store and Event Bus for OOB Collaborator Payload Interactions

export interface OobInteraction {
  id: string;
  timestamp: string; // ISO / UTC format
  protocol: 'DNS' | 'HTTP' | 'HTTPS' | 'LDAP' | 'SMTP';
  sourceIp: string;
  sourceReverseDns?: string;
  geoEstimate?: string;
  subdomainOrPath: string;
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'HEAD' | 'OPTIONS';
  queryParameters?: Record<string, string>;
  headers?: Record<string, string>;
  requestBody?: string;
  dataExfiltrated?: string;
  decodedData?: string;
  correlatedTag?: string;
  payloadType?: string;
  status?: 'verified' | 'exfiltrated' | 'blind_hit' | 'pingback';
}

const STORAGE_KEY = 'bugsentinel_oob_interactions_v1';
const EVENT_NAME = 'oob_interaction_updated';

export const INITIAL_OOB_INTERACTIONS: OobInteraction[] = [
  {
    id: 'int-001',
    timestamp: '2026-09-23 10:14:02 UTC',
    protocol: 'DNS',
    sourceIp: '198.51.100.44',
    sourceReverseDns: 'resolver.corp-outbound.net',
    geoEstimate: 'US (AWS us-east-1)',
    subdomainOrPath: '726f6f74.recon-rce.oob.bugsentinel.internal',
    dataExfiltrated: '726f6f74',
    decodedData: 'root (Hex decoded)',
    correlatedTag: 'recon-rce',
    payloadType: 'Blind RCE DNS Exfiltration',
    status: 'exfiltrated'
  },
  {
    id: 'int-002',
    timestamp: '2026-09-23 10:14:05 UTC',
    protocol: 'HTTP',
    sourceIp: '198.51.100.44',
    sourceReverseDns: 'nat-gateway.corp-outbound.net',
    geoEstimate: 'US (AWS us-east-1)',
    httpMethod: 'GET',
    subdomainOrPath: '/callback?token=sec92a&user=root&arch=x86_64',
    queryParameters: {
      token: 'sec92a',
      user: 'root',
      arch: 'x86_64'
    },
    headers: {
      'User-Agent': 'curl/8.4.0',
      'Host': 'recon-http.oob.bugsentinel.internal',
      'Accept': '*/*',
      'X-Forwarded-For': '10.0.12.55'
    },
    dataExfiltrated: 'user=root&arch=x86_64',
    decodedData: 'User: root | Arch: x86_64',
    correlatedTag: 'recon-http',
    payloadType: 'Blind SSRF Probe',
    status: 'verified'
  },
  {
    id: 'int-003',
    timestamp: '2026-09-23 10:15:30 UTC',
    protocol: 'HTTPS',
    sourceIp: '203.0.113.88',
    sourceReverseDns: 'webhook-worker.target-infra.cloud',
    geoEstimate: 'DE (Frankfurt)',
    httpMethod: 'POST',
    subdomainOrPath: '/api/v1/pingback?ref=ssrf-check',
    queryParameters: {
      ref: 'ssrf-check'
    },
    headers: {
      'User-Agent': 'Java/17.0.8 (Apache-HttpClient/4.5.14)',
      'Host': 'ssrf-webhook.oob.bugsentinel.internal',
      'Content-Type': 'application/json',
      'X-Originating-IP': '10.200.4.12'
    },
    requestBody: JSON.stringify({
      status: 'received',
      backendNode: 'internal-worker-03',
      iamRole: 'arn:aws:iam::123456789012:role/WorkerNodeRole'
    }, null, 2),
    dataExfiltrated: 'WorkerNodeRole',
    decodedData: 'IAM Role: WorkerNodeRole',
    correlatedTag: 'ssrf-webhook',
    payloadType: 'Cloud SSRF Webhook Callback',
    status: 'exfiltrated'
  },
  {
    id: 'int-004',
    timestamp: '2026-09-23 10:20:18 UTC',
    protocol: 'LDAP',
    sourceIp: '198.51.100.112',
    sourceReverseDns: 'app-srv-jvm01.corp.internal',
    geoEstimate: 'US (Azure Central)',
    subdomainOrPath: 'jndi:ldap://log4j-probe.oob.bugsentinel.internal/Exploit',
    dataExfiltrated: 'java:version=11.0.19',
    decodedData: 'Java 11.0.19 on Linux 5.15.0',
    correlatedTag: 'log4j-cve-2021-44228',
    payloadType: 'Log4j JNDI Lookup Callback',
    status: 'verified'
  },
  {
    id: 'int-005',
    timestamp: '2026-09-23 10:25:44 UTC',
    protocol: 'HTTP',
    sourceIp: '192.0.2.77',
    sourceReverseDns: 'admin-desktop.corp.internal',
    geoEstimate: 'GB (London Office)',
    httpMethod: 'GET',
    subdomainOrPath: '/xss-cookie?c=eyJhZG1pbiI6dHJ1ZSwic2Vzc2lvbiI6IjlhZjEzYjE5In0=',
    queryParameters: {
      c: 'eyJhZG1pbiI6dHJ1ZSwic2Vzc2lvbiI6IjlhZjEzYjE5In0='
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'Referer': 'https://admin.target-portal.com/reports/view?id=492',
      'Host': 'blind-xss.oob.bugsentinel.internal'
    },
    dataExfiltrated: '{"admin":true,"session":"9af13b19"}',
    decodedData: 'Admin Session Exfiltrated via Stored XSS',
    correlatedTag: 'blind-xss-admin',
    payloadType: 'Blind XSS Document Cookie Callback',
    status: 'exfiltrated'
  }
];

export function getOobInteractions(): OobInteraction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_OOB_INTERACTIONS));
      return INITIAL_OOB_INTERACTIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_OOB_INTERACTIONS;
  } catch (err) {
    console.error('Failed to read OOB interactions from localStorage:', err);
    return INITIAL_OOB_INTERACTIONS;
  }
}

export function saveOobInteractions(interactions: OobInteraction[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(interactions));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: interactions }));
  } catch (err) {
    console.error('Failed to save OOB interactions to localStorage:', err);
  }
}

export function addOobInteraction(interaction: OobInteraction): void {
  const current = getOobInteractions();
  // Avoid duplicates by ID
  const filtered = current.filter(item => item.id !== interaction.id);
  const updated = [interaction, ...filtered].slice(0, 100); // keep max 100 latest
  saveOobInteractions(updated);
}

export function deleteOobInteraction(id: string): void {
  const current = getOobInteractions();
  const updated = current.filter(item => item.id !== id);
  saveOobInteractions(updated);
}

export function clearOobInteractions(): void {
  saveOobInteractions([]);
}

export function resetOobInteractions(): void {
  saveOobInteractions(INITIAL_OOB_INTERACTIONS);
}

export function subscribeToOobInteractions(listener: (interactions: OobInteraction[]) => void): () => void {
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<OobInteraction[]>;
    if (customEvent.detail) {
      listener(customEvent.detail);
    } else {
      listener(getOobInteractions());
    }
  };

  window.addEventListener(EVENT_NAME, handler);
  // Also listen for storage event across tabs
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      listener(getOobInteractions());
    }
  };
  window.addEventListener('storage', storageHandler);

  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener('storage', storageHandler);
  };
}

export function simulateOobHit(
  type: 'DNS' | 'HTTP_GET' | 'HTTP_POST' | 'LDAP' | 'SMTP',
  domain: string = 'oob.bugsentinel.internal',
  tag: string = 'recon'
): OobInteraction {
  const now = new Date();
  const timeStr = `${now.toISOString().replace('T', ' ').substring(0, 19)} UTC`;
  const randIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;
  const timestampId = `int-${Date.now()}`;

  let newInt: OobInteraction;

  if (type === 'DNS') {
    const hexWord = ['61646d696e', '726f6f74', '6461746162617365', '736563726574'][Math.floor(Math.random() * 4)];
    const decodedWord = hexWord === '61646d696e' ? 'admin' : hexWord === '726f6f74' ? 'root' : hexWord === '6461746162617365' ? 'database' : 'secret';
    newInt = {
      id: timestampId,
      timestamp: timeStr,
      protocol: 'DNS',
      sourceIp: randIp,
      sourceReverseDns: `dns-resolver-${randIp.replace(/\./g, '-')}.edge.net`,
      geoEstimate: 'BR (São Paulo Edge)',
      subdomainOrPath: `exfil-${hexWord}.${tag}.${domain}`,
      dataExfiltrated: hexWord,
      decodedData: `${decodedWord} (Hex Decoded)`,
      correlatedTag: tag,
      payloadType: 'Blind DNS Query Callback',
      status: 'exfiltrated'
    };
  } else if (type === 'HTTP_GET') {
    newInt = {
      id: timestampId,
      timestamp: timeStr,
      protocol: 'HTTP',
      sourceIp: randIp,
      sourceReverseDns: `ip-${randIp.replace(/\./g, '-')}.compute.internal`,
      geoEstimate: 'US (AWS us-east-1)',
      httpMethod: 'GET',
      subdomainOrPath: `/callback?token=${Math.random().toString(36).substring(2, 8)}&status=live&env=production`,
      queryParameters: {
        token: Math.random().toString(36).substring(2, 8),
        status: 'live',
        env: 'production'
      },
      headers: {
        'User-Agent': 'Go-http-client/1.1 (AWS-Worker)',
        'Host': `${tag}.${domain}`,
        'Accept': '*/*',
        'X-Original-Forwarded-For': '10.42.1.89'
      },
      dataExfiltrated: 'env=production',
      decodedData: 'Environment: production confirmed',
      correlatedTag: tag,
      payloadType: 'Blind SSRF HTTP Callback',
      status: 'verified'
    };
  } else if (type === 'HTTP_POST') {
    newInt = {
      id: timestampId,
      timestamp: timeStr,
      protocol: 'HTTPS',
      sourceIp: randIp,
      sourceReverseDns: `webhook-${randIp.replace(/\./g, '-')}.cloudservices.net`,
      geoEstimate: 'EU (Frankfurt AWS)',
      httpMethod: 'POST',
      subdomainOrPath: '/api/v1/webhook-ping',
      queryParameters: {
        source: 'oob-verifier'
      },
      headers: {
        'User-Agent': 'Python/3.11 aiohttp/3.8.5',
        'Host': `${tag}.${domain}`,
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-oob-callback-token'
      },
      requestBody: JSON.stringify({
        event: 'exfiltration_test',
        timestamp: Date.now(),
        hostname: 'node-worker-99.internal',
        kernel: 'Linux 6.1.0-18-amd64',
        user: 'service_account_appsec'
      }, null, 2),
      dataExfiltrated: 'service_account_appsec',
      decodedData: 'Host: node-worker-99.internal | User: service_account_appsec',
      correlatedTag: tag,
      payloadType: 'HTTPS Webhook Payload Callback',
      status: 'exfiltrated'
    };
  } else if (type === 'LDAP') {
    newInt = {
      id: timestampId,
      timestamp: timeStr,
      protocol: 'LDAP',
      sourceIp: randIp,
      sourceReverseDns: `ldap-gateway-${randIp.replace(/\./g, '-')}.corp.internal`,
      geoEstimate: 'US (Virginia DC)',
      subdomainOrPath: `jndi:ldap://${tag}.${domain}/a`,
      dataExfiltrated: 'java:version=17.0.7',
      decodedData: 'JVM 17.0.7 (Oracle Corporation)',
      correlatedTag: tag,
      payloadType: 'JNDI / Log4j Lookup Interaction',
      status: 'verified'
    };
  } else {
    newInt = {
      id: timestampId,
      timestamp: timeStr,
      protocol: 'SMTP',
      sourceIp: randIp,
      sourceReverseDns: `mail-mta-${randIp.replace(/\./g, '-')}.relay.net`,
      geoEstimate: 'NL (Amsterdam Edge)',
      subdomainOrPath: `mail-inbound@${tag}.${domain}`,
      dataExfiltrated: 'EHLO victim-mail-server.internal',
      decodedData: 'Inbound MTA Relay Greeting',
      correlatedTag: tag,
      payloadType: 'Blind SMTP SSRF / Email Injection',
      status: 'pingback'
    };
  }

  addOobInteraction(newInt);
  return newInt;
}
