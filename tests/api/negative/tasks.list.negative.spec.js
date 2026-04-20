const { test } = require('@playwright/test');
const { expectHttpStatus, expectJsonContentType, expectJsonErrorBody } = require('../../../helpers/assertions');
const { createApiClient } = require('../../../helpers/apiClient');
const { publishApiResponse } = require('../../../helpers/apiResponseReport');

test.describe('List tasks @negative @tasks', () => {
  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.
  test('GET /orgs/:orgId/branches/:branchId/tasks : rejects GET without Authorization → 401', async ({}, testInfo) => {
    const client = await createApiClient();
    try {
      const path = 'orgs/00000000-0000-0000-0000-000000000001/branches/00000000-0000-0000-0000-000000000002/tasks';
      const params = { page: 1, pageSize: 20 };
      const res = await client.get(path, { params });
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'tasks/list-unauth',
        response: res,
        loginEmail: null,
        status: res.status(),
        statusText: res.statusText(),
        body,
        requestPayload: { path, query: params }
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
