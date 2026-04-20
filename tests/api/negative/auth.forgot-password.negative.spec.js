/**
 * POST /auth/forgot-password — validation errors.
 */
const { test } = require('@playwright/test');
const { createApiClient } = require('../../../helpers/apiClient');
const { expectJsonContentType, expectHttpStatus } = require('../../../helpers/assertions');
const { expectAuthValidationErrorBody } = require('../../../helpers/assertions.auth');
const { publishApiResponse } = require('../../../helpers/apiResponseReport');

test.describe('Forgot password @negative @auth', () => {
  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.

  test('POST /auth/forgot-password : rejects POST without email → 422', async ({}, testInfo) => {
    const client = await createApiClient();
    try {
      const res = await client.post('auth/forgot-password', { data: {} });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'auth/forgot-password-no-email',
        response: res,
        loginEmail: null,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: {}
      });
      expectHttpStatus(res, 422);
      expectJsonContentType(res);
      expectAuthValidationErrorBody(body, 'email');
    } finally {
      await client.dispose();
    }
  });
});
