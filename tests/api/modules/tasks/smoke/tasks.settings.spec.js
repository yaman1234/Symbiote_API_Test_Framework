const { test, expect } = require('@playwright/test');
const { env } = require('../../../../../config/env');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { loginWithOtp } = require('../../../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../../../helpers/testData');
const {
  expectSuccessStatus,
  expectHttpOkOrCreated,
  expectJsonContentType,
  expectJsonSuccessBody
} = require('../../../../../helpers/assertions');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../../../helpers/otpChainSkip');

test.describe('Task settings @tasks', () => {
  test('[TASKS-SETTINGS-001] : List org task statuses returns success', async ({}, testInfo) => {
    const owner = getSeededAccountByKey('t1_owner');
    const email = env.TASKS_OWNER_EMAIL || env.USER_MGMT_OWNER_EMAIL || (owner && owner.email) || '';
    const password = env.TASKS_OWNER_PASSWORD || env.USER_MGMT_OWNER_PASSWORD || env.LOGIN_PASSWORD || '';

    test.skip(!email, 'Set TASKS_OWNER_EMAIL or USER_MGMT_OWNER_EMAIL');
    test.skip(!password, 'Set TASKS_OWNER_PASSWORD or LOGIN_PASSWORD');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, { email, password, otp: env.VERIFY_OTP });
      test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);

      const path = `orgs/${session.orgId}/task-settings/statuses`;
      const res = await client.get(path, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'tasks/settings-statuses',
        response: res,
        loginEmail: session.loginEmail,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: { path }
      });

      expectSuccessStatus(res, body);
      expectJsonContentType(res);
      expectJsonSuccessBody(body, { statusCode: 200 });
      expect(Array.isArray(body.data)).toBeTruthy();
      if (body.data.length > 0) {
        const row = body.data[0];
        expect(typeof row.id).toBe('string');
        expect(typeof row.name).toBe('string');
      }
    } finally {
      await client.dispose();
    }
  });
});

test.describe('Task settings owner smoke @tasks', () => {
  test.describe.configure({ mode: 'serial' });

  const owner = getSeededAccountByKey('t1_owner');
  const email = env.TASKS_OWNER_EMAIL || env.USER_MGMT_OWNER_EMAIL || (owner && owner.email) || '';
  const password = env.TASKS_OWNER_PASSWORD || env.USER_MGMT_OWNER_PASSWORD || env.LOGIN_PASSWORD || '';

  let client;
  let session;
  /** @type {string | undefined} */
  let smokeStatusId;
  /** @type {string | undefined} */
  let smokePriorityId;

  test.beforeAll(async () => {
    test.skip(!email, 'Set TASKS_OWNER_EMAIL or USER_MGMT_OWNER_EMAIL');
    test.skip(!password, 'Set TASKS_OWNER_PASSWORD or LOGIN_PASSWORD');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    client = await createApiClient();
    session = await loginWithOtp(client, { email, password, otp: env.VERIFY_OTP });
    test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);
  });

  test.afterAll(async () => {
    if (client) await client.dispose();
  });

  test('[TASKS-SETTINGS-002] : Owner creates task status returns success', async ({}, testInfo) => {
    const path = `orgs/${session.orgId}/task-settings/statuses`;
    const payload = {
      name: `PW smoke status ${Date.now()}`,
      color: '#2563EB',
      isDone: false
    };
    const res = await client.post(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/settings-status-create',
      response: res,
      loginEmail: session.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, body: payload }
    });
    expectHttpOkOrCreated(res);
    expectJsonContentType(res);
    expectJsonSuccessBody(body, { nonEmptyPaths: ['data.id'] });
    smokeStatusId = body?.data?.id;
    expect(typeof smokeStatusId).toBe('string');
  });

  test('[TASKS-SETTINGS-003] : Owner updates created status returns success', async ({}, testInfo) => {
    test.skip(!smokeStatusId, 'No smokeStatusId from TASKS-SETTINGS-002');
    const path = `orgs/${session.orgId}/task-settings/statuses/${smokeStatusId}`;
    const payload = { name: `PW smoke status renamed ${Date.now()}` };
    const res = await client.patch(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/settings-status-patch',
      response: res,
      loginEmail: session.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, body: payload }
    });
    expectSuccessStatus(res, body);
    expectJsonContentType(res);
    expectJsonSuccessBody(body, { statusCode: 200, nonEmptyPaths: ['data.id'] });
  });

  test('[TASKS-SETTINGS-004] : Owner reorders statuses returns success', async ({}, testInfo) => {
    const listPath = `orgs/${session.orgId}/task-settings/statuses`;
    const listRes = await client.get(listPath, {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    });
    const listBody = await listRes.json();
    test.skip(!(listRes.ok()), `Status list failed: HTTP ${listRes.status()}`);
    const rows = Array.isArray(listBody?.data) ? listBody.data : [];
    test.skip(!(rows.length >= 2), 'Need at least 2 statuses for reorder smoke');

    const reordered = [...rows].reverse();
    const items = reordered.map((row, idx) => ({ id: row.id, order: idx + 1 }));
    const path = `orgs/${session.orgId}/task-settings/statuses/reorder`;
    const payload = { items };
    const res = await client.put(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/settings-status-reorder',
      response: res,
      loginEmail: session.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, body: payload }
    });
    expectSuccessStatus(res, body);
    expectJsonContentType(res);
    expectJsonSuccessBody(body, { statusCode: 200 });
  });

  test('[TASKS-SETTINGS-005] : Owner lists priorities returns success', async ({}, testInfo) => {
    const path = `orgs/${session.orgId}/task-settings/priorities`;
    const res = await client.get(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/settings-priorities',
      response: res,
      loginEmail: session.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path }
    });
    expectSuccessStatus(res, body);
    expectJsonContentType(res);
    expectJsonSuccessBody(body, { statusCode: 200 });
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('[TASKS-SETTINGS-006] : Owner creates priority returns success', async ({}, testInfo) => {
    const path = `orgs/${session.orgId}/task-settings/priorities`;
    const payload = { name: `PW smoke priority ${Date.now()}`, color: '#0EA5E9' };
    const res = await client.post(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/settings-priority-create',
      response: res,
      loginEmail: session.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, body: payload }
    });
    expectHttpOkOrCreated(res);
    expectJsonContentType(res);
    expectJsonSuccessBody(body, { nonEmptyPaths: ['data.id'] });
    smokePriorityId = body?.data?.id;
    expect(typeof smokePriorityId).toBe('string');
  });

  test('[TASKS-SETTINGS-007] : Owner updates created priority returns success', async ({}, testInfo) => {
    test.skip(!smokePriorityId, 'No smokePriorityId from TASKS-SETTINGS-006');
    const path = `orgs/${session.orgId}/task-settings/priorities/${smokePriorityId}`;
    const payload = { name: `PW smoke priority renamed ${Date.now()}` };
    const res = await client.patch(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/settings-priority-patch',
      response: res,
      loginEmail: session.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, body: payload }
    });
    expectSuccessStatus(res, body);
    expectJsonContentType(res);
    expectJsonSuccessBody(body, { statusCode: 200, nonEmptyPaths: ['data.id'] });
  });

  test('[TASKS-SETTINGS-008] : Owner reorders priorities returns success', async ({}, testInfo) => {
    const listPath = `orgs/${session.orgId}/task-settings/priorities`;
    const listRes = await client.get(listPath, {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    });
    const listBody = await listRes.json();
    test.skip(!(listRes.ok()), `Priority list failed: HTTP ${listRes.status()}`);
    const rows = Array.isArray(listBody?.data) ? listBody.data : [];
    test.skip(!(rows.length >= 2), 'Need at least 2 priorities for reorder smoke');

    const reordered = [...rows].reverse();
    const items = reordered.map((row, idx) => ({ id: row.id, order: idx + 1 }));
    const path = `orgs/${session.orgId}/task-settings/priorities/reorder`;
    const payload = { items };
    const res = await client.put(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: payload
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/settings-priority-reorder',
      response: res,
      loginEmail: session.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path, body: payload }
    });
    expectSuccessStatus(res, body);
    expectJsonContentType(res);
    expectJsonSuccessBody(body, { statusCode: 200 });
  });

  test('[TASKS-SETTINGS-009] : Owner deletes created status returns success', async ({}, testInfo) => {
    test.skip(!smokeStatusId, 'No smokeStatusId from TASKS-SETTINGS-002');
    const path = `orgs/${session.orgId}/task-settings/statuses/${smokeStatusId}`;
    const res = await client.delete(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/settings-status-delete',
      response: res,
      loginEmail: session.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path }
    });
    expectSuccessStatus(res, body);
    expectJsonContentType(res);
    expectJsonSuccessBody(body, { statusCode: 200 });
    smokeStatusId = undefined;
  });

  test('[TASKS-SETTINGS-010] : Owner deletes created priority returns success', async ({}, testInfo) => {
    test.skip(!smokePriorityId, 'No smokePriorityId from TASKS-SETTINGS-006');
    const path = `orgs/${session.orgId}/task-settings/priorities/${smokePriorityId}`;
    const res = await client.delete(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    });
    const body = await res.json();
    await publishApiResponse(testInfo, {
      urlHint: 'tasks/settings-priority-delete',
      response: res,
      loginEmail: session.loginEmail,
      status: res.status(),
      statusText: res.statusText(),
      body,
      requestPayload: { path }
    });
    expectSuccessStatus(res, body);
    expectJsonContentType(res);
    expectJsonSuccessBody(body, { statusCode: 200 });
    smokePriorityId = undefined;
  });
});
