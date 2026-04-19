const { test, expect } = require('@playwright/test');
const { env } = require('../../../config/env');
const { createApiClient } = require('../../../helpers/apiClient');
const {
  expectJsonContentType,
  expectHttpStatus,
  expectSuccessStatus
} = require('../../../helpers/assertions');
const {
  expectAuthInvalidCredentialsBody,
  expectAuthValidationErrorBody,
  expectAuthLoginOtpSuccessBody
} = require('../../../helpers/assertions.auth');
const { publishApiResponse } = require('../../../helpers/apiResponseReport');

const KNOWN_EMAIL = 't3.owner@demo.com';
const WRONG_PASSWORD = 'DefinitelyWrong#NotReal99';
const UNKNOWN_EMAIL = 'nonexistent.user@demo.com';

test.describe('Login @negative', () => {
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

  test('Wrong password → 401', async ({}, testInfo) => {
    const { response, body } = await postLogin(
      { email: KNOWN_EMAIL, password: WRONG_PASSWORD },
      testInfo
    );
    expectHttpStatus(response, 401);
    expectJsonContentType(response);
    expectAuthInvalidCredentialsBody(body);
  });

  test('Unknown email → 401', async ({}, testInfo) => {
    const { response, body } = await postLogin(
      { email: UNKNOWN_EMAIL, password: WRONG_PASSWORD },
      testInfo
    );
    expectHttpStatus(response, 401);
    expectJsonContentType(response);
    expectAuthInvalidCredentialsBody(body);
  });

  test('Missing email → 422', async ({}, testInfo) => {
    const { response, body } = await postLogin({ password: 'x' }, testInfo);
    expectHttpStatus(response, 422);
    expectJsonContentType(response);
    expectAuthValidationErrorBody(body, 'email');
  });

  test('Missing password → 422', async ({}, testInfo) => {
    const { response, body } = await postLogin({ email: KNOWN_EMAIL }, testInfo);
    expectHttpStatus(response, 422);
    expectJsonContentType(response);
    expectAuthValidationErrorBody(body, 'password');
  });

  test('Invalid email → 422', async ({}, testInfo) => {
    const { response, body } = await postLogin(
      { email: 'not-an-email', password: 'SomePassword1!' },
      testInfo
    );
    expectHttpStatus(response, 422);
    expectJsonContentType(response);
    expectAuthValidationErrorBody(body);
  });

  test('Empty password → 422', async ({}, testInfo) => {
    const { response, body } = await postLogin(
      { email: KNOWN_EMAIL, password: '' },
      testInfo
    );
    expectHttpStatus(response, 422);
    expectJsonContentType(response);
    expectAuthValidationErrorBody(body);
  });

  /** Contract: padded + uppercase email succeeds once API trims before validation (not default smoke). */
  test('OTP challenge with spaced + uppercase email (trim before lookup)', async ({}, testInfo) => {
    test.skip(!env.LOGIN_EMAIL || !env.LOGIN_PASSWORD, 'Set LOGIN_EMAIL and LOGIN_PASSWORD in .env');

    const normalized = env.LOGIN_EMAIL.trim();
    const messyEmail = `  ${normalized.toUpperCase()}   `;

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
  test('OTP challenge with uppercase email (lowercased before lookup)', async ({}, testInfo) => {
    test.skip(!env.LOGIN_EMAIL || !env.LOGIN_PASSWORD, 'Set LOGIN_EMAIL and LOGIN_PASSWORD in .env');

    const client = await createApiClient();
    try {
      const requestPayload = {
        email: env.LOGIN_EMAIL.trim().toUpperCase(),
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
