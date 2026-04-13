# `POST /auth/refresh`

---

## AUTH-REFRESH-001

- **TC_ID:** AUTH-REFRESH-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/smoke/auth.refresh.spec.js`  
- **Scenario:** Full OTP then refresh with JSON `refreshToken`  
- **Expected:** HTTP **200** on refresh  
- **Checks:**
  - Prior steps: login / send / verify asserted with auth helpers  
  - Refresh: `expectSuccessStatus`, JSON type, `expectAuthRefreshSuccessBody` (`Token refreshed.`, non-empty access + refresh tokens, `tokenType`, `expiresInSeconds`)  

---

## AUTH-REFRESH-002

- **TC_ID:** AUTH-REFRESH-002  
- **Suite:** Negative  
- **Spec_File:** `tests/api/negative/auth.refresh.negative.spec.js`  
- **Scenario:** No refresh token in body, no cookie  
- **Expected:** HTTP **401**  
- **Checks:** `expectHttpStatus` 401; JSON; `expectAuthRefreshInvalidBody` (UNAUTHORIZED, `Authentication required.`, `AUTH_REFRESH_INVALID`)  

---

## AUTH-REFRESH-003

- **TC_ID:** AUTH-REFRESH-003  
- **Suite:** Negative  
- **Spec_File:** `tests/api/negative/auth.refresh.negative.spec.js`  
- **Scenario:** Malformed refresh token string  
- **Expected:** HTTP **401**  
- **Checks:** Same as AUTH-REFRESH-002  

---

## AUTH-REFRESH-004

- **TC_ID:** AUTH-REFRESH-004  
- **Suite:** Negative  
- **Spec_File:** `tests/api/negative/auth.refresh.negative.spec.js`  
- **Scenario:** Well-formed but unknown refresh token  
- **Expected:** HTTP **401**  
- **Checks:** Same as AUTH-REFRESH-002  

---

## AUTH-REFRESH-005

- **TC_ID:** AUTH-REFRESH-005  
- **Suite:** Negative  
- **Spec_File:** `tests/api/negative/auth.refresh.negative.spec.js`  
- **Scenario:** Reuse refresh token after successful rotation  
- **Expected:** First refresh **200**; second **401**  
- **Checks:** First response `expectAuthRefreshSuccessBody`; second same invalid body as AUTH-REFRESH-002  

---

## AUTH-REFRESH-006

- **TC_ID:** AUTH-REFRESH-006  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/qa-auth-matrix.spec.js`  
- **Scenario:** [11] Refresh with body `refreshToken`  
- **Expected:** HTTP **200**  
- **Checks:** `expectAuthRefreshSuccessBody`; new `data.refreshToken` ≠ token from verify response  

---

## AUTH-REFRESH-007

- **TC_ID:** AUTH-REFRESH-007  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/qa-auth-matrix.spec.js`  
- **Scenario:** [12] Cookie-only `refresh_token`  
- **Expected:** HTTP **200** or test skipped if API rejects  
- **Checks:** On success: same refresh success body as AUTH-REFRESH-001  

---

## AUTH-REFRESH-008

- **TC_ID:** AUTH-REFRESH-008  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/qa-auth-matrix.spec.js`  
- **Scenario:** [13] Malformed refresh token  
- **Expected:** HTTP **401**  
- **Checks:** Same as AUTH-REFRESH-002  
