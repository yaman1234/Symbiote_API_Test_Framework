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
  TIER3_MEMBER_PASSWORD: process.env.TIER3_MEMBER_PASSWORD || ''
};

module.exports = { env };
