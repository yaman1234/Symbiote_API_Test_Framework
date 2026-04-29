const { test, expect } = require('@playwright/test');
const { env } = require('../../../config/env');
const { createApiClient } = require('../../../helpers/apiClient');
const { loginWithOtp } = require('../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../helpers/testData');
const { expectSuccessStatus, expectJsonContentType, expectJsonErrorBody } = require('../../../helpers/assertions');
const { expectTasksListSuccessBody } = require('../../../helpers/assertions.tasks');
const { getOrgUsersItems, listItemBranchId } = require('../../../helpers/assertions.users');
const { publishApiResponse } = require('../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../helpers/otpChainSkip');

function resolveCredential(email, fallbackEmail, password, fallbackPassword) {
  return {
    email: email || fallbackEmail || '',
    password: password || fallbackPassword || ''
  };
}

async function loginWithOtpAny(client, credentialCandidates) {
  for (const candidate of credentialCandidates) {
    if (!candidate || !candidate.email || !candidate.password) continue;
    const session = await loginWithOtp(client, {
      email: candidate.email,
      password: candidate.password,
      otp: env.VERIFY_OTP
    });
    if (session.ok) return session;
  }
  return null;
}

function resolveOtherBranchId(sessionBranchId) {
  const candidate = env.USER_CREATE_WRONG_BRANCH_ID || '';
  if (!candidate) return '';
  if (sessionBranchId && String(candidate) === String(sessionBranchId)) return '';
  return candidate;
}

async function resolveOtherBranchIdFromOwner(client, sessionBranchId) {
  const ownerPersona = getSeededAccountByKey('t1_owner') || getSeededAccountByKey('t3_owner');
  const ownerCreds = resolveCredential(
    env.TASKS_OWNER_EMAIL || env.USER_MGMT_OWNER_EMAIL,
    ownerPersona && ownerPersona.email,
    env.TASKS_OWNER_PASSWORD || env.USER_MGMT_OWNER_PASSWORD,
    env.LOGIN_PASSWORD
  );
  if (!ownerCreds.email || !ownerCreds.password) return '';

  const ownerSession = await loginWithOtp(client, {
    email: ownerCreds.email,
    password: ownerCreds.password,
    otp: env.VERIFY_OTP
  });
  if (!ownerSession.ok) return '';

  const listPath = `orgs/${ownerSession.orgId}/users`;
  const listRes = await client.get(listPath, {
    headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
    params: { page: 1, limit: 100 }
  });
  if (!listRes.ok()) return '';
  const listBody = await listRes.json();
  const items = getOrgUsersItems(listBody);
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

test.describe('List tasks access by role', () => {
  const owner = getSeededAccountByKey('t1_owner');
  const supervisor = getSeededAccountByKey('t3_supervisor');
  const employee = getSeededAccountByKey('t3_emp1');

  async function fetchTasksList(client, session, branchId, testInfo, urlHint) {
    const path = `orgs/${session.orgId}/branches/${branchId}/tasks`;
    const params = { page: 1, pageSize: 20, sort: 'createdAt', order: 'desc' };
    const res = await client.get(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      params
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint,
      response: res,
      loginEmail: session.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, query: params }
    });
    return { res, body };
  }

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.
  test('[TASKS-LIST-003] : Owner branch tasks list returns successfully → 2XX', async ({}, testInfo) => {
    const c = resolveCredential(
      env.TASKS_OWNER_EMAIL || env.USER_MGMT_OWNER_EMAIL,
      owner && owner.email,
      env.TASKS_OWNER_PASSWORD || env.USER_MGMT_OWNER_PASSWORD,
      env.LOGIN_PASSWORD
    );
    test.skip(!c.email, 'Set TASKS_OWNER_EMAIL or USER_MGMT_OWNER_EMAIL');
    test.skip(!c.password, 'Set TASKS_OWNER_PASSWORD or LOGIN_PASSWORD');
    test.skip(!env.TASKS_BRANCH_ID, 'Set TASKS_BRANCH_ID');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, { email: c.email, password: c.password, otp: env.VERIFY_OTP });
      test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);
      const { res, body } = await fetchTasksList(client, session, env.TASKS_BRANCH_ID, testInfo, 'tasks/list-owner');
      expectSuccessStatus(res, body);
      expectJsonContentType(res);
      expectTasksListSuccessBody(body, { message: 'Tasks fetched.' });
    } finally {
      await client.dispose();
    }
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.
  test('[TASKS-LIST-004] : Supervisor branch tasks list returns successfully → 2XX', async ({}, testInfo) => {
    const c = resolveCredential(
      env.TASKS_SUPERVISOR_EMAIL || env.USER_MGMT_SUPERVISOR_EMAIL,
      supervisor && supervisor.email,
      env.TASKS_SUPERVISOR_PASSWORD || env.USER_MGMT_SUPERVISOR_PASSWORD,
      env.LOGIN_PASSWORD
    );
    test.skip(!c.email, 'Set TASKS_SUPERVISOR_EMAIL or USER_MGMT_SUPERVISOR_EMAIL');
    test.skip(!c.password, 'Set TASKS_SUPERVISOR_PASSWORD or LOGIN_PASSWORD');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, { email: c.email, password: c.password, otp: env.VERIFY_OTP });
      test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);
      const branchId = session.branchId || env.TASKS_BRANCH_ID;
      test.skip(!branchId, 'Set TASKS_BRANCH_ID or use a supervisor with branch.id in token');
      const { res, body } = await fetchTasksList(client, session, branchId, testInfo, 'tasks/list-supervisor');
      expectSuccessStatus(res, body);
      expectJsonContentType(res);
      expectTasksListSuccessBody(body, { message: 'Tasks fetched.' });
    } finally {
      await client.dispose();
    }
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.
  test('[TASKS-LIST-005] : Employee scoped tasks list returns successfully → 2XX', async ({}, testInfo) => {
    const c = resolveCredential(
      env.TASKS_EMPLOYEE_EMAIL || env.USER_MGMT_EMPLOYEE_EMAIL,
      employee && employee.email,
      env.TASKS_EMPLOYEE_PASSWORD || env.USER_MGMT_EMPLOYEE_PASSWORD,
      env.LOGIN_PASSWORD
    );
    test.skip(!c.email, 'Set TASKS_EMPLOYEE_EMAIL or USER_MGMT_EMPLOYEE_EMAIL');
    test.skip(!c.password, 'Set TASKS_EMPLOYEE_PASSWORD or LOGIN_PASSWORD');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const altEmployee1 = getSeededAccountByKey('t1_emp1');
      const altEmployee2 = getSeededAccountByKey('t2_emp1');
      const session = await loginWithOtpAny(client, [
        { email: c.email, password: c.password },
        altEmployee1 ? { email: altEmployee1.email, password: env.LOGIN_PASSWORD || altEmployee1.password } : null,
        altEmployee2 ? { email: altEmployee2.email, password: env.LOGIN_PASSWORD || altEmployee2.password } : null
      ]);
      test.skip(!session, 'OTP login failed for all employee candidates');
      let branchId = session.branchId || env.TASKS_BRANCH_ID;
      if (!branchId) {
        branchId = await resolveOtherBranchIdFromSeededAccount(client, '');
      }
      if (!branchId) {
        branchId = await resolveOtherBranchIdFromOwner(client, '');
      }
      test.skip(!branchId, 'Could not resolve an employee branch id from session, seeded account, or owner lookup');
      const { res, body } = await fetchTasksList(client, session, branchId, testInfo, 'tasks/list-employee');
      expectSuccessStatus(res, body);
      expectJsonContentType(res);
      expectTasksListSuccessBody(body, { message: 'Tasks fetched.' });
    } finally {
      await client.dispose();
    }
  });

  test('[TASKS-LIST-009] : Forbidden supervisor cross-branch task list request is rejected → 4XX', async ({}, testInfo) => {
    const c = resolveCredential(
      env.TASKS_SUPERVISOR_EMAIL || env.USER_MGMT_SUPERVISOR_EMAIL,
      supervisor && supervisor.email,
      env.TASKS_SUPERVISOR_PASSWORD || env.USER_MGMT_SUPERVISOR_PASSWORD,
      env.LOGIN_PASSWORD
    );
    test.skip(!c.email, 'Set TASKS_SUPERVISOR_EMAIL or USER_MGMT_SUPERVISOR_EMAIL');
    test.skip(!c.password, 'Set TASKS_SUPERVISOR_PASSWORD or LOGIN_PASSWORD');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, { email: c.email, password: c.password, otp: env.VERIFY_OTP });
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

      const { res, body } = await fetchTasksList(
        client,
        session,
        otherBranchId,
        testInfo,
        'tasks/list-supervisor-cross-branch-denied'
      );
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

  test('[TASKS-LIST-010] : Forbidden employee cross-branch task list request is rejected → 4XX', async ({}, testInfo) => {
    const c = resolveCredential(
      env.TASKS_EMPLOYEE_EMAIL || env.USER_MGMT_EMPLOYEE_EMAIL,
      employee && employee.email,
      env.TASKS_EMPLOYEE_PASSWORD || env.USER_MGMT_EMPLOYEE_PASSWORD,
      env.LOGIN_PASSWORD
    );
    test.skip(!c.email, 'Set TASKS_EMPLOYEE_EMAIL or USER_MGMT_EMPLOYEE_EMAIL');
    test.skip(!c.password, 'Set TASKS_EMPLOYEE_PASSWORD or LOGIN_PASSWORD');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, { email: c.email, password: c.password, otp: env.VERIFY_OTP });
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

      const { res, body } = await fetchTasksList(
        client,
        session,
        otherBranchId,
        testInfo,
        'tasks/list-employee-cross-branch-denied'
      );
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
