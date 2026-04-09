const { test } = require('@playwright/test');
const { env } = require('../../../config/env');
const { createApiClient } = require('../../../helpers/apiClient');
const {
  expectJsonContentType,
  expectHttpStatus,
  expectSuccessStatus
} = require('../../../helpers/assertions');
const { expectAuthRefreshInvalidBody } = require('../../../helpers/assertions.auth');
const { publishApiResponse } = require('../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../helpers/otpChainSkip');

test.describe('Refresh token @negative', () => {
  async function postRefresh(testInfo, { data = {}, extraHeaders = {} } = {}) {
    const client = await createApiClient(extraHeaders);
    try {
      const response = await client.post('auth/refresh', { data });
      const body = await response.json();
      await publishApiResponse(testInfo, {
        urlHint: 'refresh',
        status: response.status(),
        statusText: response.statusText(),
        body,
        requestPayload: data
      });
      return { response, body };
    } finally {
      await client.dispose();
    }
  }

  test('No refreshToken in body (and no cookie) → 401', async ({}, testInfo) => {
    const { response, body } = await postRefresh(testInfo, { data: {} });
    expectHttpStatus(response, 401);
    expectJsonContentType(response);
    expectAuthRefreshInvalidBody(body);
  });

  test('Malformed refresh token (not tokenId.secret) → 401', async ({}, testInfo) => {
    const { response, body } = await postRefresh(testInfo, {
      data: { refreshToken: 'not-a-valid-format' }
    });
    expectHttpStatus(response, 401);
    expectJsonContentType(response);
    expectAuthRefreshInvalidBody(body);
  });

  test('Well-formed but unknown session → 401', async ({}, testInfo) => {
    const { response, body } = await postRefresh(testInfo, {
      data: { refreshToken: '00000000-0000-0000-0000-000000000000.fake-secret-part' }
    });
    expectHttpStatus(response, 401);
    expectJsonContentType(response);
    expectAuthRefreshInvalidBody(body);
  });

  test('Reusing refresh token after rotation → 401', async ({}, testInfo) => {
    test.skip(!env.LOGIN_EMAIL || !env.LOGIN_PASSWORD, 'Set LOGIN_EMAIL and LOGIN_PASSWORD in .env');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    let firstRefreshToken;
    try {
      const loginRes = await client.post('auth/login', {
        data: { email: env.LOGIN_EMAIL, password: env.LOGIN_PASSWORD }
      });
      const loginBody = await loginRes.json();
      expectSuccessStatus(loginRes, loginBody);
      const loginAttemptId = loginBody.data.loginAttemptId;

      const sendRes = await client.post('auth/send-otp', {
        data: { loginAttemptId, method: 'EMAIL' }
      });
      const sendBody = await sendRes.json();
      expectSuccessStatus(sendRes, sendBody);

      const verifyRes = await client.post('auth/verify-otp', {
        data: { loginAttemptId, otp: env.VERIFY_OTP }
      });
      const verifyBody = await verifyRes.json();
      expectSuccessStatus(verifyRes, verifyBody);
      firstRefreshToken = verifyBody.data.refreshToken;

      const r1 = await client.post('auth/refresh', {
        data: { refreshToken: firstRefreshToken }
      });
      const r1Body = await r1.json();
      expectSuccessStatus(r1, r1Body);
    } finally {
      await client.dispose();
    }

    const { response, body } = await postRefresh(testInfo, {
      data: { refreshToken: firstRefreshToken }
    });
    expectHttpStatus(response, 401);
    expectJsonContentType(response);
    expectAuthRefreshInvalidBody(body);
  });
});
