const { test } = require('@playwright/test');
const { expectHttpStatus, expectJsonContentType, expectJsonErrorBody } = require('../../../../../helpers/assertions');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');

test.describe('Task board @tasks', () => {
  test('[TASKS-BOARD-001] : Unauthorized board request returns 401', async ({}, testInfo) => {
    const client = await createApiClient();
    try {
      const path =
        'orgs/00000000-0000-0000-0000-000000000001/branches/00000000-0000-0000-0000-000000000002/tasks/board';
      const res = await client.get(path);
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'tasks/board-unauth',
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
