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
import { PgpSignerModal } from './components/PgpSignerModal';
import { AboutHelpModal } from './components/AboutHelpModal';
import { AddTargetModal } from './components/AddTargetModal';
import { INITIAL_REPORTS, INITIAL_TARGETS, INITIAL_DOCS } from './data/initialData';
import { VulnerabilityReport, TargetProgram, TechnicalDoc, ReportStatus, TimelineEvent, CVERecord, PlatformName, ValidationChecklistItem } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');

  // Persistence with localStorage fallback
  const [reports, setReports] = useState<VulnerabilityReport[]>(() => {
    try {
      const saved = localStorage.getItem('bounty_reports_v2');
      if (saved) {
        const parsed: VulnerabilityReport[] = JSON.parse(saved);
        // Merge any new initial reports that aren't in local storage yet
        const existingIds = new Set(parsed.map(r => r.id));
        const missing = INITIAL_REPORTS.filter(r => !existingIds.has(r.id));
        if (missing.length > 0) {
          const merged = [...parsed, ...missing];
          localStorage.setItem('bounty_reports_v2', JSON.stringify(merged));
          return merged;
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Failed reading reports from localStorage:', e);
    }
    return INITIAL_REPORTS;
  });

  const [targets, setTargets] = useState<TargetProgram[]>(() => {
    try {
      const saved = localStorage.getItem('bounty_targets_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed reading targets from localStorage:', e);
    }
    return INITIAL_TARGETS;
  });

  const [docs, setDocs] = useState<TechnicalDoc[]>(() => {
    try {
      const saved = localStorage.getItem('bounty_docs_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed reading docs from localStorage:', e);
    }
    return INITIAL_DOCS;
  });

  // Modal States
  const [selectedReportForDetail, setSelectedReportForDetail] = useState<VulnerabilityReport | null>(null);
  const [reportForFormModal, setReportForFormModal] = useState<VulnerabilityReport | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isAddTargetModalOpen, setIsAddTargetModalOpen] = useState(false);
  const [isPgpModalOpen, setIsPgpModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [pgpInitialReportId, setPgpInitialReportId] = useState<string>('');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<string>('ALL');

  const handleResetToSeedData = () => {
    setReports(INITIAL_REPORTS);
    setTargets(INITIAL_TARGETS);
    setDocs(INITIAL_DOCS);
    try {
      localStorage.setItem('bounty_reports_v2', JSON.stringify(INITIAL_REPORTS));
      localStorage.setItem('bounty_targets_v2', JSON.stringify(INITIAL_TARGETS));
      localStorage.setItem('bounty_docs_v2', JSON.stringify(INITIAL_DOCS));
    } catch (e) {
      console.error(e);
    }
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

  // Report Handlers
  const handleSaveReport = (report: VulnerabilityReport) => {
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
    setReports(prev => prev.filter(r => r.id !== id));
    if (selectedReportForDetail?.id === id) {
      setSelectedReportForDetail(null);
    }
  };

  const handleUpdateStatus = (id: string, newStatus: ReportStatus, bountyAmount?: number) => {
    setReports(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          status: newStatus,
          bountyAmount: bountyAmount !== undefined ? bountyAmount : r.bountyAmount,
          updatedAt: new Date().toISOString().split('T')[0]
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

  const handleOpenNewReport = () => {
    setReportForFormModal(null);
    setIsFormModalOpen(true);
  };

  const handleEditReport = (report: VulnerabilityReport) => {
    setReportForFormModal(report);
    setIsFormModalOpen(true);
  };

  // Link CVE directly to report
  const handleLinkCveToNewReport = (cve: CVERecord) => {
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

  // Target quick report
  const handleNewReportForTarget = (domain: string, platform: PlatformName) => {
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
        onOpenAbout={() => setIsAboutModalOpen(true)}
        totalRewardedUSD={totalRewardedUSD}
        activeReportsCount={activeReportsCount}
        searchQuery={globalSearchQuery}
        onSearchChange={setGlobalSearchQuery}
        reportsMatchingCount={matchingReportsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1800px] w-full mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 pt-6">
        {currentTab === 'dashboard' && (
          <DashboardView
            reports={reports}
            onSelectReport={(rep) => setSelectedReportForDetail(rep)}
            onNewReport={handleOpenNewReport}
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onOpenAbout={() => setIsAboutModalOpen(true)}
            onSelectSeverity={(sev) => {
              setSelectedSeverityFilter(sev);
              setCurrentTab('reports');
            }}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsView
            reports={reports}
            onSelectReport={(rep) => setSelectedReportForDetail(rep)}
            onEditReport={(rep) => handleEditReport(rep)}
            onDeleteReport={handleDeleteReport}
            onNewReport={handleOpenNewReport}
            onUpdateStatus={(id, st) => handleUpdateStatus(id, st)}
            onOpenPgpSigner={handleOpenPgpSigner}
            searchQuery={globalSearchQuery}
            onSearchChange={setGlobalSearchQuery}
            selectedSeverity={selectedSeverityFilter}
            onSeverityChange={setSelectedSeverityFilter}
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
          />
        )}

        {currentTab === 'platforms' && (
          <BugBountyDirectoryView
            reports={reports}
            onNavigateToReports={() => setCurrentTab('reports')}
          />
        )}
      </main>

      {/* Modals */}
      {selectedReportForDetail && (
        <ReportDetailModal
          report={reports.find(r => r.id === selectedReportForDetail.id) || selectedReportForDetail}
          onClose={() => setSelectedReportForDetail(null)}
          onEdit={(rep) => {
            setSelectedReportForDetail(null);
            handleEditReport(rep);
          }}
          onDelete={handleDeleteReport}
          onUpdateStatus={handleUpdateStatus}
          onAddTimelineEvent={handleAddTimelineEvent}
          onOpenPgpSigner={handleOpenPgpSigner}
          onUpdateChecklist={handleUpdateChecklist}
        />
      )}

      {isFormModalOpen && (
        <ReportFormModal
          initialReport={reportForFormModal}
          targets={targets}
          docs={docs}
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
      />

      {/* Sophisticated Dark Global Status Footer */}
      <footer className="border-t border-[#262626] bg-[#0a0a0a] text-[10px] uppercase tracking-tighter text-zinc-500 mt-12 py-3.5 px-3 sm:px-4 lg:px-6 xl:px-8">
        <div className="w-full max-w-[1800px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-6">
            <span>Automation Agent: <span className="text-emerald-400 font-mono font-semibold">ONLINE / IDLE</span></span>
            <span className="hidden sm:inline">Sync: <span className="text-zinc-400 font-mono">Live (localStorage)</span></span>
            <span className="hidden md:inline">Standards: <span className="text-zinc-400 font-mono">CVSS v3.1 • FIRST.Org</span></span>
          </div>
          <div className="flex items-center gap-4 text-right font-mono text-zinc-500">
            <button
              type="button"
              onClick={() => setIsAboutModalOpen(true)}
              className="text-zinc-400 hover:text-emerald-400 transition-colors uppercase tracking-wider underline underline-offset-2"
            >
              Sobre o Sistema & Mock Data
            </button>
            <span>•</span>
            <span>BugSentinel Engine • V2.4.0</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
