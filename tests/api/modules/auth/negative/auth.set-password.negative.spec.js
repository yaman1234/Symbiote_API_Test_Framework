/**
 * POST /auth/set-password — validation errors (token / password policy).
 */
const { test } = require('@playwright/test');
const { env } = require('../../../../../config/env');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { expectJsonContentType, expectHttpStatus } = require('../../../../../helpers/assertions');
const { expectAuthValidationErrorBody, expectAuthPasswordActionBadRequestBody } = require('../../../../../helpers/assertions.auth');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');

test.describe('Set password', () => {
  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.

  test('[AUTH-SETPW-001] : Weak password returns 422 Validation Error → 422', async ({}, testInfo) => {
    const client = await createApiClient();
    try {
      const payload = {
        token: 'deadbeef'.repeat(8),
        password: 'short',
        confirmPassword: 'short'
      };
      const res = await client.post('auth/set-password', { data: payload });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'auth/set-password-weak',
        response: res,
        loginEmail: null,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: { ...payload, password: '[redacted]', confirmPassword: '[redacted]' }
      });
      expectHttpStatus(res, 422);
      expectJsonContentType(res);
      expectAuthValidationErrorBody(body, 'password');
    } finally {
      await client.dispose();
    }
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('[AUTH-SETPW-002] : Mismatched passwords return 400 Bad Request → 400', async ({}, testInfo) => {
    const client = await createApiClient();
    try {
      // Prefer a real token when provided; otherwise use a deterministic placeholder to keep the check runnable.
      const token = env.PASSWORD_ACTION_TOKEN_RAW || 'deadbeef'.repeat(8);
      const payload = {
        token,
        password: 'Password@9Zz',
        confirmPassword: 'Password@9ZzDifferent'
      };
      const res = await client.post('auth/set-password', { data: payload });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'auth/set-password-mismatch',
        response: res,
        loginEmail: null,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: {
          token,
          password: '[redacted]',
          confirmPassword: '[redacted]'
        }
      });
      expectHttpStatus(res, 400);
      expectJsonContentType(res);
      // If token is synthetic, API may return generic invalid-link; with real token it should return mismatch.
      if (env.PASSWORD_ACTION_TOKEN_RAW) {
        expectAuthPasswordActionBadRequestBody(body, 'Passwords do not match.');
      } else {
        expectAuthPasswordActionBadRequestBody(body);
      }
    } finally {
      await client.dispose();
    }
  });
});
