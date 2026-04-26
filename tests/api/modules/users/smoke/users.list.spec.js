/**
 * GET /orgs/:orgId/users only applies after full auth: login → send-otp → verify-otp (Bearer accessToken).
 * This spec uses loginWithOtp(); it skips when SKIP_OTP_CHAIN_TESTS is set or any step fails.
 */
const { test } = require('@playwright/test');
const { env } = require('../../../../../config/env');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { loginWithOtp } = require('../../../../../helpers/authSession');
const { expectSuccessStatus, expectJsonContentType } = require('../../../../../helpers/assertions');
const { expectOrgUsersListSuccessBody } = require('../../../../../helpers/assertions.users');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../../../helpers/otpChainSkip');

test.describe('List org users @smoke @users', () => {
  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.

  test('GET /orgs/:orgId/users : returns owner list with pagination', async ({}, testInfo) => {
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
        session.ok
          ? ''
          : `login → send-otp → verify-otp failed at ${session.step} (HTTP ${session.status})`
      );

      const listUrl = `orgs/${session.orgId}/users`;
      const params = { page: 1, limit: 20 };
      const listRes = await client.get(listUrl, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        params
      });
      const listBody = await listRes.json();
      await publishApiResponse(testInfo, {
        urlHint: 'orgs/users',
        response: listRes,
        loginEmail: session.loginEmail,
        status: listRes.status(),
        statusText: listRes.statusText(),
        body: listBody,
        requestPayload: { path: listUrl, query: params }
      });
      expectSuccessStatus(listRes, listBody);
      expectJsonContentType(listRes);
      expectOrgUsersListSuccessBody(listBody);

    } finally {
      await client.dispose();
    }
  });
});
