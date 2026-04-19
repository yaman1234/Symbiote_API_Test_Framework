const { test, expect } = require('@playwright/test');
const { env } = require('../../../config/env');
const { createApiClient } = require('../../../helpers/apiClient');
const {
  expectJsonContentType,
  expectHttpStatus,
  expectSuccessStatus
} = require('../../../helpers/assertions');
const {
  expectAuthVerifyOtpValidationErrorBody,
  expectAuthVerifyOtpInvalidOtpBody,
  expectAuthVerifyOtpBadRequestBody
} = require('../../../helpers/assertions.auth');
const { publishApiResponse } = require('../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../helpers/otpChainSkip');

test.describe('Verify OTP @negative', () => {
  async function postVerifyOtp(payload, testInfo, loginEmail) {
    const client = await createApiClient();
    try {
      const response = await client.post('auth/verify-otp', { data: payload });
      const body = await response.json();
      await publishApiResponse(testInfo, {
        urlHint: 'verify-otp',
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

  test('OTP not generated → 400', async ({}, testInfo) => {
    test.skip(!env.LOGIN_EMAIL || !env.LOGIN_PASSWORD, 'Set LOGIN_EMAIL and LOGIN_PASSWORD in .env');
    const client = await createApiClient();
    let loginAttemptId;
    try {
      const loginRes = await client.post('auth/login', {
        data: { email: env.LOGIN_EMAIL, password: env.LOGIN_PASSWORD }
      });
      const loginBody = await loginRes.json();
      expect(loginRes.ok()).toBeTruthy();
      loginAttemptId = loginBody.data.loginAttemptId;
    } finally {
      await client.dispose();
    }

    const payload = { loginAttemptId, otp: env.VERIFY_OTP };
    const { response, body } = await postVerifyOtp(payload, testInfo, env.LOGIN_EMAIL);
    expectHttpStatus(response, 400);
    expectJsonContentType(response);
    expectAuthVerifyOtpBadRequestBody(body, 'OTP not generated yet.', 'AUTH_FORBIDDEN');
  });

  test('Invalid OTP → 401', async ({}, testInfo) => {
    test.skip(!env.LOGIN_EMAIL || !env.LOGIN_PASSWORD, 'Set LOGIN_EMAIL and LOGIN_PASSWORD in .env');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);
    const client = await createApiClient();
    let loginAttemptId;
    try {
      const loginRes = await client.post('auth/login', {
        data: { email: env.LOGIN_EMAIL, password: env.LOGIN_PASSWORD }
      });
      const loginBody = await loginRes.json();
      expect(loginRes.ok()).toBeTruthy();
      loginAttemptId = loginBody.data.loginAttemptId;
      const sendRes = await client.post('auth/send-otp', {
        data: { loginAttemptId, method: 'EMAIL' }
      });
      const sendBody = await sendRes.json();
      expectSuccessStatus(sendRes, sendBody);
    } finally {
      await client.dispose();
    }

    const { response, body } = await postVerifyOtp(
      { loginAttemptId, otp: '999999' },
      testInfo,
      env.LOGIN_EMAIL
    );
    expectHttpStatus(response, 401);
    expectJsonContentType(response);
    expectAuthVerifyOtpInvalidOtpBody(body);
  });

  test('Missing loginAttemptId → 422', async ({}, testInfo) => {
    const { response, body } = await postVerifyOtp({ otp: '111111' }, testInfo, null);
    expectHttpStatus(response, 422);
    expectJsonContentType(response);
    expectAuthVerifyOtpValidationErrorBody(body, 'loginAttemptId');
  });

  test('Missing otp → 422', async ({}, testInfo) => {
    test.skip(!env.LOGIN_EMAIL || !env.LOGIN_PASSWORD, 'Set LOGIN_EMAIL and LOGIN_PASSWORD in .env');
    const client = await createApiClient();
    let loginAttemptId;
    try {
      const loginRes = await client.post('auth/login', {
        data: { email: env.LOGIN_EMAIL, password: env.LOGIN_PASSWORD }
      });
      const loginBody = await loginRes.json();
      loginAttemptId = loginBody.data.loginAttemptId;
    } finally {
      await client.dispose();
    }

    const { response, body } = await postVerifyOtp({ loginAttemptId }, testInfo, env.LOGIN_EMAIL);
    expectHttpStatus(response, 422);
    expectJsonContentType(response);
    expectAuthVerifyOtpValidationErrorBody(body, 'otp');
  });

  test('OTP already used → 400', async ({}, testInfo) => {
    test.skip(!env.LOGIN_EMAIL || !env.LOGIN_PASSWORD, 'Set LOGIN_EMAIL and LOGIN_PASSWORD in .env');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);
    const client = await createApiClient();
    let loginAttemptId;
    try {
      const loginRes = await client.post('auth/login', {
        data: { email: env.LOGIN_EMAIL, password: env.LOGIN_PASSWORD }
      });
      const loginBody = await loginRes.json();
      expect(loginRes.ok()).toBeTruthy();
      loginAttemptId = loginBody.data.loginAttemptId;
      const sendRes = await client.post('auth/send-otp', {
        data: { loginAttemptId, method: 'EMAIL' }
      });
      const sendBody = await sendRes.json();
      expectSuccessStatus(sendRes, sendBody);
      const v1 = await client.post('auth/verify-otp', {
        data: { loginAttemptId, otp: env.VERIFY_OTP }
      });
      const v1Body = await v1.json();
      expectSuccessStatus(v1, v1Body);
    } finally {
      await client.dispose();
    }

    const { response, body } = await postVerifyOtp(
      { loginAttemptId, otp: env.VERIFY_OTP },
      testInfo,
      env.LOGIN_EMAIL
    );
    expectHttpStatus(response, 400);
    expectJsonContentType(response);
    expectAuthVerifyOtpBadRequestBody(
      body,
      'OTP already used. Please login again.',
      'AUTH_FORBIDDEN'
    );
  });
});
