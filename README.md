# Symbiote API Testing Framework

Playwright API tests (JavaScript) against Symbiote QA. Config: `.env` (copy from [`.env.example`](.env.example)) → [`config/env.js`](config/env.js). **`BASE_URL` must end with `/`** (normalized in code). Auth flow in tests: **login → send-otp → verify-otp** via [`helpers/authSession.js`](helpers/authSession.js).

## Setup

```bash
npm install
npm run pw:install
Copy-Item .env.example .env   # PowerShell; then edit .env
```

Minimum for OTP tests: `LOGIN_EMAIL`, `LOGIN_PASSWORD`, `VERIFY_OTP`. Full suite: fill `.env.example` (tasks: `TASKS_BRANCH_ID` optional when JWT includes `branchId`; users need `USER_MGMT_*` / `USER_CREATE_*` where noted).

### Why tests are skipped (and how to run them)

Specs use Playwright `test.skip(condition, reason)` so **skipped** runs do not count as failures. Skips usually mean **preconditions are not met**—fix env or QA data so the condition becomes false and the test executes.

| Condition (typical) | What to do |
|---------------------|------------|
| Missing seeded persona email / `LOGIN_PASSWORD` | Set credentials in `.env`; align with [`tests/data/seededAccounts.js`](tests/data/seededAccounts.js). |
| `Set TASKS_BRANCH_ID` / no branch after login | Task specs use [`helpers/tasksContext.js`](helpers/tasksContext.js): `resolveTasksBranchId` prefers env then session; `resolveTasksBranchPreferSession` prefers session (supervisor/employee). **`TASKS_BRANCH_ID` is often optional** when verify-otp returns `branchId`. |
| [`SKIP_OTP_CHAIN_TESTS`](helpers/otpChainSkip.js) set | Unset when QA `POST /auth/send-otp` is usable; while set, OTP-dependent suites skip with the helper’s message. |
| OTP login failed at step … | Fix `VERIFY_OTP`, clock, or QA auth; see [`helpers/authSession.js`](helpers/authSession.js). |
| Board / list empty (no task ids) | Many flows call `resolveTaskCreateIds` (list → board → org **task-settings**) and `pickOrCreateTaskId` / `createBranchTask` to derive ids or **seed a task** when the branch is empty. |
| `Need at least 2 columns` / `2 tasks` / `2 statuses` | Some scenarios still need real board shape (e.g. cross-column move) or enough statuses in settings; move smoke may seed two tasks when a column has fewer than two. |
| `Set USER_CREATE_WRONG_BRANCH_ID` / wrong branch must differ | Set a second branch id for cross-branch negative tests; must not equal the logged-in user’s branch. |
| Owner vs supervisor env (`TASKS_OWNER_*`, `TASKS_SUPERVISOR_*`) | Settings and some negatives need both roles; set emails/passwords per `.env.example`. |
| `RUN_TASKS_RECURRENCE_TEST=1` | Optional recurrence delete test in [`tests/api/modules/tasks/smoke/tasks.delete.spec.js`](tests/api/modules/tasks/smoke/tasks.delete.spec.js); enable only when you intend to run it. |

Goal for CI: **no unexpected skips**—treat a skip as a signal to fill the row above, not as a green substitute for a missing assertion.

## Test case workbook (run in order)

Use this when you want [`Master_TestCases.xlsx`](Master_TestCases.xlsx) built from [`testCases/*.md`](testCases/) and then filled with the latest Playwright run.

1. **Generate** the workbook from markdown (creates/updates sheets and preserves run history where applicable).

   ```bash
   npm run testcases:generate
   ```

2. **Run** the API tests (writes `reports/json/results.json` used by sync).

   ```bash
   npm run test:api
   ```

3. **Update** `Master_TestCases.xlsx` with last run status / timing from that JSON.

   ```bash
   npm run testcases:sync
   ```

**One command for all three:** `npm run testcases:refresh` (same as generate → test:api → sync).

Row order in the workbook follows [`project_docs/Role_Based_Test_Coverage_Review.md`](project_docs/Role_Based_Test_Coverage_Review.md); see [`scripts/testcase-sync/testcase-order.js`](scripts/testcase-sync/testcase-order.js) and [`testCases/README.md`](testCases/README.md).

## Commands

| Command | What |
|--------|------|
| `npm test` / `npm run test:api` | All `tests/api` |
| `npm run test:smoke` | `@smoke` |
| `npm run test:negative` | `@negative` |
| `npm run test:regression` | `@regression` |
| `npm run test:list` | List tests |
| `npm run report:open` | Last HTML report |
| `npm run postman:build` | Regenerate `postman/Symbiote-API.postman_collection.json` |
| `npm run postman:routes` | Print route inventory from specs |
| `npm run test:tasks` | All specs whose `describe` title includes `@tasks` |
| `npm run test:users` | Same for `@users` |

### Modules (folders)

| Command | What |
|--------|------|
| `npm run test:module:auth` | `tests/api/modules/auth` |
| `npm run test:module:tasks` | `tests/api/modules/tasks` |
| `npm run test:module:users` | `tests/api/modules/users` |
| `npm run test:module:auth:smoke` | `tests/api/modules/auth/smoke` |
| `npm run test:module:tasks:smoke` | `tests/api/modules/tasks/smoke` |
| `npm run test:module:users:smoke` | `tests/api/modules/users/smoke` |
| `npm run test:module:auth:negative` | `tests/api/modules/auth/negative` |
| `npm run test:module:tasks:negative` | `tests/api/modules/tasks/negative` |
| `npm run test:module:users:negative` | `tests/api/modules/users/negative` |

### One file, folder, or grep

Use `npx playwright test` with a path (under repo root). On Windows PowerShell, quote paths if they contain spaces.

```bash
# Single file
npx playwright test tests/api/modules/tasks/negative/tasks.update.negative.spec.js

# Whole regression folder
npx playwright test tests/api/regression

# Module smoke only (same as npm run test:module:tasks:smoke)
npx playwright test tests/api/modules/tasks/smoke

# Path + tag (e.g. only @smoke inside that file)
npx playwright test tests/api/modules/auth/smoke/auth.login.spec.js --grep @smoke

# By test title (substring), optional with path
npx playwright test tests/api/modules/tasks/smoke/tasks.crud.spec.js -g "TASKS-POST"
```

## Where things live

- Specs: [`tests/api/`](tests/api/) (`modules/auth|tasks|users`, `regression/`)
- Seeded personas: [`tests/data/seededAccounts.js`](tests/data/seededAccounts.js)
- Auth matrix map: [`tests/data/qa-test-matrix.md`](tests/data/qa-test-matrix.md)
