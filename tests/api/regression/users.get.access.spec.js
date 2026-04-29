const { test, expect } = require('@playwright/test');
const { env } = require('../../../config/env');
const { createApiClient } = require('../../../helpers/apiClient');
const { loginWithOtp } = require('../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../helpers/testData');
const { expectJsonContentType, expectJsonErrorBody } = require('../../../helpers/assertions');
const { getOrgUsersItems, listItemIdentity } = require('../../../helpers/assertions.users');
const { publishApiResponse } = require('../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../helpers/otpChainSkip');

async function findOrgUserIdByEmail(client, ownerSession, targetEmail) {
  const path = `orgs/${ownerSession.orgId}/users`;
  const params = { q: targetEmail, page: 1, limit: 50 };
  const res = await client.get(path, {
    headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
    params
  });
  if (!res.ok()) return null;
  const body = await res.json();
  const items = getOrgUsersItems(body);
  const wanted = String(targetEmail || '').trim().toLowerCase();
  const row = items.find((item) => String(item?.email || '').trim().toLowerCase() === wanted);
  return row ? listItemIdentity(row) : null;
}

test.describe('Get user detail role-negative access', () => {
  test('[ORGS-USERS-GET-003] : Forbidden employee access to another user detail is rejected → 4XX', async ({}, testInfo) => {
    const owner = getSeededAccountByKey('t1_owner');
    const employee = getSeededAccountByKey('t1_emp1');
    const otherEmployee = getSeededAccountByKey('t1_emp2');
    test.skip(!owner || !employee, 'Seeded t1_owner and t1_emp1 accounts are required');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const ownerSession = await loginWithOtp(client, {
        email: env.USER_MGMT_OWNER_EMAIL || owner.email,
        password: env.USER_MGMT_OWNER_PASSWORD || env.LOGIN_PASSWORD || owner.password,
        otp: env.VERIFY_OTP
      });
      test.skip(!ownerSession.ok, ownerSession.ok ? '' : `Owner OTP login failed at ${ownerSession.step}`);

      const employeeSession = await loginWithOtp(client, {
        email: env.USER_MGMT_EMPLOYEE_EMAIL || employee.email,
        password: env.USER_MGMT_EMPLOYEE_PASSWORD || env.LOGIN_PASSWORD || employee.password,
        otp: env.VERIFY_OTP
      });
      test.skip(!employeeSession.ok, employeeSession.ok ? '' : `Employee OTP login failed at ${employeeSession.step}`);

      const targetEmail = (otherEmployee && otherEmployee.email) || owner.email;
      let targetOrgUserId = ownerSession.orgUserId || null;
      if (!targetOrgUserId) {
        targetOrgUserId = await findOrgUserIdByEmail(client, ownerSession, targetEmail);
      }
      test.skip(!targetOrgUserId, `Could not resolve target orgUserId for ${targetEmail}`);
      test.skip(
        String(targetOrgUserId) === String(employeeSession.orgUserId),
        'Target orgUserId resolved to the same employee user; cannot validate cross-user denial'
      );

      const path = `orgs/${employeeSession.orgId}/users/${targetOrgUserId}`;
      const res = await client.get(path, {
        headers: { Authorization: `Bearer ${employeeSession.accessToken}` }
      });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'orgs/users/get-employee-other-user-denied',
        response: res,
        loginEmail: employeeSession.loginEmail,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: { path, targetEmail }
      });
      expect(res.ok(), `Expected employee role restriction, got HTTP ${res.status()}`).toBeFalsy();
      expectJsonContentType(res);
      expectJsonErrorBody(body, {
        statusCode: res.status(),
        requireErrorCode: true
      });
    } finally {
      await client.dispose();
    }
  });

  test('[ORGS-USERS-GET-004] : Forbidden supervisor access to out-of-scope user detail is rejected → 4XX', async ({}, testInfo) => {
    const owner = getSeededAccountByKey('t3_owner');
    const supervisor = getSeededAccountByKey('t3_supervisor');
    const outOfScopeEmployee = getSeededAccountByKey('t3_emp2');
    test.skip(!owner || !supervisor || !outOfScopeEmployee, 'Seeded t3_owner, t3_supervisor, and t3_emp2 are required');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const ownerSession = await loginWithOtp(client, {
        email: env.USER_MGMT_OWNER_EMAIL || owner.email,
        password: env.USER_MGMT_OWNER_PASSWORD || env.LOGIN_PASSWORD || owner.password,
        otp: env.VERIFY_OTP
      });
      test.skip(!ownerSession.ok, ownerSession.ok ? '' : `Owner OTP login failed at ${ownerSession.step}`);

      const supervisorSession = await loginWithOtp(client, {
        email: env.USER_MGMT_SUPERVISOR_EMAIL || supervisor.email,
        password: env.USER_MGMT_SUPERVISOR_PASSWORD || env.LOGIN_PASSWORD || supervisor.password,
        otp: env.VERIFY_OTP
      });
      test.skip(
        !supervisorSession.ok,
        supervisorSession.ok ? '' : `Supervisor OTP login failed at ${supervisorSession.step}`
      );

      let targetOrgUserId = ownerSession.orgUserId || null;
      if (!targetOrgUserId) {
        targetOrgUserId = await findOrgUserIdByEmail(client, ownerSession, outOfScopeEmployee.email);
      }
      test.skip(!targetOrgUserId, `Could not resolve target orgUserId for ${outOfScopeEmployee.email}`);
      test.skip(
        String(targetOrgUserId) === String(supervisorSession.orgUserId),
        'Target orgUserId resolved to supervisor user; cannot validate out-of-scope denial'
      );

      const path = `orgs/${supervisorSession.orgId}/users/${targetOrgUserId}`;
      const res = await client.get(path, {
        headers: { Authorization: `Bearer ${supervisorSession.accessToken}` }
      });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'orgs/users/get-supervisor-out-of-scope-denied',
        response: res,
        loginEmail: supervisorSession.loginEmail,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: { path, targetEmail: outOfScopeEmployee.email }
      });
      expect(res.ok(), `Expected supervisor scope restriction, got HTTP ${res.status()}`).toBeFalsy();
      expectJsonContentType(res);
      expectJsonErrorBody(body, {
        statusCode: res.status(),
        requireErrorCode: true
      });
    } finally {
      await client.dispose();
    }
  });
});
