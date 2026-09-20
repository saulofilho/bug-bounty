// Issue Tracker Exporter & PoC Generator Engine
// Produces formatted tickets for Jira, GitHub, GitLab and PoC scripts in cURL, Python & Raw HTTP

import { VulnerabilityReport } from '../types';

export interface GeneratedIssueFormat {
  title: string;
  body: string;
  labels: string[];
}

export function generateJiraIssue(report: VulnerabilityReport): GeneratedIssueFormat {
  const stepsText = Array.isArray(report.stepsToReproduce) ? report.stepsToReproduce.join('\n') : (report.stepsToReproduce || '1. Access target endpoint\n2. Supply test payload\n3. Observe unauthorized behavior');
  const title = `[SEC] ${report.severity}: ${report.title} (${report.platform || 'App'})`;
  const body = `h2. Vulnerability Overview
* *Report ID:* ${report.id}
* *Severity:* ${report.severity}
* *CVSS Vector:* ${report.cvssVector || 'N/A'}
* *Target / Asset:* ${report.target || 'N/A'}
* *Platform:* ${report.platform || 'N/A'}
* *Reported Date:* ${report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'N/A'}

h2. Technical Description
${report.summary || 'No description provided.'}

h2. Impact Assessment
${report.businessImpact || 'Confidentiality, Integrity or Availability compromise.'}

h2. Remediation Recommendations
${report.remediation || 'Apply input validation, strict access control and sanitize outputs.'}

h2. Steps to Reproduce
${stepsText}

----
_Generated automatically via Bug Bounty & DevSecOps Platform_`;

  return {
    title,
    body,
    labels: ['security', `severity-${report.severity.toLowerCase()}`, 'appsec', report.platform.toLowerCase()]
  };
}

export function generateGitHubIssue(report: VulnerabilityReport): GeneratedIssueFormat {
  const stepsText = Array.isArray(report.stepsToReproduce) ? report.stepsToReproduce.join('\n') : (report.stepsToReproduce || '1. Access affected route\n2. Inject PoC payload\n3. Verify response');
  const title = `[Security] ${report.severity}: ${report.title}`;
  const body = `### 🛡️ Security Vulnerability Report

| Field | Value |
|---|---|
| **ID** | \`${report.id}\` |
| **Severity** | **${report.severity}** |
| **CVSS Vector** | \`${report.cvssVector || 'N/A'}\` |
| **Target** | \`${report.target}\` |
| **Platform** | ${report.platform || 'Bug Bounty'} |

---

### 📝 Description
${report.summary || 'No description provided.'}

---

### 💥 Impact
${report.businessImpact || 'Impact details pending.'}

---

### 🧪 Steps to Reproduce
\`\`\`text
${stepsText}
\`\`\`

---

### 🛠️ Suggested Remediation
${report.remediation || 'Implement safe coding practices and validate user inputs.'}

---

### 📋 DevSecOps Checklist
- [ ] Reproduce vulnerability in local/staging environment
- [ ] Write failing integration test case
- [ ] Implement code fix / patch
- [ ] Perform peer review and security verification
- [ ] Deploy fix to production & notify reporter`;

  return {
    title,
    body,
    labels: ['security', 'vulnerability', report.severity.toLowerCase()]
  };
}

export function generateGitLabIssue(report: VulnerabilityReport): GeneratedIssueFormat {
  const stepsText = Array.isArray(report.stepsToReproduce) ? report.stepsToReproduce.join('\n') : (report.stepsToReproduce || '1. Reproduce finding');
  const title = `Security: ${report.severity} - ${report.title}`;
  const body = `/confidential
## Security Issue Report: ${report.title}

* **Asset:** \`${report.target}\`
* **Severity:** **${report.severity}**
* **CVSS:** \`${report.cvssVector || 'N/A'}\`

### Summary
${report.summary || 'N/A'}

### Impact
${report.businessImpact || 'N/A'}

### Reproduction Steps
${stepsText}

### Fix Strategy
${report.remediation || 'N/A'}

/label ~security ~"severity::${report.severity.toLowerCase()}"`;

  return {
    title,
    body,
    labels: ['security', report.severity.toLowerCase()]
  };
}

export interface PocBuilderInput {
  targetUrl: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers: Record<string, string>;
  queryParams?: Record<string, string>;
  bodyPayload?: string;
  bodyType: 'json' | 'form' | 'raw' | 'xml';
}

export function generateCurlCommand(input: PocBuilderInput): string {
  const { targetUrl, method, headers, queryParams, bodyPayload, bodyType } = input;

  let url = targetUrl || 'https://example.com/api/v1/endpoint';
  if (queryParams && Object.keys(queryParams).length > 0) {
    const qs = new URLSearchParams(queryParams).toString();
    url += (url.includes('?') ? '&' : '?') + qs;
  }

  const lines: string[] = [`curl -i -s -k -X ${method} "${url}"`];

  for (const [key, val] of Object.entries(headers)) {
    if (key.trim() && val.trim()) {
      lines.push(`  -H "${key.trim()}: ${val.trim()}"`);
    }
  }

  if (method !== 'GET' && bodyPayload && bodyPayload.trim()) {
    if (bodyType === 'json') {
      lines.push(`  -H "Content-Type: application/json"`);
      lines.push(`  -d '${bodyPayload.replace(/'/g, "'\\''")}'`);
    } else if (bodyType === 'form') {
      lines.push(`  -H "Content-Type: application/x-www-form-urlencoded"`);
      lines.push(`  -d '${bodyPayload}'`);
    } else {
      lines.push(`  -d '${bodyPayload.replace(/'/g, "'\\''")}'`);
    }
  }

  return lines.join(' \\\n');
}

export function generatePythonScript(input: PocBuilderInput): string {
  const { targetUrl, method, headers, queryParams, bodyPayload, bodyType } = input;

  return `#!/usr/bin/env python3
"""
Exploit Proof-of-Concept (PoC) Script
Target: ${targetUrl}
Method: ${method}
"""
import requests
import json
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

URL = "${targetUrl}"
HEADERS = ${JSON.stringify(headers, null, 4)}
PARAMS = ${JSON.stringify(queryParams || {}, null, 4)}

${method !== 'GET' && bodyPayload ? (bodyType === 'json' ? `PAYLOAD = ${bodyPayload}` : `DATA = """${bodyPayload}"""`) : ''}

def run_exploit():
    print(f"[*] Dispatching ${method} request to: {URL}")
    session = requests.Session()
    
    response = session.request(
        method="${method}",
        url=URL,
        headers=HEADERS,
        params=PARAMS,
        ${method !== 'GET' && bodyPayload ? (bodyType === 'json' ? 'json=PAYLOAD,' : 'data=DATA,') : ''}
        verify=False,
        timeout=10
    )
    
    print(f"[+] Status Code: {response.status_code}")
    print(f"[+] Response Length: {len(response.text)} bytes")
    print("[*] Headers Received:")
    for k, v in response.headers.items():
        print(f"    {k}: {v}")
    print("\\n[*] Response Body (First 500 chars):")
    print(response.text[:500])

if __name__ == "__main__":
    run_exploit()
`;
}

export function generateRawHttp(input: PocBuilderInput): string {
  const { targetUrl, method, headers, bodyPayload } = input;

  let path = '/';
  let host = 'example.com';
  try {
    const parsed = new URL(targetUrl);
    path = parsed.pathname + parsed.search;
    host = parsed.host;
  } catch {
    // fallback
  }

  const lines: string[] = [
    `${method} ${path} HTTP/1.1`,
    `Host: ${host}`,
    `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)`,
    `Accept: */*`
  ];

  for (const [k, v] of Object.entries(headers)) {
    lines.push(`${k}: ${v}`);
  }

  if (method !== 'GET' && bodyPayload) {
    lines.push(`Content-Length: ${bodyPayload.length}`);
    lines.push('');
    lines.push(bodyPayload);
  } else {
    lines.push('');
  }

  return lines.join('\r\n');
}
