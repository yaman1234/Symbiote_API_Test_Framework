# Symbiote API Testing Framework (Foundation)

This document is your main notes page for understanding and growing this project.

The framework is intentionally created as a clean starting point:
- JavaScript only (no TypeScript)
- Playwright test runner
- Real smoke tests for **auth** on QA (login, send-otp, verify-otp, refresh)
- **Regression:** QA auth matrix (`@regression`) for stakeholder HTML reports
- CI-ready structure

---

## 1) What this project is for

This project helps you test APIs in a structured way:
- **Smoke tests**: quick health checks for critical flows
- **Regression tests**: deeper coverage for existing behavior
- **Negative tests**: validation for error paths and invalid input
- **Contract tests**: response schema checks (planned with `ajv`)

**Live coverage:**
- `tests/api/smoke/auth.login.spec.js` — `POST /api/v1/auth/login` (OTP challenge + uppercase email).
- `tests/api/negative/auth.login.negative.spec.js` — login errors 401/422 plus optional **padded + uppercase** email contract when `RUN_PADDED_LOGIN_EMAIL_TEST=1`.
- `tests/api/smoke/auth.send-otp.spec.js` — login → `POST /api/v1/auth/send-otp`.
- `tests/api/smoke/auth.verify-otp.spec.js` — login → send-otp → `POST /api/v1/auth/verify-otp` (uses `VERIFY_OTP` in `.env`, default `111111` on QA).
- `tests/api/smoke/auth.refresh.spec.js` — full login → verify-otp → `POST /api/v1/auth/refresh` with JSON `refreshToken` (API may prefer `refresh_token` cookie when present; this spec exercises the JSON path).
- `tests/api/negative/auth.login.negative.spec.js` — login error cases (401 / 422).
- `tests/api/negative/auth.send-otp.negative.spec.js` — send-otp error cases.
- `tests/api/negative/auth.verify-otp.negative.spec.js` — verify-otp validation and error cases.
- `tests/api/negative/auth.refresh.negative.spec.js` — missing / malformed / invalid / replayed refresh token → `401` with `AUTH_REFRESH_INVALID`.
- `tests/api/regression/qa-auth-matrix.spec.js` — numbered scenarios (login → OTP → refresh, errors, optional protected route + Tier 3 member). See [`tests/data/qa-test-matrix.md`](tests/data/qa-test-matrix.md).

Contracts live in `helpers/assertions.auth.js`; generic HTTP/JSON checks in `helpers/assertions.js`.

---

## 1b) First real test: auth login (notes)

| Item | Value |
|------|--------|
| Base URL (env) | `BASE_URL` in `.env`, default QA `https://api-qa.symbiotes.co.uk/api/v1/` |
| Request | `POST` relative path `auth/login` (no leading `/` — see **Base URL gotcha** below) |
| Body | `{ "email", "password" }` from `LOGIN_EMAIL` / `LOGIN_PASSWORD` |

**Secrets:** Do not commit passwords. Copy `.env.example` → `.env`, set `LOGIN_EMAIL` and `LOGIN_PASSWORD`. `.env` is listed in `.gitignore`.

**QA demo emails (seeded):** see [`tests/data/qa-seeded-accounts.md`](tests/data/qa-seeded-accounts.md) — same shared demo password for all rows; use any row’s email in `LOGIN_EMAIL` depending on the org/branch scenario you are testing.

**Playwright `baseURL` gotcha:** If `BASE_URL` is `https://host/api/v1` **without** a trailing slash, then a relative URL like `auth/login` resolves to `https://host/api/auth/login` (wrong). This project **normalizes** `BASE_URL` to always end with `/` in `config/env.js`.

**CI:** Workflow can pass `SYMBIOTE_LOGIN_EMAIL` and `SYMBIOTE_LOGIN_PASSWORD` repository secrets. If they are missing, the login test **skips** so the job still passes.

**Login email normalization:** Smoke sends **uppercase** `LOGIN_EMAIL` (after trim) and expects the same OTP challenge as lowercase — API should lowercase before lookup. **`tests/api/negative/auth.login.negative.spec.js`** includes **spaces/tabs + uppercase** when **`RUN_PADDED_LOGIN_EMAIL_TEST=1`** (skipped by default; QA may return **422** until the API trims before validation).

---

## 2) How execution works (simple flow)

When you run a command like `npm run test:smoke`, this happens:

1. `package.json` script calls Playwright with a tag filter.
2. Playwright loads `playwright.config.js`.
3. `playwright.config.js` loads `config/env.js`.
4. `config/env.js` reads values from `.env` (if present).
5. Matching test files under `tests/` are executed.
6. Reports are written to `reports/` (HTML, JUnit, and test-results).

Think of it as:

`npm script -> Playwright config -> environment config -> tests -> reports`

---

## 2b) API responses in the HTML report

After a run, open **`npm run report:open`**. Each test that called the API can have an attachment **`api-response.json`** with optional **`request`** (payload you sent) and **`body`** (response JSON). Values are copied into the attachment as-is (treat reports as sensitive if they include passwords or tokens). Nothing is printed to the terminal.

---

## 2c) Which tests actually ran?

Playwright’s **HTML report only lists tests that were executed in that run.** Anything filtered out by `--grep` is not shown.

| Command | What runs | Typical count (today) |
|---------|-----------|------------------------|
| **`npm test`** or **`npm run test:api`** | Everything under `tests/api` (smoke + negative + regression) | 40 |
| **`npm run test:smoke-and-negative`** | Titles matching `@smoke` **or** `@negative` | 25 |
| **`npm run test:smoke`** | **Only** `@smoke` (happy-path tests) | 5 |
| **`npm run test:negative`** | **Only** `@negative` | 20 |
| **`npm run test:regression`** or **`npm run test:manager-report`** | **Only** `@regression` (QA matrix for managers) | 15 |

If you use **`npm run test:smoke`** and open the report, you will **not** see negative tests — that is expected, because they were never executed.

Smoke specs live under **`tests/api/smoke/`**, negatives under **`tests/api/negative/`** (separate files). Use **`npm test`** or **`npm run test:smoke-and-negative`** to see both in one report.

**See the list without running:**

```bash
npm run test:list
npm run test:smoke:list
npm run test:negative:list
```

In the terminal summary:

- `ok N` = executed and passed  
- `x N` = executed and failed  
- `- N` = **skipped** (often missing `LOGIN_*` in `.env` for the auth test)

---

## 3) Folder structure and what each part does

```text
.
|-- .github/
|   `-- workflows/
|       `-- api-tests.yml
|-- config/
|   `-- env.js
|-- helpers/
|   |-- apiClient.js
|   |-- apiResponseReport.js
|   |-- assertions.js
|   |-- assertions.auth.js
|   |-- auth.js
|   `-- testData.js
|-- reports/
|-- tests/
|   |-- api/
|   |   |-- negative/
|   |   |   |-- auth.login.negative.spec.js
|   |   |   |-- auth.refresh.negative.spec.js
|   |   |   |-- auth.send-otp.negative.spec.js
|   |   |   `-- auth.verify-otp.negative.spec.js
|   |   |-- regression/
|   |   |   `-- qa-auth-matrix.spec.js
|   |   `-- smoke/
|   |       |-- auth.login.spec.js
|   |       |-- auth.refresh.spec.js
|   |       |-- auth.send-otp.spec.js
|   |       `-- auth.verify-otp.spec.js
|   |-- contracts/
|   `-- data/
|       |-- qa-seeded-accounts.md
|       `-- qa-test-matrix.md
|-- .env.example
|-- .gitignore
|-- package.json
|-- playwright.config.js
`-- README.md
```

### `.gitignore`
Ignores `node_modules/`, `.env`, and generated report folders so secrets and clutter are not committed.

### `.github/workflows/api-tests.yml`
CI pipeline definition:
- Runs on pull request and manual trigger
- Installs dependencies
- Runs smoke placeholders
- Uploads reports as artifacts

### `config/env.js`
Central place for environment variables:
- Loads `.env` using `dotenv`
- Exposes defaults if values are missing
- Keeps config logic out of test files

### `helpers/`
Reusable building blocks:
- `apiClient.js`: request wrapper skeleton for shared request behavior
- `apiResponseReport.js`: clone payloads and attach API responses to the HTML report
- `auth.js`: authentication header/token skeleton
- `assertions.js`: generic HTTP/JSON/error-envelope helpers (reuse for any API)
- `assertions.auth.js`: Symbiote auth response contracts (login, send-otp, verify-otp, refresh)
- `testData.js`: test data factory helpers

These keep test specs clean and readable.

### `tests/api/`
- **`smoke/`** — quick happy-path checks (`@smoke` in describe title).
- **`negative/`** — invalid input / error responses (`@negative`).
- **`regression/`** — broader suites (`@regression`).
- **`contracts/`** / **`data/`** (under `tests/`): reserved.

**Naming cheat sheet:**

| You choose… | Pattern | Example |
|-------------|---------|---------|
| **Spec file** | Place under `smoke/` or `negative/`; optional `.negative` suffix for error-only files | `smoke/auth.login.spec.js`, `negative/auth.login.negative.spec.js` |
| **`test.describe`** | Feature + tag for grep | `Login @smoke`, `Login @negative` |
| **`test('...')`** | Short | `OTP challenge` / `Wrong password → 401` |

### `tests/contracts/`
Reserved for future schema/contract validation tests using `ajv`.

### `tests/data/`
Static reference and fixtures (JSON payloads, etc.). Includes **`qa-seeded-accounts.md`** (seeded emails) and **`qa-test-matrix.md`** (links matrix rows to `qa-auth-matrix.spec.js`).

### `reports/`
Generated test outputs:
- HTML report
- JUnit report
- Raw test results

---

## 4) Files you will use most often

### `package.json`
Important scripts:
- `npm test` -> full **`tests/api`** run (smoke + negative + regression QA matrix); use this for a complete report
- `npm run pw:install` -> installs Playwright runtime/browsers
- `npm run test:smoke` -> **only** `@smoke` (fast gate; report will **not** list negatives)
- `npm run test:negative` -> **only** `@negative`
- `npm run test:smoke-and-negative` -> `@smoke` **or** `@negative` (no regression)
- `npm run test:regression` / `npm run test:manager-report` -> **`@regression`** QA auth matrix (good for manager HTML report)
- `npm run test:api` -> same scope as `npm test` here
- `npm run report:open` -> opens last HTML report

### `playwright.config.js`
Main runner configuration:
- global timeouts
- retries (higher on CI)
- reporters (`list`, `html`, `junit`)
- `baseURL` from environment
- tag-ready filtering setup (`grep`, `grepInvert` support)

### `.env.example`
Template of required keys (no secrets):
- `BASE_URL`
- `API_TIMEOUT_MS`
- `AUTH_TYPE`
- `VERIFY_OTP` — code for verify-otp smoke after send-otp (QA often `111111`)

---

## 5) Prerequisites

- Node.js 18+ (Node.js 20 recommended)
- npm 9+

Check versions:
```bash
node -v
npm -v
```

---

## 6) First-time setup

1. Install packages:
   ```bash
   npm install
   ```

2. Install Playwright runtime:
   ```bash
   npm run pw:install
   ```

3. Create your env file:
   - PowerShell:
     ```powershell
     Copy-Item .env.example .env
     ```
   - Bash:
     ```bash
     cp .env.example .env
     ```

4. Update `.env` values for your local/test environment.

---

## 7) Run commands (daily usage)

### Run smoke placeholders
```bash
npm run test:smoke
```

### Run QA matrix / manager report (`@regression`)
```bash
npm run test:regression
# alias:
npm run test:manager-report
npm run report:open
```

Optional `.env` for full matrix: **`PROTECTED_API_PATH`** (row 14), **`TIER3_MEMBER_EMAIL`** (row 15). See `.env.example` and [`tests/data/qa-test-matrix.md`](tests/data/qa-test-matrix.md).

### Run all API placeholders
```bash
npm run test:api
```

### Open HTML report
```bash
npm run report:open
```

---

## 8) Test tagging strategy

Current placeholder tags:
- `@smoke`
- `@regression`
- `@negative`

Why tags matter:
- Easy suite targeting in local and CI runs
- Fast selective execution
- Cleaner long-term test organization

TODO guideline:
- Keep at least one meaningful tag per test title.

---

## 9) CI workflow behavior

`api-tests.yml` currently does:
1. Checkout code
2. Setup Node.js
3. `npm ci`
4. Install Playwright runtime
5. Run smoke placeholder suite
6. Upload reports

This is enough to keep the project merge-safe while real tests are still being added.

---

## 10) Current status (important)

What is ready:
- Project setup and dependencies
- Config and environment handling (including `BASE_URL` trailing-slash normalization)
- Folder structure
- Helpers (`apiClient`, `assertions`, `auth`, `testData`)
- **Auth API tests:** `tests/api/smoke/` + `tests/api/negative/` (`auth.login`, `auth.send-otp`, `auth.verify-otp`, `auth.refresh`)
- **Regression:** [`tests/api/regression/qa-auth-matrix.spec.js`](tests/api/regression/qa-auth-matrix.spec.js) (`@regression`, 15 scenarios)
- CI baseline (smoke; login skipped unless repo secrets or local `.env` has creds)
- Documentation

What is intentionally light / next:
- Storing bearer token in `helpers/auth.js` for follow-on API calls
- Schema files and contract checks in `tests/contracts`

---

## 11) How to add the next real test

1. Pick the next endpoint (keep using `createApiClient` from `helpers/apiClient.js`).
2. Use a **relative** path (e.g. `users/me`) so it appends to `BASE_URL` correctly.
3. Add or reuse generic assertions in `helpers/assertions.js`; put endpoint-specific shapes in `helpers/assertions.<area>.js` (see `assertions.auth.js`).
4. When login returns a JWT, extend `helpers/auth.js` and pass headers into `createApiClient`.
5. Tag with `@smoke`, `@regression`, or `@negative` and run the matching npm script.

---

## 12) Notes for beginners

- Keep helpers generic; keep business rules in specs.
- Avoid copying request setup into every test.
- Add small changes and run often.
- Prefer readable names over clever code.
- Keep this README updated as your team conventions evolve.

---

## 12b) Troubleshooting: smoke shows skipped tests

If the terminal shows **one or more skipped** auth smoke tests and no failure, Playwright did run — those cases **skipped** because credentials are missing.

**Cause:** `LOGIN_EMAIL` or `LOGIN_PASSWORD` is empty in `.env` (common right after cloning or using `.env.example` as a template). Login, send-otp, verify-otp, and refresh smoke flows all require these values.

**Fix:** Open `.env` and set QA credentials:

```env
LOGIN_EMAIL=your.user@demo.com
LOGIN_PASSWORD=YourPasswordHere
```

- Do not wrap values in quotes unless needed.
- Save the file, then run `npm run test:smoke` again.

You should see the **@smoke** auth tests pass once `LOGIN_*` are set. In **@negative** login, the **spaced + uppercase email** case stays **skipped** until **`RUN_PADDED_LOGIN_EMAIL_TEST=1`** (when the API trims email before validation).

---

## 12c) Troubleshooting: report shows only smoke tests (no negative)

**Cause:** You ran **`npm run test:smoke`**, which uses **`--grep @smoke`**. Only the smoke cases run; negative tests are filtered out and **do not appear** in the report.

**Fix:** Run one of:

```bash
npm test
npm run test:smoke-and-negative
npm run test:api
```

Then open **`npm run report:open`** — smoke and negative suites both appear (as separate groups in the report).

---

## 12d) Troubleshooting: `expectSuccessStatus` fails on `send-otp` / `verify-otp`

**Symptom:** `response.ok()` is false, often at **`POST auth/send-otp`** (smoke `auth.send-otp`, `auth.verify-otp`, `auth.refresh`, or negatives that call `send-otp` after login).

**Cause A — server error:** The API returns **5xx** (e.g. **500 Internal server error** on **`POST /auth/send-otp`**). That is a **backend/QA** problem, not a wrong assertion in this repo. Failures now include **`Expected 2xx, got HTTP … — Internal server error.`** (or `error.code`) when the response body is passed into `expectSuccessStatus`.

**Workaround until QA is fixed:** In `.env` set **`SKIP_OTP_CHAIN_TESTS=1`** (see `.env.example`). That skips smoke/negative cases that require a working `send-otp` chain. Remove it once `send-otp` returns 2xx again.

**Cause B — parallel load:** With **many Playwright workers**, several tests can call **`send-otp`** for the **same** `LOGIN_EMAIL` at once. The service may respond with **429**, cooldown, or inconsistent results. **Mitigation:** run with one worker, e.g. set **`PW_WORKERS=1`** in the environment (see `playwright.config.js`) or `npx playwright test --workers=1`.

**Cause C — OTP config:** If **`send-otp` succeeds** but **`verify-otp` fails**, check **`VERIFY_OTP`** in `.env` matches your QA static OTP (default in `config/env.js` is `111111` only if that matches your environment).

---

## 13) Quick command reference

```bash
npm install
npm run pw:install
npm test
npm run test:smoke
npm run test:negative
npm run test:smoke-and-negative
npm run test:regression
npm run test:api
npm run report:open
```

---

## 14) Next steps checklist

- [ ] Add real auth implementation in `helpers/auth.js`
- [ ] Add robust request wrapper behavior in `helpers/apiClient.js`
- [ ] Add more specs under `tests/api/smoke/` and `tests/api/negative/`
- [ ] Add shared test data factories in `helpers/testData.js`
- [ ] Add contract schemas and tests in `tests/contracts`
- [ ] Expand CI to include regression suite when stable
