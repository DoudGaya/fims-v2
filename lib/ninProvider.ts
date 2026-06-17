import ProductionLogger from '@/lib/productionLogger';

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
  };
}

export function hasNINConfig() {
  const config = getNINConfig();
  return Boolean(config.baseUrl && config.apiKey);
}

export function buildNINLookupUrl(nin: string) {
  const { baseUrl } = getNINConfig();

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

  if (status === 401 || lower.includes('unauthorized') || lower.includes('invalid api')) {
    return new NINProviderError('NIN service authentication failed', 'AUTH_FAILED', 502);
  }

  if (status === 429 || lower.includes('too many')) {
    return new NINProviderError('Too many NIN requests. Please try again later.', 'RATE_LIMITED', 429);
  }

  return new NINProviderError(message, 'VALIDATION_FAILED', status && status >= 400 ? status : 400);
}

export async function lookupNINFromProvider(nin: string) {
  const { apiKey } = getNINConfig();

  if (!apiKey) {
    throw new NINProviderError('NIN verification service unavailable', 'MISSING_CONFIG', 503);
  }

  const url = buildNINLookupUrl(nin);
  ProductionLogger.debug(`Making NIN API request for NIN: ****${nin.slice(-4)}`);

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
  let payload: any = {};

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }

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
