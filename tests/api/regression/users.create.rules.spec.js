/**
 * POST /orgs/:orgId/users — business rules (Owner vs Supervisor, branch, role, duplicate, departments, payroll/modules).
 * @see testCases/Orgs_users-create.md
 */
const { test, expect } = require('@playwright/test');
const { env } = require('../../../config/env');
const { createApiClient } = require('../../../helpers/apiClient');
const { loginWithOtp } = require('../../../helpers/authSession');
const { buildCreateUserPayload, parseUuidList } = require('../../../helpers/createUserPayload');
const { expectSuccessStatus, expectJsonContentType } = require('../../../helpers/assertions');
const { expectOrgUserCreateSuccessBody } = require('../../../helpers/assertions.users');
const { publishApiResponse } = require('../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../helpers/otpChainSkip');

const FAKE_UUID = '00000000-0000-0000-0000-000000000099';

function skipOtpChain() {
  const r = otpChainTestsSkippedReason();
  test.skip(!!r, r || '');
}

async function postCreate(client, session, payload, testInfo, urlHint = 'orgs/users-create-rules') {
  const path = `orgs/${session.orgId}/users`;
  const res = await client.post(path, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    data: payload
  });
  const body = await res.json();
  await publishApiResponse(testInfo, {
    urlHint,
    status: res.status(),
    statusText: res.statusText(),
    body,
    requestPayload: payload
  });
  return { res, body, path };
}

/** @param {import('@playwright/test').APIResponse} res */
function expectNonSuccess(res) {
  expect(res.ok(), `Expected failure status, got HTTP ${res.status()}`).toBeFalsy();
}

test.describe('Create user rules @regression @users', () => {
  test('Employee cannot create users', async ({}, testInfo) => {
    test.skip(!env.USER_MGMT_EMPLOYEE_EMAIL, 'Set USER_MGMT_EMPLOYEE_EMAIL');
    test.skip(!env.USER_CREATE_BRANCH_ID, 'Set USER_CREATE_BRANCH_ID');
    const password = env.USER_MGMT_EMPLOYEE_PASSWORD || env.LOGIN_PASSWORD;
    test.skip(!password, 'Set LOGIN_PASSWORD');
    skipOtpChain();

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, {
        email: env.USER_MGMT_EMPLOYEE_EMAIL,
        password,
        otp: env.VERIFY_OTP
      });
      test.skip(!session.ok, session.ok ? '' : `OTP failed at ${session.step}`);

      const payload = buildCreateUserPayload({
        branchId: env.USER_CREATE_BRANCH_ID,
        email: `emp.forbid.${Date.now()}@demo.com`,
        departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
        headDepartmentIds: []
      });
      const { res, body } = await postCreate(client, session, payload, testInfo, 'orgs/users-create-employee');
      expectNonSuccess(res);
      expect([401, 403].includes(res.status()), `Expected 401 or 403, got ${res.status()}`).toBeTruthy();
      expect(body && body.success === false).toBeTruthy();
    } finally {
      await client.dispose();
    }
  });

  test('Supervisor can create EMPLOYEE in own branch', async ({}, testInfo) => {
    test.skip(!env.USER_MGMT_SUPERVISOR_EMAIL, 'Set USER_MGMT_SUPERVISOR_EMAIL');
    const password = env.USER_MGMT_SUPERVISOR_PASSWORD || env.LOGIN_PASSWORD;
    test.skip(!password, 'Set LOGIN_PASSWORD');
    skipOtpChain();

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, {
        email: env.USER_MGMT_SUPERVISOR_EMAIL,
        password,
        otp: env.VERIFY_OTP
      });
      test.skip(!session.ok, session.ok ? '' : `OTP failed at ${session.step}`);
      test.skip(!session.branchId, 'Supervisor session must include branch.id');

      const payload = buildCreateUserPayload({
        branchId: session.branchId,
        email: `sup.create.${Date.now()}@demo.com`,
        departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
        headDepartmentIds: []
      });
      const { res, body } = await postCreate(client, session, payload, testInfo, 'orgs/users-create-supervisor-ok');
      expectSuccessStatus(res, body);
      expectJsonContentType(res);
      expectOrgUserCreateSuccessBody(body);
    } finally {
      await client.dispose();
    }
  });

  test('Supervisor cannot create in another branch', async ({}, testInfo) => {
    test.skip(!env.USER_MGMT_SUPERVISOR_EMAIL, 'Set USER_MGMT_SUPERVISOR_EMAIL');
    test.skip(!env.USER_CREATE_WRONG_BRANCH_ID, 'Set USER_CREATE_WRONG_BRANCH_ID (branch ≠ supervisor branch)');
    const password = env.USER_MGMT_SUPERVISOR_PASSWORD || env.LOGIN_PASSWORD;
    test.skip(!password, 'Set LOGIN_PASSWORD');
    skipOtpChain();

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, {
        email: env.USER_MGMT_SUPERVISOR_EMAIL,
        password,
        otp: env.VERIFY_OTP
      });
      test.skip(!session.ok, session.ok ? '' : `OTP failed at ${session.step}`);
      test.skip(
        session.branchId && session.branchId === env.USER_CREATE_WRONG_BRANCH_ID,
        'USER_CREATE_WRONG_BRANCH_ID must differ from supervisor branchId'
      );

      const payload = buildCreateUserPayload({
        branchId: env.USER_CREATE_WRONG_BRANCH_ID,
        email: `sup.wrongbranch.${Date.now()}@demo.com`,
        departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
        headDepartmentIds: []
      });
      const { res, body } = await postCreate(client, session, payload, testInfo, 'orgs/users-create-wrong-branch');
      expectNonSuccess(res);
      expect([400, 403, 422].includes(res.status())).toBeTruthy();
      expect(body && body.success === false).toBeTruthy();
    } finally {
      await client.dispose();
    }
  });

  test('Supervisor cannot create with branchRole SUPERVISOR', async ({}, testInfo) => {
    test.skip(!env.USER_MGMT_SUPERVISOR_EMAIL, 'Set USER_MGMT_SUPERVISOR_EMAIL');
    const password = env.USER_MGMT_SUPERVISOR_PASSWORD || env.LOGIN_PASSWORD;
    test.skip(!password, 'Set LOGIN_PASSWORD');
    skipOtpChain();

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, {
        email: env.USER_MGMT_SUPERVISOR_EMAIL,
        password,
        otp: env.VERIFY_OTP
      });
      test.skip(!session.ok, session.ok ? '' : `OTP failed at ${session.step}`);
      test.skip(!session.branchId, 'Supervisor session must include branch.id');

      const payload = buildCreateUserPayload({
        branchId: session.branchId,
        email: `sup.role.${Date.now()}@demo.com`,
        departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
        headDepartmentIds: [],
        overrides: { branchRole: 'SUPERVISOR' }
      });
      const { res, body } = await postCreate(client, session, payload, testInfo, 'orgs/users-create-sup-supervisor-role');
      expectNonSuccess(res);
      expect([400, 403, 422].includes(res.status())).toBeTruthy();
      expect(body && body.success === false).toBeTruthy();
    } finally {
      await client.dispose();
    }
  });

  test('Duplicate membership — same email twice in same org', async ({}, testInfo) => {
    test.skip(!env.USER_MGMT_OWNER_EMAIL, 'Set USER_MGMT_OWNER_EMAIL');
    test.skip(!env.USER_CREATE_BRANCH_ID, 'Set USER_CREATE_BRANCH_ID');
    const password = env.USER_MGMT_OWNER_PASSWORD || env.LOGIN_PASSWORD;
    test.skip(!password, 'Set LOGIN_PASSWORD');
    skipOtpChain();

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, {
        email: env.USER_MGMT_OWNER_EMAIL,
        password,
        otp: env.VERIFY_OTP
      });
      test.skip(!session.ok, session.ok ? '' : `OTP failed at ${session.step}`);

      const dupEmail = `dup.membership.${Date.now()}@demo.com`;
      const departmentIds = parseUuidList(env.USER_CREATE_DEPARTMENT_IDS);
      const base = {
        branchId: env.USER_CREATE_BRANCH_ID,
        email: dupEmail,
        departmentIds,
        headDepartmentIds: []
      };
      const payload1 = buildCreateUserPayload(base);
      const r1 = await postCreate(client, session, payload1, testInfo, 'orgs/users-create-dup-1');
      expectSuccessStatus(r1.res, r1.body);
      expectOrgUserCreateSuccessBody(r1.body);

      const payload2 = buildCreateUserPayload(base);
      const r2 = await postCreate(client, session, payload2, testInfo, 'orgs/users-create-dup-2');
      expectNonSuccess(r2.res);
      expect([400, 409, 422].includes(r2.res.status())).toBeTruthy();
      expect(r2.body && r2.body.success === false).toBeTruthy();
    } finally {
      await client.dispose();
    }
  });

  test('Departments must belong to org/branch — invalid department id rejected', async ({}, testInfo) => {
    test.skip(!env.USER_MGMT_OWNER_EMAIL, 'Set USER_MGMT_OWNER_EMAIL');
    test.skip(!env.USER_CREATE_BRANCH_ID, 'Set USER_CREATE_BRANCH_ID');
    const password = env.USER_MGMT_OWNER_PASSWORD || env.LOGIN_PASSWORD;
    test.skip(!password, 'Set LOGIN_PASSWORD');
    skipOtpChain();

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, {
        email: env.USER_MGMT_OWNER_EMAIL,
        password,
        otp: env.VERIFY_OTP
      });
      test.skip(!session.ok, session.ok ? '' : `OTP failed at ${session.step}`);

      const payload = buildCreateUserPayload({
        branchId: env.USER_CREATE_BRANCH_ID,
        email: `bad.dept.${Date.now()}@demo.com`,
        departmentIds: [FAKE_UUID],
        headDepartmentIds: []
      });
      const { res, body } = await postCreate(client, session, payload, testInfo, 'orgs/users-create-bad-dept');
      expectNonSuccess(res);
      expect([400, 422].includes(res.status())).toBeTruthy();
      expect(body && body.success === false).toBeTruthy();
    } finally {
      await client.dispose();
    }
  });

  test('Invalid supervisorOrgUserId rejected', async ({}, testInfo) => {
    test.skip(!env.USER_MGMT_OWNER_EMAIL, 'Set USER_MGMT_OWNER_EMAIL');
    test.skip(!env.USER_CREATE_BRANCH_ID, 'Set USER_CREATE_BRANCH_ID');
    const password = env.USER_MGMT_OWNER_PASSWORD || env.LOGIN_PASSWORD;
    test.skip(!password, 'Set LOGIN_PASSWORD');
    skipOtpChain();

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, {
        email: env.USER_MGMT_OWNER_EMAIL,
        password,
        otp: env.VERIFY_OTP
      });
      test.skip(!session.ok, session.ok ? '' : `OTP failed at ${session.step}`);

      const payload = buildCreateUserPayload({
        branchId: env.USER_CREATE_BRANCH_ID,
        email: `bad.supervisor.${Date.now()}@demo.com`,
        departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
        headDepartmentIds: [],
        overrides: { supervisorOrgUserId: FAKE_UUID }
      });
      const { res, body } = await postCreate(client, session, payload, testInfo, 'orgs/users-create-bad-supervisor');
      expectNonSuccess(res);
      expect([400, 422].includes(res.status())).toBeTruthy();
      expect(body && body.success === false).toBeTruthy();
    } finally {
      await client.dispose();
    }
  });

  test('Supervisor cannot set payroll fields', async ({}, testInfo) => {
    test.skip(!env.USER_MGMT_SUPERVISOR_EMAIL, 'Set USER_MGMT_SUPERVISOR_EMAIL');
    const password = env.USER_MGMT_SUPERVISOR_PASSWORD || env.LOGIN_PASSWORD;
    test.skip(!password, 'Set LOGIN_PASSWORD');
    skipOtpChain();

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, {
        email: env.USER_MGMT_SUPERVISOR_EMAIL,
        password,
        otp: env.VERIFY_OTP
      });
      test.skip(!session.ok, session.ok ? '' : `OTP failed at ${session.step}`);
      test.skip(!session.branchId, 'Supervisor session must include branch.id');

      const payload = buildCreateUserPayload({
        branchId: session.branchId,
        email: `sup.payroll.${Date.now()}@demo.com`,
        departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
        headDepartmentIds: [],
        overrides: {
          paymentMethod: 'BANK_TRANSFER',
          baseWage: '2200.00'
        }
      });
      const { res, body } = await postCreate(client, session, payload, testInfo, 'orgs/users-create-sup-payroll');
      expectNonSuccess(res);
      expect([400, 403, 422].includes(res.status())).toBeTruthy();
      expect(body && body.success === false).toBeTruthy();
    } finally {
      await client.dispose();
    }
  });

  test('Supervisor cannot set modules', async ({}, testInfo) => {
    test.skip(!env.USER_MGMT_SUPERVISOR_EMAIL, 'Set USER_MGMT_SUPERVISOR_EMAIL');
    const password = env.USER_MGMT_SUPERVISOR_PASSWORD || env.LOGIN_PASSWORD;
    test.skip(!password, 'Set LOGIN_PASSWORD');
    skipOtpChain();

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, {
        email: env.USER_MGMT_SUPERVISOR_EMAIL,
        password,
        otp: env.VERIFY_OTP
      });
      test.skip(!session.ok, session.ok ? '' : `OTP failed at ${session.step}`);
      test.skip(!session.branchId, 'Supervisor session must include branch.id');

      const payload = buildCreateUserPayload({
        branchId: session.branchId,
        email: `sup.modules.${Date.now()}@demo.com`,
        departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
        headDepartmentIds: [],
        overrides: { modules: ['INVENTORY', 'TASKS'] }
      });
      const { res, body } = await postCreate(client, session, payload, testInfo, 'orgs/users-create-sup-modules');
      expectNonSuccess(res);
      expect([400, 403, 422].includes(res.status())).toBeTruthy();
      expect(body && body.success === false).toBeTruthy();
    } finally {
      await client.dispose();
    }
  });
});
