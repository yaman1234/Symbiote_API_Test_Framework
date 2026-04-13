const { expectSuccessStatus, expectJsonContentType } = require('./assertions');
const { expectAuthLoginOtpSuccessBody } = require('./assertions.auth');
const { publishApiResponse } = require('./apiResponseReport');

/**
 * POST auth/login, publish report, assert OTP-required success.
 * @param {object} client — return value of createApiClient()
 * @param {object} testInfo — Playwright TestInfo
 * @param {{ email: string, password: string }} loginRequest
 * @returns {Promise<{ loginBody: object }>}
 */
async function postLoginExpectOtpChallenge(client, testInfo, loginRequest) {
  const loginRes = await client.post('auth/login', { data: loginRequest });
  const loginBody = await loginRes.json();
  await publishApiResponse(testInfo, {
    urlHint: 'login',
    status: loginRes.status(),
    statusText: loginRes.statusText(),
    body: loginBody,
    requestPayload: loginRequest
  });
  expectSuccessStatus(loginRes, loginBody);
  expectJsonContentType(loginRes);
  expectAuthLoginOtpSuccessBody(loginBody);
  return { loginBody };
}

module.exports = { postLoginExpectOtpChallenge };
