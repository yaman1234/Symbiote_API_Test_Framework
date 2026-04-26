/**
 * Users profile API validations focused on acceptance criteria:
 * - mandatory fields
 * - duplicate/role/supervisor constraints
 * - proper error envelopes
 */
const { test, expect } = require('@playwright/test');
const { env } = require('../../../config/env');
const { createApiClient } = require('../../../helpers/apiClient');
const { loginWithOtp } = require('../../../helpers/authSession');
const { buildCreateUserPayload, parseUuidList } = require('../../../helpers/createUserPayload');
const { expectJsonContentType, expectJsonErrorBody, expectSuccessStatus } = require('../../../helpers/assertions');
const { publishApiResponse } = require('../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../helpers/otpChainSkip');

function skipOtpChain() {
  const reason = otpChainTestsSkippedReason();
  test.skip(!!reason, reason || '');
}

async function ownerSession(client) {
  const password = env.USER_MGMT_OWNER_PASSWORD || env.LOGIN_PASSWORD;
  test.skip(!env.USER_MGMT_OWNER_EMAIL, 'Set USER_MGMT_OWNER_EMAIL');
  test.skip(!password, 'Set USER_MGMT_OWNER_PASSWORD or LOGIN_PASSWORD');
  const session = await loginWithOtp(client, {
    email: env.USER_MGMT_OWNER_EMAIL,
    password,
    otp: env.VERIFY_OTP
  });
  test.skip(!session.ok, session.ok ? '' : `Owner OTP chain failed at ${session.step}`);
  return session;
}

async function postCreate(client, session, payload, testInfo, urlHint) {
  const path = `orgs/${session.orgId}/users`;
  const res = await client.post(path, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    data: payload
  });
  const body = await res.json();
  await publishApiResponse(testInfo, {
    urlHint,
    response: res,
    loginEmail: session.loginEmail,
    status: res.status(),
    statusText: res.statusText(),
    body,
    requestPayload: { path, body: payload }
  });
  return { res, body };
}

test.describe('Users profile validation @regression @users', () => {
  test('POST /orgs/:orgId/users : rejects missing fullName as mandatory field', async ({}, testInfo) => {
    test.skip(!env.USER_CREATE_BRANCH_ID, 'Set USER_CREATE_BRANCH_ID');
    skipOtpChain();

    const client = await createApiClient();
    try {
      const owner = await ownerSession(client);
      const payload = buildCreateUserPayload({
        branchId: env.USER_CREATE_BRANCH_ID,
        email: `mandatory.fullname.${Date.now()}@demo.com`,
        departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
        headDepartmentIds: []
      });
      delete payload.fullName;

      const { res, body } = await postCreate(client, owner, payload, testInfo, 'orgs/users-create-missing-fullname');
      expect([400, 422].includes(res.status()), `Expected 400 or 422, got ${res.status()}`).toBeTruthy();
      expectJsonContentType(res);
      expectJsonErrorBody(body, {
        statusCode: res.status(),
        requireErrorCode: true
      });
    } finally {
      await client.dispose();
    }
  });

  test('POST /orgs/:orgId/users : rejects creating branchRole OWNER via API', async ({}, testInfo) => {
    test.skip(!env.USER_CREATE_BRANCH_ID, 'Set USER_CREATE_BRANCH_ID');
    skipOtpChain();

    const client = await createApiClient();
    try {
      const owner = await ownerSession(client);
      const payload = buildCreateUserPayload({
        branchId: env.USER_CREATE_BRANCH_ID,
        email: `forbidden.owner.role.${Date.now()}@demo.com`,
        departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
        headDepartmentIds: [],
        overrides: { branchRole: 'OWNER' }
      });

      const { res, body } = await postCreate(client, owner, payload, testInfo, 'orgs/users-create-owner-role-forbidden');
      expect([400, 403, 422].includes(res.status()), `Expected 400/403/422, got ${res.status()}`).toBeTruthy();
      expectJsonContentType(res);
      expectJsonErrorBody(body, {
        statusCode: res.status(),
        requireErrorCode: true
      });
    } finally {
      await client.dispose();
    }
  });

  test('POST /orgs/:orgId/users : rejects supervisorOrgUserId when target is EMPLOYEE role', async ({}, testInfo) => {
    test.skip(!env.USER_MGMT_EMPLOYEE_EMAIL, 'Set USER_MGMT_EMPLOYEE_EMAIL');
    test.skip(!env.USER_CREATE_BRANCH_ID, 'Set USER_CREATE_BRANCH_ID');
    const employeePassword = env.USER_MGMT_EMPLOYEE_PASSWORD || env.LOGIN_PASSWORD;
    test.skip(!employeePassword, 'Set USER_MGMT_EMPLOYEE_PASSWORD or LOGIN_PASSWORD');
    skipOtpChain();

    const client = await createApiClient();
    try {
      const owner = await ownerSession(client);
      const employeeSession = await loginWithOtp(client, {
        email: env.USER_MGMT_EMPLOYEE_EMAIL,
        password: employeePassword,
        otp: env.VERIFY_OTP
      });
      test.skip(!employeeSession.ok, employeeSession.ok ? '' : `Employee OTP chain failed at ${employeeSession.step}`);
      test.skip(!employeeSession.orgUserId, 'Employee orgUserId is required for supervisor validation case');

      const payload = buildCreateUserPayload({
        branchId: env.USER_CREATE_BRANCH_ID,
        email: `bad.supervisor.role.${Date.now()}@demo.com`,
        departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
        headDepartmentIds: [],
        overrides: {
          supervisorOrgUserId: employeeSession.orgUserId
        }
      });

      const { res, body } = await postCreate(client, owner, payload, testInfo, 'orgs/users-create-supervisor-must-be-owner-supervisor');
      expect([400, 403, 422].includes(res.status()), `Expected 400/403/422, got ${res.status()}`).toBeTruthy();
      expectJsonContentType(res);
      expectJsonErrorBody(body, {
        statusCode: res.status(),
        requireErrorCode: true
      });
    } finally {
      await client.dispose();
    }
  });

  test('PATCH /orgs/:orgId/users/:orgUserId : rejects missing fullName as mandatory field', async ({}, testInfo) => {
    test.skip(!env.USER_CREATE_BRANCH_ID, 'Set USER_CREATE_BRANCH_ID');
    skipOtpChain();

    const client = await createApiClient();
    try {
      const owner = await ownerSession(client);
      const createPayload = buildCreateUserPayload({
        branchId: env.USER_CREATE_BRANCH_ID,
        email: `patch.mandatory.${Date.now()}@demo.com`,
        departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
        headDepartmentIds: []
      });
      const create = await postCreate(client, owner, createPayload, testInfo, 'orgs/users-patch-missing-fullname-create');
      expectSuccessStatus(create.res, create.body);

      const orgUserId = create.body?.data?.orgUserId;
      expect(typeof orgUserId === 'string' && orgUserId.length > 0, 'created orgUserId').toBeTruthy();

      const path = `orgs/${owner.orgId}/users/${orgUserId}`;
      const patchPayload = { ...createPayload };
      delete patchPayload.fullName;
      patchPayload.branchId = env.USER_CREATE_BRANCH_ID;

      const patchRes = await client.patch(path, {
        headers: { Authorization: `Bearer ${owner.accessToken}` },
        data: patchPayload
      });
      const patchBody = await patchRes.json();
      await publishApiResponse(testInfo, {
        urlHint: 'orgs/users-patch-missing-fullname',
        response: patchRes,
        loginEmail: owner.loginEmail,
        status: patchRes.status(),
        statusText: patchRes.statusText(),
        body: patchBody,
        requestPayload: { path, body: patchPayload }
      });

      expect([400, 422].includes(patchRes.status()), `Expected 400 or 422, got ${patchRes.status()}`).toBeTruthy();
      expectJsonContentType(patchRes);
      expectJsonErrorBody(patchBody, {
        statusCode: patchRes.status(),
        requireErrorCode: true
      });
    } finally {
      await client.dispose();
    }
  });
});
