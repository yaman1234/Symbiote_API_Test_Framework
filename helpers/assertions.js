const { expect } = require('@playwright/test');

/**
 * @param {object} obj
 * @param {string} path - dot/bracket-less; use numeric segment for array index e.g. data.methods.0.type
 */
function getAt(obj, path) {
  return path.split('.').reduce((o, k) => {
    if (o == null) return undefined;
    const i = parseInt(k, 10);
    if (!Number.isNaN(i) && String(i) === k) return o[i];
    return o[k];
  }, obj);
}

function assertPathNonEmpty(body, path) {
  const v = getAt(body, path);
  expect(v === undefined || v === null, `${path} missing`).toBe(false);
  if (Array.isArray(v)) {
    expect(v.length, path).toBeGreaterThan(0);
  } else if (typeof v === 'string') {
    expect(v.length, path).toBeGreaterThan(0);
  } else if (typeof v === 'number') {
    expect(v, path).toBeGreaterThan(0);
  } else if (typeof v === 'boolean') {
    /* ok */
  } else if (typeof v === 'object') {
    expect(Object.keys(v).length, path).toBeGreaterThan(0);
  }
}

/**
 * Response status is 2xx (Playwright `ok()`).
 * @param {import('@playwright/test').APIResponse} response
 * @param {object | string} [detail]
 */
function expectSuccessStatus(response, detail) {
  if (response.ok()) return;
  let suffix = '';
  if (detail != null) {
    if (typeof detail === 'string') suffix = ` — ${detail}`;
    else if (typeof detail === 'object') {
      const msg = detail.message || detail.error?.code;
      suffix = msg ? ` — ${msg}` : ` — ${JSON.stringify(detail)}`;
    }
  }
  expect(response.ok(), `Expected 2xx, got HTTP ${response.status()}${suffix}`).toBeTruthy();
}

function expectJsonContentType(response) {
  const contentType = response.headers()['content-type'] || '';
  expect(contentType).toContain('application/json');
}

/**
 * @param {import('@playwright/test').APIResponse} response
 * @param {number} expectedStatus
 */
function expectHttpStatus(response, expectedStatus) {
  expect(response.status()).toBe(expectedStatus);
  if (expectedStatus >= 200 && expectedStatus < 300) {
    expect(response.ok()).toBeTruthy();
  } else {
    expect(response.ok()).toBeFalsy();
  }
}

/**
 * Symbiote-style success JSON: success, statusCode, message + required non-empty paths under body.
 * @param {object} body
 * @param {{ statusCode?: number, message?: string, nonEmptyPaths?: string[] }} opts
 */
function expectJsonSuccessBody(body, opts = {}) {
  const statusCode = opts.statusCode ?? 200;
  expect(body, 'body').toBeTruthy();
  expect(typeof body).toBe('object');
  expect(body.success).toBe(true);
  expect(typeof body.statusCode).toBe('number');
  expect(body.statusCode).toBe(statusCode);
  expect(typeof body.message).toBe('string');
  if (opts.message != null) {
    expect(body.message).toBe(opts.message);
  }
  for (const path of opts.nonEmptyPaths || []) {
    assertPathNonEmpty(body, path);
  }
}

/**
 * Symbiote-style error JSON: success false, statusCode, message, error.code; optional details / error.key.
 * @param {object} body
 * @param {{
 *   statusCode: number,
 *   errorCode: string,
 *   message?: string,
 *   messageIncludes?: string,
 *   requireDetails?: boolean,
 *   detailsField?: string,
 *   errorKey?: string,
 *   requireErrorKey?: boolean
 * }} opts
 */
function expectJsonErrorBody(body, opts) {
  expect(body, 'body').toBeTruthy();
  expect(typeof body).toBe('object');
  expect(body.success).toBe(false);
  expect(typeof body.statusCode).toBe('number');
  expect(body.statusCode).toBe(opts.statusCode);
  expect(typeof body.message).toBe('string');
  if (opts.message != null) {
    expect(body.message).toBe(opts.message);
  }
  if (opts.messageIncludes != null) {
    expect(body.message).toContain(opts.messageIncludes);
  }
  expect(body.error, 'error').toBeTruthy();
  expect(typeof body.error.code).toBe('string');
  if (opts.errorCode != null) {
    expect(body.error.code).toBe(opts.errorCode);
  } else if (opts.requireErrorCode) {
    expect(body.error.code.length).toBeGreaterThan(0);
  }
  if (opts.errorKey != null) {
    expect(body.error.key).toBe(opts.errorKey);
  }
  if (opts.requireErrorKey) {
    expect(typeof body.error.key).toBe('string');
    expect(body.error.key.length).toBeGreaterThan(0);
  }
  if (opts.requireDetails) {
    expect(Array.isArray(body.error.details)).toBeTruthy();
    expect(body.error.details.length).toBeGreaterThan(0);
  }
  if (opts.detailsField != null) {
    expect(body.error.details.some((d) => d.field === opts.detailsField)).toBeTruthy();
  }
}

module.exports = {
  expectSuccessStatus,
  expectJsonContentType,
  expectHttpStatus,
  expectJsonSuccessBody,
  expectJsonErrorBody,
  getAt
};
