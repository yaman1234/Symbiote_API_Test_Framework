/**
 * Symbiote auth — thin wrappers over helpers/assertions.js (envelope + important non-empty fields).
 */
const { expect } = require('@playwright/test');
const { expectJsonSuccessBody, expectJsonErrorBody } = require('./assertions');

const AUTH_LOGIN_META_PATH = '/api/v1/auth/login';
const AUTH_SEND_OTP_META_PATH = '/api/v1/auth/send-otp';
const AUTH_VERIFY_OTP_META_PATH = '/api/v1/auth/verify-otp';
const AUTH_REFRESH_META_PATH = '/api/v1/auth/refresh';

function expectAuthLoginOtpSuccessBody(body) {
  expectJsonSuccessBody(body, {
    message: 'OTP required.',
    nonEmptyPaths: [
      'data.loginAttemptId',
      'data.methods',
      'data.methods.0.type',
      'data.expiresInSeconds'
    ]
  });
  expect(body.data.methods.some((m) => m.type === 'EMAIL')).toBeTruthy();
}

function expectAuthInvalidCredentialsBody(body) {
  expectJsonErrorBody(body, {
    statusCode: 401,
    errorCode: 'UNAUTHORIZED',
    message: 'Incorrect email or password.'
  });
}

function expectAuthValidationErrorBody(body, detailsField) {
  expectJsonErrorBody(body, {
    statusCode: 422,
    errorCode: 'VALIDATION_ERROR',
    message: 'Validation failed.',
    requireDetails: true,
    ...(detailsField != null ? { detailsField } : {})
  });
}

function expectAuthSendOtpSuccessBody(body) {
  expectJsonSuccessBody(body, {
    message: 'OTP generated.',
    nonEmptyPaths: [
      'data.delivery.type',
      'data.delivery.masked',
      'data.expiresInSeconds'
    ]
  });
}

function expectAuthSendOtpValidationErrorBody(body, detailsField) {
  expectJsonErrorBody(body, {
    statusCode: 422,
    errorCode: 'VALIDATION_ERROR',
    message: 'Validation failed.',
    requireDetails: true,
    ...(detailsField != null ? { detailsField } : {})
  });
}

/** @param {object} body
 * @param {{ message?: string, errorKey?: string }} [opts]
 */
function expectAuthSendOtpBadRequestBody(body, opts = {}) {
  expectJsonErrorBody(body, {
    statusCode: 400,
    errorCode: 'BAD_REQUEST',
    ...(opts.message != null ? { message: opts.message } : {}),
    ...(opts.errorKey != null ? { errorKey: opts.errorKey } : {})
  });
}

function expectAuthVerifyOtpSuccessBody(body) {
  expectJsonSuccessBody(body, {
    message: 'Login successful.',
    nonEmptyPaths: [
      'data.accessToken',
      'data.refreshToken',
      'data.tokenType',
      'data.expiresInSeconds',
      'data.account.id',
      'data.org.id',
      'data.org.orgUserId',
      'data.org.orgRole'
    ]
  });
}

function expectAuthVerifyOtpValidationErrorBody(body, detailsField) {
  expectJsonErrorBody(body, {
    statusCode: 422,
    errorCode: 'VALIDATION_ERROR',
    message: 'Validation failed.',
    requireDetails: true,
    ...(detailsField != null ? { detailsField } : {})
  });
}

function expectAuthVerifyOtpInvalidOtpBody(body) {
  expectJsonErrorBody(body, {
    statusCode: 401,
    errorCode: 'UNAUTHORIZED',
    message: 'Invalid OTP.',
    errorKey: 'AUTH_INVALID_CREDENTIALS'
  });
}

function expectAuthVerifyOtpBadRequestBody(body, expectedMessage, errorKey) {
  expectJsonErrorBody(body, {
    statusCode: 400,
    errorCode: 'BAD_REQUEST',
    message: expectedMessage,
    ...(errorKey != null ? { errorKey } : {})
  });
}

function expectAuthRefreshSuccessBody(body) {
  expectJsonSuccessBody(body, {
    message: 'Token refreshed.',
    nonEmptyPaths: [
      'data.accessToken',
      'data.refreshToken',
      'data.tokenType',
      'data.expiresInSeconds'
    ]
  });
}

function expectAuthRefreshInvalidBody(body) {
  expectJsonErrorBody(body, {
    statusCode: 401,
    errorCode: 'UNAUTHORIZED',
    message: 'Authentication required.',
    errorKey: 'AUTH_REFRESH_INVALID'
  });
}

const FORGOT_PASSWORD_GENERIC_MESSAGE =
  'If an account exists for this email, a reset link has been sent.';

function expectForgotPasswordGenericSuccessBody(body) {
  expectJsonSuccessBody(body, {
    message: FORGOT_PASSWORD_GENERIC_MESSAGE,
    nonEmptyPaths: []
  });
}

function expectPasswordActionValidateSuccessBody(body, expectedPurpose) {
  expectJsonSuccessBody(body, {
    message: 'Token is valid.',
    nonEmptyPaths: ['data.valid', 'data.purpose', 'data.email', 'data.expiresAt']
  });
  expect(body.data.valid).toBe(true);
  expect(body.data.purpose).toBe(expectedPurpose);
  expect(typeof body.data.email).toBe('string');
  expect(body.data.email.length).toBeGreaterThan(0);
}

function expectSetPasswordSuccessBody(body, expectedPurpose) {
  expectJsonSuccessBody(body, {
    message: 'Password set successfully.',
    nonEmptyPaths: ['data.purpose']
  });
  expect(body.data.purpose).toBe(expectedPurpose);
}

/** 400 responses from password-action / set-password flows (BAD_REQUEST envelope). */
function expectAuthPasswordActionBadRequestBody(body, message) {
  expectJsonErrorBody(body, {
    statusCode: 400,
    errorCode: 'BAD_REQUEST',
    message
  });
}

module.exports = {
  expectAuthLoginOtpSuccessBody,
  expectAuthInvalidCredentialsBody,
  expectAuthValidationErrorBody,
  expectAuthSendOtpSuccessBody,
  expectAuthSendOtpValidationErrorBody,
  expectAuthSendOtpBadRequestBody,
  expectAuthVerifyOtpSuccessBody,
  expectAuthVerifyOtpValidationErrorBody,
  expectAuthVerifyOtpInvalidOtpBody,
  expectAuthVerifyOtpBadRequestBody,
  expectAuthRefreshSuccessBody,
  expectAuthRefreshInvalidBody,
  expectForgotPasswordGenericSuccessBody,
  expectPasswordActionValidateSuccessBody,
  expectSetPasswordSuccessBody,
  expectAuthPasswordActionBadRequestBody,
  FORGOT_PASSWORD_GENERIC_MESSAGE,
  AUTH_LOGIN_META_PATH,
  AUTH_SEND_OTP_META_PATH,
  AUTH_VERIFY_OTP_META_PATH,
  AUTH_REFRESH_META_PATH
};
