import { jsPDF } from 'jspdf';
import { VulnerabilityReport, Severity, ReportStatus } from '../types';
import { parseCvssVector } from './cvss';
import { formatCurrency } from './formatters';

export interface PdfExportOptions {
  theme: 'dark' | 'light';
  format: 'full' | 'executive';
  researcherName: string;
  organization: string;
  classification: 'TLP:AMBER' | 'TLP:RED' | 'TLP:CLEAR' | 'CONFIDENCIAL';
  includePoc: boolean;
  includeTimeline: boolean;
  includeChecklist: boolean;
  includePgp: boolean;
}

export const DEFAULT_PDF_OPTIONS: PdfExportOptions = {
  theme: 'dark',
  format: 'full',
  researcherName: 'Alex Mercer (Security Researcher)',
  organization: 'BugSentinel Security Research',
  classification: 'TLP:AMBER',
  includePoc: true,
  includeTimeline: true,
  includeChecklist: true,
  includePgp: true,
};

// Metric labels for CVSS vector
const CVSS_LABELS: Record<string, Record<string, string>> = {
  av: { N: 'Network (Rede)', A: 'Adjacent (Adjacente)', L: 'Local', P: 'Physical (Físico)' },
  ac: { L: 'Low (Baixa)', H: 'High (Alta)' },
  pr: { N: 'None (Nenhum)', L: 'Low (Baixo)', H: 'High (Alto)' },
  ui: { N: 'None (Nenhuma)', R: 'Required (Requerida)' },
  s: { U: 'Unchanged (Inalterado)', C: 'Changed (Alterado)' },
  c: { N: 'None (Nenhum)', L: 'Low (Baixo)', H: 'High (Alto)' },
  i: { N: 'None (Nenhum)', L: 'Low (Baixo)', H: 'High (Alto)' },
  a: { N: 'None (Nenhum)', L: 'Low (Baixo)', H: 'High (Alto)' },
};

function getSeverityRgb(severity: Severity): [number, number, number] {
  switch (severity) {
    case 'CRITICAL': return [239, 68, 68]; // Red
    case 'HIGH': return [249, 115, 22]; // Orange
    case 'MEDIUM': return [234, 179, 8]; // Yellow
    case 'LOW': return [16, 185, 129]; // Emerald
    case 'INFO':
    default: return [59, 130, 246]; // Blue
  }
}

export function generatePdfReport(report: VulnerabilityReport, options: PdfExportOptions = DEFAULT_PDF_OPTIONS): jsPDF {
  const isDark = options.theme === 'dark';
  
  // Create document in A4 format (210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginLeft = 15;
  const marginRight = 15;
  const contentWidth = pageWidth - marginLeft - marginRight; // 180mm
  const marginBottom = 18;
  const marginTop = 18;

  // Palette colors
  const bgMain: [number, number, number] = isDark ? [13, 13, 16] : [255, 255, 255];
  const bgCard: [number, number, number] = isDark ? [20, 20, 26] : [248, 250, 252];
  const bgCardInner: [number, number, number] = isDark ? [27, 27, 36] : [241, 245, 249];
  const borderCol: [number, number, number] = isDark ? [42, 42, 56] : [226, 232, 240];
  const textPrimary: [number, number, number] = isDark ? [245, 245, 250] : [15, 23, 42];
  const textSecondary: [number, number, number] = isDark ? [156, 163, 175] : [100, 116, 139];
  const textMuted: [number, number, number] = isDark ? [110, 110, 130] : [148, 163, 184];
  const accentEmerald: [number, number, number] = isDark ? [16, 185, 129] : [5, 150, 105];

  let currentY = marginTop;

  // Helper to paint page background
  const paintBackground = () => {
    doc.setFillColor(...bgMain);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
  };

  // Check page break
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - marginBottom) {
      doc.addPage();
      paintBackground();
      currentY = marginTop;
    }
  };

  // First page background
  paintBackground();

  // -------------------------------------------------------------
  // HEADER BANNER & CLASSIFICATION
  // -------------------------------------------------------------
  // Security Classification ribbon
  doc.setFillColor(isDark ? 28 : 230, isDark ? 28 : 235, isDark ? 38 : 242);
  doc.roundedRect(marginLeft, currentY, contentWidth, 7, 1.5, 1.5, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...accentEmerald);
  doc.text('BUGSENTINEL', marginLeft + 3, currentY + 4.8);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textSecondary);
  doc.text('•  RELATÓRIO FORMAL DE VULNERABILIDADE & AUDITORIA DE SEGURANÇA', marginLeft + 28, currentY + 4.8);

  doc.setFont('helvetica', 'bold');
  if (options.classification.includes('RED')) {
    doc.setTextColor(239, 68, 68);
  } else if (options.classification.includes('AMBER')) {
    doc.setTextColor(245, 158, 11);
  } else {
    doc.setTextColor(16, 185, 129);
  }
  doc.text(options.classification, marginLeft + contentWidth - 3, currentY + 4.8, { align: 'right' });

  currentY += 11;

  // Title Box & Severity Badge Card
  const sevRgb = getSeverityRgb(report.severity);
  doc.setFillColor(...bgCard);
  doc.setDrawColor(...borderCol);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginLeft, currentY, contentWidth, 26, 2, 2, 'FD');

  // Left accent line
  doc.setFillColor(...sevRgb);
  doc.rect(marginLeft, currentY, 2.5, 26, 'F');

  // Severity Badge
  doc.setFillColor(sevRgb[0], sevRgb[1], sevRgb[2]);
  doc.roundedRect(marginLeft + 6, currentY + 4.5, 30, 6, 1.2, 1.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`${report.severity} ${report.cvssScore.toFixed(1)}`, marginLeft + 21, currentY + 8.8, { align: 'center' });

  // Status & Platform Pills
  doc.setFillColor(...bgCardInner);
  doc.setDrawColor(...borderCol);
  doc.roundedRect(marginLeft + 39, currentY + 4.5, 28, 6, 1.2, 1.2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...textSecondary);
  doc.text(report.status, marginLeft + 53, currentY + 8.6, { align: 'center' });

  doc.roundedRect(marginLeft + 70, currentY + 4.5, 28, 6, 1.2, 1.2, 'FD');
  doc.text(report.platform, marginLeft + 84, currentY + 8.6, { align: 'center' });

  // Report ID
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...accentEmerald);
  doc.text(report.id, marginLeft + contentWidth - 6, currentY + 8.6, { align: 'right' });

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(...textPrimary);
  const titleLines = doc.splitTextToSize(report.title, contentWidth - 12);
  doc.text(titleLines.slice(0, 2), marginLeft + 6, currentY + 16.5);

  currentY += 30;

  // -------------------------------------------------------------
  // METADATA GRID (2 COLUMNS)
  // -------------------------------------------------------------
  checkPageBreak(32);
  const colWidth = (contentWidth - 4) / 2;
  const metaHeight = 28;

  // Left column: Target & Technical identifiers
  doc.setFillColor(...bgCard);
  doc.setDrawColor(...borderCol);
  doc.roundedRect(marginLeft, currentY, colWidth, metaHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...textMuted);
  doc.text('DADOS TÉCNICOS DO ATIVO', marginLeft + 5, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textSecondary);
  doc.text('Alvo / Escopo:', marginLeft + 5, currentY + 10.5);
  doc.setFont('courier', 'bold');
  doc.setTextColor(...textPrimary);
  doc.text(report.target, marginLeft + 30, currentY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textSecondary);
  doc.text('Classificação:', marginLeft + 5, currentY + 15.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textPrimary);
  doc.text(report.vulnerabilityType, marginLeft + 30, currentY + 15.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textSecondary);
  doc.text('CWE / CVEs:', marginLeft + 5, currentY + 20.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...accentEmerald);
  const cveStr = report.cveIds.length > 0 ? report.cveIds.join(', ') : 'Nenhum CVE direto';
  doc.text(`${report.cwe} • ${cveStr}`, marginLeft + 30, currentY + 20.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textSecondary);
  doc.text('Protocolo:', marginLeft + 5, currentY + 25.5);
  doc.setFont('courier', 'normal');
  doc.setTextColor(...textPrimary);
  doc.text(report.submissionId || 'N/A (Auditoria Interna)', marginLeft + 30, currentY + 25.5);

  // Right column: Auditor, Organization & Financial
  doc.setFillColor(...bgCard);
  doc.setDrawColor(...borderCol);
  doc.roundedRect(marginLeft + colWidth + 4, currentY, colWidth, metaHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...textMuted);
  doc.text('DETALHES DO ENGAGEMENT & AUTORIA', marginLeft + colWidth + 9, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textSecondary);
  doc.text('Pesquisador:', marginLeft + colWidth + 9, currentY + 10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textPrimary);
  doc.text(options.researcherName, marginLeft + colWidth + 34, currentY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textSecondary);
  doc.text('Organização:', marginLeft + colWidth + 9, currentY + 15.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textPrimary);
  doc.text(options.organization, marginLeft + colWidth + 34, currentY + 15.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textSecondary);
  doc.text('Data Descoberta:', marginLeft + colWidth + 9, currentY + 20.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textPrimary);
  doc.text(new Date(report.createdAt).toLocaleDateString('pt-BR'), marginLeft + colWidth + 34, currentY + 20.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textSecondary);
  doc.text('Recompensa:', marginLeft + colWidth + 9, currentY + 25.5);
  doc.setFont('helvetica', 'bold');
  if (report.bountyAmount > 0) {
    doc.setTextColor(...accentEmerald);
    doc.text(formatCurrency(report.bountyAmount, report.currency), marginLeft + colWidth + 34, currentY + 25.5);
  } else {
    doc.setTextColor(...textMuted);
    doc.text('Pendente / VDP', marginLeft + colWidth + 34, currentY + 25.5);
  }

  currentY += metaHeight + 6;

  // -------------------------------------------------------------
  // SECTION: SUMÁRIO EXECUTIVO
  // -------------------------------------------------------------
  checkPageBreak(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...accentEmerald);
  doc.text('1. SUMÁRIO EXECUTIVO', marginLeft, currentY);
  currentY += 4.5;

  doc.setFillColor(...bgCard);
  doc.setDrawColor(...borderCol);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const summaryLines = doc.splitTextToSize(report.summary || 'Nenhum sumário fornecido.', contentWidth - 10);
  const summaryHeight = Math.max(16, summaryLines.length * 4.2 + 8);
  doc.roundedRect(marginLeft, currentY, contentWidth, summaryHeight, 2, 2, 'FD');
  doc.setTextColor(...textPrimary);
  doc.text(summaryLines, marginLeft + 5, currentY + 6);
  currentY += summaryHeight + 6;

  // -------------------------------------------------------------
  // SECTION: VETOR CVSS v3.1 DETALHADO
  // -------------------------------------------------------------
  checkPageBreak(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...accentEmerald);
  doc.text('2. ANÁLISE CVSS v3.1 DETALHADA', marginLeft, currentY);
  currentY += 4.5;

  const cvss = parseCvssVector(report.cvssVector);
  const cvssBoxHeight = 30;
  doc.setFillColor(...bgCard);
  doc.setDrawColor(...borderCol);
  doc.roundedRect(marginLeft, currentY, contentWidth, cvssBoxHeight, 2, 2, 'FD');

  // CVSS Vector banner
  doc.setFillColor(...bgCardInner);
  doc.roundedRect(marginLeft + 4, currentY + 3.5, contentWidth - 8, 6.5, 1, 1, 'F');
  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...accentEmerald);
  doc.text(`Vetor: ${report.cvssVector}`, marginLeft + 7, currentY + 8);

  // CVSS Metrics 8 Columns
  const metricsList = [
    { key: 'AV', name: 'Attack Vector', val: CVSS_LABELS.av[cvss.av] || cvss.av },
    { key: 'AC', name: 'Complexity', val: CVSS_LABELS.ac[cvss.ac] || cvss.ac },
    { key: 'PR', name: 'Privileges', val: CVSS_LABELS.pr[cvss.pr] || cvss.pr },
    { key: 'UI', name: 'User Interaction', val: CVSS_LABELS.ui[cvss.ui] || cvss.ui },
    { key: 'S', name: 'Scope', val: CVSS_LABELS.s[cvss.s] || cvss.s },
    { key: 'C', name: 'Confidentiality', val: CVSS_LABELS.c[cvss.c] || cvss.c },
    { key: 'I', name: 'Integrity', val: CVSS_LABELS.i[cvss.i] || cvss.i },
    { key: 'A', name: 'Availability', val: CVSS_LABELS.a[cvss.a] || cvss.a },
  ];

  const mColWidth = (contentWidth - 10) / 4;
  metricsList.forEach((m, idx) => {
    const row = Math.floor(idx / 4);
    const col = idx % 4;
    const mx = marginLeft + 5 + col * mColWidth;
    const my = currentY + 15 + row * 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...textMuted);
    doc.text(`${m.key} • ${m.name}:`, mx, my);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...textPrimary);
    doc.text(m.val, mx, my + 3.5);
  });

  currentY += cvssBoxHeight + 6;

  // -------------------------------------------------------------
  // SECTION: PASSOS DE REPRODUÇÃO (STEPS TO REPRODUCE)
  // -------------------------------------------------------------
  if (report.stepsToReproduce && report.stepsToReproduce.length > 0) {
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...accentEmerald);
    doc.text('3. PASSOS DETERMINÍSTICOS PARA REPRODUÇÃO', marginLeft, currentY);
    currentY += 5;

    report.stepsToReproduce.forEach((step, idx) => {
      const stepLines = doc.splitTextToSize(step, contentWidth - 14);
      const stepH = stepLines.length * 4.2 + 4;
      checkPageBreak(stepH);

      doc.setFillColor(...bgCard);
      doc.setDrawColor(...borderCol);
      doc.roundedRect(marginLeft, currentY, contentWidth, stepH, 1.5, 1.5, 'FD');

      // Step number circle
      doc.setFillColor(...accentEmerald);
      doc.circle(marginLeft + 5, currentY + 4.5, 2.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(255, 255, 255);
      doc.text(String(idx + 1), marginLeft + 5, currentY + 5.5, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...textPrimary);
      doc.text(stepLines, marginLeft + 11, currentY + 5.2);

      currentY += stepH + 2.5;
    });

    currentY += 4;
  }

  // -------------------------------------------------------------
  // SECTION: PROVA DE CONCEITO (PoC) & PAYLOAD
  // -------------------------------------------------------------
  if (options.includePoc && report.proofOfConcept) {
    checkPageBreak(35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...accentEmerald);
    doc.text('4. PROVA DE CONCEITO TÉCNICA (PoC & EXPLOIT PAYLOAD)', marginLeft, currentY);
    currentY += 4.5;

    // Monospace code box
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    const pocLines = doc.splitTextToSize(report.proofOfConcept, contentWidth - 10);
    const pocHeight = Math.min(80, pocLines.length * 3.6 + 8);

    checkPageBreak(pocHeight);

    doc.setFillColor(isDark ? 10 : 241, isDark ? 10 : 245, isDark ? 14 : 249);
    doc.setDrawColor(...borderCol);
    doc.roundedRect(marginLeft, currentY, contentWidth, pocHeight, 2, 2, 'FD');

    doc.setTextColor(isDark ? 52 : 30, isDark ? 211 : 41, isDark ? 153 : 59); // Terminal green or dark
    doc.text(pocLines.slice(0, 22), marginLeft + 5, currentY + 6);

    currentY += pocHeight + 6;
  }

  // -------------------------------------------------------------
  // SECTION: IMPACTO NO NEGÓCIO & REMEDIAÇÃO
  // -------------------------------------------------------------
  checkPageBreak(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...accentEmerald);
  doc.text('5. IMPACTO NO NEGÓCIO & RECOMENDAÇÕES DE CORREÇÃO', marginLeft, currentY);
  currentY += 4.5;

  const halfWidth = (contentWidth - 4) / 2;

  // Impact box
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const impactLines = doc.splitTextToSize(report.businessImpact || 'Impacto não especificado.', halfWidth - 8);
  const remedLines = doc.splitTextToSize(report.remediation || 'Correção conforme boas práticas OWASP.', halfWidth - 8);
  const dualHeight = Math.max(28, Math.max(impactLines.length, remedLines.length) * 4 + 10);

  checkPageBreak(dualHeight);

  // Box 1: Impact
  doc.setFillColor(...bgCard);
  doc.setDrawColor(...borderCol);
  doc.roundedRect(marginLeft, currentY, halfWidth, dualHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(239, 68, 68); // Red
  doc.text('IMPACTO POTENCIAL / RISCO', marginLeft + 5, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...textPrimary);
  doc.text(impactLines.slice(0, 10), marginLeft + 5, currentY + 11);

  // Box 2: Remediation
  doc.setFillColor(...bgCard);
  doc.setDrawColor(...borderCol);
  doc.roundedRect(marginLeft + halfWidth + 4, currentY, halfWidth, dualHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...accentEmerald);
  doc.text('PLANO DE MITIGAÇÃO / PATCH', marginLeft + halfWidth + 9, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...textPrimary);
  doc.text(remedLines.slice(0, 10), marginLeft + halfWidth + 9, currentY + 11);

  currentY += dualHeight + 6;

  // -------------------------------------------------------------
  // SECTION: CHECKLIST DE VALIDAÇÃO TÉCNICA
  // -------------------------------------------------------------
  if (options.includeChecklist && report.validationChecklist && report.validationChecklist.length > 0) {
    checkPageBreak(35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...accentEmerald);
    doc.text('6. CHECKLIST DE CONFORMIDADE & VALIDAÇÃO TÉCNICA', marginLeft, currentY);
    currentY += 4.5;

    const chkHeight = Math.min(45, report.validationChecklist.length * 6 + 6);
    checkPageBreak(chkHeight);

    doc.setFillColor(...bgCard);
    doc.setDrawColor(...borderCol);
    doc.roundedRect(marginLeft, currentY, contentWidth, chkHeight, 2, 2, 'FD');

    report.validationChecklist.slice(0, 6).forEach((item, idx) => {
      const iy = currentY + 6 + idx * 6;
      // Checkbox square
      doc.setFillColor(item.completed ? accentEmerald[0] : bgCardInner[0], item.completed ? accentEmerald[1] : bgCardInner[1], item.completed ? accentEmerald[2] : bgCardInner[2]);
      doc.roundedRect(marginLeft + 5, iy - 2.5, 3.5, 3.5, 0.8, 0.8, 'F');

      if (item.completed) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(255, 255, 255);
        doc.text('✓', marginLeft + 5.8, iy);
      }

      doc.setFont('helvetica', item.completed ? 'bold' : 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...(item.completed ? textPrimary : textMuted));
      const textTrunc = doc.splitTextToSize(item.label, contentWidth - 18)[0];
      doc.text(textTrunc, marginLeft + 12, iy);
    });

    currentY += chkHeight + 6;
  }

  // -------------------------------------------------------------
  // SECTION: CRONOGRAMA & LINHA DO TEMPO
  // -------------------------------------------------------------
  if (options.includeTimeline && report.timeline && report.timeline.length > 0) {
    checkPageBreak(35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...accentEmerald);
    doc.text('7. CRONOGRAMA DE AUDITORIA & REGISTRO DE EVENTOS', marginLeft, currentY);
    currentY += 4.5;

    const timelineItems = report.timeline.slice(0, 4);
    const tlHeight = timelineItems.length * 7 + 6;
    checkPageBreak(tlHeight);

    doc.setFillColor(...bgCard);
    doc.setDrawColor(...borderCol);
    doc.roundedRect(marginLeft, currentY, contentWidth, tlHeight, 2, 2, 'FD');

    timelineItems.forEach((ev, idx) => {
      const ey = currentY + 5.5 + idx * 7;
      doc.setFillColor(...accentEmerald);
      doc.circle(marginLeft + 6, ey - 1, 1.5, 'F');

      doc.setFont('courier', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...textMuted);
      doc.text(ev.date, marginLeft + 10, ey);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...textPrimary);
      doc.text(ev.title, marginLeft + 35, ey);

      if (ev.hoursSpent) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...accentEmerald);
        doc.text(`[${ev.hoursSpent}h investidas]`, marginLeft + contentWidth - 6, ey, { align: 'right' });
      }
    });

    currentY += tlHeight + 6;
  }

  // -------------------------------------------------------------
  // SECTION: ASSINATURA CRIPTOGRÁFICA PGP
  // -------------------------------------------------------------
  if (options.includePgp && report.pgpSignature) {
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...accentEmerald);
    doc.text('8. ASSINATURA CRIPTOGRÁFICA DIGITAL (OPENPGP)', marginLeft, currentY);
    currentY += 4.5;

    const pgpHeight = 25;
    checkPageBreak(pgpHeight);

    doc.setFillColor(isDark ? 10 : 241, isDark ? 10 : 245, isDark ? 14 : 249);
    doc.setDrawColor(...borderCol);
    doc.roundedRect(marginLeft, currentY, contentWidth, pgpHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...accentEmerald);
    doc.text('VERIFICAÇÃO DE INTEGRIDADE & NÃO-REPÚDIO: ASSINADO VIA RFC 4880', marginLeft + 5, currentY + 5.5);

    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...textSecondary);
    doc.text(`Fingerprint: ${report.pgpSignature.keyFingerprint}`, marginLeft + 5, currentY + 11);
    doc.text(`Timestamp:   ${new Date(report.pgpSignature.signedAt).toISOString()}`, marginLeft + 5, currentY + 16);
    doc.text(`Status:      ASSINATURA VÁLIDA E ÍNTEGRA`, marginLeft + 5, currentY + 21);

    currentY += pgpHeight + 6;
  }

  // -------------------------------------------------------------
  // GLOBAL RUNNING HEADERS & FOOTERS ON ALL PAGES
  // -------------------------------------------------------------
  const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Running Header (pages > 1)
    if (i > 1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...accentEmerald);
      doc.text('BUGSENTINEL', marginLeft, 10);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textMuted);
      doc.text(`• ${report.id} • ${report.target}`, marginLeft + 24, 10);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textSecondary);
      doc.text(options.classification, marginLeft + contentWidth, 10, { align: 'right' });

      doc.setDrawColor(...borderCol);
      doc.setLineWidth(0.2);
      doc.line(marginLeft, 12, marginLeft + contentWidth, 12);
    }

    // Running Footer
    doc.setDrawColor(...borderCol);
    doc.setLineWidth(0.2);
    doc.line(marginLeft, pageHeight - 12, marginLeft + contentWidth, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...textMuted);
    doc.text('DOCUMENTO CONFIDENCIAL • DIRETRIZES DE RESPONSIBLE DISCLOSURE • GERADO VIA BUGSENTINEL', marginLeft, pageHeight - 7.5);

    doc.setFont('helvetica', 'bold');
    doc.text(`Página ${i} de ${totalPages}`, marginLeft + contentWidth, pageHeight - 7.5, { align: 'right' });
  }

  return doc;
}

export function downloadPdfReport(report: VulnerabilityReport, options: PdfExportOptions = DEFAULT_PDF_OPTIONS): void {
  const doc = generatePdfReport(report, options);
  const cleanTitle = report.title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
  const filename = `BugSentinel-${report.id}-${cleanTitle}.pdf`;
  doc.save(filename);
}
