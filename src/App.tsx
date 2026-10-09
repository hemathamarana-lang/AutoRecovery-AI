import React, { useState, useRef, useEffect } from 'react';
import {
  FailureMode,
  LedgerState,
  RecoveryMemoryEntry,
  TimelineStep,
} from './types/payment';
import {
  runMonitor,
  runDiagnostic,
  runPlanner,
  runEvaluator,
  runExecutor,
  runVerifier,
  runOrchestratorEscalation,
  getTimestamp,
} from './services/agents';
import {
  callRealGatewayA,
  callRealGatewayB,
  RealGatewayResponse,
  GATEWAY_A_PRIMARY_URL,
  GATEWAY_B_PRIMARY_URL,
} from './services/realGateways';
import { TopNav } from './components/TopNav';
import { ControlsBar } from './components/ControlsBar';
import { AgentTimeline } from './components/AgentTimeline';
import { TransactionLedger } from './components/TransactionLedger';
import { ResultCard } from './components/ResultCard';

const createDefaultLedger = (amount: number = 1000): LedgerState => ({
  transactionId: `tx_live_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
  idempotencyKey: `idemp_${Math.random().toString(36).substring(2, 12)}`,
  status: 'PENDING',
  gatewayUsed: 'None',
  charges: 0,
  amount,
  currency: 'INR',
  createdAt: new Date().toLocaleTimeString(),
  updatedAt: new Date().toLocaleTimeString(),
});

export default function App() {
  const [amount, setAmount] = useState<number>(1000);
  const [failureMode, setFailureMode] = useState<FailureMode>('gateway_a_503');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [stepDelay, setStepDelay] = useState<number>(1000); // 1s default as required
  const [activeAgent, setActiveAgent] = useState<string | null>(null);

  const [ledger, setLedger] = useState<LedgerState>(() => createDefaultLedger(1000));
  const [timelineSteps, setTimelineSteps] = useState<TimelineStep[]>([]);
  const [recoveryMemory, setRecoveryMemory] = useState<RecoveryMemoryEntry[]>([]);

  // Ref to cancel execution if reset is pressed
  const cancelExecutionRef = useRef<boolean>(false);

  // Synchronize amount in default ledger if pending
  useEffect(() => {
    if (ledger.status === 'PENDING') {
      setLedger((prev) => ({ ...prev, amount }));
    }
  }, [amount, ledger.status]);

  const sleep = (ms: number) => {
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, ms);
      // check cancellation every 50ms
      const interval = setInterval(() => {
        if (cancelExecutionRef.current) {
          clearTimeout(timer);
          clearInterval(interval);
          resolve(null);
        }
      }, 50);
    });
  };

  const handleReset = () => {
    cancelExecutionRef.current = true;
    setIsRunning(false);
    setActiveAgent(null);
    setLedger(createDefaultLedger(amount));
    setTimelineSteps([]);
    setRecoveryMemory([]);
  };

  const handlePay = async () => {
    if (isRunning) return;

    cancelExecutionRef.current = false;
    setIsRunning(true);
    setTimelineSteps([]);
    setRecoveryMemory([]);

    // 1. Initialize fresh transaction & idempotency keys
    const currentTxId = `tx_live_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const currentIdempKey = `idemp_${Math.random().toString(36).substring(2, 12)}`;

    let currentLedgerState: LedgerState = {
      transactionId: currentTxId,
      idempotencyKey: currentIdempKey,
      status: 'INITIALIZING',
      gatewayUsed: 'None',
      charges: 0,
      amount,
      currency: 'INR',
      createdAt: new Date().toLocaleTimeString(),
      updatedAt: new Date().toLocaleTimeString(),
    };
    setLedger(currentLedgerState);

    // Initial dispatch step
    setActiveAgent('Dispatch');
    await sleep(stepDelay);
    if (cancelExecutionRef.current) return;

    // Execute initial charge via real Gateway A endpoint (or Gateway B for 'none')
    let initialRes: RealGatewayResponse;
    if (failureMode === 'none') {
      // Calls real Gateway B endpoint which returns HTTP 200 OK
      initialRes = await callRealGatewayB();
    } else if (failureMode === 'gateway_a_timeout') {
      initialRes = {
        success: false,
        statusCode: 504,
        gateway: 'Gateway A',
        message: 'HTTP 504 Gateway Timeout: Socket read timeout after 5000ms (payment settled on provider)',
        isCharged: true,
        endpointUrl: GATEWAY_A_PRIMARY_URL,
      };
    } else {
      // Gateway A 503 or All Gateways Down: Real GET call to Gateway A endpoint
      initialRes = await callRealGatewayA();
    }

    // If initial attempt succeeds directly (Scenario: None)
    if (initialRes.success) {
      currentLedgerState = {
        ...currentLedgerState,
        charges: 1,
        gatewayUsed: initialRes.gateway,
        status: 'RECOVERED',
        updatedAt: new Date().toLocaleTimeString(),
      };
      setLedger(currentLedgerState);

      const monStep = runMonitor(initialRes, 1);
      setTimelineSteps([monStep]);

      await sleep(stepDelay);
      if (cancelExecutionRef.current) return;

      setActiveAgent('Verifier');
      const verifStep = runVerifier(currentLedgerState, 1, true);
      setTimelineSteps((prev) => [...prev, verifStep]);

      setActiveAgent(null);
      setIsRunning(false);
      return;
    }

    // Initial attempt failed: Autonomous Multi-Agent Orchestrator Loop commences
    currentLedgerState = {
      ...currentLedgerState,
      status: 'IN_RECOVERY',
      lastError: initialRes.message,
    };
    setLedger(currentLedgerState);

    let lastErrorResponse: RealGatewayResponse = initialRes;
    let localMemory: RecoveryMemoryEntry[] = [];
    let isSuccessfullyRecovered = false;

    const MAX_ATTEMPTS = 3;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      if (cancelExecutionRef.current) return;

      // 1. MONITOR AGENT: detects error
      setActiveAgent('Monitor');
      const monitorStep = runMonitor(lastErrorResponse, attempt);
      setTimelineSteps((prev) => [...prev, monitorStep]);
      await sleep(stepDelay);
      if (cancelExecutionRef.current) return;

      // 2. DIAGNOSTIC AGENT: explains cause
      setActiveAgent('Diagnostic');
      const diagnosticStep = runDiagnostic(
        lastErrorResponse.message,
        failureMode,
        attempt,
        localMemory
      );
      setTimelineSteps((prev) => [...prev, diagnosticStep]);
      await sleep(stepDelay);
      if (cancelExecutionRef.current) return;

      // 3. PLANNER AGENT: generates 3 candidate plans
      setActiveAgent('Planner');
      const plannerStep = runPlanner(attempt);
      setTimelineSteps((prev) => [...prev, plannerStep]);
      await sleep(stepDelay);
      if (cancelExecutionRef.current) return;

      // 4. EVALUATOR AGENT: scores each plan on time, cost, risk, and success chance
      setActiveAgent('Evaluator');
      const evaluatorStep = runEvaluator(
        plannerStep.plans,
        failureMode,
        attempt,
        localMemory
      );
      setTimelineSteps((prev) => [...prev, evaluatorStep]);
      await sleep(stepDelay);
      if (cancelExecutionRef.current) return;

      // 5. EXECUTOR AGENT: runs selected plan against mock gateways
      setActiveAgent('Executor');
      const { step: execStep, gatewayResponse, updatedLedger, memoryEntry } =
        await runExecutor(
          evaluatorStep.selectedPlan,
          failureMode,
          attempt,
          currentLedgerState
        );

      currentLedgerState = updatedLedger;
      setLedger(currentLedgerState);

      // Record to recovery memory
      localMemory = [...localMemory, memoryEntry];
      setRecoveryMemory(localMemory);

      setTimelineSteps((prev) => [...prev, execStep]);
      lastErrorResponse = gatewayResponse;
      await sleep(stepDelay);
      if (cancelExecutionRef.current) return;

      // 6. VERIFIER AGENT: confirms ledger has exactly one successful charge
      setActiveAgent('Verifier');
      const isFinal = attempt === MAX_ATTEMPTS;
      const verifierStep = runVerifier(currentLedgerState, attempt, isFinal);
      setTimelineSteps((prev) => [...prev, verifierStep]);
      await sleep(stepDelay);
      if (cancelExecutionRef.current) return;

      if (verifierStep.isVerified) {
        // Successfully recovered with verified 1 charge!
        isSuccessfullyRecovered = true;
        currentLedgerState = {
          ...currentLedgerState,
          status: 'RECOVERED',
          updatedAt: new Date().toLocaleTimeString(),
        };
        setLedger(currentLedgerState);
        break;
      }
    }

    // If max attempts exhausted and still unverified, Orchestrator escalates to human
    if (!isSuccessfullyRecovered) {
      setActiveAgent('Orchestrator');
      const escalationStep = runOrchestratorEscalation(MAX_ATTEMPTS, MAX_ATTEMPTS);
      setTimelineSteps((prev) => [...prev, escalationStep]);

      currentLedgerState = {
        ...currentLedgerState,
        status: 'ESCALATED',
        updatedAt: new Date().toLocaleTimeString(),
      };
      setLedger(currentLedgerState);
    }

    setActiveAgent(null);
    setIsRunning(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Header */}
      <TopNav />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Controls Bar */}
        <ControlsBar
          amount={amount}
          setAmount={setAmount}
          failureMode={failureMode}
          setFailureMode={setFailureMode}
          onPay={handlePay}
          onReset={handleReset}
          isRunning={isRunning}
          stepDelay={stepDelay}
          setStepDelay={setStepDelay}
        />

        {/* Final Result Card (Recovered / Escalated) */}
        <ResultCard
          status={ledger.status}
          ledger={ledger}
          failureMode={failureMode}
          onReset={handleReset}
        />

        {/* Two-Column Layout: Left = Agent Timeline, Right = Transaction Ledger */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[600px]">
          {/* Left: Agent Timeline (7 Cols on desktop) */}
          <section className="lg:col-span-7 flex flex-col h-full">
            <AgentTimeline
              steps={timelineSteps}
              isRunning={isRunning}
              activeAgent={activeAgent}
            />
          </section>

          {/* Right: Transaction Ledger (5 Cols on desktop) */}
          <section className="lg:col-span-5 flex flex-col h-full">
            <TransactionLedger ledger={ledger} memory={recoveryMemory} />
          </section>
        </div>
      </main>

      {/* Status Bar Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950/90 py-3 px-4 sm:px-8 text-center text-xs text-zinc-500 font-mono flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span>AutoRecover AI Architecture</span>
          <span>·</span>
          <span>Idempotent State Machine</span>
          <span>·</span>
          <span>Deterministic Recovery Logic</span>
        </div>
        <div>Simulated Environment · Zero Real Monetary Transfers</div>
      </footer>
    </div>
  );
}
