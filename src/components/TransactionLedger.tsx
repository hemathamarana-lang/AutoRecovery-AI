import React, { useState } from 'react';
import { LedgerState, RecoveryMemoryEntry } from '../types/payment';
import {
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  History,
  Server,
  KeyRound,
  FileText,
  BadgeAlert,
} from 'lucide-react';

interface TransactionLedgerProps {
  ledger: LedgerState;
  memory: RecoveryMemoryEntry[];
}

export const TransactionLedger: React.FC<TransactionLedgerProps> = ({ ledger, memory }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getStatusColor = (status: LedgerState['status']) => {
    switch (status) {
      case 'RECOVERED':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60';
      case 'ESCALATED':
        return 'text-rose-400 bg-rose-950/40 border-rose-800/60';
      case 'IN_RECOVERY':
        return 'text-amber-400 bg-amber-950/40 border-amber-800/60';
      case 'INITIALIZING':
      case 'PENDING':
        return 'text-cyan-400 bg-cyan-950/40 border-cyan-800/60';
      default:
        return 'text-zinc-400 bg-zinc-900 border-zinc-800';
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Transaction Ledger Card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 md:p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-zinc-100 tracking-wide">
              Transaction Ledger
            </h2>
          </div>
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-medium border ${getStatusColor(
              ledger.status
            )}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
            {ledger.status}
          </div>
        </div>

        {/* Ledger Core Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Transaction ID */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-2.5">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="flex items-center gap-1.5 text-[11px]">
                <KeyRound className="h-3 w-3 text-zinc-500" />
                Transaction ID
              </span>
              <button
                onClick={() => copyToClipboard(ledger.transactionId, 'txId')}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
                title="Copy Transaction ID"
              >
                {copiedKey === 'txId' ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
            <div className="font-mono text-zinc-200 truncate select-all font-medium">
              {ledger.transactionId}
            </div>
          </div>

          {/* Idempotency Key */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-2.5">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="flex items-center gap-1.5 text-[11px]">
                <KeyRound className="h-3 w-3 text-zinc-500" />
                Idempotency Key
              </span>
              <button
                onClick={() => copyToClipboard(ledger.idempotencyKey, 'idemp')}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
                title="Copy Idempotency Key"
              >
                {copiedKey === 'idemp' ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
            <div className="font-mono text-cyan-300 truncate select-all font-medium">
              {ledger.idempotencyKey}
            </div>
          </div>

          {/* Gateway Used */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-2.5">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] mb-1">
              <Server className="h-3 w-3 text-zinc-500" />
              Gateway Used
            </div>
            <div className="font-mono text-zinc-200 font-semibold text-sm">
              {ledger.gatewayUsed}
            </div>
          </div>

          {/* Amount */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-2.5">
            <div className="text-zinc-400 text-[11px] mb-1">Total Amount</div>
            <div className="font-mono text-zinc-100 font-semibold text-sm">
              ₹{ledger.amount.toLocaleString()} <span className="text-zinc-500 text-xs font-normal">INR</span>
            </div>
          </div>
        </div>

        {/* Number of Charges Banner (Strict Safety Guard: must never exceed 1) */}
        <div className="mt-3.5 rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-md ${
                  ledger.charges === 1
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                    : ledger.charges === 0
                    ? 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                    : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-200">
                    Number of Charges:
                  </span>
                  <span
                    className={`font-mono text-sm font-bold ${
                      ledger.charges === 1
                        ? 'text-emerald-400'
                        : ledger.charges === 0
                        ? 'text-zinc-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {ledger.charges} <span className="text-zinc-500 text-xs font-normal">/ Max 1</span>
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Idempotency Guarantee: charges must never exceed 1 under any failure route.
                </p>
              </div>
            </div>

            <div className="text-right">
              {ledger.charges === 1 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-medium bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900">
                  <Check className="h-3 w-3" />
                  SAFE (1 Charge)
                </span>
              ) : ledger.charges === 0 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                  0 Charged
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-900">
                  <BadgeAlert className="h-3 w-3" />
                  VIOLATION
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recovery Memory Card */}
      <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 md:p-5 backdrop-blur-sm flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-zinc-100 tracking-wide">
              Recovery Memory
            </h2>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            {memory.length} {memory.length === 1 ? 'attempt cached' : 'attempts cached'}
          </span>
        </div>

        <p className="text-[11px] text-zinc-400 mb-3 leading-relaxed">
          Stateful agent memory cache. Failed plans are blacklisted so Evaluator never repeats an unsuccessful strategy.
        </p>

        {/* Memory Items List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
          {memory.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center text-center p-4 border border-dashed border-zinc-800 rounded-lg text-zinc-500">
              <History className="h-5 w-5 text-zinc-600 mb-1" />
              <span className="text-xs text-zinc-400">Recovery Memory is Empty</span>
              <span className="text-[11px] text-zinc-600 mt-0.5">
                Attempted recovery actions will be appended here
              </span>
            </div>
          ) : (
            memory.map((entry) => (
              <div
                key={entry.id}
                className={`rounded-lg border p-2.5 text-xs transition-colors ${
                  entry.result === 'SUCCESS'
                    ? 'border-emerald-900/50 bg-emerald-950/20'
                    : 'border-zinc-800 bg-zinc-950/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-zinc-400">
                      #{entry.attempt}
                    </span>
                    <span className="font-medium text-zinc-200">{entry.planTitle}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {entry.httpStatus !== undefined && (
                      <span className="font-mono text-[10px] text-zinc-400 px-1 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                        HTTP {entry.httpStatus}
                      </span>
                    )}
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        entry.result === 'SUCCESS'
                          ? 'text-emerald-300 bg-emerald-950 border border-emerald-800'
                          : 'text-rose-400 bg-rose-950 border border-rose-900'
                      }`}
                    >
                      {entry.result}
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono flex items-center justify-between">
                  <span>Target: {entry.gateway}</span>
                  <span className="text-zinc-500">{entry.timestamp}</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                  {entry.detail}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
