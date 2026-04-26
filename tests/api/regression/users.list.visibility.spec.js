const { test, expect } = require('@playwright/test');
const { env } = require('../../../config/env');
const { createApiClient } = require('../../../helpers/apiClient');
const { loginWithOtp } = require('../../../helpers/authSession');
const { getSeededAccountByKey } = require('../../../helpers/testData');
const {
  expectSuccessStatus,
  expectJsonContentType,
  expectJsonSuccessBody,
  expectJsonErrorBody,
  expectHttpStatus
} = require('../../../helpers/assertions');
const {
  expectOrgUsersListSuccessBody,
  getOrgUsersItems,
  getOrgUsersListTotal,
  listItemIdentity,
  listItemBranchId
} = require('../../../helpers/assertions.users');
const { publishApiResponse } = require('../../../helpers/apiResponseReport');
const { otpChainTestsSkippedReason } = require('../../../helpers/otpChainSkip');

async function fetchUserList(client, session, testInfo, query = {}, urlHint = 'orgs/users') {
  const listUrl = `orgs/${session.orgId}/users`;
  const listParams = { ...query  };
  const listRes = await client.get(listUrl, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    params: listParams
  });
  const listBody = await listRes.json();
  await publishApiResponse(testInfo, {
    urlHint,
    response: listRes,
    loginEmail: session.loginEmail,
    status: listRes.status(),
    statusText: listRes.statusText(),
    body: listBody,
    requestPayload: { path: listUrl, query: listParams }
  });
  return { listRes, listBody };
}

function assertListHasAtLeast(body, minRows, label) {
  const items = getOrgUsersItems(body);
  const total = getOrgUsersListTotal(body);
  if (typeof total === 'number') {
    expect(total, `${label} total`).toBeGreaterThanOrEqual(minRows);
  } else {
    expect(items.length, `${label} items length`).toBeGreaterThanOrEqual(minRows);
  }
  return items;
}

test.describe('List users visibility :', () => {
  // Test 1: Owner has org-wide visibility.
  test('returns organization-wide users for owner', async ({}, testInfo) => {
    const owner = getSeededAccountByKey('t3_owner');
    test.skip(!owner, 'Set owner from seeded accounts key t3_owner');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, {
        email: owner.email,
        password: owner.password,
        otp: env.VERIFY_OTP
      });
      test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);

      const { listRes, listBody } = await fetchUserList(client, session, testInfo, {}, 'orgs/users-owner');
      expectSuccessStatus(listRes, listBody);
      expectJsonContentType(listRes);
      expectOrgUsersListSuccessBody(listBody);
      assertListHasAtLeast(listBody, 2, 'owner');
    } finally {
      await client.dispose();
    }
  });

  // Test 2: Supervisor sees only users from own branch.
  test('returns branch-scoped users for supervisor', async ({}, testInfo) => {
    const supervisor = getSeededAccountByKey('t3_supervisor');
    test.skip(!supervisor, 'Set supervisor from seeded accounts key t3_supervisor');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, {
        email: supervisor.email,
        password: supervisor.password,
        otp: env.VERIFY_OTP
      });
      test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);
      test.skip(!session.branchId, 'Supervisor session must include branch.id');

      const { listRes, listBody } = await fetchUserList(client, session, testInfo, {}, 'orgs/users-supervisor');
      expectSuccessStatus(listRes, listBody);
      expectJsonSuccessBody(listBody, {
        success: true,
        statusCode: 200,
        message: 'success'
      });


      
    } finally {
      await client.dispose();
    }
  });

  // Test 3: Employee sees only their own membership row.
  test('returns only self for employee', async ({}, testInfo) => {
    const employee = getSeededAccountByKey('t1_emp1');
    test.skip(!employee, 'Set employee from seeded accounts key t1_emp1');
    const skipOtp = otpChainTestsSkippedReason();
    test.skip(!!skipOtp, skipOtp);

    const client = await createApiClient();
    try {
      const session = await loginWithOtp(client, {
        email: employee.email,
        password: employee.password,
        otp: env.VERIFY_OTP
      });
      test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);

      const { listRes, listBody } = await fetchUserList(client, session, testInfo, {}, 'orgs/users-employee');
      expectSuccessStatus(listRes, listBody);
      expectJsonContentType(listRes);
      expectOrgUsersListSuccessBody(listBody);
      const items = getOrgUsersItems(listBody);
      expect(items.length, 'employee should see at least one row').toBeGreaterThan(0);

      const myId = session.orgUserId;
      const myEmail = String(session.loginEmail || '').toLowerCase();
      const others = items.filter((row) => {
        const id = listItemIdentity(row);
        const email = String(row?.email || '').toLowerCase();
        const matchesId = myId && id && String(id) === String(myId);
        const matchesEmail = myEmail && email && email === myEmail;
        return !matchesId && !matchesEmail;
      });
      expect(others, 'employee list should not include other users').toHaveLength(0);
    } finally {
      await client.dispose();
    }
  });


// Test 4: Search
// Partial, case-insensitive search supported on:
// - Email
// - First name
// - Last name
// - Full name
// - Employee ID

test('returns users matching search query', async ({}, testInfo) => {
  const owner = getSeededAccountByKey('t3_owner');
  test.skip(!owner, 'Set owner from seeded accounts key t3_owner');
  const skipOtp = otpChainTestsSkippedReason();
  test.skip(!!skipOtp, skipOtp);

  const client = await createApiClient();
  try {
    const session = await loginWithOtp(client, {
      email: owner.email,
      password: owner.password,
      otp: env.VERIFY_OTP
    });
    test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);

    // payload with parameters search, email, firstName, lastName, fullName, employeeId
    const payload = {
      branchRole: 'SUPERVISOR',
      branchId: session.branchId, 
      departmentId:"e9527f26-fb18-451c-ac27-8c8228b9e695",
      status: 'ACTIVE',
      page:1,
      limit: 10
    };
    const { listRes, listBody } = await fetchUserList(client, session, testInfo, payload, 'orgs/users-search');
    expectSuccessStatus(listRes, listBody);
    expectJsonSuccessBody(listBody, {
      success: true,
      statusCode: 200,
      message: 'success'
    }); 

  } finally {
    await client.dispose();
  }
  });

// Test 5: Employees cannot access other users via search/filters.
test('employee search and filters cannot expose other users', async ({}, testInfo) => {
  const employee = getSeededAccountByKey('t1_emp1');
  test.skip(!employee, 'Set employee from seeded accounts key t1_emp1');
  const skipOtp = otpChainTestsSkippedReason();
  test.skip(!!skipOtp, skipOtp);

  const client = await createApiClient();
  try {
    const session = await loginWithOtp(client, {
      email: employee.email,
      password: employee.password,
      otp: env.VERIFY_OTP
    });
    test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);

    const query = {
      branchRole: 'SUPERVISOR',
      status: 'ACTIVE',
      page: 1,
      limit: 50
    };
    const { listRes, listBody } = await fetchUserList(
      client,
      session,
      testInfo,
      query,
      'orgs/users-employee-search-filters'
    );


    expectJsonSuccessBody(listBody, {
      success: true,
      statusCode: 200,
      pagination: {
        total: 0
      }
    });

  } finally {
    await client.dispose();
  }
});

// Test 6: Invalid branch/department filters are rejected.
test('rejects invalid branchId or departmentId filters', async ({}, testInfo) => {
  const owner = getSeededAccountByKey('t3_owner');
  test.skip(!owner, 'Set owner from seeded accounts key t3_owner');
  const skipOtp = otpChainTestsSkippedReason();
  test.skip(!!skipOtp, skipOtp);

  const client = await createApiClient();
  try {
    const session = await loginWithOtp(client, {
      email: owner.email,
      password: owner.password,
      otp: env.VERIFY_OTP
    });
    test.skip(!session.ok, session.ok ? '' : `OTP login failed at ${session.step}`);

    const invalidBranchAndDepartmentQuery = {
      branchId: '00000000-0000-0000-0000-000000000000',
      departmentId: '00000000-0000-0000-0000-000000000000',
      page: 1,
      limit: 10
    };
    const { listRes, listBody } = await fetchUserList(
      client,
      session,
      testInfo,
      invalidBranchAndDepartmentQuery,
      'orgs/users-invalid-branch-department-filter'
    );

    expectHttpStatus(listRes, 400);
    expectJsonErrorBody(listBody, {
      success: false,
      statusCode: 400,
      message: 'Invalid branchId.'
    });
  } finally {
    await client.dispose();
  }
});

});