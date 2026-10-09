import React from 'react';
import { ShieldCheck, Cpu, Terminal } from 'lucide-react';

export const TopNav: React.FC = () => {
  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-zinc-950 font-black shadow-md shadow-cyan-500/20">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-zinc-100 font-mono">
                AutoRecover <span className="text-cyan-400">AI</span>
              </h1>
              {/* Visible Badge required by user: "Simulated prototype - mock gateways" */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-amber-800/60 bg-amber-950/30 text-amber-300 font-mono text-[11px] font-medium tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                Simulated prototype - mock gateways
              </div>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              Multi-Agent Autonomous Payment Recovery Engine · Zero Double Charges
            </p>
          </div>
        </div>

        {/* Right Info Meta */}
        <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
          <div className="hidden md:flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            <span className="text-zinc-300">Agent Network Online</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-400">Max Attempts: 3</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300">
            <Terminal className="h-3.5 w-3.5 text-cyan-400" />
            <span>v2.4-sim</span>
          </div>
        </div>
      </div>
    </header>
  );
};
