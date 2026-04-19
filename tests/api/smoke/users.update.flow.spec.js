/**
 * PATCH /orgs/:orgId/users/:orgUserId — flow: create → GET → PATCH → GET (verify persisted fields).
 * @see testCases/Orgs_users-patch.md
 */
const { test, expect } = require('@playwright/test');
const { env } = require('../../../config/env');
const { createApiClient } = require('../../../helpers/apiClient');
const { loginWithOtp } = require('../../../helpers/authSession');
const { expectSuccessStatus, expectJsonContentType } = require('../../../helpers/assertions');
const {
  expectOrgUserCreateSuccessBody,
  expectOrgUserGetSuccessBody,
  expectOrgUserPatchSuccessBody,
  expectOrgUserDetailMatchesPatch,
  getOrgUserDetailField
} = require('../../../helpers/assertions.users');
const { publishApiResponse } = require('../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../helpers/otpChainSkip');
const { buildCreateUserPayload, buildUpdateUserPayload, parseUuidList } = require('../../../helpers/createUserPayload');

test.describe('Update org user flow @smoke @users', () => {
  test('Create → GET → PATCH → GET confirms update', async ({}, testInfo) => {
    test.skip(!env.USER_MGMT_OWNER_EMAIL, 'Set USER_MGMT_OWNER_EMAIL (Owner)');
    test.skip(!env.USER_CREATE_BRANCH_ID, 'Set USER_CREATE_BRANCH_ID');
    const password = env.USER_MGMT_OWNER_PASSWORD || env.LOGIN_PASSWORD;
    test.skip(!password, 'Set USER_MGMT_OWNER_PASSWORD or LOGIN_PASSWORD');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const departmentIds = parseUuidList(env.USER_CREATE_DEPARTMENT_IDS);
    const headDepartmentIds = [];
    const createEmail = `api.patch.flow.${Date.now()}@demo.com`;
    const createPayload = buildCreateUserPayload({
      branchId: env.USER_CREATE_BRANCH_ID,
      email: createEmail,
      departmentIds,
      headDepartmentIds
    });

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, {
        email: env.USER_MGMT_OWNER_EMAIL,
        password,
        otp: env.VERIFY_OTP
      });
      test.skip(
        !session.ok,
        session.ok ? '' : `login → send-otp → verify-otp failed at ${session.step} (HTTP ${session.status})`
      );

      const authHeaders = { Authorization: `Bearer ${session.accessToken}` };
      const createPath = `orgs/${session.orgId}/users`;
      const createRes = await client.post(createPath, {
        headers: authHeaders,
        data: createPayload
      });
      const createBody = await createRes.json();
      await publishApiResponse(testInfo, {
        urlHint: 'orgs/users-update-flow-create',
        response: createRes,
        loginEmail: session.loginEmail,
        status: createRes.status(),
        statusText: createRes.statusText(),
        body: createBody,
        requestPayload: { path: createPath, body: createPayload }
      });
      expectSuccessStatus(createRes, createBody);
      expectJsonContentType(createRes);
      expectOrgUserCreateSuccessBody(createBody);
      const orgUserId = createBody.data.orgUserId;
      expect(typeof orgUserId === 'string' && orgUserId.length > 0, 'created orgUserId').toBeTruthy();

      const userPath = `orgs/${session.orgId}/users/${orgUserId}`;

      const getBefore = await client.get(userPath, { headers: authHeaders });
      const bodyBefore = await getBefore.json();
      await publishApiResponse(testInfo, {
        urlHint: 'orgs/users-update-flow-get-before',
        response: getBefore,
        loginEmail: session.loginEmail,
        status: getBefore.status(),
        statusText: getBefore.statusText(),
        body: bodyBefore,
        requestPayload: { path: userPath }
      });
      expectSuccessStatus(getBefore, bodyBefore);
      expectJsonContentType(getBefore);
      expectOrgUserGetSuccessBody(bodyBefore, { expectedOrgUserId: orgUserId });
      expect(getOrgUserDetailField(bodyBefore.data, 'fullName'), 'fullName before patch').toBe(
        createPayload.fullName
      );

      // PAYROLL requires Owner-capable QA; drop to `{ modules: ['INVENTORY'] }` if PATCH returns 4xx.
      const patchPayload = buildUpdateUserPayload({
        branchId: env.USER_CREATE_BRANCH_ID,
        fullName: `API Patched ${Date.now()}`,
        departmentIds,
        headDepartmentIds,
        overrides: { modules: ['INVENTORY', 'PAYROLL'] }
      });

      const patchRes = await client.patch(userPath, {
        headers: authHeaders,
        data: patchPayload
      });
      const patchBody = await patchRes.json();
      await publishApiResponse(testInfo, {
        urlHint: 'orgs/users-update-flow-patch',
        response: patchRes,
        loginEmail: session.loginEmail,
        status: patchRes.status(),
        statusText: patchRes.statusText(),
        body: patchBody,
        requestPayload: { path: userPath, body: patchPayload }
      });
      expectSuccessStatus(patchRes, patchBody);
      expectJsonContentType(patchRes);
      expectOrgUserPatchSuccessBody(patchBody);

      const getAfter = await client.get(userPath, { headers: authHeaders });
      const bodyAfter = await getAfter.json();
      await publishApiResponse(testInfo, {
        urlHint: 'orgs/users-update-flow-get-after',
        response: getAfter,
        loginEmail: session.loginEmail,
        status: getAfter.status(),
        statusText: getAfter.statusText(),
        body: bodyAfter,
        requestPayload: { path: userPath }
      });
      expectSuccessStatus(getAfter, bodyAfter);
      expectJsonContentType(getAfter);
      expectOrgUserGetSuccessBody(bodyAfter, { expectedOrgUserId: orgUserId });
      expect(getOrgUserDetailField(bodyAfter.data, 'fullName'), 'fullName after patch').not.toBe(
        createPayload.fullName
      );
      expectOrgUserDetailMatchesPatch(bodyAfter.data, patchPayload);
    } finally {
      await client.dispose();
    }
  });
});
