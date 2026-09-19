import { VulnerabilityReport, ReportStatus, Severity, MockEmailNotification, NotificationTriggerType } from '../types';
import { formatCurrency } from './formatters';

export interface NotificationSettings {
  ownerEmail: string;
  ownerName: string;
  autoEmailOnCritical: boolean;
  autoEmailOnBounty: boolean;
  autoEmailOnStatusChange: boolean;
  soundAlert: boolean;
  simulatedInboxDelayMs: number;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  ownerEmail: 'oisaulofilho@gmail.com',
  ownerName: 'Saulo Filho (Lead Security Researcher)',
  autoEmailOnCritical: true,
  autoEmailOnBounty: true,
  autoEmailOnStatusChange: true,
  soundAlert: false,
  simulatedInboxDelayMs: 600
};

const STORAGE_KEY_EMAILS = 'bugsentinel_mock_email_notifications_v1';
const STORAGE_KEY_SETTINGS = 'bugsentinel_notification_settings_v1';
const STORAGE_KEY_SNAPSHOT = 'bugsentinel_reports_status_snapshot_v1';

export interface ReportStateSnapshot {
  id: string;
  status: ReportStatus;
  bountyAmount: number;
  severity: Severity;
  cvssScore: number;
  updatedAt: string;
}

export function getNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) {
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to read notification settings:', e);
  }
  return DEFAULT_NOTIFICATION_SETTINGS;
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save notification settings:', e);
  }
}

export function getStoredMockEmails(): MockEmailNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EMAILS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read stored mock emails:', e);
  }
  return getInitialMockEmails();
}

export function saveStoredMockEmails(emails: MockEmailNotification[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_EMAILS, JSON.stringify(emails));
  } catch (e) {
    console.error('Failed to save mock emails:', e);
  }
}

export function getReportsSnapshot(): Record<string, ReportStateSnapshot> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SNAPSHOT);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to read reports snapshot:', e);
  }
  return {};
}

export function saveReportsSnapshot(snapshot: Record<string, ReportStateSnapshot>): void {
  try {
    localStorage.setItem(STORAGE_KEY_SNAPSHOT, JSON.stringify(snapshot));
  } catch (e) {
    console.error('Failed to save reports snapshot:', e);
  }
}

/**
 * Creates rich HTML email body for mock notifications
 */
export function buildMockEmailHtml(params: {
  report: VulnerabilityReport;
  triggerType: NotificationTriggerType;
  recipientName: string;
  recipientEmail: string;
  statusFrom?: ReportStatus;
  statusTo?: ReportStatus;
  bountyOld?: number;
  bountyNew?: number;
  timestamp: string;
}): string {
  const { report, triggerType, recipientName, recipientEmail, statusFrom, statusTo, bountyOld = 0, bountyNew = report.bountyAmount, timestamp } = params;
  
  const isCritical = triggerType === 'critical_validated' || report.severity === 'CRITICAL';
  const isBounty = triggerType === 'bounty_updated';

  const headerAccentColor = isCritical 
    ? '#e11d48' 
    : isBounty 
      ? '#10b981' 
      : '#6366f1';

  const badgeTitle = isCritical
    ? '🚨 VULNERABILIDADE CRÍTICA VALIDADA'
    : isBounty
      ? '💰 RECOMPENSA DE BOUNTY ATUALIZADA'
      : '🔄 ATUALIZAÇÃO DE STATUS DO RELATÓRIO';

  const calloutHeadline = isCritical
    ? `A validação do achado crítico "${report.title}" foi confirmada pela equipe de triagem!`
    : isBounty
      ? `Uma nova bonificação de ${formatCurrency(bountyNew, report.currency)} foi processada com sucesso!`
      : `O relatório ${report.id} avançou no fluxo de triagem e resposta a incidentes.`;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${badgeTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0c0d12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; line-height: 1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0c0d12; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Container Box -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 620px; background-color: #12141c; border: 1px solid #232738; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
          
          <!-- Top Classification Bar -->
          <tr>
            <td style="background-color: #08090d; padding: 10px 24px; border-bottom: 1px solid #1e2230; font-family: monospace; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between;">
              <span style="color: ${headerAccentColor}; font-weight: bold; letter-spacing: 1px;">TLP:AMBER+STRICT // ENCRIPTADO</span>
              <span style="color: #64748b;">REF: ${report.id}</span>
            </td>
          </tr>

          <!-- Brand Header -->
          <tr>
            <td style="padding: 24px 28px; background: linear-gradient(180deg, #161a26 0%, #12141c 100%); border-bottom: 2px solid ${headerAccentColor};">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <div style="background-color: ${headerAccentColor}; color: #ffffff; width: 32px; height: 32px; border-radius: 8px; font-weight: 800; font-size: 18px; line-height: 32px; text-align: center; display: inline-block;">Σ</div>
                      <span style="font-size: 18px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; vertical-align: middle; margin-left: 8px;">BugSentinel <span style="font-size: 12px; color: #94a3b8; font-weight: normal;">Security Ops</span></span>
                    </div>
                  </td>
                  <td align="right">
                    <span style="background-color: rgba(255,255,255,0.06); border: 1px solid #334155; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; color: #cbd5e1; font-family: monospace;">
                      ${report.platform}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 28px;">
              
              <!-- Event Badge -->
              <div style="display: inline-block; padding: 6px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; background-color: ${headerAccentColor}25; color: ${headerAccentColor}; border: 1px solid ${headerAccentColor}50; margin-bottom: 16px; font-family: monospace;">
                ${badgeTitle}
              </div>

              <!-- Greeting -->
              <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #f8fafc; letter-spacing: -0.3px;">
                Olá, ${recipientName}
              </h2>
              
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
                ${calloutHeadline}
              </p>

              <!-- Highlight Callout Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0b0d13; border: 1px solid #1f2433; border-radius: 8px; margin-bottom: 24px; padding: 18px;">
                <tr>
                  <td>
                    <table width="100%" cellpadding="6" cellspacing="0" border="0" style="font-size: 13px;">
                      <tr>
                        <td width="35%" style="color: #64748b; font-family: monospace; font-size: 11px; text-transform: uppercase;">ID do Relatório:</td>
                        <td style="color: #f1f5f9; font-weight: 700; font-family: monospace;">${report.id}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-family: monospace; font-size: 11px; text-transform: uppercase;">Alvo Afetado:</td>
                        <td style="color: #38bdf8; font-weight: 600; font-family: monospace;">${report.target}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-family: monospace; font-size: 11px; text-transform: uppercase;">Gravidade CVSS:</td>
                        <td>
                          <span style="background-color: ${report.severity === 'CRITICAL' ? '#e11d48' : '#f59e0b'}; color: #ffffff; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 800; font-family: monospace;">
                            ${report.severity} (${report.cvssScore.toFixed(1)})
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-family: monospace; font-size: 11px; text-transform: uppercase;">Tipo / Fraqueza:</td>
                        <td style="color: #e2e8f0;">${report.vulnerabilityType} (${report.cwe || 'CWE N/A'})</td>
                      </tr>
                      ${statusFrom && statusTo ? `
                      <tr>
                        <td style="color: #64748b; font-family: monospace; font-size: 11px; text-transform: uppercase;">Transição de Status:</td>
                        <td style="color: #a78bfa; font-family: monospace; font-weight: 700;">
                          ${statusFrom} &rarr; <span style="color: #34d399;">${statusTo}</span>
                        </td>
                      </tr>
                      ` : ''}
                      ${bountyNew > 0 ? `
                      <tr>
                        <td style="color: #64748b; font-family: monospace; font-size: 11px; text-transform: uppercase;">Bounty Concedido:</td>
                        <td style="color: #10b981; font-weight: 800; font-size: 16px; font-family: monospace;">
                          ${formatCurrency(bountyNew, report.currency)}
                          ${bountyOld > 0 && bountyOld !== bountyNew ? `<span style="font-size: 11px; color: #64748b; text-decoration: line-through; margin-left: 6px;">${formatCurrency(bountyOld, report.currency)}</span>` : ''}
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Vulnerability Summary Snippet -->
              <div style="background-color: #161822; border-left: 3px solid ${headerAccentColor}; padding: 14px 16px; border-radius: 4px; margin-bottom: 24px;">
                <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-bottom: 4px; font-family: monospace;">Resumo Técnico Validado</div>
                <div style="font-size: 13px; color: #cbd5e1; line-height: 1.5;">${report.summary || 'Vulnerabilidade submetida com passos de reprodução e prova de conceito anexados.'}</div>
              </div>

              <!-- Next Steps for Reporter -->
              <p style="font-size: 13px; color: #94a3b8; margin-bottom: 24px; line-height: 1.6;">
                ${isCritical 
                  ? 'Como esta falha foi classificada como Crítica, o time de engenharia iniciou o plano de contenção e mitigação de emergência. Seu relatório foi registrado nos logs de auditoria criptográfica.' 
                  : isBounty
                    ? 'O pagamento do bounty foi emitido e refletido no seu painel de controle. Você pode auditar o histórico na aba de Métricas Financeiras.'
                    : 'Acompanhe as próximas interações do triador através do canal seguro ou diretamente no dashboard.'}
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; padding: 12px 0 20px 0;">
                <a href="#/report/${report.id}" style="display: inline-block; background-color: ${headerAccentColor}; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 12px 28px; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 14px ${headerAccentColor}40;">
                  Inspecionar Relatório no BugSentinel
                </a>
              </div>

              <div style="font-size: 11px; color: #64748b; text-align: center;">
                Enviado para <strong style="color: #94a3b8;">${recipientEmail}</strong> às ${new Date(timestamp).toLocaleString('pt-BR')}
              </div>

            </td>
          </tr>

          <!-- Security Footer -->
          <tr>
            <td style="padding: 20px 28px; background-color: #090a0e; border-top: 1px solid #1a1e2b; font-size: 11px; color: #64748b; line-height: 1.5;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="font-weight: 700; color: #94a3b8; margin-bottom: 4px;">BugSentinel Automated Security Dispatcher</div>
                    <div>Este e-mail é uma notificação simulada de demonstração gerada pelo motor de eventos do BugSentinel.</div>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="color: #34d399; font-family: monospace; font-size: 10px;">SPF: PASS // DKIM: PASS</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Creates plaintext RFC-like email representation
 */
export function buildMockEmailPlaintext(params: {
  report: VulnerabilityReport;
  triggerType: NotificationTriggerType;
  recipientName: string;
  recipientEmail: string;
  sender: string;
  subject: string;
  statusFrom?: ReportStatus;
  statusTo?: ReportStatus;
  bountyOld?: number;
  bountyNew?: number;
  timestamp: string;
}): string {
  const { report, triggerType, recipientName, recipientEmail, sender, subject, statusFrom, statusTo, bountyOld = 0, bountyNew = report.bountyAmount, timestamp } = params;

  return `
From: ${sender}
To: ${recipientName} <${recipientEmail}>
Date: ${new Date(timestamp).toUTCString()}
Subject: ${subject}
Message-ID: <msg-${Date.now()}.${report.id}@bugsentinel.sec>
X-BugSentinel-Report-ID: ${report.id}
X-BugSentinel-Severity: ${report.severity}
X-BugSentinel-CVSS: ${report.cvssScore}
X-BugSentinel-Event: ${triggerType}
Content-Type: text/plain; charset=UTF-8

Prezado(a) ${recipientName},

Notificação de segurança oficial do BugSentinel Ops.

DETALHES DO EVENTO:
=====================================================
Tipo de Evento: ${triggerType.toUpperCase()}
ID do Relatório: ${report.id}
Alvo: ${report.target}
Plataforma: ${report.platform}
Gravidade: ${report.severity} (CVSS ${report.cvssScore.toFixed(1)})
Vulnerabilidade: ${report.vulnerabilityType}
${statusFrom && statusTo ? `Mudança de Status: ${statusFrom} -> ${statusTo}\n` : ''}${bountyNew > 0 ? `Bounty Creditado: ${formatCurrency(bountyNew, report.currency)}${bountyOld > 0 ? ` (Anterior: ${formatCurrency(bountyOld, report.currency)})` : ''}\n` : ''}
RESUMO DO ACHADO:
-----------------------------------------------------
${report.summary || 'Vulnerabilidade submetida com passos de reprodução e prova de conceito anexados.'}

PASSOS PARA O PESQUISADOR:
-----------------------------------------------------
Acesse a plataforma BugSentinel para acompanhar o status da mitigação e registros de timeline criptográfica.

Link Seguro: https://bugsentinel.sec/reports/${report.id}

--
BugSentinel Automated Dispatch
Security Operations & Bounty Engine
Cryptographic Signature: PGP/ED25519 VERIFIED
  `.trim();
}

/**
 * Generates initial mock emails for instant demonstration
 */
export function getInitialMockEmails(): MockEmailNotification[] {
  const now = new Date();
  const d1 = new Date(now.getTime() - 25 * 60 * 1000).toISOString(); // 25 min ago
  const d2 = new Date(now.getTime() - 3 * 3600 * 1000).toISOString(); // 3 hours ago
  const d3 = new Date(now.getTime() - 24 * 3600 * 1000).toISOString(); // 1 day ago

  const settings = getNotificationSettings();

  const report1: VulnerabilityReport = {
    id: "REP-2024-001",
    title: "Broken Object Level Authorization (IDOR) em /api/v2/invoices/{id} expõe faturas",
    target: "api.finpay-global.com",
    platform: "HackerOne",
    vulnerabilityType: "IDOR / BOLA",
    severity: "CRITICAL",
    status: "REWARDED",
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
    cvssScore: 9.1,
    cwe: "CWE-639",
    cveIds: [],
    summary: "O endpoint de recuperação de faturas não valida autorização de tenant.",
    stepsToReproduce: ["1. Login A", "2. Request invoice B"],
    proofOfConcept: "GET /api/v2/invoices/9924-ac12 HTTP/1.1",
    businessImpact: "Vazamento maciço de dados financeiros",
    remediation: "Validar tenant_id no backend",
    bountyAmount: 3500,
    currency: "USD",
    createdAt: d3,
    updatedAt: d1,
    timeline: []
  };

  const report2: VulnerabilityReport = {
    id: "REP-2024-002",
    title: "Remote Code Execution (RCE) via Unauthenticated File Upload em /admin/upload.php",
    target: "portal.healthcloud.med.br",
    platform: "Bugcrowd",
    vulnerabilityType: "Remote Code Execution",
    severity: "CRITICAL",
    status: "TRIAGED",
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H",
    cvssScore: 10.0,
    cwe: "CWE-434",
    cveIds: ["CVE-2024-3400"],
    summary: "Upload irrestrito permite gravação de webshell em diretório público com execução sob www-data.",
    stepsToReproduce: ["1. POST /admin/upload.php com shell.php5", "2. Acessar webshell"],
    proofOfConcept: "POST /admin/upload.php\nContent-Type: multipart/form-data...",
    businessImpact: "Comprometimento total do host e acesso ao banco de dados de pacientes.",
    remediation: "Desativar uploads php e isolar storage em bucket S3 estático.",
    bountyAmount: 0,
    currency: "USD",
    createdAt: d2,
    updatedAt: d2,
    timeline: []
  };

  const email1: MockEmailNotification = {
    id: "notif-mock-bounty-3500",
    reportId: report1.id,
    reportTitle: report1.title,
    reportTarget: report1.target,
    reportSeverity: report1.severity,
    reportCvss: report1.cvssScore,
    reportStatus: report1.status,
    type: 'bounty_updated',
    recipientEmail: settings.ownerEmail,
    recipientName: settings.ownerName,
    sender: 'BugSentinel Finance Ops <rewards@bugsentinel.sec>',
    subject: `[BOUNTY AWARDED] $3,500 USD Bounty Updated for ${report1.target} (${report1.id})`,
    previewText: `Recompensa de $3,500 USD aprovada pelo programa FinPay Global após mitigação da falha crítica de IDOR.`,
    sentAt: d1,
    read: false,
    bountyOld: 0,
    bountyNew: 3500,
    currency: 'USD',
    statusFrom: 'TRIAGED',
    statusTo: 'REWARDED',
    emailHtml: buildMockEmailHtml({
      report: report1,
      triggerType: 'bounty_updated',
      recipientName: settings.ownerName,
      recipientEmail: settings.ownerEmail,
      statusFrom: 'TRIAGED',
      statusTo: 'REWARDED',
      bountyOld: 0,
      bountyNew: 3500,
      timestamp: d1
    }),
    emailPlaintext: buildMockEmailPlaintext({
      report: report1,
      triggerType: 'bounty_updated',
      recipientName: settings.ownerName,
      recipientEmail: settings.ownerEmail,
      sender: 'BugSentinel Finance Ops <rewards@bugsentinel.sec>',
      subject: `[BOUNTY AWARDED] $3,500 USD Bounty Updated for ${report1.target} (${report1.id})`,
      statusFrom: 'TRIAGED',
      statusTo: 'REWARDED',
      bountyOld: 0,
      bountyNew: 3500,
      timestamp: d1
    })
  };

  const email2: MockEmailNotification = {
    id: "notif-mock-critical-rce-validated",
    reportId: report2.id,
    reportTitle: report2.title,
    reportTarget: report2.target,
    reportSeverity: report2.severity,
    reportCvss: report2.cvssScore,
    reportStatus: report2.status,
    type: 'critical_validated',
    recipientEmail: settings.ownerEmail,
    recipientName: settings.ownerName,
    sender: 'BugSentinel Security Triage <triage@bugsentinel.sec>',
    subject: `[TRIAGE VALIDATED] Critical Security Finding Verified: ${report2.id} (CVSS 10.0 RCE)`,
    previewText: `Triador confirmou a reprodução do achado de RCE com score CVSS 10.0. Status atualizado para TRIAGED.`,
    sentAt: d2,
    read: false,
    bountyOld: 0,
    bountyNew: 0,
    currency: 'USD',
    statusFrom: 'SUBMITTED',
    statusTo: 'TRIAGED',
    emailHtml: buildMockEmailHtml({
      report: report2,
      triggerType: 'critical_validated',
      recipientName: settings.ownerName,
      recipientEmail: settings.ownerEmail,
      statusFrom: 'SUBMITTED',
      statusTo: 'TRIAGED',
      bountyOld: 0,
      bountyNew: 0,
      timestamp: d2
    }),
    emailPlaintext: buildMockEmailPlaintext({
      report: report2,
      triggerType: 'critical_validated',
      recipientName: settings.ownerName,
      recipientEmail: settings.ownerEmail,
      sender: 'BugSentinel Security Triage <triage@bugsentinel.sec>',
      subject: `[TRIAGE VALIDATED] Critical Security Finding Verified: ${report2.id} (CVSS 10.0 RCE)`,
      statusFrom: 'SUBMITTED',
      statusTo: 'TRIAGED',
      bountyOld: 0,
      bountyNew: 0,
      timestamp: d2
    })
  };

  return [email1, email2];
}

/**
 * Creates and dispatches a new mock email notification
 */
export function dispatchMockEmailNotification(params: {
  report: VulnerabilityReport;
  triggerType: NotificationTriggerType;
  statusFrom?: ReportStatus;
  statusTo?: ReportStatus;
  bountyOld?: number;
  bountyNew?: number;
  customRecipientEmail?: string;
  customRecipientName?: string;
}): MockEmailNotification {
  const settings = getNotificationSettings();
  const timestamp = new Date().toISOString();

  const recipientEmail = params.customRecipientEmail 
    || params.report.reportOwnerEmail 
    || settings.ownerEmail;

  const recipientName = params.customRecipientName 
    || params.report.reportOwnerName 
    || settings.ownerName;

  let sender = 'BugSentinel Notifications <notifications@bugsentinel.sec>';
  let subject = '';
  let previewText = '';

  const { report, triggerType, statusFrom, statusTo, bountyOld = 0, bountyNew = report.bountyAmount } = params;

  if (triggerType === 'critical_validated') {
    sender = 'BugSentinel Security Triage <triage@bugsentinel.sec>';
    subject = `[TRIAGE VALIDATED] Critical Security Finding Verified: ${report.id} - ${report.title.slice(0, 45)}... (CVSS ${report.cvssScore.toFixed(1)})`;
    previewText = `A equipe de segurança validou o achado crítico no alvo ${report.target}. Status avançou para ${statusTo || report.status}.`;
  } else if (triggerType === 'bounty_updated') {
    sender = 'BugSentinel Finance & Payouts <rewards@bugsentinel.sec>';
    subject = `[BOUNTY AWARDED] ${formatCurrency(bountyNew, report.currency)} Bounty Updated for ${report.target} (${report.id})`;
    previewText = `Uma nova bonificação de ${formatCurrency(bountyNew, report.currency)} foi creditada para o relatório ${report.id}.`;
  } else {
    sender = 'BugSentinel Status Dispatcher <status-bot@bugsentinel.sec>';
    subject = `[STATUS UPDATE] Report ${report.id} transitioned to ${statusTo || report.status}`;
    previewText = `O status do relatório foi alterado de ${statusFrom || 'N/A'} para ${statusTo || report.status}.`;
  }

  const emailHtml = buildMockEmailHtml({
    report,
    triggerType,
    recipientName,
    recipientEmail,
    statusFrom,
    statusTo,
    bountyOld,
    bountyNew,
    timestamp
  });

  const emailPlaintext = buildMockEmailPlaintext({
    report,
    triggerType,
    recipientName,
    recipientEmail,
    sender,
    subject,
    statusFrom,
    statusTo,
    bountyOld,
    bountyNew,
    timestamp
  });

  const newEmail: MockEmailNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    reportId: report.id,
    reportTitle: report.title,
    reportTarget: report.target,
    reportSeverity: report.severity,
    reportCvss: report.cvssScore,
    reportStatus: statusTo || report.status,
    type: triggerType,
    recipientEmail,
    recipientName,
    sender,
    subject,
    previewText,
    sentAt: timestamp,
    read: false,
    statusFrom,
    statusTo: statusTo || report.status,
    bountyOld,
    bountyNew,
    currency: report.currency,
    emailHtml,
    emailPlaintext
  };

  const existing = getStoredMockEmails();
  const updated = [newEmail, ...existing];
  saveStoredMockEmails(updated);

  return newEmail;
}

/**
 * Checks report collection against previous snapshot and automatically
 * sends mock emails if:
 * 1. A critical vulnerability is validated (status changed to TRIAGED/RESOLVED/REWARDED)
 * 2. A bounty is updated (amount changed)
 * 3. Status changed
 */
export function checkReportsStateChanges(
  currentReports: VulnerabilityReport[],
  options?: {
    customOwnerEmail?: string;
    customOwnerName?: string;
  }
): {
  newEmails: MockEmailNotification[];
  updatedSnapshot: Record<string, ReportStateSnapshot>;
} {
  const settings = getNotificationSettings();
  const prevSnapshot = getReportsSnapshot();
  const newSnapshot: Record<string, ReportStateSnapshot> = {};
  const newEmails: MockEmailNotification[] = [];

  currentReports.forEach(report => {
    const prev = prevSnapshot[report.id];

    // Store in current snapshot
    newSnapshot[report.id] = {
      id: report.id,
      status: report.status,
      bountyAmount: report.bountyAmount || 0,
      severity: report.severity,
      cvssScore: report.cvssScore || 0,
      updatedAt: report.updatedAt
    };

    if (prev) {
      const statusChanged = prev.status !== report.status;
      const bountyChanged = prev.bountyAmount !== report.bountyAmount;
      const isCritical = report.severity === 'CRITICAL' || report.cvssScore >= 9.0;
      const isValidatedStatus = report.status === 'TRIAGED' || report.status === 'RESOLVED' || report.status === 'REWARDED';

      // 1. Critical Vulnerability Validated:
      // When severity is critical and status changed to TRIAGED / RESOLVED / REWARDED
      if (statusChanged && isCritical && isValidatedStatus && settings.autoEmailOnCritical) {
        const notif = dispatchMockEmailNotification({
          report,
          triggerType: 'critical_validated',
          statusFrom: prev.status,
          statusTo: report.status,
          bountyOld: prev.bountyAmount,
          bountyNew: report.bountyAmount,
          customRecipientEmail: options?.customOwnerEmail,
          customRecipientName: options?.customOwnerName
        });
        newEmails.push(notif);
      }

      // 2. Bounty Updated:
      // When bountyAmount changed (and autoEmailOnBounty enabled)
      if (bountyChanged && settings.autoEmailOnBounty) {
        const notif = dispatchMockEmailNotification({
          report,
          triggerType: 'bounty_updated',
          statusFrom: prev.status,
          statusTo: report.status,
          bountyOld: prev.bountyAmount,
          bountyNew: report.bountyAmount,
          customRecipientEmail: options?.customOwnerEmail,
          customRecipientName: options?.customOwnerName
        });
        newEmails.push(notif);
      }

      // 3. Other status change (if not critical or if general status change tracking enabled)
      if (statusChanged && !isCritical && settings.autoEmailOnStatusChange) {
        const notif = dispatchMockEmailNotification({
          report,
          triggerType: 'status_change',
          statusFrom: prev.status,
          statusTo: report.status,
          bountyOld: prev.bountyAmount,
          bountyNew: report.bountyAmount,
          customRecipientEmail: options?.customOwnerEmail,
          customRecipientName: options?.customOwnerName
        });
        newEmails.push(notif);
      }
    }
  });

  saveReportsSnapshot(newSnapshot);

  return { newEmails, updatedSnapshot: newSnapshot };
}
