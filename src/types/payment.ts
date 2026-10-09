export type FailureMode =
  | 'none'
  | 'gateway_a_503'
  | 'gateway_a_timeout'
  | 'all_gateways_down';

export type AgentName =
  | 'Monitor'
  | 'Diagnostic'
  | 'Planner'
  | 'Evaluator'
  | 'Executor'
  | 'Verifier'
  | 'Orchestrator';

export type StepStatus = 'running' | 'success' | 'warning' | 'error' | 'info';

export type PlanId = 'retry_a' | 'switch_b' | 'check_status';

export interface RecoveryPlan {
  id: PlanId;
  title: string;
  targetGateway: string;
  description: string;
}

export interface PlanEvaluation {
  planId: PlanId;
  title: string;
  timeScore: string;
  costScore: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  riskNotes: string;
  successChance: number;
  isSelected: boolean;
  isRejected: boolean;
  rejectionReason?: string;
  isFailedInMemory: boolean;
}

export interface TimelineStep {
  id: string;
  timestamp: string;
  agent: AgentName;
  status: StepStatus;
  shortMessage: string;
  attemptNumber: number;
  httpStatus?: number;
  evaluationMatrix?: PlanEvaluation[];
  details?: {
    rawError?: string;
    diagnosticNote?: string;
    generatedPlans?: RecoveryPlan[];
    selectedPlan?: RecoveryPlan;
    executionLog?: string;
    endpointUrl?: string;
    ledgerCheck?: {
      charges: number;
      isVerified: boolean;
      status: string;
    };
  };
}

export interface RecoveryMemoryEntry {
  id: string;
  attempt: number;
  planId: PlanId;
  planTitle: string;
  gateway: string;
  result: 'FAILED' | 'SUCCESS' | 'REJECTED';
  detail: string;
  httpStatus?: number;
  timestamp: string;
}

export interface LedgerState {
  transactionId: string;
  idempotencyKey: string;
  status: 'PENDING' | 'INITIALIZING' | 'IN_RECOVERY' | 'RECOVERED' | 'ESCALATED' | 'FAILED';
  gatewayUsed: 'None' | 'Gateway A' | 'Gateway B' | 'Reconciliation API';
  charges: number; // MUST NEVER EXCEED 1
  amount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
}
