# `GET /orgs/:orgId/users/:orgUserId`

Returns one org user. Requires **Bearer** after **login → send-otp → verify-otp** (`loginWithOtp`).

## Role-based access and expected response

| Role | Target visibility | Typical response |
|------|-------------------|------------------|
| **OWNER** | Full org user detail access | **200** success user detail |
| **SUPERVISOR** | Scoped detail access by policy | **200** for allowed scope, otherwise **4xx** |
| **EMPLOYEE** | Self-only detail | **200** for self, otherwise **4xx** |
| **Any role without token** | No access | **401** error envelope |

---

## ORGS-USERS-GET-001

- **TC_ID:** ORGS-USERS-GET-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/users/smoke/users.get.spec.js`  
- **Scenario:** Authorized owner gets caller orgUserId details  
- **Expected:** HTTP **200**  
- **Checks:**
  - `expectSuccessStatus`, JSON type  
  - `expectOrgUserGetSuccessBody` — envelope 200, `data` object, `orgUserId` (or `id`) matches session `orgUserId`  

---

## ORGS-USERS-GET-002

- **TC_ID:** ORGS-USERS-GET-002  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/users/negative/users.get.negative.spec.js`  
- **Scenario:** Unauthorized request without Authorization header  
- **Expected:** HTTP **401**  
- **Checks:** `expectJsonErrorBody` — 401, `message` contains Authentication, non-empty `error.code` and `error.key`  

---

## ORGS-USERS-GET-003

- **TC_ID:** ORGS-USERS-GET-003  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.get.access.spec.js`  
- **Scenario:** Forbidden employee access to another user detail is rejected  
- **Expected:** HTTP **4xx**  
- **Checks:** Employee token attempts `GET /orgs/:orgId/users/:orgUserId` for a different user; response must be JSON error envelope with non-empty `error.code` and `error.key`  

---

## ORGS-USERS-GET-004

- **TC_ID:** ORGS-USERS-GET-004  
- **Suite:** Regression  
- **Spec_File:** `tests/api/regression/users.get.access.spec.js`  
- **Scenario:** Forbidden supervisor access to out-of-scope user detail is rejected  
- **Expected:** HTTP **4xx**  
- **Checks:** Supervisor token attempts `GET /orgs/:orgId/users/:orgUserId` for out-of-scope user; response must be JSON error envelope with non-empty `error.code` and `error.key`  
