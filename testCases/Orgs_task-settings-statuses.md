# `GET /orgs/:orgId/task-settings/statuses`

Returns organization task statuses (ordered).

---

## TASKS-SETTINGS-001

- **TC_ID:** TASKS-SETTINGS-001  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.settings.spec.js`  
- **Scenario:** Owner lists org task statuses  
- **Expected:** HTTP **2xx**; JSON success envelope with `data` array of statuses  
- **Checks:**
  - JWT owner persona
  - `GET orgs/{orgId}/task-settings/statuses`
  - `expectSuccessStatus`, `expectJsonSuccessBody`, `Array.isArray(body.data)`; first row has `id` and `name` strings when non-empty

---

## TASKS-SETTINGS-002

- **TC_ID:** TASKS-SETTINGS-002  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.settings.spec.js`  
- **Scenario:** Owner creates task status  
- **Expected:** HTTP **2xx**; status created  
- **Checks:** `POST /task-settings/statuses` with unique name

---

## TASKS-SETTINGS-003

- **TC_ID:** TASKS-SETTINGS-003  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.settings.spec.js`  
- **Scenario:** Owner updates created status  
- **Expected:** HTTP **2xx**; status updated  
- **Checks:** `PATCH /task-settings/statuses/{statusId}` with editable fields

---

## TASKS-SETTINGS-004

- **TC_ID:** TASKS-SETTINGS-004  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.settings.spec.js`  
- **Scenario:** Owner reorders statuses  
- **Expected:** HTTP **2xx**; reorder persisted  
- **Checks:** `PUT /task-settings/statuses/reorder` with valid unique ids/orders

---

## TASKS-SETTINGS-005

- **TC_ID:** TASKS-SETTINGS-005  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.settings.spec.js`  
- **Scenario:** Owner lists priorities  
- **Expected:** HTTP **2xx**; priorities list returned  
- **Checks:** `GET /task-settings/priorities` success contract

---

## TASKS-SETTINGS-006

- **TC_ID:** TASKS-SETTINGS-006  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.settings.spec.js`  
- **Scenario:** Owner creates priority  
- **Expected:** HTTP **2xx**; priority created  
- **Checks:** `POST /task-settings/priorities` with unique name

---

## TASKS-SETTINGS-007

- **TC_ID:** TASKS-SETTINGS-007  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.settings.spec.js`  
- **Scenario:** Owner updates created priority  
- **Expected:** HTTP **2xx**; priority updated  
- **Checks:** `PATCH /task-settings/priorities/{priorityId}` editable fields

---

## TASKS-SETTINGS-008

- **TC_ID:** TASKS-SETTINGS-008  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.settings.spec.js`  
- **Scenario:** Owner reorders priorities  
- **Expected:** HTTP **2xx**; reorder persisted  
- **Checks:** `PUT /task-settings/priorities/reorder`

---

## TASKS-SETTINGS-009

- **TC_ID:** TASKS-SETTINGS-009  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.settings.spec.js`  
- **Scenario:** Owner deletes created status  
- **Expected:** HTTP **2xx**; status deleted  
- **Checks:** `DELETE /task-settings/statuses/{statusId}`

---

## TASKS-SETTINGS-010

- **TC_ID:** TASKS-SETTINGS-010  
- **Suite:** Smoke  
- **Spec_File:** `tests/api/modules/tasks/smoke/tasks.settings.spec.js`  
- **Scenario:** Owner deletes created priority  
- **Expected:** HTTP **2xx**; priority deleted  
- **Checks:** `DELETE /task-settings/priorities/{priorityId}`

---

## TASKS-SETTINGS-011

- **TC_ID:** TASKS-SETTINGS-011  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.settings.negative.spec.js`  
- **Scenario:** Non-owner cannot create status  
- **Expected:** HTTP **401/403**  
- **Checks:** supervisor token denied on status create

---

## TASKS-SETTINGS-012

- **TC_ID:** TASKS-SETTINGS-012  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.settings.negative.spec.js`  
- **Scenario:** Duplicate status name rejected  
- **Expected:** HTTP **400/409/422**  
- **Checks:** uniqueness rule enforced

---

## TASKS-SETTINGS-013

- **TC_ID:** TASKS-SETTINGS-013  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.settings.negative.spec.js`  
- **Scenario:** Duplicate status reorder order values rejected  
- **Expected:** HTTP **400/422**  
- **Checks:** invalid reorder payload rejected

---

## TASKS-SETTINGS-014

- **TC_ID:** TASKS-SETTINGS-014  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.settings.negative.spec.js`  
- **Scenario:** Deleting status in use by task is blocked  
- **Expected:** HTTP **400/409/422**  
- **Checks:** in-use status delete denied

---

## TASKS-SETTINGS-015

- **TC_ID:** TASKS-SETTINGS-015  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.settings.negative.spec.js`  
- **Scenario:** Duplicate priority name rejected  
- **Expected:** HTTP **400/409/422**  
- **Checks:** uniqueness rule enforced

---

## TASKS-SETTINGS-016

- **TC_ID:** TASKS-SETTINGS-016  
- **Suite:** Negative  
- **Spec_File:** `tests/api/modules/tasks/negative/tasks.settings.negative.spec.js`  
- **Scenario:** Deleting priority in use by task is blocked  
- **Expected:** HTTP **400/409/422**  
- **Checks:** in-use priority delete denied
