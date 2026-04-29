/**
 * POST /orgs/:orgId/users — business rules (Owner vs Supervisor, branch, role, duplicate, departments, payroll/modules).
 * @see testCases/Orgs_users-create.md
 */
const { test, expect } = require('@playwright/test');
const { env } = require('../../../config/env');
const { createApiClient } = require('../../../helpers/apiClient');
const { loginWithOtp } = require('../../../helpers/authSession');
const {
  buildCreateUserPayload,
  buildSupervisorCreateUserPayload,
  buildUpdateUserPayload,
  buildSupervisorUpdateUserPayload,
  parseUuidList
} = require('../../../helpers/createUserPayload');
const { getSeededAccountByKey } = require('../../../helpers/testData');
const {
  expectSuccessStatus,
  expectJsonSuccessBody,
  expectJsonErrorBody,
  expectJsonContentType
} = require('../../../helpers/assertions');
const { expectOrgUserCreateSuccessBody, expectOrgUserPatchSuccessBody } = require('../../../helpers/assertions.users');
const { publishApiResponse } = require('../../../helpers/apiResponseReport');

// Tests for create user API:
// Test 1: Owner can create user in own branch
// Test 2: Supervisor can create user in own branch
// Test 3: Employee cannot create user
// Test 4: Mandatory fields enforced for Create user API
// Test 5: Supervisor cannot create user in another branch
// Test 6: Supervisor cannot create user with branchRole SUPERVISOR
// Test 7: Duplicate membership (same email) in the same organization is not allowed
// Test 8: Invalid department id rejected
// Test 9: Invalid supervisorOrgUserId rejected
// Test 10: Supervisor cannot set payroll fields

// Tests for Update user API:
// Test 11: Owner can update user in own branch
// Test 12: Supervisor can update user in own branch
// Test 13: Employee cannot update user
// Test 14: Mandatory fields enforced for Update user API
// Test 15: Supervisor cannot update user in another branch
// Test 16: Supervisor cannot update user with branchRole SUPERVISOR
// Test 17: Duplicate membership (same email) in the same organization is not allowed
// Test 18: Invalid department id rejected
// Test 19: Invalid supervisorOrgUserId rejected
// Test 20: Supervisor cannot set payroll fields




async function postCreate(client, session, payload, testInfo, urlHint = 'orgs/users-create-rules') {
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
  return { res, body, path };
}

async function postPatch(client, session, orgUserId, payload, testInfo, urlHint = 'orgs/users-patch-rules') {
  const path = `orgs/${session.orgId}/users/${orgUserId}`;
  const res = await client.patch(path, {
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
  return { res, body, path };
}

function expectSupervisorForbiddenUpdate(res, body) {
  expect(res.ok(), `Expected forbidden update, got HTTP ${res.status()}`).toBeFalsy();
  expectJsonContentType(res);
  expect(body && typeof body === 'object', 'error body must be object').toBeTruthy();
  expect(body.success).toBe(false);
  expect([400, 403].includes(body.statusCode), `expected 400/403, got ${body.statusCode}`).toBeTruthy();
  expect(typeof body.message).toBe('string');
  expect(body.error && typeof body.error === 'object', 'error payload').toBeTruthy();
  expect(typeof body.error.code).toBe('string');
  expect(body.error.code.length > 0).toBeTruthy();
}

async function createSupervisorTargetUser(client, session, testInfo, emailPrefix) {
  const createPayload = buildSupervisorCreateUserPayload({
    branchId: session.branchId,
    email: `${emailPrefix}.${Date.now()}@demo.com`,
    departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
    headDepartmentIds: []
  });
  const createResult = await postCreate(
    client,
    session,
    createPayload,
    testInfo,
    'orgs/users-update-rules-create-supervisor-target'
  );
  expectSuccessStatus(createResult.res, createResult.body);
  expectJsonContentType(createResult.res);
  expectOrgUserCreateSuccessBody(createResult.body);
  const orgUserId = createResult.body.data.orgUserId;
  expect(typeof orgUserId === 'string' && orgUserId.length > 0, 'created orgUserId').toBeTruthy();
  return orgUserId;
}

async function loginWithOtpAny(client, candidates) {
  for (const candidate of candidates) {
    if (!candidate || !candidate.email || !candidate.password) continue;
    const session = await loginWithOtp(client, {
      email: candidate.email,
      password: candidate.password,
      otp: env.VERIFY_OTP
    });
    if (session.ok) return session;
  }
  return null;
}

function buildMinimalAllowedSupervisorPatchPayload(session) {
  return {
    branchId: session.branchId,
    fullName: `supervisor.update.${Date.now()}`,
    departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
    headDepartmentIds: []
  };
}

test.describe('Create user rules :', () => {

  
// Test 1: Owner can create user in own branch
test('[ORGS-PATCH-004] : Authorized owner updates user in own branch → 200', async ({}, testInfo) => {
  
  const owner = getSeededAccountByKey('t3_owner');
  test.skip(!owner, 'Set owner from seeded accounts key t1_owner');
  const client = await createApiClient();
  try {
    const session = await loginWithOtp(client, {
      email: owner.email,
      password: owner.password,
      otp: env.VERIFY_OTP
    }); 
    test.skip(!session.ok, session.ok ? '' : `OTP failed at ${session.step}`);
    const payload = buildCreateUserPayload({
      branchId: session.branchId,
      email: `owner.create.${Date.now()}@demo.com`,
      departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
      headDepartmentIds: []
    });
    const { res, body } = await postCreate(client, session, payload, testInfo, 'orgs/users-create-owner');
    expectSuccessStatus(res, body);
    expectJsonSuccessBody(body,{
      success: true,
      statusCode: 200,
      message: 'User created successfully. Invitation email sent.',
      nonEmptyPaths: ['data.orgUserId']
    });
  } finally {
    await client.dispose();
  }
});
  
  // Test 2: Supervisor can create user in own branch
test('[ORGS-PATCH-005] : Authorized supervisor updates user in own branch → 200', async ({}, testInfo) => {
  const supervisor = getSeededAccountByKey('t3_supervisor');
  test.skip(!supervisor, 'Set supervisor from seeded accounts key t3_supervisor');
  const client = await createApiClient();
  try {
    const session = await loginWithOtp(client, {
      email: supervisor.email,
      password: supervisor.password,
      otp: env.VERIFY_OTP 
    });
    test.skip(!session.ok, session.ok ? '' : `OTP failed at ${session.step}`);
    test.skip(!session.branchId, 'Supervisor session must include branch.id');
    const payload = buildSupervisorCreateUserPayload({
      branchId: session.branchId,
      email: `supervisor.create.${Date.now()}@demo.com`,
      departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
      headDepartmentIds: []
    });
    const { res, body } = await postCreate(client, session, payload, testInfo, 'orgs/users-create-supervisor');
    expectSuccessStatus(res, body);
    expectJsonSuccessBody(body,{
      success: true,
      statusCode: 200,
      message: 'User created successfully. Invitation email sent.',
      nonEmptyPaths: ['data.orgUserId']
    });
  } finally {
    await client.dispose();
  }
});
  
  
  // Test 3: Employee cannot create user
  test('[ORGS-CREATE-004] : Forbidden employee create attempt is blocked → 401', async ({}, testInfo) => {
    const employee = getSeededAccountByKey('t3_emp1');
    const employeeFallback1 = getSeededAccountByKey('t1_emp1');
    const employeeFallback2 = getSeededAccountByKey('t2_emp1');
    test.skip(!employee, 'Set employee from seeded accounts key t3_emp1');

    const client = await createApiClient();
    try {
      const session = await loginWithOtpAny(client, [
        { email: employee.email, password: env.LOGIN_PASSWORD || employee.password },
        employeeFallback1
          ? { email: employeeFallback1.email, password: env.LOGIN_PASSWORD || employeeFallback1.password }
          : null,
        employeeFallback2
          ? { email: employeeFallback2.email, password: env.LOGIN_PASSWORD || employeeFallback2.password }
          : null
      ]);
      test.skip(!session, 'OTP failed for all employee candidates');
      const payload = buildCreateUserPayload({
        branchId: session.branchId || env.USER_CREATE_BRANCH_ID || '00000000-0000-0000-0000-000000000001',
        email: `employee.create.${Date.now()}@demo.com`,
        departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
        headDepartmentIds: []
      });

      const { res, body } = await postCreate(client, session, payload, testInfo, 'orgs/users-create-employee');
      expect(res.ok()).toBeFalsy();
      expect([401, 403].includes(res.status()), `Expected 401/403, got ${res.status()}`).toBeTruthy();
      expectJsonErrorBody(body, {
        success: false,
        statusCode: res.status(),
        requireErrorCode: true
      });
    } finally {
      await client.dispose();
    }
  });


// Test 4: Mandatory fields enforced for Create user API
test('[ORGS-CREATE-016] : Missing required create fields return 422 Validation Error → 422', async ({}, testInfo) => {
  const owner = getSeededAccountByKey('t3_owner');
  test.skip(!owner, 'Set owner from seeded accounts key t3_owner');
  const client = await createApiClient();
  try {
    const session = await loginWithOtp(client, {
      email: owner.email,
      password: owner.password,
      otp: env.VERIFY_OTP
    });
    test.skip(!session.ok, session.ok ? '' : `OTP failed at ${session.step}`);
    test.skip(!session.branchId, 'Owner session must include branch.id');
    const payload = buildCreateUserPayload({
      branchId: session.branchId,
      email: `owner.create.${Date.now()}@demo.com`,
      departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
      headDepartmentIds: []
    });
    delete payload.email;
    delete payload.fullName;
    delete payload.phoneNumber;
    delete payload.dateOfBirth;
    delete payload.gender;
    delete payload.addressLine1;
    delete payload.addressLine2;
    delete payload.town;
    delete payload.city;
    delete payload.country;
    const { res, body } = await postCreate(client, session, payload, testInfo, 'orgs/users-create-owner');
    expect(res.ok()).toBeFalsy();
    expectJsonErrorBody(body, {
      success: false,
      statusCode: 422,
      message: 'Validation failed.',
  
    });
  } finally {
    await client.dispose();
  }
});


// Test 5: Supervisor cannot create user in another branch
test('[ORGS-CREATE-006] : Invalid supervisor branch override is rejected → 400', async ({}, testInfo) => {
  const supervisor = getSeededAccountByKey('t3_supervisor');
  test.skip(!supervisor, 'Set supervisor from seeded accounts key t3_supervisor');
  const client = await createApiClient();
  try {
    const session = await loginWithOtp(client, {
      email: supervisor.email,
      password: supervisor.password,
      otp: env.VERIFY_OTP
    });
    test.skip(!session.ok, session.ok ? '' : `OTP failed at ${session.step}`);
    test.skip(!session.branchId, 'Supervisor session must include branch.id');
      const payload = buildCreateUserPayload({ 
        // T3 Branch 2, supervisor doesnot have access to this branch   
        branchId: '5ed93622-5980-457f-9a51-67515189d12d',
        email: `supervisor.create.${Date.now()}@demo.com`,
        departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
        headDepartmentIds: []
      });

      const { res, body } = await postCreate(client, session, payload, testInfo, 'orgs/users-create-supervisor');
      expect(res.ok()).toBeFalsy();
      expectJsonErrorBody(body, {
        success: false,
        statusCode: 403,
        message: 'Supervisors can only create users in their own branch.',
      });
    } finally {
      await client.dispose();
    }
  });



// Test 6: Supervisor cannot create user with branchRole SUPERVISOR
test('[ORGS-PATCH-010] : Forbidden supervisor branchRole change is rejected → 400', async ({}, testInfo) => {
  const supervisor = getSeededAccountByKey('t3_supervisor');
  test.skip(!supervisor, 'Set supervisor from seeded accounts key t3_supervisor');
  const client = await createApiClient();
  try {
    const session = await loginWithOtp(client, {
      email: supervisor.email,
      password: supervisor.password,
      otp: env.VERIFY_OTP
    });
    test.skip(!session.ok, session.ok ? '' : `OTP failed at ${session.step}`);
    test.skip(!session.branchId, 'Supervisor session must include branch.id');
      const payload = buildSupervisorCreateUserPayload({
        branchId: session.branchId,
        email: `supervisor.create.${Date.now()}@demo.com`,
        departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
        headDepartmentIds: [],
        overrides: { branchRole: 'SUPERVISOR' }
      });
      const { res, body } = await postCreate(client, session, payload, testInfo, 'orgs/users-create-supervisor');
      expect(res.ok()).toBeFalsy();
      expectJsonErrorBody(body, { success: false, statusCode: 403, 
        message: 'Supervisors can only create employees.' });
    } finally { await client.dispose(); }
  });


// Test 7: Duplicate membership (same email) in the same organization is not allowed
test('[ORGS-CREATE-008] : Duplicate membership in same org/branch is rejected → 400', async ({}, testInfo) => {
  const owner = getSeededAccountByKey('t3_owner');
  test.skip(!owner, 'Set owner from seeded accounts key t3_owner');
  const client = await createApiClient();
  try {
    const session = await loginWithOtp(client, {
      email: owner.email,
      password: owner.password, 
      otp: env.VERIFY_OTP
    });
    test.skip(!session.ok, session.ok ? '' : `OTP failed at ${session.step}`);
    test.skip(!session.branchId, 'Owner session must include branch.id');
    const payload = buildCreateUserPayload({
      branchId: session.branchId,
      email: owner.email,
      departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
      headDepartmentIds: []
    });
    const { res, body } = await postCreate(client, session, payload, testInfo, 'orgs/users-create-owner');
    expect(res.ok()).toBeFalsy();
    expectJsonErrorBody(body, {
      success: false,
      statusCode: 400,
      message: 'User already exists in this organization.',

    });
  } finally {
    await client.dispose();
  }
}); 



// Test 8: Invalid department id rejected
test('[ORGS-CREATE-009] : Invalid department id is rejected → 400', async ({}, testInfo) => {
  const owner = getSeededAccountByKey('t3_owner');
  test.skip(!owner, 'Set owner from seeded accounts key t3_owner');
  const client = await createApiClient();
  try {
    const session = await loginWithOtp(client, {
      email: owner.email,
      password: owner.password, 
      otp: env.VERIFY_OTP
    });
    test.skip(!session.ok, session.ok ? '' : `OTP failed at ${session.step}`);
    test.skip(!session.branchId, 'Owner session must include branch.id');
    const payload = buildCreateUserPayload({
      branchId: session.branchId,
      email: `owner.create.${Date.now()}@demo.com`,
      // This department id doesnot exist in the Branch for T3
      departmentIds: ['1da3d633-973b-45ec-8bea-fed57eef9f12'],
      headDepartmentIds: []
    });
   
    const { res, body } = await postCreate(client, session, payload, testInfo, 'orgs/users-create-owner');
    expect(res.ok()).toBeFalsy();
    expectJsonErrorBody(body, {
      success: false,
      statusCode: 400,
      message: 'Invalid departmentIds for this branch.'
    });
  } finally {
    await client.dispose();
  }
});


// Test 9: Invalid supervisorOrgUserId rejected
test('[ORGS-CREATE-010] : Invalid supervisorOrgUserId is rejected → 400', async ({}, testInfo) => {
  const owner = getSeededAccountByKey('t3_owner');
  test.skip(!owner, 'Set owner from seeded accounts key t3_owner');
  const client = await createApiClient();
  try {
    const session = await loginWithOtp(client, {
      email: owner.email,
      password: owner.password, 
      otp: env.VERIFY_OTP
    });
    test.skip(!session.ok, session.ok ? '' : `OTP failed at ${session.step}`);
    test.skip(!session.branchId, 'Owner session must include branch.id');
    const payload = buildCreateUserPayload({
      branchId: session.branchId,
      email: `owner.create.${Date.now()}@demo.com`,
      departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
      headDepartmentIds: [],
      overrides: { supervisorOrgUserId: '00000000-0000-0000-0000-000000000000' }
    });
    const { res, body } = await postCreate(client, session, payload, testInfo, 'orgs/users-create-owner');
    expect(res.ok()).toBeFalsy();
    expectJsonErrorBody(body, {
      success: false,
      statusCode: 400,
      message: 'Invalid supervisorOrgUserId for this branch.'
    });
  } finally {
    await client.dispose();
  }
});


// Test 10: Supervisor cannot set payroll fields
test('[ORGS-CREATE-011] : Forbidden supervisor payroll fields are rejected → 400', async ({}, testInfo) => {
  const supervisor = getSeededAccountByKey('t3_supervisor');
  test.skip(!supervisor, 'Set supervisor from seeded accounts key t3_supervisor');
  const client = await createApiClient();
  try {
    const session = await loginWithOtp(client, {
      email: supervisor.email,
      password: supervisor.password, 
      otp: env.VERIFY_OTP
    });
    test.skip(!session.ok, session.ok ? '' : `OTP failed at ${session.step}`);
    test.skip(!session.branchId, 'Supervisor session must include branch.id');
    const payload = buildCreateUserPayload({
      branchId: session.branchId,
      email: `supervisor.create.${Date.now()}@demo.com`,
      departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
      headDepartmentIds: [],
    });
    const { res, body } = await postCreate(client, session, payload, testInfo, 'orgs/users-create-supervisor');
    expect(res.ok()).toBeFalsy();
    expectJsonErrorBody(body, {
      success: false,
      statusCode: 403,
      message: 'Not authorized to manage payroll/permissions.'
    });
  } finally {
    await client.dispose();
  }
});

});

test.describe('Update user rules :', () => {

  // Test 11: Owner can update user in own branch
  test('[ORGS-CREATE-005] : Valid supervisor creates employee in own branch → 2XX', async ({}, testInfo) => {
    const owner = getSeededAccountByKey('t3_owner');
    test.skip(!owner, 'Set owner from seeded accounts key t3_owner');
    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, {
        email: owner.email,
        password: owner.password, 
        otp: env.VERIFY_OTP
      });
      test.skip(!session.ok, session.ok ? '' : `OTP failed at ${session.step}`);
      test.skip(!session.branchId, 'Owner session must include branch.id');
      const createEmail = `owner.patch.target.${Date.now()}@demo.com`;
      const createPayload = buildCreateUserPayload({
        branchId: session.branchId,
        email: createEmail,
        departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
        headDepartmentIds: []
      });
      const createResult = await postCreate(client, session, createPayload, testInfo, 'orgs/users-update-rules-create-owner');
      expectSuccessStatus(createResult.res, createResult.body);
      expectJsonContentType(createResult.res);
      expectOrgUserCreateSuccessBody(createResult.body);
      const orgUserId = createResult.body.data.orgUserId;
      expect(typeof orgUserId === 'string' && orgUserId.length > 0, 'created orgUserId').toBeTruthy();

      const patchPayload = buildUpdateUserPayload({
        branchId: session.branchId,
        fullName: `owner.update.${Date.now()}`,
        departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
        headDepartmentIds: [],
        overrides: {
          status: 'INACTIVE', 
          modules: ['TASKS'],
          paymentMethod: 'CASH'
          
        }
      });
      const patchResult = await postPatch(client, session, orgUserId, patchPayload, testInfo, 'orgs/users-update-owner');
      expectSuccessStatus(patchResult.res, patchResult.body);
      expectJsonContentType(patchResult.res);
      expectOrgUserPatchSuccessBody(patchResult.body);
    } finally {
      await client.dispose();
    }
  });




  // Test 12: Supervisor can update user in own branch
  test('[ORGS-PATCH-005] : Authorized supervisor updates user in own branch → 200', async ({}, testInfo) => {
    const supervisor = getSeededAccountByKey('t3_supervisor');
    test.skip(!supervisor, 'Set supervisor from seeded accounts key t3_supervisor');
    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, {
        email: supervisor.email,
        password: supervisor.password, 
        otp: env.VERIFY_OTP
      });
      test.skip(!session.ok, session.ok ? '' : `OTP failed at ${session.step}`);
      test.skip(!session.branchId, 'Supervisor session must include branch.id');
      const createEmail = `supervisor.patch.target.${Date.now()}@demo.com`;
      const createPayload = buildSupervisorCreateUserPayload({
        branchId: session.branchId,
        email: createEmail,
        departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
        headDepartmentIds: []
      }); 
      const createResult = await postCreate(client, session, createPayload, testInfo, 'orgs/users-update-rules-create-supervisor');
      expectSuccessStatus(createResult.res, createResult.body);
      expectJsonContentType(createResult.res);
      expectOrgUserCreateSuccessBody(createResult.body);
      const orgUserId = createResult.body.data.orgUserId;
      expect(typeof orgUserId === 'string' && orgUserId.length > 0, 'created orgUserId').toBeTruthy();

      // create a payload to only update the profile fields and not the payroll fields  
      const patchPayload ={   
        "branchId": session.branchId,
        "fullName": `supervisor.patch.${Date.now()}`,
        "phoneNumber": "07000000000",
        "addressLine1": "Updated Address",
        "position": "Store Assistant",
        "departmentIds": parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
      }

      const patchResult = await postPatch(client, session, orgUserId, patchPayload, testInfo, 'orgs/users-update-rules-create-supervisor');
      expectSuccessStatus(patchResult.res, patchResult.body);
      expectJsonContentType(patchResult.res);
      expectOrgUserPatchSuccessBody(patchResult.body);
    } finally {
      await client.dispose();
    }
  });

  test('[ORGS-PATCH-006] : Forbidden supervisor NI update is rejected → 400', async ({}, testInfo) => {
    const supervisor = getSeededAccountByKey('t3_supervisor');
    test.skip(!supervisor, 'Set supervisor from seeded accounts key t3_supervisor');
    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, {
        email: supervisor.email,
        password: supervisor.password,
        otp: env.VERIFY_OTP
      });
      test.skip(!session.ok, session.ok ? '' : `OTP failed at ${session.step}`);
      test.skip(!session.branchId, 'Supervisor session must include branch.id');
      const orgUserId = await createSupervisorTargetUser(client, session, testInfo, 'supervisor.patch.forbid.ni');
      const patchPayload = buildUpdateUserPayload({
        branchId: session.branchId,
        fullName: `supervisor.update.${Date.now()}`,
        departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
        headDepartmentIds: [],
        overrides: { nationalInsuranceNumber: 'QQ112233D' }
      });
      const { res, body } = await postPatch(client, session, orgUserId, patchPayload, testInfo, 'orgs/users-update-supervisor-forbid-ni');
      expectSupervisorForbiddenUpdate(res, body);
    } finally {
      await client.dispose();
    }
  });

  test('[ORGS-PATCH-007] : Forbidden supervisor share code update is rejected → 400', async ({}, testInfo) => {
    const supervisor = getSeededAccountByKey('t3_supervisor');
    test.skip(!supervisor, 'Set supervisor from seeded accounts key t3_supervisor');
    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, {
        email: supervisor.email,
        password: supervisor.password,
        otp: env.VERIFY_OTP
      });
      test.skip(!session.ok, session.ok ? '' : `OTP failed at ${session.step}`);
      test.skip(!session.branchId, 'Supervisor session must include branch.id');
      const orgUserId = await createSupervisorTargetUser(client, session, testInfo, 'supervisor.patch.forbid.share');
      const patchPayload = buildUpdateUserPayload({
        branchId: session.branchId,
        fullName: `supervisor.update.${Date.now()}`,
        departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
        headDepartmentIds: [],
        overrides: { shareCode: 'SCODE-SUP-001' }
      });
      const { res, body } = await postPatch(client, session, orgUserId, patchPayload, testInfo, 'orgs/users-update-supervisor-forbid-share-code');
      expectSupervisorForbiddenUpdate(res, body);
    } finally {
      await client.dispose();
    }
  });

  test('[ORGS-PATCH-009] : Forbidden supervisor tax ID update is rejected → 400', async ({}, testInfo) => {
    const supervisor = getSeededAccountByKey('t3_supervisor');
    test.skip(!supervisor, 'Set supervisor from seeded accounts key t3_supervisor');
    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, {
        email: supervisor.email,
        password: supervisor.password,
        otp: env.VERIFY_OTP
      });
      test.skip(!session.ok, session.ok ? '' : `OTP failed at ${session.step}`);
      test.skip(!session.branchId, 'Supervisor session must include branch.id');
      const orgUserId = await createSupervisorTargetUser(client, session, testInfo, 'supervisor.patch.forbid.tax');
      const patchPayload = buildUpdateUserPayload({
        branchId: session.branchId,
        fullName: `supervisor.update.${Date.now()}`,
        departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
        headDepartmentIds: [],
        overrides: { taxId: 'TAX-FORBIDDEN-001' }
      });
      const { res, body } = await postPatch(client, session, orgUserId, patchPayload, testInfo, 'orgs/users-update-supervisor-forbid-tax-id');
      expectSupervisorForbiddenUpdate(res, body);
    } finally {
      await client.dispose();
    }
  });

  test('[ORGS-CREATE-007] : Forbidden supervisor-created SUPERVISOR role is rejected → 400', async ({}, testInfo) => {
    const supervisor = getSeededAccountByKey('t3_supervisor');
    test.skip(!supervisor, 'Set supervisor from seeded accounts key t3_supervisor');
    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, {
        email: supervisor.email,
        password: supervisor.password,
        otp: env.VERIFY_OTP
      });
      test.skip(!session.ok, session.ok ? '' : `OTP failed at ${session.step}`);
      test.skip(!session.branchId, 'Supervisor session must include branch.id');
      const orgUserId = await createSupervisorTargetUser(client, session, testInfo, 'supervisor.patch.forbid.branch-role');
      const patchPayload = buildUpdateUserPayload({
        branchId: session.branchId,
        fullName: `supervisor.update.${Date.now()}`,
        departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
        headDepartmentIds: [],
        overrides: { branchRole: 'SUPERVISOR' }
      });
      const { res, body } = await postPatch(client, session, orgUserId, patchPayload, testInfo, 'orgs/users-update-supervisor-forbid-branch-role');
      expectSupervisorForbiddenUpdate(res, body);
    } finally {
      await client.dispose();
    }
  });

  test('[ORGS-CREATE-011] : Forbidden supervisor payroll fields are rejected → 400', async ({}, testInfo) => {
    const supervisor = getSeededAccountByKey('t3_supervisor');
    test.skip(!supervisor, 'Set supervisor from seeded accounts key t3_supervisor');
    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, {
        email: supervisor.email,
        password: supervisor.password,
        otp: env.VERIFY_OTP
      });
      test.skip(!session.ok, session.ok ? '' : `OTP failed at ${session.step}`);
      test.skip(!session.branchId, 'Supervisor session must include branch.id');
      const orgUserId = await createSupervisorTargetUser(client, session, testInfo, 'supervisor.patch.forbid.payroll');
      const patchPayload = {
        ...buildMinimalAllowedSupervisorPatchPayload(session),
        paymentMethod: 'BANK_TRANSFER',
        paymentFrequency: 'WEEKLY',
        paymentDay: 'END_OF_MONTH',
        accountName: 'Forbidden Payroll User',
        bankName: 'Barclays',
        bankBranch: 'London West',
        currency: 'GBP',
        baseWage: '3000.00',
        overtimeRate: '2.00',
        wagePeriod: 'WEEKLY',
  
      };
      const { res, body } = await postPatch(client, session, orgUserId, patchPayload, testInfo, 'orgs/users-update-supervisor-forbid-payroll');
      expectSupervisorForbiddenUpdate(res, body);
    } finally {
      await client.dispose();
    }
  });

  test('[ORGS-PATCH-008] : Forbidden supervisor module permission update is rejected → 400', async ({}, testInfo) => {
    const supervisor = getSeededAccountByKey('t3_supervisor');
    test.skip(!supervisor, 'Set supervisor from seeded accounts key t3_supervisor');
    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, {
        email: supervisor.email,
        password: supervisor.password,
        otp: env.VERIFY_OTP
      });
      test.skip(!session.ok, session.ok ? '' : `OTP failed at ${session.step}`);
      test.skip(!session.branchId, 'Supervisor session must include branch.id');
      const orgUserId = await createSupervisorTargetUser(client, session, testInfo, 'supervisor.patch.forbid.modules');
      const patchPayload = buildUpdateUserPayload({
        branchId: session.branchId,
        fullName: `supervisor.update.${Date.now()}`,
        departmentIds: parseUuidList(env.USER_CREATE_DEPARTMENT_IDS),
        headDepartmentIds: [],
        overrides: { modules: ['INVENTORY', 'PAYROLL'] }
      });
      const { res, body } = await postPatch(client, session, orgUserId, patchPayload, testInfo, 'orgs/users-update-supervisor-forbid-modules');
      expectSupervisorForbiddenUpdate(res, body);
    } finally {
      await client.dispose();
    }
  });
});
