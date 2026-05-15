const { test, expect } = require('@playwright/test');
const { env } = require('../../../../../config/env');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { loginWithOtp } = require('../../../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../../../helpers/testData');
const { expectHttpStatus, expectJsonContentType, expectJsonErrorBody } = require('../../../../../helpers/assertions');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../../../helpers/otpChainSkip');
const { resolveTasksBranchId } = require('../../../../../helpers/tasksContext');

test.describe('Task analytics saved filters @tasks', () => {
  const owner = getSeededAccountByKey('t3_supervisor');
  const email = (owner && owner.email) || '';
  const password = env.LOGIN_PASSWORD || '';

  let client;
  let session;
  let branchId;

  test.beforeAll(async () => {
    test.skip(!email, 'Seeded supervisor email not found');
    test.skip(!password, 'Set LOGIN_PASSWORD');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    client = await createApiClient();
    session = await loginWithOtp(client, { email, password, otp: env.VERIFY_OTP });
    test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);
    branchId = resolveTasksBranchId(env.TASKS_BRANCH_ID, session.branchId);
    test.skip(!branchId, 'No branch id for saved-filters negative tests');
  });

  test.afterAll(async () => {
    if (client) await client.dispose();
  });

  test('[TASKS-FILTERS-004] : Missing JWT on saved filters list returns 401', async ({}, testInfo) => {
    const path =
      'orgs/00000000-0000-0000-0000-000000000001/branches/00000000-0000-0000-0000-000000000002/tasks/analytics/saved-filters';
    const res = await client.get(path);
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/analytics-saved-filters-list-unauth',
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

  test('[TASKS-FILTERS-005] : Create saved filter with missing name returns 422/400', async ({}, testInfo) => {
    const path = `orgs/${session.orgId}/branches/${branchId}/tasks/analytics/saved-filters`;
    const payload = { filters: { from: '2026-01-01', to: '2026-12-31' } };
    const res = await client.post(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/analytics-saved-filters-create-missing-name',
      response: res,
      loginEmail: session.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, body: payload }
    });
    expect([400, 422].includes(res.status()), `Expected 400 or 422, got ${res.status()}`).toBeTruthy();
    expectJsonContentType(res);
    expectJsonErrorBody(body, { statusCode: res.status(), requireErrorCode: true });
  });

  test('[TASKS-FILTERS-006] : Delete unknown saved filter id returns 404/400', async ({}, testInfo) => {
    const path = `orgs/${session.orgId}/branches/${branchId}/tasks/analytics/saved-filters/00000000-0000-0000-0000-0000000000fa`;
    const res = await client.delete(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/analytics-saved-filters-delete-unknown',
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
