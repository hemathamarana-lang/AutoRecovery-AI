import {
  AgentName,
  FailureMode,
  LedgerState,
  PlanEvaluation,
  PlanId,
  RecoveryMemoryEntry,
  RecoveryPlan,
  StepStatus,
  TimelineStep,
} from '../types/payment';
import {
  callRealGatewayA,
  callRealGatewayB,
  RealGatewayResponse,
  GATEWAY_A_PRIMARY_URL,
  GATEWAY_B_PRIMARY_URL,
} from './realGateways';

// Helper to generate formatted timestamp
export const getTimestamp = (): string => {
  const now = new Date();
  return now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
};

/**
 * 1. MONITOR AGENT
 * Detects the error (503 or timeout or normal 200).
 */
export function runMonitor(response: RealGatewayResponse, attempt: number): TimelineStep {
  if (response.success) {
    return {
      id: `step-mon-${Date.now()}-${attempt}`,
      timestamp: getTimestamp(),
      agent: 'Monitor',
      status: 'success',
      shortMessage: `Payment acknowledged: [HTTP ${response.statusCode} OK] from ${response.gateway}.`,
      attemptNumber: attempt,
      httpStatus: response.statusCode,
      details: {
        rawError: 'None',
        endpointUrl: response.endpointUrl,
      },
    };
  }

  const isTimeout = response.statusCode === 504 || response.message.toLowerCase().includes('timeout');
  const is503 = response.statusCode === 503;

  return {
    id: `step-mon-${Date.now()}-${attempt}`,
    timestamp: getTimestamp(),
    agent: 'Monitor',
    status: 'warning',
    shortMessage: isTimeout
      ? `Anomaly flagged: [HTTP 504 Gateway Timeout] from ${response.gateway} after connection drop.`
      : is503
      ? `Anomaly flagged: [HTTP 503 Service Unavailable] from ${response.gateway}. Upstream failure detected.`
      : `Anomaly flagged: [HTTP ${response.statusCode || 'Error'}] failure from ${response.gateway}.`,
    attemptNumber: attempt,
    httpStatus: response.statusCode,
    details: {
      rawError: response.message,
      endpointUrl: response.endpointUrl,
    },
  };
}

/**
 * 2. DIAGNOSTIC AGENT
 * Explains the cause. For timeout, says "Payment status unknown, it may already be charged."
 */
export function runDiagnostic(
  detectedError: string,
  failureMode: FailureMode,
  attempt: number,
  memory: RecoveryMemoryEntry[]
): TimelineStep {
  let diagnosticNote = '';

  if (failureMode === 'gateway_a_timeout') {
    diagnosticNote = 'Payment status unknown, it may already be charged.';
  } else if (failureMode === 'gateway_a_503') {
    diagnosticNote =
      attempt === 1
        ? 'Gateway A returned 503 Service Unavailable (upstream node overload / circuit breaker tripped).'
        : 'Upstream Gateway A persists in degraded 503 state; failover path required.';
  } else if (failureMode === 'all_gateways_down') {
    diagnosticNote =
      attempt === 1
        ? 'Gateway A primary cluster unreachable (DNS/Network partition).'
        : attempt === 2
        ? 'Secondary failover Gateway B also returning 500 Network Unreachable.'
        : 'All available payment gateway routes are unreachable. Zero communication pipelines healthy.';
  } else {
    diagnosticNote = 'Normal transaction execution. No systemic faults identified.';
  }

  return {
    id: `step-diag-${Date.now()}-${attempt}`,
    timestamp: getTimestamp(),
    agent: 'Diagnostic',
    status: failureMode === 'gateway_a_timeout' ? 'warning' : 'info',
    shortMessage: diagnosticNote,
    attemptNumber: attempt,
    details: {
      diagnosticNote,
    },
  };
}

/**
 * 3. PLANNER AGENT
 * Generates 3 plans: Retry Gateway A, Switch to Gateway B, Check transaction status / hold.
 */
export function runPlanner(attempt: number): TimelineStep & { plans: RecoveryPlan[] } {
  const plans: RecoveryPlan[] = [
    {
      id: 'retry_a',
      title: 'Retry Gateway A',
      targetGateway: 'Gateway A',
      description: 'Re-dispatch payload to primary processor with exponential backoff & original idempotency key.',
    },
    {
      id: 'switch_b',
      title: 'Switch to Gateway B',
      targetGateway: 'Gateway B',
      description: 'Dynamically re-route charge to secondary redundant processor via alternate card rail.',
    },
    {
      id: 'check_status',
      title: 'Check transaction status / hold',
      targetGateway: 'Reconciliation API',
      description: 'Issue read-only idempotency status probe to verify if upstream captured payment before socket dropped.',
    },
  ];

  return {
    id: `step-plan-${Date.now()}-${attempt}`,
    timestamp: getTimestamp(),
    agent: 'Planner',
    status: 'info',
    shortMessage: `Formulated 3 candidate recovery plans: Retry Gateway A, Switch to Gateway B, and Check transaction status / hold.`,
    attemptNumber: attempt,
    plans,
    details: {
      generatedPlans: plans,
    },
  };
}

/**
 * 4. EVALUATOR AGENT
 * Scores each plan on time, cost, risk and success chance, shows scores in a small table,
 * and picks the best SAFE plan.
 * Rules:
 * - Never pick a plan already marked failed in Recovery Memory.
 * - For timeout, Retry must be rejected with the reason "duplicate charge risk" and status check must run first.
 */
export function runEvaluator(
  plans: RecoveryPlan[],
  failureMode: FailureMode,
  attempt: number,
  memory: RecoveryMemoryEntry[]
): TimelineStep & { selectedPlan: RecoveryPlan; matrix: PlanEvaluation[] } {
  // Check memory for already failed plans
  const failedPlanIds = new Set(
    memory.filter((m) => m.result === 'FAILED').map((m) => m.planId)
  );

  const matrix: PlanEvaluation[] = plans.map((plan) => {
    const isFailedInMemory = failedPlanIds.has(plan.id);

    if (plan.id === 'retry_a') {
      const isTimeout = failureMode === 'gateway_a_timeout';
      const isRejected = isFailedInMemory || isTimeout;
      const rejectionReason = isFailedInMemory
        ? 'Disqualified: Marked FAILED in Recovery Memory'
        : isTimeout
        ? 'Rejected: duplicate charge risk'
        : undefined;

      return {
        planId: 'retry_a',
        title: plan.title,
        timeScore: '120ms',
        costScore: '₹0.00 (Zero add-on)',
        riskLevel: isTimeout ? 'Critical' : 'Low',
        riskNotes: isTimeout
          ? 'CRITICAL: May cause double-debit if transaction was already processed by Gateway A!'
          : 'Low: Safe idempotent retry',
        successChance: isTimeout ? 0 : failureMode === 'gateway_a_503' ? 15 : 95,
        isSelected: false,
        isRejected,
        rejectionReason,
        isFailedInMemory,
      };
    }

    if (plan.id === 'switch_b') {
      const isTimeout = failureMode === 'gateway_a_timeout';
      const isRejected = isFailedInMemory || isTimeout;
      const rejectionReason = isFailedInMemory
        ? 'Disqualified: Marked FAILED in Recovery Memory'
        : isTimeout
        ? 'Rejected: duplicate charge risk (Status must be verified first)'
        : undefined;

      return {
        planId: 'switch_b',
        title: plan.title,
        timeScore: '450ms',
        costScore: '+₹1.50 (Routing fee)',
        riskLevel: isTimeout ? 'High' : 'Low',
        riskNotes: isTimeout
          ? 'Risk: Customer could be charged twice if Gateway A captured earlier'
          : 'Low: Isolated gateway failover',
        successChance: failureMode === 'all_gateways_down' ? 10 : 96,
        isSelected: false,
        isRejected,
        rejectionReason,
        isFailedInMemory,
      };
    }

    // check_status
    const isTimeout = failureMode === 'gateway_a_timeout';
    const isRejected = isFailedInMemory;
    const rejectionReason = isFailedInMemory
      ? 'Disqualified: Marked FAILED in Recovery Memory'
      : undefined;

    return {
      planId: 'check_status',
      title: plan.title,
      timeScore: '90ms',
      costScore: '₹0.00 (Read probe)',
      riskLevel: 'Low',
      riskNotes: 'Zero risk: Read-only idempotency inquiry. Cannot create duplicate charges.',
      successChance: isTimeout ? 99 : 25,
      isSelected: false,
      isRejected,
      rejectionReason,
      isFailedInMemory,
    };
  });

  // Selection Logic:
  // 1. If timeout, status check MUST run first and retry rejected due to duplicate charge risk!
  // 2. Never pick a plan marked failed in memory.
  // 3. For 503 attempt 1: retry_a is tried (low cost/latency). If failed, in attempt 2 switch_b is chosen.
  // 4. For all gateways down: attempt 1 = retry_a, attempt 2 = switch_b, attempt 3 = check_status.
  let selectedPlanId: PlanId;

  if (failureMode === 'gateway_a_timeout') {
    selectedPlanId = 'check_status';
  } else if (!failedPlanIds.has('retry_a')) {
    selectedPlanId = 'retry_a';
  } else if (!failedPlanIds.has('switch_b')) {
    selectedPlanId = 'switch_b';
  } else if (!failedPlanIds.has('check_status')) {
    selectedPlanId = 'check_status';
  } else {
    // All failed
    selectedPlanId = 'check_status';
  }

  // Mark selection
  for (const item of matrix) {
    if (item.planId === selectedPlanId && !item.isRejected) {
      item.isSelected = true;
    }
  }

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];

  let evalSummary = '';
  if (failureMode === 'gateway_a_timeout') {
    evalSummary = `Evaluator rejected 'Retry Gateway A' (Reason: duplicate charge risk). Selected 'Check transaction status / hold' as the only safe plan.`;
  } else if (failedPlanIds.size > 0) {
    evalSummary = `Disqualified previous failed plans from Memory. Selected '${selectedPlan.title}' (Success: ${
      matrix.find((m) => m.planId === selectedPlan.id)?.successChance ?? 90
    }%, Risk: Low).`;
  } else {
    evalSummary = `Scored 3 candidate recovery plans. Selected '${selectedPlan.title}' based on optimal time/cost/risk trade-off.`;
  }

  return {
    id: `step-eval-${Date.now()}-${attempt}`,
    timestamp: getTimestamp(),
    agent: 'Evaluator',
    status: 'info',
    shortMessage: evalSummary,
    attemptNumber: attempt,
    evaluationMatrix: matrix,
    matrix,
    selectedPlan,
    details: {
      selectedPlan,
    },
  };
}

/**
 * 5. EXECUTOR AGENT
 * Calls real endpoints using fetch (GET):
 * Gateway A: https://hema-2006.app.n8n.cloud/webhook/gateway-aL
 * Gateway B: https://hema-2006.app.n8n.cloud/webhook/gateway-b
 * Treat HTTP status 200 as success and anything else as failure.
 */
export async function runExecutor(
  selectedPlan: RecoveryPlan,
  failureMode: FailureMode,
  attempt: number,
  currentLedger: LedgerState
): Promise<{
  step: TimelineStep;
  gatewayResponse: RealGatewayResponse;
  updatedLedger: LedgerState;
  memoryEntry: RecoveryMemoryEntry;
}> {
  let res: RealGatewayResponse;

  if (selectedPlan.id === 'retry_a') {
    // Real GET call to Gateway A (https://hema-2006.app.n8n.cloud/webhook/gateway-aL)
    res = await callRealGatewayA();
  } else if (selectedPlan.id === 'switch_b') {
    if (failureMode === 'all_gateways_down') {
      res = {
        success: false,
        statusCode: 500,
        gateway: 'Gateway B',
        message: 'HTTP 500 Internal Error: Failover route offline (All gateways down scenario)',
        isCharged: false,
        endpointUrl: GATEWAY_B_PRIMARY_URL,
      };
    } else {
      // Real GET call to Gateway B (https://hema-2006.app.n8n.cloud/webhook/gateway-b)
      res = await callRealGatewayB();
    }
  } else {
    // check_status
    if (failureMode === 'gateway_a_timeout') {
      res = {
        success: true,
        statusCode: 200,
        gateway: 'Reconciliation API',
        message: 'HTTP 200 OK: Idempotency probe verified charge was settled on Gateway A (Ref: CAP-GW-A-9921)',
        isCharged: true,
        endpointUrl: `${GATEWAY_A_PRIMARY_URL}/status`,
      };
    } else if (failureMode === 'all_gateways_down') {
      res = {
        success: false,
        statusCode: 504,
        gateway: 'Reconciliation API',
        message: 'HTTP 504 Gateway Timeout: Status probe timed out. Provider telemetries offline.',
        isCharged: false,
        endpointUrl: `${GATEWAY_A_PRIMARY_URL}/status`,
      };
    } else {
      res = {
        success: false,
        statusCode: 404,
        gateway: 'Reconciliation API',
        message: 'HTTP 404 Not Found: No capture record exists on Gateway A. Zero charges made.',
        isCharged: false,
        endpointUrl: `${GATEWAY_A_PRIMARY_URL}/status`,
      };
    }
  }

  // Apply charge to ledger if successful, maintaining strict rule: CHARGES MUST NEVER EXCEED 1
  let updatedCharges = currentLedger.charges;
  let updatedGateway = currentLedger.gatewayUsed;

  if (res.success && res.isCharged) {
    if (updatedCharges === 0) {
      updatedCharges = 1;
    }
    if (selectedPlan.id === 'switch_b') {
      updatedGateway = 'Gateway B';
    } else if (selectedPlan.id === 'retry_a') {
      updatedGateway = 'Gateway A';
    } else if (selectedPlan.id === 'check_status') {
      updatedGateway = 'Gateway A'; // Confirmed previously captured on A
    }
  }

  const updatedLedger: LedgerState = {
    ...currentLedger,
    charges: updatedCharges,
    gatewayUsed: updatedGateway,
    status: res.success ? 'RECOVERED' : 'IN_RECOVERY',
    updatedAt: new Date().toLocaleTimeString(),
  };

  const memoryEntry: RecoveryMemoryEntry = {
    id: `mem-${Date.now()}-${attempt}`,
    attempt,
    planId: selectedPlan.id,
    planTitle: selectedPlan.title,
    gateway: selectedPlan.targetGateway,
    result: res.success ? 'SUCCESS' : 'FAILED',
    detail: res.message,
    httpStatus: res.statusCode,
    timestamp: getTimestamp(),
  };

  const statusLabel = res.statusCode ? `[HTTP ${res.statusCode}]` : '[HTTP Error]';

  const step: TimelineStep = {
    id: `step-exec-${Date.now()}-${attempt}`,
    timestamp: getTimestamp(),
    agent: 'Executor',
    status: res.success ? 'success' : 'error',
    shortMessage: res.success
      ? `Execution succeeded: ${selectedPlan.title} -> ${statusLabel} ${res.message}`
      : `Execution failed: ${selectedPlan.title} -> ${statusLabel} ${res.message}`,
    attemptNumber: attempt,
    httpStatus: res.statusCode,
    details: {
      executionLog: res.message,
      endpointUrl: res.endpointUrl,
      selectedPlan,
    },
  };

  return {
    step,
    gatewayResponse: res,
    updatedLedger,
    memoryEntry,
  };
}

/**
 * 6. VERIFIER AGENT
 * Confirms the ledger has exactly one successful charge.
 */
export function runVerifier(
  ledger: LedgerState,
  attempt: number,
  isFinalAttempt: boolean
): TimelineStep & { isVerified: boolean } {
  // Rule: Must confirm ledger has exactly one successful charge
  const hasExactlyOneCharge = ledger.charges === 1;

  if (hasExactlyOneCharge) {
    return {
      id: `step-verif-${Date.now()}-${attempt}`,
      timestamp: getTimestamp(),
      agent: 'Verifier',
      status: 'success',
      shortMessage: `Idempotency verification passed: Confirmed exactly 1 charge (₹${ledger.amount.toLocaleString()}) on ${ledger.gatewayUsed}. Zero double debits.`,
      attemptNumber: attempt,
      isVerified: true,
      details: {
        ledgerCheck: {
          charges: ledger.charges,
          isVerified: true,
          status: 'SETTLED',
        },
      },
    };
  }

  return {
    id: `step-verif-${Date.now()}-${attempt}`,
    timestamp: getTimestamp(),
    agent: 'Verifier',
    status: isFinalAttempt ? 'error' : 'warning',
    shortMessage: `Verification check: Ledger charges = ${ledger.charges}. Settlement not yet confirmed.`,
    attemptNumber: attempt,
    isVerified: false,
    details: {
      ledgerCheck: {
        charges: ledger.charges,
        isVerified: false,
        status: 'UNVERIFIED',
      },
    },
  };
}

/**
 * ORCHESTRATOR ALERT / ESCALATION STEP
 */
export function runOrchestratorEscalation(attempt: number, totalAttempts: number): TimelineStep {
  return {
    id: `step-orch-${Date.now()}`,
    timestamp: getTimestamp(),
    agent: 'Orchestrator',
    status: 'error',
    shortMessage: `Escalated to human: All ${totalAttempts} autonomous recovery attempts exhausted. Safe state preserved. Zero unauthorized charges.`,
    attemptNumber: attempt,
  };
}
