# `GET /{PROTECTED_API_PATH}` — invalid JWT

Path from **`PROTECTED_API_PATH`** in `.env` (relative to `BASE_URL`). Request uses invalid Bearer token.

---

## MISC-PROT-001

- **TC_ID:** MISC-PROT-001  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/qa-auth-matrix.spec.js`  
- **Scenario:** [14] Protected GET with invalid JWT  
- **Expected:** HTTP **401**  
- **Checks:**
  - `expectHttpStatus` 401  
  - JSON `Content-Type`  
  - Body truthy  
  - `expectJsonErrorBody` — `statusCode` 401, `message` contains Authentication, non-empty `error.code` and `error.key`  
