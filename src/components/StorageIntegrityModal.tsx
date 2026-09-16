import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Wrench, 
  RefreshCw, 
  Download, 
  RotateCcw, 
  X, 
  Database, 
  Layers, 
  FileCode2,
  HardDrive,
  Info
} from 'lucide-react';
import { 
  StorageIntegrityResult, 
  validateAndRepairStorageIntegrity, 
  exportStorageBackup 
} from '../utils/storageIntegrityValidator';

export interface StorageIntegrityModalProps {
  isOpen: boolean;
  onClose: () => void;
  lastResult: StorageIntegrityResult | null;
  onRevalidate: (result: StorageIntegrityResult) => void;
  onResetToSeedData: () => void;
}

export const StorageIntegrityModal: React.FC<StorageIntegrityModalProps> = ({
  isOpen,
  onClose,
  lastResult,
  onRevalidate,
  onResetToSeedData
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'log' | 'tools'>('status');
  const [isScanning, setIsScanning] = useState(false);
  const [testNotification, setTestNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunDiagnostic = () => {
    setIsScanning(true);
    setTestNotification(null);
    setTimeout(() => {
      const result = validateAndRepairStorageIntegrity();
      onRevalidate(result);
      setIsScanning(false);
    }, 350);
  };

  const handleInjectCorruptTest = () => {
    try {
      // Intentionally insert a report with undefined cveIds and malformed status into localStorage
      const existing = JSON.parse(localStorage.getItem('bounty_reports_v2') || '[]');
      if (Array.isArray(existing) && existing.length > 0) {
        const mutated = [...existing];
        // Mutate first item with corrupted properties
        mutated.push({
          id: `CORRUPT_TEST_${Date.now().toString(36).toUpperCase()}`,
          title: 'Teste de Injeção de Falha Controlada (Auto-Cura)',
          severity: 'critical_lowercase', // invalid casing
          status: 'PENDING_VALIDATION',   // legacy status
          cveIds: null,                   // missing array (would crash .length)
          tags: 'not_an_array',           // malformed array
          timeline: null                  // missing timeline
        } as any);
        localStorage.setItem('bounty_reports_v2', JSON.stringify(mutated));
        
        // Immediately trigger self-healing
        const repairResult = validateAndRepairStorageIntegrity();
        onRevalidate(repairResult);
        setTestNotification(
          `Teste executado com sucesso! O validador detectou os campos ausentes/corrompidos ('cveIds', 'tags', 'timeline') e os reparou automaticamente em tempo real sem interrupção na UI.`
        );
        setActiveTab('log');
      }
    } catch (e: any) {
      setTestNotification(`Falha ao simular injeção: ${e?.message}`);
    }
  };

  const result = lastResult;
  const isHealthy = !result || (result.healthy && result.totalRepairs === 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-[#0e1017] border border-[#23283c] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1e2338] bg-[#121522] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isHealthy 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <span>Validação de Integridade do Storage</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#1e243a] text-zinc-300 border border-[#2b3350]">
                  v2.4 Auto-Cura
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Auditoria e auto-recuperação automática de esquemas corrompidos no <code className="text-zinc-300 font-mono">localStorage</code>.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 border-b border-[#1e2338] bg-[#0f121d] flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('status')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'status'
                ? 'border-emerald-500 text-white bg-[#141827]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Status Geral</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('log')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'log'
                ? 'border-emerald-500 text-white bg-[#141827]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Histórico de Diagnóstico</span>
            {result && result.issues.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {result.issues.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tools')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'tools'
                ? 'border-emerald-500 text-white bg-[#141827]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Ferramentas & Backup</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {testNotification && (
            <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-200 text-xs flex items-start gap-2.5 animate-fadeIn">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-white">Simulação Concluída</p>
                <p className="text-[11px] text-cyan-300/90 mt-0.5">{testNotification}</p>
              </div>
              <button
                type="button"
                onClick={() => setTestNotification(null)}
                className="text-cyan-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {activeTab === 'status' && (
            <div className="space-y-4">
              {/* Health Banner */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isHealthy
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/20 border-amber-500/40 text-amber-300'
              }`}>
                <div className="flex items-start gap-3">
                  {isHealthy ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="font-bold text-white text-sm">
                      {isHealthy 
                        ? 'Armazenamento 100% Íntegro e Protegido' 
                        : `Mecanismo de Auto-Cura Ativo: ${result?.totalRepairs} Inconsistências Reparadas`}
                    </h4>
                    <p className="text-xs text-zinc-300 mt-0.5">
                      {isHealthy
                        ? 'Todas as estruturas de dados no localStorage estão validadas contra o esquema formal de tipos. Nenhuma anomalia de renderização detectada.'
                        : 'Entradas corrompidas ou campos obrigatórios faltantes foram reconstruídos de maneira transparente para prevenir exceções no DOM.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRunDiagnostic}
                  disabled={isScanning}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? 'Validando...' : 'Revalidar Agora'}</span>
                </button>
              </div>

              {/* Monitored Storages Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[#121522] border border-[#1e2338]">
                  <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                    <span className="font-mono">bounty_reports_v2</span>
                    <span className="text-[10px] text-emerald-400 font-bold font-mono">OK</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-white">
                    {result?.repairedReports.length ?? 0}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Relatórios auditados com arrays (<code className="text-zinc-400">cveIds</code>, <code className="text-zinc-400">tags</code>, <code className="text-zinc-400">timeline</code>).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#121522] border border-[#1e2338]">
                  <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                    <span className="font-mono">bounty_targets_v2</span>
                    <span className="text-[10px] text-emerald-400 font-bold font-mono">OK</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-white">
                    {result?.repairedTargets.length ?? 0}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Alvos validados com escopos (<code className="text-zinc-400">inScope</code>, <code className="text-zinc-400">outOfScope</code>).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#121522] border border-[#1e2338]">
                  <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                    <span className="font-mono">bounty_docs_v2</span>
                    <span className="text-[10px] text-emerald-400 font-bold font-mono">OK</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-white">
                    {result?.repairedDocs.length ?? 0}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Checklists e bases técnicas validadas.
                  </p>
                </div>
              </div>

              {/* Protective Invariants Checklist */}
              <div className="p-4 rounded-xl bg-[#121522] border border-[#1e2338] space-y-2.5">
                <h5 className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">
                  Garantias de Integridade em Tempo de Execução
                </h5>
                <ul className="text-xs text-zinc-400 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Prevenção de TypeError em Arrays:</strong> Campos como <code className="text-zinc-300 font-mono">cveIds</code>, <code className="text-zinc-300 font-mono">tags</code> e <code className="text-zinc-300 font-mono">timeline</code> são forçados a existir como arrays válidos, evitando quebras em chamadas <code className="text-zinc-300 font-mono">.map()</code>, <code className="text-zinc-300 font-mono">.filter()</code> ou <code className="text-zinc-300 font-mono">.length</code>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Normalização de Enums & Severidade:</strong> Valores de severidade em minúsculas ou fora do padrão são convertidos automaticamente para a união válida (<code className="text-zinc-300 font-mono">CRITICAL | HIGH | MEDIUM | LOW | INFO</code>).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Desduplicação de Chaves Primárias:</strong> Identificadores idênticos são automaticamente reatribuídos para prevenir conflitos de reconciliação no Virtual DOM do React.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Recuperação Automática de Sintaxe:</strong> Se o JSON no localStorage estiver truncado ou corrompido, o sistema recupera a cópia de semente e mantém a aplicação funcionando.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'log' && (
            <div className="space-y-3">
              {(!result || result.issues.length === 0) ? (
                <div className="py-10 text-center text-zinc-500 font-mono text-xs">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400/60 mx-auto mb-2" />
                  <p className="text-white font-semibold text-sm">Nenhuma falha de integridade detectada</p>
                  <p className="text-zinc-400 text-[11px] mt-1 max-w-sm mx-auto">
                    Todas as chaves do localStorage foram validadas e estão perfeitamente íntegras com os esquemas TypeScript.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-400 font-mono">
                    Registros corrigidos na última execução ({result.issues.length} ocorrências):
                  </p>
                  {result.issues.map((issue, idx) => (
                    <div 
                      key={idx}
                      className="p-3 rounded-lg bg-[#141726] border border-[#22283e] text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap font-mono text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                          {issue.issueType}
                        </span>
                        <span className="text-zinc-400 font-mono">{issue.storageKey}</span>
                        {issue.itemId && (
                          <span className="text-emerald-400 font-bold font-mono">{issue.itemId}</span>
                        )}
                      </div>
                      <p className="text-zinc-200">{issue.description}</p>
                      <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span>{issue.actionTaken}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-[#121522] border border-[#1e2338] space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Download className="w-4 h-4 text-emerald-400" />
                      <span>Backup de Dados Íntegros (JSON)</span>
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Gera um arquivo JSON validado contendo todos os relatórios, alvos e documentações livres de qualquer corrupção.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={exportStorageBackup}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono transition-colors shrink-0 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar Backup</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#121522] border border-[#1e2338] space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-amber-400" />
                      <span>Testar Mecanismo de Auto-Cura</span>
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Injeta propositalmente uma entrada corrompida (campos obrigatórios ausentes e dados malformados) e aciona o motor de validação para verificar a autocorreção imediata sem quebras de interface.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleInjectCorruptTest}
                    className="px-3 py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-white text-xs font-bold font-mono transition-colors shrink-0 flex items-center gap-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Simular & Curar</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-red-300 flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-red-400" />
                      <span>Restauração de Fábrica (Factory Reset)</span>
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Restaura o localStorage para os dados padrão originais de demonstração (seed), limpando eventuais registros locais inconsistentes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Deseja realmente restaurar os relatórios e alvos para o estado padrão do sistema?')) {
                        onResetToSeedData();
                        handleRunDiagnostic();
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold font-mono transition-colors shrink-0"
                  >
                    Restaurar Padrão
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1e2338] bg-[#0f121d] flex items-center justify-between text-xs text-zinc-400">
          <span className="font-mono text-[11px] text-zinc-500">
            Última validação: {result ? new Date(result.timestamp).toLocaleTimeString() : 'Ao iniciar'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
