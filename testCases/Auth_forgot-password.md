# `POST /auth/forgot-password`

Starts forgot-password for an existing account **without** revealing whether the email exists. Same generic success for unknown emails (anti-enumeration).

---

## AUTH-FORGOT-001

- **TC_ID:** AUTH-FORGOT-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/auth/smoke/auth.forgot-password.spec.js`  
- **Scenario:** Valid seeded LOGIN_EMAIL returns generic success  
- **Expected:** HTTP **200** or **201**; JSON envelope `statusCode` **200**; generic message  
- **Checks:** `expectHttpOkOrCreated`, `expectForgotPasswordGenericSuccessBody`  
- **Note:** If QA returns **5xx** for a real mailbox (e.g. mailer misconfiguration), the smoke **skips** after attaching the response.  

---

## AUTH-FORGOT-002

- **TC_ID:** AUTH-FORGOT-002  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/auth/smoke/auth.forgot-password.spec.js`  
- **Scenario:** Unknown email returns generic success  
- **Expected:** Same as AUTH-FORGOT-001  
- **Checks:** Same generic message as seeded email  

---

## AUTH-FORGOT-003

- **TC_ID:** AUTH-FORGOT-003  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/auth/negative/auth.forgot-password.negative.spec.js`  
- **Scenario:** Missing email returns 422 Validation Error  
- **Expected:** HTTP **422**, `VALIDATION_ERROR`, `email` in details  
