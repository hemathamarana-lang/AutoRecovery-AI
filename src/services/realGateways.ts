export interface RealGatewayResponse {
  success: boolean;
  statusCode: number;
  gateway: 'Gateway A' | 'Gateway B' | 'Reconciliation API';
  message: string;
  isCharged: boolean;
  endpointUrl: string;
  rawPayload?: any;
}

export const GATEWAY_A_PRIMARY_URL = 'https://hema-2006.app.n8n.cloud/webhook/gateway-aL';
export const GATEWAY_A_ALT_URL = 'https://hema-2006.app.n8n.cloud/webhook/gateway-a';
export const GATEWAY_B_PRIMARY_URL = 'https://hema-2006.app.n8n.cloud/webhook/gateway-b';

/**
 * Executes a GET request to Gateway A endpoint
 */
export async function callRealGatewayA(): Promise<RealGatewayResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  let urlUsed = GATEWAY_A_PRIMARY_URL;

  try {
    let res: Response;
    try {
      res = await fetch(GATEWAY_A_PRIMARY_URL, {
        method: 'GET',
        signal: controller.signal,
      });

      // If gateway-aL is unregistered (404/500), seamlessly probe gateway-a which hosts the 503
      if (res.status === 404 || res.status === 500) {
        try {
          const altRes = await fetch(GATEWAY_A_ALT_URL, {
            method: 'GET',
            signal: controller.signal,
          });
          if (altRes.status === 503 || altRes.status === 200) {
            res = altRes;
            urlUsed = GATEWAY_A_ALT_URL;
          }
        } catch {
          // keep original res
        }
      }
    } catch (primaryErr: any) {
      // If primary network failed, try alt
      const altRes = await fetch(GATEWAY_A_ALT_URL, {
        method: 'GET',
        signal: controller.signal,
      });
      res = altRes;
      urlUsed = GATEWAY_A_ALT_URL;
    }

    clearTimeout(timeoutId);

    const statusCode = res.status;
    // Rule: Treat HTTP status 200 as success and anything else as failure
    const isSuccess = statusCode === 200;

    let payload: any = null;
    let detailMessage = '';
    try {
      payload = await res.json();
      detailMessage = payload.message || payload.error || payload.status || (isSuccess ? 'Payment captured' : 'Service error');
    } catch {
      detailMessage = isSuccess ? 'OK' : res.statusText || 'Non-200 Response';
    }

    return {
      success: isSuccess,
      statusCode,
      gateway: 'Gateway A',
      message: isSuccess
        ? `HTTP ${statusCode} OK: Gateway A successfully processed payment (${detailMessage})`
        : `HTTP ${statusCode} ${res.statusText || 'Failure'}: Gateway A upstream error (${detailMessage})`,
      isCharged: isSuccess,
      endpointUrl: urlUsed,
      rawPayload: payload,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err.name === 'AbortError';
    const statusCode = isTimeout ? 504 : 0;

    return {
      success: false,
      statusCode,
      gateway: 'Gateway A',
      message: isTimeout
        ? 'HTTP 504 Gateway Timeout: Gateway A request timed out after 8000ms'
        : `HTTP 0 Network Error: Connection to Gateway A failed (${err.message})`,
      isCharged: false,
      endpointUrl: urlUsed,
      rawPayload: { error: err.message },
    };
  }
}

/**
 * Executes a GET request to Gateway B endpoint
 */
export async function callRealGatewayB(): Promise<RealGatewayResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(GATEWAY_B_PRIMARY_URL, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const statusCode = res.status;
    // Rule: Treat HTTP status 200 as success and anything else as failure
    const isSuccess = statusCode === 200;

    let payload: any = null;
    let detailMessage = '';
    try {
      payload = await res.json();
      detailMessage = payload.message || payload.status || (isSuccess ? 'Payment processed' : 'Error');
    } catch {
      detailMessage = isSuccess ? 'OK' : res.statusText || 'Response received';
    }

    return {
      success: isSuccess,
      statusCode,
      gateway: 'Gateway B',
      message: isSuccess
        ? `HTTP ${statusCode} OK: Gateway B payment captured successfully (${detailMessage})`
        : `HTTP ${statusCode} ${res.statusText || 'Failure'}: Gateway B returned error (${detailMessage})`,
      isCharged: isSuccess,
      endpointUrl: GATEWAY_B_PRIMARY_URL,
      rawPayload: payload,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err.name === 'AbortError';
    const statusCode = isTimeout ? 504 : 0;

    return {
      success: false,
      statusCode,
      gateway: 'Gateway B',
      message: isTimeout
        ? 'HTTP 504 Gateway Timeout: Gateway B request timed out after 8000ms'
        : `HTTP 0 Network Error: Connection to Gateway B failed (${err.message})`,
      isCharged: false,
      endpointUrl: GATEWAY_B_PRIMARY_URL,
      rawPayload: { error: err.message },
    };
  }
}
