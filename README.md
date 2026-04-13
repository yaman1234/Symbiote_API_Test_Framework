# Symbiote API Testing Framework

Playwright-driven API tests against Symbiote QA (JavaScript, no TypeScript). This README is the main map for running tests, configuring `.env`, and extending the suite.

---

## What this project covers

| Area | Role |
|------|------|
| **Smoke (`@smoke`)** | Fast happy paths: auth (login → OTP chain → refresh) and user-management reads that need a Bearer token. |
| **Negative (`@negative`)** | Invalid input and error envelopes (4xx/401) for auth and org user routes. |
| **Regression (`@regression`)** | QA auth matrix (15 scenarios) and list-users visibility (owner / employee / supervisor). |
| **User management (`@users`)** | Subset tag: `GET /orgs/:orgId/users`, `GET /orgs/:orgId/users/options`, and related negatives/visibility. |

**Contract style:** Symbiote JSON envelopes — `success`, `statusCode`, `message`, and for errors `error.code`, `error.key`, optional `error.details`. Shared checks live in `helpers/assertions.js` and `helpers/assertions.auth.js`; org user list/options shapes live in `helpers/assertions.users.js`.

**Planned:** heavier JSON Schema / `ajv` checks under `tests/contracts/` (dependency is already listed in `package.json`).

---

## Live test inventory

**Auth — smoke**

- `tests/api/smoke/auth.login.spec.js` — `POST auth/login` (OTP challenge; uppercase email variant).
- `tests/api/smoke/auth.send-otp.spec.js` — login → `POST auth/send-otp`.
- `tests/api/smoke/auth.verify-otp.spec.js` — login → send-otp → `POST auth/verify-otp` (`VERIFY_OTP` in `.env`).
- `tests/api/smoke/auth.refresh.spec.js` — full OTP login → `POST auth/refresh` with JSON `refreshToken`.

**Auth — negative**

- `tests/api/negative/auth.login.negative.spec.js` — 401 / 422; optional padded + uppercase email when `RUN_PADDED_LOGIN_EMAIL_TEST=1`.
- `tests/api/negative/auth.send-otp.negative.spec.js`
- `tests/api/negative/auth.verify-otp.negative.spec.js`
- `tests/api/negative/auth.refresh.negative.spec.js` — missing / malformed / invalid / replayed refresh → `401` / `AUTH_REFRESH_INVALID`.

**User management (`@users`)**

- `tests/api/smoke/users.list.spec.js` — `GET orgs/:orgId/users` (owner + `page` / `limit`) after **login → send-otp → verify-otp**.
- `tests/api/smoke/users.options.spec.js` — `GET orgs/:orgId/users/options?branchId=` (supervisor session + branch id); asserts dropdown fields and `branchRole` in `EMPLOYEE` | `SUPERVISOR`.
- `tests/api/negative/users.list.negative.spec.js` / `users.options.negative.spec.js` — unauthenticated `GET` → `401`.
- `tests/api/regression/users.list.visibility.spec.js` — owner vs employee vs supervisor visibility (requires OTP chain + role-specific emails in `.env`).

**Regression matrix**

- `tests/api/regression/qa-auth-matrix.spec.js` — numbered flows (login, send-otp, verify-otp, refresh, optional protected route, Tier 3 member). Row map: [`tests/data/qa-test-matrix.md`](tests/data/qa-test-matrix.md).

**Seeded QA accounts:** [`tests/data/qa-seeded-accounts.md`](tests/data/qa-seeded-accounts.md) (human reference) and [`tests/data/seededAccounts.js`](tests/data/seededAccounts.js) (machine-readable dataset for data-driven tests).

---

## Prerequisites

- Node.js 18+ (20 recommended), npm 9+

```bash
node -v
npm -v
```

---

## First-time setup

```bash
npm install
npm run pw:install
```

Create `.env` from the template (PowerShell: `Copy-Item .env.example .env`) and set at least `LOGIN_EMAIL`, `LOGIN_PASSWORD`, and a correct `VERIFY_OTP` for your environment. For user-management smokes/regression, set the `USER_MGMT_*` and optional `TIER3_MEMBER_*` variables described in `.env.example`.

---

## How runs work

1. `package.json` invokes Playwright (often with `--grep` for tags).
2. `playwright.config.js` loads `config/env.js`.
3. `config/env.js` loads `.env` via `dotenv` and normalizes `BASE_URL` (must end with `/` so paths like `auth/login` resolve under `/api/v1/` — see below).
4. Tests under `tests/api/` run; HTML / JUnit output goes under `reports/`.

---

## Commands

| Command | Scope |
|---------|--------|
| `npm test` / `npm run test:api` | All tests under `tests/api` (**47** cases in **14** files as of last inventory). |
| `npm run test:smoke` | `@smoke` only (**6** tests — includes user list/options smokes). |
| `npm run test:negative` | `@negative` only. |
| `npm run test:smoke-and-negative` | `@smoke` or `@negative` (no `@regression`). |
| `npm run test:regression` / `npm run test:manager-report` | `@regression` only (matrix + user visibility). |
| `npm run test:users` | `@users` only (user-management-focused). |
| `npm run test:list` | List tests without executing. |
| `npm run report:open` | Open the last HTML report. |

**Report behavior:** The HTML report only lists tests that ran in that invocation. If you run `npm run test:smoke`, negative and regression tests will not appear — that is expected.

**Terminal summary:** `ok` = passed, `x` = failed, `-` = skipped (often missing credentials, `SKIP_OTP_CHAIN_TESTS`, or OTP chain failure).

---

## Environment variables

See **`.env.example`** for the full list. Important ones:

| Variable | Purpose |
|----------|---------|
| `BASE_URL` | API base, e.g. `https://api-qa.symbiotes.co.uk/api/v1/` (trailing slash recommended; `config/env.js` normalizes). |
| `LOGIN_EMAIL` / `LOGIN_PASSWORD` | Default login for auth smokes and password fallback for other roles. |
| `VERIFY_OTP` | Static OTP for `verify-otp` after `send-otp`. |
| `SKIP_OTP_CHAIN_TESTS` | Set to `1` to skip tests that need a working `POST auth/send-otp`. |
| `RUN_PADDED_LOGIN_EMAIL_TEST` | Set to `1` to run the spaced + uppercase login negative (API must trim before validation). |
| `PROTECTED_API_PATH` | Relative path for QA matrix row 14 (invalid JWT). |
| `TIER3_MEMBER_EMAIL` / `TIER3_MEMBER_PASSWORD` | QA matrix row 15 (branch member). |
| `USER_MGMT_OWNER_EMAIL`, `USER_MGMT_EMPLOYEE_EMAIL`, `USER_MGMT_SUPERVISOR_EMAIL` | List/visibility/options tests; `*_PASSWORD` optional (falls back to `LOGIN_PASSWORD`). |

For `users.list.visibility.spec.js`, those email env vars are optional overrides. If unset, the test falls back to personas from [`tests/data/seededAccounts.js`](tests/data/seededAccounts.js): `t1_owner`, `t1_emp1`, and `t3_supervisor`.

**CI:** `.github/workflows/api-tests.yml` runs `npm run test:smoke` with `SYMBIOTE_LOGIN_EMAIL` / `SYMBIOTE_LOGIN_PASSWORD` secrets if configured; otherwise auth smokes may skip.

---

## Authenticated calls after OTP

Org user endpoints (`GET .../orgs/:orgId/users`, `GET .../orgs/:orgId/users/options`) expect a **Bearer access token** from:

**login → send-otp → verify-otp**

Smokes use **`helpers/authSession.js`** → `loginWithOtp(client, { email, password, otp })`, not `helpers/auth.js` (that file remains a minimal placeholder for future non-OTP flows).

---

## Project layout

```text
.
|-- .github/workflows/api-tests.yml
|-- config/env.js
|-- helpers/
|   |-- apiClient.js          # Playwright request context; get/post
|   |-- apiResponseReport.js  # Attach api-response.json to HTML report
|   |-- assertions.js         # HTTP + expectJsonSuccessBody / expectJsonErrorBody
|   |-- assertions.auth.js    # Auth response contracts
|   |-- assertions.users.js   # List users + user options contracts
|   |-- auth.js               # Placeholder for shared auth headers
|   |-- authSession.js        # loginWithOtp (full OTP chain)
|   |-- otpChainSkip.js       # SKIP_OTP_CHAIN_TESTS helper
|   `-- testData.js
|-- tests/api/
|   |-- smoke/
|   |-- negative/
|   `-- regression/
|-- tests/data/
|   |-- qa-seeded-accounts.md
|   |-- seededAccounts.js     # Structured seeded personas for data-driven tests
|   `-- qa-test-matrix.md
|-- tests/contracts/          # Reserved for schema tests
|-- .env.example
|-- playwright.config.js
`-- package.json
```

**Naming:** Put files under `smoke/`, `negative/`, or `regression/`; include `@smoke`, `@negative`, or `@regression` in `test.describe` titles for `grep`. Use `@users` for user-management suites when you want `npm run test:users`.

---

## API responses in the HTML report

Tests that call **`publishApiResponse`** can attach **`api-response.json`** (response body and optional request payload). Treat reports as sensitive if they contain tokens.

---

## Base URL gotcha

If `BASE_URL` were `https://host/api/v1` **without** a trailing slash, a relative URL `auth/login` could resolve to `https://host/api/auth/login`. **`config/env.js` forces a trailing slash** on `BASE_URL`. Use paths **without** a leading slash (e.g. `auth/login`, `orgs/{id}/users`).

---

## Tagging

- `@smoke` — quick gates.
- `@negative` — error paths.
- `@regression` — matrix and deeper scenarios.
- `@users` — user-management module slice.

---

## Troubleshooting

**Many skips on auth / user tests:** Set `LOGIN_EMAIL`, `LOGIN_PASSWORD`, and role-specific emails in `.env`. User smokes also need a working OTP chain (`send-otp` + correct `VERIFY_OTP`).

**`send-otp` or `verify-otp` fails (5xx / wrong OTP):** Fix QA or set **`SKIP_OTP_CHAIN_TESTS=1`** until `send-otp` is healthy. For parallel load hitting the same account, try **`npx playwright test --workers=1`** or `PW_WORKERS=1` if your `playwright.config.js` respects it.

**Report shows only smoke:** You ran `npm run test:smoke`. Use `npm test` or `npm run test:smoke-and-negative` to include negatives.

**Padded login negative skipped:** Enable with **`RUN_PADDED_LOGIN_EMAIL_TEST=1`** when the API trims email before validation.

---

## Adding a new test

1. Use **`createApiClient`** from `helpers/apiClient.js` and **relative** paths.
2. Reuse **`expectJsonSuccessBody` / `expectJsonErrorBody`** in `helpers/assertions.js`; add domain helpers beside `assertions.auth.js` / `assertions.users.js` when shapes stabilize.
3. After OTP login, reuse **`loginWithOtp`** from `helpers/authSession.js` and pass **`Authorization: Bearer ${accessToken}`** on follow-up requests.
4. For persona/role scenarios, prefer data-driven inputs from [`tests/data/seededAccounts.js`](tests/data/seededAccounts.js) and use env vars as optional overrides.
5. Tag the **`test.describe`** title and run the matching npm script.

---

## Conventions (short)

- Keep helpers generic; keep business rules in specs.
- Prefer small, readable tests over duplicated request boilerplate.
- Update this README when you add modules or change env contracts.
