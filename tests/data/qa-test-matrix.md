# QA test matrix ↔ automation

Stakeholder scenarios are implemented in **`tests/api/regression/qa-auth-matrix.spec.js`** (`@regression`).

**Run for manager report:**

```bash
npm run test:regression
npx playwright show-report reports/html
```

Use **`PW_WORKERS=1`** if many OTP steps flake on one QA user. Respect **`SKIP_OTP_CHAIN_TESTS`** / **`PROTECTED_API_PATH`** / **`TIER3_MEMBER_EMAIL`** as documented in `.env.example` and the main README.

| # | Scenario | Spec title prefix |
|---|----------|-------------------|
| 1 | Valid login with seeded email/password | `[1]` |
| 2 | Login with uppercase email (lookup normalizes case) | `[2]` |
| 3 | Wrong password → 401 | `[3]` |
| 4 | Unknown email → 401 | `[4]` |
| 5 | send-otp EMAIL success | `[5]` |
| 6 | send-otp SMS → 400 | `[6]` |
| 7 | verify-otp after send-otp | `[7]` |
| 8 | verify-otp before send-otp → 400 | `[8]` |
| 9 | Wrong OTP → 401 | `[9]` |
| 10 | verify-otp twice → 400 | `[10]` |
| 11 | refresh with JSON refreshToken | `[11]` |
| 12 | refresh with cookie only | `[12]` |
| 13 | Malformed refresh → 401 | `[13]` |
| 14 | Protected route + invalid JWT → 401 | `[14]` |
| 15 | Tier 3 member + branch context | `[15]` |

Smaller **@smoke** / **@negative** specs still cover many of the same APIs for day-to-day runs; the regression file exists so one Playwright report lines up with this matrix.
