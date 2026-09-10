import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  ShieldCheck, 
  FileCheck, 
  Lock, 
  Unlock, 
  Copy, 
  Check, 
  Download, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  FileText,
  Upload,
  RefreshCw,
  Award
} from 'lucide-react';
import { VulnerabilityReport } from '../types';
import { 
  PgpKeyPairInfo, 
  getStoredPgpKeys, 
  saveStoredPgpKeys, 
  getActivePgpKey, 
  setActivePgpKeyId, 
  generateNewPgpKey, 
  importExistingPgpKey, 
  signCleartextReport, 
  signDetachedReport, 
  verifyCleartextSignature 
} from '../utils/pgp';
import { generateMarkdownForPlatform } from '../utils/formatters';

interface PgpSignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: VulnerabilityReport[];
  initialReportId?: string;
  onSignatureAttached?: (reportId: string, signedArmoredText: string, keyFingerprint: string) => void;
}

export const PgpSignerModal: React.FC<PgpSignerModalProps> = ({
  isOpen,
  onClose,
  reports,
  initialReportId,
  onSignatureAttached
}) => {
  const [activeTab, setActiveTab] = useState<'sign' | 'keys' | 'verify'>('sign');
  
  // Keys State
  const [keys, setKeys] = useState<PgpKeyPairInfo[]>([]);
  const [activeKey, setActiveKey] = useState<PgpKeyPairInfo | null>(null);

  // Signing State
  const [selectedReportId, setSelectedReportId] = useState<string>(initialReportId || (reports[0]?.id || ''));
  const [customText, setCustomText] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [signFormat, setSignFormat] = useState<'cleartext' | 'detached'>('cleartext');
  const [passphrase, setPassphrase] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [signingError, setSigningError] = useState<string | null>(null);
  const [signedOutput, setSignedOutput] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Key Generation State
  const [showGenForm, setShowGenForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [genName, setGenName] = useState('Security Researcher');
  const [genEmail, setGenEmail] = useState('hunter@bugbounty.org');
  const [genPassphrase, setGenPassphrase] = useState('');
  const [genAlgorithm, setGenAlgorithm] = useState<'curve25519' | 'rsa'>('curve25519');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Key Import State
  const [importName, setImportName] = useState('');
  const [importEmail, setImportEmail] = useState('');
  const [importPrivKey, setImportPrivKey] = useState('');
  const [importPubKey, setImportPubKey] = useState('');
  const [importPassphrase, setImportPassphrase] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // View Key Details Modal state
  const [viewingKey, setViewingKey] = useState<{ key: PgpKeyPairInfo; type: 'public' | 'private' } | null>(null);

  // Verify Tab State
  const [verifyText, setVerifyText] = useState('');
  const [verifyPubKey, setVerifyPubKey] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ verified: boolean; signerKeyId?: string; error?: string } | null>(null);

  // Load keys on mount
  useEffect(() => {
    if (isOpen) {
      loadKeys();
      if (initialReportId) {
        setSelectedReportId(initialReportId);
        setIsCustomMode(false);
      }
    }
  }, [isOpen, initialReportId]);

  const loadKeys = () => {
    const stored = getStoredPgpKeys();
    setKeys(stored);
    const active = getActivePgpKey();
    setActiveKey(active);
  };

  if (!isOpen) return null;

  // Selected report content
  const selectedReport = reports.find(r => r.id === selectedReportId);
  const contentToSign = isCustomMode 
    ? customText 
    : (selectedReport ? generateMarkdownForPlatform(selectedReport, 'HackerOne') : '');

  // Handle Signing
  const handleSign = async () => {
    if (!activeKey) {
      setSigningError('Nenhuma chave PGP selecionada. Gere ou importe uma chave na aba "Minhas Chaves".');
      return;
    }

    if (!contentToSign.trim()) {
      setSigningError('Não há conteúdo para assinar.');
      return;
    }

    setIsSigning(true);
    setSigningError(null);
    setSignedOutput(null);

    try {
      let result = '';
      if (signFormat === 'cleartext') {
        result = await signCleartextReport(contentToSign, activeKey.armoredPrivateKey, passphrase);
      } else {
        result = await signDetachedReport(contentToSign, activeKey.armoredPrivateKey, passphrase);
      }

      setSignedOutput(result);

      // Notify callback if report was selected
      if (!isCustomMode && selectedReport && onSignatureAttached) {
        onSignatureAttached(selectedReport.id, result, activeKey.fingerprint);
      }
    } catch (err: any) {
      console.error('PGP Sign error:', err);
      setSigningError(err.message || 'Erro ao assinar com a chave PGP.');
    } finally {
      setIsSigning(false);
    }
  };

  // Handle Key Generation
  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genName.trim() || !genEmail.trim()) {
      setGenError('Nome e e-mail são obrigatórios para a identidade PGP (UID).');
      return;
    }

    setIsGenerating(true);
    setGenError(null);

    try {
      const newKey = await generateNewPgpKey(genName, genEmail, genPassphrase, genAlgorithm);
      loadKeys();
      setShowGenForm(false);
      setGenPassphrase('');
    } catch (err: any) {
      console.error('Key gen error:', err);
      setGenError(err.message || 'Falha ao gerar par de chaves PGP.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Key Import
  const handleImportKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importPrivKey.trim()) {
      setImportError('Insira a chave privada PGP em formato ASCII Armored (-----BEGIN PGP PRIVATE KEY BLOCK-----).');
      return;
    }

    setImportError(null);
    try {
      await importExistingPgpKey(
        importName || 'Security Researcher',
        importEmail || 'hunter@bugbounty.org',
        importPrivKey,
        importPubKey || undefined,
        importPassphrase || undefined
      );
      loadKeys();
      setShowImportForm(false);
      setImportPrivKey('');
      setImportPubKey('');
      setImportPassphrase('');
    } catch (err: any) {
      console.error('Key import error:', err);
      setImportError(err.message || 'Chave privada inválida ou senha incorreta.');
    }
  };

  // Handle Key Deletion
  const handleDeleteKey = (id: string) => {
    if (confirm('Tem certeza que deseja remover esta chave do navegador? Certifique-se de ter backup da chave privada.')) {
      const remaining = keys.filter(k => k.id !== id);
      saveStoredPgpKeys(remaining);
      loadKeys();
    }
  };

  // Handle Set Active Key
  const handleSetActiveKey = (id: string) => {
    setActivePgpKeyId(id);
    loadKeys();
  };

  // Copy to clipboard
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download signed file
  const handleDownloadSigned = () => {
    if (!signedOutput) return;
    const blob = new Blob([signedOutput], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = isCustomMode 
      ? `signed-document-${Date.now()}.asc` 
      : `${selectedReport?.id || 'report'}-signed.asc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Handle Verification
  const handleVerify = async () => {
    if (!verifyText.trim()) return;
    setIsVerifying(true);
    setVerifyResult(null);

    const pubKeyToUse = verifyPubKey.trim() || activeKey?.armoredPublicKey || '';
    if (!pubKeyToUse) {
      setVerifyResult({ verified: false, error: 'Forneça uma chave pública PGP para verificar.' });
      setIsVerifying(false);
      return;
    }

    const res = await verifyCleartextSignature(verifyText, pubKeyToUse);
    setVerifyResult(res);
    setIsVerifying(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0a0a0a] border border-[#262626] rounded-xl shadow-2xl max-h-[92vh] flex flex-col my-auto overflow-hidden">
        
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[#262626] bg-[#0a0a0a]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Key className="w-4 h-4" />
              </div>
              <h2 className="text-base font-light text-white flex items-center gap-2">
                <span>Assinador PGP & Identidade Criptográfica</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#171717] text-zinc-400 border border-[#262626]">
                  RFC 4880
                </span>
              </h2>
            </div>
            <p className="text-xs text-zinc-400 font-mono">
              Assine digitalmente seus relatórios de vulnerabilidade para garantir integridade, não-repúdio e auditoria.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-[#171717] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Key Status Bar */}
        <div className="px-5 py-2.5 bg-[#121212] border-b border-[#262626] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 uppercase text-[10px] tracking-wider">Chave Ativa:</span>
            {activeKey ? (
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">{activeKey.name} &lt;{activeKey.email}&gt;</span>
                <span className="text-[10px] text-zinc-400 bg-[#171717] px-1.5 py-0.5 rounded border border-[#262626]">
                  ID: 0x{activeKey.keyId.slice(-8)}
                </span>
              </div>
            ) : (
              <span className="text-amber-400">Nenhuma chave PGP configurada</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('keys')}
              className="text-[10px] text-zinc-400 hover:text-white underline underline-offset-4 transition-colors"
            >
              {keys.length} chave(s) no cofre
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-[#0a0a0a] border-b border-[#262626] text-xs">
          <button
            onClick={() => setActiveTab('sign')}
            className={`px-3 py-1.5 rounded font-mono uppercase tracking-wider text-[11px] flex items-center gap-1.5 transition-all ${
              activeTab === 'sign' ? 'bg-[#171717] text-emerald-400 border border-[#262626]' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Assinar Relatório</span>
          </button>

          <button
            onClick={() => setActiveTab('keys')}
            className={`px-3 py-1.5 rounded font-mono uppercase tracking-wider text-[11px] flex items-center gap-1.5 transition-all ${
              activeTab === 'keys' ? 'bg-[#171717] text-emerald-400 border border-[#262626]' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Minhas Chaves ({keys.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('verify')}
            className={`px-3 py-1.5 rounded font-mono uppercase tracking-wider text-[11px] flex items-center gap-1.5 transition-all ${
              activeTab === 'verify' ? 'bg-[#171717] text-emerald-400 border border-[#262626]' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verificar Assinatura</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-zinc-300">
          
          {/* TAB 1: SIGN */}
          {activeTab === 'sign' && (
            <div className="space-y-6">
              
              {/* If no keys exist, banner */}
              {keys.length === 0 && (
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-200">
                  <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold font-mono text-xs uppercase tracking-wider">Crie ou importe seu par de chaves PGP</h4>
                    <p className="text-xs text-zinc-400">
                      Para assinar relatórios criptograficamente, você precisa de um par de chaves PGP (OpenPGP). Você pode gerar uma diretamente no seu navegador com 1 clique.
                    </p>
                    <button
                      onClick={() => {
                        setActiveTab('keys');
                        setShowGenForm(true);
                      }}
                      className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-mono text-xs uppercase tracking-wider transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Gerar Par de Chaves Agora</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Selection Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                      Origem do Conteúdo
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomMode(!isCustomMode)}
                      className="text-[10px] font-mono text-emerald-400 hover:underline"
                    >
                      {isCustomMode ? '← Selecionar Relatório' : 'Escrever Texto Livre →'}
                    </button>
                  </div>

                  {!isCustomMode ? (
                    <select
                      value={selectedReportId}
                      onChange={(e) => setSelectedReportId(e.target.value)}
                      className="w-full bg-[#121212] border border-[#262626] rounded px-3 py-2 text-zinc-200 font-mono text-xs focus:border-zinc-500 focus:outline-none"
                    >
                      {reports.map((r) => (
                        <option key={r.id} value={r.id}>
                          [{r.severity}] {r.title} ({r.target})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[11px] font-mono text-zinc-400">
                      Modo texto livre ativo (digite ou cole abaixo)
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                    Formato da Assinatura
                  </label>
                  <select
                    value={signFormat}
                    onChange={(e) => setSignFormat(e.target.value as any)}
                    className="w-full bg-[#121212] border border-[#262626] rounded px-3 py-2 text-zinc-200 font-mono text-xs focus:border-zinc-500 focus:outline-none"
                  >
                    <option value="cleartext">Mensagem com Assinatura Inline (Cleartext Armored - Recomendado)</option>
                    <option value="detached">Assinatura Desanexada (Detached Signature .sig)</option>
                  </select>
                </div>
              </div>

              {/* Passphrase prompt if key is encrypted */}
              {activeKey?.hasPassphrase && (
                <div className="p-3.5 rounded-lg bg-[#121212] border border-[#262626] space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Senha de Desbloqueio da Chave Privada</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Digite a senha configurada para sua chave PGP..."
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    className="w-full bg-[#171717] border border-[#262626] rounded px-3 py-2 text-zinc-200 font-mono text-xs focus:border-zinc-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Content Preview / Editor */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span className="uppercase tracking-wider font-bold">Conteúdo a Ser Assinado</span>
                  <span>{contentToSign.length} caracteres</span>
                </div>
                {isCustomMode ? (
                  <textarea
                    rows={6}
                    placeholder="Cole ou digite aqui o texto, PoC ou detalhes do relatório que deseja assinar com PGP..."
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    className="w-full bg-[#121212] border border-[#262626] rounded p-3 text-zinc-200 font-mono text-xs focus:border-zinc-500 focus:outline-none leading-relaxed"
                  />
                ) : (
                  <pre className="p-3 rounded-lg bg-[#121212] border border-[#262626] text-[11px] font-mono text-zinc-300 overflow-x-auto whitespace-pre leading-relaxed max-h-48">
                    {contentToSign}
                  </pre>
                )}
              </div>

              {/* Action Button & Errors */}
              {signingError && (
                <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{signingError}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] font-mono text-zinc-500">
                  {activeKey ? `Assinando como ${activeKey.email}` : 'Selecione uma chave ativa para prosseguir'}
                </span>

                <button
                  type="button"
                  onClick={handleSign}
                  disabled={isSigning || !activeKey || !contentToSign.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider font-mono transition-all disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSigning ? 'Assinando Criptograficamente...' : 'Assinar com Chave PGP'}</span>
                </button>
              </div>

              {/* Signed Output Result */}
              {signedOutput && (
                <div className="p-4 rounded-lg bg-[#121212] border border-emerald-500/40 space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Relatório Assinado Criptograficamente</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(signedOutput)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#171717] hover:bg-[#262626] border border-[#262626] text-zinc-200 font-mono text-xs uppercase tracking-wider transition-all"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                      </button>

                      <button
                        onClick={handleDownloadSigned}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#171717] hover:bg-[#262626] border border-[#262626] text-zinc-200 font-mono text-xs uppercase tracking-wider transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar .asc</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] font-mono text-zinc-400">
                    O bloco abaixo contém seu relatório assinado digitalmente com a chave <strong>0x{activeKey?.keyId}</strong>. Qualquer modificação posterior invalidará a assinatura.
                  </p>

                  <pre className="p-3.5 rounded bg-[#0a0a0a] border border-[#262626] font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre leading-relaxed max-h-72">
                    {signedOutput}
                  </pre>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: KEYS */}
          {activeTab === 'keys' && (
            <div className="space-y-6">
              
              {/* Action bar for generating / importing */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-200">
                    Cofre Local de Chaves PGP
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Armazenamento seguro no navegador via Web Crypto API. Chaves privadas nunca saem do seu dispositivo.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowImportForm(true);
                      setShowGenForm(false);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#171717] hover:bg-[#262626] border border-[#262626] text-zinc-300 font-mono text-xs uppercase tracking-wider transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Importar Chave</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowGenForm(true);
                      setShowImportForm(false);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-mono text-xs uppercase tracking-wider transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Gerar Nova Chave</span>
                  </button>
                </div>
              </div>

              {/* Key Generation Form */}
              {showGenForm && (
                <form onSubmit={handleGenerateKey} className="p-4 rounded-lg bg-[#121212] border border-[#262626] space-y-4 font-mono">
                  <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Gerar Novo Par de Chaves PGP
                    </span>
                    <button type="button" onClick={() => setShowGenForm(false)} className="text-zinc-500 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-400 uppercase">Nome / Pseudônimo *</label>
                      <input
                        type="text"
                        required
                        value={genName}
                        onChange={(e) => setGenName(e.target.value)}
                        placeholder="ex: Bug Hunter Joe"
                        className="w-full bg-[#171717] border border-[#262626] rounded px-3 py-2 text-zinc-200 text-xs focus:border-zinc-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-400 uppercase">E-mail de Contato *</label>
                      <input
                        type="email"
                        required
                        value={genEmail}
                        onChange={(e) => setGenEmail(e.target.value)}
                        placeholder="ex: hunter@security.org"
                        className="w-full bg-[#171717] border border-[#262626] rounded px-3 py-2 text-zinc-200 text-xs focus:border-zinc-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-400 uppercase">Algoritmo Criptográfico</label>
                      <select
                        value={genAlgorithm}
                        onChange={(e) => setGenAlgorithm(e.target.value as any)}
                        className="w-full bg-[#171717] border border-[#262626] rounded px-3 py-2 text-zinc-200 text-xs focus:border-zinc-500 focus:outline-none"
                      >
                        <option value="curve25519">Ed25519 / Curve25519 (Moderno, Rápido & Seguro)</option>
                        <option value="rsa">RSA 4096-bit (Padrão Corporativo Clássico)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-400 uppercase">Senha de Proteção (Opcional)</label>
                      <input
                        type="password"
                        value={genPassphrase}
                        onChange={(e) => setGenPassphrase(e.target.value)}
                        placeholder="Deixe em branco para sem senha"
                        className="w-full bg-[#171717] border border-[#262626] rounded px-3 py-2 text-zinc-200 text-xs focus:border-zinc-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {genError && (
                    <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{genError}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowGenForm(false)}
                      className="px-3 py-1.5 rounded bg-[#171717] text-zinc-400 text-xs uppercase tracking-wider"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isGenerating}
                      className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider disabled:opacity-50"
                    >
                      {isGenerating ? 'Gerando Chaves...' : 'Gerar Par de Chaves'}
                    </button>
                  </div>
                </form>
              )}

              {/* Key Import Form */}
              {showImportForm && (
                <form onSubmit={handleImportKey} className="p-4 rounded-lg bg-[#121212] border border-[#262626] space-y-4 font-mono">
                  <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Importar Chave Privada Existente
                    </span>
                    <button type="button" onClick={() => setShowImportForm(false)} className="text-zinc-500 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-400 uppercase">Identificador / Nome</label>
                      <input
                        type="text"
                        value={importName}
                        onChange={(e) => setImportName(e.target.value)}
                        placeholder="ex: Minha Chave Principal"
                        className="w-full bg-[#171717] border border-[#262626] rounded px-3 py-2 text-zinc-200 text-xs focus:border-zinc-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-400 uppercase">Senha da Chave (se criptografada)</label>
                      <input
                        type="password"
                        value={importPassphrase}
                        onChange={(e) => setImportPassphrase(e.target.value)}
                        placeholder="Senha para decifrar a chave privada..."
                        className="w-full bg-[#171717] border border-[#262626] rounded px-3 py-2 text-zinc-200 text-xs focus:border-zinc-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 uppercase">Chave Privada PGP (Armored) *</label>
                    <textarea
                      rows={5}
                      required
                      value={importPrivKey}
                      onChange={(e) => setImportPrivKey(e.target.value)}
                      placeholder="-----BEGIN PGP PRIVATE KEY BLOCK-----&#10;...&#10;-----END PGP PRIVATE KEY BLOCK-----"
                      className="w-full bg-[#171717] border border-[#262626] rounded p-2.5 text-zinc-200 text-xs focus:border-zinc-500 focus:outline-none"
                    />
                  </div>

                  {importError && (
                    <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{importError}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowImportForm(false)}
                      className="px-3 py-1.5 rounded bg-[#171717] text-zinc-400 text-xs uppercase tracking-wider"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider"
                    >
                      Importar Chave
                    </button>
                  </div>
                </form>
              )}

              {/* Keys List */}
              <div className="space-y-3">
                {keys.map((k) => {
                  const isActive = activeKey?.id === k.id;
                  return (
                    <div
                      key={k.id}
                      className={`p-4 rounded-lg bg-[#121212] border transition-all ${
                        isActive ? 'border-emerald-500/40 shadow-sm shadow-emerald-500/10' : 'border-[#262626]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">{k.name}</span>
                            <span className="text-xs text-zinc-400">&lt;{k.email}&gt;</span>
                            {isActive && (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                                Ativa
                              </span>
                            )}
                            {k.hasPassphrase && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-zinc-800 text-zinc-400 border border-[#262626] flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" />
                                Protegida
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
                            <div>
                              KeyID: <span className="text-emerald-400 font-bold">0x{k.keyId.slice(-8)}</span>
                            </div>
                            <div className="truncate max-w-xs">
                              Fingerprint: <span className="text-zinc-300">{k.fingerprint.slice(0, 16)}...</span>
                            </div>
                            <div>
                              Criada: <span>{new Date(k.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Key Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          {!isActive && (
                            <button
                              onClick={() => handleSetActiveKey(k.id)}
                              className="px-2.5 py-1 rounded bg-[#171717] hover:bg-[#262626] border border-[#262626] text-zinc-300 text-[10px] uppercase tracking-wider font-semibold transition-all"
                            >
                              Tornar Ativa
                            </button>
                          )}

                          <button
                            onClick={() => setViewingKey({ key: k, type: 'public' })}
                            className="px-2.5 py-1 rounded bg-[#171717] hover:bg-[#262626] border border-[#262626] text-zinc-300 text-[10px] uppercase tracking-wider font-semibold transition-all"
                          >
                            Chave Pública
                          </button>

                          <button
                            onClick={() => setViewingKey({ key: k, type: 'private' })}
                            className="px-2.5 py-1 rounded bg-[#171717] hover:bg-[#262626] border border-[#262626] text-zinc-400 hover:text-zinc-200 text-[10px] uppercase tracking-wider transition-all"
                          >
                            Privada
                          </button>

                          <button
                            onClick={() => handleDeleteKey(k.id)}
                            className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* TAB 3: VERIFY */}
          {activeTab === 'verify' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-200">
                  Verificador de Autenticidade PGP
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  Valide relatórios assinados por outros pesquisadores ou programas para confirmar integridade matemática.
                </p>
              </div>

              <div className="space-y-3 font-mono">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Mensagem PGP Assinada (Cleartext Armored) *</label>
                  <textarea
                    rows={6}
                    value={verifyText}
                    onChange={(e) => setVerifyText(e.target.value)}
                    placeholder="Cole aqui a mensagem começando com -----BEGIN PGP SIGNED MESSAGE-----..."
                    className="w-full bg-[#121212] border border-[#262626] rounded p-3 text-zinc-200 text-xs focus:border-zinc-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold">
                    Chave Pública PGP do Remetente (Opcional - usa chave ativa se vazio)
                  </label>
                  <textarea
                    rows={4}
                    value={verifyPubKey}
                    onChange={(e) => setVerifyPubKey(e.target.value)}
                    placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----..."
                    className="w-full bg-[#121212] border border-[#262626] rounded p-3 text-zinc-200 text-xs focus:border-zinc-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleVerify}
                    disabled={isVerifying || !verifyText.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isVerifying ? 'Verificando...' : 'Verificar Assinatura'}</span>
                  </button>
                </div>

                {verifyResult && (
                  <div className={`p-4 rounded-lg border font-mono ${
                    verifyResult.verified 
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300' 
                      : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                  }`}>
                    {verifyResult.verified ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Assinatura PGP Válida e Autêntica!</span>
                        </div>
                        <p className="text-[11px] text-zinc-300">
                          O documento não foi adulterado desde a emissão. Chave do signatário: <strong>0x{verifyResult.signerKeyId}</strong>.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                          <span>Falha na Verificação da Assinatura</span>
                        </div>
                        <p className="text-[11px] text-zinc-300">
                          {verifyResult.error || 'A assinatura não corresponde à chave pública ou o conteúdo foi alterado.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 bg-[#0a0a0a] border-t border-[#262626] text-xs font-mono">
          <span className="text-zinc-500 text-[10px]">
            OpenPGP.js Standard Encryption & Signing
          </span>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#262626] hover:bg-[#333333] text-zinc-200 font-semibold text-xs uppercase tracking-wider transition-all"
          >
            Fechar
          </button>
        </div>

      </div>

      {/* View Key Armor Submodal */}
      {viewingKey && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4">
          <div className="w-full max-w-2xl bg-[#0a0a0a] border border-[#262626] rounded-xl p-5 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <div>
                <h4 className="font-bold text-white uppercase tracking-wider text-xs">
                  {viewingKey.type === 'public' ? 'Chave Pública PGP' : 'Chave Privada PGP'}
                </h4>
                <p className="text-[11px] text-zinc-400">
                  {viewingKey.key.name} &lt;{viewingKey.key.email}&gt; - 0x{viewingKey.key.keyId}
                </p>
              </div>

              <button
                onClick={() => setViewingKey(null)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <pre className="p-3.5 rounded bg-[#121212] border border-[#262626] text-[10px] text-zinc-300 overflow-x-auto whitespace-pre leading-relaxed max-h-80">
                {viewingKey.type === 'public' ? viewingKey.key.armoredPublicKey : viewingKey.key.armoredPrivateKey}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-zinc-500">
                {viewingKey.type === 'public' ? 'Compartilhe com programas e plataformas' : '⚠️ NUNCA compartilhe sua chave privada'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(viewingKey.type === 'public' ? viewingKey.key.armoredPublicKey : viewingKey.key.armoredPrivateKey)}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar Chave'}</span>
                </button>
                <button
                  onClick={() => setViewingKey(null)}
                  className="px-3 py-1.5 rounded bg-[#171717] hover:bg-[#262626] text-zinc-300 border border-[#262626] text-xs uppercase tracking-wider"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
