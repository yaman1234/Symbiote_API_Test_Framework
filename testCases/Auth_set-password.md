# `POST /auth/set-password`

Sets or resets password using a valid password-action token. **Consumes** the token; does not create a session.

---

## AUTH-SETPW-001

- **TC_ID:** AUTH-SETPW-001  
- **Suite:** Negative  
- **Spec_File:** `tests/api/negative/auth.set-password.negative.spec.js`  
- **Scenario:** Weak `password` (fails DTO / policy)  
- **Expected:** HTTP **422**, `VALIDATION_ERROR`  

---

## AUTH-SETPW-002

- **TC_ID:** AUTH-SETPW-002  
- **Suite:** Negative  
- **Spec_File:** `tests/api/negative/auth.set-password.negative.spec.js`  
- **Scenario:** `password` ≠ `confirmPassword` with **valid** token from env  
- **Expected:** HTTP **400**, *Passwords do not match.*  
- **Env:** `PASSWORD_ACTION_TOKEN_RAW` (optional; test skips if unset)  

---

## AUTH-SETPW-010

- **TC_ID:** AUTH-SETPW-010  
- **Suite:** Regression  
- **Spec_File:** `tests/api/smoke/auth.password-action.flow.spec.js`  
- **Scenario:** After successful set-password, same token cannot validate again  
- **Expected:** HTTP **400**, *This link has already been used.*  
- **Env:** Same as AUTH-PACT-010 (token consumed in flow)  
