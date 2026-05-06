# `GET /orgs/:orgId/branches/:branchId/tasks/analytics`

Branch task analytics (summary, distributions, overdue, employee rates) with optional date filters.

---

## TASKS-ANALYTICS-001

- **TC_ID:** TASKS-ANALYTICS-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.analytics.spec.js`  
- **Scenario:** Authorized user fetches analytics for a bounded date range  
- **Expected:** HTTP **2xx**; JSON success envelope with `data` object  
- **Checks:**
  - `GET .../tasks/analytics?from=...&to=...`
  - `expectSuccessStatus`, `expectJsonSuccessBody`, `body.data` is a non-null object
