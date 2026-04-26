# API Module Test Structure

Module-first layout for API specs:

- `tests/api/modules/<module>/smoke/*.spec.js`
- `tests/api/modules/<module>/negative/*.spec.js`
- `tests/api/modules/<module>/regression/*.spec.js` (optional, when needed)

Current modules:

- `auth`
- `tasks`
- `users`

Naming convention:

- Prefer `<module>.<feature>.<scenario>.spec.js`
- Keep tags in `test.describe` for filtering (`@smoke`, `@negative`, `@regression`, plus module tags like `@users`, `@tasks`, `@auth`)
