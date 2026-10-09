import React from 'react';
import { PlanEvaluation } from '../types/payment';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

interface EvaluatorTableProps {
  evaluations: PlanEvaluation[];
}

export const EvaluatorTable: React.FC<EvaluatorTableProps> = ({ evaluations }) => {
  return (
    <div className="mt-3 overflow-hidden rounded-md border border-zinc-800 bg-zinc-950/70 text-xs">
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/60 px-3 py-1.5">
        <span className="font-mono font-medium text-zinc-300">Plan Safety & Cost Evaluation Matrix</span>
        <span className="text-[11px] text-zinc-500">Autonomous Selection Criteria</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono">
          <thead>
            <tr className="border-b border-zinc-850 bg-zinc-900/30 text-[11px] text-zinc-400">
              <th className="px-3 py-2">Candidate Plan</th>
              <th className="px-3 py-2">Latency</th>
              <th className="px-3 py-2">Cost Delta</th>
              <th className="px-3 py-2">Risk Factor</th>
              <th className="px-3 py-2">Success %</th>
              <th className="px-3 py-2 text-right">Verdict</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-850/60 text-zinc-300">
            {evaluations.map((item) => {
              const isSelected = item.isSelected;
              const isRejected = item.isRejected;

              return (
                <tr
                  key={item.planId}
                  className={`transition-colors ${
                    isSelected
                      ? 'bg-emerald-950/20 text-emerald-200'
                      : isRejected
                      ? 'bg-zinc-900/10 text-zinc-400 opacity-80'
                      : 'hover:bg-zinc-900/30'
                  }`}
                >
                  <td className="px-3 py-2.5 font-medium">
                    <div className="flex items-center gap-1.5">
                      {isSelected ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      ) : isRejected ? (
                        <XCircle className="h-3.5 w-3.5 text-rose-400/80 shrink-0" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 shrink-0" />
                      )}
                      <span>{item.title}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-400">{item.timeScore}</td>
                  <td className="px-3 py-2.5 text-zinc-400">{item.costScore}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        item.riskLevel === 'Critical'
                          ? 'text-rose-400'
                          : item.riskLevel === 'High'
                          ? 'text-amber-400'
                          : 'text-zinc-400'
                      }`}
                    >
                      {item.riskLevel === 'Critical' && <AlertTriangle className="h-3 w-3 shrink-0" />}
                      {item.riskLevel}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-12 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className={`h-full ${
                            isSelected ? 'bg-emerald-500' : isRejected ? 'bg-zinc-700' : 'bg-cyan-500'
                          }`}
                          style={{ width: `${item.successChance}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-zinc-400">{item.successChance}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        SELECTED
                      </span>
                    )}
                    {isRejected && (
                      <span className="text-rose-400/90 text-[11px]" title={item.rejectionReason}>
                        {item.rejectionReason?.includes('duplicate charge')
                          ? 'REJECTED: Duplicate Risk'
                          : item.isFailedInMemory
                          ? 'DISQUALIFIED: Memory'
                          : 'REJECTED'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {evaluations.some((e) => e.rejectionReason) && (
        <div className="border-t border-zinc-850 bg-zinc-900/40 px-3 py-2 text-[11px] text-zinc-400">
          {evaluations
            .filter((e) => e.rejectionReason)
            .map((e) => (
              <div key={e.planId} className="flex items-start gap-1.5">
                <span className="text-zinc-500">·</span>
                <span>
                  <strong className="text-zinc-300">{e.title}:</strong> {e.rejectionReason}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};
