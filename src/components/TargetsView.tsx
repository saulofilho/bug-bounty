import React, { useState } from 'react';
import { 
  Target, 
  Plus, 
  ExternalLink, 
  Sparkles, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  ShieldAlert, 
  Compass, 
  FileText,
  AlertTriangle,
  RefreshCw,
  X
} from 'lucide-react';
import { TargetProgram, PlatformName } from '../types';
import { formatCurrency } from '../utils/formatters';

interface TargetsViewProps {
  targets: TargetProgram[];
  onAddTarget: (target: TargetProgram) => void;
  onNewReportForTarget: (domain: string, platform: PlatformName) => void;
}

export const TargetsView: React.FC<TargetsViewProps> = ({
  targets,
  onAddTarget,
  onNewReportForTarget
}) => {
  const [selectedTargetForAi, setSelectedTargetForAi] = useState<TargetProgram | null>(null);
  const [aiReconResult, setAiReconResult] = useState<any | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // New Target Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTargetName, setNewTargetName] = useState('');
  const [newTargetDomain, setNewTargetDomain] = useState('');
  const [newTargetPlatform, setNewTargetPlatform] = useState<PlatformName>('HackerOne');
  const [newTargetUrl, setNewTargetUrl] = useState('');
  const [newTargetBountyRange, setNewTargetBountyRange] = useState('$100 - $5,000');
  const [newInScope, setNewInScope] = useState('*.target.com, api.target.com');
  const [newOutOfScope, setNewOutOfScope] = useState('DDoS, Social Engineering');
  const [newNotes, setNewNotes] = useState('');

  const handleGenerateAiTips = async (target: TargetProgram) => {
    setSelectedTargetForAi(target);
    setIsAiLoading(true);
    setAiError(null);
    setAiReconResult(null);

    try {
      const res = await fetch('/api/gemini/target-recon-tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetDomain: target.domain,
          targetScope: target.inScope.join(', '),
          techStack: target.notes
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro ao gerar guia de reconhecimento.');
      }
      setAiReconResult(data.data);
    } catch (err: any) {
      setAiError(err.message || 'Falha ao consultar IA Gemini.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCreateTargetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTargetName || !newTargetDomain) return;

    const newProg: TargetProgram = {
      id: `TGT-${Date.now()}`,
      name: newTargetName.trim(),
      domain: newTargetDomain.trim(),
      platform: newTargetPlatform,
      programUrl: newTargetUrl.trim() || `https://${newTargetPlatform.toLowerCase()}.com`,
      bountyRange: newTargetBountyRange.trim(),
      inScope: newInScope.split(',').map(s => s.trim()).filter(Boolean),
      outOfScope: newOutOfScope.split(',').map(s => s.trim()).filter(Boolean),
      notes: newNotes.trim(),
      status: 'ACTIVE',
      reportsCount: 0,
      totalRewarded: 0
    };

    onAddTarget(newProg);
    setShowAddModal(false);
    // Reset
    setNewTargetName('');
    setNewTargetDomain('');
    setNewNotes('');
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-light uppercase tracking-tight text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            <span>Alvos & Programas de Bug Bounty</span>
          </h1>
          <p className="text-xs text-zinc-400">
            Acompanhe escopos autorizados, limites de teste e descubra vetores de ataque prioritários com IA
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Programa / Alvo</span>
        </button>
      </div>

      {/* Targets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {targets.map(target => (
          <div
            key={target.id}
            className="p-5 rounded-xl bg-[#0a0a0a] border border-[#262626] hover:border-zinc-700 transition-all space-y-4 shadow-sm flex flex-col justify-between"
          >
            <div className="space-y-3">
              
              {/* Card top */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-zinc-100">{target.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#121212] text-zinc-300 border border-[#262626]">
                      {target.platform}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-semibold">{target.domain}</span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono block tracking-wider">Faixa de Bounties</span>
                  <span className="text-xs font-semibold font-mono text-emerald-400">{target.bountyRange}</span>
                </div>
              </div>

              {/* In Scope vs Out of Scope */}
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded bg-[#121212] border border-[#262626] space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Dentro do Escopo (In-Scope):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {target.inScope.map((scope, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-[#171717] text-zinc-300 font-mono text-[11px] border border-[#262626]">
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#121212] border border-[#262626] space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-400 font-semibold text-[11px]">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Fora do Escopo (Out-of-Scope):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {target.outOfScope.map((scope, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-rose-950/20 text-rose-300 font-mono text-[11px] border border-rose-900/30">
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {target.notes && (
                <p className="text-xs text-zinc-400 leading-relaxed bg-[#121212] p-2.5 rounded border border-[#262626]">
                  {target.notes}
                </p>
              )}
            </div>

            {/* Card footer actions */}
            <div className="pt-3 border-t border-[#262626] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
                <span>{target.reportsCount} envios</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">{formatCurrency(target.totalRewarded, 'USD')} ganhos</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleGenerateAiTips(target)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#171717] hover:bg-[#262626] text-emerald-400 text-xs font-semibold uppercase tracking-wider transition-all border border-[#262626]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Dicas Recon IA</span>
                </button>

                <button
                  onClick={() => onNewReportForTarget(target.domain, target.platform)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Reportar Bug</span>
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* AI Recon Assistant Modal / Section */}
      {selectedTargetForAi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-[#0a0a0a] border border-[#262626] rounded-xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-start justify-between pb-3 border-b border-[#262626]">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>Estratégia de Reconhecimento & Caça com IA Gemini</span>
                </div>
                <h3 className="text-base font-semibold text-zinc-100">
                  Plano Estratégico para {selectedTargetForAi.name} ({selectedTargetForAi.domain})
                </h3>
              </div>

              <button
                onClick={() => setSelectedTargetForAi(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-[#171717]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isAiLoading ? (
              <div className="py-12 text-center text-xs text-zinc-400 flex flex-col items-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                <span>Mapeando superfície de ataque, vetores de alto bounty e passos de reconhecimento...</span>
              </div>
            ) : aiError ? (
              <div className="p-4 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {aiError}
              </div>
            ) : aiReconResult ? (
              <div className="space-y-5 text-xs text-zinc-300">
                
                {/* Attack Vectors */}
                <div className="space-y-2">
                  <h4 className="font-bold uppercase tracking-wider text-[11px] text-emerald-400">
                    Vetores de Ataque Mais Lucrativos Para Este Alvo:
                  </h4>
                  <div className="space-y-2">
                    {aiReconResult.highBountyAttackVectors?.map((vec: any, idx: number) => (
                      <div key={idx} className="p-3 rounded bg-[#121212] border border-[#262626] space-y-1">
                        <div className="flex items-center justify-between">
                          <strong className="text-zinc-200 text-sm">{vec.vector}</strong>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            {vec.priority}
                          </span>
                        </div>
                        <p className="text-zinc-400 leading-relaxed">{vec.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recon Checklist */}
                <div className="space-y-2">
                  <h4 className="font-bold uppercase tracking-wider text-[11px] text-emerald-400">
                    Passos Recomendados de Descoberta & Ferramentas:
                  </h4>
                  <div className="space-y-2">
                    {aiReconResult.reconChecklist?.map((step: any, idx: number) => (
                      <div key={idx} className="p-3 rounded bg-[#121212] border border-[#262626] flex items-start gap-3">
                        <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="space-y-0.5">
                          <strong className="text-zinc-200">{step.step}</strong>
                          <div className="text-[11px] text-emerald-400 font-mono font-medium">Ferramentas: {step.tools}</div>
                          <p className="text-zinc-400">{step.tip}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Out of scope caution */}
                {aiReconResult.outOfScopeCaution && (
                  <div className="p-3.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 space-y-1">
                    <strong className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Aviso de Conduta Ética & Escopo:
                    </strong>
                    <p className="text-amber-200/90 leading-relaxed">{aiReconResult.outOfScopeCaution}</p>
                  </div>
                )}

              </div>
            ) : null}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTargetForAi(null)}
                className="px-4 py-2 rounded bg-[#171717] hover:bg-[#262626] border border-[#262626] text-zinc-300 font-semibold text-xs uppercase tracking-wider"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Add New Target Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#0a0a0a] border border-[#262626] rounded-xl shadow-2xl p-6 space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-400" />
                <span>Adicionar Novo Alvo / Programa</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTargetSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-zinc-300 font-semibold">Nome do Programa / Empresa *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Uber, GitLab, Shopify"
                  value={newTargetName}
                  onChange={(e) => setNewTargetName(e.target.value)}
                  className="w-full bg-[#121212] border border-[#262626] rounded p-2.5 text-zinc-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-zinc-300 font-semibold">Domínio Raiz *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: uber.com"
                    value={newTargetDomain}
                    onChange={(e) => setNewTargetDomain(e.target.value)}
                    className="w-full bg-[#121212] border border-[#262626] rounded p-2.5 text-zinc-200 focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-zinc-300 font-semibold">Plataforma</label>
                  <select
                    value={newTargetPlatform}
                    onChange={(e) => setNewTargetPlatform(e.target.value as any)}
                    className="w-full bg-[#121212] border border-[#262626] rounded p-2.5 text-zinc-200 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="HackerOne">HackerOne</option>
                    <option value="Bugcrowd">Bugcrowd</option>
                    <option value="Intigriti">Intigriti</option>
                    <option value="YesWeHack">YesWeHack</option>
                    <option value="Synack">Synack</option>
                    <option value="Direct / VDP">Direto / VDP</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-300 font-semibold">Faixa de Bounties Estimada</label>
                <input
                  type="text"
                  placeholder="ex: $200 - $10,000"
                  value={newTargetBountyRange}
                  onChange={(e) => setNewTargetBountyRange(e.target.value)}
                  className="w-full bg-[#121212] border border-[#262626] rounded p-2.5 text-zinc-200 focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-300 font-semibold">Dentro do Escopo (separados por vírgula)</label>
                <input
                  type="text"
                  placeholder="*.target.com, api.target.com"
                  value={newInScope}
                  onChange={(e) => setNewInScope(e.target.value)}
                  className="w-full bg-[#121212] border border-[#262626] rounded p-2.5 text-zinc-200 focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-300 font-semibold">Fora do Escopo (regras proibidas)</label>
                <input
                  type="text"
                  placeholder="DDoS, Social Engineering"
                  value={newOutOfScope}
                  onChange={(e) => setNewOutOfScope(e.target.value)}
                  className="w-full bg-[#121212] border border-[#262626] rounded p-2.5 text-zinc-200 focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-300 font-semibold">Tecnologias / Notas Técnicas</label>
                <textarea
                  rows={2}
                  placeholder="Stack conhecida, comportamentos observados, endpoints interessantes..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-[#121212] border border-[#262626] rounded p-2.5 text-zinc-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded bg-[#171717] hover:bg-[#262626] text-zinc-400 hover:text-white font-semibold uppercase tracking-wider text-xs border border-[#262626]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider text-xs shadow-sm"
                >
                  Salvar Alvo
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
