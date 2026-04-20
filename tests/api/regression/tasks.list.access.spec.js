const { test } = require('@playwright/test');
const { env } = require('../../../config/env');
const { createApiClient } = require('../../../helpers/apiClient');
const { loginWithOtp } = require('../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../helpers/testData');
const { expectSuccessStatus, expectJsonContentType } = require('../../../helpers/assertions');
const { expectTasksListSuccessBody } = require('../../../helpers/assertions.tasks');
const { publishApiResponse } = require('../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../helpers/otpChainSkip');

function resolveCredential(email, fallbackEmail, password, fallbackPassword) {
  return {
    email: email || fallbackEmail || '',
    password: password || fallbackPassword || ''
  };
}

test.describe('List tasks access by role @regression @tasks', () => {
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
  test('GET /orgs/:orgId/branches/:branchId/tasks : returns branch tasks for OWNER', async ({}, testInfo) => {
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
  test('GET /orgs/:orgId/branches/:branchId/tasks : returns branch tasks for SUPERVISOR', async ({}, testInfo) => {
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
  test('GET /orgs/:orgId/branches/:branchId/tasks : returns scoped tasks for EMPLOYEE', async ({}, testInfo) => {
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
      const branchId = session.branchId || env.TASKS_BRANCH_ID;
      test.skip(!branchId, 'Set TASKS_BRANCH_ID or use an employee with branch.id in token');
      const { res, body } = await fetchTasksList(client, session, branchId, testInfo, 'tasks/list-employee');
      expectSuccessStatus(res, body);
      expectJsonContentType(res);
      expectTasksListSuccessBody(body, { message: 'Tasks fetched.' });
    } finally {
      await client.dispose();
    }
  });
});
