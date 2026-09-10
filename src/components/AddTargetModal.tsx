import React, { useState } from 'react';
import { Target, X, ShieldAlert, Plus, DollarSign, CheckCircle2 } from 'lucide-react';
import { TargetProgram, PlatformName } from '../types';

interface AddTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTarget: (target: TargetProgram) => void;
}

export const AddTargetModal: React.FC<AddTargetModalProps> = ({
  isOpen,
  onClose,
  onAddTarget
}) => {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [platform, setPlatform] = useState<PlatformName>('HackerOne');
  const [programUrl, setProgramUrl] = useState('');
  const [bountyRange, setBountyRange] = useState('$100 - $5,000');
  const [inScope, setInScope] = useState('*.target.com, api.target.com');
  const [outOfScope, setOutOfScope] = useState('DDoS, Social Engineering, Out-of-band Spam');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe o nome do programa ou organização.');
      return;
    }
    if (!domain.trim()) {
      setError('Por favor, informe o domínio principal do alvo (ex: api.target.com).');
      return;
    }

    const newTarget: TargetProgram = {
      id: `TGT-${Date.now()}`,
      name: name.trim(),
      domain: domain.trim(),
      platform,
      programUrl: programUrl.trim() || `https://${platform.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      bountyRange: bountyRange.trim() || '$100 - $5,000',
      inScope: inScope.split(',').map(s => s.trim()).filter(Boolean),
      outOfScope: outOfScope.split(',').map(s => s.trim()).filter(Boolean),
      notes: notes.trim(),
      status: 'ACTIVE',
      reportsCount: 0,
      totalRewarded: 0
    };

    onAddTarget(newTarget);
    onClose();
    // Reset
    setName('');
    setDomain('');
    setNotes('');
    setError(null);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-add-target-title"
    >
      <div 
        className="w-full max-w-lg bg-[#0e0e0e] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222222] bg-[#121212]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 id="modal-add-target-title" className="text-sm font-semibold text-zinc-100 uppercase tracking-wide">
                Adicionar Novo Alvo / Programa
              </h2>
              <p className="text-[11px] text-zinc-400">
                Cadastre o escopo autorizado para rastreamento e auditoria
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Fechar (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded bg-rose-950/40 border border-rose-500/40 text-rose-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="block text-zinc-300 font-medium font-mono uppercase text-[10px] tracking-wider">
                Nome do Programa / Empresa *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: FinPay Global, Uber, Nubank"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                className="w-full bg-[#161616] border border-[#2a2a2a] rounded px-3 py-2 text-zinc-200 focus:border-emerald-500 focus:outline-none placeholder-zinc-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-zinc-300 font-medium font-mono uppercase text-[10px] tracking-wider">
                Domínio / Endpoint Principal *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: api.finpay.com ou *.target.com"
                value={domain}
                onChange={(e) => {
                  setDomain(e.target.value);
                  setError(null);
                }}
                className="w-full bg-[#161616] border border-[#2a2a2a] rounded px-3 py-2 text-zinc-200 font-mono focus:border-emerald-500 focus:outline-none placeholder-zinc-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="block text-zinc-300 font-medium font-mono uppercase text-[10px] tracking-wider">
                Plataforma de Bug Bounty
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as PlatformName)}
                className="w-full bg-[#161616] border border-[#2a2a2a] rounded px-3 py-2 text-zinc-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="HackerOne">HackerOne</option>
                <option value="Bugcrowd">Bugcrowd</option>
                <option value="Intigriti">Intigriti</option>
                <option value="YesWeHack">YesWeHack</option>
                <option value="Synack">Synack</option>
                <option value="Direct / VDP">Direto / VDP (Responsável)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-zinc-300 font-medium font-mono uppercase text-[10px] tracking-wider">
                Faixa Estimada de Bounties
              </label>
              <input
                type="text"
                placeholder="Ex: $150 - $10,000"
                value={bountyRange}
                onChange={(e) => setBountyRange(e.target.value)}
                className="w-full bg-[#161616] border border-[#2a2a2a] rounded px-3 py-2 text-zinc-200 font-mono focus:border-emerald-500 focus:outline-none placeholder-zinc-600"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-zinc-300 font-medium font-mono uppercase text-[10px] tracking-wider">
              URL do Programa Oficial (Opcional)
            </label>
            <input
              type="url"
              placeholder="https://hackerone.com/target-program"
              value={programUrl}
              onChange={(e) => setProgramUrl(e.target.value)}
              className="w-full bg-[#161616] border border-[#2a2a2a] rounded px-3 py-2 text-zinc-200 font-mono focus:border-emerald-500 focus:outline-none placeholder-zinc-600"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-zinc-300 font-medium font-mono uppercase text-[10px] tracking-wider">
              Escopo Autorizado (In-Scope, separados por vírgula)
            </label>
            <input
              type="text"
              placeholder="*.target.com, api.target.com, auth.target.com"
              value={inScope}
              onChange={(e) => setInScope(e.target.value)}
              className="w-full bg-[#161616] border border-[#2a2a2a] rounded px-3 py-2 text-zinc-200 font-mono focus:border-emerald-500 focus:outline-none placeholder-zinc-600"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-zinc-300 font-medium font-mono uppercase text-[10px] tracking-wider">
              Fora de Escopo / Regras Proibidas (Out-of-Scope)
            </label>
            <input
              type="text"
              placeholder="DDoS, Phishing, Social Engineering"
              value={outOfScope}
              onChange={(e) => setOutOfScope(e.target.value)}
              className="w-full bg-[#161616] border border-[#2a2a2a] rounded px-3 py-2 text-zinc-200 font-mono focus:border-emerald-500 focus:outline-none placeholder-zinc-600"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-zinc-300 font-medium font-mono uppercase text-[10px] tracking-wider">
              Notas de Reconhecimento & Stack Tecnológica
            </label>
            <textarea
              rows={2}
              placeholder="Ex: GraphQL em /api/graphql, Node.js + Express, AWS CloudFront..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#161616] border border-[#2a2a2a] rounded px-3 py-2 text-zinc-200 focus:border-emerald-500 focus:outline-none placeholder-zinc-600"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#222222]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-[#181818] hover:bg-[#222222] text-zinc-300 text-xs font-mono uppercase tracking-wider transition-colors border border-[#2a2a2a]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs uppercase tracking-wider font-bold transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Salvar Alvo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
