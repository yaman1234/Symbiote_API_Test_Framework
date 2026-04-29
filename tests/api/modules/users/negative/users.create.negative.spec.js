const { test } = require('@playwright/test');
const { env } = require('../../../../../config/env');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { loginWithOtp } = require('../../../../../helpers/authSession');
const { buildCreateUserPayload, parseUuidList } = require('../../../../../helpers/createUserPayload');
const { expectHttpStatus, expectJsonContentType, expectJsonErrorBody } = require('../../../../../helpers/assertions');
const { expectAuthValidationErrorBody } = require('../../../../../helpers/assertions.auth');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../../../helpers/otpChainSkip');

test.describe('Create org user', () => {
  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.

  test('[ORGS-CREATE-002] : Unauthorized create request returns 401 → 401', async ({}, testInfo) => {
    const client = await createApiClient();
    try {
      const path = 'orgs/00000000-0000-0000-0000-000000000001/users';
      const res = await client.post(path, { data: { email: 'x@y.com' } });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'orgs/users-create-unauth',
        response: res,
        loginEmail: null,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: { path }
      });
      expectHttpStatus(res, 401);
      expectJsonContentType(res);
      expectJsonErrorBody(body, {
        statusCode: 401,
        messageIncludes: 'Authentication',
        requireErrorCode: true,
        requireErrorKey: true
      });
    } finally {
      await client.dispose();
    }
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('[ORGS-CREATE-003] : Missing email on create returns 422 Validation Error → 422', async ({}, testInfo) => {
    test.skip(!env.USER_MGMT_OWNER_EMAIL, 'Set USER_MGMT_OWNER_EMAIL');
    test.skip(!env.USER_CREATE_BRANCH_ID, 'Set USER_CREATE_BRANCH_ID');
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
      test.skip(!session.ok, session.ok ? '' : `OTP chain failed at ${session.step}`);

      const departmentIds = parseUuidList(env.USER_CREATE_DEPARTMENT_IDS);
      const base = buildCreateUserPayload({
        branchId: env.USER_CREATE_BRANCH_ID,
        email: 'placeholder@demo.com',
        departmentIds,
        headDepartmentIds: []
      });
      delete base.email;

      const path = `orgs/${session.orgId}/users`;
      const res = await client.post(path, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        data: base
      });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'orgs/users-create-validation',
        response: res,
        loginEmail: session.loginEmail,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: { path, body: base }
      });
      expectHttpStatus(res, 422);
      expectJsonContentType(res);
      expectAuthValidationErrorBody(body, 'email');
    } finally {
      await client.dispose();
    }
  });
});
