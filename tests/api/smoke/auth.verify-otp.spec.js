const { test } = require('@playwright/test');
const { env } = require('../../../config/env');
const { createApiClient } = require('../../../helpers/apiClient');
const { expectSuccessStatus, expectJsonContentType } = require('../../../helpers/assertions');
const { expectAuthSendOtpSuccessBody, expectAuthVerifyOtpSuccessBody } = require('../../../helpers/assertions.auth');
const { postLoginExpectOtpChallenge } = require('../../../helpers/authLoginOtpStep');
const { publishApiResponse } = require('../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../helpers/otpChainSkip');

test.describe('Verify OTP @smoke', () => {
  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.

  test('POST /auth/verify-otp : returns tokens after full login flow', async ({}, testInfo) => {
    test.skip(
      !env.LOGIN_EMAIL || !env.LOGIN_PASSWORD,
      'Set LOGIN_EMAIL and LOGIN_PASSWORD in .env'
    );
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const loginRequest = { email: env.LOGIN_EMAIL, password: env.LOGIN_PASSWORD };
      const { loginBody } = await postLoginExpectOtpChallenge(client, testInfo, loginRequest);

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

      
    } finally {
      await client.dispose();
    }
  });
});
