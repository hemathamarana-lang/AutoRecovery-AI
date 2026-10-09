import React from 'react';
import { LedgerState, FailureMode } from '../types/payment';
import {
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Headphones,
  FileSpreadsheet,
} from 'lucide-react';

interface ResultCardProps {
  status: LedgerState['status'];
  ledger: LedgerState;
  failureMode: FailureMode;
  onReset: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  status,
  ledger,
  failureMode,
  onReset,
}) => {
  if (status !== 'RECOVERED' && status !== 'ESCALATED') {
    return null;
  }

  const isRecovered = status === 'RECOVERED';

  return (
    <div className="w-full mt-4">
      {isRecovered ? (
        <div className="rounded-xl border border-emerald-800/80 bg-emerald-950/30 p-4 sm:p-5 backdrop-blur-md shadow-lg shadow-emerald-950/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-900/50 border border-emerald-700/60 text-emerald-400">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-emerald-100">
                    Payment Autonomous Recovery Successful
                  </span>
                  <span className="text-xs font-mono text-emerald-300 font-medium px-2 py-0.5 rounded bg-emerald-900/40 border border-emerald-800">
                    RECOVERED
                  </span>
                </div>
                <p className="text-xs text-emerald-300/80 mt-1 max-w-2xl leading-relaxed">
                  {failureMode === 'gateway_a_timeout' ? (
                    <>
                      <strong>Timeout Idempotency Guard:</strong> Autonomous Evaluator rejected retry to prevent double billing. Status check identified pre-existing upstream capture on Gateway A. Exactly <strong>1 charge</strong> verified. Zero duplicate debits.
                    </>
                  ) : failureMode === 'gateway_a_503' ? (
                    <>
                      <strong>Dynamic Failover:</strong> Initial retry to Gateway A failed (503) and was blacklisted in Recovery Memory. Evaluator smoothly switched rails to <strong>Gateway B</strong>, capturing ₹{ledger.amount.toLocaleString()} with exactly <strong>1 verified charge</strong>.
                    </>
                  ) : (
                    <>
                      Transaction completed cleanly via {ledger.gatewayUsed}. Idempotency verified with exactly 1 charge.
                    </>
                  )}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-emerald-400/90 font-mono mt-2.5">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Charges: {ledger.charges}/1 (SAFE)
                  </span>
                  <span className="text-emerald-700">·</span>
                  <span>Gateway: {ledger.gatewayUsed}</span>
                  <span className="text-emerald-700">·</span>
                  <span>Amount: ₹{ledger.amount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onReset}
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border border-zinc-700 text-xs font-medium transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5 text-zinc-400" />
              Test Another Scenario
            </button>
          </div>
        </div>
      ) : (
        /* Escalated to Human Alert Banner */
        <div className="rounded-xl border border-rose-800 bg-rose-950/40 p-4 sm:p-5 backdrop-blur-md shadow-lg shadow-rose-950/30">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-900/60 border border-rose-700 text-rose-300">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-rose-100">
                    Escalated to human — Max Recovery Attempts Exhausted
                  </span>
                  <span className="text-xs font-mono text-rose-300 font-medium px-2 py-0.5 rounded bg-rose-900/60 border border-rose-700">
                    ESCALATED
                  </span>
                </div>
                <p className="text-xs text-rose-300/80 mt-1 max-w-2xl leading-relaxed">
                  All 3 autonomous attempts (Retry Gateway A, Switch Gateway B, Status Probe) encountered catastrophic upstream failures. The Orchestrator halted autonomous actions to ensure customer funds remain strictly protected. Zero charges applied.
                </p>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-rose-400 font-mono mt-2.5">
                  <span className="flex items-center gap-1">
                    <Headphones className="h-3.5 w-3.5" />
                    Tier-3 Payment Operations & SRE alerted
                  </span>
                  <span className="text-rose-700">·</span>
                  <span className="flex items-center gap-1">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    Incident Ticket #INC-9824 auto-created
                  </span>
                  <span className="text-rose-700">·</span>
                  <span className="text-emerald-400">Total Charges: 0 (No risk)</span>
                </div>
              </div>
            </div>

            <button
              onClick={onReset}
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border border-zinc-700 text-xs font-medium transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5 text-zinc-400" />
              Reset Simulation
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
