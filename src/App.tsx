/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header, NavTab } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ReportsView } from './components/ReportsView';
import { ReportDetailModal } from './components/ReportDetailModal';
import { ReportFormModal } from './components/ReportFormModal';
import { CveExplorerView } from './components/CveExplorerView';
import { TargetsView } from './components/TargetsView';
import { DocsAndChecklistsView } from './components/DocsAndChecklistsView';
import { BugBountyDirectoryView } from './components/BugBountyDirectoryView';
import { ThreatIntelligenceDashboard } from './components/ThreatIntelligenceDashboard';
import { PgpSignerModal } from './components/PgpSignerModal';
import { AboutHelpModal } from './components/AboutHelpModal';
import { AddTargetModal } from './components/AddTargetModal';
import { CvssCalculatorModal } from './components/CvssCalculatorModal';
import { FirebaseAuthModal } from './components/FirebaseAuthModal';
import { PdfExportModal } from './components/PdfExportModal';
import { CsvImportModal } from './components/CsvImportModal';
import { StorageIntegrityModal } from './components/StorageIntegrityModal';
import { WelcomePlatformModal } from './components/WelcomePlatformModal';
import { SettingsModal } from './components/SettingsModal';
import { Notifications } from './components/Notifications';
import { getStoredMockEmails, checkReportsStateChanges } from './utils/notificationEngine';
import { validateAndRepairStorageIntegrity, StorageIntegrityResult } from './utils/storageIntegrityValidator';
import { ShieldCheck, X as CloseIcon, Sparkles } from 'lucide-react';
import { exportReportsToCsv } from './utils/csvReportParser';
import { Toaster } from 'react-hot-toast';
import { notifyCriticalVulnerability, showSuccessToast, showInfoToast } from './utils/toastNotifications';
import { AuthProvider, useAuth } from './context/AuthContext';
import { INITIAL_REPORTS, INITIAL_TARGETS, INITIAL_DOCS } from './data/initialData';
import { VulnerabilityReport, TargetProgram, TechnicalDoc, ReportStatus, TimelineEvent, CVERecord, PlatformName, ValidationChecklistItem, Severity } from './types';

function AppContent() {
  const {
    isAuthenticated,
    canEditReports,
    canDeleteReports,
    openLoginModal
  } = useAuth();

  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');

  // 1. Storage Integrity Validation & Self-Healing Engine
  // Runs immediately on application load to sanitize and repair corrupted entries in localStorage
  const [integrityResult, setIntegrityResult] = useState<StorageIntegrityResult>(() => {
    return validateAndRepairStorageIntegrity();
  });
  const [isIntegrityModalOpen, setIsIntegrityModalOpen] = useState(false);
  const [dismissedIntegrityBanner, setDismissedIntegrityBanner] = useState(false);

  // Persistence initialized from verified, sanitized, and repaired datasets
  const [reports, setReports] = useState<VulnerabilityReport[]>(() => integrityResult.repairedReports);
  const [targets, setTargets] = useState<TargetProgram[]>(() => integrityResult.repairedTargets);
  const [docs, setDocs] = useState<TechnicalDoc[]>(() => integrityResult.repairedDocs);

  // Revalidate handler for manual or triggered integrity checks
  const handleRevalidateIntegrity = (newResult: StorageIntegrityResult) => {
    setIntegrityResult(newResult);
    setReports(newResult.repairedReports);
    setTargets(newResult.repairedTargets);
    setDocs(newResult.repairedDocs);
  };

  // Modal States
  const [selectedReportForDetail, setSelectedReportForDetail] = useState<VulnerabilityReport | null>(null);
  const [reportForFormModal, setReportForFormModal] = useState<VulnerabilityReport | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isAddTargetModalOpen, setIsAddTargetModalOpen] = useState(false);
  const [isPgpModalOpen, setIsPgpModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isCvssModalOpen, setIsCvssModalOpen] = useState(false);
  const [cvssModalVector, setCvssModalVector] = useState<string | undefined>(undefined);
  const [cvssModalReportId, setCvssModalReportId] = useState<string | undefined>(undefined);
  const [pgpInitialReportId, setPgpInitialReportId] = useState<string>('');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<string>('ALL');
  const [reportForPdfExport, setReportForPdfExport] = useState<VulnerabilityReport | null>(null);
  const [isCsvImportModalOpen, setIsCsvImportModalOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(true);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(() => {
    try {
      return getStoredMockEmails().filter(e => !e.read).length;
    } catch {
      return 0;
    }
  });

  // Track status transitions and bounty updates across reports to dispatch mock emails
  useEffect(() => {
    if (!reports || reports.length === 0) return;
    try {
      const { newEmails } = checkReportsStateChanges(reports);
      if (newEmails && newEmails.length > 0) {
        setUnreadNotificationsCount(getStoredMockEmails().filter(e => !e.read).length);
        newEmails.forEach(email => {
          if (email.type === 'critical_validated') {
            showSuccessToast(`📧 E-mail mock enviado para ${email.recipientEmail}: Achado Crítico Validado (${email.reportId})`);
          } else if (email.type === 'bounty_updated') {
            showSuccessToast(`💰 E-mail mock enviado para ${email.recipientEmail}: Recompensa de Bounty Atualizada!`);
          }
        });
      }
    } catch (e) {
      console.error('Error tracking report changes for notifications:', e);
    }
  }, [reports]);

  const handleExploreWithMock = () => {
    try {
      localStorage.removeItem('bounty_mock_cleared');
      localStorage.setItem('bounty_reports_v2', JSON.stringify(INITIAL_REPORTS));
      localStorage.setItem('bounty_targets_v2', JSON.stringify(INITIAL_TARGETS));
      localStorage.setItem('bounty_docs_v2', JSON.stringify(INITIAL_DOCS));
    } catch (e) {
      console.error(e);
    }
    setReports(INITIAL_REPORTS);
    setTargets(INITIAL_TARGETS);
    setDocs(INITIAL_DOCS);
    setIsWelcomeModalOpen(false);
    showSuccessToast('Modo Demonstração ativo! Relatórios e alvos de teste carregados.');
  };

  const handleClearMockAndStartFresh = () => {
    try {
      localStorage.setItem('bounty_mock_cleared', 'true');
      localStorage.setItem('bounty_reports_v2', JSON.stringify([]));
      localStorage.setItem('bounty_targets_v2', JSON.stringify([]));
      localStorage.setItem('bounty_docs_v2', JSON.stringify([]));
    } catch (e) {
      console.error(e);
    }
    setReports([]);
    setTargets([]);
    setDocs([]);
    setIsWelcomeModalOpen(false);
    showSuccessToast('Plataforma 100% zerada! Todos os mocks foram limpos.');
  };

  const handleResetToSeedData = () => {
    try {
      localStorage.removeItem('bounty_mock_cleared');
      localStorage.setItem('bounty_reports_v2', JSON.stringify(INITIAL_REPORTS));
      localStorage.setItem('bounty_targets_v2', JSON.stringify(INITIAL_TARGETS));
      localStorage.setItem('bounty_docs_v2', JSON.stringify(INITIAL_DOCS));
    } catch (e) {
      console.error(e);
    }
    setReports(INITIAL_REPORTS);
    setTargets(INITIAL_TARGETS);
    setDocs(INITIAL_DOCS);
    showSuccessToast('Dados padrão restaurados com sucesso!');
  };

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('bounty_reports_v2', JSON.stringify(reports));
    } catch (e) {
      console.error(e);
    }
  }, [reports]);

  useEffect(() => {
    try {
      localStorage.setItem('bounty_targets_v2', JSON.stringify(targets));
    } catch (e) {
      console.error(e);
    }
  }, [targets]);

  useEffect(() => {
    try {
      localStorage.setItem('bounty_docs_v2', JSON.stringify(docs));
    } catch (e) {
      console.error(e);
    }
  }, [docs]);

  // Keep selected report updated if underlying reports array updates
  useEffect(() => {
    if (selectedReportForDetail) {
      const updated = reports.find(r => r.id === selectedReportForDetail.id);
      if (updated) setSelectedReportForDetail(updated);
    }
  }, [reports]);

  // Auto close detail and form modal when unauthenticated
  useEffect(() => {
    if (!isAuthenticated) {
      if (selectedReportForDetail) setSelectedReportForDetail(null);
      if (isFormModalOpen) setIsFormModalOpen(false);
    }
  }, [isAuthenticated]);

  // Report Handlers with Firebase Auth Access Control
  const handleSelectReport = (report: VulnerabilityReport) => {
    if (!isAuthenticated) {
      openLoginModal('view', () => setSelectedReportForDetail(report));
      return;
    }
    setSelectedReportForDetail(report);
  };

  const handleSaveReport = (report: VulnerabilityReport) => {
    const existing = reports.find(r => r.id === report.id);
    const isNew = !existing;
    const isCritical = report.severity === 'CRITICAL';
    const wasCritical = existing?.severity === 'CRITICAL';
    const becameCritical = isCritical && (!existing || !wasCritical);

    if (isNew && isCritical) {
      notifyCriticalVulnerability(report, 'created', handleSelectReport);
    } else if (!isNew && becameCritical) {
      notifyCriticalVulnerability(report, 'escalated', handleSelectReport);
    } else if (!isNew && isCritical) {
      notifyCriticalVulnerability(report, 'updated', handleSelectReport);
    } else if (isNew) {
      showSuccessToast(`Relatório "${report.title.slice(0, 30)}..." criado com sucesso.`);
    } else {
      showSuccessToast(`Relatório atualizado com sucesso.`);
    }

    setReports(prev => {
      const exists = prev.some(r => r.id === report.id);
      if (exists) {
        return prev.map(r => r.id === report.id ? report : r);
      } else {
        return [report, ...prev];
      }
    });

    // Update target statistics
    setTargets(prevTargets => prevTargets.map(t => {
      if (t.domain === report.target || report.target.includes(t.domain)) {
        return {
          ...t,
          reportsCount: (t.reportsCount || 0) + 1,
          totalRewarded: (t.totalRewarded || 0) + (report.bountyAmount || 0)
        };
      }
      return t;
    }));
  };

  const handleDeleteReport = (id: string) => {
    if (!isAuthenticated) {
      openLoginModal('delete', () => handleDeleteReport(id));
      return;
    }
    if (!canDeleteReports) {
      openLoginModal('delete');
      return;
    }
    setReports(prev => prev.filter(r => r.id !== id));
    showInfoToast('Relatório removido com sucesso.');
    if (selectedReportForDetail?.id === id) {
      setSelectedReportForDetail(null);
    }
  };

  const handleUpdateStatus = (id: string, newStatus: ReportStatus, bountyAmount?: number) => {
    if (!isAuthenticated) {
      openLoginModal('edit', () => handleUpdateStatus(id, newStatus, bountyAmount));
      return;
    }
    setReports(prev => prev.map(r => {
      if (r.id === id) {
        showSuccessToast(`Status atualizado para: ${newStatus}`);
        const today = new Date().toISOString().split('T')[0];
        const updatedTimeline: TimelineEvent[] = [
          ...(r.timeline || []),
          {
            id: `t-${Date.now()}`,
            date: today,
            title: `Status alterado para ${newStatus}`,
            notes: `Transição de status registrada no cronograma: ${r.status} ➔ ${newStatus}.`,
            type: bountyAmount !== undefined && bountyAmount > (r.bountyAmount || 0) ? 'bounty' : 'status_change'
          }
        ];
        return {
          ...r,
          status: newStatus,
          bountyAmount: bountyAmount !== undefined ? bountyAmount : r.bountyAmount,
          updatedAt: today,
          timeline: updatedTimeline
        };
      }
      return r;
    }));
  };

  const handleAddTimelineEvent = (id: string, event: Omit<TimelineEvent, 'id'>) => {
    setReports(prev => prev.map(r => {
      if (r.id === id) {
        const newEvent: TimelineEvent = {
          ...event,
          id: `t-${Date.now()}`
        };
        return {
          ...r,
          timeline: [...r.timeline, newEvent],
          updatedAt: new Date().toISOString().split('T')[0]
        };
      }
      return r;
    }));
  };

  const handleUpdateChecklist = (id: string, checklist: ValidationChecklistItem[]) => {
    setReports(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          validationChecklist: checklist,
          updatedAt: new Date().toISOString().split('T')[0]
        };
      }
      return r;
    }));
  };

  const handleUpdateReport = (updated: VulnerabilityReport) => {
    setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
    if (selectedReportForDetail?.id === updated.id) {
      setSelectedReportForDetail(updated);
    }
  };

  const handleOpenNewReport = () => {
    if (!isAuthenticated) {
      openLoginModal('create', () => {
        setReportForFormModal(null);
        setIsFormModalOpen(true);
      });
      return;
    }
    setReportForFormModal(null);
    setIsFormModalOpen(true);
  };

  const handleEditReport = (report: VulnerabilityReport) => {
    if (!isAuthenticated) {
      openLoginModal('edit', () => {
        setReportForFormModal(report);
        setIsFormModalOpen(true);
      });
      return;
    }
    if (!canEditReports) {
      openLoginModal('edit');
      return;
    }
    setReportForFormModal(report);
    setIsFormModalOpen(true);
  };

  const handleOpenCsvImport = () => {
    if (!isAuthenticated) {
      openLoginModal('create', () => {
        setIsCsvImportModalOpen(true);
      });
      return;
    }
    if (!canEditReports) {
      openLoginModal('create');
      return;
    }
    setIsCsvImportModalOpen(true);
  };

  const handleImportReports = (importedReports: VulnerabilityReport[], mode: 'append' | 'replace') => {
    let updatedReports: VulnerabilityReport[];
    if (mode === 'replace') {
      updatedReports = importedReports;
    } else {
      const existingIds = new Set(reports.map(r => r.id));
      const newItems = importedReports.map((r, i) => {
        if (existingIds.has(r.id)) {
          return { ...r, id: `rep-imp-${Date.now()}-${i}` };
        }
        return r;
      });
      updatedReports = [...newItems, ...reports];
    }

    setReports(updatedReports);

    // Alert if any critical reports were imported
    const criticals = importedReports.filter(r => r.severity === 'CRITICAL');
    if (criticals.length > 0) {
      notifyCriticalVulnerability(criticals[0], 'imported', handleSelectReport);
      if (criticals.length > 1) {
        showInfoToast(`Atenção: ${criticals.length} vulnerabilidades com severidade CRITICAL foram importadas.`);
      }
    } else {
      showSuccessToast(`${importedReports.length} relatórios importados com sucesso.`);
    }

    // Auto-discover any new targets
    const existingTargetNames = new Set(targets.map(t => t.name.toLowerCase()));
    const newTargetsToAdd: TargetProgram[] = [];

    importedReports.forEach(r => {
      const targetName = r.target.trim();
      if (targetName && !existingTargetNames.has(targetName.toLowerCase())) {
        existingTargetNames.add(targetName.toLowerCase());
        newTargetsToAdd.push({
          id: `tgt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: targetName,
          domain: targetName.replace(/^https?:\/\//, '').split('/')[0],
          platform: r.platform,
          programUrl: r.submissionUrl || (targetName.startsWith('http') ? targetName : `https://${targetName}`),
          bountyRange: r.bountyAmount > 0 ? `$100 - $${Math.max(r.bountyAmount * 2, 2500)}` : '$100 - $2,500',
          inScope: [targetName.startsWith('http') ? targetName : `*.${targetName}`],
          outOfScope: ['Social engineering', 'DDoS', 'Physical access'],
          notes: `Alvo criado automaticamente via importação de relatórios CSV (${r.platform}).`,
          status: 'ACTIVE',
          reportsCount: 1,
          totalRewarded: r.bountyAmount || 0
        });
      }
    });

    if (newTargetsToAdd.length > 0) {
      setTargets(prev => [...newTargetsToAdd, ...prev]);
    }
  };

  const handleExportAllCsv = () => {
    exportReportsToCsv(reports);
  };

  const handleTriggerTestCriticalToast = () => {
    const sampleCritical = reports.find(r => r.severity === 'CRITICAL') || reports[0];
    if (sampleCritical) {
      notifyCriticalVulnerability(
        {
          ...sampleCritical,
          id: sampleCritical.id,
          title: '[SIMULAÇÃO CRÍTICA] Remote Code Execution via Insecure Deserialization in API Gateway',
          target: 'core-api.target.com',
          severity: 'CRITICAL',
          cvssScore: 9.8
        },
        'created',
        handleSelectReport
      );
    }
  };

  // Link CVE directly to report
  const handleLinkCveToNewReport = (cve: CVERecord) => {
    if (!isAuthenticated) {
      openLoginModal('create', () => handleLinkCveToNewReport(cve));
      return;
    }
    const prefilledReport: VulnerabilityReport = {
      id: `REP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      title: `[${cve.id}] ${cve.title}`,
      target: 'api.target.com',
      platform: 'HackerOne',
      vulnerabilityType: cve.cwe || 'Known Exploit',
      severity: cve.severity,
      status: 'DRAFT',
      cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
      cvssScore: cve.cvss,
      cwe: cve.cwe,
      cveIds: [cve.id],
      summary: cve.description,
      stepsToReproduce: [
        `1. Identifique o software vulnerável no alvo (${cve.id}).`,
        '2. Configure a requisição de prova de conceito segura.',
        '3. Valide a resposta do servidor sem causar indisponibilidade.'
      ],
      proofOfConcept: `# Prova de Conceito para ${cve.id}\n# Referência: ${cve.references[0] || 'NVD'}\n\nGET /vulnerable-endpoint HTTP/1.1\nHost: api.target.com\nUser-Agent: BugBounty-Security-Researcher`,
      businessImpact: `Impacto decorrente da exploração da vulnerabilidade pública ${cve.id} com score CVSS ${cve.cvss}.`,
      remediation: `Aplicar os patches recomendados pelos fornecedores e atualizar o componente afetado de acordo com a documentação do ${cve.id}.`,
      bountyAmount: 0,
      currency: 'USD',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      timeline: [
        {
          id: `t-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          title: `Rascunho criado com base no ${cve.id}`,
          notes: 'Vulnerabilidade associada a partir do catálogo CVE.',
          type: 'creation'
        }
      ]
    };

    setReportForFormModal(prefilledReport);
    setIsFormModalOpen(true);
  };

  // Link Security Advisory directly to report
  const handleNewReportWithAdvisory = (advisoryData: Partial<VulnerabilityReport>) => {
    if (!isAuthenticated) {
      openLoginModal('create', () => handleNewReportWithAdvisory(advisoryData));
      return;
    }
    const prefilledReport: VulnerabilityReport = {
      id: `REP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      title: advisoryData.title || 'Security Advisory Finding',
      target: advisoryData.target || 'api.target.com',
      platform: 'HackerOne',
      vulnerabilityType: advisoryData.vulnerabilityType || 'Known Exploit',
      severity: advisoryData.severity || 'HIGH',
      status: 'DRAFT',
      cvssVector: advisoryData.cvssVector || 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
      cvssScore: advisoryData.cvssScore || (advisoryData.severity === 'CRITICAL' ? 9.8 : 8.1),
      cwe: advisoryData.cwe || 'CWE-20: Improper Input Validation',
      cveIds: advisoryData.cveIds || [],
      summary: advisoryData.summary || '',
      stepsToReproduce: [
        '1. Identifique o componente vulnerável no ambiente do alvo.',
        '2. Reproduza a requisição de acordo com o Security Advisory oficial.',
        '3. Valide o impacto e evidência sem comprometer dados de produção.'
      ],
      proofOfConcept: advisoryData.proofOfConcept || '# Prova de Conceito baseada no Advisory Oficial',
      businessImpact: advisoryData.businessImpact || 'Impacto derivado de aviso de segurança em tempo real com exploração documentada.',
      remediation: advisoryData.remediation || 'Aplicar as diretrizes oficiais de correção do fornecedor.',
      bountyAmount: 0,
      currency: 'USD',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      timeline: [
        {
          id: `t-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          title: 'Rascunho criado a partir de Threat Intelligence',
          notes: 'Vulnerabilidade correlacionada com aviso de segurança em tempo real.',
          type: 'creation'
        }
      ]
    };

    setReportForFormModal(prefilledReport);
    setIsFormModalOpen(true);
  };

  // Create report directly from Security Checklist
  const handleNewReportWithChecklist = (checklistData: Partial<VulnerabilityReport>) => {
    if (!isAuthenticated) {
      openLoginModal('create', () => handleNewReportWithChecklist(checklistData));
      return;
    }
    const prefilledReport: VulnerabilityReport = {
      id: `REP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      title: checklistData.title || 'Vulnerabilidade Validada por Checklist',
      target: checklistData.target || 'api.target.com',
      platform: checklistData.platform || 'HackerOne',
      vulnerabilityType: checklistData.vulnerabilityType || 'Broken Access Control',
      severity: checklistData.severity || 'HIGH',
      status: 'DRAFT',
      cvssVector: checklistData.cvssVector || 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N',
      cvssScore: checklistData.cvssScore || (checklistData.severity === 'CRITICAL' ? 9.8 : checklistData.severity === 'HIGH' ? 8.1 : 5.4),
      cwe: checklistData.cwe || 'CWE-639: Authorization Bypass Through User-Controlled Key',
      cveIds: checklistData.cveIds || [],
      tags: checklistData.tags || ['checklist-verified'],
      summary: checklistData.summary || '',
      stepsToReproduce: checklistData.stepsToReproduce && checklistData.stepsToReproduce.length > 0
        ? checklistData.stepsToReproduce
        : ['1. Reproduza os passos de verificação técnica do checklist.'],
      proofOfConcept: checklistData.proofOfConcept || '# Prova de conceito estruturada',
      businessImpact: checklistData.businessImpact || '',
      remediation: checklistData.remediation || '',
      validationChecklist: checklistData.validationChecklist || [],
      bountyAmount: 0,
      currency: 'USD',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      timeline: [
        {
          id: `t-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          title: 'Relatório Criado com Checklist de Segurança',
          notes: `Checklist de verificação técnica associado com ${checklistData.validationChecklist?.length || 0} critérios mapeados.`,
          type: 'creation'
        }
      ]
    };

    setReportForFormModal(prefilledReport);
    setIsFormModalOpen(true);
  };

  // Apply checklist to existing report
  const handleApplyChecklistToExistingReport = (reportId: string, checklistItems: ValidationChecklistItem[]) => {
    setReports((prevReports) =>
      prevReports.map((rep) => {
        if (rep.id !== reportId) return rep;
        const currentChecklist = rep.validationChecklist || [];
        const existingIds = new Set(currentChecklist.map((c) => c.id));
        const newItemsToAdd = checklistItems.filter((c) => !existingIds.has(c.id));
        const updatedChecklist = [...currentChecklist, ...newItemsToAdd];

        return {
          ...rep,
          validationChecklist: updatedChecklist,
          updatedAt: new Date().toISOString().split('T')[0],
          timeline: [
            ...(rep.timeline || []),
            {
              id: `t-${Date.now()}`,
              date: new Date().toISOString().split('T')[0],
              title: 'Checklist Técnico Anexado',
              notes: `${newItemsToAdd.length} critérios de verificação técnica foram incorporados ao relatório.`,
              type: 'update'
            }
          ]
        };
      })
    );
    showSuccessToast(`Checklist anexado com sucesso ao relatório ${reportId}!`);
  };

  // Target quick report
  const handleNewReportForTarget = (domain: string, platform: PlatformName) => {
    if (!isAuthenticated) {
      openLoginModal('create', () => handleNewReportForTarget(domain, platform));
      return;
    }
    const prefilled: VulnerabilityReport = {
      id: `REP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      title: '',
      target: domain,
      platform,
      vulnerabilityType: 'IDOR / BOLA',
      severity: 'HIGH',
      status: 'DRAFT',
      cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N',
      cvssScore: 7.5,
      cwe: 'CWE-639',
      cveIds: [],
      summary: '',
      stepsToReproduce: ['1. ', '2. ', '3. '],
      proofOfConcept: `GET /api/v1/resource HTTP/1.1\nHost: ${domain}\nAuthorization: Bearer [TOKEN]`,
      businessImpact: '',
      remediation: '',
      bountyAmount: 0,
      currency: 'USD',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      timeline: [
        {
          id: `t-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          title: `Rascunho iniciado para o alvo ${domain}`,
          notes: `Plataforma: ${platform}`,
          type: 'creation'
        }
      ]
    };

    setReportForFormModal(prefilled);
    setIsFormModalOpen(true);
  };

  // Target and Doc saves
  const handleAddTarget = (newTarget: TargetProgram) => {
    setTargets(prev => [newTarget, ...prev]);
  };

  const handleSaveDoc = (updatedDoc: TechnicalDoc) => {
    setDocs(prev => {
      const exists = prev.some(d => d.id === updatedDoc.id);
      if (exists) return prev.map(d => d.id === updatedDoc.id ? updatedDoc : d);
      return [updatedDoc, ...prev];
    });
  };

  const handleDeleteDoc = (id: string) => {
    setDocs(prev => prev.filter(d => d.id !== id));
  };

  // PGP Helper Handlers
  const handleOpenPgpSigner = (reportId?: string) => {
    setPgpInitialReportId(reportId || '');
    setIsPgpModalOpen(true);
  };

  const handleSignatureAttached = (reportId: string, signedArmoredText: string, keyFingerprint: string) => {
    setReports(prev => prev.map(r => {
      if (r.id === reportId) {
        const signatureTimelineEvent: TimelineEvent = {
          id: `t-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          title: 'Relatório Assinado Criptograficamente (PGP)',
          notes: `Assinatura digital anexada com sucesso. Fingerprint: ${keyFingerprint}`,
          type: 'pgp_signature'
        };

        return {
          ...r,
          pgpSignature: {
            signedText: signedArmoredText,
            keyFingerprint,
            signedAt: new Date().toISOString()
          },
          timeline: [...r.timeline, signatureTimelineEvent],
          updatedAt: new Date().toISOString().split('T')[0]
        };
      }
      return r;
    }));
  };

  // CVSS Calculator Handlers
  const handleOpenCvssCalculator = (vector?: string, reportId?: string) => {
    setCvssModalVector(vector);
    setCvssModalReportId(reportId);
    setIsCvssModalOpen(true);
  };

  const handleApplyCvssToReport = (reportId: string, vector: string, score: number, severity: Severity) => {
    const existing = reports.find(r => r.id === reportId);
    if (existing) {
      const updatedReport: VulnerabilityReport = {
        ...existing,
        cvssVector: vector,
        cvssScore: score,
        severity
      };
      if (severity === 'CRITICAL') {
        notifyCriticalVulnerability(updatedReport, 'recalibrated', handleSelectReport);
      } else {
        showSuccessToast(`CVSS atualizado para ${severity} (${score.toFixed(1)}).`);
      }
    }

    setReports(prev => prev.map(r => {
      if (r.id === reportId) {
        const cvssTimelineEvent: TimelineEvent = {
          id: `t-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          title: 'Vetor CVSS v3.1 Atualizado',
          notes: `Score recalculado para ${severity} ${score.toFixed(1)} com vetor técnico ${vector}.`,
          type: 'status_change'
        };

        return {
          ...r,
          cvssVector: vector,
          cvssScore: score,
          severity,
          updatedAt: new Date().toISOString().split('T')[0],
          timeline: [...r.timeline, cvssTimelineEvent]
        };
      }
      return r;
    }));
  };

  const handleCreateReportWithCvss = (vector: string, score: number, severity: Severity) => {
    if (!isAuthenticated) {
      openLoginModal('create', () => handleCreateReportWithCvss(vector, score, severity));
      return;
    }
    setIsCvssModalOpen(false);
    const newReport: VulnerabilityReport = {
      id: `REP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      title: '',
      target: targets[0]?.domain || 'api.target.com',
      platform: 'HackerOne',
      vulnerabilityType: 'Vulnerabilidade Técnica',
      severity,
      status: 'DRAFT',
      cvssVector: vector,
      cvssScore: score,
      cwe: 'CWE-693: Protection Mechanism Failure',
      cveIds: [],
      tags: [],
      summary: '',
      stepsToReproduce: [],
      proofOfConcept: '',
      businessImpact: '',
      remediation: '',
      bountyAmount: 0,
      currency: 'USD',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      timeline: [
        {
          id: `t-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          title: 'Rascunho Inicial Criado',
          notes: `Vetor CVSS v3.1 ${vector} (${score.toFixed(1)} ${severity}) configurado via Calculadora.`,
          type: 'creation'
        }
      ]
    };
    setReportForFormModal(newReport);
    setIsFormModalOpen(true);
  };

  const totalRewardedUSD = reports
    .filter(r => r.status === 'REWARDED' || r.bountyAmount > 0)
    .reduce((acc, r) => acc + (r.bountyAmount || 0), 0);

  const activeReportsCount = reports.filter(r => r.status === 'SUBMITTED' || r.status === 'TRIAGED').length;

  const matchingReportsCount = React.useMemo(() => {
    const q = globalSearchQuery.toLowerCase().trim();
    if (!q) return reports.length;
    const tokens = q.split(/\s+/).filter(Boolean);
    return reports.filter(r => {
      return tokens.every(token => {
        const inTitle = (r.title || '').toLowerCase().includes(token);
        const inTarget = (r.target || '').toLowerCase().includes(token);
        const inType = (r.vulnerabilityType || '').toLowerCase().includes(token);
        const inCwe = (r.cwe || '').toLowerCase().includes(token);
        const inCve = (r.cveIds || []).some(c => c.toLowerCase().includes(token));
        const inTags = (r.tags || []).some(t => t.toLowerCase().includes(token));
        const inId = (r.id || '').toLowerCase().includes(token);
        return inTitle || inTarget || inType || inCwe || inCve || inTags || inId;
      });
    }).length;
  }, [reports, globalSearchQuery]);

  return (
    <div className="min-h-screen bg-[#050505] text-[#e5e7eb] font-sans flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* Top Application Header with Global Search and Quick Actions */}
      <Header
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        onNewReport={handleOpenNewReport}
        onOpenAddTarget={() => setIsAddTargetModalOpen(true)}
        onOpenPgp={() => handleOpenPgpSigner()}
        onOpenCvssCalculator={() => handleOpenCvssCalculator()}
        onOpenAbout={() => setIsAboutModalOpen(true)}
        onOpenStorageIntegrity={() => setIsIntegrityModalOpen(true)}
        onOpenWelcomeModal={() => setIsWelcomeModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenNotifications={() => setIsNotificationsModalOpen(true)}
        unreadNotificationsCount={unreadNotificationsCount}
        isMockActive={reports.length > 0 || targets.length > 0}
        isStorageRepaired={integrityResult.totalRepairs > 0}
        totalRewardedUSD={totalRewardedUSD}
        activeReportsCount={activeReportsCount}
        searchQuery={globalSearchQuery}
        onSearchChange={setGlobalSearchQuery}
        reportsMatchingCount={matchingReportsCount}
      />

      {/* Auto-Healing Storage Integrity Alert Banner */}
      {integrityResult.totalRepairs > 0 && !dismissedIntegrityBanner && (
        <div className="bg-gradient-to-r from-amber-950/80 via-[#191522] to-[#121522] border-b border-amber-500/40 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md animate-fadeIn z-30">
          <div className="flex items-center gap-2.5 text-amber-200">
            <div className="p-1 rounded bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white">Mecanismo de Auto-Cura Ativo:</span>{' '}
              <span>
                {integrityResult.totalRepairs}{' '}
                {integrityResult.totalRepairs === 1 ? 'inconsistência foi detectada e reparada' : 'inconsistências foram detectadas e reparadas'} automaticamente no localStorage durante o carregamento inicial, prevenindo erros de renderização.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsIntegrityModalOpen(true)}
              className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[11px] font-bold transition-colors flex items-center gap-1"
            >
              <span>Ver Diagnóstico ({integrityResult.issues.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setDismissedIntegrityBanner(true)}
              className="p-1 text-zinc-400 hover:text-white transition-colors"
              title="Dispensar aviso"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1800px] w-full mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 pt-6">
        {currentTab === 'dashboard' && (
          <DashboardView
            reports={reports}
            onSelectReport={handleSelectReport}
            onNewReport={handleOpenNewReport}
            onNewReportWithAdvisory={handleNewReportWithAdvisory}
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onOpenAbout={() => setIsAboutModalOpen(true)}
            onOpenCvssCalculator={(vec, id) => handleOpenCvssCalculator(vec, id)}
            onOpenWelcomeModal={() => setIsWelcomeModalOpen(true)}
            onSelectSeverity={(sev) => {
              setSelectedSeverityFilter(sev);
              setCurrentTab('reports');
            }}
            onAddTimelineEvent={handleAddTimelineEvent}
          />
        )}

        {currentTab === 'threat-intel' && (
          <div className="space-y-6 animate-fadeIn">
            <ThreatIntelligenceDashboard
              reports={reports}
              onSelectReport={handleSelectReport}
              onNewReportWithAdvisory={handleNewReportWithAdvisory}
              onNavigateToReports={() => setCurrentTab('reports')}
            />
          </div>
        )}

        {currentTab === 'reports' && (
          <ReportsView
            reports={reports}
            onSelectReport={handleSelectReport}
            onEditReport={(rep) => handleEditReport(rep)}
            onDeleteReport={handleDeleteReport}
            onNewReport={handleOpenNewReport}
            onUpdateStatus={(id, st) => handleUpdateStatus(id, st)}
            onOpenPgpSigner={handleOpenPgpSigner}
            onOpenCvssCalculator={(vec, id) => handleOpenCvssCalculator(vec, id)}
            searchQuery={globalSearchQuery}
            onSearchChange={setGlobalSearchQuery}
            selectedSeverity={selectedSeverityFilter}
            onSeverityChange={setSelectedSeverityFilter}
            onOpenPdfExport={(rep) => setReportForPdfExport(rep)}
            onOpenCsvImport={handleOpenCsvImport}
            onExportCsv={handleExportAllCsv}
          />
        )}

        {currentTab === 'cve' && (
          <CveExplorerView
            onLinkToNewReport={handleLinkCveToNewReport}
          />
        )}

        {currentTab === 'targets' && (
          <TargetsView
            targets={targets}
            onAddTarget={handleAddTarget}
            onNewReportForTarget={handleNewReportForTarget}
          />
        )}

        {currentTab === 'docs' && (
          <DocsAndChecklistsView
            docs={docs}
            onSaveDoc={handleSaveDoc}
            onDeleteDoc={handleDeleteDoc}
            reports={reports}
            onApplyChecklistToNewReport={handleNewReportWithChecklist}
            onApplyChecklistToExistingReport={handleApplyChecklistToExistingReport}
          />
        )}

        {currentTab === 'platforms' && (
          <BugBountyDirectoryView
            reports={reports}
            onNavigateToReports={() => setCurrentTab('reports')}
          />
        )}

        {currentTab === 'notifications' && (
          <div className="space-y-6 animate-fadeIn pb-12">
            <Notifications
              reports={reports}
              onSelectReport={handleSelectReport}
              onUpdateReport={handleSaveReport}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      {selectedReportForDetail && (
        <ReportDetailModal
          report={reports.find(r => r.id === selectedReportForDetail.id) || selectedReportForDetail}
          allReports={reports}
          onSelectReport={(rep) => setSelectedReportForDetail(rep)}
          onClose={() => setSelectedReportForDetail(null)}
          onEdit={(rep) => {
            setSelectedReportForDetail(null);
            handleEditReport(rep);
          }}
          onDelete={handleDeleteReport}
          onUpdateStatus={handleUpdateStatus}
          onAddTimelineEvent={handleAddTimelineEvent}
          onOpenPgpSigner={handleOpenPgpSigner}
          onOpenCvssCalculator={(vec, id) => handleOpenCvssCalculator(vec, id)}
          onUpdateChecklist={handleUpdateChecklist}
          onOpenPdfExport={(rep) => setReportForPdfExport(rep)}
          onUpdateReport={handleUpdateReport}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
        />
      )}

      {/* Individual Report Formal Delivery PDF Modal */}
      <PdfExportModal
        report={reportForPdfExport}
        isOpen={!!reportForPdfExport}
        onClose={() => setReportForPdfExport(null)}
      />

      {/* CSV Reports Import Modal */}
      <CsvImportModal
        isOpen={isCsvImportModalOpen}
        onClose={() => setIsCsvImportModalOpen(false)}
        onImportReports={handleImportReports}
        existingCount={reports.length}
      />

      {isFormModalOpen && (
        <ReportFormModal
          initialReport={reportForFormModal}
          targets={targets}
          docs={docs}
          existingReports={reports}
          onClose={() => {
            setIsFormModalOpen(false);
            setReportForFormModal(null);
          }}
          onSave={handleSaveReport}
        />
      )}

      {/* PGP Signer Helper Tool Modal */}
      <PgpSignerModal
        isOpen={isPgpModalOpen}
        onClose={() => setIsPgpModalOpen(false)}
        reports={reports}
        initialReportId={pgpInitialReportId}
        onSignatureAttached={handleSignatureAttached}
      />

      {/* CVSS v3.1 Calculator Utility Modal */}
      <CvssCalculatorModal
        isOpen={isCvssModalOpen}
        onClose={() => {
          setIsCvssModalOpen(false);
          setCvssModalVector(undefined);
          setCvssModalReportId(undefined);
        }}
        initialVector={cvssModalVector}
        reportId={cvssModalReportId}
        reportTitle={reports.find(r => r.id === cvssModalReportId)?.title}
        onApplyToReport={cvssModalReportId ? (vec, score, sev) => handleApplyCvssToReport(cvssModalReportId, vec, score, sev) : undefined}
        onCreateReportWithVector={handleCreateReportWithCvss}
      />

      {/* Quick Action: Add Target Modal */}
      <AddTargetModal
        isOpen={isAddTargetModalOpen}
        onClose={() => setIsAddTargetModalOpen(false)}
        onAddTarget={(tgt) => {
          handleAddTarget(tgt);
          setIsAddTargetModalOpen(false);
        }}
      />

      {/* About & System Help Modal */}
      <AboutHelpModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
        onResetToSeedData={handleResetToSeedData}
        onTestCriticalToast={handleTriggerTestCriticalToast}
      />

      {/* Firebase Auth Simulation Modal */}
      <FirebaseAuthModal />

      {/* Storage Integrity & Auto-Healing Diagnostic Modal */}
      <StorageIntegrityModal
        isOpen={isIntegrityModalOpen}
        onClose={() => setIsIntegrityModalOpen(false)}
        lastResult={integrityResult}
        onRevalidate={handleRevalidateIntegrity}
        onResetToSeedData={handleResetToSeedData}
      />

      {/* Welcome & Platform Onboarding / Mock Selection Modal */}
      <WelcomePlatformModal
        isOpen={isWelcomeModalOpen}
        onClose={() => setIsWelcomeModalOpen(false)}
        onExploreWithMock={handleExploreWithMock}
        onClearMockAndStartFresh={handleClearMockAndStartFresh}
        isMockActive={reports.length > 0 || targets.length > 0}
        reportsCount={reports.length}
        targetsCount={targets.length}
      />

      {/* Global Settings & API Tokens Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        initialTab="github"
      />

      {/* Notifications Hub Modal */}
      {isNotificationsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="w-full max-w-6xl max-h-[92vh] flex flex-col">
            <Notifications
              reports={reports}
              onSelectReport={handleSelectReport}
              onUpdateReport={handleSaveReport}
              onClose={() => {
                setIsNotificationsModalOpen(false);
                setUnreadNotificationsCount(getStoredMockEmails().filter(e => !e.read).length);
              }}
              isModal={true}
            />
          </div>
        </div>
      )}

      {/* Sophisticated Dark Global Status Footer */}
      <footer className="border-t border-[#262626] bg-[#0a0a0a] text-[10px] uppercase tracking-tighter text-zinc-500 mt-12 py-3.5 px-3 sm:px-4 lg:px-6 xl:px-8">
        <div className="w-full max-w-[1800px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-6">
            <span>Automation Agent: <span className="text-emerald-400 font-mono font-semibold">ONLINE / IDLE</span></span>
            <button
              type="button"
              onClick={() => setIsIntegrityModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 hover:text-emerald-400 transition-colors cursor-pointer"
              title="Clique para auditar a integridade do localStorage"
            >
              <span>Storage:</span>
              {integrityResult.totalRepairs > 0 ? (
                <span className="text-amber-400 font-mono font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  Auto-Curado ({integrityResult.totalRepairs})
                </span>
              ) : (
                <span className="text-emerald-400 font-mono font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  100% Íntegro
                </span>
              )}
            </button>
            <span className="hidden md:inline">Standards: <span className="text-zinc-400 font-mono">CVSS v3.1 • FIRST.Org</span></span>
          </div>
          <div className="flex items-center gap-4 text-right font-mono text-zinc-500">
            <button
              type="button"
              id="btn-footer-welcome-modal"
              onClick={() => setIsWelcomeModalOpen(true)}
              className="text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-wider underline underline-offset-2 flex items-center gap-1 cursor-pointer font-semibold"
              title="Abrir introdução da plataforma e opções de mock"
            >
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Conhecer Plataforma / Mock</span>
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setIsAboutModalOpen(true)}
              className="text-zinc-400 hover:text-emerald-400 transition-colors uppercase tracking-wider underline underline-offset-2 cursor-pointer"
            >
              Sobre o Sistema & Mock Data
            </button>
            <span>•</span>
            <span>BugSentinel Engine • V2.4.0</span>
          </div>
        </div>
      </footer>

      {/* Toast Notification Container with cyber dark theme */}
      <Toaster
        position="top-right"
        gutter={10}
        containerStyle={{
          top: 24,
          right: 24,
          zIndex: 99999
        }}
        toastOptions={{
          duration: 5000,
          style: {
            background: '#12121c',
            color: '#f4f4f5',
            border: '1px solid #28283c',
            borderRadius: '10px',
            fontSize: '12px',
            fontFamily: 'monospace'
          }
        }}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
