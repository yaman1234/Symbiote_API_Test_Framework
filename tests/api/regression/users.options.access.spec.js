/**
 * GET /orgs/:orgId/users/options — access by org role (Owner vs Employee).
 * @see testCases/Orgs_users-options.md (access matrix + ORGS-OPTS-003 / ORGS-OPTS-004)
 */
const { test } = require('@playwright/test');
const { env } = require('../../../config/env');
const { createApiClient } = require('../../../helpers/apiClient');
const { loginWithOtp } = require('../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../helpers/testData');
const { expectSuccessStatus, expectJsonContentType } = require('../../../helpers/assertions');
const { expectOrgUsersOptionsSuccessBody } = require('../../../helpers/assertions.users');
const { publishApiResponse } = require('../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../helpers/otpChainSkip');

const ownerPersona = getSeededAccountByKey('t1_owner');
const employeePersona = getSeededAccountByKey('t1_emp1');

function resolveCredential(explicitEmail, seededEmail, explicitPassword) {
  return {
    email: explicitEmail || seededEmail || '',
    password: explicitPassword || env.LOGIN_PASSWORD
  };
}

test.describe('User options access by role @regression @users', () => {
  test('Owner — options for a branch (any branch)', async ({}, testInfo) => {
    const { email, password } = resolveCredential(
      env.USER_MGMT_OWNER_EMAIL,
      ownerPersona && ownerPersona.email,
      env.USER_MGMT_OWNER_PASSWORD
    );
    test.skip(!email, 'Set USER_MGMT_OWNER_EMAIL or keep seeded t1_owner email available');
    test.skip(!password, 'Set LOGIN_PASSWORD');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, {
        email,
        password,
        otp: env.VERIFY_OTP
      });
      test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);

      const branchId = session.branchId || env.USER_CREATE_BRANCH_ID;
      test.skip(
        !branchId,
        'Owner session often has no branch.id — set USER_CREATE_BRANCH_ID (UUID) for this test'
      );

      const path = `orgs/${session.orgId}/users/options`;
      const params = { branchId };
      const res = await client.get(path, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        params
      });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'orgs/users/options-owner',
        response: res,
        loginEmail: session.loginEmail,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: { path, query: params }
      });
      expectSuccessStatus(res, body);
      expectJsonContentType(res);
      expectOrgUsersOptionsSuccessBody(body);
    } finally {
      await client.dispose();
    }
  });

  test('Employee — options for own branch only', async ({}, testInfo) => {
    const { email, password } = resolveCredential(
      env.USER_MGMT_EMPLOYEE_EMAIL,
      employeePersona && employeePersona.email,
      env.USER_MGMT_EMPLOYEE_PASSWORD
    );
    test.skip(!email, 'Set USER_MGMT_EMPLOYEE_EMAIL or keep seeded t1_emp1 email available');
    test.skip(!password, 'Set LOGIN_PASSWORD');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, {
        email,
        password,
        otp: env.VERIFY_OTP
      });
      test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);
      test.skip(!session.branchId, 'Employee session must include branch.id for branchId query');

      const path = `orgs/${session.orgId}/users/options`;
      const params = { branchId: session.branchId };
      const res = await client.get(path, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        params
      });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'orgs/users/options-employee',
        response: res,
        loginEmail: session.loginEmail,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: { path, query: params }
      });
      expectSuccessStatus(res, body);
      expectJsonContentType(res);
      expectOrgUsersOptionsSuccessBody(body);
    } finally {
      await client.dispose();
    }
  });
});
