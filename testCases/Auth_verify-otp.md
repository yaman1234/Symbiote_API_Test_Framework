# `POST /auth/verify-otp`

---

## AUTH-VERIFY-001

- **TC_ID:** AUTH-VERIFY-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/auth/smoke/auth.verify-otp.spec.js`  
- **Scenario:** Successful login-send-otp-verify flow returns tokens  
- **Expected:** Each step **200** (2xx)  
- **Checks:**
  - Login + send-otp: success + auth helpers as in other specs  
  - Verify: `expectSuccessStatus`, JSON type, `expectAuthVerifyOtpSuccessBody` (`Login successful.`, tokens, `data.account.id`, `data.org.id`, `data.org.orgUserId`, `data.org.orgRole`, expiry fields)  

---

## AUTH-VERIFY-002

- **TC_ID:** AUTH-VERIFY-002  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/auth/negative/auth.verify-otp.negative.spec.js`  
- **Scenario:** Missing OTP generation returns 400 Bad Request  
- **Expected:** HTTP **400**  
- **Checks:** `expectHttpStatus` 400; JSON; `expectAuthVerifyOtpBadRequestBody` — `BAD_REQUEST`, `OTP not generated yet.`, `error.key` AUTH_FORBIDDEN  

---

## AUTH-VERIFY-003

- **TC_ID:** AUTH-VERIFY-003  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/auth/negative/auth.verify-otp.negative.spec.js`  
- **Scenario:** Invalid OTP returns 401 Unauthorized  
- **Expected:** HTTP **401**  
- **Checks:** `expectAuthVerifyOtpInvalidOtpBody` — UNAUTHORIZED, `Invalid OTP.`, `error.key` AUTH_INVALID_CREDENTIALS  

---

## AUTH-VERIFY-004

- **TC_ID:** AUTH-VERIFY-004  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/auth/negative/auth.verify-otp.negative.spec.js`  
- **Scenario:** Missing loginAttemptId returns 422 Validation Error  
- **Expected:** HTTP **422**  
- **Checks:** `expectAuthVerifyOtpValidationErrorBody` with **`loginAttemptId`** in details  

---

## AUTH-VERIFY-005

- **TC_ID:** AUTH-VERIFY-005  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/auth/negative/auth.verify-otp.negative.spec.js`  
- **Scenario:** Missing otp returns 422 Validation Error  
- **Expected:** HTTP **422**  
- **Checks:** `expectAuthVerifyOtpValidationErrorBody` with **`otp`** in details  

---

## AUTH-VERIFY-006

- **TC_ID:** AUTH-VERIFY-006  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/auth/negative/auth.verify-otp.negative.spec.js`  
- **Scenario:** Reused OTP attempt returns 400 Bad Request  
- **Expected:** HTTP **400**  
- **Checks:** `expectAuthVerifyOtpBadRequestBody` — `OTP already used. Please login again.`, AUTH_FORBIDDEN  

---

## AUTH-VERIFY-007

- **TC_ID:** AUTH-VERIFY-007  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/qa-auth-matrix.spec.js`  
- **Scenario:** Valid static OTP after send-otp succeeds  
- **Expected:** HTTP **200**  
- **Checks:** Same as AUTH-VERIFY-001 verify step; optional note on `Set-Cookie` (not asserted)  

---

## AUTH-VERIFY-008

- **TC_ID:** AUTH-VERIFY-008  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/qa-auth-matrix.spec.js`  
- **Scenario:** Premature verify before send-otp returns 400 Bad Request  
- **Expected:** HTTP **400**  
- **Checks:** Same as AUTH-VERIFY-002  

---

## AUTH-VERIFY-009

- **TC_ID:** AUTH-VERIFY-009  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/qa-auth-matrix.spec.js`  
- **Scenario:** Wrong OTP returns 401 Unauthorized  
- **Expected:** HTTP **401**  
- **Checks:** Same as AUTH-VERIFY-003  

---

## AUTH-VERIFY-010

- **TC_ID:** AUTH-VERIFY-010  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/qa-auth-matrix.spec.js`  
- **Scenario:** Double verify on same loginAttemptId returns 400 Bad Request  
- **Expected:** HTTP **400**  
- **Checks:** Same as AUTH-VERIFY-006  

---

## AUTH-VERIFY-011

- **TC_ID:** AUTH-VERIFY-011  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/qa-auth-matrix.spec.js`  
- **Scenario:** Valid tier-3 member verify includes branch data  
- **Expected:** HTTP **200**  
- **Checks:**
  - Same as AUTH-VERIFY-001 verify body  
  - `data.org.orgRole === "MEMBER"`  
  - `data.branch` present; `data.branch.id` non-empty string  
