const { env } = require('../config/env');

/** @returns {string | null} Skip reason for test.skip(), or null when OTP-chain tests should run */
function otpChainTestsSkippedReason() {
  if (!env.SKIP_OTP_CHAIN_TESTS) return null;
  return 'SKIP_OTP_CHAIN_TESTS is set — needs working POST /auth/send-otp (unset when QA OTP is fixed)';
}

module.exports = { otpChainTestsSkippedReason };
