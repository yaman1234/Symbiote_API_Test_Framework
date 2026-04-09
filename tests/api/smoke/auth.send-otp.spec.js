const { test } = require('@playwright/test');
const { env } = require('../../../config/env');
const { createApiClient } = require('../../../helpers/apiClient');
const { expectSuccessStatus, expectJsonContentType } = require('../../../helpers/assertions');
const {
  expectAuthLoginOtpSuccessBody,
  expectAuthSendOtpSuccessBody
} = require('../../../helpers/assertions.auth');
const { publishApiResponse } = require('../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../helpers/otpChainSkip');

test.describe('Send OTP @smoke', () => {
  test('After login', async ({}, testInfo) => {
    test.skip(!env.LOGIN_EMAIL || !env.LOGIN_PASSWORD, 'Set LOGIN_EMAIL and LOGIN_PASSWORD in .env');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const loginRequest = { email: env.LOGIN_EMAIL, password: env.LOGIN_PASSWORD };
      const loginRes = await client.post('auth/login', { data: loginRequest });
      const loginBody = await loginRes.json();
      await publishApiResponse(testInfo, {
        urlHint: 'login',
        status: loginRes.status(),
        statusText: loginRes.statusText(),
        body: loginBody,
        requestPayload: loginRequest
      });
      expectSuccessStatus(loginRes, loginBody);
      expectJsonContentType(loginRes);
      expectAuthLoginOtpSuccessBody(loginBody);

      const otpRequest = {
        loginAttemptId: loginBody.data.loginAttemptId,
        method: 'EMAIL'
      };
      const otpRes = await client.post('auth/send-otp', { data: otpRequest });
      const otpBody = await otpRes.json();
      await publishApiResponse(testInfo, {
        urlHint: 'send-otp',
        status: otpRes.status(),
        statusText: otpRes.statusText(),
        body: otpBody,
        requestPayload: otpRequest
      });
      expectSuccessStatus(otpRes, otpBody);
      expectJsonContentType(otpRes);
      expectAuthSendOtpSuccessBody(otpBody);
    } finally {
      await client.dispose();
    }
  });
});
