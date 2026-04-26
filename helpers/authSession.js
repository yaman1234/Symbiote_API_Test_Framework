/**
 * Full OTP login: POST auth/login → send-otp → verify-otp.
 * @param {object} client — API client from createApiClient()
 * @param {{ email: string, password: string, otp: string }} creds
 */
async function loginWithOtp(client, { email, password, otp }) {
  const loginEmail = typeof email === 'string' ? email.trim() : '';
  const loginRes = await client.post('auth/login', { data: { email, password } });
  const loginBody = await loginRes.json();
  if (!loginRes.ok()) {
    return { ok: false, step: 'login', status: loginRes.status(), body: loginBody, loginEmail };
  }
  const loginAttemptId = loginBody.data.loginAttemptId;
  const sendRes = await client.post('auth/send-otp', {
    data: { loginAttemptId, method: 'EMAIL' }
  });
  const sendBody = await sendRes.json();
  if (!sendRes.ok()) {
    return { ok: false, step: 'send-otp', status: sendRes.status(), body: sendBody, loginEmail };
  }
  const verifyRes = await client.post('auth/verify-otp', {
    data: { loginAttemptId, otp }
  });
  const verifyBody = await verifyRes.json();
  if (!verifyRes.ok()) {
    return { ok: false, step: 'verify-otp', status: verifyRes.status(), body: verifyBody, loginEmail };
  }
  const branch = verifyBody.data.branch;
  const branches = Array.isArray(verifyBody?.data?.branches) ? verifyBody.data.branches : [];
  const activeBranch = branches.find((b) => b && b.status === 'ACTIVE' && typeof b.id === 'string' && b.id.length > 0);
  const firstBranchWithId = branches.find((b) => b && typeof b.id === 'string' && b.id.length > 0);
  const branchId =
    branch && typeof branch.id === 'string' && branch.id.length > 0
      ? branch.id
      : (activeBranch && activeBranch.id) || (firstBranchWithId && firstBranchWithId.id) || null;
  return {
    ok: true,
    loginEmail,
    verifyBody,
    accessToken: verifyBody.data.accessToken,
    orgId: verifyBody.data.org.id,
    branchId,
    orgUserId: verifyBody.data.org.orgUserId,
    accountId: verifyBody.data.account.id
  };
}

module.exports = { loginWithOtp };
