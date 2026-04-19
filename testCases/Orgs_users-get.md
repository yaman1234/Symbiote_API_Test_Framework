# `GET /orgs/:orgId/users/:orgUserId`

Returns one org user. Requires **Bearer** after **login → send-otp → verify-otp** (`loginWithOtp`).

---

## ORGS-USERS-GET-001

- **TC_ID:** ORGS-USERS-GET-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/smoke/users.get.spec.js`  
- **Scenario:** Owner session — GET detail for caller `orgUserId` from verify-otp  
- **Expected:** HTTP **200**  
- **Checks:**
  - `expectSuccessStatus`, JSON type  
  - `expectOrgUserGetSuccessBody` — envelope 200, `data` object, `orgUserId` (or `id`) matches session `orgUserId`  

---

## ORGS-USERS-GET-002

- **TC_ID:** ORGS-USERS-GET-002  
- **Suite:** Negative  
- **Spec_File:** `tests/api/negative/users.get.negative.spec.js`  
- **Scenario:** No `Authorization` header  
- **Expected:** HTTP **401**  
- **Checks:** `expectJsonErrorBody` — 401, `message` contains Authentication, non-empty `error.code` and `error.key`  
