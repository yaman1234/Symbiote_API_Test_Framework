/**
 * GET /orgs/:orgId/users/:orgUserId — Bearer after login → send-otp → verify-otp.
 * Uses the session caller's orgUserId from verify-otp (same org as list/create).
 */
const { test } = require('@playwright/test');
const { env } = require('../../../config/env');
const { createApiClient } = require('../../../helpers/apiClient');
const { loginWithOtp } = require('../../../helpers/authSession');
const { expectSuccessStatus, expectJsonContentType } = require('../../../helpers/assertions');
const { expectOrgUserGetSuccessBody } = require('../../../helpers/assertions.users');
const { publishApiResponse } = require('../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../helpers/otpChainSkip');

test.describe('Get org user @smoke @users', () => {
  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.

  test('GET /orgs/:orgId/users/:orgUserId : returns own org user details', async ({}, testInfo) => {
    test.skip(!env.USER_MGMT_OWNER_EMAIL, 'Set USER_MGMT_OWNER_EMAIL (e.g. t1.owner@demo.com from qa-seeded-accounts.md)');
    const password = env.USER_MGMT_OWNER_PASSWORD || env.LOGIN_PASSWORD;
    test.skip(!password, 'Set USER_MGMT_OWNER_PASSWORD or LOGIN_PASSWORD');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, {
        email: env.USER_MGMT_OWNER_EMAIL,
        password,
        otp: env.VERIFY_OTP
      });
      test.skip(
        !session.ok,
        session.ok ? '' : `login → send-otp → verify-otp failed at ${session.step} (HTTP ${session.status})`
      );
      test.skip(!session.orgUserId, 'verify-otp response missing data.org.orgUserId');

      const path = `orgs/${session.orgId}/users/${session.orgUserId}`;
      const res = await client.get(path, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'orgs/users-get',
        response: res,
        loginEmail: session.loginEmail,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: { path }
      });
      expectSuccessStatus(res, body);
      expectJsonContentType(res);
      expectOrgUserGetSuccessBody(body, { expectedOrgUserId: session.orgUserId });
    } finally {
      await client.dispose();
    }
  });
});
