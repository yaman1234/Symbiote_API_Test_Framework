/**
 * Deep-clone JSON-serializable values for report attachments (original values preserved).
 */
const { env } = require('../config/env');

function sanitizeForReport(value, depth = 0) {
  if (depth > 20) return '[max-depth]';
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForReport(item, depth + 1));
  }
  const out = {};
  for (const [key, v] of Object.entries(value)) {
    if (typeof v === 'object' && v !== null) {
      out[key] = sanitizeForReport(v, depth + 1);
    } else {
      out[key] = v;
    }
  }
  return out;
}

function normalizeBaseUrl(url) {
  if (!url) return '';
  const s = String(url);
  return s.endsWith('/') ? s : `${s}/`;
}

function pathWithQueryFromFullUrl(fullUrl) {
  try {
    const u = new URL(fullUrl);
    return `${u.pathname}${u.search}`;
  } catch {
    return '';
  }
}

function resolvePathAndQueryFromPayload(requestPayload) {
  if (!requestPayload || typeof requestPayload !== 'object') return { path: '', query: undefined };
  if (typeof requestPayload.path === 'string') {
    return {
      path: requestPayload.path,
      query: requestPayload.query ?? requestPayload.params
    };
  }
  return { path: '', query: undefined };
}

function buildAbsoluteUrl(baseURL, path, query) {
  const base = normalizeBaseUrl(baseURL || env.BASE_URL);
  const rel = String(path || '').replace(/^\/+/, '');
  if (!rel) return '';
  const u = new URL(rel, base);
  if (query && typeof query === 'object') {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) {
        for (const item of v) {
          if (item !== undefined && item !== null && item !== '') {
            u.searchParams.append(k, String(item));
          }
        }
      } else if (v !== '') {
        u.searchParams.set(k, String(v));
      }
    }
  }
  return u.toString();
}

/** Prefer Playwright APIResponse.url(); else BASE_URL + path + query from options or requestPayload. */
function resolveFullRequestUrl(opts) {
  const { response, baseURL, path: explicitPath, query: explicitQuery, requestPayload } = opts;
  if (response && typeof response.url === 'function') {
    try {
      const u = response.url();
      if (u) return u;
    } catch (_) {
      /* ignore */
    }
  }
  const fromPayload = resolvePathAndQueryFromPayload(requestPayload);
  const path = explicitPath || fromPayload.path;
  const query = explicitQuery !== undefined ? explicitQuery : fromPayload.query;
  if (path) {
    return buildAbsoluteUrl(baseURL, path, query);
  }
  return '';
}

/**
 * Email used for the OTP session that authorized this call (or inferred from POST auth/login body).
 * @param {string | undefined | null} explicit - from caller; `null` means "not logged in" for the report
 */
function resolveLoginEmailForReport(explicit, requestPayload, endpointPathAndQuery) {
  if (explicit === null) return null;
  if (explicit !== undefined && explicit !== false && String(explicit).trim() !== '') {
    return String(explicit).trim();
  }
  const path = endpointPathAndQuery || '';
  if (!path.includes('auth/login')) return undefined;
  if (!requestPayload || typeof requestPayload !== 'object') return undefined;
  if (typeof requestPayload.email === 'string' && requestPayload.email.trim() !== '') {
    return requestPayload.email.trim();
  }
  return undefined;
}

/**
 * Attach one JSON file per HTTP round-trip: optional `request`, plus response `body`.
 * Pass `response` (Playwright APIResponse) so `urlHint` shows the full request URL (path params + query).
 * Pass `loginEmail` when the call follows OTP login (Bearer) so reports trace which account was used; omit or pass `null` when unauthenticated.
 */
async function publishApiResponse(
  testInfo,
  {
    urlHint,
    response,
    method,
    path,
    query,
    baseURL,
    loginEmail,
    status,
    statusText,
    body,
    requestPayload
  } = {}
) {
  const fullUrl = resolveFullRequestUrl({ response, baseURL, path, query, requestPayload });
  const displayUrl = fullUrl || urlHint || '';
  const endpointPathAndQuery = fullUrl ? pathWithQueryFromFullUrl(fullUrl) : '';

  const resolvedLoginEmail = resolveLoginEmailForReport(
    loginEmail,
    requestPayload,
    endpointPathAndQuery
  );

  const payload = {
    urlHint: displayUrl,
    ...(endpointPathAndQuery && { endpointPathAndQuery }),
    ...(method && { method }),
    ...(requestPayload != null && { request: sanitizeForReport(requestPayload) }),
    ...(resolvedLoginEmail !== undefined && { loginEmail: resolvedLoginEmail }),
    httpStatus: status,
    httpStatusText: statusText,
    body: sanitizeForReport(body)
  };
  await testInfo.attach('api-response.json', {
    body: Buffer.from(JSON.stringify(payload, null, 2), 'utf-8'),
    contentType: 'application/json'
  });
}

module.exports = {
  sanitizeForReport,
  publishApiResponse,
  resolveFullRequestUrl
};
