/**
 * Generic API test assertions for Playwright APIResponse + parsed JSON bodies.
 * Includes dotted-path field checks ({@link expectFieldExists}, {@link expectFieldValue}) and Symbiote-style envelopes.
 */
const { expect } = require('@playwright/test');

/**
 * Reads a nested value from an object using a dotted path (no brackets).
 * Does not assert — returns `undefined` if any segment is missing.
 *
 * Examples: `data.org.id`, `data.items.0.type` (numeric segment = array index).
 *
 * @param {object} obj - Root object (e.g. parsed JSON body)
 * @param {string} path - Dot-separated keys; use `0`, `1`, … for array indices
 * @returns {unknown} Value at path or `undefined`
 */
function getAt(obj, path) {
  return path.split('.').reduce((o, k) => {
    if (o == null) return undefined;
    const i = parseInt(k, 10);
    if (!Number.isNaN(i) && String(i) === k) return o[i];
    return o[k];
  }, obj);
}

/**
 * Asserts the value at `path` in `body` exists and is “non-empty” by type:
 * - array / string: length > 0
 * - number: > 0 (note: 0 is treated as empty)
 * - boolean: always ok if present
 * - object: at least one own key
 * Internal helper for {@link expectJsonSuccessBody}.
 *
 * @param {object} body
 * @param {string} path - Same rules as {@link getAt}
 */
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
 * Asserts a field is present at `path` (not `undefined` and not `null`).
 * Use {@link expectFieldValue} when you also need an exact value match.
 *
 * @param {object} body - Root object (e.g. parsed JSON)
 * @param {string} path - Dot path; same rules as {@link getAt}
 */
function expectFieldExists(body, path) {
  const actual = getAt(body, path);
  expect(
    actual === undefined || actual === null,
    `Expected field to exist at "${path}", got ${actual === undefined ? 'undefined' : 'null'}`
  ).toBe(false);
}

/**
 * Asserts a field exists at `path` and its value **deep-equals** `expected` (Playwright `toEqual`).
 * Fails if the path is missing (`undefined` / `null`).
 *
 * @param {object} body - Root object (e.g. parsed JSON)
 * @param {string} path - Dot path; same rules as {@link getAt}
 * @param {unknown} expected - Primitives, arrays, or plain objects (deep compare)
 */
function expectFieldValue(body, path, expected) {
  const actual = getAt(body, path);
  expect(
    actual === undefined || actual === null,
    `Expected field at "${path}" to exist before comparing value`
  ).toBe(false);
  expect(actual, path).toEqual(expected);
}

/**
 * Asserts the HTTP response status is successful (2xx) using Playwright’s `APIResponse.ok()`.
 * On failure, builds a message that includes optional `detail` (string or parsed body) for easier debugging.
 *
 * @param {import('@playwright/test').APIResponse} response
 * @param {object | string} [detail] - Extra text, or body object (uses `message` or `error.code` when present)
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

/**
 * Asserts the response `Content-Type` header includes `application/json`.
 * Use after API calls that are expected to return JSON.
 *
 * @param {import('@playwright/test').APIResponse} response
 */
function expectJsonContentType(response) {
  const contentType = response.headers()['content-type'] || '';
  expect(contentType).toContain('application/json');
}

/**
 * Asserts the HTTP status code equals `expectedStatus`.
 * Also checks consistency with Playwright: for 2xx expects `response.ok()` true; for other codes expects `ok()` false.
 *
 * @param {import('@playwright/test').APIResponse} response
 * @param {number} expectedStatus - e.g. 200, 201, 400, 401, 422
 */
function expectHttpStatus(response, expectedStatus) {
  expect(response.status()).toBe(expectedStatus);
  if (expectedStatus >= 200 && expectedStatus < 300) {
    expect(response.ok()).toBeTruthy();
  } else {
    expect(response.ok()).toBeFalsy();
  }
}

/** Some Nest POST routes return `201 Created` while the JSON envelope still uses `statusCode: 200`. */
function expectHttpOkOrCreated(response) {
  const code = response.status();
  expect([200, 201].includes(code), `Expected HTTP 200 or 201, got ${code}`).toBeTruthy();
  expect(response.ok()).toBeTruthy();
}

/**
 * Asserts a Symbiote-style **success** JSON body: top-level envelope + optional field checks.
 * - `body.success` is `true`
 * - `body.statusCode` is a number and equals `opts.statusCode` (default **200**)
 * - `body.message` is a string; if `opts.message` is set, must match exactly
 * - For each path in `opts.nonEmptyPaths`, runs {@link assertPathNonEmpty} on `body`
 *
 * @param {object} body - Parsed JSON response body
 * @param {{ statusCode?: number, message?: string, messageIncludes?: string, nonEmptyPaths?: string[] }} [opts]
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
  if (opts.messageIncludes != null) {
    expect(String(body.message)).toContain(opts.messageIncludes);
  }
  for (const path of opts.nonEmptyPaths || []) {
    assertPathNonEmpty(body, path);
  }
}

/**
 * Asserts a Symbiote-style **error** JSON body: top-level envelope + `error` object.
 * - `body.success` is `false`
 * - `body.statusCode` equals `opts.statusCode`
 * - `body.message` is a string; optional exact match (`message`) or substring (`messageIncludes`)
 * - `body.error` exists; `body.error.code` is a string
 * - Optional: exact `error.code` (`errorCode`) or any non-empty code (`requireErrorCode`)
 * - Optional: exact `error.key` (`errorKey`) or any non-empty key (`requireErrorKey`)
 * - Optional: `error.details` is a non-empty array (`requireDetails`)
 * - Optional: some detail row has `field === detailsField` (`detailsField`)
 *
 * @param {object} body - Parsed JSON response body
 * @param {{
 *   statusCode: number,
 *   errorCode?: string,
 *   message?: string,
 *   messageIncludes?: string,
 *   requireDetails?: boolean,
 *   detailsField?: string,
 *   errorKey?: string,
 *   requireErrorKey?: boolean,
 *   requireErrorCode?: boolean
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
  getAt,
  expectFieldExists,
  expectFieldValue,
  expectSuccessStatus,
  expectJsonContentType,
  expectHttpStatus,
  expectHttpOkOrCreated,
  expectJsonSuccessBody,
  expectJsonErrorBody
};
