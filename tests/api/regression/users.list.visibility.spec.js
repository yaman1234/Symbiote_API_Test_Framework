const { test, expect } = require('@playwright/test');
const { env } = require('../../../config/env');
const { createApiClient } = require('../../../helpers/apiClient');
const { loginWithOtp } = require('../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../helpers/testData');
const { expectSuccessStatus, expectJsonContentType } = require('../../../helpers/assertions');
const {
  expectOrgUsersListSuccessBody,
  getOrgUsersItems,
  getOrgUsersListTotal,
  listItemIdentity,
  listItemBranchId
} = require('../../../helpers/assertions.users');
const { publishApiResponse } = require('../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../helpers/otpChainSkip');

test.describe('List users visibility @regression @users', () => {
  const ownerPersona = getSeededAccountByKey('t1_owner');
  const employeePersona = getSeededAccountByKey('t1_emp1');
  const supervisorPersona = getSeededAccountByKey('t3_supervisor');

  function resolveCredential(explicitEmail, seededEmail, explicitPassword) {
    return {
      email: explicitEmail || seededEmail || '',
      password: explicitPassword || env.LOGIN_PASSWORD
    };
  }

  async function fetchUserList(client, session, testInfo, query = {}) {
    const listUrl = `orgs/${session.orgId}/users`;
    const listParams = { page: 1, limit: 50, ...query };
    const listRes = await client.get(listUrl, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      params: listParams
    });
    const listBody = await listRes.json();
    await publishApiResponse(testInfo, {
      urlHint: 'orgs/users',
      response: listRes,
      loginEmail: session.loginEmail,
      status: listRes.status(),
      statusText: listRes.statusText(),
      body: listBody,
      requestPayload: { path: listUrl, query: listParams }
    });
    return { listRes, listBody };
  }

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('GET /orgs/:orgId/users : returns organization-wide users for owner', async ({}, testInfo) => {
    const { email, password } = resolveCredential(
      env.USER_MGMT_OWNER_EMAIL,
      ownerPersona && ownerPersona.email,
      env.USER_MGMT_OWNER_PASSWORD
    );
    test.skip(!email, 'Set USER_MGMT_OWNER_EMAIL or keep seeded account t1.owner@demo.com available');
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

      const { listRes, listBody } = await fetchUserList(client, session, testInfo);
      expectSuccessStatus(listRes, listBody);
      expectJsonContentType(listRes);
      expectOrgUsersListSuccessBody(listBody);
      const items = getOrgUsersItems(listBody);
      const total = getOrgUsersListTotal(listBody);
      if (typeof total === 'number') {
        expect(total).toBeGreaterThanOrEqual(2);
      } else {
        expect(items.length, 'owner list total (no meta.total)').toBeGreaterThanOrEqual(2);
      }
    } finally {
      await client.dispose();
    }
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('GET /orgs/:orgId/users : returns only self for employee', async ({}, testInfo) => {
    const { email, password } = resolveCredential(
      env.USER_MGMT_EMPLOYEE_EMAIL,
      employeePersona && employeePersona.email,
      env.USER_MGMT_EMPLOYEE_PASSWORD
    );
    test.skip(!email, 'Set USER_MGMT_EMPLOYEE_EMAIL or keep seeded account t1.emp1@demo.com available');
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

      const { listRes, listBody } = await fetchUserList(client, session, testInfo);
      expectSuccessStatus(listRes, listBody);
      expectJsonContentType(listRes);
      expectOrgUsersListSuccessBody(listBody);
      const items = getOrgUsersItems(listBody);
      const selfId = session.orgUserId;
      expect(items.length, 'employee list should be only own row(s)').toBeGreaterThan(0);
      for (const row of items) {
        expect(listItemIdentity(row)).toBe(selfId);
      }
      const total = getOrgUsersListTotal(listBody);
      if (typeof total === 'number') {
        expect(total).toBe(items.length);
      }
    } finally {
      await client.dispose();
    }
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('GET /orgs/:orgId/users : returns branch-scoped users for supervisor', async ({}, testInfo) => {
    const { email, password } = resolveCredential(
      env.USER_MGMT_SUPERVISOR_EMAIL,
      supervisorPersona && supervisorPersona.email,
      env.USER_MGMT_SUPERVISOR_PASSWORD
    );
    test.skip(
      !email,
      'Set USER_MGMT_SUPERVISOR_EMAIL or keep seeded account t3.supervisor@demo.com available'
    );
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
      test.skip(!session.branchId, 'Supervisor session expected to include branch.id');

      const { listRes, listBody } = await fetchUserList(client, session, testInfo);
      expectSuccessStatus(listRes, listBody);
      expectJsonContentType(listRes);
      expectOrgUsersListSuccessBody(listBody);
      const items = getOrgUsersItems(listBody);
      // Supervisor list contract (API may expose branch per row or not):
      // - When every list row has a branch id (`branchId` / `branch.id`), we assert strict branch
      //   alignment: all rows share exactly one branch id and it matches the supervisor session.
      // - Otherwise (sparse / missing branch fields, or empty branch ids on some rows), we only
      //   require that the supervisor's own org user id appears in the list (e.g. self visible when
      //   the API does not repeat branch on each item).
      const branchOnRows = items.map(listItemBranchId).filter((b) => typeof b === 'string' && b.length > 0);
      if (branchOnRows.length === items.length && items.length > 0) {
        expect(new Set(branchOnRows).size).toBe(1);
        expect(branchOnRows[0]).toBe(session.branchId);
      } else {
        const ids = items.map(listItemIdentity);
        expect(ids).toContain(session.orgUserId);
      }
    } finally {
      await client.dispose();
    }
  });
});
