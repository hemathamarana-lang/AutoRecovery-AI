import { FailureMode } from '../types/payment';

export interface MockGatewayResponse {
  success: boolean;
  statusCode: number;
  gateway: 'Gateway A' | 'Gateway B' | 'Reconciliation API';
  message: string;
  isCharged: boolean;
  rawPayload?: Record<string, any>;
}

export interface InternalGatewayState {
  gatewayASettled: boolean;
  gatewayBSettled: boolean;
}

export class MockPaymentService {
  private internalState: InternalGatewayState = {
    gatewayASettled: false,
    gatewayBSettled: false,
  };

  public reset(failureMode: FailureMode) {
    // If timeout, Gateway A actually captured payment behind the scenes!
    this.internalState = {
      gatewayASettled: failureMode === 'gateway_a_timeout',
      gatewayBSettled: false,
    };
  }

  // Initial attempt on Gateway A
  public async executeInitialAttempt(
    idempotencyKey: string,
    amount: number,
    failureMode: FailureMode
  ): Promise<MockGatewayResponse> {
    if (failureMode === 'none') {
      this.internalState.gatewayASettled = true;
      return {
        success: true,
        statusCode: 200,
        gateway: 'Gateway A',
        message: `HTTP 200 OK: Payment of ₹${amount.toLocaleString()} captured via Gateway A`,
        isCharged: true,
        rawPayload: { auth_code: 'AUTH_OK_9918', capture_id: 'cap_gwA_3301' },
      };
    }

    if (failureMode === 'gateway_a_503') {
      this.internalState.gatewayASettled = false;
      return {
        success: false,
        statusCode: 503,
        gateway: 'Gateway A',
        message: 'HTTP 503 Service Unavailable: Gateway A cluster overloaded / rate limit exceeded',
        isCharged: false,
        rawPayload: { error: 'upstream_service_unavailable', retry_after_seconds: 30 },
      };
    }

    if (failureMode === 'gateway_a_timeout') {
      // The charge actually went through on Gateway A backend, but network timed out!
      this.internalState.gatewayASettled = true;
      return {
        success: false,
        statusCode: 504,
        gateway: 'Gateway A',
        message: 'HTTP 504 Gateway Timeout: Socket read timeout after 5000ms (state unknown)',
        isCharged: true, // actually charged on provider side
        rawPayload: { error: 'socket_timeout', upstream_ref: 'GW-A-PENDING-SYNC' },
      };
    }

    if (failureMode === 'all_gateways_down') {
      this.internalState.gatewayASettled = false;
      return {
        success: false,
        statusCode: 503,
        gateway: 'Gateway A',
        message: 'HTTP 503 Service Unavailable: Gateway A core payment API unreachable',
        isCharged: false,
        rawPayload: { error: 'dns_resolution_failure', gateway: 'gateway_a' },
      };
    }

    return {
      success: true,
      statusCode: 200,
      gateway: 'Gateway A',
      message: 'Payment completed',
      isCharged: true,
    };
  }

  // Plan: Retry Gateway A
  public async executeRetryGatewayA(
    idempotencyKey: string,
    amount: number,
    failureMode: FailureMode
  ): Promise<MockGatewayResponse> {
    if (failureMode === 'gateway_a_503' || failureMode === 'all_gateways_down') {
      return {
        success: false,
        statusCode: 503,
        gateway: 'Gateway A',
        message: 'HTTP 503 Service Unavailable: Gateway A retry rejected (circuit breaker OPEN)',
        isCharged: false,
        rawPayload: { circuit_breaker: 'OPEN', failure_count: 5 },
      };
    }

    if (failureMode === 'gateway_a_timeout') {
      // If someone retried without checking, it would attempt a second debit!
      return {
        success: false,
        statusCode: 409,
        gateway: 'Gateway A',
        message: 'HTTP 409 Conflict: Idempotency key already assigned to completed charge!',
        isCharged: true,
      };
    }

    return {
      success: true,
      statusCode: 200,
      gateway: 'Gateway A',
      message: `HTTP 200 OK: Retry on Gateway A captured ₹${amount.toLocaleString()}`,
      isCharged: true,
    };
  }

  // Plan: Switch to Gateway B
  public async executeSwitchGatewayB(
    idempotencyKey: string,
    amount: number,
    failureMode: FailureMode
  ): Promise<MockGatewayResponse> {
    if (failureMode === 'all_gateways_down') {
      return {
        success: false,
        statusCode: 500,
        gateway: 'Gateway B',
        message: 'HTTP 500 Internal Error: Gateway B failover cluster connection refused',
        isCharged: false,
        rawPayload: { error: 'gateway_b_down', region: 'ap-south-1' },
      };
    }

    this.internalState.gatewayBSettled = true;
    return {
      success: true,
      statusCode: 200,
      gateway: 'Gateway B',
      message: `HTTP 200 OK: Route switched to Gateway B. Captured ₹${amount.toLocaleString()}`,
      isCharged: true,
      rawPayload: { auth_code: 'AUTH_GWB_4419', route_duration_ms: 140 },
    };
  }

  // Plan: Check transaction status / hold
  public async executeCheckStatus(
    idempotencyKey: string,
    amount: number,
    failureMode: FailureMode
  ): Promise<MockGatewayResponse> {
    if (failureMode === 'gateway_a_timeout') {
      // Reconciled! Gateway A confirms the payment was captured
      return {
        success: true,
        statusCode: 200,
        gateway: 'Reconciliation API',
        message: `IDEMPOTENCY VERIFIED: Gateway A confirmed transaction captured (Ref: CAP-GW-A-9921). Charge count: 1.`,
        isCharged: true,
        rawPayload: {
          idempotency_key: idempotencyKey,
          status: 'SETTLED',
          amount_settled: amount,
          upstream_capture_time: 'Recorded prior to socket timeout',
        },
      };
    }

    if (failureMode === 'gateway_a_503') {
      return {
        success: false,
        statusCode: 404,
        gateway: 'Reconciliation API',
        message: 'RECORD_NOT_FOUND: Upstream logs show 0 attempts completed. Safe to failover.',
        isCharged: false,
      };
    }

    if (failureMode === 'all_gateways_down') {
      return {
        success: false,
        statusCode: 504,
        gateway: 'Reconciliation API',
        message: 'HTTP 504 Gateway Timeout: Status probe timed out. Provider telemetries offline.',
        isCharged: false,
      };
    }

    return {
      success: true,
      statusCode: 200,
      gateway: 'Reconciliation API',
      message: 'Status check confirmed payment completed.',
      isCharged: true,
    };
  }
}

export const mockPaymentService = new MockPaymentService();
