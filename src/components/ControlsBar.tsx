import React from 'react';
import { FailureMode } from '../types/payment';
import { Play, RotateCcw, AlertTriangle, ShieldCheck, IndianRupee, Gauge } from 'lucide-react';

interface ControlsBarProps {
  amount: number;
  setAmount: (val: number) => void;
  failureMode: FailureMode;
  setFailureMode: (val: FailureMode) => void;
  onPay: () => void;
  onReset: () => void;
  isRunning: boolean;
  stepDelay: number;
  setStepDelay: (val: number) => void;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
  amount,
  setAmount,
  failureMode,
  setFailureMode,
  onPay,
  onReset,
  isRunning,
  stepDelay,
  setStepDelay,
}) => {
  const failureDescriptions: Record<FailureMode, string> = {
    none: 'Normal checkout: Gateway A captures directly without failure.',
    gateway_a_503: 'Circuit failure: Retry A fails (503), saved to memory, then Gateway B succeeds.',
    gateway_a_timeout: 'Ambiguous timeout: Gateway A settled internally. Status check verifies 1 charge without duplicate retry.',
    all_gateways_down: 'Multi-rail outage: All 3 recovery attempts fail -> Autonomous escalation to human.',
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-5 backdrop-blur-md shadow-xl">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Left Inputs Group */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 flex-1">
          {/* Amount Input */}
          <div className="flex flex-col gap-1 min-w-[150px]">
            <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Payment Amount
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-zinc-400 font-mono text-sm">
                ₹
              </span>
              <input
                type="number"
                min="1"
                max="1000000"
                value={amount}
                onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 0))}
                disabled={isRunning}
                className="w-full pl-8 pr-3 py-2 bg-zinc-950 border border-zinc-700/80 rounded-lg text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Inject Failure Dropdown */}
          <div className="flex flex-col gap-1 flex-1 min-w-[280px]">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                Inject Failure
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">
                Simulation Scenario
              </span>
            </div>
            <select
              value={failureMode}
              onChange={(e) => setFailureMode(e.target.value as FailureMode)}
              disabled={isRunning}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700/80 rounded-lg text-xs font-mono text-zinc-100 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all disabled:opacity-50 cursor-pointer"
            >
              <option value="none">None (Standard successful payment)</option>
              <option value="gateway_a_503">Gateway A 503 (Upstream Service Unavailable)</option>
              <option value="gateway_a_timeout">
                Gateway A Timeout (payment actually processed)
              </option>
              <option value="all_gateways_down">All gateways down (Cascading failure)</option>
            </select>
          </div>

          {/* Speed Preset Control */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1">
              <Gauge className="h-3 w-3" />
              Agent Step Delay
            </label>
            <div className="flex items-center gap-1 bg-zinc-950 p-1 border border-zinc-800 rounded-lg">
              <button
                type="button"
                onClick={() => setStepDelay(1000)}
                disabled={isRunning}
                className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors ${
                  stepDelay === 1000
                    ? 'bg-zinc-800 text-cyan-300 font-medium'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                1.0s (Normal)
              </button>
              <button
                type="button"
                onClick={() => setStepDelay(400)}
                disabled={isRunning}
                className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors ${
                  stepDelay === 400
                    ? 'bg-zinc-800 text-cyan-300 font-medium'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                0.4s (Fast)
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 pt-2 lg:pt-5">
          <button
            onClick={onPay}
            disabled={isRunning}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-mono text-sm font-semibold tracking-wide shadow-lg transition-all ${
              isRunning
                ? 'bg-cyan-950 text-cyan-400 border border-cyan-800 cursor-not-allowed'
                : 'bg-cyan-500 hover:bg-cyan-400 text-zinc-950 active:scale-[0.98] shadow-cyan-500/20'
            }`}
          >
            {isRunning ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
                </span>
                <span>Agents Running...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Pay ₹{amount.toLocaleString()}</span>
              </>
            )}
          </button>

          <button
            onClick={onReset}
            disabled={isRunning}
            className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors disabled:opacity-40"
            title="Reset Simulation State"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scenario explanation footer */}
      <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-medium">Scenario Behavior:</span>
          <span>{failureDescriptions[failureMode]}</span>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-zinc-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Max 1 charge invariant enforced</span>
        </div>
      </div>
    </div>
  );
};
