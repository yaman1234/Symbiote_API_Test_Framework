/**
 * POST /auth/set-password — validation errors (token / password policy).
 */
const { test } = require('@playwright/test');
const { env } = require('../../../config/env');
const { createApiClient } = require('../../../helpers/apiClient');
const { expectJsonContentType, expectHttpStatus } = require('../../../helpers/assertions');
const { expectAuthValidationErrorBody, expectAuthPasswordActionBadRequestBody } = require('../../../helpers/assertions.auth');
const { publishApiResponse } = require('../../../helpers/apiResponseReport');

test.describe('Set password @negative @auth', () => {
  test('POST with weak password → 422', async ({}, testInfo) => {
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

  test('POST with mismatched passwords → 400 (requires valid token)', async ({}, testInfo) => {
    test.skip(!env.PASSWORD_ACTION_TOKEN_RAW, 'Set PASSWORD_ACTION_TOKEN_RAW from email link to run mismatch case');
    const client = await createApiClient();
    try {
      const payload = {
        token: env.PASSWORD_ACTION_TOKEN_RAW,
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
          token: env.PASSWORD_ACTION_TOKEN_RAW,
          password: '[redacted]',
          confirmPassword: '[redacted]'
        }
      });
      expectHttpStatus(res, 400);
      expectJsonContentType(res);
      expectAuthPasswordActionBadRequestBody(body, 'Passwords do not match.');
    } finally {
      await client.dispose();
    }
  });
});
