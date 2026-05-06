# `GET /orgs/:orgId/branches/:branchId/tasks/analytics/saved-filters`

Lists analytics saved filters for the authenticated user only.

---

## TASKS-FILTERS-001

- **TC_ID:** TASKS-FILTERS-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.saved-filters.spec.js`  
- **Scenario:** Authorized user lists saved analytics filters  
- **Expected:** HTTP **2xx**; JSON success envelope with `data` array  
- **Checks:**
  - `GET orgs/{orgId}/branches/{branchId}/tasks/analytics/saved-filters`
  - `expectSuccessStatus`, `expectJsonSuccessBody`, `Array.isArray(body.data)`
