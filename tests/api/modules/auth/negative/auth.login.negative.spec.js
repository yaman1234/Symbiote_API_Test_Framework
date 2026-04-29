const { test, expect } = require('@playwright/test');
const { env } = require('../../../../../config/env');
const { createApiClient } = require('../../../../../helpers/apiClient');
const {
  expectJsonContentType,
  expectHttpStatus,
  expectSuccessStatus
} = require('../../../../../helpers/assertions');
const {
  expectAuthInvalidCredentialsBody,
  expectAuthValidationErrorBody,
  expectAuthLoginOtpSuccessBody
} = require('../../../../../helpers/assertions.auth');
const { publishApiResponse } = require('../../../../../helpers/apiResponseReport');

const KNOWN_EMAIL = 't3.owner@demo.com';
const WRONG_PASSWORD = 'DefinitelyWrong#NotReal99';
const UNKNOWN_EMAIL = 'nonexistent.user@demo.com';

test.describe('Login', () => {
  async function postLogin(payload, testInfo) {
    const client = await createApiClient();
    try {
      const response = await client.post('auth/login', { data: payload });
      const body = await response.json();
      await publishApiResponse(testInfo, {
        urlHint: 'login',
        response,
        loginEmail: payload.email,
        status: response.status(),
        statusText: response.statusText(),
        body,
        requestPayload: payload
      });
      return { response, body };
    } finally {
      await client.dispose();
    }
  }

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('[AUTH-LOGIN-002] : Invalid password returns 401 Unauthorized → 401', async ({}, testInfo) => {
    const { response, body } = await postLogin(
      { email: KNOWN_EMAIL, password: WRONG_PASSWORD },
      testInfo
    );
    expectHttpStatus(response, 401);
    expectJsonContentType(response);
    expectAuthInvalidCredentialsBody(body);
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('[AUTH-LOGIN-003] : Unknown email returns 401 Unauthorized → 401', async ({}, testInfo) => {
    const { response, body } = await postLogin(
      { email: UNKNOWN_EMAIL, password: WRONG_PASSWORD },
      testInfo
    );
    expectHttpStatus(response, 401);
    expectJsonContentType(response);
    expectAuthInvalidCredentialsBody(body);
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('[AUTH-LOGIN-004] : Missing email returns 422 Validation Error → 422', async ({}, testInfo) => {
    const { response, body } = await postLogin({ password: 'x' }, testInfo);
    expectHttpStatus(response, 422);
    expectJsonContentType(response);
    expectAuthValidationErrorBody(body, 'email');
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('[AUTH-LOGIN-005] : Missing password returns 422 Validation Error → 422', async ({}, testInfo) => {
    const { response, body } = await postLogin({ email: KNOWN_EMAIL }, testInfo);
    expectHttpStatus(response, 422);
    expectJsonContentType(response);
    expectAuthValidationErrorBody(body, 'password');
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('[AUTH-LOGIN-006] : Invalid email format returns 422 Validation Error → 422', async ({}, testInfo) => {
    const { response, body } = await postLogin(
      { email: 'not-an-email', password: 'SomePassword1!' },
      testInfo
    );
    expectHttpStatus(response, 422);
    expectJsonContentType(response);
    expectAuthValidationErrorBody(body);
  });

  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.


  test('[AUTH-LOGIN-007] : Empty password returns 422 Validation Error → 422', async ({}, testInfo) => {
    const { response, body } = await postLogin(
      { email: KNOWN_EMAIL, password: '' },
      testInfo
    );
    expectHttpStatus(response, 422);
    expectJsonContentType(response);
    expectAuthValidationErrorBody(body);
  });

  /** Contract: padded + uppercase email succeeds once API trims before validation (not default smoke). */
  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.

  test('[AUTH-LOGIN-008] : Trimmed email with extra spaces is accepted → 200', async ({}, testInfo) => {
    test.skip(!env.LOGIN_EMAIL || !env.LOGIN_PASSWORD, 'Set LOGIN_EMAIL and LOGIN_PASSWORD in .env');

    const messyEmail = `  ${env.LOGIN_EMAIL}   `;

    const client = await createApiClient();
    try {
      const requestPayload = { email: messyEmail, password: env.LOGIN_PASSWORD };
      const response = await client.post('auth/login', { data: requestPayload });
      const body = await response.json();
      await publishApiResponse(testInfo, {
        urlHint: 'login',
        response,
        loginEmail: requestPayload.email,
        status: response.status(),
        statusText: response.statusText(),
        body,
        requestPayload
      });
      expectSuccessStatus(response, body);
      expectJsonContentType(response);
      expectAuthLoginOtpSuccessBody(body);
    } finally {
      await client.dispose();
    }
  });
  // Checks: HTTP status and JSON content-type, then validates success/error contract and key scenario fields.

  test('[AUTH-LOGIN-009] : Uppercase email is accepted → 200', async ({}, testInfo) => {
    test.skip(!env.LOGIN_EMAIL || !env.LOGIN_PASSWORD, 'Set LOGIN_EMAIL and LOGIN_PASSWORD in .env');

    const client = await createApiClient();
    try {
      const requestPayload = {
        email: env.LOGIN_EMAIL.toUpperCase(),
        password: env.LOGIN_PASSWORD
      };
      const response = await client.post('auth/login', { data: requestPayload });
      const body = await response.json();
      await publishApiResponse(testInfo, {
        urlHint: 'login',
        response,
        loginEmail: requestPayload.email,
        status: response.status(),
        statusText: response.statusText(),
        body,
        requestPayload
      });
      expectSuccessStatus(response, body);
      expectJsonContentType(response);
      expectAuthLoginOtpSuccessBody(body);
    } finally {
      await client.dispose();
    }
  });
});
