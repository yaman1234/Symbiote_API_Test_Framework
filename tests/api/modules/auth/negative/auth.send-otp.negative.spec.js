const { test, expect } = require('@playwright/test');
const { env } = require('../../../../../config/env');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { expectJsonContentType, expectHttpStatus } = require('../../../../../helpers/assertions');
const {
  expectAuthSendOtpValidationErrorBody,
  expectAuthSendOtpBadRequestBody
} = require('../../../../../helpers/assertions.auth');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');

test.describe('Send OTP', () => {
  async function loginAttemptId() {
    if (!env.LOGIN_EMAIL || !env.LOGIN_PASSWORD) return null;
    const client = await createApiClient();
    try {
      const res = await client.post('auth/login', {
        data: { email: env.LOGIN_EMAIL, password: env.LOGIN_PASSWORD }
      });
      const body = await res.json();
      return res.ok() ? body.data.loginAttemptId : null;
    } finally {
      await client.dispose();
    }
  }

  async function postSendOtp(payload, testInfo, loginEmail) {
    const client = await createApiClient();
    try {
      const response = await client.post('auth/send-otp', { data: payload });
      const body = await response.json();
      await publishApiResponse(testInfo, {
        urlHint: 'send-otp',
        response,
        ...(loginEmail !== undefined && { loginEmail }),
        status: response.status(),
        statusText: response.statusText(),
        body,
        requestPayload: payload
      });
      return { response, body };
    } finally {
      await client.dispose();
    }
  }

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('[AUTH-SENDOTP-002] : Missing loginAttemptId returns 422 Validation Error → 422', async ({}, testInfo) => {
    const { response, body } = await postSendOtp({ method: 'EMAIL' }, testInfo, null);
    expectHttpStatus(response, 422);
    expectJsonContentType(response);
    expectAuthSendOtpValidationErrorBody(body, 'loginAttemptId');
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('[AUTH-SENDOTP-003] : Empty loginAttemptId returns 422 Validation Error → 422', async ({}, testInfo) => {
    const { response, body } = await postSendOtp(
      { loginAttemptId: '', method: 'EMAIL' },
      testInfo,
      null
    );
    expectHttpStatus(response, 422);
    expectJsonContentType(response);
    expectAuthSendOtpValidationErrorBody(body);
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('[AUTH-SENDOTP-004] : Unsupported SMS method returns 400 Bad Request → 400', async ({}, testInfo) => {
    test.skip(!env.LOGIN_EMAIL || !env.LOGIN_PASSWORD, 'Set LOGIN_EMAIL and LOGIN_PASSWORD in .env');
    const id = await loginAttemptId();
    expect(id).toBeTruthy();
    const { response, body } = await postSendOtp(
      { loginAttemptId: id, method: 'SMS' },
      testInfo,
      env.LOGIN_EMAIL
    );
    expectHttpStatus(response, 400);
    expectJsonContentType(response);
    expectAuthSendOtpBadRequestBody(body, {
      message: 'Only EMAIL is supported for now.',
      errorKey: 'AUTH_FORBIDDEN'
    });
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('[AUTH-SENDOTP-005] : Invalid loginAttemptId returns 400 Bad Request → 400', async ({}, testInfo) => {
    const { response, body } = await postSendOtp(
      { loginAttemptId: '00000000-0000-0000-0000-000000000000', method: 'EMAIL' },
      testInfo,
      null
    );
    expectHttpStatus(response, 400);
    expectJsonContentType(response);
    expectAuthSendOtpBadRequestBody(body, {
      message: 'Invalid loginAttemptId.',
      errorKey: 'AUTH_FORBIDDEN'
    });
  });
});
