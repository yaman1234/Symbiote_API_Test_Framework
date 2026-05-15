const { env } = require('../config/env');

/** @returns {string | null} Reason to skip OTP-chain tests, or null when they may run */
function otpChainTestsSkippedReason() {
  if (!env.SKIP_OTP_CHAIN_TESTS) return null;
  return 'SKIP_OTP_CHAIN_TESTS is set — needs working POST /auth/send-otp (unset when QA OTP is fixed)';
}

module.exports = { otpChainTestsSkippedReason };
