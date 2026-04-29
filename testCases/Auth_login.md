# `POST /auth/login`

---

## AUTH-LOGIN-001

- **TC_ID:** AUTH-LOGIN-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/auth/smoke/auth.login.spec.js`  
- **Scenario:** Valid credentials → OTP challenge  
- **Expected:** HTTP **200** (2xx), JSON  
- **Checks:**
  - `expectSuccessStatus` on response  
  - `Content-Type` contains `application/json`  
  - `expectAuthLoginOtpSuccessBody`: `success=true`, `statusCode=200`, `message` = `OTP required.`  
  - Non-empty: `data.loginAttemptId`, `data.methods`, `data.methods[0].type`, `data.expiresInSeconds`  
  - Some method has `type === "EMAIL"`  

---

## AUTH-LOGIN-002

- **TC_ID:** AUTH-LOGIN-002  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/auth/negative/auth.login.negative.spec.js`  
- **Scenario:** Invalid password returns 401 Unauthorized  
- **Expected:** HTTP **401**, JSON  
- **Checks:**
  - `expectHttpStatus` 401  
  - JSON `Content-Type`  
  - `expectAuthInvalidCredentialsBody`: `success=false`, `statusCode=401`, `error.code` = UNAUTHORIZED, `message` = `Incorrect email or password.`  

---

## AUTH-LOGIN-003

- **TC_ID:** AUTH-LOGIN-003  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/auth/negative/auth.login.negative.spec.js`  
- **Scenario:** Unknown email returns 401 Unauthorized  
- **Expected:** HTTP **401**, JSON  
- **Checks:** Same as AUTH-LOGIN-002  

---

## AUTH-LOGIN-004

- **TC_ID:** AUTH-LOGIN-004  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/auth/negative/auth.login.negative.spec.js`  
- **Scenario:** Missing email returns 422 Validation Error  
- **Expected:** HTTP **422**, JSON  
- **Checks:**
  - `expectHttpStatus` 422  
  - JSON `Content-Type`  
  - `expectAuthValidationErrorBody` with `detailsField` **email**: VALIDATION_ERROR envelope, non-empty `error.details`, row for `email`  

---

## AUTH-LOGIN-005

- **TC_ID:** AUTH-LOGIN-005  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/auth/negative/auth.login.negative.spec.js`  
- **Scenario:** Missing password returns 422 Validation Error  
- **Expected:** HTTP **422**, JSON  
- **Checks:** Same as AUTH-LOGIN-004 pattern with **`password`** in details  

---

## AUTH-LOGIN-006

- **TC_ID:** AUTH-LOGIN-006  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/auth/negative/auth.login.negative.spec.js`  
- **Scenario:** Invalid email format returns 422 Validation Error  
- **Expected:** HTTP **422**, JSON  
- **Checks:** `expectAuthValidationErrorBody` (VALIDATION_ERROR + non-empty details; no single field pinned)  

---

## AUTH-LOGIN-007

- **TC_ID:** AUTH-LOGIN-007  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/auth/negative/auth.login.negative.spec.js`  
- **Scenario:** Empty password returns 422 Validation Error  
- **Expected:** HTTP **422**, JSON  
- **Checks:** Same as AUTH-LOGIN-006  

---

## AUTH-LOGIN-008

- **TC_ID:** AUTH-LOGIN-008  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/auth/negative/auth.login.negative.spec.js`  
- **Scenario:** Trimmed email with extra spaces is accepted  
- **Expected:** HTTP **200** if API trims email before validation  
- **Checks:** Same success path as AUTH-LOGIN-001 (`expectSuccessStatus`, `expectJsonContentType`, `expectAuthLoginOtpSuccessBody`)  

---

## AUTH-LOGIN-009

- **TC_ID:** AUTH-LOGIN-009  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/auth/negative/auth.login.negative.spec.js`  
- **Scenario:** Uppercase email is accepted  
- **Expected:** HTTP **200**  
- **Checks:** Same as AUTH-LOGIN-001  

---

## AUTH-LOGIN-010

- **TC_ID:** AUTH-LOGIN-010  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/qa-auth-matrix.spec.js`  
- **Scenario:** Valid seeded login succeeds  
- **Expected:** HTTP **200**  
- **Checks:** Same as AUTH-LOGIN-001  

---

## AUTH-LOGIN-011

- **TC_ID:** AUTH-LOGIN-011  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/qa-auth-matrix.spec.js`  
- **Scenario:** Uppercase email login succeeds  
- **Expected:** HTTP **200**  
- **Checks:** Same as AUTH-LOGIN-001  

---

## AUTH-LOGIN-012

- **TC_ID:** AUTH-LOGIN-012  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/qa-auth-matrix.spec.js`  
- **Scenario:** Wrong password returns 401 Unauthorized  
- **Expected:** HTTP **401**  
- **Checks:** Same as AUTH-LOGIN-002  

---

## AUTH-LOGIN-013

- **TC_ID:** AUTH-LOGIN-013  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/qa-auth-matrix.spec.js`  
- **Scenario:** Unknown email returns 401 Unauthorized  
- **Expected:** HTTP **401**  
- **Checks:** Same as AUTH-LOGIN-002  
