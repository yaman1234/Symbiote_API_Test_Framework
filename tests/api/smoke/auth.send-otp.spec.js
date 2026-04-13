const { test } = require('@playwright/test');
const { env } = require('../../../config/env');
const { createApiClient } = require('../../../helpers/apiClient');
const { expectSuccessStatus, expectJsonContentType, expectJsonSuccessBody } = require('../../../helpers/assertions');
const { postLoginExpectOtpChallenge } = require('../../../helpers/authLoginOtpStep');
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
      const { loginBody } = await postLoginExpectOtpChallenge(client, testInfo, loginRequest);

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
      expectJsonSuccessBody(otpBody, {
        message: 'OTP generated.',
        nonEmptyPaths: [
          'data.delivery.type',
          'data.delivery.masked',
          'data.expiresInSeconds'
        ]
      });
    } finally {
      await client.dispose();
    }
  });
});
