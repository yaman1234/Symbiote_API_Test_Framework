/**
 * POST /orgs/:orgId/users — requires login → send-otp → verify-otp (Bearer), Owner-capable account.
 */
const { test } = require('@playwright/test');
const { env } = require('../../../../../config/env');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { loginWithOtp } = require('../../../../../helpers/authSession');
const { expectSuccessStatus, expectJsonContentType } = require('../../../../../helpers/assertions');
const { expectOrgUserCreateSuccessBody } = require('../../../../../helpers/assertions.users');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../../../helpers/otpChainSkip');
const { buildCreateUserPayload } = require('../../../../../helpers/createUserPayload');
const { parseUuidList } = require('../../../../../helpers/createUserPayload');

test.describe('Create org user', () => {
  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.

  test('[ORGS-CREATE-001] : Authorized owner creates user with minimal body → 2XX', async ({}, testInfo) => {
    test.skip(!env.USER_MGMT_OWNER_EMAIL, 'Set USER_MGMT_OWNER_EMAIL (Owner)');
    const password = env.USER_MGMT_OWNER_PASSWORD || env.LOGIN_PASSWORD;
    test.skip(!password, 'Set LOGIN_PASSWORD');
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
      const payload = buildCreateUserPayload({
        branchId: env.USER_CREATE_BRANCH_ID,
        email: `api.test.${Date.now()}@demo.com`,
        departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
        headDepartmentIds: []
      });

      const path = `orgs/${session.orgId}/users`;
      const res = await client.post(path, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        data: payload
      });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'orgs/users-create',
        response: res,
        loginEmail: session.loginEmail,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: { path, body: payload }
      });
      expectSuccessStatus(res, body);
      expectJsonContentType(res);
      expectOrgUserCreateSuccessBody(body);

    } finally {
      await client.dispose();
    }
  });
});
