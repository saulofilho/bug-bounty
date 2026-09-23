import React, { useState, useMemo } from 'react';
import { 
  Zap, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  Code2, 
  Layers, 
  Terminal, 
  Lock, 
  Database,
  ArrowRight,
  TrendingDown,
  Clock
} from 'lucide-react';

export const RaceConditionStudio: React.FC = () => {
  const [initialBalance, setInitialBalance] = useState<number>(100);
  const [withdrawalAmount, setWithdrawalAmount] = useState<number>(80);
  const [concurrentRequests, setConcurrentRequests] = useState<number>(5);
  const [usePessimisticLock, setUsePessimisticLock] = useState<boolean>(false);
  const [useIdempotencyKey, setUseIdempotencyKey] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Simulation calculation
  const simulation = useMemo(() => {
    if (useIdempotencyKey) {
      // Exactly 1 request succeeds because duplicate keys are dropped
      const finalBalance = initialBalance - withdrawalAmount;
      return {
        successfulRequests: 1,
        failedRequests: concurrentRequests - 1,
        finalBalance: Math.max(0, finalBalance),
        totalWithdrawn: withdrawalAmount,
        hasRaceCondition: false,
        explanation: 'A Chave de Idempotência (Idempotency-Key) descartou todas as 4 requisições duplicadas que chegaram na mesma janela de milissegundos.'
      };
    }

    if (usePessimisticLock) {
      // Safe transactional lock: only 1 request can execute when balance < 2 * amount
      const maxPossible = Math.floor(initialBalance / withdrawalAmount);
      const successful = Math.min(concurrentRequests, maxPossible);
      const finalBalance = initialBalance - (successful * withdrawalAmount);
      return {
        successfulRequests: successful,
        failedRequests: concurrentRequests - successful,
        finalBalance,
        totalWithdrawn: successful * withdrawalAmount,
        hasRaceCondition: false,
        explanation: 'O bloqueio pessimista (SELECT ... FOR UPDATE) serializou as transações. Quando o saldo baixou de $80, as requisições subsequentes foram rejeitadas com erro de saldo insuficiente.'
      };
    }

    // Vulnerable TOCTOU (Time-of-Check to Time-of-Use):
    // All concurrent requests check balance ($100 >= $80 is TRUE for all 5 requests before any commit!)
    const successful = concurrentRequests;
    const totalWithdrawn = successful * withdrawalAmount;
    const finalBalance = initialBalance - totalWithdrawn; // Negative balance!

    return {
      successfulRequests: successful,
      failedRequests: 0,
      finalBalance,
      totalWithdrawn,
      hasRaceCondition: true,
      explanation: `Falha TOCTOU Crítica! Todas as ${concurrentRequests} requisições leram o saldo antes da primeira gravar. Foram sacados $${totalWithdrawn} de uma conta com apenas $${initialBalance}, gerando saldo negativo de $${finalBalance}!`
    };
  }, [initialBalance, withdrawalAmount, concurrentRequests, usePessimisticLock, useIdempotencyKey]);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>Race Condition & Concurrency Studio</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">TOCTOU, HTTP/2 Single-Packet Attack & Locks</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Simulador de Condições de Corrida e Concorrência em APIs
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Analise falhas de sincronização transacional onde múltiplas requisições paralelas exploram a janela entre a verificação de limites (Time-of-Check) e o consumo de recursos (Time-of-Use), gerando saques duplicados ou cupons múltiplos.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Simulation Dashboard */}
      <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-5 shadow-lg">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1e1e28] pb-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Parâmetros do Cenário de Concorrência (Exemplo: Saque Financeiro)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-mono font-bold text-zinc-300">Saldo Inicial na Conta ($):</label>
            <input
              type="number"
              value={initialBalance}
              onChange={e => setInitialBalance(Number(e.target.value))}
              className="w-full bg-[#0c0c10] border border-[#232330] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono font-bold text-zinc-300">Valor de Cada Saque ($):</label>
            <input
              type="number"
              value={withdrawalAmount}
              onChange={e => setWithdrawalAmount(Number(e.target.value))}
              className="w-full bg-[#0c0c10] border border-[#232330] rounded-xl px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono font-bold text-zinc-300">Requisições Simultâneas (Threads):</label>
            <input
              type="number"
              min={2}
              max={20}
              value={concurrentRequests}
              onChange={e => setConcurrentRequests(Number(e.target.value))}
              className="w-full bg-[#0c0c10] border border-[#232330] rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        {/* Lock & Idempotency Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className={`p-4 rounded-xl border transition-all cursor-pointer ${
            usePessimisticLock ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-[#151520] border-[#222232] text-zinc-400'
          }`} onClick={() => setUsePessimisticLock(!usePessimisticLock)}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono flex items-center gap-2">
                <Database className="w-4 h-4" />
                <span>Bloqueio Pessimista de Banco (SELECT ... FOR UPDATE)</span>
              </span>
              <input type="checkbox" checked={usePessimisticLock} readOnly className="accent-emerald-500" />
            </div>
            <p className="text-[11px] pt-1 text-zinc-400">
              Serializa transações no banco, impedindo leituras concorrentes do mesmo registro até o commit.
            </p>
          </div>

          <div className={`p-4 rounded-xl border transition-all cursor-pointer ${
            useIdempotencyKey ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300' : 'bg-[#151520] border-[#222232] text-zinc-400'
          }`} onClick={() => setUseIdempotencyKey(!useIdempotencyKey)}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>Chave de Idempotência (Idempotency-Key Header via Redis)</span>
              </span>
              <input type="checkbox" checked={useIdempotencyKey} readOnly className="accent-cyan-500" />
            </div>
            <p className="text-[11px] pt-1 text-zinc-400">
              Usa lock distribuído atômico (Redis SETNX) com TTL curto para descartar requisições com a mesma chave.
            </p>
          </div>
        </div>

        {/* Simulation Output Card */}
        <div className={`p-5 rounded-2xl border space-y-3 ${
          simulation.hasRaceCondition ? 'bg-rose-500/10 border-rose-500/40' : 'bg-emerald-500/10 border-emerald-500/40'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase flex items-center gap-2">
              {simulation.hasRaceCondition ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span className="text-rose-300">Vulnerabilidade de Race Condition Confirmada!</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">Execução Segura & Concorrência Controlada</span>
                </>
              )}
            </span>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-zinc-300">Saques Aprovados: <strong>{simulation.successfulRequests}</strong></span>
              <span className="text-zinc-300">Saldo Final: <strong className={simulation.finalBalance < 0 ? 'text-rose-400 font-black' : 'text-emerald-400'}>${simulation.finalBalance}</strong></span>
            </div>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed font-mono">
            {simulation.explanation}
          </p>
        </div>
      </div>

      {/* Defense Code Snippets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#1e1e28] pb-2 text-xs font-mono">
            <span className="text-white font-bold flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Solução SQL Atômica (Sem Leitura Prévia Solta)</span>
            </span>
            <button
              type="button"
              onClick={() => handleCopy('sql-atomic', `-- Operação atômica em linha única: a condição é checada no próprio UPDATE
UPDATE accounts 
SET balance = balance - 80 
WHERE id = 123 AND balance >= 80;

-- Em seguida, verifica se rows_affected == 1`)}
              className="text-zinc-400 hover:text-white flex items-center gap-1"
            >
              {copiedKey === 'sql-atomic' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>Copiar</span>
            </button>
          </div>

          <pre className="p-3.5 rounded-xl bg-[#0a0a0f] border border-[#1e1e2a] text-emerald-300 font-mono text-xs overflow-x-auto leading-relaxed">
{`-- Operação atômica em linha única: a condição é checada no próprio UPDATE
UPDATE accounts 
SET balance = balance - 80 
WHERE id = 123 AND balance >= 80;

-- Se rows_affected == 1: Saque autorizado
-- Se rows_affected == 0: Saldo insuficiente (rollback)`}
          </pre>
        </div>

        <div className="bg-[#121218] border border-[#22222d] rounded-2xl p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#1e1e28] pb-2 text-xs font-mono">
            <span className="text-white font-bold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Lock Distribuído via Redis (Node.js)</span>
            </span>
            <button
              type="button"
              onClick={() => handleCopy('redis-lock', `// Bloqueio atômico de idempotência com TTL de 5 segundos
const lockAcquired = await redis.set(\`lock:\${userId}:\${idempotencyKey}\`, "locked", "NX", "EX", 5);
if (!lockAcquired) {
  return res.status(409).json({ error: "Requisição duplicada em processamento" });
}`)}
              className="text-zinc-400 hover:text-white flex items-center gap-1"
            >
              {copiedKey === 'redis-lock' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>Copiar</span>
            </button>
          </div>

          <pre className="p-3.5 rounded-xl bg-[#0a0a0f] border border-[#1e1e2a] text-cyan-300 font-mono text-xs overflow-x-auto leading-relaxed">
{`// Bloqueio atômico com Redis SETNX e expiração curta
const key = \`lock:\${userId}:\${req.headers['idempotency-key']}\`;
const lockAcquired = await redis.set(key, "1", "NX", "EX", 5);

if (!lockAcquired) {
  return res.status(409).json({ error: "Requisição duplicada já processada" });
}`}
          </pre>
        </div>
      </div>
    </div>
  );
};
