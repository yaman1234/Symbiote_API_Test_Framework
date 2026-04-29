/**
 * Inactive user access enforcement:
 * an inactive user should not be granted a fresh authenticated session.
 */
const { test, expect } = require('@playwright/test');
const { env } = require('../../../config/env');
const { createApiClient } = require('../../../helpers/apiClient');
const { loginWithOtp } = require('../../../helpers/authSession');
const { buildUpdateUserPayload, parseUuidList } = require('../../../helpers/createUserPayload');
const { expectJsonContentType, expectJsonErrorBody } = require('../../../helpers/assertions');
const { publishApiResponse } = require('../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../helpers/otpChainSkip');

function skipOtpChain() {
  const reason = otpChainTestsSkippedReason();
  test.skip(!!reason, reason || '');
}

test.describe('Inactive user access', () => {
  test('[ORGS-PATCH-003] : Inactive employee status blocks new session login → 200', async ({}, testInfo) => {
    test.skip(!env.USER_MGMT_OWNER_EMAIL, 'Set USER_MGMT_OWNER_EMAIL');
    test.skip(!env.USER_MGMT_EMPLOYEE_EMAIL, 'Set USER_MGMT_EMPLOYEE_EMAIL');
    const ownerPassword = env.USER_MGMT_OWNER_PASSWORD || env.LOGIN_PASSWORD;
    const employeePassword = env.USER_MGMT_EMPLOYEE_PASSWORD || env.LOGIN_PASSWORD;
    test.skip(!ownerPassword || !employeePassword, 'Set owner/employee password env vars or LOGIN_PASSWORD');
    skipOtpChain();

    const client = await createApiClient();
    let ownerSession;
    let employeeSession;
    try {
      ownerSession = await loginWithOtp(client, {
        email: env.USER_MGMT_OWNER_EMAIL,
        password: ownerPassword,
        otp: env.VERIFY_OTP
      });
      test.skip(!ownerSession.ok, ownerSession.ok ? '' : `Owner OTP chain failed at ${ownerSession.step}`);

      employeeSession = await loginWithOtp(client, {
        email: env.USER_MGMT_EMPLOYEE_EMAIL,
        password: employeePassword,
        otp: env.VERIFY_OTP
      });
      test.skip(!employeeSession.ok, employeeSession.ok ? '' : `Employee OTP chain failed at ${employeeSession.step}`);
      test.skip(!employeeSession.orgUserId, 'Employee orgUserId missing');
      test.skip(!employeeSession.branchId, 'Employee branchId missing');

      const patchPath = `orgs/${ownerSession.orgId}/users/${employeeSession.orgUserId}`;
      const inactivePayload = buildUpdateUserPayload({
        branchId: employeeSession.branchId,
        fullName: 'Inactive Employee Regression',
        departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
        headDepartmentIds: [],
        overrides: {
          status: 'INACTIVE',
          modules: ['INVENTORY']
        }
      });

      const patchInactiveRes = await client.patch(patchPath, {
        headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
        data: inactivePayload
      });
      const patchInactiveBody = await patchInactiveRes.json();
      await publishApiResponse(testInfo, {
        urlHint: 'orgs/users-patch-inactive',
        response: patchInactiveRes,
        loginEmail: ownerSession.loginEmail,
        status: patchInactiveRes.status(),
        statusText: patchInactiveRes.statusText(),
        body: patchInactiveBody,
        requestPayload: { path: patchPath, body: inactivePayload }
      });
      expect([200, 201].includes(patchInactiveRes.status()), `Expected 200/201, got ${patchInactiveRes.status()}`).toBeTruthy();

      const reauthClient = await createApiClient();
      try {
        const denied = await loginWithOtp(reauthClient, {
          email: env.USER_MGMT_EMPLOYEE_EMAIL,
          password: employeePassword,
          otp: env.VERIFY_OTP
        });
        expect(denied.ok, 'Inactive user must not get a new authenticated session').toBeFalsy();
        if (!denied.ok && denied.body) {
          const deniedBody = denied.body;
          const statusCode = Number(deniedBody.statusCode || denied.status || 401);
          expectJsonErrorBody(deniedBody, {
            statusCode,
            requireErrorCode: true,
            requireErrorKey: true
          });
        }
      } finally {
        await reauthClient.dispose();
      }
    } finally {
      // Best-effort cleanup: restore employee status to ACTIVE for other suites.
      if (ownerSession?.ok && employeeSession?.orgUserId && employeeSession?.branchId) {
        const restorePath = `orgs/${ownerSession.orgId}/users/${employeeSession.orgUserId}`;
        const restorePayload = buildUpdateUserPayload({
          branchId: employeeSession.branchId,
          fullName: 'Reactivated Employee Regression',
          departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
          headDepartmentIds: [],
          overrides: {
            status: 'ACTIVE',
            modules: ['INVENTORY']
          }
        });
        const restoreRes = await client.patch(restorePath, {
          headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
          data: restorePayload
        });
        const restoreBody = await restoreRes.json();
        await publishApiResponse(testInfo, {
          urlHint: 'orgs/users-patch-reactivate',
          response: restoreRes,
          loginEmail: ownerSession.loginEmail,
          status: restoreRes.status(),
          statusText: restoreRes.statusText(),
          body: restoreBody,
          requestPayload: { path: restorePath, body: restorePayload }
        });
        expect([200, 201].includes(restoreRes.status()), `Expected 200/201 on restore, got ${restoreRes.status()}`).toBeTruthy();
        expectJsonContentType(restoreRes);
      }
      await client.dispose();
    }
  });
});
