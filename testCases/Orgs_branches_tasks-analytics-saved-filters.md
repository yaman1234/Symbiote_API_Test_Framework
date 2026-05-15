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

---

## TASKS-FILTERS-002

- **TC_ID:** TASKS-FILTERS-002  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.saved-filters.spec.js`  
- **Scenario:** Create analytics saved filter  
- **Expected:** HTTP **2xx**; filter created  
- **Checks:** `POST .../saved-filters` with `name` and `filters`

---

## TASKS-FILTERS-003

- **TC_ID:** TASKS-FILTERS-003  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.saved-filters.spec.js`  
- **Scenario:** Delete created analytics saved filter  
- **Expected:** HTTP **2xx**; filter deleted  
- **Checks:** `DELETE .../saved-filters/{filterId}`

---

## TASKS-FILTERS-004

- **TC_ID:** TASKS-FILTERS-004  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.saved-filters.negative.spec.js`  
- **Scenario:** Missing JWT on list saved filters  
- **Expected:** HTTP **401** auth error  
- **Checks:** unauthorized list request denied

---

## TASKS-FILTERS-005

- **TC_ID:** TASKS-FILTERS-005  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.saved-filters.negative.spec.js`  
- **Scenario:** Create saved filter with invalid payload (missing name)  
- **Expected:** HTTP **400/422** validation error  
- **Checks:** payload validation contract

---

## TASKS-FILTERS-006

- **TC_ID:** TASKS-FILTERS-006  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.saved-filters.negative.spec.js`  
- **Scenario:** Delete unknown saved filter id  
- **Expected:** HTTP **404/400** error contract  
- **Checks:** unknown resource handling
