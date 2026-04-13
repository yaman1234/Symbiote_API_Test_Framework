/**
 * Smoke: GET /orgs/:orgId/users/options
 *
 * Purpose
 *   Exercises the "user options" API used for UI dropdowns (e.g. picking users in a branch).
 *   The route is protected: the server expects a valid Bearer access token from a completed login.
 *
 * Flow (this file)
 *   1. Preconditions / skips — env must define a supervisor user and OTP chain must be allowed.
 *   2. createApiClient() — Playwright APIRequestContext against BASE_URL (JSON headers).
 *   3. loginWithOtp() — full chain: POST auth/login → send-otp → verify-otp; returns accessToken,
 *      orgId, branchId (from verify response), etc.
 *   4. GET orgs/{orgId}/users/options?branchId={branchId} with Authorization: Bearer {token}.
 *   5. publishApiResponse — attaches request/response to the test report for debugging.
 *   6. Assertions — HTTP success, JSON content-type, then expectOrgUsersOptionsSuccessBody()
 *      (envelope + each row: orgUserId, fullName, email, branchRole in EMPLOYEE|SUPERVISOR).
 *
 * Why USER_MGMT_SUPERVISOR_EMAIL
 *   This persona is expected to have org + branch context so branchId query is meaningful for QA.
 */
const { test } = require('@playwright/test');
const { env } = require('../../../config/env');
const { createApiClient } = require('../../../helpers/apiClient');
const { loginWithOtp } = require('../../../helpers/authSession');
const { expectSuccessStatus, expectJsonContentType } = require('../../../helpers/assertions');
const { expectOrgUsersOptionsSuccessBody } = require('../../../helpers/assertions.users');
const { publishApiResponse } = require('../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../helpers/otpChainSkip');

test.describe('User options (branch dropdown) @smoke @users', () => {
  test('GET /orgs/:orgId/users/options?branchId= — shape and EMPLOYEE|SUPERVISOR only', async ({}, testInfo) => {
    // --- Credentials: supervisor account used for user-management flows in QA ---
    test.skip(
      !env.USER_MGMT_SUPERVISOR_EMAIL,
      'Set USER_MGMT_SUPERVISOR_EMAIL (e.g. t3.supervisor@demo.com) for branchId + orgId'
    );
    // Prefer a dedicated password env var; fall back to shared LOGIN_PASSWORD for local runs.
    const password = env.USER_MGMT_SUPERVISOR_PASSWORD || env.LOGIN_PASSWORD;
    test.skip(!password, 'Set LOGIN_PASSWORD');

    // When SKIP_OTP_CHAIN_TESTS is set, send-otp may be broken in the environment — skip early.
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      // --- Full OTP login (no per-step publish here; authSession returns tokens or failure metadata) ---
      const session = await loginWithOtp(client, {
        email: env.USER_MGMT_SUPERVISOR_EMAIL,
        password,
        otp: env.VERIFY_OTP
      });
      // loginWithOtp does not throw on HTTP errors; convert failure into a skipped test with context.
      test.skip(
        !session.ok,
        session.ok
          ? ''
          : `login → send-otp → verify-otp failed at ${session.step} (HTTP ${session.status})`
      );
      // This endpoint test passes branchId=... ; skip if verify-otp response had no branch.id.
      test.skip(!session.branchId, 'Supervisor session must include branch.id for branchId query');

      // Relative to BASE_URL (e.g. .../api/v1/): GET .../orgs/{orgId}/users/options?branchId=...
      const path = `orgs/${session.orgId}/users/options`;
      const params = { branchId: session.branchId };
      const res = await client.get(path, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        params
      });
      const body = await res.json();

      // Attach to Playwright report (screenshots/HTML report) for API debugging.
      await publishApiResponse(testInfo, {
        urlHint: 'orgs/users/options',
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: { path, query: params }
      });

      expectSuccessStatus(res, body);
      expectJsonContentType(res);
      // Validates Symbiote-style JSON envelope + options rows (see helpers/assertions.users.js).
      expectOrgUsersOptionsSuccessBody(body);
    } finally {
      // Always release the HTTP context so workers do not leak connections.
      await client.dispose();
    }
  });
});
