const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function normalizeBaseUrl(url) {
  if (!url) return url;
  return url.endsWith('/') ? url : `${url}/`;
}

const rawBase =
  process.env.BASE_URL || 'https://api-qa.symbiotes.co.uk/api/v1/';

const env = {
  // Trailing `/` required so relative paths like `auth/login` resolve to .../v1/auth/login, not .../api/auth/login
  BASE_URL: normalizeBaseUrl(rawBase),
  API_TIMEOUT_MS: Number(process.env.API_TIMEOUT_MS || 30000),
  AUTH_TYPE: process.env.AUTH_TYPE || 'none',
  LOGIN_EMAIL: process.env.LOGIN_EMAIL || '',
  LOGIN_PASSWORD: process.env.LOGIN_PASSWORD || '',
  // QA test OTP for POST /auth/verify-otp (after send-otp); override if your env uses another code
  VERIFY_OTP: process.env.VERIFY_OTP || '111111',
  // When true, skips tests that need a successful POST /auth/send-otp (e.g. QA returns 5xx on that route)
  SKIP_OTP_CHAIN_TESTS:
    process.env.SKIP_OTP_CHAIN_TESTS === '1' ||
    process.env.SKIP_OTP_CHAIN_TESTS === 'true',
  // When true, runs login smoke that sends leading/trailing whitespace + uppercase email (requires API trim-before-validation)
  RUN_PADDED_LOGIN_EMAIL_TEST:
    process.env.RUN_PADDED_LOGIN_EMAIL_TEST === '1' ||
    process.env.RUN_PADDED_LOGIN_EMAIL_TEST === 'true',
  // QA matrix [14]: GET path relative to BASE_URL (no leading /), e.g. accounts/me
  PROTECTED_API_PATH: process.env.PROTECTED_API_PATH || '',
  // QA matrix [15]: Tier 3 branch member (e.g. t3.emp1@demo.com); password falls back to LOGIN_PASSWORD
  TIER3_MEMBER_EMAIL: process.env.TIER3_MEMBER_EMAIL || '',
  TIER3_MEMBER_PASSWORD: process.env.TIER3_MEMBER_PASSWORD || '',
  // GET /orgs/:orgId/users — pick rows from tests/data/qa-seeded-accounts.md; passwords default to LOGIN_PASSWORD
  USER_MGMT_OWNER_EMAIL: process.env.USER_MGMT_OWNER_EMAIL || '',
  USER_MGMT_OWNER_PASSWORD: process.env.USER_MGMT_OWNER_PASSWORD || '',
  USER_MGMT_EMPLOYEE_EMAIL: process.env.USER_MGMT_EMPLOYEE_EMAIL || '',
  USER_MGMT_EMPLOYEE_PASSWORD: process.env.USER_MGMT_EMPLOYEE_PASSWORD || '',
  USER_MGMT_SUPERVISOR_EMAIL: process.env.USER_MGMT_SUPERVISOR_EMAIL || '',
  USER_MGMT_SUPERVISOR_PASSWORD: process.env.USER_MGMT_SUPERVISOR_PASSWORD || '',
  // POST /orgs/:orgId/users — branch UUID for create-user smoke; optional comma-separated department UUIDs
  USER_CREATE_BRANCH_ID: process.env.USER_CREATE_BRANCH_ID || '',
  USER_CREATE_DEPARTMENT_IDS: process.env.USER_CREATE_DEPARTMENT_IDS || '',
  // Branch UUID not equal to supervisor's branch (e.g. Tier 3 branch-2) — regression: supervisor cannot create there
  USER_CREATE_WRONG_BRANCH_ID: process.env.USER_CREATE_WRONG_BRANCH_ID || '',
  // Optional: raw token from forgot-password or invite email — enables password-action validate + set-password regression
  PASSWORD_ACTION_TOKEN_RAW: process.env.PASSWORD_ACTION_TOKEN_RAW || '',
  // Expected purpose after validate: RESET_PASSWORD | SET_PASSWORD (asserted when token env is set)
  PASSWORD_ACTION_EXPECT_PURPOSE:
    process.env.PASSWORD_ACTION_EXPECT_PURPOSE || '',
  // New password for PASSWORD_ACTION_TOKEN_RAW flow (must meet API policy; token is consumed once)
  PASSWORD_ACTION_NEW_PASSWORD: process.env.PASSWORD_ACTION_NEW_PASSWORD || ''
};

module.exports = { env };
