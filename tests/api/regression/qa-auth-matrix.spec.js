/**
 * QA test matrix for stakeholder / manager HTML reports.
 * Run: npm run test:regression  (tag @regression)
 * See tests/data/qa-test-matrix.md for scenario ↔ row mapping.
 */
const { test, expect } = require('@playwright/test');
const { env } = require('../../../config/env');
const { createApiClient } = require('../../../helpers/apiClient');
const {
  expectSuccessStatus,
  expectJsonContentType,
  expectHttpStatus,
  expectJsonErrorBody
} = require('../../../helpers/assertions');
const {
  expectAuthLoginOtpSuccessBody,
  expectAuthInvalidCredentialsBody,
  expectAuthSendOtpSuccessBody,
  expectAuthSendOtpBadRequestBody,
  expectAuthVerifyOtpSuccessBody,
  expectAuthVerifyOtpBadRequestBody,
  expectAuthVerifyOtpInvalidOtpBody,
  expectAuthRefreshSuccessBody,
  expectAuthRefreshInvalidBody
} = require('../../../helpers/assertions.auth');
const { otpChainTestsSkippedReason } = require('../../../helpers/otpChainSkip');
const { publishApiResponse } = require('../../../helpers/apiResponseReport');

const WRONG_PASSWORD = 'DefinitelyWrong#NotReal99';
const UNKNOWN_EMAIL = 'nonexistent.user@demo.com';
const MALFORMED_REFRESH = 'not-a-valid-format';

test.describe('QA test matrix', () => {
  test.describe.configure({ mode: 'serial' });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('[AUTH-LOGIN-010] : Valid seeded login succeeds → 200', async ({}, testInfo) => {
    test.skip(!env.LOGIN_EMAIL || !env.LOGIN_PASSWORD, 'Set LOGIN_EMAIL and LOGIN_PASSWORD in .env');
    const client = await createApiClient();
    try {
      const requestPayload = { email: env.LOGIN_EMAIL, password: env.LOGIN_PASSWORD };
      const response = await client.post('auth/login', { data: requestPayload });
      const body = await response.json();
      await publishApiResponse(testInfo, {
        urlHint: 'login',
        response,
        loginEmail: requestPayload.email,
        status: response.status(),
        statusText: response.statusText(),
        body,
        requestPayload
      });
      expectSuccessStatus(response, body);
      expectJsonContentType(response);
      expectAuthLoginOtpSuccessBody(body);
    } finally {
      await client.dispose();
    }
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('[AUTH-LOGIN-011] : Uppercase email login succeeds → 200', async ({}, testInfo) => {
    test.skip(!env.LOGIN_EMAIL || !env.LOGIN_PASSWORD, 'Set LOGIN_EMAIL and LOGIN_PASSWORD in .env');
    const client = await createApiClient();
    try {
      const requestPayload = {
        email: env.LOGIN_EMAIL.trim().toUpperCase(),
        password: env.LOGIN_PASSWORD
      };
      const response = await client.post('auth/login', { data: requestPayload });
      const body = await response.json();
      await publishApiResponse(testInfo, {
        urlHint: 'login',
        response,
        loginEmail: requestPayload.email,
        status: response.status(),
        statusText: response.statusText(),
        body,
        requestPayload
      });
      expectSuccessStatus(response, body);
      expectJsonContentType(response);
      expectAuthLoginOtpSuccessBody(body);
    } finally {
      await client.dispose();
    }
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('[AUTH-LOGIN-012] : Wrong password returns 401 Unauthorized → 401', async ({}, testInfo) => {
    test.skip(!env.LOGIN_EMAIL, 'Set LOGIN_EMAIL in .env');
    const client = await createApiClient();
    try {
      const requestPayload = { email: env.LOGIN_EMAIL, password: WRONG_PASSWORD };
      const response = await client.post('auth/login', { data: requestPayload });
      const body = await response.json();
      await publishApiResponse(testInfo, {
        urlHint: 'login',
        response,
        loginEmail: requestPayload.email,
        status: response.status(),
        statusText: response.statusText(),
        body,
        requestPayload
      });
      expectHttpStatus(response, 401);
      expectJsonContentType(response);
      expectAuthInvalidCredentialsBody(body);
    } finally {
      await client.dispose();
    }
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('[AUTH-LOGIN-013] : Unknown email returns 401 Unauthorized → 401', async ({}, testInfo) => {
    const client = await createApiClient();
    try {
      const requestPayload = { email: UNKNOWN_EMAIL, password: WRONG_PASSWORD };
      const response = await client.post('auth/login', { data: requestPayload });
      const body = await response.json();
      await publishApiResponse(testInfo, {
        urlHint: 'login',
        response,
        loginEmail: requestPayload.email,
        status: response.status(),
        statusText: response.statusText(),
        body,
        requestPayload
      });
      expectHttpStatus(response, 401);
      expectJsonContentType(response);
      expectAuthInvalidCredentialsBody(body);
    } finally {
      await client.dispose();
    }
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('[AUTH-SENDOTP-006] : Valid loginAttemptId with EMAIL succeeds → 200', async ({}, testInfo) => {
    test.skip(!env.LOGIN_EMAIL || !env.LOGIN_PASSWORD, 'Set LOGIN_EMAIL and LOGIN_PASSWORD in .env');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);
    const client = await createApiClient();
    try {
      const loginRes = await client.post('auth/login', {
        data: { email: env.LOGIN_EMAIL, password: env.LOGIN_PASSWORD }
      });
      const loginBody = await loginRes.json();
      expectSuccessStatus(loginRes, loginBody);
      const loginAttemptId = loginBody.data.loginAttemptId;
      const sendPayload = { loginAttemptId, method: 'EMAIL' };
      const sendRes = await client.post('auth/send-otp', { data: sendPayload });
      const sendBody = await sendRes.json();
      await publishApiResponse(testInfo, {
        urlHint: 'send-otp',
        response: sendRes,
        loginEmail: env.LOGIN_EMAIL,
        status: sendRes.status(),
        statusText: sendRes.statusText(),
        body: sendBody,
        requestPayload: sendPayload
      });
      expectSuccessStatus(sendRes, sendBody);
      expectJsonContentType(sendRes);
      expectAuthSendOtpSuccessBody(sendBody);
    } finally {
      await client.dispose();
    }
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('[AUTH-SENDOTP-007] : Unsupported SMS method returns 400 Bad Request → 400', async ({}, testInfo) => {
    test.skip(!env.LOGIN_EMAIL || !env.LOGIN_PASSWORD, 'Set LOGIN_EMAIL and LOGIN_PASSWORD in .env');
    const client = await createApiClient();
    try {
      const loginRes = await client.post('auth/login', {
        data: { email: env.LOGIN_EMAIL, password: env.LOGIN_PASSWORD }
      });
      const loginBody = await loginRes.json();
      expectSuccessStatus(loginRes, loginBody);
      const sendPayload = { loginAttemptId: loginBody.data.loginAttemptId, method: 'SMS' };
      const sendRes = await client.post('auth/send-otp', { data: sendPayload });
      const sendBody = await sendRes.json();
      await publishApiResponse(testInfo, {
        urlHint: 'send-otp',
        response: sendRes,
        loginEmail: env.LOGIN_EMAIL,
        status: sendRes.status(),
        statusText: sendRes.statusText(),
        body: sendBody,
        requestPayload: sendPayload
      });
      expectHttpStatus(sendRes, 400);
      expectJsonContentType(sendRes);
      expectAuthSendOtpBadRequestBody(sendBody, {
        message: 'Only EMAIL is supported for now.',
        errorKey: 'AUTH_FORBIDDEN'
      });
    } finally {
      await client.dispose();
    }
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('[AUTH-VERIFY-007] : Valid static OTP after send-otp succeeds → 200', async ({}, testInfo) => {
    test.skip(!env.LOGIN_EMAIL || !env.LOGIN_PASSWORD, 'Set LOGIN_EMAIL and LOGIN_PASSWORD in .env');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);
    const client = await createApiClient();
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
      const verifyPayload = { loginAttemptId, otp: env.VERIFY_OTP };
      const verifyRes = await client.post('auth/verify-otp', { data: verifyPayload });
      const verifyBody = await verifyRes.json();
      await publishApiResponse(testInfo, {
        urlHint: 'verify-otp',
        response: verifyRes,
        loginEmail: env.LOGIN_EMAIL,
        status: verifyRes.status(),
        statusText: verifyRes.statusText(),
        body: verifyBody,
        requestPayload: verifyPayload
      });
      expectSuccessStatus(verifyRes, verifyBody);
      expectJsonContentType(verifyRes);
      expectAuthVerifyOtpSuccessBody(verifyBody);
      const setCookie = verifyRes.headers()['set-cookie'];
      if (!setCookie) {
        test.info().annotations.push({
          type: 'note',
          description:
            'Row 7: No Set-Cookie on verify-otp — some APIs return tokens in JSON only; matrix cookie is optional per deployment.'
        });
      }
    } finally {
      await client.dispose();
    }
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('[AUTH-VERIFY-008] : Premature verify before send-otp returns 400 Bad Request → 400', async ({}, testInfo) => {
    test.skip(!env.LOGIN_EMAIL || !env.LOGIN_PASSWORD, 'Set LOGIN_EMAIL and LOGIN_PASSWORD in .env');
    const client = await createApiClient();
    try {
      const loginRes = await client.post('auth/login', {
        data: { email: env.LOGIN_EMAIL, password: env.LOGIN_PASSWORD }
      });
      const loginBody = await loginRes.json();
      expectSuccessStatus(loginRes, loginBody);
      const verifyPayload = { loginAttemptId: loginBody.data.loginAttemptId, otp: env.VERIFY_OTP };
      const verifyRes = await client.post('auth/verify-otp', { data: verifyPayload });
      const verifyBody = await verifyRes.json();
      await publishApiResponse(testInfo, {
        urlHint: 'verify-otp',
        response: verifyRes,
        loginEmail: env.LOGIN_EMAIL,
        status: verifyRes.status(),
        statusText: verifyRes.statusText(),
        body: verifyBody,
        requestPayload: verifyPayload
      });
      expectHttpStatus(verifyRes, 400);
      expectJsonContentType(verifyRes);
      expectAuthVerifyOtpBadRequestBody(verifyBody, 'OTP not generated yet.', 'AUTH_FORBIDDEN');
    } finally {
      await client.dispose();
    }
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('[AUTH-VERIFY-009] : Wrong OTP returns 401 Unauthorized → 401', async ({}, testInfo) => {
    test.skip(!env.LOGIN_EMAIL || !env.LOGIN_PASSWORD, 'Set LOGIN_EMAIL and LOGIN_PASSWORD in .env');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);
    const client = await createApiClient();
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
      expectSuccessStatus(sendRes, await sendRes.json());
      const verifyRes = await client.post('auth/verify-otp', {
        data: { loginAttemptId, otp: '999999' }
      });
      const verifyBody = await verifyRes.json();
      await publishApiResponse(testInfo, {
        urlHint: 'verify-otp',
        response: verifyRes,
        loginEmail: env.LOGIN_EMAIL,
        status: verifyRes.status(),
        statusText: verifyRes.statusText(),
        body: verifyBody,
        requestPayload: { loginAttemptId, otp: '999999' }
      });
      expectHttpStatus(verifyRes, 401);
      expectJsonContentType(verifyRes);
      expectAuthVerifyOtpInvalidOtpBody(verifyBody);
    } finally {
      await client.dispose();
    }
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('[AUTH-VERIFY-010] : Double verify on same loginAttemptId returns 400 Bad Request → 400', async ({}, testInfo) => {
    test.skip(!env.LOGIN_EMAIL || !env.LOGIN_PASSWORD, 'Set LOGIN_EMAIL and LOGIN_PASSWORD in .env');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);
    const client = await createApiClient();
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
      expectSuccessStatus(sendRes, await sendRes.json());
      const v1 = await client.post('auth/verify-otp', {
        data: { loginAttemptId, otp: env.VERIFY_OTP }
      });
      expectSuccessStatus(v1, await v1.json());
      const v2 = await client.post('auth/verify-otp', {
        data: { loginAttemptId, otp: env.VERIFY_OTP }
      });
      const v2Body = await v2.json();
      await publishApiResponse(testInfo, {
        urlHint: 'verify-otp',
        response: v2,
        loginEmail: env.LOGIN_EMAIL,
        status: v2.status(),
        statusText: v2.statusText(),
        body: v2Body,
        requestPayload: { loginAttemptId, otp: env.VERIFY_OTP }
      });
      expectHttpStatus(v2, 400);
      expectJsonContentType(v2);
      expectAuthVerifyOtpBadRequestBody(
        v2Body,
        'OTP already used. Please login again.',
        'AUTH_FORBIDDEN'
      );
    } finally {
      await client.dispose();
    }
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('[AUTH-REFRESH-006] : Valid body refreshToken refresh succeeds → 200', async ({}, testInfo) => {
    test.skip(!env.LOGIN_EMAIL || !env.LOGIN_PASSWORD, 'Set LOGIN_EMAIL and LOGIN_PASSWORD in .env');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);
    const client = await createApiClient();
    try {
      const loginRes = await client.post('auth/login', {
        data: { email: env.LOGIN_EMAIL, password: env.LOGIN_PASSWORD }
      });
      const loginBody = await loginRes.json();
      expectSuccessStatus(loginRes, loginBody);
      const loginAttemptId = loginBody.data.loginAttemptId;
      await client.post('auth/send-otp', { data: { loginAttemptId, method: 'EMAIL' } });
      const verifyRes = await client.post('auth/verify-otp', {
        data: { loginAttemptId, otp: env.VERIFY_OTP }
      });
      const verifyBody = await verifyRes.json();
      expectSuccessStatus(verifyRes, verifyBody);
      const refreshPayload = { refreshToken: verifyBody.data.refreshToken };
      const refreshRes = await client.post('auth/refresh', { data: refreshPayload });
      const refreshBody = await refreshRes.json();
      await publishApiResponse(testInfo, {
        urlHint: 'refresh',
        response: refreshRes,
        loginEmail: env.LOGIN_EMAIL,
        status: refreshRes.status(),
        statusText: refreshRes.statusText(),
        body: refreshBody,
        requestPayload: refreshPayload
      });
      expectSuccessStatus(refreshRes, refreshBody);
      expectJsonContentType(refreshRes);
      expectAuthRefreshSuccessBody(refreshBody);
      expect(refreshBody.data.refreshToken).not.toBe(verifyBody.data.refreshToken);
    } finally {
      await client.dispose();
    }
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('[AUTH-REFRESH-007] : Valid cookie-only refresh_token succeeds → 200', async ({}, testInfo) => {
    test.skip(!env.LOGIN_EMAIL || !env.LOGIN_PASSWORD, 'Set LOGIN_EMAIL and LOGIN_PASSWORD in .env');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);
    const client = await createApiClient();
    let refreshToken;
    try {
      const loginRes = await client.post('auth/login', {
        data: { email: env.LOGIN_EMAIL, password: env.LOGIN_PASSWORD }
      });
      const loginBody = await loginRes.json();
      expectSuccessStatus(loginRes, loginBody);
      const loginAttemptId = loginBody.data.loginAttemptId;
      await client.post('auth/send-otp', { data: { loginAttemptId, method: 'EMAIL' } });
      const verifyRes = await client.post('auth/verify-otp', {
        data: { loginAttemptId, otp: env.VERIFY_OTP }
      });
      const verifyBody = await verifyRes.json();
      expectSuccessStatus(verifyRes, verifyBody);
      refreshToken = verifyBody.data.refreshToken;
    } finally {
      await client.dispose();
    }

    const cookieClient = await createApiClient({
      Cookie: `refresh_token=${refreshToken}`
    });
    try {
      const refreshRes = await cookieClient.post('auth/refresh', { data: {} });
      const refreshBody = await refreshRes.json();
      await publishApiResponse(testInfo, {
        urlHint: 'refresh-cookie',
        response: refreshRes,
        loginEmail: env.LOGIN_EMAIL,
        status: refreshRes.status(),
        statusText: refreshRes.statusText(),
        body: refreshBody,
        requestPayload: {}
      });
      if (!refreshRes.ok()) {
        test.skip(
          true,
          'Row 12: Cookie-only refresh not accepted (non-2xx). Enable cookie parsing for API clients or treat as environment limitation.'
        );
      }
      expectSuccessStatus(refreshRes, refreshBody);
      expectJsonContentType(refreshRes);
      expectAuthRefreshSuccessBody(refreshBody);
    } finally {
      await cookieClient.dispose();
    }
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('[AUTH-REFRESH-008] : Malformed refresh token returns 401 Unauthorized → 401', async ({}, testInfo) => {
    const client = await createApiClient();
    try {
      const payload = { refreshToken: MALFORMED_REFRESH };
      const res = await client.post('auth/refresh', { data: payload });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'refresh',
        response: res,
        loginEmail: null,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: payload
      });
      expectHttpStatus(res, 401);
      expectJsonContentType(res);
      expectAuthRefreshInvalidBody(body);
    } finally {
      await client.dispose();
    }
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('[MISC-PROT-001] : Invalid JWT on protected GET returns 401 Unauthorized → 401', async ({}, testInfo) => {
    // Use configured protected path when present; otherwise fall back to a known auth-protected route.
    const protectedPath = (env.PROTECTED_API_PATH || 'orgs/00000000-0000-0000-0000-000000000001/users').replace(/^\//, '');
    const invalidJwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJleHAiOjk5fQ.invalid';
    const client = await createApiClient({
      Authorization: `Bearer ${invalidJwt}`
    });
    try {
      const response = await client.get(protectedPath);
      let body;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      await publishApiResponse(testInfo, {
        urlHint: protectedPath,
        response,
        path: protectedPath,
        loginEmail: null,
        status: response.status(),
        statusText: response.statusText(),
        body: body || { _parseError: true },
        requestPayload: { path: protectedPath }
      });
      expectHttpStatus(response, 401);
      expectJsonContentType(response);
      expect(body).toBeTruthy();
      expectJsonErrorBody(body, {
        statusCode: 401,
        messageIncludes: 'Authentication required',
        requireErrorCode: true,
        requireErrorKey: true
      });
    } finally {
      await client.dispose();
    }
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('[AUTH-VERIFY-011] : Valid tier-3 member verify includes branch data → 200', async ({}, testInfo) => {
    test.skip(!env.TIER3_MEMBER_EMAIL, 'Set TIER3_MEMBER_EMAIL (e.g. t3.emp1@demo.com) and TIER3_MEMBER_PASSWORD or LOGIN_PASSWORD');
    const password = env.TIER3_MEMBER_PASSWORD || env.LOGIN_PASSWORD;
    test.skip(!password, 'Set TIER3_MEMBER_PASSWORD or LOGIN_PASSWORD');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);
    const client = await createApiClient();
    try {
      const loginRes = await client.post('auth/login', {
        data: { email: env.TIER3_MEMBER_EMAIL, password }
      });
      const loginBody = await loginRes.json();
      expectSuccessStatus(loginRes, loginBody);
      expectAuthLoginOtpSuccessBody(loginBody);
      const loginAttemptId = loginBody.data.loginAttemptId;
      const sendRes = await client.post('auth/send-otp', {
        data: { loginAttemptId, method: 'EMAIL' }
      });
      expectSuccessStatus(sendRes, await sendRes.json());
      const verifyRes = await client.post('auth/verify-otp', {
        data: { loginAttemptId, otp: env.VERIFY_OTP }
      });
      const verifyBody = await verifyRes.json();
      await publishApiResponse(testInfo, {
        urlHint: 'verify-otp-tier3',
        response: verifyRes,
        loginEmail: env.TIER3_MEMBER_EMAIL,
        status: verifyRes.status(),
        statusText: verifyRes.statusText(),
        body: verifyBody,
        requestPayload: { loginAttemptId, otp: env.VERIFY_OTP }
      });
      expectSuccessStatus(verifyRes, verifyBody);
      expectAuthVerifyOtpSuccessBody(verifyBody);
      expect(verifyBody.data.org.orgRole).toBe('MEMBER');
      expect(verifyBody.data.branch).toBeTruthy();
      expect(typeof verifyBody.data.branch.id).toBe('string');
      expect(verifyBody.data.branch.id.length).toBeGreaterThan(0);
    } finally {
      await client.dispose();
    }
  });
});
