import React, { useEffect, useRef } from 'react';
import { TimelineStep } from '../types/payment';
import { EvaluatorTable } from './EvaluatorTable';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Cpu,
  Layers,
  ShieldCheck,
  Zap,
  ArrowRight,
  Radio,
} from 'lucide-react';

interface AgentTimelineProps {
  steps: TimelineStep[];
  isRunning: boolean;
  activeAgent: string | null;
}

export const AgentTimeline: React.FC<AgentTimelineProps> = ({
  steps,
  isRunning,
  activeAgent,
}) => {
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollEndRef.current) {
      scrollEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [steps.length]);

  const getAgentIcon = (agent: string, status: string) => {
    switch (agent) {
      case 'Monitor':
        return <Activity className="h-4 w-4 text-cyan-400" />;
      case 'Diagnostic':
        return <HelpCircle className="h-4 w-4 text-amber-400" />;
      case 'Planner':
        return <Layers className="h-4 w-4 text-indigo-400" />;
      case 'Evaluator':
        return <Cpu className="h-4 w-4 text-purple-400" />;
      case 'Executor':
        return <Zap className="h-4 w-4 text-blue-400" />;
      case 'Verifier':
        return <ShieldCheck className="h-4 w-4 text-emerald-400" />;
      case 'Orchestrator':
        return <AlertTriangle className="h-4 w-4 text-rose-400" />;
      default:
        return <Radio className="h-4 w-4 text-zinc-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
      case 'warning':
        return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />;
      case 'error':
        return <XCircle className="h-3.5 w-3.5 text-rose-400" />;
      default:
        return <span className="h-2 w-2 rounded-full bg-cyan-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 md:p-5 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-2.5 w-2.5 items-center justify-center">
            {isRunning ? (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
            ) : (
              <span className="h-2 w-2 rounded-full bg-zinc-600"></span>
            )}
          </div>
          <h2 className="text-sm font-semibold text-zinc-100 tracking-wide">
            Live Agent Timeline
          </h2>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
          <span>{steps.length} steps recorded</span>
          {activeAgent && isRunning && (
            <>
              <span className="text-zinc-600">·</span>
              <span className="text-cyan-400 font-medium animate-pulse">
                Active: {activeAgent}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Timeline Steps Container */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        {steps.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-zinc-800 rounded-lg text-zinc-500">
            <Radio className="h-8 w-8 text-zinc-600 mb-2 stroke-[1.5]" />
            <p className="text-sm font-medium text-zinc-400">Autonomous Agents on Standby</p>
            <p className="text-xs text-zinc-500 max-w-sm mt-1">
              Select a failure scenario above and click &quot;Pay&quot; to observe the autonomous agents orchestrating failure detection, diagnosis, evaluation, execution, and verification.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-px before:bg-zinc-800">
            {steps.map((step, index) => {
              const isCurrent = isRunning && index === steps.length - 1;

              return (
                <div
                  key={step.id}
                  className={`relative group transition-all duration-300 ${
                    isCurrent ? 'opacity-100 scale-[1.005]' : 'opacity-90'
                  }`}
                >
                  {/* Timeline Node Icon */}
                  <div
                    className={`absolute -left-6 top-1 flex h-5 w-5 items-center justify-center rounded-full border bg-zinc-950 transition-colors ${
                      step.status === 'success'
                        ? 'border-emerald-650 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        : step.status === 'warning'
                        ? 'border-amber-600/70 text-amber-400'
                        : step.status === 'error'
                        ? 'border-rose-600/70 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                        : 'border-zinc-700 text-cyan-400'
                    }`}
                  >
                    <span className="scale-75">{getStatusBadge(step.status)}</span>
                  </div>

                  {/* Step Card */}
                  <div
                    className={`rounded-lg border p-3 text-xs transition-all ${
                      step.status === 'error'
                        ? 'border-rose-900/40 bg-rose-950/20'
                        : step.status === 'warning'
                        ? 'border-amber-900/30 bg-amber-950/10'
                        : step.status === 'success'
                        ? 'border-emerald-900/30 bg-emerald-950/10'
                        : 'border-zinc-800/80 bg-zinc-950/50 hover:border-zinc-700/80'
                    }`}
                  >
                    {/* Agent Header line */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 font-medium text-zinc-200">
                          {getAgentIcon(step.agent, step.status)}
                          <span className="font-mono text-zinc-100 tracking-tight font-semibold">
                            {step.agent}
                          </span>
                        </div>
                        <span className="text-zinc-600">·</span>
                        <span className="text-[11px] text-zinc-400 font-mono">
                          Attempt {step.attemptNumber}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {step.httpStatus !== undefined && (
                          <span
                            className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                              step.httpStatus === 200
                                ? 'text-emerald-300 bg-emerald-950/80 border-emerald-700/80 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                                : step.httpStatus === 503
                                ? 'text-amber-300 bg-amber-950/80 border-amber-700/80 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                                : step.httpStatus === 504 || step.httpStatus === 500
                                ? 'text-rose-300 bg-rose-950/80 border-rose-700/80 shadow-[0_0_8px_rgba(244,63,94,0.2)]'
                                : 'text-zinc-300 bg-zinc-900 border-zinc-700'
                            }`}
                          >
                            HTTP {step.httpStatus === 0 ? 'Network Error' : step.httpStatus}
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
                          <span>{step.timestamp}</span>
                        </div>
                      </div>
                    </div>

                    {/* Step Message */}
                    <p
                      className={`text-xs leading-relaxed ${
                        step.status === 'error'
                          ? 'text-rose-200/90 font-medium'
                          : step.status === 'warning'
                          ? 'text-amber-200/90'
                          : step.status === 'success'
                          ? 'text-emerald-200/90'
                          : 'text-zinc-300'
                      }`}
                    >
                      {step.shortMessage}
                    </p>

                    {/* Endpoint URL trace */}
                    {step.details?.endpointUrl && (
                      <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[10px] text-zinc-400">
                        <span className="text-cyan-400 font-semibold">GET</span>
                        <span className="truncate select-all text-zinc-400 bg-zinc-900/60 px-1.5 py-0.5 rounded border border-zinc-800">
                          {step.details.endpointUrl}
                        </span>
                      </div>
                    )}

                    {/* Evaluator Matrix Table Rendering */}
                    {step.evaluationMatrix && step.evaluationMatrix.length > 0 && (
                      <EvaluatorTable evaluations={step.evaluationMatrix} />
                    )}

                    {/* Planner Plans Preview */}
                    {step.details?.generatedPlans && (
                      <div className="mt-2.5 pt-2 border-t border-zinc-800/70 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {step.details.generatedPlans.map((p) => (
                          <div
                            key={p.id}
                            className="p-2 rounded border border-zinc-800 bg-zinc-900/40 text-[11px]"
                          >
                            <div className="flex items-center justify-between text-zinc-300 font-medium">
                              <span>{p.title}</span>
                              <ArrowRight className="h-3 w-3 text-zinc-500" />
                            </div>
                            <p className="text-zinc-500 text-[10px] mt-1 leading-normal">
                              Target: {p.targetGateway}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={scrollEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};
