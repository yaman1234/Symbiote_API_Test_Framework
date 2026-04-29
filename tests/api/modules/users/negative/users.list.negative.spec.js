const { test } = require('@playwright/test');
const { createApiClient } = require('../../../../../helpers/apiClient');
const { expectHttpStatus, expectJsonContentType, expectJsonErrorBody } = require('../../../../../helpers/assertions');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');

test.describe('List org users', () => {
  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.

  test('[ORGS-USERS-002] : Unauthorized request without Authorization header → 401', async ({}, testInfo) => {
    const client = await createApiClient();
    try {
      const path = 'orgs/00000000-0000-0000-0000-000000000001/users';
      const res = await client.get(path);
      const body = await res.json();
      await publishApiResponse(testInfo, {
        urlHint: 'orgs/users-unauth',
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

//TODO: Add tests for other negative scenarios



});
