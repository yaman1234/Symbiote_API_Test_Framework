# Role-Based Test Coverage Review

This review aligns current automated test cases with role behavior documented in product/API specs.

## Reviewed source docs

- `Authentication API Specification.docx`
- `symbiote_auth_login_qa_doc.docx`
- `User Management API.docx`
- `User Management API - Create and Update User.docx`
- `Task Management API.docx`

## What is already covered well

- Owner, supervisor, and employee visibility checks for `GET /orgs/:orgId/users`.
- Owner/supervisor/employee access checks for `GET /orgs/:orgId/users/options`.
- Role restriction checks on user create and patch flows (including supervisor-restricted fields).
- Auth flow coverage for login/otp/refresh success and negative paths.

## Documentation improvements applied

- Added explicit "Role-based access and expected response" sections in:
  - `testCases/Orgs_users.md`
  - `testCases/Orgs_users-get.md`
  - `testCases/Orgs_users-options.md`
  - `testCases/Orgs_users-create.md`
  - `testCases/Orgs_users-patch.md`
  - `testCases/Orgs_branches_tasks-list.md`

These sections make expected role behavior clear for:

- Allowed data scope per role
- Typical HTTP outcome (`2xx`, `401`, role-restricted `4xx`)
- Expected success/error envelope pattern

## Suggested next test additions (high value)

1. Add explicit negative tests for disallowed `branchId` override on supervisor for options/list where policy requires own branch only.
2. Add explicit employee-negative test for `GET /orgs/:orgId/users/:orgUserId` with another user's id.
3. Add explicit supervisor-negative test for reading out-of-scope user details in `users.get`.
4. Add explicit tasks-negative tests for cross-branch access attempts by supervisor and employee.
5. Add role-specific error key/code assertions (not only status) for policy-denied paths to ensure stable authorization contracts.

## Naming guidance for future scenarios

Keep scenario titles adjective-first and role-explicit:

- `Authorized owner lists organization-wide users`
- `Forbidden supervisor payroll update is rejected`
- `Unauthorized request without bearer token returns 401`

This improves readability and mapping quality when syncing test results.
