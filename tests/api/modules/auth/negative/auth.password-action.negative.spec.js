/**
 * POST /auth/password-action/validate — validation and invalid token handling.
 */
const { test } = require('@playwright/test');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { expectJsonContentType, expectHttpStatus } = require('../../../../../helpers/assertions');
const { expectAuthValidationErrorBody, expectAuthPasswordActionBadRequestBody } = require('../../../../../helpers/assertions.auth');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');

test.describe('Password action validate @negative @auth', () => {
  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.

  test('POST /auth/password-action : rejects POST without token → 422', async ({}, testInfo) => {
    const client = await createApiClient();
    try {
      const res = await client.post('auth/password-action/validate', { data: {} });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'auth/password-action/validate',
        response: res,
        loginEmail: null,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: {}
      });
      expectHttpStatus(res, 422);
      expectJsonContentType(res);
      expectAuthValidationErrorBody(body, 'token');
    } finally {
      await client.dispose();
    }
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('POST /auth/password-action : rejects POST with invalid / unknown token → 400', async ({}, testInfo) => {
    const client = await createApiClient();
    try {
      const payload = {
        token: 'deadbeef'.repeat(8)
      };
      const res = await client.post('auth/password-action/validate', { data: payload });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'auth/password-action/validate-invalid',
        response: res,
        loginEmail: null,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: payload
      });
      expectHttpStatus(res, 400);
      expectJsonContentType(res);
      expectAuthPasswordActionBadRequestBody(body, 'This link is invalid or expired.');
    } finally {
      await client.dispose();
    }
  });
});
