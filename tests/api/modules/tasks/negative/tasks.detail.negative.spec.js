const { test } = require('@playwright/test');
const { env } = require('../../../../../config/env');
const {
  expectHttpStatus,
  expectJsonContentType,
  expectJsonErrorBody
} = require('../../../../../helpers/assertions');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { loginWithOtp } = require('../../../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../../../helpers/testData');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../../../helpers/otpChainSkip');

test.describe('Task detail @tasks', () => {
  test('[TASKS-DETAIL-002] : Unknown taskId returns 404', async ({}, testInfo) => {
    const supervisor = getSeededAccountByKey('t3_supervisor');
    const email = (supervisor && supervisor.email) || '';
    const password = env.LOGIN_PASSWORD || '';

    test.skip(!email, 'Seeded supervisor t3_supervisor email not found');
    test.skip(!password, 'Set LOGIN_PASSWORD');
    test.skip(!env.TASKS_BRANCH_ID, 'Set TASKS_BRANCH_ID for tasks routes');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, { email, password, otp: env.VERIFY_OTP });
      test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);

      const taskId = '00000000-0000-0000-0000-0000000000ff';
      const path = `orgs/${session.orgId}/branches/${env.TASKS_BRANCH_ID}/tasks/${taskId}`;
      const res = await client.get(path, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'tasks/detail-unknown-id',
        response: res,
        loginEmail: session.loginEmail,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: { path }
      });

      expectHttpStatus(res, 404);
      expectJsonContentType(res);
      expectJsonErrorBody(body, {
        statusCode: 404,
        requireErrorCode: true,
        requireErrorKey: true
      });
    } finally {
      await client.dispose();
    }
  });

  test('[TASKS-DETAIL-003] : Missing JWT on detail request returns 401', async ({}, testInfo) => {
    const path =
      'orgs/00000000-0000-0000-0000-000000000001/branches/00000000-0000-0000-0000-000000000002/tasks/00000000-0000-0000-0000-000000000003';
    const client = await createApiClient();
    try {
      const res = await client.get(path);
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'tasks/detail-unauth',
        response: res,
        loginEmail: null,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: { path }
      });

      expectHttpStatus(res, 401);
      expectJsonContentType(res);
      expectJsonErrorBody(body, {
        statusCode: 401,
        messageIncludes: 'Authentication',
        requireErrorCode: true,
        requireErrorKey: true
      });
    } finally {
      await client.dispose();
    }
  });
});
