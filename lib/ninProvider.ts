import ProductionLogger from '@/lib/productionLogger';
import https from 'node:https';

export class NINProviderError extends Error {
  status: number;
  code: string;

  constructor(message: string, code = 'NIN_PROVIDER_ERROR', status = 500) {
    super(message);
    this.name = 'NINProviderError';
    this.code = code;
    this.status = status;
  }
}

export function getNINConfig() {
  return {
    baseUrl: process.env.NIN_API_BASE_URL?.trim(),
    apiKey: process.env.NIN_API_KEY?.trim(),
    requestReason: process.env.NIN_API_REQUEST_REASON?.trim() || 'KYC_VERIFICATION',
    allowInsecureTLSFallback: process.env.NIN_ALLOW_INSECURE_TLS_FALLBACK !== 'false',
  };
}

export function hasNINConfig() {
  const config = getNINConfig();
  return Boolean(config.baseUrl && config.apiKey);
}

export function buildNINLookupUrl(nin: string) {
  const { baseUrl, requestReason } = getNINConfig();

  if (!baseUrl) {
    throw new NINProviderError('NIN verification service unavailable', 'MISSING_CONFIG', 503);
  }

  const url = new URL(baseUrl);
  const normalizedPath = url.pathname.replace(/\/+$/, '');

  if (!normalizedPath.endsWith('/api/lookup/nin')) {
    url.pathname = `${normalizedPath}/api/lookup/nin`.replace(/\/{2,}/g, '/');
  }

  url.searchParams.set('op', 'level-4');
  url.searchParams.set('nin', nin);
  // eNVS upstream currently requires a request reason to be present.
  url.searchParams.set('reqreason', requestReason);

  return url.toString();
}

function getProviderMessage(payload: any, fallback: string) {
  return payload?.message || payload?.error || payload?.details || fallback;
}

function classifyProviderFailure(message: string, status?: number) {
  const lower = message.toLowerCase();

  if (message === 'norecord' || status === 404 || lower.includes('not found')) {
    return new NINProviderError('NIN not found', 'NIN_NOT_FOUND', 404);
  }

  if (lower.includes('inactive') || lower.includes('suspended')) {
    return new NINProviderError(message, 'PROVIDER_ACCOUNT_INACTIVE', 503);
  }

  if (lower.includes('request reason is required')) {
    return new NINProviderError(
      'NIN provider rejected the request: request reason is required',
      'MISSING_REQUEST_REASON',
      502,
    );
  }

  if (status === 401 || lower.includes('unauthorized') || lower.includes('invalid api')) {
    return new NINProviderError('NIN service authentication failed', 'AUTH_FAILED', 502);
  }

  if (status === 429 || lower.includes('too many')) {
    return new NINProviderError('Too many NIN requests. Please try again later.', 'RATE_LIMITED', 429);
  }

  return new NINProviderError(message, 'VALIDATION_FAILED', status && status >= 400 ? status : 400);
}

function isLikelyTLSFailure(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes('fetch failed') ||
    message.includes('certificate') ||
    message.includes('unable to verify') ||
    message.includes('self-signed') ||
    message.includes('tls') ||
    message.includes('ssl')
  );
}

function canUseTLSFallback(url: string) {
  const { allowInsecureTLSFallback } = getNINConfig();
  const hostname = new URL(url).hostname;
  return allowInsecureTLSFallback && hostname.endsWith('digitalpulseapi.net');
}

function parseProviderPayload(text: string) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function requestWithInsecureTLSFallback(url: string, apiKey: string) {
  return new Promise<{ ok: boolean; status: number; statusText: string; payload: any }>((resolve, reject) => {
    const req = https.get(
      url,
      {
        rejectUnauthorized: false,
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
          'User-Agent': 'CCSA-Mobile-API/1.0.0',
        },
      },
      (res) => {
        let body = '';

        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          const status = res.statusCode ?? 500;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            statusText: res.statusMessage ?? '',
            payload: parseProviderPayload(body),
          });
        });
      },
    );

    req.setTimeout(30000, () => {
      req.destroy(new Error('NIN provider request timed out'));
    });
    req.on('error', reject);
  });
}

async function fetchProviderPayload(url: string, apiKey: string) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
        'User-Agent': 'CCSA-Mobile-API/1.0.0',
      },
      cache: 'no-store',
    });

    const text = await response.text();

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      payload: parseProviderPayload(text),
    };
  } catch (error) {
    if (!isLikelyTLSFailure(error) || !canUseTLSFallback(url)) {
      throw error;
    }

    ProductionLogger.warn('NIN provider TLS validation failed; using scoped fallback for digitalpulseapi.net');
    return requestWithInsecureTLSFallback(url, apiKey);
  }
}

export async function lookupNINFromProvider(nin: string) {
  const { apiKey } = getNINConfig();

  if (!apiKey) {
    throw new NINProviderError('NIN verification service unavailable', 'MISSING_CONFIG', 503);
  }

  const url = buildNINLookupUrl(nin);
  ProductionLogger.debug(`Making NIN API request for NIN: ****${nin.slice(-4)}`);

  const response = await fetchProviderPayload(url, apiKey);
  const { payload } = response;

  ProductionLogger.debug('NIN Verification Response status:', payload.status ?? response.status);

  if (!response.ok) {
    throw classifyProviderFailure(
      getProviderMessage(payload, `API request failed: ${response.status} ${response.statusText}`),
      response.status,
    );
  }

  if (payload.status === 200 && payload.data) {
    return payload.data;
  }

  throw classifyProviderFailure(
    getProviderMessage(payload, 'NIN not found or invalid'),
    payload.status,
  );
}

export function toNINErrorPayload(error: unknown, fallback: string) {
  const err = error as Partial<NINProviderError> & { message?: string };
  const message = err?.message || fallback;

  return {
    status: err instanceof NINProviderError ? err.status : 500,
    body: {
      success: false,
      error: message,
      message,
      code: err instanceof NINProviderError ? err.code : 'NIN_LOOKUP_FAILED',
    },
  };
}
