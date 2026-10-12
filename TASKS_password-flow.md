# TASKS: password flow + isAccount retirement

**Author:** Local Agent
**Created:** 2026-10-12
**Working dir:** `E:\www\letbox\docker\dms\dms-gui`
**Status:** plan only, no code written yet.

---

## 0. TL;DR

Two related problems:
1. The "change mailbox password" path is **broken**. The backend endpoint
   `PATCH /api/accounts/...` calls `updateDB('accounts', mailbox, {password})`
   which REJECTS the `password` key (not in `sql.accounts.keys`) and returns a
   "nothing to modify was passed" error. `backend/accounts.mjs::updateAccount`
   (the actual doveadm runner) is only wired to the legacy
   `db.mjs::changePassword` path, which `updateDB` refuses to call for the
   accounts table. So currently, the Accounts page "change password" button
   fails with an error. `usePasswordChange.js` tries to compensate by also
   calling `updateLogin`, but that only updates the local login hash, NOT the
   mailbox.

2. `isAccount` conflates two unrelated concerns:
   a. "this login is attached to / owns a mailbox password" -- the only real
      behavior it drives is `verifyPassword(doveadm)` vs `verifyPassword(hash)`.
   b. "the user is not a normal user" -- but per the owner, linked users ARE
      normal users who manage 1 mailbox. `isAccount` should be gone from the
      UI and effectively from the DB schema too.

The fix is a single source-of-truth rule in the backend:
> **The dms-gui logins table is the ONLY place we validate logins.
> The doveadm mailbox password is a separate password, used only by
> mail clients, and is updated (kept in sync) whenever the mailbox
> password itself is changed from an admin UI (Accounts page).**

The frontend hook then makes ONE API call per scenario; it no longer
decides which of the two APIs to call.

---

## 1. Current state (verified by reading the code)

### 1.1 Password-related endpoints

| Endpoint | Handler | What it does today |
|---|---|---|
| `POST /api/loginUser` | `backend/index.js:1612` -> `backend/logins.mjs::loginUser` (line 167) | Validates password. If `login.isAccount` is 1, uses `doveadm('loginUser', ...)` (verifies against dovecot). Otherwise uses `db.mjs::verifyPassword` (verifies against the local `logins.salt/hash`). |
| `PATCH /api/logins/:id` | `backend/index.js:1446` -> `db.mjs::updateDB('logins', id, jsonDict)` | Generic column update. When `jsonDict.password` is present, `db.mjs::updateDB` short-circuits to `db.mjs::changePassword('logins', id, password)` (line 1197) which re-hashes and writes to `logins.salt/hash`. This works. |
| `PATCH /api/accounts/:schema/:containerName/:mailbox` | `backend/index.js:800` -> `db.mjs::updateDB('accounts', mailbox, jsonDict)` | **BROKEN for password.** `db.mjs::updateDB` rejects `password` for the `accounts` table with "password change is only allowed for logins table" (message at line 1282 of db.mjs). All other keys in `jsonDict` get dropped and the function then throws "nothing to modify was passed". Meaning: mailbox password change from the UI **never actually updated the mailbox**. |
| `PUT /api/logins` (addLogin) | `backend/index.js:1374` -> `backend/logins.mjs::addLogin` (line 41) | Inserts a new login. `isAccount` is a DB column (default 1) written from the request body. |
| `DELETE /api/logins/:id` | `backend/index.js:1536` -> `backend/logins.mjs::deleteLogin` (line 290) | Deletes a login; if `alsoDeleteMailbox`, calls `deleteAccount(..., alsoDeleteLogin=true)` (see below). |
| `DELETE /api/accounts/...` -> `backend/accounts.mjs::deleteAccount` (line 367) | Deletes the mailbox via `email del -y`. Then deletes any aliases that reference it. Then if `alsoDeleteLogin`, deletes a login whose ONLY role is this mailbox (non-admin); fails silently if none. **Today it is wrongly keyed on `logins.mailbox == account.mailbox` + `isAccount`** (fixed by T13). |

### 1.2 Where isAccount is currently used

| File | Line(s) | Use |
|---|---|---|
| `frontend/src/components/logins/NewLoginForm.jsx` | 53-60, 100 | "Only attached to a mailbox?" checkbox. When checked, swaps the free-text mailbox field for a SelectField of existing mailboxes, and auto-selects that mailbox into `roles`. |
| `frontend/src/hooks/useNewLoginForm.js` | 37, 66, 95-119 | Form state init, special handling in the input handler, auto-selection of the mailbox into roles. |
| `frontend/src/pages/Profile.jsx` | 258-264, 285, 307 | Disabled checkbox reflecting `user.isAccount`; mailbox FormField only rendered when `!isAccount`; (isAccount is in the JWT user object). |
| `frontend/src/components/PasswordChangeModal.jsx` | 29-31 | "Not a mailbox password" info alert when `!isAdmin && !isAccount`. |
| `frontend/src/components/logins/DeleteConfirmModal.jsx` | 26 | "also delete mailbox" checkbox only shown for `isAccount` logins. |
| `frontend/src/hooks/usePasswordChange.js` (whole file) | 110-205 | Branches on `selectedLogin.isAccount` and `selectedLogin.id` to decide whether to call `updateAccount`, `updateLogin`, or both. This is what we replace. |
| `frontend/src/pages/Accounts.jsx` | 513 | Passes `isAccount: true, id: account.loginId` to `handleChangePassword` in the table row action. |
| `frontend/src/services/api.mjs` | 406-414 | `addLogin` accepts `isAccount` and forwards in body. |
| `backend/index.js` | 753, 815-816, 956, 1380, 1385 | Comment; permission checks (`req.user.isAccount`); aliases guard; addLogin destructuring. |
| `backend/db.mjs` | 267, 275-289, 301, 312-313, 331, 350-360, 389 | keys whitelist, all SELECTs, INSERT, `update.mailbox` test, `update.isAdmin` pass clause, `update.isAccount` rules (two), initial schema. |
| `backend/logins.mjs` | 41, 99, 125-191, 197 | `addLogin` signature; `loginUser` branches on `isAccount` to pick doveadm vs hash verification. |
| `backend/accounts.mjs` | 251, 394 | `addAccount` calls `addLogin(..., isAccount=1, ...)` (fixed to 0 by T17); `deleteAccount` cascade keyed on `isAccount && !isAdmin` + own `logins.mailbox` (replaced by role-aware cascade in T13). |
| `locales/*/translation.json` | various | `isAccountChoice`, `notMailbox`, `isAccount*` strings. |

Note: the column is `DEFAULT 1` in the schema (db.mjs:389), while
`addLogin` accepts `isAccount=0` as default, so a *fresh* insert from a
non-linked form yields `isAccount=0` only when the caller passes it. That
matters for the migration.

### 1.3 Verified: `db.mjs::updateDB` does NOT call `changePassword('accounts', ...)`

```
if (key == 'password') {
  if (table == 'logins') {
    return changePassword(table, id, value, scope);
  } else {
    errorLog('password change is only allowed for logins table');
    messages.push('password change is only allowed for logins table');
  }
}
```
So the only current caller of `backend/accounts.mjs::updateAccount(schema,
containerName, mailbox, password)` is the dormant
`backend/db.mjs::changePassword` path (line 1208), which the endpoint never
reaches. This is the root cause of the bug in task #1.

### 1.4 Verified: `dbInit`/`admin` seed inserts `isAccount=0`

```
INSERT OR IGNORE INTO logins (mailbox, username, email, salt, hash,
  isAdmin, isActive, isAccount) VALUES ('admin@dms-gui.com','admin',
  'admin@dms-gui.com', 'fdebebcd...', 'a975c7c1...', 1, 1, 0);
```
Admin is explicitly `isAccount=0`.

---

## 2. Design decisions (read before implementing)

**D1 -- Single source of truth for login verification.**
`loginUser` in `backend/logins.mjs` will stop branching on `login.isAccount`.
All logins are verified with `verifyPassword(password, login)` against the
logins table hash. `doveadm('loginUser', ...)` is removed from that path.

**D2 -- Mailbox password is a separate password, kept in sync by the backend.**
`backend/accounts.mjs::updateAccount` is the single place that changes the
doveadm mailbox password. After a successful doveadm update, it looks up
`getLogin(mailbox)`; if the login exists, it also re-hashes and writes
`logins.salt/hash` using the same salt/hash generation as
`db.mjs::changePassword` (reuse `hashPassword`). The result is merged:
- doveadm success        -> `success:true`, `message` = combined text
- doveadm success + db-fail -> `success:true`, `message` = "updated the mailbox;
                              local login update failed" PLUS an `error` field
                              (this is the partial-success case the owner
                              wanted: success+error both present)
- doveadm fail            -> `success:false`, `error` = doveadm error

**D3 -- The PATCH /api/accounts endpoint switches from `updateDB` to
`updateAccount` for password changes.**
`backend/index.js` will import `updateAccount` from `backend/accounts.mjs`
and route `PATCH /api/accounts/:schema/:containerName/:mailbox` body
`{password}` directly to it. Non-password keys, if any, fall through to the
existing `updateDB` path (kept for future non-password fields, currently
none in the UI send any).

**D4 -- Profile / Logins / Accounts pages make exactly ONE API call each.**
- Profile page ("change password" on self): always `updateLogin(id, {password})`.
  If that login is a mailbox owner, the login hash update is what makes
  `loginUser` succeed. The mailbox password is NOT synced by this path
  because changing the app login password should not change the mailbox.
  This matches existing semantics and the owner's scenario #1/#2 (in the
  owner's words: "linked users can be promoted and then their db login
  password is already set" -- i.e., the login is the truth).
- Logins page (admin changes somebody else's): `updateLogin(id, {password})`.
  Same reasoning: this is the app login password, not the mailbox password.
  (Owner's scenario #4.)
- Accounts page: `updateAccount(schema, containerName, mailbox, {password})`.
  This is the mailbox password. If a login exists for that mailbox, the
  backend keeps it in sync (D2).

**D5 -- Frontend partial-success UX.**
`usePasswordChange` will surface both `successMessage` and
`errorMessage` when the backend response has both `message` and `error`
(D2 partial success). Both `<AlertMessage>` components are already
rendered by each page (Logins.jsx:116-117, Profile.jsx:248-249,
Accounts.jsx:675-676); no page changes needed for display, just for how
the hook interprets the response.

**D6 -- isAccount is removed from the UI.**
- `NewLoginForm.jsx`: delete the checkbox (lines 53-60) and the
  conditional mailbox SelectField (lines 100-118). Keep the free-text
  mailbox FormField always. Update `filteredAccountOptions` usage only
  if it's used elsewhere (verify; if not, drop the prop from the form).
- `useNewLoginForm.js`: delete `isAccount` from form init and handler
  special-cases (lines 37, 95-119). `roles` continues to be populated
  by the Autocomplete the user picks.
- `Profile.jsx`: delete the disabled checkbox (lines 258-264); remove the
  `!loginFormData.isAccount && (...)` wrapper (lines 285-297) so the
  mailbox FormField is always rendered (disabled); leave the value display
  intact.
- `PasswordChangeModal.jsx`: remove the `!selectedLogin.isAdmin &&
  !selectedLogin.isAccount` conditional on the "not mailbox password"
  alert (lines 29-31). Either remove the alert entirely (preferred, it
  exists only to distinguish a 1-password world that is going away) or
  keep it if the owner prefers to keep the hint. Decision: remove.
- `DeleteConfirmModal.jsx`: "also delete mailbox" checkbox shown for any
  non-admin login whose `mailbox` is set (not gated on `isAccount`).

**D7 -- `addLogin` continues to persist isAccount.**
The column stays for now (see D9). The backend `addLogin` signature is
unchanged (accepts `isAccount`, defaults to 0). The frontend just stops
sending it. In the next major release we can drop the column.

**D8 -- Migration plan for the DB column is deferred.**
The owner asked to "remove the isAccount column altogether." Doing so
cleanly in better-sqlite3 requires a rebuild-table + data-copy + rename +
PRAGMA foreign_keys off dance that is risky in a production schema.
Recommendation: ship D1-D6 behind the same version bump first (all
behavioral changes are in the code, the column just becomes unused), then
in a follow-up task do the ALTER. This task is scoped to the first
phase; the ALTER is Task 10 below, clearly separated.

**D9 (revised) -- Two-stage column retirement.**
Stage A (this task, behavior): stop all *reads* and all *writes that
matter* of isAccount. Leave the column, `INSERT`, and `SELECT` intact so
nothing crashes. This is safe to ship to running instances.
Stage B (follow-up, schema): `PRAGMA table_info(logins)` check; rebuild
table without isAccount; drop the column. Track as Task 10, do not do in
the same change.

**D10 -- Delete-mailbox cascade is role-aware (owner clarification, 2026-10-12).**
Domain model per owner: logins (users of THIS app) and mailboxes (live in
docker-mailserver) are unrelated things; a login *manages* mailboxes via the
`roles` table (role = mailbox address). A login has 1, 0 or many mailbox
roles. Mailboxes don't need this app to exist.

The `DELETE /api/accounts/...` cascade (when `alsoDeleteLogin` is true) must:
- Find logins that list THIS mailbox as a role (`roles.role = <mailbox>`).
- Delete ONLY a login whose roles consist of EXACTLY that one mailbox
  (i.e. it manages nothing else). That is the "linked" 1-mailbox user.
- NEVER delete a login that has multiple mailbox roles from this action.
  Removing such a login is the Logins page's job (`deleteLogin`, which can
  also delete its mailbox).
- FAIL SILENTLY (return success, no error) when no login manages this
  mailbox.
The frontend "also delete mailbox / login" checkbox is NOT conditional on
this (owner: greying it out based on role counts is "extra fluff"); leave
`DeleteConfirmModal` checkbox behavior as-is and let the backend decide.

This replaces the current logic in `accounts.mjs::deleteAccount` (lines
~388-395), which deletes the login where the login's own
`logins.mailbox == account.mailbox`, gated on `isAccount && !isAdmin`.
That condition is wrong because (a) it keys on `isAccount` and (b) it keys
on the login's own `mailbox` column, not on `roles`.

**D11 -- "Promotion" is a no-op now.**
There is no longer a promotion; a user either exists as a login or doesn't.
The owner's mention of "linked users can be promoted" is already handled
by the fact that `db.mjs::update.isAccount.1` sets `isAdmin=0` and the
inverse sets `isAccount=0`. In Stage A we keep these rules so existing
records keep working; in Stage B we retire them along with the column.

---

## 3. Task list, in execution order

> Convention: [ ] checkbox = to do, [x] = done. Each task lists file(s)
> and a short "acceptance check" that can be run without a full browser.

### Phase 1: Backend (one atomic change, verify together) -- [ ]

- [ ] **T1: `backend/accounts.mjs` -- `updateAccount` merges doveadm + login-hash.**
  - Import `getLogin, hashPassword, dbRun, sql` from `./logins.mjs` and
    `./db.mjs` (already have `hashPassword, sql, dbRun` via existing
    imports at the top of the file? no -- verify and add as needed).
  - After the `execDMS(..., returncode 0)` block that currently `return`s
    the success object, ADD a second step: look up `getLogin(mailbox)`.
    If `result.success`, call the SAME hash+persist logic as
    `db.mjs::changePassword` (hashPassword, then `dbRun(
    sql.logins.update.password, {salt, hash, scope:containerName},
    result.message.id)`).
  - Return shape:
    - doveadm OK + login OK: `{success:true, message:`Password updated for ${mailbox} (mailbox + login)`}`
    - doveadm OK + login fail: `{success:true, message:`Mailbox password updated for ${mailbox}; local login update failed`, error:<db error>}`
    - doveadm fail: `{success:false, error:<doveadm error>, returncode:...}`
  - Add a `// Local Agent FIX: <reason>` line above the new block, never
    touching existing comments (per project rules).
  - Acceptance: with a mailbox present, call
    `curl -X PATCH http://host/api/accounts/dms/dms-gui/me@x \
      -H 'Cookie: accessToken=...' -d '{"password":"NewPass123"}'`
    -> 200, `success:true`. Both the `doveadm auth test ...` and
    `sqlite3 config/dms-gui/dms-gui.sqlite3 'select salt,hash from logins
    where mailbox="..."'` should show new values.

- [ ] **T2: `backend/index.js` -- PATCH /api/accounts routes to updateAccount for password.**
  - Add `updateAccount` to the existing import block from `./accounts.mjs`
    (line ~53-58).
  - In the `app.patch('/api/accounts/:schema/:containerName/:mailbox', ...)`
    handler (line 800 onward):
      ```
      const { password, ...rest } = req.body;
      if (password) {
        // Local Agent FIX: updateAccount is the single mailbox-password path.
        // It keeps any associated login hash in sync.
        result = await updateAccount(schema, containerName, mailbox, password);
        return res.json(result);
      }
      // else fall through to the existing updateDB path with `rest`
      ```
  - Keep the existing admin / isAccount / roles permission check above
    this branch (unchanged).
  - Keep the `else result = {success:false, error:'Permission denied'}`.
  - Acceptance: `PATCH` with `{password:...}` as admin -> doveadm command
    executed (see `docker logs dms-gui`), logins row hash+salt updated.
    `PATCH` without `password` -> same as today (updateDB path untouched).

- [ ] **T3: `backend/logins.mjs` -- `loginUser` always verifies hash.**
  - In `loginUser` (line 167), remove the `if (login.isAccount) { ...doveadm... }`
    branch entirely (lines ~180-220). Replace with the plain
    `result = await loginHandler(password, login.message, test);` call
    that is already used for the non-account branch.
  - In `loginHandler` (line 125), remove the
    `if (login.isAccount) { ... doveadm ... } else` wrapper; the function
    body becomes just the verifyPassword + lockout logic unconditionally.
  - Acceptance: `POST /api/loginUser` for a login whose `isAccount=1`
    AND whose `salt/hash` has been set by T1 -> success. For a login with a
    hash that no longer matches -> 401 with lockout counter increment.
    `doveadm('loginUser', ...)` is no longer called (verify no new calls
    by grep, and by watching container logs).

- [ ] **T4: `frontend/src/hooks/usePasswordChange.js` -- one call per scenario.**
  - Rewrite `handleSubmitPasswordChange` (lines 118-185):
    ```
    const newPassword = passwordFormData.newPassword;
    let result;
    // Branch on the caller: the selectedLogin passed in by each page is
    // different. The hook already knows `user`; use that plus the shape
    // of selectedLogin to decide.
    if (selectedLogin?.mailbox && selectedLogin?.mailserver) {
      // Accounts page: selectedLogin is a mailbox record (has mailserver).
      result = await updateAccount(
        getValueFromArrayOfObj(mailservers, containerName, 'value', 'schema'),
        containerName,
        selectedLogin.mailbox,
        { password: newPassword });
    } else {
      // Profile + Logins: plain login with an id
      result = await updateLogin(selectedLogin.id, { password: newPassword });
    }
    ```
  - Remove the two-step logic, the `completedSteps` array, all the
    `isAccount` references, and the "at least one step ran" guard (which
    was only needed because of the two-step design).
  - Interpret result:
    ```
    if (result.success) {
      setSuccessMessage(result.message);
      if (result.error) {
        // partial success: mailbox updated, login update failed (T1 D2)
        setErrorMessage({key:'api.errors.changePasswordPartial',
                         values:{ error: result.error }});
      }
    } else {
      setErrorMessage({key:'api.errors.changePassword', values:{error:result.error}});
    }
    ```
  - Keep the `finally { handleClosePasswordModal(); }`.
  - Keep the existing `validatePasswordForm` (which uses `user.isAdmin`
    for min length) -- fine as is.
  - Acceptance:
    - Profile: type new password -> only `PATCH /api/logins/:id` hits the
      server. Response success -> green alert.
    - Accounts: click pencil -> only `PATCH /api/accounts/dms/...` hits
      the server. If T1's partial-success branch fires, both green and
      red alerts appear in the same render (both are rendered by each
      page; verified at Logins.jsx:116-117, Profile.jsx:248-249,
      Accounts.jsx:675-676).
    - Logins: clicking "change password" on a login -> only
      `PATCH /api/logins/:id`.

- [ ] **T5: `frontend/src/pages/Accounts.jsx` -- stop injecting isAccount / id into selectedLogin.**
  - Line 513: change
    `onClick={() => passwordChange.handleChangePassword({ ...account, isAccount: true, id: account.loginId })}`
    to
    `onClick={() => passwordChange.handleChangePassword(account)}`
  - If `account.loginId` is used anywhere else in Accounts.jsx, keep it;
    just stop passing it to the hook.
  - Acceptance: network trace shows the Accounts page no longer calls
    `PATCH /api/logins/:id` for a mailbox password change.

- [ ] **T6: `frontend/src/pages/Logins.jsx` -- no change required, verify.**
  - The row already passes the full login object (has `id`). The hook's
    new branch (T4) will route `updateLogin`. No code change; just
    regression-check by hand.
  - Acceptance: admin changes a login's password -> only one API call.

- [ ] **T7: `frontend/src/pages/Profile.jsx` -- remove the isAccount display + conditional; hook call unchanged.**
  - Delete the disabled checkbox for `isAccount` (lines 258-264).
  - Remove the `!loginFormData.isAccount &&` wrapper around the mailbox
    FormField (lines 285-297) so it always renders (it's already
    `disabled`; just unwrap it).
  - The button at line 400 (`passwordChange.handleChangePassword(user)`)
    stays. T4's hook will route it to `updateLogin` because `user`
    (a login) does not have a `mailserver` property.
  - Acceptance: network trace from the Profile "change password" flow
    shows only `PATCH /api/logins/:id`.

- [ ] **T8: `frontend/src/components/logins/NewLoginForm.jsx` -- remove isAccount UI.**
  - Delete the checkbox (lines 53-60).
  - Delete the `formData.isAccount && (<SelectField .../>) || ( <div><FormField email/></div> )` ternary (lines 100-135). Keep the free-text FormField branch, drop the SelectField branch entirely (and the `filteredAccountOptions` prop if unused).
  - Delete the `disabled={formData.isAccount}` on the roles Autocomplete (line ~145).
  - Remove `filteredAccountOptions` from the props signature and from the Logins.jsx:89-101 usage (see T9).
  - Acceptance: form no longer has a "Only attached to a mailbox?" row.
    Creating a user still works; `roles` still editable.

- [ ] **T9: `frontend/src/hooks/useNewLoginForm.js` + `frontend/src/pages/Logins.jsx` -- clean up isAccount logic and unused props.**
  - `useNewLoginForm.js`:
    - Remove `isAccount: 0` from `newLoginformDataINIT` (line 37).
    - Remove the `if (name == 'isAccount' && checked)` block (lines 99-108).
    - Remove the `if (name == 'mailbox') { if (newLoginformData.isAccount) { ... } }` block (lines 114-120).
    - In `handleSubmitNewLogin`, drop the `newLoginformData.isAccount` argument from the `addLogin(...)` call -- see T10.
  - `Logins.jsx` (lines 89-101): remove `filteredAccountOptions={newLoginForm.filteredAccountOptions}` prop from the `<NewLoginForm ...>` usage. (If `filteredAccountOptions` is no longer used anywhere, also remove the `useMemo` that builds it from useNewLoginForm.js.)
  - Acceptance: `grep -rn isAccount frontend/src` returns nothing.

- [ ] **T10: `frontend/src/services/api.mjs` -- `addLogin` drops isAccount from the body.**
  - Line 406-414: keep the function signature (for backward compat with
    any caller that still passes it) but stop forwarding `isAccount` in
    the JSON body.
  - Acceptance: `grep -n isAccount frontend/src/services/api.mjs` returns
    only the parameter declaration (if kept), not the body.

- [ ] **T11: `frontend/src/components/PasswordChangeModal.jsx` -- remove isAccount conditional.**
  - Lines 29-31: drop the `{selectedLogin && !selectedLogin.isAdmin &&
    !selectedLogin.isAccount && (<AlertMessage .../>)}` block entirely
    (per D6).
  - Acceptance: no "PasswordUpdated" or "notMailbox" alert is rendered
    based on isAccount.

- [ ] **T12: `frontend/src/components/logins/DeleteConfirmModal.jsx` -- "also delete mailbox" no longer gated on isAccount.**
  - Line 26: change `{!!selectedLogin?.isAccount && selectedLogin?.mailbox && (`
    to `{selectedLogin?.mailbox && (`
  - Acceptance: for a login that has a `mailbox` set, the checkbox is
    always present.

- [ ] **T13: `backend/accounts.mjs::deleteAccount` -- make the cascade role-aware (see D10).**
  - Replace the `if (alsoDeleteLogin) { ... }` block in `deleteAccount`
    (lines ~388-397) with role-based logic:
      1. Query logins that manage this mailbox:
         `SELECT l.id, l.isAdmin, COUNT(r.role) roleCount
          FROM logins l JOIN roles r ON r.loginID = l.id AND r.role = '<mailbox>'
          GROUP BY l.id`.
         (Use the existing `sql` helpers / a new `sql.roles` query; do NOT
         hardcode the mailbox into the SQL string without parameterization.)
      2. For each such login, if `roleCount == 1` (this mailbox is its ONLY
         role) AND `isAdmin == 0`, delete the login:
         `deleteEntry('roles', id)` then `deleteEntry('logins', id, 'id')`.
      3. If no login is found, or none qualifies, return success (FAIL
         SILENTLY) -- do NOT surface an error.
  - Keep the `alsoDeleteLogin` parameter (the `DELETE /api/accounts/...`
    index.js handler reads it from the body and passes it through).
  - Keep the mailbox (doveadm) deletion + alias deletion + `deleteEntry(
    'accounts', ...)` steps unchanged.
  - Acceptance:
    - A login whose ONLY role is the deleted mailbox -> login + its role row
      deleted; user can no longer log in. (linked user, 1 mailbox)
    - A login with 2+ roles including this mailbox -> login SURVIVES, only
      this mailbox's role row + the mailbox gone.
    - No login managing the mailbox -> delete still succeeds, no error.
    - An admin login managing the mailbox -> login SURVIVES (never drop an
      admin from the cascade).

### Phase 2: Frontend behavior verification -- [ ]

- [ ] **T14: i18n cleanup.**
  - `frontend/src/locales/en/translation.json`:
    - Under `logins`, remove `isAccountChoice` (line 82) if no longer
      used by any component.
    - Keep `notMailbox` (line 286) OR remove if T11 deletes its only
      caller. Remove its key.
    - Add a new key under `api.errors`:
      `changePasswordPartial: "Partial success: {{error}}"`
      (used by T4's error branch on the partial-success case).
  - Same for `polish` (pl/translation.json) if the strings exist there
    (grep first).
  - Acceptance: `npm run lint` in `frontend/` passes.

- [ ] **T15: `backend/index.js` -- addLogin endpoint still accepts isAccount (no change needed).**
  - Verify that `PUT /api/logins` (line 1374) reads `isAccount` from
    `req.body` and passes it through to `addLogin`. Since T10 stops
    sending it from the browser, it defaults to 0 on the backend, so no
    change. Just add a comment at the top of the addLogin handler noting
    that `isAccount` is deprecated and defaults to 0.

### Phase 3: Backend hardening (optional, same release) -- [ ]

- [ ] **T16: `backend/logins.mjs::addLogin` -- default `isAccount=0` and stop writing 1 by mistake.**
  - Signature line 41 already has `isAccount=0` default. Keep it. No code
    change requested; just add a comment marking it as "legacy, will be
    removed in Stage B" (per D9).

- [ ] **T17: `backend/accounts.mjs::addAccount` still calls addLogin with isAccount=1 -- change to 0.**
  - Around line 250 in `addAccount`:
    `result = await addLogin(mailbox, mailbox, password, mailbox, 0, 1, 1, containerName, [mailbox]);`
    change the 2nd-to-last positional arg (isAccount) from `1` to `0`.
  - Acceptance: creating a new mailbox no longer creates a linked login
    with `isAccount=1`.

### Phase 4: Schema retirement (Stage B -- separate release) -- [ ]

- [ ] **T18: DB migration -- remove isAccount column from `logins`.**
  - This is the risky part; do in a separate release.
  - Plan under better-sqlite3 (SQLite 3.35+ supports `DROP COLUMN`):
    1. In `dbInit`, after the schema block, add a guarded migration:
       ```
       -- Only run on existing dbs
       const hasIsAccount = db.prepare(
         "SELECT name FROM pragma_table_info('logins') WHERE name='isAccount'"
       ).get();
       if (hasIsAccount) {
         db.exec('ALTER TABLE logins DROP COLUMN isAccount;');
       }
       ```
    2. Update `db.mjs` SQL strings to remove every `isAccount` reference:
       - `sql.logins.keys` (line 267): remove the entry.
       - `sql.logins.select.*` (lines 280-289): remove from every SELECT.
       - `sql.logins.insert.login` (line 301): remove from INSERT.
       - `sql.logins.update.mailbox` (line 312-313): change the test
         `(isAdmin = 1 OR isAccount = 0)` to `(isAdmin = 1 OR <no isAccount>)`.
         Actually, the rule "allow to change a login's mailbox only if
         isAdmin OR not linked" -- without isAccount, the rule becomes
         "only isAdmin can change a mailbox." Tighter. That's a behavior
         change. Alternative: relax to "any login can have its mailbox
         changed." Decide with the owner; I'm listing both.
       - `sql.logins.update.isAdmin.1` (line 328-331): remove
         `isAccount = 0` from the pass clause.
       - `sql.logins.update.isAccount` (lines 350-360): delete the whole
         block.
     3. Bump the settings table `logins` version in `dbInit` so existing
        instances are marked upgraded (the current bump mechanism uses
        the existing "1.5.10 to 1.5.25" pattern).
    4. Remove the `isAccount` reference from the `INSERT OR IGNORE INTO logins`
       seed line (line 393) -- set isAccount to 0 (not 1) for admin; admin
       is already 0 per line 393 so no change, but verify.
  - Acceptance: on a fresh install after Stage B, `PRAGMA table_info(logins)`
    returns no `isAccount` column. On an upgrade install, same; the old
    column is dropped.

- [ ] **T19: After Stage B, remove `isAccount` from the JWT payload and middleware checks.**
  - `backend/index.js` lines 815-816 (the permission check):
    `req.user.isAdmin || (req.user.isAccount && ...) || ...`
    becomes `req.user.isAdmin || req.user.roles.includes(mailbox)`.
    This is stricter: a login with `mailbox == <their own mailbox>` can no
    longer call `PATCH /api/accounts` for themselves. Verify this is
    acceptable; if yes, also update the `POST /api/aliases` guard at
    line 956 (`if (!domainSource && req.user.isAccount)`) to use a
    different check (e.g., `req.user.roles.length === 1`).
  - `requireAdmin`, `requireActive` unchanged.
  - Acceptance: `grep -rn isAccount backend` returns only the migration
    check in `db.mjs` (the PRAGMA), nothing else.

### Phase 5: Docs / cleanup -- [ ]

- [ ] **T20: Update the swagger docstring on PATCH /api/accounts (backend/index.js around line 753).**
  - The current comment says "also updates their dms-gui login password
    if isAccount=1" -- which was already wrong before this release.
    Fix the comment to: "updates the doveadm mailbox password; if a
    login exists for that mailbox, also updates that login's hash to
    keep the dms-gui UI password in sync."

- [ ] **T21: Bump the version in Dockerfile line 6 and add a CHANGELOG entry (per project rules).**
  - Follow the project's CHANGELOG rules exactly (read line 6 of Dockerfile,
    then CONTRIBUTING.md first 200 lines, insert the entry under "## Impending
    changes").
  - One line describing this release: "Password flow: single source of truth
    (logins table); mailbox password is synced when changed via Accounts
    page. Removed isAccount checkbox from UI. Delete-mailbox cascade now
    role-aware (only drops a login whose sole role is that mailbox; never
    an admin, never a multi-mailbox login)."

- [ ] **T22: Final grep audit.**
  - `grep -rn isAccount frontend/src backend config/dms-gui common.mjs` --
    expect zero hits outside: (a) the migration check in db.mjs (Stage B),
    (b) comments / JSDoc only.
  - `grep -rn "doveadm('loginUser'" backend` -- expect zero hits after T3.
  - `grep -rn "updateDB('accounts'" backend` -- expect zero hits after T2
    (the PATCH endpoint is the only caller).

---

## 4. Explicit "what is NOT in this task" list

- No change to `POST /api/loginUser` route signature or the lockout
  counter logic.
- No change to `PATCH /api/logins/:id` (it already works correctly).
- No change to the `db.mjs::changePassword('logins', ...)` path (still
  used by `PATCH /api/logins/:id` and stays).
- No change to the doveadm `doveadm()` helper itself in `backend.mjs`.
- No change to `POST /api/configs` or `POST /api/initAPI`.
- No migration of existing logins' `salt`/`hash` -- users with un-set
  hashes will have to change their password once via the UI (or an
  admin can do it for them via Logins page -> change password). If the
  owner wants a migration that forces the hash to be re-set on next
  login (a "password reset required" flag on logins), that's a new task.
- No change to the `DELETE /api/logins/:id?alsoDeleteMailbox=true` path.
- No change to the cron-based `killContainer` behavior.

## 5. Rollout / test checklist

Before ship:
1. Fresh install (empty DB):
   - Login as `admin` / `changeme`.
   - Logins page, "new login": pick a mailbox, add it to roles, save.
     -> expect `POST /api/logins` succeeds, `grep -v isAccount
     config/dms-gui/dms-gui.sqlite3 'select * from logins order by id desc limit 1'`
     shows `isAccount=0`.
   - Create a mailbox via Accounts -> "new account" -> `POST
     /api/accounts/dms/dms-gui` -> new login created with `isAccount=0`
     (T17 done).
   - Delete-mailbox cascade (T13): create a login whose ONLY role is that
     mailbox, then delete the mailbox with the cascade on -> that login is
     gone. Create another login with 2 roles (the mailbox + another), delete
     the mailbox -> that login SURVIVES (only the mailbox role drops). No
     login managing the mailbox -> delete succeeds silently.
   - Profile -> "change password": set a new password. Verify
     `doveadm auth test` (or equivalent) shows the OLD mailbox password
     still works (mailbox unchanged) AND dms-gui login uses the NEW
     password (logins.salt/hash changed).
   - Accounts -> click "change password" on the mailbox:
     * verify doveadm command executed (docker logs).
     * verify logins.salt/hash now reflects the new password (T1 done).
2. Upgrade path from an existing install (Stage A only, column still
   present):
   - `loginUser` for a previously-linked user (isAccount=1) still
     succeeds with the same password they were using (hash was set when
     they last changed it, or if not set, they need to reset).
     If the hash isn't set, log them out; on next login it should
     fail with "password invalid"; they change it via Profile/Logins
     page and it works.
   - The "Only attached to a mailbox?" checkbox is gone from the UI.
3. Stage B (separate release):
   - PRAGMA table_info(logins) -> no isAccount column.
   - All the above still works.

## 6. Known follow-ups (not in this task)

- Migrate any existing logins where `salt` and `hash` are NULL:
  set `attempts=lockout` and force a reset. (Owner to confirm.)
- Consider a "password reset required" flag for the case where a user's
  hash is NULL (rare, only if they got in via doveadm auth before we
  synced).
- If the owner wants the Logins page to also keep the mailbox in sync
  when an admin changes a mailbox-attached user's password, change T4 to
  call `updateAccount` instead when `selectedLogin.roles.length === 1 &&
  !selectedLogin.isAdmin`. This is a policy decision; I chose D4 (login-
  only for Logins page) to keep the two pages doing different jobs.
