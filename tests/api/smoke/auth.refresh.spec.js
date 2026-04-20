const { test, expect } = require('@playwright/test');
const { env } = require('../../../config/env');
const { createApiClient } = require('../../../helpers/apiClient');
const { expectSuccessStatus, expectJsonContentType } = require('../../../helpers/assertions');
const {
  expectAuthLoginOtpSuccessBody,
  expectAuthSendOtpSuccessBody,
  expectAuthVerifyOtpSuccessBody,
  expectAuthRefreshSuccessBody
} = require('../../../helpers/assertions.auth');
const { publishApiResponse } = require('../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../helpers/otpChainSkip');

test.describe('Refresh token @smoke', () => {
  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.

  test('POST /auth/refresh : returns refreshed tokens from JSON refreshToken', async ({}, testInfo) => {
    test.skip(
      !env.LOGIN_EMAIL || !env.LOGIN_PASSWORD,
      'Set LOGIN_EMAIL and LOGIN_PASSWORD in .env'
    );
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const loginRequest = { email: env.LOGIN_EMAIL, password: env.LOGIN_PASSWORD };
      const loginRes = await client.post('auth/login', { data: loginRequest });
      const loginBody = await loginRes.json();
      await publishApiResponse(testInfo, {
        urlHint: 'login',
        response: loginRes,
        loginEmail: loginRequest.email,
        status: loginRes.status(),
        statusText: loginRes.statusText(),
        body: loginBody,
        requestPayload: loginRequest
      });
      expectSuccessStatus(loginRes, loginBody);
      expectJsonContentType(loginRes);
      expectAuthLoginOtpSuccessBody(loginBody);

      const sendPayload = {
        loginAttemptId: loginBody.data.loginAttemptId,
        method: 'EMAIL'
      };
      const sendRes = await client.post('auth/send-otp', { data: sendPayload });
      const sendBody = await sendRes.json();
      await publishApiResponse(testInfo, {
        urlHint: 'send-otp',
        response: sendRes,
        loginEmail: loginRequest.email,
        status: sendRes.status(),
        statusText: sendRes.statusText(),
        body: sendBody,
        requestPayload: sendPayload
      });
      expectSuccessStatus(sendRes, sendBody);
      expectJsonContentType(sendRes);
      expectAuthSendOtpSuccessBody(sendBody);

      const verifyPayload = {
        loginAttemptId: loginBody.data.loginAttemptId,
        otp: env.VERIFY_OTP
      };
      const verifyRes = await client.post('auth/verify-otp', { data: verifyPayload });
      const verifyBody = await verifyRes.json();
      await publishApiResponse(testInfo, {
        urlHint: 'verify-otp',
        response: verifyRes,
        loginEmail: loginRequest.email,
        status: verifyRes.status(),
        statusText: verifyRes.statusText(),
        body: verifyBody,
        requestPayload: verifyPayload
      });
      expectSuccessStatus(verifyRes, verifyBody);
      expectJsonContentType(verifyRes);
      expectAuthVerifyOtpSuccessBody(verifyBody);

      const refreshPayload = { refreshToken: verifyBody.data.refreshToken };
      const refreshRes = await client.post('auth/refresh', { data: refreshPayload });
      const refreshBody = await refreshRes.json();
      await publishApiResponse(testInfo, {
        urlHint: 'refresh',
        response: refreshRes,
        loginEmail: loginRequest.email,
        status: refreshRes.status(),
        statusText: refreshRes.statusText(),
        body: refreshBody,
        requestPayload: refreshPayload
      });
      expectSuccessStatus(refreshRes, refreshBody);
      expectJsonContentType(refreshRes);
      expectAuthRefreshSuccessBody(refreshBody);
      expect(refreshBody.data.refreshToken).not.toBe(verifyBody.data.refreshToken);
      expect(refreshBody.data.accessToken).not.toBe(verifyBody.data.accessToken);
    } finally {
      await client.dispose();
    }
  });
});
