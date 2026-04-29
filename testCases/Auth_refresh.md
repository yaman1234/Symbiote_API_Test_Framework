# `POST /auth/refresh`

---

## AUTH-REFRESH-001

- **TC_ID:** AUTH-REFRESH-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/auth/smoke/auth.refresh.spec.js`  
- **Scenario:** Successful OTP flow refreshes token with JSON refreshToken  
- **Expected:** HTTP **200** on refresh  
- **Checks:**
  - Prior steps: login / send / verify asserted with auth helpers  
  - Refresh: `expectSuccessStatus`, JSON type, `expectAuthRefreshSuccessBody` (`Token refreshed.`, non-empty access + refresh tokens, `tokenType`, `expiresInSeconds`)  

---

## AUTH-REFRESH-002

- **TC_ID:** AUTH-REFRESH-002  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/auth/negative/auth.refresh.negative.spec.js`  
- **Scenario:** Missing refresh token returns 401 Unauthorized  
- **Expected:** HTTP **401**  
- **Checks:** `expectHttpStatus` 401; JSON; `expectAuthRefreshInvalidBody` (UNAUTHORIZED, `Authentication required.`, `AUTH_REFRESH_INVALID`)  

---

## AUTH-REFRESH-003

- **TC_ID:** AUTH-REFRESH-003  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/auth/negative/auth.refresh.negative.spec.js`  
- **Scenario:** Malformed refresh token returns 401 Unauthorized  
- **Expected:** HTTP **401**  
- **Checks:** Same as AUTH-REFRESH-002  

---

## AUTH-REFRESH-004

- **TC_ID:** AUTH-REFRESH-004  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/auth/negative/auth.refresh.negative.spec.js`  
- **Scenario:** Unknown refresh token returns 401 Unauthorized  
- **Expected:** HTTP **401**  
- **Checks:** Same as AUTH-REFRESH-002  

---

## AUTH-REFRESH-005

- **TC_ID:** AUTH-REFRESH-005  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/auth/negative/auth.refresh.negative.spec.js`  
- **Scenario:** Reused refresh token after rotation returns 401 Unauthorized  
- **Expected:** First refresh **200**; second **401**  
- **Checks:** First response `expectAuthRefreshSuccessBody`; second same invalid body as AUTH-REFRESH-002  

---

## AUTH-REFRESH-006

- **TC_ID:** AUTH-REFRESH-006  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/qa-auth-matrix.spec.js`  
- **Scenario:** Valid body refreshToken refresh succeeds  
- **Expected:** HTTP **200**  
- **Checks:** `expectAuthRefreshSuccessBody`; new `data.refreshToken` ≠ token from verify response  

---

## AUTH-REFRESH-007

- **TC_ID:** AUTH-REFRESH-007  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/qa-auth-matrix.spec.js`  
- **Scenario:** Valid cookie-only refresh_token succeeds  
- **Expected:** HTTP **200** or test skipped if API rejects  
- **Checks:** On success: same refresh success body as AUTH-REFRESH-001  

---

## AUTH-REFRESH-008

- **TC_ID:** AUTH-REFRESH-008  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/qa-auth-matrix.spec.js`  
- **Scenario:** Malformed refresh token returns 401 Unauthorized  
- **Expected:** HTTP **401**  
- **Checks:** Same as AUTH-REFRESH-002  
