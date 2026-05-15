/**
 * Writes postman/Symbiote-API.postman_collection.json (Collection v2.1).
 * Run: node scripts/postman/build-collection.js
 */
const fs = require('fs');
const path = require('path');

const OUT = path.resolve(__dirname, '..', '..', 'postman', 'Symbiote-API.postman_collection.json');

const jsonHeaders = [
  { key: 'Accept', value: 'application/json' },
  { key: 'Content-Type', value: 'application/json' }
];

const bearerHeaders = [
  { key: 'Accept', value: 'application/json' },
  { key: 'Content-Type', value: 'application/json' },
  { key: 'Authorization', value: 'Bearer {{accessToken}}' }
];

function testScript(lines) {
  return [{ listen: 'test', script: { exec: lines, type: 'text/javascript' } }];
}

const scriptLoginAttemptId = testScript([
  'try {',
  '  const j = pm.response.json();',
  '  if (j && j.data && j.data.loginAttemptId) {',
  "    pm.collectionVariables.set('loginAttemptId', j.data.loginAttemptId);",
  '  }',
  '} catch (e) {}'
]);

const scriptVerifyOtpTokens = testScript([
  'try {',
  '  const j = pm.response.json();',
  '  if (j && j.data) {',
  "    if (j.data.accessToken) pm.collectionVariables.set('accessToken', j.data.accessToken);",
  "    if (j.data.refreshToken) pm.collectionVariables.set('refreshToken', j.data.refreshToken);",
  "    if (j.data.org && j.data.org.id) pm.collectionVariables.set('orgId', j.data.org.id);",
  '    const b = j.data.branch;',
  '    if (b && b.id) pm.collectionVariables.set("branchId", b.id);',
  '    const branches = Array.isArray(j.data.branches) ? j.data.branches : [];',
  '    const active = branches.find((x) => x && x.status === "ACTIVE" && x.id);',
  '    if (active && active.id) pm.collectionVariables.set("branchId", active.id);',
  '  }',
  '} catch (e) {}'
]);

const scriptContentTypeJson = testScript([
  "pm.test('Content-Type mentions json', () => {",
  "  pm.expect(pm.response.headers.get('Content-Type') || '').to.match(/json/i);",
  '});'
]);

function authReq(name, method, urlTail, opts = {}) {
  const { body, description = '', event } = opts;
  const r = {
    name,
    request: {
      method,
      header: jsonHeaders,
      url: `{{baseUrl}}${urlTail}`,
      description
    }
  };
  if (body !== undefined) {
    r.request.body = {
      mode: 'raw',
      raw: typeof body === 'string' ? body : JSON.stringify(body, null, 2),
      options: { raw: { language: 'json' } }
    };
  }
  if (event) r.event = event;
  return r;
}

function protectedReq(name, method, urlTail, opts = {}) {
  const { body, description = '', query } = opts;
  let urlField = `{{baseUrl}}${urlTail}`;
  if (query && query.length) {
    const qs = query.map((q) => `${q.key}=${q.value}`).join('&');
    urlField = `{{baseUrl}}${urlTail}?${qs}`;
  }
  const r = {
    name,
    request: {
      method,
      header: bearerHeaders,
      url: urlField,
      description
    }
  };
  if (body !== undefined) {
    r.request.body = {
      mode: 'raw',
      raw: typeof body === 'string' ? body : JSON.stringify(body, null, 2),
      options: { raw: { language: 'json' } }
    };
  }
  return r;
}

const collectionDescription = [
  'Symbiote API — hybrid catalog aligned with Playwright tests under `tests/api`.',
  '',
  '**baseUrl** must include trailing slash (e.g. `https://host/api/v1/`). Paths are relative segments after baseUrl.',
  '',
  '**Auth OTP flow:** POST `auth/login` → copy or auto-save `loginAttemptId` → POST `auth/send-otp` → POST `auth/verify-otp` (Tests script saves `accessToken`, `refreshToken`, `orgId`, `branchId` on success). Same shape as `helpers/authSession.js`.',
  '',
  '**Secrets:** use `postman/local.postman_environment.json` (copy values from `.env` / CI secrets); do not commit filled environments.',
  '',
  '**Tasks:** set `statusId`, `priorityId`, `userId` (assignee) from an existing task list response if needed.'
].join('\n');

const collection = {
  info: {
    name: 'Symbiote API (Playwright parity)',
    description: collectionDescription,
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  variable: [
    { key: 'baseUrl', value: 'https://api-qa.symbiotes.co.uk/api/v1/' },
    { key: 'accessToken', value: '' },
    { key: 'refreshToken', value: '' },
    { key: 'loginAttemptId', value: '' },
    { key: 'orgId', value: '' },
    { key: 'branchId', value: '' },
    { key: 'taskId', value: '' },
    { key: 'parentTaskId', value: '' },
    { key: 'subtaskId', value: '' },
    { key: 'commentId', value: '' },
    { key: 'notificationId', value: '' },
    { key: 'statusId', value: '' },
    { key: 'priorityId', value: '' },
    { key: 'filterId', value: '' },
    { key: 'userId', value: '' },
    { key: 'wrongBranchId', value: '' },
    { key: 'protectedApiPath', value: 'orgs/00000000-0000-0000-0000-000000000001/users' },
    { key: 'loginEmail', value: '' },
    { key: 'loginPassword', value: '' },
    { key: 'verifyOtp', value: '111111' }
  ],
  item: [
    {
      name: 'Auth (detailed)',
      description: 'Matches `tests/api/modules/auth` + `tests/api/regression/qa-auth-matrix.spec.js` scenarios.',
      item: [
        {
          name: 'login',
          item: [
            authReq('[AUTH-LOGIN-010] Valid login', 'POST', 'auth/login', {
              body: { email: '{{loginEmail}}', password: '{{loginPassword}}' },
              description: 'qa-auth-matrix.spec.js',
              event: scriptLoginAttemptId
            }),
            authReq('[AUTH-LOGIN-011] Uppercase email', 'POST', 'auth/login', {
              body: { email: '{{loginEmail}}', password: '{{loginPassword}}' },
              description:
                'qa-auth-matrix — set `loginEmail` to uppercase in environment for parity.',
              event: scriptLoginAttemptId
            }),
            authReq('[AUTH-LOGIN-002] Invalid password', 'POST', 'auth/login', {
              body: { email: 't3.owner@demo.com', password: 'DefinitelyWrong#NotReal99' },
              description: 'auth.login.negative.spec.js'
            }),
            authReq('[AUTH-LOGIN-003] Unknown email', 'POST', 'auth/login', {
              body: { email: 'nonexistent.user@demo.com', password: 'DefinitelyWrong#NotReal99' },
              description: 'auth.login.negative.spec.js, qa-auth-matrix [AUTH-LOGIN-013]'
            }),
            authReq('[AUTH-LOGIN-012] Wrong password (env email)', 'POST', 'auth/login', {
              body: { email: '{{loginEmail}}', password: 'DefinitelyWrong#NotReal99' },
              description: 'qa-auth-matrix.spec.js'
            }),
            authReq('[AUTH-LOGIN-004] Missing email', 'POST', 'auth/login', {
              body: { password: 'x' },
              description: 'auth.login.negative.spec.js'
            }),
            authReq('[AUTH-LOGIN-005] Missing password', 'POST', 'auth/login', {
              body: { email: 't3.owner@demo.com' },
              description: 'auth.login.negative.spec.js'
            }),
            authReq('[AUTH-LOGIN-006] Invalid email format', 'POST', 'auth/login', {
              body: { email: 'not-an-email', password: 'SomePassword1!' },
              description: 'auth.login.negative.spec.js'
            }),
            authReq('[AUTH-LOGIN-007] Empty password', 'POST', 'auth/login', {
              body: { email: 't3.owner@demo.com', password: '' },
              description: 'auth.login.negative.spec.js'
            }),
            authReq('[AUTH-LOGIN-008] Padded email', 'POST', 'auth/login', {
              body: { email: '  {{loginEmail}}   ', password: '{{loginPassword}}' },
              description: 'auth.login.negative.spec.js — RUN_PADDED_LOGIN_EMAIL_TEST in Playwright'
            }),
            authReq('[AUTH-LOGIN-009] Uppercase env email', 'POST', 'auth/login', {
              body: { email: '{{loginEmail}}', password: '{{loginPassword}}' },
              description: 'auth.login.negative.spec.js',
              event: scriptLoginAttemptId
            })
          ]
        },
        {
          name: 'send-otp',
          item: [
            authReq('[AUTH-SENDOTP-006] EMAIL', 'POST', 'auth/send-otp', {
              body: { loginAttemptId: '{{loginAttemptId}}', method: 'EMAIL' },
              description: 'qa-auth-matrix, auth.send-otp smoke',
              event: scriptContentTypeJson
            }),
            authReq('[AUTH-SENDOTP-007] SMS unsupported', 'POST', 'auth/send-otp', {
              body: { loginAttemptId: '{{loginAttemptId}}', method: 'SMS' },
              description: 'qa-auth-matrix.spec.js'
            })
          ]
        },
        {
          name: 'verify-otp',
          item: [
            authReq('[AUTH-VERIFY-007] Valid OTP', 'POST', 'auth/verify-otp', {
              body: { loginAttemptId: '{{loginAttemptId}}', otp: '{{verifyOtp}}' },
              description: 'qa-auth-matrix — after send-otp',
              event: [...scriptVerifyOtpTokens, ...scriptContentTypeJson]
            }),
            authReq('[AUTH-VERIFY-008] Before send-otp', 'POST', 'auth/verify-otp', {
              body: { loginAttemptId: '{{loginAttemptId}}', otp: '{{verifyOtp}}' },
              description: 'qa-auth-matrix.spec.js'
            }),
            authReq('[AUTH-VERIFY-009] Wrong OTP', 'POST', 'auth/verify-otp', {
              body: { loginAttemptId: '{{loginAttemptId}}', otp: '999999' },
              description: 'qa-auth-matrix — after send-otp'
            }),
            authReq('[AUTH-VERIFY-010] Double verify', 'POST', 'auth/verify-otp', {
              body: { loginAttemptId: '{{loginAttemptId}}', otp: '{{verifyOtp}}' },
              description: 'Second call expect 400. qa-auth-matrix'
            }),
            authReq('[AUTH-VERIFY-011] Tier-3 member verify', 'POST', 'auth/verify-otp', {
              body: { loginAttemptId: '{{loginAttemptId}}', otp: '{{verifyOtp}}' },
              description: 'qa-auth-matrix — use TIER3_MEMBER_EMAIL chain in Playwright; same body shape here.',
              event: scriptVerifyOtpTokens
            })
          ]
        },
        {
          name: 'refresh',
          item: [
            authReq('[AUTH-REFRESH-006] Body refreshToken', 'POST', 'auth/refresh', {
              body: { refreshToken: '{{refreshToken}}' },
              description: 'qa-auth-matrix.spec.js',
              event: scriptContentTypeJson
            }),
            {
              name: '[AUTH-REFRESH-007] Cookie refresh_token',
              request: {
                method: 'POST',
                header: [
                  { key: 'Accept', value: 'application/json' },
                  { key: 'Content-Type', value: 'application/json' },
                  { key: 'Cookie', value: 'refresh_token={{refreshToken}}' }
                ],
                url: '{{baseUrl}}auth/refresh',
                body: { mode: 'raw', raw: '{}', options: { raw: { language: 'json' } } },
                description: 'qa-auth-matrix.spec.js'
              },
              event: scriptContentTypeJson
            },
            authReq('[AUTH-REFRESH-008] Malformed refresh', 'POST', 'auth/refresh', {
              body: { refreshToken: 'not-a-valid-format' },
              description: 'qa-auth-matrix, auth.refresh.negative'
            }),
            authReq('[AUTH-REFRESH-002] Missing refresh', 'POST', 'auth/refresh', {
              body: {},
              description: 'auth.refresh.negative.spec.js'
            }),
            authReq('[AUTH-REFRESH-004] Unknown refresh token', 'POST', 'auth/refresh', {
              body: { refreshToken: '00000000-0000-0000-0000-000000000000.fake-secret-part' },
              description: 'auth.refresh.negative.spec.js'
            })
          ]
        }
      ]
    }
  ]
};

collection.item[0].item.push({
  name: 'other',
  item: [
    authReq('POST auth/forgot-password', 'POST', 'auth/forgot-password', {
      body: {},
      description: 'auth.forgot-password.negative.spec.js'
    }),
    authReq('POST auth/set-password', 'POST', 'auth/set-password', {
      body: { token: 'invalid', password: 'Short1' },
      description: 'auth.set-password.negative.spec.js — adjust to match API'
    }),
    authReq('POST auth/password-action/validate', 'POST', 'auth/password-action/validate', {
      body: { password: 'Abcd1234!' },
      description: 'auth.password-action.negative.spec.js'
    }),
    authReq('Smoke auth/send-otp (minimal)', 'POST', 'auth/send-otp', {
      body: { loginAttemptId: '{{loginAttemptId}}', method: 'EMAIL' },
      description: 'auth.send-otp.spec.js'
    }),
    authReq('Smoke auth/login (minimal)', 'POST', 'auth/login', {
      body: { email: '{{loginEmail}}', password: '{{loginPassword}}' },
      description: 'auth.login.spec.js',
      event: scriptLoginAttemptId
    })
  ]
});

const tasksFolder = {
  name: 'Tasks (catalog)',
  description:
    'Deduplicated routes used across `tests/api/modules/tasks/**/*.spec.js`. Use Bearer `accessToken`.',
  item: [
    protectedReq('GET list tasks', 'GET', 'orgs/{{orgId}}/branches/{{branchId}}/tasks', {
      query: [
        { key: 'page', value: '1' },
        { key: 'pageSize', value: '20' },
        { key: 'sort', value: 'createdAt' },
        { key: 'order', value: 'desc' }
      ],
      description: 'tasks.list.spec.js, tasks.crud.spec.js, tasks.list.negative.spec.js'
    }),
    protectedReq('GET tasks board', 'GET', 'orgs/{{orgId}}/branches/{{branchId}}/tasks/board', {
      description:
        'tasks.boardview.spec.js, tasks.comments*, tasks.delete*, tasks.move*, tasks.create.negative, tasks.subtasks*, tasks.list.spec.js'
    }),
    protectedReq('GET task by id', 'GET', 'orgs/{{orgId}}/branches/{{branchId}}/tasks/{{taskId}}', {
      description: 'tasks.detail.spec.js, tasks.delete.spec.js, tasks.subtasks*, tasks.move.negative, tasks.update*'
    }),
    protectedReq('POST create task', 'POST', 'orgs/{{orgId}}/branches/{{branchId}}/tasks', {
      body: {
        title: 'Postman task',
        description: 'catalog',
        statusId: '{{statusId}}',
        priorityId: '{{priorityId}}',
        assigneeId: '{{userId}}',
        startAt: '2026-01-01T10:00:00.000Z',
        endAt: '2026-01-01T12:00:00.000Z',
        reminderOffsetsMinutes: [60, 15]
      },
      description: 'tasks.crud.spec.js, tasks.create.negative.spec.js, tasks.update.negative, tasks.delete*, tasks.move*, tasks.comments*'
    }),
    protectedReq('PATCH update task', 'PATCH', 'orgs/{{orgId}}/branches/{{branchId}}/tasks/{{taskId}}', {
      body: { title: 'Updated from Postman' },
      description: 'tasks.crud.spec.js, tasks.update.spec.js, tasks.update.negative, tasks.move*, tasks.subtasks*'
    }),
    protectedReq('DELETE task', 'DELETE', 'orgs/{{orgId}}/branches/{{branchId}}/tasks/{{taskId}}', {
      description: 'tasks.crud.spec.js, tasks.delete*, tasks.update*, tasks.settings.negative, tasks.subtasks*, tasks.move.negative'
    }),
    protectedReq('GET subtasks tree', 'GET', 'orgs/{{orgId}}/branches/{{branchId}}/tasks/{{taskId}}/subtasks/tree', {
      description: 'tasks.subtasks-tree.spec.js'
    }),
    protectedReq('GET subtasks', 'GET', 'orgs/{{orgId}}/branches/{{branchId}}/tasks/{{parentTaskId}}/subtasks', {
      description: 'tasks.subtasks.spec.js, tasks.subtasks.negative.spec.js, tasks.delete.spec.js, tasks.move.negative, tasks.update.negative'
    }),
    protectedReq('POST subtask', 'POST', 'orgs/{{orgId}}/branches/{{branchId}}/tasks/{{parentTaskId}}/subtasks', {
      body: {
        title: 'Subtask',
        description: 'child',
        statusId: '{{statusId}}',
        priorityId: '{{priorityId}}',
        assigneeId: '{{userId}}',
        startAt: '2026-01-01T10:00:00.000Z',
        endAt: '2026-01-01T11:00:00.000Z',
        reminderOffsetsMinutes: [30]
      },
      description: 'tasks.subtasks.spec.js, tasks.delete.spec.js, tasks.move.negative, tasks.update.negative'
    }),
    protectedReq('PATCH reparent', 'PATCH', 'orgs/{{orgId}}/branches/{{branchId}}/tasks/{{subtaskId}}/reparent', {
      body: { underTaskId: '{{parentTaskId}}' },
      description: 'tasks.subtasks.spec.js, tasks.subtasks.negative.spec.js'
    }),
    protectedReq('PATCH move-under-parent', 'PATCH', 'orgs/{{orgId}}/branches/{{branchId}}/tasks/{{subtaskId}}/move-under-parent', {
      body: {},
      description: 'tasks.subtasks.spec.js, tasks.subtasks.negative.spec.js'
    }),
    protectedReq('GET comments', 'GET', 'orgs/{{orgId}}/branches/{{branchId}}/tasks/{{taskId}}/comments', {
      query: [
        { key: 'page', value: '1' },
        { key: 'limit', value: '20' }
      ],
      description: 'tasks.comments.spec.js, tasks.comments.negative.spec.js'
    }),
    protectedReq('POST comment', 'POST', 'orgs/{{orgId}}/branches/{{branchId}}/tasks/{{taskId}}/comments', {
      body: { text: 'Postman comment' },
      description: 'tasks.comments.spec.js, tasks.comments.negative.spec.js'
    }),
    protectedReq('POST comment reply', 'POST', 'orgs/{{orgId}}/branches/{{branchId}}/tasks/{{taskId}}/comments/{{commentId}}/replies', {
      body: { text: 'Reply' },
      description: 'tasks.comments.spec.js, tasks.comments.negative.spec.js'
    }),
    protectedReq('PATCH comment', 'PATCH', 'orgs/{{orgId}}/branches/{{branchId}}/tasks/{{taskId}}/comments/{{commentId}}', {
      body: { text: 'Edited' },
      description: 'tasks.comments.spec.js, tasks.comments.negative.spec.js'
    }),
    protectedReq('DELETE comment', 'DELETE', 'orgs/{{orgId}}/branches/{{branchId}}/tasks/{{taskId}}/comments/{{commentId}}', {
      description: 'tasks.comments.spec.js'
    }),
    protectedReq('PATCH move task', 'PATCH', 'orgs/{{orgId}}/branches/{{branchId}}/tasks/{{taskId}}/move', {
      body: { targetBranchId: '{{branchId}}', targetParentTaskId: null, sortOrder: 0 },
      description: 'tasks.move.spec.js, tasks.move.negative.spec.js'
    }),
    protectedReq('GET analytics', 'GET', 'orgs/{{orgId}}/branches/{{branchId}}/tasks/analytics', {
      description: 'tasks.analytics.spec.js'
    }),
    protectedReq('GET saved filters', 'GET', 'orgs/{{orgId}}/branches/{{branchId}}/tasks/analytics/saved-filters', {
      description: 'tasks.saved-filters.spec.js, tasks.saved-filters.negative.spec.js'
    }),
    protectedReq('POST saved filter', 'POST', 'orgs/{{orgId}}/branches/{{branchId}}/tasks/analytics/saved-filters', {
      body: { name: 'filter', filter: {} },
      description: 'tasks.saved-filters.spec.js'
    }),
    protectedReq('DELETE saved filter', 'DELETE', 'orgs/{{orgId}}/branches/{{branchId}}/tasks/analytics/saved-filters/{{filterId}}', {
      description: 'tasks.saved-filters.spec.js'
    }),
    protectedReq('GET task-notifications (branch)', 'GET', 'orgs/{{orgId}}/branches/{{branchId}}/task-notifications', {
      query: [
        { key: 'page', value: '1' },
        { key: 'pageSize', value: '20' }
      ],
      description: 'tasks.notifications.spec.js, tasks.notifications.negative.spec.js'
    }),
    protectedReq('GET task-notifications (org)', 'GET', 'orgs/{{orgId}}/task-notifications', {
      query: [
        { key: 'page', value: '1' },
        { key: 'pageSize', value: '20' }
      ],
      description: 'tasks.notifications.spec.js fallback org-scoped'
    }),
    protectedReq('POST notification read', 'POST', 'orgs/{{orgId}}/branches/{{branchId}}/task-notifications/{{notificationId}}/read', {
      description: 'tasks.notifications.spec.js — use org path variant manually if needed'
    }),
    protectedReq('POST notifications read-all (branch)', 'POST', 'orgs/{{orgId}}/branches/{{branchId}}/task-notifications/read-all', {
      description: 'tasks.notifications.spec.js'
    }),
    protectedReq('POST notifications read-all (org)', 'POST', 'orgs/{{orgId}}/task-notifications/read-all', {
      description: 'tasks.notifications.spec.js when basePath is org-scoped'
    }),
    protectedReq('GET task-settings statuses', 'GET', 'orgs/{{orgId}}/task-settings/statuses', {
      description: 'tasks.settings.spec.js, tasks.settings.negative.spec.js'
    }),
    protectedReq('POST task-settings statuses', 'POST', 'orgs/{{orgId}}/task-settings/statuses', {
      body: { name: 'Status PM', color: '#112233' },
      description: 'tasks.settings.spec.js, tasks.settings.negative.spec.js'
    }),
    protectedReq('PATCH task-settings status', 'PATCH', 'orgs/{{orgId}}/task-settings/statuses/{{statusId}}', {
      body: { name: 'Renamed status' },
      description: 'tasks.settings.spec.js'
    }),
    protectedReq('PUT reorder statuses', 'PUT', 'orgs/{{orgId}}/task-settings/statuses/reorder', {
      body: { orderedIds: ['{{statusId}}'] },
      description: 'tasks.settings.spec.js, tasks.settings.negative.spec.js'
    }),
    protectedReq('DELETE task-settings status', 'DELETE', 'orgs/{{orgId}}/task-settings/statuses/{{statusId}}', {
      description: 'tasks.settings.spec.js, tasks.settings.negative.spec.js'
    }),
    protectedReq('GET task-settings priorities', 'GET', 'orgs/{{orgId}}/task-settings/priorities', {
      description: 'tasks.settings.spec.js, tasks.settings.negative.spec.js'
    }),
    protectedReq('POST task-settings priorities', 'POST', 'orgs/{{orgId}}/task-settings/priorities', {
      body: { name: 'Priority PM', color: '#445566' },
      description: 'tasks.settings.spec.js, tasks.settings.negative.spec.js'
    }),
    protectedReq('PATCH task-settings priority', 'PATCH', 'orgs/{{orgId}}/task-settings/priorities/{{priorityId}}', {
      body: { name: 'Renamed priority' },
      description: 'tasks.settings.spec.js'
    }),
    protectedReq('PUT reorder priorities', 'PUT', 'orgs/{{orgId}}/task-settings/priorities/reorder', {
      body: { orderedIds: ['{{priorityId}}'] },
      description: 'tasks.settings.spec.js, tasks.settings.negative.spec.js'
    }),
    protectedReq('DELETE task-settings priority', 'DELETE', 'orgs/{{orgId}}/task-settings/priorities/{{priorityId}}', {
      description: 'tasks.settings.spec.js, tasks.settings.negative.spec.js'
    })
  ]
};

const usersFolder = {
  name: 'Users (catalog)',
  description: 'Routes from `tests/api/modules/users` and user-related `tests/api/regression`.',
  item: [
    protectedReq('GET org users list', 'GET', 'orgs/{{orgId}}/users', {
      query: [
        { key: 'page', value: '1' },
        { key: 'pageSize', value: '20' }
      ],
      description: 'users.list.spec.js, users.list.negative.spec.js, users.list.visibility.spec.js, regression access specs'
    }),
    protectedReq('POST create org user', 'POST', 'orgs/{{orgId}}/users', {
      body: {
        branchId: '{{branchId}}',
        email: 'api.postman.user@demo.com',
        fullName: 'Postman User',
        phoneNumber: '07123456789',
        dateOfBirth: '1995-06-12',
        gender: 'MALE',
        addressLine1: '1 Test St',
        town: 'London',
        city: 'London',
        country: 'UK',
        position: 'Operator',
        employeeId: 'EMP-PM',
        status: 'ACTIVE',
        branchRole: 'EMPLOYEE',
        departmentIds: [],
        headDepartmentIds: []
      },
      description: 'users.create.spec.js, users.create.negative.spec.js, users.profile.validation.spec.js — trim body per helpers/createUserPayload.js for full smoke'
    }),
    protectedReq('GET user by id', 'GET', 'orgs/{{orgId}}/users/{{userId}}', {
      description: 'users.get.spec.js, users.get.negative.spec.js, users.update.flow.spec.js, regression users.get.access'
    }),
    protectedReq('PATCH user', 'PATCH', 'orgs/{{orgId}}/users/{{userId}}', {
      body: { fullName: 'Patched name' },
      description: 'users.update.flow.spec.js, users.profile.validation.spec.js, users.inactive-access.spec.js, users.create.rules.spec.js'
    }),
    protectedReq('GET users options', 'GET', 'orgs/{{orgId}}/users/options', {
      query: [{ key: 'branchId', value: '{{branchId}}' }],
      description: 'users.options.spec.js, users.options.negative.spec.js, regression users.options.access.spec.js'
    })
  ]
};

const regressionFolder = {
  name: 'Regression (spot)',
  description: 'Extra calls from `tests/api/regression` not duplicated above.',
  item: [
    {
      name: '[MISC-PROT-001] GET protected path invalid JWT',
      request: {
        method: 'GET',
        header: [
          { key: 'Accept', value: 'application/json' },
          {
            key: 'Authorization',
            value:
              'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJleHAiOjk5fQ.invalid'
          }
        ],
        url: '{{baseUrl}}{{protectedApiPath}}',
        description:
          'qa-auth-matrix.spec.js — set `protectedApiPath` relative to base (no leading slash), default matches Playwright fallback.'
      }
    },
    {
      name: 'GET protected path (template)',
      request: {
        method: 'GET',
        header: [
          { key: 'Accept', value: 'application/json' },
          { key: 'Authorization', value: 'Bearer {{accessToken}}' }
        ],
        url: '{{baseUrl}}{{protectedApiPath}}',
        description: 'Use env PROTECTED_API_PATH style path for matrix row MISC-PROT-001 valid token scenarios in Playwright.'
      }
    }
  ]
};

collection.item.push(tasksFolder, usersFolder, regressionFolder);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(collection, null, 2), 'utf8');
console.log('Wrote', OUT);
