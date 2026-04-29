# `POST /auth/password-action/validate`

Validates a raw password-action token from email (`RESET_PASSWORD` or `SET_PASSWORD`). Does **not** consume the token.

---

## AUTH-PACT-001

- **TC_ID:** AUTH-PACT-001  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/auth/negative/auth.password-action.negative.spec.js`  
- **Scenario:** Missing token returns 422 Validation Error  
- **Expected:** HTTP **422**, `VALIDATION_ERROR`  

---

## AUTH-PACT-002

- **TC_ID:** AUTH-PACT-002  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/auth/negative/auth.password-action.negative.spec.js`  
- **Scenario:** Invalid or unknown token returns 400 Bad Request  
- **Expected:** HTTP **400**, `BAD_REQUEST`, message *This link is invalid or expired.*  

---

## AUTH-PACT-010

- **TC_ID:** AUTH-PACT-010  
- **Suite:** Regression  
- **Spec_File:** `tests/api/modules/auth/smoke/auth.password-action.flow.spec.js`  
- **Scenario:** Valid env token returns purpose, email, and expiresAt  
- **Expected:** HTTP **200** or **201**; JSON `statusCode` **200**  
- **Checks:** `expectPasswordActionValidateSuccessBody` vs `PASSWORD_ACTION_EXPECT_PURPOSE`  
- **Env:** `PASSWORD_ACTION_TOKEN_RAW`, `PASSWORD_ACTION_EXPECT_PURPOSE`, `PASSWORD_ACTION_NEW_PASSWORD`  
