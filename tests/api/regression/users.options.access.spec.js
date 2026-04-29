/**
 * GET /orgs/:orgId/users/options — access by org role (Owner vs Employee).
 * @see testCases/Orgs_users-options.md (access matrix + ORGS-OPTS-003 / ORGS-OPTS-004)
 */
const { test, expect } = require('@playwright/test');
const { env } = require('../../../config/env');
const { createApiClient } = require('../../../helpers/apiClient');
const { loginWithOtp } = require('../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../helpers/testData');
const { expectSuccessStatus, expectJsonContentType, expectJsonErrorBody } = require('../../../helpers/assertions');
const { expectOrgUsersOptionsSuccessBody, getOrgUsersItems, listItemBranchId } = require('../../../helpers/assertions.users');
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

function resolveOtherBranchId(sessionBranchId) {
  const candidate = env.USER_CREATE_WRONG_BRANCH_ID || env.TASKS_BRANCH_ID || '';
  if (!candidate) return '';
  if (sessionBranchId && String(candidate) === String(sessionBranchId)) return '';
  return candidate;
}

async function resolveOtherBranchIdFromOwner(client, sessionBranchId) {
  const ownerCreds = resolveCredential(
    env.USER_MGMT_OWNER_EMAIL,
    ownerPersona && ownerPersona.email,
    env.USER_MGMT_OWNER_PASSWORD
  );
  if (!ownerCreds.email || !ownerCreds.password) return '';

  const ownerSession = await loginWithOtp(client, {
    email: ownerCreds.email,
    password: ownerCreds.password,
    otp: env.VERIFY_OTP
  });
  if (!ownerSession.ok) return '';

  const path = `orgs/${ownerSession.orgId}/users`;
  const res = await client.get(path, {
    headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
    params: { page: 1, limit: 100 }
  });
  if (!res.ok()) return '';
  const body = await res.json();
  const items = getOrgUsersItems(body);
  for (const row of items) {
    const branchId = listItemBranchId(row);
    if (branchId && String(branchId) !== String(sessionBranchId || '')) return String(branchId);
  }
  return '';
}

async function resolveOtherBranchIdFromSeededAccount(client, sessionBranchId) {
  const alternate = getSeededAccountByKey('t3_emp2') || getSeededAccountByKey('t2_emp2');
  if (!alternate) return '';
  const password = env.LOGIN_PASSWORD || alternate.password;
  if (!password) return '';
  const altSession = await loginWithOtp(client, {
    email: alternate.email,
    password,
    otp: env.VERIFY_OTP
  });
  if (!altSession.ok) return '';
  if (altSession.branchId && String(altSession.branchId) !== String(sessionBranchId || '')) {
    return String(altSession.branchId);
  }
  return '';
}

// LIST ALL THE TESTS IMPLEMENTED IN THE FILE HERE WITH THEIR SCENARIOS
// Test 1: Owner can get user options for own branch
// Test 2: Employee can get user options for own branch
// Test 3: Supervisor can get user options for own branch
// Test 4: Owner can get user options for another branch
// Test 5: Employee can get user options for another branch
// Test 6: Supervisor can get user options for another branch
// Test 7: Owner can get user options for another branch
// Test 8: Employee can get user options for another branch
// Test 9: Supervisor can get user options for another branch

test.describe('User options access by role', () => {
  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.

  test('[ORGS-OPTS-003] : Owner-selected branch options return successfully → 200', async ({}, testInfo) => {
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

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('[ORGS-OPTS-004] : Employee own-branch options return successfully → 200', async ({}, testInfo) => {
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

  test('[ORGS-OPTS-005] : Forbidden employee cross-branch options request is rejected → 4XX', async ({}, testInfo) => {
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
      let otherBranchId = resolveOtherBranchId(session.branchId);
      if (!otherBranchId) {
        otherBranchId = await resolveOtherBranchIdFromOwner(client, session.branchId);
      }
      if (!otherBranchId) {
        otherBranchId = await resolveOtherBranchIdFromSeededAccount(client, session.branchId);
      }
      test.skip(
        !otherBranchId,
        'Could not derive a cross-branch id from env or owner-visible user list'
      );

      const path = `orgs/${session.orgId}/users/options`;
      const params = { branchId: otherBranchId };
      const res = await client.get(path, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        params
      });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'orgs/users/options-employee-cross-branch-denied',
        response: res,
        loginEmail: session.loginEmail,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: { path, query: params }
      });
      expect(res.ok(), `Expected role-restricted denial, got HTTP ${res.status()}`).toBeFalsy();
      expectJsonContentType(res);
      expectJsonErrorBody(body, {
        statusCode: res.status(),
        requireErrorCode: true
      });
    } finally {
      await client.dispose();
    }
  });

  test('[ORGS-OPTS-006] : Forbidden supervisor cross-branch options request is rejected → 4XX', async ({}, testInfo) => {
    const supervisorPersona = getSeededAccountByKey('t3_supervisor') || getSeededAccountByKey('t2_supervisor');
    const { email, password } = resolveCredential(
      env.USER_MGMT_SUPERVISOR_EMAIL,
      supervisorPersona && supervisorPersona.email,
      env.USER_MGMT_SUPERVISOR_PASSWORD
    );
    test.skip(!email, 'Set USER_MGMT_SUPERVISOR_EMAIL or keep seeded supervisor account available');
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
      let otherBranchId = resolveOtherBranchId(session.branchId);
      if (!otherBranchId) {
        otherBranchId = await resolveOtherBranchIdFromOwner(client, session.branchId);
      }
      if (!otherBranchId) {
        otherBranchId = await resolveOtherBranchIdFromSeededAccount(client, session.branchId);
      }
      test.skip(
        !otherBranchId,
        'Could not derive a cross-branch id from env or owner-visible user list'
      );

      const path = `orgs/${session.orgId}/users/options`;
      const params = { branchId: otherBranchId };
      const res = await client.get(path, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        params
      });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'orgs/users/options-supervisor-cross-branch-denied',
        response: res,
        loginEmail: session.loginEmail,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: { path, query: params }
      });
      expect(res.ok(), `Expected role-restricted denial, got HTTP ${res.status()}`).toBeFalsy();
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
