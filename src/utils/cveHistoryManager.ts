import { CVERecord, CveHistoryItem, CveHistoryAction } from '../types';

export const CVE_HISTORY_STORAGE_KEY = 'sentinel_cve_recent_history';
export const MAX_CVE_HISTORY_ITEMS = 5;

// Default initial CVE records to seed on first run for immediate responsiveness
export const DEFAULT_STARTER_CVES: CVERecord[] = [
  {
    id: "CVE-2024-21413",
    title: "Microsoft Outlook Remote Code Execution (Moniker Link)",
    cvss: 9.8,
    severity: "CRITICAL",
    cwe: "CWE-94",
    description: "Improper control of generation of code in Microsoft Outlook allows an unauthenticated remote attacker to execute arbitrary code via a crafted malicious link.",
    published: "2024-02-13",
    references: ["https://nvd.nist.gov/vuln/detail/CVE-2024-21413", "https://msrc.microsoft.com/update-guide/vulnerability/CVE-2024-21413"]
  },
  {
    id: "CVE-2024-3400",
    title: "Palo Alto Networks PAN-OS GlobalProtect Command Injection",
    cvss: 10.0,
    severity: "CRITICAL",
    cwe: "CWE-77",
    description: "Command injection vulnerability in GlobalProtect feature of PAN-OS software allows unauthenticated attacker to execute arbitrary code with root privileges.",
    published: "2024-04-12",
    references: ["https://nvd.nist.gov/vuln/detail/CVE-2024-3400"]
  },
  {
    id: "CVE-2023-46805",
    title: "Ivanti Connect Secure Web Authentication Bypass",
    cvss: 8.2,
    severity: "HIGH",
    cwe: "CWE-287",
    description: "An authentication bypass vulnerability in web components of Ivanti Connect Secure allows remote attackers to access restricted endpoints without authorization.",
    published: "2024-01-11",
    references: ["https://nvd.nist.gov/vuln/detail/CVE-2023-46805"]
  },
  {
    id: "CVE-2021-44228",
    title: "Apache Log4j2 JNDI Remote Code Execution (Log4Shell)",
    cvss: 10.0,
    severity: "CRITICAL",
    cwe: "CWE-502",
    description: "Apache Log4j2 JNDI features do not protect against attacker controlled LDAP endpoints, enabling remote code execution via log string interpolation.",
    published: "2021-12-10",
    references: ["https://nvd.nist.gov/vuln/detail/CVE-2021-44228"]
  },
  {
    id: "CVE-2023-4863",
    title: "libwebp Heap Buffer Overflow (Google Chrome / WebP)",
    cvss: 8.8,
    severity: "HIGH",
    cwe: "CWE-122",
    description: "Heap buffer overflow in libwebp in Google Chrome prior to 116.0.5845.187 allowed a remote attacker to perform out of bounds memory write via crafted WebP image.",
    published: "2023-09-12",
    references: ["https://nvd.nist.gov/vuln/detail/CVE-2023-4863"]
  }
];

/**
 * Initializes or loads the CVE history from localStorage.
 * If empty, seeds with 5 high-priority curated items with realistic actions and timestamps.
 */
export function getCveHistory(): CveHistoryItem[] {
  try {
    const raw = localStorage.getItem(CVE_HISTORY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, MAX_CVE_HISTORY_ITEMS);
      }
    }
  } catch (e) {
    console.warn('Failed to parse CVE history from storage, initializing defaults:', e);
  }

  // Seed with default initial history
  const now = Date.now();
  const initialHistory: CveHistoryItem[] = [
    {
      cveId: DEFAULT_STARTER_CVES[0].id,
      title: DEFAULT_STARTER_CVES[0].title,
      cvss: DEFAULT_STARTER_CVES[0].cvss,
      severity: DEFAULT_STARTER_CVES[0].severity,
      cwe: DEFAULT_STARTER_CVES[0].cwe,
      action: 'linked',
      timestamp: now - 1000 * 60 * 12, // 12 mins ago
      cveRecord: DEFAULT_STARTER_CVES[0]
    },
    {
      cveId: DEFAULT_STARTER_CVES[1].id,
      title: DEFAULT_STARTER_CVES[1].title,
      cvss: DEFAULT_STARTER_CVES[1].cvss,
      severity: DEFAULT_STARTER_CVES[1].severity,
      cwe: DEFAULT_STARTER_CVES[1].cwe,
      action: 'searched',
      timestamp: now - 1000 * 60 * 45, // 45 mins ago
      cveRecord: DEFAULT_STARTER_CVES[1]
    },
    {
      cveId: DEFAULT_STARTER_CVES[2].id,
      title: DEFAULT_STARTER_CVES[2].title,
      cvss: DEFAULT_STARTER_CVES[2].cvss,
      severity: DEFAULT_STARTER_CVES[2].severity,
      cwe: DEFAULT_STARTER_CVES[2].cwe,
      action: 'linked',
      timestamp: now - 1000 * 60 * 180, // 3 hours ago
      cveRecord: DEFAULT_STARTER_CVES[2]
    },
    {
      cveId: DEFAULT_STARTER_CVES[3].id,
      title: DEFAULT_STARTER_CVES[3].title,
      cvss: DEFAULT_STARTER_CVES[3].cvss,
      severity: DEFAULT_STARTER_CVES[3].severity,
      cwe: DEFAULT_STARTER_CVES[3].cwe,
      action: 'searched',
      timestamp: now - 1000 * 60 * 60 * 24, // 1 day ago
      cveRecord: DEFAULT_STARTER_CVES[3]
    },
    {
      cveId: DEFAULT_STARTER_CVES[4].id,
      title: DEFAULT_STARTER_CVES[4].title,
      cvss: DEFAULT_STARTER_CVES[4].cvss,
      severity: DEFAULT_STARTER_CVES[4].severity,
      cwe: DEFAULT_STARTER_CVES[4].cwe,
      action: 'searched',
      timestamp: now - 1000 * 60 * 60 * 48, // 2 days ago
      cveRecord: DEFAULT_STARTER_CVES[4]
    }
  ];

  try {
    localStorage.setItem(CVE_HISTORY_STORAGE_KEY, JSON.stringify(initialHistory));
  } catch (e) {
    console.warn('Failed to save seeded CVE history:', e);
  }

  return initialHistory;
}

/**
 * Records a CVE in history as either 'searched' or 'linked'.
 * Moves/adds the item to position 0 and caps the list to 5 items.
 */
export function recordCveHistory(cve: CVERecord, action: CveHistoryAction): CveHistoryItem[] {
  if (!cve || !cve.id) return getCveHistory();

  const current = getCveHistory();
  // Filter out existing record if present to avoid duplicates
  const filtered = current.filter(item => item.cveId !== cve.id);

  const newItem: CveHistoryItem = {
    cveId: cve.id,
    title: cve.title || cve.id,
    cvss: cve.cvss || 5.0,
    severity: cve.severity || 'MEDIUM',
    cwe: cve.cwe || 'CWE-Unknown',
    action,
    timestamp: Date.now(),
    cveRecord: cve
  };

  const updated = [newItem, ...filtered].slice(0, MAX_CVE_HISTORY_ITEMS);

  try {
    localStorage.setItem(CVE_HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to persist CVE history:', e);
  }

  return updated;
}

/**
 * Removes a specific CVE from history.
 */
export function removeCveHistoryItem(cveId: string): CveHistoryItem[] {
  const current = getCveHistory();
  const updated = current.filter(item => item.cveId !== cveId);

  try {
    localStorage.setItem(CVE_HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to persist CVE history after deletion:', e);
  }

  return updated;
}

/**
 * Clears the entire CVE history.
 */
export function clearCveHistory(): void {
  try {
    localStorage.removeItem(CVE_HISTORY_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear CVE history:', e);
  }
}

/**
 * Formats relative timestamp in human readable Portuguese.
 */
export function formatCveRelativeTime(timestamp: number): string {
  if (!timestamp) return 'recentemente';
  const elapsed = Math.max(0, Date.now() - timestamp);
  const seconds = Math.floor(elapsed / 1000);

  if (seconds < 60) return 'agora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ontem';
  if (days < 30) return `há ${days}d`;
  return new Date(timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
