const { test, expect } = require('@playwright/test');
const { env } = require('../../../../../config/env');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { loginWithOtp } = require('../../../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../../../helpers/testData');
const { expectHttpStatus, expectJsonContentType, expectJsonErrorBody } = require('../../../../../helpers/assertions');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../../../helpers/otpChainSkip');
const { resolveTasksBranchId } = require('../../../../../helpers/tasksContext');

test.describe('Task notifications @tasks', () => {
  const owner = getSeededAccountByKey('t3_supervisor');
  const email = (owner && owner.email) || '';
  const password = env.LOGIN_PASSWORD || '';

  let client;
  let session;
  let branchId;
  let basePath;

  async function resolvePath() {
    const branchScopedPath = `orgs/${session.orgId}/branches/${branchId}/task-notifications`;
    let res = await client.get(branchScopedPath, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      params: { page: 1, pageSize: 20 }
    });
    if (res.ok()) return branchScopedPath;

    const orgScopedPath = `orgs/${session.orgId}/task-notifications`;
    res = await client.get(orgScopedPath, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      params: { page: 1, pageSize: 20 }
    });
    if (res.ok()) return orgScopedPath;

    return branchScopedPath;
  }

  test.beforeAll(async () => {
    test.skip(!email, 'Seeded supervisor email not found');
    test.skip(!password, 'Set LOGIN_PASSWORD');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    client = await createApiClient();
    session = await loginWithOtp(client, { email, password, otp: env.VERIFY_OTP });
    test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);
    branchId = resolveTasksBranchId(env.TASKS_BRANCH_ID, session.branchId);
    test.skip(!branchId, 'No branch id for task notifications tests');
    basePath = await resolvePath();
  });

  test.afterAll(async () => {
    if (client) await client.dispose();
  });

  test('[TASKS-NOTIF-004] : Missing JWT on list notifications returns 401', async ({}, testInfo) => {
    const path =
      'orgs/00000000-0000-0000-0000-000000000001/branches/00000000-0000-0000-0000-000000000002/task-notifications';
    const res = await client.get(path, { params: { page: 1, pageSize: 20 } });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/notifications-list-unauth',
      response: res,
      loginEmail: null,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, query: { page: 1, pageSize: 20 } }
    });
    expectHttpStatus(res, 401);
    expectJsonContentType(res);
    expectJsonErrorBody(body, { statusCode: 401, requireErrorCode: true });
  });

  test('[TASKS-NOTIF-005] : Missing JWT on mark notification read returns 401', async ({}, testInfo) => {
    const path =
      'orgs/00000000-0000-0000-0000-000000000001/branches/00000000-0000-0000-0000-000000000002/task-notifications/00000000-0000-0000-0000-0000000000ef/read';
    const res = await client.post(path);
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/notifications-read-unauth',
      response: res,
      loginEmail: null,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path }
    });
    expectHttpStatus(res, 401);
    expectJsonContentType(res);
    expectJsonErrorBody(body, { statusCode: 401, requireErrorCode: true });
  });

  test('[TASKS-NOTIF-006] : Unknown notification id on mark read returns 404/400', async ({}, testInfo) => {
    const path = `${basePath}/00000000-0000-0000-0000-0000000000f0/read`;
    const res = await client.post(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/notifications-read-unknown-id',
      response: res,
      loginEmail: session.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path }
    });
    expect([400, 404].includes(res.status()), `Expected 400 or 404, got ${res.status()}`).toBeTruthy();
    expectJsonContentType(res);
    expectJsonErrorBody(body, { statusCode: res.status(), requireErrorCode: true });
  });
});
