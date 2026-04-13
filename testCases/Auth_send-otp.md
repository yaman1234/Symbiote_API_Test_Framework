# `POST /auth/send-otp`

---

## AUTH-SENDOTP-001

- **TC_ID:** AUTH-SENDOTP-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/smoke/auth.send-otp.spec.js`  
- **Scenario:** After login, send OTP with EMAIL  
- **Expected:** Login **200**; send-otp **200**  
- **Checks:**
  - Login: `expectSuccessStatus`, JSON type, `expectAuthLoginOtpSuccessBody`  
  - Send-otp: `expectSuccessStatus`, JSON type, `expectAuthSendOtpSuccessBody` (`OTP generated.`, non-empty `data.delivery.type`, `data.delivery.masked`, `data.expiresInSeconds`)  

---

## AUTH-SENDOTP-002

- **TC_ID:** AUTH-SENDOTP-002  
- **Suite:** Negative  
- **Spec_File:** `tests/api/negative/auth.send-otp.negative.spec.js`  
- **Scenario:** Missing `loginAttemptId`  
- **Expected:** HTTP **422**  
- **Checks:**
  - `expectHttpStatus` 422  
  - JSON `Content-Type`  
  - `expectAuthSendOtpValidationErrorBody` with **`loginAttemptId`** in `error.details`  

---

## AUTH-SENDOTP-003

- **TC_ID:** AUTH-SENDOTP-003  
- **Suite:** Negative  
- **Spec_File:** `tests/api/negative/auth.send-otp.negative.spec.js`  
- **Scenario:** Empty `loginAttemptId`  
- **Expected:** HTTP **422**  
- **Checks:** Same validation helper; non-empty details (no field pin in call)  

---

## AUTH-SENDOTP-004

- **TC_ID:** AUTH-SENDOTP-004  
- **Suite:** Negative  
- **Spec_File:** `tests/api/negative/auth.send-otp.negative.spec.js`  
- **Scenario:** SMS not supported  
- **Expected:** HTTP **400**  
- **Checks:**
  - `expectHttpStatus` 400  
  - JSON `Content-Type`  
  - `expectAuthSendOtpBadRequestBody`: `BAD_REQUEST`, `message` = `Only EMAIL is supported for now.`, `error.key` = AUTH_FORBIDDEN  

---

## AUTH-SENDOTP-005

- **TC_ID:** AUTH-SENDOTP-005  
- **Suite:** Negative  
- **Spec_File:** `tests/api/negative/auth.send-otp.negative.spec.js`  
- **Scenario:** Invalid `loginAttemptId` UUID  
- **Expected:** HTTP **400**  
- **Checks:** `BAD_REQUEST`, `message` = `Invalid loginAttemptId.`, `error.key` = AUTH_FORBIDDEN  

---

## AUTH-SENDOTP-006

- **TC_ID:** AUTH-SENDOTP-006  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/qa-auth-matrix.spec.js`  
- **Scenario:** [5] Valid `loginAttemptId` + EMAIL  
- **Expected:** HTTP **200**  
- **Checks:** Login OTP body + send-otp success body (same as AUTH-SENDOTP-001 send step)  

---

## AUTH-SENDOTP-007

- **TC_ID:** AUTH-SENDOTP-007  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/qa-auth-matrix.spec.js`  
- **Scenario:** [6] SMS method  
- **Expected:** HTTP **400**  
- **Checks:** Same as AUTH-SENDOTP-004  
